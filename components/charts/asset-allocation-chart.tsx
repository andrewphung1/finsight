"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useRouter } from "next/navigation"
import type { AssetAllocation } from "@/types/portfolio"

interface AssetAllocationChartProps {
  data: AssetAllocation[]
  loading?: boolean
}

const COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
]

export function AssetAllocationChart({ data, loading }: AssetAllocationChartProps) {
  const router = useRouter()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Add CSS to remove focus indicators from chart elements
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .recharts-wrapper:focus,
      .recharts-wrapper *:focus,
      .recharts-pie:focus,
      .recharts-pie *:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

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
    console.log('AssetAllocationChart: Navigating to company page for ticker:', ticker)
    
    // Preserve import session parameters if they exist
    const currentUrl = new URL(window.location.href)
    const mode = currentUrl.searchParams.get('mode')
    const sid = currentUrl.searchParams.get('sid')
    
    let targetUrl = `/company/${ticker}`
    if (mode === 'import' && sid) {
      targetUrl += `?mode=${mode}&sid=${sid}`
    }
    
    router.push(targetUrl)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading allocation data...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">No Allocation Data Available</div>
      </div>
    )
  }

  return (
    <div className="h-full flex min-w-0 min-h-0 isolation:isolate bg-[var(--bg-card)]">
      {/* Left Side - Pie Chart Column with equal margins */}
      <div className="flex-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={100}
              paddingAngle={3}
              dataKey="weight"
              label={false}
              labelLine={false}
              onClick={(data) => {
                if (data && data.ticker) {
                  handleTickerClick(data.ticker)
                }
              }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.3}
                />
              ))}
            </Pie>
                            <Tooltip
                  wrapperStyle={{ zIndex: 9999 }}
                  content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as AssetAllocation
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-lg text-gray-900 dark:text-white">{data.ticker}</p>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Portfolio Value: </span>
                        <span className="font-medium text-green-600">{formatCurrency(data.value)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Portfolio Weight: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{data.weight.toFixed(2)}%</span>
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Vertical Separator Line - positioned exactly in center */}
      <div className="w-0.5 bg-[var(--border-subtle)] mx-8 h-full border-l border-[var(--border-subtle)]"></div>

      {/* Right Side - Current Listings Column with equal margins */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-80 flex-shrink-0 space-y-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center border-b border-[var(--border-subtle)] pb-2">Current Holdings</h3>
          <div className={`grid gap-4 ${data.length > 8 ? 'grid-cols-2' : 'grid-cols-1'} justify-items-center`}>
            {data.map((entry, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-sm p-1.5 rounded transition-colors cursor-pointer hover:bg-[var(--bg-app)]"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleTickerClick(entry.ticker)}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ 
                    backgroundColor: COLORS[index % COLORS.length],
                    opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.3
                  }} 
                />
                <span className="font-medium text-[var(--text-primary)]">
                  {entry.ticker} - {entry.weight.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
