"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  computeYAxisScale, 
  computeXAxisConfig, 
  formatTooltipTitle, 
  formatPreciseValue, 
  getMetricType,
  type PeriodType,
  type MetricType
} from "@/lib/chart-utils"

// Test data
const testData = [
  { date: '2022-Q1', revenue: 1000000000, eps: 1.20, sharesOutstanding: 1000000000 },
  { date: '2022-Q2', revenue: 1100000000, eps: 1.32, sharesOutstanding: 1000000000 },
  { date: '2022-Q3', revenue: 1200000000, eps: 1.44, sharesOutstanding: 1000000000 },
  { date: '2022-Q4', revenue: 1300000000, eps: 1.56, sharesOutstanding: 1000000000 },
  { date: '2023-Q1', revenue: 1400000000, eps: 1.68, sharesOutstanding: 1000000000 },
  { date: '2023-Q2', revenue: 1500000000, eps: 1.80, sharesOutstanding: 1000000000 },
  { date: '2023-Q3', revenue: 1600000000, eps: 1.92, sharesOutstanding: 1000000000 },
  { date: '2023-Q4', revenue: 1700000000, eps: 2.04, sharesOutstanding: 1000000000 },
  { date: '2024-Q1', revenue: 1800000000, eps: 2.16, sharesOutstanding: 1000000000 },
  { date: '2024-Q2', revenue: 1900000000, eps: 2.28, sharesOutstanding: 1000000000 },
]

const negativeData = [
  { date: '2022-Q1', revenue: 1000000000, eps: -0.05, sharesOutstanding: 1000000000 },
  { date: '2022-Q2', revenue: 1100000000, eps: 0.03, sharesOutstanding: 1000000000 },
  { date: '2022-Q3', revenue: 1200000000, eps: 1.44, sharesOutstanding: 1000000000 },
  { date: '2022-Q4', revenue: 1300000000, eps: 1.56, sharesOutstanding: 1000000000 },
]

export default function TestChartUtilsPage() {
  // Test Y-axis scale computation
  const revenueValues = testData.map(d => d.revenue)
  const epsValues = testData.map(d => d.eps)
  const sharesValues = testData.map(d => d.sharesOutstanding)
  
  const revenueScale = computeYAxisScale(revenueValues, 'currency')
  const epsScale = computeYAxisScale(epsValues, 'eps')
  const sharesScale = computeYAxisScale(sharesValues, 'shares')
  
  // Test negative data
  const negativeEpsValues = negativeData.map(d => d.eps)
  const negativeEpsScale = computeYAxisScale(negativeEpsValues, 'eps')
  
  // Test X-axis configuration
  const quarterlyXConfig = computeXAxisConfig(testData, 'quarterly')
  const annualXConfig = computeXAxisConfig(testData, 'annual')
  
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Chart Utilities Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing chart utility functions</p>
        </div>

        {/* Y-Axis Scale Tests */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Y-Axis Scale Tests</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing Y-axis scale computation with different metric types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Revenue (Currency):</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Domain: [{revenueScale.domain[0].toLocaleString()}, {revenueScale.domain[1].toLocaleString()}]</p>
                  <p className="text-[var(--text-muted)]">Ticks: {revenueScale.ticks.map(t => revenueScale.format(t)).join(', ')}</p>
                  <p className="text-[var(--text-muted)]">Step size: {(revenueScale.ticks[1] - revenueScale.ticks[0]).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">EPS:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Domain: [{epsScale.domain[0].toFixed(2)}, {epsScale.domain[1].toFixed(2)}]</p>
                  <p className="text-[var(--text-muted)]">Ticks: {epsScale.ticks.map(t => epsScale.format(t)).join(', ')}</p>
                  <p className="text-[var(--text-muted)]">Step size: {(epsScale.ticks[1] - epsScale.ticks[0]).toFixed(2)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Shares Outstanding:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Domain: [{sharesScale.domain[0].toLocaleString()}, {sharesScale.domain[1].toLocaleString()}]</p>
                  <p className="text-[var(--text-muted)]">Ticks: {sharesScale.ticks.map(t => sharesScale.format(t)).join(', ')}</p>
                  <p className="text-[var(--text-muted)]">Step size: {(sharesScale.ticks[1] - sharesScale.ticks[0]).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">EPS with Negatives:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Domain: [{negativeEpsScale.domain[0].toFixed(2)}, {negativeEpsScale.domain[1].toFixed(2)}]</p>
                  <p className="text-[var(--text-muted)]">Ticks: {negativeEpsScale.ticks.map(t => negativeEpsScale.format(t)).join(', ')}</p>
                  <p className="text-[var(--text-muted)]">Includes zero: {negativeEpsScale.domain[0] <= 0 && negativeEpsScale.domain[1] >= 0 ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* X-Axis Configuration Tests */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">X-Axis Configuration Tests</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing X-axis configuration for different periods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Quarterly Period:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Ticks: {quarterlyXConfig.ticks.length}</p>
                  <p className="text-[var(--text-muted)]">Labels: {quarterlyXConfig.labels.join(', ')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Annual Period:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Ticks: {annualXConfig.ticks.length}</p>
                  <p className="text-[var(--text-muted)]">Labels: {annualXConfig.labels.join(', ')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formatting Tests */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Formatting Tests</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing value formatting functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Precise Value Formatting:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Currency: {formatPreciseValue(1234567890, 'currency')}</p>
                  <p className="text-[var(--text-muted)]">EPS: {formatPreciseValue(1.2345, 'eps')}</p>
                  <p className="text-[var(--text-muted)]">Shares: {formatPreciseValue(1234567890, 'shares')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Tooltip Title Formatting:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">Quarterly: {formatTooltipTitle('2023-Q2', 'quarterly')}</p>
                  <p className="text-[var(--text-muted)]">TTM: {formatTooltipTitle('2023-Q2', 'ttm')}</p>
                  <p className="text-[var(--text-muted)]">Annual: {formatTooltipTitle('2023', 'annual')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric Type Detection */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Metric Type Detection</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing automatic metric type detection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Currency Metrics:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">revenue: {getMetricType('revenue')}</p>
                  <p className="text-[var(--text-muted)]">grossProfit: {getMetricType('grossProfit')}</p>
                  <p className="text-[var(--text-muted)]">totalAssets: {getMetricType('totalAssets')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Special Metrics:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">eps: {getMetricType('eps')}</p>
                  <p className="text-[var(--text-muted)]">sharesOutstanding: {getMetricType('sharesOutstanding')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Validation:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[var(--text-muted)]">All ticks equal spacing: {revenueScale.ticks.every((tick, i) => i === 0 || tick - revenueScale.ticks[i-1] === revenueScale.ticks[1] - revenueScale.ticks[0]) ? 'Yes' : 'No'}</p>
                  <p className="text-[var(--text-muted)]">Exactly 5 ticks: {revenueScale.ticks.length === 5 ? 'Yes' : 'No'}</p>
                  <p className="text-[var(--text-muted)]">Zero included for negatives: {negativeEpsScale.domain[0] <= 0 ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
