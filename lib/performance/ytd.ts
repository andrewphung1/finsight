/**
 * Canonical YTD calculation function
 * 
 * This is the single source of truth for all YTD calculations across the application.
 * It ensures consistent baseline dates, price sources, and calculation logic.
 */

// Feature flag to switch between old and new implementations
const USE_EQUITY_ENGINE = true

export interface DailySeriesPoint {
  date: string // ISO YYYY-MM-DD format (UTC)
  value: number
}

export interface YTDCalculationResult {
  ytdReturn: number
  baselineDate: string
  baselineValue: number
  currentValue: number
  calculationDate: string
}

/**
 * Calculate YTD return from a daily series
 * 
 * @param dailySeries - Array of daily portfolio values with dates
 * @returns YTD calculation result with return percentage and metadata
 */
export function computeYTDFromSeries(dailySeries: DailySeriesPoint[]): YTDCalculationResult {
  if (USE_EQUITY_ENGINE) {
    return computeYTDFromEquityEngineSeries(dailySeries)
  } else {
    return computeYTDFromLegacySeries(dailySeries)
  }
}

/**
 * NEW: Calculate YTD return from EquityEngine daily series
 * 
 * @param dailySeries - Array of daily portfolio values from EquityEngine
 * @returns YTD calculation result with return percentage and metadata
 */
function computeYTDFromEquityEngineSeries(dailySeries: DailySeriesPoint[]): YTDCalculationResult {
  console.log('YTD: Computing from EquityEngine series:', {
    seriesLength: dailySeries?.length || 0
  })

  if (!dailySeries || dailySeries.length === 0) {
    return {
      ytdReturn: 0,
      baselineDate: '',
      baselineValue: 0,
      currentValue: 0,
      calculationDate: new Date().toISOString().split('T')[0]
    }
  }

  // Sort by date to ensure chronological order
  const sortedSeries = [...dailySeries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const currentYear = new Date().getFullYear()
  const yearStartDate = `${currentYear}-01-01`
  
  // Find the first available trading day on/after Jan 1 (UTC)
  let baselinePoint: DailySeriesPoint | null = null
  let baselineDate = yearStartDate
  
  // First try to find exact Jan 1 match
  baselinePoint = sortedSeries.find(point => point.date === yearStartDate)
  
  // If no exact match, find the first point on or after Jan 1
  if (!baselinePoint) {
    baselinePoint = sortedSeries.find(point => point.date >= yearStartDate)
    if (baselinePoint) {
      baselineDate = baselinePoint.date
    }
  }
  
  // If still no baseline found, use the first available point
  if (!baselinePoint) {
    baselinePoint = sortedSeries[0]
    baselineDate = baselinePoint.date
  }

  const currentPoint = sortedSeries[sortedSeries.length - 1]
  const baselineValue = baselinePoint.value
  const currentValue = currentPoint.value

  // Calculate YTD return
  let ytdReturn = 0
  if (baselineValue > 0) {
    ytdReturn = ((currentValue - baselineValue) / baselineValue) * 100
  }

  const result = {
    ytdReturn,
    baselineDate,
    baselineValue,
    currentValue,
    calculationDate: new Date().toISOString().split('T')[0]
  }

  console.log('YTD: EquityEngine calculation result:', {
    ytdReturn,
    baselineDate,
    baselineValue,
    currentValue,
    seriesLength: sortedSeries.length
  })

  return result
}

/**
 * LEGACY: Calculate YTD return from legacy daily series
 * 
 * @param dailySeries - Array of daily portfolio values with dates
 * @returns YTD calculation result with return percentage and metadata
 */
function computeYTDFromLegacySeries(dailySeries: DailySeriesPoint[]): YTDCalculationResult {
  console.log('YTD: Computing from legacy series:', {
    seriesLength: dailySeries?.length || 0
  })

  if (!dailySeries || dailySeries.length === 0) {
    return {
      ytdReturn: 0,
      baselineDate: '',
      baselineValue: 0,
      currentValue: 0,
      calculationDate: new Date().toISOString().split('T')[0]
    }
  }

  // Sort by date to ensure chronological order
  const sortedSeries = [...dailySeries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const currentYear = new Date().getFullYear()
  const yearStartDate = `${currentYear}-01-01`
  
  // Find the first available trading day on/after Jan 1
  let baselinePoint: DailySeriesPoint | null = null
  let baselineDate = yearStartDate
  
  // First try to find exact Jan 1 match
  baselinePoint = sortedSeries.find(point => point.date === yearStartDate)
  
  // If no exact match, find the first point on or after Jan 1
  if (!baselinePoint) {
    baselinePoint = sortedSeries.find(point => point.date >= yearStartDate)
    if (baselinePoint) {
      baselineDate = baselinePoint.date
    }
  }
  
  // If still no baseline found, use the first available point
  if (!baselinePoint) {
    baselinePoint = sortedSeries[0]
    baselineDate = baselinePoint.date
  }

  const currentPoint = sortedSeries[sortedSeries.length - 1]
  const baselineValue = baselinePoint.value
  const currentValue = currentPoint.value

  // Calculate YTD return
  let ytdReturn = 0
  if (baselineValue > 0) {
    ytdReturn = ((currentValue - baselineValue) / baselineValue) * 100
  }

  return {
    ytdReturn,
    baselineDate,
    baselineValue,
    currentValue,
    calculationDate: new Date().toISOString().split('T')[0]
  }
}

/**
 * Validate that YTD calculation is consistent with portfolio value
 * 
 * @param ytdResult - YTD calculation result
 * @param portfolioValue - Current portfolio value from positions
 * @param tolerance - Tolerance for difference (default 0.01)
 * @returns true if values are consistent within tolerance
 */
export function validateYTDConsistency(
  ytdResult: YTDCalculationResult, 
  portfolioValue: number, 
  tolerance: number = 0.01
): boolean {
  const difference = Math.abs(ytdResult.currentValue - portfolioValue)
  return difference <= tolerance
}

/**
 * Runtime assertion for YTD consistency (development only)
 * 
 * @param ytdResult - YTD calculation result
 * @param portfolioValue - Current portfolio value from positions
 * @param context - Context for error message
 */
export function assertYTDConsistency(
  ytdResult: YTDCalculationResult,
  portfolioValue: number,
  context: string = 'YTD calculation'
): void {
  if (process.env.NODE_ENV === 'development') {
    const isConsistent = validateYTDConsistency(ytdResult, portfolioValue)
    if (!isConsistent) {
      console.error(`${context} - Inconsistent values:`, {
        ytdCurrentValue: ytdResult.currentValue,
        portfolioValue,
        difference: ytdResult.currentValue - portfolioValue,
        tolerance: 0.01
      })
      throw new Error(`${context}: YTD current value (${ytdResult.currentValue}) does not match portfolio value (${portfolioValue})`)
    }
  }
}

/**
 * NEW: Dev assertion that YTD on card equals cumulative return from Jan 1 on chart (±0.01%)
 * 
 * @param ytdResult - YTD calculation result
 * @param chartCumulativeReturn - Cumulative return from Jan 1 on the chart
 * @param context - Context for error message
 */
export function assertYTDChartConsistency(
  ytdResult: YTDCalculationResult,
  chartCumulativeReturn: number,
  context: string = 'YTD chart consistency'
): void {
  if (process.env.NODE_ENV === 'development') {
    const difference = Math.abs(ytdResult.ytdReturn - chartCumulativeReturn)
    const isConsistent = difference <= 0.01
    
    console.log(`${context} - YTD consistency check:`, {
      ytdReturn: ytdResult.ytdReturn,
      chartCumulativeReturn,
      difference,
      isConsistent
    })
    
    if (!isConsistent) {
      console.warn(`${context} - YTD inconsistency!`, {
        ytdReturn: ytdResult.ytdReturn,
        chartCumulativeReturn,
        difference,
        tolerance: 0.01
      })
    }
  }
}

/**
 * Convert equity series to daily series format
 * 
 * @param equitySeries - Equity series with ts or date field
 * @returns Daily series in canonical format
 */
export function convertEquitySeriesToDailySeries(equitySeries: any[]): DailySeriesPoint[] {
  return equitySeries.map(point => {
    let date: string
    
    if ('date' in point) {
      date = point.date
    } else if ('ts' in point) {
      date = new Date(point.ts).toISOString().split('T')[0]
    } else {
      throw new Error('Equity series point must have either date or ts field')
    }
    
    const value = 'value' in point ? point.value : (point as any).value || 0
    
    return { date, value }
  })
}
