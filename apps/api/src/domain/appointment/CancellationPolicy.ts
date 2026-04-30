import { type Instant, isBefore, subMinutes, type DurationMinutes } from '../shared/time.js';

export type CancellationVerdict =
  | 'allowed' // within window — clean cancellation
  | 'late' // outside window — still cancels but flagged as late_cancellation
  | 'forbidden'; // appointment already terminal or already started

export interface CancellationContext {
  readonly slotStartsAt: Instant;
  readonly now: Instant;
  readonly windowHours: number;
  readonly isTerminal: boolean;
}

export class CancellationPolicy {
  static decide(ctx: CancellationContext): CancellationVerdict {
    if (ctx.isTerminal) return 'forbidden';
    if (!isBefore(ctx.now, ctx.slotStartsAt)) return 'forbidden'; // already past start
    const deadline = subMinutes(ctx.slotStartsAt, (ctx.windowHours * 60) as DurationMinutes);
    return isBefore(ctx.now, deadline) ? 'allowed' : 'late';
  }

  static deadline(slotStartsAt: Instant, windowHours: number): Instant {
    return subMinutes(slotStartsAt, (windowHours * 60) as DurationMinutes);
  }
}
