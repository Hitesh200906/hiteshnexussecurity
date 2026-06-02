import { db, usersTable, pricingPlansTable } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import { hashPassword } from "./password";
import { logger } from "./logger";

// The single designated super-admin account. Any account with this email is
// always promoted to super_admin (at boot and at login).
export const SUPER_ADMIN_EMAIL = "hitesh.tanwar8318@gmail.com";

// Legacy super-admin email that should no longer hold super-admin status.
const LEGACY_SUPER_ADMIN_EMAIL = "nexussecurity777@gmail.com";

// Seed (or repair) the designated super-admin account. If the account already
// exists its password is left untouched (the owner keeps their own password);
// only a freshly created account gets the default/SUPER_ADMIN_PASSWORD value.
export async function seedSuperAdmin(): Promise<void> {
  try {
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
        })
        .where(eq(usersTable.id, existing.id));
    } else {
      const password = process.env.SUPER_ADMIN_PASSWORD || "Hitesh@2009#";
      const passwordHash = await hashPassword(password);
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

    // Demote the legacy super admin so it is no longer a super admin (kept as a
    // regular admin). Guard on role + email so nothing else is affected.
    await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(
        and(
          eq(usersTable.email, LEGACY_SUPER_ADMIN_EMAIL),
          eq(usersTable.role, "super_admin"),
        ),
      );

    // Safety net: ensure no other account silently retains super_admin.
    await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(
        and(
          eq(usersTable.role, "super_admin"),
          ne(usersTable.email, SUPER_ADMIN_EMAIL),
        ),
      );

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
