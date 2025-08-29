"use client"

import { useState, useEffect } from "react"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CompanyLogoProps {
  ticker: string
  companyName?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function CompanyLogo({ ticker, companyName, size = "md", className }: CompanyLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  }

  useEffect(() => {
    const fetchLogo = async () => {
      setIsLoading(true)
      setError(false)
      
      try {
        // Try multiple logo sources for better coverage
        const sources = [
          `https://logo.clearbit.com/${ticker.toLowerCase()}.com`,
          `https://finnhub.io/api/logo?symbol=${ticker}`,
          `https://api.company-information.service/logo/${ticker}`
        ]

        let logoFound = false
        
        for (const source of sources) {
          if (logoFound) break
          
          try {
            // For no-cors requests, we'll try to load the image directly
            const img = new Image()
            
            const loadPromise = new Promise((resolve, reject) => {
              img.onload = () => {
                setLogoUrl(source)
                setIsLoading(false)
                logoFound = true
                resolve(true)
              }
              img.onerror = () => {
                reject(new Error('Failed to load image'))
              }
            })
            
            img.src = source
            
            // Wait for image to load or fail
            await loadPromise
            break
            
          } catch (err) {
            // Continue to next source
            continue
          }
        }
        
        // If no logo was found, show fallback
        if (!logoFound) {
          setError(true)
          setIsLoading(false)
        }
        
      } catch (err) {
        setError(true)
        setIsLoading(false)
      }
    }

    if (ticker) {
      fetchLogo()
    }
  }, [ticker])

  if (isLoading) {
    return (
      <div className={cn(
        "animate-pulse bg-muted rounded",
        sizeClasses[size],
        className
      )} />
    )
  }

  if (error || !logoUrl) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded text-muted-foreground",
        sizeClasses[size],
        className
      )}>
        <Building2 className="w-1/2 h-1/2" />
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={`${companyName || ticker} logo`}
      className={cn(
        "rounded object-contain",
        sizeClasses[size],
        "dark:brightness-0 dark:invert", // Make logos work in dark mode
        className
      )}
      onError={() => {
        setError(true)
        setLogoUrl(null)
      }}
    />
  )
}
