import { useState } from 'react'
import { Badge } from '../components/Badge'
import { Collapsible } from '../components/Collapsible'
import { ExpenseList } from '../components/EntryLists'
import { Freshness } from '../components/Freshness'
import { Sheet } from '../components/Sheet'
import { Totals, type Period } from '../components/Totals'
import { useCached } from '../lib/cache'
import { fetchExpenses } from '../lib/data'
import { daysAgo, formatDay, shiftDays, today } from '../lib/dates'
import { groupBy, mainAmount, totalsText } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { sumByCurrency } from '../lib/money'
import { recall, remember } from '../lib/remember'
import type { Expense } from '../lib/types'
import { ExpenseForm } from './ExpenseForm'

type PeriodKey = 'today' | '7d' | '30d'
type Breakdown = 'type' | 'feeling' | 'card'

const BREAKDOWN_COLUMN: Record<Breakdown, 'category_id' | 'mood_id' | 'card_id'> = {
  type: 'category_id',
  feeling: 'mood_id',
  card: 'card_id',
}


export function Expenses() {
  const { cards, categories, moods, reload: reloadLists } = useLists()
  const [period, setPeriodState] = useState(() => recall<PeriodKey>('expenses.period', '7d'))
  const [breakdown, setBreakdownState] = useState(() => recall<Breakdown>('expenses.breakdown', 'type'))
  const [extraDays, setExtraDays] = useState(0) // added by "Show more"
  const [adding, setAdding] = useState(false)

  const starts: Record<PeriodKey, string> = { today: today(), '7d': daysAgo(6), '30d': daysAgo(29) }
  const listSince = shiftDays(starts[period], -extraDays)
  const fetchSince = listSince < starts['30d'] ? listSince : starts['30d']
  const { data, updatedAt, loading, error, refresh } = useCached(`expenses.${fetchSince}`, () => fetchExpenses(fetchSince))
  const expenses = data ?? []

  const setPeriod = (p: PeriodKey) => {
    remember('expenses.period', p)
    setPeriodState(p)
    setExtraDays(0)
  }
  const setBreakdown = (b: Breakdown) => {
    remember('expenses.breakdown', b)
    setBreakdownState(b)
  }

  const inPeriod = (key: PeriodKey) => expenses.filter((e) => e.spent_on >= starts[key])
  const total = (rows: Expense[]) => sumByCurrency(rows, (e) => e.amount, (e) => e.currency)

  const periods: Period<PeriodKey>[] = [
    { key: 'today', label: 'Today', totals: total(inPeriod('today')) },
    { key: '7d', label: 'Last 7 days', totals: total(inPeriod('7d')) },
    { key: '30d', label: 'Last 30 days', totals: total(inPeriod('30d')) },
  ]

  const visible = expenses.filter((e) => e.spent_on >= listSince)

  const breakdownKey = (e: Expense) => e[BREAKDOWN_COLUMN[breakdown]] ?? ''
  const breakdownGroups = groupBy(inPeriod(period), breakdownKey, (e) => e.amount).sort(
    (a, b) => mainAmount(b.totals) - mainAmount(a.totals),
  )

  function groupLabel(id: string) {
    if (breakdown === 'card') return { emoji: '💳', color: undefined, name: byId(cards, id)?.name ?? 'No card' }
    const item = byId(breakdown === 'type' ? categories : moods, id)
    return { emoji: item?.emoji ?? '•', color: item?.color, name: item?.name ?? 'Not set' }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Expenses</h1>
        <Freshness updatedAt={updatedAt} loading={loading} onRefresh={() => Promise.all([refresh(), reloadLists()])} />
      </div>

      <Totals periods={periods} selected={period} onSelect={setPeriod} />

      {error && <p className="error">{error}</p>}

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
                  href={`#/expenses/${BREAKDOWN_COLUMN[breakdown]}/${g.key || 'none'}?from=${starts[period]}`}
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
        <h2>{extraDays ? `Since ${formatDay(listSince)}` : periods.find((p) => p.key === period)?.label}</h2>
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
