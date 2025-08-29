import { Position, NormalizedTransaction, AssetAllocation, PerformanceMetrics } from '@/types/portfolio'
import { EquityEngine, EquitySeriesPoint, EquityEngineStatus } from './equity-engine'
import { getPriceStore } from './price-store'
import { googleSheetStore } from './google-sheet-store'
import { MAG7_STOCKS } from '@/data/mag7-stocks'

export interface LiveDataMetrics {
  // Hero Row metrics
  totalValue: number
  ytdReturn: number
  allTimeReturn: number
  currentHoldingsCount: number
  lastUpdated: string
  
  // Portfolio Performance metrics
  equitySeries: EquitySeriesPoint[]
  returnSeries: EquitySeriesPoint[]
  
  // Asset Allocation metrics
  assetAllocation: AssetAllocation[]
  
  // Holdings Performance metrics
  holdingsPerformance: Position[]
  
  // Status and metadata
  status: EquityEngineStatus
  valuationDate: string
  currency: string
  warnings: string[]
}

export interface LiveDataConfig {
  includeBenchmarks?: boolean
  benchmarkTickers?: string[]
  baseCurrency?: string
  maxPositionWeight?: number // Threshold for position highlighting
}

/**
 * Live Data Service - Ensures all Overview Tab metrics are computed from real data sources
 * 
 * Data Contracts (priority order):
 * 1. Positions & Transactions: canonical list of holdings with share counts over time
 * 2. Prices: MAG7 → historical daily series, Non-MAG7 → present-day price (flat backfill)
 * 3. Reference Data: sector, industry, asset class, region, currency
 * 4. Benchmarks: SPY/QQQ/etc. historical prices
 * 
 * Global Rules:
 * - Valuation date = latest trading day available (T)
 * - Currency: compute and display in portfolio base currency
 * - No gaps/NaN in series. Forward-fill MAG7; non-MAG7 use present-day price across history
 * - Invariants: Last point of Value chart = sum of current positions' market values
 */
export class LiveDataService {
  private equityEngine: EquityEngine
  private priceStore: any
  private config: LiveDataConfig

  constructor(config: LiveDataConfig = {}) {
    this.config = {
      includeBenchmarks: true,
      benchmarkTickers: ['SPY'],
      baseCurrency: 'USD',
      maxPositionWeight: 20, // 20% threshold
      ...config
    }
  }

  /**
   * Initialize the service with required data stores
   */
  async initialize(): Promise<void> {
    try {
      this.priceStore = await getPriceStore()
      this.equityEngine = new EquityEngine(this.priceStore)
      console.log('LiveDataService: Initialized successfully')
    } catch (error) {
      console.error('LiveDataService: Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Compute all live metrics from real data sources
   */
  async computeLiveMetrics(
    positions: Position[],
    transactions: NormalizedTransaction[]
  ): Promise<LiveDataMetrics> {
    if (!this.equityEngine) {
      await this.initialize()
    }

    const warnings: string[] = []
    const valuationDate = this.getLatestTradingDay()

    // 1. Compute equity series using EquityEngine (real data)
    const equityResult = await this.equityEngine.buildEquitySeries(transactions)
    const equitySeries = equityResult.series
    const status = equityResult.status

    // 2. Compute total value from current positions (real prices)
    const totalValue = await this.computeTotalValue(positions, valuationDate, warnings)

    // 3. Compute YTD return from equity series
    const ytdReturn = this.computeYTDReturn(equitySeries, valuationDate)

    // 4. Compute all-time return from equity series
    const allTimeReturn = this.computeAllTimeReturn(equitySeries)

    // 5. Compute return series (TWR preferred, price-only fallback)
    const returnSeries = this.computeReturnSeries(equitySeries, transactions)

    // 6. Compute asset allocation from live market values
    const assetAllocation = await this.computeAssetAllocation(positions, totalValue, valuationDate)

    // 7. Compute holdings performance with real prices
    const holdingsPerformance = await this.computeHoldingsPerformance(positions, valuationDate, warnings)

    // 8. Validate invariants
    this.validateInvariants(equitySeries, totalValue, positions, warnings)

    return {
      totalValue,
      ytdReturn,
      allTimeReturn,
      currentHoldingsCount: positions.length,
      lastUpdated: valuationDate,
      equitySeries,
      returnSeries,
      assetAllocation,
      holdingsPerformance,
      status,
      valuationDate,
      currency: this.config.baseCurrency!,
      warnings
    }
  }

  /**
   * Compute total portfolio value from current positions using real prices
   */
  private async computeTotalValue(
    positions: Position[], 
    valuationDate: string, 
    warnings: string[]
  ): Promise<number> {
    let totalValue = 0

    for (const position of positions) {
      const ticker = position.ticker.toUpperCase()
      const shares = position.shares || 0
      
      if (shares <= 0) continue

      try {
        let price: number

        // MAG7 stocks: use historical price data
        if (MAG7_STOCKS[ticker]) {
          const range = this.priceStore.getTickerDateRange(ticker)
          if (range && valuationDate <= range.end) {
            const dailyCloses = this.priceStore.getDailyCloses(ticker, valuationDate, valuationDate)
            if (dailyCloses.length > 0) {
              price = dailyCloses[0].close
            } else {
              // Forward-fill: use last available price
              const allPrices = this.priceStore.getDailyCloses(ticker, range.start, range.end)
              if (allPrices.length > 0) {
                price = allPrices[allPrices.length - 1].close
                warnings.push(`Forward-filled price for ${ticker} on ${valuationDate}`)
              } else {
                price = 100.0 // Hard default
                warnings.push(`No price data available for ${ticker}, using default`)
              }
            }
          } else {
            price = 100.0 // Hard default
            warnings.push(`No price data available for ${ticker}, using default`)
          }
        } else {
          // Non-MAG7 stocks: use Google Sheets current price
          const snapshot = await googleSheetStore.getCompanySnapshot(ticker)
          if (snapshot && snapshot.price > 0) {
            price = snapshot.price
          } else {
            // Fallback to last transaction price
            price = position.lastPrice || 100.0
            warnings.push(`Using last transaction price for ${ticker}: $${price}`)
          }
        }

        const marketValue = shares * price
        totalValue += marketValue

        // Update position with current market value
        position.marketValue = marketValue
        position.currentPrice = price

      } catch (error) {
        console.warn(`LiveDataService: Error computing value for ${ticker}:`, error)
        warnings.push(`Error computing value for ${ticker}: ${error}`)
        totalValue += (shares * (position.lastPrice || 100.0))
      }
    }

    return totalValue
  }

  /**
   * Compute YTD return from equity series
   */
  private computeYTDReturn(equitySeries: EquitySeriesPoint[], valuationDate: string): number {
    if (equitySeries.length < 2) return 0

    const currentYear = new Date().getFullYear()
    const yearStartDate = `${currentYear}-01-01`

    // Find baseline value (first point in current year or earliest available)
    let baselineValue = 0
    let currentValue = equitySeries[equitySeries.length - 1].value

    for (const point of equitySeries) {
      if (point.date >= yearStartDate && point.value > 0) {
        baselineValue = point.value
        break
      }
    }

    // If no baseline found in current year, use earliest point
    if (baselineValue === 0 && equitySeries[0].value > 0) {
      baselineValue = equitySeries[0].value
    }

    if (baselineValue > 0 && currentValue > 0) {
      return ((currentValue - baselineValue) / baselineValue) * 100
    }

    return 0
  }

  /**
   * Compute all-time return from equity series
   */
  private computeAllTimeReturn(equitySeries: EquitySeriesPoint[]): number {
    if (equitySeries.length < 2) return 0

    const firstValue = equitySeries[0].value
    const lastValue = equitySeries[equitySeries.length - 1].value

    if (firstValue > 0 && lastValue > 0) {
      return ((lastValue - firstValue) / firstValue) * 100
    }

    return 0
  }

  /**
   * Compute return series (TWR preferred, price-only fallback)
   */
  private computeReturnSeries(
    equitySeries: EquitySeriesPoint[], 
    transactions: NormalizedTransaction[]
  ): EquitySeriesPoint[] {
    if (equitySeries.length < 2) return []

    const returnSeries: EquitySeriesPoint[] = []
    const firstValue = equitySeries[0].value

    if (firstValue <= 0) return []

    for (const point of equitySeries) {
      const returnPercent = ((point.value - firstValue) / firstValue) * 100
      returnSeries.push({
        date: point.date,
        value: returnPercent,
        cumulativeReturn: returnPercent
      })
    }

    return returnSeries
  }

  /**
   * Compute asset allocation from live market values
   */
  private async computeAssetAllocation(
    positions: Position[], 
    totalValue: number, 
    valuationDate: string
  ): Promise<AssetAllocation[]> {
    if (totalValue <= 0) return []

    const allocationMap = new Map<string, { value: number; count: number }>()

    for (const position of positions) {
      const marketValue = position.marketValue || 0
      if (marketValue <= 0) continue

      // Group by sector (primary allocation)
      const sector = position.sector || 'Unknown'
      const current = allocationMap.get(sector) || { value: 0, count: 0 }
      current.value += marketValue
      current.count += 1
      allocationMap.set(sector, current)

      // Check for overweight positions
      const weight = (marketValue / totalValue) * 100
      if (weight > this.config.maxPositionWeight!) {
        console.warn(`LiveDataService: Position ${position.ticker} is overweight: ${weight.toFixed(1)}%`)
      }
    }

    return Array.from(allocationMap.entries()).map(([name, data]) => ({
      name,
      value: data.value,
      weight: (data.value / totalValue) * 100,
      count: data.count
    })).sort((a, b) => b.value - a.value)
  }

  /**
   * Compute holdings performance with real prices
   */
  private async computeHoldingsPerformance(
    positions: Position[], 
    valuationDate: string, 
    warnings: string[]
  ): Promise<Position[]> {
    const performance: Position[] = []

    for (const position of positions) {
      const ticker = position.ticker.toUpperCase()
      const shares = position.shares || 0
      const costBasis = position.costBasis || 0
      const marketValue = position.marketValue || 0

      if (shares <= 0) continue

      // Calculate unrealized P/L
      const unrealizedPL = marketValue - costBasis
      const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0

      // Calculate contribution to portfolio (weight * total return)
      const totalValue = positions.reduce((sum, p) => sum + (p.marketValue || 0), 0)
      const weight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0
      const contributionToPortfolio = weight * unrealizedPLPercent

      performance.push({
        ...position,
        unrealizedPL,
        unrealizedPLPercent,
        contributionToPortfolio,
        weight
      })
    }

    return performance.sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
  }

  /**
   * Validate invariants
   */
  private validateInvariants(
    equitySeries: EquitySeriesPoint[], 
    totalValue: number, 
    positions: Position[], 
    warnings: string[]
  ): void {
    if (equitySeries.length === 0) return

    const lastEquityValue = equitySeries[equitySeries.length - 1].value
    const positionsValue = positions.reduce((sum, p) => sum + (p.marketValue || 0), 0)
    const difference = Math.abs(lastEquityValue - positionsValue)

    // Invariant: Last point of Value chart = sum of current positions' market values (±0.01)
    if (difference > 0.01) {
      warnings.push(`Invariant violation: Equity series (${lastEquityValue}) != Positions sum (${positionsValue}), diff: ${difference}`)
    }

    // Invariant: Hero Total Value = same as above
    if (Math.abs(totalValue - positionsValue) > 0.01) {
      warnings.push(`Invariant violation: Total value (${totalValue}) != Positions sum (${positionsValue})`)
    }
  }

  /**
   * Get latest trading day available
   */
  private getLatestTradingDay(): string {
    // For now, use today's date
    // In a real implementation, this would check market calendar
    return new Date().toISOString().split('T')[0]
  }

  /**
   * Get benchmark data if configured
   */
  async getBenchmarkData(startDate: string, endDate: string): Promise<EquitySeriesPoint[]> {
    if (!this.config.includeBenchmarks || !this.config.benchmarkTickers) {
      return []
    }

    const benchmarkSeries: EquitySeriesPoint[] = []
    
    for (const ticker of this.config.benchmarkTickers) {
      try {
        if (MAG7_STOCKS[ticker]) {
          const range = this.priceStore.getTickerDateRange(ticker)
          if (range) {
            const dailyCloses = this.priceStore.getDailyCloses(ticker, startDate, endDate)
            if (dailyCloses.length > 0) {
              // Convert to equity series format
              const series = dailyCloses.map((close, index) => ({
                date: close.date,
                value: close.close * 100 // Normalize to 100 base
              }))
              benchmarkSeries.push(...series)
            }
          }
        }
      } catch (error) {
        console.warn(`LiveDataService: Error getting benchmark data for ${ticker}:`, error)
      }
    }

    return benchmarkSeries
  }
}
