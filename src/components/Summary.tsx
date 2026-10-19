import { formatMoney, type Totals } from '../lib/money'

export type Stat = { label: string; totals: Totals }

function Extra({ totals }: { totals: Totals }) {
  const others = totals.slice(1).filter(([, amt]) => amt !== 0)
  if (!others.length) return null
  return <div className="hero-extra">{others.map(([cur, amt]) => formatMoney(amt, cur, { compact: true })).join(' · ')}</div>
}

// The gradient card at the top of a page: one headline total plus smaller ones. Display only.
export function Summary({ hero, stats, tone }: { hero: Stat; stats: Stat[]; tone: 'expenses' | 'bills' }) {
  const [[cur, amt]] = hero.totals
  return (
    <section className={`hero hero-${tone}`}>
      <div className="hero-label">{hero.label}</div>
      <div className="hero-value">{formatMoney(amt, cur)}</div>
      <Extra totals={hero.totals} />
      <div className="hero-stats">
        {stats.map((s) => {
          const [[c, a]] = s.totals
          return (
            <div key={s.label}>
              <div className="hero-stat-label">{s.label}</div>
              <div className="hero-stat-value">{formatMoney(a, c, { compact: true })}</div>
              <Extra totals={s.totals} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
