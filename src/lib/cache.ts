import { useCallback, useEffect, useRef, useState } from 'react'

// Query results are cached in localStorage per signed-in user. Cached data is shown
// immediately; it is re-fetched when older than MAX_AGE_MS, on manual refresh, and
// after every save/delete on this device (see invalidateCache).

export const MAX_AGE_MS = 60 * 60 * 1000
const INVALIDATE_EVENT = 'eet:invalidate'
const PREFIX = 'eet.cache.'
const PRUNE_AFTER_MS = 3 * 24 * 60 * 60 * 1000 // drop keys unused for 3 days (e.g. old date ranges)

type Entry<T> = { at: number; data: T; stale?: boolean }

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

const isStale = (entry: Entry<unknown> | null) => !entry || entry.stale || Date.now() - entry.at > MAX_AGE_MS

// Called after any write: marks every cached query stale (so views not on screen re-fetch
// when opened) and tells mounted views to re-fetch now.
export function invalidateCache() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIX)) continue
      const entry = JSON.parse(localStorage.getItem(k)!) as Entry<unknown>
      localStorage.setItem(k, JSON.stringify({ ...entry, stale: true }))
    }
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(INVALIDATE_EVENT))
}

// One request per key at a time, even if several callers ask at once.
const inflight = new Map<string, Promise<unknown>>()

function fetchOnce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const k = fullKey(key)
  let p = inflight.get(k) as Promise<T> | undefined
  if (!p) {
    p = fetcher().finally(() => inflight.delete(k))
    inflight.set(k, p)
  }
  return p
}

export function useCached<T>(key: string, fetcher: () => Promise<T>) {
  const [entry, setEntry] = useState<Entry<T> | null>(() => readCache<T>(key))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fetcherRef = useRef(fetcher)
  const keyRef = useRef(key)
  useEffect(() => {
    fetcherRef.current = fetcher
    keyRef.current = key
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const fresh = writeCache(key, await fetchOnce(key, () => fetcherRef.current()))
      if (keyRef.current === key) setEntry(fresh) // ignore results for a key we've moved on from
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [key])

  // New key (e.g. "Show more"): show its cache if any (else keep the previous data on
  // screen while loading), and fetch if missing or stale.
  useEffect(() => {
    const cached = readCache<T>(key)
    if (cached) setEntry(cached)
    if (isStale(cached)) refresh()
  }, [key, refresh])

  useEffect(() => {
    const onInvalidate = () => refresh()
    window.addEventListener(INVALIDATE_EVENT, onInvalidate)
    return () => window.removeEventListener(INVALIDATE_EVENT, onInvalidate)
  }, [refresh])

  // Auto-refresh once the cache passes an hour, while the app is open or when it comes back to the foreground.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible' && isStale(readCache(key))) refresh()
    }
    const id = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [key, refresh])

  return { data: entry?.data, updatedAt: entry?.at, loading, error, refresh }
}
