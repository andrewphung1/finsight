import { PriceStore } from './price-store'

// Ticker normalization map - centralized source of truth
const TICKER_NORMALIZATION_MAP: Record<string, string> = {
  'GOOG': 'GOOGL',
  'BRK.B': 'BRK-B',
  'BRK.A': 'BRK-A',
  'BF.B': 'BF-B',
  'META': 'META', // Keep as is, but handle FB→META
  'FB': 'META',
  // Add .US variants
  'AAPL.US': 'AAPL',
  'MSFT.US': 'MSFT',
  'GOOGL.US': 'GOOGL',
  'AMZN.US': 'AMZN',
  'NVDA.US': 'NVDA',
  'META.US': 'META',
  'TSLA.US': 'TSLA',
}

/**
 * Normalize ticker symbol to match PriceStore's expected format
 */
export function normalizeTicker(symbol: string): string {
  const upperSymbol = symbol.toUpperCase()
  
  // Check direct mapping first
  if (TICKER_NORMALIZATION_MAP[upperSymbol]) {
    return TICKER_NORMALIZATION_MAP[upperSymbol]
  }
  
  // Handle .US variants
  if (upperSymbol.endsWith('.US')) {
    const baseSymbol = upperSymbol.slice(0, -3)
    return TICKER_NORMALIZATION_MAP[baseSymbol] || baseSymbol
  }
  
  // Handle .A/.B variants
  if (upperSymbol.includes('.')) {
    return TICKER_NORMALIZATION_MAP[upperSymbol] || upperSymbol
  }
  
  return upperSymbol
}

/**
 * Get daily price series for a company symbol
 * @param symbol - Company ticker symbol
 * @param start - Start date in YYYY-MM-DD format (optional)
 * @param end - End date in YYYY-MM-DD format (optional)
 * @returns Array of { date: string; price: number } objects
 */
export async function getCompanyPriceSeries(
  symbol: string, 
  start?: string, 
  end?: string
): Promise<Array<{ date: string; price: number }>> {
  try {
    const normalizedSymbol = normalizeTicker(symbol)
    
    // Initialize PriceStore
    const priceStore = new PriceStore()
    
    // Check if ticker exists
    if (!priceStore.hasTicker(normalizedSymbol)) {
      console.warn(`PriceStore: Unknown ticker "${symbol}" (normalized to "${normalizedSymbol}")`)
      return []
    }
    
    // Get daily closes
    const dailyCloses = await priceStore.getDailyCloses(normalizedSymbol, start || '2020-01-01', end || new Date().toISOString().split('T')[0])
    
    // Map to expected format with UTC YYYY-MM-DD dates
    const priceSeries = dailyCloses.map(close => ({
      date: new Date(close.date).toISOString().split('T')[0], // Convert to YYYY-MM-DD
      price: close.close
    }))
    
    // Forward-fill missing values (replace 0 or undefined with previous value)
    let lastValidPrice = 0
    const filledSeries = priceSeries.map(point => {
      if (point.price && point.price > 0) {
        lastValidPrice = point.price
        return point
      } else {
        return { ...point, price: lastValidPrice }
      }
    })
    
    // Dev logging
    console.log(`PriceService: ${symbol} (${normalizedSymbol})`, {
      originalLength: dailyCloses.length,
      finalLength: filledSeries.length,
      first3: filledSeries.slice(0, 3),
      last3: filledSeries.slice(-3),
      dateRange: { start, end }
    })
    
    return filledSeries
    
  } catch (error) {
    console.error(`PriceService: Error fetching price series for ${symbol}:`, error)
    return []
  }
}

// Export the normalization map for use elsewhere
export { TICKER_NORMALIZATION_MAP }

// Legacy PriceService class for backward compatibility
export class PriceService {
  async getLatestPrices(tickers: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {}
    
    for (const ticker of tickers) {
      try {
        const normalizedTicker = normalizeTicker(ticker)
        const priceStore = new PriceStore()
        
        if (priceStore.hasTicker(normalizedTicker)) {
          const dailyCloses = await priceStore.getDailyCloses(normalizedTicker, '2020-01-01', new Date().toISOString().split('T')[0])
          if (dailyCloses.length > 0) {
            prices[ticker] = dailyCloses[dailyCloses.length - 1].close
          } else {
            prices[ticker] = 0
          }
        } else {
          prices[ticker] = 0
        }
      } catch (error) {
        console.error(`PriceService: Error getting price for ${ticker}:`, error)
        prices[ticker] = 0
      }
    }
    
    return prices
  }
}
