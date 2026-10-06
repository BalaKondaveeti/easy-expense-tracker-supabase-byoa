import { useState, type FormEvent } from 'react'
import { LookupSelect } from '../components/LookupSelect'
import { deleteBillPayment, lastPaymentFor, saveBillPayment } from '../lib/data'
import { today } from '../lib/dates'
import { useLists } from '../lib/lists'
import { CURRENCIES, DEFAULT_CURRENCY } from '../lib/money'
import type { BillPayment, Payee } from '../lib/types'

// Used both as the always-visible "Pay a bill" form and for editing a past payment.
export function BillForm({ payment, onDone }: { payment?: BillPayment; onDone: () => void }) {
  const { cards, payees } = useLists()
  const blank = {
    payee_id: null as string | null,
    amount: '',
    currency: DEFAULT_CURRENCY,
    paid_on: today(),
    card_id: null as string | null,
    note: '',
  }
  const [v, setV] = useState(() =>
    payment ? { ...payment, amount: String(payment.amount), note: payment.note ?? '' } : blank,
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Picking a bill pre-fills amount / currency / card from the last time it was paid.
  async function pickPayee(id: string | null, payee?: Payee) {
    setV((cur) => ({ ...cur, payee_id: id }))
    if (!id || payment) return
    const last = await lastPaymentFor(id).catch(() => null)
    setV((cur) => ({
      ...cur,
      amount: last ? String(last.amount) : payee?.default_amount != null ? String(payee.default_amount) : '',
      currency: last?.currency ?? payee?.currency ?? DEFAULT_CURRENCY,
      card_id: last?.card_id ?? cur.card_id,
    }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!v.payee_id) return setError('Pick a bill')
    setBusy(true)
    setError('')
    try {
      await saveBillPayment(
        {
          payee_id: v.payee_id,
          amount: Number(v.amount) || 0,
          currency: v.currency,
          paid_on: v.paid_on,
          card_id: v.card_id,
          note: v.note.trim() || null,
        },
        payment?.id,
      )
      if (!payment) setV(blank)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!payment || !confirm('Delete this payment?')) return
    setBusy(true)
    try {
      await deleteBillPayment(payment.id)
      onDone()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <LookupSelect table="payees" label="Bill" items={payees} value={v.payee_id} onChange={pickPayee} />

      {(v.payee_id || payment) && (
        <>
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
                required
              />
              <select className="input" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Paid on</span>
              <input
                className="input"
                type="date"
                value={v.paid_on}
                onChange={(e) => setV({ ...v, paid_on: e.target.value })}
                required
              />
            </label>
            <LookupSelect
              table="cards"
              label="Paid with"
              items={cards}
              value={v.card_id}
              onChange={(id) => setV({ ...v, card_id: id })}
              noneLabel="—"
            />
          </div>
          <label className="field">
            <span>Note</span>
            <input className="input" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={busy}>
            {payment ? 'Save' : 'Mark as paid'}
          </button>
          {payment && (
            <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
              Delete
            </button>
          )}
        </>
      )}
      {!v.payee_id && error && <p className="error">{error}</p>}
    </form>
  )
}
