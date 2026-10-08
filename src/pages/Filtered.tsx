import { useState, type ReactNode } from 'react'
import { Badge } from '../components/Badge'
import { ExpenseList, PaymentList } from '../components/EntryLists'
import { Freshness } from '../components/Freshness'
import { useCached } from '../lib/cache'
import { fetchBillPayments, fetchExpenses } from '../lib/data'
import { formatDay, monthsAgo, shiftDays } from '../lib/dates'
import { totalsText } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { sumByCurrency } from '../lib/money'

// Pages opened from a breakdown row: only the entries of one category / feeling / card / bill.
// Route: #/expenses/<column>/<id|none>?from=YYYY-MM-DD  or  #/bills/payee_id/<id>?from=...

// Start at the selected period, but always show at least this month and the two before it.
const startFrom = (from: string) => {
  const threeMonths = monthsAgo(2)
  return from < threeMonths ? from : threeMonths
}

function FilteredPage({
  backHref,
  emoji,
  color,
  title,
  since,
  totals,
  freshness,
  onMore,
  loading,
  children,
}: {
  backHref: string
  emoji?: string
  color?: string
  title: string
  since: string
  totals: string
  freshness: ReactNode
  onMore: () => void
  loading: boolean
  children: ReactNode
}) {
  return (
    <div className="page">
      <div className="subpage-head sticky-head">
        <a
          className="back"
          href={backHref}
          aria-label="Back"
          onClick={(e) => {
            if (history.length > 1) {
              e.preventDefault()
              history.back()
            }
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </a>
        <Badge emoji={emoji} color={color} />
        <h1 className="grow">{title}</h1>
      </div>
      <div className="page-head">
        <div>
          <div className="total-label">Since {formatDay(since)}</div>
          <div className="total-value">{totals}</div>
        </div>
        {freshness}
      </div>
      <section className="section">
        {children}
        <button className="btn btn-ghost" onClick={onMore} disabled={loading}>
          {loading ? 'Loading…' : 'Show more'}
        </button>
      </section>
    </div>
  )
}

export function FilteredExpenses({ column, id, from }: { column: string; id: string; from: string }) {
  const { cards, categories, moods } = useLists()
  const [extraDays, setExtraDays] = useState(0)
  const since = shiftDays(startFrom(from), -extraDays)
  const filter = { column, id: id === 'none' ? null : id }
  const { data, updatedAt, loading, error, refresh } = useCached(`expenses.${column}.${id}.${since}`, () =>
    fetchExpenses(since, filter),
  )

  const label =
    column === 'card_id'
      ? { emoji: '💳', color: undefined, name: byId(cards, filter.id)?.name ?? 'No card' }
      : (() => {
          const item = byId(column === 'category_id' ? categories : moods, filter.id)
          return { emoji: item?.emoji ?? '•', color: item?.color, name: item?.name ?? 'Not set' }
        })()

  return (
    <FilteredPage
      backHref="#/"
      emoji={label.emoji}
      color={label.color}
      title={label.name}
      since={since}
      totals={totalsText(sumByCurrency(data ?? [], (e) => e.amount, (e) => e.currency))}
      freshness={<Freshness updatedAt={updatedAt} loading={loading} onRefresh={refresh} />}
      onMore={() => setExtraDays(extraDays + 30)}
      loading={loading}
    >
      {error && <p className="error">{error}</p>}
      {data ? <ExpenseList expenses={data} emptyText="No expenses in this range." /> : <p className="empty">Loading…</p>}
    </FilteredPage>
  )
}

export function FilteredPayments({ id, from }: { id: string; from: string }) {
  const { payees } = useLists()
  const [extraDays, setExtraDays] = useState(0)
  const since = shiftDays(startFrom(from), -extraDays)
  const { data, updatedAt, loading, error, refresh } = useCached(`bills.payee.${id}.${since}`, () =>
    fetchBillPayments(since, { column: 'payee_id', id }),
  )
  const payee = byId(payees, id)

  return (
    <FilteredPage
      backHref="#/bills"
      emoji={payee?.emoji}
      color={payee?.color}
      title={payee?.name ?? 'Bill'}
      since={since}
      totals={totalsText(sumByCurrency(data ?? [], (p) => p.amount, (p) => p.currency))}
      freshness={<Freshness updatedAt={updatedAt} loading={loading} onRefresh={refresh} />}
      onMore={() => setExtraDays(extraDays + 30)}
      loading={loading}
    >
      {error && <p className="error">{error}</p>}
      {data ? <PaymentList payments={data} emptyText="No payments in this range." /> : <p className="empty">Loading…</p>}
    </FilteredPage>
  )
}
