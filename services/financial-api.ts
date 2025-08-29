// Using Alpha Vantage API as the primary data source
// Free tier: 25 requests per day, 5 requests per minute

const API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || "demo"
const BASE_URL = "https://www.alphavantage.co/query"

// Rate limiting helper
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests = 4 // Reduced to be more conservative
  private readonly timeWindow = 60000 // 1 minute

  canMakeRequest(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter((time) => now - time < this.timeWindow)
    return this.requests.length < this.maxRequests
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0
    const oldestRequest = Math.min(...this.requests)
    const waitTime = this.timeWindow - (Date.now() - oldestRequest)
    return Math.max(0, waitTime)
  }
}

const rateLimiter = new RateLimiter()

// Caching system to reduce API calls
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }
}

const apiCache = new APICache()

async function makeAPIRequest(params: Record<string, string>) {
  const cacheKey = JSON.stringify(params)
  const cachedData = apiCache.get(cacheKey)
  if (cachedData) {
    return cachedData
  }

  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime()
    throw new Error(
      `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before making another request.`,
    )
  }

  const url = new URL(BASE_URL)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })
  url.searchParams.append("apikey", API_KEY)

  rateLimiter.recordRequest()

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  const data = await response.json()

  if (data["Error Message"]) {
    throw new Error(data["Error Message"])
  }

  if (data["Note"]) {
    throw new Error("API rate limit exceeded. Please try again later.")
  }

  apiCache.set(cacheKey, data, 5 * 60 * 1000) // 5 minutes for most data

  return data
}

interface SearchResult {
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

interface StockPrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  timestamp: string
}

interface HistoricalPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface CompanyInfo {
  symbol: string
  name: string
  sector: string
  industry: string
  marketCap: number
  description: string
  year: number
}

interface FinancialMetrics {
  revenue: number
  netIncome: number
  totalDebt: number
  totalCash: number
  peRatio: number
  pbRatio: number
  debtToEquity: number
  returnOnEquity: number
  grossProfit: number
  ebitda: number
  operatingIncome: number
  freeCashFlow: number
  totalAssets: number
  totalEquity: number
  currentRatio: number
  quickRatio: number
  profitMargin: number
  operatingMargin: number
  ebitdaMargin: number
  grossMargin: number
  revenueGrowth: number
  netIncomeGrowth: number
  eps: number
  bookValuePerShare: number
  dividendYield: number
  payoutRatio: number
}

interface HistoricalFinancials {
  year: number
  revenue: number
  grossProfit: number
  ebitda: number
  operatingIncome: number
  netIncome: number
  freeCashFlow: number
  totalAssets: number
  totalEquity: number
  eps: number
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  try {
    if (API_KEY === "demo" || !rateLimiter.canMakeRequest()) {
      return mockData.searchResults.filter(
        (result) =>
          result.symbol.toLowerCase().includes(query.toLowerCase()) ||
          result.name.toLowerCase().includes(query.toLowerCase()),
      )
    }

    const data = await makeAPIRequest({
      function: "SYMBOL_SEARCH",
      keywords: query,
    })

    if (!data.bestMatches) {
      return []
    }

    return data.bestMatches.map((match: any) => ({
      symbol: match["1. symbol"],
      name: match["2. name"],
      type: match["3. type"],
      region: match["4. region"],
      marketOpen: match["5. marketOpen"],
      marketClose: match["6. marketClose"],
      timezone: match["7. timezone"],
      currency: match["8. currency"],
      matchScore: Number.parseFloat(match["9. matchScore"]),
    }))
  } catch (error) {
    console.error("Symbol search failed:", error)
    return mockData.searchResults.filter(
      (result) =>
        result.symbol.toLowerCase().includes(query.toLowerCase()) ||
        result.name.toLowerCase().includes(query.toLowerCase()),
    )
  }
}

function getMockPrice(symbol: string): StockPrice {
  const mockPrices: Record<string, StockPrice> = {
    AAPL: { symbol: "AAPL", price: 175.43, change: 2.15, changePercent: 1.24, timestamp: "2024-01-15" },
    MSFT: { symbol: "MSFT", price: 378.85, change: -1.23, changePercent: -0.32, timestamp: "2024-01-15" },
    GOOGL: { symbol: "GOOGL", price: 142.56, change: 3.45, changePercent: 2.48, timestamp: "2024-01-15" },
    AMZN: { symbol: "AMZN", price: 155.89, change: 0.78, changePercent: 0.5, timestamp: "2024-01-15" },
    TSLA: { symbol: "TSLA", price: 248.42, change: -5.67, changePercent: -2.23, timestamp: "2024-01-15" },
    NVDA: { symbol: "NVDA", price: 875.28, change: 12.34, changePercent: 1.43, timestamp: "2024-01-15" },
    META: { symbol: "META", price: 485.22, change: 8.91, changePercent: 1.87, timestamp: "2024-01-15" },
    NFLX: { symbol: "NFLX", price: 487.83, change: -2.45, changePercent: -0.5, timestamp: "2024-01-15" },
  }

  return (
    mockPrices[symbol] || {
      symbol,
      price: 100 + Math.random() * 200,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      timestamp: "2024-01-15",
    }
  )
}

function getMockCompanyInfo(symbol: string): CompanyInfo & Partial<FinancialMetrics> {
  const mockCompanies: Record<string, CompanyInfo & Partial<FinancialMetrics>> = {
    AAPL: {
      symbol: "AAPL",
      name: "Apple Inc.",
      sector: "Technology",
      industry: "Consumer Electronics",
      marketCap: 2800000000000,
      description:
        "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
      revenue: 394328000000,
      grossProfit: 169148000000,
      ebitda: 123136000000,
      operatingIncome: 114301000000,
      netIncome: 99803000000,
      freeCashFlow: 99584000000,
      totalAssets: 352755000000,
      totalEquity: 62146000000,
      totalDebt: 123000000000,
      totalCash: 67000000000,
      peRatio: 28.5,
      pbRatio: 45.2,
      eps: 6.16,
      bookValuePerShare: 3.85,
      currentRatio: 1.04,
      quickRatio: 0.82,
      debtToEquity: 1.84,
      returnOnEquity: 0.175,
      profitMargin: 0.253,
      operatingMargin: 0.29,
      ebitdaMargin: 0.312,
      grossMargin: 0.429,
      revenueGrowth: 0.028,
      netIncomeGrowth: 0.135,
      dividendYield: 0.0044,
      payoutRatio: 0.15,
      year: 2024,
    },
    MSFT: {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      sector: "Technology",
      industry: "Software",
      marketCap: 2900000000000,
      description:
        "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.",
      revenue: 211915000000,
      grossProfit: 146052000000,
      ebitda: 89035000000,
      operatingIncome: 88523000000,
      netIncome: 72361000000,
      freeCashFlow: 65149000000,
      totalAssets: 411976000000,
      totalEquity: 206223000000,
      totalDebt: 58000000000,
      totalCash: 144000000000,
      peRatio: 32.1,
      pbRatio: 12.8,
      eps: 9.65,
      bookValuePerShare: 27.4,
      currentRatio: 1.77,
      quickRatio: 1.68,
      debtToEquity: 0.47,
      returnOnEquity: 0.38,
      profitMargin: 0.341,
      operatingMargin: 0.418,
      ebitdaMargin: 0.42,
      grossMargin: 0.689,
      revenueGrowth: 0.072,
      netIncomeGrowth: 0.112,
      dividendYield: 0.0068,
      payoutRatio: 0.25,
      year: 2024,
    },
    GOOGL: {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      sector: "Technology",
      industry: "Internet Services",
      marketCap: 1800000000000,
      description:
        "Alphabet Inc. provides online advertising services in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.",
      revenue: 307394000000,
      grossProfit: 181690000000,
      ebitda: 98502000000,
      operatingIncome: 84267000000,
      netIncome: 73795000000,
      freeCashFlow: 69495000000,
      totalAssets: 402392000000,
      totalEquity: 283893000000,
      totalDebt: 28000000000,
      totalCash: 118000000000,
      peRatio: 24.3,
      pbRatio: 5.8,
      eps: 5.8,
      bookValuePerShare: 22.25,
      currentRatio: 2.69,
      quickRatio: 2.64,
      debtToEquity: 0.12,
      returnOnEquity: 0.27,
      profitMargin: 0.24,
      operatingMargin: 0.274,
      ebitdaMargin: 0.32,
      grossMargin: 0.591,
      revenueGrowth: 0.089,
      netIncomeGrowth: 0.234,
      dividendYield: 0.0,
      payoutRatio: 0.0,
      year: 2024,
    },
    AMZN: {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      sector: "Consumer Discretionary",
      industry: "Internet Retail",
      marketCap: 1600000000000,
      description:
        "Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.",
      revenue: 574785000000,
      grossProfit: 270046000000,
      ebitda: 71654000000,
      operatingIncome: 36852000000,
      netIncome: 30425000000,
      freeCashFlow: 35574000000,
      totalAssets: 527854000000,
      totalEquity: 201876000000,
      totalDebt: 58314000000,
      totalCash: 73387000000,
      peRatio: 52.8,
      pbRatio: 8.2,
      eps: 2.9,
      bookValuePerShare: 19.15,
      currentRatio: 1.09,
      quickRatio: 0.87,
      debtToEquity: 0.35,
      returnOnEquity: 0.16,
      profitMargin: 0.053,
      operatingMargin: 0.064,
      ebitdaMargin: 0.125,
      grossMargin: 0.47,
      revenueGrowth: 0.094,
      netIncomeGrowth: 1.218,
      dividendYield: 0.0,
      payoutRatio: 0.0,
      year: 2024,
    },
    TSLA: {
      symbol: "TSLA",
      name: "Tesla, Inc.",
      sector: "Consumer Discretionary",
      industry: "Auto Manufacturers",
      marketCap: 800000000000,
      description:
        "Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.",
      revenue: 96773000000,
      grossProfit: 17660000000,
      ebitda: 11543000000,
      operatingIncome: 8891000000,
      netIncome: 14997000000,
      freeCashFlow: 7533000000,
      totalAssets: 106618000000,
      totalEquity: 62634000000,
      totalDebt: 9566000000,
      totalCash: 29094000000,
      peRatio: 53.4,
      pbRatio: 12.8,
      eps: 4.73,
      bookValuePerShare: 19.73,
      currentRatio: 1.84,
      quickRatio: 1.55,
      debtToEquity: 0.18,
      returnOnEquity: 0.27,
      profitMargin: 0.155,
      operatingMargin: 0.092,
      ebitdaMargin: 0.119,
      grossMargin: 0.182,
      revenueGrowth: 0.189,
      netIncomeGrowth: 1.274,
      dividendYield: 0.0,
      payoutRatio: 0.0,
      year: 2024,
    },
    NVDA: {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      sector: "Technology",
      industry: "Semiconductors",
      marketCap: 2200000000000,
      description:
        "NVIDIA Corporation operates as a visual computing company worldwide. It operates in two segments, Graphics and Compute & Networking.",
      revenue: 79774000000,
      grossProfit: 57026000000,
      ebitda: 48090000000,
      operatingIncome: 47743000000,
      netIncome: 42635000000,
      freeCashFlow: 37346000000,
      totalAssets: 85432000000,
      totalEquity: 55687000000,
      totalDebt: 9703000000,
      totalCash: 35280000000,
      peRatio: 51.6,
      pbRatio: 39.5,
      eps: 17.32,
      bookValuePerShare: 22.58,
      currentRatio: 4.55,
      quickRatio: 4.32,
      debtToEquity: 0.2,
      returnOnEquity: 0.83,
      profitMargin: 0.534,
      operatingMargin: 0.598,
      ebitdaMargin: 0.603,
      grossMargin: 0.715,
      revenueGrowth: 1.262,
      netIncomeGrowth: 5.812,
      dividendYield: 0.0028,
      payoutRatio: 0.05,
      year: 2024,
    },
    META: {
      symbol: "META",
      name: "Meta Platforms, Inc.",
      sector: "Technology",
      industry: "Internet Content & Information",
      marketCap: 1300000000000,
      description:
        "Meta Platforms, Inc. develops products that enable people to connect and share with friends and family through mobile devices, personal computers, virtual reality headsets, and wearables worldwide.",
      revenue: 134902000000,
      grossProfit: 108725000000,
      ebitda: 54462000000,
      operatingIncome: 46753000000,
      netIncome: 39098000000,
      freeCashFlow: 43020000000,
      totalAssets: 229334000000,
      totalEquity: 165040000000,
      totalDebt: 18385000000,
      totalCash: 65400000000,
      peRatio: 26.8,
      pbRatio: 7.9,
      eps: 14.87,
      bookValuePerShare: 62.73,
      currentRatio: 2.54,
      quickRatio: 2.48,
      debtToEquity: 0.13,
      returnOnEquity: 0.26,
      profitMargin: 0.29,
      operatingMargin: 0.347,
      ebitdaMargin: 0.404,
      grossMargin: 0.806,
      revenueGrowth: 0.159,
      netIncomeGrowth: 0.352,
      dividendYield: 0.0037,
      payoutRatio: 0.1,
      year: 2024,
    },
    NFLX: {
      symbol: "NFLX",
      name: "Netflix, Inc.",
      sector: "Communication Services",
      industry: "Entertainment",
      marketCap: 210000000000,
      description:
        "Netflix, Inc. provides entertainment services. It offers TV series, documentaries and feature films across a wide variety of genres and languages to members in over 190 countries.",
      revenue: 33723000000,
      grossProfit: 15011000000,
      ebitda: 9954000000,
      operatingIncome: 8038000000,
      netIncome: 5407000000,
      freeCashFlow: 6925000000,
      totalAssets: 48594000000,
      totalEquity: 15849000000,
      totalDebt: 14353000000,
      totalCash: 8069000000,
      peRatio: 38.9,
      pbRatio: 13.2,
      eps: 12.12,
      bookValuePerShare: 35.55,
      currentRatio: 1.15,
      quickRatio: 1.12,
      debtToEquity: 1.06,
      returnOnEquity: 0.37,
      profitMargin: 0.16,
      operatingMargin: 0.238,
      ebitdaMargin: 0.295,
      grossMargin: 0.445,
      revenueGrowth: 0.065,
      netIncomeGrowth: 0.205,
      dividendYield: 0.0,
      payoutRatio: 0.0,
      year: 2024,
    },
  }

  return (
    mockCompanies[symbol] || {
      symbol,
      name: `${symbol} Corporation`,
      sector: "Technology",
      industry: "Software",
      marketCap: 50000000000,
      description: `${symbol} is a technology company.`,
      revenue: 10000000000,
      grossProfit: 4000000000,
      ebitda: 2500000000,
      operatingIncome: 2000000000,
      netIncome: 1500000000,
      freeCashFlow: 1800000000,
      totalAssets: 25000000000,
      totalEquity: 15000000000,
      totalDebt: 5000000000,
      totalCash: 8000000000,
      peRatio: 25.0,
      pbRatio: 3.5,
      eps: 2.5,
      bookValuePerShare: 15.0,
      currentRatio: 1.5,
      quickRatio: 1.2,
      debtToEquity: 0.6,
      returnOnEquity: 0.15,
      profitMargin: 0.15,
      operatingMargin: 0.2,
      ebitdaMargin: 0.25,
      grossMargin: 0.4,
      revenueGrowth: 0.1,
      netIncomeGrowth: 0.12,
      dividendYield: 0.02,
      payoutRatio: 0.3,
      year: 2024,
    }
  )
}

export async function getCurrentPrice(symbol: string): Promise<StockPrice> {
  try {
    if (API_KEY === "demo") {
      return getMockPrice(symbol)
    }

    if (!rateLimiter.canMakeRequest()) {
      console.log(`[v0] Rate limit hit, using mock data for ${symbol}`)
      return getMockPrice(symbol)
    }

    const data = await makeAPIRequest({
      function: "GLOBAL_QUOTE",
      symbol: symbol,
    })

    const quote = data["Global Quote"]
    if (!quote || !quote["01. symbol"]) {
      console.log(`[v0] No API data found for ${symbol}, using mock data`)
      return getMockPrice(symbol)
    }

    return {
      symbol: quote["01. symbol"],
      price: Number.parseFloat(quote["05. price"]),
      change: Number.parseFloat(quote["09. change"]),
      changePercent: Number.parseFloat(quote["10. change percent"].replace("%", "")),
      timestamp: quote["07. latest trading day"],
    }
  } catch (error) {
    console.log(`[v0] API error for ${symbol}, using mock data:`, error)
    return getMockPrice(symbol)
  }
}

export async function getHistoricalPrices(
  symbol: string,
  period: "daily" | "weekly" | "monthly" = "daily",
): Promise<HistoricalPrice[]> {
  try {
    const functionMap = {
      daily: "TIME_SERIES_DAILY",
      weekly: "TIME_SERIES_WEEKLY",
      monthly: "TIME_SERIES_MONTHLY",
    }

    const data = await makeAPIRequest({
      function: functionMap[period],
      symbol: symbol,
      outputsize: "compact", // Last 100 data points
    })

    const timeSeriesKey = Object.keys(data).find((key) => key.includes("Time Series"))
    if (!timeSeriesKey || !data[timeSeriesKey]) {
      throw new Error("No historical data found")
    }

    const timeSeries = data[timeSeriesKey]

    return Object.entries(timeSeries)
      .map(([date, values]: [string, any]) => ({
        date,
        open: Number.parseFloat(values["1. open"]),
        high: Number.parseFloat(values["2. high"]),
        low: Number.parseFloat(values["3. low"]),
        close: Number.parseFloat(values["4. close"]),
        volume: Number.parseInt(values["5. volume"]),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  } catch (error) {
    console.error("Historical prices fetch failed:", error)
    throw error
  }
}

export async function getCompanyOverview(symbol: string): Promise<CompanyInfo & Partial<FinancialMetrics>> {
  try {
    if (API_KEY === "demo") {
      return getMockCompanyInfo(symbol)
    }

    if (!rateLimiter.canMakeRequest()) {
      console.log(`[v0] Rate limit hit, using mock company data for ${symbol}`)
      return getMockCompanyInfo(symbol)
    }

    const data = await makeAPIRequest({
      function: "OVERVIEW",
      symbol: symbol,
    })

    if (!data.Symbol) {
      console.log(`[v0] No company data found for ${symbol}, using mock data`)
      return getMockCompanyInfo(symbol)
    }

    return {
      symbol: data.Symbol,
      name: data.Name,
      sector: data.Sector || "N/A",
      industry: data.Industry || "N/A",
      marketCap: Number.parseInt(data.MarketCapitalization) || 0,
      description: data.Description || "No description available",
      revenue: Number.parseInt(data.RevenueTTM) || 0,
      grossProfit: Number.parseInt(data.GrossProfitTTM) || 0,
      ebitda: Number.parseInt(data.EBITDA) || 0,
      operatingIncome: Number.parseInt(data.OperatingIncomeTTM) || 0,
      netIncome: Number.parseInt(data.NetIncomeTTM) || 0,
      freeCashFlow: Number.parseInt(data.FreeCashFlowTTM) || 0,
      totalAssets: Number.parseInt(data.TotalAssets) || 0,
      totalEquity: Number.parseInt(data.TotalEquity) || 0,
      totalDebt: Number.parseInt(data.TotalDebt) || 0,
      totalCash: Number.parseInt(data.TotalCash) || 0,
      peRatio: Number.parseFloat(data.PERatio) || 0,
      pbRatio: Number.parseFloat(data.PriceToBookRatio) || 0,
      eps: Number.parseFloat(data.EPS) || 0,
      bookValuePerShare: Number.parseFloat(data.BookValuePerShare) || 0,
      currentRatio: Number.parseFloat(data.CurrentRatio) || 0,
      quickRatio: Number.parseFloat(data.QuickRatio) || 0,
      debtToEquity: Number.parseFloat(data.DebtToEquityRatio) || 0,
      returnOnEquity: Number.parseFloat(data.ReturnOnEquityTTM) || 0,
      profitMargin: Number.parseFloat(data.ProfitMargin) || 0,
      operatingMargin: Number.parseFloat(data.OperatingMargin) || 0,
      ebitdaMargin: Number.parseFloat(data.EBITDAMargin) || 0,
      grossMargin: Number.parseFloat(data.GrossMargin) || 0,
      revenueGrowth: Number.parseFloat(data.RevenueGrowthTTM) || 0,
      netIncomeGrowth: Number.parseFloat(data.NetIncomeGrowthTTM) || 0,
      dividendYield: Number.parseFloat(data.DividendYield) || 0,
      payoutRatio: Number.parseFloat(data.PayoutRatio) || 0,
      year: new Date().getFullYear(),
    }
  } catch (error) {
    console.log(`[v0] Company API error for ${symbol}, using mock data:`, error)
    return getMockCompanyInfo(symbol)
  }
}

export function getHistoricalFinancials(symbol: string): HistoricalFinancials[] {
  const historicalData: Record<string, HistoricalFinancials[]> = {
    AAPL: [
      {
        year: 2019,
        revenue: 260174000000,
        grossProfit: 98392000000,
        ebitda: 76477000000,
        operatingIncome: 63930000000,
        netIncome: 55256000000,
        freeCashFlow: 58896000000,
        totalAssets: 338516000000,
        totalEquity: 90488000000,
        eps: 2.97,
      },
      {
        year: 2020,
        revenue: 274515000000,
        grossProfit: 104956000000,
        ebitda: 81020000000,
        operatingIncome: 66288000000,
        netIncome: 57411000000,
        freeCashFlow: 73365000000,
        totalAssets: 323888000000,
        totalEquity: 65339000000,
        eps: 3.28,
      },
      {
        year: 2021,
        revenue: 365817000000,
        grossProfit: 152836000000,
        ebitda: 120233000000,
        operatingIncome: 108949000000,
        netIncome: 94680000000,
        freeCashFlow: 92953000000,
        totalAssets: 351002000000,
        totalEquity: 63090000000,
        eps: 5.61,
      },
      {
        year: 2022,
        revenue: 394328000000,
        grossProfit: 170782000000,
        ebitda: 130541000000,
        operatingIncome: 119437000000,
        netIncome: 99803000000,
        freeCashFlow: 111443000000,
        totalAssets: 352755000000,
        totalEquity: 50672000000,
        eps: 6.11,
      },
      {
        year: 2023,
        revenue: 383285000000,
        grossProfit: 169148000000,
        ebitda: 123136000000,
        operatingIncome: 114301000000,
        netIncome: 96995000000,
        freeCashFlow: 99584000000,
        totalAssets: 352583000000,
        totalEquity: 62146000000,
        eps: 6.16,
      },
    ],
    MSFT: [
      {
        year: 2019,
        revenue: 125843000000,
        grossProfit: 82933000000,
        ebitda: 52130000000,
        operatingIncome: 42959000000,
        netIncome: 39240000000,
        freeCashFlow: 38260000000,
        totalAssets: 286556000000,
        totalEquity: 102330000000,
        eps: 5.06,
      },
      {
        year: 2020,
        revenue: 143015000000,
        grossProfit: 96937000000,
        ebitda: 60675000000,
        operatingIncome: 52959000000,
        netIncome: 44281000000,
        freeCashFlow: 45234000000,
        totalAssets: 301311000000,
        totalEquity: 118304000000,
        eps: 5.76,
      },
      {
        year: 2021,
        revenue: 168088000000,
        grossProfit: 115856000000,
        ebitda: 71235000000,
        operatingIncome: 69916000000,
        netIncome: 61271000000,
        freeCashFlow: 56118000000,
        totalAssets: 333779000000,
        totalEquity: 141988000000,
        eps: 8.05,
      },
      {
        year: 2022,
        revenue: 198270000000,
        grossProfit: 135620000000,
        ebitda: 83383000000,
        operatingIncome: 83383000000,
        netIncome: 72738000000,
        freeCashFlow: 65149000000,
        totalAssets: 364840000000,
        totalEquity: 166542000000,
        eps: 9.65,
      },
      {
        year: 2023,
        revenue: 211915000000,
        grossProfit: 146052000000,
        ebitda: 89035000000,
        operatingIncome: 88523000000,
        netIncome: 72361000000,
        freeCashFlow: 65149000000,
        totalAssets: 411976000000,
        totalEquity: 206223000000,
        eps: 9.65,
      },
    ],
    GOOGL: [
      {
        year: 2019,
        revenue: 161857000000,
        grossProfit: 89961000000,
        ebitda: 47971000000,
        operatingIncome: 34231000000,
        netIncome: 34343000000,
        freeCashFlow: 30972000000,
        totalAssets: 275909000000,
        totalEquity: 201442000000,
        eps: 49.16,
      },
      {
        year: 2020,
        revenue: 182527000000,
        grossProfit: 104062000000,
        ebitda: 56564000000,
        operatingIncome: 41224000000,
        netIncome: 40269000000,
        freeCashFlow: 42843000000,
        totalAssets: 319616000000,
        totalEquity: 222544000000,
        eps: 58.61,
      },
      {
        year: 2021,
        revenue: 257637000000,
        grossProfit: 153906000000,
        ebitda: 94159000000,
        operatingIncome: 78714000000,
        netIncome: 76033000000,
        freeCashFlow: 67012000000,
        totalAssets: 359268000000,
        totalEquity: 251635000000,
        eps: 112.2,
      },
      {
        year: 2022,
        revenue: 282836000000,
        grossProfit: 156633000000,
        ebitda: 91973000000,
        operatingIncome: 74842000000,
        netIncome: 59972000000,
        freeCashFlow: 60010000000,
        totalAssets: 365264000000,
        totalEquity: 256144000000,
        eps: 4.56,
      },
      {
        year: 2023,
        revenue: 307394000000,
        grossProfit: 181690000000,
        ebitda: 98502000000,
        operatingIncome: 84267000000,
        netIncome: 73795000000,
        freeCashFlow: 69495000000,
        totalAssets: 402392000000,
        totalEquity: 283893000000,
        eps: 5.8,
      },
    ],
  }

  return (
    historicalData[symbol] || [
      {
        year: 2019,
        revenue: 8000000000,
        grossProfit: 3200000000,
        ebitda: 2000000000,
        operatingIncome: 1600000000,
        netIncome: 1200000000,
        freeCashFlow: 1400000000,
        totalAssets: 20000000000,
        totalEquity: 12000000000,
        eps: 2.0,
      },
      {
        year: 2020,
        revenue: 8800000000,
        grossProfit: 3520000000,
        ebitda: 2200000000,
        operatingIncome: 1760000000,
        netIncome: 1320000000,
        freeCashFlow: 1540000000,
        totalAssets: 22000000000,
        totalEquity: 13200000000,
        eps: 2.2,
      },
      {
        year: 2021,
        revenue: 9680000000,
        grossProfit: 3872000000,
        ebitda: 2420000000,
        operatingIncome: 1936000000,
        netIncome: 1452000000,
        freeCashFlow: 1694000000,
        totalAssets: 24200000000,
        totalEquity: 14520000000,
        eps: 2.42,
      },
      {
        year: 2022,
        revenue: 10648000000,
        grossProfit: 4259200000,
        ebitda: 2662000000,
        operatingIncome: 2129600000,
        netIncome: 1597200000,
        freeCashFlow: 1863400000,
        totalAssets: 26620000000,
        totalEquity: 15972000000,
        eps: 2.66,
      },
      {
        year: 2023,
        revenue: 11712800000,
        grossProfit: 4685120000,
        ebitda: 2928200000,
        operatingIncome: 2342560000,
        netIncome: 1756920000,
        freeCashFlow: 2049740000,
        totalAssets: 29282000000,
        totalEquity: 17569200000,
        eps: 2.93,
      },
    ]
  )
}

export const mockData = {
  searchResults: [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 1.0,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 0.9,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 0.85,
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 0.8,
    },
    {
      symbol: "TSLA",
      name: "Tesla Inc.",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 0.75,
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 0.7,
    },
    {
      symbol: "META",
      name: "Meta Platforms Inc.",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 0.65,
    },
    {
      symbol: "NFLX",
      name: "Netflix Inc.",
      type: "Equity",
      region: "United States",
      marketOpen: "09:30",
      marketClose: "16:00",
      timezone: "UTC-04",
      currency: "USD",
      matchScore: 0.6,
    },
  ],
  currentPrice: {
    symbol: "AAPL",
    price: 175.43,
    change: 2.15,
    changePercent: 1.24,
    timestamp: "2024-01-15",
  },
  companyInfo: {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics",
    marketCap: 2800000000000,
    description:
      "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
    revenue: 394328000000,
    grossProfit: 169148000000,
    ebitda: 123136000000,
    operatingIncome: 114301000000,
    netIncome: 99803000000,
    freeCashFlow: 99584000000,
    totalAssets: 352755000000,
    totalEquity: 62146000000,
    totalDebt: 123000000000,
    totalCash: 67000000000,
    peRatio: 28.5,
    pbRatio: 45.2,
    eps: 6.16,
    bookValuePerShare: 3.85,
    currentRatio: 1.04,
    quickRatio: 0.82,
    debtToEquity: 1.84,
    returnOnEquity: 0.175,
    profitMargin: 0.253,
    operatingMargin: 0.29,
    ebitdaMargin: 0.312,
    grossMargin: 0.429,
    revenueGrowth: 0.028,
    netIncomeGrowth: 0.135,
    dividendYield: 0.0044,
    payoutRatio: 0.15,
    year: 2024,
  },
}
