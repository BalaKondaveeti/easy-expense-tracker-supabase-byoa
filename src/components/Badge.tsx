import type { CSSProperties } from 'react'

export function Badge({ emoji, color }: { emoji?: string; color?: string }) {
  return (
    <span className="badge" style={{ '--badge-color': color } as CSSProperties} aria-hidden>
      {emoji ?? '•'}
    </span>
  )
}
