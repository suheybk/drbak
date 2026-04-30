/**
 * Time-sortable, URL-safe identifiers (ULID by default).
 * Production adapter wraps `ulid()`; test adapter is a deterministic counter.
 */

export interface IdGenerator {
  generate(): string;
}
