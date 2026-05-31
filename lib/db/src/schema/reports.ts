import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { scanJobsTable } from "./scan-jobs";
import { usersTable } from "./users";

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey(),
  scanId: text("scan_id")
    .notNull()
    .references(() => scanJobsTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  severitySummary: jsonb("severity_summary"),
  vulnerabilities: jsonb("vulnerabilities"),
  recommendations: jsonb("recommendations"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
