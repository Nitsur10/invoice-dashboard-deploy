'use client'

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 focus-enhanced"
        disabled
      >
        <div className="h-4 w-4 animate-pulse bg-muted rounded" />
      </Button>
    )
  }

  // Theme is locked to light mode
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative h-9 w-9 focus-enhanced overflow-hidden group",
        "opacity-75 cursor-not-allowed"
      )}
      disabled
      title="Theme is locked to light mode"
    >
      <Sun className="h-4 w-4 text-amber-500" />
    </Button>
  )
}