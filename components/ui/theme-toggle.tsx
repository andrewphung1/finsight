"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else if (prefersDark) {
      setTheme("dark")
      document.documentElement.classList.add("dark")
    } else {
      setTheme("light")
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  return (
    <div
      onClick={toggleTheme}
      className="cursor-pointer hover:bg-[var(--bg-muted)] rounded-lg transition-colors p-1 relative flex items-center justify-center"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className={cn(
        "h-5 w-5 transition-all duration-200",
        theme === "light" ? "rotate-0 scale-100 text-yellow-500" : "rotate-90 scale-0"
      )} />
      <Moon className={cn(
        "absolute h-5 w-5 transition-all duration-200",
        theme === "dark" ? "rotate-0 scale-100 text-[var(--text-primary)]" : "-rotate-90 scale-0"
      )} />
    </div>
  )
}
