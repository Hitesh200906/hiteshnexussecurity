import { Router, type IRouter } from "express";
import { db, scanJobsTable, usersTable, planConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { getSessionUser } from "../lib/session";
import { sendEmail, buildScanVerificationEmailHtml } from "../lib/email";
import { submitToScanner } from "../lib/scanner";
import { logger } from "../lib/logger";
import {
  RequestScanBody,
  VerifyCodeBody,
  GetScanParams,
  ScanCallbackBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
const REPORTS_DIR = join(process.cwd(), "reports");

const PLAN_CREDIT_DEFAULTS: Record<string, number> = {
  basic: 0,
  advanced: 10,
  protection: 25,
};

async function getPlanPrice(plan: string): Promise<number> {
  const [config] = await db
    .select()
    .from(planConfigTable)
    .where(eq(planConfigTable.key, `price_${plan}`));
  return config?.value ?? PLAN_CREDIT_DEFAULTS[plan] ?? 0;
}

async function ensureReportsDir(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });
}

/**
 * Fetch website HTML and check if the verification code appears anywhere in it.
 * Throws a descriptive error if the site is unreachable or the code is not found.
 */
async function checkCodeOnWebsite(url: string, code: string): Promise<{ found: boolean; error?: string }> {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  let html = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 NexusSecurity-Ownership-Verifier/2.0",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return { found: false, error: `Website returned HTTP ${resp.status}. Make sure the site is publicly accessible.` };
    }

    html = await resp.text();
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    logger.warn({ err, url: targetUrl, code }, "Website scrape failed");
    return {
      found: false,
      error: isTimeout
        ? `Request timed out. The website took too long to respond. Try again or check the URL.`
        : `Could not reach ${targetUrl}. Make sure the URL is correct and the site is publicly accessible.`,
    };
  }

  const found = html.includes(code);
  if (!found) {
    logger.info({ url: targetUrl, code }, "Verification code not found on website");
  } else {
    logger.info({ url: targetUrl, code }, "Verification code found on website");
  }
  return { found };
}

router.get("/plan-prices", async (_req, res): Promise<void> => {
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
      res.status(402).json({ error: `Insufficient credits. This plan requires ${creditCost} credits.` });
      return;
    }
  }

  const jobId = randomBytes(8).toString("hex");
  let verificationCode: string | null = null;
  let verificationId: string | null = null;

  if (data.verificationMethod === "manual") {
    // Generate clean 6-char alphanumeric code (no ambiguous chars: O, 0, I, 1)
    const safeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    verificationCode = Array.from({ length: 6 }, () =>
      safeChars[Math.floor(Math.random() * safeChars.length)]
    ).join("");
    verificationId = randomBytes(16).toString("hex");
  }

  // Generate a stable external scan ID (MD5-style hash)
  const externalScanId = createHash("md5")
    .update(`${jobId}-${Date.now()}`)
    .digest("hex");

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
    externalScanId,
    verificationMethod: data.verificationMethod,
    verificationCode,
    verificationId,
  });

  if (creditCost > 0 && sessionResult) {
    await db
      .update(usersTable)
      .set({ credits: sessionResult.user.credits - creditCost })
      .where(eq(usersTable.id, sessionResult.user.id));
  }

  // For email verification: send a verification link to the business email
  if (data.verificationMethod === "email") {
    const baseUrl =
      process.env.CALLBACK_URL?.replace("/api/scan-callback", "") ||
      `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:80"}`;
    const verifyLink = `${baseUrl}/api/verify-scan/${jobId}`;

    await sendEmail(
      data.businessEmail,
      `Scan Request Verification – ${data.companyName}`,
      buildScanVerificationEmailHtml(data.companyName, verifyLink)
    );
  }

  res.json({
    message:
      data.verificationMethod === "email"
        ? `Verification email sent to ${data.businessEmail}. Click the link to confirm your scan.`
        : "Scan request created. Please verify website ownership using the code below.",
    jobId,
    verificationCode,
    verificationId,
  });
});

// Email verification link handler
router.get("/verify-scan/:jobId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;

  const [job] = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.id, raw));

  if (!job) {
    res.status(404).send("<html><body><h1>Invalid verification link</h1></body></html>");
    return;
  }

  if (job.status !== "pending_email") {
    res.send(`<html><body style="font-family:sans-serif;background:#0a0a0f;color:#f8fafc;padding:2rem;">
      <h1 style="color:#2f9b9b;">Already Processed</h1>
      <p>This scan request has already been verified and is ${job.status}.</p>
    </body></html>`);
    return;
  }

  await db
    .update(scanJobsTable)
    .set({ status: "queued" })
    .where(eq(scanJobsTable.id, raw));

  // Submit to scanner
  await submitToScanner(job.externalScanId!, job.websiteUrl, job.plan, job.businessEmail);

  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Verified</title></head>
<body style="font-family:sans-serif;background:#0a0a0f;color:#f8fafc;text-align:center;padding:4rem;">
  <h1 style="color:#2f9b9b;">Scan Verified</h1>
  <p>Your scan for <strong>${job.companyName}</strong> has been queued.</p>
  <p style="color:#94a3b8;">You will receive your report shortly. Log in to your profile to track progress.</p>
  <a href="/" style="color:#2f9b9b;">Return to Nexus Security</a>
</body></html>`);
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
    res.status(400).json({ error: "Invalid verification ID. Please start a new scan request." });
    return;
  }

  if (job.status !== "pending_verification") {
    res.status(400).json({ error: "This verification has already been used or expired." });
    return;
  }

  if (!job.verificationCode) {
    res.status(400).json({ error: "No verification code found for this request." });
    return;
  }

  // AI crawls the website and checks if the code appears anywhere in the HTML
  const targetUrl = websiteUrl || job.websiteUrl;
  req.log.info({ targetUrl, code: job.verificationCode }, "Crawling website to verify ownership code");

  const result = await checkCodeOnWebsite(targetUrl, job.verificationCode);

  if (!result.found) {
    res.status(400).json({
      error: result.error || `Code "${job.verificationCode}" not found on ${targetUrl}. Paste it anywhere in your page HTML (meta tag, footer div, or hidden element) and try again.`,
    });
    return;
  }

  await db
    .update(scanJobsTable)
    .set({ status: "queued", websiteUrl: websiteUrl || job.websiteUrl })
    .where(eq(scanJobsTable.verificationId, verificationId));

  // Submit to scanner asynchronously
  submitToScanner(job.externalScanId!, job.websiteUrl, job.plan, job.businessEmail).catch((err) =>
    logger.error({ err, jobId: job.id }, "Scanner submission failed after verify-code")
  );

  res.json({
    message: "Website ownership verified. Your scan has been queued. Check your profile for progress.",
    jobId: job.id,
  });
});

// Callback from external scanner (or mock scanner)
router.post("/scan-callback", async (req, res): Promise<void> => {
  const parsed = ScanCallbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { scanId, reportUrl, status } = parsed.data;

  const [job] = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.externalScanId, scanId));

  if (!job) {
    req.log.warn({ scanId }, "scan-callback: job not found");
    res.json({ status: "ok", note: "job not found" });
    return;
  }

  if (status === "completed" && reportUrl) {
    try {
      await ensureReportsDir();
      const response = await fetch(reportUrl);
      if (response.ok) {
        const html = await response.text();
        const reportPath = join(REPORTS_DIR, `${job.id}.html`);
        await writeFile(reportPath, html, "utf-8");

        await db
          .update(scanJobsTable)
          .set({ status: "completed", reportPath, reportUrl })
          .where(eq(scanJobsTable.id, job.id));

        req.log.info({ jobId: job.id, reportPath }, "Report saved from callback");
      } else {
        req.log.warn({ jobId: job.id, reportUrl }, "Failed to download report from URL");
        await db
          .update(scanJobsTable)
          .set({ status: "completed", reportUrl })
          .where(eq(scanJobsTable.id, job.id));
      }
    } catch (err) {
      req.log.error({ err, jobId: job.id }, "Error saving report from callback");
      await db
        .update(scanJobsTable)
        .set({ status: "completed", reportUrl: reportUrl ?? null })
        .where(eq(scanJobsTable.id, job.id));
    }
  } else if (status === "failed") {
    await db
      .update(scanJobsTable)
      .set({ status: "failed" })
      .where(eq(scanJobsTable.id, job.id));
  }

  res.json({ status: "ok" });
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

  res.json({
    totalScans: allJobs.length,
    completedScans: allJobs.filter((j) => j.status === "completed").length,
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

// Serve the saved HTML report (or generate a placeholder)
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

  // If a saved report file exists, serve it
  if (job.reportPath) {
    try {
      const html = await readFile(job.reportPath, "utf-8");
      res.setHeader("Content-Type", "text/html");
      res.send(html);
      return;
    } catch {
      // fall through to placeholder
    }
  }

  // Placeholder for pending/queued scans
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Report - ${job.companyName}</title>
  <style>
    body { font-family: monospace; background: #0a0a0f; color: #f8fafc; padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    h1 { color: #2f9b9b; }
    .status { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 1.5rem 2.5rem; margin-top: 1.5rem; text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; background: #1e293b; color: #2f9b9b; letter-spacing: 1px; }
    p { color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Nexus Security Report</h1>
  <div class="status">
    <p><strong>${job.companyName}</strong> &mdash; ${job.websiteUrl}</p>
    <p>Plan: <span class="badge">${job.plan.toUpperCase()}</span></p>
    <p>Status: <span class="badge">${job.status.replace(/_/g, " ").toUpperCase()}</span></p>
    <p style="margin-top:1rem;">Your full vulnerability report will appear here once scanning is complete.</p>
  </div>
</body>
</html>`);
});

// Download the report
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

  const filename = `nexus-report-${job.companyName.replace(/\s+/g, "-")}-${job.id}.html`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/html");

  if (job.reportPath) {
    try {
      const html = await readFile(job.reportPath, "utf-8");
      res.send(html);
      return;
    } catch {
      // fall through
    }
  }

  res.send(`<!DOCTYPE html><html><body><h1>Report for ${job.companyName}</h1><p>Status: ${job.status}</p></body></html>`);
});

export default router;
