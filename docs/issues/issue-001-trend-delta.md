# Issue: Fix Dashboard Trend Percentage Logic

## Summary
Dashboard stats cards currently treat absolute totals (`overview.trends`) as percentage deltas. We need to return true month-over-month (MoM) changes from `/api/stats` and display them accurately.

## Scope
- Update backend stats aggregation to calculate MoM deltas (e.g. via Supabase materialized view over post–1 May 2025 invoices).
- Adjust `StatsCards` UI to render the new percentage values safely (handle nulls when prior month is absent).
- Add lightweight validation to prevent regressions (type guards/tests if possible).

## Acceptance Criteria
- `/api/stats` response contains numeric percentage fields (e.g. `invoiceCountDeltaPct`, `totalAmountDeltaPct`).
- Dashboard cards show correct Δ% values; no more raw totals ending with `%`.
- When prior month data is missing, UI shows `N/A` instead of misleading percentages.

## References
- Current trend misusage: `src/components/dashboard/stats-cards.tsx`.
- Stats aggregation: `src/app/api/stats/route.ts`.

