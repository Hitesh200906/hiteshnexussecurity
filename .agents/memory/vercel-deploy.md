---
name: Vercel deploy gotchas (Vite+Express monorepo)
description: Non-obvious lessons for deploying this repo to Vercel; the shape itself is in replit.md
---

# Why the Express API is pre-bundled (not imported as source)

Workspace libs (`@workspace/db`, `@workspace/api-zod`) export raw `.ts` via their `exports` map. Vercel's function bundler (NFT) copies dependency files but does NOT compile `.ts` from node_modules, so a function that imports the app source would fail at runtime. **Fix:** pre-bundle the Express app with the existing esbuild pipeline into a self-contained ESM file and have the committed `api/index.ts` import that, sidestepping all workspace TS resolution.

# pino + esbuild serverless gotcha (took several attempts)

Do NOT bundle pino by externalizing `thread-stream`/`pino-pretty`. pino's `lib/transport.js` runs a `require` at **module load** time, so even with no transport configured the bundle throws `MODULE_NOT_FOUND` on first import. **Fix:** reuse `esbuild-plugin-pino({ transports: ["pino-pretty"] })` for the serverless build (same as the server build); it emits worker sidecars. Output the bundle into an **underscore-prefixed dir** `api/_server/` so Vercel ignores those files for function detection but still traces them as deps of `api/index.ts`.

# Rewrite must select the function's route, not preserve path in destination

A single function file `api/index.ts` is registered at the exact route `/api` only. So the rewrite destination must be exactly `/api` (e.g. `{source:"/api/:path*", destination:"/api"}`) — Vercel invokes that function and passes the **original** request URL in `req.url`, which the Express router (mounted at `/api`) then matches. Do NOT put the captured suffix in the destination (`/api/$1`) — that resolves against routes/filesystem and 404s because no `/api/*` route exists.
