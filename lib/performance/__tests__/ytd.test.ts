import { computeYTDFromSeries, validateYTDConsistency, convertEquitySeriesToDailySeries } from '../ytd'

describe('YTD Calculation', () => {
  describe('computeYTDFromSeries', () => {
    it('should return zero when no data provided', () => {
      const result = computeYTDFromSeries([])
      expect(result.ytdReturn).toBe(0)
      expect(result.baselineDate).toBe('')
      expect(result.currentValue).toBe(0)
    })

    it('should calculate YTD return correctly with Jan 1 baseline', () => {
      const dailySeries = [
        { date: '2024-01-01', value: 1000 },
        { date: '2024-06-15', value: 1100 },
        { date: '2024-12-31', value: 1200 }
      ]
      
      const result = computeYTDFromSeries(dailySeries)
      
      expect(result.ytdReturn).toBe(20) // (1200 - 1000) / 1000 * 100
      expect(result.baselineDate).toBe('2024-01-01')
      expect(result.baselineValue).toBe(1000)
      expect(result.currentValue).toBe(1200)
    })

    it('should use first available trading day after Jan 1 when Jan 1 is not available', () => {
      const dailySeries = [
        { date: '2024-01-03', value: 1000 }, // First trading day after Jan 1
        { date: '2024-06-15', value: 1100 },
        { date: '2024-12-31', value: 1200 }
      ]
      
      const result = computeYTDFromSeries(dailySeries)
      
      expect(result.ytdReturn).toBe(20) // (1200 - 1000) / 1000 * 100
      expect(result.baselineDate).toBe('2024-01-03')
      expect(result.baselineValue).toBe(1000)
    })

    it('should handle negative returns', () => {
      const dailySeries = [
        { date: '2024-01-01', value: 1000 },
        { date: '2024-12-31', value: 800 }
      ]
      
      const result = computeYTDFromSeries(dailySeries)
      
      expect(result.ytdReturn).toBe(-20) // (800 - 1000) / 1000 * 100
    })

    it('should handle zero baseline value', () => {
      const dailySeries = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-12-31', value: 1000 }
      ]
      
      const result = computeYTDFromSeries(dailySeries)
      
      expect(result.ytdReturn).toBe(0) // Cannot calculate return from zero baseline
    })

    it('should sort data chronologically', () => {
      const dailySeries = [
        { date: '2024-12-31', value: 1200 },
        { date: '2024-01-01', value: 1000 },
        { date: '2024-06-15', value: 1100 }
      ]
      
      const result = computeYTDFromSeries(dailySeries)
      
      expect(result.ytdReturn).toBe(20)
      expect(result.baselineDate).toBe('2024-01-01')
      expect(result.currentValue).toBe(1200)
    })
  })

  describe('validateYTDConsistency', () => {
    it('should return true when values are within tolerance', () => {
      const ytdResult = {
        ytdReturn: 10,
        baselineDate: '2024-01-01',
        baselineValue: 1000,
        currentValue: 1100,
        calculationDate: '2024-12-31'
      }
      
      const isConsistent = validateYTDConsistency(ytdResult, 1100.005, 0.01)
      expect(isConsistent).toBe(true)
    })

    it('should return false when values exceed tolerance', () => {
      const ytdResult = {
        ytdReturn: 10,
        baselineDate: '2024-01-01',
        baselineValue: 1000,
        currentValue: 1100,
        calculationDate: '2024-12-31'
      }
      
      const isConsistent = validateYTDConsistency(ytdResult, 1110, 0.01)
      expect(isConsistent).toBe(false)
    })
  })

  describe('convertEquitySeriesToDailySeries', () => {
    it('should convert equity series with date field', () => {
      const equitySeries = [
        { date: '2024-01-01', value: 1000 },
        { date: '2024-12-31', value: 1200 }
      ]
      
      const result = convertEquitySeriesToDailySeries(equitySeries)
      
      expect(result).toEqual([
        { date: '2024-01-01', value: 1000 },
        { date: '2024-12-31', value: 1200 }
      ])
    })

    it('should convert equity series with ts field', () => {
      const equitySeries = [
        { ts: new Date('2024-01-01').getTime(), value: 1000 },
        { ts: new Date('2024-12-31').getTime(), value: 1200 }
      ]
      
      const result = convertEquitySeriesToDailySeries(equitySeries)
      
      expect(result).toEqual([
        { date: '2024-01-01', value: 1000 },
        { date: '2024-12-31', value: 1200 }
      ])
    })

    it('should throw error for invalid equity series', () => {
      const equitySeries = [
        { invalid: 'data' }
      ]
      
      expect(() => convertEquitySeriesToDailySeries(equitySeries)).toThrow()
    })
  })
})
