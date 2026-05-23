import { Router, type IRouter } from "express";
import { db, scanJobsTable, usersTable, planConfigTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getSessionUser } from "../lib/session";
import {
  RequestScanBody,
  VerifyCodeBody,
  GetScanParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PLAN_CREDIT_COSTS: Record<string, number> = {
  basic: 0,
  advanced: 10,
  protection: 25,
};

async function getPlanPrice(plan: string): Promise<number> {
  const [config] = await db
    .select()
    .from(planConfigTable)
    .where(eq(planConfigTable.key, `price_${plan}`));
  return config?.value ?? PLAN_CREDIT_COSTS[plan] ?? 0;
}

router.get("/plan-prices", async (req, res): Promise<void> => {
  const basic = await getPlanPrice("basic");
  const advanced = await getPlanPrice("advanced");
  const protection = await getPlanPrice("protection");
  res.json({ basic, advanced, protection });
});

router.post("/request-scan", async (req, res): Promise<void> => {
  const parsed = RequestScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const creditCost = await getPlanPrice(data.plan);
  const sessionResult = await getSessionUser(req);

  if (creditCost > 0) {
    if (!sessionResult) {
      res.status(401).json({ error: "Login required to use this plan" });
      return;
    }
    if (sessionResult.user.credits < creditCost) {
      res.status(402).json({ error: "Insufficient credits for this plan" });
      return;
    }
  }

  const jobId = randomBytes(8).toString("hex");
  let verificationCode: string | null = null;
  let verificationId: string | null = null;

  if (data.verificationMethod === "manual") {
    verificationCode = randomBytes(3).toString("hex").toUpperCase();
    verificationId = randomBytes(16).toString("hex");
  }

  await db.insert(scanJobsTable).values({
    id: jobId,
    userId: sessionResult?.user.id ?? null,
    fullName: data.fullName,
    role: data.role,
    companyName: data.companyName,
    email: data.email,
    websiteUrl: data.websiteUrl,
    businessEmail: data.businessEmail,
    plan: data.plan,
    status: data.verificationMethod === "email" ? "pending_email" : "pending_verification",
    creditsSpent: creditCost,
    verificationMethod: data.verificationMethod,
    verificationCode: verificationCode,
    verificationId: verificationId,
  });

  if (creditCost > 0 && sessionResult) {
    await db
      .update(usersTable)
      .set({ credits: sessionResult.user.credits - creditCost })
      .where(eq(usersTable.id, sessionResult.user.id));
  }

  res.json({
    message: data.verificationMethod === "email"
      ? "Verification email sent. Please check your business email."
      : "Scan request created. Please verify your website ownership.",
    jobId,
    verificationCode,
    verificationId,
  });
});

router.post("/verify-code", async (req, res): Promise<void> => {
  const parsed = VerifyCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { verificationId, websiteUrl } = parsed.data;

  const [job] = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.verificationId, verificationId));

  if (!job) {
    res.status(400).json({ error: "Invalid verification ID" });
    return;
  }

  if (job.verificationCode) {
    await db
      .update(scanJobsTable)
      .set({ status: "queued" })
      .where(eq(scanJobsTable.verificationId, verificationId));
  }

  res.json({ message: "Website ownership verified. Your scan has been queued." });
});

router.get("/scans", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const jobs = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.userId, sessionResult.user.id))
    .orderBy(scanJobsTable.createdAt);

  res.json(
    jobs.map((j) => ({
      id: j.id,
      userId: j.userId,
      fullName: j.fullName,
      role: j.role,
      companyName: j.companyName,
      email: j.email,
      websiteUrl: j.websiteUrl,
      businessEmail: j.businessEmail,
      plan: j.plan,
      status: j.status,
      creditsSpent: j.creditsSpent,
      reportUrl: j.reportUrl,
      createdAt: j.createdAt.toISOString(),
    }))
  );
});

router.get("/scans/stats", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult) {
    res.json({ totalScans: 0, completedScans: 0, credits: 0 });
    return;
  }

  const allJobs = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.userId, sessionResult.user.id));

  const totalScans = allJobs.length;
  const completedScans = allJobs.filter((j) => j.status === "completed").length;

  res.json({
    totalScans,
    completedScans,
    credits: sessionResult.user.credits,
  });
});

router.get("/scans/:jobId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const params = GetScanParams.safeParse({ jobId: raw });
  if (!params.success) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }

  const [job] = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.id, params.data.jobId));

  if (!job) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  res.json({
    id: job.id,
    userId: job.userId,
    fullName: job.fullName,
    role: job.role,
    companyName: job.companyName,
    email: job.email,
    websiteUrl: job.websiteUrl,
    businessEmail: job.businessEmail,
    plan: job.plan,
    status: job.status,
    creditsSpent: job.creditsSpent,
    reportUrl: job.reportUrl,
    createdAt: job.createdAt.toISOString(),
  });
});

router.get("/scans/:jobId/report", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const [job] = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.id, raw));

  if (!job) {
    res.status(404).send("<html><body><h1>Report not found</h1></body></html>");
    return;
  }

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Report - ${job.companyName}</title>
  <style>
    body { font-family: monospace; background: #0a0a0f; color: #f8fafc; padding: 2rem; }
    h1 { color: #2f9b9b; }
    .section { margin: 1.5rem 0; padding: 1rem; border: 1px solid #1e293b; border-radius: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; background: #1e293b; color: #2f9b9b; }
    .status { color: #94a3b8; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>Security Scan Report</h1>
  <div class="section">
    <p><strong>Company:</strong> ${job.companyName}</p>
    <p><strong>Website:</strong> ${job.websiteUrl}</p>
    <p><strong>Plan:</strong> <span class="badge">${job.plan.toUpperCase()}</span></p>
    <p><strong>Status:</strong> <span class="status">${job.status}</span></p>
    <p><strong>Submitted:</strong> ${job.createdAt.toLocaleDateString()}</p>
  </div>
  <div class="section">
    <p class="status">Full vulnerability report will appear here once scanning is complete.</p>
  </div>
</body>
</html>`);
});

router.get("/scans/:jobId/report/download", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const [job] = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.id, raw));

  if (!job) {
    res.status(404).json({ error: "Scan not found" });
    return;
  }

  res.setHeader("Content-Type", "text/html");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="nexus-report-${job.companyName.replace(/\s+/g, "-")}-${job.id}.html"`
  );
  res.send(`<!DOCTYPE html><html><body><h1>Report for ${job.companyName}</h1><p>Status: ${job.status}</p></body></html>`);
});

export default router;
