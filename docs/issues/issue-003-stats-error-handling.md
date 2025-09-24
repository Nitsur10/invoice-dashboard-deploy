# Issue: Surface Stats API Errors Instead of Silent Zeroes

## Summary
`fetchDashboardStats` catches any fetch failure and returns a zeroed payload without exposing `isError`. Users see a “healthy” dashboard with all KPIs at zero instead of an error state.

## Scope
- Update `src/lib/api/stats.ts` so that errors propagate (e.g. throw, or return a flag consumed by React Query).
- Ensure `DashboardStatsProvider` sets `isError`/`error` correctly.
- Enhance UI in `src/components/dashboard/stats-cards.tsx` to display a friendly error card with retry.

## Acceptance Criteria
- When `/api/stats` fails, dashboard shows an error message or placeholder (not zeros).
- Successful responses behave as today.
- Optional: add logging/telemetry for failure cases.

## References
- Error swallowing: `src/lib/api/stats.ts` catch block.
- Dashboard consumer: `src/components/dashboard/stats-cards.tsx`.

