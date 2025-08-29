"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { useRef, useEffect } from 'react'
import { computeYAxisScale, computeXAxisConfig, formatValue, computeWindowCAGR, getMetricType, formatTooltipTitle, getMetricLabel } from "@/lib/chart-utils"

interface ChartFrameProps {
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  ariaLabel?: string
  headerStat?: string
}

interface MetricBarChartProps {
  data: any[]
  metric: string
  color?: string
  period: 'quarterly' | 'ttm' | 'annual'
}

interface MetricLineChartProps {
  data: any[]
  metric: string
  color?: string
  period: 'quarterly' | 'ttm' | 'annual'
}

interface InlineCAGRStripProps {
  data: any[]
  metric: string
  period: 'quarterly' | 'ttm' | 'annual'
}

export function ChartFrame({ 
  title, 
  children, 
  footer,
  ariaLabel,
  headerStat
}: ChartFrameProps) {
  return (
    <Card 
      className="bg-[var(--bg-card)] border-[var(--border-subtle)] overflow-hidden gap-0 flex flex-col"
      role="group"
      aria-label={ariaLabel}
    >
      {/* Header Zone - Auto Height */}
      <CardHeader 
        className="p-0 border-b border-[var(--border-subtle)] flex-shrink-0"
        style={{ minHeight: 'var(--card-header-h)', padding: '0 var(--card-x)' }}
      >
        <div className="flex items-center justify-between h-full">
          <CardTitle className="text-[var(--text-primary)] text-base font-medium truncate">
            {title}
          </CardTitle>
          {headerStat && (
            <div className="text-xs font-medium text-[var(--text-muted)] truncate ml-2">
              {headerStat}
            </div>
          )}
        </div>
      </CardHeader>

      {/* Content Zone - Flexible Height */}
      <div 
        className="relative flex items-center justify-center flex-1"
        style={{ minHeight: '260px', padding: '16px var(--card-x) 8px var(--card-x)' }}
      >
        <div className="w-full h-full" style={{ height: '260px' }}>
          {children}
        </div>
      </div>

      {/* Divider with CAGR Performance Title */}
      <div style={{ padding: '0 var(--card-x)' }}>
        <div className="border-t border-[var(--border-subtle)] flex items-center justify-center">
          <div className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-card)] px-3 -mt-2">
            CAGR Performance
          </div>
        </div>
      </div>

      {/* Footer Zone - Auto Height */}
      <div 
        className="flex flex-col justify-center overflow-visible flex-shrink-0"
        style={{ minHeight: 'var(--card-footer-h)', padding: '16px var(--card-x)' }}
      >
        {footer || (
          <div className="flex flex-col items-center w-full">
            <div className="flex justify-between items-center w-full">
              <div className="text-center flex-1">
                <div className="text-sm font-medium text-[var(--text-muted)]">1Y CAGR</div>
                <div className="text-xs text-[var(--text-muted)]">—</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-sm font-medium text-[var(--text-muted)]">3Y CAGR</div>
                <div className="text-xs text-[var(--text-muted)]">—</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-sm font-medium text-[var(--text-muted)]">5Y CAGR</div>
                <div className="text-xs text-[var(--text-muted)]">—</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export function MetricBarChart({ data, metric, color = "#ffa159", period }: MetricBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        No data available
      </div>
    )
  }

  const values = data.map(d => d[metric]).filter(v => v !== undefined && v !== null)
  const yAxisConfig = computeYAxisScale(values, getMetricType(metric), 6)
  const xAxisConfig = computeXAxisConfig(data, period)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 20, left: 4, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--grid-color)" strokeOpacity={0.6} />
        <XAxis 
          dataKey="date" 
          ticks={xAxisConfig.ticks}
          tickFormatter={(value) => {
            const index = xAxisConfig.ticks.indexOf(value)
            return index >= 0 ? xAxisConfig.labels[index] : value
          }}
          axisLine={false}
          tickLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
        />
        <YAxis 
          domain={yAxisConfig.domain}
          ticks={yAxisConfig.ticks}
          tickFormatter={yAxisConfig.format}
          axisLine={false}
          tickLine={false}
          width={60}
          tickMargin={8}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
        />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length) return null
            
            const dataPoint = payload[0]
            const formattedValue = formatValue(dataPoint.value, getMetricType(metric))
            const formattedTitle = formatTooltipTitle(String(label), period)
            const metricLabel = getMetricLabel(metric)
            
            return (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {formattedTitle}
                </div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {metricLabel}: {formattedValue}
                </div>
              </div>
            )
          }}
          cursor={false}
        />
        <Bar 
          dataKey={metric} 
          fill={color}
          stroke="transparent"
          radius={[2, 2, 0, 0]}
          activeBar={{ fill: color, opacity: 0.8 }}
        />
        {yAxisConfig.domain[0] <= 0 && yAxisConfig.domain[1] > 0 && (
          <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="3 3" />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MetricLineChart({ data, metric, color = "#ffa159", period }: MetricLineChartProps) {
  // Price-specific debug logs
  if (metric === 'price') {
    console.log('MLC:price:dataCheck', { len: data?.length || 0 })
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        No data available
      </div>
    )
  }

  // Special handling for Price chart
  if (metric === 'price') {
    const values = data.map(d => d.price).filter(v => v !== undefined && v !== null)
    
    // Daily-aware X-axis for price charts
    const generateDailyTicks = (data: any[]) => {
      if (data.length === 0) return { ticks: [], labels: [] }
      
      // Generate monthly ticks (every ~30 days)
      const ticks: string[] = []
      const labels: string[] = []
      
      // Always include first and last dates
      ticks.push(data[0].date)
      labels.push(formatDailyLabel(data[0].date))
      
      // Add monthly intervals
      const step = Math.max(1, Math.floor(data.length / 6)) // ~6 ticks total
      for (let i = step; i < data.length - 1; i += step) {
        ticks.push(data[i].date)
        labels.push(formatDailyLabel(data[i].date))
      }
      
      // Always include last date
      if (data.length > 1) {
        ticks.push(data[data.length - 1].date)
        labels.push(formatDailyLabel(data[data.length - 1].date))
      }
      
      return { ticks, labels }
    }
    
    const formatDailyLabel = (dateStr: string) => {
      const date = new Date(dateStr)
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const year = date.getFullYear().toString().slice(-2)
      return `${month} '${year}`
    }
    
    const xAxisConfig = generateDailyTicks(data)
    
    // Price-specific Y-axis configuration with whole number steps
    const minPrice = Math.min(...values)
    const maxPrice = Math.max(...values)
    const priceRange = maxPrice - minPrice
    
    // Calculate a nice step size that results in whole numbers
    const calculateNiceStep = (range: number, targetSteps: number = 6) => {
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
    
    const step = calculateNiceStep(priceRange)
    
    // Calculate domain with whole number boundaries
    const minDomain = Math.floor(minPrice / step) * step
    const maxDomain = Math.ceil(maxPrice / step) * step
    
    const yAxisDomain = [Math.max(0, minDomain), maxDomain]
    const yAxisTicks = []
    
    // Generate whole number ticks
    for (let tick = yAxisDomain[0]; tick <= yAxisDomain[1]; tick += step) {
      yAxisTicks.push(tick)
    }
    
    console.log('MLC:price:axis', { 
      yDomain: yAxisDomain, 
      yTicks: yAxisTicks.length, 
      step,
      xTicks: xAxisConfig.ticks.length 
    })
    
    const formatPrice = (value: number) => `$${Math.round(value)}`
    
    // Container size sanity check
    const containerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        console.log('MLC:price:container', { 
          wrapperHasHeight: rect.height, 
          width100: rect.width > 0, 
          height100: rect.height > 0 
        })
      }
    }, [])
    
    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 20, left: 4, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--grid-color)" strokeOpacity={0.6} />
          <XAxis 
            dataKey="date" 
            ticks={xAxisConfig.ticks}
            tickFormatter={(value) => {
              const index = xAxisConfig.ticks.indexOf(value)
              return index >= 0 ? xAxisConfig.labels[index] : value
            }}
            axisLine={false}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          />
          <YAxis 
            domain={yAxisDomain}
            ticks={yAxisTicks}
            tickFormatter={formatPrice}
            axisLine={false}
            tickLine={false}
            width={60}
            tickMargin={8}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null
              
              console.log('MLC:price:hover', { label })
              
              const dataPoint = payload[0]
              
              return (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {label} {/* Full YYYY-MM-DD date */}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    Price: {formatPrice(dataPoint.value)}
                  </div>
                </div>
              )
            }}
            cursor={false}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            fill={color}
            fillOpacity={0.3}
            stroke="none"
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={color}
            strokeWidth={2}
            dot={false}
            fill="none"
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    )
  }

  // Regular handling for other metrics
  const values = data.map(d => d[metric]).filter(v => v !== undefined && v !== null)
  const yAxisConfig = computeYAxisScale(values, getMetricType(metric), 6)
  const xAxisConfig = computeXAxisConfig(data, period)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 20, left: 4, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--grid-color)" strokeOpacity={0.6} />
        <XAxis 
          dataKey="date" 
          ticks={xAxisConfig.ticks}
          tickFormatter={(value) => {
            const index = xAxisConfig.ticks.indexOf(value)
            return index >= 0 ? xAxisConfig.labels[index] : value
          }}
          axisLine={false}
          tickLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
        />
        <YAxis 
          domain={yAxisConfig.domain}
          ticks={yAxisConfig.ticks}
          tickFormatter={yAxisConfig.format}
          axisLine={false}
          tickLine={false}
          width={60}
          tickMargin={8}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
        />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (!active || !payload || !payload.length) return null
            
            const dataPoint = payload[0]
            const formattedValue = formatValue(dataPoint.value, getMetricType(metric))
            const formattedTitle = formatTooltipTitle(String(label), period)
            const metricLabel = getMetricLabel(metric)
            
            return (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {formattedTitle}
                </div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {metricLabel}: {formattedValue}
                </div>
              </div>
            )
          }}
        />
        <Line 
          type="monotone" 
          dataKey={metric} 
          stroke={color}
          strokeWidth={2}
          dot={false}
          fill="none"
        />
        {yAxisConfig.domain[0] <= 0 && yAxisConfig.domain[1] > 0 && (
          <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="3 3" />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function InlineCAGRStrip({ data, metric, period }: InlineCAGRStripProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex justify-between items-center w-full">
          <div className="text-center flex-1">
            <div className="text-sm font-medium text-[var(--text-muted)]">1Y CAGR</div>
            <div className="text-xs text-[var(--text-muted)]">—</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-sm font-medium text-[var(--text-muted)]">3Y CAGR</div>
            <div className="text-xs text-[var(--text-muted)]">—</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-sm font-medium text-[var(--text-muted)]">5Y CAGR</div>
            <div className="text-xs text-[var(--text-muted)]">—</div>
          </div>
        </div>
      </div>
    )
  }

  const windows = [
    { years: 1, label: '1Y' },
    { years: 3, label: '3Y' },
    { years: 5, label: '5Y' }
  ]

  const formatPeriod = (date: string) => {
    // Handle daily dates (YYYY-MM-DD format) for price data
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    
    if (period === 'annual') {
      return `'${date.slice(-2)}`
    }
    // For quarterly/TTM: convert "2024-Q2" to "Q2 '24"
    const match = date.match(/(\d{4})-Q(\d)/)
    if (match) {
      return `Q${match[2]} '${match[1].slice(-2)}`
    }
    return date
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex justify-between items-center w-full">
      {windows.map(({ years, label }) => {
        // Convert data to series format for CAGR calculation - skip invalid points
        const series = data
          .filter(point => {
            const value = point[metric]
            return value != null && !isNaN(value) && value > 0
          })
          .map(point => ({
            date: point.date,
            value: point[metric]
          }))
        
        console.debug('[CAGR:UI] series', { metric, inLen: data.length, validLen: series.length })
        
        // Use neutral period for price data to force date-based selection
        const p = metric === 'price' ? 'ttm' : period
        const cagrData = computeWindowCAGR(series, years, p)
        
        // Log verification data for each metric and window
        if (cagrData && cagrData.cagrPct != null) {
          console.debug('[CAGR:verify]', { 
            metric, 
            period: p, 
            seriesLen: series.length, 
            end: { date: cagrData.endLabel, value: cagrData.endValue },
            start: { date: cagrData.startLabel, value: cagrData.startValue },
            years,
            cagrPct: cagrData.cagrPct
          })
        }
        
        console.debug('[CAGR:UI] CAGR calculation result', { 
          label, 
          metric, 
          years, 
          cagrPct: cagrData?.cagrPct, 
          startLabel: cagrData?.startLabel, 
          endLabel: cagrData?.endLabel,
          startValue: cagrData?.startValue,
          endValue: cagrData?.endValue,
          elapsedYears: cagrData?.elapsedYears
        })
        
        if (!cagrData || cagrData.cagrPct == null) {
          return (
            <div key={label} className="text-center flex-1">
              <div className="text-sm font-medium text-[var(--text-muted)]">{label} CAGR</div>
              <div className="text-xs text-[var(--text-muted)]">—</div>
            </div>
          )
        }

        const sign = cagrData.cagrPct >= 0 ? '+' : ''
        const startPeriod = formatPeriod(cagrData.startLabel)
        const endPeriod = formatPeriod(cagrData.endLabel)

        return (
          <div key={label} className="text-center flex-1">
            <div className="text-sm font-medium text-[var(--text-primary)] leading-tight">
              {label}: {sign}{cagrData.cagrPct.toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate leading-tight mt-1">
              {startPeriod} → {endPeriod}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
