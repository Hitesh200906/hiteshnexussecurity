import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  scanJobsTable,
  planConfigTable,
  pricingPlansTable,
  supportTicketsTable,
  ticketMessagesTable,
  notificationsTable,
  auditLogsTable,
  reportsTable,
} from "@workspace/db";
import { eq, ilike, or, and, desc, asc, count, gte } from "drizzle-orm";
import { getSessionUser, isAdminVerified, setAdminVerified } from "../lib/session";
import {
  AdminLoginBody,
  AddUserCreditsBody,
  AddUserCreditsParams,
  UpdatePlanPricesBody,
  GetAdminUsersQueryParams,
  GetAdminUserParams,
  UpdateUserPlanBody,
  UpdateUserPlanParams,
  AdminUserActionBody,
  AdminUserActionParams,
  AdminResetUserPasswordParams,
  AddAdminBody,
  RemoveAdminParams,
  GetAdminTicketsQueryParams,
  GetAdminTicketParams,
  UpdateTicketBody,
  UpdateTicketParams,
  PostAdminTicketMessageBody,
  PostAdminTicketMessageParams,
  UpdateScanStatusBody,
  UpdateScanStatusParams,
  ReassignScanBody,
  ReassignScanParams,
  UploadScanReportBody,
  UploadScanReportParams,
  DeleteScanParams,
  UpdatePricingPlanBody,
  UpdatePricingPlanParams,
} from "@workspace/api-zod";
import { randomBytes, randomUUID, randomInt } from "crypto";
import { recordAudit } from "../lib/audit";
import { ticketToDto, messageToDto } from "./support";
import { hashPassword } from "../lib/password";
import { sendEmail, buildPasswordResetCodeEmailHtml } from "../lib/email";

const router: IRouter = Router();

const ADMIN_EMAIL = "hitesh.tanwar8318@gmail.com";
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

// Admin + passcode/passkey verification in one step. Returns the session user
// or null (after writing the appropriate error response).
async function requireVerifiedAdmin(
  req: any,
  res: any,
): Promise<{ user: typeof usersTable.$inferSelect } | null> {
  const result = await requireAdminUser(req, res);
  if (!result) return null;
  if (!(await isAdminVerified(req))) {
    res.status(403).json({ error: "Admin panel verification required" });
    return null;
  }
  return result;
}

// Super-admin-only gate (Admin Management, Pricing Management, Audit Logs).
async function requireSuperAdmin(
  req: any,
  res: any,
): Promise<{ user: typeof usersTable.$inferSelect } | null> {
  const result = await requireVerifiedAdmin(req, res);
  if (!result) return null;
  if (result.user.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return null;
  }
  return result;
}

function adminUserDto(u: typeof usersTable.$inferSelect, totalScans: number) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    credits: u.credits,
    totalScans,
    role: u.role ?? (u.isAdmin ? "admin" : "user"),
    plan: u.currentPlan,
    isVerified: u.isVerified,
    isBanned: u.isBanned,
    isSuspended: u.isSuspended,
    createdAt: u.createdAt.toISOString(),
  };
}

function scanToAdminDto(
  s: typeof scanJobsTable.$inferSelect,
  user?: { name: string; email: string } | null,
) {
  return {
    id: s.id,
    userId: s.userId,
    userName: user?.name ?? s.fullName,
    userEmail: user?.email ?? s.email,
    websiteUrl: s.websiteUrl,
    companyName: s.companyName,
    plan: s.plan,
    status: s.status,
    reportUrl: s.reportUrl,
    createdAt: s.createdAt.toISOString(),
  };
}

function reportToDto(r: typeof reportsTable.$inferSelect, scan?: typeof scanJobsTable.$inferSelect | null) {
  return {
    id: r.id,
    scanId: r.scanId,
    userId: r.userId,
    companyName: scan?.companyName ?? null,
    websiteUrl: scan?.websiteUrl ?? null,
    plan: scan?.plan ?? null,
    severitySummary: (r.severitySummary as Record<string, unknown> | null) ?? null,
    pdfUrl: r.pdfUrl,
    createdAt: r.createdAt.toISOString(),
  };
}

// ── Daily series helpers (for the 14-day growth chart) ────────────
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function lastNDays(days: number): { label: string; key: string; end: Date }[] {
  const now = new Date();
  const out: { label: string; key: string; end: Date }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({
      label: d.toLocaleString("en-US", { month: "short", day: "numeric" }),
      key: dayKey(d),
      end: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
    });
  }
  return out;
}

// Count of events per day over the last N days.
function dailyCounts(dates: Date[], days: number): { label: string; value: number }[] {
  const buckets = lastNDays(days).map((b) => ({ label: b.label, key: b.key, value: 0 }));
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const d of dates) {
    const i = idx.get(dayKey(d));
    if (i !== undefined) buckets[i].value++;
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }));
}

// Cumulative count of events up to and including each day over the last N days.
function cumulativeDaily(dates: Date[], days: number): { label: string; value: number }[] {
  return lastNDays(days).map((b) => ({
    label: b.label,
    value: dates.filter((d) => d < b.end).length,
  }));
}

// Build N monthly buckets ending with the current month.
function monthlyBuckets(rows: { date: Date; value: number }[], months = 6): { label: string; value: number }[] {
  const now = new Date();
  const buckets: { label: string; key: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      key: `${d.getFullYear()}-${d.getMonth()}`,
      value: 0,
    });
  }
  for (const row of rows) {
    const key = `${row.date.getFullYear()}-${row.date.getMonth()}`;
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.value += row.value;
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }));
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
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

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
    .set({ isAdmin: true, role: user.role === "super_admin" ? "super_admin" : "admin" })
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
      role: u.role ?? (u.isAdmin ? "admin" : "user"),
      plan: u.currentPlan,
      isVerified: u.isVerified,
      isBanned: u.isBanned,
      isSuspended: u.isSuspended,
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

  await recordAudit({
    actorUserId: undefined,
    action: "user.credits.add",
    targetType: "user",
    targetId: updated.id,
    details: { amount: body.data.amount, total: updated.credits },
  });

  res.json(adminUserDto(updated, allScans.length));
});

router.put("/admin/plan-prices", async (req, res): Promise<void> => {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

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

// ── Analytics overview ────────────────────────────────────────────

const EMPTY_ANALYTICS = {
  totalUsers: 0,
  activeUsers: 0,
  totalScans: 0,
  completedScans: 0,
  pendingScans: 0,
  revenue: 0,
  ticketsOpen: 0,
  ticketsClosed: 0,
  userGrowth: [] as { label: string; value: number }[],
  scanActivity: [] as { label: string; value: number }[],
  revenueGrowth: [] as { label: string; value: number }[],
  planDistribution: [] as { label: string; value: number }[],
};

router.get("/admin/analytics", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  try {
    // Core tables must exist; ancillary tables (tickets, pricing) degrade gracefully
    // so a partial/out-of-date schema never blocks the Control Center from loading.
    const [users, scans] = await Promise.all([
      db.select().from(usersTable),
      db.select().from(scanJobsTable),
    ]);
    const tickets = await db.select().from(supportTicketsTable).catch(() => [] as (typeof supportTicketsTable.$inferSelect)[]);
    const plans = await db.select().from(pricingPlansTable).catch(() => [] as (typeof pricingPlansTable.$inferSelect)[]);

    const completedScans = scans.filter((s) => s.status === "completed").length;
    const pendingScans = scans.filter((s) => s.status !== "completed" && s.status !== "failed").length;
    const ticketsClosed = tickets.filter((t) => t.status === "closed" || t.status === "resolved").length;

    // Monthly recurring revenue from the plan each active user is subscribed to.
    const priceByKey = new Map<string, number>();
    const nameByKey = new Map<string, string>();
    for (const p of plans) {
      priceByKey.set(p.id.toLowerCase(), p.price);
      priceByKey.set(p.name.toLowerCase(), p.price);
      nameByKey.set(p.id.toLowerCase(), p.name);
      nameByKey.set(p.name.toLowerCase(), p.name);
    }

    let revenue = 0;
    const distCounts = new Map<string, number>();
    for (const u of users) {
      const key = (u.currentPlan ?? "").toLowerCase();
      if (!key) continue;
      revenue += priceByKey.get(key) ?? 0;
      const label = nameByKey.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1);
      distCounts.set(label, (distCounts.get(label) ?? 0) + 1);
    }
    const planDistribution = [...distCounts.entries()].map(([label, value]) => ({ label, value }));

    res.json({
      totalUsers: users.length,
      activeUsers: users.filter((u) => !u.isBanned && !u.isSuspended).length,
      totalScans: scans.length,
      completedScans,
      pendingScans,
      revenue,
      ticketsOpen: tickets.length - ticketsClosed,
      ticketsClosed,
      userGrowth: cumulativeDaily(users.map((u) => u.createdAt), 14),
      scanActivity: dailyCounts(scans.map((s) => s.createdAt), 14),
      revenueGrowth: monthlyBuckets(scans.map((s) => ({ date: s.createdAt, value: s.creditsSpent ?? 0 }))),
      planDistribution,
    });
  } catch (err) {
    req.log?.error?.({ err }, "admin analytics query failed");
    res.json(EMPTY_ANALYTICS);
  }
});

// ── Single user detail + actions ──────────────────────────────────

router.get("/admin/users/:userId", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = GetAdminUserParams.safeParse({
    userId: parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const scans = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.userId, user.id))
    .orderBy(desc(scanJobsTable.createdAt));
  const reports = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.userId, user.id))
    .orderBy(desc(reportsTable.createdAt));

  const scanById = new Map(scans.map((s) => [s.id, s]));

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    credits: user.credits,
    role: user.role ?? (user.isAdmin ? "admin" : "user"),
    plan: user.currentPlan,
    title: user.title,
    company: user.company,
    isVerified: user.isVerified,
    isBanned: user.isBanned,
    isSuspended: user.isSuspended,
    scansUsed: user.scansUsed,
    scansCompleted: user.scansCompleted,
    createdAt: user.createdAt.toISOString(),
    scans: scans.map((s) => scanToAdminDto(s, user)),
    reports: reports.map((r) => reportToDto(r, scanById.get(r.scanId))),
  });
});

router.post("/admin/users/:userId/plan", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = UpdateUserPlanParams.safeParse({
    userId: parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const body = UpdateUserPlanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      currentPlan: body.data.plan,
      ...(body.data.credits != null ? { credits: user.credits + body.data.credits } : {}),
    })
    .where(eq(usersTable.id, user.id))
    .returning();

  await db.insert(notificationsTable).values({
    userId: user.id,
    type: "plan",
    title: "Your plan was updated",
    body: `Your plan is now ${body.data.plan}.`,
    link: "/profile#billing",
  });

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "user.plan.update",
    targetType: "user",
    targetId: user.id,
    details: { plan: body.data.plan, credits: body.data.credits ?? 0 },
  });

  const userScans = await db.select().from(scanJobsTable).where(eq(scanJobsTable.userId, updated.id));
  res.json(adminUserDto(updated, userScans.length));
});

router.post("/admin/users/:userId/action", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = AdminUserActionParams.safeParse({
    userId: parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const body = AdminUserActionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.role === "super_admin") {
    res.status(403).json({ error: "Cannot modify a super admin account" });
    return;
  }

  const action = body.data.action;
  const patch: Partial<typeof usersTable.$inferInsert> =
    action === "ban"
      ? { isBanned: true }
      : action === "unban"
        ? { isBanned: false }
        : action === "suspend"
          ? { isSuspended: true }
          : action === "unsuspend"
            ? { isSuspended: false }
            : { isVerified: true };

  const [updated] = await db.update(usersTable).set(patch).where(eq(usersTable.id, user.id)).returning();

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: `user.${action}`,
    targetType: "user",
    targetId: user.id,
  });

  const userScans = await db.select().from(scanJobsTable).where(eq(scanJobsTable.userId, updated.id));
  res.json(adminUserDto(updated, userScans.length));
});

router.post("/admin/users/:userId/reset-password", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = AdminResetUserPasswordParams.safeParse({
    userId: parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const code = String(randomInt(100000, 1000000));
  await db
    .update(usersTable)
    .set({ resetCode: code, resetExpiry: new Date(Date.now() + 15 * 60 * 1000) })
    .where(eq(usersTable.id, user.id));

  void sendEmail(user.email, "Reset your Nexus Security password", buildPasswordResetCodeEmailHtml(code, user.name));

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "user.password.reset_sent",
    targetType: "user",
    targetId: user.id,
  });

  res.json({ message: `Password reset code sent to ${user.email}` });
});

// ── Admin management (super admin only) ───────────────────────────

router.get("/admin/admins", async (req, res): Promise<void> => {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const admins = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.role, "admin"), eq(usersTable.role, "super_admin")))
    .orderBy(asc(usersTable.createdAt));

  res.json(
    admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role ?? "admin",
      createdAt: a.createdAt.toISOString(),
    })),
  );
});

router.post("/admin/admins", async (req, res): Promise<void> => {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const body = AddAdminBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const email = body.data.email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(404).json({ error: "No account found with that email" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin: true, role: body.data.role })
    .where(eq(usersTable.id, user.id))
    .returning();

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "admin.add",
    targetType: "user",
    targetId: user.id,
    details: { role: body.data.role },
  });

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role ?? "admin",
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/admin/admins/:userId", async (req, res): Promise<void> => {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const params = RemoveAdminParams.safeParse({
    userId: parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.role === "super_admin") {
    res.status(403).json({ error: "Cannot revoke a super admin" });
    return;
  }

  await db
    .update(usersTable)
    .set({ isAdmin: false, role: "user" })
    .where(eq(usersTable.id, user.id));

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "admin.remove",
    targetType: "user",
    targetId: user.id,
  });

  res.json({ message: `Admin access revoked for ${user.email}` });
});

// ── Support tickets ───────────────────────────────────────────────

router.get("/admin/tickets", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const query = GetAdminTicketsQueryParams.safeParse(req.query);
  const statusFilter = query.success ? query.data.status : undefined;

  let tickets = await db.select().from(supportTicketsTable).orderBy(desc(supportTicketsTable.updatedAt));
  if (statusFilter) tickets = tickets.filter((t) => t.status === statusFilter);

  const summaries = await Promise.all(
    tickets.map(async (t) => {
      const msgs = await db
        .select()
        .from(ticketMessagesTable)
        .where(eq(ticketMessagesTable.ticketId, t.id))
        .orderBy(desc(ticketMessagesTable.createdAt));
      return {
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        preview: msgs[0]?.body ?? null,
        userName: t.name,
        userEmail: t.email,
        messageCount: msgs.length,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    }),
  );

  res.json(summaries);
});

router.get("/admin/tickets/:ticketId", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = GetAdminTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const [ticket] = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, params.data.ticketId));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const messages = await db
    .select()
    .from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, ticket.id))
    .orderBy(asc(ticketMessagesTable.createdAt));

  res.json({ ticket: ticketToDto(ticket), messages: messages.map(messageToDto) });
});

router.patch("/admin/tickets/:ticketId", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = UpdateTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const body = UpdateTicketBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const patch: Partial<typeof supportTicketsTable.$inferInsert> = {};
  if (body.data.status) patch.status = body.data.status;
  if (body.data.priority) patch.priority = body.data.priority;

  const [updated] = await db
    .update(supportTicketsTable)
    .set(patch)
    .where(eq(supportTicketsTable.id, params.data.ticketId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (updated.userId) {
    await db.insert(notificationsTable).values({
      userId: updated.userId,
      type: "ticket",
      title: "Support ticket updated",
      body: `Your ticket "${updated.subject}" is now ${updated.status}.`,
      link: "/profile#tickets",
    });
  }

  res.json(ticketToDto(updated));
});

router.post("/admin/tickets/:ticketId/messages", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = PostAdminTicketMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const body = PostAdminTicketMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [ticket] = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, params.data.ticketId));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const [message] = await db
    .insert(ticketMessagesTable)
    .values({
      id: randomUUID(),
      ticketId: ticket.id,
      senderUserId: session.user.id,
      senderRole: "admin",
      senderName: session.user.name,
      body: body.data.body,
    })
    .returning();

  await db
    .update(supportTicketsTable)
    .set({ status: ticket.status === "open" ? "in_progress" : ticket.status })
    .where(eq(supportTicketsTable.id, ticket.id));

  if (ticket.userId) {
    await db.insert(notificationsTable).values({
      userId: ticket.userId,
      type: "ticket",
      title: "New reply on your support ticket",
      body: `Support replied to "${ticket.subject}".`,
      link: "/profile#tickets",
    });
  }

  res.status(201).json(messageToDto(message));
});

// ── Scan management ───────────────────────────────────────────────

router.get("/admin/scans", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const scans = await db.select().from(scanJobsTable).orderBy(desc(scanJobsTable.createdAt));
  const users = await db.select().from(usersTable);
  const userById = new Map(users.map((u) => [u.id, u]));

  res.json(scans.map((s) => scanToAdminDto(s, s.userId ? userById.get(s.userId) : null)));
});

router.post("/admin/scans/:scanId/status", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = UpdateScanStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan id" });
    return;
  }

  const body = UpdateScanStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(scanJobsTable)
    .set({ status: body.data.status })
    .where(eq(scanJobsTable.id, params.data.scanId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "scan.status.update",
    targetType: "scan",
    targetId: updated.id,
    details: { status: body.data.status },
  });

  res.json(scanToAdminDto(updated));
});

router.post("/admin/scans/:scanId/reassign", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = ReassignScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan id" });
    return;
  }

  const body = ReassignScanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.userId));
  if (!target) {
    res.status(404).json({ error: "Target user not found" });
    return;
  }

  const [updated] = await db
    .update(scanJobsTable)
    .set({ userId: body.data.userId })
    .where(eq(scanJobsTable.id, params.data.scanId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "scan.reassign",
    targetType: "scan",
    targetId: updated.id,
    details: { userId: body.data.userId },
  });

  res.json(scanToAdminDto(updated, target));
});

router.post("/admin/scans/:scanId/report", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = UploadScanReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan id" });
    return;
  }

  const body = UploadScanReportBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [scan] = await db.select().from(scanJobsTable).where(eq(scanJobsTable.id, params.data.scanId));
  if (!scan) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  await db
    .update(scanJobsTable)
    .set({ reportUrl: body.data.pdfUrl, status: "completed" })
    .where(eq(scanJobsTable.id, scan.id));

  const [existing] = await db.select().from(reportsTable).where(eq(reportsTable.scanId, scan.id));
  let report;
  if (existing) {
    [report] = await db
      .update(reportsTable)
      .set({ pdfUrl: body.data.pdfUrl })
      .where(eq(reportsTable.id, existing.id))
      .returning();
  } else {
    [report] = await db
      .insert(reportsTable)
      .values({ id: randomUUID(), scanId: scan.id, userId: scan.userId, pdfUrl: body.data.pdfUrl })
      .returning();
  }

  if (scan.userId) {
    await db.insert(notificationsTable).values({
      userId: scan.userId,
      type: "report",
      title: "Your scan report is ready",
      body: `The report for ${scan.websiteUrl} is now available.`,
      link: "/profile#scans",
    });
  }

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "scan.report.upload",
    targetType: "scan",
    targetId: scan.id,
  });

  res.json(reportToDto(report, scan));
});

router.delete("/admin/scans/:scanId", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const params = DeleteScanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid scan id" });
    return;
  }

  await db.delete(reportsTable).where(eq(reportsTable.scanId, params.data.scanId));
  await db.delete(scanJobsTable).where(eq(scanJobsTable.id, params.data.scanId));

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "scan.delete",
    targetType: "scan",
    targetId: params.data.scanId,
  });

  res.json({ message: "Scan deleted" });
});

router.get("/admin/reports", async (req, res): Promise<void> => {
  const session = await requireVerifiedAdmin(req, res);
  if (!session) return;

  const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
  const scans = await db.select().from(scanJobsTable);
  const scanById = new Map(scans.map((s) => [s.id, s]));

  res.json(reports.map((r) => reportToDto(r, scanById.get(r.scanId))));
});

// ── Pricing management (super admin only) ─────────────────────────

router.get("/admin/pricing-plans", async (req, res): Promise<void> => {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const plans = await db.select().from(pricingPlansTable).orderBy(asc(pricingPlansTable.sortOrder));
  res.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      headline: p.headline,
      description: p.description,
      features: p.features ?? [],
      popular: p.popular,
      sortOrder: p.sortOrder,
    })),
  );
});

router.put("/admin/pricing-plans/:planId", async (req, res): Promise<void> => {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const params = UpdatePricingPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid plan id" });
    return;
  }

  const body = UpdatePricingPlanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(pricingPlansTable)
    .set({
      name: body.data.name,
      price: body.data.price,
      headline: body.data.headline ?? null,
      description: body.data.description ?? null,
      features: body.data.features,
      popular: body.data.popular ?? false,
    })
    .where(eq(pricingPlansTable.id, params.data.planId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  await recordAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: "pricing.update",
    targetType: "pricing_plan",
    targetId: updated.id,
  });

  res.json({
    id: updated.id,
    name: updated.name,
    price: updated.price,
    headline: updated.headline,
    description: updated.description,
    features: updated.features ?? [],
    popular: updated.popular,
    sortOrder: updated.sortOrder,
  });
});

// ── Audit logs (super admin only) ─────────────────────────────────

router.get("/admin/audit-logs", async (req, res): Promise<void> => {
  const session = await requireSuperAdmin(req, res);
  if (!session) return;

  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(500);

  res.json(
    logs.map((l) => ({
      id: l.id,
      actorEmail: l.actorEmail,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      details: l.details ? JSON.stringify(l.details) : null,
      createdAt: l.createdAt.toISOString(),
    })),
  );
});

export default router;
