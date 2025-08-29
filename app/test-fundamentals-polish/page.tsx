"use client"

import { FundamentalsDashboard } from "@/components/charts/fundamentals-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Test data for the polish verification
const testData = {
  quarterly: [
    { date: '2022-Q1', revenue: 1000000000, grossProfit: 400000000, ebitda: 200000000, operatingIncome: 150000000, netIncome: 120000000, freeCashFlow: 100000000, totalDebt: 1000000000, totalCash: 500000000, eps: 1.20, sharesOutstanding: 1000000000 },
    { date: '2022-Q2', revenue: 1100000000, grossProfit: 440000000, ebitda: 220000000, operatingIncome: 165000000, netIncome: 132000000, freeCashFlow: 110000000, totalDebt: 1050000000, totalCash: 550000000, eps: 1.32, sharesOutstanding: 1000000000 },
    { date: '2022-Q3', revenue: 1200000000, grossProfit: 480000000, ebitda: 240000000, operatingIncome: 180000000, netIncome: 144000000, freeCashFlow: 120000000, totalDebt: 1100000000, totalCash: 600000000, eps: 1.44, sharesOutstanding: 1000000000 },
    { date: '2022-Q4', revenue: 1300000000, grossProfit: 520000000, ebitda: 260000000, operatingIncome: 195000000, netIncome: 156000000, freeCashFlow: 130000000, totalDebt: 1150000000, totalCash: 650000000, eps: 1.56, sharesOutstanding: 1000000000 },
    { date: '2023-Q1', revenue: 1400000000, grossProfit: 560000000, ebitda: 280000000, operatingIncome: 210000000, netIncome: 168000000, freeCashFlow: 140000000, totalDebt: 1200000000, totalCash: 700000000, eps: 1.68, sharesOutstanding: 1000000000 },
    { date: '2023-Q2', revenue: 1500000000, grossProfit: 600000000, ebitda: 300000000, operatingIncome: 225000000, netIncome: 180000000, freeCashFlow: 150000000, totalDebt: 1250000000, totalCash: 750000000, eps: 1.80, sharesOutstanding: 1000000000 },
    { date: '2023-Q3', revenue: 1600000000, grossProfit: 640000000, ebitda: 320000000, operatingIncome: 240000000, netIncome: 192000000, freeCashFlow: 160000000, totalDebt: 1300000000, totalCash: 800000000, eps: 1.92, sharesOutstanding: 1000000000 },
    { date: '2023-Q4', revenue: 1700000000, grossProfit: 680000000, ebitda: 340000000, operatingIncome: 255000000, netIncome: 204000000, freeCashFlow: 170000000, totalDebt: 1350000000, totalCash: 850000000, eps: 2.04, sharesOutstanding: 1000000000 },
  ],
  annual: [
    { date: '2022', revenue: 4600000000, grossProfit: 1840000000, ebitda: 920000000, operatingIncome: 690000000, netIncome: 552000000, freeCashFlow: 460000000, totalDebt: 1150000000, totalCash: 850000000, eps: 5.52, sharesOutstanding: 1000000000 },
    { date: '2023', revenue: 6200000000, grossProfit: 2480000000, ebitda: 1240000000, operatingIncome: 930000000, netIncome: 744000000, freeCashFlow: 620000000, totalDebt: 1350000000, totalCash: 850000000, eps: 7.44, sharesOutstanding: 1000000000 },
  ]
}

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

export default function TestFundamentalsPolishPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Fundamentals Charts Polish Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Comprehensive test of all polish and fixes</p>
        </div>

        {/* Test Instructions */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">QA Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[var(--text-muted)]">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Header & Layout:</h4>
                <ul className="space-y-1">
                  <li>• All headers identical height (48px)</li>
                  <li>• Titles vertically centered</li>
                  <li>• Titles truncate with ellipsis if too long</li>
                  <li>• Consistent top padding</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Hover & Interaction:</h4>
                <ul className="space-y-1">
                  <li>• Hover highlights only the bar (not whole column)</li>
                  <li>• Tooltip cursor is transparent</li>
                  <li>• Pointer events enabled on charts</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">CAGR Layout:</h4>
                <ul className="space-y-1">
                  <li>• Thin solid divider below chart</li>
                  <li>• 3-column grid layout</li>
                  <li>• Each column: percentage on top, date range below</li>
                  <li>• Center-aligned text in each column</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Data & Periods:</h4>
                <ul className="space-y-1">
                  <li>• Quarterly data plots correctly</li>
                  <li>• TTM computes from quarterly if not provided</li>
                  <li>• Annual data plots correctly</li>
                  <li>• X-axis labels: YYYY-Qn for Q/TTM, YYYY for Annual</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Controls:</h4>
                <ul className="space-y-1">
                  <li>• Controls row above the grid (not in cards)</li>
                  <li>• Expand/Collapse on left</li>
                  <li>• Time Period toggle on right</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Visual Polish:</h4>
                <ul className="space-y-1">
                  <li>• 5 dashed horizontal grid lines always visible</li>
                  <li>• Total Assets and Total Equity removed</li>
                  <li>• Compact chart height (~150px plot, ~230px card)</li>
                  <li>• Price chart: line with no dots, stroke width 2</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fundamentals Dashboard */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Fundamentals Dashboard</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing all polish and fixes</CardDescription>
          </CardHeader>
          <CardContent>
            <FundamentalsDashboard
              data={testData}
              prices={testPrices}
              defaultPeriod="quarterly"
            />
          </CardContent>
        </Card>

        {/* Test Data Info */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Test Data Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-[var(--text-muted)]">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Data Structure:</h4>
                <ul className="space-y-1">
                  <li>• Quarterly: 8 data points (2022-Q1 to 2023-Q4)</li>
                  <li>• Annual: 2 data points (2022, 2023)</li>
                  <li>• TTM: Will be computed from quarterly data</li>
                  <li>• Price: 8 data points with daily dates</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Expected Behavior:</h4>
                <ul className="space-y-1">
                  <li>• Try switching between Quarterly/TTM/Annual periods</li>
                  <li>• Try expanding/collapsing to see more data</li>
                  <li>• Hover over bars to see tooltips</li>
                  <li>• Verify CAGR calculations update correctly</li>
                  <li>• Check that all 5 grid lines are visible</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
