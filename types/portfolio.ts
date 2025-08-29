export interface Position {
  ticker: string
  shares: number
  avgSharePrice: number // Average price per share when purchased
  marketValue: number
  unrealizedGain: number
  unrealizedGainPercent: number
  realizedGain: number
  weight: number
  sector?: string
  lastPrice?: number
  lastUpdated?: string
  // NEW: Price resolution tracking
  priceStatus?: PricingStatus
  lastKnownPrice?: number
  // NEW: Enhanced fields for better tracking
  totalCost?: number
  filledShares?: number
  fees?: number
  // Legacy properties for backward compatibility
  quantity?: number
  averageCost?: number
  currentPrice?: number
  totalCost?: number
}

export interface PortfolioMetrics {
  totalValue: number
  totalCost: number
  totalGain: number
  totalGainPercent: number
  dayChange: number
  dayChangePercent: number
  positions: Position[]
  assetAllocation: AssetAllocation[]
}

export interface AssetAllocation {
  ticker: string
  name: string
  value: number
  weight: number
  sector?: string
}

export interface PerformanceData {
  date: string
  value: number
  return: number
  cumulativeReturn: number
}

export interface PortfolioAnalytics {
  metrics: PortfolioMetrics
  performance: PerformanceData[]
  holdingsPerformance: Array<{
    ticker: string
    name: string
    totalReturn: number
    totalReturnPercent: number
    realizedGain: number
    unrealizedGain: number
    marketValue: number
    costBasis: number
  }>
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  bestDay: number
  worstDay: number
}

// CSV Import Types
export interface CSVTransaction {
  ticker: string
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT' | 'CASH_IN' | 'CASH_OUT'
  date: string // ISO date string
  quantity: number
  price?: number
  fees?: number
  fx_rate?: number
  notes?: string
  action?: 'amend' | 'delete'
  rawRow: string // Original CSV row for audit
  rowNumber: number
  sourceFile: string
}

export interface NormalizedTransaction extends CSVTransaction {
  id: string // Stable hash-based ID
  normalizedTicker: string
  signedQuantity: number // Negative for SELL
  totalCost: number // Including fees
  currency: string
  fxApplied: boolean
  lotId?: string // For cost basis tracking
}

export interface ValidationError {
  rowNumber: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ImportPreview {
  validRows: NormalizedTransaction[]
  invalidRows: ValidationError[]
  potentialDuplicates: Array<{
    existing: NormalizedTransaction
    new: NormalizedTransaction
    confidence: number
  }>
  fxRequired: NormalizedTransaction[]
  summary: {
    totalRows: number
    validCount: number
    errorCount: number
    warningCount: number
    netCashEffect: number
    shareChanges: Record<string, number>
    postImportPositions: Position[]
  }
}

export interface CostBasisLot {
  id: string
  ticker: string
  shares: number
  costBasis: number
  date: string
  fees: number
}

export interface PortfolioSnapshot {
  date: string
  totalValue: number
  totalCost: number
  totalGain: number
  totalGainPercent: number
  totalReturnPercent: number
  positions: Position[]
  cash: number
  netContributions: number
}

export interface PerformanceMetrics {
  totalValue: number
  totalGain: number
  totalGainPercent: number
  ytdReturn: number
  cagr1Y?: number
  cagr3Y?: number
  cagr5Y?: number
  twr?: number
  positions: Position[]
  assetAllocation: AssetAllocation[]
  lastUpdated: string
  baselineDate: string
}

export interface PriceCache {
  symbol: string
  date: string
  price: number
  currency: string
  source: string
  timestamp: string
}

export interface FXRate {
  fromCurrency: string
  toCurrency: string
  date: string
  rate: number
  timestamp: string
}

export interface ImportResult {
  success: boolean
  transactionsAdded: number
  transactionsAmended: number
  transactionsSkipped: number
  symbolsAffected: string[]
  priceFetchesQueued: number
  fxFetchesQueued: number
  errors: ValidationError[]
  preview?: ImportPreview
  trades?: any[] // Add trades data
  sessionId?: string // Session ID for imported portfolio
}

export type PricingStatus = 'pending' | 'resolving' | 'resolved' | 'error'
