import { useState, type FormEvent } from 'react'
import { loadConfig } from '../lib/config'
import { isUnreachable, UNREACHABLE } from '../lib/reach'
import { sb } from '../lib/supabase'
import { ErrorNotice } from './ErrorNotice'

export function Login({ onChangeProject }: { onChangeProject: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await sb().auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await sb().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname },
        })
        if (error) throw error
        if (!data.session) setInfo('Check your email to confirm the account, then sign in.')
      }
    } catch (err) {
      const e = err as Error & { status?: number }
      setError(isUnreachable(e.message, e.status) ? UNREACHABLE : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="centered">
      <form className="narrow form" onSubmit={submit}>
        <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <ErrorNotice error={error} />
        {info && <p className="hint">{info}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'First time? Create an account' : 'Have an account? Sign in'}
        </button>
        <div className="project-switch">
          <span className="hint">Project: {new URL(loadConfig().url).hostname.split('.')[0]}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onChangeProject}>
            Change Supabase project
          </button>
        </div>
      </form>
    </div>
  )
}
