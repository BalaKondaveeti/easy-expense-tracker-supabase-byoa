import { useState, type ReactNode } from 'react'

// A section that starts collapsed; the open/closed choice is remembered per browser.
export function Collapsible({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const storageKey = `eet.open.${id}`
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  function toggle() {
    setOpen(!open)
    try {
      localStorage.setItem(storageKey, open ? '0' : '1')
    } catch {
      // ignore: preference just won't persist
    }
  }

  return (
    <section className="section">
      <button className="collapse-toggle" aria-expanded={open} onClick={toggle}>
        <h2>{title}</h2>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && children}
    </section>
  )
}
