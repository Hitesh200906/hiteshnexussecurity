import { Router, type IRouter } from "express";
import { db, pricingPlansTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/pricing-plans", async (_req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(pricingPlansTable)
    .orderBy(asc(pricingPlansTable.sortOrder));

  res.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      headline: p.headline,
      description: p.description,
      features: p.features ?? [],
      popular: p.popular,
      sortOrder: p.sortOrder,
    })),
  );
});

export default router;
