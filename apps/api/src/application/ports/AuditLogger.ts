import type { CorrelationId, UserId } from '../../domain/shared/ids.js';

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'soft_delete'
  | 'hard_delete'
  | 'login'
  | 'logout'
  | 'consent_grant'
  | 'consent_withdraw'
  | 'document_upload'
  | 'document_download'
  | 'export';

export interface AuditEvent {
  readonly actorUserId: UserId | null;
  readonly actorRole: 'patient' | 'staff' | 'admin' | 'doctor' | null;
  readonly action: AuditAction;
  readonly entityType: string;
  readonly entityId: string;
  readonly targetUserId: UserId | null;
  readonly correlationId: CorrelationId;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly metadata?: Record<string, unknown>;
}

export interface AuditLogger {
  record(event: AuditEvent): Promise<void>;
}
