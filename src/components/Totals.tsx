import { formatMoney, type Totals as TotalsT } from '../lib/money'

export type Period<K extends string> = { key: K; label: string; totals: TotalsT }

// Tappable summary tiles; the selected tile filters the list below it.
export function Totals<K extends string>({
  periods,
  selected,
  onSelect,
}: {
  periods: Period<K>[]
  selected: K
  onSelect: (key: K) => void
}) {
  return (
    <div className="totals">
      {periods.map((p) => {
        const [[mainCur, mainAmt], ...others] = p.totals
        return (
          <button key={p.key} className="total" aria-pressed={selected === p.key} onClick={() => onSelect(p.key)}>
            <span className="total-label">{p.label}</span>
            <span className="total-value">{formatMoney(mainAmt, mainCur, { compact: true })}</span>
            {others.map(([cur, amt]) => (
              <span key={cur} className="total-extra">
                {formatMoney(amt, cur, { compact: true })}
              </span>
            ))}
          </button>
        )
      })}
    </div>
  )
}
