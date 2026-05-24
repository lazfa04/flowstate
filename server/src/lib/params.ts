/** First string from an Express `req.query` value. */
export function firstQuery(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return undefined
}

/** Normalize Express `req.params` (Express 5 types may use `string | string[]`). */
export function paramId(v: string | string[] | undefined): string | null {
  const raw = Array.isArray(v) ? v[0] : v
  return typeof raw === 'string' && raw.trim() ? raw : null
}
