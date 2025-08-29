"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface SlidingTabsProps {
  value: string
  onValueChange: (value: string) => void
  items: Array<{ value: string; label: string; disabled?: boolean }>
  size?: "small" | "medium" | "large"
  variant?: "pill" | "underline"
  className?: string
  children?: React.ReactNode
}

const SlidingTabs = React.forwardRef<HTMLDivElement, SlidingTabsProps>(
  ({ value, onValueChange, items, size = "medium", variant = "pill", className, children }, ref) => {
    const [activeTabRef, setActiveTabRef] = React.useState<HTMLButtonElement | null>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const sizeClasses = {
      small: "h-8 text-sm px-3",
      medium: "h-10 text-sm md:text-base px-4",
      large: "h-12 text-base md:text-lg px-6"
    }

    const handleTabClick = (tabValue: string, element: HTMLButtonElement) => {
      if (onValueChange) {
        onValueChange(tabValue)
        setActiveTabRef(element)
      }
    }

    const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
      const enabledItems = items.filter(item => !item.disabled)
      const currentEnabledIndex = enabledItems.findIndex(item => item.value === value)
      
      let newIndex = currentEnabledIndex
      
      switch (event.key) {
        case "ArrowLeft":
          newIndex = currentEnabledIndex > 0 ? currentEnabledIndex - 1 : enabledItems.length - 1
          break
        case "ArrowRight":
          newIndex = currentEnabledIndex < enabledItems.length - 1 ? currentEnabledIndex + 1 : 0
          break
        case "Home":
          newIndex = 0
          break
        case "End":
          newIndex = enabledItems.length - 1
          break
        default:
          return
      }
      
      event.preventDefault()
      const newValue = enabledItems[newIndex]?.value
      if (newValue && onValueChange) {
        onValueChange(newValue)
      }
    }

    return (
      <div className={cn("w-full", className)} ref={ref}>
        {/* Tab Navigation */}
        <div 
          ref={containerRef}
          className={cn(
            "relative flex overflow-x-auto scrollbar-hide snap-x snap-mandatory",
            variant === "pill" && "bg-muted/30 rounded-2xl p-1 border shadow-sm overflow-hidden",
            variant === "underline" && "border-b"
          )}
          role="tablist"
          aria-label="Tab navigation"
        >
          {/* Scroll fade masks */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
          
          {items.map((item, index) => (
            <button
              key={item.value}
              ref={value === item.value ? setActiveTabRef : undefined}
              className={cn(
                "relative flex-shrink-0 snap-start transition-colors duration-200",
                "outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                sizeClasses[size],
                variant === "pill" && "rounded-xl font-medium",
                variant === "underline" && "border-b-2 border-transparent font-medium",
                value === item.value 
                  ? variant === "pill" 
                    ? "text-foreground" 
                    : "text-foreground border-b-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              role="tab"
              aria-selected={value === item.value}
              aria-disabled={item.disabled}
              disabled={item.disabled}
              onClick={(e) => handleTabClick(item.value, e.currentTarget)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              tabIndex={value === item.value ? 0 : -1}
            >
              {item.label}
            </button>
          ))}
          
          {/* Sliding Indicator */}
          <AnimatePresence mode="wait">
            {activeTabRef && (
              <motion.div
                layoutId="tabHighlight"
                className={cn(
                  "absolute z-0",
                  variant === "pill" && "bg-background rounded-[inherit] shadow-sm border",
                  variant === "underline" && "bg-primary h-0.5 bottom-0"
                )}
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 35
                }}
                style={{
                  width: activeTabRef.offsetWidth,
                  height: variant === "pill" ? activeTabRef.offsetHeight : "2px",
                  x: activeTabRef.offsetLeft - (containerRef.current?.offsetLeft || 0)
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Content Panels */}
        {children && (
          <div className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
              >
                {React.Children.map(children, (child) => {
                  if (React.isValidElement(child) && child.props.value === value) {
                    return child
                  }
                  return null
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    )
  }
)

SlidingTabs.displayName = "SlidingTabs"

interface SlidingTabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

const SlidingTabsContent = React.forwardRef<HTMLDivElement, SlidingTabsContentProps>(
  ({ value, children, className }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)}>
        {children}
      </div>
    )
  }
)

SlidingTabsContent.displayName = "SlidingTabsContent"

export { SlidingTabs, SlidingTabsContent }
