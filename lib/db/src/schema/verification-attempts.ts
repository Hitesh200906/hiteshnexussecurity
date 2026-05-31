import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scanJobsTable } from "./scan-jobs";
import { usersTable } from "./users";

export const verificationAttemptsTable = pgTable("verification_attempts", {
  id: text("id").primaryKey(),
  scanId: text("scan_id").references(() => scanJobsTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  // "email" | "manual"
  method: text("method").notNull(),
  code: text("code"),
  // "pending" | "success" | "failed"
  status: text("status").notNull().default("pending"),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVerificationAttemptSchema = createInsertSchema(verificationAttemptsTable).omit({ createdAt: true });
export type InsertVerificationAttempt = z.infer<typeof insertVerificationAttemptSchema>;
export type VerificationAttempt = typeof verificationAttemptsTable.$inferSelect;
