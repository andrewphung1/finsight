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

export default function TestFundamentalsFixesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Fundamentals Charts Fixes Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing all the fixes for bar rendering, annual toggle, and inline CAGR layout</p>
        </div>

        {/* Fixed Color Palette Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Fixed Color Palette Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing with fixed color palette: #ffa159, #47b2f1, #f17581, #7c83f8, #47b2f1, #c370c8</CardDescription>
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

        {/* Annual Toggle Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Annual Toggle Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing annual data with YYYY format labels</CardDescription>
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

        {/* Legacy Array Support Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Legacy Array Support Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing support for legacy flat array format</CardDescription>
          </CardHeader>
          <CardContent>
            <FundamentalsDashboard
              data={sampleQuarterlyData}
              prices={samplePriceData}
              defaultPeriod="quarterly"
            />
          </CardContent>
        </Card>

        {/* Zero Baseline Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Zero Baseline Test</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing mixed positive/negative data with zero baseline</CardDescription>
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

        {/* Fixes Verification */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Fixes Verification</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Verify that all fixes are implemented correctly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Bar/Line Rendering:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ Fixed color palette (no CSS vars)</li>
                    <li>✓ Removed pointer-events: none</li>
                    <li>✓ Removed opacity: 0 and fill: transparent</li>
                    <li>✓ Non-zero height for CardContent</li>
                    <li>✓ Bars and lines actually visible</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Data Plumbing & Annual Toggle:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ Supports both object shape and legacy array</li>
                    <li>✓ Quarterly → data.quarterly ?? []</li>
                    <li>✓ TTM → data.ttm or calculateTTM(data.quarterly)</li>
                    <li>✓ Annual → data.annual ?? []</li>
                    <li>✓ No double limitDataPoints call</li>
                    <li>✓ Annual labels show YYYY format</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Y-Axis Scale Hardening:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ All-positive → domain [0, niceMax]</li>
                    <li>✓ Mixed-sign → include 0 in ticks + ReferenceLine</li>
                    <li>✓ Guard against min === max with padding</li>
                    <li>✓ Always 5 ticks with top tick visible</li>
                    <li>✓ Step-aware formatting (B/M/T rules)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Inline CAGR Strip:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ One muted line (no pills/badges)</li>
                    <li>✓ Format: 1Y CAGR: +X.X% (START → END)</li>
                    <li>✓ Three spaces between segments</li>
                    <li>✓ Truncates with ellipsis</li>
                    <li>✓ Full string in title for hover</li>
                    <li>✓ Applied to Price card</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Price Card:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ First in METRICS array</li>
                    <li>✓ Line chart (no dots, strokeWidth 2)</li>
                    <li>✓ Same axis/tick rules as bar charts</li>
                    <li>✓ Tooltip shows date + price $0.00</li>
                    <li>✓ Uses same color as first bar</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Polish:</h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    <li>✓ Header titles: medium weight, left-aligned</li>
                    <li>✓ Comfortable top padding</li>
                    <li>✓ Dashed horizontal grid "3 3"</li>
                    <li>✓ No vertical grid lines</li>
                    <li>✓ Card height ~230px, plot area ~150px</li>
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
