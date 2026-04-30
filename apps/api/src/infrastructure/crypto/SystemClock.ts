import type { Clock } from '../../application/ports/index.js';
import { type Instant, instantFromMillis } from '../../domain/shared/time.js';

export class SystemClock implements Clock {
  now(): Instant {
    return instantFromMillis(Date.now());
  }
}
