import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "../lib/session";
import { UpdateProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.put("/profile", async (req, res): Promise<void> => {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      name,
      title: parsed.data.title ?? null,
      company: parsed.data.company ?? null,
    })
    .where(eq(usersTable.id, session.user.id))
    .returning();

  const role = updated.role ?? (updated.isAdmin ? "admin" : "user");
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    credits: updated.credits,
    isAdmin: updated.isAdmin || role === "admin" || role === "super_admin",
    role,
    isSuperAdmin: role === "super_admin",
    isBanned: updated.isBanned,
    isSuspended: updated.isSuspended,
    currentPlan: updated.currentPlan,
    title: updated.title,
    company: updated.company,
    scansUsed: updated.scansUsed,
    scansCompleted: updated.scansCompleted,
    createdAt: updated.createdAt.toISOString(),
  });
});

export default router;
