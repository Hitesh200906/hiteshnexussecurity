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
