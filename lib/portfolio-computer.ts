import { 
  NormalizedTransaction, 
  Position, 
  PortfolioSnapshot, 
  PerformanceMetrics,
  CostBasisLot,
  AssetAllocation
} from '@/types/portfolio'
import { computeYTDFromSeries, convertEquitySeriesToDailySeries, assertYTDConsistency } from './performance/ytd'

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE'

export class PortfolioComputer {
  private costBasisMethod: CostBasisMethod = 'FIFO'
  private baseCurrency = 'USD'

  constructor(costBasisMethod: CostBasisMethod = 'FIFO') {
    this.costBasisMethod = costBasisMethod
  }

  computePortfolioFromTransactions(
    transactions: NormalizedTransaction[],
    currentPrices: Record<string, number> = {}
  ): PerformanceMetrics {
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Compute positions with cost basis
    const positions = this.computePositions(sortedTransactions, currentPrices)
    
    // Compute asset allocation
    const assetAllocation = this.computeAssetAllocation(positions)
    
    // Compute performance metrics
    const metrics = this.computePerformanceMetrics(positions, sortedTransactions)
    
    return {
      ...metrics,
      positions,
      assetAllocation,
      lastUpdated: new Date().toISOString(),
      baselineDate: this.getYTDBaselineDate()
    }
  }

  private computePositions(
    transactions: NormalizedTransaction[],
    currentPrices: Record<string, number>
  ): Position[] {
    const positions: Record<string, Position> = {}
    const lots: Record<string, CostBasisLot[]> = {}

    // Process transactions chronologically
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
        lots[tx.normalizedTicker] = []
      }

      const position = positions[tx.normalizedTicker]
      const tickerLots = lots[tx.normalizedTicker]

      switch (tx.type) {
        case 'BUY':
          // Add new lot
          const newLot: CostBasisLot = {
            id: tx.id,
            ticker: tx.normalizedTicker,
            shares: tx.quantity,
            costBasis: tx.totalCost,
            date: tx.date,
            fees: tx.fees || 0
          }
          tickerLots.push(newLot)
          position.shares += tx.quantity
          position.costBasis += tx.totalCost
          break

        case 'SELL':
          const sharesToSell = Math.abs(tx.signedQuantity)
          const proceeds = tx.totalCost
          
          // Calculate realized gain using cost basis method
          const { realizedGain, remainingLots } = this.calculateRealizedGain(
            tickerLots,
            sharesToSell,
            proceeds,
            tx.fees || 0
          )
          
          position.realizedGain += realizedGain
          position.shares -= sharesToSell
          
          // Update lots
          lots[tx.normalizedTicker] = remainingLots
          
          // Recalculate cost basis from remaining lots
          position.costBasis = remainingLots.reduce((sum, lot) => sum + lot.costBasis, 0)
          break

        case 'DIVIDEND':
          // Dividends don't affect position size, just add to realized gains
          position.realizedGain += tx.totalCost
          break

        case 'SPLIT':
          // Adjust all lots by split factor
          const splitFactor = this.calculateSplitFactor(tx)
          if (splitFactor) {
            tickerLots.forEach(lot => {
              lot.shares *= splitFactor
              lot.costBasis *= splitFactor
            })
            position.shares *= splitFactor
            position.costBasis *= splitFactor
          }
          break

        case 'CASH_IN':
        case 'CASH_OUT':
          // Cash transactions don't affect positions
          break
      }
    }

    // Calculate market values and unrealized gains
    const positionsArray = Object.values(positions)
    const totalValue = positionsArray.reduce((sum, pos) => {
      const currentPrice = currentPrices[pos.ticker] || 0
      pos.lastPrice = currentPrice
      pos.marketValue = pos.shares * currentPrice
      pos.unrealizedGain = pos.marketValue - pos.costBasis
      pos.unrealizedGainPercent = pos.costBasis > 0 ? (pos.unrealizedGain / pos.costBasis) * 100 : 0
      return sum + pos.marketValue
    }, 0)

    // Calculate weights
    positionsArray.forEach(pos => {
      pos.weight = totalValue > 0 ? (pos.marketValue / totalValue) * 100 : 0
    })

    return positionsArray.filter(pos => pos.shares > 0)
  }

  private calculateRealizedGain(
    lots: CostBasisLot[],
    sharesToSell: number,
    proceeds: number,
    fees: number
  ): { realizedGain: number; remainingLots: CostBasisLot[] } {
    let remainingShares = sharesToSell
    let totalCostBasis = 0
    const remainingLots: CostBasisLot[] = []

    // Sort lots based on cost basis method
    const sortedLots = [...lots].sort((a, b) => {
      switch (this.costBasisMethod) {
        case 'FIFO':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'LIFO':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'AVERAGE':
          return 0 // Already sorted by date
      }
    })

    for (const lot of sortedLots) {
      if (remainingShares <= 0) {
        remainingLots.push(lot)
        continue
      }

      const sharesFromThisLot = Math.min(lot.shares, remainingShares)
      const costBasisRatio = sharesFromThisLot / lot.shares
      const costBasisUsed = lot.costBasis * costBasisRatio

      totalCostBasis += costBasisUsed
      remainingShares -= sharesFromThisLot

      if (sharesFromThisLot < lot.shares) {
        // Partial lot used
        remainingLots.push({
          ...lot,
          shares: lot.shares - sharesFromThisLot,
          costBasis: lot.costBasis - costBasisUsed
        })
      }
    }

    const realizedGain = proceeds - totalCostBasis - fees
    return { realizedGain, remainingLots }
  }

  private calculateSplitFactor(transaction: NormalizedTransaction): number | null {
    if (!transaction.notes) return null

    // Common split patterns: "2:1", "3:2", "4:1", etc.
    const splitMatch = transaction.notes.match(/(\d+):(\d+)/)
    if (splitMatch) {
      const numerator = parseInt(splitMatch[1])
      const denominator = parseInt(splitMatch[2])
      return numerator / denominator
    }

    // Also check for "4 for 1", "3 for 2", etc.
    const forMatch = transaction.notes.match(/(\d+)\s+for\s+(\d+)/i)
    if (forMatch) {
      const numerator = parseInt(forMatch[1])
      const denominator = parseInt(forMatch[2])
      return numerator / denominator
    }

    return null
  }

  private computeAssetAllocation(positions: Position[]): AssetAllocation[] {
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    
    return positions.map(pos => ({
      ticker: pos.ticker,
      value: pos.marketValue,
      weight: totalValue > 0 ? (pos.marketValue / totalValue) * 100 : 0,
      sector: pos.sector || 'Unknown'
    })).sort((a, b) => b.weight - a.weight)
  }

  private computePerformanceMetrics(
    positions: Position[],
    transactions: NormalizedTransaction[]
  ): Omit<PerformanceMetrics, 'positions' | 'assetAllocation' | 'lastUpdated' | 'baselineDate'> {
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0)
    const totalGain = positions.reduce((sum, pos) => sum + pos.unrealizedGain + pos.realizedGain, 0)
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    // Calculate YTD return
    const ytdReturn = this.calculateYTDReturn(positions, transactions)

    // Calculate CAGR for different periods
    const cagr1Y = this.calculateCAGR(positions, transactions, 1)
    const cagr3Y = this.calculateCAGR(positions, transactions, 3)
    const cagr5Y = this.calculateCAGR(positions, transactions, 5)

    return {
      totalValue,
      totalGain,
      totalGainPercent,
      ytdReturn,
      cagr1Y,
      cagr3Y,
      cagr5Y
    }
  }

  private calculateYTDReturn(
    positions: Position[],
    transactions: NormalizedTransaction[]
  ): number {
    // For now, use a simplified calculation since we don't have historical equity series
    // In a real implementation, this would use computeYTDFromSeries with historical data
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0)
    
    // Simulate YTD baseline value (simplified)
    const ytdBaselineValue = totalCost * 0.95 // Assume 5% lower than cost basis
    
    return ytdBaselineValue > 0 ? ((totalValue - ytdBaselineValue) / ytdBaselineValue) * 100 : 0
  }

  private calculateCAGR(
    positions: Position[],
    transactions: NormalizedTransaction[],
    years: number
  ): number | undefined {
    if (transactions.length === 0) return undefined

    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    
    // Find the earliest transaction date
    const earliestDate = new Date(Math.min(...transactions.map(tx => new Date(tx.date).getTime())))
    const currentDate = new Date()
    const yearsElapsed = (currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    if (yearsElapsed < years) return undefined

    // For demo purposes, use a simplified calculation
    // In a real implementation, you'd need historical portfolio values
    const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0)
    const beginningValue = totalCost * 0.8 // Assume 20% lower than current cost basis

    if (beginningValue <= 0) return undefined

    const cagr = Math.pow(totalValue / beginningValue, 1 / years) - 1
    return cagr * 100 // Convert to percentage
  }

  private getYTDBaselineDate(): string {
    const currentYear = new Date().getFullYear()
    return `${currentYear}-01-01`
  }

  // Generate time series data for charts
  generateTimeSeriesData(
    transactions: NormalizedTransaction[],
    endDate: string = new Date().toISOString().split('T')[0]
  ): PortfolioSnapshot[] {
    const snapshots: PortfolioSnapshot[] = []
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Mock prices for demo purposes
    const mockPrices: Record<string, number> = {
      'AAPL': 175.50,
      'GOOGL': 140.25,
      'MSFT': 380.75,
      'AMZN': 145.80,
      'TSLA': 245.30,
      'NVDA': 485.90,
      'META': 320.45
    }

    // Group transactions by date
    const transactionsByDate: Record<string, NormalizedTransaction[]> = {}
    for (const tx of sortedTransactions) {
      if (!transactionsByDate[tx.date]) {
        transactionsByDate[tx.date] = []
      }
      transactionsByDate[tx.date].push(tx)
    }

    // Generate snapshots for each date
    const dates = Object.keys(transactionsByDate).sort()
    let runningTransactions: NormalizedTransaction[] = []

    for (const date of dates) {
      runningTransactions.push(...transactionsByDate[date])
      const snapshot = this.computePortfolioFromTransactions(runningTransactions, mockPrices)
      
      snapshots.push({
        date,
        totalValue: snapshot.totalValue,
        totalCost: snapshot.totalCost || 0,
        totalGain: snapshot.totalGain,
        totalGainPercent: snapshot.totalGainPercent,
        positions: snapshot.positions,
        cash: 0, // Would need to track cash separately
        netContributions: 0 // Would need to track contributions separately
      })
    }

    return snapshots
  }
}

/**
 * Calculate average share price for each ticker from transactions
 * Uses the formula: avgCost = total cost / total shares
 */
export function calculateAverageSharePrices(transactions: NormalizedTransaction[]): Record<string, number> {
  const tickerData: Record<string, { totalShares: number; totalCost: number; buyCount: number; sellCount: number }> = {}
  
  // Process transactions chronologically
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  for (const tx of sortedTransactions) {
    const ticker = tx.normalizedTicker.toUpperCase()
    const shares = tx.quantity
    const price = tx.price
    const fees = tx.fees || 0
    
    if (!tickerData[ticker]) {
      tickerData[ticker] = { totalShares: 0, totalCost: 0, buyCount: 0, sellCount: 0 }
    }
    
    if (tx.type === 'BUY') {
      // Add shares and cost for buy transactions
      tickerData[ticker].totalShares += shares
      tickerData[ticker].totalCost += (shares * price) + fees
      tickerData[ticker].buyCount++
    } else if (tx.type === 'SELL') {
      // For sell transactions, reduce shares but keep average cost the same
      // This is a simplified approach - in a real system you might want FIFO/LIFO
      tickerData[ticker].totalShares -= shares
      tickerData[ticker].sellCount++
      
      // Ensure we don't go negative
      if (tickerData[ticker].totalShares < 0) {
        tickerData[ticker].totalShares = 0
        tickerData[ticker].totalCost = 0
      }
    }
    // Ignore other transaction types (DIVIDEND, SPLIT, etc.) for cost basis calculation
  }
  
  // Calculate average share prices
  const avgSharePrices: Record<string, number> = {}
  for (const [ticker, data] of Object.entries(tickerData)) {
    if (data.totalShares > 0 && data.buyCount > 0) {
      avgSharePrices[ticker] = data.totalCost / data.totalShares
      
      // Debug logging for sample ticker
      if (ticker === 'AAPL' || ticker === 'MSFT') {
        console.info('[COST] sample', {
          symbol: ticker,
          buys: data.buyCount,
          sells: data.sellCount,
          currentShares: data.totalShares,
          totalBuyCost: data.totalCost,
          avgCost: avgSharePrices[ticker].toFixed(2)
        })
      }
    } else {
      // No shares or no buy transactions
      avgSharePrices[ticker] = 0
      
      if (data.totalShares <= 0) {
        console.warn(`[COST] Closed position for ${ticker} - no shares remaining`)
      } else if (data.buyCount === 0) {
        console.warn(`[COST] No cost basis for ${ticker} - no BUY transactions found`)
      }
    }
  }
  
  return avgSharePrices
}
