/**
 * Resolve the public base URL of the app across hosting environments.
 *
 * Priority:
 *   1. APP_BASE_URL                      — explicit override (recommended on Vercel)
 *   2. VERCEL_PROJECT_PRODUCTION_URL     — stable production domain on Vercel
 *   3. VERCEL_URL                        — per-deployment domain on Vercel
 *   4. REPLIT_DOMAINS (first entry)      — Replit hosting
 *   5. http://localhost:80               — local fallback
 *
 * The returned value never has a trailing slash.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd.replace(/\/+$/, "")}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;

  const replit = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (replit) return `https://${replit.replace(/\/+$/, "")}`;

  return "http://localhost:80";
}
