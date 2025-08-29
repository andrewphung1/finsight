"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"
import { TickerLogo } from "@/components/ui/ticker-logo"
import { useRouter } from "next/navigation"
import { useHoldingsPerformanceGS } from "@/hooks/use-holdings-performance-gs"
import { NormalizedTransaction } from "@/types/portfolio"

// Simple replacement for missing test-harness
const mark = (name: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TEST-HARNESS] ${name}:`, data)
  }
}

interface HoldingsPerformanceChartProps {
  transactions: NormalizedTransaction[]
  positions?: Array<{ ticker: string; shares: number }>
  loading?: boolean
}

// Charting utility functions (same as key metrics)
interface YAxisScale {
  domain: [number, number]
  ticks: number[]
  unit: 'B' | 'M' | 'K' | ''
  format: (value: number) => string
}

interface YAxisOptions {
  targetTicks?: number
  padPct?: number
}

// Nice number sequence: 1, 2, 2.5, 5, 10 × 10^n
const NICE_NUMBERS = [1, 2, 2.5, 5, 10]

// Find the next nice number in the sequence
const getNiceNumber = (value: number): number => {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  
  for (const nice of NICE_NUMBERS) {
    if (nice >= normalized) {
      return nice * magnitude
    }
  }
  return 10 * magnitude
}

// Compute Y-axis scale with nice bounds and uniform tick steps
const computeYAxisScale = (data: number[], options: YAxisOptions = {}): YAxisScale => {
  const { targetTicks = 6, padPct = 0.03 } = options
  
  if (!data || data.length === 0) {
    return { 
      domain: [0, 100], 
      ticks: [0, 20, 40, 60, 80, 100], 
      unit: '',
      format: (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
    }
  }
  
  // Axis guard: if all values are 0, return a default domain
  const allZero = data.every(value => value === 0)
  if (allZero) {
    // Only log if we truly have no signal after normalization
    const hasAnySignal = data.some(value => value !== 0)
    if (!hasAnySignal) {
      console.log('HoldingsPerformanceChart: All values are 0, using default domain')
    }
    return { 
      domain: [-5, 5], 
      ticks: [-5, 0, 5], 
      unit: '',
      format: (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
    }
  }
  
  const minD = Math.min(...data)
  const maxD = Math.max(...data)
  const maxAbs = Math.max(Math.abs(minD), Math.abs(maxD))
  
  // For percentage data, we don't need unit scaling
  const unit: 'B' | 'M' | 'K' | '' = ''
  const scaleFactor = 1
  
  // Convert to unit space for calculations
  const minUnit = minD / scaleFactor
  const maxUnit = maxD / scaleFactor
  
  // Compute nice bounds with padding
  const range = maxUnit - minUnit
  const padding = range * padPct
  
  // Calculate target step size
  const targetStep = (range + 2 * padding) / (targetTicks - 1)
  
  // Find nice step size
  const niceStep = getNiceNumber(targetStep)
  
  // Calculate bounds ensuring no inward rounding
  const paddedMin = minUnit - padding
  const paddedMax = maxUnit + padding
  
  // Floor lower bound to nearest step multiple ≤ minD
  const lowerBound = Math.floor(paddedMin / niceStep) * niceStep
  // Ceil upper bound to nearest step multiple ≥ maxD
  const upperBound = Math.ceil(paddedMax / niceStep) * niceStep
  
  // Ensure bounds don't round inward
  const finalMin = Math.min(lowerBound, minUnit)
  const finalMax = Math.max(upperBound, maxUnit)
  
  // Generate ticks
  const ticks: number[] = []
  const numTicks = Math.floor((finalMax - finalMin) / niceStep) + 1
  
  for (let i = 0; i < numTicks; i++) {
    const tickValue = finalMin + (niceStep * i)
    ticks.push(tickValue * scaleFactor) // Convert back to original scale
  }
  
  // Determine precision from tick step in unit space
  let precision = 0
  if (niceStep >= 1) {
    precision = 0
  } else if (niceStep >= 0.1) {
    precision = 1
  } else if (niceStep >= 0.01) {
    precision = 2
  } else {
    precision = Math.min(3, Math.abs(Math.floor(Math.log10(niceStep))) + 1)
  }
  
  // Create formatter function
  const format = (value: number): string => {
    const valueInUnit = value / scaleFactor
    const formatted = valueInUnit.toFixed(precision)
    const trimmed = formatted.replace(/\.0+$/, '') // Trim trailing .0
    return `${valueInUnit >= 0 ? "+" : ""}${trimmed}%`
  }
  
  return {
    domain: [finalMin * scaleFactor, finalMax * scaleFactor],
    ticks,
    unit,
    format
  }
}

export function HoldingsPerformanceChart({ transactions, positions, loading: externalLoading }: HoldingsPerformanceChartProps) {
  // Add CSS to remove focus indicators from chart elements
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .recharts-wrapper:focus,
      .recharts-wrapper *:focus,
      .recharts-bar:focus,
      .recharts-bar *:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  
  // Use the new GS-only hook
  const { data, summary, loading: gsLoading, error } = useHoldingsPerformanceGS(transactions, positions)
  
  const loading = externalLoading || gsLoading
  
  // Debug logging
  console.log('HoldingsPerformanceChart received:', {
    transactionCount: transactions?.length || 0,
    dataLength: data?.length || 0,
    summary,
    loading,
    error
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Handle ticker click navigation
  const handleTickerClick = (ticker: string) => {
    console.log('HoldingsPerformanceChart: Navigating to company page for ticker:', ticker)
    
    // Preserve current URL parameters (mode and sid) when navigating
    const currentParams = new URLSearchParams(window.location.search)
    const mode = currentParams.get('mode')
    const sid = currentParams.get('sid')
    
    // Build the new URL with preserved parameters
    const newParams = new URLSearchParams()
    if (mode) newParams.set('mode', mode)
    if (sid) newParams.set('sid', sid)
    
    const queryString = newParams.toString()
    const url = `/company/${ticker}${queryString ? `?${queryString}` : ''}`
    
    console.log('HoldingsPerformanceChart: Navigating to:', url)
    router.push(url)
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div data-testid="no-portfolio-message" className="text-[var(--text-muted)]">
          Final pricing in progress...
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div data-testid="no-portfolio-message" className="text-[var(--text-muted)]">
          Error loading holdings data: {error}
        </div>
      </div>
    )
  }

  // No data state
  if (!data || data.length === 0) {
    if (summary.total === 0) {
      return (
        <div className="h-[500px] flex items-center justify-center">
          <div data-testid="no-portfolio-message" className="text-[var(--text-muted)]">No Portfolio Data Available</div>
        </div>
      )
    } else {
      return (
        <div className="h-[500px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground mb-2">No tickers with both avg cost and GS price</div>
            <div className="text-sm text-muted-foreground">
              Check your Google Sheet for missing prices
            </div>
            {summary.missingPriceTickers.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Missing: {summary.missingPriceTickers.join(', ')}
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  // Progress state (partial data) - but only if we have no resolved data at all
  if (summary.resolved === 0 && summary.total > 0) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">Pricing...</div>
          <div className="text-sm text-muted-foreground">
            {summary.resolved} of {summary.total} tickers resolved
          </div>
          {summary.missingPriceTickers.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Excluded (no GS price): {summary.missingPriceTickers.join(', ')}
            </div>
          )}
          {summary.missingCostTickers.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Excluded (no avg cost): {summary.missingCostTickers.join(', ')}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Instrumentation and assertions
  mark('holdings-chart-data-processed', {
    dataLength: data.length,
    summary
  })

  // Sort from least performing to best performing for chart
  const sortedData = [...data].sort((a, b) => a.totalReturnPercent - b.totalReturnPercent)
  
  // Get Y-axis scale using the same utility as key metrics
  const values = sortedData.map(d => d.totalReturnPercent)
  const yAxisScale = computeYAxisScale(values, { targetTicks: 6, padPct: 0.03 })

  // Calculate color intensity based on magnitude
  const getBarColor = (value: number) => {
    const absValue = Math.abs(value)
    const maxAbsValue = Math.max(...values.map(v => Math.abs(v)))
    
    if (value >= 0) {
      // Use CSS custom properties for consistent theming
      return 'var(--chart-2)' // Green color from CSS variables
    } else {
      // Use CSS custom properties for consistent theming
      return 'var(--chart-4)' // Red color from CSS variables
    }
  }

  // Dynamic bar size based on number of tickers
  const numTickers = sortedData.length
  const dynamicBarSize = Math.max(20, Math.min(60, 800 / numTickers)) // Responsive bar size

  // Sort data by performance for top/bottom movers
  const performanceSortedData = [...data].sort((a, b) => b.totalReturnPercent - a.totalReturnPercent)
  let topMovers = performanceSortedData.filter(item => item.totalReturnPercent > 0).slice(0, 3)
  let bottomMovers = performanceSortedData.filter(item => item.totalReturnPercent < 0).slice(0, 3).reverse()

  // Fallback if all percents are 0 (but there are gains/losses)
  if (topMovers.length === 0 && bottomMovers.length === 0) {
    // try totalReturn (absolute $) as a fallback
    const byDollar = [...data].sort((a, b) => b.totalReturn - a.totalReturn)
    const positives = byDollar.filter(x => x.totalReturn > 0).slice(0, 3)
    const negatives = byDollar.filter(x => x.totalReturn < 0).slice(0, 3).reverse()
    topMovers = positives
    bottomMovers = negatives
  }

  return (
    <div data-testid="holdings-chart" className="space-y-6 min-w-0 min-h-0 isolation:isolate bg-[var(--bg-card)]">
      {/* Partial data indicator */}
      {summary.resolved > 0 && summary.resolved < summary.total && (
        <div className="px-6 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Partial data:</span> {summary.resolved} of {summary.total} tickers resolved
            {summary.missingPriceTickers.length > 0 && (
              <span className="ml-2">
                • Missing prices: {summary.missingPriceTickers.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Original Bar Chart - Taller and using key metrics charting utility */}
      <div className="mt-4 mb-2 h-[500px] flex items-center">
        <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
          <BarChart 
            data={sortedData} 
            margin={{ 
              top: 20, 
              right: 12, 
              left: 12, 
              bottom: 8 // Reduced bottom margin
            }}
            onMouseMove={(e) => setActiveIndex(typeof e?.activeTooltipIndex === 'number' ? e.activeTooltipIndex : null)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-subtle)" 
              horizontal={true} 
              vertical={false} 
              strokeWidth={1} 
            />
            <XAxis 
              dataKey="ticker" 
              tick={{ fontSize: numTickers > 15 ? 10 : 12, fill: 'var(--text-primary)', fontWeight: 500 }}
              axisLine={{ stroke: 'var(--text-primary)', strokeWidth: 1.2 }}
              tickLine={false}
              angle={numTickers > 10 ? -45 : 0}
              textAnchor={numTickers > 10 ? "end" : "middle"}
              height={numTickers > 10 ? 80 : 40}
              padding={{ left: 12, right: 18 }}
            />
            <YAxis
              domain={yAxisScale.domain}
              ticks={yAxisScale.ticks}
              tick={{ fontSize: 12, fill: 'var(--text-primary)', fontWeight: 500 }}
              axisLine={{ stroke: 'var(--text-primary)', strokeWidth: 1.2 }}
              tickLine={false}
              width={60}
              tickFormatter={yAxisScale.format}
            />
            <ReferenceLine y={0} stroke="var(--text-primary)" strokeDasharray="2 2" strokeWidth={1} />
            <Tooltip
              cursor={false}
              wrapperStyle={{ zIndex: 9999 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg" style={{ zIndex: 9999 }}>
                      <p className="font-semibold text-lg text-gray-900 dark:text-white">{label}</p>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Market Value: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.marketValue)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Return: </span>
                        <span
                          className={`font-medium ${data.totalReturnPercent >= 0 ? "text-[#4ADE80]" : "text-[#FB7185]"}`}
                        >
                          {yAxisScale.format(data.totalReturnPercent)}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Gain/Loss: </span>
                        <span
                          className={`font-medium ${data.totalReturn >= 0 ? "text-[#4ADE80]" : "text-[#FB7185]"}`}
                        >
                          {formatCurrency(data.totalReturn)}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Avg Cost: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.avgCostPerShare)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Shares: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{data.shares.toLocaleString()}</span>
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="totalReturnPercent"
              radius={[1, 1, 0, 0]}
              barSize={dynamicBarSize}
              cursor="pointer"
              onClick={(data) => {
                if (data && 'ticker' in data && typeof data.ticker === 'string') {
                  handleTickerClick(data.ticker)
                }
              }}
            >
              {sortedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  data-testid="holdings-bar"
                  fill={getBarColor(entry.totalReturnPercent)}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                  strokeWidth={activeIndex === index ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top and Bottom Movers Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 px-3">Top & Bottom Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Movers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h4 className="text-base font-semibold text-accent">Top Movers</h4>
            </div>
            <div className="space-y-2 px-3">
              {topMovers.map((position, index) => (
                <div 
                  key={position.ticker} 
                  className="flex items-center justify-between p-4 border rounded-xl bg-card border-border hover:bg-secondary transition-all hover:scale-[1.01] cursor-pointer max-w-full overflow-hidden"
                  onClick={() => handleTickerClick(position.ticker)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TickerLogo
                      ticker={position.ticker}
                      size={24}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{position.ticker}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatCurrency(position.marketValue)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-semibold text-accent">
                      {yAxisScale.format(position.totalReturnPercent)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(position.totalReturn)}
                    </div>
                  </div>
                </div>
              ))}
              {topMovers.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No positive performers
                </div>
              )}
            </div>
          </div>

          {/* Bottom Movers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <h4 className="text-base font-semibold text-destructive">Bottom Movers</h4>
            </div>
            <div className="space-y-2 px-3">
              {bottomMovers.map((position, index) => (
                <div 
                  key={position.ticker} 
                  className="flex items-center justify-between p-4 border rounded-xl bg-card border-border hover:bg-secondary transition-all hover:scale-[1.01] cursor-pointer max-w-full overflow-hidden"
                  onClick={() => handleTickerClick(position.ticker)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TickerLogo
                      ticker={position.ticker}
                      size={24}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{position.ticker}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {formatCurrency(position.marketValue)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-semibold text-destructive">
                      {yAxisScale.format(position.totalReturnPercent)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(position.totalReturn)}
                    </div>
                  </div>
                </div>
              ))}
              {bottomMovers.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No negative performers
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
