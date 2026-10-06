import { useState } from 'react'
import { loadConfig } from '../lib/config'

function mask(key: string) {
  return key.length > 16 ? `${key.slice(0, 12)}••••••••${key.slice(-4)}` : '••••••••'
}

// Shows the Supabase details saved in this browser.
export function Connection({ onResetConnection }: { onResetConnection: () => void }) {
  const config = loadConfig()
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState('')

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      // clipboard blocked; the value is still visible to copy by hand
    }
  }

  if (!config) return null

  return (
    <section className="section">
      <div className="field">
        <span>Project URL</span>
        <div className="inline">
          <code className="input grow mono">{config.url}</code>
          <button className="btn btn-sm" onClick={() => copy('url', config.url)}>
            {copied === 'url' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="field">
        <span>Publishable (anon) key</span>
        <div className="inline">
          <code className="input grow mono">{showKey ? config.key : mask(config.key)}</code>
          <button className="btn btn-sm" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Hide' : 'Show'}
          </button>
          <button className="btn btn-sm" onClick={() => copy('key', config.key)}>
            {copied === 'key' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <p className="hint">Saved only in this browser. Use these to connect another device.</p>
      <button className="btn btn-danger" onClick={onResetConnection}>
        Disconnect Supabase project
      </button>
      <p className="hint">Disconnecting only forgets the details on this device. Your data stays in Supabase.</p>
    </section>
  )
}
