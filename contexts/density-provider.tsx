"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

interface DensityContextType {
  density: 'normal' | 'compact'
}

const DensityContext = createContext<DensityContextType>({ density: 'normal' })

export function useDensity() {
  return useContext(DensityContext)
}

interface DensityProviderProps {
  children: ReactNode
}

export function DensityProvider({ children }: DensityProviderProps) {
  const [density, setDensity] = useState<'normal' | 'compact'>('normal')
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check URL parameters first (both long and short forms)
    const urlDensity = searchParams.get('density') || searchParams.get('d')
    if (urlDensity === 'compact') {
      setDensity('compact')
      return
    }

    // Check environment variable
    const envDensity = process.env.NEXT_PUBLIC_UI_DENSITY
    if (envDensity === 'compact') {
      setDensity('compact')
      return
    }

    // Default to normal
    setDensity('normal')
  }, [searchParams])

  useEffect(() => {
    // Set the density attribute on the HTML element for global application
    document.documentElement.setAttribute('data-density', density)
    
    // Dev-only logging
    if (process.env.NODE_ENV !== 'production') {
      console.info('Density:', density)
    }
  }, [density])

  return (
    <DensityContext.Provider value={{ density }}>
      {children}
    </DensityContext.Provider>
  )
}
