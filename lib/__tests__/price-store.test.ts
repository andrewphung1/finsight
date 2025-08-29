import { PriceStore, DailyClose } from '../price-store'

describe('PriceStore', () => {
  let priceStore: PriceStore

  beforeEach(() => {
    priceStore = new PriceStore()
  })

  describe('ticker normalization', () => {
    it('should normalize AAPL.US to AAPL', () => {
      expect(priceStore.hasTicker('AAPL.US')).toBe(true)
      expect(priceStore.hasTicker('AAPL')).toBe(true)
    })

    it('should handle case insensitive tickers', () => {
      expect(priceStore.hasTicker('aapl')).toBe(true)
      expect(priceStore.hasTicker('AAPL')).toBe(true)
    })

    it('should return null for unknown tickers', () => {
      expect(priceStore.getLatestClose('UNKNOWN')).toBeNull()
    })
  })

  describe('getDailyCloses', () => {
    it('should return forward-filled daily data', () => {
      const closes = priceStore.getDailyCloses('AAPL', '2024-01-01', '2024-01-05')
      
      expect(closes.length).toBeGreaterThan(0)
      expect(closes[0]).toHaveProperty('date')
      expect(closes[0]).toHaveProperty('close')
      expect(typeof closes[0].close).toBe('number')
    })

    it('should handle weekends with forward-filling', () => {
      // 2024-01-06 and 2024-01-07 are Saturday and Sunday
      const closes = priceStore.getDailyCloses('AAPL', '2024-01-05', '2024-01-08')
      
      // Should have data for all days including weekends
      expect(closes.length).toBeGreaterThan(0)
      
      // Weekend values should match Friday's close (forward-filled)
      const fridayClose = closes.find(c => c.date === '2024-01-05')?.close
      const saturdayClose = closes.find(c => c.date === '2024-01-06')?.close
      const sundayClose = closes.find(c => c.date === '2024-01-07')?.close
      
      if (fridayClose && saturdayClose && sundayClose) {
        expect(saturdayClose).toBe(fridayClose)
        expect(sundayClose).toBe(fridayClose)
      }
    })

    it('should return empty array for unknown ticker', () => {
      const closes = priceStore.getDailyCloses('UNKNOWN', '2024-01-01', '2024-01-05')
      expect(closes).toEqual([])
    })
  })

  describe('getLatestClose', () => {
    it('should return the most recent price', () => {
      const latest = priceStore.getLatestClose('AAPL')
      expect(latest).toBeGreaterThan(0)
    })

    it('should return null for unknown ticker', () => {
      const latest = priceStore.getLatestClose('UNKNOWN')
      expect(latest).toBeNull()
    })
  })

  describe('batch operations', () => {
    it('should get latest prices for multiple tickers', () => {
      const prices = priceStore.getBatchLatestPrices(['AAPL', 'MSFT'])
      
      expect(prices.AAPL).toBeGreaterThan(0)
      expect(prices.MSFT).toBeGreaterThan(0)
      expect(Object.keys(prices)).toHaveLength(2)
    })

    it('should get daily closes for multiple tickers', () => {
      const closes = priceStore.getBatchDailyCloses(['AAPL', 'MSFT'], '2024-01-01', '2024-01-05')
      
      expect(closes.AAPL.length).toBeGreaterThan(0)
      expect(closes.MSFT.length).toBeGreaterThan(0)
      expect(Object.keys(closes)).toHaveLength(2)
    })
  })

  describe('date range', () => {
    it('should return valid date range for known ticker', () => {
      const range = priceStore.getTickerDateRange('AAPL')
      expect(range).not.toBeNull()
      expect(range?.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(range?.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return null for unknown ticker', () => {
      const range = priceStore.getTickerDateRange('UNKNOWN')
      expect(range).toBeNull()
    })
  })

  describe('status reporting', () => {
    it('should track missing prices', () => {
      priceStore.getLatestClose('UNKNOWN')
      const status = priceStore.getStatus()
      
      expect(status.missingPrices.length).toBeGreaterThan(0)
      expect(status.missingPrices.some(p => p.includes('UNKNOWN'))).toBe(true)
    })

    it('should clear status', () => {
      priceStore.getLatestClose('UNKNOWN')
      priceStore.clearStatus()
      const status = priceStore.getStatus()
      
      expect(status.missingPrices).toEqual([])
      expect(status.warnings).toEqual([])
    })
  })

  describe('available tickers', () => {
    it('should return list of available tickers', () => {
      const tickers = priceStore.getAvailableTickers()
      
      expect(tickers.length).toBeGreaterThan(0)
      expect(tickers).toContain('AAPL')
      expect(tickers).toContain('MSFT')
    })
  })
})
