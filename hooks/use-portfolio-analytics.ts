"use client"

import { useState, useCallback, useEffect } from "react"
import type { PortfolioAnalytics } from "@/types/portfolio"
import { PortfolioAnalyticsEngine } from "@/services/portfolio-analytics"
import { useTradingData } from "./use-trading-data"

export function usePortfolioAnalytics() {
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { transactions } = useTradingData()

  const calculateAnalytics = useCallback(async () => {
    console.log("[v0] calculateAnalytics called with", transactions.length, "transactions")
    if (transactions.length === 0) {
      console.log("[v0] No transactions, setting analytics to null")
      setAnalytics(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Creating analytics engine...")
      const engine = new PortfolioAnalyticsEngine(transactions)
      console.log("[v0] Calculating analytics...")
      const result = await engine.calculateAnalytics()
      console.log("[v0] Analytics result:", result)
      setAnalytics(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate analytics")
      console.error("Portfolio analytics calculation failed:", err)
    } finally {
      setLoading(false)
    }
  }, [transactions])

  // Auto-calculate when transactions change
  useEffect(() => {
    calculateAnalytics()
  }, [calculateAnalytics])

  const refreshAnalytics = useCallback(() => {
    calculateAnalytics()
  }, [calculateAnalytics])

  return {
    analytics,
    loading,
    error,
    refreshAnalytics,
    hasData: transactions.length > 0,
  }
}
