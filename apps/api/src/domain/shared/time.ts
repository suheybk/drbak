/**
 * Pure time value objects. We never use `new Date()` inside `domain/`.
 * The `Clock` port (in `application/ports`) provides `now(): Instant` from outside.
 */

declare const __instantBrand: unique symbol;
export type Instant = number & { readonly [__instantBrand]: 'Instant' };

declare const __durationBrand: unique symbol;
export type DurationMinutes = number & { readonly [__durationBrand]: 'DurationMinutes' };

export const instantFromIso = (iso: string): Instant => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new RangeError(`invalid ISO instant: ${iso}`);
  return t as Instant;
};

export const instantFromMillis = (ms: number): Instant => {
  if (!Number.isFinite(ms)) throw new RangeError('Instant must be finite millis');
  return ms as Instant;
};

export const instantToIso = (i: Instant): string => new Date(i).toISOString();

export const durationMinutes = (n: number): DurationMinutes => {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('Duration must be positive integer');
  return n as DurationMinutes;
};

export const addMinutes = (i: Instant, d: DurationMinutes): Instant =>
  ((i as number) + (d as number) * 60_000) as Instant;

export const subMinutes = (i: Instant, d: DurationMinutes): Instant =>
  ((i as number) - (d as number) * 60_000) as Instant;

export const isBefore = (a: Instant, b: Instant): boolean => (a as number) < (b as number);
export const isAfter = (a: Instant, b: Instant): boolean => (a as number) > (b as number);
export const isSameOrBefore = (a: Instant, b: Instant): boolean => (a as number) <= (b as number);

export const minutesBetween = (a: Instant, b: Instant): number =>
  Math.round(((b as number) - (a as number)) / 60_000);

export const hoursBetween = (a: Instant, b: Instant): number => minutesBetween(a, b) / 60;
