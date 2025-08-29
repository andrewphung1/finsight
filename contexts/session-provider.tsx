"use client"

import { createContext, useContext, useEffect, useState, useRef, ReactNode, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Position, 
  AssetAllocation, 
  PerformanceData, 
  PerformanceMetrics,
  NormalizedTransaction,
  PricingStatus
} from '@/types/portfolio'
import { EquitySeriesPoint } from '@/lib/equity-engine'
import { getPortfolioStore } from '@/lib/portfolio-store'
import { loggers, logger, ErrorKinds } from '@/lib/logger'

export interface ImportSession {
  sid: string
  positions: Position[]
  assetAllocation: AssetAllocation[]
  equitySeries: PerformanceData[]
  returnSeries: { date: string; portfolioReturn: number; benchmarkReturn: number }[]
  holdingsPerformance: Array<{
    ticker: string
    totalReturnPercent: number
    unrealizedGain: number
    realizedGain: number
    avgSharePrice: number
    marketValue: number
    totalReturn: number
  }>
  metrics: PerformanceMetrics
  status: {
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
    spotValuedTickers: string[]
    warnings: string[]
    totalTrades: number
    dateRange: {
      start: string
      end: string
    }
  }
  // NEW: User trades for SPY benchmark calculation
  trades: NormalizedTransaction[]
  // NEW: Pricing resolution tracking
  pricingStatus: PricingStatus
  resolvedTickers: string[]
  totalTickers: number
}

interface SessionContextType {
  session: ImportSession | null
  isLoading: boolean
  error: string | null
  clearSession: () => void
  clearVersion: number
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  isLoading: false,
  error: null,
  clearSession: () => {},
  clearVersion: 0
})

function SessionProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const [session, setSession] = useState<ImportSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null)
  const [clearVersion, setClearVersion] = useState(0)
  
  // Add ref to prevent infinite loops
  const hasLoadedSession = useRef<Record<string, boolean>>({})

  const mode = searchParams.get('mode')
  const sid = searchParams.get('sid')

  useEffect(() => {
    if (mode === 'import' && sid) {
      // Prevent multiple loads of the same session
      if (loadingSessionId === sid && isLoading) {
        return
      }
      
      // Prevent infinite loops by checking if we've already loaded this session
      if (hasLoadedSession.current[sid]) {
        console.log('SessionProvider: Session already loaded, skipping:', sid)
        return
      }
      
      setLoadingSessionId(sid)
      hasLoadedSession.current[sid] = true
      loadImportSession(sid)
    } else if (mode === 'import' && !sid) {
      setError('Imported session expired—please re-import.')
      setSession(null)
    } else {
      // Empty state - no import session
      setSession(null)
      setError(null)
    }
  }, [mode, sid])

  const clearSession = () => {
    setSession(null)
    setError(null)
    setIsLoading(false)
    setLoadingSessionId(null)
    // Clear the loaded session tracking
    hasLoadedSession.current = {}
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      sessionStorage.clear()
      localStorage.removeItem('portfolio-store')
      
      // Remove all import-session-* keys from localStorage
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('import-session-')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear portfolio store data
      try {
        const portfolioStore = getPortfolioStore()
        portfolioStore.clearAllPortfolios()
        // Portfolio store cleared
      } catch (error) {
        logger.error('SES', 'error', { 
          kind: ErrorKinds.OPERATION_FAILED,
          operation: 'clearPortfolioStore',
          msg: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      
      // Clear API keys
      try {
        localStorage.removeItem('gemini-api-key')
        sessionStorage.removeItem('gemini-api-key')
      } catch (error) {
        console.log('SessionProvider: Error clearing API keys:', error)
      }
      
      // Clear URL parameters to prevent reloading
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('mode')
        url.searchParams.delete('sid')
        window.history.replaceState({}, '', url.toString())
        console.log('SessionProvider: Cleared URL parameters')
      } catch (error) {
        console.log('SessionProvider: Error clearing URL parameters:', error)
      }
      
      // Increment clear version to force React components to re-render
      setClearVersion(prev => prev + 1)
    }
  }

  const loadImportSession = async (sessionId: string) => {
    setIsLoading(true)
    setError(null)
    
    // Add a small delay to ensure session data is available
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      console.log('SessionProvider: Attempting to load session:', sessionId)
      
      // Check if session exists in sessionStorage
      const sessionKey = `import-session-${sessionId}`
      const sessionData = sessionStorage.getItem(sessionKey)
      
      // Debug: List all session storage keys
      const allKeys = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('import-session-')) {
          allKeys.push(key)
        }
      }
      
      console.log('SessionProvider: Session storage check:', {
        sessionKey,
        hasData: !!sessionData,
        dataLength: sessionData?.length || 0,
        allSessionKeys: allKeys,
        totalSessionStorageKeys: sessionStorage.length
      })
      
      if (sessionData) {
        try {
          const parsedSession = JSON.parse(sessionData)
          
          // Debug: Log the parsed session structure
          console.log('SessionProvider: Parsed session structure:', {
            hasSid: !!parsedSession.sid,
            hasPositions: !!parsedSession.positions,
            positionsIsArray: Array.isArray(parsedSession.positions),
            positionsLength: parsedSession.positions?.length,
            hasMetrics: !!parsedSession.metrics,
            metricsType: typeof parsedSession.metrics,
            hasHoldingsPerformance: !!parsedSession.holdingsPerformance,
            holdingsPerformanceLength: parsedSession.holdingsPerformance?.length,
            sessionKeys: Object.keys(parsedSession)
          })
          
          // Validate session data structure
          if (!parsedSession.sid) {
            throw new Error('Session data missing SID')
          }
          if (!parsedSession.positions || !Array.isArray(parsedSession.positions)) {
            console.warn('SessionProvider: Warning - positions array is missing or invalid, but continuing')
          }
          if (!parsedSession.metrics || typeof parsedSession.metrics !== 'object') {
            console.warn('SessionProvider: Warning - metrics object is missing or invalid, but continuing')
          }
          
          // DEBUG: Log the loaded session data
          console.log('SessionProvider: Loaded session data:', {
            sid: parsedSession.sid,
            totalValue: parsedSession.metrics?.totalValue,
            ytdReturn: parsedSession.metrics?.ytdReturn,
            positionsCount: parsedSession.positions?.length,
            equityEngineSeriesLength: parsedSession.equityEngineSeries?.length || 0,
            equityEngineStatus: parsedSession.equityEngineStatus,
            tradesCount: parsedSession.trades?.length || 0
          })
          
          console.log('SessionProvider: Setting session state')
          setSession(parsedSession)
          
          // Hydrate portfolio store with session data for import mode
          if (mode === 'import') {
            try {
              const portfolioStore = getPortfolioStore()
              
              // Normalize positions to ensure shares field is set
              const normalizedPositions = (parsedSession.positions || []).map((pos: any) => ({
                ...pos,
                shares: pos.shares || pos.quantity || 0,
                quantity: pos.shares || pos.quantity || 0 // Legacy compatibility
              }))
              
              // Log any positions missing quantity
              const missingQuantity = normalizedPositions.filter((pos: any) => !pos.shares).length
              if (missingQuantity > 0) {
                console.warn('[POS:normalize]', { missingQuantity })
              }
              
              // Create a portfolio record from session data
              const portfolioRecord = {
                id: 'import-session',
                name: 'Import Session',
                createdAt: new Date().toISOString(),
                source: 'import' as const,
                rawTransactions: parsedSession.trades || [],
                holdings: normalizedPositions,
                assetAllocation: parsedSession.assetAllocation || [],
                equitySeries: parsedSession.equityEngineSeries || [],
                returnSeries: parsedSession.returnSeries || [],
                lastPrices: {},
                status: 'ready' as const,
                version: 1,
                holdingsPerformance: parsedSession.holdingsPerformance || [],
                metrics: parsedSession.metrics || {
                  totalValue: 0,
                  totalCost: 0,
                  totalGain: 0,
                  totalGainPercent: 0,
                  ytdReturn: 0
                }
              }
              
              // Add to store and make active
              portfolioStore.addOrReplacePortfolio(portfolioRecord)
              portfolioStore.setActivePortfolio('import-session')
              
              console.log('SessionProvider: Hydrated portfolio store with session data:', {
                portfolioId: 'import-session',
                positionsCount: portfolioRecord.holdings.length,
                equitySeriesLength: portfolioRecord.equitySeries.length,
                totalValue: portfolioRecord.metrics.totalValue,
                pricingStatus: session?.pricingStatus || 'pending',
                resolvedTickers: session?.resolvedTickers?.length || 0,
                ytdReturn: portfolioRecord.metrics.ytdReturn,
                allTimeReturn: portfolioRecord.metrics.totalGainPercent
              })
            } catch (error) {
              console.error('SessionProvider: Error hydrating portfolio store:', error)
            }
          }
        } catch (parseError) {
          console.error('SessionProvider: Error parsing session data:', parseError)
          setError('Invalid session data format')
        }
      } else {
        console.log('SessionProvider: No session data found for SID:', sessionId)
        setError('Imported session expired—please re-import.')
      }
    } catch (err) {
      console.error('SessionProvider: Session load error:', err)
      setError('Failed to load imported portfolio data')
    } finally {
      setIsLoading(false)
      setLoadingSessionId(null)
    }
  }

  return (
    <SessionContext.Provider value={{ 
      session, 
      isLoading, 
      error,
      clearSession,
      clearVersion
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SessionProviderInner>
        {children}
      </SessionProviderInner>
    </Suspense>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

// Helper function to store session data
export function storeImportSession(sessionId: string, sessionData: ImportSession) {
  try {
    console.log('SessionProvider: Storing session data:', {
      sid: sessionData.sid,
      totalValue: sessionData.metrics?.totalValue,
      ytdReturn: sessionData.metrics?.ytdReturn,
      positionsCount: sessionData.positions?.length,
      equityEngineSeriesLength: sessionData.equityEngineSeries?.length || 0,
      equityEngineStatus: sessionData.equityEngineStatus,
      tradesCount: sessionData.trades?.length || 0
    })
    
    // Validate session data before storing
    if (!sessionData.sid) {
      throw new Error('Session data missing SID')
    }
    if (!sessionData.positions || !Array.isArray(sessionData.positions)) {
      console.warn('SessionProvider: Warning - positions array is missing or invalid, but continuing')
    }
    if (!sessionData.metrics || typeof sessionData.metrics !== 'object') {
      console.warn('SessionProvider: Warning - metrics object is missing or invalid, but continuing')
    }
    
    const sessionKey = `import-session-${sessionId}`
    const sessionJson = JSON.stringify(sessionData)
    
    console.log('SessionProvider: Storing session with key:', sessionKey)
    sessionStorage.setItem(sessionKey, sessionJson)
    
    // Verify the data was stored
    const storedData = sessionStorage.getItem(sessionKey)
    if (storedData) {
      console.log('SessionProvider: Successfully stored session data, verification passed')
      
      // Additional verification - try to parse the stored data
      try {
        const parsedStoredData = JSON.parse(storedData)
        console.log('SessionProvider: Stored data verification - parsed successfully:', {
          sid: parsedStoredData.sid,
          positionsCount: parsedStoredData.positions?.length,
          totalValue: parsedStoredData.metrics?.totalValue
        })
      } catch (parseError) {
        console.error('SessionProvider: Stored data verification - parse failed:', parseError)
      }
    } else {
      console.error('SessionProvider: Failed to store session data - verification failed')
      throw new Error('Session storage verification failed')
    }
  } catch (err) {
    console.error('SessionProvider: Failed to store session:', err)
    throw err // Re-throw to allow calling code to handle the error
  }
}
