import { useEffect, useState } from 'react'

function ago(at: number) {
  const mins = Math.floor((Date.now() - at) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`
}

// "Updated 3m ago ↻" — shows cache age and refreshes on tap.
export function Freshness({ updatedAt, loading, onRefresh }: { updatedAt?: number; loading: boolean; onRefresh: () => void }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <button className="freshness" onClick={onRefresh} disabled={loading} aria-label="Refresh">
      <span>{loading ? 'Refreshing…' : updatedAt ? `Updated ${ago(updatedAt)}` : ''}</span>
      <svg
        className={loading ? 'spin' : undefined}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </button>
  )
}
