import { useState, useCallback } from 'react'
import { NormalizedTransaction, ImportResult, PerformanceMetrics, PerformanceData } from '@/types/portfolio'
import { EquityEngine, EquitySeriesPoint } from '@/lib/equity-engine'
import { PriceStore } from '@/lib/price-store'

// Feature flag to switch between old and new implementations
const USE_EQUITY_ENGINE = true

interface Trade {
  executed_at: string
  ticker: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  fees: number
  currency: string
}

interface UsePortfolioImportReturn {
  transactions: NormalizedTransaction[]
  trades: Trade[]
  portfolio: PerformanceMetrics | null
  performanceData: PerformanceData[]
  equityStatus?: {
    valuedThrough: string
    bridgedTickers: string[]
    missingPrices: string[]
  }
  // NEW: EquityEngine data
  equityEngineSeries?: EquitySeriesPoint[]
  equityEngineStatus?: {
    valuedThrough: string
    missingPrices: string[]
    bridgedTickers: string[]
    warnings: string[]
    totalTrades: number
    dateRange: {
      start: string
      end: string
    }
  }
  isRefreshing: boolean
  importTransactions: (result: ImportResult) => Promise<void>
  refreshPortfolio: () => Promise<void>
  clearPortfolio: () => void
}

export function usePortfolioImport(): UsePortfolioImportReturn {
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [portfolio, setPortfolio] = useState<PerformanceMetrics | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [equityStatus, setEquityStatus] = useState<{
    valuedThrough: string
    bridgedTickers: string[]
    missingPrices: string[]
  } | undefined>()
  // NEW: EquityEngine state
  const [equityEngineSeries, setEquityEngineSeries] = useState<EquitySeriesPoint[]>([])
  const [equityEngineStatus, setEquityEngineStatus] = useState<{
    valuedThrough: string
    missingPrices: string[]
    bridgedTickers: string[]
    warnings: string[]
    totalTrades: number
    dateRange: {
      start: string
      end: string
    }
  } | undefined>()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // NEW: Compute equity series using PriceStore + EquityEngine
  const computeEquitySeriesWithEngine = useCallback(async (transactions: NormalizedTransaction[]) => {
    if (!USE_EQUITY_ENGINE || !transactions || transactions.length === 0) {
      return { series: [], status: null }
    }

    try {
      console.log('Import: Computing equity series with EquityEngine for', transactions.length, 'transactions')
      
      // Create PriceStore instance
      const priceStore = new PriceStore()
      
      // Create EquityEngine instance
      const equityEngine = new EquityEngine(priceStore)
      
      // Build equity series using EquityEngine
      const result = await equityEngine.buildEquitySeries(transactions)
      
      console.log('Import: EquityEngine generated series:', {
        points: result.series.length,
        status: result.status,
        missingPrices: result.status.missingPrices
      })
      
      return result
    } catch (error) {
      console.error('Import: Error computing equity series with EquityEngine:', error)
      return { series: [], status: null }
    }
  }, [])

  // LEGACY: Compute equity series using old PortfolioEquityEngine
  const computeEquitySeriesLegacy = useCallback(async (trades: Trade[]) => {
    if (USE_EQUITY_ENGINE) {
      return { performanceData: [], status: { valuedThrough: '', bridgedTickers: [], missingPrices: [] } }
    }

    try {
      console.log('Import: Computing equity series with legacy PortfolioEquityEngine')
      
      // Import the old engine only when needed
      const { PortfolioEquityEngine } = await import('@/lib/portfolio-equity-engine')
      const equityEngine = new PortfolioEquityEngine()
      const equityResult = equityEngine.computeEquityCurve(trades)
      
      return equityResult
    } catch (error) {
      console.error('Import: Error computing equity series with legacy engine:', error)
      return { performanceData: [], status: { valuedThrough: '', bridgedTickers: [], missingPrices: [] } }
    }
  }, [])

  const importTransactions = useCallback(async (result: ImportResult) => {
    console.log('usePortfolioImport: importTransactions called with result:', result)
    if (!result.success || !result.preview) {
      console.log('usePortfolioImport: Invalid result, returning early')
      return
    }

    console.log('Importing transactions:', result.preview.validRows.length, 'valid rows')
    
    setIsRefreshing(true)
    try {
      // Add new transactions to existing ones
      const newTransactions = [...transactions, ...result.preview.validRows]
      console.log('Setting transactions:', newTransactions.length, 'total transactions')
      setTransactions(newTransactions)

      // Convert transactions to trades for legacy engine (if needed)
      const newTrades: Trade[] = result.preview.validRows.map(tx => ({
        executed_at: tx.date,
        ticker: tx.normalizedTicker,
        side: tx.type === 'BUY' ? 'BUY' : 'SELL',
        quantity: tx.quantity,
        price: tx.price || 0,
        fees: tx.fees,
        currency: 'USD'
      }))
      
      const allTrades = [...trades, ...newTrades]
      setTrades(allTrades)

      if (USE_EQUITY_ENGINE) {
        // NEW: Use EquityEngine with PriceStore
        const equityResult = await computeEquitySeriesWithEngine(newTransactions)
        
        if (equityResult.series && equityResult.status) {
          setEquityEngineSeries(equityResult.series)
          setEquityEngineStatus(equityResult.status)
          
          // Convert EquitySeriesPoint[] to PerformanceData[] for backward compatibility
          const performanceData = equityResult.series.map(point => ({
            date: point.date,
            value: point.value,
            return: 0, // Not calculated in EquityEngine yet
            cumulativeReturn: 0 // Not calculated in EquityEngine yet
          }))
          
          setPerformanceData(performanceData)
          setEquityStatus({
            valuedThrough: equityResult.status.valuedThrough,
            bridgedTickers: equityResult.status.bridgedTickers,
            missingPrices: equityResult.status.missingPrices
          })
          
          console.log('Import: EquityEngine equity series computed:', {
            seriesPoints: equityResult.series.length,
            status: equityResult.status,
            missingPrices: equityResult.status.missingPrices
          })
        }
      } else {
        // LEGACY: Use old PortfolioEquityEngine
        const equityResult = await computeEquitySeriesLegacy(allTrades)
        
        setPerformanceData(equityResult.performanceData)
        setEquityStatus(equityResult.status)
        
        console.log('Import: Legacy equity series computed:', {
          performanceDataPoints: equityResult.performanceData.length,
          status: equityResult.status
        })
      }

      // In a real implementation, you'd also:
      // 1. Persist transactions to database
      // 2. Queue price/FX fetches
      // 3. Update cache
      // 4. Trigger real-time updates

      console.log('Portfolio import completed:', {
        transactionsAdded: result.transactionsAdded,
        symbolsAffected: result.symbolsAffected,
        newTransactionsCount: newTransactions.length,
        useEquityEngine: USE_EQUITY_ENGINE
      })
    } catch (error) {
      console.error('Error importing transactions:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [transactions, trades, computeEquitySeriesWithEngine, computeEquitySeriesLegacy])

  const refreshPortfolio = useCallback(async () => {
    if (transactions.length === 0) return

    setIsRefreshing(true)
    try {
      if (USE_EQUITY_ENGINE) {
        // NEW: Use EquityEngine with PriceStore
        const equityResult = await computeEquitySeriesWithEngine(transactions)
        
        if (equityResult.series && equityResult.status) {
          setEquityEngineSeries(equityResult.series)
          setEquityEngineStatus(equityResult.status)
          
          // Convert EquitySeriesPoint[] to PerformanceData[] for backward compatibility
          const performanceData = equityResult.series.map(point => ({
            date: point.date,
            value: point.value,
            return: 0, // Not calculated in EquityEngine yet
            cumulativeReturn: 0 // Not calculated in EquityEngine yet
          }))
          
          setPerformanceData(performanceData)
          setEquityStatus({
            valuedThrough: equityResult.status.valuedThrough,
            bridgedTickers: equityResult.status.bridgedTickers,
            missingPrices: equityResult.status.missingPrices
          })
        }
      } else {
        // LEGACY: Use old PortfolioEquityEngine
        const equityResult = await computeEquitySeriesLegacy(trades)
        
        setPerformanceData(equityResult.performanceData)
        setEquityStatus(equityResult.status)
      }
    } catch (error) {
      console.error('Error refreshing portfolio:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [transactions, trades, computeEquitySeriesWithEngine, computeEquitySeriesLegacy])

  const clearPortfolio = useCallback(() => {
    setTransactions([])
    setTrades([])
    setPortfolio(null)
    setPerformanceData([])
    setEquityStatus(undefined)
    // NEW: Clear EquityEngine data
    setEquityEngineSeries([])
    setEquityEngineStatus(undefined)
  }, [])

  return {
    transactions,
    trades,
    portfolio,
    performanceData,
    equityStatus,
    // NEW: Return EquityEngine data
    equityEngineSeries,
    equityEngineStatus,
    isRefreshing,
    importTransactions,
    refreshPortfolio,
    clearPortfolio
  }
}
