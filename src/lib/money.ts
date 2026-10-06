export const DEFAULT_CURRENCY = 'USD'

export const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN', 'JPY', 'AED', 'SGD', 'CHF', 'CNY']

export function formatMoney(amount: number, currency = DEFAULT_CURRENCY, opts: { compact?: boolean } = {}) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      // compact: drop cents on larger amounts so summary tiles stay readable on phones
      ...(opts.compact && Math.abs(amount) >= 100 ? { maximumFractionDigits: 0 } : {}),
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function afterCashback(amount: number, pct: number) {
  return amount * (1 - pct / 100)
}

// Totals are kept per currency (no FX conversion); the default currency is listed first.
export type Totals = [currency: string, amount: number][]

export function sumByCurrency<T>(rows: T[], amount: (r: T) => number, currency: (r: T) => string): Totals {
  const map = new Map<string, number>()
  for (const r of rows) map.set(currency(r), (map.get(currency(r)) ?? 0) + amount(r))
  if (!map.has(DEFAULT_CURRENCY)) map.set(DEFAULT_CURRENCY, 0)
  return [...map.entries()].sort(([a], [b]) =>
    a === DEFAULT_CURRENCY ? -1 : b === DEFAULT_CURRENCY ? 1 : a.localeCompare(b),
  )
}
