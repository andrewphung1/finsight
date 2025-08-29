// MAG7 companies that have logos
const SUPPORTED_LOGOS = new Set([
  'AAPL',
  'MSFT', 
  'AMZN',
  'NVDA',
  'META',
  'TSLA',
  'GOOGL'
])

// Ticker normalization: uppercase, strip .US, map GOOG→GOOGL
export function normalizeTicker(ticker: string): string {
  return ticker
    .toUpperCase()
    .replace(/\.US$/, '') // Remove .US suffix
    .replace(/^GOOG$/, 'GOOGL') // Map GOOG to GOOGL
    .replace(/\s+/g, '') // Remove whitespace
    .trim()
}

// Get logo path for a ticker
export function getLogoPath(ticker: string): string {
  const normalized = normalizeTicker(ticker)
  
  if (hasLogo(normalized)) {
    // Use lowercase filename to match actual files in public/logos directory
    return `/logos/${normalized.toLowerCase()}.svg`
  }
  
  return '/logos/default.svg'
}

// Check if a ticker has a logo
export function hasLogo(ticker: string): boolean {
  const normalized = normalizeTicker(ticker)
  return SUPPORTED_LOGOS.has(normalized)
}

// Get all supported tickers
export function getSupportedTickers(): string[] {
  return Array.from(SUPPORTED_LOGOS)
}
