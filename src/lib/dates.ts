// All dates are local calendar days as 'YYYY-MM-DD' strings, matching Postgres `date`.

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today() {
  return toISODate(new Date())
}

export function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

// 0 = Sunday. Change to 1 for Monday-start weeks.
export const WEEK_STARTS_ON = 0

export function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() - WEEK_STARTS_ON + 7) % 7))
  return toISODate(d)
}

export function startOfMonth() {
  const d = new Date()
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1))
}

function parse(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shiftDays(iso: string, n: number) {
  const d = parse(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function formatDay(iso: string) {
  if (iso === today()) return 'Today'
  if (iso === daysAgo(1)) return 'Yesterday'
  const d = parse(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

// '2026-10' → 'October 2026'
export function formatMonth(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// First day of the month n months ago, e.g. monthsAgo(11) → start of a 12-month window.
export function monthsAgo(n: number) {
  const d = new Date()
  return toISODate(new Date(d.getFullYear(), d.getMonth() - n, 1))
}
