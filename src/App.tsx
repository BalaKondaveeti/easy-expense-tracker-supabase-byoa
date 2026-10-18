import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { CardIcon, MenuIcon, ReceiptIcon } from './components/Icons'
import { ErrorNotice } from './components/ErrorNotice'
import { Login } from './components/Login'
import { Setup } from './components/Setup'
import { clearCache, setCacheScope, useCached } from './lib/cache'
import { daysAgo } from './lib/dates'
import { fetchLists, seedIfEmpty } from './lib/data'
import { ListsContext } from './lib/lists'
import { initSupabase, sb } from './lib/supabase'
import type { Lists } from './lib/types'
import { Bills } from './pages/Bills'
import { Expenses } from './pages/Expenses'
import { FilteredExpenses, FilteredPayments } from './pages/Filtered'
import { Menu } from './pages/Menu'

const ROUTES = [
  { hash: '#/', label: 'Expenses', icon: <CardIcon />, showLabel: true },
  { hash: '#/bills', label: 'Bills', icon: <ReceiptIcon />, showLabel: true },
  { hash: '#/menu', label: 'Menu', icon: <MenuIcon />, showLabel: false },
]

// Which bottom tab a route belongs to: '#/menu/cards' → menu, '#/bills/payee_id/…' → bills,
// '#/expenses/…' → expenses. Old '#/settings' links land on the menu.
function section(hash: string) {
  if (hash.startsWith('#/menu') || hash === '#/settings') return '#/menu'
  if (hash.startsWith('#/bills')) return '#/bills'
  return '#/'
}

// '#/expenses/category_id/<id>?from=2026-10-01' → ['expenses', 'category_id', '<id>'], from
function parseRoute(hash: string) {
  const [path, query = ''] = hash.slice(1).split('?')
  return { parts: path.split('/').filter(Boolean), from: new URLSearchParams(query).get('from') ?? daysAgo(29) }
}

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash || '#/')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const [clientVersion, setClientVersion] = useState(() => (initSupabase(), 0)) // bumps when the project changes
  const [changingProject, setChangingProject] = useState(false)
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    sb()
      .auth.getSession()
      .then(({ data }) => setSession(data.session))
    const { data } = sb().auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') clearCache()
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [clientVersion])

  // Switching projects signs out first (accounts belong to a project).
  const changeProject = async () => {
    if (session && !confirm('Changing the Supabase project signs you out. Continue?')) return
    if (session) await sb().auth.signOut().catch(() => {})
    clearCache()
    setChangingProject(true)
  }

  const projectChanged = () => {
    initSupabase()
    setSession(undefined)
    setClientVersion((v) => v + 1)
    setChangingProject(false)
  }

  if (changingProject) return <Setup onDone={projectChanged} onCancel={() => setChangingProject(false)} />
  if (session === undefined) return <div className="centered muted">Loading…</div>
  if (!session) return <Login onChangeProject={changeProject} />
  setCacheScope(session.user.id)
  return <Main key={session.user.id} email={session.user.email} onChangeProject={changeProject} />
}

function Main({ email, onChangeProject }: { email?: string; onChangeProject: () => void }) {
  const hash = useHashRoute()
  const {
    data: lists,
    error,
    refresh: reload,
  } = useCached<Lists>('lists', async () => {
    let l = await fetchLists()
    if (await seedIfEmpty(l)) l = await fetchLists()
    return l
  })

  if (error && !lists) {
    return (
      <div className="centered">
        <div className="narrow">
          <ErrorNotice error={error} onRetry={reload} />
          <button className="btn btn-ghost" onClick={() => sb().auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  }
  if (!lists) return <div className="centered muted">Loading…</div>

  return (
    <ListsContext.Provider value={{ ...lists, reload }}>
      <nav className="nav">
        {ROUTES.map((r) => (
          <a
            key={r.hash}
            href={r.hash}
            aria-label={r.label}
            aria-current={section(hash) === r.hash ? 'page' : undefined}
          >
            {r.icon}
            {r.showLabel && <span>{r.label}</span>}
          </a>
        ))}
      </nav>
      <main className="app">
        <Route hash={hash} email={email} onChangeProject={onChangeProject} />
      </main>
    </ListsContext.Provider>
  )
}

function Route({ hash, email, onChangeProject }: { hash: string; email?: string; onChangeProject: () => void }) {
  const { parts, from } = parseRoute(hash)
  if (parts[0] === 'expenses' && parts.length === 3) {
    return <FilteredExpenses key={hash} column={parts[1]} id={parts[2]} from={from} />
  }
  if (parts[0] === 'bills' && parts.length === 3) return <FilteredPayments key={hash} id={parts[2]} from={from} />
  if (parts[0] === 'bills') return <Bills />
  if (section(hash) === '#/menu') {
    return (
      <Menu
        path={parts.slice(1).join('/')}
        email={email}
        onSignOut={() => sb().auth.signOut()}
        onChangeProject={onChangeProject}
      />
    )
  }
  return <Expenses />
}
