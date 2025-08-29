import { formatCompactCurrency, formatShares } from "@/lib/format-utils"

// Types
export type TimePeriod = 'quarterly' | 'ttm' | 'annual'

export interface FundamentalsPoint {
  date: string
  revenue: number
  grossProfit: number
  ebitda: number
  operatingIncome: number
  netIncome: number
  freeCashFlow: number
  totalAssets: number
  totalEquity: number
  totalDebt: number
  totalCash: number
  eps: number
  sharesOutstanding: number
}

export type MetricKey = keyof Omit<FundamentalsPoint, 'date'>

export interface SeriesPoint {
  date: string
  label: string
  value: number
}

// Metric classification
export const FLOW_METRICS: MetricKey[] = [
  'revenue',
  'grossProfit', 
  'ebitda',
  'operatingIncome',
  'netIncome',
  'freeCashFlow'
]

export const STOCK_METRICS: MetricKey[] = [
  'totalAssets',
  'totalEquity',
  'totalDebt',
  'totalCash',
  'sharesOutstanding'
]

export const EPS_METRIC: MetricKey = 'eps'

// Formatting helpers
export function getValueFormatter(metric: MetricKey): (value: number) => string {
  const formatters: Record<MetricKey, (value: number) => string> = {
    revenue: formatCompactCurrency,
    grossProfit: formatCompactCurrency,
    ebitda: formatCompactCurrency,
    operatingIncome: formatCompactCurrency,
    netIncome: formatCompactCurrency,
    freeCashFlow: formatCompactCurrency,
    totalAssets: formatCompactCurrency,
    totalEquity: formatCompactCurrency,
    totalDebt: formatCompactCurrency,
    totalCash: formatCompactCurrency,
    eps: (value) => `$${value.toFixed(2)}`,
    sharesOutstanding: formatShares
  }
  
  return formatters[metric]
}

export function formatTickLabel(date: string, period: TimePeriod): string {
  if (period === 'annual') {
    return date // YYYY format
  }
  return date // YYYY-Qn format for quarterly/TTM
}

// Core logic
export function normalizeAndSort(data: FundamentalsPoint[]): FundamentalsPoint[] {
  return data
    .filter(point => point.date && point.date.trim() !== '')
    .map(point => ({
      ...point,
      // Ensure all numeric values are finite numbers, default to 0 if invalid
      revenue: Number.isFinite(point.revenue) ? point.revenue : 0,
      grossProfit: Number.isFinite(point.grossProfit) ? point.grossProfit : 0,
      ebitda: Number.isFinite(point.ebitda) ? point.ebitda : 0,
      operatingIncome: Number.isFinite(point.operatingIncome) ? point.operatingIncome : 0,
      netIncome: Number.isFinite(point.netIncome) ? point.netIncome : 0,
      freeCashFlow: Number.isFinite(point.freeCashFlow) ? point.freeCashFlow : 0,
      totalAssets: Number.isFinite(point.totalAssets) ? point.totalAssets : 0,
      totalEquity: Number.isFinite(point.totalEquity) ? point.totalEquity : 0,
      totalDebt: Number.isFinite(point.totalDebt) ? point.totalDebt : 0,
      totalCash: Number.isFinite(point.totalCash) ? point.totalCash : 0,
      eps: Number.isFinite(point.eps) ? point.eps : 0,
      sharesOutstanding: Number.isFinite(point.sharesOutstanding) ? point.sharesOutstanding : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Utilities
export function rollingWindowSum(
  data: FundamentalsPoint[], 
  metric: MetricKey, 
  windowSize: number = 4
): SeriesPoint[] {
  if (data.length < windowSize) return []
  
  const result: SeriesPoint[] = []
  
  for (let i = windowSize - 1; i < data.length; i++) {
    const window = data.slice(i - windowSize + 1, i + 1)
    const sum = window.reduce((acc, point) => acc + (point[metric] || 0), 0)
    
    result.push({
      date: data[i].date,
      label: formatTickLabel(data[i].date, 'ttm'),
      value: sum
    })
  }
  
  return result
}

export function buildSeries(
  quarterly: FundamentalsPoint[],
  annual: FundamentalsPoint[],
  metric: MetricKey,
  period: TimePeriod
): SeriesPoint[] {
  const normalizedQuarterly = normalizeAndSort(quarterly)
  const normalizedAnnual = normalizeAndSort(annual)
  
  switch (period) {
    case 'quarterly':
      return normalizedQuarterly.map(point => ({
        date: point.date,
        label: formatTickLabel(point.date, 'quarterly'),
        value: point[metric] || 0
      }))
    
    case 'ttm':
      if (metric === EPS_METRIC) {
        // EPS: sum of last 4 quarters
        return rollingWindowSum(normalizedQuarterly, metric, 4)
      } else if (FLOW_METRICS.includes(metric)) {
        // Flow metrics: sum of last 4 quarters
        return rollingWindowSum(normalizedQuarterly, metric, 4)
      } else if (STOCK_METRICS.includes(metric)) {
        // Stock metrics: last reported value in rolling window
        if (normalizedQuarterly.length < 4) return []
        
        const result: SeriesPoint[] = []
        for (let i = 3; i < normalizedQuarterly.length; i++) {
          const point = normalizedQuarterly[i]
          result.push({
            date: point.date,
            label: formatTickLabel(point.date, 'ttm'),
            value: point[metric] || 0
          })
        }
        return result
      }
      return []
    
    case 'annual':
      return normalizedAnnual.map(point => ({
        date: point.date,
        label: formatTickLabel(point.date, 'annual'),
        value: point[metric] || 0
      }))
    
    default:
      return []
  }
}

// Helper function to limit data points to prevent overcrowding
export function limitSeriesPoints(series: SeriesPoint[], period: TimePeriod): SeriesPoint[] {
  const maxPoints = period === 'annual' ? 10 : 24
  return series.slice(-maxPoints)
}

// Helper function to get the complete series for a metric and period
export function getMetricSeries(
  quarterly: FundamentalsPoint[],
  annual: FundamentalsPoint[],
  metric: MetricKey,
  period: TimePeriod
): SeriesPoint[] {
  const series = buildSeries(quarterly, annual, metric, period)
  return limitSeriesPoints(series, period)
}
