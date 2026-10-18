import { useState } from 'react'
import { Badge } from '../components/Badge'
import { Collapsible } from '../components/Collapsible'
import { ExpenseList } from '../components/EntryLists'
import { ErrorNotice } from '../components/ErrorNotice'
import { Freshness } from '../components/Freshness'
import { Sheet } from '../components/Sheet'
import { Totals, type Period } from '../components/Totals'
import { useCached } from '../lib/cache'
import { fetchExpenses } from '../lib/data'
import { daysAgo, formatDay, shiftDays, startOfMonth, today } from '../lib/dates'
import { groupBy, mainAmount, totalsText } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { sumByCurrency } from '../lib/money'
import { recall, remember } from '../lib/remember'
import type { Expense } from '../lib/types'
import { ExpenseForm } from './ExpenseForm'

type PeriodKey = 'today' | 'month' | '30d'
type Breakdown = 'type' | 'feeling' | 'card'

const BREAKDOWN_COLUMN: Record<Breakdown, 'category_id' | 'mood_id' | 'card_id'> = {
  type: 'category_id',
  feeling: 'mood_id',
  card: 'card_id',
}


export function Expenses() {
  const { cards, categories, moods, reload: reloadLists } = useLists()
  const [breakdown, setBreakdownState] = useState(() => recall<Breakdown>('expenses.breakdown', 'type'))
  const [extraDays, setExtraDays] = useState(0) // added by "Show more"
  const [adding, setAdding] = useState(false)

  const starts: Record<PeriodKey, string> = { today: today(), month: startOfMonth(), '30d': daysAgo(29) }
  // List + breakdown cover the last 30 days, reaching back to the 1st on the 31st of a month.
  const base = starts.month < starts['30d'] ? starts.month : starts['30d']
  const listSince = shiftDays(base, -extraDays)
  const { data, updatedAt, loading, error, refresh } = useCached(`expenses.${listSince}`, () => fetchExpenses(listSince))
  const expenses = data ?? []
  const setBreakdown = (b: Breakdown) => {
    remember('expenses.breakdown', b)
    setBreakdownState(b)
  }

  const inPeriod = (key: PeriodKey) => expenses.filter((e) => e.spent_on >= starts[key])
  const total = (rows: Expense[]) => sumByCurrency(rows, (e) => e.amount, (e) => e.currency)

  const periods: Period<PeriodKey>[] = [
    { key: 'today', label: 'Today', totals: total(inPeriod('today')) },
    { key: 'month', label: 'This month', totals: total(inPeriod('month')) },
    { key: '30d', label: 'Last 30 days', totals: total(inPeriod('30d')) },
  ]

  const visible = expenses.filter((e) => e.spent_on >= listSince)

  const breakdownKey = (e: Expense) => e[BREAKDOWN_COLUMN[breakdown]] ?? ''
  const breakdownGroups = groupBy(expenses.filter((e) => e.spent_on >= base), breakdownKey, (e) => e.amount).sort(
    (a, b) => mainAmount(b.totals) - mainAmount(a.totals),
  )

  function groupLabel(id: string) {
    if (breakdown === 'card') return { emoji: '💳', color: undefined, name: byId(cards, id)?.name ?? 'No card' }
    const item = byId(breakdown === 'type' ? categories : moods, id)
    return { emoji: item?.emoji ?? '•', color: item?.color, name: item?.name ?? 'Not set' }
  }

  return (
    <div className="page">
      <div className="page-head sticky-head">
        <h1>Expenses</h1>
        <Freshness updatedAt={updatedAt} loading={loading} onRefresh={() => Promise.all([refresh(), reloadLists()])} />
      </div>

      <Totals periods={periods} />

      <ErrorNotice error={error} onRetry={refresh} />

      {breakdownGroups.length > 0 && (
        <Collapsible id="expenses-breakdown" title="Breakdown">
          <div className="tabs">
            {(['type', 'feeling', 'card'] as Breakdown[]).map((b) => (
              <button key={b} className="tab" aria-pressed={breakdown === b} onClick={() => setBreakdown(b)}>
                By {b}
              </button>
            ))}
          </div>
          <div className="list">
            {breakdownGroups.map((g) => {
              const l = groupLabel(g.key)
              return (
                <a
                  key={g.key}
                  className="row row-link"
                  href={`#/expenses/${BREAKDOWN_COLUMN[breakdown]}/${g.key || 'none'}?from=${base}`}
                >
                  <Badge emoji={l.emoji} color={l.color} />
                  <div className="row-main">
                    <div className="row-title">{l.name}</div>
                    <div className="row-sub">
                      {g.rows.length} {g.rows.length === 1 ? 'expense' : 'expenses'}
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
        <h2>{extraDays ? `Since ${formatDay(listSince)}` : base === starts['30d'] ? 'Last 30 days' : 'This month'}</h2>
        {!data ? (
          <p className="empty">{loading ? 'Loading…' : ''}</p>
        ) : (
          <ExpenseList expenses={visible} emptyText="No expenses in this period." />
        )}
        {data && (
          <button className="btn btn-ghost" onClick={() => setExtraDays(extraDays + 30)} disabled={loading}>
            {loading ? 'Loading…' : 'Show more'}
          </button>
        )}
      </section>

      <button className="fab" aria-label="Add expense" onClick={() => setAdding(true)}>
        +
      </button>

      {adding && (
        <Sheet title="New expense" onClose={() => setAdding(false)}>
          <ExpenseForm onDone={() => setAdding(false)} />
        </Sheet>
      )}
    </div>
  )
}
