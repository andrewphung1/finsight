"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DollarSign, BarChart3, TrendingUp, Briefcase, User } from "lucide-react"
import { EquitySeriesPoint } from "@/lib/equity-engine"

const USE_EQUITY_ENGINE = true

interface PortfolioMetrics {
  totalValue: number
  ytdReturn: number
  lastUpdated: string
  baselineDate: string
}

interface HeroRowProps {
  userName?: string
  userAvatar?: string
  portfolioMetrics?: PortfolioMetrics
  equityEngineSeries?: EquitySeriesPoint[]
  currentHoldingsCount?: number
  allTimeReturnPct?: number
  liveDataStatus?: {
    status: 'loading' | 'success' | 'error' | 'empty'
    message: string
    warnings?: string[]
  }
}

export function HeroRow({
  userName = "Guest",
  userAvatar,
  portfolioMetrics,
  equityEngineSeries,
  currentHoldingsCount,
  allTimeReturnPct: propAllTimeReturnPct
}: HeroRowProps) {
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(t)
  }, [])

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD", 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(v)
    
  const formatPercent = (v: number) => 
    `${v >= 0 ? "+" : ""}${(Math.abs(v) < 1 ? v.toFixed(2) : v.toFixed(1))}%`

  // Calculate metrics from series (unchanged logic)
  const calcValue = () => {
    if (USE_EQUITY_ENGINE && equityEngineSeries?.length) {
      return equityEngineSeries[equityEngineSeries.length - 1].value
    }
    return portfolioMetrics?.totalValue ?? 0
  }
  
  const calcAllTime = () => {
    if (USE_EQUITY_ENGINE && equityEngineSeries && equityEngineSeries.length > 1) {
      let base = 0
      for (const p of equityEngineSeries) {
        if (p.value > 0) {
          base = p.value
          break
        }
      }
      const last = equityEngineSeries[equityEngineSeries.length - 1].value
      if (base > 0 && last > 0) return ((last / base) - 1) * 100
    }
    return 0
  }

  const totalValue = calcValue()
  const allTimeReturn = propAllTimeReturnPct ?? calcAllTime()
  const ytd = portfolioMetrics?.ytdReturn ?? 0

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-0 rounded-lg bg-muted animate-pulse">
            <div className="h-32 px-4 flex items-center">
              <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex-shrink-0" />
              <div className="ml-3 min-w-0 flex flex-col justify-center space-y-2">
                <div className="h-3 bg-muted-foreground/20 rounded w-16" />
                <div className="h-6 bg-muted-foreground/20 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 relative">
      {/* Welcome Back */}
      <div className="min-w-0 rounded-lg" style={{ backgroundColor: '#1B2231' }}>
        <div className="h-32 px-4 flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
            {userAvatar ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="text-white font-bold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                  {userName.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="ml-3 min-w-0 flex flex-col justify-center space-y-1">
            <p className="text-sm font-medium text-white/90 truncate font-[inherit]">
              Welcome Back,
            </p>
            <p className="text-2xl font-bold text-white truncate font-[inherit]">
              {userName}
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Value */}
      <div className="min-w-0 rounded-lg" style={{ backgroundColor: '#6c95f8' }}>
        <div className="h-32 px-4 flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0 flex flex-col justify-center space-y-1">
            <p className="text-sm font-medium text-white/90 truncate font-[inherit]">
              Portfolio Value
            </p>
            <p className="text-2xl font-bold text-white truncate font-[inherit]">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>
      </div>

      {/* YTD Performance */}
      <div className="min-w-0 rounded-lg" style={{ backgroundColor: '#5aeccc' }}>
        <div className="h-32 px-4 flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0 flex flex-col justify-center space-y-1">
            <p className="text-sm font-medium text-white/90 truncate font-[inherit]">
              YTD Performance
            </p>
            <p className="text-2xl font-bold text-white truncate font-[inherit]">
              {formatPercent(ytd)}
            </p>
          </div>
        </div>
      </div>

      {/* All-Time Returns */}
      <div className="min-w-0 rounded-lg" style={{ backgroundColor: '#ff7d8a' }}>
        <div className="h-32 px-4 flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0 flex flex-col justify-center space-y-1">
            <p className="text-sm font-medium text-white/90 truncate font-[inherit]">
              All-Time Returns
            </p>
            <p className="text-2xl font-bold text-white truncate font-[inherit]">
              {formatPercent(allTimeReturn)}
            </p>
          </div>
        </div>
      </div>

      {/* Current Holdings */}
      <div className="min-w-0 rounded-lg" style={{ backgroundColor: '#916bf8' }}>
        <div className="h-32 px-4 flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 min-w-0 flex flex-col justify-center space-y-1">
            <p className="text-sm font-medium text-white/90 truncate font-[inherit]">
              Current Holdings
            </p>
            <p className="text-2xl font-bold text-white truncate font-[inherit]">
              {currentHoldingsCount ?? 0}
            </p>
          </div>
        </div>
      </div>


    </div>
  )
}
