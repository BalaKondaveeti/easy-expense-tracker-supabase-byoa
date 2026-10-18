import { useState } from 'react'
import { Badge } from '../components/Badge'
import { Collapsible } from '../components/Collapsible'
import { PaymentList } from '../components/EntryLists'
import { ErrorNotice } from '../components/ErrorNotice'
import { Freshness } from '../components/Freshness'
import { Sheet } from '../components/Sheet'
import { Totals, type Period } from '../components/Totals'
import { useCached } from '../lib/cache'
import { fetchBillPayments } from '../lib/data'
import { daysAgo, formatDay, shiftDays, startOfMonth, startOfWeek } from '../lib/dates'
import { groupBy, mainAmount, totalsText } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { sumByCurrency } from '../lib/money'
import type { BillPayment } from '../lib/types'
import { BillForm } from './BillForm'

type PeriodKey = 'week' | 'month' | '30d'


export function Bills() {
  const { payees, reload: reloadLists } = useLists()
  const [extraDays, setExtraDays] = useState(0) // added by "Show more"
  const [adding, setAdding] = useState(false)

  const starts: Record<PeriodKey, string> = { week: startOfWeek(), month: startOfMonth(), '30d': daysAgo(29) }
  // List + breakdown cover the last 30 days, reaching back to the 1st on the 31st of a month.
  const base = starts.month < starts['30d'] ? starts.month : starts['30d']
  const listSince = shiftDays(base, -extraDays)
  const { data, updatedAt, loading, error, refresh } = useCached(`bills.${listSince}`, () => fetchBillPayments(listSince))
  const payments = data ?? []

  const inPeriod = (key: PeriodKey) => payments.filter((p) => p.paid_on >= starts[key])
  const total = (rows: BillPayment[]) => sumByCurrency(rows, (p) => p.amount, (p) => p.currency)

  const periods: Period<PeriodKey>[] = [
    { key: 'week', label: 'This week', totals: total(inPeriod('week')) },
    { key: 'month', label: 'This month', totals: total(inPeriod('month')) },
    { key: '30d', label: 'Last 30 days', totals: total(inPeriod('30d')) },
  ]

  const byPayee = groupBy(payments.filter((p) => p.paid_on >= base), (p) => p.payee_id, (p) => p.amount).sort(
    (a, b) => mainAmount(b.totals) - mainAmount(a.totals),
  )
  const visible = payments.filter((p) => p.paid_on >= listSince)

  return (
    <div className="page">
      <div className="page-head sticky-head">
        <h1>Bills</h1>
        <Freshness updatedAt={updatedAt} loading={loading} onRefresh={() => Promise.all([refresh(), reloadLists()])} />
      </div>

      <Totals periods={periods} />

      <ErrorNotice error={error} onRetry={refresh} />

      {byPayee.length > 0 && (
        <Collapsible id="bills-breakdown" title="By bill">
          <div className="list">
            {byPayee.map((g) => {
              const payee = byId(payees, g.key)
              return (
                <a key={g.key} className="row row-link" href={`#/bills/payee_id/${g.key}?from=${base}`}>
                  <Badge emoji={payee?.emoji} color={payee?.color} />
                  <div className="row-main">
                    <div className="row-title">{payee?.name ?? 'Unknown'}</div>
                    <div className="row-sub">
                      {payee?.kind} · {g.rows.length} {g.rows.length === 1 ? 'payment' : 'payments'}
                    </div>
                  </div>
                  <div className="row-amount">{totalsText(g.totals)}</div>
                </a>
              )
            })}
          </div>
        </Collapsible>
      )}

      <section className="section">
        <h2>{extraDays ? `Payments since ${formatDay(listSince)}` : 'Payments'}</h2>
        {!data ? (
          <p className="empty">{loading ? 'Loading…' : ''}</p>
        ) : (
          <PaymentList payments={visible} emptyText="No payments yet. Tap + to add one." />
        )}
        {data && (
          <button className="btn btn-ghost" onClick={() => setExtraDays(extraDays + 30)} disabled={loading}>
            {loading ? 'Loading…' : 'Show more'}
          </button>
        )}
      </section>

      <button className="fab" aria-label="Pay a bill" onClick={() => setAdding(true)}>
        +
      </button>

      {adding && (
        <Sheet title="Pay a bill" onClose={() => setAdding(false)}>
          <BillForm onDone={() => setAdding(false)} />
        </Sheet>
      )}
    </div>
  )
}
