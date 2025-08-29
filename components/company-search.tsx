"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, Building2, ChevronDown, X, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAG7_STOCKS, MAG7_SYMBOLS } from "@/data/mag7-stocks"
import { useToast } from "@/hooks/use-toast"
import { FinSightLogo } from "@/components/ui/logo"
import { useGoogleSheetData } from "@/hooks/use-google-sheet-data"
import { TickerLogo } from "@/components/ui/ticker-logo"
import { useDebouncedClick } from "@/lib/hooks/use-debounced-click"

interface SearchResult {
  symbol: string
  name: string
  type: string
}

interface CompanySearchProps {
  onCompanySelect?: (company: { ticker: string; name: string; data: any[]; price: number }) => void
}

export function CompanySearch({ onCompanySelect }: CompanySearchProps) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [selectedOption, setSelectedOption] = useState<SearchResult | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { searchCompanies, isLoading: googleSheetLoading, error: googleSheetError } = useGoogleSheetData()
  const debouncedClick = useDebouncedClick()

  // Reset component state when component mounts or when user navigates back
  useEffect(() => {
    setSelectedOption(null)
    setQuery("")
    setSearchResults([])
    setShowDropdown(false)
    setHighlightedIndex(-1)
    setError("")
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim() && query.length >= 2) {
        handleSearchSuggestions()
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (showDropdown && highlightedIndex >= 0 && searchResults.length > 0) {
        handleSelectOption(searchResults[highlightedIndex])
      } else {
        handleSearch()
      }
      return
    }

    if (!showDropdown || searchResults.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1))
        break
      case "Escape":
        setShowDropdown(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleSearchSuggestions = async () => {
    if (!query.trim()) return

    setSearchLoading(true)
    setError("")

    try {
      // First try GoogleSheetStore
      const googleResults = await searchCompanies(query.trim())
      
      // Also check MAG7_STOCKS for exact matches
      const normalizedQuery = query.trim().toUpperCase()
      const mag7Matches = MAG7_SYMBOLS.filter(symbol => 
        symbol.includes(normalizedQuery) || 
        MAG7_STOCKS[symbol].name.toLowerCase().includes(query.toLowerCase())
      ).map(symbol => ({
        ticker: symbol,
        companyName: MAG7_STOCKS[symbol].name
      }))

      // Combine and deduplicate results
      const allResults = [...googleResults, ...mag7Matches]
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.ticker === result.ticker)
      )
      
      const searchResults: SearchResult[] = uniqueResults.map(company => ({
        symbol: company.ticker,
        name: company.companyName || `${company.ticker} Corporation`,
        type: "Stock"
      }))
      
      setSearchResults(searchResults)
      setShowDropdown(searchResults.length > 0)
      setHighlightedIndex(-1)
      
      if (searchResults.length === 0) {
        // Check if the query looks like a ticker symbol but is not a MAG7 stock
        const normalizedQuery = query.trim().toUpperCase()
        const isMAG7Stock = MAG7_SYMBOLS.includes(normalizedQuery)
        
        if (!isMAG7Stock && /^[A-Z]{1,5}$/.test(normalizedQuery)) {
          // It looks like a ticker symbol but is not a MAG7 stock
          setError("Demo version only supports MAG7 stocks (AAPL, MSFT, GOOG, AMZN, NVDA, TSLA, META)")
        } else {
          toast({
            title: "No results found",
            description: "No companies found matching your search.",
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
      setShowDropdown(false)
    } finally {
      setSearchLoading(false)
    }
  }

  const router = useRouter()

  const handleSelectOption = (result: SearchResult) => {
    setSelectedOption(null) // Reset immediately since we're navigating away
    setQuery("")
    setSearchResults([])
    setShowDropdown(false)
    setHighlightedIndex(-1)
    setError("")
    
    // Preserve import session parameters if they exist
    const currentUrl = new URL(window.location.href)
    const mode = currentUrl.searchParams.get('mode')
    const sid = currentUrl.searchParams.get('sid')
    
    let targetUrl = `/company/${result.symbol}`
    if (mode === 'import' && sid) {
      targetUrl += `?mode=${mode}&sid=${sid}`
    }
    
    // Navigate to the company page with preserved session parameters
    router.push(targetUrl)
  }

  const handleSearch = () => {
    if (selectedOption) {
      const symbol = selectedOption.symbol
      setSelectedOption(null)
      setQuery("")
      setSearchResults([])
      setShowDropdown(false)
      setHighlightedIndex(-1)
      setError("")
      
      // Preserve import session parameters if they exist
      const currentUrl = new URL(window.location.href)
      const mode = currentUrl.searchParams.get('mode')
      const sid = currentUrl.searchParams.get('sid')
      
      let targetUrl = `/company/${symbol}`
      if (mode === 'import' && sid) {
        targetUrl += `?mode=${mode}&sid=${sid}`
      }
      
      router.push(targetUrl)
    } else if (query.trim()) {
      // Try to find a match for the query in search results
      const match = searchResults.find(result => 
        result.symbol.toLowerCase() === query.toLowerCase() ||
        result.name.toLowerCase().includes(query.toLowerCase())
      )
      
      if (match) {
        setSelectedOption(null)
        setQuery("")
        setSearchResults([])
        setShowDropdown(false)
        setHighlightedIndex(-1)
        setError("")
        
        // Preserve import session parameters if they exist
        const currentUrl = new URL(window.location.href)
        const mode = currentUrl.searchParams.get('mode')
        const sid = currentUrl.searchParams.get('sid')
        
        let targetUrl = `/company/${match.symbol}`
        if (mode === 'import' && sid) {
          targetUrl += `?mode=${mode}&sid=${sid}`
        }
        
        router.push(targetUrl)
      } else {
        // Fallback: check if it's a MAG7 stock
        const normalizedQuery = query.trim().toUpperCase()
        const mag7Match = MAG7_SYMBOLS.find(symbol => 
          symbol === normalizedQuery || 
          symbol.includes(normalizedQuery) ||
          MAG7_STOCKS[symbol].name.toLowerCase().includes(query.toLowerCase())
        )
        
        if (mag7Match) {
          setSelectedOption(null)
          setQuery("")
          setSearchResults([])
          setShowDropdown(false)
          setHighlightedIndex(-1)
          setError("")
          
          // Preserve import session parameters if they exist
          const currentUrl = new URL(window.location.href)
          const mode = currentUrl.searchParams.get('mode')
          const sid = currentUrl.searchParams.get('sid')
          
          let targetUrl = `/company/${mag7Match}`
          if (mode === 'import' && sid) {
            targetUrl += `?mode=${mode}&sid=${sid}`
          }
          
          router.push(targetUrl)
        } else {
          // Check if the query looks like a ticker symbol but is not a MAG7 stock
          const normalizedQuery = query.trim().toUpperCase()
          const isMAG7Stock = MAG7_SYMBOLS.includes(normalizedQuery)
          
          if (!isMAG7Stock && /^[A-Z]{1,5}$/.test(normalizedQuery)) {
            // It looks like a ticker symbol but is not a MAG7 stock
            setError("Demo version only supports MAG7 stocks (AAPL, MSFT, GOOG, AMZN, NVDA, TSLA, META)")
          } else {
            setError("No matching company found")
          }
        }
      }
    }
  }

  const handleBackToSearch = () => {
    setSelectedOption(null)
    setQuery("")
    setSearchResults([])
    setShowDropdown(false)
    setError("")
  }

  const getCompanyLogoUrl = (symbol: string) => {
    return `https://logo.clearbit.com/${symbol.toLowerCase()}.com`
  }

  const handleMAG7Select = (symbol: string) => {
    const stock = MAG7_STOCKS[symbol]
    const result: SearchResult = {
      symbol,
      name: stock.name,
      type: stock.sector
    }
    // Reset state immediately and navigate
    setSelectedOption(null)
    setQuery("")
    setSearchResults([])
    setShowDropdown(false)
    setHighlightedIndex(-1)
    setError("")
    
    // Preserve import session parameters if they exist
    const currentUrl = new URL(window.location.href)
    const mode = currentUrl.searchParams.get('mode')
    const sid = currentUrl.searchParams.get('sid')
    
    let targetUrl = `/company/${symbol}`
    if (mode === 'import' && sid) {
      targetUrl += `?mode=${mode}&sid=${sid}`
    }
    
    router.push(targetUrl)
  }

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return `$${value.toLocaleString()}`
  }

  const formatPercent = (value: number) => `${value.toFixed(2)}%`

  // If a company is selected, show the company details view
  if (selectedOption) {
    const stock = MAG7_STOCKS[selectedOption.symbol]
    return (
      <div className="page-container space-y-6">
                {/* Enlarged Search Bar */}
        <div className="relative max-w-3xl mx-auto" role="search" aria-label="Company search">
          <div className="relative h-16 bg-[var(--bg-card)] rounded-full border border-[var(--border-subtle)] overflow-hidden shadow-sm transition-all duration-200 focus-within:shadow-lg focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          
            <div className="relative z-10 flex h-full">
              <div className="flex-1 flex items-center px-8">
                <Search className="h-6 w-6 text-[var(--text-muted)] mr-4 flex-shrink-0" />
                
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for another company..."
                  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 h-full text-lg font-medium placeholder:text-[var(--text-muted)] appearance-none"
                  aria-label="Search for company ticker symbols"
                />
                
                {query && (
                  <button
                    onClick={debouncedClick(() => {
                      setQuery("")
                      setSearchResults([])
                      setShowDropdown(false)
                      setError("")
                    })}
                    className="ml-4 p-2 hover:bg-[var(--bg-app)] rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5 text-[var(--text-muted)]" />
                  </button>
                )}
              </div>
              
              <div className="w-28 flex-shrink-0">
                <Button 
                  onClick={handleSearch}
                  disabled={searchLoading}
                  className="w-full h-full bg-[var(--accent)] text-white font-medium text-base transition-colors border-0 rounded-none appearance-none"
                  aria-label="Search for company"
                >
                  {searchLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {searchResults.map((result, index) => (
                <button
                  key={result.symbol}
                  onClick={debouncedClick(() => handleSelectOption(result))}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-[var(--bg-app)] transition-colors",
                    highlightedIndex === index && "bg-[var(--bg-app)]"
                  )}
                >
                  <TickerLogo 
                    ticker={result.symbol} 
                    size={32} 
                    rounded={true}
                    decorative={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{result.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.name}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {result.type}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
      </div>
    )
  }

  // Default search view with quick access
  return (
    <div className="page-container space-y-6 pt-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto" role="search" aria-label="Company search">
        <div className="relative h-12 bg-[var(--bg-card)] rounded-full border border-[var(--border-subtle)] overflow-hidden shadow-sm transition-all duration-200 focus-within:shadow-lg focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 opacity-0 focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
        
          <div className="relative z-10 flex h-full">
            <div className="flex-1 flex items-center px-8">
              <Search className="h-6 w-6 text-[var(--text-muted)] mr-4 flex-shrink-0" />
              
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a ticker symbol..."
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0 h-full text-lg font-medium placeholder:text-[var(--text-muted)] appearance-none"
                aria-label="Search for company ticker symbols"
              />
              
              {query && (
                <button
                  onClick={() => {
                    setQuery("")
                    setSearchResults([])
                    setShowDropdown(false)
                    setSelectedOption(null)
                    setError("")
                  }}
                  className="ml-4 p-2 hover:bg-[var(--bg-app)] rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5 text-[var(--text-muted)]" />
                </button>
              )}
            </div>
            
            <div className="w-28 flex-shrink-0">
              <Button 
                onClick={handleSearch}
                disabled={searchLoading}
                className="w-full h-full bg-[var(--accent)] text-white font-medium text-base transition-colors border-0 rounded-none appearance-none"
                aria-label="Search for company"
              >
                {searchLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {searchResults.map((result, index) => (
              <button
                key={result.symbol}
                onClick={() => handleSelectOption(result)}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-[var(--bg-app)] transition-colors",
                  highlightedIndex === index && "bg-[var(--bg-app)]"
                )}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  <img
                    src={getCompanyLogoUrl(result.symbol)}
                    alt={`${result.symbol} logo`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `<Building2 class="h-4 w-4 text-muted-foreground" />`
                      }
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{result.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate">{result.name}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {result.type}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      {/* MAG7 Quick Access Card */}
      <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl">
        <CardHeader className="pb-3 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-2xl font-bold text-[var(--text-primary)]">
            Quick Access - MAG7 Stocks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {MAG7_SYMBOLS.map((symbol) => {
              const stock = MAG7_STOCKS[symbol]
              return (
                <button
                  key={symbol}
                  onClick={() => handleMAG7Select(symbol)}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left min-w-0 flex-shrink-0"
                >
                  <TickerLogo 
                    ticker={symbol} 
                    size={24} 
                    rounded={true}
                    decorative={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
