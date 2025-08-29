"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from "lucide-react"

interface FinancialMetricsChartProps {
  metrics: {
    totalValue: number
    totalGain: number
    totalGainPercent: number
    ytdReturn: number
    positionsCount: number
  }
  isLoading?: boolean
}

export default function FinancialMetricsChart({ metrics, isLoading = false }: FinancialMetricsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return null
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Financial Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Value</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Gain</span>
              {getTrendIcon(metrics.totalGain)}
            </div>
            <div className={`text-2xl font-bold ${getTrendColor(metrics.totalGain)}`}>
              {formatCurrency(metrics.totalGain)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Gain %</span>
              {getTrendIcon(metrics.totalGainPercent)}
            </div>
            <div className={`text-2xl font-bold ${getTrendColor(metrics.totalGainPercent)}`}>
              {formatPercent(metrics.totalGainPercent)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">YTD Return</span>
              {getTrendIcon(metrics.ytdReturn)}
            </div>
            <div className={`text-2xl font-bold ${getTrendColor(metrics.ytdReturn)}`}>
              {formatPercent(metrics.ytdReturn)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
