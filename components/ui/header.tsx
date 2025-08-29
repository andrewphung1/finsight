"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, User, LogOut, Menu, Bot, Loader2, AlertTriangle, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { FinSightLogo } from "./logo"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface HeaderProps {
  isSidebarOpen: boolean
  onSidebarToggle: () => void
  activeTab?: string
}

export function Header({ isSidebarOpen, onSidebarToggle, activeTab }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>("--:--:--")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }))
    }
    
    // Update immediately on mount
    updateTime()
    
    // Then set up the interval
    const timer = setInterval(updateTime, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
            <header 
          className="sticky top-0 z-40 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-[var(--card-x)] flex items-center justify-between"
          style={{ height: 'var(--header-h)' }}
        >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          aria-expanded={isSidebarOpen}
          aria-label="Toggle navigation"
          className="h-12 w-12"
        >
          <Menu className="h-6 w-6 text-[var(--text-primary)]" />
        </Button>
        <div className="flex items-center justify-between w-full">
          <h1 
            className="font-bold leading-tight text-[var(--text-primary)]"
            style={{ fontSize: 'var(--fs-title)' }}
          >
            {activeTab === 'overview' ? 'Overview' :
             activeTab === 'upload' ? 'Import Data' :
             activeTab === 'search' ? 'Company Search' :
             activeTab === 'ai-analysis' ? 'AI Analysis' :
             'Financial Platform'}
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mr-4">
        {/* Live Timer */}
        <div 
          className="font-medium text-[var(--text-primary)] font-inherit"
          style={{ fontSize: 'var(--fs-body)' }}
        >
          {currentTime}
        </div>
        
        {/* Vertical Line with more spacing */}
        <div className="mx-2">
          <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600"></div>
        </div>
        
        {/* Alert Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <AlertTriangle className="h-5 w-5" style={{ color: '#feca67' }} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-3">
              <div className="space-y-2">
                <p className="font-semibold text-sm">Financial Platform <span className="underline">DEMO VERSION</span></p>
                <ul className="text-xs space-y-1 text-white">
                  <li>• Data last updated: 8.24.2025</li>
                  <li>• Information only supports Mag7 Stocks</li>
                  <li>• Feature set limited in demo version</li>
                  <li>• No live API & data integration</li>
                  <li>• Data & graphs may not be up-to-date or accurate </li>
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <User className="h-5 w-5" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
