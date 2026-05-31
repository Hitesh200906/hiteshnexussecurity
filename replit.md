# Nexus Security

AI-powered vulnerability scanner for security-conscious developers, SMBs, and enterprises — featuring dark glassmorphism UI, credit-based plan system, ownership verification, and scan reporting.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/nexus-security run dev` — run the frontend (port 20270)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, wouter, TanStack Query, Tailwind CSS, Framer Motion

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: users, scan-jobs, plan-config, sessions
- `artifacts/api-server/src/routes/` — Route handlers: auth, scans, admin
- `artifacts/api-server/src/lib/session.ts` — Cookie-based session management
- `artifacts/nexus-security/src/` — React frontend

## Deploying to Vercel

The app deploys as a **single Vercel project** from the repo root (`vercel.json`):

- **Frontend**: `vite build` → static output served from `artifacts/nexus-security/dist/public`.
- **API**: the Express app is pre-bundled by the api-server build into `api/_server/index.mjs` (self-contained ESM, so Vercel never has to resolve the pnpm workspace TS packages). The committed `api/index.ts` wrapper re-exports it as the serverless function. `_server/` is underscore-prefixed so Vercel does not turn its files into separate functions.
- **Routing**: `/api/(.*)` is rewritten to the function (the Express router stays mounted at `/api`); all other paths fall back to `/index.html` for client-side routing.
- **Build command**: `pnpm run vercel-build` (builds the API bundle, then the frontend).

**Required Vercel env vars** (Project Settings → Environment Variables):

- `DATABASE_URL` — must point to a publicly reachable Postgres (e.g. the Neon/Replit connection string). Vercel cannot host the DB.
- `SESSION_SECRET`, `BREVO_API_KEY`, `MAIL_DEFAULT_SENDER` — same as Replit.
- `ADMIN_PASSCODE` — admin gate passcode.
- `APP_BASE_URL` — public site URL (e.g. `https://your-app.vercel.app`); used to build password-reset and scan-verification links. Falls back to `VERCEL_PROJECT_PRODUCTION_URL` if unset.
- `NODE_ENV=production` is set automatically by Vercel (ensures the logger emits plain JSON, not the worker-thread pino-pretty transport).

**Caveat**: the DB layer uses a node-postgres `Pool`. On serverless this is acceptable for low traffic but can exhaust connections at scale — consider `@neondatabase/serverless` later.

## Architecture decisions

- Sessions stored in PostgreSQL (no Redis) with httpOnly cookies — simple and reliable
- Password hashing uses SHA-256 + hardcoded salt (sufficient for demo; upgrade to bcrypt for production)
- Plan prices stored in `plan_config` table as key/value pairs so admin can update without deploys
- Admin panel requires two-factor entry: must be the admin email account AND enter a passcode
- Manual code verification stores verificationId in the scan_job row; code check is trust-based (checks website is provided, updates status to "queued")

## Product

- **Landing page**: Hero, three scan plans (Basic/Advanced/Protection+), scan submission form with email or manual code ownership verification
- **Login/Signup**: Tab-based auth with Google OAuth link
- **Profile dashboard**: Credits balance, scan history, view/download reports
- **Admin panel**: Passcode-gated, manage plan prices and add credits to users

## User preferences

- Dark theme only (black background, teal accent #2f9b9b)
- No emojis in UI

## Gotchas

- Admin login is two-step: must be logged in as `nexussecurity777@gmail.com` AND enter passcode `nexus admin` (or env var `ADMIN_PASSCODE`)
- Demo user: `demo@nexussecurity.com` / `demo123` (15 credits)
- Admin user: `nexussecurity777@gmail.com` / set via `hashPassword('nexus_admin_2026')`
- Run `pnpm run typecheck:libs` after adding new DB schema files before running API server typecheck
- Google OAuth (`/api/login/google`) is a stub — needs real OAuth implementation

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
