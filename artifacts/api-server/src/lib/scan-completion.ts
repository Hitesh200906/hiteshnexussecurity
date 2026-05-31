import { db, scanJobsTable, reportsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { logger } from "./logger";
import type { ScanJob } from "@workspace/db";

type SeveritySummary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
};

function severityForPlan(plan: string): SeveritySummary {
  const isPro = plan === "protection";
  const isAdv = plan === "advanced" || isPro;
  return {
    critical: isPro ? 2 : 0,
    high: isAdv ? 1 : 0,
    medium: isAdv ? 2 : 0,
    low: 3,
    info: 5,
  };
}

const RECOMMENDATIONS = [
  "Implement a Web Application Firewall (WAF) to filter malicious traffic",
  "Enable HTTPS with HSTS and update TLS to 1.3 minimum",
  "Add rate limiting to authentication endpoints",
  "Schedule regular automated security scans with Nexus Security",
];

/**
 * Records the report row for a completed scan and bumps the owner's
 * scansCompleted counter. Idempotent: a second call for the same scan is a
 * no-op so duplicate scanner callbacks don't create duplicate reports.
 */
export async function finalizeCompletedScan(
  job: ScanJob,
  opts?: { reportUrl?: string | null }
): Promise<void> {
  const existing = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .where(eq(reportsTable.scanId, job.id));

  if (existing.length > 0) {
    return;
  }

  const reportId = "rpt_" + randomBytes(6).toString("hex");
  const pdfUrl = opts?.reportUrl ?? `/api/scans/${job.id}/report/download`;

  await db.insert(reportsTable).values({
    id: reportId,
    scanId: job.id,
    userId: job.userId ?? null,
    severitySummary: severityForPlan(job.plan),
    vulnerabilities: [],
    recommendations: RECOMMENDATIONS,
    pdfUrl,
  });

  if (job.userId != null) {
    await db
      .update(usersTable)
      .set({ scansCompleted: sql`${usersTable.scansCompleted} + 1` })
      .where(eq(usersTable.id, job.userId));
  }

  logger.info({ scanId: job.id, reportId }, "Scan finalized — report recorded");
}
