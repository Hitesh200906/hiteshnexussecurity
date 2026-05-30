---
name: API Server Zod constraint
description: Why you cannot import zod directly in api-server routes
---

**The rule:** Never `import { z } from "zod"` or `"zod/v4"` directly in `artifacts/api-server/src/routes/*.ts`.

**Why:** `zod` is NOT in api-server's own `dependencies`, only in `@workspace/api-zod` (a lib). esbuild bundles api-server and cannot resolve `zod` as an external package, causing a build failure.

**How to apply:**
- For request body validation in api-server routes: use manual JS checks (`typeof x === "string"`, etc.) or import Zod schemas from `@workspace/api-zod` (already has zod bundled).
- If complex Zod schemas are needed in the server, add them to `@workspace/api-zod` or add `zod` to api-server's `dependencies`.
