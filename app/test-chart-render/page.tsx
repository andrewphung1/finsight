"use client"

import { FundamentalsDashboard } from "@/components/charts/fundamentals-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Minimal test data
const minimalData = [
  { date: '2022-Q1', revenue: 1000000000, grossProfit: 400000000, ebitda: 200000000, operatingIncome: 150000000, netIncome: 120000000, freeCashFlow: 100000000, totalAssets: 5000000000, totalEquity: 3000000000, totalDebt: 1000000000, totalCash: 500000000, eps: 1.20, sharesOutstanding: 1000000000 },
  { date: '2022-Q2', revenue: 1100000000, grossProfit: 440000000, ebitda: 220000000, operatingIncome: 165000000, netIncome: 132000000, freeCashFlow: 110000000, totalAssets: 5200000000, totalEquity: 3100000000, totalDebt: 1050000000, totalCash: 550000000, eps: 1.32, sharesOutstanding: 1000000000 },
]

const minimalPrices = [
  { date: '2022-01-01', price: 150.00 },
  { date: '2022-04-01', price: 165.00 },
]

export default function TestChartRenderPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Chart Render Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing if charts are actually rendering with minimal data</p>
        </div>

        {/* Minimal Data Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Minimal Data Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing with minimal data to verify chart rendering</CardDescription>
          </CardHeader>
          <CardContent>
            <FundamentalsDashboard
              data={minimalData}
              prices={minimalPrices}
              defaultPeriod="quarterly"
            />
          </CardContent>
        </Card>

        {/* Data Info */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Data Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Fundamentals Data:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(minimalData, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Price Data:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(minimalPrices, null, 2)}
                </pre>
              </div>
              
              <div className="text-sm text-[var(--text-muted)]">
                <p>Fundamentals data points: {minimalData.length}</p>
                <p>Price data points: {minimalPrices.length}</p>
                <p>Expected: Charts should render with bars/lines visible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
