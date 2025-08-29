"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, Percent, BarChart3, Target } from "lucide-react"
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics"
import { ExportMenu } from "@/components/export-menu"

export function PortfolioOverview() {
  const { analytics, loading, error, refreshAnalytics, hasData } = usePortfolioAnalytics()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Import your trading history to see portfolio analytics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={refreshAnalytics} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || !analytics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Calculating portfolio analytics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { metrics } = analytics

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Cost basis: {formatCurrency(metrics.totalCost)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            {metrics.totalGain >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPercent(metrics.totalGainPercent)}
            </div>
            <p className="text-xs text-muted-foreground">{formatCurrency(metrics.totalGain)} unrealized</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annualized Return</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(analytics.annualizedReturn)}</div>
            <p className="text-xs text-muted-foreground">Volatility: {analytics.volatility.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Max drawdown: {formatPercent(analytics.maxDrawdown)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Current Holdings</CardTitle>
            <CardDescription>Your portfolio positions and performance</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshAnalytics} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <ExportMenu />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.positions.map((position) => (
              <div key={position.ticker} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-semibold">{position.ticker}</div>
                    <div className="text-sm text-muted-foreground">
                      {position.shares.toFixed(2)} shares @ {formatCurrency(position.costBasis / position.shares)}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="font-semibold">{formatCurrency(position.marketValue)}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={position.unrealizedGain >= 0 ? "default" : "destructive"}>
                      {formatPercent(position.unrealizedGainPercent)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{position.weight.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Asset Allocation */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
          <CardDescription>Portfolio distribution by holdings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.assetAllocation.map((asset) => (
              <div key={asset.ticker} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="font-medium">{asset.ticker}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(asset.value)}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${asset.weight}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{asset.weight.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
