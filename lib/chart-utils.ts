
export interface ChartDataPoint {
  date: string
  [key: string]: any
}

export interface YAxisScale {
  domain: [number, number]
  ticks: number[]
  format: (value: number) => string
}

export interface XAxisConfig {
  ticks: string[]
  labels: string[]
}

export interface NiceDomainResult {
  domain: [number, number]
  ticks: number[]
  step: number
}

export interface WindowCAGRResult {
  cagrPct: number | null
  startLabel: string
  endLabel: string
  startValue?: number
  endValue?: number
  elapsedYears?: number
}

export type PeriodType = 'quarterly' | 'ttm' | 'annual'
export type MetricType = 'currency' | 'eps' | 'shares' | 'ratio' | 'percent' | 'price'

// Nice number sequence: 1, 2, 5 × 10^n
const NICE_NUMBERS = [1, 2, 5]

// Magnitude-aware utilities
interface UnitInfo {
  scale: number
  suffix: string
}

/**
 * Pick appropriate unit based on magnitude
 * Rules: T >= 1e12, B >= 1e9, M >= 1e6, K >= 1e3, else ''
 */
function pickUnit(maxAbs: number): UnitInfo {
  if (maxAbs >= 1e12) return { scale: 1e12, suffix: 'T' }
  if (maxAbs >= 1e9) return { scale: 1e9, suffix: 'B' }
  if (maxAbs >= 1e6) return { scale: 1e6, suffix: 'M' }
  if (maxAbs >= 1e3) return { scale: 1e3, suffix: 'K' }
  return { scale: 1, suffix: '' }
}

/**
 * Pick appropriate unit for shares (limited to M/B)
 */
function pickSharesUnit(maxAbs: number): UnitInfo {
  if (maxAbs >= 1e9) return { scale: 1e9, suffix: 'B' }
  if (maxAbs >= 1e6) return { scale: 1e6, suffix: 'M' }
  return { scale: 1, suffix: '' }
}

/**
 * Calculate optimal decimal places based on step size and variability
 */
function decimalsFor(stepInUnit: number, variabilityHint: number = 0.1): number {
  let decimals: number
  
  if (stepInUnit >= 5) decimals = 0
  else if (stepInUnit >= 1) decimals = 1
  else if (stepInUnit >= 0.1) decimals = 2
  else decimals = 3
  
  // Add precision for low variability
  if (variabilityHint < 0.05) {
    decimals = Math.min(decimals + 1, 4)
  }
  
  return decimals
}

/**
 * Calculate coefficient of variation (std/mean) for variability hint
 */
function calculateVariabilityHint(data: number[]): number {
  const validData = data.filter(v => v > 0 && isFinite(v))
  if (validData.length < 2) return 0.1
  
  const mean = validData.reduce((sum, v) => sum + v, 0) / validData.length
  const variance = validData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validData.length
  const std = Math.sqrt(variance)
  
  return std / mean
}

// Find the next nice number in the sequence
const getNiceNumber = (value: number): number => {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  
  for (const nice of NICE_NUMBERS) {
    if (nice >= normalized) {
      return nice * magnitude
    }
  }
  return 10 * magnitude
}

/**
 * Get nice domain and ticks with 1-2-5 progression
 * Always returns exactly 5 ticks with equal spacing
 */
export function getNiceDomainTicks(
  data: number[], 
  includeZero: boolean = true, 
  numTicks: number = 5
): NiceDomainResult {
  if (!data || data.length === 0) {
    return {
      domain: [0, 100],
      ticks: [0, 25, 50, 75, 100],
      step: 25
    }
  }

  const minValue = Math.min(...data)
  const maxValue = Math.max(...data)

  if (!isFinite(minValue) || !isFinite(maxValue) || minValue >= maxValue) {
    return {
      domain: [0, 100],
      ticks: [0, 25, 50, 75, 100],
      step: 25
    }
  }

  // Determine domain bounds based on data characteristics
  let domainMin: number
  let domainMax: number

  if (minValue >= 0 && includeZero) {
    // All positive values: start at 0, round max up
    domainMin = 0
    domainMax = maxValue
  } else if (maxValue <= 0 && includeZero) {
    // All negative values: end at 0, round min down
    domainMin = minValue
    domainMax = 0
  } else if (minValue < 0 && maxValue > 0) {
    // Mixed signs: symmetric bounds around 0
    const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue))
    domainMin = -absMax
    domainMax = absMax
  } else {
    // Edge cases: use data bounds with padding
    const range = maxValue - minValue
    const padding = range * 0.1
    domainMin = minValue - padding
    domainMax = maxValue + padding
  }

  // Calculate nice step size for exactly 4 equal steps (5 ticks)
  const targetStep = (domainMax - domainMin) / 4
  const niceStep = getNiceNumber(targetStep)

  // Adjust domain to use nice step
  const numSteps = Math.ceil((domainMax - domainMin) / niceStep)
  const adjustedRange = niceStep * numSteps
  
  // Center the range around the data
  const center = (domainMin + domainMax) / 2
  domainMin = center - adjustedRange / 2
  domainMax = center + adjustedRange / 2

  // Ensure we include 0 if needed
  if (includeZero && minValue >= 0 && domainMin > 0) {
    domainMin = 0
  } else if (includeZero && maxValue <= 0 && domainMax < 0) {
    domainMax = 0
  }

  // Generate exactly 5 ticks
  const ticks: number[] = []
  for (let i = 0; i < numTicks; i++) {
    const tick = domainMin + (niceStep * i)
    ticks.push(tick)
  }

  return {
    domain: [domainMin, domainMax],
    ticks,
    step: niceStep
  }
}

/**
 * Parse date string to Date object for comparison
 */
function parseDateForComparison(dateStr: string, period: PeriodType): Date {
  if (period === 'annual') {
    // Annual: YYYY -> Jan 1 of that year
    return new Date(parseInt(dateStr), 0, 1)
  } else {
    // Quarterly/TTM: YYYY-Qn or YYYY-MM-DD
    if (dateStr.includes('Q')) {
      // YYYY-Qn format
      const [year, quarter] = dateStr.split('-Q')
      const month = (parseInt(quarter) - 1) * 3 + 2 // Q1->Feb, Q2->May, Q3->Aug, Q4->Nov
      return new Date(parseInt(year), month, 15) // Middle of the quarter
    } else {
      // YYYY-MM-DD format
      return new Date(dateStr)
    }
  }
}

/**
 * Format date for label display
 */
function formatDateLabel(dateStr: string, period: PeriodType): string {
  if (period === 'annual') {
    return dateStr // YYYY format
  } else {
    // Quarterly/TTM: YYYY-Qn format
    if (dateStr.includes('Q')) {
      return period === 'ttm' ? `${dateStr} (TTM)` : dateStr
    } else {
      // Convert YYYY-MM-DD to YYYY-Qn
      const year = dateStr.split('-')[0]
      const month = parseInt(dateStr.split('-')[1])
      const quarter = Math.ceil(month / 3)
      const label = `${year}-Q${quarter}`
      return period === 'ttm' ? `${label} (TTM)` : label
    }
  }
}

/**
 * Compute CAGR for a specific time window
 */
// Module-level flag for one-time logging
let __CAGR_LOGGED = false

export function computeWindowCAGR(
  series: Array<{date: string; value: number}>, 
  windowYears: number,
  period: PeriodType
): WindowCAGRResult {
  console.debug('[CAGR:fn] Entry', { windowYears, period, seriesLen: series?.length || 0 })
  
  // Validation: insufficient data
  if (!series || series.length < 2) {
    console.debug('[CAGR:fn] Early return - insufficient data', { reason: 'insufficient', windowYears, period, seriesLen: series?.length || 0 })
    return { cagrPct: null, startLabel: '', endLabel: '' }
  }

  // Filter valid points (non-null, finite, positive)
  const validSeries = series.filter(point => 
    point && 
    point.value > 0 && 
    isFinite(point.value) && 
    point.date
  )

  if (validSeries.length < 2) {
    console.debug('[CAGR:fn] Early return - nonpositive values', { 
      reason: 'nonpositive', 
      windowYears, 
      period, 
      seriesLen: series.length, 
      validLen: validSeries.length,
      last: validSeries[0] || null
    })
    return { cagrPct: null, startLabel: '', endLabel: '' }
  }

  // Sort by date ascending
  const sortedSeries = [...validSeries].sort((a, b) => a.date.localeCompare(b.date))
  
  // Always use the latest available data point as endPoint
  const endPoint = sortedSeries[sortedSeries.length - 1]
  const endDate = parseDateForComparison(endPoint.date, period)
  
  // Calculate target start date
  const targetDate = new Date(endDate)
  targetDate.setFullYear(targetDate.getFullYear() - windowYears)
  
  // Find start point (latest point <= targetDate)
  let startPoint: {date: string; value: number} | null = null
  
  for (let i = sortedSeries.length - 1; i >= 0; i--) {
    const point = sortedSeries[i]
    const pointDate = parseDateForComparison(point.date, period)
    
    if (pointDate <= targetDate) {
      startPoint = point
      break
    }
  }
  
  // Validation: no start point found
  if (!startPoint) {
    console.debug('[CAGR:fn] Early return - short span', {
      reason: 'shortspan',
      windowYears,
      period,
      seriesLen: sortedSeries.length,
      last: sortedSeries[sortedSeries.length - 1] || null
    })
    return { cagrPct: null, startLabel: '', endLabel: '' }
  }
  
  // Validation: start and end values must be positive
  if (startPoint.value <= 0 || endPoint.value <= 0) {
    console.debug('[CAGR:fn] Early return - nonpositive start/end', {
      reason: 'nonpositive',
      windowYears,
      period,
      seriesLen: sortedSeries.length,
      last: { date: endPoint.date, value: endPoint.value }
    })
    return { cagrPct: null, startLabel: '', endLabel: '' }
  }
  
  // Calculate actual elapsed years
  const startDate = parseDateForComparison(startPoint.date, period)
  const elapsedYears = (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  
  // Validation: elapsed years must be positive
  if (elapsedYears <= 0) {
    console.debug('[CAGR:fn] Early return - invalid elapsed years', {
      reason: 'shortspan',
      windowYears,
      period,
      seriesLen: sortedSeries.length,
      last: { date: endPoint.date, value: endPoint.value }
    })
    return { cagrPct: null, startLabel: '', endLabel: '' }
  }
  
  // Calculate CAGR using actual elapsed years
  const cagrPct = Math.pow(endPoint.value / startPoint.value, 1 / elapsedYears) - 1
  
  // Validation: result must be finite
  if (!isFinite(cagrPct)) {
    console.debug('[CAGR:fn] Early return - nonfinite result', {
      reason: 'nonfinite',
      windowYears,
      period,
      seriesLen: sortedSeries.length,
      last: { date: endPoint.date, value: endPoint.value }
    })
    return { cagrPct: null, startLabel: '', endLabel: '' }
  }
  

  
  return {
    cagrPct: cagrPct * 100, // Convert to percentage for display
    startLabel: formatDateLabel(startPoint.date, period),
    endLabel: formatDateLabel(endPoint.date, period),
    startValue: startPoint.value,
    endValue: endPoint.value,
    elapsedYears
  }
}

/**
 * Get nice domain and ticks with 1-2-5 progression
 * Always returns exactly 5 ticks with equal spacing
 */
export function getNiceDomainAndTicks(
  dataMin: number, 
  dataMax: number, 
  includeZero: boolean = true, 
  numTicks: number = 5
): NiceDomainResult {
  if (!isFinite(dataMin) || !isFinite(dataMax) || dataMin >= dataMax) {
    return {
      domain: [0, 100],
      ticks: [0, 25, 50, 75, 100],
      step: 25
    }
  }

  // Determine domain bounds
  let domainMin: number
  let domainMax: number

  if (includeZero && dataMin >= 0) {
    // All positive values: start at 0
    domainMin = 0
    domainMax = dataMax
  } else if (dataMin < 0 && dataMax > 0) {
    // Mixed signs: include 0
    domainMin = dataMin
    domainMax = dataMax
  } else {
    // All negative or all positive but not starting at 0
    domainMin = dataMin
    domainMax = dataMax
  }

  // Add padding to ensure data doesn't touch edges
  const range = domainMax - domainMin
  const padding = range * 0.05 // 5% padding
  domainMin -= padding
  domainMax += padding

  // Calculate nice step size for exactly 4 equal steps (5 ticks)
  const targetStep = (domainMax - domainMin) / 4
  const niceStep = getNiceNumber(targetStep)

  // Adjust domain to use nice step
  const numSteps = Math.ceil((domainMax - domainMin) / niceStep)
  const adjustedRange = niceStep * numSteps
  
  // Center the range around the data
  const center = (domainMin + domainMax) / 2
  domainMin = center - adjustedRange / 2
  domainMax = center + adjustedRange / 2

  // Ensure we include 0 if needed
  if (includeZero && dataMin >= 0 && domainMin > 0) {
    domainMin = 0
  }

  // Generate exactly 5 ticks
  const ticks: number[] = []
  for (let i = 0; i < numTicks; i++) {
    const tick = domainMin + (niceStep * i)
    ticks.push(tick)
  }

  return {
    domain: [domainMin, domainMax],
    ticks,
    step: niceStep
  }
}

/**
 * Format currency values with billion rule
 * If step size ≥ 5B, format as XXB (no decimals)
 * If step size < 5B, format as XX.XB (one decimal)
 */
export function formatCurrencyWithBillionRule(value: number, step: number): string {
  if (!isFinite(value)) return 'N/A'

  // Determine the magnitude and format based on step size
  if (step >= 5e12) {
    // Trillions
    const trillions = value / 1e12
    return step >= 5e12 ? `$${Math.round(trillions)}T` : `$${trillions.toFixed(1)}T`
  } else if (step >= 5e9) {
    // Billions
    const billions = value / 1e9
    return step >= 5e9 ? `$${Math.round(billions)}B` : `$${billions.toFixed(1)}B`
  } else if (step >= 5e6) {
    // Millions
    const millions = value / 1e6
    return step >= 5e6 ? `$${Math.round(millions)}M` : `$${millions.toFixed(1)}M`
  } else if (step >= 5e3) {
    // Thousands
    const thousands = value / 1e3
    return step >= 5e3 ? `$${Math.round(thousands)}K` : `$${thousands.toFixed(1)}K`
  } else {
    // Raw numbers
    return `$${Math.round(value)}`
  }
}

/**
 * Format price values with compact rules
 */
export function formatPriceWithCompactRules(value: number, step: number): string {
  if (!isFinite(value)) return 'N/A'

  // For prices, typically use plain dollars unless step is very small
  if (step >= 1) {
    return `$${Math.round(value)}`
  } else if (step >= 0.1) {
    return `$${value.toFixed(1)}`
  } else {
    return `$${value.toFixed(2)}`
  }
}

/**
 * Compute Y-axis scale with nice bounds and uniform tick steps
 * Always returns exactly 5 ticks with equal spacing
 */
export function computeYAxisScale(
  data: number[], 
  metricType: MetricType = 'currency',
  desiredTickCount: number = 6
): YAxisScale {
  // Filter out null/NaN values
  const validData = data.filter(v => v !== null && v !== undefined && isFinite(v))
  
  if (validData.length === 0) {
    return {
      domain: [0, 100],
      ticks: [0, 25, 50, 75, 100],
      format: (value: number) => formatValue(value, metricType)
    }
  }

  const min = Math.min(...validData)
  const max = Math.max(...validData)
  const maxAbs = Math.max(Math.abs(min), Math.abs(max))

  // Choose unit early based on magnitude
  const unit = metricType === 'shares' ? pickSharesUnit(maxAbs) : pickUnit(maxAbs)

  // Determine domain bounds
  let domainMin: number
  let domainMax: number

  if (min >= 0) {
    // All positive values: start at 0
    domainMin = 0
    domainMax = max * 1.06 // Add 6% headroom
  } else {
    // Mixed or negative values: pad both sides by 3%
    const range = max - min
    const padding = range * 0.03
    domainMin = min - padding
    domainMax = max + padding
  }

  // Calculate raw step
  const rawStep = (domainMax - domainMin) / (desiredTickCount - 1)
  
  // Get nice step using existing nice number logic
  const niceStep = getNiceNumber(rawStep)

  // Re-snap domain to step grid
  domainMin = Math.floor(domainMin / niceStep) * niceStep
  domainMax = Math.ceil(domainMax / niceStep) * niceStep
  
  // Force domainMin = 0 for all-positive data
  if (min >= 0) {
    domainMin = 0
  }

  // Ensure we have exactly desiredTickCount ticks by recalculating step if needed
  let finalStep = niceStep
  let finalDomainMax = domainMax
  
  // Check if we have enough ticks
  const numSteps = Math.ceil((domainMax - domainMin) / niceStep)
  if (numSteps < desiredTickCount - 1) {
    // Recalculate step to ensure we get exactly desiredTickCount ticks
    finalStep = (domainMax - domainMin) / (desiredTickCount - 1)
    finalDomainMax = domainMin + (finalStep * (desiredTickCount - 1))
  }

  // Generate exactly desiredTickCount equally-spaced ticks
  const ticks: number[] = []
  for (let i = 0; i < desiredTickCount; i++) {
    const tick = domainMin + (finalStep * i)
    ticks.push(tick)
  }

  // Calculate precision
  const stepInUnit = finalStep / unit.scale
  const variabilityHint = calculateVariabilityHint(validData)
  const decimals = decimalsFor(stepInUnit, variabilityHint)

  // Create formatter based on metric type
  const formatTick = (value: number) => {
    const valueInUnit = value / unit.scale
    
    switch (metricType) {
      case 'currency':
      case 'price':
        return `$${valueInUnit.toFixed(decimals)}${unit.suffix}`
      case 'eps':
        return `$${value.toFixed(2)}`
      case 'shares':
        return `${valueInUnit.toFixed(decimals)}${unit.suffix}`
      case 'percent':
        const percentStep = stepInUnit * 100
        const percentDecimals = decimalsFor(percentStep, variabilityHint)
        return `${(value * 100).toFixed(percentDecimals)}%`
      case 'ratio':
        return value.toFixed(Math.max(2, decimals))
      default:
        return valueInUnit.toFixed(decimals) + unit.suffix
    }
  }

  return {
    domain: [domainMin, finalDomainMax],
    ticks,
    format: formatTick
  }
}

/**
 * Format values based on metric type
 */
export function formatValue(value: number, metricType: MetricType): string {
  if (!isFinite(value)) return 'N/A'

  switch (metricType) {
    case 'currency':
      return formatCompactCurrency(value)
    case 'price':
      return `$${value.toFixed(2)}`
    case 'eps':
      return `$${value.toFixed(2)}`
    case 'shares':
      return formatShares(value)
    case 'ratio':
      return value.toFixed(2)
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      return value.toFixed(2)
  }
}

/**
 * Format compact currency values
 */
export function formatCompactCurrency(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

/**
 * Format shares outstanding
 */
export function formatShares(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  return `${(value / 1e6).toFixed(2)}M`
}

/**
 * Format precise values for tooltips (with thousands separators)
 */
export function formatPreciseValue(value: number, metricType: MetricType): string {
  if (!isFinite(value)) return 'N/A'

  switch (metricType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    case 'price':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value)
    case 'eps':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value)
    case 'shares':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    case 'ratio':
      return value.toFixed(2)
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      return new Intl.NumberFormat('en-US').format(value)
  }
}

/**
 * Compute X-axis configuration based on period type
 */
export function computeXAxisConfig(
  data: ChartDataPoint[], 
  period: PeriodType
): XAxisConfig {
  if (!data || data.length === 0) {
    return { ticks: [], labels: [] }
  }

  const dates = data.map(point => point.date).sort()
  const maxTicks = period === 'annual' ? 10 : 8

  // Generate all possible ticks
  let allTicks: string[] = []
  let allLabels: string[] = []

  dates.forEach(date => {
    allTicks.push(date)
    
    if (period === 'annual') {
      allLabels.push(date) // YYYY format
    } else {
      // Quarterly/TTM: YYYY-Qn format
      if (date.includes('Q')) {
        allLabels.push(date)
      } else {
        // Convert YYYY-MM-DD to YYYY-Qn
        const year = date.split('-')[0]
        const month = parseInt(date.split('-')[1])
        const quarter = Math.ceil(month / 3)
        allLabels.push(`${year}-Q${quarter}`)
      }
    }
  })

  // Auto-skip ticks if too many
  if (allTicks.length <= maxTicks) {
    return { ticks: allTicks, labels: allLabels }
  }

  // Calculate skip interval
  const skipInterval = Math.ceil(allTicks.length / maxTicks)
  const ticks: string[] = []
  const labels: string[] = []

  for (let i = 0; i < allTicks.length; i += skipInterval) {
    ticks.push(allTicks[i])
    labels.push(allLabels[i])
  }

  // Always include the last tick
  if (ticks[ticks.length - 1] !== allTicks[allTicks.length - 1]) {
    ticks.push(allTicks[allTicks.length - 1])
    labels.push(allLabels[allLabels.length - 1])
  }

  return { ticks, labels }
}

/**
 * Format tooltip title with period awareness
 */
export function formatTooltipTitle(date: string, period: PeriodType): string {
  if (period === 'annual') {
    return date // YYYY format
  }
  
  // Quarterly/TTM: YYYY-Qn format
  if (date.includes('Q')) {
    const label = date
    return period === 'ttm' ? `${label} (TTM)` : label
  } else {
    // Convert YYYY-MM-DD to YYYY-Qn
    const year = date.split('-')[0]
    const month = parseInt(date.split('-')[1])
    const quarter = Math.ceil(month / 3)
    const label = `${year}-Q${quarter}`
    return period === 'ttm' ? `${label} (TTM)` : label
  }
}

/**
 * Get metric type for formatting
 */
export function getMetricType(metricKey: string): MetricType {
  const currencyMetrics = [
    'revenue', 'grossProfit', 'ebitda', 'operatingIncome', 
    'netIncome', 'freeCashFlow', 'totalAssets', 'totalEquity', 
    'totalDebt', 'totalCash'
  ]
  
  if (currencyMetrics.includes(metricKey)) return 'currency'
  if (metricKey === 'price') return 'price'
  if (metricKey === 'eps') return 'eps'
  if (metricKey === 'sharesOutstanding') return 'shares'
  
  return 'currency' // default
}

/**
 * Get proper metric label for tooltips
 */
export function getMetricLabel(metricKey: string): string {
  const metricLabels: { [key: string]: string } = {
    'price': 'Price',
    'revenue': 'Revenue',
    'grossProfit': 'Gross Profit',
    'ebitda': 'EBITDA',
    'operatingIncome': 'Operating Income',
    'netIncome': 'Net Income',
    'freeCashFlow': 'Free Cash Flow',
    'totalDebt': 'Total Debt',
    'totalCash': 'Total Cash',
    'eps': 'EPS',
    'sharesOutstanding': 'Shares Outstanding'
  }
  
  return metricLabels[metricKey] || metricKey
}

/**
 * Calculate CAGR with proper validation
 */
export interface CAGRResult {
  years: number
  cagrPct: number | null
  start: number
  end: number
}

export function computeCAGR(series: Array<{date: string; value: number}>): CAGRResult {
  // Filter out invalid values
  const validData = series.filter(point => 
    point.value != null && 
    !isNaN(point.value) && 
    isFinite(point.value)
  )

  if (validData.length < 2) {
    return { years: 0, cagrPct: null, start: 0, end: 0 }
  }

  const first = validData[0]
  const last = validData[validData.length - 1]

  // Check for sign change (invalid for CAGR)
  if ((first.value < 0 && last.value > 0) || (first.value > 0 && last.value < 0)) {
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
