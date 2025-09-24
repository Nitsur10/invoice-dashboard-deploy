# Issue: Implement Month-over-Month Trend Metrics

## Summary
Replace ad-hoc “trend” totals with genuine month-over-month (MoM) percentage deltas sourced from aggregated invoice data. This will make the dashboard’s key stats meaningful for finance stakeholders.

## Scope
- Create a Supabase materialized view (or table) that stores monthly counts and totals from 1 May 2025 onward.
- Update `/api/stats` to read the latest and previous month figures, compute percentage deltas, and return them in the response.
- Adjust `StatsCards` to render the new fields (handle missing prior month gracefully).
- Optionally schedule view refresh (e.g. Supabase cron) or trigger refresh after n8n spreadsheet sync completes.

## Acceptance Criteria
- `/api/stats` exposes `invoiceCountDeltaPct` and `totalAmountDeltaPct` (or equivalent) calculated from Supabase data.
- Dashboard cards display these percentages correctly, showing `N/A` when prior month is absent.
- Documentation or migration script exists for the new materialized view (checked into repo).

## References
- Materialized view example provided by stakeholder discussion.
- API code path: `src/app/api/stats/route.ts` and `src/components/dashboard/stats-cards.tsx`.

