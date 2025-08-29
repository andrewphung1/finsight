"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  X
} from "lucide-react"
import { CSVParser } from "@/lib/csv-parser"
import { TransactionValidator } from "@/lib/transaction-validator"
import { PortfolioComputer } from "@/lib/portfolio-computer"
import { storeImportSession } from "@/contexts/session-provider"
import { MAG7_STOCKS } from "@/data/mag7-stocks"
import { 
  NormalizedTransaction, 
  ValidationError, 
  ImportPreview,
  ImportResult
} from "@/types/portfolio"
import { ImportSession } from "@/contexts/session-provider"
import { EquityEngine } from "@/lib/equity-engine"
import { getPriceStore } from "@/lib/price-store"
import { PriceResolutionService } from "@/lib/price-resolution-service"
import { calculateAverageSharePrices } from "@/lib/portfolio-computer"

interface FileUploadProps {
  onImportComplete?: (result: ImportResult) => void
  onViewPortfolio?: () => void
}

export function FileUpload({ onImportComplete, onViewPortfolio }: FileUploadProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedSamplePortfolio, setSelectedSamplePortfolio] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const selectedFile = acceptedFiles[0]
    setFile(selectedFile)
    setPreview(null)
    setResult(null)
    setShowPreview(false)

    // Parse and validate the file
    await parseAndValidateFile(selectedFile)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  })

  const parseAndValidateFile = async (file: File) => {
    setLoading(true)
    try {
      // Parse CSV
      const parser = new CSVParser()
      const { transactions, trades, errors, warnings } = await parser.parseCSVFile(file)

      // Validate and normalize transactions
      const validator = new TransactionValidator() // In real app, pass existing transactions
      const preview = validator.validateAndNormalize(transactions)

      // Update error/warning counts
      preview.summary.errorCount = errors.length
      preview.summary.warningCount = warnings.length

      setPreview(preview)
      setTrades(trades || [])
      setShowPreview(true)
    } catch (error) {
      console.error('Error parsing file:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!preview) return
    
    setCommitting(true)
    try {
      // Simulate commit process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Compute portfolio from transactions with current prices
      const computer = new PortfolioComputer()
      
      // Get unique tickers from transactions
      const uniqueTickers = [...new Set(preview.validRows.map(tx => tx.normalizedTicker))]
      
      // Use current market prices from MAG7 data for portfolio valuation
      const currentPrices: Record<string, number> = {}
      
      // Import Google Sheets store once
      const { googleSheetStore } = await import('@/lib/google-sheet-store')
      
      for (const ticker of uniqueTickers) {
        if (MAG7_STOCKS[ticker]) {
          // Use current market price from MAG7 data
          currentPrices[ticker] = MAG7_STOCKS[ticker].currentPrice
        } else {
          // For tickers not in MAG7, fetch current price from Google Sheets
          try {
            const snapshot = await googleSheetStore.getCompanySnapshot(ticker)
            if (snapshot && snapshot.price > 0) {
              currentPrices[ticker] = snapshot.price
              console.log(`FileUpload: Using Google Sheets price for ${ticker}: $${snapshot.price}`)
            } else {
              // Fallback to most recent transaction price if Google Sheets data unavailable
              const tickerTransactions = preview.validRows
                .filter(tx => tx.normalizedTicker === ticker)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              
              if (tickerTransactions.length > 0) {
                currentPrices[ticker] = tickerTransactions[0].price || 100.00
                console.log(`FileUpload: Using transaction price for ${ticker}: $${tickerTransactions[0].price}`)
              } else {
                currentPrices[ticker] = 100.00 // Last resort fallback
                console.warn(`FileUpload: No price data available for ${ticker}, using fallback`)
              }
            }
          } catch (error) {
            console.warn(`FileUpload: Error fetching Google Sheets price for ${ticker}:`, error)
            // Fallback to most recent transaction price
            const tickerTransactions = preview.validRows
              .filter(tx => tx.normalizedTicker === ticker)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            
            if (tickerTransactions.length > 0) {
              currentPrices[ticker] = tickerTransactions[0].price || 100.00
            } else {
              currentPrices[ticker] = 100.00 // Last resort fallback
            }
          }
        }
      }
      
      console.log('FileUpload: Using current market prices for portfolio valuation:', {
        tickers: uniqueTickers,
        currentPrices,
        transactionCount: preview.validRows.length
      })
      
      const portfolioData = computer.computePortfolioFromTransactions(preview.validRows, currentPrices)

      // Generate session ID
      const sessionId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Generate EquityEngine data for daily portfolio valuation
      let equityEngineSeries = []
      let equityEngineStatus = null
      
              try {
          console.log('FileUpload: Generating EquityEngine data from transactions')
          const equityEngine = new EquityEngine(await getPriceStore())
        const equityResult = await equityEngine.buildEquitySeries(preview.validRows)
        equityEngineSeries = equityResult.series
        equityEngineStatus = equityResult.status
        
        console.log('FileUpload: Generated EquityEngine data:', {
          seriesLength: equityEngineSeries.length,
          status: equityEngineStatus
        })
      } catch (error) {
        console.error('FileUpload: Error generating EquityEngine data:', error)
        // Fallback to existing equity series generation
        equityEngineSeries = await buildEquitySeries(preview.validRows, portfolioData.positions, currentPrices)
      }
      
      // Build return series (simplified for now)
      const returnSeries = buildReturnSeries(equityEngineSeries)

      // DEBUG: Log the portfolio data structure
      console.log('FileUpload: Portfolio data computed:', {
        totalValue: portfolioData.totalValue,
        totalGain: portfolioData.totalGain,
        totalGainPercent: portfolioData.totalGainPercent,
        ytdReturn: portfolioData.ytdReturn,
        positionsCount: portfolioData.positions.length,
        positions: portfolioData.positions.map(p => ({
          ticker: p.ticker,
          marketValue: p.marketValue,
          costBasis: p.costBasis
        }))
      })

      // Calculate average share prices from transactions
      const avgSharePrices = calculateAverageSharePrices(preview.validRows)
      
      // Debug logging for average share prices
      console.log('FileUpload: Average share prices calculated:', {
        totalTickers: Object.keys(avgSharePrices).length,
        avgSharePrices,
        transactionsCount: preview.validRows.length,
        transactionsByType: preview.validRows.reduce((acc, tx) => {
          acc[tx.type] = (acc[tx.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })
      
      // Enhanced price resolution with equity series rebuild
      const priceResolutionService = new PriceResolutionService()
      
      // Phase A: Fast snapshot
      const phaseAResult = await priceResolutionService.computePhaseA(portfolioData.positions)
      
      // Phase B: Full resolution with equity series rebuild
      const phaseBResult = await priceResolutionService.computePhaseB(portfolioData.positions, preview.validRows)
      
      // Use enhanced positions and rebuilt metrics
      const enhancedPositions = phaseBResult.positions.map(pos => ({
        ...pos,
        avgSharePrice: avgSharePrices[pos.ticker] || 0
      }))
      const rebuiltMetrics = phaseBResult.metrics
      const rebuiltEquitySeries = phaseBResult.equitySeries
      
      // Create session data with enhanced pricing
      const sessionData: ImportSession = {
        sid: sessionId,
        positions: enhancedPositions,
        assetAllocation: portfolioData.assetAllocation,
        equitySeries: rebuiltEquitySeries.length > 0 ? rebuiltEquitySeries.map(point => ({
          date: point.date,
          value: point.value,
          return: 0, // EquitySeriesPoint doesn't have return property
          cumulativeReturn: point.cumulativeReturn || 0
        })) : equityEngineSeries.map(point => ({
          date: point.date,
          value: point.value,
          return: 0, // EquitySeriesPoint doesn't have return property
          cumulativeReturn: point.cumulativeReturn || 0
        })),
        returnSeries,
        holdingsPerformance: enhancedPositions.map(pos => {
          // Calculate price return based on current price vs average share price
          const currentPrice = pos.lastPrice || pos.lastKnownPrice || 0
          const avgSharePrice = pos.avgSharePrice || 0
          const priceReturnPercent = avgSharePrice > 0 ? ((currentPrice - avgSharePrice) / avgSharePrice) * 100 : 0
          const marketValue = pos.marketValue || 0
          
          console.log('FileUpload: Calculating holdings performance for', pos.ticker, {
            avgSharePrice,
            currentPrice,
            marketValue,
            priceReturnPercent
          })
          
          return {
            ticker: pos.ticker,
            totalReturnPercent: Number.isFinite(priceReturnPercent) ? priceReturnPercent : 0,
            unrealizedGain: pos.unrealizedGain || 0,
            realizedGain: pos.realizedGain || 0,
            avgSharePrice,
            marketValue,
            totalReturn: pos.unrealizedGain || 0
          }
        }),
        metrics: {
          totalValue: rebuiltMetrics.totalValue,
          totalGain: portfolioData.totalGain,
          totalGainPercent: portfolioData.totalGainPercent,
          ytdReturn: rebuiltMetrics.ytdReturn,
          positions: enhancedPositions,
          assetAllocation: portfolioData.assetAllocation,
          lastUpdated: rebuiltMetrics.lastUpdated,
          baselineDate: portfolioData.baselineDate
        },
        status: {
          valuedThrough: equityEngineStatus?.valuedThrough || new Date().toISOString().split('T')[0],
          bridgedTickers: equityEngineStatus?.bridgedTickers || [],
          missingPrices: equityEngineStatus?.missingPrices || []
        },
        // NEW: Include EquityEngine data
        equityEngineSeries: rebuiltEquitySeries.length > 0 ? rebuiltEquitySeries : equityEngineSeries,
        equityEngineStatus: equityEngineStatus || undefined,
        // NEW: Include user trades for SPY benchmark calculation
        trades: preview.validRows,
        // NEW: Pricing resolution tracking
        pricingStatus: phaseBResult.pricingStatus,
        resolvedTickers: phaseBResult.resolvedTickers,
        totalTickers: phaseBResult.totalTickers
      }

      // DEBUG: Log the session data being stored
      console.log('FileUpload: Session data being stored:', {
        sid: sessionData.sid,
        metrics: sessionData.metrics,
        totalValue: sessionData.metrics.totalValue,
        ytdReturn: sessionData.metrics.ytdReturn,
        equityEngineSeriesLength: equityEngineSeries.length,
        equityEngineStatus
      })

      // Store session data with error handling
      try {
        storeImportSession(sessionId, sessionData)
        console.log('FileUpload: Session data stored successfully')
        
        // Verify the data was stored
        const sessionKey = `import-session-${sessionId}`
        const storedData = sessionStorage.getItem(sessionKey)
        console.log('FileUpload: Storage verification:', {
          sessionKey,
          hasStoredData: !!storedData,
          storedDataLength: storedData?.length || 0,
          allSessionKeys: Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)).filter(key => key?.startsWith('import-session-'))
        })
      } catch (storageError) {
        console.error('FileUpload: Failed to store session data:', storageError)
        throw new Error('Failed to store portfolio session data')
      }

      const importResult: ImportResult = {
        success: true,
        transactionsAdded: preview.validRows.length,
        transactionsAmended: 0,
        transactionsSkipped: preview.invalidRows.length,
        symbolsAffected: [...new Set(preview.validRows.map(tx => tx.normalizedTicker))],
        priceFetchesQueued: preview.validRows.length,
        fxFetchesQueued: preview.fxRequired.length,
        errors: preview.invalidRows,
        preview,
        trades: trades || [],
        sessionId
      }

      console.log('FileUpload: Import completed with session:', sessionId)
      setResult(importResult)
      onImportComplete?.(importResult)

      // Add a small delay to ensure session data is stored before navigation
      setTimeout(() => {
        const targetUrl = `/?tab=overview&mode=import&sid=${sessionId}`
        console.log('FileUpload: Navigating to:', targetUrl)
        try {
          router.push(targetUrl)
          console.log('FileUpload: Navigation successful')
        } catch (navigationError) {
          console.error('FileUpload: Navigation error:', navigationError)
          // Fallback: try to navigate without the session ID
          const fallbackUrl = `/?tab=overview&mode=import`
          console.log('FileUpload: Trying fallback navigation to:', fallbackUrl)
          router.push(fallbackUrl)
        }
      }, 100)

      // Reset form
      setFile(null)
      setPreview(null)
      setShowPreview(false)
    } catch (error) {
      console.error('Error committing transactions:', error)
    } finally {
      setCommitting(false)
    }
  }

  const handleSamplePortfolioSelect = (portfolioName: string) => {
    setSelectedSamplePortfolio(portfolioName)
    setFile(null) // Clear any uploaded file
    setPreview(null)
    setShowPreview(false)
    setResult(null)
    setTrades([])
  }

  const handleSamplePortfolioUnselect = () => {
    setSelectedSamplePortfolio(null)
  }

  const handleSamplePortfolioImport = async () => {
    if (!selectedSamplePortfolio) return

    setLoading(true)
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Get sample portfolio data
      const sampleData = await getSamplePortfolioData(selectedSamplePortfolio)
      if (!sampleData) {
        throw new Error('Sample portfolio data not found')
      }

      // Generate session ID
      const sessionId = `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create session data
      const sessionData: ImportSession = {
        sid: sessionId,
        positions: sampleData.positions,
        assetAllocation: sampleData.assetAllocation,
        equitySeries: sampleData.equitySeries,
        returnSeries: sampleData.returnSeries,
        holdingsPerformance: sampleData.holdingsPerformance,
        metrics: sampleData.metrics,
        status: sampleData.status,
        equityEngineSeries: sampleData.equityEngineSeries,
        equityEngineStatus: sampleData.equityEngineStatus,
        trades: sampleData.trades,
        // NEW: Pricing resolution tracking
        pricingStatus: 'pending' as const,
        resolvedTickers: [],
        totalTickers: sampleData.positions.length
      }

      // Store session data with error handling
      try {
        storeImportSession(sessionId, sessionData)
        console.log('FileUpload: Sample portfolio data stored successfully')
        
        // Verify the data was stored
        const sessionKey = `import-session-${sessionId}`
        const storedData = sessionStorage.getItem(sessionKey)
        console.log('FileUpload: Storage verification:', {
          sessionKey,
          hasStoredData: !!storedData,
          storedDataLength: storedData?.length || 0,
          allSessionKeys: Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)).filter(key => key?.startsWith('import-session-'))
        })
      } catch (storageError) {
        console.error('FileUpload: Failed to store sample portfolio data:', storageError)
        throw new Error('Failed to store sample portfolio data')
      }

      const importResult: ImportResult = {
        success: true,
        transactionsAdded: 0, // No transactions added from file, but session data is stored
        transactionsAmended: 0,
        transactionsSkipped: 0,
        symbolsAffected: [...new Set(sampleData.positions.map(pos => pos.ticker))],
        priceFetchesQueued: 0,
        fxFetchesQueued: 0,
        errors: [],
        preview: undefined, // No preview for sample portfolio
        trades: sampleData.trades,
        sessionId
      }

      console.log('FileUpload: Sample portfolio import completed with session:', sessionId)
      setResult(importResult)
      onImportComplete?.(importResult)

      // Add a small delay to ensure session data is stored before navigation
      setTimeout(() => {
        const targetUrl = `/?tab=overview&mode=import&sid=${sessionId}`
        console.log('FileUpload: Navigating to:', targetUrl)
        try {
          router.push(targetUrl)
          console.log('FileUpload: Navigation successful')
        } catch (navigationError) {
          console.error('FileUpload: Navigation error:', navigationError)
          // Fallback: try to navigate without the session ID
          const fallbackUrl = `/?tab=overview&mode=import`
          console.log('FileUpload: Trying fallback navigation to:', fallbackUrl)
          router.push(fallbackUrl)
        }
      }, 100)

      // Reset form
      setSelectedSamplePortfolio(null)
      setLoading(false)
    } catch (error) {
      console.error('Error importing sample portfolio:', error)
      setLoading(false)
    }
  }

  const buildEquitySeries = async (transactions: NormalizedTransaction[], positions: any[], currentPrices: Record<string, number>): Promise<any[]> => {
    // Sort transactions by date
    const sortedTxs = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    if (sortedTxs.length === 0) return []

    const today = new Date().toISOString().split('T')[0]
    const firstDate = sortedTxs[0].date
    
    // Get unique tickers from transactions
    const uniqueTickers = [...new Set(sortedTxs.map(tx => tx.normalizedTicker))]
    
    // Fetch historical prices for all tickers
    const historicalPrices = await fetchHistoricalPrices(uniqueTickers, firstDate, today)
    
    // Track running positions (shares held for each ticker) - same as PortfolioComputer
    const portfolioState: Record<string, number> = {}
    
    // Generate continuous daily series from first transaction to today
    const series: any[] = []
    const currentDate = new Date(firstDate)
    const endDate = new Date(today)
    
    while (currentDate <= endDate) {
      const currentDateStr = currentDate.toISOString().split('T')[0]
      
      // Update portfolio state for any transactions on this date
      const transactionsOnThisDate = sortedTxs.filter(tx => tx.date === currentDateStr)
      for (const tx of transactionsOnThisDate) {
        if (!portfolioState[tx.normalizedTicker]) {
          portfolioState[tx.normalizedTicker] = 0
        }
        
        if (tx.type === 'BUY') {
          portfolioState[tx.normalizedTicker] += tx.quantity
        } else if (tx.type === 'SELL') {
          portfolioState[tx.normalizedTicker] -= Math.abs(tx.signedQuantity)
        }
      }
      
      // Calculate portfolio value for this day using the same logic as PortfolioComputer
      let portfolioValue = 0
      for (const [ticker, shares] of Object.entries(portfolioState)) {
        if (shares > 0) {
          let priceForThisDate: number
          
          if (currentDateStr === today) {
            // For today, use the same current prices as PortfolioComputer
            priceForThisDate = currentPrices[ticker] || 100.00
          } else {
            // For historical dates, use historical prices with fallback
            priceForThisDate = getHistoricalPrice(historicalPrices, ticker, currentDateStr)
          }
          
          portfolioValue += shares * priceForThisDate
        }
      }
      
      series.push({
        date: currentDateStr,
        value: portfolioValue
      })
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Verify the last point matches portfolioData.totalValue
    const lastPoint = series[series.length - 1]
    const expectedTotalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    
    console.log('Built continuous daily equity series with consistent valuation:', {
      transactions: sortedTxs.length,
      positions: positions.length,
      dailyPoints: series.length,
      lastPointValue: lastPoint?.value,
      expectedTotalValue,
      matches: Math.abs((lastPoint?.value || 0) - expectedTotalValue) < 0.01,
      portfolioState
    })
    
    return series
  }

  // Helper function to fetch historical prices with robust fallbacks
  const fetchHistoricalPrices = async (tickers: string[], startDate: string, endDate: string): Promise<Record<string, Record<string, number>>> => {
    const prices: Record<string, Record<string, number>> = {}
    
    for (const ticker of tickers) {
      try {
        // Check cache first
        const cachedPrices = getCachedPrices(ticker, startDate, endDate)
        if (cachedPrices) {
          prices[ticker] = cachedPrices
          continue
        }

        // Fetch from Yahoo Finance API
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${getTimestamp(startDate)}&period2=${getTimestamp(endDate)}&interval=1d`)
        const data = await response.json()
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
          const result = data.chart.result[0]
          const timestamps = result.timestamp || []
          const closes = result.indicators.quote[0].close || []
          
          const tickerPrices: Record<string, number> = {}
          let lastValidPrice = 100.00
          
          timestamps.forEach((timestamp: number, index: number) => {
            const date = new Date(timestamp * 1000).toISOString().split('T')[0]
            const closePrice = closes[index]
            
            if (closePrice !== null && closePrice !== undefined && closePrice > 0) {
              tickerPrices[date] = closePrice
              lastValidPrice = closePrice
            } else {
              // Forward-fill with last valid price for missing data
              tickerPrices[date] = lastValidPrice
            }
          })
          
          // Cache the prices
          cachePrices(ticker, startDate, endDate, tickerPrices)
          prices[ticker] = tickerPrices
        } else {
          // Fallback to MAG7 prices if available
          if (MAG7_STOCKS[ticker]) {
            const currentPrice = MAG7_STOCKS[ticker].currentPrice
            prices[ticker] = { [endDate]: currentPrice }
          } else {
            prices[ticker] = { [endDate]: 100.00 }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch historical prices for ${ticker}:`, error)
        // Fallback to MAG7 prices if available
        if (MAG7_STOCKS[ticker]) {
          const currentPrice = MAG7_STOCKS[ticker].currentPrice
          prices[ticker] = { [endDate]: currentPrice }
        } else {
          prices[ticker] = { [endDate]: 100.00 }
        }
      }
    }
    
    return prices
  }

  // Helper function to get historical price for a specific date with robust forward-filling
  const getHistoricalPrice = (historicalPrices: Record<string, Record<string, number>>, ticker: string, date: string): number => {
    const tickerPrices = historicalPrices[ticker]
    if (!tickerPrices) return 100.00

    // Try to get exact date first
    if (tickerPrices[date]) {
      return tickerPrices[date]
    }

    // Find the most recent price before or on this date (forward-filling)
    const dates = Object.keys(tickerPrices).sort()
    let mostRecentPrice = 100.00
    let mostRecentDate = ''

    for (const priceDate of dates) {
      if (priceDate <= date) {
        mostRecentPrice = tickerPrices[priceDate]
        mostRecentDate = priceDate
      } else {
        break
      }
    }

    // If we found a price, use it; otherwise fallback to default
    if (mostRecentDate) {
      return mostRecentPrice
    }

    // Last resort: use the most recent available price
    const allDates = Object.keys(tickerPrices).sort()
    if (allDates.length > 0) {
      const latestDate = allDates[allDates.length - 1]
      return tickerPrices[latestDate]
    }

    return 100.00
  }

  // Helper function to convert date to timestamp
  const getTimestamp = (dateStr: string): number => {
    return Math.floor(new Date(dateStr).getTime() / 1000)
  }

  // Cache management functions
  const getCachedPrices = (ticker: string, startDate: string, endDate: string): Record<string, number> | null => {
    const cacheKey = `historical-prices-${ticker}-${startDate}-${endDate}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const data = JSON.parse(cached)
      // Check if cache is less than 24 hours old
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
        return data.prices
      }
    }
    return null
  }

  const cachePrices = (ticker: string, startDate: string, endDate: string, prices: Record<string, number>): void => {
    const cacheKey = `historical-prices-${ticker}-${startDate}-${endDate}`
    const cacheData = {
      timestamp: Date.now(),
      prices: prices
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  }

  const buildReturnSeries = (equitySeries: any[]): any[] => {
    if (equitySeries.length < 2) return []

    const firstValue = equitySeries[0].value
    const baseValue = firstValue > 0 ? firstValue : 100

    const returnSeries = equitySeries.map(point => ({
      date: point.date,
      portfolioReturn: ((point.value - baseValue) / baseValue) * 100,
      benchmarkReturn: 0 // Simplified - would use SPY data in real implementation
    }))

    console.log('Built return series from continuous equity series:', {
      points: returnSeries.length,
      firstReturn: returnSeries[0]?.portfolioReturn,
      lastReturn: returnSeries[returnSeries.length - 1]?.portfolioReturn
    })
    return returnSeries
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setTrades([])
    setResult(null)
    setShowPreview(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Static data for UI display (no async needed)
  const getSamplePortfolioDisplayData = (name: string) => {
    switch (name) {
      case 'tech-growth':
        return {
          name: 'Tech Growth Investor',
          risk: 'High Risk',
          description: 'Growth-focused portfolio with MAG7 tech leaders plus emerging tech companies. High growth potential with sector concentration.',
          allocations: ['AAPL: 25%', 'NVDA: 20%', 'TSLA: 15%', 'AMD: 15%', 'CRM: 15%', 'ORCL: 10%']
        }
      case 'dividend-defensive':
        return {
          name: 'Dividend & Defensive',
          risk: 'Low Risk',
          description: 'Income-focused portfolio with stable MAG7 companies plus dividend-paying defensive stocks. Lower volatility with steady income.',
          allocations: ['MSFT: 20%', 'AAPL: 15%', 'JNJ: 15%', 'PG: 15%', 'KO: 15%', 'WMT: 10%', 'MCD: 10%']
        }
      case 'balanced-large-cap':
        return {
          name: 'Balanced Large-Cap Core',
          risk: 'Medium Risk',
          description: 'Well-diversified portfolio with MAG7 leaders plus established large-cap companies across sectors. Balanced growth and stability.',
          allocations: ['AAPL: 15%', 'MSFT: 15%', 'GOOGL: 10%', 'JPM: 10%', 'JNJ: 10%', 'V: 10%', 'HD: 10%', 'UNH: 10%', 'MA: 10%']
        }
      case 'conservative-consumer':
        return {
          name: 'Conservative Consumer-Staple',
          risk: 'Very Low Risk',
          description: 'Conservative portfolio focused on consumer staples and healthcare. Low volatility with steady dividends and defensive positioning.',
          allocations: ['AAPL: 20%', 'MSFT: 15%', 'PG: 15%', 'KO: 15%', 'PEP: 10%', 'WMT: 10%', 'COST: 10%', 'CL: 5%']
        }
      default:
        return null
    }
  }

  const getSamplePortfolioData = async (name: string) => {
    // Get real price data for portfolio calculation
    const priceStore = await getPriceStore()
    const today = new Date().toISOString().split('T')[0]
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 2)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Generate realistic trade data for SPY benchmark calculation
    const generateSampleTrades = (positions: any[]): any[] => {
      const trades: any[] = []
      const startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 2)
      
      // Generate trades for each position
      positions.forEach((pos, index) => {
        // Create initial buy trade
        const buyDate = new Date(startDate)
        buyDate.setDate(buyDate.getDate() + (index * 30)) // Stagger purchases
        
        trades.push({
          id: `buy-${pos.ticker}-${buyDate.toISOString().split('T')[0]}`,
          ticker: pos.ticker,
          normalizedTicker: pos.ticker,
          type: 'BUY',
          date: buyDate.toISOString().split('T')[0],
          quantity: pos.shares,
          signedQuantity: pos.shares,
          price: pos.costBasis / pos.shares,
          totalCost: pos.costBasis,
          fees: 0,
          currency: 'USD',
          fxApplied: false,
          notes: 'Sample portfolio trade',
          rawRow: `BUY,${pos.ticker},${buyDate.toISOString().split('T')[0]},${pos.shares},${pos.costBasis / pos.shares}`,
          rowNumber: index + 1,
          sourceFile: 'sample-portfolio'
        })
        
        // Add some additional trades for realism (small buys/sells)
        if (Math.random() > 0.7) { // 30% chance of additional trades
          const additionalDate = new Date(buyDate)
          additionalDate.setDate(additionalDate.getDate() + 180) // 6 months later
          
          const additionalShares = Math.floor(pos.shares * 0.1) // 10% of position
          if (additionalShares > 0) {
            trades.push({
              id: `buy-${pos.ticker}-${additionalDate.toISOString().split('T')[0]}`,
              ticker: pos.ticker,
              normalizedTicker: pos.ticker,
              type: 'BUY',
              date: additionalDate.toISOString().split('T')[0],
              quantity: additionalShares,
              signedQuantity: additionalShares,
              price: (pos.costBasis / pos.shares) * 1.1, // 10% higher price
              totalCost: additionalShares * (pos.costBasis / pos.shares) * 1.1,
              fees: 0,
              currency: 'USD',
              fxApplied: false,
              notes: 'Sample portfolio additional trade',
              rawRow: `BUY,${pos.ticker},${additionalDate.toISOString().split('T')[0]},${additionalShares},${(pos.costBasis / pos.shares) * 1.1}`,
              rowNumber: trades.length + 1,
              sourceFile: 'sample-portfolio'
            })
          }
        }
      })
      
      return trades.sort((a, b) => a.date.localeCompare(b.date))
    }

    // Convert asset allocation object to array format
    const convertAssetAllocation = (allocationObj: Record<string, number>, positions: any[]) => {
      return Object.entries(allocationObj).map(([ticker, weight]) => ({
        ticker,
        name: ticker,
        value: positions.find(p => p.ticker === ticker)?.marketValue || 0,
        weight,
        sector: positions.find(p => p.ticker === ticker)?.sector
      }))
    }

    // Calculate real portfolio value using actual price data
    const calculateRealPortfolioValue = (positions: any[]) => {
      let totalValue = 0
      const updatedPositions = positions.map(pos => {
        let currentPrice = pos.lastPrice || 100 // fallback price
        
        // Try to get real current price from price store
        try {
          const priceData = priceStore.getDailyCloses(pos.ticker, today, today)
          if (priceData.length > 0) {
            currentPrice = priceData[priceData.length - 1].close
          }
        } catch (error) {
          console.warn(`Could not get price for ${pos.ticker}, using fallback`)
        }
        
        const marketValue = pos.shares * currentPrice
        const unrealizedGain = marketValue - pos.costBasis
        const unrealizedGainPercent = (unrealizedGain / pos.costBasis) * 100
        
        totalValue += marketValue
        
        return {
          ...pos,
          lastPrice: currentPrice,
          marketValue,
          unrealizedGain,
          unrealizedGainPercent,
          lastUpdated: today
        }
      })
      
      return { positions: updatedPositions, totalValue }
    }

    // Generate real equity series using actual price data
    const generateRealEquitySeries = async (positions: any[], startDate: string, endDate: string): Promise<any[]> => {
      const series: any[] = []
      const currentDate = new Date(startDate)
      const endDateObj = new Date(endDate)
      
      while (currentDate <= endDateObj) {
        const currentDateStr = currentDate.toISOString().split('T')[0]
        let portfolioValue = 0
        
        // Calculate portfolio value for this date using real prices
        for (const pos of positions) {
          try {
            const priceData = priceStore.getDailyCloses(pos.ticker, currentDateStr, currentDateStr)
            if (priceData.length > 0) {
              const priceForDate = priceData[0].close
              portfolioValue += pos.shares * priceForDate
            }
          } catch (error) {
            // If no price data available, use last known price
            portfolioValue += pos.shares * (pos.lastPrice || 100)
          }
        }
        
        if (portfolioValue > 0) {
          series.push({
            date: currentDateStr,
            value: portfolioValue,
            return: 0, // Will be calculated later
            cumulativeReturn: 0 // Will be calculated later
          })
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Calculate returns
      if (series.length > 1) {
        const firstValue = series[0].value
        series.forEach((point, index) => {
          if (index > 0) {
            const prevValue = series[index - 1].value
            point.return = ((point.value - prevValue) / prevValue) * 100
          }
          point.cumulativeReturn = ((point.value - firstValue) / firstValue) * 100
        })
      }
      
      return series
    }

    // Generate sample holdings performance data
    const generateSampleHoldingsPerformance = (positions: any[]) => {
      return positions.map(pos => ({
        ticker: pos.ticker,
        name: pos.ticker,
        totalReturnPercent: pos.unrealizedGainPercent,
        totalReturn: pos.unrealizedGain,
        unrealizedGain: pos.unrealizedGain,
        realizedGain: pos.realizedGain || 0,
        costBasis: pos.costBasis,
        marketValue: pos.marketValue
      }))
    }

    switch (name) {
      case 'tech-growth':
        const techPositions = [
          { ticker: 'AAPL', shares: 25, costBasis: 3750.00, marketValue: 3750.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 25, sector: 'Technology', lastPrice: 150.00, lastUpdated: new Date().toISOString() },
          { ticker: 'NVDA', shares: 8, costBasis: 4000.00, marketValue: 4000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 20, sector: 'Technology', lastPrice: 500.00, lastUpdated: new Date().toISOString() },
          { ticker: 'TSLA', shares: 50, costBasis: 12000.00, marketValue: 12000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Consumer Discretionary', lastPrice: 240.00, lastUpdated: new Date().toISOString() },
          { ticker: 'AMD', shares: 15, costBasis: 1500.00, marketValue: 1500.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Technology', lastPrice: 100.00, lastUpdated: new Date().toISOString() },
          { ticker: 'CRM', shares: 15, costBasis: 3750.00, marketValue: 3750.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Technology', lastPrice: 250.00, lastUpdated: new Date().toISOString() },
          { ticker: 'ORCL', shares: 7, costBasis: 1000.00, marketValue: 1000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Technology', lastPrice: 143.00, lastUpdated: new Date().toISOString() }
        ]
        
        // Calculate real portfolio values
        const techPortfolioData = calculateRealPortfolioValue(techPositions)
        const techEquitySeries = await generateRealEquitySeries(techPortfolioData.positions, startDateStr, today)
        const techAssetAllocation = convertAssetAllocation({ AAPL: 25, NVDA: 20, TSLA: 15, AMD: 15, CRM: 15, ORCL: 10 }, techPortfolioData.positions)
        
        return {
          name: 'Tech Growth Investor',
          risk: 'High Risk',
          description: 'Growth-focused portfolio with MAG7 tech leaders plus emerging tech companies. High growth potential with sector concentration.',
          allocations: ['AAPL: 25%', 'NVDA: 20%', 'TSLA: 15%', 'AMD: 15%', 'CRM: 15%', 'ORCL: 10%'],
          positions: techPortfolioData.positions,
          assetAllocation: techAssetAllocation,
          equitySeries: techEquitySeries,
          returnSeries: techEquitySeries.map(point => ({
            date: point.date,
            portfolioReturn: point.return,
            benchmarkReturn: point.return * 0.8
          })),
          holdingsPerformance: generateSampleHoldingsPerformance(techPortfolioData.positions),
          metrics: {
            totalValue: techPortfolioData.totalValue,
            totalGain: techPortfolioData.totalValue - techPositions.reduce((sum, pos) => sum + pos.costBasis, 0),
            totalGainPercent: ((techPortfolioData.totalValue - techPositions.reduce((sum, pos) => sum + pos.costBasis, 0)) / techPositions.reduce((sum, pos) => sum + pos.costBasis, 0)) * 100,
            ytdReturn: 12.5,
            positions: techPortfolioData.positions,
            assetAllocation: techAssetAllocation,
            lastUpdated: new Date().toISOString(),
            baselineDate: startDateStr
          },
          status: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: techPortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: techEquitySeries[0]?.date || startDateStr, end: techEquitySeries[techEquitySeries.length - 1]?.date || today }
          },
          equityEngineSeries: techEquitySeries,
          equityEngineStatus: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: techPortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: techEquitySeries[0]?.date || startDateStr, end: techEquitySeries[techEquitySeries.length - 1]?.date || today }
          },
          trades: generateSampleTrades(techPortfolioData.positions)
        }
      case 'dividend-defensive':
        const dividendPositions = [
          { ticker: 'MSFT', shares: 20, costBasis: 4000.00, marketValue: 4000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 20, sector: 'Technology', lastPrice: 200.00, lastUpdated: new Date().toISOString() },
          { ticker: 'AAPL', shares: 15, costBasis: 2250.00, marketValue: 2250.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Technology', lastPrice: 150.00, lastUpdated: new Date().toISOString() },
          { ticker: 'JNJ', shares: 15, costBasis: 2250.00, marketValue: 2250.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Healthcare', lastPrice: 150.00, lastUpdated: new Date().toISOString() },
          { ticker: 'PG', shares: 15, costBasis: 1500.00, marketValue: 1500.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Consumer Staples', lastPrice: 100.00, lastUpdated: new Date().toISOString() },
          { ticker: 'KO', shares: 15, costBasis: 750.00, marketValue: 750.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Consumer Staples', lastPrice: 50.00, lastUpdated: new Date().toISOString() },
          { ticker: 'WMT', shares: 10, costBasis: 1000.00, marketValue: 1000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Consumer Staples', lastPrice: 100.00, lastUpdated: new Date().toISOString() },
          { ticker: 'MCD', shares: 10, costBasis: 1000.00, marketValue: 1000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Consumer Staples', lastPrice: 100.00, lastUpdated: new Date().toISOString() }
        ]
        
        // Calculate real portfolio values
        const dividendPortfolioData = calculateRealPortfolioValue(dividendPositions)
        const dividendEquitySeries = await generateRealEquitySeries(dividendPortfolioData.positions, startDateStr, today)
        const dividendAssetAllocation = convertAssetAllocation({ MSFT: 20, AAPL: 15, JNJ: 15, PG: 15, KO: 15, WMT: 10, MCD: 10 }, dividendPortfolioData.positions)
        
        return {
          name: 'Dividend & Defensive',
          risk: 'Low Risk',
          description: 'Income-focused portfolio with stable MAG7 companies plus dividend-paying defensive stocks. Lower volatility with steady income.',
          allocations: ['MSFT: 20%', 'AAPL: 15%', 'JNJ: 15%', 'PG: 15%', 'KO: 15%', 'WMT: 10%', 'MCD: 10%'],
          positions: dividendPortfolioData.positions,
          assetAllocation: dividendAssetAllocation,
          equitySeries: dividendEquitySeries,
          returnSeries: dividendEquitySeries.map(point => ({
            date: point.date,
            portfolioReturn: point.return,
            benchmarkReturn: point.return * 0.9
          })),
          holdingsPerformance: generateSampleHoldingsPerformance(dividendPortfolioData.positions),
          metrics: {
            totalValue: dividendPortfolioData.totalValue,
            totalGain: dividendPortfolioData.totalValue - dividendPositions.reduce((sum, pos) => sum + pos.costBasis, 0),
            totalGainPercent: ((dividendPortfolioData.totalValue - dividendPositions.reduce((sum, pos) => sum + pos.costBasis, 0)) / dividendPositions.reduce((sum, pos) => sum + pos.costBasis, 0)) * 100,
            ytdReturn: 8.2,
            positions: dividendPortfolioData.positions,
            assetAllocation: dividendAssetAllocation,
            lastUpdated: new Date().toISOString(),
            baselineDate: startDateStr
          },
          status: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: dividendPortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: dividendEquitySeries[0]?.date || startDateStr, end: dividendEquitySeries[dividendEquitySeries.length - 1]?.date || today }
          },
          equityEngineSeries: dividendEquitySeries,
          equityEngineStatus: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: dividendPortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: dividendEquitySeries[0]?.date || startDateStr, end: dividendEquitySeries[dividendEquitySeries.length - 1]?.date || today }
          },
          trades: generateSampleTrades(dividendPortfolioData.positions)
        }
      case 'balanced-large-cap':
        const balancedPositions = [
          { ticker: 'AAPL', shares: 15, costBasis: 2250.00, marketValue: 2250.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Technology', lastPrice: 150.00, lastUpdated: new Date().toISOString() },
          { ticker: 'MSFT', shares: 15, costBasis: 3000.00, marketValue: 3000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Technology', lastPrice: 200.00, lastUpdated: new Date().toISOString() },
          { ticker: 'GOOGL', shares: 10, costBasis: 1350.00, marketValue: 1350.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Technology', lastPrice: 135.00, lastUpdated: new Date().toISOString() },
          { ticker: 'JPM', shares: 10, costBasis: 1450.00, marketValue: 1450.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Financial Services', lastPrice: 145.00, lastUpdated: new Date().toISOString() },
          { ticker: 'JNJ', shares: 10, costBasis: 1600.00, marketValue: 1600.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Healthcare', lastPrice: 160.00, lastUpdated: new Date().toISOString() },
          { ticker: 'V', shares: 10, costBasis: 2350.00, marketValue: 2350.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Financial Services', lastPrice: 235.00, lastUpdated: new Date().toISOString() },
          { ticker: 'HD', shares: 10, costBasis: 3000.00, marketValue: 3000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Consumer Staples', lastPrice: 300.00, lastUpdated: new Date().toISOString() },
          { ticker: 'UNH', shares: 10, costBasis: 4750.00, marketValue: 4750.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Healthcare', lastPrice: 475.00, lastUpdated: new Date().toISOString() },
          { ticker: 'MA', shares: 10, costBasis: 3750.00, marketValue: 3750.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Financial Services', lastPrice: 375.00, lastUpdated: new Date().toISOString() }
        ]
        
        // Calculate real portfolio values
        const balancedPortfolioData = calculateRealPortfolioValue(balancedPositions)
        const balancedEquitySeries = await generateRealEquitySeries(balancedPortfolioData.positions, startDateStr, today)
        const balancedAssetAllocation = convertAssetAllocation({ AAPL: 15, MSFT: 15, GOOGL: 10, JPM: 10, JNJ: 10, V: 10, HD: 10, UNH: 10, MA: 10 }, balancedPortfolioData.positions)
        
        return {
          name: 'Balanced Large-Cap Core',
          risk: 'Medium Risk',
          description: 'Well-diversified portfolio with MAG7 leaders plus established large-cap companies across sectors. Balanced growth and stability.',
          allocations: ['AAPL: 15%', 'MSFT: 15%', 'GOOGL: 10%', 'JPM: 10%', 'JNJ: 10%', 'V: 10%', 'HD: 10%', 'UNH: 10%', 'MA: 10%'],
          positions: balancedPortfolioData.positions,
          assetAllocation: balancedAssetAllocation,
          equitySeries: balancedEquitySeries,
          returnSeries: balancedEquitySeries.map(point => ({
            date: point.date,
            portfolioReturn: point.return,
            benchmarkReturn: point.return * 0.85
          })),
          holdingsPerformance: generateSampleHoldingsPerformance(balancedPortfolioData.positions),
          metrics: {
            totalValue: balancedPortfolioData.totalValue,
            totalGain: balancedPortfolioData.totalValue - balancedPositions.reduce((sum, pos) => sum + pos.costBasis, 0),
            totalGainPercent: ((balancedPortfolioData.totalValue - balancedPositions.reduce((sum, pos) => sum + pos.costBasis, 0)) / balancedPositions.reduce((sum, pos) => sum + pos.costBasis, 0)) * 100,
            ytdReturn: 10.1,
            positions: balancedPortfolioData.positions,
            assetAllocation: balancedAssetAllocation,
            lastUpdated: new Date().toISOString(),
            baselineDate: startDateStr
          },
          status: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: balancedPortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: balancedEquitySeries[0]?.date || startDateStr, end: balancedEquitySeries[balancedEquitySeries.length - 1]?.date || today }
          },
          equityEngineSeries: balancedEquitySeries,
          equityEngineStatus: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: balancedPortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: balancedEquitySeries[0]?.date || startDateStr, end: balancedEquitySeries[balancedEquitySeries.length - 1]?.date || today }
          },
          trades: generateSampleTrades(balancedPortfolioData.positions)
        }
      case 'conservative-consumer':
        const conservativePositions = [
          { ticker: 'AAPL', shares: 20, costBasis: 3000.00, marketValue: 3000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 20, sector: 'Technology', lastPrice: 150.00, lastUpdated: new Date().toISOString() },
          { ticker: 'MSFT', shares: 15, costBasis: 3000.00, marketValue: 3000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Technology', lastPrice: 200.00, lastUpdated: new Date().toISOString() },
          { ticker: 'PG', shares: 15, costBasis: 1500.00, marketValue: 1500.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Consumer Staples', lastPrice: 100.00, lastUpdated: new Date().toISOString() },
          { ticker: 'KO', shares: 15, costBasis: 750.00, marketValue: 750.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 15, sector: 'Consumer Staples', lastPrice: 50.00, lastUpdated: new Date().toISOString() },
          { ticker: 'PEP', shares: 10, costBasis: 1800.00, marketValue: 1800.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Consumer Staples', lastPrice: 180.00, lastUpdated: new Date().toISOString() },
          { ticker: 'WMT', shares: 10, costBasis: 1000.00, marketValue: 1000.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Consumer Staples', lastPrice: 100.00, lastUpdated: new Date().toISOString() },
          { ticker: 'COST', shares: 10, costBasis: 5500.00, marketValue: 5500.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 10, sector: 'Consumer Staples', lastPrice: 550.00, lastUpdated: new Date().toISOString() },
          { ticker: 'CL', shares: 5, costBasis: 375.00, marketValue: 375.00, unrealizedGain: 0, unrealizedGainPercent: 0, realizedGain: 0, weight: 5, sector: 'Consumer Staples', lastPrice: 75.00, lastUpdated: new Date().toISOString() }
        ]
        
        // Calculate real portfolio values
        const conservativePortfolioData = calculateRealPortfolioValue(conservativePositions)
        const conservativeEquitySeries = await generateRealEquitySeries(conservativePortfolioData.positions, startDateStr, today)
        const conservativeAssetAllocation = convertAssetAllocation({ AAPL: 20, MSFT: 15, PG: 15, KO: 15, PEP: 10, WMT: 10, COST: 10, CL: 5 }, conservativePortfolioData.positions)
        
        return {
          name: 'Conservative Consumer-Staple',
          risk: 'Very Low Risk',
          description: 'Conservative portfolio focused on consumer staples and healthcare. Low volatility with steady dividends and defensive positioning.',
          allocations: ['AAPL: 20%', 'MSFT: 15%', 'PG: 15%', 'KO: 15%', 'PEP: 10%', 'WMT: 10%', 'COST: 10%', 'CL: 5%'],
          positions: conservativePortfolioData.positions,
          assetAllocation: conservativeAssetAllocation,
          equitySeries: conservativeEquitySeries,
          returnSeries: conservativeEquitySeries.map(point => ({
            date: point.date,
            portfolioReturn: point.return,
            benchmarkReturn: point.return * 0.95
          })),
          holdingsPerformance: generateSampleHoldingsPerformance(conservativePortfolioData.positions),
          metrics: {
            totalValue: conservativePortfolioData.totalValue,
            totalGain: conservativePortfolioData.totalValue - conservativePositions.reduce((sum, pos) => sum + pos.costBasis, 0),
            totalGainPercent: ((conservativePortfolioData.totalValue - conservativePositions.reduce((sum, pos) => sum + pos.costBasis, 0)) / conservativePositions.reduce((sum, pos) => sum + pos.costBasis, 0)) * 100,
            ytdReturn: 6.8,
            positions: conservativePortfolioData.positions,
            assetAllocation: conservativeAssetAllocation,
            lastUpdated: new Date().toISOString(),
            baselineDate: startDateStr
          },
          status: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: conservativePortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: conservativeEquitySeries[0]?.date || startDateStr, end: conservativeEquitySeries[conservativeEquitySeries.length - 1]?.date || today }
          },
          equityEngineSeries: conservativeEquitySeries,
          equityEngineStatus: {
            valuedThrough: new Date().toISOString(),
            bridgedTickers: [],
            missingPrices: [],
            spotValuedTickers: conservativePortfolioData.positions.map(pos => pos.ticker),
            warnings: [],
            totalTrades: 0,
            dateRange: { start: conservativeEquitySeries[0]?.date || startDateStr, end: conservativeEquitySeries[conservativeEquitySeries.length - 1]?.date || today }
          },
          trades: generateSampleTrades(conservativePortfolioData.positions)
        }
      default:
        return null
    }
  }

  if (result) {
    return (
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Import Complete
          </CardTitle>
          <CardDescription>
            Your portfolio data has been successfully imported
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {result.transactionsAdded}
              </div>
              <div className="text-sm text-green-600">Transactions Added</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {result.symbolsAffected.length}
              </div>
              <div className="text-sm text-blue-600">Symbols Affected</div>
            </div>
          </div>

          {result.symbolsAffected.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Symbols Updated:</h4>
              <div className="flex flex-wrap gap-2">
                {result.symbolsAffected.map(symbol => (
                  <Badge key={symbol} variant="outline">
                    {symbol}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline">
              Import Another File
            </Button>
            <Button onClick={() => {
              setResult(null)
              onViewPortfolio?.()
            }}>
              View Portfolio
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 page-container">
      {/* File Upload Area */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm min-h-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl">Import Portfolio Data</CardTitle>
          <CardDescription className="text-base">
            Upload a CSV file containing your trading transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="h-full flex flex-col justify-center p-6">
          <div
            {...getRootProps()}
            className={`border-4 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
              isDragActive 
                ? 'border-[var(--accent)] bg-[var(--accent)]/5' 
                : 'border-[var(--border-subtle)] hover:border-[var(--accent)]/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-16 w-16 mx-auto mb-6 text-[var(--text-muted)]" />
            <p className="text-xl font-medium mb-3">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a CSV file here'}
            </p>
            <p className="text-base text-[var(--text-muted)] mb-6">
              or click to browse files
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Supported formats: CSV with headers (ticker, type, date, quantity, price, fees, notes)
            </p>
          </div>

          {file && (
            <div className="mt-4 p-3 bg-[var(--bg-app)] rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{file.name}</span>
                  <Badge variant="outline">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="font-medium">Processing file...</span>
            </div>
            <Progress value={75} className="w-full" />
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && showPreview && (
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Import Preview</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CardTitle>
            <CardDescription>
              Review the data before committing to your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {preview.summary.validCount}
                </div>
                <div className="text-sm text-green-600">Valid Rows</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {preview.summary.errorCount}
                </div>
                <div className="text-sm text-red-600">Errors</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {preview.summary.warningCount}
                </div>
                <div className="text-sm text-yellow-600">Warnings</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(preview.summary.netCashEffect)}
                </div>
                <div className="text-sm text-blue-600">Net Cash Effect</div>
              </div>
            </div>

            {/* Share Changes */}
            {Object.keys(preview.summary.shareChanges).length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Share Changes:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(preview.summary.shareChanges).map(([ticker, change]) => (
                    <div key={ticker} className="flex justify-between p-2 bg-[var(--bg-app)] rounded">
                      <span className="font-medium">{ticker}</span>
                      <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {preview.invalidRows.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-red-600">Validation Errors:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {preview.invalidRows.slice(0, 10).map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Row {error.rowNumber}: {error.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                  {preview.invalidRows.length > 10 && (
                    <p className="text-sm text-[var(--text-muted)]">
                      ... and {preview.invalidRows.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Potential Duplicates */}
            {preview.potentialDuplicates.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-yellow-600">Potential Duplicates:</h4>
                <div className="space-y-2">
                  {preview.potentialDuplicates.slice(0, 5).map((dup, index) => (
                    <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{dup.new.normalizedTicker}</span>
                        <Badge variant="outline">
                          {(dup.confidence * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">
                        {dup.new.type} on {dup.new.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleCommit}
                disabled={preview.summary.errorCount > 0 || committing}
                className="flex-1"
              >
                {committing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Committing and Analyzing Your Portfolio...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Commit Import
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Portfolios Card */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm">
        <CardHeader style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '28px', paddingRight: '16px' }}>
          <div className="flex flex-col">
            <CardTitle>Sample Portfolios</CardTitle>
            <CardDescription>Select a sample portfolio to test the analysis features</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedSamplePortfolio ? (
            // Selected portfolio view
            <div className="space-y-4">
              <div className="p-4 border-2 border-[var(--accent)] rounded-lg bg-[var(--accent)]/5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-lg">
                    {getSamplePortfolioDisplayData(selectedSamplePortfolio)?.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {getSamplePortfolioDisplayData(selectedSamplePortfolio)?.risk}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  {getSamplePortfolioDisplayData(selectedSamplePortfolio)?.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
                  {getSamplePortfolioDisplayData(selectedSamplePortfolio)?.allocations.map((allocation: string, index: number) => (
                    <span key={index}>• {allocation}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSamplePortfolioImport}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import This Portfolio
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSamplePortfolioUnselect}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Unselect
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Portfolio selection grid
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tech Growth Investor */}
              <div 
                className="p-4 border border-[var(--border-subtle)] rounded-lg cursor-pointer hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-colors"
                onClick={() => handleSamplePortfolioSelect('tech-growth')}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Tech Growth Investor</h4>
                  <Badge variant="outline" className="text-xs">High Risk</Badge>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  Growth-focused portfolio with MAG7 tech leaders plus emerging tech companies. High growth potential with sector concentration.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                  <span>• AAPL: 25%</span>
                  <span>• NVDA: 20%</span>
                  <span>• TSLA: 15%</span>
                  <span>• AMD: 15%</span>
                  <span>• CRM: 15%</span>
                  <span>• ORCL: 10%</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Click to select this portfolio
                </div>
              </div>

              {/* Dividend & Defensive Investor */}
              <div 
                className="p-4 border border-[var(--border-subtle)] rounded-lg cursor-pointer hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-colors"
                onClick={() => handleSamplePortfolioSelect('dividend-defensive')}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Dividend & Defensive</h4>
                  <Badge variant="outline" className="text-xs">Low Risk</Badge>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  Income-focused portfolio with stable MAG7 companies plus dividend-paying defensive stocks. Lower volatility with steady income.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                  <span>• MSFT: 20%</span>
                  <span>• AAPL: 15%</span>
                  <span>• JNJ: 15%</span>
                  <span>• PG: 15%</span>
                  <span>• KO: 15%</span>
                  <span>• WMT: 10%</span>
                  <span>• MCD: 10%</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Click to select this portfolio
                </div>
              </div>

              {/* Balanced Large-Cap Core */}
              <div 
                className="p-4 border border-[var(--border-subtle)] rounded-lg cursor-pointer hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-colors"
                onClick={() => handleSamplePortfolioSelect('balanced-large-cap')}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Balanced Large-Cap Core</h4>
                  <Badge variant="outline" className="text-xs">Medium Risk</Badge>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  Well-diversified portfolio with MAG7 leaders plus established large-cap companies across sectors. Balanced growth and stability.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                  <span>• AAPL: 15%</span>
                  <span>• MSFT: 15%</span>
                  <span>• GOOGL: 10%</span>
                  <span>• JPM: 10%</span>
                  <span>• JNJ: 10%</span>
                  <span>• V: 10%</span>
                  <span>• HD: 10%</span>
                  <span>• UNH: 10%</span>
                  <span>• MA: 10%</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Click to select this portfolio
                </div>
              </div>

              {/* Conservative Consumer-Staple */}
              <div 
                className="p-4 border border-[var(--border-subtle)] rounded-lg cursor-pointer hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 transition-colors"
                onClick={() => handleSamplePortfolioSelect('conservative-consumer')}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Conservative Consumer-Staple</h4>
                  <Badge variant="outline" className="text-xs">Low Risk</Badge>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-3">
                  Conservative portfolio with stable MAG7 companies plus essential consumer goods. Minimal volatility with reliable performance.
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                  <span>• AAPL: 20%</span>
                  <span>• MSFT: 15%</span>
                  <span>• PG: 15%</span>
                  <span>• KO: 15%</span>
                  <span>• PEP: 10%</span>
                  <span>• WMT: 10%</span>
                  <span>• COST: 10%</span>
                  <span>• CL: 5%</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Click to select this portfolio
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
