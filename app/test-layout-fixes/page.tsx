"use client"

import { useState } from "react"
import { FundamentalsDashboard } from "@/components/charts/fundamentals-dashboard"

// Mock data for testing
const mockQuarterlyData = [
  { date: '2023-Q1', revenue: 1000, grossProfit: 800, netIncome: 200, freeCashFlow: 150 },
  { date: '2023-Q2', revenue: 1100, grossProfit: 880, netIncome: 220, freeCashFlow: 165 },
  { date: '2023-Q3', revenue: 1200, grossProfit: 960, netIncome: 240, freeCashFlow: 180 },
  { date: '2023-Q4', revenue: 1300, grossProfit: 1040, netIncome: 260, freeCashFlow: 195 },
  { date: '2024-Q1', revenue: 1400, grossProfit: 1120, netIncome: 280, freeCashFlow: 210 },
  { date: '2024-Q2', revenue: 1500, grossProfit: 1200, netIncome: 300, freeCashFlow: 225 },
  { date: '2024-Q3', revenue: 1600, grossProfit: 1280, netIncome: 320, freeCashFlow: 240 },
  { date: '2024-Q4', revenue: 1700, grossProfit: 1360, netIncome: 340, freeCashFlow: 255 },
]

const mockAnnualData = [
  { date: '2020', revenue: 3500, grossProfit: 2800, netIncome: 700, freeCashFlow: 525 },
  { date: '2021', revenue: 4000, grossProfit: 3200, netIncome: 800, freeCashFlow: 600 },
  { date: '2022', revenue: 4500, grossProfit: 3600, netIncome: 900, freeCashFlow: 675 },
  { date: '2023', revenue: 5000, grossProfit: 4000, netIncome: 1000, freeCashFlow: 750 },
  { date: '2024', revenue: 5500, grossProfit: 4400, netIncome: 1100, freeCashFlow: 825 },
]

const mockPriceData = [
  { date: '2023-Q1', price: 150 },
  { date: '2023-Q2', price: 160 },
  { date: '2023-Q3', price: 170 },
  { date: '2023-Q4', price: 180 },
  { date: '2024-Q1', price: 190 },
  { date: '2024-Q2', price: 200 },
  { date: '2024-Q3', price: 210 },
  { date: '2024-Q4', price: 220 },
]

export default function TestLayoutFixes() {
  const [selectedPeriod, setSelectedPeriod] = useState<'quarterly' | 'ttm' | 'annual'>('quarterly')
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Layout Fixes Test</h1>
        <p className="text-muted-foreground mb-6">
          Testing the redesigned layout with proper data filtering and control synchronization
        </p>
      </div>

      {/* Test Controls */}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Financial Fundamentals</h2>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Time Period:</span>
            <div className="flex rounded-lg border bg-gray-100 p-1">
              <button
                onClick={() => setSelectedPeriod('quarterly')}
                className={`px-3 py-1 text-xs rounded ${
                  selectedPeriod === 'quarterly' ? 'bg-white shadow' : 'hover:bg-gray-200'
                }`}
              >
                Quarterly
              </button>
              <button
                onClick={() => setSelectedPeriod('ttm')}
                className={`px-3 py-1 text-xs rounded ${
                  selectedPeriod === 'ttm' ? 'bg-white shadow' : 'hover:bg-gray-200'
                }`}
              >
                TTM
              </button>
              <button
                onClick={() => setSelectedPeriod('annual')}
                className={`px-3 py-1 text-xs rounded ${
                  selectedPeriod === 'annual' ? 'bg-white shadow' : 'hover:bg-gray-200'
                }`}
              >
                Annual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Info */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Data Status:</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Quarterly:</strong> {mockQuarterlyData.length} points
              <br />
              <span className="text-gray-600">
                {mockQuarterlyData.slice(0, 2).map(p => p.date).join(', ')}...
              </span>
            </div>
            <div>
              <strong>Annual:</strong> {mockAnnualData.length} points
              <br />
              <span className="text-gray-600">
                {mockAnnualData.slice(0, 2).map(p => p.date).join(', ')}...
              </span>
            </div>
            <div>
              <strong>Current Period:</strong> {selectedPeriod}
              <br />
              <strong>Expanded:</strong> {isExpanded ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <FundamentalsDashboard 
        key={selectedPeriod} // Force remount when period changes
        data={{
          quarterly: mockQuarterlyData,
          annual: mockAnnualData
        }}
        prices={mockPriceData}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        isExpanded={isExpanded}
      />

      {/* Test Results */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Test Checklist:</h3>
          <ul className="text-sm space-y-1">
            <li>✅ Annual data filter fixed (looks for 4-digit years, not 'A')</li>
            <li>✅ Control sync fixed (key={selectedPeriod} forces remount)</li>
            <li>✅ FundamentalsDashboard is fully controlled</li>
            <li>✅ Prop names aligned (metric, not dataKey)</li>
            <li>✅ Debug logging added for troubleshooting</li>
            <li>✅ Layout properly structured with consistent spacing</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
