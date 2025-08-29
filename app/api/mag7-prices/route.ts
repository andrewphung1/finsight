import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export interface PriceHistoryPoint {
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

export interface MAG7PriceData {
  [ticker: string]: {
    priceHistory: PriceHistoryPoint[]
  }
}

/**
 * Load price data from a ticker-specific file
 */
function loadTickerPriceData(ticker: string): PriceHistoryPoint[] {
  try {
    // Normalize ticker symbol
    const normalizedTicker = ticker.toUpperCase()
    
    // Handle special cases for file names
    let fileName = `${normalizedTicker.toLowerCase()}.txt`
    if (normalizedTicker === 'NVDA') {
      fileName = 'nvda.us.txt'
    }
    
    // Construct file path
    const filePath = path.join(process.cwd(), 'data', 'price-history', 'mag7 price', fileName)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`MAG7 API: File not found for ticker ${ticker}: ${filePath}`)
      return []
    }
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n').filter(line => line.trim())
    const dataLines = lines.slice(1) // Skip header
    
    // Parse CSV data
    const priceData: PriceHistoryPoint[] = []
    
    for (const line of dataLines) {
      const columns = line.split(',')
      if (columns.length >= 8) {
        const dateStr = columns[2] // DATE column
        const closePrice = parseFloat(columns[7]) // CLOSE column
        
        // Parse date (format: YYYYMMDD)
        if (dateStr && dateStr.length === 8 && !isNaN(closePrice) && closePrice > 0) {
          const year = dateStr.substring(0, 4)
          const month = dateStr.substring(4, 6)
          const day = dateStr.substring(6, 8)
          const formattedDate = `${year}-${month}-${day}`
          
          priceData.push({
            ticker: normalizedTicker,
            baseTicker: normalizedTicker,
            per: '1d',
            date: formattedDate,
            open: closePrice, // Use close as open since we only have close data
            high: closePrice, // Use close as high since we only have close data
            low: closePrice,  // Use close as low since we only have close data
            close: closePrice,
            volume: 0, // No volume data available
            adjustedClose: closePrice,
            year: parseInt(year)
          })
        }
      }
    }
    
    // Sort by date ascending
    priceData.sort((a, b) => a.date.localeCompare(b.date))
    
    console.log(`MAG7 API: Loaded ${priceData.length} price points for ${ticker}`)
    return priceData
    
  } catch (error) {
    console.error(`MAG7 API: Error loading price data for ${ticker}:`, error)
    return []
  }
}

export async function GET() {
  try {
    const MAG7_PRICE_HISTORY: MAG7PriceData = {}
    
    // MAG7 tickers to load
    const MAG7_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META']
    
    // Load each ticker's price data
    MAG7_TICKERS.forEach(ticker => {
      const priceHistory = loadTickerPriceData(ticker)
      if (priceHistory.length > 0) {
        MAG7_PRICE_HISTORY[ticker] = { priceHistory }
      }
    })
    
    // Validate date ranges
    const dateRanges: Record<string, { start: string; end: string }> = {}
    MAG7_TICKERS.forEach(ticker => {
      const data = MAG7_PRICE_HISTORY[ticker]
      if (data && data.priceHistory.length > 0) {
        const sorted = data.priceHistory.sort((a, b) => a.date.localeCompare(b.date))
        dateRanges[ticker] = {
          start: sorted[0].date,
          end: sorted[sorted.length - 1].date
        }
      }
    })
    
    // Check for inconsistent date ranges
    const ranges = Object.values(dateRanges)
    if (ranges.length > 1) {
      const firstRange = ranges[0]
      const inconsistentTickers = Object.entries(dateRanges).filter(([ticker, range]) => 
        range.start !== firstRange.start || range.end !== firstRange.end
      )
      
      if (inconsistentTickers.length > 0) {
        console.warn('MAG7 API: Inconsistent date ranges detected:', 
          inconsistentTickers.map(([ticker, range]) => 
            `${ticker}(${range.start}-${range.end})`
          ).join(', ')
        )
      }
    }
    
    console.log('MAG7 API: Price history loaded:', {
      tickersLoaded: Object.keys(MAG7_PRICE_HISTORY),
      dateRange: ranges[0] || null,
      totalTickers: MAG7_TICKERS.length,
      loadedTickers: Object.keys(MAG7_PRICE_HISTORY).length
    })
    
    return NextResponse.json({ 
      success: true, 
      data: MAG7_PRICE_HISTORY,
      metadata: {
        tickersLoaded: Object.keys(MAG7_PRICE_HISTORY),
        dateRange: ranges[0] || null,
        totalTickers: MAG7_TICKERS.length,
        loadedTickers: Object.keys(MAG7_PRICE_HISTORY).length
      }
    })
    
  } catch (error) {
    console.error('MAG7 API: Error loading price data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load MAG7 price data' },
      { status: 500 }
    )
  }
}
