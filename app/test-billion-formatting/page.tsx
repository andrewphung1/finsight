"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  formatCurrencyWithBillionRule, 
  getNiceDomainAndTicks,
  computeYAxisScale,
  type MetricType
} from "@/lib/chart-utils"

// Test data with different magnitudes
const testCases = [
  {
    name: "Large Billions (≥5B step)",
    data: [10000000000, 15000000000, 20000000000, 25000000000, 30000000000], // 10B to 30B
    expectedStep: 5000000000 // 5B step
  },
  {
    name: "Small Billions (<5B step)",
    data: [1000000000, 1500000000, 2000000000, 2500000000, 3000000000], // 1B to 3B
    expectedStep: 500000000 // 0.5B step
  },
  {
    name: "Millions (≥5M step)",
    data: [10000000, 15000000, 20000000, 25000000, 30000000], // 10M to 30M
    expectedStep: 5000000 // 5M step
  },
  {
    name: "Small Millions (<5M step)",
    data: [1000000, 1500000, 2000000, 2500000, 3000000], // 1M to 3M
    expectedStep: 500000 // 0.5M step
  },
  {
    name: "Thousands (≥5K step)",
    data: [10000, 15000, 20000, 25000, 30000], // 10K to 30K
    expectedStep: 5000 // 5K step
  },
  {
    name: "Small Thousands (<5K step)",
    data: [1000, 1500, 2000, 2500, 3000], // 1K to 3K
    expectedStep: 500 // 0.5K step
  }
]

export default function TestBillionFormattingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Billion Rule Formatting Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Testing the new billion rule formatting logic</p>
        </div>

        {/* Billion Rule Explanation */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Billion Rule Logic</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">How the formatting works based on step size</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Large Steps (≥5 units):</h4>
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  <li>≥5T → XXT (no decimals)</li>
                  <li>≥5B → XXB (no decimals)</li>
                  <li>≥5M → XXM (no decimals)</li>
                  <li>≥5K → XXK (no decimals)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Small Steps (&lt;5 units):</h4>
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  <li>&lt;5T → XX.XT (one decimal)</li>
                  <li>&lt;5B → XX.XB (one decimal)</li>
                  <li>&lt;5M → XX.XM (one decimal)</li>
                  <li>&lt;5K → XX.XK (one decimal)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Cases */}
        {testCases.map((testCase, index) => {
          const minValue = Math.min(...testCase.data)
          const maxValue = Math.max(...testCase.data)
          const result = getNiceDomainAndTicks(minValue, maxValue, true, 5)
          
          return (
            <Card key={index} className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-primary)]">{testCase.name}</CardTitle>
                <CardDescription className="text-[var(--text-muted)]">
                  Data range: {minValue.toLocaleString()} to {maxValue.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-2">Domain & Ticks:</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-[var(--text-muted)]">Domain: [{result.domain[0].toLocaleString()}, {result.domain[1].toLocaleString()}]</p>
                      <p className="text-[var(--text-muted)]">Step: {result.step.toLocaleString()}</p>
                      <p className="text-[var(--text-muted)]">Ticks: {result.ticks.length}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-2">Formatted Ticks:</h4>
                    <div className="space-y-1 text-sm">
                      {result.ticks.map((tick, i) => (
                        <p key={i} className="text-[var(--text-muted)]">
                          {i}: {formatCurrencyWithBillionRule(tick, result.step)}
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-2">Validation:</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-[var(--text-muted)]">
                        Step ≥ 5B: {result.step >= 5e9 ? 'Yes' : 'No'}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        Step ≥ 5M: {result.step >= 5e6 ? 'Yes' : 'No'}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        Step ≥ 5K: {result.step >= 5e3 ? 'Yes' : 'No'}
                      </p>
                      <p className="text-[var(--text-muted)]">
                        Equal spacing: {result.ticks.every((tick, i) => i === 0 || tick - result.ticks[i-1] === result.step) ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Y-Axis Scale Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Y-Axis Scale Integration</CardTitle>
            <CardDescription className="text-[var(--text-muted)]">Testing the complete Y-axis scale computation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testCases.slice(0, 2).map((testCase, index) => {
                const yAxisScale = computeYAxisScale(testCase.data, 'currency')
                
                return (
                  <div key={index}>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-2">{testCase.name}:</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-[var(--text-muted)]">Domain: [{yAxisScale.domain[0].toLocaleString()}, {yAxisScale.domain[1].toLocaleString()}]</p>
                      <p className="text-[var(--text-muted)]">Ticks: {yAxisScale.ticks.map(t => yAxisScale.format(t)).join(', ')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
