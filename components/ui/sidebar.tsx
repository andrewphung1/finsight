"use client"

import { motion } from "framer-motion"
import { 
  BarChart3, 
  Upload, 
  Search, 
  Bot, 
  Settings, 
  HelpCircle,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarDataStatus } from "@/components/sidebar/SidebarDataStatus"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useConnectionStatusStore } from "@/lib/connection-status-store"
import { useSession } from "@/contexts/session-provider"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface SidebarItem {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

interface SidebarProps {
  id?: string
  isOpen: boolean
  onToggle: () => void
  activeTab: string
  onTabChange: (value: string) => void
}

const mainItems: SidebarItem[] = [
  { value: "overview", label: "Overview", icon: BarChart3 },
  { value: "upload", label: "Import Data", icon: Upload },
  { value: "search", label: "Company Search", icon: Search },
  { value: "ai-analysis", label: "AI Analysis (Beta)", icon: Bot },
]

const bottomItems: SidebarItem[] = [
  { value: "settings", label: "Settings", icon: Settings, disabled: false },
  { value: "help", label: "Help & Support", icon: HelpCircle, disabled: false },
]

export function Sidebar({ id, isOpen, onToggle, activeTab, onTabChange }: SidebarProps) {
  const { status } = useConnectionStatusStore()
  const { clearSession } = useSession()
  const { toast } = useToast()
  const router = useRouter()

  // Motion guards for reduced motion preference
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleClearAll = () => {
    console.log('Sidebar: Clearing all data...')
    
    // Preserve theme preference
    const theme = localStorage.getItem('theme')
    
    // Use the centralized clearSession function which handles everything
    clearSession()
    
    // Restore theme preference
    if (theme) {
      localStorage.setItem('theme', theme)
    }
    
    // Set flag to indicate deliberate clear
    localStorage.setItem('data-cleared-flag', 'true')
    
    // Show success message
    toast({
      title: "Data Cleared",
      description: "All data has been successfully cleared."
    })
    
    // The clearSession function already clears URL parameters, so just navigate to overview
    router.replace('/?tab=overview')
  }

  const handleSettings = () => {
    toast({
      title: "Settings",
      description: "Settings panel coming soon!",
    })
  }

  const handleHelp = () => {
    toast({
      title: "Help & Support",
      description: "Help documentation and support coming soon!",
    })
  }
  
  return (
    <aside
      id={id}
      aria-label="Primary"
      className={cn(
        "sticky top-0 h-dvh overflow-y-auto border-r border-[var(--border-subtle)] flex flex-col z-10 shrink-0 bg-[var(--bg-shell)]"
      )}
      style={{ width: isOpen ? 'var(--sidebar-w)' : 'var(--sidebar-w-collapsed, 80px)' }}
      data-testid="app-sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Brand Header */}
        <div 
          data-testid="brand"
          className="flex items-center select-none px-[var(--card-x)] py-[var(--card-y)]"
          style={{ height: 'var(--header-h)' }}
        >
          {isOpen ? (
            <motion.div 
              initial={prefersReduced ? undefined : { opacity: 0 }}
              animate={prefersReduced ? undefined : { opacity: 1 }}
              exit={prefersReduced ? undefined : { opacity: 0 }}
              className="flex items-center gap-3 w-full"
            >
              <Link 
                href="/" 
                className="flex items-center gap-1 no-underline hover:opacity-80 transition-opacity justify-center w-full" 
                onClick={(e) => {
                  e.preventDefault()
                  onTabChange('overview')
                }}
              >
                {/* Logo Icon */}
                <img 
                  src="/enlargedlogo.svg"
                  alt="FinSight Logo"
                  width={56}
                  height={56}
                  className="flex-shrink-0"
                  style={{ width: 'var(--brand-icon, 56px)', height: 'var(--brand-icon, 56px)' }}
                />
                {/* Brand Name */}
                <span className="text-white font-semibold text-3xl tracking-wide -ml-1" style={{ fontFamily: 'inherit' }}>
                  FinSight
                </span>
              </Link>
            </motion.div>
          ) : (
            <Link 
              href="/" 
              className="relative flex items-center justify-center w-full no-underline hover:opacity-80 transition-opacity" 
              onClick={(e) => {
                e.preventDefault()
                onTabChange('overview')
              }}
            >
              {/* Logo Icon for collapsed state */}
              <img 
                src="/enlargedlogo.svg"
                alt="FinSight Logo"
                width={56}
                height={56}
                className="flex-shrink-0"
                style={{ width: 'var(--brand-icon, 56px)', height: 'var(--brand-icon, 56px)' }}
              />
              {/* Connection dot for collapsed state */}
              <div className={cn(
                "absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full border-2 border-[var(--bg-shell)]",
                status === 'connected' ? 'bg-green-500' : 
                status === 'refreshing' ? 'bg-yellow-500' : 
                'bg-red-500'
              )}></div>
            </Link>
          )}
        </div>

        {/* Data Source Status */}
        {isOpen && (
          <div className="px-3 py-6 border-b border-[var(--border-subtle)]">
            <SidebarDataStatus enabled={true} />
          </div>
        )}

        {/* Main Navigation - Centered at middle of sidebar */}
        <div className="flex-1 flex flex-col justify-center px-3">
          <nav role="navigation" className="flex flex-col items-center gap-3 w-full">
            {isOpen ? (
              <div className="flex flex-col items-center gap-3 w-full">
                {mainItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.value
                  
                  return (
                    <button
                      key={item.value}
                      onClick={(e) => {
                        e.preventDefault()
                        onTabChange(item.value)
                      }}
                      disabled={item.disabled}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "w-full max-w-[200px] grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 h-12",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isActive 
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      )}
                      style={{ 
                        marginBottom: 'var(--sidebar-item-gap)'
                      }}
                      >
                        <div className="flex justify-center w-6">
                        <Icon className={cn(
                          "h-6 w-6 transition-colors",
                          isActive ? "text-[var(--accent-contrast)] opacity-100" : "text-white opacity-80"
                        )} />
                      </div>
                      <motion.span
                        initial={prefersReduced ? undefined : { opacity: 0 }}
                        animate={prefersReduced ? undefined : { opacity: 1 }}
                        exit={prefersReduced ? undefined : { opacity: 0 }}
                        className="text-left truncate font-medium text-[15px] text-white"
                      >
                        {item.label}
                      </motion.span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full">
                {mainItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.value
                  
                  return (
                    <button
                      key={item.value}
                      onClick={(e) => {
                        e.preventDefault()
                        onTabChange(item.value)
                      }}
                      disabled={item.disabled}
                      aria-label={item.label}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "w-16 grid place-items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 h-12",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isActive 
                          ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      )}
                      style={{ 
                        marginBottom: 'var(--sidebar-item-gap)'
                      }}
                      title={item.label}
                    >
                      <Icon className={cn(
                        "h-6 w-6 transition-colors",
                        isActive ? "text-[var(--accent-contrast)] opacity-100" : "text-white opacity-80"
                      )} />
                    </button>
                  )
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Clear All Data Button */}
        {isOpen && (
          <div className="px-6 py-2 mb-6 mt-2">
            <div className="flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="reset-button"
                      onClick={handleClearAll}
                      variant="ghost"
                      className="w-full max-w-[200px] flex items-center justify-center gap-2.5 px-4 h-11 rounded-xl text-sm font-medium transition-all duration-200 bg-red-500/8 hover:bg-red-500/15 text-red-500 hover:text-red-400 border border-red-500/15 hover:border-red-500/25 shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-shell)]"
                    >
                      <Trash2 className="h-4 w-4 flex-shrink-0" />
                      <span>Clear Session Data</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    <div className="space-y-2">
                      <div className="text-xs space-y-1 text-white">
                        <p>This will permanently delete:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li> All imported portfolio data</li>
                          <li> Your Gemini API key</li>
                          <li> Analysis preferences</li>
                          <li> Session data</li>
                        </ul>
                        <p className="mt-2">This action cannot be undone.</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="px-3 py-4 border-t border-[var(--border-subtle)]">
          {isOpen ? (
            <div className="flex flex-col items-center gap-3 w-full">
              {bottomItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.value
                
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      if (item.disabled) return
                      if (item.value === 'settings') {
                        handleSettings()
                      } else if (item.value === 'help') {
                        handleHelp()
                      } else {
                        onTabChange(item.value)
                      }
                    }}
                    disabled={item.disabled}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "w-full max-w-[200px] grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 h-12",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                                          isActive 
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-lg"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                  >
                    <div className="flex justify-center w-6">
                      <Icon className={cn(
                        "h-6 w-6 transition-colors",
                        isActive ? "text-[var(--accent-contrast)] opacity-100" : "text-white opacity-80"
                      )} />
                    </div>
                    <motion.span
                      initial={prefersReduced ? undefined : { opacity: 0 }}
                      animate={prefersReduced ? undefined : { opacity: 1 }}
                      exit={prefersReduced ? undefined : { opacity: 0 }}
                      className="text-left truncate font-medium text-[15px] text-white"
                    >
                      {item.label}
                    </motion.span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              {bottomItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.value
                
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      if (item.disabled) return
                      if (item.value === 'settings') {
                        handleSettings()
                      } else if (item.value === 'help') {
                        handleHelp()
                      } else {
                        onTabChange(item.value)
                      }
                    }}
                    disabled={item.disabled}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "h-16 w-16 grid place-items-center rounded-lg transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-shell)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isActive 
                        ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                        : "bg-transparent hover:bg-white/10"
                    )}
                    title={item.label}
                  >
                    <Icon className={cn(
                      "h-6 w-6 transition-colors",
                      isActive ? "text-[var(--accent-contrast)] opacity-100" : "text-white opacity-80"
                    )} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
