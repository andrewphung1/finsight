import { Position, PricingStatus } from '@/types/portfolio'
import { getPriceStore } from './price-store'
import { googleSheetStore } from './google-sheet-store'
import { MAG7_STOCKS } from '@/data/mag7-stocks'
import { loggers } from './logger'
import { EquityEngine, EquitySeriesPoint } from './equity-engine'

export interface PriceResolutionResult {
  positions: Position[]
  pricingStatus: PricingStatus
  resolvedTickers: string[]
  totalTickers: number
  warnings: string[]
  // NEW: Rebuilt equity series and metrics
  equitySeries: EquitySeriesPoint[]
  metrics: {
    totalValue: number
    ytdReturn: number
    allTimeReturn: number
    currentHoldingsCount: number
    lastUpdated: string
  }
}

export class PriceResolutionService {
  private priceStore: any = null

  async initialize(): Promise<void> {
    if (!this.priceStore) {
      this.priceStore = await getPriceStore()
    }
  }

  /**
   * Phase A: Fast snapshot with last known prices
   */
  async computePhaseA(positions: Position[]): Promise<PriceResolutionResult> {
    await this.initialize()
    
    const resolvedTickers: string[] = []
    const warnings: string[] = []
    
    const phaseAPositions = positions.map(pos => {
      const ticker = pos.ticker.toUpperCase()
      let lastKnownPrice: number | null = null
      let priceStatus: PricingStatus = 'pending'
      
      // Try to get last known price from MAG7 historical data
      if (MAG7_STOCKS[ticker]) {
        try {
          const range = this.priceStore.getTickerDateRange(ticker)
          if (range) {
            const lastClose = this.priceStore.getLastClose(ticker)
            if (lastClose && lastClose > 0) {
              lastKnownPrice = lastClose
              priceStatus = 'resolved'
              resolvedTickers.push(ticker)
            }
          }
        } catch (error) {
          warnings.push(`Failed to get MAG7 price for ${ticker}: ${error}`)
        }
      }
      
      // Calculate market value with last known price
      const marketValue = lastKnownPrice && pos.shares > 0 ? pos.shares * lastKnownPrice : 0
      
      return {
        ...pos,
        lastKnownPrice,
        priceStatus,
        marketValue,
        // Don't calculate returns until price is resolved
        unrealizedGainPercent: priceStatus === 'resolved' ? 
          (pos.costBasis > 0 ? ((marketValue - pos.costBasis) / pos.costBasis) * 100 : 0) : 0
      }
    })

    loggers.LDS('phaseA', {
      totalTickers: positions.length,
      resolvedTickers: resolvedTickers.length,
      mag7Resolved: resolvedTickers.filter(t => MAG7_STOCKS[t]).length
    })

    return {
      positions: phaseAPositions,
      pricingStatus: resolvedTickers.length > 0 ? 'resolving' : 'pending',
      resolvedTickers,
      totalTickers: positions.length,
      warnings
    }
  }

  /**
   * Phase B: Fetch non-MAG7 prices and finalize with Promise.allSettled
   */
  async computePhaseB(positions: Position[], transactions: any[] = []): Promise<PriceResolutionResult> {
    await this.initialize()
    
    const resolvedTickers: string[] = []
    const failedTickers: string[] = []
    const warnings: string[] = []
    const startTime = Date.now()
    
    // Create price resolution tasks for all tickers
    const priceTasks = positions.map(async (pos) => {
      const ticker = pos.ticker.toUpperCase()
      let lastKnownPrice: number | null = pos.lastKnownPrice || null
      let priceStatus: PricingStatus = pos.priceStatus || 'pending'
      
      // Skip if already resolved
      if (priceStatus === 'resolved') {
        resolvedTickers.push(ticker)
        return { ticker, success: true, price: lastKnownPrice, position: pos }
      }
      
      // Try to get non-MAG7 price from Google Sheets
      if (!MAG7_STOCKS[ticker] && !lastKnownPrice) {
        try {
          const snapshot = await googleSheetStore.getCompanySnapshot(ticker)
          if (snapshot && snapshot.price && snapshot.price > 0) {
            lastKnownPrice = snapshot.price
            priceStatus = 'resolved'
            resolvedTickers.push(ticker)
            
            loggers.HPCH('enhance', {
              ticker,
              oldPrice: pos.lastPrice || 0,
              newPrice: lastKnownPrice,
              shares: pos.shares,
              oldMV: pos.marketValue || 0,
              newMV: pos.shares * lastKnownPrice
            })
            
            return { ticker, success: true, price: lastKnownPrice, position: pos }
          }
        } catch (error) {
          warnings.push(`Failed to get Google Sheets price for ${ticker}: ${error}`)
          failedTickers.push(ticker)
          return { ticker, success: false, price: null, position: pos, error }
        }
      }
      
      return { ticker, success: true, price: lastKnownPrice, position: pos }
    })
    
    // Execute all price tasks with Promise.allSettled
    const results = await Promise.allSettled(priceTasks)
    
    // Process results and update positions
    const phaseBPositions = results.map((result, index) => {
      const pos = positions[index]
      const ticker = pos.ticker.toUpperCase()
      
              if (result.status === 'fulfilled') {
          const { success, price, position } = result.value
          
          if (success && price && price > 0) {
            // Calculate final market value and returns
            const marketValue = pos.shares > 0 ? pos.shares * price : 0
            const avgSharePrice = pos.avgSharePrice || 0
            const unrealizedPL = (price - avgSharePrice) * pos.shares
            const priceReturnPct = avgSharePrice > 0 ? ((price - avgSharePrice) / avgSharePrice) * 100 : 0
            
            return {
              ...pos,
              lastKnownPrice: price,
              priceStatus: 'resolved' as PricingStatus,
              marketValue,
              unrealizedGain: unrealizedPL,
              unrealizedGainPercent: priceReturnPct, // Based on current price vs avg share price
              lastPrice: price,
              avgSharePrice // Store average share price for comparison
            }
                 } else {
           // Use fallback price or mark as failed
           const fallbackPrice = pos.lastPrice || pos.lastKnownPrice || 100.00
           const marketValue = pos.shares > 0 ? pos.shares * fallbackPrice : 0
           
           return {
             ...pos,
             lastKnownPrice: fallbackPrice,
             priceStatus: 'error' as PricingStatus,
             marketValue,
             lastPrice: fallbackPrice,
             avgSharePrice: pos.avgSharePrice || 0
           }
         }
             } else {
         // Promise rejected - use fallback
         const fallbackPrice = pos.lastPrice || pos.lastKnownPrice || 100.00
         const marketValue = pos.shares > 0 ? pos.shares * fallbackPrice : 0
         
         return {
           ...pos,
           lastKnownPrice: fallbackPrice,
           priceStatus: 'error' as PricingStatus,
           marketValue,
           lastPrice: fallbackPrice,
           avgSharePrice: pos.avgSharePrice || 0
         }
       }
    })
    
    const duration = Date.now() - startTime
    const finalStatus: PricingStatus = resolvedTickers.length === positions.length ? 'resolved' : 'error'
    
         // Log compact summary
     const samplePosition = phaseBPositions.find(p => p.priceStatus === 'resolved')
     const sample = samplePosition ? {
       ticker: samplePosition.ticker,
       shares: samplePosition.shares,
       price: samplePosition.lastKnownPrice,
       avgSharePrice: samplePosition.avgSharePrice || 0,
       mv: samplePosition.marketValue,
       retPct: samplePosition.unrealizedGainPercent
     } : null
    
    loggers.HPCH('ready', {
      tickers: positions.length,
      resolved: resolvedTickers.length,
      failed: failedTickers.length,
      duration,
      sample
    })

    // Rebuild equity series with updated holdings
    let rebuiltEquitySeries: EquitySeriesPoint[] = []
    let rebuiltMetrics = {
      totalValue: 0,
      ytdReturn: 0,
      allTimeReturn: 0,
      currentHoldingsCount: positions.length,
      lastUpdated: new Date().toISOString().split('T')[0]
    }
    
    if (finalStatus === 'resolved' && transactions.length > 0) {
      try {
        // Create EquityEngine with PriceStore for proper historical data
        const priceStore = await getPriceStore()
        const equityEngine = new EquityEngine(priceStore)
        
        // Build equity series with enhanced positions and all cash flows
        rebuiltEquitySeries = await equityEngine.buildEquitySeries(transactions)
        
        // Calculate metrics from rebuilt series - ensure same base
        if (rebuiltEquitySeries.length > 0) {
          const lastPoint = rebuiltEquitySeries[rebuiltEquitySeries.length - 1]
          const firstPoint = rebuiltEquitySeries[0]
          
          // Set heroTotal = equitySeries.at(-1).value (same base)
          rebuiltMetrics = {
            totalValue: lastPoint.value,
            ytdReturn: this.calculateYTDReturn(rebuiltEquitySeries),
            allTimeReturn: firstPoint.value > 0 ? ((lastPoint.value - firstPoint.value) / firstPoint.value) * 100 : 0,
            currentHoldingsCount: positions.length,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
          
          // Validate the series makes sense (no 953% returns on 1-month window)
          const maxReturn = Math.max(...rebuiltEquitySeries.map(p => p.cumulativeReturn || 0))
          if (maxReturn > 500) {
            loggers.LDS('warn', {
              message: 'Suspiciously high cumulative return detected',
              maxReturn,
              seriesLength: rebuiltEquitySeries.length,
              firstValue: firstPoint.value,
              lastValue: lastPoint.value
            })
          }
          
          loggers.LDS('equity-rebuild', {
            points: rebuiltEquitySeries.length,
            totalValue: rebuiltMetrics.totalValue,
            ytdReturn: rebuiltMetrics.ytdReturn,
            allTimeReturn: rebuiltMetrics.allTimeReturn,
            firstValue: firstPoint.value,
            lastValue: lastPoint.value
          })
        }
      } catch (error) {
        loggers.LDS('error', {
          kind: 'equity-rebuild-failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    return {
      positions: phaseBPositions,
      pricingStatus: finalStatus,
      resolvedTickers,
      totalTickers: positions.length,
      warnings,
      equitySeries: rebuiltEquitySeries,
      metrics: rebuiltMetrics
    }
  }

  /**
   * Calculate YTD return from equity series
   */
  private calculateYTDReturn(equitySeries: EquitySeriesPoint[]): number {
    if (equitySeries.length === 0) return 0
    
    const currentYear = new Date().getFullYear()
    const ytdStartDate = new Date(currentYear, 0, 1).toISOString().split('T')[0]
    
    // Find the first point in current year
    const ytdStartPoint = equitySeries.find(point => point.date >= ytdStartDate)
    const lastPoint = equitySeries[equitySeries.length - 1]
    
    if (!ytdStartPoint || !lastPoint) return 0
    
    const ytdStartValue = ytdStartPoint.value
    const currentValue = lastPoint.value
    
    return ytdStartValue > 0 ? ((currentValue - ytdStartValue) / ytdStartValue) * 100 : 0
  }

  /**
   * Winsorize returns for visualization (clamp to reasonable range)
   */
  winsorizeReturns(positions: Position[], minPercent: number = -95, maxPercent: number = 300): Position[] {
    return positions.map(pos => ({
      ...pos,
      unrealizedGainPercent: Math.max(minPercent, Math.min(maxPercent, pos.unrealizedGainPercent || 0))
    }))
  }
}
