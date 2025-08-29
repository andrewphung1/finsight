"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getNiceDomainTicks, computeYAxisScale } from "@/lib/chart-utils"

// Simple test data
const testData = [100, 200, 300, 400, 500]

export default function TestSimplePage() {
  try {
    const niceResult = getNiceDomainTicks(testData, true, 5)
    const yAxisScale = computeYAxisScale(testData, 'currency')
    
    return (
      <div className="min-h-screen bg-[var(--bg-app)] p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Simple Chart Test</h1>
            <p className="text-[var(--text-muted)] mb-8">Testing basic chart utilities</p>
          </div>

          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Chart Utilities Test</CardTitle>
              <CardDescription className="text-[var(--text-muted)]">Testing if chart utilities are working</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Test Data:</h4>
                  <p className="text-[var(--text-muted)]">{JSON.stringify(testData)}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Nice Domain Result:</h4>
                  <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                    {JSON.stringify(niceResult, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2">Y-Axis Scale:</h4>
                  <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                    {JSON.stringify({
                      domain: yAxisScale.domain,
                      ticks: yAxisScale.ticks,
                      sampleFormat: yAxisScale.format(100)
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Error in Chart Utilities</h1>
            <p className="text-[var(--text-muted)] mb-8">There was an error testing the chart utilities</p>
          </div>
          
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Error Details</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-red-500 bg-red-50 p-4 rounded overflow-auto">
                {error instanceof Error ? error.message : String(error)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
}
