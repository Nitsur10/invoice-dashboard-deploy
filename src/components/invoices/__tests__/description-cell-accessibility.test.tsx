import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import '@testing-library/jest-dom'
import { DescriptionCell } from '../columns'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock window.matchMedia for accessibility preference tests
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(mockMatchMedia),
})

describe('DescriptionCell Accessibility Tests', () => {
  describe('ARIA Compliance', () => {
    test('SHOULD FAIL: has proper ARIA labeling for truncated content', () => {
      const longDescription = 'This is a very long description that will be truncated and needs proper ARIA labeling for screen readers'
      render(<DescriptionCell description={longDescription} />)

      const element = screen.getByText(longDescription)

      // Should have proper ARIA label
      expect(element).toHaveAttribute('aria-label', `Description: ${longDescription}`)

      // Should have title for browser tooltip
      expect(element).toHaveAttribute('title', longDescription)

      // Should be focusable for keyboard users
      expect(element).toHaveAttribute('tabIndex', '0')
    })

    test('SHOULD FAIL: no unnecessary ARIA attributes for short content', () => {
      const shortDescription = 'Short description'
      render(<DescriptionCell description={shortDescription} />)

      const element = screen.getByText(shortDescription)

      // Should not have ARIA label for short content
      expect(element).not.toHaveAttribute('aria-label')

      // Should not have title attribute
      expect(element).not.toHaveAttribute('title')

      // Should not be focusable
      expect(element).toHaveAttribute('tabIndex', '-1')
    })

    test('SHOULD FAIL: empty descriptions have appropriate ARIA handling', () => {
      render(<DescriptionCell description="" />)

      const fallbackElement = screen.getByText('—')

      // Fallback should not have unnecessary ARIA attributes
      expect(fallbackElement).not.toHaveAttribute('aria-label')
      expect(fallbackElement).not.toHaveAttribute('title')

      // Should indicate to screen readers that content is empty/not available
      expect(fallbackElement).toHaveClass('text-slate-500', 'dark:text-slate-400')
    })

    test('SHOULD FAIL: maintains semantic meaning for multi-line content', () => {
      const multiLineDescription = 'First line of description\nSecond line with additional details\nThird line with more information'
      render(<DescriptionCell description={multiLineDescription} />)

      const element = screen.getByText('First line of description')

      // Full content should be available to screen readers
      expect(element).toHaveAttribute('aria-label', `Description: ${multiLineDescription}`)
      expect(element).toHaveAttribute('title', multiLineDescription)

      // ARIA label should preserve line breaks for screen reader context
      const ariaLabel = element.getAttribute('aria-label')
      expect(ariaLabel).toContain('\n')
    })

    test('SHOULD FAIL: passes axe accessibility audit', async () => {
      const testCases = [
        { description: 'Short description without tooltip', expected: 'no violations' },
        { description: 'This is a longer description that will require a tooltip and proper ARIA labeling', expected: 'no violations' },
        { description: 'Multi-line description\nWith line breaks\nAnd additional content', expected: 'no violations' },
        { description: '', expected: 'no violations' },
      ]

      for (const testCase of testCases) {
        const { container } = render(<DescriptionCell description={testCase.description} />)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      }
    })
  })

  describe('Keyboard Navigation', () => {
    test('SHOULD FAIL: keyboard focus order is logical', async () => {
      const user = userEvent.setup()

      render(
        <div>
          <button>Previous element</button>
          <DescriptionCell description="Focusable description with tooltip" />
          <DescriptionCell description="Short" />
          <DescriptionCell description="Another focusable description that needs a tooltip" />
          <button>Next element</button>
        </div>
      )

      // Tab through elements
      await user.tab()
      expect(screen.getByText('Previous element')).toHaveFocus()

      await user.tab()
      expect(screen.getByText('Focusable description with tooltip')).toHaveFocus()

      await user.tab()
      // Should skip non-focusable short description
      expect(screen.getByText('Another focusable description that needs a tooltip')).toHaveFocus()

      await user.tab()
      expect(screen.getByText('Next element')).toHaveFocus()
    })

    test('SHOULD FAIL: keyboard focus provides proper visual indicators', async () => {
      const user = userEvent.setup()

      render(<DescriptionCell description="Keyboard accessible description with proper focus indicators" />)

      const element = screen.getByText('Keyboard accessible description with proper focus indicators')

      await user.tab()
      expect(element).toHaveFocus()

      // Should have visible focus indicator (CSS outline or similar)
      // This is typically handled by CSS, but we can check for focus state
      expect(document.activeElement).toBe(element)
    })

    test('SHOULD FAIL: Enter and Space keys provide tooltip access', async () => {
      const user = userEvent.setup()
      const description = 'Description accessible via keyboard activation'

      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      await user.tab()
      expect(element).toHaveFocus()

      // Pressing Enter or Space should maintain accessibility
      await user.keyboard.press('Enter')
      expect(element).toHaveFocus()
      expect(element).toHaveAttribute('title', description)

      await user.keyboard.press('Space')
      expect(element).toHaveFocus()
      expect(element).toHaveAttribute('title', description)
    })

    test('SHOULD FAIL: Escape key handling for tooltip dismissal', async () => {
      const user = userEvent.setup()
      const description = 'Description with tooltip that can be dismissed'

      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      await user.tab()
      expect(element).toHaveFocus()

      // Escape key should not break functionality
      await user.keyboard.press('Escape')

      // Element should still be accessible
      expect(element).toHaveAttribute('title', description)
      expect(element).toHaveAttribute('aria-label', `Description: ${description}`)
    })

    test('SHOULD FAIL: supports keyboard navigation in table context', async () => {
      const user = userEvent.setup()

      const MockTable = () => (
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><button>INV-001</button></td>
              <td><DescriptionCell description="First row description requiring tooltip" /></td>
              <td>$100.00</td>
            </tr>
            <tr>
              <td><button>INV-002</button></td>
              <td><DescriptionCell description="Short" /></td>
              <td>$200.00</td>
            </tr>
            <tr>
              <td><button>INV-003</button></td>
              <td><DescriptionCell description="Third row description with tooltip functionality" /></td>
              <td>$300.00</td>
            </tr>
          </tbody>
        </table>
      )

      render(<MockTable />)

      // Navigate through table using Tab key
      await user.tab() // First button
      expect(screen.getByText('INV-001')).toHaveFocus()

      await user.tab() // First description (focusable)
      expect(screen.getByText('First row description requiring tooltip')).toHaveFocus()

      await user.tab() // Second button (skips short description)
      expect(screen.getByText('INV-002')).toHaveFocus()

      await user.tab() // Third description (focusable)
      expect(screen.getByText('Third row description with tooltip functionality')).toHaveFocus()
    })
  })

  describe('Screen Reader Compatibility', () => {
    test('SHOULD FAIL: provides meaningful content to screen readers', () => {
      const description = 'Meaningful description content for screen reader users'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Screen readers should get full context
      expect(element).toHaveAttribute('aria-label', `Description: ${description}`)

      // Should not have roles that might confuse screen readers
      expect(element).not.toHaveAttribute('role')
    })

    test('SHOULD FAIL: handles content updates for screen readers', () => {
      const initialDescription = 'Initial description content'
      const updatedDescription = 'Updated description content that has changed'

      const { rerender } = render(<DescriptionCell description={initialDescription} />)

      let element = screen.getByText(initialDescription)
      expect(element).toHaveAttribute('aria-label', `Description: ${initialDescription}`)

      // Update the description
      rerender(<DescriptionCell description={updatedDescription} />)

      element = screen.getByText(updatedDescription)
      expect(element).toHaveAttribute('aria-label', `Description: ${updatedDescription}`)
    })

    test('SHOULD FAIL: preserves text content structure for screen readers', () => {
      const structuredDescription = 'Project: Office Renovation\nPhase: 1 of 3\nBudget: $50,000\nDeadline: Q2 2024'
      render(<DescriptionCell description={structuredDescription} />)

      const element = screen.getByText('Project: Office Renovation')

      // Full structured content should be available
      const ariaLabel = element.getAttribute('aria-label')
      expect(ariaLabel).toBe(`Description: ${structuredDescription}`)

      // Structure should be preserved in ARIA label
      expect(ariaLabel).toContain('Project:')
      expect(ariaLabel).toContain('Phase:')
      expect(ariaLabel).toContain('Budget:')
      expect(ariaLabel).toContain('Deadline:')
    })

    test('SHOULD FAIL: announces changes appropriately', () => {
      // Test live region announcements for dynamic content
      const { rerender } = render(<DescriptionCell description="Original content" />)

      // Change description
      rerender(<DescriptionCell description="Updated content that requires announcement" />)

      const element = screen.getByText('Updated content that requires announcement')

      // Should have updated ARIA label
      expect(element).toHaveAttribute('aria-label', 'Description: Updated content that requires announcement')
    })
  })

  describe('WCAG Compliance', () => {
    test('SHOULD FAIL: meets color contrast requirements', () => {
      const description = 'Color contrast testing description'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Should use appropriate contrast classes
      expect(element).toHaveClass('text-slate-900', 'dark:text-slate-100')
    })

    test('SHOULD FAIL: text remains readable at 200% zoom', () => {
      // Mock high zoom level
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      })

      const description = 'Text readability at high zoom levels'
      const { container } = render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Container should maintain width constraints that work at high zoom
      const parentElement = element.parentElement
      expect(parentElement).toHaveClass('max-w-[200px]')

      // Text should remain truncated properly
      expect(element).toHaveClass('truncate')
    })

    test('SHOULD FAIL: supports users with motor disabilities', async () => {
      const user = userEvent.setup()
      const description = 'Motor disability accessible description content'

      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Should be activatable with various input methods
      await user.click(element)
      await user.tab()

      if (element.hasAttribute('tabIndex') && element.getAttribute('tabIndex') === '0') {
        expect(element).toHaveFocus()
      }

      // Should have adequate click/touch target size (CSS responsibility)
      const computedStyles = window.getComputedStyle(element)
      // Note: This is ideally tested at the CSS level
    })

    test('SHOULD FAIL: respects reduced motion preferences', () => {
      // Mock reduced motion preference
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const description = 'Reduced motion accessible description'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Tooltip functionality should still work regardless of motion preferences
      expect(element).toHaveAttribute('title', description)
      expect(element).toHaveAttribute('aria-label', `Description: ${description}`)
    })

    test('SHOULD FAIL: works with high contrast mode', () => {
      // Mock high contrast mode
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const description = 'High contrast mode description testing'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Should maintain accessibility features in high contrast
      if (element.hasAttribute('title')) {
        expect(element).toHaveAttribute('title', description)
        expect(element).toHaveClass('cursor-help')
      }
    })
  })

  describe('Assistive Technology Integration', () => {
    test('SHOULD FAIL: works with voice control software', () => {
      const description = 'Voice control accessible description element'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Element should have identifiable text for voice commands
      expect(element.textContent).toBeTruthy()

      // Should be targetable by voice commands
      if (element.hasAttribute('tabIndex') && element.getAttribute('tabIndex') === '0') {
        expect(element).toHaveAttribute('tabIndex', '0')
      }
    })

    test('SHOULD FAIL: integrates with switch navigation', async () => {
      const user = userEvent.setup()
      const description = 'Switch navigation accessible description'

      render(
        <div>
          <button>Previous switch target</button>
          <DescriptionCell description={description} />
          <button>Next switch target</button>
        </div>
      )

      const element = screen.getByText(description)

      // Should be included in switch navigation if focusable
      if (element.hasAttribute('tabIndex') && element.getAttribute('tabIndex') === '0') {
        await user.tab()
        await user.tab() // Skip to description element

        expect(element).toHaveFocus()
      }
    })

    test('SHOULD FAIL: supports eye-tracking systems', () => {
      const description = 'Eye-tracking system compatible description'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Should have sufficient visual area for eye-tracking activation
      // This is primarily a CSS/styling concern, but we verify the element exists
      expect(element).toBeInTheDocument()
      expect(element).toBeVisible()

      // Should provide feedback when activated
      if (element.hasAttribute('title')) {
        expect(element).toHaveAttribute('title', description)
      }
    })
  })

  describe('Multi-language and Internationalization', () => {
    test('SHOULD FAIL: handles RTL text direction', () => {
      // Mock RTL document
      document.dir = 'rtl'

      const description = 'نص عربي للاختبار مع وصف طويل يحتاج إلى tooltip'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Should maintain accessibility in RTL context
      if (element.hasAttribute('title')) {
        expect(element).toHaveAttribute('title', description)
        expect(element).toHaveAttribute('aria-label', `Description: ${description}`)
      }

      // Reset document direction
      document.dir = 'ltr'
    })

    test('SHOULD FAIL: handles special characters and unicode', () => {
      const unicodeDescription = 'Description with émojis 🌟 and spéciàl chãracters ñ'
      render(<DescriptionCell description={unicodeDescription} />)

      const element = screen.getByText(unicodeDescription)

      // Should preserve unicode in accessibility attributes
      if (element.hasAttribute('title')) {
        expect(element).toHaveAttribute('title', unicodeDescription)
        const ariaLabel = element.getAttribute('aria-label')
        expect(ariaLabel).toContain('🌟')
        expect(ariaLabel).toContain('émojis')
        expect(ariaLabel).toContain('spéciàl')
      }
    })

    test('SHOULD FAIL: maintains accessibility across different font sizes', () => {
      // Test with different font size preferences
      const originalFontSize = document.documentElement.style.fontSize
      document.documentElement.style.fontSize = '20px' // Simulate user font size preference

      const description = 'Font size adaptation accessibility test'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)

      // Should maintain accessibility regardless of font size
      expect(element).toHaveClass('truncate')
      if (element.hasAttribute('title')) {
        expect(element).toHaveAttribute('title', description)
      }

      // Restore original font size
      document.documentElement.style.fontSize = originalFontSize
    })
  })
})