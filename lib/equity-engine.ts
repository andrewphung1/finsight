import { NormalizedTransaction } from '../types/portfolio'
import { PriceStore, DailyClose } from './price-store'
import { googleSheetStore } from './google-sheet-store'

// MAG7 stocks that have historical daily closes
const MAG7_STOCKS = new Set(['AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'GOOGL'])

export interface EquitySeriesPoint {
  date: string // YYYY-MM-DD format
  value: number
  cumulativeReturn?: number
}

export interface EquityEngineStatus {
  valuedThrough: string
  missingPrices: string[]
  bridgedTickers: string[]
  spotValuedTickers: string[]
  warnings: string[]
  totalTrades: number
  dateRange: {
    start: string
    end: string
  }
}

export interface EquityEngineResult {
  series: EquitySeriesPoint[]
  status: EquityEngineStatus
}

export interface PriceResolution {
  price: number | null
  mode: 'timeseries' | 'spot' | 'missing'
}

/**
 * Equity Engine - Builds daily equity series from trades using PriceStore + GoogleSheetStore
 * 
 * Generates a daily timeline from the earliest trade date through today,
 * applies all trades on each day, and values the portfolio using:
 * - MAG7 stocks: PriceStore daily closes (timeseries)
 * - Non-MAG7 stocks: GoogleSheetStore spot prices (constant)
 */
export class EquityEngine {
  private priceStore: PriceStore
  private equitySeriesCache: Map<string, EquityEngineResult> = new Map()

  constructor(priceStore: PriceStore) {
    this.priceStore = priceStore
  }

  /**
   * Resolve price for a specific ticker and date
   * Priority: 1) Timeseries, 2) Spot bridge, 3) Missing
   */
  async resolvePriceForDate(ticker: string, date: string, spotPriceMap?: Map<string, { price: number; asOf: string }>): Promise<PriceResolution> {
    const normalizedTicker = this.normalizeTicker(ticker)
    
    // 1. Timeseries: if date ≤ historyEnd(ticker) → use MAG7 daily close
    if (MAG7_STOCKS.has(normalizedTicker)) {
      try {
        const range = this.priceStore.getTickerDateRange(normalizedTicker)
        if (range && date <= range.end) {
          const dailyCloses = this.priceStore.getDailyCloses(normalizedTicker, date, date)
          if (dailyCloses.length > 0) {
            const price = dailyCloses[0].close
            return {
              price: price,
              mode: 'timeseries'
            }
          }
        }
      } catch (error) {
        console.warn(`[EquityEngine] Failed to get timeseries price for ${normalizedTicker} on ${date}:`, error)
      }
    }
    
    // 2. Spot bridge: if date > historyEnd(ticker) or timeseries missing → use Google Sheet spot
    if (spotPriceMap && spotPriceMap.has(normalizedTicker)) {
      const spotData = spotPriceMap.get(normalizedTicker)!
      return {
        price: spotData.price,
        mode: 'spot'
      }
    } else {
      // Fallback to live fetch if not in cache
      try {
        const snapshot = await googleSheetStore.getCompanySnapshot(normalizedTicker)
        if (snapshot && snapshot.price > 0) {
          return {
            price: snapshot.price,
            mode: 'spot'
          }
        }
      } catch (error) {
        console.warn(`[EquityEngine] Failed to get spot price for ${normalizedTicker} on ${date}:`, error)
      }
    }
    
    // 3. If both missing → mark as missing
    return {
      price: null,
      mode: 'missing'
    }
  }

  /**
   * Normalize ticker symbol (GOOG → GOOGL, strip .US, etc.)
   */
  private normalizeTicker(ticker: string): string {
    let normalized = ticker.toUpperCase()
    
    // Handle GOOG → GOOGL normalization
    if (normalized === 'GOOG') {
      normalized = 'GOOGL'
    }
    
    // Strip .US suffix
    normalized = normalized.replace(/\.US$/, '')
    
    return normalized
  }

  /**
   * Build equity series from trades using batch loading and trading-day iteration
   */
  async buildEquitySeries(trades: NormalizedTransaction[]): Promise<EquityEngineResult> {
    if (!trades || trades.length === 0) {
      return {
        series: [],
        status: {
          valuedThrough: new Date().toISOString().split('T')[0],
          missingPrices: [],
          bridgedTickers: [],
          spotValuedTickers: [],
          warnings: ['No trades provided'],
          totalTrades: 0,
          dateRange: { start: '', end: '' }
        }
      }
    }

    // Create cache key based on trades hash
    const tradesHash = this.hashTrades(trades)
    const cacheKey = `equity_series_${tradesHash}`
    
    // Check cache first
    if (this.equitySeriesCache.has(cacheKey)) {
      console.log(`[EquityEngine] Using cached equity series for ${trades.length} trades`)
      return this.equitySeriesCache.get(cacheKey)!
    }

    console.log(`[EquityEngine] Building equity series for ${trades.length} trades`)

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Get date range and today
    const firstTradeDate = sortedTrades[0].date
    const lastTradeDate = sortedTrades[sortedTrades.length - 1].date
    const today = new Date().toISOString().split('T')[0]

    // Initialize status
    const status: EquityEngineStatus = {
      valuedThrough: today,
      missingPrices: [],
      bridgedTickers: [],
      spotValuedTickers: [],
      warnings: [],
      totalTrades: trades.length,
      dateRange: { start: firstTradeDate, end: today }
    }

    // Group trades by date and ticker (VWAP)
    const tradesByDate = this.groupTradesByDate(sortedTrades)
    
    // Extract all unique tickers from trades
    const allTickers = new Set<string>()
    sortedTrades.forEach(trade => allTickers.add(trade.ticker))
    const tickerArray = Array.from(allTickers)
    
    // Separate MAG7 and non-MAG7 tickers
    const mag7Tickers = tickerArray.filter(ticker => MAG7_STOCKS.has(this.normalizeTicker(ticker)))
    const nonMag7Tickers = tickerArray.filter(ticker => !MAG7_STOCKS.has(this.normalizeTicker(ticker)))
    
    console.log(`[EquityEngine] Tickers: ${mag7Tickers.length} MAG7 (${mag7Tickers.join(', ')}) + ${nonMag7Tickers.length} non-MAG7 (${nonMag7Tickers.join(', ')})`)

    // BATCH LOAD: Preload all MAG7 price data for the full range
    const mag7PriceMap = mag7Tickers.length > 0 
      ? this.priceStore.batchLoadDailyCloses(mag7Tickers, firstTradeDate, today)
      : new Map()

    // BATCH LOAD: Preload all spot prices (for both MAG7 and non-MAG7 bridging)
    const spotPriceMap = new Map<string, { price: number; asOf: string }>()
    const allTickersForSpot = [...mag7Tickers, ...nonMag7Tickers]
    
    for (const ticker of allTickersForSpot) {
      try {
        const snapshot = await googleSheetStore.getCompanySnapshot(ticker)
        if (snapshot && snapshot.price > 0) {
          spotPriceMap.set(ticker, { 
            price: snapshot.price, 
            asOf: (snapshot.asOf || new Date()).toISOString().split('T')[0] 
          })
          console.log(`[EquityEngine] Loaded spot price for ${ticker}: $${snapshot.price}`)
        } else {
          console.warn(`[EquityEngine] No spot price available for ${ticker}`)
          status.missingPrices.push(`${ticker} (no spot price)`)
        }
      } catch (error) {
        console.warn(`[EquityEngine] Failed to load spot price for ${ticker}:`, error)
        status.missingPrices.push(`${ticker} (spot price error)`)
      }
    }
    
    console.log(`[EquityEngine] Spot cache built with ${spotPriceMap.size} tickers: ${Array.from(spotPriceMap.keys()).join(', ')}`)

    // Build timeline from first trade date through today
    
    // Get trading days from PriceStore for historical data
    const tradingDays = this.priceStore.getTradingDays(mag7Tickers, firstTradeDate, today)
    
    // Add trade dates to ensure we capture all relevant dates
    const allDates = new Set<string>()
    tradingDays.forEach(date => allDates.add(date))
    sortedTrades.forEach(trade => allDates.add(trade.date))
    
    // Add today if not already included
    allDates.add(today)
    
    // Sort dates
    const sortedDates = Array.from(allDates).sort()
    
    console.log(`[EquityEngine] Processing ${sortedDates.length} days from ${firstTradeDate} to ${today}`)

    // Build holdings and value portfolio
    const holdings = new Map<string, number>() // ticker -> shares
    let series: EquitySeriesPoint[] = []
    
    // Track which tickers use spot pricing and bridging
    const spotValuedTickers = new Set<string>()
    const missingPrices = new Set<string>()
    const bridgedDates = new Set<string>()
    
    // Process each trading day
    for (const currentDateStr of sortedDates) {
      // Apply trades for this date
      const dayTrades = tradesByDate.get(currentDateStr) || []
      for (const trade of dayTrades) {
        const currentShares = holdings.get(trade.ticker) || 0
        const newShares = currentShares + trade.quantity
        
        // Prevent negative shares
        if (newShares < 0) {
          console.warn(`[EquityEngine] ${currentDateStr}: ${trade.ticker} would have negative shares (${newShares}), clamping to 0`)
          holdings.set(trade.ticker, 0)
        } else {
          holdings.set(trade.ticker, newShares)
        }
      }
      
      // Value portfolio for this date
      let portfolioValue = 0
      const tickers = Array.from(holdings.keys())
      let hasValidPrices = false
      
      // Log first and last few dates for debugging
      const isFirstFew = sortedDates.indexOf(currentDateStr) < 3
      const isLastFew = sortedDates.indexOf(currentDateStr) >= sortedDates.length - 3
      
      for (const ticker of tickers) {
        const shares = holdings.get(ticker) || 0
        if (shares > 0) {
          let price: number | null = null
          let priceMode: 'timeseries' | 'spot' | 'missing' = 'missing'
          
          // Get price using the new resolution logic
          const priceResolution = await this.resolvePriceForDate(ticker, currentDateStr, spotPriceMap)
          price = priceResolution.price
          priceMode = priceResolution.mode
          
          if (price !== null && !isNaN(price) && price > 0) {
            const tickerValue = shares * price
            portfolioValue += tickerValue
            hasValidPrices = true
            
            // Track pricing mode
            if (priceMode === 'spot') {
              spotValuedTickers.add(ticker)
              // Mark this date as bridged if we're using spot for any ticker
              bridgedDates.add(currentDateStr)
            }
            
            // Log first and last few dates for debugging
            if (isFirstFew || isLastFew) {
              // Keep this log for debugging specific ticker issues
              console.log(`[EquityEngine] ${currentDateStr}: ${ticker} - ${shares} shares @ $${price} (${priceMode}) = $${tickerValue.toFixed(2)}`)
            }
          } else {
            // Missing price for this date
            missingPrices.add(`${ticker} on ${currentDateStr}`)
            if (isFirstFew || isLastFew) {
              console.warn(`[EquityEngine] ${currentDateStr}: ${ticker} - ${shares} shares - NO PRICE AVAILABLE`)
            }
          }
        }
      }
      
      // Log daily portfolio total for first and last few dates (commented out to reduce noise)
      // if (portfolioValue > 0 && (isFirstFew || isLastFew)) {
      //   console.log(`[EquityEngine] ${currentDateStr}: PORTFOLIO TOTAL = $${portfolioValue.toFixed(2)}`)
      // }
      
      // Never push a $0 point for a missing-everything day
      if (hasValidPrices) {
        series.push({
          date: currentDateStr,
          value: portfolioValue
        })
      } else {
        // If all tickers are missing, skip the point and add a warning
        console.warn(`[EquityEngine] No price sources available on ${currentDateStr}`)
      }
    }

    // Update status with collected information
    status.missingPrices = Array.from(missingPrices)
    status.spotValuedTickers = Array.from(spotValuedTickers)
    
    // Set status.valuedThrough = today if at least one ticker was successfully priced on today
    let valuedThrough = firstTradeDate
    
    if (series.length > 0) {
      // Find the latest date with valid portfolio value
      for (let i = series.length - 1; i >= 0; i--) {
        if (series[i].value > 0) {
          valuedThrough = series[i].date
          break
        }
      }
    }
    
    status.valuedThrough = valuedThrough
    status.bridgedTickers = Array.from(bridgedDates)
    
    // Don't clamp - allow series to extend past last historical close using spot prices
    console.log(`[EquityEngine] Series extends to ${series.length} points (valuedThrough: ${valuedThrough})`)
    if (bridgedDates.size > 0) {
      console.log(`[EquityEngine] Bridged dates using spot: ${Array.from(bridgedDates).join(', ')}`)
    }

    // Add cumulative return series
    if (series.length > 1) {
      const firstValue = series[0].value
      if (firstValue > 0) {
        for (const point of series) {
          point.cumulativeReturn = ((point.value - firstValue) / firstValue) * 100
        }
      }
    }

    // Log final summary
    console.log(`[EquityEngine] Series complete: ${series.length} points, valued through ${status.valuedThrough}`)
    console.log(`[EquityEngine] Final portfolio value: $${series[series.length - 1]?.value?.toFixed(2) || '0.00'}`)
    console.log(`[EquityEngine] Spot-valued tickers: ${Array.from(spotValuedTickers).join(', ')}`)
    console.log(`[EquityEngine] Bridged dates: ${Array.from(bridgedDates).join(', ')}`)
    console.log(`[EquityEngine] Missing prices: ${Array.from(missingPrices).length} instances`)
    
    // Console diagnostics for verification
    if (series.length > 0) {
      const lastPoint = series[series.length - 1]
      console.log(`[EquityEngine] Last series date: ${lastPoint.date}, value: $${lastPoint.value.toFixed(2)}`)
      console.log(`[EquityEngine] Expected: last date == today (${today}) and no $0 tail point`)
    }

    // Cache the result
    this.equitySeriesCache.set(cacheKey, { series, status })
    console.log(`[EquityEngine] Cached equity series for ${trades.length} trades`)

    return { series, status }
  }

  /**
   * Create a hash of trades for caching
   */
  private hashTrades(trades: NormalizedTransaction[]): string {
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    const tradeStrings = sortedTrades.map(trade => 
      `${trade.date}-${trade.ticker}-${trade.type}-${trade.quantity}-${trade.price}`
    )
    
    // Simple hash function
    let hash = 0
    const combined = tradeStrings.join('|')
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36)
  }

  /**
   * Group trades by date and ticker, calculating VWAP for same-day trades
   */
  private groupTradesByDate(trades: NormalizedTransaction[]): Map<string, NormalizedTransaction[]> {
    const tradesByDate = new Map<string, Map<string, NormalizedTransaction[]>>()
    
    for (const trade of trades) {
      if (!tradesByDate.has(trade.date)) {
        tradesByDate.set(trade.date, new Map())
      }
      
      const dayTrades = tradesByDate.get(trade.date)!
      if (!dayTrades.has(trade.ticker)) {
        dayTrades.set(trade.ticker, [])
      }
      
      dayTrades.get(trade.ticker)!.push(trade)
    }
    
    // Calculate VWAP for each ticker on each day
    const result = new Map<string, NormalizedTransaction[]>()
    
    tradesByDate.forEach((tickerTrades, date) => {
      const vwapTrades: NormalizedTransaction[] = []
      
      tickerTrades.forEach((trades, ticker) => {
        if (trades.length === 1) {
          vwapTrades.push(trades[0])
        } else {
          // Calculate VWAP for multiple trades on same day
          const totalQuantity = trades.reduce((sum, t) => sum + t.quantity, 0)
          const totalValue = trades.reduce((sum, t) => sum + (t.quantity * (t.price || 0)), 0)
          const vwapPrice = totalValue / totalQuantity
          
          vwapTrades.push({
            ...trades[0],
            price: vwapPrice,
            quantity: totalQuantity
          })
        }
      })
      
      result.set(date, vwapTrades)
    })
    
    return result
  }

  /**
   * Dev assertion: verify portfolio value consistency
   */
  private assertPortfolioValueConsistency(
    series: EquitySeriesPoint[], 
    holdings: Map<string, number>,
    status: EquityEngineStatus
  ): void {
    if (series.length === 0) return
    
    const lastPoint = series[series.length - 1]
    const lastDate = lastPoint.date
    
    // Calculate expected portfolio value using latest prices
    let expectedValue = 0
    holdings.forEach(async (shares, ticker) => {
      if (shares > 0) {
        const priceResolution = await this.resolvePriceForDate(ticker, lastDate)
        if (priceResolution.price !== null) {
          expectedValue += shares * priceResolution.price
        }
      }
    })
    
    const difference = Math.abs(lastPoint.value - expectedValue)
    if (difference > 0.01) {
      status.warnings.push(
        `Portfolio value inconsistency: series=${lastPoint.value.toFixed(2)}, ` +
        `calculated=${expectedValue.toFixed(2)}, difference=${difference.toFixed(2)}`
      )
    }
  }

  /**
   * Get portfolio value for a specific date
   */
  async getPortfolioValueOnDate(trades: NormalizedTransaction[], date: string): Promise<number> {
    const { series } = await this.buildEquitySeries(trades)
    const point = series.find(p => p.date === date)
    return point?.value || 0
  }

  /**
   * Get latest portfolio value
   */
  async getLatestPortfolioValue(trades: NormalizedTransaction[]): Promise<number> {
    const { series } = await this.buildEquitySeries(trades)
    return series.length > 0 ? series[series.length - 1].value : 0
  }

  /**
   * Build SPY synthetic benchmark from user cashflows
   */
  buildSPYBenchmark(trades: NormalizedTransaction[], startDate: string, endDate: string): { spyData: any[], spyStatus: string } {
    console.log(`[SPY] Building synthetic SPY benchmark from ${trades.length} trades`)
    
    if (!trades || trades.length === 0) {
      return { spyData: [], spyStatus: "No trades provided for SPY benchmark" }
    }

    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Get SPY price data for the range
    const spyCloses = this.priceStore.getDailyCloses('SPY', startDate, endDate)
    if (spyCloses.length === 0) {
      console.warn('[SPY] No SPY price data available for benchmark')
      return { spyData: [], spyStatus: "No SPY price data available" }
    }

    // Create SPY close map for quick lookup
    const spyCloseMap = new Map<string, number>()
    spyCloses.forEach(close => {
      spyCloseMap.set(close.date, close.close)
    })

    console.log(`[SPY] Loaded ${spyCloses.length} SPY closes from ${spyCloses[0].date} to ${spyCloses[spyCloses.length - 1].date}`)

    // Build cashflow schedule from trades
    let spyShares = 0
    const spySharesTimeline: { date: string; shares: number; cashflow: number; spyClose: number }[] = []

    for (const trade of sortedTrades) {
      // Calculate cashflow (BUY = outflow, SELL = inflow, fees = negative)
      const notional = (trade.quantity || 0) * (trade.price || 0)
      const fees = trade.fees || 0
      const cashflow = trade.type === 'BUY' ? -(notional + fees) : (notional - fees)

      // Get SPY close for trade date (with backfill)
      let spyClose = spyCloseMap.get(trade.date)
      if (spyClose === undefined) {
        // Backfill: find the most recent SPY close on or before trade date
        const availableCloses = Array.from(spyCloseMap.entries())
          .filter(([date]) => date <= trade.date)
          .sort(([a], [b]) => b.localeCompare(a)) // Sort descending
        
        if (availableCloses.length > 0) {
          spyClose = availableCloses[0][1]
        } else {
          console.warn(`[SPY] No SPY close available for trade date ${trade.date}, skipping trade`)
          continue
        }
      }

      // Update SPY shares
      const previousShares = spyShares
      if (trade.type === 'BUY') {
        spyShares += Math.abs(cashflow) / spyClose
      } else if (trade.type === 'SELL') {
        const sharesToSell = Math.min(Math.abs(cashflow) / spyClose, spyShares)
        spyShares -= sharesToSell
        if (sharesToSell < Math.abs(cashflow) / spyClose) {
          console.warn(`[SPY] SELL trade ${trade.date} attempted to sell more shares than available`)
        }
      }

      // Record timeline
      spySharesTimeline.push({
        date: trade.date,
        shares: spyShares,
        cashflow: cashflow,
        spyClose: spyClose
      })

      // Log first and last few events
      if (spySharesTimeline.length <= 3 || spySharesTimeline.length > sortedTrades.length - 3) {
        console.log(`[SPY] Trade ${trade.date}: ${trade.type} ${trade.ticker} - cashflow=$${cashflow.toFixed(2)}, SPY close=$${spyClose.toFixed(2)}, shares: ${previousShares.toFixed(6)} → ${spyShares.toFixed(6)}`)
      }
    }

    // Build SPY benchmark values for each trading day
    const spyData: any[] = []
    let lastKnownSpyShares = 0

    // Get all trading days from SPY data
    const tradingDays = spyCloses.map(close => close.date).sort()

    for (const date of tradingDays) {
      // Get SPY shares for this date (use monotonic lookup)
      let currentSpyShares = lastKnownSpyShares
      for (const timeline of spySharesTimeline) {
        if (timeline.date <= date) {
          currentSpyShares = timeline.shares
        } else {
          break
        }
      }
      lastKnownSpyShares = currentSpyShares

      // Get SPY close for this date
      const spyClose = spyCloseMap.get(date)
      if (!spyClose || spyClose <= 0) {
        continue // Skip dates with no valid SPY close
      }

      const spyValue = currentSpyShares * spyClose
      
      spyData.push({
        date: date,
        spyValue: spyValue,
        spyShares: currentSpyShares,
        spyClose: spyClose
      })
    }

    console.log(`[SPY] Benchmark complete: ${spyData.length} points, final value: $${spyData[spyData.length - 1]?.spyValue?.toFixed(2) || '0.00'}`)
    
    return { 
      spyData, 
      spyStatus: `SPY benchmark built with ${spyData.length} points from ${trades.length} trades` 
    }
  }

  /**
   * Clear the equity series cache
   */
  clearCache(): void {
    this.equitySeriesCache.clear()
    console.log('[EquityEngine] Cache cleared')
  }
}

