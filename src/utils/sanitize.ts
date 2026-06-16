export function cleanDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value === 'null' || value === 'NULL' || value === 'Null') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return null;
}

export function sanitizeTimestamps<T extends Record<string, unknown>>(
  obj: T,
  dateFields: string[],
): T {
  const cleaned = { ...obj };
  for (const field of dateFields) {
    if (field in cleaned) {
      (cleaned as Record<string, unknown>)[field] = cleanDate((cleaned as Record<string, unknown>)[field]);
    }
  }
  return cleaned;
}