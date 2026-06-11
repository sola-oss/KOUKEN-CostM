# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start development server (Express + Vite HMR on PORT, default 5000)
- `npm run build` — Build for production (Vite → dist/public/, esbuild → dist/index.js)
- `npm run start` — Run production build
- `npm run check` — TypeScript type checking (tsc --noEmit)
- `npm run db:push` — Push Drizzle ORM schema changes

No test framework is configured.

## Architecture

Full-stack monorepo: React frontend + Express API server + Supabase (PostgreSQL).

```
client/src/     → React 18 + Vite + Wouter routing + TanStack Query
server/         → Express API + Supabase client + DAO pattern
shared/         → Zod schemas and TypeScript types shared by both
```

### Path Aliases
- `@` → `client/src/`
- `@shared` → `shared/`
- `@assets` → `attached_assets/`

### Server

Entry: `server/index.ts` → registers middleware (Helmet, CORS, rate-limit) then routes.

**Routes** (`server/routes/`):
- `production-api.ts` — Core API: orders, procurements, worker logs, tasks, KPIs, material costs, work logs
- `quotes-api.ts` — Quote CRUD with line items
- `auth.ts` — Supabase JWT verification, user profile management
- `sales-orders-sqlite.ts` — Legacy stub (returns empty data)

**DAO**: `server/dao/production-dao.ts` — All Supabase queries. Handles order ID generation (ko130XXX, fiscal-year-aware), KPI calculations (material cost, labor cost, gross profit, variance %), table creation/migration.

**Supabase client**: `server/lib/supabase-client.ts` — Singleton using service role key.

### Client

Entry: `client/src/main.tsx` → `App.tsx` (Wouter routes + AuthProvider + QueryClientProvider).

**Key pages** (in `client/src/pages/production/`): projects, project-detail, procurement, task-planning, task-management, gantt-simple, material-usages, material-summary, material-costs, purchased-items, customers-master, materials-master, quotes, quotes-edit, quotes-print, prospects.

**Cost pages** (`client/src/pages/cost/`): cost-summary, workers-master, vendors-master.

**Auth flow**: Supabase email/password → JWT → `GET /api/auth/me` verifies token → user_profiles table provides role (admin/worker). `AuthContext.tsx` caches profile in localStorage (60min TTL). `ProtectedRoute.tsx` guards routes.

**UI**: Shadcn/Radix UI components in `client/src/components/ui/`, Tailwind CSS with HSL variables, Material Design color system.

### Shared Schemas

`shared/production-schema.ts` is the primary schema file — Zod schemas for all entities (orders, procurements, worker logs, tasks, work logs, quotes, materials, customers, vendors, outsourcing costs). Used for validation on both client and server.

## Database

All production data is in **Supabase** (PostgreSQL). No local database needed.

Key tables: orders, procurements, worker_logs, tasks, work_logs, materials_master, workers_master, vendors_master, customers_master, quotes, quote_items, outsourcing_costs, user_profiles.

`server/db.ts` and `@neondatabase/serverless` exist but are unused legacy code (Neon DB was previously used).

## Environment Variables

Required in `.env`:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ACCESS_CODE=
VITE_APP_ACCESS_CODE=
PORT=5000
```

## Deployment

Railway (auto-deploy on push to main). Production URL: https://kouken-costm.up.railway.app

## Domain Context

Japanese manufacturing production management system (生産管理システム). All UI text is Japanese. Order IDs use "ko" prefix. Dates are handled in JST (Asia/Tokyo). Work logs can be imported from Harmos CSV. Cost calculations aggregate material costs + outsourcing costs + worker hours for per-order KPIs.
