'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { RefreshCw, CloudDownload } from 'lucide-react'
import { googleSheetStore } from '@/lib/google-sheet-store'
import { cn } from '@/lib/utils'
import { useConnectionStatusStore } from '@/lib/connection-status-store'

interface SidebarDataStatusProps {
  dataSourceLabel?: string
  version?: string
  enabled?: boolean
}

const GOOGLE_SHEET_FEED_VERSION = 'v2.0.0'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const FEATURE_SIDEBAR_DATA_STATUS = true

type ConnectionStatus = 'connected' | 'refreshing' | 'disconnected'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return '>24h ago'
}

export function SidebarDataStatus({ 
  dataSourceLabel = 'Google Sheets',
  version = GOOGLE_SHEET_FEED_VERSION,
  enabled = true 
}: SidebarDataStatusProps) {
  const [dataSize, setDataSize] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshFailed, setLastRefreshFailed] = useState(false)
  
  const { 
    status: globalStatus, 
    lastFetchTime: globalLastFetchTime,
    setStatus: setGlobalStatus, 
    isConnected,
    setLastFetchTime: setGlobalLastFetchTime
  } = useConnectionStatusStore()

  const updateStatus = useCallback(() => {
    const currentDataSize = googleSheetStore.getDataSize()
    const currentLastFetch = googleSheetStore.getLastFetchTime()
    
    setDataSize(currentDataSize)
    
    // Update global last fetch time if it's different
    if (currentLastFetch !== globalLastFetchTime) {
      setGlobalLastFetchTime(currentLastFetch)
    }
    
    let newStatus: ConnectionStatus
    if (currentDataSize === 0) {
      newStatus = 'disconnected'
    } else if (isConnected()) {
      // Connected if data has been fetched within the last 24 hours
      newStatus = 'connected'
      setLastRefreshFailed(false)
    } else {
      newStatus = 'disconnected'
    }
    
    // Only update global status if it's different
    if (newStatus !== globalStatus) {
      setGlobalStatus(newStatus)
    }
  }, [globalStatus, globalLastFetchTime, setGlobalStatus, setGlobalLastFetchTime, isConnected])

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return // Debounce
    
    setIsRefreshing(true)
    setGlobalStatus('refreshing')
    
    try {
      await googleSheetStore.refreshData()
      setLastRefreshFailed(false)
      // Update the global last fetch time after successful refresh
      setGlobalLastFetchTime(Date.now())
    } catch (error) {
      console.warn('Failed to refresh Google Sheets data:', error)
      setLastRefreshFailed(true)
    } finally {
      setIsRefreshing(false)
      updateStatus()
    }
  }, [isRefreshing, updateStatus, setGlobalStatus, setGlobalLastFetchTime])

  // Initial status check
  useEffect(() => {
    updateStatus()
  }, [updateStatus])

  // Poll for status updates every 60 seconds
  useEffect(() => {
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [updateStatus])

  if (!enabled || !FEATURE_SIDEBAR_DATA_STATUS) return null

  const statusConfig = {
    connected: {
      dot: 'bg-green-500',
      text: 'Connected',
      description: `Connected to ${dataSourceLabel}`
    },
    refreshing: {
      dot: 'bg-yellow-500',
      text: 'Refreshing...',
      description: `Refreshing ${dataSourceLabel}...`
    },
    disconnected: {
      dot: 'bg-red-500',
      text: 'Disconnected',
      description: `Disconnected from ${dataSourceLabel}`
    }
  }

  const currentStatus = statusConfig[globalStatus]

  return (
    <div className="relative group w-full max-w-[200px] mx-auto">
              <div 
          className={cn(
            "rounded-lg border transition-all duration-200 w-full",
            "bg-[#1B2231] border-[#283248]",
            "hover:border-[#283248]/80"
          )}
        >
        <div className="p-3 relative">
          {/* Content container */}
          <div className="flex-1 min-w-0 pl-2">
                                    <div className="text-base font-semibold text-white mb-2">
                          {globalStatus === 'connected' ? 'Up to Date!' : globalStatus === 'refreshing' ? 'Updating...' : 'Disconnected'}
                        </div>
            <div className="text-sm text-white/70">
              Data Source
            </div>
            
            {/* Connection status row */}
            <div className="flex items-center gap-2 mt-2" aria-live="polite">
              <div className={cn('w-2 h-2 rounded-full', currentStatus.dot)} />
              <span className={cn(
                "text-sm font-medium",
                globalStatus === 'connected' ? 'text-green-500' : 
                globalStatus === 'refreshing' ? 'text-yellow-500' : 
                'text-red-500'
              )}>
                {currentStatus.text}
              </span>
            </div>
          </div>
          
          {/* Centered refresh icon */}
          <div className="absolute top-1/2 right-3 transform -translate-y-1/2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={handleRefresh}
                  className="cursor-pointer p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
                  aria-label={`Refresh ${dataSourceLabel} data`}
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-8 w-8 animate-spin text-white/70 hover:text-white" />
                  ) : (
                    <CloudDownload className="h-8 w-8 text-white/70 hover:text-white" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh now</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Error messages */}
          {lastRefreshFailed && dataSize > 0 && (
            <div className="text-xs text-amber-400 mt-2">
              Last refresh failed; using cached data
            </div>
          )}
          {lastRefreshFailed && dataSize === 0 && (
            <div className="text-xs text-red-400 mt-2">
              <button 
                onClick={handleRefresh}
                className="underline hover:no-underline"
                disabled={isRefreshing}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
