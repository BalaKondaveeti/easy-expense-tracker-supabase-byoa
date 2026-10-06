import type { ReactNode } from 'react'
import type { ListTable } from '../lib/data'
import { useLists } from '../lib/lists'
import { Connection } from './Connection'
import { ListManager } from './ListManager'
import { Monthly } from './Monthly'

type Sub = { path: string; title: string }

const LIST_PAGES: (Sub & { table: ListTable })[] = [
  { path: 'cards', title: 'Cards', table: 'cards' },
  { path: 'types', title: 'Expense types', table: 'categories' },
  { path: 'feelings', title: 'Feelings', table: 'moods' },
  { path: 'bills', title: 'Bills', table: 'payees' },
]

const MONTHLY: Sub = { path: 'monthly', title: 'Monthly summary' }
const CONNECTION: Sub = { path: 'connection', title: 'Supabase connection' }

// '#/menu' shows the button list; '#/menu/<path>' shows one section.
export function Menu({
  path,
  email,
  onSignOut,
  onResetConnection,
}: {
  path: string
  email?: string
  onSignOut: () => void
  onResetConnection: () => void
}) {
  const lists = useLists()

  const listPage = LIST_PAGES.find((p) => p.path === path)
  if (listPage) return <SubPage title={listPage.title}><ListManager table={listPage.table} /></SubPage>
  if (path === MONTHLY.path) return <SubPage title={MONTHLY.title}><Monthly /></SubPage>
  if (path === CONNECTION.path)
    return <SubPage title={CONNECTION.title}><Connection onResetConnection={onResetConnection} /></SubPage>

  const active = (table: ListTable) => lists[table].filter((i) => !i.archived).length

  return (
    <div className="page">
      <MenuSection title="Lists">
        {LIST_PAGES.map((p) => (
          <MenuLink key={p.path} href={`#/menu/${p.path}`} label={p.title} detail={String(active(p.table))} />
        ))}
      </MenuSection>
      <MenuSection title="Insights">
        <MenuLink href={`#/menu/${MONTHLY.path}`} label={MONTHLY.title} />
      </MenuSection>
      <MenuSection title="App">
        <MenuLink href={`#/menu/${CONNECTION.path}`} label={CONNECTION.title} />
        <button className="menu-item" onClick={onSignOut}>
          <span className="grow">Sign out</span>
          {email && <span className="menu-detail">{email}</span>}
        </button>
      </MenuSection>
    </div>
  )
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      <div className="menu-group">{children}</div>
    </section>
  )
}

function MenuLink({ href, label, detail }: { href: string; label: string; detail?: string }) {
  return (
    <a className="menu-item" href={href}>
      <span className="grow">{label}</span>
      {detail && <span className="menu-detail">{detail}</span>}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m9 18 6-6-6-6" />
      </svg>
    </a>
  )
}

function SubPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page">
      <div className="subpage-head">
        <a className="back" href="#/menu" aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </a>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  )
}
