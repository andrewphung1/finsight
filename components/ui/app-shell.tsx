"use client"

import { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { DensityProvider, useDensity } from "@/contexts/density-provider"

interface AppShellProps {
  children: ReactNode
  isOpen: boolean
  onToggle: () => void
  activeTab: string
  onTabChange: (value: string) => void
}

function AppShellContent({ children, isOpen, onToggle, activeTab, onTabChange }: AppShellProps) {
  const { density } = useDensity()

  return (
    <div className="flex h-dvh min-w-0 overflow-hidden bg-[var(--bg-app)]">
      <Sidebar 
        isOpen={isOpen} 
        onToggle={onToggle} 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header 
          isSidebarOpen={isOpen} 
          onSidebarToggle={onToggle} 
          activeTab={activeTab}
        />
        <main className="flex-1 min-w-0 overflow-auto">
          <div 
            className="content-wrapper page-container min-w-0"
            data-density={density}
            data-testid="content-wrapper"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppShell(props: AppShellProps) {
  return (
    <DensityProvider>
      <AppShellContent {...props} />
    </DensityProvider>
  )
}
