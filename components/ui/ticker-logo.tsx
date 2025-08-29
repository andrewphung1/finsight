'use client'

import { useState } from 'react'
import { getLogoPath, hasLogo, normalizeTicker } from '@/lib/logo-store'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

interface TickerLogoProps {
  ticker: string
  size?: 16 | 20 | 24 | 32 | 40 | 48
  rounded?: boolean
  className?: string
  decorative?: boolean
}

// Generate deterministic background color from ticker (theme-aware)
function getTickerColor(ticker: string): string {
  const normalized = normalizeTicker(ticker)
  const hash = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = [
    'bg-red-500 dark:bg-red-600', 'bg-blue-500 dark:bg-blue-600', 'bg-green-500 dark:bg-green-600', 'bg-yellow-500 dark:bg-yellow-600', 
    'bg-purple-500 dark:bg-purple-600', 'bg-pink-500 dark:bg-pink-600', 'bg-indigo-500 dark:bg-indigo-600', 'bg-teal-500 dark:bg-teal-600'
  ]
  return colors[hash % colors.length]
}

// Get initials from ticker
function getTickerInitials(ticker: string): string {
  const normalized = normalizeTicker(ticker)
  return normalized.slice(0, 2)
}

export function TickerLogo({ 
  ticker, 
  size = 24, 
  rounded = false, 
  className,
  decorative = false 
}: TickerLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [useDefault, setUseDefault] = useState(false)
  const { theme } = useTheme()
  
  const normalizedTicker = normalizeTicker(ticker)
  const hasCustomLogo = hasLogo(ticker) && !imageError && !useDefault
  const logoPath = useDefault ? '/logos/default.svg' : getLogoPath(ticker)
  
  const sizeClasses = {
    16: 'w-4 h-4',
    20: 'w-5 h-5', 
    24: 'w-6 h-6',
    32: 'w-8 h-8',
    40: 'w-10 h-10',
    48: 'w-12 h-12'
  }

  const handleImageError = () => {
    if (!useDefault) {
      setUseDefault(true)
    } else {
      setImageError(true)
    }
  }

  // If we have a custom logo and no errors, show the image
  if (hasCustomLogo) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          rounded && 'rounded-full',
          'flex items-center justify-center',
          'bg-white dark:bg-white',
          'border border-gray-200 dark:border-gray-300',
          className
        )}
        data-theme={theme}
        aria-hidden={decorative}
      >
        <img
          src={logoPath}
          alt={decorative ? '' : `${normalizedTicker} logo`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
          className="object-contain w-full h-full p-1"
        />
      </div>
    )
  }

  // Fallback: colored initials avatar (theme-aware)
  return (
    <div
      className={cn(
        sizeClasses[size],
        rounded ? 'rounded-full' : 'rounded-md',
        getTickerColor(ticker),
        'flex items-center justify-center',
        'text-white dark:text-gray-100 font-semibold text-xs',
        'select-none',
        'border border-gray-200 dark:border-gray-700',
        className
      )}
      aria-hidden={decorative}
    >
      {getTickerInitials(ticker)}
    </div>
  )
}
