import React from 'react'

interface DescriptionCellProps {
  description: string | null | undefined
}

/**
 * DescriptionCell component for displaying invoice descriptions with truncation and tooltip functionality
 *
 * This component will be implemented to:
 * - Display first line of description text
 * - Truncate long descriptions with CSS ellipsis
 * - Show tooltip on hover for truncated content
 * - Handle empty descriptions with fallback text
 * - Provide keyboard accessibility
 * - Include proper ARIA attributes for screen readers
 *
 * NOTE: This is a stub implementation. The tests are designed to FAIL initially.
 */
export const DescriptionCell: React.FC<DescriptionCellProps> = ({ description }) => {
  // This is a basic stub that will cause tests to fail
  // The actual implementation should handle all the test scenarios

  if (!description || !description.trim()) {
    return (
      <div data-testid="description-cell" className="text-sm text-slate-500 dark:text-slate-400">
        —
      </div>
    )
  }

  // Basic implementation - tests expect more sophisticated behavior
  return (
    <div className="max-w-[200px]" data-testid="description-cell-container">
      <div
        data-testid="description-cell"
        className="truncate font-medium text-slate-900 dark:text-slate-100"
      >
        {description}
      </div>
    </div>
  )
}

// Export as default as well for compatibility
export default DescriptionCell