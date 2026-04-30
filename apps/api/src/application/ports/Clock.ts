import type { Instant } from '../../domain/shared/time.js';

export interface Clock {
  now(): Instant;
}
