/**
 * Simple request validation helpers. DTOs are validated in route handlers.
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export function requireNumber(value, fieldName, min = undefined, max = undefined) {
  const n = Number(value);
  if (Number.isNaN(n)) throw new ValidationError(`${fieldName} must be a number`);
  if (min !== undefined && n < min) throw new ValidationError(`${fieldName} must be >= ${min}`);
  if (max !== undefined && n > max) throw new ValidationError(`${fieldName} must be <= ${max}`);
  return n;
}

export function requireString(value, fieldName, minLength = 0) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s && minLength > 0) throw new ValidationError(`${fieldName} is required`);
  if (s.length < minLength) throw new ValidationError(`${fieldName} too short`);
  return s;
}
