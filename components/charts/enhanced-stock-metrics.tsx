"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import type { FinancialDataPoint } from "@/data/mag7-stocks"
import { formatCompactCurrency, formatRatio, formatPercent, formatShares } from "@/lib/format-utils"

interface EnhancedStockMetricsProps {
  data: FinancialDataPoint[]
  symbol: string
  companyName: string
  currentPrice: number
  priceSeries?: Array<{ date: string; price: number }>
  timePeriod?: 'quarterly' | 'ttm' | 'annual'
  onTimePeriodChange?: (period: 'quarterly' | 'ttm' | 'annual') => void
}

interface CompanyMetrics {
  marketCap: number
  peRatio: number
  pbRatio: number
  freeCashFlow: number
  dividendYield: number
  debtToEquity: number
  revenue: number
  netIncome: number
  grossMargin: number
  operatingMargin: number
  netMargin: number
  roe: number
  roa: number
  currentRatio: number
  quickRatio: number
  debtToEquityRatio: number
  interestCoverage: number
  assetTurnover: number
  inventoryTurnover: number
  receivablesTurnover: number
}

// Mock data - in a real app, this would come from an API
const getCompanyMetrics = (ticker: string): CompanyMetrics => {
  const mockData: Record<string, CompanyMetrics> = {
    AAPL: {
      marketCap: 2.8e12,
      peRatio: 28.5,
      pbRatio: 12.3,
      freeCashFlow: 95.2e9,
      dividendYield: 0.5,
      debtToEquity: 1.2,
      revenue: 394.3e9,
      netIncome: 96.9e9,
      grossMargin: 0.44,
      operatingMargin: 0.30,
      netMargin: 0.25,
      roe: 1.47,
      roa: 0.18,
      currentRatio: 1.08,
      quickRatio: 0.95,
      debtToEquityRatio: 1.2,
      interestCoverage: 18.5,
      assetTurnover: 0.83,
      inventoryTurnover: 37.2,
      receivablesTurnover: 15.8
    },
    MSFT: {
      marketCap: 2.9e12,
      peRatio: 32.1,
      pbRatio: 11.8,
      freeCashFlow: 63.4e9,
      dividendYield: 0.8,
      debtToEquity: 0.8,
      revenue: 211.9e9,
      netIncome: 72.4e9,
      grossMargin: 0.69,
      operatingMargin: 0.41,
      netMargin: 0.34,
      roe: 0.39,
      roa: 0.15,
      currentRatio: 1.85,
      quickRatio: 1.82,
      debtToEquityRatio: 0.8,
      interestCoverage: 25.3,
      assetTurnover: 0.44,
      inventoryTurnover: 12.5,
      receivablesTurnover: 4.2
    },
    GOOGL: {
      marketCap: 1.8e12,
      peRatio: 25.7,
      pbRatio: 6.2,
      freeCashFlow: 69.1e9,
      dividendYield: 0,
      debtToEquity: 0.3,
      revenue: 307.4e9,
      netIncome: 73.8e9,
      grossMargin: 0.56,
      operatingMargin: 0.28,
      netMargin: 0.24,
      roe: 0.23,
      roa: 0.18,
      currentRatio: 2.15,
      quickRatio: 2.12,
      debtToEquityRatio: 0.3,
      interestCoverage: 35.2,
      assetTurnover: 0.67,
      inventoryTurnover: 0,
      receivablesTurnover: 8.9
    },
    AMZN: {
      marketCap: 1.6e12,
      peRatio: 45.2,
      pbRatio: 8.9,
      freeCashFlow: 32.8e9,
      dividendYield: 0,
      debtToEquity: 1.1,
      revenue: 514.0e9,
      netIncome: 11.3e9,
      grossMargin: 0.42,
      operatingMargin: 0.05,
      netMargin: 0.02,
      roe: 0.08,
      roa: 0.04,
      currentRatio: 0.95,
      quickRatio: 0.85,
      debtToEquityRatio: 1.1,
      interestCoverage: 3.2,
      assetTurnover: 1.12,
      inventoryTurnover: 8.5,
      receivablesTurnover: 12.3
    },
    TSLA: {
      marketCap: 750e9,
      peRatio: 65.3,
      pbRatio: 15.7,
      freeCashFlow: 8.9e9,
      dividendYield: 0,
      debtToEquity: 0.4,
      revenue: 96.8e9,
      netIncome: 11.5e9,
      grossMargin: 0.25,
      operatingMargin: 0.12,
      netMargin: 0.12,
      roe: 0.33,
      roa: 0.15,
      currentRatio: 1.45,
      quickRatio: 1.12,
      debtToEquityRatio: 0.4,
      interestCoverage: 8.7,
      assetTurnover: 0.45,
      inventoryTurnover: 6.2,
      receivablesTurnover: 3.8
    }
  }
  
  return mockData[ticker] || {
    marketCap: 100e9,
    peRatio: 20.0,
    pbRatio: 3.0,
    freeCashFlow: 10e9,
    dividendYield: 2.0,
    debtToEquity: 0.5,
    revenue: 50e9,
    netIncome: 5e9,
    grossMargin: 0.35,
    operatingMargin: 0.15,
    netMargin: 0.10,
    roe: 0.20,
    roa: 0.10,
    currentRatio: 1.5,
    quickRatio: 1.2,
    debtToEquityRatio: 0.5,
    interestCoverage: 10.0,
    assetTurnover: 0.8,
    inventoryTurnover: 10.0,
    receivablesTurnover: 8.0
  }
}

export default function EnhancedStockMetrics({ data, symbol, companyName, currentPrice, priceSeries, timePeriod = 'quarterly', onTimePeriodChange }: EnhancedStockMetricsProps) {
  const metrics = getCompanyMetrics(symbol)

  const renderMetricCard = (title: string, value: string, subtitle?: string, trend?: 'up' | 'down' | 'neutral') => {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-lg font-semibold">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {trend && (
              <div className="flex items-center">
                {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                {trend === 'neutral' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      {onTimePeriodChange && (
        <div className="flex justify-center">
          <div className="flex space-x-2">
            {(['quarterly', 'ttm', 'annual'] as const).map((period) => (
              <Button
                key={period}
                variant={timePeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => onTimePeriodChange(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Valuation Metrics */}
      <div>
        <CardHeader>
          <CardTitle className="text-lg">Valuation Metrics</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard("Market Cap", formatCompactCurrency(metrics.marketCap))}
          {renderMetricCard("P/E Ratio", formatRatio(metrics.peRatio))}
          {renderMetricCard("P/B Ratio", formatRatio(metrics.pbRatio))}
          {renderMetricCard("Free Cash Flow", formatCompactCurrency(metrics.freeCashFlow))}
        </div>
      </div>

      {/* Financial Performance */}
      <div>
        <CardHeader>
          <CardTitle className="text-lg">Financial Performance</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard("Revenue", formatCompactCurrency(metrics.revenue))}
          {renderMetricCard("Net Income", formatCompactCurrency(metrics.netIncome))}
          {renderMetricCard("Gross Margin", formatPercent(metrics.grossMargin))}
          {renderMetricCard("Operating Margin", formatPercent(metrics.operatingMargin))}
        </div>
      </div>

      {/* Profitability & Efficiency */}
      <div>
        <CardHeader>
          <CardTitle className="text-lg">Profitability & Efficiency</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard("ROE", formatPercent(metrics.roe))}
          {renderMetricCard("ROA", formatPercent(metrics.roa))}
          {renderMetricCard("Asset Turnover", formatRatio(metrics.assetTurnover))}
          {renderMetricCard("Net Margin", formatPercent(metrics.netMargin))}
        </div>
      </div>
      
      {/* Liquidity & Solvency */}
      <div>
        <CardHeader>
          <CardTitle className="text-lg">Liquidity & Solvency</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard("Current Ratio", formatRatio(metrics.currentRatio))}
          {renderMetricCard("Quick Ratio", formatRatio(metrics.quickRatio))}
          {renderMetricCard("Debt/Equity", formatRatio(metrics.debtToEquityRatio))}
          {renderMetricCard("Interest Coverage", formatRatio(metrics.interestCoverage))}
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div>
        <CardHeader>
          <CardTitle className="text-lg">Additional Metrics</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard("Dividend Yield", metrics.dividendYield > 0 ? formatPercent(metrics.dividendYield) : "N/A")}
          {renderMetricCard("Inventory Turnover", metrics.inventoryTurnover > 0 ? formatRatio(metrics.inventoryTurnover) : "N/A")}
          {renderMetricCard("Receivables Turnover", formatRatio(metrics.receivablesTurnover))}
          {renderMetricCard("Shares Outstanding", formatShares(metrics.marketCap / currentPrice))}
        </div>
      </div>
    </div>
  )
}