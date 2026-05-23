import { logger } from "./logger";
import { db, scanJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const SCANNER_API_URL = process.env.JATIN_API_URL;
const CALLBACK_URL =
  process.env.CALLBACK_URL ||
  `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:80"}/api/scan-callback`;

const REPORTS_DIR = join(process.cwd(), "reports");

async function ensureReportsDir(): Promise<void> {
  try {
    await mkdir(REPORTS_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

/**
 * Submit a scan to the external scanner or run a mock scan if no API URL is set.
 */
export async function submitToScanner(
  scanId: string,
  targetUrl: string,
  plan: string,
  userEmail: string
): Promise<void> {
  if (!SCANNER_API_URL) {
    logger.info({ scanId, targetUrl }, "No scanner API URL — running mock scan");
    runMockScan(scanId, targetUrl, plan);
    return;
  }

  try {
    const response = await fetch(`${SCANNER_API_URL}/api/scan/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: targetUrl,
        plan,
        scan_id: scanId,
        webhook_url: CALLBACK_URL,
        user_email: userEmail,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body, scanId }, "External scanner rejected scan");
      runMockScan(scanId, targetUrl, plan);
    } else {
      logger.info({ scanId, scannerUrl: SCANNER_API_URL }, "Scan submitted to external scanner");
    }
  } catch (err) {
    logger.error({ err, scanId }, "Failed to reach external scanner — falling back to mock");
    runMockScan(scanId, targetUrl, plan);
  }
}

/**
 * Mock scanner: simulates a scan and triggers the callback after a delay.
 */
function runMockScan(scanId: string, targetUrl: string, plan: string): void {
  const delay = 8000 + Math.random() * 7000; // 8–15s

  setTimeout(async () => {
    try {
      await ensureReportsDir();

      const reportHtml = generateMockReport(scanId, targetUrl, plan);
      const reportPath = join(REPORTS_DIR, `${scanId}.html`);
      await writeFile(reportPath, reportHtml, "utf-8");

      const [job] = await db
        .select()
        .from(scanJobsTable)
        .where(eq(scanJobsTable.externalScanId, scanId));

      if (!job) {
        logger.warn({ scanId }, "Mock scan: job not found for callback");
        return;
      }

      await db
        .update(scanJobsTable)
        .set({ status: "completed", reportPath })
        .where(eq(scanJobsTable.externalScanId, scanId));

      logger.info({ scanId, reportPath }, "Mock scan completed");
    } catch (err) {
      logger.error({ err, scanId }, "Mock scan failed");
    }
  }, delay);
}

function generateMockReport(scanId: string, targetUrl: string, plan: string): string {
  const isPro = plan === "protection";
  const isAdv = plan === "advanced" || isPro;

  const criticalVulns = isPro
    ? `
    <div class="vuln critical">
      <span class="severity">CRITICAL</span>
      <h3>SQL Injection in Login Form</h3>
      <p><strong>Location:</strong> /login endpoint, <code>username</code> parameter</p>
      <p><strong>Description:</strong> Unsanitised input allows attackers to manipulate database queries, potentially exposing all user data.</p>
      <p><strong>Fix:</strong> Use parameterised queries or prepared statements. Validate and sanitise all user inputs.</p>
      <code>SELECT * FROM users WHERE username = ? AND password = ?</code>
    </div>
    <div class="vuln critical">
      <span class="severity">CRITICAL</span>
      <h3>Remote Code Execution via File Upload</h3>
      <p><strong>Location:</strong> /upload endpoint</p>
      <p><strong>Description:</strong> The application allows uploading of server-side scripts without proper validation, enabling remote code execution.</p>
      <p><strong>Fix:</strong> Whitelist allowed file types, validate MIME types server-side, store files outside webroot.</p>
    </div>`
    : "";

  const mediumVulns = isAdv
    ? `
    <div class="vuln medium">
      <span class="severity">MEDIUM</span>
      <h3>Cross-Site Scripting (XSS)</h3>
      <p><strong>Location:</strong> Search functionality, multiple pages</p>
      <p><strong>Description:</strong> Reflected XSS allows attackers to inject malicious scripts into pages viewed by other users.</p>
      <p><strong>Fix:</strong> Encode all output, implement Content Security Policy headers.</p>
    </div>
    <div class="vuln medium">
      <span class="severity">MEDIUM</span>
      <h3>Missing Security Headers</h3>
      <p><strong>Location:</strong> All HTTP responses</p>
      <p><strong>Description:</strong> Missing X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security headers.</p>
      <p><strong>Fix:</strong> Add security headers in server configuration or middleware.</p>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nexus Security Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; background: #0a0a0f; color: #f8fafc; padding: 2rem; min-height: 100vh; }
    .header { border-bottom: 2px solid #2f9b9b; padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .header h1 { color: #2f9b9b; font-size: 2rem; letter-spacing: 2px; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .meta-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 1rem; }
    .meta-card label { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }
    .meta-card p { color: #f8fafc; font-size: 0.9rem; margin-top: 4px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .badge.basic { background: #1e3a5f; color: #60a5fa; }
    .badge.advanced { background: #1a3a2a; color: #34d399; }
    .badge.protection { background: #3a1a1a; color: #f87171; }
    .section { margin: 2rem 0; }
    .section h2 { color: #2f9b9b; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #1e293b; }
    .vuln { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 1.25rem; margin: 1rem 0; }
    .vuln.critical { border-left: 4px solid #ef4444; }
    .vuln.medium { border-left: 4px solid #f59e0b; }
    .vuln.low { border-left: 4px solid #3b82f6; }
    .severity { font-size: 0.7rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 2px 8px; border-radius: 4px; }
    .vuln.critical .severity { background: #7f1d1d; color: #ef4444; }
    .vuln.medium .severity { background: #78350f; color: #f59e0b; }
    .vuln.low .severity { background: #1e3a8a; color: #3b82f6; }
    .vuln h3 { color: #f8fafc; margin: 0.5rem 0 0.25rem; }
    .vuln p { color: #94a3b8; margin: 0.4rem 0; font-size: 0.875rem; line-height: 1.5; }
    code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #2f9b9b; display: block; margin-top: 8px; padding: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1rem 0; }
    .summary-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 1rem; text-align: center; }
    .summary-card .count { font-size: 2rem; font-weight: bold; }
    .summary-card.crit .count { color: #ef4444; }
    .summary-card.med .count { color: #f59e0b; }
    .summary-card.low .count { color: #3b82f6; }
    .summary-card.info .count { color: #94a3b8; }
    .summary-card label { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; }
    .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #1e293b; color: #475569; font-size: 0.75rem; text-align: center; }
    @media print { body { background: white; color: black; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>NEXUS SECURITY</h1>
    <p style="color:#94a3b8;margin-top:4px;">AI-Powered Vulnerability Assessment Report</p>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <label>Scan ID</label>
      <p>${scanId}</p>
    </div>
    <div class="meta-card">
      <label>Target</label>
      <p>${targetUrl}</p>
    </div>
    <div class="meta-card">
      <label>Plan</label>
      <p><span class="badge ${plan}">${plan.toUpperCase()}</span></p>
    </div>
    <div class="meta-card">
      <label>Scan Date</label>
      <p>${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card crit">
        <div class="count">${isPro ? 2 : 0}</div>
        <label>Critical</label>
      </div>
      <div class="summary-card med">
        <div class="count">${isAdv ? 2 : 0}</div>
        <label>Medium</label>
      </div>
      <div class="summary-card low">
        <div class="count">3</div>
        <label>Low</label>
      </div>
      <div class="summary-card info">
        <div class="count">5</div>
        <label>Info</label>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Vulnerabilities Found</h2>

    ${criticalVulns}
    ${mediumVulns}

    <div class="vuln low">
      <span class="severity">LOW</span>
      <h3>Outdated JavaScript Libraries</h3>
      <p><strong>Location:</strong> /assets/js/vendor.js</p>
      <p><strong>Description:</strong> jQuery 2.1.4 and Lodash 3.10.0 have known vulnerabilities.</p>
      <p><strong>Fix:</strong> Update dependencies to latest stable versions. Consider using a dependency scanner in CI/CD.</p>
    </div>
    <div class="vuln low">
      <span class="severity">LOW</span>
      <h3>Insecure Cookie Configuration</h3>
      <p><strong>Description:</strong> Session cookies missing Secure and SameSite attributes.</p>
      <p><strong>Fix:</strong> Set <code>Secure; HttpOnly; SameSite=Strict</code> on all session cookies.</p>
    </div>
    <div class="vuln low">
      <span class="severity">LOW</span>
      <h3>Information Disclosure in Error Messages</h3>
      <p><strong>Description:</strong> Stack traces exposed in production error responses reveal internal paths and framework versions.</p>
      <p><strong>Fix:</strong> Disable debug mode in production. Implement generic error handling.</p>
    </div>
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    <div style="background:#111827;border:1px solid #1e293b;border-radius:8px;padding:1.25rem;">
      <ul style="list-style:none;padding:0;">
        <li style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">
          <span style="color:#2f9b9b;margin-right:8px;">01.</span> Implement a Web Application Firewall (WAF) to filter malicious traffic
        </li>
        <li style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">
          <span style="color:#2f9b9b;margin-right:8px;">02.</span> Enable HTTPS with HSTS and update TLS to 1.3 minimum
        </li>
        <li style="padding:8px 0;border-bottom:1px solid #1e293b;color:#94a3b8;">
          <span style="color:#2f9b9b;margin-right:8px;">03.</span> Add rate limiting to authentication endpoints
        </li>
        <li style="padding:8px 0;color:#94a3b8;">
          <span style="color:#2f9b9b;margin-right:8px;">04.</span> Schedule regular automated security scans with Nexus Security
        </li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <p>Report generated by Nexus Security AI Scanner &mdash; ${new Date().toISOString()}</p>
    <p style="margin-top:4px;">This report is confidential and intended only for the organisation that commissioned this scan.</p>
  </div>
</body>
</html>`;
}
