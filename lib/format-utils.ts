// Format currency values with compact units (K/M/B/T)
export const formatCompactCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return 'N/A'
  }
  
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

// Format ratio values to 2 decimals
export const formatRatio = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }
  return value.toFixed(2)
}

// Format percentage values to 2 decimals
export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A'
  }
  return `${value.toFixed(2)}%`
}

// Format shares outstanding with compact units (B if ≥1e9, otherwise M if ≥1e6)
export const formatShares = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return 'N/A'
  }
  
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  return value.toFixed(0)
}

// Check if a value is stale (older than 5 minutes) - client-side only
export const isStale = (asOf: Date | null | undefined): boolean => {
  if (!asOf || typeof window === 'undefined') return false
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  return asOf < fiveMinutesAgo
}
