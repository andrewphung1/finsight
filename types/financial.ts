export interface StockPrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  timestamp: string
}

export interface HistoricalPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CompanyInfo {
  symbol: string
  name: string
  sector: string
  industry: string
  marketCap: number
  description: string
}

export interface FinancialMetrics {
  symbol: string
  revenue: number
  freeCashFlow: number
  netIncome: number
  totalDebt: number
  totalCash: number
  peRatio: number
  pbRatio: number
  debtToEquity: number
  returnOnEquity: number
  year: number
}

export interface SearchResult {
  symbol: string
  name: string
  type: string
  region: string
  marketOpen: string
  marketClose: string
  timezone: string
  currency: string
  matchScore: number
}
