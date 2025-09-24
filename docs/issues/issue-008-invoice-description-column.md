# Issue: Show invoice description in list instead of supplier name

## Summary
In the invoices table, the `Supplier` column should be replaced with the invoice description (first line). Hovering over the truncated text should reveal the full description via tooltip.

## Scope
- Update `invoiceColumns` to swap the supplier column for a description column.
- Truncate the description in-cell (e.g. line clamp or ellipsis) while providing an accessible tooltip/popover with the full text on hover/focus.
- Ensure exports (CSV) still include supplier data elsewhere if required.
- Adjust filtering if any logic relies on supplier column; update facets if necessary.

## Acceptance Criteria
- Table displays first-line description where supplier used to be.
- Hovering or focusing the cell shows the complete description.
- No column layout regressions on different breakpoints.
- Supplier filters/chips remain available (or updated per product decision).

## References
- Table columns: `src/components/invoices/columns.tsx`.
- Data model: `src/app/(dashboard)/invoices/page.tsx` (`invoices` memo) and related filters.

