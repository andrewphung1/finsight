import { useSearchParams } from 'next/navigation'
import { useSession } from '@/contexts/session-provider'
import { usePortfolioSelectors } from './use-portfolio-store'
import { computeYTDFromSeries, convertEquitySeriesToDailySeries, assertYTDConsistency, assertYTDChartConsistency } from '@/lib/performance/ytd'
import { 
  Position, 
  AssetAllocation, 
  PerformanceData, 
  PerformanceMetrics 
} from '@/types/portfolio'
import { EquityEngine } from '@/lib/equity-engine'
import { getPriceStore } from '@/lib/price-store'

export function usePortfolioData() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const { session, isLoading, error } = useSession()

  // In import mode, use session data
  if (mode === 'import') {
    console.log('usePortfolioData: Import mode detected, session state:', { 
      isLoading, 
      error, 
      session: !!session,
      sessionSid: session?.sid,
      sessionPositionsCount: session?.positions?.length,
      sessionTotalValue: session?.metrics?.totalValue
    })
    
    // Block empty state emission when we have import mode + sid but haven't hydrated yet
    const sid = searchParams.get('sid')
    const shouldBlockEmptyState = sid && isLoading
    
    if (shouldBlockEmptyState) {
      console.log('usePortfolioData: Blocking empty state during session hydration')
      return {
        positions: [],
        assetAllocation: [],
        equitySeries: [],
        returnSeries: [],
        holdingsPerformance: [],
        metrics: {
          totalValue: 0,
          totalCost: 0,
          totalGain: 0,
          totalGainPercent: 0,
          ytdReturn: 0
        },
        status: {
          valuedThrough: '',
          bridgedTickers: [],
          missingPrices: [],
          spotValuedTickers: []
        },
        metadata: {
          name: 'Loading...',
          lastUpdated: '',
          status: 'loading',
          error: undefined
        },
        equityEngineSeries: [],
        equityEngineStatus: undefined,
        isLoading: true,
        error: null,
        mode: 'import' as const
      }
    }
    
    if (isLoading) {
      return {
        positions: [],
        assetAllocation: [],
        equitySeries: [],
        returnSeries: [],
        holdingsPerformance: [],
        metrics: {
          totalValue: 0,
          totalCost: 0,
          totalGain: 0,
          totalGainPercent: 0,
          ytdReturn: 0
        },
        status: {
          valuedThrough: '',
          bridgedTickers: [],
          missingPrices: [],
          spotValuedTickers: []
        },
        metadata: {
          name: 'Loading...',
          lastUpdated: '',
          status: 'loading',
          error: undefined
        },
        // NEW: Include EquityEngine data
        equityEngineSeries: [],
        equityEngineStatus: undefined,
        isLoading: true,
        error,
        mode: 'import' as const
      }
    }

    if (error || !session) {
      return {
        positions: [],
        assetAllocation: [],
        equitySeries: [],
        returnSeries: [],
        holdingsPerformance: [],
        metrics: {
          totalValue: 0,
          totalCost: 0,
          totalGain: 0,
          totalGainPercent: 0,
          ytdReturn: 0
        },
        status: {
          valuedThrough: '',
          bridgedTickers: [],
          missingPrices: [],
          spotValuedTickers: []
        },
        metadata: {
          name: 'Import Error',
          lastUpdated: '',
          status: 'error',
          error
        },
        // NEW: Include EquityEngine data
        equityEngineSeries: [],
        equityEngineStatus: undefined,
        isLoading: false,
        error,
        mode: 'import' as const
      }
    }

    // Use EquityEngine for portfolio valuation
    let equityEngineSeries = session.equityEngineSeries || []
    let equityEngineStatus = session.equityEngineStatus
    let totalValue = session.metrics?.totalValue || 0
    let ytdReturn = session.metrics?.ytdReturn || 0
    let baselineDate = ''
    
    // If we have equity engine data, use it for calculations
    if (equityEngineSeries && equityEngineSeries.length > 0) {
      try {
        // Update total value from equity series
        totalValue = equityEngineSeries[equityEngineSeries.length - 1].value
        
        // Calculate YTD using the equity series
        if (equityEngineSeries.length > 1) {
          const dailySeries = convertEquitySeriesToDailySeries(equityEngineSeries)
          const ytdResult = computeYTDFromSeries(dailySeries)
          ytdReturn = ytdResult.ytdReturn
          baselineDate = ytdResult.baselineDate
          
          // Runtime consistency check
          assertYTDConsistency(ytdResult, totalValue, 'usePortfolioData import YTD calculation')
          
          // YTD chart consistency check
          const currentYear = new Date().getFullYear()
          const yearStartDate = `${currentYear}-01-01`
          
          // Find baseline point for YTD calculation
          const baselinePoint = dailySeries.find(point => point.date >= yearStartDate) || dailySeries[0]
          const currentPoint = dailySeries[dailySeries.length - 1]
          
          if (baselinePoint && currentPoint && baselinePoint.value > 0) {
            const chartCumulativeReturn = ((currentPoint.value - baselinePoint.value) / baselinePoint.value) * 100
            assertYTDChartConsistency(ytdResult, chartCumulativeReturn, 'usePortfolioData import YTD chart consistency')
          }
        }
        
        console.log('usePortfolioData: Using existing EquityEngine data:', {
          seriesLength: equityEngineSeries.length,
          totalValue,
          ytdReturn,
          status: equityEngineStatus
        })
      } catch (error) {
        console.error('usePortfolioData: Error processing EquityEngine data:', error)
      }
    }

    console.log('usePortfolioData: Returning import session data:', {
      positionsCount: session.positions?.length,
      totalValue,
      ytdReturn,
      equitySeriesLength: equityEngineSeries?.length,
      spotValuedTickers: equityEngineStatus?.spotValuedTickers || [],
      sessionSid: session.sid,
      sessionMode: mode
    })
    
    return {
      positions: session.positions,
      assetAllocation: session.assetAllocation,
      equitySeries: equityEngineSeries, // Use EquityEngine series
      returnSeries: equityEngineSeries.map(point => ({
        date: point.date,
        value: point.cumulativeReturn || 0
      })),
      holdingsPerformance: session.holdingsPerformance,
      metrics: {
        ...session.metrics,
        totalValue,
        ytdReturn,
        baselineDate
      },
      status: {
        ...session.status,
        valuedThrough: equityEngineStatus?.valuedThrough || session.status.valuedThrough,
        missingPrices: equityEngineStatus?.missingPrices || session.status.missingPrices,
        bridgedTickers: equityEngineStatus?.bridgedTickers || session.status.bridgedTickers,
        spotValuedTickers: equityEngineStatus?.spotValuedTickers || []
      },
      metadata: {
        name: `Imported Portfolio (${session.sid})`,
        lastUpdated: equityEngineStatus?.valuedThrough || session.status.valuedThrough,
        status: 'ready',
        error: undefined
      },
      // NEW: Include EquityEngine data from session
      equityEngineSeries,
      equityEngineStatus,
      isLoading: false,
      error: null,
      mode: 'import' as const
    }
  }

  // Empty state - no imported data
  return {
    positions: [],
    assetAllocation: [],
    equitySeries: [],
    returnSeries: [],
    holdingsPerformance: [],
    metrics: null,
    status: {
      valuedThrough: '',
      bridgedTickers: [],
      missingPrices: [],
      spotValuedTickers: []
    },
    metadata: {
      name: 'Empty',
      lastUpdated: '',
      status: 'empty',
      error: undefined
    },
    equityEngineSeries: undefined,
    equityEngineStatus: undefined,
    isLoading: false,
    error: null,
    mode: 'empty' as const
  }
}
