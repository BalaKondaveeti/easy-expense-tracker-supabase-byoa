import { useCallback, useEffect, useRef, useState } from 'react'

// Query results are cached in localStorage per signed-in user. Cached data is shown
// immediately; it is re-fetched when older than MAX_AGE_MS, on manual refresh, and
// after this device saves something.

export const MAX_AGE_MS = 5 * 60 * 1000
const PREFIX = 'eet.cache.'
const PRUNE_AFTER_MS = 3 * 24 * 60 * 60 * 1000 // drop keys unused for 3 days (e.g. old date ranges)

type Entry<T> = { at: number; data: T }

let scope = ''

// Namespaces the cache by user so accounts on a shared browser never see each other's data.
export function setCacheScope(userId: string) {
  scope = userId
}

const fullKey = (key: string) => `${PREFIX}${scope}.${key}`

function readCache<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(fullKey(key))
    return raw ? (JSON.parse(raw) as Entry<T>) : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): Entry<T> {
  const entry = { at: Date.now(), data }
  try {
    localStorage.setItem(fullKey(key), JSON.stringify(entry))
    prune()
  } catch {
    // storage full or blocked: still return the fresh data
  }
  return entry
}

function prune() {
  for (const k of Object.keys(localStorage)) {
    if (!k.startsWith(PREFIX)) continue
    try {
      if (Date.now() - (JSON.parse(localStorage.getItem(k)!) as Entry<unknown>).at > PRUNE_AFTER_MS) {
        localStorage.removeItem(k)
      }
    } catch {
      localStorage.removeItem(k)
    }
  }
}

export function clearCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k)
  } catch {
    // ignore
  }
}

const isStale = (entry: Entry<unknown> | null) => !entry || Date.now() - entry.at > MAX_AGE_MS

export function useCached<T>(key: string, fetcher: () => Promise<T>) {
  const [entry, setEntry] = useState<Entry<T> | null>(() => readCache<T>(key))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setEntry(writeCache(key, await fetcherRef.current()))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [key])

  // New key (e.g. "Show older"): show its cache if any, fetch if missing or stale.
  useEffect(() => {
    const cached = readCache<T>(key)
    setEntry(cached)
    if (isStale(cached)) refresh()
  }, [key, refresh])

  // Auto-refresh once the cache passes 5 minutes, while the app is open or when it comes back to the foreground.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible' && isStale(readCache(key))) refresh()
    }
    const id = setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [key, refresh])

  return { data: entry?.data, updatedAt: entry?.at, loading, error, refresh }
}
