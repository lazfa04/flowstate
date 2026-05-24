/** Base URL for the FlowState API (no trailing slash). */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '')
  }
  return 'http://localhost:4000'
}

/** Join API base with a path like `/api/auth/login`. Absolute `http(s)://` paths are unchanged. */
export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = getApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export async function api<T>(
  path: string,
  options?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(options?.headers)
  headers.set('Content-Type', 'application/json')
  if (options?.token) headers.set('Authorization', `Bearer ${options.token}`)
  const res = await fetch(resolveApiUrl(path), { ...options, headers })
  if (res.status === 204) return {} as T
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText)
  return data as T
}
