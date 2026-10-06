import { createContext, useContext } from 'react'
import type { Lists } from './types'

export type ListsCtx = Lists & { reload: () => Promise<void> }

export const ListsContext = createContext<ListsCtx | null>(null)

export function useLists() {
  const ctx = useContext(ListsContext)
  if (!ctx) throw new Error('useLists outside provider')
  return ctx
}

export function byId<T extends { id: string }>(items: T[], id: string | null | undefined) {
  return id ? items.find((i) => i.id === id) : undefined
}

// Dropdown options: active items, plus the currently selected one even if archived.
export function options<T extends { id: string; archived: boolean }>(items: T[], selectedId?: string | null) {
  return items.filter((i) => !i.archived || i.id === selectedId)
}
