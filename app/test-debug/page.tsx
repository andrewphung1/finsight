"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Simple test data
const testData = [
  { date: '2022-Q1', revenue: 1000000000, grossProfit: 400000000 },
  { date: '2022-Q2', revenue: 1100000000, grossProfit: 440000000 },
  { date: '2022-Q3', revenue: 1200000000, grossProfit: 480000000 },
  { date: '2022-Q4', revenue: 1300000000, grossProfit: 520000000 },
]

const testPrices = [
  { date: '2022-01-01', price: 150.00 },
  { date: '2022-04-01', price: 165.00 },
  { date: '2022-07-01', price: 180.00 },
  { date: '2022-10-01', price: 175.00 },
]

export default function TestDebugPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'quarterly' | 'ttm' | 'annual'>('quarterly')
  const [isExpanded, setIsExpanded] = useState(false)

  // Debug data processing
  const debugData = useMemo(() => {
    console.log('Debug: Processing data for period:', selectedPeriod)
    console.log('Debug: Test data:', testData)
    
    let rawData = testData
    console.log('Debug: Raw data length:', rawData.length)
    
    // Sort by date ascending
    const sortedData = rawData.sort((a, b) => a.date.localeCompare(b.date))
    console.log('Debug: Sorted data:', sortedData)
    
    // Determine max points
    const maxPoints = isExpanded ? 24 : 8
    console.log('Debug: Max points:', maxPoints)
    
    // Take the last N points
    const limitedData = sortedData.slice(-maxPoints)
    console.log('Debug: Limited data:', limitedData)
    
    return {
      originalLength: rawData.length,
      sortedLength: sortedData.length,
      limitedLength: limitedData.length,
      limitedData: limitedData,
      maxPoints: maxPoints,
      isExpanded: isExpanded
    }
  }, [selectedPeriod, isExpanded])

  // Debug price data
  const debugPriceData = useMemo(() => {
    console.log('Debug: Processing price data')
    console.log('Debug: Test prices:', testPrices)
    
    if (!testPrices || testPrices.length === 0) {
      console.log('Debug: No price data available')
      return { length: 0, data: [] }
    }
    
    // Sort by date
    const sortedPrices = [...testPrices].sort((a, b) => a.date.localeCompare(b.date))
    console.log('Debug: Sorted prices:', sortedPrices)
    
    // Determine max points
    const maxPoints = isExpanded ? 24 : 8
    const limitedPrices = sortedPrices.slice(-maxPoints)
    console.log('Debug: Limited prices:', limitedPrices)
    
    return {
      originalLength: testPrices.length,
      sortedLength: sortedPrices.length,
      limitedLength: limitedPrices.length,
      limitedData: limitedPrices,
      maxPoints: maxPoints
    }
  }, [isExpanded])

  return (
    <div className="min-h-screen bg-[var(--bg-app)] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Debug Test</h1>
          <p className="text-[var(--text-muted)] mb-8">Debugging fundamentals dashboard data processing</p>
        </div>

        {/* Controls */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="px-4 py-2 border rounded"
              >
                <option value="quarterly">Quarterly</option>
                <option value="ttm">TTM</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Data Debug */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Data Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Fundamentals Data:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Price Data:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(debugPriceData, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simple Chart Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Simple Chart Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] border border-dashed border-gray-300 flex items-center justify-center">
              <p className="text-[var(--text-muted)]">Chart would render here</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[var(--text-muted)]">
                Fundamentals data available: {debugData.limitedLength > 0 ? 'Yes' : 'No'} ({debugData.limitedLength} points)
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Price data available: {debugPriceData.limitedLength > 0 ? 'Yes' : 'No'} ({debugPriceData.limitedLength} points)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
