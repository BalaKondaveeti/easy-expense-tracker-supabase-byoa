import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../components/Badge'
import { Sheet } from '../components/Sheet'
import { Totals, type Period } from '../components/Totals'
import { fetchExpenses } from '../lib/data'
import { daysAgo, formatDay, shiftDays, today } from '../lib/dates'
import { groupBy, mainAmount, totalsText } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { afterCashback, formatMoney, sumByCurrency } from '../lib/money'
import type { Expense } from '../lib/types'
import { ExpenseForm } from './ExpenseForm'

type PeriodKey = 'today' | '7d' | '30d'
type Breakdown = 'type' | 'feeling' | 'card'

export function Expenses() {
  const { cards, categories, moods } = useLists()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [since, setSince] = useState(daysAgo(29))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<PeriodKey>('7d')
  const [breakdown, setBreakdown] = useState<Breakdown>('type')
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      setExpenses(await fetchExpenses(since))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [since])

  useEffect(() => {
    load()
  }, [load])

  const starts: Record<PeriodKey, string> = { today: today(), '7d': daysAgo(6), '30d': daysAgo(29) }
  const inPeriod = (key: PeriodKey) => expenses.filter((e) => e.spent_on >= starts[key])
  const total = (rows: Expense[]) => sumByCurrency(rows, (e) => e.amount, (e) => e.currency)

  const periods: Period<PeriodKey>[] = [
    { key: 'today', label: 'Today', totals: total(inPeriod('today')) },
    { key: '7d', label: 'Last 7 days', totals: total(inPeriod('7d')) },
    { key: '30d', label: 'Last 30 days', totals: total(inPeriod('30d')) },
  ]

  // The 30-day view also shows anything older loaded via "Show older".
  const visible = period === '30d' ? expenses : inPeriod(period)
  const days = groupBy(visible, (e) => e.spent_on, (e) => e.amount)

  const breakdownKey = (e: Expense) =>
    (breakdown === 'type' ? e.category_id : breakdown === 'feeling' ? e.mood_id : e.card_id) ?? ''
  const breakdownGroups = groupBy(inPeriod(period), breakdownKey, (e) => e.amount).sort(
    (a, b) => mainAmount(b.totals) - mainAmount(a.totals),
  )

  function groupLabel(id: string) {
    if (breakdown === 'card') return { emoji: '💳', color: undefined, name: byId(cards, id)?.name ?? 'No card' }
    const item = byId(breakdown === 'type' ? categories : moods, id)
    return { emoji: item?.emoji ?? '•', color: item?.color, name: item?.name ?? 'Not set' }
  }

  const close = () => setEditing(null)
  const saved = () => {
    setEditing(null)
    load()
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Expenses</h1>
      </div>

      <Totals periods={periods} selected={period} onSelect={setPeriod} />

      {error && <p className="error">{error}</p>}

      {breakdownGroups.length > 0 && (
        <section className="section">
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
                <div key={g.key} className="row" style={{ cursor: 'default' }}>
                  <Badge emoji={l.emoji} color={l.color} />
                  <div className="row-main">
                    <div className="row-title">{l.name}</div>
                    <div className="row-sub">
                      {g.rows.length} {g.rows.length === 1 ? 'expense' : 'expenses'}
                    </div>
                  </div>
                  <div className="row-amount">{totalsText(g.totals)}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="section">
        <h2>{periods.find((p) => p.key === period)?.label}</h2>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : days.length === 0 ? (
          <p className="empty">No expenses yet. Tap + to add one.</p>
        ) : (
          <div className="list">
            {days.map((day) => (
              <div key={day.key}>
                <div className="day">
                  <span>{formatDay(day.key)}</span>
                  <span>{totalsText(day.totals)}</span>
                </div>
                {day.rows.map((e) => (
                  <ExpenseRow key={e.id} expense={e} onClick={() => setEditing(e)} />
                ))}
              </div>
            ))}
          </div>
        )}
        {period === '30d' && !loading && (
          <button
            className="btn btn-ghost"
            onClick={() => setSince(shiftDays(since, -30))}
          >
            Show older (since {formatDay(since)})
          </button>
        )}
      </section>

      <button className="fab" aria-label="Add expense" onClick={() => setEditing('new')}>
        +
      </button>

      {editing && (
        <Sheet title={editing === 'new' ? 'New expense' : 'Edit expense'} onClose={close}>
          <ExpenseForm expense={editing === 'new' ? undefined : editing} onDone={saved} />
        </Sheet>
      )}
    </div>
  )
}

function ExpenseRow({ expense: e, onClick }: { expense: Expense; onClick: () => void }) {
  const { cards, categories, moods } = useLists()
  const cat = byId(categories, e.category_id)
  const mood = byId(moods, e.mood_id)
  const card = byId(cards, e.card_id)
  const sub = [
    card?.name,
    e.cashback_pct > 0 ? `${formatMoney(afterCashback(e.amount, e.cashback_pct), e.currency)} net` : null,
    mood?.emoji,
  ].filter(Boolean)

  return (
    <button className="row" onClick={onClick}>
      <Badge emoji={cat?.emoji} color={cat?.color} />
      <div className="row-main">
        <div className="row-title">{e.title}</div>
        {sub.length > 0 && <div className="row-sub" title={mood?.name}>{sub.join(' · ')}</div>}
      </div>
      <div className="row-amount">{formatMoney(e.amount, e.currency)}</div>
    </button>
  )
}
