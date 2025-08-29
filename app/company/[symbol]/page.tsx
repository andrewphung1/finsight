"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search } from "lucide-react"
import { AppShell } from "@/components/ui/app-shell"
import { CompanySearch } from "@/components/company-search"
import { CompanyDetail } from "@/components/company-detail"
import { FinSightLogo } from "@/components/ui/logo"
import { MAG7_STOCKS } from "@/data/mag7-stocks"

import { useGoogleSheetData } from "@/hooks/use-google-sheet-data"
import { isStale } from "@/lib/format-utils"
import { TickerLogo } from "@/components/ui/ticker-logo"
import { normalizeTicker } from "@/lib/logo-store"

export default function CompanyPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = normalizeTicker(params.symbol as string)
  const [activeTab, setActiveTab] = useState("search")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [priceSeries, setPriceSeries] = useState<Array<{ date: string; price: number }>>([])
  const [priceLoading, setPriceLoading] = useState(true)
  const [companySnapshot, setCompanySnapshot] = useState<any>(null)
  const [timePeriod, setTimePeriod] = useState<'quarterly' | 'ttm' | 'annual'>('quarterly')
  
  const { getCompanySnapshot, refreshData, isLoading: googleSheetLoading, error: googleSheetError } = useGoogleSheetData()
  
  // Find company data from MAG7_STOCKS (fallback)
  const companyData = MAG7_STOCKS[symbol]

  // Handle time period changes
  const handleTimePeriodChange = (period: 'quarterly' | 'ttm' | 'annual') => {
    setTimePeriod(period)
  }

  // Handle tab navigation - navigate to main dashboard for non-search tabs
  const handleTabChange = (tab: string) => {
    if (tab === "search") {
      setActiveTab(tab)
    } else {
      // Preserve import session parameters when navigating to main dashboard
      const currentUrl = new URL(window.location.href)
      const mode = currentUrl.searchParams.get('mode')
      const sid = currentUrl.searchParams.get('sid')
      
      let targetUrl = `/?tab=${tab}`
      if (mode === 'import' && sid) {
        targetUrl += `&mode=${mode}&sid=${sid}`
      }
      
      // Navigate to main dashboard with the selected tab
      router.push(targetUrl)
    }
  }

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("ui.sidebar")
    if (savedState) {
      setIsSidebarOpen(savedState === "open")
    }
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("ui.sidebar", isSidebarOpen ? "open" : "closed")
  }, [isSidebarOpen])

  // Fetch company snapshot from GoogleSheetStore when symbol changes (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const fetchCompanySnapshot = async () => {
      if (symbol) {
        try {
          console.log(`CompanyPage: Fetching GoogleSheet data for ${symbol}`)
          
          // Get snapshot (will use cached data if available and fresh)
          const snapshot = await getCompanySnapshot(symbol)
          console.log(`CompanyPage: Snapshot received for ${symbol}:`, snapshot)
          
          // Add asOf property to match the expected interface
          const snapshotWithAsOf = snapshot ? {
            ...snapshot,
            asOf: new Date() // Use current date as fallback
          } : null
          
          setCompanySnapshot(snapshotWithAsOf)
          
          console.log(`CompanyPage: Received GoogleSheet data for ${symbol}:`, {
            marketCap: snapshot?.marketCap,
            peRatio: snapshot?.peRatio,
            sharesOutstanding: snapshot?.sharesOutstanding
          })
        } catch (error) {
          console.error('Error fetching company snapshot:', error)
          // Don't throw the error, just log it and continue
        }
      }
    }
    
    fetchCompanySnapshot()
  }, [symbol, getCompanySnapshot])

  // Fetch price series when symbol changes
  useEffect(() => {
    const fetchPriceSeries = async () => {
      if (!symbol) return
      try {
        const today = new Date().toISOString().split('T')[0]
        const res = await fetch(`/api/prices/${symbol}?start=2018-01-01&end=${today}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setPriceSeries(json.prices ?? [])
        console.log('CompanyPage: Acceptance check', {
          symbol, seriesLength: (json.prices ?? []).length,
          lastDate: (json.prices ?? [])[json.prices.length - 1]?.date
        })
      } catch (err) {
        console.error('Error fetching price series:', err)
        setPriceSeries([])
      }
    }
    fetchPriceSeries()
  }, [symbol])
  
  if (!companyData) {
    return (
      <AppShell 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        <div className="page-container p-4 bg-[var(--bg-app)]">
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm rounded-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-muted-foreground">Company not found</h1>
                <p className="text-muted-foreground">The company "{params.symbol}" could not be found.</p>
                <Button 
                  onClick={() => router.push('/')} 
                  className="mt-4"
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return (
          <div className="page-container space-y-4 bg-[var(--bg-app)] pt-8">
                    {/* Content container: controls horizontal gutters for Key Metrics */}
        <div className="w-full">
              {/* Company Search */}
              <CompanySearch />

              {/* Company Name Header - Centered and Vertically Aligned */}
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <TickerLogo
                    ticker={companyData.symbol}
                    size={48}
                    rounded={true}
                    decorative={true}
                  />
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">{companyData.name}</h1>
                  </div>
                </div>
                
                <p className="text-lg text-[var(--text-muted)]">${companyData.symbol}</p>
                
                <div className="inline-block bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-[var(--border-subtle)] rounded-full px-6 py-3 shadow-sm backdrop-blur-sm relative">
                  <span className="text-2xl font-bold text-[var(--text-primary)] bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ${(companySnapshot?.price || companyData.currentPrice).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Company Details */}
              
              <CompanyDetail
                ticker={companyData.symbol}
                companyName={companyData.name}
                data={companyData.quarterly}
                annualData={companyData.annual}
                currentPrice={companyData.currentPrice}
                priceSeries={priceSeries}
                onBack={() => {
                  // Preserve import session parameters when going back
                  const currentUrl = new URL(window.location.href)
                  const mode = currentUrl.searchParams.get('mode')
                  const sid = currentUrl.searchParams.get('sid')
                  
                  let targetUrl = '/'
                  if (mode === 'import' && sid) {
                    targetUrl += `?mode=${mode}&sid=${sid}&tab=overview`
                  }
                  
                  router.push(targetUrl)
                }}
                companySnapshot={companySnapshot}
                timePeriod={timePeriod}
                onTimePeriodChange={handleTimePeriodChange}
                isLoadingGoogleSheetData={googleSheetLoading}
              />
            </div>
          </div>
        )
      
      default:
        return (
          <div className="page-container p-4 bg-[var(--bg-app)]">
            <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm rounded-2xl">
              <CardContent className="p-8">
                <div className="text-center">
                  <p className="text-[var(--text-muted)]">Please select a tab to view content</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  // Show loading state while GoogleSheetStore is initializing
  if (googleSheetLoading && !companySnapshot) {
    return (
      <AppShell 
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        <div className="page-container p-4 bg-[var(--bg-app)]">
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm rounded-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-muted-foreground">Loading company data...</h1>
                <p className="text-muted-foreground">Fetching latest data from Google Sheet</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell 
      isOpen={isSidebarOpen}
      onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="bg-[var(--bg-app)]">
        {renderContent()}
      </div>
    </AppShell>
  )
}
