import { useState } from 'react'
import { Breakdown, type BreakdownItem } from '../components/Breakdown'
import { Collapsible } from '../components/Collapsible'
import { ExpenseList } from '../components/EntryLists'
import { ErrorNotice } from '../components/ErrorNotice'
import { Freshness } from '../components/Freshness'
import { PlusIcon } from '../components/Icons'
import { Sheet } from '../components/Sheet'
import { Summary } from '../components/Summary'
import { useCached } from '../lib/cache'
import { fetchExpenses } from '../lib/data'
import { daysAgo, formatDay, shiftDays, startOfMonth, today } from '../lib/dates'
import { groupBy, mainAmount } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { sumByCurrency } from '../lib/money'
import { SERIES_COLORS } from '../lib/palette'
import { recall, remember } from '../lib/remember'
import type { Expense } from '../lib/types'
import { ExpenseForm } from './ExpenseForm'

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

  const starts = { today: today(), month: startOfMonth(), '30d': daysAgo(29) }
  // List + breakdown cover the last 30 days, reaching back to the 1st on the 31st of a month.
  const base = starts.month < starts['30d'] ? starts.month : starts['30d']
  const listSince = shiftDays(base, -extraDays)
  const { data, updatedAt, loading, error, refresh } = useCached(`expenses.${listSince}`, () => fetchExpenses(listSince))
  const expenses = data ?? []
  const setBreakdown = (b: Breakdown) => {
    remember('expenses.breakdown', b)
    setBreakdownState(b)
  }

  const totalSince = (since: string) =>
    sumByCurrency(
      expenses.filter((e) => e.spent_on >= since),
      (e) => e.amount,
      (e) => e.currency,
    )

  const visible = expenses.filter((e) => e.spent_on >= listSince)

  const column = BREAKDOWN_COLUMN[breakdown]
  const items: BreakdownItem[] = groupBy(
    expenses.filter((e) => e.spent_on >= base),
    (e: Expense) => e[column] ?? '',
    (e) => e.amount,
  )
    .sort((a, b) => mainAmount(b.totals) - mainAmount(a.totals))
    .map((g) => {
      const label = (() => {
        if (breakdown === 'card') {
          const index = cards.findIndex((c) => c.id === g.key)
          return { emoji: '💳', color: index >= 0 ? SERIES_COLORS[index % SERIES_COLORS.length] : undefined, name: cards[index]?.name ?? 'No card' }
        }
        const item = byId(breakdown === 'type' ? categories : moods, g.key)
        return { emoji: item?.emoji ?? '•', color: item?.color, name: item?.name ?? 'Not set' }
      })()
      return {
        key: g.key,
        ...label,
        sub: `${g.rows.length} ${g.rows.length === 1 ? 'expense' : 'expenses'}`,
        totals: g.totals,
        href: `#/expenses/${column}/${g.key || 'none'}?from=${base}`,
      }
    })

  return (
    <div className="page">
      <div className="page-head sticky-head">
        <h1>Expenses</h1>
        <Freshness updatedAt={updatedAt} loading={loading} onRefresh={() => Promise.all([refresh(), reloadLists()])} />
      </div>

      <Summary
        tone="expenses"
        hero={{ label: 'This month', totals: totalSince(starts.month) }}
        stats={[
          { label: 'Today', totals: totalSince(starts.today) },
          { label: 'Last 30 days', totals: totalSince(starts['30d']) },
        ]}
      />

      <ErrorNotice error={error} onRetry={refresh} />

      {items.length > 0 && (
        <Collapsible id="expenses-breakdown" title="Breakdown">
          <div className="segmented" role="tablist">
            {(['type', 'feeling', 'card'] as Breakdown[]).map((b) => (
              <button key={b} role="tab" aria-selected={breakdown === b} onClick={() => setBreakdown(b)}>
                By {b}
              </button>
            ))}
          </div>
          <Breakdown items={items} />
        </Collapsible>
      )}

      <section className="section">
        <h2>{extraDays ? `Since ${formatDay(listSince)}` : base === starts['30d'] ? 'Last 30 days' : 'This month'}</h2>
        {!data ? (
          <p className="empty">{loading ? 'Loading…' : ''}</p>
        ) : (
          <ExpenseList expenses={visible} emptyText="No expenses yet. Tap + to add one." />
        )}
        {data && (
          <button className="btn btn-ghost" onClick={() => setExtraDays(extraDays + 30)} disabled={loading}>
            {loading ? 'Loading…' : 'Show more'}
          </button>
        )}
      </section>

      <button className="fab" aria-label="Add expense" onClick={() => setAdding(true)}>
        <PlusIcon />
      </button>

      {adding && (
        <Sheet title="New expense" onClose={() => setAdding(false)}>
          <ExpenseForm onDone={() => setAdding(false)} />
        </Sheet>
      )}
    </div>
  )
}
