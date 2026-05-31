import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const BCRYPT_ROUNDS = 12;

// Legacy hashing used before the bcrypt migration. Kept only so existing
// accounts (created with SHA-256 + a fixed salt) can still authenticate; on a
// successful legacy login the caller rehashes the password with bcrypt.
const LEGACY_SALT = "nexus_salt_2026";
function legacyHash(password: string): string {
  return createHash("sha256")
    .update(password + LEGACY_SALT)
    .digest("hex");
}

function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$/.test(hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export interface VerifyResult {
  ok: boolean;
  /** True when a valid legacy (SHA-256) hash was matched and should be upgraded to bcrypt. */
  needsRehash: boolean;
}

export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined,
): Promise<VerifyResult> {
  if (!storedHash) return { ok: false, needsRehash: false };

  if (isBcryptHash(storedHash)) {
    const ok = await bcrypt.compare(password, storedHash);
    return { ok, needsRehash: false };
  }

  // Legacy SHA-256 hash — constant-time-ish comparison via fixed recompute.
  const ok = legacyHash(password) === storedHash;
  return { ok, needsRehash: ok };
}
