import { PerformanceData } from '@/types/portfolio'

interface Trade {
  executed_at: string
  ticker: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  fees: number
  currency: string
}

interface Lot {
  quantity: number
  cost: number
  date: string
  fees: number
}

interface Position {
  shares: number
  lots: Lot[]
  avg_cost: number
}

interface DailySnapshot {
  date: string
  positions: Record<string, Position>
  cash_balance: number
  portfolio_value: number
}

interface EquityCurveResult {
  performanceData: PerformanceData[]
  warnings: string[]
  errors: string[]
  status: {
    valuedThrough: string
    bridgedTickers: string[]
    missingPrices: string[]
  }
}

export class PortfolioEquityEngine {
  private latestPrices: Record<string, number> = {}

  constructor() {
    this.initializeLatestPrices()
  }

  private initializeLatestPrices() {
    // Today's prices from Google Sheets or cache
    this.latestPrices = {
      'AAPL': 175.50,
      'GOOGL': 140.25,
      'MSFT': 380.75,
      'AMZN': 145.80,
      'TSLA': 245.30,
      'NVDA': 485.90,
      'META': 320.45
    }
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0]
  }

  computeEquityCurve(trades: Trade[]): EquityCurveResult {
    const warnings: string[] = []
    const errors: string[] = []
    const missingPrices = new Set<string>()

    try {
      // 1. Normalize and validate trades
      const normalizedTrades = this.validateAndNormalizeTrades(trades, warnings, errors)
      if (normalizedTrades.length === 0) {
        return { 
          performanceData: [], 
          warnings, 
          errors, 
          status: { 
            valuedThrough: this.getTodayString(), 
            bridgedTickers: [], 
            missingPrices: [] 
          } 
        }
      }

      // 2. Collapse same-day, same-ticker trades
      const collapsedTrades = this.collapseSameDayTrades(normalizedTrades)

      // 3. Build holdings ledger with FIFO lots
      const holdingsLedger = this.buildHoldingsLedger(collapsedTrades, warnings, errors)

      // 4. Generate daily valuation series
      const dailySnapshots = this.generateDailyValuation(holdingsLedger, missingPrices, warnings)

      // 5. Generate performance data
      const performanceData = this.generatePerformanceData(dailySnapshots)

      // 6. Create status
      const status = {
        valuedThrough: this.getTodayString(),
        bridgedTickers: [], // No bridging needed with step-function pricing
        missingPrices: Array.from(missingPrices)
      }

      console.log('Equity Engine - Generated step-function performance data:', {
        count: performanceData.length,
        sample: performanceData.slice(0, 3),
        status,
        warnings,
        errors
      })

      return {
        performanceData,
        warnings,
        errors,
        status
      }
    } catch (error) {
      console.error('Equity Engine Error:', error)
      errors.push(`Equity engine failed: ${error}`)
      return { 
        performanceData: [], 
        warnings, 
        errors, 
        status: { 
          valuedThrough: this.getTodayString(), 
          bridgedTickers: [], 
          missingPrices: [] 
        } 
      }
    }
  }

  private validateAndNormalizeTrades(trades: Trade[], warnings: string[], errors: string[]): Trade[] {
    const normalized: Trade[] = []
    const today = new Date()
    const seenRows = new Set<string>()

    trades.forEach((trade, index) => {
      try {
        // Normalize ticker
        const normalizedTicker = trade.ticker.toUpperCase().trim()
        
        // Validate date
        const tradeDate = new Date(trade.executed_at)
        if (isNaN(tradeDate.getTime())) {
          errors.push(`Row ${index + 1}: Invalid date format`)
          return
        }

        // Check for future dates
        if (tradeDate > today) {
          warnings.push(`Row ${index + 1}: Future date ${trade.executed_at} ignored`)
          return
        }

        // Validate required fields
        if (!normalizedTicker || trade.quantity <= 0 || trade.price <= 0) {
          errors.push(`Row ${index + 1}: Invalid trade data (ticker, quantity, or price)`)
          return
        }

        // Check for exact duplicates
        const rowKey = `${trade.executed_at}-${normalizedTicker}-${trade.side}-${trade.quantity}-${trade.price}`
        if (seenRows.has(rowKey)) {
          warnings.push(`Row ${index + 1}: Duplicate trade ignored`)
          return
        }
        seenRows.add(rowKey)

        // Normalize to UTC end-of-day
        const normalizedDate = new Date(tradeDate)
        normalizedDate.setUTCHours(23, 59, 59, 999)

        normalized.push({
          executed_at: normalizedDate.toISOString().split('T')[0],
          ticker: normalizedTicker,
          side: trade.side,
          quantity: trade.quantity,
          price: trade.price,
          fees: trade.fees || 0,
          currency: trade.currency || 'USD'
        })
      } catch (error) {
        errors.push(`Row ${index + 1}: Processing error`)
      }
    })

    // Sort by executed_at ascending
    normalized.sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime())

    return normalized
  }

  private collapseSameDayTrades(trades: Trade[]): Trade[] {
    const tradeMap = new Map<string, Trade>()

    trades.forEach(trade => {
      const key = `${trade.executed_at}-${trade.ticker}-${trade.side}`
      const existing = tradeMap.get(key)

      if (existing) {
        // Collapse: sum quantities, compute VWAP price
        const totalQuantity = existing.quantity + trade.quantity
        const totalValue = (existing.quantity * existing.price) + (trade.quantity * trade.price)
        const vwapPrice = totalValue / totalQuantity

        existing.quantity = totalQuantity
        existing.price = vwapPrice
        existing.fees += trade.fees
      } else {
        tradeMap.set(key, { ...trade })
      }
    })

    return Array.from(tradeMap.values()).sort((a, b) => 
      new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
    )
  }

  private buildHoldingsLedger(trades: Trade[], warnings: string[], errors: string[]): Record<string, Position> {
    const positions: Record<string, Position> = {}

    trades.forEach(trade => {
      const ticker = trade.ticker
      
      if (!positions[ticker]) {
        positions[ticker] = {
          shares: 0,
          lots: [],
          avg_cost: 0
        }
      }

      if (trade.side === 'BUY') {
        // Add new lot
        const newLot: Lot = {
          quantity: trade.quantity,
          cost: trade.quantity * trade.price + trade.fees,
          date: trade.executed_at,
          fees: trade.fees
        }
        
        positions[ticker].lots.push(newLot)
        positions[ticker].shares += trade.quantity
        
        // Update average cost
        const totalCost = positions[ticker].lots.reduce((sum, lot) => sum + lot.cost, 0)
        positions[ticker].avg_cost = totalCost / positions[ticker].shares
      } else if (trade.side === 'SELL') {
        // FIFO sell
        let remainingToSell = trade.quantity
        let realizedPL = 0

        while (remainingToSell > 0 && positions[ticker].lots.length > 0) {
          const lot = positions[ticker].lots[0]
          
          if (lot.quantity <= remainingToSell) {
            // Sell entire lot
            const sellRatio = lot.quantity / lot.quantity
            const costOfShares = lot.cost * sellRatio
            const proceeds = lot.quantity * trade.price - (trade.fees * sellRatio)
            
            realizedPL += proceeds - costOfShares
            positions[ticker].shares -= lot.quantity
            remainingToSell -= lot.quantity
            
            positions[ticker].lots.shift() // Remove the lot
          } else {
            // Sell partial lot
            const sellRatio = remainingToSell / lot.quantity
            const costOfShares = lot.cost * sellRatio
            const proceeds = remainingToSell * trade.price - (trade.fees * sellRatio)
            
            realizedPL += proceeds - costOfShares
            positions[ticker].shares -= remainingToSell
            lot.quantity -= remainingToSell
            lot.cost -= costOfShares
            
            remainingToSell = 0
          }
        }

        if (remainingToSell > 0) {
          errors.push(`Insufficient shares for SELL: ${ticker} on ${trade.executed_at}`)
          return
        }

        // Update average cost if shares remain
        if (positions[ticker].shares > 0) {
          const totalCost = positions[ticker].lots.reduce((sum, lot) => sum + lot.cost, 0)
          positions[ticker].avg_cost = totalCost / positions[ticker].shares
        } else {
          positions[ticker].avg_cost = 0
        }
      }
    })

    return positions
  }

  private generateDailyValuation(
    holdingsLedger: Record<string, Position>, 
    missingPrices: Set<string>, 
    warnings: string[]
  ): DailySnapshot[] {
    const today = this.getTodayString()
    const snapshots: DailySnapshot[] = []
    
    // Get all unique dates from trades
    const tradeDates = new Set<string>()
    Object.values(holdingsLedger).forEach(position => {
      position.lots.forEach(lot => {
        tradeDates.add(lot.date)
      })
    })
    
    // Add today
    tradeDates.add(today)
    
    // Sort dates ascending
    const sortedDates = Array.from(tradeDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    )

    // Build step-function price series and daily snapshots
    const priceHistory: Record<string, Record<string, number>> = {}
    
    sortedDates.forEach(date => {
      // Initialize price history for this date
      if (!priceHistory[date]) {
        priceHistory[date] = {}
      }

      // Apply step-function pricing rule
      Object.keys(holdingsLedger).forEach(ticker => {
        const position = holdingsLedger[ticker]
        
        if (date === today) {
          // Today: use today's price
          const todayPrice = this.latestPrices[ticker]
          if (todayPrice !== undefined) {
            priceHistory[date][ticker] = todayPrice
          } else {
            missingPrices.add(ticker)
            warnings.push(`No current price for ${ticker}, excluding from valuation`)
          }
        } else {
          // Historical date: use the most recent known price at that time
          const relevantLots = position.lots.filter(lot => lot.date <= date)
          if (relevantLots.length > 0) {
            // Use the price from the most recent lot before or on this date
            const mostRecentLot = relevantLots[relevantLots.length - 1]
            const avgPrice = mostRecentLot.cost / mostRecentLot.quantity
            priceHistory[date][ticker] = avgPrice
          } else {
            // No lots yet, position is zero
            priceHistory[date][ticker] = 0
          }
        }
      })

      // Calculate portfolio value for this date
      let portfolioValue = 0
      const positions: Record<string, Position> = {}

      Object.entries(holdingsLedger).forEach(([ticker, position]) => {
        // Calculate shares held as of this date
        const sharesHeld = position.lots
          .filter(lot => lot.date <= date)
          .reduce((sum, lot) => sum + lot.quantity, 0)

        if (sharesHeld > 0) {
          const price = priceHistory[date][ticker]
          if (price && price > 0) {
            portfolioValue += sharesHeld * price
          }
        }

        // Create position snapshot
        positions[ticker] = {
          shares: sharesHeld,
          lots: position.lots.filter(lot => lot.date <= date),
          avg_cost: position.avg_cost
        }
      })

      snapshots.push({
        date,
        positions,
        cash_balance: 0, // Not tracking cash for now
        portfolio_value: portfolioValue
      })
    })

    return snapshots
  }

  private generatePerformanceData(snapshots: DailySnapshot[]): PerformanceData[] {
    if (snapshots.length === 0) return []

    const performanceData: PerformanceData[] = []
    const baselineValue = snapshots[0].portfolio_value

    snapshots.forEach((snapshot, index) => {
      const value = snapshot.portfolio_value
      const previousValue = index > 0 ? snapshots[index - 1].portfolio_value : value
      
      // Calculate daily return (for step chart, this represents the change at each event)
      const dailyReturn = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0
      
      // Calculate cumulative return
      const cumulativeReturn = baselineValue > 0 ? ((value - baselineValue) / baselineValue) * 100 : 0

      performanceData.push({
        date: snapshot.date,
        value: Math.max(0, value),
        return: dailyReturn,
        cumulativeReturn
      })
    })

    // Ensure we have at least 2 data points for the chart
    if (performanceData.length === 1) {
      const firstPoint = performanceData[0]
      performanceData.unshift({
        date: firstPoint.date,
        value: firstPoint.value * 0.95,
        return: 0,
        cumulativeReturn: -5
      })
    }

    // Final sort to ensure chronological order and remove duplicates
    const uniqueData = new Map<string, PerformanceData>()
    performanceData.forEach(item => {
      uniqueData.set(item.date, item)
    })

    return Array.from(uniqueData.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }
}
