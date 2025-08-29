import fs from 'fs'
import path from 'path'

export interface PricePoint {
  date: string
  price: number
}

/**
 * Load price data from ticker-specific files
 * @param ticker - The ticker symbol (e.g., 'AAPL', 'MSFT')
 * @param startDate - Start date in YYYY-MM-DD format (default: 2018-01-01)
 * @param endDate - End date in YYYY-MM-DD format (default: today)
 * @returns Array of price points
 */
export async function loadTickerPriceData(
  ticker: string,
  startDate: string = '2018-01-01',
  endDate: string = new Date().toISOString().split('T')[0]
): Promise<PricePoint[]> {
  try {
    console.log('PriceLoader:start', { ticker, startDate, endDate })
    
    // Normalize ticker symbol
    const normalizedTicker = ticker.toUpperCase()
    
    // Handle special cases for file names
    let fileName = `${normalizedTicker.toLowerCase()}.txt`
    if (normalizedTicker === 'NVDA') {
      fileName = 'nvda.us.txt'
    }
    
    // Construct file path
    const filePath = path.join(process.cwd(), 'data', 'price-history', 'mag7 price', fileName)
    const exists = fs.existsSync(filePath)
    console.log('PriceLoader:path', { filePath, exists })
    
    // Check if file exists
    if (!exists) {
      console.warn(`PriceLoader: File not found for ticker ${ticker}: ${filePath}`)
      return []
    }
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n').filter(line => line.trim())
    const dataLines = lines.slice(1)
    console.log('PriceLoader:fileStats', { totalLines: lines.length, dataLines: dataLines.length })
    
    // Parse CSV data
    const priceData: PricePoint[] = []
    
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
          
          // Filter by date range
          if (formattedDate >= startDate && formattedDate <= endDate) {
            priceData.push({
              date: formattedDate,
              price: closePrice
            })
          }
        }
      }
    }
    
    // Sort by date ascending
    priceData.sort((a, b) => a.date.localeCompare(b.date))
    
    const first3 = priceData.slice(0, 3).map(p => ({ date: p.date, price: p.price }))
    const last3 = priceData.slice(-3).map(p => ({ date: p.date, price: p.price }))
    console.log('PriceLoader:parsed', { points: priceData.length, first3, last3 })
    
    // Filter by date range
    const kept = priceData.filter(p => p.date >= startDate && p.date <= endDate)
    console.log('PriceLoader:filteredRange', { startDate, endDate, kept: kept.length })
    
    const result = kept
    console.log('PriceLoader:return', { 
      count: result.length, 
      first: result[0]?.date, 
      last: result[result.length - 1]?.date 
    })
    
    return result
    
  } catch (error) {
    const errorObj = error as Error
    console.log('PriceLoader:error', { ticker, error: errorObj.message, stack: errorObj.stack })
    return []
  }
}

/**
 * Get available tickers
 */
export function getAvailableTickers(): string[] {
  return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']
}
