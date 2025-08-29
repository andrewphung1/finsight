"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { logoUrlFor } from "@/lib/logo-utils"
import { cn } from "@/lib/utils"

interface CompanyListItemProps {
  symbol: string
  name: string
  type?: string
  onClick?: () => void
  className?: string
  size?: "sm" | "md" | "lg"
}

export function CompanyListItem({ 
  symbol, 
  name, 
  type, 
  onClick, 
  className,
  size = "md" 
}: CompanyListItemProps) {
  const [logoError, setLogoError] = useState(false)
  
  const sizeConfig = {
    sm: { size: 24, textSize: "text-xs", containerClass: "h-6 w-6" },
    md: { size: 28, textSize: "text-sm", containerClass: "h-7 w-7" }, 
    lg: { size: 48, textSize: "text-base", containerClass: "h-12 w-12" }
  }

  const config = sizeConfig[size]

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 rounded-lg",
        className
      )}
      onClick={onClick}
    >
      {/* Logo */}
      <div className={cn("flex-shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center", config.containerClass)}>
        {!logoError ? (
          <Image
            src={logoUrlFor(symbol)}
            alt={`${name} logo`}
            width={config.size}
            height={config.size}
            className="object-contain dark:invert"
            onError={() => setLogoError(true)}
            fetchPriority="low"
          />
        ) : (
          <Badge 
            variant="secondary" 
            className={cn(
              "rounded-full font-mono font-bold",
              config.textSize
            )}
          >
            {symbol.slice(0, 2)}
          </Badge>
        )}
      </div>

      {/* Company Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{symbol}</div>
        <div className="text-xs text-muted-foreground truncate">{name}</div>
      </div>

      {/* Type Badge */}
      {type && (
        <Badge variant="secondary" className="text-xs">
          {type}
        </Badge>
      )}
    </div>
  )
}
