// Key store utilities for managing Gemini API key
// Provides functions to get, set, clear, and check for the API key

const GEMINI_API_KEY_STORAGE_KEY = 'gemini-api-key'

export function getGeminiKey(): string | null {
  if (typeof window !== 'undefined') {
    // Try sessionStorage first, then localStorage
    return sessionStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || 
           localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY)
  }
  return null
}

export function setGeminiKey(key: string): void {
  if (typeof window !== 'undefined') {
    // Store in both sessionStorage and localStorage for persistence
    sessionStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key)
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key)
  }
}

export function clearGeminiKey(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY)
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY)
  }
}

export function hasGeminiKey(): boolean {
  if (typeof window !== 'undefined') {
    return !!(sessionStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || 
              localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY))
  }
  return false
}
