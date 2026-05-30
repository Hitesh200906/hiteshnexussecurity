import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { createSession, getSessionUser, destroySession } from "../lib/session";
import { sendEmail, buildVerificationEmailHtml } from "../lib/email";
import { logger } from "../lib/logger";
import {
  LoginBody,
  SignupBody,
  RegisterBody,
  VerifyEmailBody,
  ChangePasswordBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function hashPassword(password: string): string {
  const salt = "nexus_salt_2026";
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

// In-memory store for pending email verifications
// { email -> { code, name, passwordHash, expiresAt } }
const pendingVerifications = new Map<
  string,
  { code: string; name: string; passwordHash: string; expiresAt: number }
>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of pendingVerifications.entries()) {
    if (entry.expiresAt < now) {
      pendingVerifications.delete(email);
    }
  }
}, 5 * 60 * 1000);

router.get("/status", async (req, res): Promise<void> => {
  const result = await getSessionUser(req);
  if (!result) {
    res.json({ loggedIn: false });
    return;
  }
  const { user } = result;
  res.json({
    loggedIn: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// Step 1: Pre-signup — validate, check duplicate, send 6-digit code
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const passwordHash = hashPassword(password);

  pendingVerifications.set(normalizedEmail, {
    code,
    name: name.trim(),
    passwordHash,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  });

  await sendEmail(
    normalizedEmail,
    "Verify your Nexus Security account",
    buildVerificationEmailHtml(code, name.trim())
  );

  logger.info({ email: normalizedEmail }, "Email verification code sent");

  res.json({ message: "Verification code sent to your email. Please enter it to complete registration." });
});

// Step 2: Verify email code and create account
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, code } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const pending = pendingVerifications.get(normalizedEmail);
  if (!pending) {
    res.status(400).json({ error: "No pending verification for this email. Please register again." });
    return;
  }

  if (Date.now() > pending.expiresAt) {
    pendingVerifications.delete(normalizedEmail);
    res.status(400).json({ error: "Verification code expired. Please register again." });
    return;
  }

  if (code.trim() !== pending.code) {
    res.status(400).json({ error: "Invalid verification code. Please try again." });
    return;
  }

  pendingVerifications.delete(normalizedEmail);

  // Double-check no account was created in the meantime
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      name: pending.name,
      email: normalizedEmail,
      passwordHash: pending.passwordHash,
      credits: 5,
    })
    .returning();

  await createSession(user.id, res);

  logger.info({ userId: user.id, email: normalizedEmail }, "New user created via email verification");

  res.status(201).json({
    message: "Account created successfully. Welcome to Nexus Security.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// Direct signup (no email verification — kept for backwards compatibility / testing)
router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      credits: 5,
    })
    .returning();

  await createSession(user.id, res);

  res.status(201).json({
    message: "Account created successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const hash = hashPassword(password);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));

  if (!user || user.passwordHash !== hash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await createSession(user.id, res);

  res.json({
    message: "Login successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await destroySession(req, res);
  res.json({ message: "Logged out successfully" });
});

router.post("/auth/change-password", async (req, res): Promise<void> => {
  const result = await getSessionUser(req);
  if (!result) {
    res.status(401).json({ error: "You must be logged in to change your password" });
    return;
  }

  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  if (hashPassword(currentPassword) !== result.user.passwordHash) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, result.user.id));

  logger.info({ userId: result.user.id }, "User changed password");

  res.json({ message: "Password updated successfully" });
});

// Google OAuth stub
router.get("/login/google", (_req, res): void => {
  res.status(501).json({ error: "Google OAuth not yet configured" });
});

export default router;
