import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { CardIcon, GearIcon, ReceiptIcon } from './components/Icons'
import { Login } from './components/Login'
import { Setup } from './components/Setup'
import { clearCache, setCacheScope, useCached } from './lib/cache'
import { clearConfig } from './lib/config'
import { fetchLists, seedIfEmpty } from './lib/data'
import { ListsContext } from './lib/lists'
import { initSupabase, sb } from './lib/supabase'
import type { Lists } from './lib/types'
import { Bills } from './pages/Bills'
import { Expenses } from './pages/Expenses'
import { Settings } from './pages/Settings'

const ROUTES = [
  { hash: '#/', label: 'Expenses', icon: <CardIcon /> },
  { hash: '#/bills', label: 'Bills', icon: <ReceiptIcon /> },
  { hash: '#/settings', label: 'Settings', icon: <GearIcon /> },
]

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
  const [configured, setConfigured] = useState(() => initSupabase() !== null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!configured) return
    sb()
      .auth.getSession()
      .then(({ data }) => setSession(data.session))
    const { data } = sb().auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') clearCache()
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [configured])

  const resetConnection = async () => {
    if (!confirm('Forget the Supabase connection on this device?')) return
    await sb().auth.signOut().catch(() => {})
    clearConfig()
    clearCache()
    initSupabase()
    setSession(undefined)
    setConfigured(false)
  }

  if (!configured) return <Setup onDone={() => setConfigured(initSupabase() !== null)} />
  if (session === undefined) return <div className="centered muted">Loading…</div>
  if (!session) return <Login onResetConnection={resetConnection} />
  setCacheScope(session.user.id)
  return <Main key={session.user.id} email={session.user.email} onResetConnection={resetConnection} />
}

function Main({ email, onResetConnection }: { email?: string; onResetConnection: () => void }) {
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
          <p className="error">{error}</p>
          <button className="btn" onClick={reload}>
            Retry
          </button>
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
          <a key={r.hash} href={r.hash} aria-current={hash === r.hash ? 'page' : undefined}>
            {r.icon}
            <span>{r.label}</span>
          </a>
        ))}
      </nav>
      <main className="app">
        {hash === '#/bills' ? (
          <Bills />
        ) : hash === '#/settings' ? (
          <Settings email={email} onSignOut={() => sb().auth.signOut()} onResetConnection={onResetConnection} />
        ) : (
          <Expenses />
        )}
      </main>
    </ListsContext.Provider>
  )
}
