import type { ReactNode } from 'react'
import type { ListTable } from '../lib/data'
import { CardIcon, ChartIcon, ChevronLeft, ChevronRight, DatabaseIcon, LogOutIcon, ReceiptIcon, SmileIcon, TagIcon } from '../components/Icons'
import { useLists } from '../lib/lists'
import { SERIES_COLORS } from '../lib/palette'
import { Connection } from './Connection'
import { ListManager } from './ListManager'
import { Monthly } from './Monthly'

type Sub = { path: string; title: string; icon: ReactNode; color: string }

const LIST_PAGES: (Sub & { table: ListTable })[] = [
  { path: 'cards', title: 'Cards', table: 'cards', icon: <CardIcon />, color: SERIES_COLORS[0] },
  { path: 'types', title: 'Expense types', table: 'categories', icon: <TagIcon />, color: SERIES_COLORS[1] },
  { path: 'feelings', title: 'Feelings', table: 'moods', icon: <SmileIcon />, color: SERIES_COLORS[4] },
  { path: 'bills', title: 'Bills', table: 'payees', icon: <ReceiptIcon />, color: SERIES_COLORS[2] },
]

const MONTHLY: Sub = { path: 'monthly', title: 'Monthly summary', icon: <ChartIcon />, color: SERIES_COLORS[6] }
const CONNECTION: Sub = { path: 'connection', title: 'Supabase connection', icon: <DatabaseIcon />, color: SERIES_COLORS[5] }

// '#/menu' shows the button list; '#/menu/<path>' shows one section.
export function Menu({
  path,
  email,
  onSignOut,
  onChangeProject,
}: {
  path: string
  email?: string
  onSignOut: () => void
  onChangeProject: () => void
}) {
  const lists = useLists()

  const listPage = LIST_PAGES.find((p) => p.path === path)
  if (listPage) return <SubPage title={listPage.title}><ListManager table={listPage.table} /></SubPage>
  if (path === MONTHLY.path) return <SubPage title={MONTHLY.title}><Monthly /></SubPage>
  if (path === CONNECTION.path)
    return <SubPage title={CONNECTION.title}><Connection onChangeProject={onChangeProject} /></SubPage>

  const active = (table: ListTable) => lists[table].filter((i) => !i.archived).length

  return (
    <div className="page">
      <MenuSection title="Lists">
        {LIST_PAGES.map((p) => (
          <MenuLink key={p.path} sub={p} detail={String(active(p.table))} />
        ))}
      </MenuSection>
      <MenuSection title="Insights">
        <MenuLink sub={MONTHLY} />
      </MenuSection>
      <MenuSection title="App">
        <MenuLink sub={CONNECTION} />
        <button className="menu-item danger" onClick={onSignOut}>
          <MenuIcon icon={<LogOutIcon />} color={SERIES_COLORS[7]} />
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
      <div className="card menu-group">{children}</div>
    </section>
  )
}

// iOS Settings-style colored icon tile
function MenuIcon({ icon, color }: { icon: ReactNode; color: string }) {
  return (
    <span className="menu-icon" style={{ background: color }}>
      {icon}
    </span>
  )
}

function MenuLink({ sub, detail }: { sub: Sub; detail?: string }) {
  return (
    <a className="menu-item" href={`#/menu/${sub.path}`}>
      <MenuIcon icon={sub.icon} color={sub.color} />
      <span className="grow">{sub.title}</span>
      {detail && <span className="menu-detail">{detail}</span>}
      <span className="chevron">
        <ChevronRight />
      </span>
    </a>
  )
}

function SubPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page">
      <div className="subpage-head sticky-head">
        <a className="back" href="#/menu" aria-label="Back">
          <ChevronLeft />
        </a>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  )
}
