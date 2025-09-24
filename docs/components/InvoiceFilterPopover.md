# InvoiceFilterPopover Component

A responsive, accessible popover component for invoice filtering that provides a compact alternative to sidebar-based filtering. Built with RadixUI primitives for robust behavior and comprehensive accessibility support.

## Overview

The `InvoiceFilterPopover` component displays a filter trigger button that opens a popover containing all invoice filtering controls. It automatically shows an active filter count badge and adapts to different screen sizes by switching to a drawer interface on mobile devices.

## Import

```typescript
import { InvoiceFilterPopover } from '@/components/invoices/filter-popover'
```

## Basic Usage

```tsx
import { InvoiceFilterPopover } from '@/components/invoices/filter-popover'

function InvoiceToolbar() {
  const facetsQuery = useQuery({
    queryKey: ['invoice-facets'],
    queryFn: () => fetchInvoiceFacets(),
  })

  return (
    <div className="flex items-center gap-4">
      <InvoiceFilterPopover
        facets={facetsQuery.data?.facets}
        isLoading={facetsQuery.isLoading}
        className="hidden md:block"
      />

      {/* Other toolbar buttons */}
      <ExportProgressButton />
    </div>
  )
}
```

## Props Interface

```typescript
interface InvoiceFilterPopoverProps {
  /** Facet data from Supabase API */
  facets?: InvoiceFacetsResponse['facets']

  /** Loading state for facets query */
  isLoading?: boolean

  /** Additional CSS classes */
  className?: string

  /** Optional callback when popover closes */
  onClose?: () => void
}
```

### Props Details

#### `facets` (optional)
- **Type**: `InvoiceFacetsResponse['facets']`
- **Description**: Available filter options loaded from the Supabase API
- **Usage**: Populates status, category, and vendor filter options
- **Example**:
  ```typescript
  {
    statuses: ['draft', 'pending', 'paid', 'overdue'],
    categories: ['consulting', 'materials', 'labor'],
    vendors: ['Vendor A', 'Vendor B', 'Vendor C']
  }
  ```

#### `isLoading` (optional)
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Indicates whether facet data is being loaded
- **Usage**: Shows loading states in filter form while facets are being fetched

#### `className` (optional)
- **Type**: `string`
- **Description**: Additional CSS classes to apply to the trigger button
- **Common Usage**: `"hidden md:block"` to show only on desktop
- **Example**: `"ml-auto"` to push button to the right side of toolbar

#### `onClose` (optional)
- **Type**: `() => void`
- **Description**: Callback function executed when the popover closes
- **Usage**: Handle cleanup or state updates when popover is dismissed

## Features

### Active Filter Count Badge
Automatically displays a badge with the number of active filters:

```tsx
// Badge appears when any filters are active
{hasActiveFilters && (
  <Badge variant="secondary" className="ml-2">
    {activeFilterCount}
  </Badge>
)}
```

**Filter Count Logic**:
- Status filters: Each selected status counts as 1
- Category filters: Each selected category counts as 1
- Vendor filters: Each selected vendor counts as 1
- Date range: Counts as 1 if either start or end date is set
- Amount range: Counts as 1 if either min or max amount is set
- Search term: Counts as 1 if search query is present

### Responsive Behavior

The component automatically adapts based on screen size:

- **Desktop (≥1024px)**: Shows popover interface
- **Mobile (<768px)**: Should be hidden, use `InvoiceFilterDrawer` instead
- **Recommended Usage**:
  ```tsx
  <InvoiceFilterPopover className="hidden md:block" />
  <InvoiceFilterDrawer className="md:hidden" />
  ```

### Accessibility Features

#### ARIA Implementation
- **Trigger Button**:
  - `aria-label="Open invoice filters"`
  - `aria-describedby="filter-description"`
  - `aria-expanded={open}`
- **Popover Content**:
  - `role="dialog"`
  - `aria-label="Invoice filters"`
- **Filter Badge**: `aria-label="{count} active filters"`

#### Keyboard Support
- **Enter/Space**: Opens popover from trigger button
- **Escape**: Closes popover and returns focus to trigger
- **Tab**: Navigates through filter controls inside popover
- **Arrow Keys**: Navigate through filter options (inherited from form)

#### Focus Management
- **Auto Focus**: First interactive element receives focus on open
- **Focus Restoration**: Returns to trigger button on close
- **Focus Trap**: Focus contained within popover when open

## Styling

### Default Appearance
- **Trigger**: Outline button with Filter icon and "Filters" text
- **Popover**: 384px wide with end alignment and 8px offset
- **Badge**: Secondary variant with minimum width for single digits

### Customization Examples

```tsx
// Custom styling
<InvoiceFilterPopover
  className="ml-auto border-blue-200 hover:border-blue-300"
  facets={facets}
/>

// Integration with existing toolbar
<div className="flex items-center justify-between gap-4">
  <div className="flex items-center gap-2">
    <h1>Invoices</h1>
    <Badge variant="outline">{totalCount}</Badge>
  </div>

  <div className="flex items-center gap-4">
    <InvoiceFilterPopover facets={facets} />
    <ExportProgressButton />
  </div>
</div>
```

## Integration with Filter System

### State Management
The component integrates seamlessly with the existing filter system:

```tsx
// Uses existing hook - no changes required
const { filters, setFilters, reset } = useInvoiceFilters()

// Component automatically reads from filter context
<InvoiceFilterPopover facets={facets} />
```

### Filter Form Integration
The popover uses the enhanced `InvoiceFilterForm` component:

```tsx
<InvoiceFilterForm
  facets={facets}
  isLoading={isLoading}
  onClose={handleClose}
  variant="popover" // Optimized layout for popover width
/>
```

## Performance Considerations

### Memoization
The component uses `useMemo` for expensive calculations:

```typescript
const activeFilterCount = React.useMemo(() => {
  // Calculates filter count only when filters change
  return calculateActiveFilters(filters)
}, [filters])
```

### Event Handlers
Event handlers are memoized with `useCallback`:

```typescript
const handleClose = React.useCallback(() => {
  setOpen(false)
  onClose?.()
}, [onClose])
```

### Facet Loading
- Facets should be loaded once and cached with React Query
- Component handles loading states gracefully
- No refetch needed when popover opens/closes

## Common Usage Patterns

### With Saved Views
```tsx
<div className="flex items-center gap-4">
  <SavedViewsButton />
  <InvoiceFilterPopover facets={facets} />
  <Button onClick={clearFilters}>Clear All</Button>
</div>
```

### With Export Functionality
```tsx
<div className="flex items-center gap-4">
  <InvoiceFilterPopover facets={facets} />
  <ExportProgressButton
    disabled={!hasSelectedInvoices}
    onExport={handleExport}
  />
</div>
```

### With Filter Chips
```tsx
<div className="space-y-4">
  <div className="flex items-center gap-4">
    <InvoiceFilterPopover facets={facets} />
    <RefreshButton onClick={refetch} />
  </div>

  {/* Filter chips display below toolbar */}
  <InvoiceFilterChips />

  {/* Data table */}
  <DataTable />
</div>
```

## Error Handling

### Facet Loading Errors
```tsx
const facetsQuery = useQuery({
  queryKey: ['invoice-facets'],
  queryFn: () => fetchInvoiceFacets(),
  retry: 3,
  retryDelay: 1000,
})

<InvoiceFilterPopover
  facets={facetsQuery.data?.facets}
  isLoading={facetsQuery.isLoading}
  // Component handles undefined facets gracefully
/>
```

### Popover State Errors
The component includes error boundaries for popover state issues:
- Handles RadixUI positioning failures
- Graceful degradation if focus management fails
- Maintains filter state even if popover has issues

## Testing

### Component Testing
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { InvoiceFilterPopover } from './filter-popover'

describe('InvoiceFilterPopover', () => {
  it('renders trigger button with filter count badge when filters active', () => {
    render(<InvoiceFilterPopover facets={mockFacets} />)
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
  })

  it('opens popover on trigger click', async () => {
    render(<InvoiceFilterPopover facets={mockFacets} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
```

### Accessibility Testing
```tsx
it('manages focus properly on open/close', async () => {
  render(<InvoiceFilterPopover facets={mockFacets} />)

  const trigger = screen.getByRole('button')
  fireEvent.click(trigger)

  // First form element should receive focus
  expect(screen.getByRole('textbox')).toHaveFocus()

  fireEvent.keyDown(document, { key: 'Escape' })

  // Focus should return to trigger
  expect(trigger).toHaveFocus()
})
```

## Migration Guide

### From InvoiceFilterSidebar
```tsx
// Before: Sidebar implementation
<div className="lg:grid lg:grid-cols-[280px,1fr] lg:gap-8">
  <InvoiceFilterSidebar
    facets={facets}
    isLoading={isLoading}
    className="hidden lg:block"
  />
  <main>{/* content */}</main>
</div>

// After: Popover implementation
<div className="space-y-6">
  <div className="flex items-center gap-4">
    <InvoiceFilterPopover
      facets={facets}
      isLoading={isLoading}
      className="hidden md:block"
    />
  </div>
  <main>{/* content */}</main>
</div>
```

### State Management (No Changes)
```tsx
// Filter context works identically
const { filters, setFilters, reset } = useInvoiceFilters()

// No changes needed to existing filter logic
const filteredData = useQuery({
  queryKey: ['invoices', filters],
  queryFn: () => fetchInvoices(filters),
})
```

## Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

RadixUI Popover provides robust cross-browser support with automatic fallbacks for positioning and focus management.

## Related Components

- [`InvoiceFilterForm`](./InvoiceFilterForm.md) - The form component used inside the popover
- [`InvoiceFilterDrawer`](./InvoiceFilterDrawer.md) - Mobile drawer alternative
- [`InvoiceFilterChips`](./InvoiceFilterChips.md) - Displays active filters as removable chips
- [`useInvoiceFilters`](../hooks/useInvoiceFilters.md) - Filter state management hook