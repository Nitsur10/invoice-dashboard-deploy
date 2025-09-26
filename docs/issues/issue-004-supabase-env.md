# Issue: Harden Supabase Admin Client Configuration

## Summary
`supabaseAdmin` currently initializes with `process.env.SUPABASE_SERVICE_ROLE_KEY!`. When the key is missing (local dev, misconfigured deploy), the code still attempts to create the client with `undefined`, resulting in runtime errors before `isSupabaseConfigured()` can gate usage.

## Scope
- Defer creation of the Supabase admin client until both URL and service role key are present.
- Throw or log a descriptive error if configuration is incomplete, guiding developers to set env vars.
- Ensure API routes gracefully handle missing configuration (e.g. return mock data, 503, etc.).

## Acceptance Criteria
- Local development without service key no longer crashes; routes either use mock data or emit a clear message.
- Production builds fail fast with an explicit error if required env vars are absent.
- Unit or integration test (if feasible) covering the “missing key” scenario.

## References
- Current implementation: `src/lib/server/supabase-admin.ts`.
- Environment guard: `src/lib/server/env.ts`.

