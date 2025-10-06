# Issue: Kanban Board UX Improvements

## Summary
The RPD Kanban Board has two UX issues that impact usability: (1) invoice descriptions overflow and get cut off mid-sentence making cards difficult to read, and (2) status summary cards (Pending, In Review, Approved, Paid, Overdue) are not clickable filters like they are on the Invoices page, forcing users to use the filter drawer for basic status filtering.

## Scope
- Fix description text overflow in kanban cards using line-clamp-2 for clean truncation
- Make status summary cards clickable filters (matching Invoices page UX pattern)
- Add keyboard navigation and accessibility support for clickable cards
- Add visual feedback (hover states, active ring indicators) for interactive cards
- Ensure existing drag-and-drop functionality remains unaffected

## Acceptance Criteria
### Description Overflow Fix
- [ ] Long descriptions truncate after 2 lines with ellipsis (...)
- [ ] Full description visible on hover via tooltip (title attribute)
- [ ] Cards maintain consistent height across all statuses
- [ ] No text cut off mid-word or overflowing card boundaries
- [ ] Works in both light and dark mode

### Clickable Status Cards
- [ ] Clicking "Pending" card filters kanban board to show only pending invoices
- [ ] Clicking "In Review" card filters to in_review status
- [ ] Clicking "Approved" card filters to approved status
- [ ] Clicking "Paid" card filters to paid status
- [ ] Clicking "Overdue" card filters to overdue status
- [ ] Active filter shows visual indicator (ring around card)
- [ ] Clicking active filter toggles it off (removes filter)
- [ ] Filter chips update when clicking status cards
- [ ] Total and Total Amount cards remain non-interactive (not filters)

### Accessibility & Interactions
- [ ] Keyboard navigation works (Tab to focus, Enter/Space to activate)
- [ ] Screen reader announces "Filter by X - currently filtered/not filtered"
- [ ] Visual hover state (shadow increase, cursor pointer)
- [ ] Touch-friendly on mobile devices (adequate hit targets)
- [ ] Focus indicators visible and clear
- [ ] ARIA attributes correctly set (role="button", aria-pressed, aria-label)

### Existing Functionality Preserved
- [ ] Drag-and-drop cards between columns still works
- [ ] Card status updates correctly on drop
- [ ] Filter drawer functionality unchanged
- [ ] Export CSV button still works
- [ ] Refresh button still works
- [ ] Invoice data fetching and display unchanged

## References
- **Screenshot**: `Screenshots/Screenshot 2025-10-04 at 10.52.03 pm.png`
- **Current Implementation**: `src/app/(dashboard)/kanban/page.tsx`
- **Kanban Card Component**: `src/components/kanban/perfect-jira-kanban.tsx:110-112`
- **Status Cards**: `src/app/(dashboard)/kanban/page.tsx:220-274`
- **Pattern to Copy**: `src/app/(dashboard)/invoices/page.tsx:298-311` (clickable card handlers)
- **Pattern to Copy**: `src/app/(dashboard)/invoices/page.tsx:460-528` (clickable card implementation)

## Technical Notes

### Description Overflow Fix
**Current Code** (`perfect-jira-kanban.tsx:110-112`):
```tsx
<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
  {invoice.description || invoice.subject}
</p>
```

**Fixed Code**:
```tsx
<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2"
   title={invoice.description || invoice.subject}>
  {invoice.description || invoice.subject}
</p>
```

Tailwind v3.3+ includes built-in `line-clamp-{n}` utilities (no plugin needed).

### Clickable Status Cards Pattern
**Handler Functions** (add after line 129 in `kanban/page.tsx`):
```tsx
const { toggleStatus } = useInvoiceFilters(); // Already imported

const handleStatusCardClick = React.useCallback((status: BoardStatus) => {
  toggleStatus(status as any);
}, [toggleStatus]);

const handleStatusCardKeyDown = React.useCallback(
  (event: React.KeyboardEvent, status: BoardStatus) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleStatusCardClick(status);
    }
  },
  [handleStatusCardClick]
);

const isStatusActive = React.useCallback(
  (status: string) => filters.statuses.includes(status),
  [filters.statuses]
);
```

**Card Update Pattern** (example for Pending):
```tsx
<Card
  className={cn(
    "cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
    "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
    "border-blue-200/50 dark:border-blue-800/30",
    isStatusActive('pending') && "ring-2 ring-blue-500 bg-blue-100"
  )}
  role="button"
  tabIndex={0}
  aria-pressed={isStatusActive('pending')}
  aria-label={`Filter by pending invoices - currently ${isStatusActive('pending') ? 'filtered' : 'not filtered'}`}
  onClick={() => handleStatusCardClick('pending')}
  onKeyDown={(e) => handleStatusCardKeyDown(e, 'pending')}
>
  <CardContent className="p-4">
    <div className="text-center">
      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.pending}</p>
      <p className="text-sm text-blue-700 dark:text-blue-300">Pending</p>
    </div>
  </CardContent>
</Card>
```

Apply same pattern to all 5 status cards with their respective colors:
- **Pending**: Blue (`ring-blue-500`)
- **In Review**: Amber (`ring-amber-500`)
- **Approved**: Purple (`ring-purple-500`)
- **Paid**: Emerald (`ring-emerald-500`)
- **Overdue**: Red (`ring-red-500`)

### Files to Modify
1. `src/components/kanban/perfect-jira-kanban.tsx` (1 line change)
2. `src/app/(dashboard)/kanban/page.tsx` (add import, handlers, update 5 cards)

## Estimated Effort
**30 minutes** broken down as:
- Description overflow fix: 5 minutes (1 line change)
- Add clickable card handlers: 5 minutes (copy proven pattern)
- Update 5 status cards: 15 minutes (repetitive updates)
- Testing: 5 minutes (verify functionality)

## Priority
**P2** - Medium priority. UX enhancement that improves usability but doesn't block critical functionality. Cards are still readable (though messy), and filter drawer provides alternative filtering method.

## Risk Class
**Low** - Changes are isolated to presentation layer, no backend changes, proven pattern from Invoice page, no breaking changes to existing functionality.

## Labels
`frontend`, `ux`, `kanban`, `enhancement`, `accessibility`
