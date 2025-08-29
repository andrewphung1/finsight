import React from 'react'

interface LogoProps {
  className?: string
  width?: number
  height?: number
  variant?: 'default' | 'icon' | 'text-only'
}

export function FinSightLogo({ className = "", width = 120, height = 40, variant = 'default' }: LogoProps) {
  const logoSrc = '/finsight_logo_new.svg' // Use new SVG with sidebar color matching
  
  // Adjust sizes based on variant
  let finalWidth = width
  let finalHeight = height
  
  if (variant === 'icon') {
    finalWidth = 32
    finalHeight = 32
  } else if (variant === 'text-only') {
    finalWidth = 100
    finalHeight = 30
  }
  
  if (variant === 'icon') {
    return (
      <img 
        src="/enlargedlogo.svg"
        alt="FinSight Logo"
        width={50}
        height={50}
        className={className}
      />
    )
  }
  
  return (
    <div className={`flex items-center -ml-8 ${className}`}>
      <img 
        src="/enlargedlogo.svg"
        alt="FinSight Icon"
        width={60}
        height={60}
        className="flex-shrink-0"
      />
      <span className="text-white font-bold text-4xl tracking-wide ml-2 underline" style={{ fontFamily: 'inherit' }}>
        FinSight
      </span>
    </div>
  )
}

export default FinSightLogo
