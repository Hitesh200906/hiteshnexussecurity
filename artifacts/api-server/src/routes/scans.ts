import { Router, type IRouter } from "express";
import {
  db,
  scanJobsTable,
  usersTable,
  planConfigTable,
  reportsTable,
  verificationAttemptsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { getSessionUser } from "../lib/session";
import { sendEmail, buildScanVerificationEmailHtml } from "../lib/email";
import { submitToScanner } from "../lib/scanner";
import { finalizeCompletedScan } from "../lib/scan-completion";
import { logger } from "../lib/logger";
import { getAppBaseUrl } from "../lib/base-url";
import {
  RequestScanBody,
  VerifyCodeBody,
  GetScanParams,
  ScanCallbackBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
const REPORTS_DIR = join(process.cwd(), "reports");

// Credit cost gates access to a plan (deducted from the user's balance). This is
// the internal entitlement mechanism and is distinct from the rupee price shown
// to the user.
const PLAN_CREDIT_DEFAULTS: Record<string, number> = {
  basic: 0,
  advanced: 10,
  protection: 25,
};

// Per-scan display price in INR (rupees). Admin-editable via plan_config
// (`price_<plan>` keys); these are the fallbacks when unset.
const PLAN_PRICE_DEFAULTS: Record<string, number> = {
  basic: 999,
  advanced: 2999,
  protection: 4999,
};

function getPlanCredits(plan: string): number {
  return PLAN_CREDIT_DEFAULTS[plan] ?? 0;
}

async function getPlanPrice(plan: string): Promise<number> {
  const [config] = await db
    .select()
    .from(planConfigTable)
    .where(eq(planConfigTable.key, `price_${plan}`));
  return config?.value ?? PLAN_PRICE_DEFAULTS[plan] ?? 0;
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

async function fetchHtml(target: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(target, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 NexusSecurity-Ownership-Verifier/2.0",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!resp.ok) return "";
    return await resp.text();
  } catch {
    return "";
  }
}

/**
 * Business-email verification: crawl the homepage plus common contact/about
 * pages (the footer lives in the homepage HTML) and check the business email
 * is publicly listed on the domain.
 */
async function checkEmailOnWebsite(url: string, email: string): Promise<boolean> {
  let base = url.trim();
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = "https://" + base;
  }
  base = base.replace(/\/+$/, "");

  const paths = ["/", "/contact", "/contact-us", "/about", "/about-us"];
  const target = email.trim().toLowerCase();

  for (const path of paths) {
    const html = (await fetchHtml(base + path)).toLowerCase();
    if (html && html.includes(target)) {
      return true;
    }
  }
  return false;
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
  const creditCost = getPlanCredits(data.plan);
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

  // Method 1 — Business Email Verification: confirm the business email is
  // publicly listed on the domain (homepage / contact / about / footer) before
  // creating the scan, so we never email a code to an unaffiliated address.
  if (data.verificationMethod === "email") {
    const emailFound = await checkEmailOnWebsite(data.websiteUrl, data.email);
    if (!emailFound) {
      res.status(400).json({
        error:
          "The provided business email address was not found on the website. Please use an email address that is publicly associated with the domain.",
      });
      return;
    }
  }

  const jobId = randomBytes(8).toString("hex");
  let verificationCode: string | null = null;
  let verificationId: string | null = null;

  if (data.verificationMethod === "manual") {
    // Generate NX-prefixed 6-digit code (matches spec example NX-483721)
    const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
    verificationCode = `NX-${digits}`;
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

  // Record the ownership-verification attempt for this scan.
  await db.insert(verificationAttemptsTable).values({
    id: randomBytes(12).toString("hex"),
    scanId: jobId,
    userId: sessionResult?.user.id ?? null,
    method: data.verificationMethod,
    code: verificationCode,
    status: "pending",
  });

  if (sessionResult) {
    await db
      .update(usersTable)
      .set({
        credits: creditCost > 0 ? sessionResult.user.credits - creditCost : sessionResult.user.credits,
        scansUsed: sql`${usersTable.scansUsed} + 1`,
        currentPlan: data.plan,
      })
      .where(eq(usersTable.id, sessionResult.user.id));
  }

  // For email verification: send a verification link to the business email
  if (data.verificationMethod === "email") {
    const baseUrl =
      process.env.CALLBACK_URL?.replace("/api/scan-callback", "") ||
      getAppBaseUrl();
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

  await db
    .update(verificationAttemptsTable)
    .set({ status: "success", detail: "Email ownership link confirmed" })
    .where(eq(verificationAttemptsTable.scanId, job.id));

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
    await db
      .update(verificationAttemptsTable)
      .set({ status: "failed", detail: result.error ?? "Code not found on website" })
      .where(eq(verificationAttemptsTable.scanId, job.id));
    res.status(400).json({
      error: result.error || `Code "${job.verificationCode}" not found on ${targetUrl}. Paste it anywhere in your page HTML (meta tag, footer div, or hidden element) and try again.`,
    });
    return;
  }

  await db
    .update(scanJobsTable)
    .set({ status: "queued", websiteUrl: websiteUrl || job.websiteUrl })
    .where(eq(scanJobsTable.verificationId, verificationId));

  await db
    .update(verificationAttemptsTable)
    .set({ status: "success", detail: "Manual code found on website" })
    .where(eq(verificationAttemptsTable.scanId, job.id));

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
    await finalizeCompletedScan(job, { reportUrl });
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

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

router.get("/scans/stats", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult) {
    res.json({ totalScans: 0, activeScans: 0, completedScans: 0, reportsAvailable: 0, credits: 0 });
    return;
  }

  const allJobs = await db
    .select()
    .from(scanJobsTable)
    .where(eq(scanJobsTable.userId, sessionResult.user.id));

  const reportRows = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .where(eq(reportsTable.userId, sessionResult.user.id));

  res.json({
    totalScans: allJobs.length,
    activeScans: allJobs.filter((j) => !TERMINAL_STATUSES.has(j.status)).length,
    completedScans: allJobs.filter((j) => j.status === "completed").length,
    reportsAvailable: reportRows.length,
    credits: sessionResult.user.credits,
  });
});

router.get("/reports", async (req, res): Promise<void> => {
  const sessionResult = await getSessionUser(req);
  if (!sessionResult) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const rows = await db
    .select({
      id: reportsTable.id,
      scanId: reportsTable.scanId,
      userId: reportsTable.userId,
      severitySummary: reportsTable.severitySummary,
      pdfUrl: reportsTable.pdfUrl,
      createdAt: reportsTable.createdAt,
      companyName: scanJobsTable.companyName,
      websiteUrl: scanJobsTable.websiteUrl,
      plan: scanJobsTable.plan,
    })
    .from(reportsTable)
    .leftJoin(scanJobsTable, eq(reportsTable.scanId, scanJobsTable.id))
    .where(eq(reportsTable.userId, sessionResult.user.id))
    .orderBy(desc(reportsTable.createdAt));

  res.json(
    rows.map((r) => ({
      id: r.id,
      scanId: r.scanId,
      userId: r.userId,
      companyName: r.companyName,
      websiteUrl: r.websiteUrl,
      plan: r.plan,
      severitySummary: r.severitySummary,
      pdfUrl: r.pdfUrl,
      createdAt: r.createdAt.toISOString(),
    }))
  );
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
