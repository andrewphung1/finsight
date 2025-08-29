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

export default function TestBulletproofLayout() {
  const [selectedPeriod, setSelectedPeriod] = useState<'quarterly' | 'ttm' | 'annual'>('quarterly')
  const [isExpanded, setIsExpanded] = useState(false)
  const [controlsPosition, setControlsPosition] = useState<'top' | 'middle' | 'bottom'>('top')

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Bulletproof Layout Test</h1>
        <p className="text-muted-foreground mb-6">
          Testing the redesigned layout with bulletproof alignment and overflow prevention
        </p>
      </div>

      {/* Layout Controls */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Layout Controls:</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setControlsPosition('top')}
              className={`px-3 py-1 text-sm rounded ${
                controlsPosition === 'top' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Controls at Top
            </button>
            <button
              onClick={() => setControlsPosition('middle')}
              className={`px-3 py-1 text-sm rounded ${
                controlsPosition === 'middle' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Controls in Middle
            </button>
            <button
              onClick={() => setControlsPosition('bottom')}
              className={`px-3 py-1 text-sm rounded ${
                controlsPosition === 'bottom' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              Controls at Bottom
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Box */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Key Metrics Box:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-gray-600">Market Cap: $2.5T</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">P/E Ratio: 25.4</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">P/B Ratio: 3.2</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Free Cash Flow: $45.2B</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dividend Yield: 0.5%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Shares Outstanding: 15.7B</p>
            </div>
          </div>
        </div>
      </div>

      {/* ControlsBar - Positioned based on state */}
      {controlsPosition === 'top' && (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center bg-yellow-50 p-4 rounded-lg">
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
      )}

      {/* Charts Grid */}
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

      {/* ControlsBar - Middle position */}
      {controlsPosition === 'middle' && (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center bg-yellow-50 p-4 rounded-lg">
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
      )}

      {/* ControlsBar - Bottom position */}
      {controlsPosition === 'bottom' && (
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center bg-yellow-50 p-4 rounded-lg">
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
      )}

      {/* Test Results */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Bulletproof Layout Checklist:</h3>
          <ul className="text-sm space-y-1">
            <li>✅ Card root gap removed (no more flex flex-col gap-6)</li>
            <li>✅ Chart centering with proper margins and ResponsiveContainer</li>
            <li>✅ Hover highlights only the bar (cursor={false}, activeBar styling)</li>
            <li>✅ Grid lines always visible with consistent stroke</li>
            <li>✅ Zero baseline logic for mixed-sign series</li>
            <li>✅ CAGR strip as single row with 3 equal columns</li>
            <li>✅ TTM/Annual data flow fixed with proper sorting</li>
            <li>✅ Total Assets & Total Equity removed from METRICS</li>
            <li>✅ Controls moved to dedicated bar above dashboard grid</li>
            <li>✅ Annual filter fixed (not date.includes('A'))</li>
            <li>✅ CSS variables consolidated (no duplicate --card-header-h)</li>
          </ul>
        </div>
      </div>

      {/* CSS Variables Display */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">CSS Variables Used:</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>--card-h:</strong> 260px (total card height)
            </div>
            <div>
              <strong>--card-header-h:</strong> 48px (header height)
            </div>
            <div>
              <strong>--card-content-h:</strong> 170px (chart area height)
            </div>
            <div>
              <strong>--card-footer-h:</strong> 42px (footer height)
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Total: 48px + 170px + 1px divider + 42px = 261px (260px target)
          </p>
        </div>
      </div>
    </div>
  )
}
