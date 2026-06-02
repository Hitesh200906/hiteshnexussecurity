import { Router, type IRouter } from "express";
import {
  db,
  supportTicketsTable,
  ticketMessagesTable,
  notificationsTable,
  type SupportTicket,
  type TicketMessage,
} from "@workspace/db";
import { eq, and, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getSessionUser } from "../lib/session";
import {
  CreateSupportTicketBody,
  GetMyTicketParams,
  PostMyTicketMessageParams,
  PostMyTicketMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

export function ticketToDto(t: SupportTicket) {
  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    email: t.email,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function messageToDto(m: TicketMessage) {
  return {
    id: m.id,
    ticketId: m.ticketId,
    senderRole: m.senderRole,
    senderName: m.senderName,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

// Public contact form → opens a support ticket (attached to the user if logged in).
router.post("/support/tickets", async (req, res): Promise<void> => {
  const parsed = CreateSupportTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const session = await getSessionUser(req);
  const { name, email, subject, message, websiteUrl } = parsed.data;

  const ticketId = randomUUID();
  const [ticket] = await db
    .insert(supportTicketsTable)
    .values({
      id: ticketId,
      userId: session?.user.id ?? null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      status: "open",
      priority: "normal",
    })
    .returning();

  const body = websiteUrl ? `Website: ${websiteUrl}\n\n${message}` : message;
  await db.insert(ticketMessagesTable).values({
    id: randomUUID(),
    ticketId,
    senderUserId: session?.user.id ?? null,
    senderRole: "user",
    senderName: name.trim(),
    body,
  });

  if (session?.user.id) {
    await db.insert(notificationsTable).values({
      userId: session.user.id,
      type: "ticket",
      title: "Support ticket opened",
      body: `Your ticket "${subject.trim()}" has been received. We'll reply here.`,
      link: "/profile#tickets",
    });
  }

  res.status(201).json(ticketToDto(ticket));
});

// List the current user's tickets.
router.get("/my/tickets", async (req, res): Promise<void> => {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, session.user.id))
    .orderBy(desc(supportTicketsTable.updatedAt));

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

// Get one of the current user's tickets with its full message thread.
router.get("/my/tickets/:ticketId", async (req, res): Promise<void> => {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const params = GetMyTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const [ticket] = await db
    .select()
    .from(supportTicketsTable)
    .where(
      and(
        eq(supportTicketsTable.id, params.data.ticketId),
        eq(supportTicketsTable.userId, session.user.id),
      ),
    );

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

// Add a message to one of the current user's tickets.
router.post("/my/tickets/:ticketId/messages", async (req, res): Promise<void> => {
  const session = await getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const params = PostMyTicketMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const body = PostMyTicketMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [ticket] = await db
    .select()
    .from(supportTicketsTable)
    .where(
      and(
        eq(supportTicketsTable.id, params.data.ticketId),
        eq(supportTicketsTable.userId, session.user.id),
      ),
    );

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
      senderRole: "user",
      senderName: session.user.name,
      body: body.data.body,
    })
    .returning();

  await db
    .update(supportTicketsTable)
    .set({ status: ticket.status === "closed" ? "open" : ticket.status })
    .where(eq(supportTicketsTable.id, ticket.id));

  res.status(201).json(messageToDto(message));
});

export default router;
