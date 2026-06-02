import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export interface AuditEntry {
  actorUserId?: number | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: unknown;
}

// Persist an admin/system action to the audit log. Never throws — auditing must
// not break the operation it is recording.
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      actorUserId: entry.actorUserId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId != null ? String(entry.targetId) : null,
      details: entry.details ?? null,
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, "Failed to record audit log");
  }
}
