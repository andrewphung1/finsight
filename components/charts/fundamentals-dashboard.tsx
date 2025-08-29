"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import { ChartFrame, MetricBarChart, MetricLineChart, InlineCAGRStrip } from "./chart-scaffold"
import { calculateTTM } from "@/lib/series"
import { Button } from "@/components/ui/button"
import { computeWindowCAGR } from "@/lib/chart-utils"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

interface FundamentalsPoint {
  date: string
  revenue?: number
  grossProfit?: number
  ebitda?: number
  operatingIncome?: number
  netIncome?: number
  freeCashFlow?: number
  totalAssets?: number
  totalEquity?: number
  totalDebt?: number
  totalCash?: number
  eps?: number
  sharesOutstanding?: number
}

interface PricePoint {
  date: string
  price: number
}

interface FundamentalsDashboardProps {
  data: FundamentalsPoint[] | { quarterly: FundamentalsPoint[], ttm?: FundamentalsPoint[], annual?: FundamentalsPoint[] }
  prices?: PricePoint[]
  selectedPeriod: 'quarterly' | 'ttm' | 'annual'
  onPeriodChange?: (period: 'quarterly' | 'ttm' | 'annual') => void
  isExpanded?: boolean
  onToggleExpanded?: () => void
  isLoadingPrices?: boolean
}

const METRICS = [
  { key: 'price', label: 'Price', type: 'line', color: '#9bd78f' },
  { key: 'revenue', label: 'Revenue', type: 'bar', color: '#ffa159' },
  { key: 'grossProfit', label: 'Gross Profit', type: 'bar', color: '#47b2f1' },
  { key: 'ebitda', label: 'EBITDA', type: 'bar', color: '#f17581' },
  { key: 'operatingIncome', label: 'Operating Income', type: 'bar', color: '#7c83f8' },
  { key: 'netIncome', label: 'Net Income', type: 'bar', color: '#f6cc00' },
  { key: 'eps', label: 'EPS', type: 'bar', color: '#7c83f8' },
  { key: 'freeCashFlow', label: 'Free Cash Flow', type: 'bar', color: '#c370c8' },
  { key: 'totalDebt', label: 'Total Debt', type: 'bar', color: '#47b2f1' },
  { key: 'totalCash', label: 'Total Cash', type: 'bar', color: '#f17581' },
  { key: 'sharesOutstanding', label: 'Shares Outstanding', type: 'bar', color: '#ffa159' },
]

export function FundamentalsDashboard({ 
  data, 
  prices = [], 
  selectedPeriod,
  onPeriodChange,
  isExpanded = false,
  onToggleExpanded,
  isLoadingPrices = false
}: FundamentalsDashboardProps) {
  

  


  // Process data based on input format
  const displayData = useMemo(() => {
    let rawData: FundamentalsPoint[] = []
    
    if (Array.isArray(data)) {
      // Legacy flat array format - treat as quarterly
      rawData = data
    } else {
      // New object format
      switch (selectedPeriod) {
        case 'quarterly':
          rawData = data.quarterly || []
          break
        case 'ttm':
          if (data.ttm && data.ttm.length > 0) {
            rawData = data.ttm
          } else if (data.quarterly && data.quarterly.length > 0) {
            // Sort quarterly data by date ascending before computing TTM
            const sortedQuarterly = [...data.quarterly].sort((a, b) => a.date.localeCompare(b.date))
            rawData = calculateTTM(sortedQuarterly)
          }
          break
        case 'annual':
          rawData = data.annual || []
          break
      }
    }

    if (!rawData || rawData.length === 0) {
      return []
    }

    // Sort by date ascending
    const sortedData = [...rawData].sort((a, b) => a.date.localeCompare(b.date))
    
    // Determine max points based on period and expanded state
    let maxPoints: number
    if (isExpanded) {
      maxPoints = selectedPeriod === 'annual' ? 10 : 24
    } else {
      maxPoints = selectedPeriod === 'annual' ? 5 : 8
    }
    
    // Take the last N points for chart display
    const truncatedData = sortedData.slice(-maxPoints)
    
    console.debug('[FDD:data] Chart display data', {
      period: selectedPeriod,
      displayLen: truncatedData.length,
      displayRange: {
        first: truncatedData[0]?.date,
        last: truncatedData[truncatedData.length - 1]?.date
      },
      isExpanded,
      maxPoints
    })
    
    return truncatedData
  }, [data, selectedPeriod, isExpanded])

  // Full dataset for CAGR calculations (no truncation)
  const cagrCalculationData = useMemo(() => {
    let rawData: FundamentalsPoint[] = []
    
    if (Array.isArray(data)) {
      // Legacy flat array format - treat as quarterly
      rawData = data
    } else {
      // New object format
      switch (selectedPeriod) {
        case 'quarterly':
          rawData = data.quarterly || []
          break
        case 'ttm':
          if (data.ttm && data.ttm.length > 0) {
            rawData = data.ttm
          } else if (data.quarterly && data.quarterly.length > 0) {
            // Sort quarterly data by date ascending before computing TTM
            const sortedQuarterly = [...data.quarterly].sort((a, b) => a.date.localeCompare(b.date))
            rawData = calculateTTM(sortedQuarterly)
          }
          break
        case 'annual':
          rawData = data.annual || []
          break
      }
    }

    if (!rawData || rawData.length === 0) {
      return []
    }

    // Sort by date ascending - return full dataset for CAGR
    const sortedData = [...rawData].sort((a, b) => a.date.localeCompare(b.date))
    
    console.debug('[FDD:data] CAGR calculation data', {
      period: selectedPeriod,
      cagrLen: sortedData.length,
      cagrRange: {
        first: sortedData[0]?.date,
        last: sortedData[sortedData.length - 1]?.date
      }
    })
    
    return sortedData
  }, [data, selectedPeriod])

  // Process price data
  const displayPriceData = useMemo(() => {
    console.log('FDD:prices:in', { len: prices?.length || 0 })
    
    if (!prices || prices.length === 0) {
      return []
    }

    // Sort by date
    const sortedPrices = [...prices].sort((a, b) => a.date.localeCompare(b.date))
    
    if (sortedPrices.length === 0) {
      return []
    }

    const lastDate = new Date(sortedPrices[sortedPrices.length - 1].date)
    
    let result
    if (isExpanded) {
      // Expanded mode: show data back to 2018
      const startDate = new Date('2018-01-01')
      result = sortedPrices.filter(point => new Date(point.date) >= startDate)
    } else {
      // Compact mode: show up to 2 years from most recent data point
      const twoYearsAgo = new Date(lastDate)
      twoYearsAgo.setFullYear(lastDate.getFullYear() - 2)
      
      result = sortedPrices.filter(point => new Date(point.date) >= twoYearsAgo)
    }
    
    console.log('FDD:prices:out', { 
      len: result.length, 
      first: result[0]?.date, 
      last: result[result.length - 1]?.date,
      isExpanded,
      mode: isExpanded ? 'expanded (2018-present)' : 'compact (2 years)'
    })
    
        return result
  }, [prices, isExpanded])

  // Full price dataset for CAGR calculations (no truncation)
  const cagrPriceData = useMemo(() => {
    if (!prices || prices.length === 0) {
      return []
    }

    // Sort by date ascending - return full dataset for CAGR
    const sortedPrices = [...prices].sort((a, b) => a.date.localeCompare(b.date))
    
    console.debug('[FDD:data] Price CAGR calculation data', {
      cagrLen: sortedPrices.length,
      cagrRange: {
        first: sortedPrices[0]?.date,
        last: sortedPrices[sortedPrices.length - 1]?.date
      }
    })
    
    return sortedPrices
  }, [prices])



  const renderChart = (metric: typeof METRICS[0]) => {
    const chartData = metric.key === 'price' ? displayPriceData : displayData
    
    if (!chartData || chartData.length === 0) {
      return (
        <ChartFrame 
          title={metric.label}
          ariaLabel={`${metric.label} chart`}
        >
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
            {metric.key === 'price' && isLoadingPrices ? 'Loading price data...' : 'No data available'}
          </div>
        </ChartFrame>
      )
    }

    // Special handling for Price chart
    if (metric.key === 'price') {
      return (
        <ChartFrame 
          title={metric.label}
          ariaLabel={`${metric.label} chart`}
        >
          <MetricLineChart 
            data={chartData} 
            metric={metric.key} 
            color={metric.color}
            period={selectedPeriod}
          />
        </ChartFrame>
      )
    }

    // Regular handling for other metrics
    // Use full dataset for CAGR calculations, truncated data for chart display
    const cagrData = metric.key === 'price' ? cagrPriceData : cagrCalculationData
    
    return (
      <ChartFrame 
        title={metric.label}
        ariaLabel={`${metric.label} chart`}
        footer={
          <InlineCAGRStrip 
            data={cagrData} 
            metric={metric.key} 
            period={selectedPeriod}
          />
        }
      >
        {metric.type === 'line' ? (
          <MetricLineChart 
            data={chartData} 
            metric={metric.key} 
            color={metric.color}
            period={selectedPeriod}
          />
        ) : (
          <MetricBarChart 
            data={chartData} 
            metric={metric.key} 
            color={metric.color}
            period={selectedPeriod}
          />
        )}
      </ChartFrame>
    )
  }

  return (
    <div className="relative">
      
      {/* Controls Row - Full Width */}
      {(onToggleExpanded || onPeriodChange) && (
        <div className="flex justify-between items-center mb-6">
          {/* Left Control - Aligns with Price card left edge */}
          <div style={{ padding: '0 var(--card-x)' }}>
            {onToggleExpanded && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--text-muted)]">View:</span>
                <div className="flex rounded-lg border bg-[var(--bg-muted)] p-1">
                  <Button
                    variant={!isExpanded ? "default" : "ghost"}
                    size="sm"
                    onClick={onToggleExpanded}
                    className="text-xs"
                  >
                    Compact
                  </Button>
                  <Button
                    variant={isExpanded ? "default" : "ghost"}
                    size="sm"
                    onClick={onToggleExpanded}
                    className="text-xs"
                  >
                    Expanded
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Control - Positioned at far right of page */}
          <div style={{ padding: '0 var(--card-x)' }}>
            {onPeriodChange && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--text-muted)]">Time Period:</span>
                <div className="flex rounded-lg border bg-[var(--bg-muted)] p-1">
                  <Button
                    variant={selectedPeriod === 'quarterly' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPeriodChange('quarterly')}
                    className="text-xs"
                  >
                    Quarterly
                  </Button>
                  <Button
                    variant={selectedPeriod === 'ttm' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPeriodChange('ttm')}
                    className="text-xs"
                  >
                    TTM
                  </Button>
                  <Button
                    variant={selectedPeriod === 'annual' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onPeriodChange('annual')}
                    className="text-xs"
                  >
                    Annual
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {METRICS.map((metric) => (
          <div key={metric.key}>
            {renderChart(metric)}
          </div>
        ))}
      </div>
    </div>
  )
}
