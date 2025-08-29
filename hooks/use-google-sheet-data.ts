import { useState, useEffect, useCallback } from 'react'
import { googleSheetStore } from '@/lib/google-sheet-store'
import { useConnectionStatusStore } from '@/lib/connection-status-store'

interface CompanySnapshot {
  ticker: string
  price: number
  companyName: string
  marketCap: number
  peRatio: number
  sharesOutstanding: number
}

interface UseGoogleSheetDataReturn {
  getCompanySnapshot: (ticker: string) => Promise<CompanySnapshot | null>
  searchCompanies: (query: string) => Promise<CompanySnapshot[]>
  getAllCompanies: () => Promise<CompanySnapshot[]>
  refreshData: () => Promise<void>
  isLoading: boolean
  error: string | null
  lastFetchTime: number
  dataSize: number
  connectionStatus: 'connected' | 'refreshing' | 'disconnected'
}

export function useGoogleSheetData(): UseGoogleSheetDataReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const [dataSize, setDataSize] = useState(0)
  
  const { status, setStatus, setLastFetchTime: setConnectionLastFetchTime, shouldFetchData } = useConnectionStatusStore()

  const handleError = useCallback((err: any) => {
    console.error('useGoogleSheetData error:', err)
    setError(err.message || 'Failed to fetch company data')
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const getCompanySnapshot = useCallback(async (ticker: string): Promise<CompanySnapshot | null> => {
    try {
      clearError()
      // Only show loading if we don't have any data yet
      if (googleSheetStore.getDataSize() === 0) {
        setIsLoading(true)
      }
      const snapshot = await googleSheetStore.getCompanySnapshot(ticker)
      setLastFetchTime(googleSheetStore.getLastFetchTime())
      setDataSize(googleSheetStore.getDataSize())
      return snapshot
    } catch (err) {
      handleError(err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [clearError, handleError])

  const searchCompanies = useCallback(async (query: string): Promise<CompanySnapshot[]> => {
    try {
      clearError()
      // Only show loading if we don't have any data yet
      if (googleSheetStore.getDataSize() === 0) {
        setIsLoading(true)
      }
      const results = await googleSheetStore.searchCompanies(query)
      setLastFetchTime(googleSheetStore.getLastFetchTime())
      setDataSize(googleSheetStore.getDataSize())
      return results
    } catch (err) {
      handleError(err)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [clearError, handleError])

  const getAllCompanies = useCallback(async (): Promise<CompanySnapshot[]> => {
    try {
      clearError()
      // Only show loading if we don't have any data yet
      if (googleSheetStore.getDataSize() === 0) {
        setIsLoading(true)
      }
      const companies = await googleSheetStore.getAllCompanies()
      setLastFetchTime(googleSheetStore.getLastFetchTime())
      setDataSize(googleSheetStore.getDataSize())
      return companies
    } catch (err) {
      handleError(err)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [clearError, handleError])

  const refreshData = useCallback(async (): Promise<void> => {
    try {
      clearError()
      setIsLoading(true)
      setStatus('refreshing')
      
      await googleSheetStore.refreshData()
      
      const fetchTime = googleSheetStore.getLastFetchTime()
      setLastFetchTime(fetchTime)
      setConnectionLastFetchTime(fetchTime)
      setDataSize(googleSheetStore.getDataSize())
      setStatus('connected')
    } catch (err) {
      handleError(err)
      setStatus('disconnected')
    } finally {
      setIsLoading(false)
    }
  }, [clearError, handleError, setStatus, setConnectionLastFetchTime])

  // Initialize data on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initialize = async () => {
      try {
        // Check if we should fetch data based on 24-hour policy
        if (shouldFetchData()) {
          console.log('useGoogleSheetData: Fetching fresh data (24-hour policy)')
          setStatus('refreshing')
          setIsLoading(true)
          await googleSheetStore.getAllCompanies() // This will trigger the initial fetch
          const fetchTime = googleSheetStore.getLastFetchTime()
          setLastFetchTime(fetchTime)
          setConnectionLastFetchTime(fetchTime)
          setStatus('connected')
        } else {
          console.log('useGoogleSheetData: Using cached data (within 24-hour window)')
          // Try to load cached data
          await googleSheetStore.getAllCompanies() // This will load from cache
          setLastFetchTime(googleSheetStore.getLastFetchTime())
          setDataSize(googleSheetStore.getDataSize())
          // Check if data has been fetched within 24 hours for connection status
          const lastFetch = googleSheetStore.getLastFetchTime()
          const now = Date.now()
          const isWithin24Hours = (now - lastFetch) < (24 * 60 * 60 * 1000)
          if (googleSheetStore.hasData() && isWithin24Hours) {
            setStatus('connected')
          } else if (googleSheetStore.hasData()) {
            setStatus('disconnected') // Has data but older than 24 hours
          } else {
            setStatus('disconnected') // No data
          }
        }
      } catch (err) {
        handleError(err)
        setStatus('disconnected')
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [handleError, shouldFetchData, setStatus, setConnectionLastFetchTime])

  return {
    getCompanySnapshot,
    searchCompanies,
    getAllCompanies,
    refreshData,
    isLoading,
    error,
    lastFetchTime,
    dataSize,
    connectionStatus: status,
  }
}
