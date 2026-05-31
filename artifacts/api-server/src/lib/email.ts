import { logger } from "./logger";

const FROM_NAME = "Nexus Security";

export async function sendEmail(
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  // Read at call time so newly injected secrets are picked up
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.MAIL_DEFAULT_SENDER || "noreply@nexussecurity.com";

  if (!apiKey) {
    logger.warn({ toEmail, subject }, "BREVO_API_KEY not set — email not sent");
    logger.info({ toEmail, subject }, "DEV: Would have sent email (no Brevo key)");
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: fromEmail },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body, toEmail }, "Brevo email API error");
      return false;
    }

    logger.info({ toEmail, subject }, "Email sent via Brevo");
    return true;
  } catch (err) {
    logger.error({ err, toEmail }, "Failed to send email via Brevo");
    return false;
  }
}

export function buildVerificationEmailHtml(code: string, name: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0f; color: #f8fafc; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 40px; }
    .logo { color: #2f9b9b; font-size: 22px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
    h2 { color: #f8fafc; font-size: 20px; margin: 0 0 8px; }
    p { color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
    .code-box { background: #0a0a0f; border: 1px solid #2f9b9b; border-radius: 10px; padding: 24px; text-align: center; margin: 28px 0; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 14px; color: #2f9b9b; font-family: 'Courier New', monospace; }
    .expires { color: #475569; font-size: 13px; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #1e293b; margin: 28px 0; }
    .footer { color: #475569; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">Nexus Security</div>
      <h2>Verify your email address</h2>
      <p>Hello ${name},</p>
      <p>Enter the code below to complete your Nexus Security account registration:</p>
      <div class="code-box">
        <div class="code">${code}</div>
        <div class="expires">Expires in 15 minutes</div>
      </div>
      <p>If you did not create an account, you can safely ignore this email.</p>
      <hr class="divider">
      <div class="footer">&copy; 2026 Nexus Security. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildPasswordResetEmailHtml(resetLink: string, name: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0f; color: #f8fafc; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 40px; }
    .logo { color: #2f9b9b; font-size: 22px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
    h2 { color: #f8fafc; font-size: 20px; margin: 0 0 8px; }
    p { color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #2f9b9b; color: #000000; padding: 16px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; letter-spacing: 1px; }
    .note { background: #0a0a0f; border-left: 3px solid #2f9b9b; padding: 12px 16px; border-radius: 4px; color: #94a3b8; font-size: 13px; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #1e293b; margin: 28px 0; }
    .footer { color: #475569; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">Nexus Security</div>
      <h2>Reset your password</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset the password for your Nexus Security account. Click the button below to choose a new password:</p>
      <div class="btn-wrap">
        <a href="${resetLink}" class="btn">RESET PASSWORD</a>
      </div>
      <div class="note">This link expires in 30 minutes. If you did not request a password reset, you can safely ignore this email — your password will not change.</div>
      <hr class="divider">
      <div class="footer">&copy; 2026 Nexus Security. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildScanVerificationEmailHtml(companyName: string, verifyLink: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0f; color: #f8fafc; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 40px auto; padding: 0 16px; }
    .card { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 40px; }
    .logo { color: #2f9b9b; font-size: 22px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
    h2 { color: #f8fafc; font-size: 20px; margin: 0 0 8px; }
    p { color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #2f9b9b; color: #000000; padding: 16px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; letter-spacing: 1px; }
    .note { background: #0a0a0f; border-left: 3px solid #2f9b9b; padding: 12px 16px; border-radius: 4px; color: #94a3b8; font-size: 13px; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #1e293b; margin: 28px 0; }
    .footer { color: #475569; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">Nexus Security</div>
      <h2>Confirm your scan request</h2>
      <p>A security scan was requested for <strong style="color:#f8fafc">${companyName}</strong>.</p>
      <p>Click the button below to verify your business email and queue the scan:</p>
      <div class="btn-wrap">
        <a href="${verifyLink}" class="btn">CONFIRM SCAN REQUEST</a>
      </div>
      <div class="note">This link expires in 24 hours. If you did not request this scan, please ignore this email — no action will be taken.</div>
      <hr class="divider">
      <div class="footer">&copy; 2026 Nexus Security. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}
