import { useState, type FormEvent } from 'react'
import { sb } from '../lib/supabase'

export function Login({ onResetConnection }: { onResetConnection: () => void }) {
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
      setError((err as Error).message)
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
        {error && <p className="error">{error}</p>}
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
        <button type="button" className="btn btn-ghost small" onClick={onResetConnection}>
          Use a different Supabase project
        </button>
      </form>
    </div>
  )
}
