export interface TradingTransaction {
  id: string
  ticker: string
  date: string
  quantity: number
  price: number
  type: "BUY" | "SELL"
  userId: string
}

export interface ParsedCSVRow {
  ticker: string
  date: string
  quantity: string
  price: string
  type: string
}

export interface CSVParseResult {
  success: boolean
  data: TradingTransaction[]
  errors: string[]
  totalRows: number
}
