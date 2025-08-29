"use client"

import { useState, useEffect } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { PerformanceData } from "@/types/portfolio"
import { format, parseISO, subDays, subMonths, subYears } from "date-fns"

interface ReturnsDistributionChartProps {
  data: PerformanceData[]
  loading?: boolean
}

const TIME_PERIODS = [
  { label: "1D", value: "1D", days: 1 },
  { label: "3D", value: "3D", days: 3 },
  { label: "5D", value: "5D", days: 5 },
  { label: "1M", value: "1M", months: 1 },
  { label: "3M", value: "3M", months: 3 },
  { label: "6M", value: "6M", months: 6 },
  { label: "1Y", value: "1Y", years: 1 },
  { label: "3Y", value: "3Y", years: 3 },
  { label: "5Y", value: "5Y", years: 5 },
  { label: "10Y", value: "10Y", years: 10 },
  { label: "All", value: "All" },
]

const generateSP500Data = (portfolioData: PerformanceData[]) => {
  return portfolioData.map((item, index) => {
    // Simulate S&P 500 returns (historically ~10% annually)
    const baseReturn = Math.random() * 0.3 - 0.1 // -10% to +20% variation
    const cumulativeReturn = index * 0.8 + baseReturn // Gradual upward trend
    return {
      date: item.date,
      sp500Return: cumulativeReturn,
    }
  })
}

export function ReturnsDistributionChart({ data, loading }: ReturnsDistributionChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("1Y")

  // Add CSS to remove focus indicators from chart elements
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .recharts-wrapper:focus,
      .recharts-wrapper *:focus,
      .recharts-area:focus,
      .recharts-area *:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM yyyy")
    } catch {
      return dateStr
    }
  }

  const filterDataByPeriod = (data: PerformanceData[], period: string) => {
    if (period === "All" || !data.length) return data

    const now = new Date()
    let cutoffDate: Date

    const periodConfig = TIME_PERIODS.find((p) => p.value === period)
    if (!periodConfig) return data

    if (periodConfig.days) {
      cutoffDate = subDays(now, periodConfig.days)
    } else if (periodConfig.months) {
      cutoffDate = subMonths(now, periodConfig.months)
    } else if (periodConfig.years) {
      cutoffDate = subYears(now, periodConfig.years)
    } else {
      return data
    }

    return data.filter((item) => {
      try {
        return parseISO(item.date) >= cutoffDate
      } catch {
        return true
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Returns</CardTitle>
          <CardDescription>Portfolio vs S&P 500 performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading returns data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Returns</CardTitle>
          <CardDescription>Portfolio vs S&P 500 performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">No returns data available</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredData = filterDataByPeriod(data, selectedPeriod)
  const sp500Data = generateSP500Data(filteredData)

  // Combine portfolio and S&P 500 data
  const combinedData = filteredData.map((item, index) => ({
    ...item,
    sp500Return: sp500Data[index]?.sp500Return || 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Returns</CardTitle>
        <CardDescription>Portfolio vs S&P 500 performance over time</CardDescription>
        <div className="flex flex-wrap gap-1 mt-4">
          {TIME_PERIODS.map((period) => (
            <Button
              key={period.value}
              variant={selectedPeriod === period.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period.value)}
              className="text-xs"
            >
              {period.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%" style={{ outline: 'none' }}>
                          <AreaChart data={combinedData} margin={{ top: 25, right: 22, left: 0, bottom: 14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" strokeOpacity={0.6} />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate} 
                className="text-xs fill-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={formatPercent} className="text-xs fill-muted-foreground" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{formatDate(String(label || ''))}</p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Portfolio: </span>
                          <span
                            className={`font-medium ${data.cumulativeReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatPercent(data.cumulativeReturn)}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">S&P 500: </span>
                          <span className={`font-medium ${data.sp500Return >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatPercent(data.sp500Return)}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-muted-foreground">Outperformance: </span>
                          <span
                            className={`font-medium ${(data.cumulativeReturn - data.sp500Return) >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatPercent(data.cumulativeReturn - data.sp500Return)}
                          </span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="sp500Return"
                stroke="#6B7280"
                fill="#6B7280"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Area
                type="monotone"
                dataKey="cumulativeReturn"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.2}
                strokeWidth={3}
              />
              <Legend
                content={() => (
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 bg-blue-500 rounded"></div>
                      <span className="text-sm">Portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 bg-gray-500 rounded border-dashed border border-gray-500"></div>
                      <span className="text-sm">S&P 500</span>
                    </div>
                  </div>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
