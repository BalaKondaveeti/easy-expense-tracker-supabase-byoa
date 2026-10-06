import { useState } from 'react'
import { Badge } from '../components/Badge'
import { ItemForm } from '../components/ItemForm'
import { updateListItem, type ListTable } from '../lib/data'
import { useLists } from '../lib/lists'
import { formatMoney } from '../lib/money'
import type { Card, Payee } from '../lib/types'

const TABS: { table: ListTable; label: string }[] = [
  { table: 'cards', label: 'Cards' },
  { table: 'categories', label: 'Types' },
  { table: 'moods', label: 'Feelings' },
  { table: 'payees', label: 'Bills' },
]

type AnyItem = { id: string; name: string; archived: boolean; emoji?: string; color?: string }

export function Settings({ email, onSignOut, onResetConnection }: { email?: string; onSignOut: () => void; onResetConnection: () => void }) {
  const lists = useLists()
  const [table, setTable] = useState<ListTable>('cards')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [error, setError] = useState('')
  const items = lists[table] as AnyItem[]

  function subtitle(item: AnyItem) {
    if (table === 'cards') return `${(item as unknown as Card).default_cashback_pct}% default cashback`
    if (table === 'payees') {
      const p = item as unknown as Payee
      return [p.kind, p.default_amount != null ? formatMoney(p.default_amount, p.currency) : null].filter(Boolean).join(' · ')
    }
    return null
  }

  async function toggleArchived(item: AnyItem) {
    try {
      await updateListItem(table, item.id, { archived: !item.archived })
      await lists.reload()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const done = async () => {
    setEditingId(null)
    await lists.reload()
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Settings</h1>
      </div>

      <section className="section">
        <h2>Lists</h2>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.table}
              className="tab"
              aria-pressed={table === t.table}
              onClick={() => {
                setTable(t.table)
                setEditingId(null)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="list">
          {[...items]
            .sort((a, b) => Number(a.archived) - Number(b.archived))
            .map((item) =>
              editingId === item.id ? (
                <ItemForm key={item.id} table={table} initial={item} onSaved={done} onCancel={() => setEditingId(null)} />
              ) : (
                <div key={item.id} className={`manage-row${item.archived ? ' archived' : ''}`}>
                  {table !== 'cards' && <Badge emoji={item.emoji} color={item.color} />}
                  <div className="row-main">
                    <div className="row-title">{item.name}</div>
                    {subtitle(item) && <div className="row-sub">{subtitle(item)}</div>}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(item.id)}>
                    Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleArchived(item)}>
                    {item.archived ? 'Restore' : 'Hide'}
                  </button>
                </div>
              ),
            )}
        </div>
        {editingId === 'new' ? (
          <ItemForm table={table} onSaved={done} onCancel={() => setEditingId(null)} />
        ) : (
          <button className="btn" onClick={() => setEditingId('new')}>
            + Add
          </button>
        )}
        <p className="hint">Hidden items disappear from dropdowns but stay on past records.</p>
      </section>

      <section className="section">
        <h2>Account</h2>
        {email && <p className="small muted">Signed in as {email}</p>}
        <button className="btn" onClick={onSignOut}>
          Sign out
        </button>
        <button className="btn btn-danger" onClick={onResetConnection}>
          Disconnect Supabase project
        </button>
        <p className="hint">Disconnecting only forgets the connection details in this browser. Your data stays in Supabase.</p>
      </section>
    </div>
  )
}
