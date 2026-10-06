import { useState } from 'react'
import type { ListTable } from '../lib/data'
import { useLists, options } from '../lib/lists'
import { ItemForm } from './ItemForm'

const NEW = '__new__'

type Item = { id: string; name: string; archived: boolean; emoji?: string }

// A dropdown over one of the user's lists, with "+ Add new…" inline.
export function LookupSelect<T extends Item>({
  table,
  label,
  items,
  value,
  onChange,
  noneLabel,
}: {
  table: ListTable
  label: string
  items: T[]
  value: string | null
  onChange: (id: string | null, item?: T) => void
  noneLabel?: string
}) {
  const { reload } = useLists()
  const [adding, setAdding] = useState(false)

  return (
    <div className="field">
      <span>{label}</span>
      <select
        className="input"
        value={value ?? ''}
        onChange={(e) => {
          const id = e.target.value
          if (id === NEW) return setAdding(true)
          onChange(id || null, items.find((i) => i.id === id))
        }}
      >
        {noneLabel !== undefined && <option value="">{noneLabel}</option>}
        {noneLabel === undefined && !value && <option value="" disabled>Select…</option>}
        {options(items, value).map((i) => (
          <option key={i.id} value={i.id}>
            {i.emoji ? `${i.emoji}  ` : ''}
            {i.name}
          </option>
        ))}
        <option value={NEW}>+ Add new…</option>
      </select>
      {adding && (
        <ItemForm<T>
          table={table}
          onCancel={() => setAdding(false)}
          onSaved={async (item) => {
            setAdding(false)
            await reload()
            onChange(item.id, item)
          }}
        />
      )}
    </div>
  )
}
