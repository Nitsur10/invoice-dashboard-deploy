/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ResponsiveSidebar } from '../responsive-sidebar'
import { useBreakpoint } from '@/hooks/useBreakpoint'

// Mock the hooks
jest.mock('@/hooks/useBreakpoint')
jest.mock('../sidebar', () => ({
  Sidebar: ({ onNavigate }: { onNavigate?: () => void }) => (
    <div data-testid="sidebar-content">
      <button onClick={onNavigate}>Test Nav Link</button>
    </div>
  ),
}))

const mockUseBreakpoint = useBreakpoint as jest.MockedFunction<typeof useBreakpoint>

describe('ResponsiveSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Desktop viewport', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue(true) // md breakpoint matches (desktop)
    })

    it('should render fixed sidebar on desktop', () => {
      render(<ResponsiveSidebar />)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveClass('fixed')
      expect(nav).toHaveClass('w-72')
    })

    it('should not render hamburger menu on desktop', () => {
      render(<ResponsiveSidebar />)

      const hamburger = screen.queryByLabelText('Open navigation menu')
      expect(hamburger).not.toBeInTheDocument()
    })

    it('should render sidebar content', () => {
      render(<ResponsiveSidebar />)

      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    })
  })

  describe('Mobile viewport', () => {
    beforeEach(() => {
      mockUseBreakpoint.mockReturnValue(false) // md breakpoint does not match (mobile)
    })

    it('should render hamburger menu on mobile', () => {
      render(<ResponsiveSidebar />)

      const hamburger = screen.getByLabelText('Open navigation menu')
      expect(hamburger).toBeInTheDocument()
      expect(hamburger).toHaveClass('md:hidden')
    })

    it('should not show drawer initially', () => {
      render(<ResponsiveSidebar />)

      const drawer = screen.getByRole('navigation')
      expect(drawer).toHaveClass('-translate-x-full')
    })

    it('should not show backdrop initially', () => {
      render(<ResponsiveSidebar />)

      const backdrop = screen.queryByRole('presentation', { hidden: true })
      expect(backdrop).not.toBeInTheDocument()
    })

    it('should open drawer when hamburger clicked', () => {
      render(<ResponsiveSidebar />)

      const hamburger = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburger)

      const drawer = screen.getByRole('navigation')
      expect(drawer).not.toHaveClass('-translate-x-full')
      expect(drawer).toHaveClass('translate-x-0')
    })

    it('should show backdrop when drawer opens', () => {
      render(<ResponsiveSidebar />)

      const hamburger = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburger)

      // Backdrop should be visible
      const backdrop = document.querySelector('.bg-black\\/50')
      expect(backdrop).toBeInTheDocument()
    })

    it('should show close button in drawer', () => {
      render(<ResponsiveSidebar />)

      const hamburger = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburger)

      const closeButton = screen.getByLabelText('Close navigation menu')
      expect(closeButton).toBeInTheDocument()
    })

    it('should close drawer when close button clicked', () => {
      render(<ResponsiveSidebar />)

      // Open drawer
      const hamburger = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburger)

      // Close drawer
      const closeButton = screen.getByLabelText('Close navigation menu')
      fireEvent.click(closeButton)

      const drawer = screen.getByRole('navigation')
      expect(drawer).toHaveClass('-translate-x-full')
    })

    it('should close drawer when backdrop clicked', () => {
      render(<ResponsiveSidebar />)

      // Open drawer
      const hamburger = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburger)

      // Click backdrop
      const backdrop = document.querySelector('.bg-black\\/50')
      if (backdrop) {
        fireEvent.click(backdrop)
      }

      const drawer = screen.getByRole('navigation')
      expect(drawer).toHaveClass('-translate-x-full')
    })

    it('should close drawer when navigation link clicked', () => {
      render(<ResponsiveSidebar />)

      // Open drawer
      const hamburger = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburger)

      // Click nav link
      const navLink = screen.getByText('Test Nav Link')
      fireEvent.click(navLink)

      const drawer = screen.getByRole('navigation')
      expect(drawer).toHaveClass('-translate-x-full')
    })

    it('should have proper ARIA attributes', () => {
      render(<ResponsiveSidebar />)

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')
    })

    it('should apply transition classes', () => {
      render(<ResponsiveSidebar />)

      const drawer = screen.getByRole('navigation')
      expect(drawer).toHaveClass('transition-transform')
      expect(drawer).toHaveClass('duration-300')
    })
  })

  describe('Responsive behavior', () => {
    it('should switch from mobile to desktop layout', () => {
      mockUseBreakpoint.mockReturnValue(false) // Start mobile

      const { rerender } = render(<ResponsiveSidebar />)

      // Verify mobile layout
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()

      // Switch to desktop
      mockUseBreakpoint.mockReturnValue(true)
      rerender(<ResponsiveSidebar />)

      // Verify desktop layout
      expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument()
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('fixed')
    })

    it('should switch from desktop to mobile layout', () => {
      mockUseBreakpoint.mockReturnValue(true) // Start desktop

      const { rerender } = render(<ResponsiveSidebar />)

      // Verify desktop layout
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('fixed')
      expect(nav).toHaveClass('w-72')

      // Switch to mobile
      mockUseBreakpoint.mockReturnValue(false)
      rerender(<ResponsiveSidebar />)

      // Verify mobile layout
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
    })
  })
})
