import { CSVTransaction, ValidationError, NormalizedTransaction } from '@/types/portfolio'
import { Trade } from '@/lib/portfolio-equity-engine'
import { createHash } from 'crypto'

// Supported column mappings (case and space insensitive)
const COLUMN_MAPPINGS = {
  ticker: ['ticker', 'symbol', 'stock', 'code'],
  type: ['type', 'action', 'transaction_type', 'trade_type'],
  date: ['date', 'trade_date', 'transaction_date', 'execution_date'],
  quantity: ['quantity', 'shares', 'qty', 'amount'],
  price: ['price', 'share_price', 'per_share', 'unit_price'],
  fees: ['fees', 'commission', 'brokerage_fee', 'cost'],
  fx_rate: ['fx_rate', 'exchange_rate', 'currency_rate', 'fx'],
  notes: ['notes', 'description', 'comment', 'memo'],
  action: ['action', 'operation', 'modify']
}

// Transaction type mappings
const TYPE_MAPPINGS = {
  'BUY': ['buy', 'purchase', 'acquire'],
  'SELL': ['sell', 'sale', 'dispose'],
  'DIVIDEND': ['dividend', 'div', 'distribution', 'drip'],
  'SPLIT': ['split', 'stock_split', 'share_split'],
  'CASH_IN': ['cash_in', 'deposit', 'contribution', 'fund'],
  'CASH_OUT': ['cash_out', 'withdrawal', 'distribution', 'withdraw']
}

// Common ticker aliases
const TICKER_ALIASES: Record<string, string> = {
  'GOOG': 'GOOGL',
  'BRK.A': 'BRK-A',
  'BRK.B': 'BRK-B'
}

export class CSVParser {
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []

  async parseCSVFile(file: File): Promise<{
    transactions: CSVTransaction[]
    trades: Trade[]
    errors: ValidationError[]
    warnings: ValidationError[]
  }> {
    this.errors = []
    this.warnings = []

    try {
      const text = await this.readFileAsText(file)
      const lines = this.splitLines(text)
      const { hasHeader, delimiter } = this.detectFormat(lines)
      
      const startIndex = hasHeader ? 1 : 0
      const headerRow = hasHeader ? lines[0] : null
      const columnMap = this.mapColumns(headerRow, delimiter)

      const transactions: CSVTransaction[] = []
      const trades: Trade[] = []
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue // Skip empty lines
        
        const transaction = this.parseRow(line, i + 1, columnMap, delimiter, file.name)
        if (transaction) {
          transactions.push(transaction)
          
                      // Also create a Trade object for the equity engine
            const trade: Trade = {
              executed_at: transaction.date,
              ticker: transaction.ticker,
              side: transaction.type === 'BUY' ? 'BUY' : 'SELL',
              quantity: transaction.quantity,
              price: transaction.price || 0,
              fees: transaction.fees,
              currency: 'USD'
            }
          trades.push(trade)
        }
      }

      return {
        transactions,
        trades,
        errors: this.errors,
        warnings: this.warnings
      }
    } catch (error) {
      this.errors.push({
        rowNumber: 0,
        field: 'file',
        message: `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      })
      
      return {
        transactions: [],
        errors: this.errors,
        warnings: this.warnings
      }
    }
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  private splitLines(text: string): string[] {
    // Handle both CRLF and LF line endings
    return text.split(/\r?\n/).filter(line => line.trim() !== '')
  }

  private detectFormat(lines: string[]): { hasHeader: boolean; delimiter: string } {
    if (lines.length === 0) {
      return { hasHeader: false, delimiter: ',' }
    }

    // Try to detect delimiter from first few lines
    const sampleLines = lines.slice(0, Math.min(5, lines.length))
    const commaCount = sampleLines.map(line => (line.match(/,/g) || []).length)
    const semicolonCount = sampleLines.map(line => (line.match(/;/g) || []).length)
    
    const avgCommas = commaCount.reduce((a, b) => a + b, 0) / commaCount.length
    const avgSemicolons = semicolonCount.reduce((a, b) => a + b, 0) / semicolonCount.length
    
    const delimiter = avgCommas >= avgSemicolons ? ',' : ';'
    
    // Detect if first row is header by checking if it contains common header words
    const firstLine = lines[0].toLowerCase()
    const headerKeywords = ['ticker', 'symbol', 'date', 'type', 'quantity', 'price']
    const hasHeader = headerKeywords.some(keyword => firstLine.includes(keyword))
    
    return { hasHeader, delimiter }
  }

  private mapColumns(headerRow: string | null, delimiter: string): Record<string, number> {
    const columnMap: Record<string, number> = {}
    
    if (!headerRow) {
      // No header - assume standard order
      columnMap.ticker = 0
      columnMap.type = 1
      columnMap.date = 2
      columnMap.quantity = 3
      columnMap.price = 4
      columnMap.fees = 5
      columnMap.fx_rate = 6
      columnMap.notes = 7
      return columnMap
    }

    const headers = headerRow.split(delimiter).map(h => h.trim().toLowerCase())
    
    // Map each expected column to its position
    Object.entries(COLUMN_MAPPINGS).forEach(([key, aliases]) => {
      const index = headers.findIndex(header => 
        aliases.some(alias => header.includes(alias.replace('_', '')))
      )
      if (index !== -1) {
        columnMap[key] = index
      }
    })

    return columnMap
  }

  private parseRow(
    line: string, 
    rowNumber: number, 
    columnMap: Record<string, number>, 
    delimiter: string,
    sourceFile: string
  ): CSVTransaction | null {
    const fields = this.splitCSVLine(line, delimiter)
    
    // Validate required fields
    const requiredFields = ['ticker', 'type', 'date', 'quantity']
    for (const field of requiredFields) {
      if (columnMap[field] === undefined) {
        this.errors.push({
          rowNumber,
          field,
          message: `Required column '${field}' not found`,
          severity: 'error'
        })
        return null
      }
    }

    const ticker = this.normalizeTicker(fields[columnMap.ticker])
    const type = this.normalizeType(fields[columnMap.type])
    const date = this.parseDate(fields[columnMap.date])
    const quantity = this.parseNumber(fields[columnMap.quantity])
    const price = columnMap.price !== undefined ? this.parseNumber(fields[columnMap.price]) : undefined
    const fees = columnMap.fees !== undefined ? this.parseNumber(fields[columnMap.fees]) : 0
    const fx_rate = columnMap.fx_rate !== undefined ? this.parseNumber(fields[columnMap.fx_rate]) : undefined
    const notes = columnMap.notes !== undefined ? fields[columnMap.notes].trim() : ''
    const action = columnMap.action !== undefined ? this.parseAction(fields[columnMap.action]) : undefined

    // Validate parsed values
    if (!ticker) {
      this.errors.push({
        rowNumber,
        field: 'ticker',
        message: 'Invalid ticker symbol',
        severity: 'error'
      })
      return null
    }

    if (!type) {
      this.errors.push({
        rowNumber,
        field: 'type',
        message: 'Invalid transaction type',
        severity: 'error'
      })
      return null
    }

    if (!date) {
      this.errors.push({
        rowNumber,
        field: 'date',
        message: 'Invalid date format',
        severity: 'error'
      })
      return null
    }

    if (quantity === null || quantity <= 0) {
      this.errors.push({
        rowNumber,
        field: 'quantity',
        message: 'Quantity must be positive',
        severity: 'error'
      })
      return null
    }

    // Validate price for transactions that need it
    if (['BUY', 'SELL'].includes(type) && (price === null || price <= 0)) {
      this.errors.push({
        rowNumber,
        field: 'price',
        message: `${type} transactions require a positive price`,
        severity: 'error'
      })
      return null
    }

    return {
      ticker,
      type,
      date,
      quantity,
      price,
      fees,
      fx_rate,
      notes,
      action,
      rawRow: line,
      rowNumber,
      sourceFile
    }
  }

  private splitCSVLine(line: string, delimiter: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    fields.push(current.trim())
    return fields
  }

  private normalizeTicker(ticker: string): string {
    if (!ticker) return ''
    
    const normalized = ticker.trim().toUpperCase()
    return TICKER_ALIASES[normalized] || normalized
  }

  private normalizeType(type: string): CSVTransaction['type'] | null {
    if (!type) return null
    
    const normalized = type.trim().toUpperCase()
    
    for (const [standardType, aliases] of Object.entries(TYPE_MAPPINGS)) {
      if (aliases.some(alias => normalized.includes(alias.toUpperCase()))) {
        return standardType as CSVTransaction['type']
      }
    }
    
    return null
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null
    
    const cleaned = dateStr.trim()
    
    // Try multiple date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{2}\.\d{2}\.\d{4}$/, // MM.DD.YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
    ]
    
    for (const format of formats) {
      if (format.test(cleaned)) {
        try {
          const date = new Date(cleaned)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0] // Return YYYY-MM-DD
          }
        } catch {
          continue
        }
      }
    }
    
    return null
  }

  private parseNumber(numStr: string): number | null {
    if (!numStr || numStr.trim() === '') return null
    
    const cleaned = numStr.trim()
      .replace(/[,\s]/g, '') // Remove commas and spaces
      .replace(/[^\d.-]/g, '') // Keep only digits, dots, and minus signs
    
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? null : parsed
  }

  private parseAction(action: string): 'amend' | 'delete' | undefined {
    if (!action) return undefined
    
    const normalized = action.trim().toLowerCase()
    if (normalized === 'amend' || normalized === 'edit') return 'amend'
    if (normalized === 'delete' || normalized === 'remove') return 'delete'
    
    return undefined
  }
}
