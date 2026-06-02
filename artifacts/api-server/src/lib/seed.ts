import { db, usersTable, pricingPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./password";
import { logger } from "./logger";

const SUPER_ADMIN_EMAIL = "nexussecurity777@gmail.com";

// Seed (or repair) the single super-admin account so the documented credentials
// always work. The password can be overridden with SUPER_ADMIN_PASSWORD.
export async function seedSuperAdmin(): Promise<void> {
  try {
    const password = process.env.SUPER_ADMIN_PASSWORD || "Hitesh@2009#";
    const passwordHash = await hashPassword(password);

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, SUPER_ADMIN_EMAIL));

    if (existing) {
      await db
        .update(usersTable)
        .set({
          role: "super_admin",
          isAdmin: true,
          isVerified: true,
          isBanned: false,
          isSuspended: false,
          passwordHash,
        })
        .where(eq(usersTable.id, existing.id));
    } else {
      await db.insert(usersTable).values({
        name: "Nexus Super Admin",
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        credits: 999,
        isAdmin: true,
        role: "super_admin",
        isVerified: true,
      });
    }
    logger.info("Super admin account ensured");
  } catch (err) {
    logger.error({ err }, "Failed to seed super admin");
  }
}

const DEFAULT_PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 1,
    headline: "Essential vulnerability scanning",
    description: "A focused scan for small sites and personal projects.",
    features: [
      "Single domain scan",
      "OWASP Top 10 checks",
      "Email-delivered PDF report",
      "Severity summary",
    ],
    popular: false,
    sortOrder: 1,
  },
  {
    id: "advanced",
    name: "Advanced",
    price: 2,
    headline: "Deeper coverage for growing teams",
    description: "Comprehensive scanning with prioritised remediation guidance.",
    features: [
      "Everything in Basic",
      "Subdomain enumeration",
      "Authenticated scanning",
      "Remediation playbook",
      "Priority queue",
    ],
    popular: true,
    sortOrder: 2,
  },
  {
    id: "protection",
    name: "Protection+",
    price: 3,
    headline: "Continuous protection for the enterprise",
    description: "Full-surface monitoring with continuous re-scans and alerts.",
    features: [
      "Everything in Advanced",
      "Continuous monitoring",
      "Real-time threat alerts",
      "Compliance reporting",
      "Dedicated support",
    ],
    popular: false,
    sortOrder: 3,
  },
];

// Seed default pricing plans only when the table is empty so admin edits persist.
export async function seedPricingPlans(): Promise<void> {
  try {
    const existing = await db.select().from(pricingPlansTable);
    if (existing.length > 0) return;
    await db.insert(pricingPlansTable).values(DEFAULT_PLANS);
    logger.info("Default pricing plans seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed pricing plans");
  }
}

export async function runSeeds(): Promise<void> {
  await seedSuperAdmin();
  await seedPricingPlans();
}
