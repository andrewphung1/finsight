interface CompanySnapshot {
  ticker: string
  price: number
  companyName: string
  marketCap: number
  peRatio: number
  sharesOutstanding: number
  asOf: string // YYYY-MM-DD format
  currency?: string // Optional currency field
}

type SnapshotListener = (snapshot: CompanySnapshot | null) => void

import { normalizeTicker } from '@/lib/logo-store'

interface RawCompanyData {
  ticker: string
  price: string
  companyName: string
  marketCap: string
  peRatio: string
  sharesOutstanding: string
}

export class GoogleSheetStore {
  private data: Map<string, CompanySnapshot> = new Map()
  private lastFetch: number = 0
  private fetchPromise: Promise<void> | null = null
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private readonly SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9HktJZliGsN9TSOe2FPUaVLzmhRw7AZ2H8GOYCRg_hHsXCR5XyP8s4QdVtFt94EbO2snLj4gmmHCb/pub?gid=0&single=true&output=csv'
  private listeners: Map<string, Set<SnapshotListener>> = new Map()
  private missingTickerWarnings: Set<string> = new Set()
  private isInitialized: boolean = false
  private backgroundUpdateInterval: NodeJS.Timeout | null = null

  constructor() {
    // Don't initialize during SSR
    if (typeof window !== 'undefined') {
      this.initialize()
    }
  }

  private async initialize() {
    if (this.isInitialized) return
    
    try {
      await this.fetchData()
      this.isInitialized = true
      
      // Start background updates every 24 hours
      this.startBackgroundUpdates()
    } catch (error) {
      console.warn('GoogleSheetStore: Failed to initialize, will retry on next access:', error)
    }
  }

  private startBackgroundUpdates() {
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval)
    }
    
    this.backgroundUpdateInterval = setInterval(async () => {
      try {
        console.log('GoogleSheetStore: Background update started (24h interval)...')
        await this.fetchData()
        console.log('GoogleSheetStore: Background update completed')
      } catch (error) {
        console.warn('GoogleSheetStore: Background update failed:', error)
      }
    }, this.CACHE_DURATION)
  }

  public stopBackgroundUpdates() {
    if (this.backgroundUpdateInterval) {
      clearInterval(this.backgroundUpdateInterval)
      this.backgroundUpdateInterval = null
    }
  }



  private parseNumberWithUnits(value: string): number {
    // Strip commas, spaces, and common symbols
    let cleaned = value.replace(/[$,%\s]/g, '').trim()
    
    if (cleaned === '' || cleaned === 'N/A' || cleaned === 'NA' || cleaned === '-') {
      return 0
    }
    
    // Handle unit suffixes (case-insensitive)
    const unitMultipliers: Record<string, number> = {
      'T': 1e12,
      'B': 1e9,
      'M': 1e6,
      'K': 1e3
    }
    
    // Check for unit suffix
    const unitMatch = cleaned.match(/^([\d.]+)([TBMK])$/i)
    if (unitMatch) {
      const [, number, unit] = unitMatch
      const multiplier = unitMultipliers[unit.toUpperCase()]
      const parsed = parseFloat(number)
      return isNaN(parsed) ? 0 : parsed * multiplier
    }
    
    // Regular number parsing
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  private parseValue(value: string, type: 'number' | 'string'): number | string {
    if (type === 'string') return value.trim()
    return this.parseNumberWithUnits(value)
  }

  private async fetchData(): Promise<void> {
    // Prevent multiple simultaneous fetches
    if (this.fetchPromise) {
      return this.fetchPromise
    }

    this.fetchPromise = this.performFetch()
    try {
      await this.fetchPromise
    } finally {
      this.fetchPromise = null
    }
  }

  private async performFetch(): Promise<void> {
    try {
      console.log('GoogleSheetStore: Fetching latest data from GS source...')
      
      const response = await fetch(this.SHEET_URL, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const csvText = await response.text()
      const lines = csvText.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows')
      }

      // Parse header with exact matching
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Define exact header patterns (case-insensitive)
      const headerPatterns = {
        ticker: ['ticker', 'symbol'],
        price: ['price', 'current price', 'stock price'],
        companyName: ['company name', 'company', 'name'],
        marketCap: ['market cap', 'marketcap', 'market capitalization'],
        peRatio: ['pe ratio', 'p/e ratio', 'pe', 'p/e', 'price to earnings'],
        sharesOutstanding: ['shares outstanding', 'shares out', 'outstanding shares', 'shares']
      }
      
      // Try exact matches first, then fallback to includes
      const tickerIndex = headers.findIndex(h => headerPatterns.ticker.includes(h)) || headers.findIndex(h => h.includes('ticker'))
      const priceIndex = headers.findIndex(h => headerPatterns.price.includes(h)) || headers.findIndex(h => h.includes('price'))
      const nameIndex = headers.findIndex(h => headerPatterns.companyName.includes(h)) || headers.findIndex(h => h.includes('name') || h.includes('company'))
      const marketCapIndex = headers.findIndex(h => headerPatterns.marketCap.includes(h)) || headers.findIndex(h => h.includes('market') && h.includes('cap'))
      const peIndex = headers.findIndex(h => headerPatterns.peRatio.includes(h)) || headers.findIndex(h => h.includes('pe') || h.includes('p/e'))
      const sharesIndex = headers.findIndex(h => headerPatterns.sharesOutstanding.includes(h)) || headers.findIndex(h => h.includes('shares') || h.includes('outstanding'))

      if (tickerIndex === -1 || priceIndex === -1) {
        throw new Error('Required columns (ticker, price) not found in CSV')
      }

      // Parse data rows
      const newData = new Map<string, CompanySnapshot>()
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const values = this.parseCSVLine(line)
        
        if (values.length < Math.max(tickerIndex, priceIndex) + 1) {
          console.warn(`GoogleSheetStore: Skipping malformed row ${i + 1}: ${line}`)
          continue
        }

        const rawData: RawCompanyData = {
          ticker: values[tickerIndex] || '',
          price: values[priceIndex] || '0',
          companyName: nameIndex >= 0 ? values[nameIndex] || '' : '',
          marketCap: marketCapIndex >= 0 ? values[marketCapIndex] || '0' : '0',
          peRatio: peIndex >= 0 ? values[peIndex] || '0' : '0',
          sharesOutstanding: sharesIndex >= 0 ? values[sharesIndex] || '0' : '0',
        }

        const normalizedTicker = normalizeTicker(rawData.ticker)
        if (!normalizedTicker) {
          console.warn(`GoogleSheetStore: Skipping row with empty ticker: ${line}`)
          continue
        }

        // Parse and validate values
        const price = this.parseValue(rawData.price, 'number') as number
        const marketCap = this.parseValue(rawData.marketCap, 'number') as number
        const peRatio = this.parseValue(rawData.peRatio, 'number') as number
        const sharesOutstanding = this.parseValue(rawData.sharesOutstanding, 'number') as number
        
        // Validate and normalize values
        const validatedPrice = isFinite(price) ? price : 0
        const validatedMarketCap = isFinite(marketCap) ? marketCap : 0
        const validatedPeRatio = isFinite(peRatio) ? peRatio : 0
        const validatedSharesOutstanding = isFinite(sharesOutstanding) ? sharesOutstanding : 0
        
        // Log warnings for invalid values
        if (!isFinite(price)) console.warn(`GoogleSheetStore: Invalid price for ${normalizedTicker} (row ${i + 1}): "${rawData.price}"`)
        if (!isFinite(marketCap)) console.warn(`GoogleSheetStore: Invalid market cap for ${normalizedTicker} (row ${i + 1}): "${rawData.marketCap}"`)
        if (!isFinite(peRatio)) console.warn(`GoogleSheetStore: Invalid P/E ratio for ${normalizedTicker} (row ${i + 1}): "${rawData.peRatio}"`)
        if (!isFinite(sharesOutstanding)) console.warn(`GoogleSheetStore: Invalid shares outstanding for ${normalizedTicker} (row ${i + 1}): "${rawData.sharesOutstanding}"`)

        const snapshot: CompanySnapshot = {
          ticker: normalizedTicker,
          price: validatedPrice,
          companyName: this.parseValue(rawData.companyName, 'string') as string,
          marketCap: validatedMarketCap,
          peRatio: validatedPeRatio,
          sharesOutstanding: validatedSharesOutstanding,
          asOf: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        }

        newData.set(normalizedTicker, snapshot)
      }

      // Notify listeners of data changes
      const oldData = this.data
      this.data = newData
      this.lastFetch = Date.now()
      

      
      // Notify listeners for any tickers that changed or were added
      const allTickers = new Set([...oldData.keys(), ...newData.keys()])
      allTickers.forEach(ticker => {
        const oldSnapshot = oldData.get(ticker)
        const newSnapshot = newData.get(ticker)
        
        // Notify if ticker was added, removed, or changed
        if (oldSnapshot !== newSnapshot) {
          this.notifyListeners(ticker, newSnapshot || null)
        }
      })
      
      // Also notify all existing listeners about the refresh event
      // This ensures components that are subscribed to tickers get notified even if their specific ticker didn't change
      this.listeners.forEach((tickerListeners, ticker) => {
        const currentSnapshot = this.data.get(ticker)
        if (currentSnapshot) {
          tickerListeners.forEach(listener => {
            try {
              listener(currentSnapshot)
            } catch (error) {
              console.error('Error in snapshot listener during refresh:', error)
            }
          })
        }
      })
      
      console.log(`GoogleSheetStore: Successfully loaded ${this.data.size} companies`)
      
    } catch (error) {
      console.error('GoogleSheetStore: Error fetching data:', error)
      
      if (this.data.size === 0) {
        // If we have no cached data, throw the error
        throw error
      } else {
        // If we have cached data, log warning but don't throw
        console.warn('GoogleSheetStore: Using cached data due to fetch error')
      }
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  private async ensureFreshData(): Promise<void> {
    const now = Date.now()
    const timeSinceLastFetch = now - this.lastFetch
    
    // If data is fresh enough and we have data, return immediately
    if (timeSinceLastFetch < this.CACHE_DURATION && this.data.size > 0) {
      return
    }
    
    // If we have cached data but it's stale, return it immediately and update in background
    if (this.data.size > 0) {
      console.log('GoogleSheetStore: Returning cached data, updating in background...')
      this.fetchDataInBackground()
      return
    }
    
    // If there's already a fetch in progress, wait for it
    if (this.fetchPromise) {
      return this.fetchPromise
    }

    // Only fetch immediately if we have no data at all
    this.fetchPromise = this.performFetch()
    try {
      await this.fetchPromise
    } finally {
      this.fetchPromise = null
    }
  }

  private async fetchDataInBackground(): Promise<void> {
    // Don't start multiple background fetches
    if (this.fetchPromise) return
    
    this.fetchPromise = this.performFetch()
    try {
      await this.fetchPromise
    } catch (error) {
      console.warn('GoogleSheetStore: Background fetch failed, keeping cached data:', error)
    } finally {
      this.fetchPromise = null
    }
  }

  async getCompanySnapshot(ticker: string): Promise<CompanySnapshot | null> {
    await this.ensureFreshData()
    
    const normalizedTicker = normalizeTicker(ticker)
    const snapshot = this.data.get(normalizedTicker)
    
    // Log warning for missing ticker (once per session)
    if (!snapshot && !this.missingTickerWarnings.has(normalizedTicker)) {
      console.warn(`GoogleSheetStore: Ticker "${ticker}" (normalized: "${normalizedTicker}") not found in Google Sheet`)
      this.missingTickerWarnings.add(normalizedTicker)
    }
    
    return snapshot || null
  }

  // Alias for getCompanySnapshot (as requested in requirements)
  async getSnapshot(ticker: string): Promise<CompanySnapshot | null> {
    return this.getCompanySnapshot(ticker)
  }

  async getAllCompanies(): Promise<CompanySnapshot[]> {
    await this.ensureFreshData()
    
    return Array.from(this.data.values())
  }

  async searchCompanies(query: string): Promise<CompanySnapshot[]> {
    await this.ensureFreshData()
    
    const normalizedQuery = normalizeTicker(query)
    const results: CompanySnapshot[] = []
    
    for (const [ticker, snapshot] of this.data) {
      if (ticker.includes(normalizedQuery) || 
          snapshot.companyName.toLowerCase().includes(query.toLowerCase())) {
        results.push(snapshot)
      }
    }
    
    return results
  }

  async refreshData(): Promise<void> {
    this.lastFetch = 0 // Force refresh
    await this.fetchData()
  }

  getLastFetchTime(): number {
    return this.lastFetch
  }

  getDataSize(): number {
    return this.data.size
  }

  hasData(): boolean {
    return this.data.size > 0
  }

  // Debug method to get all available tickers
  getAllTickers(): string[] {
    return Array.from(this.data.keys())
  }

  // Debug method to check if a specific ticker exists
  hasTicker(ticker: string): boolean {
    const normalizedTicker = normalizeTicker(ticker)
    return this.data.has(normalizedTicker)
  }

  isDataFresh(): boolean {
    const now = Date.now()
    return (now - this.lastFetch) < this.CACHE_DURATION
  }

  // Subscribe to snapshot updates for a specific ticker
  subscribe(ticker: string, listener: SnapshotListener): () => void {
    const normalizedTicker = normalizeTicker(ticker)
    
    if (!this.listeners.has(normalizedTicker)) {
      this.listeners.set(normalizedTicker, new Set())
    }
    
    this.listeners.get(normalizedTicker)!.add(listener)
    
    // Immediately call with current snapshot if available
    const currentSnapshot = this.data.get(normalizedTicker)
    if (currentSnapshot) {
      listener(currentSnapshot)
    }
    
    // Return unsubscribe function
    return () => {
      const tickerListeners = this.listeners.get(normalizedTicker)
      if (tickerListeners) {
        tickerListeners.delete(listener)
        if (tickerListeners.size === 0) {
          this.listeners.delete(normalizedTicker)
        }
      }
    }
  }

  // Notify all listeners for a ticker
  private notifyListeners(ticker: string, snapshot: CompanySnapshot | null) {
    const tickerListeners = this.listeners.get(ticker)
    if (tickerListeners) {
      tickerListeners.forEach(listener => {
        try {
          listener(snapshot)
        } catch (error) {
          console.error('Error in snapshot listener:', error)
        }
      })
    }
  }


}

// Export a singleton instance
export const googleSheetStore = new GoogleSheetStore()
