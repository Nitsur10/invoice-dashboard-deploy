'use client'

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon"
        className="relative h-9 w-9 focus-enhanced theme-transition"
        disabled
      >
        <div className="h-4 w-4 animate-pulse bg-muted rounded" />
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        "relative h-9 w-9 focus-enhanced theme-transition overflow-hidden group",
        "hover:bg-accent/10 hover:scale-105 active:scale-95",
        "transition-all duration-300 ease-out"
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-md opacity-0 group-hover:opacity-100",
        "bg-gradient-to-br opacity-20",
        "transition-opacity duration-300 ease-out"
      )} />
      
      {/* Icon container */}
      <div className="relative z-10">
        <Sun className={cn(
          "h-4 w-4 transition-all duration-500 ease-out",
          isDark 
            ? "rotate-90 scale-0 opacity-0" 
            : "rotate-0 scale-100 opacity-100"
        )} />
        <Moon className={cn(
          "absolute inset-0 h-4 w-4 transition-all duration-500 ease-out",
          isDark 
            ? "rotate-0 scale-100 opacity-100" 
            : "-rotate-90 scale-0 opacity-0"
        )} />
      </div>
      
      {/* Ripple effect */}
      <div className={cn(
        "absolute inset-0 rounded-md scale-0 bg-accent/20",
        "group-active:scale-100 transition-transform duration-200 ease-out"
      )} />
    </Button>
  )
}