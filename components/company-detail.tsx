"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { FinSightLogo } from "@/components/ui/logo"
import { FundamentalsDashboard } from "@/components/charts/fundamentals-dashboard"
import type { FinancialDataPoint } from "@/data/mag7-stocks"
import { MAG7_STOCKS } from "@/data/mag7-stocks"
import { formatCompactCurrency, formatRatio, formatPercent, formatShares, isStale } from "@/lib/format-utils"
import { useFreeCashFlow } from "@/hooks/use-free-cash-flow"

interface CompanyDetailProps {
  ticker: string
  companyName: string
  currentPrice: number
  data: FinancialDataPoint[]
  annualData?: FinancialDataPoint[]
  priceSeries?: Array<{ date: string; price: number }>
  onBack: () => void
  companySnapshot?: {
    ticker: string
    price: number
    companyName: string
    marketCap: number
    peRatio: number
    sharesOutstanding: number
    asOf: Date
  } | null
  timePeriod?: 'quarterly' | 'ttm' | 'annual'
  onTimePeriodChange?: (period: 'quarterly' | 'ttm' | 'annual') => void
  isLoadingGoogleSheetData?: boolean
}

interface CompanyMetrics {
  marketCap: number
  peRatio: number
  pbRatio: number
  freeCashFlow: number
  dividendYield: number
  debtToEquity: number
}

// Mock data - in a real app, this would come from an API
const getCompanyMetrics = (ticker: string): CompanyMetrics => {
  const mockData: Record<string, CompanyMetrics> = {
    AAPL: {
      marketCap: 2.8e12,
      peRatio: 28.5,
      pbRatio: 12.3,
      freeCashFlow: 95.2e9,
      dividendYield: 0.5,
      debtToEquity: 1.2
    },
    MSFT: {
      marketCap: 2.9e12,
      peRatio: 32.1,
      pbRatio: 11.8,
      freeCashFlow: 63.4e9,
      dividendYield: 0.8,
      debtToEquity: 0.8
    },
    GOOGL: {
      marketCap: 1.8e12,
      peRatio: 25.7,
      pbRatio: 6.2,
      freeCashFlow: 69.1e9,
      dividendYield: 0,
      debtToEquity: 0.3
    },
    AMZN: {
      marketCap: 1.6e12,
      peRatio: 45.2,
      pbRatio: 8.9,
      freeCashFlow: 32.8e9,
      dividendYield: 0,
      debtToEquity: 1.1
    },
    TSLA: {
      marketCap: 750e9,
      peRatio: 65.3,
      pbRatio: 15.7,
      freeCashFlow: 8.9e9,
      dividendYield: 0,
      debtToEquity: 0.4
    }
  }
  
  return mockData[ticker] || {
    marketCap: 100e9,
    peRatio: 20.0,
    pbRatio: 3.0,
    freeCashFlow: 10e9,
    dividendYield: 2.0,
    debtToEquity: 0.5
  }
}



export function CompanyDetail({ ticker, companyName, currentPrice, data, annualData = [], priceSeries, onBack, companySnapshot, timePeriod = 'quarterly', onTimePeriodChange, isLoadingGoogleSheetData = false }: CompanyDetailProps) {
  const fallbackMetrics = getCompanyMetrics(ticker)
  const [priceChange, setPriceChange] = useState(2.45) // Mock price change
  const [sheetSnapshot, setSheetSnapshot] = useState<typeof companySnapshot>(companySnapshot)
  const [isExpanded, setIsExpanded] = useState(false)

  // Subscribe to GoogleSheetStore updates (client-side only)
  useEffect(() => {
    if (!ticker || typeof window === 'undefined') return

    let unsubscribe: (() => void) | undefined

    // Dynamically import to avoid SSR issues
    import('@/lib/google-sheet-store').then(({ googleSheetStore }) => {
      unsubscribe = googleSheetStore.subscribe(ticker, (snapshot) => {
        setSheetSnapshot(snapshot)
      })
    }).catch((error) => {
      console.error('Failed to load google-sheet-store:', error)
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [ticker])

  // Update sheetSnapshot when companySnapshot prop changes
  useEffect(() => {
    setSheetSnapshot(companySnapshot)
  }, [companySnapshot])

  // Calculate Free Cash Flow based on time period
  const { value: fcfValue, isEstimated: fcfEstimated } = useFreeCashFlow(data, timePeriod)

  // Use GoogleSheetStore data if available, otherwise fall back to mock data
  const metrics = {
    marketCap: (sheetSnapshot?.marketCap && sheetSnapshot.marketCap > 0) ? sheetSnapshot.marketCap : fallbackMetrics.marketCap,
    peRatio: (sheetSnapshot?.peRatio && sheetSnapshot.peRatio > 0) ? sheetSnapshot.peRatio : fallbackMetrics.peRatio,
    pbRatio: fallbackMetrics.pbRatio, // Not in Google Sheet, use fallback
    freeCashFlow: fcfValue || fallbackMetrics.freeCashFlow, // Use calculated FCF or fallback
    dividendYield: fallbackMetrics.dividendYield, // Not in Google Sheet, use fallback
    sharesOutstanding: (sheetSnapshot?.sharesOutstanding && sheetSnapshot.sharesOutstanding > 0) ? sheetSnapshot.sharesOutstanding : 1000000000 // Default fallback
  }

  // Use GoogleSheetStore price if available
  const displayPrice = sheetSnapshot?.price || currentPrice
  const displayCompanyName = sheetSnapshot?.companyName || companyName
  const isPriceStale = sheetSnapshot ? isStale(sheetSnapshot.asOf) : false

  // Data normalization helper for Fundamentals Dashboard
  const normalizeFinancialData = (data: FinancialDataPoint[]): any[] => {
    return data.map(point => ({
      date: point.date,
      revenue: point.revenue,
      grossProfit: point.grossProfit,
      ebitda: point.ebitda,
      operatingIncome: point.operatingIncome,
      netIncome: point.netIncome,
      freeCashFlow: point.freeCashFlow,
      totalAssets: point.totalAssets,
      totalEquity: point.totalEquity,
      totalDebt: point.totalDebt,
      totalCash: point.totalCash,
      eps: point.eps,
      sharesOutstanding: point.sharesOutstanding
    }))
  }

  // Prepare fundamentals data from the ticker-specific data
  const quarterlyFundamentals = data.length > 0 ? normalizeFinancialData(data) : []
  const annualFundamentals = annualData.length > 0 ? normalizeFinancialData(annualData) : []

  return (
    <div className="space-y-4">

      {/* Key Metrics Box - Same width as search bar */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="pb-1 text-center justify-center">
            <CardTitle className="text-xl">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground">
                    Market Cap: {isLoadingGoogleSheetData ? "Loading..." : formatCompactCurrency(metrics.marketCap)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground">
                    P/E Ratio: {isLoadingGoogleSheetData ? "Loading..." : formatRatio(metrics.peRatio)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground">
                    P/B Ratio: {formatRatio(metrics.pbRatio)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground">
                    Free Cash Flow: {formatCompactCurrency(metrics.freeCashFlow)}
                    {fcfEstimated && <span className="text-xs text-yellow-600 ml-1">(est)</span>}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground">
                    Dividend Yield: {metrics.dividendYield > 0 ? formatPercent(metrics.dividendYield) : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-base text-muted-foreground">
                    Shares Outstanding: {isLoadingGoogleSheetData ? "Loading..." : formatShares(metrics.sharesOutstanding)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Separator Line */}
      <div style={{ padding: '0 var(--card-x)' }}>
        <div className="border-t border-[var(--border-subtle)] my-8"></div>
      </div>

      {/* Charts Grid with Integrated Controls */}
      <FundamentalsDashboard 
        key={timePeriod} // Force remount when period changes
        data={{
          quarterly: quarterlyFundamentals,
          annual: annualFundamentals
        }}
        prices={priceSeries || []}
        selectedPeriod={timePeriod}
        onPeriodChange={onTimePeriodChange}
        isExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded(!isExpanded)}
        isLoadingPrices={!priceSeries || priceSeries.length === 0}
      />

      {/* Premium Features Card */}
      <div className="max-w-4xl mx-auto mt-8">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-blue-700 dark:text-blue-300">
              🚀 Premium Features
            </CardTitle>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Unlock advanced analytics and insights with Premium
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 premium-features-grid">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Advanced Analytics</h4>
                </div>
                <ul className="bullet-list text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <li>More Charted Key Metrics: Stock-Based Compensation, Categorized Revenue, and much more!</li>
                  <li>DCF Valuation Models & Calculators</li>
                  <li>Quality-Filtered Stock Specific News</li>
                  <li>Industry Peers Comparison</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200">Extended Coverage</h4>
                </div>
                <ul className="bullet-list text-sm text-purple-700 dark:text-purple-300 space-y-2">
                  <li>US + Global Stocks Support</li>
                  <li>Real-time Data</li>
                  <li>Earnings Calendar & Summarized Transcript Calls</li>
                  <li>News & Sentiment</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200">AI-Powered Insights</h4>
                </div>
                <ul className="bullet-list text-sm text-green-700 dark:text-green-300 space-y-2">
                  <li>AI Stock Analysis</li>
                  <li>Portfolio Optimization</li>
                  <li>Market Predictions</li>
                  <li>Custom Price Alerts</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Get Early Access
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Bottom spacing to ensure card doesn't align with page bottom */}
      <div className="h-16"></div>
    </div>
  )
}
