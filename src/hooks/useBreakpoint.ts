'use client'

import { useMediaQuery } from './useMediaQuery'

/**
 * Tailwind breakpoint values
 */
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * Breakpoint to media query mapping (Tailwind defaults)
 */
const breakpoints: Record<Breakpoint, string> = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1400px)',
}

/**
 * Custom hook to check if a specific breakpoint is active
 * @param breakpoint - Tailwind breakpoint name
 * @returns boolean indicating if viewport is >= breakpoint
 *
 * @example
 * const isMobile = !useBreakpoint('md') // < 768px
 * const isDesktop = useBreakpoint('lg')  // >= 1024px
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(breakpoints[breakpoint])
}

/**
 * Get the current active breakpoint
 * Returns the largest matching breakpoint or 'xs' if none match
 *
 * @example
 * const breakpoint = useCurrentBreakpoint()
 * // Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useCurrentBreakpoint(): Breakpoint | 'xs' {
  const is2xl = useBreakpoint('2xl')
  const isXl = useBreakpoint('xl')
  const isLg = useBreakpoint('lg')
  const isMd = useBreakpoint('md')
  const isSm = useBreakpoint('sm')

  if (is2xl) return '2xl'
  if (isXl) return 'xl'
  if (isLg) return 'lg'
  if (isMd) return 'md'
  if (isSm) return 'sm'
  return 'xs'
}
