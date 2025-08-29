"use client"

import { useState, useEffect } from 'react'

interface TradingData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  peRatio: number
}

export function useTradingData(symbol: string) {
  const [data, setData] = useState<TradingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTradingData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Mock data - in a real app, this would be an API call
        const mockData: TradingData = {
          symbol,
          price: Math.random() * 100 + 50,
          change: (Math.random() - 0.5) * 10,
          changePercent: (Math.random() - 0.5) * 20,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          marketCap: Math.floor(Math.random() * 1000000000000) + 10000000000,
          peRatio: Math.random() * 50 + 10
        }
        
        setData(mockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trading data')
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      fetchTradingData()
    }
  }, [symbol])

  return { data, loading, error }
}
