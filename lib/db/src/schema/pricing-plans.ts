import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pricingPlansTable = pgTable("pricing_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0),
  headline: text("headline"),
  description: text("description"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  popular: boolean("popular").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPricingPlanSchema = createInsertSchema(pricingPlansTable).omit({ updatedAt: true });
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type PricingPlan = typeof pricingPlansTable.$inferSelect;
