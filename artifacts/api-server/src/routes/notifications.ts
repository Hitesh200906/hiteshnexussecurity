import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getSessionUser } from "../lib/session";
import { MarkNotificationReadParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, session.user.id))
    .orderBy(desc(notificationsTable.createdAt));

  res.json(
    rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
  );
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, session.user.id));

  res.json({ message: "All notifications marked as read" });
});

router.post("/notifications/:notificationId/read", async (req, res): Promise<void> => {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const params = MarkNotificationReadParams.safeParse({
    notificationId: parseInt(
      Array.isArray(req.params.notificationId) ? req.params.notificationId[0] : req.params.notificationId,
      10,
    ),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.id, params.data.notificationId),
        eq(notificationsTable.userId, session.user.id),
      ),
    );

  res.json({ message: "Notification marked as read" });
});

export default router;
