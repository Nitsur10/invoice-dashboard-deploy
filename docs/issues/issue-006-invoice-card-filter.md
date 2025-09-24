# Issue: Make invoice summary cards clickable filters

## Summary
On the invoices page, the five summary cards (Total, Current Page, Pending, Paid, Overdue) are informational only. Clicking Pending/Paid/Overdue should instantly filter the invoice table to the matching status.

## Scope
- Wire up the three status cards (`Pending`, `Paid`, `Overdue`) so a click sets the corresponding status filter via `useInvoiceFilters` and scrolls to the table if needed.
- Toggle behaviour: clicking a card that is already active should clear that specific status filter.
- Ensure behaviour works for both desktop and mobile filter drawer.

## Acceptance Criteria
- Clicking `Pending` shows only pending invoices in the table; UI indicates the filter is active (chip/sidebar).
- Clicking `Paid` or `Overdue` behaves similarly.
- Clicking an active card again resets to the previous filter state (no status filter).
- Interaction is keyboard-accessible (enter/space) and announced to screen readers.

## References
- Cards rendered in `src/app/(dashboard)/invoices/page.tsx` (stats grid around `stats.pending`, `stats.paid`, `stats.overdue`).
- Filter management hook: `src/hooks/use-invoices-filters.tsx`.

