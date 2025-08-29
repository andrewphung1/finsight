import { NormalizedTransaction, AssetAllocation } from '@/types/portfolio'
import { PriceService } from './price-service'
import { PriceStore } from './price-store'
import { computeYTDFromSeries, convertEquitySeriesToDailySeries, assertYTDConsistency } from './performance/ytd'
import { EquityEngine, EquitySeriesPoint } from './equity-engine'

// Local Position interface that matches the actual usage in this file
interface Position {
  ticker: string
  shares: number
  costBasis: number
  marketValue: number
  unrealizedGain: number
  unrealizedGainPercent: number
  realizedGain: number
  weight: number
  sector?: string
  lastPrice?: number
  lastUpdated?: string
}

export interface PortfolioRecord {
  id: string
  name: string
  createdAt: string
  source: 'import' | 'api'
  rawTransactions: NormalizedTransaction[]
  holdings: Position[]
  assetAllocation: AssetAllocation[]
  equitySeries: { ts: number; value: number }[]
  returnSeries: { ts: number; portfolioReturn: number; sp500Return?: number }[]
  holdingsPerformance: Array<{
    ticker: string
    name: string
    totalReturn: number
    totalReturnPercent: number
    realizedGain: number
    unrealizedGain: number
    marketValue: number
    costBasis: number
  }>
  metrics: {
    totalValue: number
    totalCost: number
    totalGain: number
    totalGainPercent: number
    ytdReturn: number
    cagr1Y?: number
    cagr3Y?: number
    cagr5Y?: number
  }
  lastPrices: Record<string, number>
  status: 'ready' | 'computing' | 'error'
  error?: string
  version: number // Version counter for reactivity
  // NEW: Pricing resolution tracking
  pricingStatus?: 'pending' | 'resolving' | 'resolved' | 'error'
  resolvedTickers?: string[]
  totalTickers?: number
}

export interface PortfolioState {
  portfolios: Record<string, PortfolioRecord>
  activePortfolioId: string | null
  costBasisMethod: 'FIFO' | 'LIFO' | 'AVERAGE'
}

export interface PortfolioStore {
  // State
  getState(): PortfolioState
  getActivePortfolio(): PortfolioRecord | null
  
  // Portfolio management
  setActivePortfolio(id: string | null): void
  addOrReplacePortfolio(record: PortfolioRecord): void
  removePortfolio(id: string): void
  clearAllPortfolios(): void
  setCostBasisMethod(method: 'FIFO' | 'LIFO' | 'AVERAGE'): void
  
  // Data operations
  importTransactions(transactions: NormalizedTransaction[], source: string, name?: string): Promise<string>
  updatePrices(prices: Record<string, number>): Promise<void>
  hydrateFromSession(session: any): void
  
  // Selectors
  selectActiveHoldings(): Position[]
  selectActiveAssetAllocation(): AssetAllocation[]
  selectActiveEquitySeries(): { ts: number; value: number }[]
  selectActiveReturnSeries(): { ts: number; portfolioReturn: number; sp500Return?: number }[]
  selectActiveHoldingsPerformance(): Array<{
    ticker: string
    name: string
    totalReturn: number
    totalReturnPercent: number
    realizedGain: number
    unrealizedGain: number
    marketValue: number
    costBasis: number
  }>
  selectActiveMetrics(): {
    totalValue: number
    totalCost: number
    totalGain: number
    totalGainPercent: number
    ytdReturn: number
    cagr1Y?: number
    cagr3Y?: number
    cagr5Y?: number
  } | null
  selectActiveMetadata(): { name: string; lastUpdated: string; status: string; error?: string } | null
  
  // Persistence
  hydrateFromLocalStorage(): void
  persistToLocalStorage(): void
  
  // Subscriptions
  subscribe(listener: () => void): () => void
}

class PortfolioStoreImpl implements PortfolioStore {
  private state: PortfolioState
  private priceService: PriceService
  private listeners: Set<() => void> = new Set()
  private version = 0

  constructor(priceService: PriceService) {
    this.priceService = priceService
    this.state = {
      portfolios: {},
      activePortfolioId: null,
      costBasisMethod: 'FIFO'
    }
    
    // No demo portfolio initialization - start empty
  }

  // Demo portfolio initialization removed - system operates only on imported data

  // Demo transaction processing removed - system operates only on imported data

  private calculateHoldingsFromTransactions(transactions: NormalizedTransaction[]): Position[] {
    const holdings = new Map<string, Position>()
    
    for (const transaction of transactions) {
      const ticker = transaction.normalizedTicker
      const existing = holdings.get(ticker)
      
      if (existing) {
        // Update existing position
        if (transaction.type === 'BUY') {
          existing.shares += transaction.quantity
          existing.costBasis += transaction.totalCost
        } else if (transaction.type === 'SELL') {
          existing.shares += transaction.quantity // quantity is negative for SELL
          // For simplicity, we'll keep the cost basis the same
        }
      } else {
        // Create new position
        holdings.set(ticker, {
          ticker,
          shares: transaction.signedQuantity,
          costBasis: transaction.totalCost,
          marketValue: 0, // Will be updated with current prices
          unrealizedGain: 0,
          unrealizedGainPercent: 0,
          realizedGain: 0,
          weight: 0
        })
      }
    }
    
    // Convert to array and filter out zero shares
    const holdingsArray = Array.from(holdings.values())
      .filter(h => h.shares > 0)
    
    // Calculate total portfolio value for weights
    const totalValue = holdingsArray.reduce((sum, h) => sum + (h.shares * 150), 0)
    
    return holdingsArray.map(h => ({
      ...h,
      marketValue: h.shares * 150, // Use approximate current prices
      unrealizedGain: (h.shares * 150) - h.costBasis,
      unrealizedGainPercent: h.costBasis > 0 ? ((h.shares * 150) - h.costBasis) / h.costBasis * 100 : 0,
      weight: totalValue > 0 ? (h.shares * 150) / totalValue * 100 : 0
    }))
  }

  getState(): PortfolioState {
    return { ...this.state }
  }

  getActivePortfolio(): PortfolioRecord | null {
    if (!this.state.activePortfolioId) return null
    return this.state.portfolios[this.state.activePortfolioId] || null
  }

  setActivePortfolio(id: string | null): void {
    if (id && !this.state.portfolios[id]) {
      console.warn(`Portfolio ${id} not found`)
      return
    }
    
    this.state.activePortfolioId = id
    this.bumpVersion()
    this.notify()
    
    console.log('PortfolioStore: Active portfolio changed to', id)
  }

  addOrReplacePortfolio(record: PortfolioRecord): void {
    // Bump version for reactivity
    record.version = (record.version || 0) + 1
    this.state.portfolios[record.id] = record
    this.bumpVersion()
    this.notify()
    
    console.log('PortfolioStore: Added/replaced portfolio', record.id, record.name, {
      status: record.status,
      version: record.version,
      holdingsCount: record.holdings.length,
      assetAllocationCount: record.assetAllocation.length,
      equitySeriesCount: record.equitySeries.length,
      returnSeriesCount: record.returnSeries.length,
      holdingsPerformanceCount: record.holdingsPerformance.length
    })
  }

  removePortfolio(id: string): void {
    delete this.state.portfolios[id]
    
    // If we're removing the active portfolio, clear active portfolio
    if (this.state.activePortfolioId === id) {
      this.state.activePortfolioId = ''
    }
    
    this.bumpVersion()
    this.notify()
    
    console.log('PortfolioStore: Removed portfolio', id)
  }

  clearAllPortfolios(): void {
    this.state.portfolios = {}
    this.state.activePortfolioId = null
    
    this.bumpVersion()
    this.notify()
    
    console.log('PortfolioStore: Cleared all portfolios')
  }

  setCostBasisMethod(method: 'FIFO' | 'LIFO' | 'AVERAGE'): void {
    this.state.costBasisMethod = method
    
    // Recompute all portfolios with new method
    Object.keys(this.state.portfolios).forEach(portfolioId => {
      const portfolio = this.state.portfolios[portfolioId]
      if (portfolio.status === 'ready') {
        this.recomputePortfolio(portfolioId)
      }
    })
  }

  async importTransactions(
    transactions: NormalizedTransaction[], 
    source: string, 
    name?: string
  ): Promise<string> {
    console.log('PortfolioStore: Starting import with', transactions.length, 'transactions')
    console.log('PortfolioStore: Sample transactions', transactions.slice(0, 3))
    
    const portfolioId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const portfolioName = name || `Imported: ${source}`
    
    // Create new portfolio record
    const portfolio: PortfolioRecord = {
      id: portfolioId,
      name: portfolioName,
      createdAt: new Date().toISOString(),
      source: 'import',
      rawTransactions: transactions,
      holdings: [],
      assetAllocation: [],
      equitySeries: [],
      returnSeries: [],
      lastPrices: {},
      status: 'computing',
      version: 0,
      holdingsPerformance: [],
      metrics: {
        totalValue: 0,
        totalCost: 0,
        totalGain: 0,
        totalGainPercent: 0,
        ytdReturn: 0
      }
    }
    
    console.log('PortfolioStore: Created portfolio record', portfolioId, portfolioName)
    
    // Add to store and make active
    this.addOrReplacePortfolio(portfolio)
    this.setActivePortfolio(portfolioId)
    
    // Start computation
    try {
      await this.recomputePortfolio(portfolioId)
      
      // Log diagnostics
      const finalPortfolio = this.state.portfolios[portfolioId]
      console.log('PortfolioStore: Import completed', {
        portfolioId,
        name: portfolioName,
        transactionCount: transactions.length,
        uniqueTickers: [...new Set(transactions.map(t => t.normalizedTicker))],
        totalValue: finalPortfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0),
        allocationTotal: finalPortfolio.assetAllocation.reduce((sum, a) => sum + a.weight, 0),
        seriesStart: finalPortfolio.equitySeries[0]?.ts ? new Date(finalPortfolio.equitySeries[0].ts).toISOString() : null,
        seriesEnd: finalPortfolio.equitySeries[finalPortfolio.equitySeries.length - 1]?.ts ? new Date(finalPortfolio.equitySeries[finalPortfolio.equitySeries.length - 1].ts).toISOString() : null
      })
      
      return portfolioId
    } catch (error) {
      console.error('PortfolioStore: Import computation failed', error)
      portfolio.status = 'error'
      portfolio.error = error instanceof Error ? error.message : 'Unknown error'
      this.addOrReplacePortfolio(portfolio)
      throw error
    }
  }

  async updatePrices(prices: Record<string, number>): Promise<void> {
    const activePortfolio = this.getActivePortfolio()
    if (!activePortfolio) return
    
    // Update prices for active portfolio
    activePortfolio.lastPrices = { ...activePortfolio.lastPrices, ...prices }
    
    // Recompute if portfolio is ready
    if (activePortfolio.status === 'ready') {
      await this.recomputePortfolio(activePortfolio.id)
    }
  }

  private async recomputePortfolio(portfolioId: string): Promise<void> {
    const portfolio = this.state.portfolios[portfolioId]
    if (!portfolio) return
    
    portfolio.status = 'computing'
    this.addOrReplacePortfolio(portfolio)
    
    try {
      console.log('PortfolioStore: Starting recompute for portfolio', portfolioId, {
        transactionCount: portfolio.rawTransactions.length,
        tickers: [...new Set(portfolio.rawTransactions.map(t => t.normalizedTicker))]
      })
      
      // Get unique tickers from transactions
      const tickers = [...new Set(portfolio.rawTransactions.map(t => t.normalizedTicker))]
      
      // Fetch latest prices
      const latestPrices = await this.priceService.getLatestPrices(tickers)
      portfolio.lastPrices = latestPrices
      
      console.log('PortfolioStore: Fetched prices', latestPrices)
      
      // Compute holdings using cost basis method
      portfolio.holdings = this.computeHoldings(portfolio.rawTransactions, latestPrices)
      
      console.log('PortfolioStore: Computed holdings', portfolio.holdings.length, 'positions')
      
      // Compute asset allocation
      portfolio.assetAllocation = this.computeAssetAllocation(portfolio.holdings)
      
      console.log('PortfolioStore: Computed asset allocation', portfolio.assetAllocation.length, 'items')
      
      // Compute equity series
      portfolio.equitySeries = await this.computeEquitySeries(portfolio.rawTransactions, latestPrices)
      
      console.log('PortfolioStore: Computed equity series', portfolio.equitySeries.length, 'points')
      
      // Compute return series
      portfolio.returnSeries = await this.computeReturnSeries(portfolio.rawTransactions, portfolio.equitySeries)
      
      console.log('PortfolioStore: Computed return series', portfolio.returnSeries.length, 'points')
      
      // Compute holdings performance
      portfolio.holdingsPerformance = this.computeHoldingsPerformance(portfolio.holdings)
      
      console.log('PortfolioStore: Computed holdings performance', portfolio.holdingsPerformance.length, 'items')
      
      // Compute high-level metrics
      portfolio.metrics = this.computeMetrics(portfolio.holdings, portfolio.equitySeries)
      
      console.log('PortfolioStore: Computed metrics', portfolio.metrics)
      
      portfolio.status = 'ready'
      portfolio.error = undefined
      
      this.addOrReplacePortfolio(portfolio)
      console.log('PortfolioStore: Recomputed portfolio', portfolioId, 'successfully')
    } catch (error) {
      console.error('PortfolioStore: Recompute failed for portfolio', portfolioId, error)
      portfolio.status = 'error'
      portfolio.error = error instanceof Error ? error.message : 'Unknown error'
      this.addOrReplacePortfolio(portfolio)
    }
  }

  private computeHoldings(transactions: NormalizedTransaction[], prices: Record<string, number>): Position[] {
    console.log('PortfolioStore: Computing holdings for', transactions.length, 'transactions')
    console.log('PortfolioStore: Available prices', prices)
    
    if (!transactions || transactions.length === 0) {
      console.log('PortfolioStore: No transactions to process')
      return []
    }
    
    if (!prices || Object.keys(prices).length === 0) {
      console.warn('PortfolioStore: No prices available, using defaults')
      prices = {
        'AAPL': 175.0, 'MSFT': 300.0, 'GOOGL': 400.0, 'AMZN': 150.0,
        'TSLA': 75.0, 'NVDA': 500.0, 'META': 250.0, 'NFLX': 200.0,
        'SPY': 450.0, 'QQQ': 400.0
      }
    }
    
    // Group transactions by ticker
    const tickerGroups = new Map<string, NormalizedTransaction[]>()
    
    transactions.forEach(tx => {
      if (!tx.normalizedTicker) {
        console.warn('PortfolioStore: Transaction missing normalizedTicker:', tx)
        return
      }
      const ticker = tx.normalizedTicker
      if (!tickerGroups.has(ticker)) {
        tickerGroups.set(ticker, [])
      }
      tickerGroups.get(ticker)!.push(tx)
    })
    
    console.log('PortfolioStore: Grouped transactions by ticker', Array.from(tickerGroups.keys()))
    
    const holdings: Position[] = []
    
    tickerGroups.forEach((txs, ticker) => {
      console.log('PortfolioStore: Processing ticker', ticker, 'with', txs.length, 'transactions')
      
      try {
        // Sort transactions by date
        const sortedTxs = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        let totalShares = 0
        let totalCost = 0
        let realizedGain = 0
        
        // Process transactions based on cost basis method
        const lots: Array<{ shares: number; cost: number; date: string }> = []
        
        sortedTxs.forEach(tx => {
          if (tx.quantity > 0) {
            // Buy transaction
            lots.push({
              shares: tx.quantity,
              cost: tx.totalCost || (tx.quantity * (tx.price || 0)),
              date: tx.date
            })
          } else {
            // Sell transaction
            const sharesToSell = Math.abs(tx.quantity)
            let sharesRemaining = sharesToSell
            
            while (sharesRemaining > 0 && lots.length > 0) {
              let currentLot = lots[0]
              
              if (this.state.costBasisMethod === 'LIFO') {
                currentLot = lots[lots.length - 1]
              }
              
              const sharesFromLot = Math.min(sharesRemaining, currentLot.shares)
              const costFromLot = (sharesFromLot / currentLot.shares) * currentLot.cost
              
              // Calculate realized gain/loss
              const proceeds = sharesFromLot * (tx.totalCost / Math.abs(tx.quantity))
              realizedGain += proceeds - costFromLot
              
              if (sharesFromLot === currentLot.shares) {
                // Remove entire lot
                if (this.state.costBasisMethod === 'LIFO') {
                  lots.pop()
                } else {
                  lots.shift()
                }
              } else {
                // Reduce lot
                currentLot.shares -= sharesFromLot
                currentLot.cost -= costFromLot
              }
              
              sharesRemaining -= sharesFromLot
            }
          }
        })
        
        // Calculate current position
        totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0)
        totalCost = lots.reduce((sum, lot) => sum + lot.cost, 0)
        
        if (totalShares > 0) {
          const currentPrice = prices[ticker] || 0
          const marketValue = totalShares * currentPrice
          const unrealizedGain = marketValue - totalCost
          const unrealizedGainPercent = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0
          
          holdings.push({
            ticker,
            shares: totalShares,
            costBasis: totalCost,
            marketValue,
            unrealizedGain,
            unrealizedGainPercent,
            realizedGain,
            weight: 0, // Will be calculated in asset allocation
            sector: this.getSector(ticker),
            lastPrice: currentPrice,
            lastUpdated: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('PortfolioStore: Error processing ticker', ticker, error)
      }
    })
    
    console.log('PortfolioStore: Computed holdings result', holdings.map(h => ({
      ticker: h.ticker,
      shares: h.shares,
      marketValue: h.marketValue,
      costBasis: h.costBasis
    })))
    
    return holdings
  }

  private computeAssetAllocation(holdings: Position[]): AssetAllocation[] {
    if (!holdings || holdings.length === 0) {
      console.log('PortfolioStore: No holdings to allocate')
      return []
    }
    
    const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0)
    
    console.log('PortfolioStore: Computing asset allocation for', holdings.length, 'holdings, total value:', totalValue)
    
    const allocation = holdings
      .filter(holding => holding.marketValue > 0) // Only include positions with value
      .map(holding => ({
        ticker: holding.ticker,
        name: holding.ticker, // Use ticker as name for now
        value: holding.marketValue,
        weight: totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0,
        sector: holding.sector || 'Unknown'
      }))
      .sort((a, b) => b.weight - a.weight)
    
    console.log('PortfolioStore: Asset allocation result', allocation.map(a => ({
      ticker: a.ticker,
      value: a.value,
      weight: a.weight
    })))
    
    return allocation
  }

  private async computeEquitySeries(
    transactions: NormalizedTransaction[], 
    prices: Record<string, number>
  ): Promise<{ ts: number; value: number }[]> {
    // Feature flag to use EquityEngine
    const USE_EQUITY_ENGINE = true
    
    if (USE_EQUITY_ENGINE) {
      return this.computeEquitySeriesWithEngine(transactions)
    } else {
      return this.computeEquitySeriesLegacy(transactions, prices)
    }
  }

  private async computeEquitySeriesWithEngine(
    transactions: NormalizedTransaction[]
  ): Promise<{ ts: number; value: number }[]> {
    console.log('PortfolioStore: Computing equity series with EquityEngine')
    
    if (!transactions || transactions.length === 0) {
      console.log('PortfolioStore: No transactions for equity series')
      return []
    }

    try {
      // Create PriceStore instance
      const priceStore = new PriceStore()
      
      // Create EquityEngine instance
      const equityEngine = new EquityEngine(priceStore)
      
      // Build equity series using EquityEngine
      const result = await equityEngine.buildEquitySeries(transactions)
      
      // Convert EquitySeriesPoint[] to { ts: number; value: number }[]
      const series = result.series.map(point => ({
        ts: new Date(point.date).getTime(),
        value: point.value
      }))
      
      console.log('PortfolioStore: EquityEngine generated series', {
        points: series.length,
        status: result.status
      })
      
      return series
    } catch (error) {
      console.error('PortfolioStore: Error computing equity series with EquityEngine:', error)
      // Fallback to legacy method
      return this.computeEquitySeriesLegacy(transactions, {})
    }
  }

  private async computeEquitySeriesLegacy(
    transactions: NormalizedTransaction[], 
    prices: Record<string, number>
  ): Promise<{ ts: number; value: number }[]> {
    if (!transactions || transactions.length === 0) {
      console.log('PortfolioStore: No transactions for equity series')
      return []
    }
    
    if (!prices || Object.keys(prices).length === 0) {
      console.warn('PortfolioStore: No prices for equity series, using defaults')
      prices = {
        'AAPL': 175.0, 'MSFT': 300.0, 'GOOGL': 400.0, 'AMZN': 150.0,
        'TSLA': 75.0, 'NVDA': 500.0, 'META': 250.0, 'NFLX': 200.0,
        'SPY': 450.0, 'QQQ': 400.0
      }
    }
    
    // Sort transactions by date
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Get date range from first transaction to today
    const firstDate = new Date(sortedTransactions[0].date)
    const today = new Date()
    
    const startTs = firstDate.setHours(0, 0, 0, 0)
    const endTs = today.setHours(0, 0, 0, 0)
    
    // Generate daily portfolio value series
    const series: { ts: number; value: number }[] = []
    let currentHoldings = new Map<string, number>() // ticker -> shares
    let currentValue = 0
    let liquidationDate: number | null = null
    
    // Add initial point (before any transactions)
    series.push({
      ts: startTs,
      value: 0
    })
    
    // Process each transaction date
    const transactionDates = [...new Set(sortedTransactions.map(t => t.date))]
    
    for (const dateStr of transactionDates) {
      const dateTs = new Date(dateStr).setHours(0, 0, 0, 0)
      
      // Get all transactions for this date
      const dayTransactions = sortedTransactions.filter(t => t.date === dateStr)
      
      // Update holdings for this date
      dayTransactions.forEach(tx => {
        const ticker = tx.normalizedTicker
        const currentShares = currentHoldings.get(ticker) || 0
        const newShares = currentShares + tx.quantity
        
        if (newShares === 0) {
          currentHoldings.delete(ticker)
        } else {
          currentHoldings.set(ticker, newShares)
        }
      })
      
      // Calculate portfolio value at this date
      currentValue = 0
      currentHoldings.forEach((shares, ticker) => {
        const price = prices[ticker] || 0
        currentValue += shares * price
      })
      
      // Check if portfolio is fully liquidated
      if (currentValue === 0 && currentHoldings.size === 0 && liquidationDate === null) {
        liquidationDate = dateTs
      }
      
      // Add point for this date
      series.push({
        ts: dateTs,
        value: currentValue
      })
    }
    
    // If portfolio is still active, extend to today using latest prices
    if (currentValue > 0) {
      series.push({
        ts: endTs,
        value: currentValue
      })
    } else if (liquidationDate !== null) {
      // If fully liquidated earlier, flatline to 0 for any window extending past liquidation
      // The series already ends at liquidation date with value 0
    }
    
    console.log('PortfolioStore: Generated equity series', {
      points: series.length,
      dateRange: `${new Date(startTs).toISOString()} to ${new Date(endTs).toISOString()}`,
      finalValue: currentValue,
      liquidationDate: liquidationDate ? new Date(liquidationDate).toISOString() : null,
      holdings: Object.fromEntries(currentHoldings)
    })
    
    return series
  }

  private computeHoldingsAtDate(
    transactions: NormalizedTransaction[], 
    dateTs: number, 
    prices: Record<string, number>
  ): Position[] {
    // Filter transactions up to this date
    const relevantTxs = transactions.filter(tx => new Date(tx.date).getTime() <= dateTs)
    
    // Use the same logic as computeHoldings but with historical prices
    // For simplicity, using current prices for now
    return this.computeHoldings(relevantTxs, prices)
  }

  private async computeReturnSeries(
    transactions: NormalizedTransaction[],
    equitySeries: { ts: number; value: number }[]
  ): Promise<{ ts: number; portfolioReturn: number; sp500Return?: number }[]> {
    if (!equitySeries || equitySeries.length === 0) {
      console.log('PortfolioStore: No equity series for return calculation')
      return []
    }
    
    // Calculate portfolio returns
    const initialValue = equitySeries[0].value
    const startTs = equitySeries[0].ts
    const returns = equitySeries.map(point => ({
      ts: point.ts,
      portfolioReturn: initialValue > 0 ? ((point.value - initialValue) / initialValue) * 100 : 0,
      sp500Return: this.computeSP500Baseline(point.ts, startTs) // TODO: Implement proper S&P 500 baseline
    }))
    
    return returns
  }

  private computeSP500Baseline(timestamp: number, startTs: number): number {
    // TODO: Implement proper S&P 500 baseline with same cash-flow schedule
    // For now, using a simple historical S&P 500 return approximation
    const date = new Date(timestamp)
    const startDate = new Date(startTs)
    const yearsElapsed = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    
    // Historical S&P 500 average annual return ~10%
    const sp500AnnualReturn = 0.10
    const sp500Return = (Math.pow(1 + sp500AnnualReturn, yearsElapsed) - 1) * 100
    
    return sp500Return
  }

  private getSector(ticker: string): string {
    // Simple sector mapping - could be expanded
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'GOOGL': 'Technology',
      'AMZN': 'Consumer Discretionary',
      'TSLA': 'Consumer Discretionary',
      'NVDA': 'Technology',
      'META': 'Technology',
      'NFLX': 'Communication Services',
      'SPY': 'ETF',
      'QQQ': 'ETF'
    }
    
    return sectorMap[ticker] || 'Unknown'
  }

  private computeHoldingsPerformance(holdings: Position[]): Array<{
    ticker: string
    name: string
    totalReturn: number
    totalReturnPercent: number
    realizedGain: number
    unrealizedGain: number
    marketValue: number
    costBasis: number
  }> {
    return holdings
      .filter(holding => holding.marketValue > 0)
      .map(holding => {
        const totalReturn = holding.realizedGain + holding.unrealizedGain
        const totalReturnPercent = holding.costBasis > 0 ? (totalReturn / holding.costBasis) * 100 : 0
        
        return {
          ticker: holding.ticker,
          name: holding.ticker, // Use ticker as name for now
          totalReturn,
          totalReturnPercent,
          realizedGain: holding.realizedGain,
          unrealizedGain: holding.unrealizedGain,
          marketValue: holding.marketValue,
          costBasis: holding.costBasis
        }
      })
      .sort((a, b) => b.totalReturnPercent - a.totalReturnPercent) // Sort by performance
  }

  private computeMetrics(
    holdings: Position[], 
    equitySeries: { ts: number; value: number }[]
  ): {
    totalValue: number
    totalCost: number
    totalGain: number
    totalGainPercent: number
    ytdReturn: number
    cagr1Y?: number
    cagr3Y?: number
    cagr5Y?: number
  } {
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0)
    const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0)
    const totalGain = holdings.reduce((sum, h) => sum + h.realizedGain + h.unrealizedGain, 0)
    const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    // Calculate YTD return using canonical function
    let ytdReturn = 0
    if (equitySeries && equitySeries.length > 0) {
      try {
        const dailySeries = convertEquitySeriesToDailySeries(equitySeries)
        const ytdResult = computeYTDFromSeries(dailySeries)
        ytdReturn = ytdResult.ytdReturn
        
        // Runtime consistency check
        assertYTDConsistency(ytdResult, totalValue, 'PortfolioStore YTD calculation')
        
        console.log('PortfolioStore: YTD calculation result:', {
          ytdReturn,
          baselineDate: ytdResult.baselineDate,
          baselineValue: ytdResult.baselineValue,
          currentValue: ytdResult.currentValue,
          portfolioValue: totalValue
        })
      } catch (error) {
        console.error('PortfolioStore: Error calculating YTD return:', error)
      }
    }

    // Calculate CAGR if we have enough data
    let cagr1Y: number | undefined
    let cagr3Y: number | undefined
    let cagr5Y: number | undefined

    if (equitySeries && equitySeries.length > 1) {
      const firstValue = equitySeries[0].value
      const lastValue = equitySeries[equitySeries.length - 1].value
      const firstDate = new Date(equitySeries[0].ts)
      const lastDate = new Date(equitySeries[equitySeries.length - 1].ts)
      const yearsElapsed = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

      if (yearsElapsed > 0 && firstValue > 0) {
        const totalReturn = (lastValue / firstValue) - 1
        const cagr = Math.pow(1 + totalReturn, 1 / yearsElapsed) - 1

        if (yearsElapsed >= 1) cagr1Y = cagr * 100
        if (yearsElapsed >= 3) cagr3Y = cagr * 100
        if (yearsElapsed >= 5) cagr5Y = cagr * 100
      }
    }

    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercent,
      ytdReturn,
      cagr1Y,
      cagr3Y,
      cagr5Y
    }
  }

  // Selectors
  selectActiveHoldings(): Position[] {
    const portfolio = this.getActivePortfolio()
    if (!portfolio) {
      console.log('PortfolioStore: No active portfolio for holdings')
      return []
    }
    return portfolio.holdings || []
  }

  selectActiveAssetAllocation(): AssetAllocation[] {
    const portfolio = this.getActivePortfolio()
    if (!portfolio) {
      console.log('PortfolioStore: No active portfolio for asset allocation')
      return []
    }
    return portfolio.assetAllocation || []
  }

  selectActiveEquitySeries(): { ts: number; value: number }[] {
    const portfolio = this.getActivePortfolio()
    if (!portfolio) {
      console.log('PortfolioStore: No active portfolio for equity series')
      return []
    }
    return portfolio.equitySeries || []
  }

  selectActiveReturnSeries(): { ts: number; portfolioReturn: number; sp500Return?: number }[] {
    const portfolio = this.getActivePortfolio()
    if (!portfolio) {
      console.log('PortfolioStore: No active portfolio for return series')
      return []
    }
    return portfolio.returnSeries || []
  }

  selectActiveHoldingsPerformance(): Array<{
    ticker: string
    name: string
    totalReturn: number
    totalReturnPercent: number
    realizedGain: number
    unrealizedGain: number
    marketValue: number
    costBasis: number
  }> {
    const portfolio = this.getActivePortfolio()
    if (!portfolio) {
      console.log('PortfolioStore: No active portfolio for holdings performance')
      return []
    }
    return portfolio.holdingsPerformance || []
  }

  selectActiveMetrics(): {
    totalValue: number
    totalCost: number
    totalGain: number
    totalGainPercent: number
    ytdReturn: number
    cagr1Y?: number
    cagr3Y?: number
    cagr5Y?: number
  } | null {
    const portfolio = this.getActivePortfolio()
    if (!portfolio) {
      console.log('PortfolioStore: No active portfolio for metrics')
      return null
    }
    return portfolio.metrics || null
  }

  selectActiveMetadata(): { name: string; lastUpdated: string; status: string; error?: string } | null {
    const portfolio = this.getActivePortfolio()
    if (!portfolio) return null
    
    return {
      name: portfolio.name,
      lastUpdated: portfolio.createdAt,
      status: portfolio.status,
      error: portfolio.error
    }
  }

  // Persistence
  hydrateFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('portfolio-store')
      if (stored) {
        const parsed = JSON.parse(stored)
        
        // Filter out demo portfolios - only restore import portfolios
        if (parsed.portfolios) {
          const filteredPortfolios: Record<string, PortfolioRecord> = {}
          Object.entries(parsed.portfolios).forEach(([id, portfolio]: [string, any]) => {
            if (portfolio.source === 'import') {
              filteredPortfolios[id] = portfolio
            } else {
              console.log('PortfolioStore: Filtering out demo portfolio during hydration:', id)
            }
          })
          parsed.portfolios = filteredPortfolios
          
          // Clear active portfolio if it was a demo portfolio
          if (parsed.activePortfolioId && !filteredPortfolios[parsed.activePortfolioId]) {
            parsed.activePortfolioId = null
            console.log('PortfolioStore: Cleared active demo portfolio during hydration')
          }
        }
        
        this.state = { ...this.state, ...parsed }
        this.bumpVersion()
        this.notify()
        
        console.log('PortfolioStore: Hydrated from localStorage (demo portfolios filtered out)')
      }
    } catch (error) {
      console.warn('Failed to hydrate portfolio store from localStorage:', error)
    }
  }

  persistToLocalStorage(): void {
    try {
      localStorage.setItem('portfolio-store', JSON.stringify(this.state))
    } catch (error) {
      console.warn('Failed to persist portfolio store to localStorage:', error)
    }
  }

  // Subscriptions
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private bumpVersion(): void {
    this.version++
  }

  private notify(): void {
    this.listeners.forEach(listener => listener())
  }

  hydrateFromSession(session: any): void {
    console.log('PortfolioStore: Hydrating from session:', {
      sid: session.sid,
      positionsCount: session.positions?.length || 0,
      transactionsCount: session.trades?.length || 0,
      equitySeriesLength: session.equityEngineSeries?.length || 0
    })

    // Create portfolio record from session data
    const portfolioRecord: PortfolioRecord = {
      id: 'import-session',
      name: 'Import Session',
      createdAt: new Date().toISOString(),
      source: 'import' as const,
      rawTransactions: session.trades || [],
      holdings: (session.positions || []).map((pos: any) => ({
        ticker: pos.ticker,
        shares: pos.shares || pos.quantity || 0,
        costBasis: pos.avgSharePrice || 0, // Use avgSharePrice as costBasis
        marketValue: pos.marketValue || 0,
        unrealizedGain: pos.unrealizedGain || 0,
        unrealizedGainPercent: pos.unrealizedGainPercent || 0,
        realizedGain: pos.realizedGain || 0,
        weight: pos.weight || 0,
        sector: pos.sector,
        lastPrice: pos.lastPrice || pos.lastKnownPrice,
        lastUpdated: pos.lastUpdated
      })),
      assetAllocation: session.assetAllocation || [],
      equitySeries: (session.equityEngineSeries || []).map((point: any) => ({
        ts: new Date(point.date).getTime(),
        value: point.value
      })),
      returnSeries: (session.returnSeries || []).map((point: any) => ({
        ts: new Date(point.date).getTime(),
        portfolioReturn: point.portfolioReturn,
        sp500Return: point.benchmarkReturn
      })),
      holdingsPerformance: (session.holdingsPerformance || []).map((hp: any) => ({
        ticker: hp.ticker,
        name: hp.ticker,
        totalReturn: hp.totalReturn || 0,
        totalReturnPercent: hp.totalReturnPercent || 0,
        realizedGain: hp.realizedGain || 0,
        unrealizedGain: hp.unrealizedGain || 0,
        marketValue: hp.marketValue || 0,
        costBasis: hp.avgSharePrice || 0
      })),
      metrics: {
        totalValue: session.metrics?.totalValue || 0,
        totalCost: session.metrics?.totalCost || 0,
        totalGain: session.metrics?.totalGain || 0,
        totalGainPercent: session.metrics?.totalGainPercent || 0,
        ytdReturn: session.metrics?.ytdReturn || 0
      },
      lastPrices: {},
      status: 'ready' as const,
      version: 1,
      pricingStatus: session.pricingStatus || 'resolved',
      resolvedTickers: session.resolvedTickers || [],
      totalTickers: session.totalTickers || 0
    }

    // Add to store and set as active
    this.addOrReplacePortfolio(portfolioRecord)
    this.setActivePortfolio('import-session')

    console.info('[HYDRATE] store', {
      active: this.state.activePortfolioId,
      positions: portfolioRecord.holdings.length,
      txs: portfolioRecord.rawTransactions.length
    })
  }
}

// Singleton instance
let globalStore: PortfolioStoreImpl | null = null

export function createPortfolioStore(priceService: PriceService): PortfolioStore {
  if (!globalStore) {
    globalStore = new PortfolioStoreImpl(priceService)
  }
  return globalStore
}

export function getPortfolioStore(): PortfolioStore {
  if (!globalStore) {
    throw new Error('PortfolioStore not initialized. Call createPortfolioStore first.')
  }
  return globalStore
}
