import { useState, useEffect, useCallback } from 'react'
import { googleSheetStore } from '@/lib/google-sheet-store'
import { NormalizedTransaction } from '@/types/portfolio'

interface HoldingsPerformanceItem {
  ticker: string
  shares: number
  avgCostPerShare: number
  lastPrice: number
  marketValue: number
  totalReturnPercent: number
  totalReturn: number
}

interface HoldingsPerformanceSummary {
  resolved: number
  total: number
  excludedUnpriced: number
  excludedNoCost: number
  missingPriceTickers: string[]
  missingCostTickers: string[]
}

interface UseHoldingsPerformanceGSResult {
  data: HoldingsPerformanceItem[]
  summary: HoldingsPerformanceSummary
  loading: boolean
  error: string | null
}

// Deduplicated warning tracking
const missingPriceWarnings = new Set<string>()
const invalidCostWarnings = new Set<string>()

export function useHoldingsPerformanceGS(
  transactions: NormalizedTransaction[],
  positions?: Array<{ ticker: string; shares: number }>
): UseHoldingsPerformanceGSResult {
  const [data, setData] = useState<HoldingsPerformanceItem[]>([])
  const [summary, setSummary] = useState<HoldingsPerformanceSummary>({
    resolved: 0,
    total: 0,
    excludedUnpriced: 0,
    excludedNoCost: 0,
    missingPriceTickers: [],
    missingCostTickers: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Track Google Sheet store's last fetch time to trigger re-runs when data is refreshed
  const [lastFetchTime, setLastFetchTime] = useState(googleSheetStore.getLastFetchTime())

  const computeHoldingsFromTransactions = useCallback((): Map<string, { shares: number; costBasisDollars: number }> => {
    const holdings = new Map<string, { shares: number; costBasisDollars: number }>()
    
    // Group transactions by ticker
    const tickerGroups = new Map<string, NormalizedTransaction[]>()
    
    transactions.forEach(tx => {
      if (!tx.normalizedTicker) return
      const ticker = tx.normalizedTicker
      if (!tickerGroups.has(ticker)) {
        tickerGroups.set(ticker, [])
      }
      tickerGroups.get(ticker)!.push(tx)
    })
    

    
    // Process each ticker's transactions
    tickerGroups.forEach((txs, ticker) => {
      // Sort transactions by date
      const sortedTxs = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      let shares = 0
      let costBasisDollars = 0
      
      sortedTxs.forEach(tx => {
        if (tx.quantity > 0) {
          // BUY transaction
          const qty = tx.quantity
          const fillPrice = tx.price || 0
          const fees = tx.fees || 0
          const totalCost = tx.totalCost || (qty * fillPrice + fees)
          
          shares += qty
          costBasisDollars += totalCost
        } else {
          // SELL transaction (weighted-avg method)
          const qtySold = Math.abs(tx.quantity)
          if (shares > 0) {
            const avgCost = costBasisDollars / shares
            const costOfSharesSold = avgCost * qtySold
            
            shares -= qtySold
            costBasisDollars -= costOfSharesSold
            
            // Ensure we don't go negative
            if (shares < 0) shares = 0
            if (costBasisDollars < 0) costBasisDollars = 0
          }
        }
      })
      
      // Only add if we have shares remaining
      if (shares > 0) {
        holdings.set(ticker, { shares, costBasisDollars })
      }
    })
    
    return holdings
  }, [transactions])

  const fetchPricesAndComputePerformance = useCallback(async (
    holdings: Map<string, { shares: number; costBasisDollars: number }>
  ): Promise<{ data: HoldingsPerformanceItem[], summary: HoldingsPerformanceSummary }> => {
    const tickers = Array.from(holdings.keys())
    const total = tickers.length
    

    
    let resolved = 0
    let excludedUnpriced = 0
    let excludedNoCost = 0
    const missingPriceTickers: string[] = []
    const missingCostTickers: string[] = []
    const results: HoldingsPerformanceItem[] = []
    
    // Process tickers one by one to allow partial rendering
    for (const ticker of tickers) {
      try {
        console.log(`HP: Fetching snapshot for ${ticker}...`)
        const snapshot = await googleSheetStore.getSnapshot(ticker)
        console.log(`HP: Snapshot for ${ticker}:`, snapshot)
        const holding = holdings.get(ticker)!
        const { shares, costBasisDollars } = holding
        
        // Validate shares
        if (shares <= 0) {
          continue // Skip tickers with no shares
        }
        
        // Validate average cost
        const avgCostPerShare = costBasisDollars / shares
        if (!Number.isFinite(avgCostPerShare) || avgCostPerShare <= 0) {
          excludedNoCost++
          missingCostTickers.push(ticker)
          if (!invalidCostWarnings.has(ticker)) {
            console.warn(`HP: invalid avg cost [${ticker}]`)
            invalidCostWarnings.add(ticker)
          }
          continue
        }
        
        // Validate price
        if (!snapshot?.price || !Number.isFinite(snapshot.price) || snapshot.price <= 0) {
          excludedUnpriced++
          missingPriceTickers.push(ticker)
          if (!missingPriceWarnings.has(ticker)) {
            console.warn(`HP: missing GS price [${ticker}] - snapshot:`, snapshot)
            missingPriceWarnings.add(ticker)
          }
          continue
        }
        
        // Compute performance metrics
        const lastPrice = snapshot.price
        const marketValue = shares * lastPrice
        const totalReturnPercent = ((lastPrice - avgCostPerShare) / avgCostPerShare) * 100
        const totalReturn = (lastPrice - avgCostPerShare) * shares
        
        // Clamp percentage to reasonable bounds
        const clampedPercent = Math.max(-100, Math.min(1000, totalReturnPercent))
        
        results.push({
          ticker,
          shares,
          avgCostPerShare,
          lastPrice,
          marketValue,
          totalReturnPercent: clampedPercent,
          totalReturn
        })
        
        resolved++
        
        // Log progress for each resolved ticker
        console.log(`HP: resolved ${ticker} (${resolved}/${total})`)
        
      } catch (error) {
        console.warn(`HP: Failed to fetch price for ${ticker}:`, error)
        excludedUnpriced++
        missingPriceTickers.push(ticker)
      }
    }
    
    // Sort by market value descending for stable bar ordering
    results.sort((a, b) => b.marketValue - a.marketValue)
    
    const summary: HoldingsPerformanceSummary = {
      resolved,
      total,
      excludedUnpriced,
      excludedNoCost,
      missingPriceTickers,
      missingCostTickers
    }
    
    return { data: results, summary }
  }, [])

  // Subscribe to Google Sheet store updates for all relevant tickers
  useEffect(() => {
    if (!transactions || transactions.length === 0) return

    // Get all unique tickers from transactions
    const tickers = new Set<string>()
    transactions.forEach(tx => {
      if (tx.normalizedTicker) {
        tickers.add(tx.normalizedTicker)
      }
    })

    // Subscribe to updates for each ticker
    const unsubscribers: (() => void)[] = []
    
    tickers.forEach(ticker => {
      const unsubscribe = googleSheetStore.subscribe(ticker, (snapshot) => {
        // When any ticker updates, trigger a re-computation
        console.log(`HP: Google Sheet data updated for ${ticker}, triggering re-computation...`)
        setLastFetchTime(googleSheetStore.getLastFetchTime())
      })
      unsubscribers.push(unsubscribe)
    })

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [transactions])

  // Also listen for general data refresh events
  useEffect(() => {
    const checkForRefresh = () => {
      const currentFetchTime = googleSheetStore.getLastFetchTime()
      if (currentFetchTime !== lastFetchTime) {
        console.log('HP: Google Sheet data refreshed, updating holdings performance...')
        setLastFetchTime(currentFetchTime)
      }
    }
    
    // Check immediately and then every 1 second for refresh events
    checkForRefresh()
    const interval = setInterval(checkForRefresh, 1000)
    return () => clearInterval(interval)
  }, [lastFetchTime])

  useEffect(() => {
    const processData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Step 1: Aggregate shares & average cost from transactions
        const holdings = computeHoldingsFromTransactions()
        
        // Step 2: Fetch prices and compute performance
        const { data: performanceData, summary: performanceSummary } = await fetchPricesAndComputePerformance(holdings)
        
        setData(performanceData)
        setSummary(performanceSummary)
        
        // Log summary with missing tickers
        console.log('HP: summary', performanceSummary)
        if (performanceSummary.missingPriceTickers.length > 0) {
          console.log('HP: excludedUnpriced', performanceSummary.missingPriceTickers)
        }
        if (performanceSummary.missingCostTickers.length > 0) {
          console.log('HP: excludedNoCost', performanceSummary.missingCostTickers)
        }
        
      } catch (err) {
        console.error('HP: Error processing holdings performance:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setData([])
        setSummary({ 
          resolved: 0, 
          total: 0, 
          excludedUnpriced: 0, 
          excludedNoCost: 0,
          missingPriceTickers: [],
          missingCostTickers: []
        })
      } finally {
        setLoading(false)
      }
    }
    
    if (transactions && transactions.length > 0) {
      processData()
    } else {
      setData([])
      setSummary({ 
        resolved: 0, 
        total: 0, 
        excludedUnpriced: 0, 
        excludedNoCost: 0,
        missingPriceTickers: [],
        missingCostTickers: []
      })
      setLoading(false)
    }
  }, [transactions, computeHoldingsFromTransactions, fetchPricesAndComputePerformance, lastFetchTime])

  return {
    data,
    summary,
    loading,
    error
  }
}
