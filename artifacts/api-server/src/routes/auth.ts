import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { createSession, getSessionUser, destroySession } from "../lib/session";
import {
  LoginBody,
  SignupBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function hashPassword(password: string): string {
  const salt = "nexus_salt_2026";
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

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

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));

  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
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

router.post("/auth/logout", async (req, res): Promise<void> => {
  await destroySession(req, res);
  res.json({ message: "Logged out successfully" });
});

export default router;
