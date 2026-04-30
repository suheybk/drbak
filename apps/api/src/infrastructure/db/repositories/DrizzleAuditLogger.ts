import { ulid } from 'ulid';
import type { AuditEvent, AuditLogger } from '../../../application/ports/index.js';
import type { Db } from '../client.js';
import { auditLog } from '../schema.js';

export class DrizzleAuditLogger implements AuditLogger {
  constructor(private readonly db: Db) {}

  async record(event: AuditEvent): Promise<void> {
    await this.db.insert(auditLog).values({
      id: ulid(),
      actorUserId: event.actorUserId,
      actorRole: event.actorRole,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      targetUserId: event.targetUserId,
      correlationId: event.correlationId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadataJson: event.metadata ?? null,
      at: new Date(),
    });
  }
}
