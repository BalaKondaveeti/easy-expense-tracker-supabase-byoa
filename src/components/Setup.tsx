import { useState, type FormEvent } from 'react'
import { normalizeUrl, saveConfig, verifyConfig } from '../lib/config'

export function Setup({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const config = { url: normalizeUrl(url), key: key.trim() }
    try {
      await verifyConfig(config)
      saveConfig(config)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="centered">
      <form className="narrow form" onSubmit={submit}>
        <h1>Connect Supabase</h1>
        <p className="hint">
          Find these in your Supabase project under Project Settings → API. They are saved only in this browser.
        </p>
        <label className="field">
          <span>Project URL</span>
          <input
            className="input"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            required
          />
        </label>
        <label className="field">
          <span>Publishable (anon) key</span>
          <input
            className="input"
            placeholder="sb_publishable_… or eyJ…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
