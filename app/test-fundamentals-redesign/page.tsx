"use client"

import { FundamentalsDashboard } from "@/components/charts/fundamentals-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Sample fundamentals data for testing
const sampleQuarterlyData = [
  { date: '2022-Q1', revenue: 1000000000, grossProfit: 400000000, ebitda: 200000000, operatingIncome: 150000000, netIncome: 120000000, freeCashFlow: 100000000, totalAssets: 5000000000, totalEquity: 3000000000, totalDebt: 1000000000, totalCash: 500000000, eps: 1.20, sharesOutstanding: 1000000000 },
  { date: '2022-Q2', revenue: 1100000000, grossProfit: 440000000, ebitda: 220000000, operatingIncome: 165000000, netIncome: 132000000, freeCashFlow: 110000000, totalAssets: 5200000000, totalEquity: 3100000000, totalDebt: 1050000000, totalCash: 550000000, eps: 1.32, sharesOutstanding: 1000000000 },
  { date: '2022-Q3', revenue: 1200000000, grossProfit: 480000000, ebitda: 240000000, operatingIncome: 180000000, netIncome: 144000000, freeCashFlow: 120000000, totalAssets: 5400000000, totalEquity: 3200000000, totalDebt: 1100000000, totalCash: 600000000, eps: 1.44, sharesOutstanding: 1000000000 },
  { date: '2022-Q4', revenue: 1300000000, grossProfit: 520000000, ebitda: 260000000, operatingIncome: 195000000, netIncome: 156000000, freeCashFlow: 130000000, totalAssets: 5600000000, totalEquity: 3300000000, totalDebt: 1150000000, totalCash: 650000000, eps: 1.56, sharesOutstanding: 1000000000 },
  { date: '2023-Q1', revenue: 1400000000, grossProfit: 560000000, ebitda: 280000000, operatingIncome: 210000000, netIncome: 168000000, freeCashFlow: 140000000, totalAssets: 5800000000, totalEquity: 3400000000, totalDebt: 1200000000, totalCash: 700000000, eps: 1.68, sharesOutstanding: 1000000000 },
  { date: '2023-Q2', revenue: 1500000000, grossProfit: 600000000, ebitda: 300000000, operatingIncome: 225000000, netIncome: 180000000, freeCashFlow: 150000000, totalAssets: 6000000000, totalEquity: 3500000000, totalDebt: 1250000000, totalCash: 750000000, eps: 1.80, sharesOutstanding: 1000000000 },
  { date: '2023-Q3', revenue: 1600000000, grossProfit: 640000000, ebitda: 320000000, operatingIncome: 240000000, netIncome: 192000000, freeCashFlow: 160000000, totalAssets: 6200000000, totalEquity: 3600000000, totalDebt: 1300000000, totalCash: 800000000, eps: 1.92, sharesOutstanding: 1000000000 },
  { date: '2023-Q4', revenue: 1700000000, grossProfit: 680000000, ebitda: 340000000, operatingIncome: 255000000, netIncome: 204000000, freeCashFlow: 170000000, totalAssets: 6400000000, totalEquity: 3700000000, totalDebt: 1350000000, totalCash: 850000000, eps: 2.04, sharesOutstanding: 1000000000 },
  { date: '2024-Q1', revenue: 1800000000, grossProfit: 720000000, ebitda: 360000000, operatingIncome: 270000000, netIncome: 216000000, freeCashFlow: 180000000, totalAssets: 6600000000, totalEquity: 3800000000, totalDebt: 1400000000, totalCash: 900000000, eps: 2.16, sharesOutstanding: 1000000000 },
  { date: '2024-Q2', revenue: 1900000000, grossProfit: 760000000, ebitda: 380000000, operatingIncome: 285000000, netIncome: 228000000, freeCashFlow: 190000000, totalAssets: 6800000000, totalEquity: 3900000000, totalDebt: 1450000000, totalCash: 950000000, eps: 2.28, sharesOutstanding: 1000000000 },
]

const sampleAnnualData = [
  { date: '2020', revenue: 4000000000, grossProfit: 1600000000, ebitda: 800000000, operatingIncome: 600000000, netIncome: 480000000, freeCashFlow: 400000000, totalAssets: 20000000000, totalEquity: 12000000000, totalDebt: 4000000000, totalCash: 2000000000, eps: 4.80, sharesOutstanding: 1000000000 },
  { date: '2021', revenue: 4500000000, grossProfit: 1800000000, ebitda: 900000000, operatingIncome: 675000000, netIncome: 540000000, freeCashFlow: 450000000, totalAssets: 22000000000, totalEquity: 13000000000, totalDebt: 4500000000, totalCash: 2250000000, eps: 5.40, sharesOutstanding: 1000000000 },
  { date: '2022', revenue: 5000000000, grossProfit: 2000000000, ebitda: 1000000000, operatingIncome: 750000000, netIncome: 600000000, freeCashFlow: 500000000, totalAssets: 24000000000, totalEquity: 14000000000, totalDebt: 5000000000, totalCash: 2500000000, eps: 6.00, sharesOutstanding: 1000000000 },
  { date: '2023', revenue: 5500000000, grossProfit: 2200000000, ebitda: 1100000000, operatingIncome: 825000000, netIncome: 660000000, freeCashFlow: 550000000, totalAssets: 26000000000, totalEquity: 15000000000, totalDebt: 5500000000, totalCash: 2750000000, eps: 6.60, sharesOutstanding: 1000000000 },
  { date: '2024', revenue: 6000000000, grossProfit: 2400000000, ebitda: 1200000000, operatingIncome: 900000000, netIncome: 720000000, freeCashFlow: 600000000, totalAssets: 28000000000, totalEquity: 16000000000, totalDebt: 6000000000, totalCash: 3000000000, eps: 7.20, sharesOutstanding: 1000000000 },
]

// Sample price data for testing
const samplePriceData = [
  { date: '2022-01-01', price: 150.00 },
  { date: '2022-04-01', price: 165.00 },
  { date: '2022-07-01', price: 180.00 },
  { date: '2022-10-01', price: 175.00 },
  { date: '2023-01-01', price: 190.00 },
  { date: '2023-04-01', price: 210.00 },
  { date: '2023-07-01', price: 225.00 },
  { date: '2023-10-01', price: 240.00 },
  { date: '2024-01-01', price: 260.00 },
  { date: '2024-04-01', price: 280.00 },
  { date: '2024-07-01', price: 300.00 },
  { date: '2024-10-01', price: 320.00 },
]

// Sample data with negative values to test zero baseline
const sampleNegativeData = [
  { date: '2022-Q1', revenue: 1000000000, grossProfit: 400000000, ebitda: 200000000, operatingIncome: 150000000, netIncome: -50000000, freeCashFlow: -100000000, totalAssets: 5000000000, totalEquity: 3000000000, totalDebt: 1000000000, totalCash: 500000000, eps: -0.05, sharesOutstanding: 1000000000 },
  { date: '2022-Q2', revenue: 1100000000, grossProfit: 440000000, ebitda: 220000000, operatingIncome: 165000000, netIncome: 32000000, freeCashFlow: 10000000, totalAssets: 5200000000, totalEquity: 3100000000, totalDebt: 1050000000, totalCash: 550000000, eps: 0.03, sharesOutstanding: 1000000000 },
  { date: '2022-Q3', revenue: 1200000000, grossProfit: 480000000, ebitda: 240000000, operatingIncome: 180000000, netIncome: 144000000, freeCashFlow: 120000000, totalAssets: 5400000000, totalEquity: 3200000000, totalDebt: 1100000000, totalCash: 600000000, eps: 1.44, sharesOutstanding: 1000000000 },
  { date: '2022-Q4', revenue: 1300000000, grossProfit: 520000000, ebitda: 260000000, operatingIncome: 195000000, netIncome: 156000000, freeCashFlow: 130000000, totalAssets: 5600000000, totalEquity: 3300000000, totalDebt: 1150000000, totalCash: 650000000, eps: 1.56, sharesOutstanding: 1000000000 },
]

export default function TestFundamentalsRedesignPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Fundamentals Dashboard Redesign Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing the redesigned fundamentals charts with unified styling</p>
        </div>

        {/* Positive Data Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Positive Data Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing with positive values only - bars should sit on x-axis</CardDescription>
          </CardHeader>
          <CardContent>
            <FundamentalsDashboard
              data={{
                quarterly: sampleQuarterlyData,
                annual: sampleAnnualData
              }}
              prices={samplePriceData}
              defaultPeriod="quarterly"
            />
          </CardContent>
        </Card>

        {/* Negative Data Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Negative Data Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing with negative values - should show zero baseline</CardDescription>
          </CardHeader>
          <CardContent>
            <FundamentalsDashboard
              data={{
                quarterly: sampleNegativeData
              }}
              defaultPeriod="quarterly"
            />
          </CardContent>
        </Card>

        {/* Annual Data Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Annual Data Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing annual data with YYYY format</CardDescription>
          </CardHeader>
          <CardContent>
            <FundamentalsDashboard
              data={{
                annual: sampleAnnualData
              }}
              prices={samplePriceData}
              defaultPeriod="annual"
            />
          </CardContent>
        </Card>

        {/* Redesign Features Verification */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Redesign Features Verification</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Verify that all redesign requirements are implemented correctly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Card Header & Layout:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ Unified header style with left-aligned title</li>
                    <li>✓ Medium weight font for titles</li>
                    <li>✓ Proper top padding for "breathing room"</li>
                    <li>✓ Card height ~230px, plot area ~150px</li>
                    <li>✓ Thin divider below plot area</li>
                    <li>✓ No chip/pill housings for CAGR</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Inline CAGR Strip:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ Single inline text line per card</li>
                    <li>✓ Format: 1Y CAGR: +X.X% (START → END)</li>
                    <li>✓ Three spaces between segments</li>
                    <li>✓ Actual period labels (YYYY-Qn, YYYY)</li>
                    <li>✓ N/A for insufficient data</li>
                    <li>✓ Truncation with ellipsis on overflow</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Axis Rules:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ 5 equal-step ticks from nice-number domain</li>
                    <li>✓ Top tick always renders</li>
                    <li>✓ All-positive: domain min = 0, bars on x-axis</li>
                    <li>✓ Mixed-sign: symmetrical bounds, zero line</li>
                    <li>✓ Step-aware Y-axis formatting</li>
                    <li>✓ X-axis: YYYY-Qn for quarterly/TTM, YYYY for annual</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Price Card & Accessibility:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ Price card appears first (before Revenue)</li>
                    <li>✓ Line chart with no fill, no dots</li>
                    <li>✓ Same domain/tick rules as other charts</li>
                    <li>✓ Aria-labels on each card</li>
                    <li>✓ Keyboard focus styles visible</li>
                    <li>✓ Responsive design with em/rem units</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
