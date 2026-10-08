// Per-tab UI choices (selected period, breakdown tab) that survive navigating away and back.

export function recall<T extends string>(key: string, fallback: T): T {
  try {
    return (sessionStorage.getItem(`eet.ui.${key}`) as T | null) ?? fallback
  } catch {
    return fallback
  }
}

export function remember(key: string, value: string) {
  try {
    sessionStorage.setItem(`eet.ui.${key}`, value)
  } catch {
    // ignore
  }
}
