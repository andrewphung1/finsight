"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from "lucide-react"

interface StockMetricsChartProps {
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

export default function StockMetricsChart({ metrics, isLoading = false }: StockMetricsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Stock Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Stock Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Market Cap</span>
            </div>
            <div className="text-lg font-semibold">{formatCurrency(metrics.marketCap)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">P/E Ratio</span>
            </div>
            <div className="text-lg font-semibold">{formatRatio(metrics.peRatio)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">P/B Ratio</span>
            </div>
            <div className="text-lg font-semibold">{formatRatio(metrics.pbRatio)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Dividend Yield</span>
            </div>
            <div className="text-lg font-semibold">
              {metrics.dividendYield > 0 ? formatPercent(metrics.dividendYield) : "N/A"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Beta</span>
            </div>
            <div className="text-lg font-semibold">{formatRatio(metrics.beta)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Volume</span>
            </div>
            <div className="text-lg font-semibold">{formatVolume(metrics.volume)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
