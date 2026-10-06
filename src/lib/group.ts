import { formatMoney, sumByCurrency, type Totals } from './money'

export type Group<T> = { key: string; rows: T[]; totals: Totals }

// Groups rows by key (keeping first-seen order), with per-currency totals.
export function groupBy<T extends { currency: string }>(
  rows: T[],
  key: (r: T) => string,
  amount: (r: T) => number,
): Group<T>[] {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = key(r)
    map.set(k, [...(map.get(k) ?? []), r])
  }
  return [...map.entries()].map(([k, rs]) => ({ key: k, rows: rs, totals: sumByCurrency(rs, amount, (r) => r.currency) }))
}

// "$12.00 · ₹500.00" — skips zero currencies (but always shows something).
export function totalsText(totals: Totals) {
  const nonZero = totals.filter(([, amt]) => amt !== 0)
  return (nonZero.length ? nonZero : totals.slice(0, 1)).map(([cur, amt]) => formatMoney(amt, cur)).join(' · ')
}

// Main-currency amount, used for sorting breakdowns.
export const mainAmount = (totals: Totals) => totals[0][1]
