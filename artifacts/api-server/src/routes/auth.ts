import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomInt } from "crypto";
import { createSession, getSessionUser, destroySession } from "../lib/session";
import {
  sendEmail,
  buildVerificationEmailHtml,
  buildPasswordResetCodeEmailHtml,
} from "../lib/email";
import { hashPassword, verifyPassword } from "../lib/password";
import { logger } from "../lib/logger";
import {
  LoginBody,
  SignupBody,
  RegisterBody,
  VerifyEmailBody,
  ChangePasswordBody,
  ResendVerificationBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CODE_TTL_MS = 15 * 60 * 1000; // verification & reset codes expire in 15 min

function generateCode(): string {
  // Cryptographically secure 6-digit code (100000-999999).
  return String(randomInt(100000, 1000000));
}

function publicUser(user: {
  id: number;
  name: string;
  email: string;
  credits: number;
  isAdmin: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    credits: user.credits,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/status", async (req, res): Promise<void> => {
  const result = await getSessionUser(req);
  if (!result) {
    res.json({ loggedIn: false });
    return;
  }
  res.json({ loggedIn: true, user: publicUser(result.user) });
});

// Step 1: Sign up — create (or refresh) a pending, unverified user row and
// email a 6-digit verification code. No active account exists until the code
// is confirmed (is_verified stays false).
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
  const trimmedName = name.trim();
  if (!trimmedName) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing && existing.isVerified) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const code = generateCode();
  const verificationExpiry = new Date(Date.now() + CODE_TTL_MS);
  const passwordHash = await hashPassword(password);

  if (existing) {
    // Unverified row already exists — refresh its details and resend a code.
    await db
      .update(usersTable)
      .set({ name: trimmedName, passwordHash, verificationCode: code, verificationExpiry })
      .where(eq(usersTable.id, existing.id));
  } else {
    await db.insert(usersTable).values({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      credits: 5,
      isVerified: false,
      verificationCode: code,
      verificationExpiry,
    });
  }

  await sendEmail(
    normalizedEmail,
    "Verify your Nexus Security account",
    buildVerificationEmailHtml(code, trimmedName),
  );

  logger.info({ email: normalizedEmail }, "Email verification code sent");
  res.json({
    message: "Verification code sent to your email. Please enter it to complete registration.",
  });
});

// Step 2: Confirm the 6-digit code, mark the account verified, start a session.
router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, code } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (!user) {
    res.status(400).json({ error: "No pending registration for this email. Please sign up again." });
    return;
  }
  if (user.isVerified) {
    res.status(400).json({ error: "This account is already verified. Please sign in." });
    return;
  }
  if (!user.verificationCode || !user.verificationExpiry || user.verificationExpiry.getTime() < Date.now()) {
    res.status(400).json({ error: "Verification code expired. Please request a new one." });
    return;
  }
  if (code.trim() !== user.verificationCode) {
    res.status(400).json({ error: "Invalid verification code. Please try again." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isVerified: true, verificationCode: null, verificationExpiry: null })
    .where(eq(usersTable.id, user.id))
    .returning();

  await createSession(updated.id, res);

  logger.info({ userId: updated.id, email: normalizedEmail }, "User verified email and signed in");
  res.status(201).json({
    message: "Account created successfully. Welcome to Nexus Security.",
    user: publicUser(updated),
  });
});

// Resend the verification code for a pending account. Responds generically to
// avoid leaking which emails have a pending registration.
router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const parsed = ResendVerificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const generic = { message: "If a pending account exists for that email, a new code has been sent." };

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (!user || user.isVerified) {
    res.json(generic);
    return;
  }

  const code = generateCode();
  await db
    .update(usersTable)
    .set({ verificationCode: code, verificationExpiry: new Date(Date.now() + CODE_TTL_MS) })
    .where(eq(usersTable.id, user.id));

  await sendEmail(
    normalizedEmail,
    "Verify your Nexus Security account",
    buildVerificationEmailHtml(code, user.name),
  );

  logger.info({ email: normalizedEmail }, "Verification code resent");
  res.json(generic);
});

// Direct signup with no email verification (kept for testing/admin tooling).
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
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ name: name.trim(), email: normalizedEmail, passwordHash, credits: 5, isVerified: true })
    .returning();

  await createSession(user.id, res);
  res.status(201).json({ message: "Account created successfully", user: publicUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  const { ok, needsRehash } = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isVerified) {
    res.status(403).json({
      error: "Please verify your email before signing in.",
      needsVerification: true,
      email: user.email,
    });
    return;
  }

  // Transparently upgrade legacy SHA-256 hashes to bcrypt on successful login.
  if (needsRehash) {
    const upgraded = await hashPassword(password);
    await db.update(usersTable).set({ passwordHash: upgraded }).where(eq(usersTable.id, user.id));
  }

  await createSession(user.id, res);
  res.json({ message: "Login successful", user: publicUser(user) });
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

  const { ok } = await verifyPassword(currentPassword, result.user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  await db
    .update(usersTable)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(usersTable.id, result.user.id));

  logger.info({ userId: result.user.id }, "User changed password");
  res.json({ message: "Password updated successfully" });
});

// Forgot password — email a 6-digit reset code. Responds generically to avoid
// leaking which emails are registered.
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const generic = {
    message: "If an account exists for that email, a password reset code has been sent.",
  };

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (!user) {
    logger.info({ email: normalizedEmail }, "Password reset requested for unknown email");
    res.json(generic);
    return;
  }

  const code = generateCode();
  await db
    .update(usersTable)
    .set({ resetCode: code, resetExpiry: new Date(Date.now() + CODE_TTL_MS) })
    .where(eq(usersTable.id, user.id));

  // Send without blocking so latency is identical whether or not the email exists.
  void sendEmail(
    normalizedEmail,
    "Reset your Nexus Security password",
    buildPasswordResetCodeEmailHtml(code, user.name),
  )
    .then(() => logger.info({ userId: user.id }, "Password reset code sent"))
    .catch((err) => logger.error({ err, userId: user.id }, "Failed to send password reset email"));

  res.json(generic);
});

// Complete a password reset using the emailed 6-digit code.
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, code, newPassword } = parsed.data;

  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (!user || !user.resetCode || !user.resetExpiry || user.resetExpiry.getTime() < Date.now()) {
    res.status(400).json({ error: "This reset code is invalid or has expired. Please request a new one." });
    return;
  }
  if (code.trim() !== user.resetCode) {
    res.status(400).json({ error: "Invalid reset code. Please try again." });
    return;
  }

  await db
    .update(usersTable)
    .set({
      passwordHash: await hashPassword(newPassword),
      resetCode: null,
      resetExpiry: null,
      // A successful reset proves the user controls the inbox.
      isVerified: true,
    })
    .where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id }, "Password reset completed");
  res.json({ message: "Your password has been reset. You can now sign in with your new password." });
});

// Google OAuth stub
router.get("/login/google", (_req, res): void => {
  res.status(501).json({ error: "Google OAuth not yet configured" });
});

export default router;
