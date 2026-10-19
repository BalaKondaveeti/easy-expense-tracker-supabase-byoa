import { useState } from 'react'
import { Breakdown, type BreakdownItem } from '../components/Breakdown'
import { Collapsible } from '../components/Collapsible'
import { PaymentList } from '../components/EntryLists'
import { ErrorNotice } from '../components/ErrorNotice'
import { Freshness } from '../components/Freshness'
import { PlusIcon } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { Summary } from '../components/Summary'
import { useCached } from '../lib/cache'
import { fetchBillPayments } from '../lib/data'
import { daysAgo, formatDay, shiftDays, startOfMonth, startOfWeek } from '../lib/dates'
import { groupBy, mainAmount } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { sumByCurrency } from '../lib/money'
import { BillForm } from './BillForm'

export function Bills() {
  const { payees, reload: reloadLists } = useLists()
  const [extraDays, setExtraDays] = useState(0) // added by "Show more"
  const [adding, setAdding] = useState(false)

  const starts = { week: startOfWeek(), month: startOfMonth(), '30d': daysAgo(29) }
  // List + breakdown cover the last 30 days, reaching back to the 1st on the 31st of a month.
  const base = starts.month < starts['30d'] ? starts.month : starts['30d']
  const listSince = shiftDays(base, -extraDays)
  const { data, updatedAt, loading, error, refresh } = useCached(`bills.${listSince}`, () => fetchBillPayments(listSince))
  const payments = data ?? []

  const totalSince = (since: string) =>
    sumByCurrency(
      payments.filter((p) => p.paid_on >= since),
      (p) => p.amount,
      (p) => p.currency,
    )

  const items: BreakdownItem[] = groupBy(
    payments.filter((p) => p.paid_on >= base),
    (p) => p.payee_id,
    (p) => p.amount,
  )
    .sort((a, b) => mainAmount(b.totals) - mainAmount(a.totals))
    .map((g) => {
      const payee = byId(payees, g.key)
      return {
        key: g.key,
        name: payee?.name ?? 'Unknown',
        emoji: payee?.emoji,
        color: payee?.color,
        sub: `${payee?.kind ?? ''} · ${g.rows.length} ${g.rows.length === 1 ? 'payment' : 'payments'}`,
        totals: g.totals,
        href: `#/bills/payee_id/${g.key}?from=${base}`,
      }
    })
  const visible = payments.filter((p) => p.paid_on >= listSince)

  return (
    <div className="page">
      <div className="page-head sticky-head">
        <h1>Bills</h1>
        <Freshness updatedAt={updatedAt} loading={loading} onRefresh={() => Promise.all([refresh(), reloadLists()])} />
      </div>

      <Summary
        tone="bills"
        hero={{ label: 'This month', totals: totalSince(starts.month) }}
        stats={[
          { label: 'This week', totals: totalSince(starts.week) },
          { label: 'Last 30 days', totals: totalSince(starts['30d']) },
        ]}
      />

      <ErrorNotice error={error} onRetry={refresh} />

      {items.length > 0 && (
        <Collapsible id="bills-breakdown" title="By bill">
          <Breakdown items={items} />
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

      <button className="fab fab-bills" aria-label="Pay a bill" onClick={() => setAdding(true)}>
        <PlusIcon />
      </button>

      {adding && (
        <Sheet title="Pay a bill" onClose={() => setAdding(false)}>
          <BillForm onDone={() => setAdding(false)} />
        </Sheet>
      )}
    </div>
  )
}
