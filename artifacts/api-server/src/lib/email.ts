import { logger } from "./logger";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.MAIL_DEFAULT_SENDER || "noreply@nexussecurity.com";
const FROM_NAME = "Nexus Security";

export async function sendEmail(
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  if (!BREVO_API_KEY) {
    logger.warn(
      { toEmail, subject },
      "BREVO_API_KEY not set — email not sent (logged for dev)"
    );
    logger.info({ toEmail, subject, htmlContent }, "DEV: Email content");
    return true;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, "Brevo email failed");
      return false;
    }

    logger.info({ toEmail, subject }, "Email sent via Brevo");
    return true;
  } catch (err) {
    logger.error({ err, toEmail }, "Failed to send email");
    return false;
  }
}

export function buildVerificationEmailHtml(code: string, name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0f; color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 40px; }
    h1 { color: #2f9b9b; font-size: 24px; margin-bottom: 8px; }
    .code { font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #2f9b9b; background: #0a0a0f; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0; }
    p { color: #94a3b8; line-height: 1.6; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Nexus Security</h1>
    <p>Hello ${name},</p>
    <p>Your email verification code is:</p>
    <div class="code">${code}</div>
    <p>Enter this code to complete your account registration. It expires in <strong>15 minutes</strong>.</p>
    <p>If you did not request this, please ignore this email.</p>
    <div class="footer">
      <p>&copy; 2026 Nexus Security. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildScanVerificationEmailHtml(
  companyName: string,
  verifyLink: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0f; color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 40px; }
    h1 { color: #2f9b9b; font-size: 24px; margin-bottom: 8px; }
    .btn { display: inline-block; background: #2f9b9b; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 24px 0; }
    p { color: #94a3b8; line-height: 1.6; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Nexus Security</h1>
    <p>You requested a security scan for <strong>${companyName}</strong>.</p>
    <p>Click the button below to verify your business email and confirm your scan request:</p>
    <a href="${verifyLink}" class="btn">Confirm Scan Request</a>
    <p>This link expires in <strong>24 hours</strong>. If you did not make this request, please ignore this email.</p>
    <div class="footer">
      <p>&copy; 2026 Nexus Security. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
