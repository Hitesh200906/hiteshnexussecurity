import { Router, type IRouter } from "express";
import { db, usersTable, scanJobsTable, planConfigTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { getSessionUser, isAdminVerified, setAdminVerified } from "../lib/session";
import {
  AdminLoginBody,
  AddUserCreditsBody,
  AddUserCreditsParams,
  UpdatePlanPricesBody,
  GetAdminUsersQueryParams,
} from "@workspace/api-zod";
import { randomBytes } from "crypto";

const router: IRouter = Router();

const ADMIN_EMAIL = "nexussecurity777@gmail.com";
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "nexus admin";

// In-memory challenge store (passkey registration / auth)
const passkeyChallengePending = new Map<number, string>();

async function requireAdminUser(req: any, res: any): Promise<{ user: typeof usersTable.$inferSelect } | null> {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult || !sessionResult.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return sessionResult;
}

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const result = await requireAdminUser(req, res);
  return result !== null;
}

router.get("/admin/check", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  const isAdmin = sessionResult?.user?.isAdmin ?? false;
  const adminPanelVerified = isAdmin ? await isAdminVerified(req) : false;

  let hasPasskey = false;
  if (isAdmin && sessionResult) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, sessionResult.user.id));
    hasPasskey = !!user?.passkeyCredentialId;
  }

  res.json({ isAdmin, adminPanelVerified, hasPasskey });
});

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionResult = await getSessionUser(req);
  if (!sessionResult || !sessionResult.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (parsed.data.passcode !== ADMIN_PASSCODE) {
    res.status(401).json({ error: "Invalid passcode" });
    return;
  }

  await setAdminVerified(req);
  res.json({ message: "Admin access granted" });
});

// ── Passkey endpoints ──────────────────────────────────────────────

router.get("/admin/passkey/register-options", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult || !sessionResult.user.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const challenge = randomBytes(32).toString("base64url");
  passkeyChallengePending.set(sessionResult.user.id, challenge);

  res.json({
    challenge,
    userId: String(sessionResult.user.id),
    userName: sessionResult.user.email,
  });
});

router.post("/admin/passkey/register-verify", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult || !sessionResult.user.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const credentialId = typeof req.body?.credentialId === "string" ? req.body.credentialId.trim() : "";
  if (!credentialId) {
    res.status(400).json({ error: "Invalid credential" });
    return;
  }

  // Store the credential ID for this user
  await db
    .update(usersTable)
    .set({ passkeyCredentialId: credentialId })
    .where(eq(usersTable.id, sessionResult.user.id));

  passkeyChallengePending.delete(sessionResult.user.id);
  res.json({ message: "Passkey registered successfully" });
});

router.post("/admin/passkey/auth-verify", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult || !sessionResult.user.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const authCredentialId = typeof req.body?.credentialId === "string" ? req.body.credentialId.trim() : "";
  if (!authCredentialId) {
    res.status(400).json({ error: "Invalid credential" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, sessionResult.user.id));

  if (!user?.passkeyCredentialId) {
    res.status(400).json({ error: "No passkey registered" });
    return;
  }

  if (user.passkeyCredentialId !== authCredentialId) {
    res.status(401).json({ error: "Passkey mismatch" });
    return;
  }

  await setAdminVerified(req);
  res.json({ message: "Admin access granted via passkey" });
});

router.delete("/admin/passkey", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult || !sessionResult.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const verified = await isAdminVerified(req);
  if (!verified) {
    res.status(403).json({ error: "Admin panel verification required" });
    return;
  }

  await db
    .update(usersTable)
    .set({ passkeyCredentialId: null })
    .where(eq(usersTable.id, sessionResult.user.id));

  res.json({ message: "Passkey removed" });
});

// ── Team members ──────────────────────────────────────────────────

router.post("/admin/team-members", async (req, res): Promise<void> => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;

  const verified = await isAdminVerified(req);
  if (!verified) {
    res.status(403).json({ error: "Admin panel verification required" });
    return;
  }

  const memberEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!memberEmail || !memberEmail.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, memberEmail));

  if (!user) {
    res.status(404).json({ error: "No account found with that email" });
    return;
  }

  if (user.isAdmin) {
    res.json({ message: `${user.email} already has admin access` });
    return;
  }

  await db
    .update(usersTable)
    .set({ isAdmin: true })
    .where(eq(usersTable.id, user.id));

  res.json({ message: `Admin access granted to ${user.email}` });
});

// ── User management ───────────────────────────────────────────────

router.get("/admin/users", async (req, res): Promise<void> => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;

  const verified = await isAdminVerified(req);
  if (!verified) {
    res.status(403).json({ error: "Admin panel verification required" });
    return;
  }

  const queryParams = GetAdminUsersQueryParams.safeParse(req.query);
  const search = queryParams.success ? queryParams.data.search : undefined;

  let users;
  if (search) {
    users = await db
      .select()
      .from(usersTable)
      .where(
        or(
          ilike(usersTable.email, `%${search}%`),
          ilike(usersTable.name, `%${search}%`)
        )
      );
  } else {
    users = await db.select().from(usersTable);
  }

  const allScans = await db.select().from(scanJobsTable);
  const scanCountByUser: Record<number, number> = {};
  for (const scan of allScans) {
    if (scan.userId) {
      scanCountByUser[scan.userId] = (scanCountByUser[scan.userId] ?? 0) + 1;
    }
  }

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      credits: u.credits,
      totalScans: scanCountByUser[u.id] ?? 0,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

router.post("/admin/users/:userId/credits", async (req, res): Promise<void> => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;

  const verified = await isAdminVerified(req);
  if (!verified) {
    res.status(403).json({ error: "Admin panel verification required" });
    return;
  }

  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = AddUserCreditsParams.safeParse({ userId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const body = AddUserCreditsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, params.data.userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ credits: user.credits + body.data.amount })
    .where(eq(usersTable.id, params.data.userId))
    .returning();

  const allScans = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.userId, updated.id));

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    credits: updated.credits,
    totalScans: allScans.length,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.put("/admin/plan-prices", async (req, res): Promise<void> => {
  const ok = await requireAdmin(req, res);
  if (!ok) return;

  const verified = await isAdminVerified(req);
  if (!verified) {
    res.status(403).json({ error: "Admin panel verification required" });
    return;
  }

  const parsed = UpdatePlanPricesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { basic, advanced, protection } = parsed.data;

  for (const [key, value] of [
    ["price_basic", basic],
    ["price_advanced", advanced],
    ["price_protection", protection],
  ] as [string, number][]) {
    await db
      .insert(planConfigTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: planConfigTable.key, set: { value } });
  }

  res.json({ basic, advanced, protection });
});

export default router;
