import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  credits: integer("credits").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  // Email verification. Defaults to true so pre-existing accounts keep working
  // when this column is added; new sign-ups are explicitly inserted as false
  // and flipped to true once the emailed code is confirmed.
  isVerified: boolean("is_verified").notNull().default(true),
  verificationCode: text("verification_code"),
  verificationExpiry: timestamp("verification_expiry", { withTimezone: true }),
  // Password reset via emailed 6-digit code.
  resetCode: text("reset_code"),
  resetExpiry: timestamp("reset_expiry", { withTimezone: true }),
  passkeyCredentialId: text("passkey_credential_id"),
  // Scan usage stats surfaced on the dashboard/profile.
  scansUsed: integer("scans_used").notNull().default(0),
  scansCompleted: integer("scans_completed").notNull().default(0),
  currentPlan: text("current_plan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
