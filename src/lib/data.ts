import { invalidateCache } from './cache'
import { sb } from './supabase'
import type { BillPayment, Card, Category, Expense, Lists, Mood, Payee } from './types'

export type ListTable = 'cards' | 'categories' | 'moods' | 'payees'

function check<T>({ data, error }: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (error) {
    // PostgREST "table not found" → the schema hasn't been run yet.
    if (error.code === 'PGRST205' || error.code === '42P01') {
      throw new Error('Database tables are missing. Run supabase/schema.sql in the Supabase SQL Editor, then reload.')
    }
    throw new Error(error.message)
  }
  return data as T
}

// numeric columns can arrive as strings; normalise them.
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

export async function fetchLists(): Promise<Lists> {
  const [cards, categories, moods, payees] = await Promise.all([
    sb().from('cards').select('*').order('created_at'),
    sb().from('categories').select('*').order('created_at'),
    sb().from('moods').select('*').order('created_at'),
    sb().from('payees').select('*').order('name'),
  ])
  return {
    cards: check(cards).map((c: Card) => ({ ...c, default_cashback_pct: Number(c.default_cashback_pct) })),
    categories: check(categories) as Category[],
    moods: check(moods) as Mood[],
    payees: check(payees).map((p: Payee) => ({ ...p, default_amount: num(p.default_amount) })),
  }
}

export async function insertListItem<T>(table: ListTable, values: Record<string, unknown>): Promise<T> {
  const item = check(await sb().from(table).insert(values).select().single()) as T
  invalidateCache()
  return item
}

export async function updateListItem(table: ListTable, id: string, values: Record<string, unknown>) {
  check(await sb().from(table).update(values).eq('id', id))
  invalidateCache()
}

// ---------------------------------------------------------------------------

// PostgREST returns at most 1000 rows per request by default, so long ranges are paged.
const PAGE = 1000

async function fetchAllPages<T>(
  query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const rows = check(await query(from, from + PAGE - 1)) as T[]
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

// Optional single-column filter, e.g. only one category. id null = "not set".
export type Filter = { column: string; id: string | null }

export async function fetchExpenses(since: string, filter?: Filter): Promise<Expense[]> {
  const rows = await fetchAllPages<Expense>((from, to) => {
    let q = sb().from('expenses').select('*').gte('spent_on', since)
    if (filter) q = filter.id ? q.eq(filter.column, filter.id) : q.is(filter.column, null)
    return q.order('spent_on', { ascending: false }).order('created_at', { ascending: false }).range(from, to)
  })
  return rows.map((e) => ({ ...e, amount: Number(e.amount), cashback_pct: Number(e.cashback_pct) }))
}

export async function saveExpense(values: Omit<Expense, 'id'>, id?: string) {
  check(id ? await sb().from('expenses').update(values).eq('id', id) : await sb().from('expenses').insert(values))
  invalidateCache()
}

export async function deleteExpense(id: string) {
  check(await sb().from('expenses').delete().eq('id', id))
  invalidateCache()
}

// ---------------------------------------------------------------------------

export async function fetchBillPayments(since: string, filter?: Filter): Promise<BillPayment[]> {
  const rows = await fetchAllPages<BillPayment>((from, to) => {
    let q = sb().from('bill_payments').select('*').gte('paid_on', since)
    if (filter) q = filter.id ? q.eq(filter.column, filter.id) : q.is(filter.column, null)
    return q.order('paid_on', { ascending: false }).order('created_at', { ascending: false }).range(from, to)
  })
  return rows.map((b) => ({ ...b, amount: Number(b.amount) }))
}

// Slim rows for the monthly summary.
export type MonthlyRow = { date: string; amount: number; currency: string; cashback_pct: number }

export async function fetchMonthlyRows(since: string): Promise<{ expenses: MonthlyRow[]; bills: MonthlyRow[] }> {
  const [expenses, bills] = await Promise.all([
    fetchAllPages<{ spent_on: string; amount: number; currency: string; cashback_pct: number }>((from, to) =>
      sb().from('expenses').select('spent_on, amount, currency, cashback_pct').gte('spent_on', since).order('spent_on').range(from, to),
    ),
    fetchAllPages<{ paid_on: string; amount: number; currency: string }>((from, to) =>
      sb().from('bill_payments').select('paid_on, amount, currency').gte('paid_on', since).order('paid_on').range(from, to),
    ),
  ])
  return {
    expenses: expenses.map((e) => ({ date: e.spent_on, amount: Number(e.amount), currency: e.currency, cashback_pct: Number(e.cashback_pct) })),
    bills: bills.map((b) => ({ date: b.paid_on, amount: Number(b.amount), currency: b.currency, cashback_pct: 0 })),
  }
}

export async function lastPaymentFor(payeeId: string): Promise<BillPayment | null> {
  const rows = check(
    await sb()
      .from('bill_payments')
      .select('*')
      .eq('payee_id', payeeId)
      .order('paid_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
  ) as BillPayment[]
  return rows[0] ? { ...rows[0], amount: Number(rows[0].amount) } : null
}

export async function saveBillPayment(values: Omit<BillPayment, 'id'>, id?: string) {
  check(
    id ? await sb().from('bill_payments').update(values).eq('id', id) : await sb().from('bill_payments').insert(values),
  )
  invalidateCache()
}

export async function deleteBillPayment(id: string) {
  check(await sb().from('bill_payments').delete().eq('id', id))
  invalidateCache()
}

// ---------------------------------------------------------------------------
// First-login starter lists. Only runs when every list is empty.

let seeding: Promise<boolean> | null = null

export function seedIfEmpty(lists: Lists): Promise<boolean> {
  const empty = !lists.cards.length && !lists.categories.length && !lists.moods.length && !lists.payees.length
  if (!empty) return Promise.resolve(false)
  seeding ??= (async () => {
    check(await sb().from('cards').insert([{ name: 'Cash', default_cashback_pct: 0 }]))
    check(
      await sb().from('categories').insert([
        { name: 'Restaurant', emoji: '🍽️', color: '#e07a5f' },
        { name: 'Groceries', emoji: '🛒', color: '#81b29a' },
        { name: 'Clothes', emoji: '👕', color: '#9c89b8' },
        { name: 'Entertainment', emoji: '🎬', color: '#f2cc8f' },
        { name: 'Transport', emoji: '🚗', color: '#5c80bc' },
        { name: 'Shopping', emoji: '🛍️', color: '#d4a5a5' },
        { name: 'Health', emoji: '💊', color: '#6fb1a0' },
        { name: 'Travel', emoji: '✈️', color: '#4ea8de' },
        { name: 'Other', emoji: '📦', color: '#8a8a8a' },
      ]),
    )
    check(
      await sb().from('moods').insert([
        { name: 'Useful', emoji: '✅', color: '#81b29a' },
        { name: 'Worth it', emoji: '😊', color: '#4ea8de' },
        { name: 'Not useful', emoji: '😐', color: '#f2cc8f' },
        { name: 'Waste of money', emoji: '💸', color: '#e07a5f' },
      ]),
    )
    check(
      await sb().from('payees').insert([
        { name: 'Rent', kind: 'Rent', emoji: '🏠', color: '#5c80bc' },
        { name: 'Electricity', kind: 'Utilities', emoji: '💡', color: '#f2cc8f' },
        { name: 'Internet', kind: 'Utilities', emoji: '🌐', color: '#4ea8de' },
        { name: 'Remitly', kind: 'Remittance', emoji: '🌍', color: '#81b29a' },
      ]),
    )
    return true
  })()
  return seeding
}
