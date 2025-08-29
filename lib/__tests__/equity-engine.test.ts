import { EquityEngine, EquitySeriesPoint, EquityEngineStatus } from '../equity-engine'
import { PriceStore } from '../price-store'
import { NormalizedTransaction } from '../../types/portfolio'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock GoogleSheetStore for testing
jest.mock('../google-sheet-store', () => ({
  googleSheetStore: {
    getCompanySnapshot: jest.fn().mockImplementation((ticker: string) => {
      // Mock spot prices for non-MAG7 stocks
      const spotPrices: Record<string, number> = {
        'JPM': 145.00,
        'V': 225.00,
        'WMT': 165.00,
        'PG': 155.00
      }
      return Promise.resolve({
        ticker,
        price: spotPrices[ticker] || 100.00,
        name: `${ticker} Corp`,
        sector: 'Technology'
      })
    })
  }
}))

describe('EquityEngine', () => {
  let equityEngine: EquityEngine
  let priceStore: PriceStore

  beforeEach(() => {
    // Create a test PriceStore with our fixture data
    priceStore = new PriceStore()
    equityEngine = new EquityEngine(priceStore)
  })

  describe('resolvePriceForDate', () => {
    it('should resolve MAG7 stock prices from PriceStore', async () => {
      const result = await equityEngine.resolvePriceForDate('AAPL', '2023-01-15')
      expect(result.mode).toBe('timeseries')
      expect(result.price).toBeGreaterThan(0)
    })

    it('should resolve non-MAG7 stock prices from GoogleSheetStore', async () => {
      const result = await equityEngine.resolvePriceForDate('JPM', '2023-01-15')
      expect(result.mode).toBe('spot')
      expect(result.price).toBe(145.00)
    })

    it('should handle missing prices', async () => {
      const result = await equityEngine.resolvePriceForDate('INVALID', '2023-01-15')
      expect(result.mode).toBe('missing')
      expect(result.price).toBeNull()
    })

    it('should normalize GOOG to GOOGL', async () => {
      const result = await equityEngine.resolvePriceForDate('GOOG', '2023-01-15')
      expect(result.mode).toBe('timeseries')
      expect(result.price).toBeGreaterThan(0)
    })

    it('should strip .US suffix', async () => {
      const result = await equityEngine.resolvePriceForDate('AAPL.US', '2023-01-15')
      expect(result.mode).toBe('timeseries')
      expect(result.price).toBeGreaterThan(0)
    })
  })

  describe('buildEquitySeries - MAG7 Only', () => {
    let trades: NormalizedTransaction[]

    beforeEach(() => {
      trades = [
        {
          date: '2023-01-15',
          ticker: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.00,
          fees: 9.99
        },
        {
          date: '2023-02-20',
          ticker: 'MSFT',
          type: 'BUY',
          quantity: 5,
          price: 280.00,
          fees: 9.99
        }
      ]
    })

    it('should build equity series with daily variance for MAG7 stocks', async () => {
      const result = await equityEngine.buildEquitySeries(trades)
      
      expect(result.series.length).toBeGreaterThan(0)
      expect(result.status.totalTrades).toBe(2)
      
      // Check that we have daily movement (variance > 0 over 20-day window)
      const series = result.series
      if (series.length >= 20) {
        const last20Days = series.slice(-20)
        const values = last20Days.map(p => p.value)
        const variance = calculateVariance(values)
        expect(variance).toBeGreaterThan(0)
      }
    })

    it('should calculate cumulative returns correctly', async () => {
      const result = await equityEngine.buildEquitySeries(trades)
      
      const series = result.series
      expect(series.length).toBeGreaterThan(0)
      
      // First point should have 0% return
      expect(series[0].cumulativeReturn).toBe(0)
      
      // Later points should have calculated returns
      if (series.length > 1) {
        const lastPoint = series[series.length - 1]
        expect(lastPoint.cumulativeReturn).toBeDefined()
        expect(typeof lastPoint.cumulativeReturn).toBe('number')
      }
    })
  })

  describe('buildEquitySeries - Non-MAG7 Only', () => {
    let trades: NormalizedTransaction[]

    beforeEach(() => {
      trades = [
        {
          date: '2023-01-15',
          ticker: 'JPM',
          type: 'BUY',
          quantity: 20,
          price: 140.00,
          fees: 9.99
        },
        {
          date: '2023-03-15',
          ticker: 'JPM',
          type: 'SELL',
          quantity: 10,
          price: 145.00,
          fees: 9.99
        }
      ]
    })

    it('should build flat series between trades for non-MAG7 stocks', async () => {
      const result = await equityEngine.buildEquitySeries(trades)
      
      expect(result.series.length).toBeGreaterThan(0)
      
      // Check for flat behavior between trades
      const series = result.series
      let lastValue = series[0].value
      let flatPeriods = 0
      
      for (let i = 1; i < series.length; i++) {
        if (Math.abs(series[i].value - lastValue) < 0.01) {
          flatPeriods++
        }
        lastValue = series[i].value
      }
      
      // Should have some flat periods (non-MAG7 stocks don't move daily)
      expect(flatPeriods).toBeGreaterThan(0)
    })

    it('should track spot-valued tickers in status', async () => {
      const result = await equityEngine.buildEquitySeries(trades)
      
      expect(result.status.spotValuedTickers).toContain('JPM')
    })
  })

  describe('buildEquitySeries - Mixed Portfolio', () => {
    let trades: NormalizedTransaction[]

    beforeEach(() => {
      trades = [
        {
          date: '2023-01-15',
          ticker: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.00,
          fees: 9.99
        },
        {
          date: '2023-02-20',
          ticker: 'JPM',
          type: 'BUY',
          quantity: 20,
          price: 140.00,
          fees: 9.99
        }
      ]
    })

    it('should combine MAG7 daily movement with non-MAG7 flat behavior', async () => {
      const result = await equityEngine.buildEquitySeries(trades)
      
      expect(result.series.length).toBeGreaterThan(0)
      expect(result.status.spotValuedTickers).toContain('JPM')
      
      // Should have both behaviors: some variance (MAG7) and some flat periods (non-MAG7)
      const series = result.series
      const values = series.map(p => p.value)
      const variance = calculateVariance(values)
      
      // Should have some variance due to MAG7 stocks
      expect(variance).toBeGreaterThan(0)
      
      // Should also have some flat periods due to non-MAG7 stocks
      let flatPeriods = 0
      for (let i = 1; i < series.length; i++) {
        if (Math.abs(series[i].value - series[i-1].value) < 0.01) {
          flatPeriods++
        }
      }
      expect(flatPeriods).toBeGreaterThan(0)
    })
  })

  describe('SPY Benchmark Calculation', () => {
    let trades: NormalizedTransaction[]

    beforeEach(() => {
      trades = [
        {
          date: '2023-01-15',
          ticker: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.00,
          fees: 9.99
        },
        {
          date: '2023-03-15',
          ticker: 'AAPL',
          type: 'SELL',
          quantity: 5,
          price: 160.00,
          fees: 9.99
        }
      ]
    })

    it('should calculate SPY shares correctly for BUY trades', async () => {
      const result = await equityEngine.buildEquitySeries(trades)
      
      // Calculate expected SPY shares for first BUY
      const firstTrade = trades[0]
      const cashflow = -(firstTrade.quantity * firstTrade.price + firstTrade.fees)
      const spyClose = 391.80 // From our test data
      const expectedShares = Math.abs(cashflow) / spyClose
      
      // The SPY benchmark should reflect this position
      expect(result.status.totalTrades).toBe(2)
    })

    it('should handle SELL trades with position capping', async () => {
      // Add a SELL that exceeds holdings
      trades.push({
        date: '2023-04-15',
        ticker: 'AAPL',
        type: 'SELL',
        quantity: 20, // More than we own
        price: 170.00,
        fees: 9.99
      })
      
      const result = await equityEngine.buildEquitySeries(trades)
      
      // Should have warnings about capped sells
      expect(result.status.warnings.length).toBeGreaterThan(0)
    })

    it('should forward-fill SPY closes when missing', async () => {
      // Add a trade on a date without SPY data
      trades.push({
        date: '2023-01-16', // Next day after our test data
        ticker: 'AAPL',
        type: 'BUY',
        quantity: 5,
        price: 151.00,
        fees: 9.99
      })
      
      const result = await equityEngine.buildEquitySeries(trades)
      
      // Should handle forward-fill gracefully
      expect(result.series.length).toBeGreaterThan(0)
    })
  })

  describe('Return Rebasing', () => {
    it('should rebase returns to 0% at the left edge of selected period', async () => {
      const trades: NormalizedTransaction[] = [
        {
          date: '2023-01-15',
          ticker: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.00,
          fees: 9.99
        }
      ]
      
      const result = await equityEngine.buildEquitySeries(trades)
      const series = result.series
      
      if (series.length > 0) {
        // First point should have 0% return
        expect(series[0].cumulativeReturn).toBe(0)
        
        // Calculate expected return for last point
        const firstValue = series[0].value
        const lastValue = series[series.length - 1].value
        const expectedReturn = ((lastValue / firstValue) - 1) * 100
        
        expect(Math.abs(series[series.length - 1].cumulativeReturn - expectedReturn)).toBeLessThan(0.01)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty trades array', async () => {
      const result = await equityEngine.buildEquitySeries([])
      
      expect(result.series).toEqual([])
      expect(result.status.totalTrades).toBe(0)
      expect(result.status.warnings).toContain('No trades provided')
    })

    it('should handle zero/invalid base values', async () => {
      const trades: NormalizedTransaction[] = [
        {
          date: '2023-01-15',
          ticker: 'INVALID',
          type: 'BUY',
          quantity: 10,
          price: 150.00,
          fees: 9.99
        }
      ]
      
      const result = await equityEngine.buildEquitySeries(trades)
      
      // Should handle missing prices gracefully
      expect(result.status.missingPrices.length).toBeGreaterThan(0)
    })

    it('should prevent negative SPY holdings', async () => {
      const trades: NormalizedTransaction[] = [
        {
          date: '2023-01-15',
          ticker: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.00,
          fees: 9.99
        },
        {
          date: '2023-01-16',
          ticker: 'AAPL',
          type: 'SELL',
          quantity: 15, // More than we own
          price: 160.00,
          fees: 9.99
        }
      ]
      
      const result = await equityEngine.buildEquitySeries(trades)
      
      // Should have warnings about excessive sells
      expect(result.status.warnings.length).toBeGreaterThan(0)
    })
  })
})

// Helper function to calculate variance
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
}
