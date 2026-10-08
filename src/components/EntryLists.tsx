import { useState, type ReactNode } from 'react'
import { deleteBillPayment, deleteExpense } from '../lib/data'
import { formatDay, formatMonth } from '../lib/dates'
import { groupBy, totalsText } from '../lib/group'
import { byId, useLists } from '../lib/lists'
import { afterCashback, formatMoney } from '../lib/money'
import type { BillPayment, Expense } from '../lib/types'
import { BillForm } from '../pages/BillForm'
import { ExpenseForm } from '../pages/ExpenseForm'
import { Badge } from './Badge'
import { PencilIcon, TrashIcon } from './Icons'
import { Sheet } from './Sheet'
import { SwipeRow } from './SwipeRow'

// Expense and bill-payment lists: tap a row to expand its details, swipe left for Edit / Delete.

async function confirmDelete(what: string, run: () => Promise<void>) {
  if (!confirm(`Delete this ${what}?`)) return
  try {
    await run()
  } catch (err) {
    alert((err as Error).message)
  }
}

function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="details">
      {items
        .filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  )
}

export function ExpenseList({ expenses, emptyText }: { expenses: Expense[]; emptyText: string }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)

  if (expenses.length === 0) return <p className="empty">{emptyText}</p>

  return (
    <>
      <div className="list">
        {groupBy(expenses, (e) => e.spent_on, (e) => e.amount).map((day) => (
          <div key={day.key}>
            <div className="day">
              <span>{formatDay(day.key)}</span>
              <span>{totalsText(day.totals)}</span>
            </div>
            {day.rows.map((e) => (
              <SwipeRow
                key={e.id}
                onTap={() => setExpanded(expanded === e.id ? null : e.id)}
                actions={[
                  { label: 'Edit', icon: <PencilIcon />, onClick: () => setEditing(e) },
                  { label: 'Delete', icon: <TrashIcon />, tone: 'delete', onClick: () => confirmDelete('expense', () => deleteExpense(e.id)) },
                ]}
              >
                <ExpenseRow expense={e} expanded={expanded === e.id} />
              </SwipeRow>
            ))}
          </div>
        ))}
      </div>
      {editing && (
        <Sheet title="Edit expense" onClose={() => setEditing(null)}>
          <ExpenseForm expense={editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </>
  )
}

function ExpenseRow({ expense: e, expanded }: { expense: Expense; expanded: boolean }) {
  const { cards, categories, moods } = useLists()
  const cat = byId(categories, e.category_id)
  const mood = byId(moods, e.mood_id)
  const card = byId(cards, e.card_id)
  const net = afterCashback(e.amount, e.cashback_pct)
  const sub = [card?.name, e.cashback_pct > 0 ? `${formatMoney(net, e.currency)} net` : null, mood?.emoji].filter(Boolean)

  return (
    <div className={`row${expanded ? ' expanded' : ''}`}>
      <Badge emoji={cat?.emoji} color={cat?.color} />
      <div className="row-main">
        <div className="row-title">{e.title}</div>
        {sub.length > 0 && <div className="row-sub">{sub.join(' · ')}</div>}
        {e.note && !expanded && <div className="row-note">{e.note}</div>}
        {expanded && (
          <Details
            items={[
              ['Date', formatDay(e.spent_on)],
              ['Type', cat && `${cat.emoji} ${cat.name}`],
              ['Card', card?.name],
              ['Cashback', e.cashback_pct > 0 && `${e.cashback_pct}% · ${formatMoney(e.amount - net, e.currency)}`],
              ['After cashback', formatMoney(net, e.currency)],
              ['Feeling', mood && `${mood.emoji} ${mood.name}`],
              ['Note', e.note],
            ]}
          />
        )}
      </div>
      <div className="row-amount">{formatMoney(e.amount, e.currency)}</div>
    </div>
  )
}

export function PaymentList({ payments, emptyText }: { payments: BillPayment[]; emptyText: string }) {
  const { cards, payees } = useLists()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<BillPayment | null>(null)

  if (payments.length === 0) return <p className="empty">{emptyText}</p>

  return (
    <>
      <div className="list">
        {groupBy(payments, (p) => p.paid_on.slice(0, 7), (p) => p.amount).map((month) => (
          <div key={month.key}>
            <div className="day">
              <span>{formatMonth(month.key)}</span>
              <span>{totalsText(month.totals)}</span>
            </div>
            {month.rows.map((p) => {
              const payee = byId(payees, p.payee_id)
              const card = byId(cards, p.card_id)
              const open = expanded === p.id
              return (
                <SwipeRow
                  key={p.id}
                  onTap={() => setExpanded(open ? null : p.id)}
                  actions={[
                    { label: 'Edit', icon: <PencilIcon />, onClick: () => setEditing(p) },
                    { label: 'Delete', icon: <TrashIcon />, tone: 'delete', onClick: () => confirmDelete('payment', () => deleteBillPayment(p.id)) },
                  ]}
                >
                  <div className={`row${open ? ' expanded' : ''}`}>
                    <Badge emoji={payee?.emoji} color={payee?.color} />
                    <div className="row-main">
                      <div className="row-title">{payee?.name ?? 'Unknown'}</div>
                      <div className="row-sub">{[formatDay(p.paid_on), card?.name].filter(Boolean).join(' · ')}</div>
                      {p.note && !open && <div className="row-note">{p.note}</div>}
                      {open && (
                        <Details
                          items={[
                            ['Type', payee?.kind],
                            ['Paid on', formatDay(p.paid_on)],
                            ['Paid with', card?.name],
                            ['Note', p.note],
                          ]}
                        />
                      )}
                    </div>
                    <div className="row-amount">{formatMoney(p.amount, p.currency)}</div>
                  </div>
                </SwipeRow>
              )
            })}
          </div>
        ))}
      </div>
      {editing && (
        <Sheet title="Edit payment" onClose={() => setEditing(null)}>
          <BillForm payment={editing} onDone={() => setEditing(null)} />
        </Sheet>
      )}
    </>
  )
}
