import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from '@/contexts/session-provider'
import { usePortfolioSelectors } from './use-portfolio-store'
import { LiveDataService, LiveDataMetrics, LiveDataConfig } from '@/lib/live-data-service'
import { Position, NormalizedTransaction } from '@/types/portfolio'
import { loggers, logger, ErrorKinds } from '@/lib/logger'

export function useLiveData(config: LiveDataConfig = {}) {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const { session, isLoading: sessionLoading, error: sessionError } = useSession()
  const { holdings: storePositions, metadata } = usePortfolioSelectors()

  // Use refs to prevent infinite loops
  const isComputingRef = useRef(false)
  const hasStubDataRef = useRef(false)
  const hasLiveDataRef = useRef(false)
  const lastDataHashRef = useRef('')

  const [liveData, setLiveData] = useState<LiveDataMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stubData, setStubData] = useState<LiveDataMetrics | null>(null)
  const [isPhaseBComplete, setIsPhaseBComplete] = useState(false)
  
  const [liveDataService] = useState(() => new LiveDataService(config))

  // Create a stable data source that doesn't change unnecessarily
  const dataSource = useMemo(() => {
    if (mode === 'import' && session) {
      return {
        positions: session.positions || [],
        transactions: session.trades || [],
        source: 'session' as const
      }
    } else {
      return {
        positions: storePositions || [],
        transactions: [],
        source: 'store' as const
      }
    }
  }, [mode, session?.positions, session?.trades, storePositions])

  // Create a hash of the data to detect changes
  const dataHash = useMemo(() => {
    const positionsHash = dataSource.positions.length.toString()
    const transactionsHash = dataSource.transactions.length.toString()
    const sessionHash = session?.sid || 'no-session'
    return `${positionsHash}-${transactionsHash}-${sessionHash}-${mode}`
  }, [dataSource.positions.length, dataSource.transactions.length, session?.sid, mode])

  // Generate stub data function - memoized to prevent recreation
  const generateStubData = useCallback(async (positions: Position[], transactions: NormalizedTransaction[]) => {
    if (positions.length === 0) return null

    loggers.LDS('start', { 
      positions: positions.length,
      trades: transactions.length
    })

    try {
      const now = new Date()
      const stubDates = [
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
        now
      ]

      const totalValue = positions.reduce((sum: number, pos: any) => {
        return sum + ((pos.marketValue || 0) * (pos.shares || pos.quantity || 0))
      }, 0)

      const stubEquitySeries = stubDates.map((date, index) => ({
        date: date.toISOString().split('T')[0],
        value: totalValue * (0.95 + (index * 0.02)),
        return: 0,
        cumulativeReturn: 0
      }))

      const stubAssetAllocation = positions.map((pos: any) => ({
        ticker: pos.ticker,
        name: pos.ticker,
        value: (pos.marketValue || 0) * (pos.shares || pos.quantity || 0),
        weight: totalValue > 0 ? ((pos.marketValue || 0) * (pos.shares || pos.quantity || 0) / totalValue) * 100 : 0,
        count: 1
      }))

      const stubHoldingsPerformance = positions.map((pos: any) => {
        const shares = pos.shares || pos.quantity || 0
        const marketValue = (pos.marketValue || 0) * shares
        const costBasis = marketValue * 0.95
        const unrealizedGain = marketValue - costBasis
        
        return {
          ticker: pos.ticker,
          shares,
          costBasis,
          marketValue,
          unrealizedGain,
          unrealizedGainPercent: costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0,
          realizedGain: 0,
          weight: totalValue > 0 ? (marketValue / totalValue) * 100 : 0,
          sector: pos.sector,
          lastPrice: pos.marketValue || 0,
          lastUpdated: now.toISOString().split('T')[0]
        }
      })

      return {
        totalValue,
        ytdReturn: 0,
        allTimeReturn: 0,
        currentHoldingsCount: positions.length,
        lastUpdated: now.toISOString().split('T')[0],
        equitySeries: stubEquitySeries,
        returnSeries: stubEquitySeries.map(point => ({
          date: point.date,
          value: 0,
          return: 0,
          cumulativeReturn: 0
        })),
        assetAllocation: stubAssetAllocation,
        holdingsPerformance: stubHoldingsPerformance,
        status: {
          valuedThrough: now.toISOString().split('T')[0],
          missingPrices: [],
          bridgedTickers: [],
          spotValuedTickers: [],
          warnings: ['Using stub data for instant UI'],
          totalTrades: dataSource.transactions.length,
          dateRange: { start: stubDates[0].toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
        },
        valuationDate: now.toISOString().split('T')[0],
        currency: 'USD',
        warnings: ['Phase A: Stub data for instant UI']
      }
          } catch (err) {
        logger.error('LDS', 'error', { 
          kind: ErrorKinds.OPERATION_FAILED,
          operation: 'generateStubData',
          msg: err instanceof Error ? err.message : 'Unknown error'
        })
              return null
    }
  }, [session?.sid])

  // Phase A: Generate stub data immediately - with proper guards
  useEffect(() => {
    // Skip stub data generation in import mode with session data
    if (mode === 'import' && session && dataSource.source === 'session') {
      return
    }
    
    // Guard against infinite loops
    if (hasStubDataRef.current) return
    if (sessionLoading) return
    if (dataSource.positions.length === 0) return
    if (dataHash === lastDataHashRef.current) return

    hasStubDataRef.current = true
    lastDataHashRef.current = dataHash

    generateStubData(dataSource.positions, dataSource.transactions).then(stub => {
      if (stub) {
        setStubData(stub)
      }
    }).catch(err => {
      logger.error('LDS', 'error', { 
        kind: ErrorKinds.OPERATION_FAILED,
        operation: 'PhaseA',
        msg: err instanceof Error ? err.message : 'Unknown error'
      })
      hasStubDataRef.current = false
    })
  }, [dataHash, sessionLoading, generateStubData, mode, session, dataSource.source])

  // Phase B: Build full series in background - with proper guards
  useEffect(() => {
    // Skip Phase B in import mode with session data
    if (mode === 'import' && session && dataSource.source === 'session') {
      return
    }
    
    // Guard against infinite loops
    if (isComputingRef.current) return
    if (hasLiveDataRef.current) return
    if (sessionLoading) return
    if (dataSource.positions.length === 0) return
    if (!hasStubDataRef.current) return // Wait for Phase A to complete

    isComputingRef.current = true
    setIsLoading(true)
    setError(null)

    const computeLiveMetrics = async () => {
      try {

        const metrics = await liveDataService.computeLiveMetrics(
          dataSource.positions,
          dataSource.transactions
        )

        // Ensure hero total matches series last point
        const seriesLastValue = metrics.equitySeries[metrics.equitySeries.length - 1]?.value || 0
        const heroTotal = metrics.totalValue
        const diff = Math.abs(heroTotal - seriesLastValue)
        
        const diffPercent = heroTotal > 0 ? (diff / heroTotal) * 100 : 0
        const isOk = diffPercent <= 0.5 // 0.5% threshold
        
        loggers.DASH('recon', { 
          heroTotal: Math.round(heroTotal * 100) / 100,
          seriesLast: Math.round(seriesLastValue * 100) / 100,
          diff: Math.round(diff * 100) / 100,
          ok: isOk
        })

        if (diff > 0.01) {
          if (metrics.equitySeries.length > 0) {
            metrics.equitySeries[metrics.equitySeries.length - 1].value = heroTotal
          }
        }

        setLiveData(metrics)
        setIsPhaseBComplete(true)
        hasLiveDataRef.current = true

        // Log metrics summary
        loggers.LDS('metrics', {
          totalValue: Math.round(metrics.totalValue * 100) / 100,
          ytd: Math.round(metrics.ytdReturn * 100) / 100,
          allTime: Math.round(metrics.allTimeReturn * 100) / 100,
          took: 0 // Will be set by timing wrapper
        })

        // Log equity series info
        if (metrics.equitySeries.length > 0) {
          const first = metrics.equitySeries[0]
          const last = metrics.equitySeries[metrics.equitySeries.length - 1]
          loggers.LDS('equity', {
            points: metrics.equitySeries.length,
            start: first.date,
            end: last.date,
            rebased: false
          })
        }

        // Log asset allocation
        loggers.LDS('alloc', {
          buckets: metrics.assetAllocation.length,
          sum: Math.round(metrics.assetAllocation.reduce((sum, item) => sum + item.weight, 0) * 100) / 100
        })

        // Log holdings performance
        const missingPrices = metrics.holdingsPerformance.filter(p => !p.lastPrice).length
        const missingBasis = metrics.holdingsPerformance.filter(p => !p.costBasis).length
        loggers.LDS('holdings', {
          rows: metrics.holdingsPerformance.length,
          missingPrices,
          missingBasis
        })

      } catch (err) {
        logger.error('LDS', 'error', { 
          kind: ErrorKinds.OPERATION_FAILED,
          operation: 'computeLiveMetrics',
          msg: err instanceof Error ? err.message : 'Failed to compute live metrics'
        })
        setError(err instanceof Error ? err.message : 'Failed to compute live metrics')
        setLiveData(null)
      } finally {
        setIsLoading(false)
        isComputingRef.current = false
      }
    }

    // Small delay to ensure Phase A renders first
    const timer = setTimeout(computeLiveMetrics, 100)
    return () => clearTimeout(timer)
  }, [dataHash, sessionLoading, liveDataService, mode, session, dataSource.source])

  // Reset refs when data changes significantly
  useEffect(() => {
    if (dataHash !== lastDataHashRef.current) {
      hasStubDataRef.current = false
      hasLiveDataRef.current = false
      isComputingRef.current = false
      setStubData(null)
      setLiveData(null)
      setIsPhaseBComplete(false)
      setIsLoading(false)
      setError(null)
    }
  }, [dataHash])

  // Return computed metrics with fallbacks - prioritize Phase B data, fallback to Phase A
  const metrics = useMemo(() => {
    // In import mode with session data, use session data directly
    if (mode === 'import' && session && dataSource.source === 'session') {
      loggers.DASH('session-data', {
        totalValue: session.metrics?.totalValue || 0,
        positionsCount: session.positions?.length || 0,
        holdingsCount: session.holdingsPerformance?.length || 0,
        hasEquitySeries: !!(session.equityEngineSeries && session.equityEngineSeries.length > 0)
      })
      
      return {
        totalValue: session.metrics?.totalValue || 0,
        ytdReturn: session.metrics?.ytdReturn || 0,
        allTimeReturn: session.metrics?.totalGainPercent || 0,
        currentHoldingsCount: session.positions?.length || 0,
        lastUpdated: session.metrics?.lastUpdated || new Date().toISOString().split('T')[0],
        equitySeries: session.equityEngineSeries || [],
        returnSeries: session.returnSeries || [],
        assetAllocation: session.assetAllocation || [],
        holdingsPerformance: session.holdingsPerformance || [],
        status: session.status || {
          valuedThrough: '',
          missingPrices: [],
          bridgedTickers: [],
          spotValuedTickers: [],
          warnings: [],
          totalTrades: 0,
          dateRange: { start: '', end: '' }
        },
        valuationDate: session.status?.valuedThrough || new Date().toISOString().split('T')[0],
        currency: 'USD',
        warnings: []
      }
    }
    
    // Phase B: Use computed live data (preferred)
    if (liveData && isPhaseBComplete) {
      return liveData
    }
    
    // Phase A: Use stub data for instant UI
    if (stubData) {
      return stubData
    }
    
    // Fallback to empty state
    return {
      totalValue: 0,
      ytdReturn: 0,
      allTimeReturn: 0,
      currentHoldingsCount: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      equitySeries: [],
      returnSeries: [],
      assetAllocation: [],
      holdingsPerformance: [],
      status: {
        valuedThrough: '',
        missingPrices: [],
        bridgedTickers: [],
        spotValuedTickers: [],
        warnings: [],
        totalTrades: 0,
        dateRange: { start: '', end: '' }
      },
      valuationDate: new Date().toISOString().split('T')[0],
      currency: 'USD',
      warnings: []
    }
  }, [liveData, isPhaseBComplete, stubData, mode, session, dataSource.source])

  // Enhanced status information
  const status = useMemo(() => {
    if (error) {
      return { type: 'error' as const, message: error }
    }
    
    if (isLoading && !stubData) {
      return { type: 'loading' as const, message: 'Loading portfolio data...' }
    }
    
    if (stubData && !isPhaseBComplete) {
      return { type: 'loading' as const, message: 'Building detailed analysis...' }
    }
    
    if (metrics.totalValue > 0) {
      return { type: 'success' as const, message: 'Portfolio data loaded' }
    }
    
    return { type: 'empty' as const, message: 'No portfolio data available' }
  }, [error, isLoading, stubData, isPhaseBComplete, metrics.totalValue])

  return {
    // Live metrics
    metrics,
    
    // Status information
    status,
    isLoading,
    error,
    
    // Raw data sources
    positions: dataSource.positions,
    transactions: dataSource.transactions,
    dataSource: dataSource.source,
    
    // Service instance for advanced operations
    liveDataService,
    
    // Mode information
    mode: mode || 'default',
    
    // Phase information
    isPhaseBComplete,
    hasStubData: !!stubData
  }
}
