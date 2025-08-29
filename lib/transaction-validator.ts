import { createHash } from 'crypto'
import { 
  CSVTransaction, 
  NormalizedTransaction, 
  ValidationError, 
  ImportPreview,
  CostBasisLot 
} from '@/types/portfolio'

export class TransactionValidator {
  private existingTransactions: NormalizedTransaction[] = []
  private baseCurrency = 'USD'

  constructor(existingTransactions: NormalizedTransaction[] = []) {
    this.existingTransactions = existingTransactions
  }

  validateAndNormalize(
    transactions: CSVTransaction[]
  ): ImportPreview {
    const validRows: NormalizedTransaction[] = []
    const invalidRows: ValidationError[] = []
    const fxRequired: NormalizedTransaction[] = []

    // Process each transaction
    for (const transaction of transactions) {
      const normalized = this.normalizeTransaction(transaction)
      if (normalized) {
        const validation = this.validateTransaction(normalized)
        
        if (validation.errors.length > 0) {
          invalidRows.push(...validation.errors)
        } else {
          validRows.push(normalized)
          
          // Check if FX rate is needed
          if (normalized.currency !== this.baseCurrency && !normalized.fxApplied) {
            fxRequired.push(normalized)
          }
        }
      }
    }

    // Detect potential duplicates
    const potentialDuplicates = this.detectPotentialDuplicates(validRows)

    // Calculate summary
    const summary = this.calculateSummary(validRows)

    return {
      validRows,
      invalidRows,
      potentialDuplicates,
      fxRequired,
      summary
    }
  }

  private normalizeTransaction(transaction: CSVTransaction): NormalizedTransaction | null {
    try {
      // Generate stable ID
      const id = this.generateTransactionId(transaction)
      
      // Normalize ticker
      const normalizedTicker = this.normalizeTicker(transaction.ticker)
      
      // Calculate signed quantity
      const signedQuantity = this.calculateSignedQuantity(transaction)
      
      // Calculate total cost
      const totalCost = this.calculateTotalCost(transaction)
      
      // Determine currency (default to USD)
      const currency = this.determineCurrency(transaction)
      
      // Check if FX is applied
      const fxApplied = transaction.fx_rate !== undefined && transaction.fx_rate !== null

      // Handle special transaction types
      const processedTransaction = this.processSpecialTransactions(transaction)

      return {
        ...processedTransaction,
        id,
        normalizedTicker,
        signedQuantity,
        totalCost,
        currency,
        fxApplied
      }
    } catch (error) {
      return null
    }
  }

  private generateTransactionId(transaction: CSVTransaction): string {
    const data = `${transaction.ticker}|${transaction.type}|${transaction.date}|${transaction.quantity}|${transaction.price || 0}|${transaction.fees || 0}|${transaction.sourceFile}|${transaction.rowNumber}`
    return createHash('sha256').update(data).digest('hex').substring(0, 16)
  }

  private normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase()
  }

  private calculateSignedQuantity(transaction: CSVTransaction): number {
    let quantity = transaction.quantity

    // Handle SELL transactions - make quantity negative
    if (transaction.type === 'SELL') {
      quantity = -Math.abs(quantity)
    }

    // Handle splits
    if (transaction.type === 'SPLIT') {
      const splitFactor = this.parseSplitFactor(transaction.notes || '')
      if (splitFactor) {
        quantity = quantity * splitFactor
      }
    }

    return quantity
  }

  private calculateTotalCost(transaction: CSVTransaction): number {
    let totalCost = 0

    switch (transaction.type) {
      case 'BUY':
        totalCost = (transaction.price || 0) * transaction.quantity + (transaction.fees || 0)
        break
      case 'SELL':
        totalCost = (transaction.price || 0) * Math.abs(transaction.quantity) - (transaction.fees || 0)
        break
      case 'DIVIDEND':
        // For dividends, total cost is the dividend amount
        totalCost = transaction.price || 0
        break
      case 'CASH_IN':
        totalCost = transaction.quantity
        break
      case 'CASH_OUT':
        totalCost = -transaction.quantity
        break
      case 'SPLIT':
        // Splits don't change total cost
        totalCost = 0
        break
    }

    return totalCost
  }

  private determineCurrency(transaction: CSVTransaction): string {
    // For now, default to USD
    // In a real implementation, you'd detect currency from price formatting or notes
    return this.baseCurrency
  }

  private processSpecialTransactions(transaction: CSVTransaction): CSVTransaction {
    let processed = { ...transaction }

    // Handle DRIP (Dividend Reinvestment)
    if (transaction.type === 'DIVIDEND' && 
        transaction.notes?.toLowerCase().includes('reinvest')) {
      processed.type = 'BUY'
      // DRIP typically buys shares at the ex-dividend price
      // Price should be set to the ex-dividend price
    }

    // Handle splits
    if (transaction.type === 'SPLIT') {
      const splitFactor = this.parseSplitFactor(transaction.notes || '')
      if (splitFactor) {
        processed.quantity = transaction.quantity * splitFactor
      }
    }

    return processed
  }

  private parseSplitFactor(notes: string): number | null {
    if (!notes) return null

    // Common split patterns: "2:1", "3:2", "4:1", etc.
    const splitMatch = notes.match(/(\d+):(\d+)/)
    if (splitMatch) {
      const numerator = parseInt(splitMatch[1])
      const denominator = parseInt(splitMatch[2])
      return numerator / denominator
    }

    // Also check for "4 for 1", "3 for 2", etc.
    const forMatch = notes.match(/(\d+)\s+for\s+(\d+)/i)
    if (forMatch) {
      const numerator = parseInt(forMatch[1])
      const denominator = parseInt(forMatch[2])
      return numerator / denominator
    }

    return null
  }

  private validateTransaction(transaction: NormalizedTransaction): {
    errors: ValidationError[]
    warnings: ValidationError[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // Validate ticker
    if (!transaction.normalizedTicker || transaction.normalizedTicker.length === 0) {
      errors.push({
        rowNumber: transaction.rowNumber,
        field: 'ticker',
        message: 'Ticker symbol is required',
        severity: 'error'
      })
    }

    // Validate date
    if (!transaction.date || !this.isValidDate(transaction.date)) {
      errors.push({
        rowNumber: transaction.rowNumber,
        field: 'date',
        message: 'Valid date is required',
        severity: 'error'
      })
    }

    // Validate quantity
    if (transaction.quantity <= 0) {
      errors.push({
        rowNumber: transaction.rowNumber,
        field: 'quantity',
        message: 'Quantity must be positive',
        severity: 'error'
      })
    }

    // Validate price for BUY/SELL transactions
    if (['BUY', 'SELL'].includes(transaction.type) && 
        (!transaction.price || transaction.price <= 0)) {
      errors.push({
        rowNumber: transaction.rowNumber,
        field: 'price',
        message: `${transaction.type} transactions require a positive price`,
        severity: 'error'
      })
    }

    // Validate fees
    if (transaction.fees && transaction.fees < 0) {
      warnings.push({
        rowNumber: transaction.rowNumber,
        field: 'fees',
        message: 'Negative fees detected - this may be a refund',
        severity: 'warning'
      })
    }

    // Check for future dates
    if (transaction.date && new Date(transaction.date) > new Date()) {
      warnings.push({
        rowNumber: transaction.rowNumber,
        field: 'date',
        message: 'Transaction date is in the future',
        severity: 'warning'
      })
    }

    // Check for very old dates (before 1990)
    if (transaction.date && new Date(transaction.date) < new Date('1990-01-01')) {
      warnings.push({
        rowNumber: transaction.rowNumber,
        field: 'date',
        message: 'Transaction date is very old',
        severity: 'warning'
      })
    }

    return { errors, warnings }
  }

  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr)
    return !isNaN(date.getTime())
  }

  private detectPotentialDuplicates(
    newTransactions: NormalizedTransaction[]
  ): Array<{
    existing: NormalizedTransaction
    new: NormalizedTransaction
    confidence: number
  }> {
    const duplicates: Array<{
      existing: NormalizedTransaction
      new: NormalizedTransaction
      confidence: number
    }> = []

    for (const newTx of newTransactions) {
      for (const existingTx of this.existingTransactions) {
        const confidence = this.calculateDuplicateConfidence(newTx, existingTx)
        
        if (confidence > 0.8) { // High confidence threshold
          duplicates.push({
            existing: existingTx,
            new: newTx,
            confidence
          })
        }
      }
    }

    return duplicates
  }

  private calculateDuplicateConfidence(
    tx1: NormalizedTransaction,
    tx2: NormalizedTransaction
  ): number {
    let matches = 0
    let totalChecks = 0

    // Check ticker
    totalChecks++
    if (tx1.normalizedTicker === tx2.normalizedTicker) matches++

    // Check type
    totalChecks++
    if (tx1.type === tx2.type) matches++

    // Check date (within 1 day tolerance)
    totalChecks++
    const date1 = new Date(tx1.date)
    const date2 = new Date(tx2.date)
    const dayDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)
    if (dayDiff <= 1) matches++

    // Check quantity (within 1% tolerance)
    totalChecks++
    const qtyDiff = Math.abs(tx1.quantity - tx2.quantity) / Math.max(tx1.quantity, tx2.quantity)
    if (qtyDiff <= 0.01) matches++

    // Check price (within 1% tolerance for BUY/SELL)
    if (['BUY', 'SELL'].includes(tx1.type) && tx1.price && tx2.price) {
      totalChecks++
      const priceDiff = Math.abs(tx1.price - tx2.price) / Math.max(tx1.price, tx2.price)
      if (priceDiff <= 0.01) matches++
    }

    return matches / totalChecks
  }

  private calculateSummary(transactions: NormalizedTransaction[]): ImportPreview['summary'] {
    const shareChanges: Record<string, number> = {}
    let netCashEffect = 0

    // Calculate share changes and cash effects
    for (const tx of transactions) {
      // Share changes
      if (['BUY', 'SELL', 'SPLIT'].includes(tx.type)) {
        shareChanges[tx.normalizedTicker] = (shareChanges[tx.normalizedTicker] || 0) + tx.signedQuantity
      }

      // Cash effects
      if (['BUY', 'SELL', 'DIVIDEND', 'CASH_IN', 'CASH_OUT'].includes(tx.type)) {
        netCashEffect += tx.totalCost
      }
    }

    // Calculate post-import positions (simplified)
    const postImportPositions = this.calculatePostImportPositions(transactions)

    return {
      totalRows: transactions.length,
      validCount: transactions.length,
      errorCount: 0, // Will be set by caller
      warningCount: 0, // Will be set by caller
      netCashEffect,
      shareChanges,
      postImportPositions
    }
  }

  private calculatePostImportPositions(
    transactions: NormalizedTransaction[]
  ): any[] {
    // This is a simplified calculation
    // In a real implementation, you'd need to merge with existing positions
    const positions: Record<string, any> = {}

    for (const tx of transactions) {
      if (!positions[tx.normalizedTicker]) {
        positions[tx.normalizedTicker] = {
          ticker: tx.normalizedTicker,
          shares: 0,
          costBasis: 0,
          marketValue: 0,
          unrealizedGain: 0,
          unrealizedGainPercent: 0,
          realizedGain: 0,
          weight: 0
        }
      }

      const pos = positions[tx.normalizedTicker]

      if (['BUY', 'SELL', 'SPLIT'].includes(tx.type)) {
        pos.shares += tx.signedQuantity
      }

      if (['BUY'].includes(tx.type)) {
        pos.costBasis += tx.totalCost
      }
    }

    return Object.values(positions).filter(pos => pos.shares !== 0)
  }
}
