import { useState, useEffect, useCallback } from 'react'
import { PortfolioStore, createPortfolioStore, getPortfolioStore } from '@/lib/portfolio-store'
import { PriceService } from '@/lib/price-service'
import { NormalizedTransaction } from '@/types/portfolio'

let globalStore: PortfolioStore | null = null

function getStore(): PortfolioStore {
  if (!globalStore) {
    console.log('PortfolioStore: Initializing new store instance')
    const priceService = new PriceService()
    globalStore = createPortfolioStore(priceService)
    console.log('PortfolioStore: Store initialized', globalStore.getState())
  }
  return globalStore
}

export function usePortfolioStore() {
  const [store] = useState(() => getStore())
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setVersion(prev => prev + 1)
    })

    return unsubscribe
  }, [store])

  const importTransactions = useCallback(async (
    transactions: NormalizedTransaction[],
    source: string,
    name?: string
  ) => {
    return await store.importTransactions(transactions, source, name)
  }, [store])

  const setActivePortfolio = useCallback((id: string | null) => {
    store.setActivePortfolio(id)
  }, [store])

  const removePortfolio = useCallback((id: string) => {
    store.removePortfolio(id)
  }, [store])

  const getState = useCallback(() => {
    return store.getState()
  }, [store])

  const getActivePortfolio = useCallback(() => {
    return store.getActivePortfolio()
  }, [store])

  return {
    store,
    version,
    importTransactions,
    setActivePortfolio,
    removePortfolio,
    getState,
    getActivePortfolio
  }
}

export function usePortfolioSelectors() {
  const { store, version } = usePortfolioStore()

  const holdings = store.selectActiveHoldings()
  const assetAllocation = store.selectActiveAssetAllocation()
  const equitySeries = store.selectActiveEquitySeries()
  const returnSeries = store.selectActiveReturnSeries()
  const holdingsPerformance = store.selectActiveHoldingsPerformance()
  const metrics = store.selectActiveMetrics()
  const metadata = store.selectActiveMetadata()

  // Debug logging
  console.log('usePortfolioSelectors:', {
    version,
    holdingsCount: holdings.length,
    assetAllocationCount: assetAllocation.length,
    equitySeriesCount: equitySeries.length,
    returnSeriesCount: returnSeries.length,
    holdingsPerformanceCount: holdingsPerformance.length,
    metrics,
    metadata,
    activePortfolio: store.getActivePortfolio()?.name,
    activePortfolioStatus: store.getActivePortfolio()?.status,
    activePortfolioId: store.getState().activePortfolioId
  })

  return {
    holdings,
    assetAllocation,
    equitySeries,
    returnSeries,
    holdingsPerformance,
    metrics,
    metadata,
    version
  }
}

export function usePortfolioList() {
  const { store, version } = usePortfolioStore()
  const state = store.getState()
  
  const portfolios = Object.values(state.portfolios).map(portfolio => ({
    id: portfolio.id,
    name: portfolio.name,
    source: portfolio.source,
    createdAt: portfolio.createdAt,
    status: portfolio.status,
    isActive: portfolio.id === state.activePortfolioId
  }))

  return {
    portfolios,
    activePortfolioId: state.activePortfolioId,
    version
  }
}

// Enhanced hooks for specific data with range and mode support
export function useActiveEquity(range: '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'All' = '1M') {
  const { store, version } = usePortfolioStore()
  const portfolio = store.getActivePortfolio()
  
  if (!portfolio || portfolio.status !== 'ready') {
    return []
  }

  const equitySeries = portfolio.equitySeries
  if (!equitySeries || equitySeries.length === 0) {
    return []
  }

  // Filter by range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()

  let startTs: number
  switch (range) {
    case '1M':
      startTs = todayTs - (30 * 24 * 60 * 60 * 1000)
      break
    case '3M':
      startTs = todayTs - (90 * 24 * 60 * 60 * 1000)
      break
    case '6M':
      startTs = todayTs - (180 * 24 * 60 * 60 * 1000)
      break
    case '1Y':
      startTs = todayTs - (365 * 24 * 60 * 60 * 1000)
      break
    case '2Y':
      startTs = todayTs - (730 * 24 * 60 * 60 * 1000)
      break
    case '5Y':
      startTs = todayTs - (1826 * 24 * 60 * 60 * 1000)
      break
    case 'All':
    default:
      startTs = equitySeries[0].ts
  }

  // Filter data to range, ensuring we don't go before the first data point
  const filteredSeries = equitySeries.filter(point => point.ts >= Math.max(startTs, equitySeries[0].ts))
  
  return filteredSeries
}

export function useActiveReturns(range: '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'All' = '1M') {
  const { store, version } = usePortfolioStore()
  const portfolio = store.getActivePortfolio()
  
  if (!portfolio || portfolio.status !== 'ready') {
    return { portfolio: [], sp500: [] }
  }

  const returnSeries = portfolio.returnSeries
  if (!returnSeries || returnSeries.length === 0) {
    return { portfolio: [], sp500: [] }
  }

  // Filter by range (same logic as equity series)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()

  let startTs: number
  switch (range) {
    case '1M':
      startTs = todayTs - (30 * 24 * 60 * 60 * 1000)
      break
    case '3M':
      startTs = todayTs - (90 * 24 * 60 * 60 * 1000)
      break
    case '6M':
      startTs = todayTs - (180 * 24 * 60 * 60 * 1000)
      break
    case '1Y':
      startTs = todayTs - (365 * 24 * 60 * 60 * 1000)
      break
    case '2Y':
      startTs = todayTs - (730 * 24 * 60 * 60 * 1000)
      break
    case '5Y':
      startTs = todayTs - (1826 * 24 * 60 * 60 * 1000)
      break
    case 'All':
    default:
      startTs = returnSeries[0].ts
  }

  // Filter data to range
  const filteredSeries = returnSeries.filter(point => point.ts >= Math.max(startTs, returnSeries[0].ts))
  
  return {
    portfolio: filteredSeries.map(point => ({ ts: point.ts, return: point.portfolioReturn })),
    sp500: filteredSeries.map(point => ({ ts: point.ts, return: point.sp500Return || 0 }))
  }
}

export function useActiveAllocation() {
  const { store, version } = usePortfolioStore()
  const portfolio = store.getActivePortfolio()
  
  if (!portfolio || portfolio.status !== 'ready') {
    return []
  }

  return portfolio.assetAllocation || []
}

export function useActiveHoldings() {
  const { store, version } = usePortfolioStore()
  const portfolio = store.getActivePortfolio()
  
  if (!portfolio || portfolio.status !== 'ready') {
    return []
  }

  return portfolio.holdingsPerformance || []
}

export function useActiveMetrics() {
  const { store, version } = usePortfolioStore()
  const portfolio = store.getActivePortfolio()
  
  if (!portfolio || portfolio.status !== 'ready') {
    return null
  }

  return portfolio.metrics || null
}
