import { NextRequest, NextResponse } from 'next/server'
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
async function loadTickerPriceData(
  ticker: string,
  startDate: string = '2018-01-01',
  endDate: string = new Date().toISOString().split('T')[0]
): Promise<PricePoint[]> {
  try {
    console.log(`PriceLoader: Starting to load price data for ${ticker}`)
    
    // Normalize ticker symbol
    const normalizedTicker = ticker.toUpperCase()
    console.log(`PriceLoader: Normalized ticker: ${normalizedTicker}`)
    
    // Handle special cases for file names
    let fileName = `${normalizedTicker.toLowerCase()}.txt`
    if (normalizedTicker === 'NVDA') {
      fileName = 'nvda.us.txt'
    }
    console.log(`PriceLoader: Using filename: ${fileName}`)
    
    // Construct file path
    const filePath = path.join(process.cwd(), 'data', 'price-history', 'mag7 price', fileName)
    console.log(`PriceLoader: File path: ${filePath}`)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`PriceLoader: File not found for ticker ${ticker}: ${filePath}`)
      return []
    }
    
    console.log(`PriceLoader: File exists, proceeding to read`)
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n').filter(line => line.trim())
    console.log(`PriceLoader: Read ${lines.length} lines from file`)
    
    // Skip header line
    const dataLines = lines.slice(1)
    console.log(`PriceLoader: Processing ${dataLines.length} data lines`)
    
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
    
    console.log(`PriceLoader: Parsed ${priceData.length} valid price points`)
    
    // Sort by date ascending
    priceData.sort((a, b) => a.date.localeCompare(b.date))
    
    console.log(`PriceLoader: Loaded ${priceData.length} price points for ${ticker} from ${startDate} to ${endDate}`)
    
    return priceData
    
  } catch (error) {
    console.error(`PriceLoader: Error loading price data for ${ticker}:`, error)
    return []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || '2018-01-01'
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    
    console.log(`API: Loading price data for ${ticker} from ${startDate} to ${endDate}`)
    
    const priceData = await loadTickerPriceData(ticker, startDate, endDate)
    
    return NextResponse.json({
      success: true,
      data: priceData,
      count: priceData.length
    })
    
  } catch (error) {
    console.error('API: Error loading price data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load price data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
