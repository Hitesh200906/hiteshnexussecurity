import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { supportTicketsTable } from "./support-tickets";
import { usersTable } from "./users";

// senderRole: user | admin
export const ticketMessagesTable = pgTable("ticket_messages", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => supportTicketsTable.id),
  senderUserId: integer("sender_user_id").references(() => usersTable.id),
  senderRole: text("sender_role").notNull().default("user"),
  senderName: text("sender_name"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessagesTable).omit({ createdAt: true });
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessagesTable.$inferSelect;
