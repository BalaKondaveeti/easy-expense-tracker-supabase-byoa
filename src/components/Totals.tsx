import { formatMoney, type Totals as TotalsT } from '../lib/money'

export type Period<K extends string> = { key: K; label: string; totals: TotalsT }

// Summary tiles. With onSelect they are tappable and the selected tile filters the list;
// without it they are display-only.
export function Totals<K extends string>({
  periods,
  selected,
  onSelect,
}: {
  periods: Period<K>[]
  selected?: K
  onSelect?: (key: K) => void
}) {
  return (
    <div className="totals">
      {periods.map((p) => {
        const [[mainCur, mainAmt], ...others] = p.totals
        const content = (
          <>
            <span className="total-label">{p.label}</span>
            <span className="total-value">{formatMoney(mainAmt, mainCur, { compact: true })}</span>
            {others.map(([cur, amt]) => (
              <span key={cur} className="total-extra">
                {formatMoney(amt, cur, { compact: true })}
              </span>
            ))}
          </>
        )
        return onSelect ? (
          <button key={p.key} className="total" aria-pressed={selected === p.key} onClick={() => onSelect(p.key)}>
            {content}
          </button>
        ) : (
          <div key={p.key} className="total static">
            {content}
          </div>
        )
      })}
    </div>
  )
}
