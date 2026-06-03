import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { Request, Response } from "express";
import { randomBytes } from "crypto";
import { logger } from "./logger";

const SESSION_COOKIE = "nexus_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// The app is always served over HTTPS — in production the frontend (e.g. Vercel)
// and API (e.g. Render) live on different domains, and in dev the Replit preview
// renders the app inside a cross-site iframe. In both cases the browser only
// sends/sets the session cookie if it is SameSite=None + Secure; a SameSite=Lax
// cookie is dropped in the embedded iframe, which manifests as a login loop
// (the session never persists). So use None+Secure everywhere.
function getCookieOptions(maxAgeMs?: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

// Resolve the session id from either the cookie OR an Authorization: Bearer
// header. The header path is what makes auth work when the frontend and API
// live on different domains (e.g. Vercel + Render), where browsers drop the
// cross-site session cookie. The token returned at login is the same session id.
function getSessionId(req: Request): string | null {
  const cookieId = req.cookies?.[SESSION_COOKIE];
  if (cookieId) return cookieId;

  const auth = req.headers?.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  return null;
}

export async function createSession(userId: number, res: Response): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessionsTable).values({
    id: sessionId,
    userId: String(userId),
    expiresAt,
  });

  res.cookie(SESSION_COOKIE, sessionId, getCookieOptions(SESSION_DURATION_MS));

  return sessionId;
}

export async function getSessionUser(req: Request) {
  const sessionId = getSessionId(req);
  if (!sessionId) return null;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, sessionId),
        gt(sessionsTable.expiresAt, new Date())
      )
    );

  if (!session) return null;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parseInt(session.userId)));

  if (!user) return null;

  return { user, session };
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const sessionId = getSessionId(req);
  if (sessionId) {
    try {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    } catch (err) {
      logger.error({ err }, "Failed to delete session");
    }
  }
  res.clearCookie(SESSION_COOKIE, getCookieOptions());
}

export async function isAdminVerified(req: Request): Promise<boolean> {
  const sessionId = getSessionId(req);
  if (!sessionId) return false;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  return session?.adminVerified === "true";
}

export async function setAdminVerified(req: Request): Promise<void> {
  const sessionId = getSessionId(req);
  if (!sessionId) return;

  await db
    .update(sessionsTable)
    .set({ adminVerified: "true" })
    .where(eq(sessionsTable.id, sessionId));
}
