// @ts-nocheck
// Vercel serverless function for the API.
//
// The Express app is pre-bundled by the api-server build into a single
// self-contained ESM file (`api/_server.mjs`) so that Vercel's function
// bundler never has to resolve the pnpm workspace TypeScript packages
// (@workspace/db, @workspace/api-zod) at deploy time. Files in /api that start
// with "_" are ignored by Vercel's function detection, so `_server.mjs` is
// only ever traced as a dependency of this entry — not deployed as its own
// function.
//
// All /api/* routes are rewritten to this function in vercel.json. The Express
// app mounts its router under "/api", so the original path is preserved.
import app from "./_server/index.mjs";

export default app;
