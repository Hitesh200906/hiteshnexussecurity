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

const router: IRouter = Router();

const ADMIN_EMAIL = "nexussecurity777@gmail.com";
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "nexus admin";

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult || !sessionResult.user.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/admin/check", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  const isAdmin = sessionResult?.user?.isAdmin ?? false;
  const adminPanelVerified = isAdmin ? await isAdminVerified(req) : false;
  res.json({ isAdmin, adminPanelVerified });
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
