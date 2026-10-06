import { useState, type FormEvent } from 'react'
import { LookupSelect } from '../components/LookupSelect'
import { deleteExpense, saveExpense } from '../lib/data'
import { today } from '../lib/dates'
import { byId, useLists } from '../lib/lists'
import { afterCashback, CURRENCIES, DEFAULT_CURRENCY, formatMoney } from '../lib/money'
import type { Expense } from '../lib/types'

const DEFAULT_CASHBACK = 1
const LAST_KEY = 'eet.lastExpense' // remembers last card + currency for quicker entry

function lastUsed(): { card_id?: string; currency?: string } {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function ExpenseForm({ expense, onDone }: { expense?: Expense; onDone: () => void }) {
  const { cards, categories, moods } = useLists()
  const [v, setV] = useState(() => {
    if (expense) return { ...expense, amount: String(expense.amount), cashback_pct: String(expense.cashback_pct) }
    const last = lastUsed()
    const card = byId(cards, last.card_id)
    return {
      title: '',
      amount: '',
      currency: last.currency ?? DEFAULT_CURRENCY,
      spent_on: today(),
      card_id: card && !card.archived ? card.id : null,
      cashback_pct: String(card && !card.archived ? card.default_cashback_pct : DEFAULT_CASHBACK),
      category_id: null as string | null,
      mood_id: null as string | null,
      note: '',
    }
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const amount = Number(v.amount) || 0
  const pct = Number(v.cashback_pct) || 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await saveExpense(
        {
          title: v.title.trim(),
          amount,
          currency: v.currency,
          spent_on: v.spent_on,
          card_id: v.card_id,
          cashback_pct: pct,
          category_id: v.category_id,
          mood_id: v.mood_id,
          note: v.note?.trim() || null,
        },
        expense?.id,
      )
      localStorage.setItem(LAST_KEY, JSON.stringify({ card_id: v.card_id, currency: v.currency }))
      onDone()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function remove() {
    if (!expense || !confirm('Delete this expense?')) return
    setBusy(true)
    try {
      await deleteExpense(expense.id)
      onDone()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <span>Amount</span>
        <div className="amount-row">
          <input
            className="input input-big"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={v.amount}
            onChange={(e) => setV({ ...v, amount: e.target.value })}
            autoFocus={!expense}
            required
          />
          <select className="input" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="field">
        <span>What was it?</span>
        <input
          className="input"
          placeholder="e.g. Dinner at Olive Garden"
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          required
        />
      </label>

      <LookupSelect
        table="categories"
        label="Type"
        items={categories}
        value={v.category_id}
        onChange={(id) => setV({ ...v, category_id: id })}
      />

      <div className="grid-2">
        <LookupSelect
          table="cards"
          label="Card"
          items={cards}
          value={v.card_id}
          onChange={(id, card) =>
            setV({ ...v, card_id: id, cashback_pct: String(card ? card.default_cashback_pct : v.cashback_pct) })
          }
        />
        <label className="field">
          <span>Cashback %</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            max="100"
            value={v.cashback_pct}
            onChange={(e) => setV({ ...v, cashback_pct: e.target.value })}
          />
        </label>
      </div>
      {amount > 0 && (
        <p className="hint">
          {formatMoney(afterCashback(amount, pct), v.currency)} after {formatMoney(amount - afterCashback(amount, pct), v.currency)} cashback
        </p>
      )}

      <LookupSelect
        table="moods"
        label="How do you feel about it?"
        items={moods}
        value={v.mood_id}
        onChange={(id) => setV({ ...v, mood_id: id })}
        noneLabel="—"
      />

      <label className="field">
        <span>Date</span>
        <input
          className="input"
          type="date"
          value={v.spent_on}
          onChange={(e) => setV({ ...v, spent_on: e.target.value })}
          required
        />
      </label>

      <label className="field">
        <span>Note</span>
        <input className="input" value={v.note ?? ''} onChange={(e) => setV({ ...v, note: e.target.value })} />
      </label>

      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>
        {expense ? 'Save' : 'Add expense'}
      </button>
      {expense && (
        <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
          Delete
        </button>
      )}
    </form>
  )
}
