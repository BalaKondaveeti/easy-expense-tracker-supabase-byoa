import { useState } from 'react'
import { ErrorNotice } from '../components/ErrorNotice'
import { Freshness } from '../components/Freshness'
import { useCached } from '../lib/cache'
import { fetchMonthlyRows, type MonthlyRow } from '../lib/data'
import { formatMonth, monthsAgo } from '../lib/dates'
import { groupBy, mainAmount, totalsText } from '../lib/group'
import { afterCashback, sumByCurrency } from '../lib/money'

const STEP = 12 // months per "Show older"

// Month-by-month totals. Expenses and bills are listed side by side but never added together.
export function Monthly() {
  const [months, setMonths] = useState(STEP)
  const since = monthsAgo(months - 1)
  const { data, updatedAt, loading, error, refresh } = useCached(`monthly.${since}`, () => fetchMonthlyRows(since))

  const byMonth = (rows: MonthlyRow[]) => new Map(groupBy(rows, (r) => r.date.slice(0, 7), (r) => r.amount).map((g) => [g.key, g]))
  const expenses = byMonth(data?.expenses ?? [])
  const bills = byMonth(data?.bills ?? [])
  const keys = [...new Set([...expenses.keys(), ...bills.keys()])].sort().reverse()
  // One shared scale (main currency) so expense and bill bars compare directly.
  const max = Math.max(1, ...[...expenses.values(), ...bills.values()].map((g) => mainAmount(g.totals)))
  const pct = (g?: { totals: [string, number][] }) => (g ? `${(Math.max(0, mainAmount(g.totals)) / max) * 100}%` : '0%')

  return (
    <section className="section">
      <div className="page-head">
        <span className="hint">Last {months} months</span>
        <Freshness updatedAt={updatedAt} loading={loading} onRefresh={refresh} />
      </div>
      <ErrorNotice error={error} onRetry={refresh} />
      {!data ? (
        <p className="empty">{loading ? 'Loading…' : ''}</p>
      ) : keys.length === 0 ? (
        <p className="empty">Nothing recorded yet.</p>
      ) : (
        <div className="card">
          {keys.map((key) => {
            const e = expenses.get(key)
            const b = bills.get(key)
            const cashback = e && sumByCurrency(e.rows, (r) => r.amount - afterCashback(r.amount, r.cashback_pct), (r) => r.currency)
            const counts = [
              e && `${e.rows.length} ${e.rows.length === 1 ? 'expense' : 'expenses'}`,
              cashback && cashback.some(([, amt]) => amt > 0) && `${totalsText(cashback)} cashback`,
              b && `${b.rows.length} ${b.rows.length === 1 ? 'bill' : 'bills'}`,
            ].filter(Boolean)
            return (
              <div key={key} className="month">
                <div className="month-title">{formatMonth(key)}</div>
                <div className="month-grid">
                  <div>
                    <div className="stat-label">Expenses</div>
                    <div className="month-value">{e ? totalsText(e.totals) : '—'}</div>
                    <div className="meter">
                      <span className="meter-expenses" style={{ width: pct(e) }} />
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Bills</div>
                    <div className="month-value">{b ? totalsText(b.totals) : '—'}</div>
                    <div className="meter">
                      <span className="meter-bills" style={{ width: pct(b) }} />
                    </div>
                  </div>
                </div>
                {counts.length > 0 && <div className="row-sub">{counts.join(' · ')}</div>}
              </div>
            )
          })}
        </div>
      )}
      {data && (
        <button className="btn btn-ghost" onClick={() => setMonths(months + STEP)}>
          Show older
        </button>
      )}
    </section>
  )
}
