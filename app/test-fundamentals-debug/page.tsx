"use client"

import { useState, useMemo } from "react"
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

export default function TestFundamentalsDebugPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'quarterly' | 'ttm' | 'annual'>('quarterly')
  const [isExpanded, setIsExpanded] = useState(false)

  // Debug data processing
  const debugData = useMemo(() => {
    let rawData = sampleQuarterlyData

    // Sort by date and limit data points according to rules
    const sortedData = rawData.sort((a, b) => a.date.localeCompare(b.date))
    
    // When collapsed, show 8 data points; when expanded, show more
    const maxPoints = isExpanded ? 24 : 8
    const limitedData = sortedData.slice(-maxPoints)
    
    return {
      originalLength: rawData.length,
      sortedLength: sortedData.length,
      limitedLength: limitedData.length,
      limitedData: limitedData,
      maxPoints: maxPoints,
      isExpanded: isExpanded
    }
  }, [isExpanded])

  // Debug price data
  const debugPriceData = useMemo(() => {
    if (!samplePriceData || samplePriceData.length === 0) return { length: 0, data: [] }
    
    // Sort by date
    const sortedPrices = [...samplePriceData].sort((a, b) => a.date.localeCompare(b.date))
    
    // When collapsed, show 8 data points; when expanded, show more
    const maxPoints = isExpanded ? 24 : 8
    const limitedPrices = sortedPrices.slice(-maxPoints)
    
    return {
      originalLength: samplePriceData.length,
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
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Fundamentals Dashboard Debug</h1>
          <p className="text-[var(--text-muted)] mb-8">Debugging data processing issues</p>
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

        {/* Fundamentals Data Debug */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Fundamentals Data Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Data Processing:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Sample Data Point:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(debugData.limitedData[0], null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Data Debug */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Price Data Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Price Data Processing:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(debugPriceData, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Sample Price Point:</h4>
                <pre className="text-sm text-[var(--text-muted)] bg-[var(--bg-muted)] p-2 rounded">
                  {JSON.stringify(debugPriceData.limitedData[0], null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart Test */}
        <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Chart Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] border border-dashed border-gray-300 flex items-center justify-center">
              <p className="text-[var(--text-muted)]">Chart would render here</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[var(--text-muted)]">
                Data available: {debugData.limitedLength > 0 ? 'Yes' : 'No'}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Price data available: {debugPriceData.limitedLength > 0 ? 'Yes' : 'No'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
