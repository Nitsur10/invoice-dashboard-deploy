# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RPD Invoice Dashboard - A Next.js 15 invoice management system with Supabase backend, featuring multi-agent orchestration workflows, real-time data sync, and comprehensive testing.

## Development Commands

**Build & Development:**
- `npm run dev` - Start development server (port 3007)
- `npm run build` - Production build
- `npm run vercel-build` - Vercel-specific build
- `npm start` - Start production server
- `npm run type-check` - Run TypeScript compiler without emit

**Testing:**
- `npm test` - Run Playwright E2E tests
- `npm run test:ui` - Interactive test UI
- `npm run test:debug` - Debug mode with inspector
- `npm run test:report` - View test results report

**Quality & Scripts:**
- `npm run lint` - Run ESLint
- `npm run smoke` - API smoke tests (`scripts/smoke-apis.ts`)
- `npm run validate:perf` - Performance validation (`scripts/validate-performance.ts`)

**Portfolio Tracker (Phase 2):**
- `npm run update:tracker` - Update GitHub issues/PRs control board
- `npm run tracker:validate` - Validate tracker configuration
- `npm run tracker:verbose` - Run tracker with verbose output

## Architecture

### Tech Stack
- **Framework:** Next.js 15 with App Router (React 19)
- **Styling:** Tailwind CSS with custom design system
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **State Management:** TanStack Query (React Query)
- **UI Components:** Radix UI primitives + shadcn/ui patterns
- **Testing:** Playwright for E2E
- **Type Safety:** TypeScript strict mode + Zod schemas

### Key Architectural Patterns

**Multi-Agent Orchestrator System:**
The project implements a sophisticated agent orchestration framework (`src/lib/orchestrator/`) that manages feature workflows through phases (Foundation → Development → Quality → Deployment). Agents coordinate via event bus, quality gates, and handoff services. See `agents/agent-coordinator.js` for CLI interface.

**Supabase Integration:**
- Server components use `getSupabaseServerComponentClient()` from `src/lib/supabase-server.ts`
- Browser components use client from `src/lib/supabase-browser.ts`
- Auth guard in dashboard layout redirects to `/auth/login` if no session
- Development mode allows access without Supabase configuration

**Data Layer:**
- API routes in `src/app/api/` for server-side operations
- Zod schemas in `src/lib/schemas/` for validation
- Mock data in `src/lib/mock-api.ts` for development
- Real invoice data in `src/lib/real-invoice-data.ts`

### Directory Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── layout.tsx        # Auth guard + sidebar/header
│   │   ├── dashboard/        # Main dashboard page
│   │   ├── kanban/           # Kanban board views
│   │   ├── analytics/        # Analytics pages
│   │   └── settings/         # Settings pages
│   ├── auth/                 # Authentication pages
│   ├── api/                  # API route handlers
│   └── providers.tsx         # React Query + theme providers
├── components/
│   ├── ui/                   # Radix UI + shadcn components
│   ├── invoices/             # Invoice-specific components + tests
│   ├── dashboard/            # Dashboard widgets
│   ├── charts/               # Recharts visualizations
│   ├── kanban/               # Drag-and-drop kanban boards
│   ├── orchestrator/         # Agent workflow visualizations
│   ├── layout/               # Header + sidebar
│   └── landing/              # Landing page components
├── lib/
│   ├── orchestrator/         # Multi-agent workflow system
│   │   ├── types.ts          # TypeScript types for workflows
│   │   ├── workflow-registry.ts  # Workflow state management
│   │   ├── event-bus.ts      # Event-driven coordination
│   │   ├── quality-gates.ts  # Quality validation framework
│   │   └── handoff-service.ts # Agent-to-agent handoffs
│   ├── schemas/              # Zod validation schemas
│   ├── server/               # Server-only utilities
│   └── supabase-*.ts         # Supabase client factories
└── hooks/                    # Custom React hooks
```

### Important Implementation Details

**Authentication Flow:**
Dashboard layout (`src/app/(dashboard)/layout.tsx`) enforces auth by checking `supabase.auth.getSession()`. If no session exists, redirects to `/auth/login`. Gracefully handles missing Supabase config for local development.

**Environment Variables:**
Use `getRequiredEnv()` from `src/lib/env.ts` for mandatory env vars. Supabase credentials in `.env.production`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_INVOICES_TABLE`

**Agent Orchestration:**
The orchestrator system (`src/lib/orchestrator/`) manages feature workflows with typed agents, quality gates, and event-driven coordination. Workflows persist state and emit events for UI consumption. CLI tool at `agents/agent-coordinator.js` supports PLAN → APPLY → TEST → PR → MERGE phases.

**Component Testing:**
Unit tests for invoice components in `src/components/invoices/__tests__/` using React Testing Library patterns. E2E tests in `tests-e2e/` using Playwright. Base URL defaults to `http://localhost:3007`.

**Styling Conventions:**
- Uses Tailwind with custom design system
- Glass morphism effects via `glass-sidebar` and `glass-header` classes
- Color system based on OKLCH color space
- Theme toggle in header supports light/dark modes

## Recent Work (Git Context)

**Current Branch:** `tracker-phase-2`

**Recent Commits:**
- Phase 2 Control Board Hardening & Automation Pack
- Portfolio-wide issues & PRs control board tracker (#16)
- Supabase admin client hardening (Issue #4) (#12)
- Trend delta implementation (#13)

**Modified Files:**
- `scripts/update-tracker.mjs` - Portfolio tracker automation script

## Testing Notes

**Playwright Config:**
- Tests run against `http://localhost:3007` by default
- Use `BASE_URL` env var to override
- 60s timeout per test, 10s for expect assertions
- Chromium-only by default
- Trace on first retry enabled

**Test Organization:**
- E2E tests: `tests-e2e/`
- Component tests: `src/components/**/__tests__/`
- API smoke tests: `scripts/smoke-apis.ts`

## Known Patterns

**Invoices Table:**
Uses TanStack Table with virtual scrolling, faceted filters, saved views, CSV export. Filter state managed via `useInvoicesFilters` hook. Supports pagination, sorting, and accessibility features.

**Kanban Boards:**
DnD Kit for drag-and-drop. Multiple implementations: mock data, Jira-style, and perfect Jira clone. State persistence via localStorage or Supabase.

**Analytics:**
Recharts for visualizations. Stats calculated server-side in `src/lib/api/stats.ts`. Real-time updates via TanStack Query with configurable refetch intervals.