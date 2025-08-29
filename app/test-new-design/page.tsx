"use client"

import { FundamentalsDashboard } from "@/components/charts/fundamentals-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Test data for the new design
const testData = [
  { date: '2022-Q1', revenue: 1000000000, grossProfit: 400000000, ebitda: 200000000, operatingIncome: 150000000, netIncome: 120000000, freeCashFlow: 100000000, totalAssets: 5000000000, totalEquity: 3000000000, totalDebt: 1000000000, totalCash: 500000000, eps: 1.20, sharesOutstanding: 1000000000 },
  { date: '2022-Q2', revenue: 1100000000, grossProfit: 440000000, ebitda: 220000000, operatingIncome: 165000000, netIncome: 132000000, freeCashFlow: 110000000, totalAssets: 5200000000, totalEquity: 3100000000, totalDebt: 1050000000, totalCash: 550000000, eps: 1.32, sharesOutstanding: 1000000000 },
  { date: '2022-Q3', revenue: 1200000000, grossProfit: 480000000, ebitda: 240000000, operatingIncome: 180000000, netIncome: 144000000, freeCashFlow: 120000000, totalAssets: 5400000000, totalEquity: 3200000000, totalDebt: 1100000000, totalCash: 600000000, eps: 1.44, sharesOutstanding: 1000000000 },
  { date: '2022-Q4', revenue: 1300000000, grossProfit: 520000000, ebitda: 260000000, operatingIncome: 195000000, netIncome: 156000000, freeCashFlow: 130000000, totalAssets: 5600000000, totalEquity: 3300000000, totalDebt: 1150000000, totalCash: 650000000, eps: 1.56, sharesOutstanding: 1000000000 },
  { date: '2023-Q1', revenue: 1400000000, grossProfit: 560000000, ebitda: 280000000, operatingIncome: 210000000, netIncome: 168000000, freeCashFlow: 140000000, totalAssets: 5800000000, totalEquity: 3400000000, totalDebt: 1200000000, totalCash: 700000000, eps: 1.68, sharesOutstanding: 1000000000 },
  { date: '2023-Q2', revenue: 1500000000, grossProfit: 600000000, ebitda: 300000000, operatingIncome: 225000000, netIncome: 180000000, freeCashFlow: 150000000, totalAssets: 6000000000, totalEquity: 3500000000, totalDebt: 1250000000, totalCash: 750000000, eps: 1.80, sharesOutstanding: 1000000000 },
  { date: '2023-Q3', revenue: 1600000000, grossProfit: 640000000, ebitda: 320000000, operatingIncome: 240000000, netIncome: 192000000, freeCashFlow: 160000000, totalAssets: 6200000000, totalEquity: 3600000000, totalDebt: 1300000000, totalCash: 800000000, eps: 1.92, sharesOutstanding: 1000000000 },
  { date: '2023-Q4', revenue: 1700000000, grossProfit: 680000000, ebitda: 340000000, operatingIncome: 255000000, netIncome: 204000000, freeCashFlow: 170000000, totalAssets: 6400000000, totalEquity: 3700000000, totalDebt: 1350000000, totalCash: 850000000, eps: 2.04, sharesOutstanding: 1000000000 },
]

const testPrices = [
  { date: '2022-01-01', price: 150.00 },
  { date: '2022-04-01', price: 165.00 },
  { date: '2022-07-01', price: 180.00 },
  { date: '2022-10-01', price: 175.00 },
  { date: '2023-01-01', price: 190.00 },
  { date: '2023-04-01', price: 205.00 },
  { date: '2023-07-01', price: 220.00 },
  { date: '2023-10-01', price: 235.00 },
]

export default function TestNewDesignPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">New Chart Design Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing the revamped chart cards with taller graphs and redesigned CAGR footer</p>
        </div>

        {/* Design Features */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">New Design Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[var(--text-muted)]">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Card Layout:</h4>
                <ul className="space-y-1">
                  <li>• Taller cards (280px total height)</li>
                  <li>• Larger chart area (180px plot height)</li>
                  <li>• Increased header padding</li>
                  <li>• Clean divider between chart and CAGR</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">CAGR Footer:</h4>
                <ul className="space-y-1">
                  <li>• Two-row layout design</li>
                  <li>• Row 1: Years and percentages (1Y: +26.2%)</li>
                  <li>• Row 2: Date ranges (Q1 2022 → Q4 2023)</li>
                  <li>• Supports 1Y, 3Y, and 5Y CAGR</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fundamentals Dashboard */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Fundamentals Dashboard</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">New design with taller charts and redesigned CAGR footer</CardDescription>
          </CardHeader>
          <CardContent>
            <FundamentalsDashboard
              data={testData}
              prices={testPrices}
              defaultPeriod="quarterly"
            />
          </CardContent>
        </Card>

        {/* Test Instructions */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-[var(--text-muted)]">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Verify Chart Display:</h4>
                <ul className="space-y-1">
                  <li>• All charts should be visible with bars/lines</li>
                  <li>• Price chart should show as a line (not bars)</li>
                  <li>• Charts should be taller than before</li>
                  <li>• Y-axis should show 5 equal ticks</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Verify CAGR Footer:</h4>
                <ul className="space-y-1">
                  <li>• Each card should have a CAGR section below the chart</li>
                  <li>• First row: "1Y: +X.X%", "3Y: +X.X%", "5Y: +X.X%"</li>
                  <li>• Second row: Date ranges like "Q1 2022 → Q4 2023"</li>
                  <li>• Text should be properly spaced and aligned</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Test Interactions:</h4>
                <ul className="space-y-1">
                  <li>• Try switching between Quarterly/TTM/Annual</li>
                  <li>• Try expanding/collapsing to see more data</li>
                  <li>• Hover over chart elements to see tooltips</li>
                  <li>• Check that CAGR calculations update correctly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
