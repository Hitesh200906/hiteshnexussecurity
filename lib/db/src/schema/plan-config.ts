import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planConfigTable = pgTable("plan_config", {
  key: text("key").primaryKey(),
  value: integer("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanConfigSchema = createInsertSchema(planConfigTable).omit({ updatedAt: true });
export type InsertPlanConfig = z.infer<typeof insertPlanConfigSchema>;
export type PlanConfig = typeof planConfigTable.$inferSelect;
