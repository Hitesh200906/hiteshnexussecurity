---
name: Admin Auth Flow
description: How the two-step admin authentication + passkey system works
---

**Two-step admin verification:**
1. User must be logged in as an account with `isAdmin=true`
2. Must pass `/api/admin/login` with the correct passcode (ADMIN_PASSCODE env = "nexus admin") OR `/api/admin/passkey/auth-verify` with their credential ID

**Passcode check:** stored in session (`adminVerified` field on sessionsTable).

**Passkey system:**
- Each admin can optionally enroll a biometric passkey
- Stored as base64url `credentialId` in `users.passkeyCredentialId` (text, nullable)
- Browser WebAuthn API handles biometric; server just checks credentialId matches stored value (simplified, not cryptographic)
- Frontend stores credentialId in `localStorage` under `nexus_passkey_cred` for use in `navigator.credentials.get()` allowCredentials
- Challenges stored in in-memory Map `passkeyChallengePending` keyed by userId

**Adding team admins:**
- `POST /api/admin/team-members { email }` sets `isAdmin=true` on existing user
- New admins use global passcode until they set their own passkey

**Admin password:** SHA256(password + "nexus_salt_2026") — admin account is nexussecurity777@gmail.com.
