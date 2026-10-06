import { useState } from 'react'
import { Badge } from '../components/Badge'
import { Collapsible } from '../components/Collapsible'
import { Freshness } from '../components/Freshness'
import { Sheet } from '../components/Sheet'
import { Totals, type Period } from '../components/Totals'
import { useCached } from '../lib/cache'
import { fetchBillPayments } from '../lib/data'
import { daysAgo, formatDay, formatMonth, shiftDays, startOfMonth, startOfWeek } from '../lib/dates'
import { groupBy, mainAmount, totalsText } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { formatMoney, sumByCurrency } from '../lib/money'
import type { BillPayment } from '../lib/types'
import { BillForm } from './BillForm'

type PeriodKey = 'week' | 'month' | '30d'

export function Bills() {
  const { cards, payees, reload: reloadLists } = useLists()
  const starts: Record<PeriodKey, string> = { week: startOfWeek(), month: startOfMonth(), '30d': daysAgo(29) }
  const earliest = Object.values(starts).sort()[0]

  const [since, setSince] = useState(earliest)
  const { data, updatedAt, loading, error, refresh } = useCached(`bills.${since}`, () => fetchBillPayments(since))
  const payments = data ?? []
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [editing, setEditing] = useState<BillPayment | null>(null)

  const inPeriod = (key: PeriodKey) => payments.filter((p) => p.paid_on >= starts[key])
  const total = (rows: BillPayment[]) => sumByCurrency(rows, (p) => p.amount, (p) => p.currency)

  const periods: Period<PeriodKey>[] = [
    { key: 'week', label: 'This week', totals: total(inPeriod('week')) },
    { key: 'month', label: 'This month', totals: total(inPeriod('month')) },
    { key: '30d', label: 'Last 30 days', totals: total(inPeriod('30d')) },
  ]

  const byPayee = groupBy(inPeriod(period), (p) => p.payee_id, (p) => p.amount).sort(
    (a, b) => mainAmount(b.totals) - mainAmount(a.totals),
  )
  // The 30-day view also shows anything older loaded via "Show older".
  const visible = period === '30d' ? payments : inPeriod(period)

  const saved = () => {
    setEditing(null)
    refresh()
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Bills</h1>
        <Freshness updatedAt={updatedAt} loading={loading} onRefresh={() => Promise.all([refresh(), reloadLists()])} />
      </div>

      <section className="section">
        <h2>Pay a bill</h2>
        <BillForm onDone={refresh} />
      </section>

      <Totals periods={periods} selected={period} onSelect={setPeriod} />

      {error && <p className="error">{error}</p>}

      {byPayee.length > 0 && (
        <Collapsible id="bills-breakdown" title="By bill">
          <div className="list">
            {byPayee.map((g) => {
              const payee = byId(payees, g.key)
              return (
                <div key={g.key} className="row" style={{ cursor: 'default' }}>
                  <Badge emoji={payee?.emoji} color={payee?.color} />
                  <div className="row-main">
                    <div className="row-title">{payee?.name ?? 'Unknown'}</div>
                    <div className="row-sub">
                      {payee?.kind} · {g.rows.length} {g.rows.length === 1 ? 'payment' : 'payments'}
                    </div>
                  </div>
                  <div className="row-amount">{totalsText(g.totals)}</div>
                </div>
              )
            })}
          </div>
        </Collapsible>
      )}

      <section className="section">
        <h2>Payments</h2>
        {!data ? (
          <p className="empty">{loading ? 'Loading…' : ''}</p>
        ) : visible.length === 0 ? (
          <p className="empty">No payments in this period.</p>
        ) : (
          <div className="list">
            {groupBy(visible, (p) => p.paid_on.slice(0, 7), (p) => p.amount).map((month) => (
              <div key={month.key}>
                <div className="day">
                  <span>{formatMonth(month.key)}</span>
                  <span>{totalsText(month.totals)}</span>
                </div>
                {month.rows.map((p) => {
                  const payee = byId(payees, p.payee_id)
                  const sub = [formatDay(p.paid_on), byId(cards, p.card_id)?.name].filter(Boolean)
                  return (
                    <button key={p.id} className="row" onClick={() => setEditing(p)}>
                      <Badge emoji={payee?.emoji} color={payee?.color} />
                      <div className="row-main">
                        <div className="row-title">{payee?.name ?? 'Unknown'}</div>
                        <div className="row-sub">{sub.join(' · ')}</div>
                        {p.note && <div className="row-note">{p.note}</div>}
                      </div>
                      <div className="row-amount">{formatMoney(p.amount, p.currency)}</div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        {period === '30d' && data && (
          <button className="btn btn-ghost" onClick={() => setSince(shiftDays(since, -30))}>
            Show older (since {formatDay(since)})
          </button>
        )}
      </section>

      {editing && (
        <Sheet title="Edit payment" onClose={() => setEditing(null)}>
          <BillForm payment={editing} onDone={saved} />
        </Sheet>
      )}
    </div>
  )
}
