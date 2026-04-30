import type { Instant } from '../../domain/shared/time.js';

export interface TelehealthRoom {
  readonly roomId: string;
  readonly joinUrl: string;
  readonly expiresAt: Instant;
}

export interface TelehealthRoomFactory {
  createRoom(input: {
    appointmentId: string;
    startsAt: Instant;
    endsAt: Instant;
    moderatorEmail: string;
    patientEmail: string;
  }): Promise<TelehealthRoom>;
}
