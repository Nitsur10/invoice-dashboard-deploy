import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { DescriptionCell } from '../description-cell'

describe('DescriptionCell', () => {
  describe('Empty/null descriptions', () => {
    test('SHOULD FAIL: displays fallback text for empty description', () => {
      render(<DescriptionCell description="" />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    test('SHOULD FAIL: displays fallback text for null description', () => {
      render(<DescriptionCell description={null as any} />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    test('SHOULD FAIL: displays fallback text for undefined description', () => {
      render(<DescriptionCell description={undefined as any} />)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    test('SHOULD FAIL: applies correct styling to fallback text', () => {
      render(<DescriptionCell description="" />)
      const fallbackElement = screen.getByText('—')
      expect(fallbackElement).toHaveClass('text-sm', 'text-slate-500', 'dark:text-slate-400')
    })
  })

  describe('Single-line descriptions', () => {
    test('SHOULD FAIL: displays short description without tooltip', () => {
      const shortDescription = 'Office supplies purchase'
      render(<DescriptionCell description={shortDescription} />)

      const element = screen.getByText(shortDescription)
      expect(element).toBeInTheDocument()
      expect(element).not.toHaveAttribute('title')
      expect(element).not.toHaveAttribute('aria-label')
    })

    test('SHOULD FAIL: displays truncated long single-line description with tooltip', () => {
      const longDescription = 'This is a very long single-line description that should be truncated because it exceeds the maximum display length'
      render(<DescriptionCell description={longDescription} />)

      const element = screen.getByText(longDescription)
      expect(element).toBeInTheDocument()
      expect(element).toHaveClass('truncate')
      expect(element).toHaveAttribute('title', longDescription)
      expect(element).toHaveAttribute('aria-label', `Description: ${longDescription}`)
      expect(element).toHaveAttribute('tabIndex', '0')
    })

    test('SHOULD FAIL: applies correct container width constraint', () => {
      const description = 'Sample description'
      render(<DescriptionCell description={description} />)

      const container = screen.getByText(description).parentElement
      expect(container).toHaveClass('max-w-[200px]')
    })

    test('SHOULD FAIL: applies correct text styling', () => {
      const description = 'Sample description'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)
      expect(element).toHaveClass(
        'truncate',
        'font-medium',
        'text-slate-900',
        'dark:text-slate-100'
      )
    })
  })

  describe('Multi-line descriptions', () => {
    test('SHOULD FAIL: displays only first line of multi-line description', () => {
      const multiLineDescription = 'First line of description\nSecond line should not be visible\nThird line also hidden'
      render(<DescriptionCell description={multiLineDescription} />)

      expect(screen.getByText('First line of description')).toBeInTheDocument()
      expect(screen.queryByText('Second line should not be visible')).not.toBeInTheDocument()
      expect(screen.queryByText('Third line also hidden')).not.toBeInTheDocument()
    })

    test('SHOULD FAIL: shows tooltip with full content for multi-line description', () => {
      const multiLineDescription = 'First line\nSecond line\nThird line'
      render(<DescriptionCell description={multiLineDescription} />)

      const element = screen.getByText('First line')
      expect(element).toHaveAttribute('title', multiLineDescription)
      expect(element).toHaveAttribute('aria-label', `Description: ${multiLineDescription}`)
    })
  })

  describe('Tooltip behavior', () => {
    test('SHOULD FAIL: tooltip appears on mouse hover for truncated content', async () => {
      const longDescription = 'This is a very long description that will be truncated and should show a tooltip'
      render(<DescriptionCell description={longDescription} />)

      const element = screen.getByText(longDescription)

      // Verify tooltip attributes are present
      expect(element).toHaveAttribute('title', longDescription)
      expect(element).toHaveClass('cursor-help')
    })

    test('SHOULD FAIL: tooltip content matches full description', () => {
      const description = 'Full description text for tooltip validation'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)
      if (element.hasAttribute('title')) {
        expect(element).toHaveAttribute('title', description)
      }
    })

    test('SHOULD FAIL: no tooltip for short descriptions that do not need truncation', () => {
      const shortDescription = 'Short desc'
      render(<DescriptionCell description={shortDescription} />)

      const element = screen.getByText(shortDescription)
      expect(element).not.toHaveAttribute('title')
      expect(element).not.toHaveAttribute('aria-label')
      expect(element).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('Keyboard accessibility', () => {
    test('SHOULD FAIL: focusable element receives keyboard focus', async () => {
      const longDescription = 'This is a long description that needs tooltip and keyboard focus'
      render(<DescriptionCell description={longDescription} />)

      const element = screen.getByText(longDescription)

      // Tab to the element
      await userEvent.tab()
      expect(element).toHaveFocus()
    })

    test('SHOULD FAIL: non-focusable element for short descriptions', () => {
      const shortDescription = 'Short'
      render(<DescriptionCell description={shortDescription} />)

      const element = screen.getByText(shortDescription)
      expect(element).toHaveAttribute('tabIndex', '-1')
    })

    test('SHOULD FAIL: proper ARIA labeling for screen readers', () => {
      const description = 'Description with proper ARIA labeling for accessibility testing'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)
      if (element.hasAttribute('aria-label')) {
        expect(element).toHaveAttribute('aria-label', `Description: ${description}`)
      }
    })
  })

  describe('Responsive behavior', () => {
    test('SHOULD FAIL: maintains width constraint on different screen sizes', () => {
      const description = 'Testing responsive behavior'
      const { container } = render(<DescriptionCell description={description} />)

      // Test with different viewport widths
      const element = container.firstChild as HTMLElement
      expect(element).toHaveClass('max-w-[200px]')
    })

    test('SHOULD FAIL: text truncation works at mobile breakpoints', () => {
      // Mock mobile viewport
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const description = 'Mobile responsive description truncation test'
      render(<DescriptionCell description={description} />)

      const element = screen.getByText(description)
      expect(element).toHaveClass('truncate')
    })
  })

  describe('Performance optimization', () => {
    test('SHOULD FAIL: component memoizes correctly', () => {
      const description = 'Performance test description'

      const { rerender } = render(<DescriptionCell description={description} />)
      const firstRender = screen.getByText(description)

      // Re-render with same props
      rerender(<DescriptionCell description={description} />)
      const secondRender = screen.getByText(description)

      // Should be memoized (this test will validate the React.memo implementation)
      expect(firstRender).toBe(secondRender)
    })

    test('SHOULD FAIL: handles string processing efficiently', () => {
      const multiLineDescription = Array(100).fill('Line').map((line, i) => `${line} ${i}`).join('\n')

      const renderStart = performance.now()
      render(<DescriptionCell description={multiLineDescription} />)
      const renderTime = performance.now() - renderStart

      // Should render efficiently (< 10ms for complex string)
      expect(renderTime).toBeLessThan(10)
    })
  })

  describe('Edge cases', () => {
    test('SHOULD FAIL: handles special characters in description', () => {
      const specialCharsDescription = 'Special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./'
      render(<DescriptionCell description={specialCharsDescription} />)

      expect(screen.getByText(specialCharsDescription)).toBeInTheDocument()
    })

    test('SHOULD FAIL: handles HTML content safely', () => {
      const htmlDescription = '<script>alert("XSS")</script>Safe description content'
      render(<DescriptionCell description={htmlDescription} />)

      // Should render as text, not execute HTML
      expect(screen.getByText(htmlDescription)).toBeInTheDocument()
      expect(document.querySelector('script')).toBeNull()
    })

    test('SHOULD FAIL: handles unicode and emoji content', () => {
      const unicodeDescription = 'Invoice 📄 for office supplies 🖇️ €100.00'
      render(<DescriptionCell description={unicodeDescription} />)

      expect(screen.getByText(unicodeDescription)).toBeInTheDocument()
    })

    test('SHOULD FAIL: handles very long descriptions gracefully', () => {
      const veryLongDescription = 'A'.repeat(1000)
      render(<DescriptionCell description={veryLongDescription} />)

      const element = screen.getByText(veryLongDescription)
      expect(element).toHaveAttribute('title', veryLongDescription)
      expect(element).toHaveClass('truncate')
    })

    test('SHOULD FAIL: handles whitespace-only descriptions', () => {
      const whitespaceDescription = '   \n\t   '
      render(<DescriptionCell description={whitespaceDescription} />)

      // Should treat as empty and show fallback
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })
})