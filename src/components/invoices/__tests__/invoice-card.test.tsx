/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { InvoiceCard } from '../invoice-card'
import type { Invoice } from '@/lib/types'

const mockInvoice: Invoice = {
  id: 'INV-001',
  invoiceNumber: 'INV-001',
  amount: 1250.00,
  status: 'pending',
  category: 'Construction',
  vendorName: 'ABC Construction Co',
  issueDate: new Date('2025-09-01'),
  dueDate: new Date('2025-09-30'),
  description: 'Foundation work and materials for Project Alpha',
  receivedDate: new Date('2025-09-02'),
  paidDate: undefined,
}

const mockPaidInvoice: Invoice = {
  ...mockInvoice,
  id: 'INV-002',
  invoiceNumber: 'INV-002',
  status: 'paid',
  paidDate: new Date('2025-09-15'),
}

const mockOverdueInvoice: Invoice = {
  ...mockInvoice,
  id: 'INV-003',
  invoiceNumber: 'INV-003',
  status: 'overdue',
  dueDate: new Date('2025-08-30'),
}

describe('InvoiceCard', () => {
  describe('Rendering', () => {
    it('should render invoice number', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.getByText('INV-001')).toBeInTheDocument()
    })

    it('should render invoice amount formatted as currency', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.getByText(/\$1,250\.00/)).toBeInTheDocument()
    })

    it('should render invoice status as badge', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const badge = screen.getByText('PENDING')
      expect(badge).toBeInTheDocument()
    })

    it('should render vendor name', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.getByText('ABC Construction Co')).toBeInTheDocument()
    })

    it('should render category', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.getByText('Construction')).toBeInTheDocument()
    })

    it('should render due date', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.getByText(/Due Date:/)).toBeInTheDocument()
    })

    it('should have data-testid attribute', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.getByTestId('invoice-card')).toBeInTheDocument()
    })
  })

  describe('Status badges', () => {
    it('should render "PENDING" badge for pending invoices', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const badge = screen.getByText('PENDING')
      expect(badge).toBeInTheDocument()
    })

    it('should render "PAID" badge for paid invoices', () => {
      render(<InvoiceCard invoice={mockPaidInvoice} />)

      const badge = screen.getByText('PAID')
      expect(badge).toBeInTheDocument()
    })

    it('should render "OVERDUE" badge for overdue invoices', () => {
      render(<InvoiceCard invoice={mockOverdueInvoice} />)

      const badge = screen.getByText('OVERDUE')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Expand/Collapse functionality', () => {
    it('should not show expanded details initially', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.queryByText('Issue Date:')).not.toBeInTheDocument()
    })

    it('should show "Show More" button initially', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument()
    })

    it('should expand details when "Show More" clicked', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const expandButton = screen.getByRole('button', { name: /show more/i })
      fireEvent.click(expandButton)

      expect(screen.getByText('Issue Date:')).toBeInTheDocument()
    })

    it('should change button text to "Show Less" when expanded', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const expandButton = screen.getByRole('button', { name: /show more/i })
      fireEvent.click(expandButton)

      expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
    })

    it('should collapse details when "Show Less" clicked', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      // Expand
      const expandButton = screen.getByRole('button', { name: /show more/i })
      fireEvent.click(expandButton)

      expect(screen.getByText('Issue Date:')).toBeInTheDocument()

      // Collapse
      const collapseButton = screen.getByRole('button', { name: /show less/i })
      fireEvent.click(collapseButton)

      expect(screen.queryByText('Issue Date:')).not.toBeInTheDocument()
    })

    it('should show description when expanded', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const expandButton = screen.getByRole('button', { name: /show more/i })
      fireEvent.click(expandButton)

      expect(screen.getByText(/Foundation work and materials/)).toBeInTheDocument()
    })

    it('should show paid date for paid invoices when expanded', () => {
      render(<InvoiceCard invoice={mockPaidInvoice} />)

      const expandButton = screen.getByRole('button', { name: /show more/i })
      fireEvent.click(expandButton)

      expect(screen.getByText('Paid Date:')).toBeInTheDocument()
    })

    it('should not show paid date for unpaid invoices', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const expandButton = screen.getByRole('button', { name: /show more/i })
      fireEvent.click(expandButton)

      expect(screen.queryByText('Paid Date:')).not.toBeInTheDocument()
    })
  })

  describe('Long vendor names', () => {
    const longVendorInvoice: Invoice = {
      ...mockInvoice,
      vendorName: 'This is a Very Long Vendor Name That Should Be Truncated Properly',
    }

    it('should truncate long vendor names', () => {
      render(<InvoiceCard invoice={longVendorInvoice} />)

      const vendorElement = screen.getByText(/This is a Very Long/)
      expect(vendorElement).toHaveClass('truncate')
    })

    it('should limit vendor name width', () => {
      render(<InvoiceCard invoice={longVendorInvoice} />)

      const vendorElement = screen.getByText(/This is a Very Long/)
      expect(vendorElement).toHaveClass('max-w-[60%]')
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const { container } = render(<InvoiceCard invoice={mockInvoice} />)

      // Should have card structure
      const card = container.querySelector('[class*="rpd-card"]') || container.querySelector('[class*="Card"]')
      expect(card || container.firstChild).toBeInTheDocument()
    })

    it('should have accessible button', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAccessibleName()
    })

    it('should support keyboard navigation', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const button = screen.getByRole('button', { name: /show more/i })
      button.focus()

      expect(document.activeElement).toBe(button)
    })
  })

  describe('Touch-friendly design', () => {
    it('should have adequate button height', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const button = screen.getByRole('button', { name: /show more/i })
      expect(button).toHaveClass('h-9') // 36px minimum for touch
    })

    it('should have full-width button for easy tapping', () => {
      render(<InvoiceCard invoice={mockInvoice} />)

      const button = screen.getByRole('button', { name: /show more/i })
      expect(button).toHaveClass('w-full')
    })
  })

  describe('Edge cases', () => {
    it('should handle missing description gracefully', () => {
      const invoiceWithoutDescription: Invoice = {
        ...mockInvoice,
        description: undefined,
      }

      render(<InvoiceCard invoice={invoiceWithoutDescription} />)

      const expandButton = screen.getByRole('button', { name: /show more/i })
      fireEvent.click(expandButton)

      expect(screen.queryByText('Description:')).not.toBeInTheDocument()
    })

    it('should handle zero amount', () => {
      const zeroAmountInvoice: Invoice = {
        ...mockInvoice,
        amount: 0,
      }

      render(<InvoiceCard invoice={zeroAmountInvoice} />)

      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument()
    })

    it('should handle very large amounts', () => {
      const largeAmountInvoice: Invoice = {
        ...mockInvoice,
        amount: 999999.99,
      }

      render(<InvoiceCard invoice={largeAmountInvoice} />)

      expect(screen.getByText(/\$999,999\.99/)).toBeInTheDocument()
    })
  })
})
