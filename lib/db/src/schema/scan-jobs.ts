import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scanJobsTable = pgTable("scan_jobs", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  websiteUrl: text("website_url").notNull(),
  businessEmail: text("business_email").notNull(),
  plan: text("plan").notNull(),
  status: text("status").notNull().default("queued"),
  creditsSpent: integer("credits_spent").notNull().default(0),
  reportUrl: text("report_url"),
  reportPath: text("report_path"),
  externalScanId: text("external_scan_id"),
  verificationMethod: text("verification_method"),
  verificationCode: text("verification_code"),
  verificationId: text("verification_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScanJobSchema = createInsertSchema(scanJobsTable).omit({ createdAt: true, updatedAt: true });
export type InsertScanJob = z.infer<typeof insertScanJobSchema>;
export type ScanJob = typeof scanJobsTable.$inferSelect;
