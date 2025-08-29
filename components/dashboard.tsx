"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppShell } from "@/components/ui/app-shell"
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart"
import { AssetAllocationChart } from "@/components/charts/asset-allocation-chart"
import { HoldingsPerformanceChart } from "@/components/charts/holdings-performance-chart"
import { FileUpload } from "@/components/file-upload"
import { CompanySearch } from "@/components/company-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, X, Loader2, Building2 } from "lucide-react"
import { MAG7_STOCKS, MAG7_SYMBOLS } from "@/data/mag7-stocks"
import { logoUrlFor } from "@/lib/logo-utils"
import { TickerLogo } from "@/components/ui/ticker-logo"

import { useLiveData } from "@/hooks/use-live-data"
import { usePortfolioSelectors } from "@/hooks/use-portfolio-store"
import { HeroRow } from "@/components/hero-row"
import { EquityEngine, EquitySeriesPoint } from "@/lib/equity-engine"
import { PriceStore } from "@/lib/price-store"
import { useGoogleSheetData } from "@/hooks/use-google-sheet-data"
import { useSession } from "@/contexts/session-provider"
import { AiAnalysisPanel } from "@/components/AiAnalysisPanel"
import { ApiKeyPanel } from "@/components/ApiKeyPanel"
import { PortfolioOverview } from "@/components/portfolio-overview"
import { loggers, logger, ErrorKinds } from '@/lib/logger'
import { getPortfolioStore } from "@/lib/portfolio-store"

export function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("overview")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showSP500, setShowSP500] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [storeReady, setStoreReady] = useState(false)

  // Hydrate store from session on mount
  useEffect(() => {
    const mode = searchParams.get('mode')
    const sid = searchParams.get('sid')
    
    if (mode === 'import' && sid) {
      try {
        // Load session from storage
        const sessionKey = `import-session-${sid}`
        const sessionData = sessionStorage.getItem(sessionKey)
        
        if (sessionData) {
          const session = JSON.parse(sessionData)
          const portfolioStore = getPortfolioStore()
          portfolioStore.hydrateFromSession(session)
          setStoreReady(true)
        } else {
          console.warn('Dashboard: No session data found for sid:', sid)
          setStoreReady(true) // Still ready, just no data
        }
      } catch (error) {
        console.error('Dashboard: Error hydrating store from session:', error)
        setStoreReady(true) // Still ready, just with error
      }
    } else {
      setStoreReady(true) // Not import mode, ready immediately
    }
  }, [searchParams])

  // Dev-only diagnostic logging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const contentWrapper = document.querySelector('[data-testid="content-wrapper"]') as HTMLElement
      console.log('UI-Density:', document.documentElement.dataset.density, 'Wrapper:', contentWrapper?.dataset)
      console.log('JT | density |', {
        headerH: getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
        sidebarW: getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w'),
        cardHeaderH: getComputedStyle(document.documentElement).getPropertyValue('--card-header-h'),
        cardGap: getComputedStyle(document.documentElement).getPropertyValue('--card-gap')
      })
      
      // Add dev attribute for CSS debugging
      if (searchParams.get('dev') === '1') {
        document.documentElement.setAttribute('data-dev', '1')
      }
    }
  }, [searchParams])
  
  const handleTabChange = (tab: string) => {
    // Validate the tab parameter
    if (typeof tab !== 'string') {
      console.error('Dashboard: Invalid tab parameter:', tab)
      return
    }
    
    setActiveTab(tab)
    
    // Update URL to persist the active tab
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.replaceState({}, '', url.toString())
    } catch (error) {
      console.error('Dashboard: Error updating URL:', error)
    }
  }

  // Portfolio snapshot getter for AI analysis
  const getPortfolioSnapshot = () => {
    const portfolioValue = totalValue || 0
    
    return {
      totalValue: portfolioValue,
      totalReturnPct: allTimeReturn || 0,
      totalReturnPercent: allTimeReturn || 0, // Add missing property
      positions: positions?.map((pos: any) => ({
        ticker: pos.ticker,
        quantity: pos.shares || 0,
        marketValue: pos.marketValue || 0,
        sector: pos.sector,
        weight: portfolioValue > 0 ? ((pos.marketValue || 0) / portfolioValue) * 100 : 0
      })) || [],
      performance: equitySeries?.map((point: any) => ({
        date: new Date('ts' in point ? point.ts : point.date).toISOString().split('T')[0],
        value: point.value
      })) || []
    }
  }

  // Read tab from URL parameters
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    const modeFromUrl = searchParams.get('mode')
    const sidFromUrl = searchParams.get('sid')
    
    if (tabFromUrl && ['overview', 'upload', 'search', 'ai-analysis'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, router])

  // Reset search state when component mounts
  useEffect(() => {
    setSearchQuery("")
    setSearchLoading(false)
  }, [])
  
  // Use the live data hook for real-time metrics
  const {
    metrics: liveMetrics,
    status: liveStatus,
    isLoading,
    error,
    positions,
    transactions,
    dataSource,
    mode
  } = useLiveData({
    includeBenchmarks: true,
    benchmarkTickers: ['SPY'],
    baseCurrency: 'USD',
    maxPositionWeight: 20
  })

  // Instrumentation logging
  useEffect(() => {
    if (activeTab === 'overview') {
      const sid = searchParams.get('sid')
      const asOf = liveMetrics.valuationDate || new Date().toISOString().split('T')[0]
      console.log('[OV:boot]', { 
        mode, 
        sid, 
        asOf, 
        positions: positions?.length || 0,
        dataSource: dataSource
      })
      
      console.log('[OV:series]', { 
        equityLen: liveMetrics.equitySeries?.length || 0, 
        returnLen: liveMetrics.returnSeries?.length || 0, 
        source: dataSource 
      })
      
      // Reconciliation check: hero total vs equity series last value
      const heroTotal = liveMetrics.totalValue || 0
      const seriesLast = liveMetrics.equitySeries?.length > 0 ? liveMetrics.equitySeries[liveMetrics.equitySeries.length - 1]?.value || 0 : 0
      const diff = +(heroTotal - seriesLast).toFixed(2)
      console.log('[OV:recon]', { heroTotal, seriesLast, diff })
      
      // Asset allocation check
      const weightsSum = liveMetrics.assetAllocation?.reduce((sum, item) => sum + (item.weight || 0), 0) || 0
      const top5 = liveMetrics.assetAllocation?.slice(0, 5).map(item => ({ ticker: item.ticker, weight: item.weight })) || []
      console.log('[OV:alloc]', { total: heroTotal, buckets: top5, sum: weightsSum })
      
      // Holdings performance check
      const missingPrices = liveMetrics.holdingsPerformance?.filter(item => !item.marketValue || item.marketValue === 0).length || 0
      const missingBasis = liveMetrics.holdingsPerformance?.filter(item => !item.costBasis || item.costBasis === 0).length || 0
      console.log('[OV:holdings]', { 
        n: liveMetrics.holdingsPerformance?.length || 0, 
        missingPrices, 
        missingBasis 
      })
    }
  }, [activeTab, mode, searchParams, liveMetrics, positions, dataSource])

  // Extract metrics for backward compatibility
  const {
    totalValue,
    ytdReturn,
    allTimeReturn,
    currentHoldingsCount,
    lastUpdated,
    equitySeries,
    returnSeries,
    assetAllocation,
    holdingsPerformance,
    status: equityStatus,
    valuationDate,
    currency,
    warnings
  } = liveMetrics || {}

  // Extract phase information for UI optimization
  const {
    isPhaseBComplete,
    hasStubData
  } = useLiveData() || {}

  // Get session data for trades
  const { session } = useSession()

  // Dashboard boot logging
  loggers.DASH('boot', {
    mode: mode || 'default',
    sid: session?.sid || 'none',
    asOf: new Date().toISOString().split('T')[0]
  })
  
  // Hero metrics logging
  useEffect(() => {
    if (totalValue > 0) {
      loggers.HERO('metrics', {
        value: Math.round(totalValue * 100) / 100,
        ytd: Math.round(ytdReturn * 100) / 100,
        allTime: Math.round(allTimeReturn * 100) / 100,
        holdings: currentHoldingsCount,
        asOf: lastUpdated
      })
    }
  }, [totalValue, ytdReturn, allTimeReturn, currentHoldingsCount, lastUpdated])

  // Use EquityEngine data from live data (import mode only)
  const finalEquityEngineSeries = equitySeries
  const finalEquityEngineStatus = equityStatus

  // Search handlers
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    try {
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Preserve import session parameters if they exist
      const currentUrl = new URL(window.location.href)
      const mode = currentUrl.searchParams.get('mode')
      const sid = currentUrl.searchParams.get('sid')
      
      let targetUrl = `/company/${searchQuery.toUpperCase()}`
      if (mode === 'import' && sid) {
        targetUrl += `?mode=${mode}&sid=${sid}`
      }
      
      // Navigate to company page using Next.js router
      router.push(targetUrl)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const { getAllCompanies } = useGoogleSheetData()
  const [mag7Companies, setMag7Companies] = useState<Array<{
    ticker: string
    price: number
    companyName: string
    marketCap: number
    peRatio: number
    sharesOutstanding: number
  }>>([])

  // Fetch MAG7 companies from Google Sheet
  useEffect(() => {
    const fetchMag7Companies = async () => {
      try {
        const allCompanies = await getAllCompanies()
        const mag7 = allCompanies.filter(company => 
          ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'].includes(company.ticker)
        )
        setMag7Companies(mag7)
      } catch (error) {
        console.error('Error fetching MAG7 companies:', error)
        // Fallback to hardcoded data
        setMag7Companies([])
      }
    }

    fetchMag7Companies()
  }, [getAllCompanies])

  const handleMAG7Select = (symbol: string) => {
    // Preserve import session parameters if they exist
    const currentUrl = new URL(window.location.href)
    const mode = currentUrl.searchParams.get('mode')
    const sid = currentUrl.searchParams.get('sid')
    
    let targetUrl = `/company/${symbol}`
    if (mode === 'import' && sid) {
      targetUrl += `?mode=${mode}&sid=${sid}`
    }
    
    router.push(targetUrl)
  }

  // Debug logging
  console.log('Dashboard state:', {
    mode,
    activePortfolioId: dataSource === 'session' ? 'Import Session' : 'Portfolio Store',
    equitySeriesCount: equitySeries?.length || 0,
    returnSeriesCount: returnSeries?.length || 0,
    positionsCount: positions?.length || 0,
    equitySeriesLength: equitySeries?.length || 0
  })

  // Calculate current holdings count from the same data source
  const calculateCurrentHoldingsCount = (): number => {
    console.log('=== CURRENT HOLDINGS COUNT DEBUG ===')
    console.log('1. Available data sources:', {
      hasPositions: !!positions,
      positionsLength: positions?.length,
      hasHoldingsPerformance: !!holdingsPerformance,
      holdingsPerformanceLength: holdingsPerformance?.length,
      hasLiveMetrics: !!liveMetrics,
      liveMetricsKeys: liveMetrics ? Object.keys(liveMetrics) : []
    })
    
    // Primary source: positions array (most reliable)
    if (positions && positions.length > 0) {
      console.log('2. Using positions array:', {
        length: positions.length,
        samplePosition: positions[0],
        allPositions: positions.map((p: any) => ({
          ticker: p.ticker,
          quantity: p.quantity,
          shares: (p as any).shares,
          marketValue: p.marketValue
        }))
      })
      
      const activePositions = positions.filter((pos: any) => {
        const hasQuantity = pos.quantity > 0
        const hasShares = (pos as any).shares > 0
        const validTicker = pos.ticker && pos.ticker !== 'CASH' && pos.ticker !== 'USD'
        const isValid = (hasQuantity || hasShares) && validTicker
        
        console.log(`3. Position ${pos.ticker}:`, {
          quantity: pos.quantity,
          shares: (pos as any).shares,
          validTicker,
          hasQuantity,
          hasShares,
          isValid
        })
        
        return isValid
      })
      
      console.log('4. Positions array result:', {
        totalPositions: positions.length,
        activePositions: activePositions.length,
        tickers: activePositions.map((p: any) => p.ticker)
      })
      
      return activePositions.length
    }
    
    console.log('5. No positions array found, checking holdingsPerformance')
    
    // Fallback to holdingsPerformance
    if (holdingsPerformance && holdingsPerformance.length > 0) {
      console.log('6. Using holdingsPerformance:', {
        length: holdingsPerformance.length,
        samplePosition: holdingsPerformance[0],
        allPositions: holdingsPerformance.map((p: any) => ({
          ticker: p.ticker,
          marketValue: p.marketValue,
          totalReturn: p.totalReturn || 0
        }))
      })
      
      // Count distinct tickers with non-zero market value
      const uniqueTickers = new Set<string>()
      
      holdingsPerformance.forEach(pos => {
        if (pos.ticker && pos.ticker !== 'CASH' && pos.ticker !== 'USD') {
          // Check if this position has a non-zero market value
          const marketValue = pos.marketValue || 0
          if (marketValue > 0) {
            uniqueTickers.add(pos.ticker)
            console.log(`7. Added ${pos.ticker} to holdings count (marketValue: ${marketValue})`)
          } else {
            console.log(`7. Skipped ${pos.ticker} (marketValue: ${marketValue})`)
          }
        }
      })
      
      console.log('8. HoldingsPerformance result:', {
        totalPositions: holdingsPerformance.length,
        uniqueTickersWithValue: uniqueTickers.size,
        tickers: Array.from(uniqueTickers)
      })
      
      return uniqueTickers.size
    }
    
    // Fallback to a reasonable default
    const fallbackCount = 0
    console.log('9. Using fallback holdings count:', fallbackCount)
    console.log('=== END CURRENT HOLDINGS COUNT DEBUG ===')
    return fallbackCount
  }

  // Calculate current holdings count
  const calculatedHoldingsCount = calculateCurrentHoldingsCount()

  // DEBUG: Log the current portfolio metrics specifically
  console.log('Dashboard: Current portfolio metrics:', {
    totalValue: totalValue,
    ytdReturn: ytdReturn,
    totalGain: allTimeReturn,
    totalGainPercent: allTimeReturn,
    positionsCount: positions?.length,
    lastUpdated: lastUpdated
  })

  // Verify consistency between dashboard metrics and chart data
  const chartLastValue = equitySeries.at(-1)?.value || 0
  const cardTotalValue = totalValue || 0  
  const isConsistent = Math.abs(chartLastValue - cardTotalValue) < 0.01
  const diff = +(cardTotalValue - chartLastValue).toFixed(2)
  
  // Log compact consistency check
  loggers.DASH('recon', {
    heroTotal: Math.round(cardTotalValue * 100) / 100,
    seriesLast: Math.round(chartLastValue * 100) / 100,
    diff,
    ok: isConsistent
  })
  
  // Debug check for equity series mismatch
  if (Math.abs(cardTotalValue - chartLastValue) > 0.01) {
    console.warn("Equity series mismatch – needs rebuild", {
      heroTotal: cardTotalValue,
      seriesLast: chartLastValue,
      diff,
      equitySeriesLength: equitySeries.length,
      mode: searchParams.get('mode')
    })
  }

  // Use metrics from the live data source
  const currentPortfolioMetrics = useMemo(() => {
    return {
      totalValue: totalValue || 0,
      ytdReturn: ytdReturn || 0,
      lastUpdated: lastUpdated || new Date().toISOString(),
      baselineDate: '' // Will be set by canonical YTD function
    }
  }, [totalValue, ytdReturn, lastUpdated])

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("ui.sidebar")
    if (savedState) {
      setIsSidebarOpen(savedState === "open")
    }
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("ui.sidebar", isSidebarOpen ? "open" : "closed")
  }, [isSidebarOpen])

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        console.log('Dashboard: Rendering overview tab with data:', {
          mode,
          totalValue: totalValue,
          positionsCount: positions?.length,
          equitySeriesLength: equitySeries?.length
        })
        
        return (
          <div className="page-container pt-12 pb-4 space-y-[var(--section-gap)] bg-[var(--bg-app)] w-full">
            {/* Session Error Banner */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Hero Row */}
            <HeroRow 
              userName="Guest"
              portfolioMetrics={currentPortfolioMetrics}
              equityEngineSeries={finalEquityEngineSeries}
              currentHoldingsCount={calculatedHoldingsCount}
              liveDataStatus={liveStatus}
            />

            {/* Portfolio Performance and Asset Allocation Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--card-gap)] items-stretch auto-rows-[1fr] min-w-0">
              {/* Portfolio Performance Chart */}
              <Card className="min-w-0 h-full flex flex-col bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl">
                <CardHeader style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '28px', paddingRight: '16px' }}>
                  <div className="flex flex-col">
                    <CardTitle>Portfolio Performance</CardTitle>
                    <CardDescription>Your portfolio value and returns over time</CardDescription>
                  </div>
                  
                  <div className="inline-flex bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-0.5">
                    <button
                      onClick={() => setShowSP500(false)}
                      className={`flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 h-8 ${
                        !showSP500
                          ? "bg-[var(--accent)] text-white shadow-lg"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-app)]"
                      }`}
                    >
                      Portfolio Value
                    </button>
                    <button
                      onClick={() => setShowSP500(true)}
                      className={`flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 h-8 ${
                        showSP500
                          ? "bg-[var(--accent)] text-white shadow-lg"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-app)]"
                      }`}
                    >
                      Return
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="px-[var(--card-x)] pb-[var(--card-y)] pt-2 flex-1 min-h-[420px] min-w-0">
                  <div className="h-full min-w-0 isolation-isolate">
                    {(() => {
                      // Portfolio Performance Chart data logging
                      loggers.PPCH('data', {
                        points: equitySeries.length,
                        viewMode: showSP500 ? 'return' : 'value',
                        start: equitySeries[0]?.date || 'unknown',
                        end: equitySeries[equitySeries.length - 1]?.date || 'unknown'
                      })
                      
                      const chartData = (() => {
                        try {
                          // In import mode, use session data directly
                          let sourceSeries = equitySeries || []
                          
                          if (mode === 'import' && dataSource === 'session') {
                            // Use session equity series directly - this should be the real imported data
                            sourceSeries = equitySeries || []
                            // Using session equity series
                          }
                          
                          // Convert equitySeries (EquitySeriesPoint[]) to PerformanceData[] format
                          const convertedData = sourceSeries.map((point: any) => {
                            // Handle both date and ts formats
                            const date = 'date' in point ? point.date : new Date(point.ts).toISOString().split('T')[0]
                            const value = 'value' in point ? point.value : (point as any).value
                            
                            // Calculate return and cumulative return
                            const returnValue = 0 // Will be calculated by chart component
                            const cumulativeReturn = 'cumulativeReturn' in point ? (point.cumulativeReturn || 0) : 0
                            
                            return {
                              date,
                              value: value || 0,
                              return: returnValue,
                              cumulativeReturn: cumulativeReturn
                            }
                          })
                          
                          // In import mode, we should always have real series data from the session
                          if (convertedData.length === 0 && mode === 'import') {
                            logger.error('PPCH', 'error', { 
                              kind: ErrorKinds.NO_EQUITY_SERIES,
                              msg: 'No equity series data in import mode'
                            })
                          }
                          
                          return convertedData
                        } catch (error) {
                          logger.error('PPCH', 'error', { 
                            kind: ErrorKinds.OPERATION_FAILED,
                            operation: 'convertChartData',
                            msg: error instanceof Error ? error.message : 'Unknown error'
                          })
                          return []
                        }
                      })()

                      return (
                        <PortfolioPerformanceChart 
                          data={chartData}
                          loading={isLoading}
                          showSP500={showSP500}
                          viewMode={showSP500 ? 'return' : 'value'}
                          status={liveMetrics?.status}
                          trades={mode === 'import' ? session?.trades : undefined}
                        />
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Asset Allocation Chart */}
              <Card className="min-w-0 h-full flex flex-col bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl">
                <CardHeader style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '28px', paddingRight: '16px' }}>
                  <div className="flex flex-col">
                    <CardTitle>Asset Allocation</CardTitle>
                    <CardDescription>Breakdown of your portfolio by individual holdings</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-[var(--card-x)] pb-[var(--card-y)] pt-2 flex-1 min-h-[420px] min-w-0">
                  <div className="h-full min-w-0 isolation-isolate">
                    <AssetAllocationChart 
                      data={assetAllocation} 
                      loading={isLoading} 
                    />

                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Holdings Performance Chart */}
            <Card className="min-w-0 bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl">
                <CardHeader style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '28px', paddingRight: '16px' }}>
                  <div className="flex flex-col">
                    <CardTitle>Holdings Performance</CardTitle>
                    <CardDescription>Return % based on current price vs average share price</CardDescription>
                  </div>
                </CardHeader>
              <CardContent className="p-3">

                {/* Holdings Performance Chart - GS-only implementation */}
                <HoldingsPerformanceChart 
                  transactions={transactions || []}
                  positions={positions}
                  loading={isLoading} 
                />
              </CardContent>
            </Card>
          </div>
        )

      case "upload":
        return (
          <div className="page-container pt-12 pb-4 bg-[var(--bg-app)]" style={{ paddingTop: 'calc(50vh - 450px)' }}>
            <FileUpload 
              onImportComplete={(result) => {
                console.log('Dashboard: Import completed, switching to overview')
                setActiveTab("overview")
              }} 
              onViewPortfolio={() => setActiveTab("overview")}
            />
          </div>
        )

      case "search":
        return (
          <div className="pt-12 pb-4 space-y-4 bg-[var(--bg-app)]">
            {/* Search Bar in Middle */}
            <div className="flex justify-center items-center min-h-[200px]">
                                <div className="relative w-full max-w-4xl" role="search" aria-label="Company search">
                <div className="relative h-20 bg-[var(--bg-card)] rounded-full border border-[var(--border-subtle)] overflow-hidden transition-all duration-200 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                
                  <div className="relative z-10 flex h-full">
                    <div className="flex-1 flex items-center px-10">
                      <Search className="h-8 w-8 text-[var(--text-muted)] mr-6 flex-shrink-0" />
                      
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSearch()
                          }
                        }}
                        placeholder="Enter a ticker symbol..."
                        className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 h-full text-xl font-medium placeholder:text-[var(--text-muted)] appearance-none"
                        aria-label="Search for company ticker symbols"
                      />
                      
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="ml-4 p-2 hover:bg-[var(--bg-app)] rounded-full transition-colors"
                          aria-label="Clear search"
                        >
                          <X className="h-5 w-5 text-[var(--text-muted)]" />
                        </button>
                      )}
                    </div>
                    
                    <div className="w-32 flex-shrink-0">
                      <Button 
                        onClick={handleSearch}
                        disabled={searchLoading}
                        className="w-full h-full bg-[var(--accent)] text-white font-medium text-lg transition-colors border-0 rounded-none appearance-none"
                        aria-label="Search for company"
                      >
                        {searchLoading ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          "Search"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MAG7 Quick Access Card */}
            <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl">
              <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
                <CardTitle className="text-2xl font-bold text-[var(--text-primary)]">
                  Quick Access - MAG7 Stocks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-3 justify-center">
                  {(mag7Companies.length > 0 ? mag7Companies : MAG7_SYMBOLS.map(symbol => ({ ticker: symbol, companyName: MAG7_STOCKS[symbol]?.name || symbol }))).map((company) => {
                    const symbol = 'ticker' in company ? company.ticker : company
                    const name = 'companyName' in company ? company.companyName : MAG7_STOCKS[symbol]?.name || symbol
                    return (
                      <button
                        key={symbol}
                        onClick={() => handleMAG7Select(symbol)}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left min-w-0 flex-shrink-0"
                      >
                        <TickerLogo 
                          ticker={symbol} 
                          size={24} 
                          rounded={true}
                          decorative={true}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{symbol}</div>
                          <div className="text-xs text-muted-foreground truncate">{name}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "ai-analysis":
        return (
          <div className="page-container pt-12 pb-4 bg-[var(--bg-app)] space-y-[var(--section-gap)]">
            {/* About AI Analysis Card */}
            <div className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">About AI Analysis</h2>
              <div className="text-sm text-[var(--text-muted)] space-y-2">
                <p>• AI-powered insights are generated based on your unique portfolio data.</p>
                <p>• Personal data and text-generated outputs are never stored.</p>
                <p>• Analysis incorporate stock-specific risks, macroeconomic & geopolitical risks, valuation & predictability risks, and much more.</p>
                <p>• Give it a shot and let us know what you think!</p>
              </div>
            </div>
            
            {/* API Key Setup Card */}
            <ApiKeyPanel />
            
            {/* AI Analysis Panel */}
            <AiAnalysisPanel getPortfolioSnapshot={getPortfolioSnapshot} />
          </div>
        )

      default:
        return (
          <div className="page-container pt-12 pb-4 bg-[var(--bg-app)]">
            <div className="text-[var(--text-muted)]">Select a tab to get started</div>
          </div>
        )
    }
  }

  // Dev-only layout probe
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_MODE === '1' || searchParams.get('dev') === '1') {
      const updateLayoutProbe = () => {
        const probeElement = document.getElementById('layout-probe')
        if (probeElement) {
          probeElement.textContent = `${window.innerWidth}×${window.innerHeight}`
        }
      }
      
      updateLayoutProbe()
      window.addEventListener('resize', updateLayoutProbe)
      
      return () => window.removeEventListener('resize', updateLayoutProbe)
    }
  }, [searchParams])

  // Show loading state if store is not ready
  if (!storeReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Bringing data online...</p>
        </div>
      </div>
    )
  }

  return (
    <AppShell 
      isOpen={isSidebarOpen}
      onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="bg-[var(--bg-app)]">
        {renderContent()}
      </div>
      
      {/* Dev-only layout probe */}
      {process.env.NEXT_PUBLIC_DEV_MODE === '1' || searchParams.get('dev') === '1' ? (
        <div className="fixed bottom-4 right-4 text-xs bg-black/60 text-white px-2 py-1 rounded z-50">
          <span id="layout-probe" />
        </div>
      ) : null}
    </AppShell>
  )
}
