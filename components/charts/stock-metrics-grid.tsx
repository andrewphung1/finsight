"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from "lucide-react"

interface StockMetricsGridProps {
  metrics: {
    marketCap: number
    peRatio: number
    pbRatio: number
    dividendYield: number
    beta: number
    volume: number
  }
  isLoading?: boolean
}

export default function StockMetricsGrid({ metrics, isLoading = false }: StockMetricsGridProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Stock Metrics Grid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  const formatRatio = (value: number) => {
    return value.toFixed(2)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
    return value.toLocaleString()
  }

  const metricsData = [
    {
      label: "Market Cap",
      value: formatCurrency(metrics.marketCap),
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
      trend: null
    },
    {
      label: "P/E Ratio",
      value: formatRatio(metrics.peRatio),
      icon: <Percent className="h-4 w-4 text-muted-foreground" />,
      trend: null
    },
    {
      label: "P/B Ratio",
      value: formatRatio(metrics.pbRatio),
      icon: <Percent className="h-4 w-4 text-muted-foreground" />,
      trend: null
    },
    {
      label: "Dividend Yield",
      value: metrics.dividendYield > 0 ? formatPercent(metrics.dividendYield) : "N/A",
      icon: <Percent className="h-4 w-4 text-muted-foreground" />,
      trend: null
    },
    {
      label: "Beta",
      value: formatRatio(metrics.beta),
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      trend: null
    },
    {
      label: "Volume",
      value: formatVolume(metrics.volume),
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      trend: null
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Stock Metrics Grid
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {metricsData.map((metric, index) => (
            <div key={index} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {metric.icon}
                <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                {metric.trend}
              </div>
              <div className="text-lg font-semibold">{metric.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
