import type { CSSProperties } from 'react'
import { totalsText } from '../lib/group'
import type { Totals } from '../lib/money'
import { Badge } from './Badge'
import { ChevronRight } from './Icons'

export type BreakdownItem = {
  key: string
  name: string
  emoji?: string
  color?: string
  sub: string
  totals: Totals
  href: string
}

// Part-to-whole: a stacked bar of each group's share (main currency) and a labeled row per group.
export function Breakdown({ items }: { items: BreakdownItem[] }) {
  const main = (i: BreakdownItem) => Math.max(0, i.totals[0][1])
  const sum = items.reduce((s, i) => s + main(i), 0)

  return (
    <div className="breakdown">
      {sum > 0 && (
        <div className="stack" role="img" aria-label="Share of total by group">
          {items
            .filter((i) => main(i) > 0)
            .map((i) => (
              <span
                key={i.key}
                className="stack-seg"
                title={`${i.name}: ${Math.round((main(i) / sum) * 100)}%`}
                style={{ flexGrow: main(i), '--seg-color': i.color ?? 'var(--muted)' } as CSSProperties}
              />
            ))}
        </div>
      )}
      <div className="breakdown-rows">
        {items.map((i) => (
          <a key={i.key} className="row row-link" href={i.href}>
            <Badge emoji={i.emoji} color={i.color} />
            <div className="row-main">
              <div className="row-title">{i.name}</div>
              <div className="row-sub">
                {sum > 0 && `${Math.round((main(i) / sum) * 100)}% · `}
                {i.sub}
              </div>
            </div>
            <div className="row-amount">{totalsText(i.totals)}</div>
            <span className="chevron">
              <ChevronRight />
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
