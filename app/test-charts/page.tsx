"use client"

import { useState, useEffect } from "react"
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart"
import { HoldingsPerformanceChart } from "@/components/charts/holdings-performance-chart"
import { AssetAllocationChart } from "@/components/charts/asset-allocation-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Sample data for testing
const samplePerformanceData = [
  { date: '2024-01-01', value: 10000, return: 0, cumulativeReturn: 0 },
  { date: '2024-01-15', value: 10500, return: 5, cumulativeReturn: 5 },
  { date: '2024-02-01', value: 11000, return: 4.76, cumulativeReturn: 10 },
  { date: '2024-02-15', value: 10800, return: -1.82, cumulativeReturn: 8 },
  { date: '2024-03-01', value: 11500, return: 6.48, cumulativeReturn: 15 },
  { date: '2024-03-15', value: 12000, return: 4.35, cumulativeReturn: 20 },
  { date: '2024-04-01', value: 11800, return: -1.67, cumulativeReturn: 18 },
  { date: '2024-04-15', value: 12500, return: 5.93, cumulativeReturn: 25 },
]

// Sample transactions for testing
const sampleTransactions = [
  { id: '1', normalizedTicker: 'AAPL', date: '2024-01-01', quantity: 100, price: 100, totalCost: 10000, fees: 0, type: 'BUY' as const, currency: 'USD', fxApplied: false, signedQuantity: 100 },
  { id: '2', normalizedTicker: 'MSFT', date: '2024-01-01', quantity: 100, price: 100, totalCost: 10000, fees: 0, type: 'BUY' as const, currency: 'USD', fxApplied: false, signedQuantity: 100 },
  { id: '3', normalizedTicker: 'GOOGL', date: '2024-01-01', quantity: 100, price: 100, totalCost: 10000, fees: 0, type: 'BUY' as const, currency: 'USD', fxApplied: false, signedQuantity: 100 },
  { id: '4', normalizedTicker: 'TSLA', date: '2024-01-01', quantity: 100, price: 100, totalCost: 10000, fees: 0, type: 'BUY' as const, currency: 'USD', fxApplied: false, signedQuantity: 100 },
  { id: '5', normalizedTicker: 'NVDA', date: '2024-01-01', quantity: 100, price: 100, totalCost: 10000, fees: 0, type: 'BUY' as const, currency: 'USD', fxApplied: false, signedQuantity: 100 },
]

const sampleAssetAllocationData = [
  { ticker: 'AAPL', name: 'Apple Inc.', value: 11500, weight: 20, sector: 'Technology' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', value: 12200, weight: 21, sector: 'Technology' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', value: 9500, weight: 16, sector: 'Technology' },
  { ticker: 'TSLA', name: 'Tesla Inc.', value: 10800, weight: 18, sector: 'Automotive' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', value: 13200, weight: 23, sector: 'Technology' },
]

export default function TestChartsPage() {
  const [showSP500, setShowSP500] = useState(false)
  const [viewMode, setViewMode] = useState<'value' | 'return'>('value')

  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Chart Test Page</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing chart components with sample data</p>
        </div>

        {/* Portfolio Performance Chart */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-[var(--text-primary)]">Portfolio Performance Chart</CardTitle>
                <CardDescription className="text-[var(--text-muted)]">Testing with sample performance data</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'value' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('value')}
                >
                  Value
                </Button>
                <Button
                  variant={viewMode === 'return' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('return')}
                >
                  Return
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[400px]">
            <PortfolioPerformanceChart
              data={samplePerformanceData}
              loading={false}
              showSP500={showSP500}
              viewMode={viewMode}
              status={{
                valuedThrough: '2024-04-15',
                bridgedTickers: [],
                missingPrices: []
              }}
            />
          </CardContent>
        </Card>

        {/* Holdings Performance Chart */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Holdings Performance Chart</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing with sample holdings data</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <HoldingsPerformanceChart
              transactions={sampleTransactions}
              loading={false}
            />
          </CardContent>
        </Card>

        {/* Asset Allocation Chart */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Asset Allocation Chart</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing with sample allocation data</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <AssetAllocationChart
              data={sampleAssetAllocationData}
              loading={false}
            />
          </CardContent>
        </Card>

        {/* Color Test Section */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Color Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing CSS variables and colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-[var(--chart-1)] text-white text-center">
                Chart Color 1
              </div>
              <div className="p-4 rounded-lg bg-[var(--chart-2)] text-white text-center">
                Chart Color 2
              </div>
              <div className="p-4 rounded-lg bg-[var(--chart-3)] text-white text-center">
                Chart Color 3
              </div>
              <div className="p-4 rounded-lg bg-[var(--chart-4)] text-white text-center">
                Chart Color 4
              </div>
            </div>
            <div className="mt-4 p-4 border border-[var(--border-subtle)] rounded-lg">
              <p className="text-[var(--text-primary)]">Primary text color</p>
              <p className="text-[var(--text-muted)]">Muted text color</p>
              <p className="text-[var(--accent)]">Accent color</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
