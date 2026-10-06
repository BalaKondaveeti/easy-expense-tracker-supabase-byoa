import { useState } from 'react'
import { insertListItem, updateListItem, type ListTable } from '../lib/data'
import { CURRENCIES, DEFAULT_CURRENCY } from '../lib/money'
import { PAYEE_KINDS } from '../lib/types'

// One form for adding/editing any dropdown list item. Fields depend on the table.
type Values = {
  name: string
  emoji: string
  color: string
  default_cashback_pct: string
  kind: string
  default_amount: string
  currency: string
}

const DEFAULTS: Record<ListTable, Partial<Values>> = {
  cards: { default_cashback_pct: '1' },
  categories: { emoji: '📦', color: '#8a8a8a' },
  moods: { emoji: '🙂', color: '#8a8a8a' },
  payees: { emoji: '🧾', color: '#8a8a8a', kind: 'Other', currency: DEFAULT_CURRENCY },
}

const LIST_LABELS: Record<ListTable, string> = {
  cards: 'Card / account',
  categories: 'Category',
  moods: 'Feeling',
  payees: 'Bill',
}

export function ItemForm<T extends { id: string }>({
  table,
  initial,
  initialName = '',
  onSaved,
  onCancel,
}: {
  table: ListTable
  initial?: Record<string, unknown> & { id: string }
  initialName?: string
  onSaved: (item: T) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<Values>(() => {
    const base = { name: initialName, emoji: '', color: '#8a8a8a', default_cashback_pct: '', kind: '', default_amount: '', currency: DEFAULT_CURRENCY, ...DEFAULTS[table] }
    if (!initial) return base
    const out = { ...base }
    for (const k of Object.keys(base) as (keyof Values)[]) {
      if (initial[k] !== undefined && initial[k] !== null) out[k] = String(initial[k])
    }
    return out
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })

  async function save() {
    if (!v.name.trim()) return setError('Name is required')
    const values: Record<string, unknown> = { name: v.name.trim() }
    if (table === 'cards') values.default_cashback_pct = Number(v.default_cashback_pct) || 0
    if (table !== 'cards') Object.assign(values, { emoji: v.emoji || '•', color: v.color })
    if (table === 'payees') {
      Object.assign(values, {
        kind: v.kind,
        currency: v.currency,
        default_amount: v.default_amount === '' ? null : Number(v.default_amount),
      })
    }
    setBusy(true)
    setError('')
    try {
      if (initial) {
        await updateListItem(table, initial.id, values)
        onSaved({ ...initial, ...values } as unknown as T)
      } else {
        onSaved(await insertListItem<T>(table, values))
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-add">
      <div className="inline">
        {table !== 'cards' && (
          <input className="input" style={{ width: 56, textAlign: 'center' }} value={v.emoji} onChange={set('emoji')} aria-label="Emoji" />
        )}
        <input
          className="input grow"
          placeholder={`${LIST_LABELS[table]} name`}
          value={v.name}
          onChange={set('name')}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), save())}
        />
        {table !== 'cards' && (
          <input className="input input-color" type="color" value={v.color} onChange={set('color')} aria-label="Color" />
        )}
      </div>
      {table === 'cards' && (
        <label className="field">
          <span>Default cashback %</span>
          <input className="input" type="number" inputMode="decimal" step="0.01" min="0" value={v.default_cashback_pct} onChange={set('default_cashback_pct')} />
        </label>
      )}
      {table === 'payees' && (
        <>
          <label className="field">
            <span>Type</span>
            <select className="input" value={v.kind} onChange={set('kind')}>
              {PAYEE_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Usual amount (optional)</span>
            <div className="amount-row">
              <input className="input" type="number" inputMode="decimal" step="0.01" min="0" value={v.default_amount} onChange={set('default_amount')} />
              <select className="input" value={v.currency} onChange={set('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
      <div className="inline">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
          {initial ? 'Save' : 'Add'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
