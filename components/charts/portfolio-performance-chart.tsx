"use client"

import { useState, useEffect, useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ReferenceLine } from "recharts"
import type { PerformanceData } from "@/types/portfolio"
import { format, addDays, addMonths, addQuarters, addYears } from "date-fns"
import { getPriceStore } from "@/lib/price-store"
import { NormalizedTransaction } from "@/types/portfolio"

interface PortfolioPerformanceChartProps {
  data: PerformanceData[]
  loading?: boolean
  showSP500?: boolean
  viewMode?: 'value' | 'return'  // NEW: explicit viewMode prop
  status?: {
    valuedThrough: string
    bridgedTickers: string[]
    missingPrices: string[]
    spotValuedTickers?: string[]
  }
  trades?: NormalizedTransaction[]
}

interface ChartDataPoint {
  date: string
  value: number
  return: number
  cumulativeReturn: number
  // NEW: Add SPY benchmark fields
  spyValue?: number
  spyReturn?: number
  // NEW: Add rebased return fields for Return mode
  portfolioReturnRebased?: number
  spyReturnRebased?: number
}

interface SPYBenchmarkResult {
  spyShares: number
  spyValue: number
  spyReturn: number
}

export function PortfolioPerformanceChart({ data, loading, showSP500 = false, viewMode: propViewMode, status, trades }: PortfolioPerformanceChartProps) {
  const [priceStore, setPriceStore] = useState<any>(null)
  const [priceStoreLoading, setPriceStoreLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1M')
  const [error, setError] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)

  // Initialize PriceStore
  useEffect(() => {
    const initPriceStore = async () => {
      try {
        const store = await getPriceStore()
        setPriceStore(store)
      } catch (error) {
        console.error('Failed to initialize PriceStore:', error)
        setError('Failed to load price data')
      } finally {
        setPriceStoreLoading(false)
      }
    }
    initPriceStore()
  }, [])

  // Add CSS to remove focus indicators from chart elements
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .recharts-wrapper:focus,
      .recharts-wrapper *:focus {
        outline: none !important;
        box-shadow: none !important;
      }
      .recharts-active-dot:focus,
      .recharts-dot:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // NEW: Interactive legend state for Return mode
  const [showPortfolioLine, setShowPortfolioLine] = useState(true)
  const [showSpyLine, setShowSpyLine] = useState(true)

  // NEW: Use explicit viewMode prop with fallback to legacy showSP500
  const viewMode: 'value' | 'return' = 
    (typeof propViewMode === 'string' 
      ? propViewMode 
      : (showSP500 ? 'return' : 'value'))

  // Dev assert once on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Chart] mode check', { 
        passedViewMode: propViewMode, 
        showSP500, 
        resolvedViewMode: viewMode 
      })
      if (propViewMode === undefined) {
        console.warn('[Chart] No viewMode prop provided. Falling back to legacy showSP500 mapping. Ensure parent sets viewMode="return" when Return is clicked.')
      }
    }
  }, [propViewMode, showSP500, viewMode])

  // NEW: Legend toggle handlers with dev logging
  const handleTogglePortfolio = () => {
    const newState = !showPortfolioLine
    setShowPortfolioLine(newState)
    
    // Dev diagnostics: Log legend toggle
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Legend: Portfolio series ${newState ? 'shown' : 'hidden'}`)
    }
  }

  const handleToggleSpy = () => {
    const newState = !showSpyLine
    setShowSpyLine(newState)
    
    // Dev diagnostics: Log legend toggle
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Legend: S&P 500 series ${newState ? 'shown' : 'hidden'}`)
    }
  }



  // NEW: Helper function to get start date for period
  const getStartDate = (today: Date): Date => {
    switch (selectedPeriod) {
      case '1M':
        return addMonths(today, -1)
      case '3M':
        return addMonths(today, -3)
      case '6M':
        return addMonths(today, -6)
      case '1Y':
        return addYears(today, -1)
      case '2Y':
        return addYears(today, -2)
      case '5Y':
        return addYears(today, -5)
      default:
        return addMonths(today, -1)
    }
  }

  // NEW: Helper function to filter data by period
  const filterDataByPeriod = (data: ChartDataPoint[], period: string): ChartDataPoint[] => {
    if (!data || data.length === 0) return []

    const today = new Date()
    const firstDataDate = new Date(data[0].date)
    const lastDataDate = new Date(data[data.length - 1].date)
    
    let startDate: Date
    
    if (period === 'All') {
      startDate = firstDataDate
    } else {
      // Calculate period start date
      const periodStartDate = getStartDate(today)
      
      // Don't show dates before we have data
      if (periodStartDate < firstDataDate) {
        startDate = firstDataDate
      } else {
        startDate = periodStartDate
      }
    }
    
    return data.filter(point => new Date(point.date) >= startDate)
  }

  // NEW: Helper function for robust SPY data lookup with fallback
  function getSpyClosesWithFallback(start: string, end: string) {
    // Try SPY first
    let symbol = 'SPY'
    let closes = priceStore.getDailyCloses(symbol, start, end) || []
    if (!Array.isArray(closes)) closes = []

    // Fallback to SPY.US if needed
    if (closes.length === 0) {
      const altSymbol = 'SPY.US'
      const altCloses = priceStore.getDailyCloses(altSymbol, start, end) || []
      if (Array.isArray(altCloses) && altCloses.length > 0) {
        symbol = altSymbol
        closes = altCloses
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[SPY closes] chosenSymbol:', symbol, 'count:', closes.length, {
        hasSPY: priceStore.hasTicker('SPY'),
        hasSPYUS: priceStore.hasTicker('SPY.US'),
        sample: closes.slice(0, 3)
      })
    }

    return { symbol, closes }
  }

  // NEW: SPY Benchmark calculation helper
  function calculateSPYBenchmark(
    trades: NormalizedTransaction[],
    portfolioData: PerformanceData[],
    selectedPeriod: string,
    priceStoreInstance: any
  ): { spyData: ChartDataPoint[], spyStatus: string } {
    
    // A) Minimal logs in calculateSPYBenchmark (top-level facts)
    console.debug('[SPY] calc start', {
      tradesLen: trades?.length,
      portfolioLen: portfolioData?.length,
      period: selectedPeriod
    })

    // Early return if no data
    if (!trades || trades.length === 0) {
      console.warn('[SPY] SPY benchmark skipped: no user trades provided.')
      return { spyData: [], spyStatus: "SPY benchmark skipped: no user trades provided." }
    }

    if (!portfolioData || portfolioData.length === 0) {
      console.debug('[SPY] early return - missing portfolio data')
      return { spyData: [], spyStatus: "No portfolio data available to build SPY benchmark" }
    }

    // B) Log sample trade data for diagnostics
    console.debug('[SPY] sample trades:', {
      firstTrade: trades[0],
      lastTrade: trades[trades.length - 1],
      tradeTypes: [...new Set(trades.map(t => t.type))],
      uniqueTickers: [...new Set(trades.map(t => t.normalizedTicker))].slice(0, 5)
    })

          // C) Check SPY data availability with detailed logging
      const spyClosesSample = priceStoreInstance.getDailyCloses('SPY', '2024-01-01', '2024-01-10')
      console.log('[SPY] SPY data availability:', {
        hasSPY: priceStoreInstance.hasTicker('SPY'),
        hasSPYUS: priceStoreInstance.hasTicker('SPY.US'),
        spyClosesSample: spyClosesSample?.slice(0, 3),
        spyClosesCount: spyClosesSample?.length || 0
      })

    try {
      // Get date range from portfolio data
      const firstDate = portfolioData[0].date
      const lastDate = portfolioData[portfolioData.length - 1].date
      
      // SPY bring-up checklist and diagnostics
      console.log('[SPY] SPY-series bring-up checklist:')
      
      // 1. Source check - ensure SPY has data
      const spyDateRange = priceStoreInstance.getDailyCloses('SPY', '2025-01-01', '2025-01-10')
      console.log('[SPY] 1. Source check - SPY 2025 data:', {
        hasData: spyDateRange.length > 0,
        sampleCloses: spyDateRange.slice(0, 3)
      })
      
      // 2. Initialization check
      console.log('[SPY] 2. Initialization check - PriceStore ready:', {
        isInitialized: !!priceStoreInstance,
        hasSpy: priceStoreInstance.hasTicker('SPY'),
        hasSpyUS: priceStoreInstance.hasTicker('SPY.US')
      })
      
      // Replace the SPY close fetch with a fallback + count
      const getSpyClosesWithFallback = (start: string, end: string) => {
        let symbol = 'SPY'
        let closes = priceStoreInstance.getDailyCloses(symbol, start, end) || []
        if (!Array.isArray(closes)) closes = []
        if (closes.length === 0) {
          const alt = 'SPY.US'
          const altCloses = priceStoreInstance.getDailyCloses(alt, start, end) || []
          if (Array.isArray(altCloses) && altCloses.length > 0) {
            symbol = alt
            closes = altCloses
          }
        }
        
        // 3. Window check
        console.log('[SPY] 3. Window check:', {
          requestedStart: start,
          requestedEnd: end,
          actualCloses: closes.length,
          firstClose: closes[0]?.date,
          lastClose: closes[closes.length - 1]?.date
        })
        
        return { symbol, closes }
      }
      
      const { symbol: spySymbolUsed, closes: spyCloses } = getSpyClosesWithFallback(firstDate, lastDate)
      
      // Log SPY closes loading details
      console.log('[SPY] SPY closes loaded:', {
        dateRangeRequested: `${firstDate} to ${lastDate}`,
        closesReturned: spyCloses.length,
        symbolUsed: spySymbolUsed,
        firstClose: spyCloses[0] ? { date: spyCloses[0].date, close: spyCloses[0].close } : null,
        lastClose: spyCloses[spyCloses.length - 1] ? { date: spyCloses[spyCloses.length - 1].date, close: spyCloses[spyCloses.length - 1].close } : null
      })
      
      if (spyCloses.length === 0) {
        console.warn('[SPY] E001: SPY has no closes in requested window')
        const ret: any = { spyData: [], spyStatus: "E001: SPY data unavailable for this period" }
        ret._symbolUsed = spySymbolUsed
        ret._spyClosesCount = 0
        return ret
      }

      // Create a map of SPY closes by date for quick lookup
      const spyCloseMap = new Map<string, number>()
      spyCloses.forEach((close: { date: string; close: number }) => {
        spyCloseMap.set(close.date, close.close)
      })

      // Sort trades by date
      const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      // B) Confirm trades actually create cashflows (this is the most common failure)
      let missingPrice = 0
      let zeroCashTrades = 0
      let totalCashAbs = 0

      // Calculate SPY shares timeline
      let spyShares = 0
      const spySharesTimeline: { date: string; shares: number }[] = []
      let backfillCount = 0

      for (const trade of sortedTrades) {
        // Get SPY close for trade date (with backfill/forward-fill)
        let spyClose = spyCloseMap.get(trade.date)
        
        if (spyClose === undefined) {
          // Backfill: find the most recent SPY close on or before trade date
          const availableCloses = Array.from(spyCloseMap.entries())
            .filter(([date]) => date <= trade.date)
            .sort(([a], [b]) => b.localeCompare(a)) // Sort descending
          
          if (availableCloses.length > 0) {
            spyClose = availableCloses[0][1]
            backfillCount++
          } else {
            // No SPY data available for this trade date - skip this trade
            console.warn(`[SPY] No SPY close available for trade date ${trade.date} - skipping trade`)
            continue
          }
        }

        // Calculate cashflow
        const notional = (trade.quantity ?? 0) * (trade.price ?? 0)
        const fees = trade.fees ?? 0
        // If your schema has a cash field like trade.cashImpact or trade.grossAmount, prefer that:
        const cashImpact = (trade as any).cashImpact ?? (trade as any).grossAmount ?? notional
        const cashflow = trade.type === 'BUY' ? -(cashImpact + fees) : (cashImpact - fees)
        
        // Inside the loop, right after you compute cashflow
        if (!trade.price && trade.price !== 0) missingPrice++
        if (cashflow === 0) zeroCashTrades++
        totalCashAbs += Math.abs(cashflow)

        // Update SPY shares
        const previousShares = spyShares
        if (trade.type === 'BUY') {
          spyShares += Math.abs(cashflow) / spyClose
        } else if (trade.type === 'SELL') {
          const sharesToSell = Math.min(Math.abs(cashflow) / spyClose, spyShares)
          spyShares -= sharesToSell
          if (sharesToSell < Math.abs(cashflow) / spyClose) {
            console.warn(`[SPY] SELL trade ${trade.date} attempted to sell more shares than available`)
          }
        }

        // Log synthetic SPY position step
        console.log(`[SPY] Synthetic position step: ${trade.date} - ${trade.type} $${Math.abs(cashflow).toFixed(2)} @ $${spyClose.toFixed(2)} = ${(Math.abs(cashflow) / spyClose).toFixed(6)} shares → ${spyShares.toFixed(6)} total`)



        // Record shares timeline
        spySharesTimeline.push({
          date: trade.date,
          shares: spyShares
        })
      }

      // Calculate SPY benchmark values for each portfolio date with proper backfill
      const spyData: ChartDataPoint[] = []
      let lastKnownSpyShares = 0

      for (const portfolioPoint of portfolioData) {
        const date = portfolioPoint.date
        
        // Get SPY shares for this date (use monotonic lookup)
        let currentSpyShares = lastKnownSpyShares
        const tradeDates = Array.from(spySharesTimeline.map(s => s.date)).sort()
        for (const tradeDate of tradeDates) {
          if (tradeDate <= date) {
            currentSpyShares = spySharesTimeline.find(s => s.date === tradeDate)?.shares || 0
          } else {
            break
          }
        }
        lastKnownSpyShares = currentSpyShares

        // Find SPY close for this date (backfill: use last known close on or before date)
        let spyClose = spyCloseMap.get(date)
        
        if (!spyClose || spyClose <= 0) {
          // Backfill: find the last known close on or before this date
          const availableCloses = Array.from(spyCloseMap.entries())
            .filter(([closeDate, close]) => closeDate <= date && close > 0)
            .sort(([a], [b]) => b.localeCompare(a)) // Sort descending to get latest
          
          if (availableCloses.length > 0) {
            spyClose = availableCloses[0][1]
          } else {
            // No SPY data available for this date - stop SPY valuation
            console.debug(`[SPY] SPY valuation stopped at ${date} - no data available`)
            break
          }
        }

        const spyValue = currentSpyShares * spyClose
        
        // Only add SPY data point if we have a valid SPY value (hide zero-value tails)
        if (spyValue > 0) {
          spyData.push({
            ...portfolioPoint,
            spyValue,
            spyReturn: 0 // Will be calculated after rebasing
          })
        } else {
          // Skip this date for SPY - don't add a zero point
          console.debug(`[SPY] Skipping ${date} - no valid SPY value (shares: ${currentSpyShares}, close: ${spyClose})`)
        }
      }

      // Calculate rebased returns for the selected period
      const periodData = filterDataByPeriod(spyData, selectedPeriod)
      
      // C) Log base computation (why series may be empty)
      console.debug('[SPY] bases precheck', {
        periodDataLen: periodData.length,
        firstPeriodPoint: periodData[0],
      })
      
      if (periodData.length === 0) {
        return { spyData: [], spyStatus: "No data available for selected period" }
      }

      // Find base values for rebasing (first non-zero values in the period)
      const basePortfolioValue = periodData.find(point => point.value > 0)?.value || 0
      const baseSpyValue = periodData.find(point => point.spyValue && point.spyValue > 0)?.spyValue || 0

      // Just before returning the success case
      console.debug('[SPY] bases', { basePortfolioValue, baseSpyValue })

      // 4. Rebase base check
      console.log('[SPY] 4. Rebase base check:', {
        basePortfolioValue,
        baseSpyValue,
        hasValidBase: basePortfolioValue > 0 && baseSpyValue > 0
      })
      
      if (basePortfolioValue <= 0) {
        console.warn('[SPY] E003: Rebase base missing (portfolio) in selected period')
        return { spyData: [], spyStatus: "E003: SPY benchmark skipped: missing portfolio base in window" }
      }

      if (baseSpyValue <= 0) {
        console.warn('[SPY] E003: Rebase base missing (SPY) in selected period')
        return { spyData: [], spyStatus: "E003: SPY benchmark skipped: missing SPY base in window" }
      }

      // Calculate rebased returns
      const rebasedData: ChartDataPoint[] = periodData.map(point => ({
        ...point,
        portfolioReturnRebased: basePortfolioValue > 0 ? ((point.value / basePortfolioValue) - 1) * 100 : 0,
        spyReturnRebased: baseSpyValue > 0 ? (((point.spyValue || 0) / baseSpyValue) - 1) * 100 : 0
      }))

      // Compose status message
      let statusMessage = ""
      if (backfillCount > 0) {
        statusMessage = `SPY: ${backfillCount} backfilled closes`
      }

      // Also attach quick diags to the return
      const result: any = { spyData: rebasedData, spyStatus: statusMessage }
      result._symbolUsed = spySymbolUsed
      result._spyClosesCount = spyCloses.length
      
      // 5. Final diagnostics
      console.log('[SPY] 5. Final diagnostics:', {
        spyDataLength: rebasedData.length,
        symbolUsed: spySymbolUsed,
        spyClosesCount: spyCloses.length,
        backfillCount,
        finalSpyShares: Number(spyShares.toFixed(6)),
        basePortfolioValue,
        baseSpyValue,
        firstRebasedPoint: rebasedData[0],
        lastRebasedPoint: rebasedData[rebasedData.length - 1]
      })
      
      console.log('[SPY] SPY trades processed:', sortedTrades.length, 'backfilled closes:', backfillCount, 'final SPY shares:', spyShares.toFixed(6))
      console.log('[SPY] Return rebase bases → portfolio: $' + basePortfolioValue.toFixed(2) + ', SPY: $' + baseSpyValue.toFixed(2))
      
      return result
    } catch (error) {
      console.error('SPY Benchmark calculation error:', error)
      return { spyData: [], spyStatus: "Error calculating SPY benchmark" }
    }
  }

  // Error boundary for the component
  useEffect(() => {
    try {
      // Validate data structure
      if (data && !Array.isArray(data)) {
        throw new Error('Data must be an array')
      }
      
      if (data && data.length > 0) {
        const firstItem = data[0]
        if (!firstItem.date || typeof firstItem.date !== 'string') {
          throw new Error('Data items must have a valid date field')
        }
      }
      
      setError(null)
    } catch (err) {
      console.error('PortfolioPerformanceChart validation error:', err)
      setError(err instanceof Error ? err.message : 'Invalid data format')
    }
  }, [data])



  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    } catch (err) {
      console.error('Currency formatting error:', err)
      return `$${value.toFixed(0)}`
    }
  }

  const formatPercent = (value: number) => {
    try {
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
    } catch (err) {
      console.error('Percent formatting error:', err)
      return `${value}%`
    }
  }

  // Get today's date in YYYY-MM-DD format (UTC midnight)
  const getToday = (): Date => {
    try {
      const today = new Date()
      // Normalize to UTC midnight for consistency
      return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    } catch (err) {
      console.error('Date calculation error:', err)
      return new Date()
    }
  }

  // Generate evenly spaced ticks for the selected period
  const generateTicks = (startDate: Date, endDate: Date): Date[] => {
    try {
      const ticks: Date[] = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      const spanDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      
      switch (selectedPeriod) {
        case '1M':
          // Weekly ticks for 1 month
          for (let i = 0; i <= 4; i++) {
            const tickDate = new Date(start)
            tickDate.setDate(start.getDate() + (i * 7))
            if (tickDate <= end) {
              ticks.push(tickDate)
            }
          }
          break
          
        case '3M':
          // Bi-weekly ticks for 3 months
          for (let i = 0; i <= 6; i++) {
            const tickDate = new Date(start)
            tickDate.setDate(start.getDate() + (i * 14))
            if (tickDate <= end) {
              ticks.push(tickDate)
            }
          }
          break
          
        case '6M':
          // Monthly ticks for 6 months
          for (let i = 0; i <= 6; i++) {
            const tickDate = new Date(start)
            tickDate.setMonth(start.getMonth() + i)
            if (tickDate <= end) {
              ticks.push(tickDate)
            }
          }
          break
          
        case '1Y':
          // Monthly ticks for 1 year
          for (let i = 0; i <= 12; i++) {
            const tickDate = new Date(start)
            tickDate.setMonth(start.getMonth() + i)
            if (tickDate <= end) {
              ticks.push(tickDate)
            }
          }
          break
          
        case '2Y':
          // Quarterly ticks for 2 years
          for (let i = 0; i <= 8; i++) {
            const tickDate = new Date(start)
            tickDate.setMonth(start.getMonth() + (i * 3))
            if (tickDate <= end) {
              ticks.push(tickDate)
            }
          }
          break
          
        case '5Y':
          // Yearly ticks for 5 years
          for (let i = 0; i <= 5; i++) {
            const tickDate = new Date(start)
            tickDate.setFullYear(start.getFullYear() + i)
            if (tickDate <= end) {
              ticks.push(tickDate)
            }
          }
          break
          
        case 'All':
          // Adaptive ticks based on span - more specific to avoid repetition
          const spanYears = spanDays / 365.25
          if (spanYears <= 1) {
            // Monthly ticks for spans <= 1 year
            for (let i = 0; i <= Math.min(12, Math.floor(spanDays / 30)); i++) {
              const tickDate = new Date(start)
              tickDate.setMonth(start.getMonth() + i)
              if (tickDate <= end) {
                ticks.push(tickDate)
              }
            }
          } else if (spanYears <= 2) {
            // Bi-monthly ticks for spans 1-2 years
            for (let i = 0; i <= Math.min(12, Math.floor(spanYears * 6)); i++) {
              const tickDate = new Date(start)
              tickDate.setMonth(start.getMonth() + (i * 2))
              if (tickDate <= end) {
                ticks.push(tickDate)
              }
            }
          } else if (spanYears <= 5) {
            // Quarterly ticks for spans 2-5 years
            for (let i = 0; i <= Math.min(16, Math.floor(spanYears * 4)); i++) {
              const tickDate = new Date(start)
              tickDate.setMonth(start.getMonth() + (i * 3))
              if (tickDate <= end) {
                ticks.push(tickDate)
              }
            }
          } else {
            // Semi-annual ticks for longer spans
            for (let i = 0; i <= Math.min(20, Math.floor(spanYears * 2)); i++) {
              const tickDate = new Date(start)
              tickDate.setMonth(start.getMonth() + (i * 6))
              if (tickDate <= end) {
                ticks.push(tickDate)
              }
            }
          }
          break
      }
      
      // Always include the end date if not already present
      if (ticks.length > 0 && ticks[ticks.length - 1].getTime() !== end.getTime()) {
        ticks.push(end)
      }
      
      // Remove duplicates and sort
      const uniqueTicks = [...new Set(ticks.map(t => t.getTime()))].sort((a, b) => a - b).map(ts => new Date(ts))
      
      return uniqueTicks
    } catch (err) {
      console.error('Tick generation error:', err)
      return []
    }
  }

  // Format tick labels based on period
  const formatTickLabel = (date: Date): string => {
    try {
      switch (selectedPeriod) {
        case '1M':
        case '3M':
          return format(date, "MMM d")
        case '6M':
        case '1Y':
        case '2Y':
          return format(date, "MMM yyyy")
        case '5Y':
          return format(date, "yyyy")
        case 'All':
          // For "All", use more specific format to avoid repetition
          return format(date, "MMM yyyy")
        default:
          return format(date, "MMM d")
      }
    } catch (err) {
      console.error('Tick label formatting error:', err)
      return date.toLocaleDateString()
    }
  }

  // NEW: Validate and sanitize chart data to prevent crashes
  const validateAndSanitizeData = (data: any[]): ChartDataPoint[] => {
    if (!Array.isArray(data)) {
      console.warn('Chart data is not an array, returning empty array')
        return []
      }

    return data
      .filter(item => {
        // Filter out invalid items
        if (!item || typeof item !== 'object') return false
        if (!item.date || typeof item.date !== 'string') return false
        
        // Validate date format
        const date = new Date(item.date)
        if (isNaN(date.getTime())) return false
        
        return true
      })
      .map(item => {
        // Sanitize numeric values
        const sanitized: ChartDataPoint = {
          date: item.date,
          value: Number.isFinite(item.value) ? item.value : 0,
          return: Number.isFinite(item.return) ? item.return : 0,
          cumulativeReturn: Number.isFinite(item.cumulativeReturn) ? item.cumulativeReturn : 0,
          spyValue: Number.isFinite(item.spyValue) ? item.spyValue : 0,
          spyReturn: Number.isFinite(item.spyReturn) ? item.spyReturn : 0,
          portfolioReturnRebased: Number.isFinite(item.portfolioReturnRebased) ? item.portfolioReturnRebased : 0,
          spyReturnRebased: Number.isFinite(item.spyReturnRebased) ? item.spyReturnRebased : 0
        }
        return sanitized
      })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // NEW: Enhanced chart data processing with validation
  const processData = (): ChartDataPoint[] => {
    try {
      if (!data || data.length === 0) {
        console.log('No data provided to chart component')
        return []
      }

      // Validate and sanitize input data
      const validatedData = validateAndSanitizeData(data)
      if (validatedData.length === 0) {
        console.warn('No valid data points after validation')
        return []
      }

      // Don't clamp - allow data to extend past last historical close using spot prices
      let clampedData = validatedData
      if (status?.valuedThrough) {
        console.log(`[Chart] Data extends to ${validatedData.length} points (valuedThrough: ${status.valuedThrough})`)
      }

      // Filter data by selected period
      const dailySeries = filterDataByPeriod(clampedData, selectedPeriod)
      
      if (dailySeries.length === 0) {
        console.warn('No data available for selected period:', selectedPeriod)
        return []
      }

      return dailySeries
    } catch (err) {
      console.error('Data processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process chart data')
      return []
    }
  }

  const chartData = processData()

  // NEW: Calculate SPY benchmark data for return mode
  const spyBenchmarkData = useMemo(() => {
    // 5. Legend/state check
    if (viewMode !== 'return') {
      return { spyData: [], spyStatus: "E004: Not in return mode" }
    }
    
    if (!showSpyLine) {
      return { spyData: [], spyStatus: "E004: SPY line toggled off" }
    }
    
    if (!trades || trades.length === 0 || !data || data.length === 0 || !priceStore || priceStoreLoading) {
      return { spyData: [], spyStatus: "No data available for SPY benchmark" }
    }
    
    const result = calculateSPYBenchmark(trades, data, selectedPeriod, priceStore)
    
    // Log spyDataAvailable check
    console.log('[SPY] spyDataAvailable check:', {
      spyDataLength: result.spyData.length,
      spyStatus: result.spyStatus,
      spyDataAvailable: result.spyData.length > 0,
      reason: result.spyData.length === 0 ? result.spyStatus : 'SPY data available'
    })
    
    // Check if SPY data is empty after calculation
    if (result.spyData.length === 0) {
      return { spyData: [], spyStatus: "E005: SPY data unavailable for this period" }
    }
    
    return result
  }, [viewMode, trades, data, selectedPeriod, showSpyLine, priceStore, priceStoreLoading])

  // NEW: Combine portfolio and SPY data for charting
  const combinedChartData = useMemo(() => {
    if (viewMode === 'return' && spyBenchmarkData.spyData.length > 0) {
      // Return mode: merge portfolio and SPY data
      const portfolioMap = new Map<string, ChartDataPoint>()
      chartData.forEach(point => {
        portfolioMap.set(point.date, point)
      })
      
      const spyMap = new Map<string, ChartDataPoint>()
      spyBenchmarkData.spyData.forEach(point => {
        spyMap.set(point.date, point)
      })
      
      // Log SPY points in series at render time
      console.log('[SPY] Render time SPY points:', {
        spyPointsInSeries: spyBenchmarkData.spyData.length,
        firstSpyPoint: spyBenchmarkData.spyData[0] ? { date: spyBenchmarkData.spyData[0].date, spyReturnRebased: spyBenchmarkData.spyData[0].spyReturnRebased } : null,
        lastSpyPoint: spyBenchmarkData.spyData[spyBenchmarkData.spyData.length - 1] ? { date: spyBenchmarkData.spyData[spyBenchmarkData.spyData.length - 1].date, spyReturnRebased: spyBenchmarkData.spyData[spyBenchmarkData.spyData.length - 1].spyReturnRebased } : null,
        valuedThrough: status?.valuedThrough
      })
      
      // Get all unique dates
      const allDates = new Set([...portfolioMap.keys(), ...spyMap.keys()])
      const sortedDates = Array.from(allDates).sort()
      
      return sortedDates.map(date => {
        const portfolioPoint = portfolioMap.get(date)
        const spyPoint = spyMap.get(date)
        
        return {
          date,
          value: portfolioPoint?.value || 0,
          return: portfolioPoint?.return || 0,
          cumulativeReturn: portfolioPoint?.cumulativeReturn || 0,
          // KEY FIX: Use rebased values from SPY stream (where rebasing was calculated)
          portfolioReturnRebased: (
            spyPoint?.portfolioReturnRebased ??    // primary: rebased calc created together with SPY series
            portfolioPoint?.portfolioReturnRebased ?? // fallback (portfolio-only branch)
            0
          ),
          spyReturnRebased: (spyPoint?.spyReturnRebased ?? 0),
          spyValue: spyPoint?.spyValue || 0
        }
      }).filter(point => 
        Number.isFinite(point.portfolioReturnRebased) && 
        Number.isFinite(point.spyReturnRebased)
      )
    } else if (viewMode === 'return' && spyBenchmarkData.spyData.length === 0) {
      // Return mode but no SPY data - create portfolio-only dataset with rebased returns
      const periodData = filterDataByPeriod(chartData, selectedPeriod)
      if (periodData.length === 0) return []
      
      // Find base value for portfolio rebasing
      let basePortfolioValue = 0
      for (const point of periodData) {
        if (point.value > 0) {
          basePortfolioValue = point.value
          break
        }
      }
      
      if (basePortfolioValue === 0) return []
      
      return chartData.map(point => ({
        ...point,
        portfolioReturnRebased: ((point.value / basePortfolioValue) - 1) * 100,
        spyReturnRebased: 0
      })).filter(point => Number.isFinite(point.portfolioReturnRebased))
    } else {
      // Value mode: use original chart data
      return chartData
    }
  }, [viewMode, chartData, spyBenchmarkData.spyData, selectedPeriod])

  // NEW: Log chart data for diagnostics
  useEffect(() => {
    if (combinedChartData.length > 0) {
      console.log(`[PortfolioChart] Chart data summary: ${combinedChartData.length} points, viewMode: ${viewMode}`)
      
      // Log first 5 points
      console.log('[PortfolioChart] First 5 points:')
      combinedChartData.slice(0, 5).forEach((point, index) => {
        console.log(`[PortfolioChart] ${index + 1}. ${point.date}: value=$${point.value?.toFixed(2)}, cumulativeReturn=${point.cumulativeReturn?.toFixed(2)}%, portfolioReturnRebased=${point.portfolioReturnRebased?.toFixed(2)}%, spyReturnRebased=${point.spyReturnRebased?.toFixed(2)}%`)
      })
      
      // Log last 5 points
      console.log('[PortfolioChart] Last 5 points:')
      combinedChartData.slice(-5).forEach((point, index) => {
        const actualIndex = combinedChartData.length - 5 + index
        console.log(`[PortfolioChart] ${actualIndex + 1}. ${point.date}: value=$${point.value?.toFixed(2)}, cumulativeReturn=${point.cumulativeReturn?.toFixed(2)}%, portfolioReturnRebased=${point.portfolioReturnRebased?.toFixed(2)}%, spyReturnRebased=${point.spyReturnRebased?.toFixed(2)}%`)
      })
    }
  }, [combinedChartData, viewMode])

  // NEW: Quick visual regression checks (dev-only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && viewMode === 'return') {
      const first = combinedChartData[0]
      console.debug('[Chart] Return first point', {
        portfolioReturnRebased: first?.portfolioReturnRebased,
        spyReturnRebased: first?.spyReturnRebased,
        spyDataAvailable: spyBenchmarkData.spyData.length > 0
      })
      if (Math.abs(first?.portfolioReturnRebased ?? 0) > 0.05) {
        console.warn('[Chart] Portfolio should start near 0%')
      }
      if (spyBenchmarkData.spyData.length > 0 && Math.abs(first?.spyReturnRebased ?? 0) > 0.05) {
        console.warn('[Chart] SPY should start near 0%')
      }
    }
  }, [combinedChartData, viewMode, spyBenchmarkData.spyData.length])

  // Calculate nice step size for consistent Y-axis ticks
  const calculateNiceStep = (range: number, targetSteps: number = 5) => {
    const roughStep = range / targetSteps
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
    const normalizedStep = roughStep / magnitude
    
    // Find the closest nice step
    const niceSteps = [1, 2, 5, 10]
    let niceStep = niceSteps[0]
    for (const step of niceSteps) {
      if (normalizedStep <= step) {
        niceStep = step
        break
      }
    }
    
    return niceStep * magnitude
  }

  // NEW: Calculate Y-axis domain and ticks for consistent step amounts
  const calculateYAxisConfig = () => {
    try {
      if (viewMode === 'return') {
        // For return mode, ensure we always have a proper domain even when no lines are visible
        const portfolioValues = combinedChartData.map(point => point.portfolioReturnRebased ?? 0).filter(val => Number.isFinite(val))
        const spyValues = combinedChartData.map(point => point.spyReturnRebased ?? 0).filter(val => Number.isFinite(val))
        
        // Combine all values to determine domain
        const allValues = [...portfolioValues, ...spyValues]
        
        if (allValues.length === 0) {
          // No data available, use a default percentage range with consistent steps
          const step = 5 // 5% steps
          return {
            domain: [-10, 10],
            ticks: [-10, -5, 0, 5, 10]
          }
        }
        
        const minValue = Math.min(...allValues)
        const maxValue = Math.max(...allValues)
        
        // Handle flat data (all values are the same)
        if (minValue === maxValue) {
          if (maxValue === 0) {
            const step = 2.5 // 2.5% steps for small range
            return {
              domain: [-5, 5],
              ticks: [-5, -2.5, 0, 2.5, 5]
            }
          } else {
            // For flat data, create a small range around the value
            const padding = Math.abs(maxValue) * 0.1
            const range = padding * 2
            const step = calculateNiceStep(range, 5)
            const domainMin = Math.floor((maxValue - padding) / step) * step
            const domainMax = Math.ceil((maxValue + padding) / step) * step
            const ticks = []
            for (let tick = domainMin; tick <= domainMax; tick += step) {
              ticks.push(tick)
            }
            return { domain: [domainMin, domainMax], ticks }
          }
        }
        
        // Normal case: calculate consistent step amounts
        const range = maxValue - minValue
        const padding = range * 0.1
        const step = calculateNiceStep(range + padding * 2, 5)
        const domainMin = Math.floor((minValue - padding) / step) * step
        const domainMax = Math.ceil((maxValue + padding) / step) * step
        const ticks = []
        for (let tick = domainMin; tick <= domainMax; tick += step) {
          ticks.push(tick)
        }
        
        console.log('Y-axis calculation (Return mode):', {
          minValue,
          maxValue,
          step,
          domain: [domainMin, domainMax],
          ticks,
          portfolioValuesCount: portfolioValues.length,
          spyValuesCount: spyValues.length
        })
        
        return { domain: [domainMin, domainMax], ticks }
      }
      
      // For portfolio value mode, always include 0 in the domain
      const values = chartData.map(point => point.value).filter(val => val !== null && val !== undefined && Number.isFinite(val))
      if (values.length === 0) {
        const step = 200 // $200 steps
        return {
          domain: [0, 1000],
          ticks: [0, 200, 400, 600, 800, 1000]
        }
      }
      
      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)
      
      // Handle flat data (all values are the same)
      if (minValue === maxValue) {
        if (maxValue === 0) {
          const step = 200 // $200 steps
          return {
            domain: [0, 1000],
            ticks: [0, 200, 400, 600, 800, 1000]
          }
        } else {
          // For flat data, create a small range above the value but keep 0 as lower bound
          const range = maxValue * 0.1
          const step = calculateNiceStep(range, 5)
          const domainMax = Math.ceil(maxValue * 1.1 / step) * step
          const ticks = []
          for (let tick = 0; tick <= domainMax; tick += step) {
            ticks.push(tick)
          }
          return { domain: [0, domainMax], ticks }
        }
      }
      
      // Normal case: calculate consistent step amounts starting from 0
      const range = maxValue - minValue
      const padding = range * 0.1
      const step = calculateNiceStep(maxValue + padding, 5)
      const domainMax = Math.ceil((maxValue + padding) / step) * step
      const ticks = []
      for (let tick = 0; tick <= domainMax; tick += step) {
        ticks.push(tick)
      }
      
      console.log('Y-axis calculation (Value mode):', {
        minValue,
        maxValue,
        step,
        domain: [0, domainMax],
        ticks
      })
      
      return { domain: [0, domainMax], ticks }
    } catch (err) {
      console.error('Y-axis calculation error:', err)
      return viewMode === 'return' 
        ? { domain: [-10, 10], ticks: [-10, -5, 0, 5, 10] }
        : { domain: [0, 1000], ticks: [0, 200, 400, 600, 800, 1000] }
    }
  }

  // NEW: Calculate X-axis ticks and domain with fallbacks
  const calculateXAxisProps = () => {
    try {
      if (combinedChartData.length === 0) {
        return { domain: ['dataMin', 'dataMax'], ticks: [] }
      }

      const startDate = new Date(combinedChartData[0].date)
      const endDate = new Date(combinedChartData[combinedChartData.length - 1].date)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('Invalid dates in chart data, using fallback')
        return { domain: ['dataMin', 'dataMax'], ticks: [] }
      }

      const ticks = generateTicks(startDate, endDate)
      
      return {
        domain: ['dataMin', 'dataMax'],
        ticks: ticks.length > 0 ? ticks.map(t => t.toISOString().split('T')[0]) : []
      }
    } catch (err) {
      console.error('X-axis calculation error:', err)
      return { domain: ['dataMin', 'dataMax'], ticks: [] }
    }
  }

  // Dev assertions for legend functionality
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Assert legend only renders in Return mode
      const isReturnMode = viewMode === 'return' && spyBenchmarkData.spyData.length > 0
      console.debug(`Legend: Return mode active: ${isReturnMode}`)
      
      // Assert default state shows both lines
      if (isReturnMode) {
        console.debug(`Legend: Default state - Portfolio: ${showPortfolioLine}, S&P 500: ${showSpyLine}`)
      }
      
      // Assert at least one line is visible
      if (isReturnMode && !showPortfolioLine && !showSpyLine) {
        console.warn('Legend: No lines visible - this may cause empty chart')
      }
    }
  }, [viewMode, spyBenchmarkData.spyData.length, showPortfolioLine, showSpyLine])

  // NEW: Dev-only logging block for Return mode summary
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && viewMode === 'return' && spyBenchmarkData.spyData.length > 0) {
      const periodData = filterDataByPeriod(spyBenchmarkData.spyData, selectedPeriod)
      if (periodData.length > 0) {
        const firstPoint = periodData[0]
        const lastPoint = periodData[periodData.length - 1]
        
        // Find base values
        let basePortfolioValue = 0
        let baseSpyValue = 0
        for (const point of periodData) {
          if (basePortfolioValue === 0 && point.value > 0) {
            basePortfolioValue = point.value
          }
          if (baseSpyValue === 0 && point.spyValue && point.spyValue > 0) {
            baseSpyValue = point.spyValue
          }
          if (basePortfolioValue > 0 && baseSpyValue > 0) {
            break
          }
        }

        console.debug('Return Mode Summary:', {
        period: selectedPeriod,
          periodWindow: {
            start: firstPoint?.date,
            end: lastPoint?.date,
            days: periodData.length
          },
          baseValues: {
            portfolio: basePortfolioValue.toFixed(2),
            spy: baseSpyValue.toFixed(2)
          },
          backfillInfo: {
            used: spyBenchmarkData.spyStatus.includes('backfilled') || spyBenchmarkData.spyStatus.includes('forward-filled'),
            count: spyBenchmarkData.spyStatus.match(/(\d+) backfilled/)?.[1] || spyBenchmarkData.spyStatus.match(/(\d+) forward-filled/)?.[1] || '0'
          },
          firstVisibleReturns: {
            portfolio: firstPoint?.portfolioReturnRebased?.toFixed(3) || '0.000',
            spy: firstPoint?.spyReturnRebased?.toFixed(3) || '0.000'
          }
        })
      }
    }
  }, [viewMode, spyBenchmarkData.spyData, selectedPeriod, spyBenchmarkData.spyStatus])

  // NEW: Dev diagnostics for Return mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && viewMode === 'return') {
      console.debug('Return Mode Diagnostics:', {
        viewMode,
        spyDataAvailable: spyBenchmarkData.spyData.length > 0,
        spyStatus: spyBenchmarkData.spyStatus,
        showPortfolioLine,
        showSpyLine,
        combinedDataLength: combinedChartData.length,
        firstPoint: combinedChartData[0],
        lastPoint: combinedChartData[combinedChartData.length - 1]
      })

      // Soft assertions
      if (combinedChartData.length > 0) {
        const firstPoint = combinedChartData[0]
        if (showPortfolioLine && Math.abs(firstPoint.portfolioReturnRebased || 0) > 0.01) {
          console.warn('Return Mode: First portfolio return not ≈ 0%')
        }
        if (showSpyLine && spyBenchmarkData.spyData.length > 0 && Math.abs(firstPoint.spyReturnRebased || 0) > 0.01) {
          console.warn('Return Mode: First SPY return not ≈ 0%')
        }
      }

      if (!showPortfolioLine && !showSpyLine) {
        console.warn('Return Mode: Both series are hidden')
      }
    }
  }, [viewMode, spyBenchmarkData.spyData.length, spyBenchmarkData.spyStatus, showPortfolioLine, showSpyLine, combinedChartData])

  // NEW: Check SPY data availability on mount
  useEffect(() => {
    if (priceStore && !priceStoreLoading) {
      console.log('PortfolioPerformanceChart: SPY data check:', {
        hasSpy: priceStore.hasTicker('SPY'),
        hasSpyUS: priceStore.hasTicker('SPY.US'),
        sampleSpyCloses: priceStore.getDailyCloses('SPY', '2023-01-01', '2023-01-10').slice(0, 3)
      })
    }
  }, [priceStore, priceStoreLoading])

  // NEW: Enhanced error boundary for chart rendering
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Error loading data: {error}</div>
      </div>
    )
  }

  // NEW: Enhanced empty state handling
  if (!data || data.length === 0) {
    console.log('No data provided to chart component')
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--text-muted)]">No Performance Data Available</div>
      </div>
    )
  }

  if (combinedChartData.length === 0) {
    console.log('No chart data after processing')
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--text-muted)]">No data available for selected time period</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading performance data...</div>
      </div>
    )
  }

  const yAxisConfig = calculateYAxisConfig()
  const yAxisDomain = yAxisConfig.domain
  const xAxisProps = calculateXAxisProps()
  const startDate = new Date(combinedChartData[0].date)
  const endDate = new Date(combinedChartData[combinedChartData.length - 1].date)
  const ticks = generateTicks(startDate, endDate)

  // Verify consistency between chart and dashboard
  const chartLastValue = combinedChartData.at(-1)?.value || 0

  // Wrap the chart in error boundary
  try {
    return (
      <div className="h-full flex flex-col min-w-0 min-h-0 isolation:isolate bg-[var(--bg-card)]">
        {/* NEW: Interactive Legend (Return mode only) */}
        {viewMode === 'return' && (
          <InteractiveLegend
            showPortfolioLine={showPortfolioLine}
            showSpyLine={showSpyLine}
            spyDataAvailable={true} // ← always show the item; the line still respects data presence
            onTogglePortfolio={handleTogglePortfolio}
            onToggleSpy={handleToggleSpy}
          />
        )}



        {/* Chart */}
        <div className="h-full flex-grow">
          {useFallback ? (
            <FallbackChart data={combinedChartData} />
          ) : (
                          <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
              {viewMode === 'return' ? (
                // Return mode: two-line chart with Portfolio vs SPY
                <LineChart 
                  data={combinedChartData} 
                  margin={{ top: 32, right: 32, bottom: 32, left: 32 }}
                  style={{ outline: 'none' }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="var(--grid-color, #e5e7eb)" 
                    horizontal={true} 
                    vertical={true} 
                    strokeWidth={1.5} 
                    strokeOpacity={0.8}
                  />
                  <XAxis
                    dataKey="date"
                    type="category"
                    domain={xAxisProps.domain}
                    ticks={xAxisProps.ticks}
                    tickFormatter={(value) => formatTickLabel(new Date(value))}
                    tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--text-primary)', strokeWidth: 1.2 }}
                    tickLine={false}
                    minTickGap={20}
                    angle={0}
                    textAnchor="middle"
                    height={40}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    ticks={yAxisConfig.ticks}
                    tickFormatter={formatPercent}
                    tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--text-primary)', strokeWidth: 1.2 }}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    wrapperStyle={{ zIndex: 9999 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as ChartDataPoint
                        return (
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg" style={{ zIndex: 9999 }}>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(data.date), "MMM dd, yyyy")}
                            </p>
                            {showPortfolioLine && (
                              <p className="text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Portfolio: 
                                </span>
                                <span className="font-medium text-[#4f8bf0]">
                                  {formatPercent(data.portfolioReturnRebased || 0)}
                                </span>
                              </p>
                            )}
                            {showSpyLine && spyBenchmarkData.spyData.length > 0 && (
                              <p className="text-sm">
                                <span className="text-gray-500 dark:text-gray-400">
                                  S&P 500: 
                                </span>
                                <span className="font-medium text-[#d4af37]">
                                  {formatPercent(data.spyReturnRebased || 0)}
                                </span>
                              </p>
                            )}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  {/* 0% reference line */}
                  <ReferenceLine y={0} stroke="#666" strokeWidth={1} strokeDasharray="0" />
                  
                  {/* Portfolio line */}
                  {showPortfolioLine && (
                    <Line
                      type="linear"
                      dataKey="portfolioReturnRebased"
                      stroke="#4f8bf0"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#4f8bf0" }}
                      connectNulls={true}
                    />
                  )}
                  
                  {/* SPY line */}
                  {showSpyLine && spyBenchmarkData.spyData.length > 0 && (
                    <Line
                      type="linear"
                      dataKey="spyReturnRebased"
                      stroke="#d4af37"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#d4af37" }}
                      connectNulls={true}
                    />
                  )}
                </LineChart>
              ) : (
                // Original single-line chart for value mode
              <AreaChart 
                  data={combinedChartData} 
                margin={{ top: 32, right: 32, bottom: 32, left: 32 }}
                style={{ outline: 'none' }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                    stroke="var(--border-subtle)" 
                  horizontal={true} 
                  vertical={true} 
                    strokeWidth={1.5} 
                    strokeOpacity={0.8}
                />
                <XAxis
                  dataKey="date"
                  type="category"
                  domain={xAxisProps.domain}
                  ticks={xAxisProps.ticks}
                  tickFormatter={(value) => formatTickLabel(new Date(value))}
                    tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--text-primary)', strokeWidth: 1.2 }}
                  tickLine={false}
                  minTickGap={20}
                  angle={0}
                  textAnchor="middle"
                  height={40}
                />
                <YAxis
                  domain={yAxisDomain}
                  ticks={yAxisConfig.ticks}
                    tickFormatter={formatCurrency}
                    tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: 'var(--text-primary)', strokeWidth: 1.2 }}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  wrapperStyle={{ zIndex: 9999 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartDataPoint
                      return (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {format(new Date(data.date), "MMM dd, yyyy")}
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                                Portfolio Value: 
                            </span>
                            <span className="font-medium text-emerald-700 dark:text-emerald-500">
                                {formatCurrency(data.value)}
                            </span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="linear"
                    dataKey="value"
                    stroke="#9bd78f"
                  fill="#9bd78f"
                    fillOpacity={1.0}
                  strokeWidth={2}
                  dot={false}
                    activeDot={{ r: 4, fill: "#9bd78f" }}
                  connectNulls={true}
                  baseValue={0}
                />
              </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Time Period Selector */}
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-6">
            {(['1M', '3M', '6M', '1Y', '2Y', '5Y', 'All'] as const).map((period) => {
              const isSelected = selectedPeriod === period
              
              return (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`
                    relative px-2 py-1 text-sm font-medium transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                    ${isSelected 
                      ? "text-blue-600 font-semibold" 
                      : "text-gray-500 hover:text-gray-700"
                    }
                  `}
                >
                  {/* Underline for selected state */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                  
                  <span className="relative">
                    {period}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Status line removed */}

      </div>
    )
  } catch (err) {
    console.error('Chart rendering error:', err)
    // If recharts fails, try fallback
    if (!useFallback) {
      console.log('Recharts failed, trying fallback chart')
      setUseFallback(true)
      return <FallbackChart data={combinedChartData} />
    }
    
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-red-500 text-sm">Chart Rendering Error</div>
          <div className="text-gray-500 text-xs">
            {err instanceof Error ? err.message : 'Failed to render chart'}
          </div>
        </div>
      </div>
    )
  }
}

// NEW: Custom Interactive Legend Component
interface InteractiveLegendProps {
  showPortfolioLine: boolean
  showSpyLine: boolean
  spyDataAvailable: boolean
  onTogglePortfolio: () => void
  onToggleSpy: () => void
}

function InteractiveLegend({ showPortfolioLine, showSpyLine, spyDataAvailable, onTogglePortfolio, onToggleSpy }: InteractiveLegendProps) {
  return (
    <div className="flex justify-center items-center gap-6 mb-2">
      {/* Portfolio Legend Item */}
      <button
        onClick={onTogglePortfolio}
        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-pressed={showPortfolioLine}
        aria-label="Toggle Portfolio series"
      >
        <div 
          className={`w-4 h-4 rounded-full transition-all duration-200 ${
            showPortfolioLine ? 'bg-[#4f8bf0]' : 'bg-transparent border border-gray-400 dark:border-gray-600'
          }`}
        />
        <span className="text-base font-medium">Portfolio</span>
      </button>

      {/* S&P 500 Legend Item - only show if SPY data is available */}
      {spyDataAvailable && (
        <button
          onClick={onToggleSpy}
          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-pressed={showSpyLine}
          aria-label="Toggle S&P 500 series"
        >
          <div 
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              showSpyLine ? 'bg-[#d4af37]' : 'bg-transparent border border-gray-400 dark:border-gray-600'
            }`}
          />
          <span className="text-base font-medium">S&P 500</span>
        </button>
      )}
    </div>
  )
}

// Fallback chart component
const FallbackChart = ({ data }: { data: ChartDataPoint[] }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-[var(--text-muted)]">Chart data unavailable</div>
  </div>
)

// Empty state component
const EmptyState = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-[var(--text-muted)]">No data available</div>
  </div>
)
