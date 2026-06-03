import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * Sanitize a DATABASE_URL value against the two most common paste mistakes that
 * silently break node-postgres:
 *
 *   1. Including the `DATABASE_URL=` prefix in the *value* (e.g. pasting a whole
 *      `.env` line into a dashboard field).
 *   2. Wrapping the value in single or double quotes.
 *
 * In both cases node-postgres cannot parse the string as an absolute URL and
 * falls back to its internal base of `postgres://base`, so the runtime host
 * becomes the literal string "base" and connections fail with
 * `getaddrinfo ENOTFOUND base`.
 */
function sanitizeDatabaseUrl(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^DATABASE_URL\s*=\s*/i, "");
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const INVALID_HOSTS = new Set(["", "base", "undefined", "null"]);

export interface DbConnectionInfo {
  host: string;
  port: string;
  database: string;
  user: string;
}

function parseAndValidate(connectionString: string): DbConnectionInfo {
  if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
    throw new Error(
      `DATABASE_URL is malformed: it must start with "postgresql://" or "postgres://". ` +
        `Got a value starting with "${connectionString.slice(0, 13)}…". ` +
        `Common causes: the value includes the "DATABASE_URL=" prefix, is wrapped in quotes, or is missing the scheme.`,
    );
  }

  let url: URL;
  try {
    url = new URL(connectionString.replace(/^postgres(ql)?:\/\//i, "http://"));
  } catch {
    throw new Error(
      "DATABASE_URL could not be parsed as a valid connection URL.",
    );
  }

  const host = url.hostname;
  if (INVALID_HOSTS.has(host)) {
    throw new Error(
      `DATABASE_URL resolved to an invalid host "${host}". This means the connection ` +
        `string is malformed — node-postgres fell back to its placeholder host. Set ` +
        `DATABASE_URL to ONLY the connection string (starting with "postgresql://"), ` +
        `with no "DATABASE_URL=" prefix and no surrounding quotes.`,
    );
  }

  let user = url.username;
  try {
    user = decodeURIComponent(url.username);
  } catch {
    // Leave the raw (encoded) username if it cannot be decoded.
  }

  return {
    host,
    port: url.port,
    database: url.pathname.replace(/^\//, ""),
    user,
  };
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = sanitizeDatabaseUrl(rawUrl);

/**
 * Parsed, validated connection metadata (never includes the password). Safe to
 * log at startup to confirm which database the process is actually talking to.
 */
export const dbConnectionInfo: DbConnectionInfo =
  parseAndValidate(connectionString);

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

/**
 * Run a trivial `SELECT 1` to confirm the pool can actually reach the database.
 * Throws if the connection fails; call this once at startup.
 */
export async function verifyDbConnection(): Promise<void> {
  await pool.query("select 1");
}

export * from "./schema";
