"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, TrendingUp, TrendingDown } from "lucide-react"
import { MAG7_STOCKS, MAG7_SYMBOLS } from "@/data/mag7-stocks"
import { useRouter } from "next/navigation"

interface MAG7StockSearchProps {
  onStockSelect?: (stock: { symbol: string; name: string; data: any }) => void
}

export function MAG7StockSearch({ onStockSelect }: MAG7StockSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const filteredStocks = MAG7_SYMBOLS.filter(symbol => {
    const stock = MAG7_STOCKS[symbol]
    return (
      symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.sector.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleStockClick = (symbol: string) => {
    const stock = MAG7_STOCKS[symbol]
    if (onStockSelect) {
      onStockSelect({ symbol, name: stock.name, data: stock })
    } else {
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
  }

  const formatCurrency = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return `$${value.toLocaleString()}`
  }

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            MAG7 Stock Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search MAG7 stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStocks.map((symbol) => {
                const stock = MAG7_STOCKS[symbol]
                // Use a stable hash-based price change to avoid hydration issues
                const priceChange = ((symbol.charCodeAt(0) + symbol.charCodeAt(1)) % 20 - 10) * 0.1
                const isPositive = priceChange >= 0
                
                return (
                  <Card
                    key={symbol}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleStockClick(symbol)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{symbol}</h3>
                          <p className="text-sm text-gray-600">{stock.name}</p>
                        </div>
                        <Badge variant="outline">{stock.sector}</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="font-semibold">
                            ${stock.currentPrice.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Change:</span>
                          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="font-semibold">
                              {formatPercent(priceChange)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Market Cap:</span>
                          <span className="font-semibold">
                            {formatCurrency(stock.marketCap)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
