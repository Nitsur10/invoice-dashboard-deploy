'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { Sidebar } from './sidebar'
import { Button } from '@/components/ui/button'

/**
 * Responsive sidebar component that adapts to viewport size
 * - Desktop (>= 768px): Fixed sidebar
 * - Mobile (< 768px): Hamburger menu + slide-in drawer
 */
export function ResponsiveSidebar() {
  const isMobile = !useBreakpoint('md')
  const [isOpen, setIsOpen] = useState(false)

  // Desktop: Render fixed sidebar
  if (!isMobile) {
    return (
      <nav
        role="navigation"
        aria-label="Main navigation"
        className="fixed inset-y-0 z-50 flex w-72 flex-col"
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto glass-sidebar">
          <Sidebar />
        </div>
      </nav>
    )
  }

  // Mobile: Render drawer + hamburger
  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col gap-y-5 overflow-y-auto glass-sidebar">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Sidebar Content with close handler */}
          <Sidebar onNavigate={() => setIsOpen(false)} />
        </div>
      </nav>
    </>
  )
}
