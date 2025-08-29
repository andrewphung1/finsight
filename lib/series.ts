export interface DataPoint {
  date: string
  [key: string]: any
}

export interface CAGRResult {
  years: number
  cagrPct: number | null
  start: number
  end: number
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function computeCAGR(series: Array<{date: string; value: number}>): CAGRResult {
  // Filter out invalid values (null, undefined, NaN, <= 0)
  const validData = series.filter(point => 
    point.value != null && 
    !isNaN(point.value) && 
    isFinite(point.value) && 
    point.value > 0
  )

  if (validData.length < 2) {
    return { years: 0, cagrPct: null, start: 0, end: 0 }
  }

  const first = validData[0]
  const last = validData[validData.length - 1]

  // Check for sign change
  if (first.value <= 0 || last.value <= 0) {
    return { years: 0, cagrPct: null, start: first.value, end: last.value }
  }

  // Calculate years difference
  let years: number
  if (first.date.includes('Q') && last.date.includes('Q')) {
    // Quarterly data: calculate quarters difference
    const firstYear = parseInt(first.date.split('-')[0])
    const firstQuarter = parseInt(first.date.split('Q')[1])
    const lastYear = parseInt(last.date.split('-')[0])
    const lastQuarter = parseInt(last.date.split('Q')[1])
    
    const totalQuarters = (lastYear - firstYear) * 4 + (lastQuarter - firstQuarter)
    years = totalQuarters / 4
  } else {
    // Annual data: direct year difference
    years = parseInt(last.date) - parseInt(first.date)
  }

  if (years <= 0) {
    return { years: 0, cagrPct: null, start: first.value, end: last.value }
  }

  // Calculate CAGR: (end/start)^(1/years) - 1
  const cagrPct = Math.pow(last.value / first.value, 1 / years) - 1

  return {
    years: Math.round(years * 10) / 10, // Round to 1 decimal place
    cagrPct: isFinite(cagrPct) ? cagrPct : null,
    start: first.value,
    end: last.value
  }
}

/**
 * Calculate TTM (Trailing Twelve Months) values from quarterly data
 */
export function calculateTTM(quarterlyData: DataPoint[]): DataPoint[] {
  if (quarterlyData.length < 4) return []

  const ttmData: DataPoint[] = []

  // Flow metrics (sum over 4 quarters)
  const flowMetrics = ['revenue', 'grossProfit', 'ebitda', 'operatingIncome', 'netIncome', 'freeCashFlow']
  
  // Stock metrics (take last quarterly value)
  const stockMetrics = ['totalAssets', 'totalEquity', 'totalDebt', 'totalCash', 'sharesOutstanding']
  
  // EPS: sum over 4 quarters (TTM EPS)
  const epsMetric = 'eps'

  for (let i = 3; i < quarterlyData.length; i++) {
    const window = quarterlyData.slice(i - 3, i + 1) // 4 quarters
    const ttmPoint: DataPoint = { date: quarterlyData[i].date }

    // Calculate flow metrics (sum)
    flowMetrics.forEach(metric => {
      ttmPoint[metric] = window.reduce((sum, point) => sum + (point[metric] || 0), 0)
    })

    // Calculate stock metrics (last value)
    stockMetrics.forEach(metric => {
      ttmPoint[metric] = window[window.length - 1][metric] || 0
    })

    // Calculate EPS (sum for TTM)
    ttmPoint[epsMetric] = window.reduce((sum, point) => sum + (point[epsMetric] || 0), 0)

    ttmData.push(ttmPoint)
  }

  return ttmData
}

/**
 * Limit data to recent periods to avoid overcrowding
 */
export function limitDataPoints(data: DataPoint[], period: 'quarterly' | 'ttm' | 'annual'): DataPoint[] {
  const maxPoints = period === 'annual' ? 10 : 24
  return data.slice(-maxPoints)
}
