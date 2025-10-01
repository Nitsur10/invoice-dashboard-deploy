/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react'
import { useBreakpoint, useCurrentBreakpoint } from '../useBreakpoint'
import { useMediaQuery } from '../useMediaQuery'

// Mock useMediaQuery
jest.mock('../useMediaQuery')

const mockUseMediaQuery = useMediaQuery as jest.MockedFunction<typeof useMediaQuery>

describe('useBreakpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sm breakpoint (640px)', () => {
    it('should return true when viewport is >= 640px', () => {
      mockUseMediaQuery.mockReturnValue(true)

      const { result } = renderHook(() => useBreakpoint('sm'))

      expect(result.current).toBe(true)
      expect(mockUseMediaQuery).toHaveBeenCalledWith('(min-width: 640px)')
    })

    it('should return false when viewport is < 640px', () => {
      mockUseMediaQuery.mockReturnValue(false)

      const { result } = renderHook(() => useBreakpoint('sm'))

      expect(result.current).toBe(false)
    })
  })

  describe('md breakpoint (768px)', () => {
    it('should return true when viewport is >= 768px', () => {
      mockUseMediaQuery.mockReturnValue(true)

      const { result } = renderHook(() => useBreakpoint('md'))

      expect(result.current).toBe(true)
      expect(mockUseMediaQuery).toHaveBeenCalledWith('(min-width: 768px)')
    })

    it('should return false when viewport is < 768px', () => {
      mockUseMediaQuery.mockReturnValue(false)

      const { result } = renderHook(() => useBreakpoint('md'))

      expect(result.current).toBe(false)
    })
  })

  describe('lg breakpoint (1024px)', () => {
    it('should return true when viewport is >= 1024px', () => {
      mockUseMediaQuery.mockReturnValue(true)

      const { result } = renderHook(() => useBreakpoint('lg'))

      expect(result.current).toBe(true)
      expect(mockUseMediaQuery).toHaveBeenCalledWith('(min-width: 1024px)')
    })

    it('should return false when viewport is < 1024px', () => {
      mockUseMediaQuery.mockReturnValue(false)

      const { result } = renderHook(() => useBreakpoint('lg'))

      expect(result.current).toBe(false)
    })
  })

  describe('xl breakpoint (1280px)', () => {
    it('should return true when viewport is >= 1280px', () => {
      mockUseMediaQuery.mockReturnValue(true)

      const { result } = renderHook(() => useBreakpoint('xl'))

      expect(result.current).toBe(true)
      expect(mockUseMediaQuery).toHaveBeenCalledWith('(min-width: 1280px)')
    })

    it('should return false when viewport is < 1280px', () => {
      mockUseMediaQuery.mockReturnValue(false)

      const { result } = renderHook(() => useBreakpoint('xl'))

      expect(result.current).toBe(false)
    })
  })

  describe('2xl breakpoint (1400px)', () => {
    it('should return true when viewport is >= 1400px', () => {
      mockUseMediaQuery.mockReturnValue(true)

      const { result } = renderHook(() => useBreakpoint('2xl'))

      expect(result.current).toBe(true)
      expect(mockUseMediaQuery).toHaveBeenCalledWith('(min-width: 1400px)')
    })

    it('should return false when viewport is < 1400px', () => {
      mockUseMediaQuery.mockReturnValue(false)

      const { result } = renderHook(() => useBreakpoint('2xl'))

      expect(result.current).toBe(false)
    })
  })
})

describe('useCurrentBreakpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return "xs" when no breakpoints match', () => {
    mockUseMediaQuery.mockReturnValue(false)

    const { result } = renderHook(() => useCurrentBreakpoint())

    expect(result.current).toBe('xs')
  })

  it('should return "sm" when only sm breakpoint matches', () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      return query === '(min-width: 640px)'
    })

    const { result } = renderHook(() => useCurrentBreakpoint())

    expect(result.current).toBe('sm')
  })

  it('should return "md" when sm and md breakpoints match', () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      return query === '(min-width: 640px)' || query === '(min-width: 768px)'
    })

    const { result } = renderHook(() => useCurrentBreakpoint())

    expect(result.current).toBe('md')
  })

  it('should return "lg" when sm, md, and lg breakpoints match', () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      return (
        query === '(min-width: 640px)' ||
        query === '(min-width: 768px)' ||
        query === '(min-width: 1024px)'
      )
    })

    const { result } = renderHook(() => useCurrentBreakpoint())

    expect(result.current).toBe('lg')
  })

  it('should return "xl" when all except 2xl breakpoints match', () => {
    mockUseMediaQuery.mockImplementation((query: string) => {
      return query !== '(min-width: 1400px)'
    })

    const { result } = renderHook(() => useCurrentBreakpoint())

    expect(result.current).toBe('xl')
  })

  it('should return "2xl" when all breakpoints match', () => {
    mockUseMediaQuery.mockReturnValue(true)

    const { result } = renderHook(() => useCurrentBreakpoint())

    expect(result.current).toBe('2xl')
  })

  it('should return largest matching breakpoint', () => {
    // Simulate 1024px viewport (lg)
    mockUseMediaQuery.mockImplementation((query: string) => {
      if (query === '(min-width: 640px)') return true // sm
      if (query === '(min-width: 768px)') return true // md
      if (query === '(min-width: 1024px)') return true // lg
      if (query === '(min-width: 1280px)') return false // xl
      if (query === '(min-width: 1400px)') return false // 2xl
      return false
    })

    const { result } = renderHook(() => useCurrentBreakpoint())

    expect(result.current).toBe('lg')
  })
})
