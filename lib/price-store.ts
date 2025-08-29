import { SPY_PRICE_HISTORY } from '../data/spy-price-history'

// Define the actual structure from the price data
interface PriceHistoryPoint {
  ticker: string
  baseTicker: string
  per: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose: number
  year: number
}

export interface DailyClose {
  date: string // YYYY-MM-DD format
  close: number
}

export interface PriceStoreStatus {
  missingPrices: string[]
  warnings: string[]
  lastUpdated: string
}

/**
 * PriceStore - Single source of truth for all price data
 * 
 * Provides deterministic access to historical and current stock prices.
 * Handles ticker normalization, forward-filling, and data validation.
 * 
 * Sources:
 * - MAG7 stocks: Real daily price data from API route
 * - SPY: Historical data from data/spy-price-history.ts
 */
export class PriceStore {
  private priceData: Map<string, PriceHistoryPoint[]>
  private tickerMap: Map<string, string> // Maps normalized tickers to actual symbols
  private status: PriceStoreStatus
  private initialized: boolean = false
  
  // NEW: Batch loading cache for performance
  private batchCache: Map<string, Map<string, number>> = new Map() // ticker -> date -> close
  private lastCacheRange: { start: string; end: string } | null = null

    constructor() {
    this.priceData = new Map()
    this.tickerMap = new Map()
    this.status = {
      missingPrices: [],
      warnings: [],
      lastUpdated: new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Factory method to create and initialize PriceStore
   */
  static async create(): Promise<PriceStore> {
    const store = new PriceStore()
    await store.initializePriceData()
    return store
  }

  /**
   * Initialize price data from MAG7 API and SPY sources
   */
  private async initializePriceData(): Promise<void> {
    // Load MAG7 price data from API
    try {
      const response = await fetch('/api/mag7-prices')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          Object.entries(result.data).forEach(([symbol, stockData]: [string, any]) => {
            const priceHistory = stockData.priceHistory || []
            this.priceData.set(symbol, priceHistory)
            
            // Create ticker mappings (handle both AAPL and AAPL.US formats)
            this.tickerMap.set(symbol, symbol)
            this.tickerMap.set(`${symbol}.US`, symbol)
            
            // Log confirmation of price loading from files
            console.log(`[PriceStore] Loaded ${priceHistory.length} price points for ${symbol} from /data/price-history/mag7 price/`)
            if (priceHistory.length > 0) {
              const firstDate = priceHistory[0].date
              const lastDate = priceHistory[priceHistory.length - 1].date
              console.log(`[PriceStore] ${symbol} date range: ${firstDate} to ${lastDate}`)
            }
          })
          
          console.log(`[PriceStore] Loaded ${Object.keys(result.data).length} MAG7 stocks from API`)
        } else {
          console.warn('PriceStore: Failed to load MAG7 data from API:', result.error)
          this.status.warnings.push('Failed to load MAG7 price data from API')
        }
      } else {
        console.warn('PriceStore: API request failed:', response.status)
        this.status.warnings.push('Failed to fetch MAG7 price data')
      }
    } catch (error) {
      console.error('PriceStore: Error loading MAG7 data:', error)
      this.status.warnings.push('Error loading MAG7 price data')
    }

    // Add Alphabet class normalization (GOOG → GOOGL)
    this.tickerMap.set('GOOG', 'GOOGL')
    this.tickerMap.set('GOOG.US', 'GOOGL')

    // Load SPY data from mag7/spy.txt (same as other MAG7 files)
    try {
      const spyResponse = await fetch('/api/prices/SPY?start=2018-01-01&end=2025-12-31')
      if (spyResponse.ok) {
        const spyResult = await spyResponse.json()
        if (spyResult.prices && spyResult.prices.length > 0) {
          // Normalize SPY data to match PriceHistoryPoint structure
          const normalizedSpyData: PriceHistoryPoint[] = spyResult.prices.map((point: any) => ({
            ticker: 'SPY',
            baseTicker: 'SPY',
            per: 'D',
            date: point.date,
            open: point.price, // Use price as open since we only have close
            high: point.price,
            low: point.price,
            close: point.price,
            volume: 0, // Not available in text files
            adjustedClose: point.price, // Use price as adjustedClose
            year: new Date(point.date).getFullYear()
          }))
          
          this.priceData.set('SPY', normalizedSpyData)
          this.tickerMap.set('SPY', 'SPY')
          this.tickerMap.set('SPY.US', 'SPY')
          
          console.log(`[PriceStore] Loaded ${normalizedSpyData.length} SPY price points from /data/price-history/mag7 price/spy.txt`)
          if (normalizedSpyData.length > 0) {
            const firstDate = normalizedSpyData[0].date
            const lastDate = normalizedSpyData[normalizedSpyData.length - 1].date
            console.log(`[PriceStore] SPY date range: ${firstDate} to ${lastDate}`)
            console.log(`[PriceStore] SPY sample:`, { 
              first: { date: normalizedSpyData[0].date, close: normalizedSpyData[0].close, adjustedClose: normalizedSpyData[0].adjustedClose }, 
              last: { date: normalizedSpyData[normalizedSpyData.length - 1].date, close: normalizedSpyData[normalizedSpyData.length - 1].close, adjustedClose: normalizedSpyData[normalizedSpyData.length - 1].adjustedClose } 
            })
          }
        } else {
          console.warn('[PriceStore] SPY data is empty from API')
          // Fallback to old data
          this.priceData.set('SPY', SPY_PRICE_HISTORY.priceHistory)
          this.tickerMap.set('SPY', 'SPY')
          this.tickerMap.set('SPY.US', 'SPY')
        }
      } else {
        console.warn('[PriceStore] Failed to load SPY from API, using fallback')
        // Fallback to old data
        this.priceData.set('SPY', SPY_PRICE_HISTORY.priceHistory)
        this.tickerMap.set('SPY', 'SPY')
        this.tickerMap.set('SPY.US', 'SPY')
      }
    } catch (error) {
      console.error('[PriceStore] Error loading SPY data:', error)
      // Fallback to old data
      this.priceData.set('SPY', SPY_PRICE_HISTORY.priceHistory)
      this.tickerMap.set('SPY', 'SPY')
      this.tickerMap.set('SPY.US', 'SPY')
    }

    console.log(`PriceStore: Total loaded ${this.priceData.size} stocks with price history (MAG7 + SPY)`)
    
    // Validate date ranges and track missing tickers
    this.validateDataRanges()
    
    this.initialized = true
  }

  /**
   * Normalize ticker symbol (AAPL.US -> AAPL, GOOG -> GOOGL)
   */
  private normalizeTicker(ticker: string): string {
    const normalized = this.tickerMap.get(ticker.toUpperCase())
    if (!normalized) {
      this.status.warnings.push(`Unknown ticker: ${ticker}`)
      return ticker.toUpperCase()
    }
    return normalized
  }

  /**
   * Batch load daily closes for multiple tickers over a date range
   * This is the preferred method for performance - loads all data once
   */
  batchLoadDailyCloses(tickers: string[], startDate: string, endDate: string): Map<string, Map<string, number>> {
    console.log(`[PriceStore] Batch loading daily closes for ${tickers.length} tickers from ${startDate} to ${endDate}`)
    
    // Check if we already have this range cached
    if (this.lastCacheRange && 
        this.lastCacheRange.start === startDate && 
        this.lastCacheRange.end === endDate) {
      console.log(`[PriceStore] Using cached batch data for range ${startDate} to ${endDate}`)
      return this.batchCache
    }
    
    // Clear previous cache
    this.batchCache.clear()
    
    // Load data for each ticker
    tickers.forEach(ticker => {
      const normalizedTicker = this.normalizeTicker(ticker)
      const dailyCloses = this.getDailyCloses(normalizedTicker, startDate, endDate)
      
      // Create date -> close map for this ticker
      const tickerMap = new Map<string, number>()
      dailyCloses.forEach(close => {
        tickerMap.set(close.date, close.close)
      })
      
      this.batchCache.set(normalizedTicker, tickerMap)
      console.log(`[PriceStore] Cached ${tickerMap.size} closes for ${normalizedTicker}`)
    })
    
    // Store the range for cache validation
    this.lastCacheRange = { start: startDate, end: endDate }
    
    return this.batchCache
  }

  /**
   * Get a single close price for a ticker on a specific date (from batch cache)
   */
  getCloseForDate(ticker: string, date: string): number | null {
    const normalizedTicker = this.normalizeTicker(ticker)
    const tickerCache = this.batchCache.get(normalizedTicker)
    
    if (tickerCache) {
      return tickerCache.get(date) || null
    }
    
    // Fallback to individual lookup if not in batch cache
    const dailyCloses = this.getDailyCloses(normalizedTicker, date, date)
    return dailyCloses.length > 0 ? dailyCloses[0].close : null
  }

  /**
   * Get daily closing prices for a ticker within a date range
   * Returns forward-filled data for non-trading days, but stops at last available data
   */
  getDailyCloses(ticker: string, startDate: string, endDate: string): DailyClose[] {
    const normalizedTicker = this.normalizeTicker(ticker)
    const priceHistory = this.priceData.get(normalizedTicker)
    
    if (!priceHistory || priceHistory.length === 0) {
      console.warn(`[PriceStore] getDailyCloses: No price history available for ${ticker} (normalized: ${normalizedTicker})`)
      this.status.missingPrices.push(`${ticker} (no price history available)`)
      return []
    }

    // Sort price history by date
    const sortedHistory = [...priceHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Get the actual date range of available data
    const historyStart = new Date(sortedHistory[0].date)
    const historyEnd = new Date(sortedHistory[sortedHistory.length - 1].date)

    // Clamp requested window to available history
    const start = new Date(Math.max(new Date(startDate).getTime(), historyStart.getTime()))
    const end = new Date(Math.min(new Date(endDate).getTime(), historyEnd.getTime()))
    
    if (start > end) {
      console.warn(`[PriceStore] getDailyCloses: Invalid date range for ${ticker} - start: ${startDate}, end: ${endDate}, available: ${historyStart.toISOString().split('T')[0]} to ${historyEnd.toISOString().split('T')[0]}`)
      return []
    }

    // Add targeted SPY logging
    if (normalizedTicker === 'SPY') {
      console.log(`[SPY] getDailyCloses called:`, {
        requestedRange: `${startDate} to ${endDate}`,
        availableRange: `${historyStart.toISOString().split('T')[0]} to ${historyEnd.toISOString().split('T')[0]}`,
        clampedRange: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        totalHistoryPoints: sortedHistory.length
      })
    }

    // Filter to date range and forward-fill (but only within available data)
    const result: DailyClose[] = []
    let currentDate = new Date(start)
    let lastKnownClose: number | null = null
    let priceIndex = 0

    while (currentDate <= end) {
      const currentDateStr = currentDate.toISOString().split('T')[0]
      
      // Find the latest price on or before current date
      while (priceIndex < sortedHistory.length && 
             new Date(sortedHistory[priceIndex].date) <= currentDate) {
        // Use adjustedClose if available, otherwise fall back to close
        const point = sortedHistory[priceIndex]
        lastKnownClose = point.adjustedClose ?? point.close
        priceIndex++
      }
      
      // Add the forward-filled value if we have one
      if (lastKnownClose !== null) {
        result.push({
          date: currentDateStr,
          close: lastKnownClose
        })
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Log the results
    // Log only if no results found (for debugging)
    if (result.length === 0) {
      const availableRange = this.getTickerDateRange(normalizedTicker)
      console.warn(`[PriceStore] E005: Window empty for ${ticker} - requested: ${startDate} to ${endDate}, available: ${availableRange ? `${availableRange.start} to ${availableRange.end}` : 'none'}`)
    }

    // Add targeted SPY logging for results
    if (normalizedTicker === 'SPY') {
      console.log(`[SPY] getDailyCloses result:`, {
        closesReturned: result.length,
        firstClose: result[0] ? { date: result[0].date, close: result[0].close } : null,
        lastClose: result[result.length - 1] ? { date: result[result.length - 1].date, close: result[result.length - 1].close } : null
      })
    }

    return result
  }

  /**
   * Get the date range for a ticker
   */
  getTickerDateRange(ticker: string): { start: string; end: string } | null {
    const normalizedTicker = this.normalizeTicker(ticker)
    const priceHistory = this.priceData.get(normalizedTicker)
    
    if (!priceHistory || priceHistory.length === 0) {
      return null
    }

    const sortedHistory = [...priceHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    return {
      start: sortedHistory[0].date,
      end: sortedHistory[sortedHistory.length - 1].date
    }
  }

  /**
   * Get the latest closing price for a ticker
   */
  getLatestClose(ticker: string): number | null {
    const normalizedTicker = this.normalizeTicker(ticker)
    const priceHistory = this.priceData.get(normalizedTicker)
    
    if (!priceHistory || priceHistory.length === 0) {
      this.status.missingPrices.push(`${ticker} (no price history available)`)
      return null
    }

    const sortedHistory = [...priceHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Use adjustedClose if available, otherwise fall back to close
    const lastPoint = sortedHistory[sortedHistory.length - 1]
    return lastPoint.adjustedClose ?? lastPoint.close
  }

  /**
   * Get all available trading days for a set of tickers within a date range
   * This is used to build the time axis for portfolio valuation
   */
  getTradingDays(tickers: string[], startDate: string, endDate: string): string[] {
    const allDates = new Set<string>()
    
    // Add dates from each ticker's price history
    tickers.forEach(ticker => {
      const normalizedTicker = this.normalizeTicker(ticker)
      const priceHistory = this.priceData.get(normalizedTicker)
      
      if (priceHistory && priceHistory.length > 0) {
        priceHistory.forEach(point => {
          if (point.date >= startDate && point.date <= endDate) {
            allDates.add(point.date)
          }
        })
      }
    })
    
    // Sort dates
    const sortedDates = Array.from(allDates).sort()
    
    console.log(`[PriceStore] Found ${sortedDates.length} trading days for ${tickers.length} tickers from ${startDate} to ${endDate}`)
    
    return sortedDates
  }

  /**
   * Clear the batch cache
   */
  clearBatchCache(): void {
    this.batchCache.clear()
    this.lastCacheRange = null
    console.log('[PriceStore] Batch cache cleared')
  }

  /**
   * Check if a ticker has price data
   */
  hasTicker(ticker: string): boolean {
    const normalizedTicker = this.normalizeTicker(ticker)
    const priceHistory = this.priceData.get(normalizedTicker)
    return !!(priceHistory && priceHistory.length > 0)
  }

  /**
   * Get current status including missing prices and warnings
   */
  getStatus(): PriceStoreStatus {
    return { ...this.status }
  }

  /**
   * Validate data ranges and track missing tickers
   */
  private validateDataRanges(): void {
    const mag7Tickers = ['AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'GOOGL']
    const dateRanges: Record<string, { start: string; end: string }> = {}
    
    // Get date ranges for all MAG7 tickers
    mag7Tickers.forEach(ticker => {
      const range = this.getTickerDateRange(ticker)
      if (range) {
        dateRanges[ticker] = range
      } else {
        this.status.warnings.push(`MAG7 ticker ${ticker} has no price data`)
      }
    })
    
    // Check if all have the same date range (only for available tickers)
    const ranges = Object.values(dateRanges)
    if (ranges.length > 1) {
      const firstRange = ranges[0]
      const inconsistentTickers = Object.entries(dateRanges).filter(([ticker, range]) => 
        range.start !== firstRange.start || range.end !== firstRange.end
      )
      
      if (inconsistentTickers.length > 0) {
        this.status.warnings.push(
          `MAG7 tickers have inconsistent date ranges: ${inconsistentTickers.map(([ticker, range]) => 
            `${ticker}(${range.start}-${range.end})`
          ).join(', ')}`
        )
      }
    }
    
    // Track missing tickers
    const missingTickers = mag7Tickers.filter(ticker => !this.hasTicker(ticker))
    if (missingTickers.length > 0) {
      this.status.warnings.push(`Missing MAG7 tickers: ${missingTickers.join(', ')}`)
    }
    
    console.log('PriceStore: Data validation:', {
      tickersLoaded: Object.keys(dateRanges),
      dateRange: ranges[0] || null,
      warnings: this.status.warnings,
      missingTickers
    })
  }

  /**
   * Get enhanced status with additional information
   */
  getEnhancedStatus(): PriceStoreStatus & {
    tickersLoaded: string[]
    dateRange: { start: string; end: string } | null
    missingTickers: string[]
  } {
    const mag7Tickers = ['AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'GOOGL']
    const tickersLoaded = mag7Tickers.filter(ticker => this.hasTicker(ticker))
    const missingTickers = mag7Tickers.filter(ticker => !this.hasTicker(ticker))
    const dateRange = this.getTickerDateRange('AAPL') // Use AAPL as reference
    
    return {
      ...this.status,
      tickersLoaded,
      dateRange,
      missingTickers
    }
  }

  /**
   * Clear status warnings (useful for testing)
   */
  clearStatus(): void {
    this.status = {
      missingPrices: [],
      warnings: [],
      lastUpdated: new Date().toISOString().split('T')[0]
    }
  }

  /**
   * Get the last available daily-close date for a ticker
   */
  getHistoryEnd(ticker: string): string | null {
    const range = this.getTickerDateRange(ticker)
    return range ? range.end : null
  }

  /**
   * Check if a ticker has timeseries data on a specific date
   */
  hasTimeseriesOn(ticker: string, date: string): boolean {
    const normalizedTicker = this.normalizeTicker(ticker)
    const priceHistory = this.priceData.get(normalizedTicker)
    
    if (!priceHistory || priceHistory.length === 0) {
      return false
    }
    
    return priceHistory.some(point => point.date === date)
  }
}

// Global instance - will be initialized when first accessed
let globalPriceStore: PriceStore | null = null

export async function getPriceStore(): Promise<PriceStore> {
  if (!globalPriceStore) {
    globalPriceStore = await PriceStore.create()
  }
  return globalPriceStore
}
