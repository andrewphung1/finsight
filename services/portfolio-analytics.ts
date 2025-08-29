import type { TradingTransaction } from "@/types/trading"
import type { Position, PortfolioMetrics, PerformanceData, PortfolioAnalytics } from "@/types/portfolio"
import { getCurrentPrice } from "./financial-api"
import { format, parseISO, differenceInDays } from "date-fns"

export class PortfolioAnalyticsEngine {
  private transactions: TradingTransaction[]
  private currentPrices: Map<string, number> = new Map()

  constructor(transactions: TradingTransaction[]) {
    this.transactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Calculate current positions from all transactions
  calculatePositions(): Map<string, { quantity: number; totalCost: number; transactions: TradingTransaction[] }> {
    const positions = new Map<string, { quantity: number; totalCost: number; transactions: TradingTransaction[] }>()

    for (const transaction of this.transactions) {
      const { ticker, quantity, price, type } = transaction

      if (!positions.has(ticker)) {
        positions.set(ticker, { quantity: 0, totalCost: 0, transactions: [] })
      }

      const position = positions.get(ticker)!
      position.transactions.push(transaction)

      if (type === "BUY") {
        position.quantity += quantity
        position.totalCost += quantity * price
      } else if (type === "SELL") {
        // For sells, we reduce quantity and proportionally reduce cost basis
        const sellValue = quantity * price
        const avgCost = position.quantity > 0 ? position.totalCost / position.quantity : 0
        const costReduction = quantity * avgCost

        position.quantity -= quantity
        position.totalCost -= costReduction

        // If position goes negative (short selling), handle appropriately
        if (position.quantity < 0) {
          position.totalCost = Math.abs(position.quantity) * price
        }
      }
    }

    // Remove positions with zero quantity
    for (const [ticker, position] of positions.entries()) {
      if (Math.abs(position.quantity) < 0.001) {
        positions.delete(ticker)
      }
    }

    return positions
  }

  // Fetch current prices for all tickers
  async fetchCurrentPrices(tickers: string[]): Promise<void> {
    // Only fetch if we don't already have prices cached
    const tickersToFetch = tickers.filter((ticker) => !this.currentPrices.has(ticker))

    if (tickersToFetch.length === 0) {
      return // All prices already cached
    }

    console.log("[v0] Fetching prices for:", tickersToFetch)

    for (const ticker of tickersToFetch) {
      try {
        // Always attempt to fetch real prices
        const priceData = await getCurrentPrice(ticker)
        this.currentPrices.set(ticker, priceData.price)
        console.log("[v0] Fetched real price for", ticker, priceData.price)
      } catch (error) {
        console.warn(`[v0] Failed to fetch price for ${ticker}:`, error)
        // Use last known price from transactions as fallback
        const lastTransaction = this.transactions
          .filter((t) => t.ticker === ticker)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

        if (lastTransaction) {
          this.currentPrices.set(ticker, lastTransaction.price)
          console.log("[v0] Using last transaction price for", ticker, lastTransaction.price)
        } else {
          console.warn(`[v0] No price data available for ${ticker}`)
        }
      }
    }
  }

  // Calculate portfolio metrics
  async calculateMetrics(): Promise<PortfolioMetrics> {
    const positions = this.calculatePositions()
    const tickers = Array.from(positions.keys())

    await this.fetchCurrentPrices(tickers)

    const portfolioPositions: Position[] = []
    let totalValue = 0
    let totalCost = 0

    for (const [ticker, positionData] of positions.entries()) {
      const currentPrice = this.currentPrices.get(ticker) || 0
      const marketValue = positionData.quantity * currentPrice
      const averageCost = positionData.quantity !== 0 ? positionData.totalCost / positionData.quantity : 0
      const unrealizedGain = marketValue - positionData.totalCost
      const unrealizedGainPercent = positionData.totalCost !== 0 ? (unrealizedGain / positionData.totalCost) * 100 : 0

      const position: Position = {
        ticker,
        shares: positionData.quantity,
        costBasis: positionData.totalCost,
        marketValue,
        unrealizedGain,
        unrealizedGainPercent,
        realizedGain: 0,
        weight: 0, // Will be calculated after we have total value
        lastPrice: currentPrice,
        lastUpdated: new Date().toISOString()
      }

      portfolioPositions.push(position)
      totalValue += marketValue
      totalCost += positionData.totalCost
    }

    // Calculate weights
    portfolioPositions.forEach((position) => {
      position.weight = totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0
    })

    const totalGain = totalValue - totalCost
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    // Calculate day change (simplified - would need historical data for accurate calculation)
    const dayChange = 0 // Placeholder
    const dayChangePercent = 0 // Placeholder

    const assetAllocation = portfolioPositions.map((position) => ({
      ticker: position.ticker,
      name: position.ticker, // Would need company names from API
      value: position.marketValue,
      weight: position.weight,
    }))

    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      dayChange,
      dayChangePercent,
      positions: portfolioPositions.sort((a, b) => b.marketValue - a.marketValue),
      assetAllocation: assetAllocation.sort((a, b) => b.weight - a.weight),
    }
  }

  // Calculate portfolio performance over time
  async calculatePerformance(): Promise<PerformanceData[]> {
    if (this.transactions.length === 0) return []

    const startDate = new Date(this.transactions[0].date)
    const endDate = new Date()
    const performance: PerformanceData[] = []

    // Only fetch current prices once, not for every date point
    const positions = this.calculatePositions()
    const tickers = Array.from(positions.keys())

    // Use cached prices if already fetched, otherwise fetch real prices
    if (this.currentPrices.size === 0) {
      // Fetch real prices from appropriate data sources
      for (const ticker of tickers) {
        try {
          // Check if it's a MAG7 stock first
          const normalizedTicker = ticker.toUpperCase()
          const MAG7_STOCKS = new Set(['AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'GOOGL'])
          
          if (MAG7_STOCKS.has(normalizedTicker)) {
            // For MAG7 stocks, get the latest price from historical data
            const priceStore = await import('@/lib/price-store').then(m => m.getPriceStore())
            const range = priceStore.getTickerDateRange(normalizedTicker)
            if (range) {
              const latestPrices = priceStore.getDailyCloses(normalizedTicker, range.end, range.end)
              if (latestPrices.length > 0) {
                this.currentPrices.set(ticker, latestPrices[0].close)
                continue
              }
            }
          }
          
          // For non-MAG7 stocks or if MAG7 data unavailable, use Google Sheets
          const { googleSheetStore } = await import('@/lib/google-sheet-store')
          const snapshot = await googleSheetStore.getCompanySnapshot(ticker)
          if (snapshot && snapshot.price > 0) {
            this.currentPrices.set(ticker, snapshot.price)
          } else {
            console.warn(`PortfolioAnalytics: No price found for ${ticker}, using fallback`)
            this.currentPrices.set(ticker, 100.0) // Fallback only if no real data available
          }
        } catch (error) {
          console.warn(`PortfolioAnalytics: Error fetching price for ${ticker}:`, error)
          this.currentPrices.set(ticker, 100.0) // Fallback only if error
        }
      }
    }

    // Generate monthly performance data points
    const currentDate = new Date(startDate)
    currentDate.setDate(1) // Start of month

    while (currentDate <= endDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd")

      // Calculate portfolio value at this date using cached prices
      const transactionsUpToDate = this.transactions.filter((t) => new Date(t.date) <= currentDate)

      if (transactionsUpToDate.length > 0) {
        const positionsAtDate = this.calculatePositionsFromTransactions(transactionsUpToDate)
        let totalValue = 0
        let totalCost = 0

        for (const [ticker, positionData] of positionsAtDate.entries()) {
          const currentPrice = this.currentPrices.get(ticker) || positionData.totalCost / positionData.quantity
          const marketValue = positionData.quantity * currentPrice
          totalValue += marketValue
          totalCost += positionData.totalCost
        }

        const totalInvested = transactionsUpToDate
          .filter((t) => t.type === "BUY")
          .reduce((sum, t) => sum + t.quantity * t.price, 0)

        const returnValue = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0
        const cumulativeReturn = performance.length > 0 ? (totalValue / (performance[0]?.value || 1) - 1) * 100 : 0

        performance.push({
          date: dateStr,
          value: totalValue,
          return: returnValue,
          cumulativeReturn,
        })
      }

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    return performance
  }

  private calculatePositionsFromTransactions(
    transactions: TradingTransaction[],
  ): Map<string, { quantity: number; totalCost: number }> {
    const positions = new Map<string, { quantity: number; totalCost: number }>()

    for (const transaction of transactions) {
      const { ticker, quantity, price, type } = transaction

      if (!positions.has(ticker)) {
        positions.set(ticker, { quantity: 0, totalCost: 0 })
      }

      const position = positions.get(ticker)!

      if (type === "BUY") {
        position.quantity += quantity
        position.totalCost += quantity * price
      } else if (type === "SELL") {
        const avgCost = position.quantity > 0 ? position.totalCost / position.quantity : 0
        const costReduction = quantity * avgCost

        position.quantity -= quantity
        position.totalCost -= costReduction

        if (position.quantity < 0) {
          position.totalCost = Math.abs(position.quantity) * price
        }
      }
    }

    // Remove positions with zero quantity
    for (const [ticker, position] of positions.entries()) {
      if (Math.abs(position.quantity) < 0.001) {
        positions.delete(ticker)
      }
    }

    return positions
  }

  // Calculate advanced analytics
  async calculateAnalytics(): Promise<PortfolioAnalytics> {
    const metrics = await this.calculateMetrics()
    const performance = await this.calculatePerformance()

    // Calculate annualized return
    const annualizedReturn = this.calculateAnnualizedReturn(performance)

    // Calculate volatility (standard deviation of returns)
    const volatility = this.calculateVolatility(performance)

    // Calculate Sharpe ratio (assuming 2% risk-free rate)
    const riskFreeRate = 2
    const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0

    // Calculate maximum drawdown
    const maxDrawdown = this.calculateMaxDrawdown(performance)

    // Calculate best and worst day returns
    const dailyReturns = performance.map((p) => p.return).filter((r) => !isNaN(r))
    const bestDay = dailyReturns.length > 0 ? Math.max(...dailyReturns) : 0
    const worstDay = dailyReturns.length > 0 ? Math.min(...dailyReturns) : 0

    return {
      metrics,
      performance,
      holdingsPerformance: [], // Add empty array for now
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      bestDay,
      worstDay,
    }
  }

  private calculateAnnualizedReturn(performance: PerformanceData[]): number {
    if (performance.length < 2) return 0

    const startValue = performance[0].value
    const endValue = performance[performance.length - 1].value
    const startDate = parseISO(performance[0].date)
    const endDate = parseISO(performance[performance.length - 1].date)

    const years = differenceInDays(endDate, startDate) / 365.25

    if (years <= 0 || startValue <= 0) return 0

    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
  }

  private calculateVolatility(performance: PerformanceData[]): number {
    if (performance.length < 2) return 0

    const returns = performance.slice(1).map((p, i) => {
      const prevValue = performance[i].value
      return prevValue > 0 ? ((p.value - prevValue) / prevValue) * 100 : 0
    })

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length

    return Math.sqrt(variance * 12) // Annualized volatility
  }

  private calculateMaxDrawdown(performance: PerformanceData[]): number {
    if (performance.length < 2) return 0

    let maxDrawdown = 0
    let peak = performance[0].value

    for (const point of performance) {
      if (point.value > peak) {
        peak = point.value
      }

      const drawdown = peak > 0 ? ((peak - point.value) / peak) * 100 : 0
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }

    return maxDrawdown
  }
}
