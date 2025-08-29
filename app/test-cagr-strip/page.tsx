"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InlineCAGRStrip } from "@/components/charts/chart-scaffold"

// Test data with different periods
const quarterlyData = [
  { date: '2020-Q1', revenue: 1000000000 },
  { date: '2020-Q2', revenue: 1100000000 },
  { date: '2020-Q3', revenue: 1200000000 },
  { date: '2020-Q4', revenue: 1300000000 },
  { date: '2021-Q1', revenue: 1400000000 },
  { date: '2021-Q2', revenue: 1500000000 },
  { date: '2021-Q3', revenue: 1600000000 },
  { date: '2021-Q4', revenue: 1700000000 },
  { date: '2022-Q1', revenue: 1800000000 },
  { date: '2022-Q2', revenue: 1900000000 },
  { date: '2022-Q3', revenue: 2000000000 },
  { date: '2022-Q4', revenue: 2100000000 },
  { date: '2023-Q1', revenue: 2200000000 },
  { date: '2023-Q2', revenue: 2300000000 },
  { date: '2023-Q3', revenue: 2400000000 },
  { date: '2023-Q4', revenue: 2500000000 },
  { date: '2024-Q1', revenue: 2600000000 },
  { date: '2024-Q2', revenue: 2700000000 },
  { date: '2024-Q3', revenue: 2800000000 },
  { date: '2024-Q4', revenue: 2900000000 },
]

const annualData = [
  { date: '2020', revenue: 4000000000 },
  { date: '2021', revenue: 4500000000 },
  { date: '2022', revenue: 5000000000 },
  { date: '2023', revenue: 5500000000 },
  { date: '2024', revenue: 6000000000 },
]

const priceData = [
  { date: '2020-01-01', price: 100.00 },
  { date: '2020-07-01', price: 110.00 },
  { date: '2021-01-01', price: 120.00 },
  { date: '2021-07-01', price: 130.00 },
  { date: '2022-01-01', price: 140.00 },
  { date: '2022-07-01', price: 150.00 },
  { date: '2023-01-01', price: 160.00 },
  { date: '2023-07-01', price: 170.00 },
  { date: '2024-01-01', price: 180.00 },
  { date: '2024-07-01', price: 190.00 },
]

export default function TestCAGRStripPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">CAGR Strip Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing the new inline CAGR strip functionality</p>
        </div>

        {/* Quarterly Data Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Quarterly Data CAGR</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing CAGR calculation for quarterly data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Revenue CAGR:</h4>
                <InlineCAGRStrip data={quarterlyData} metric="revenue" period="quarterly" />
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                <p>Data points: {quarterlyData.length}</p>
                <p>Date range: {quarterlyData[0].date} to {quarterlyData[quarterlyData.length - 1].date}</p>
                <p>Expected: 1Y (4 quarters), 3Y (12 quarters), 5Y (20 quarters)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Annual Data Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Annual Data CAGR</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing CAGR calculation for annual data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Revenue CAGR:</h4>
                <InlineCAGRStrip data={annualData} metric="revenue" period="annual" />
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                <p>Data points: {annualData.length}</p>
                <p>Date range: {annualData[0].date} to {annualData[annualData.length - 1].date}</p>
                <p>Expected: 1Y, 3Y, 5Y (if sufficient data)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Data Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Price Data CAGR</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing CAGR calculation for price data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Price CAGR:</h4>
                <InlineCAGRStrip data={priceData} metric="price" period="quarterly" />
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                <p>Data points: {priceData.length}</p>
                <p>Date range: {priceData[0].date} to {priceData[priceData.length - 1].date}</p>
                <p>Price range: ${priceData[0].price} to ${priceData[priceData.length - 1].price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inline CAGR Strip Features */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Inline CAGR Strip Features</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Key features of the inline CAGR strip component</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Time Windows:</h4>
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  <li>• 1Y: Last 4 quarters or 1 year</li>
                  <li>• 3Y: Last 12 quarters or 3 years</li>
                  <li>• 5Y: Last 20 quarters or 5 years</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Display Format:</h4>
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  <li>• CAGR: +X.X% or -X.X%</li>
                  <li>• Period: (start → end)</li>
                  <li>• N/A if insufficient data</li>
                  <li>• Inline text with truncation</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Period Handling:</h4>
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  <li>• Quarterly: YYYY-Qn format</li>
                  <li>• TTM: YYYY-Qn format</li>
                  <li>• Annual: YYYY format</li>
                  <li>• Price: Uses quarterly logic</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Validation:</h4>
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  <li>• Requires ≥2 data points</li>
                  <li>• Positive values only</li>
                  <li>• Valid CAGR calculation</li>
                  <li>• Proper date formatting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
