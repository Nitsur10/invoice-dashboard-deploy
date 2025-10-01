/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useMediaQuery } from '../useMediaQuery'

describe('useMediaQuery', () => {
  let matchMediaMock: jest.Mock

  beforeEach(() => {
    // Create a mock for window.matchMedia
    matchMediaMock = jest.fn()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: matchMediaMock,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return true when media query matches', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(result.current).toBe(true)
  })

  it('should return false when media query does not match', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(result.current).toBe(false)
  })

  it('should update when media query match changes', async () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.push(listener)
        }
      }),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { result, rerender } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(result.current).toBe(false)

    // Simulate media query change
    matchMediaMock.mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    // Trigger change event
    listeners.forEach(listener => {
      listener({ matches: true, media: '(min-width: 768px)' } as MediaQueryListEvent)
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it('should handle multiple different queries', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(min-width: 1024px)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { result: result1 } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    const { result: result2 } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

    expect(result1.current).toBe(false)
    expect(result2.current).toBe(true)
  })

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: removeEventListenerMock,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should handle portrait orientation query', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(orientation: portrait)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { result } = renderHook(() => useMediaQuery('(orientation: portrait)'))

    expect(result.current).toBe(true)
  })

  it('should handle max-width queries', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query === '(max-width: 640px)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))

    expect(result.current).toBe(true)
  })
})
