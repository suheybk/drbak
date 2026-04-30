import type { Instant } from '../../domain/shared/time.js';

export interface SignedUrlMinter {
  /** For appointment cancel/reschedule links emailed to patients. */
  mintAppointmentLink(input: {
    appointmentId: string;
    action: 'reschedule' | 'cancel';
    expiresAt: Instant;
  }): Promise<string>;
  verifyAppointmentLink(token: string): Promise<{
    appointmentId: string;
    action: 'reschedule' | 'cancel';
    expiresAt: Instant;
  } | null>;
}
