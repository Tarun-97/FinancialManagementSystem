/* backend/src/utils/pagination.js */

/**
 * Parse and clamp pagination params from arbitrary inputs (e.g., req.query).
 * - Accepts strings or numbers.
 * - Defaults to limit=50, offset=0 if missing/invalid.
 * - Enforces 1 <= limit <= 200 (hard cap).
 * - Enforces offset >= 0.
 * - Returns integers.
 */
export function parsePagination(input = {}) {
  const MAX_LIMIT = 200;
  const DEFAULT_LIMIT = 50;
  const DEFAULT_OFFSET = 0;

  // Read raw values (could be string/number/undefined)
  const rawLimit = input.limit ?? DEFAULT_LIMIT;
  const rawOffset = input.offset ?? DEFAULT_OFFSET;

  // Coerce to numbers
  let l = Number(rawLimit);
  let o = Number(rawOffset);

  // Validate and default
  if (!Number.isFinite(l) || l <= 0) l = DEFAULT_LIMIT;
  if (!Number.isFinite(o) || o < 0) o = DEFAULT_OFFSET;

  // Clamp
  if (l > MAX_LIMIT) l = MAX_LIMIT;

  // Normalize to integers
  l = Math.trunc(l);
  o = Math.trunc(o);

  return { limit: l, offset: o };
}

/**
 * Convenience helper with named intent for handlers.
 * Same behavior as parsePagination, kept for readability.
 */
export function clampPageParams(q) {
  return parsePagination(q);
}
