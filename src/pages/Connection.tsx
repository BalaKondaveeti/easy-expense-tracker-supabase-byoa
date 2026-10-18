import { useState } from 'react'
import { isDefaultConfig, loadConfig } from '../lib/config'

function mask(key: string) {
  return key.length > 16 ? `${key.slice(0, 12)}••••••••${key.slice(-4)}` : '••••••••'
}

// Shows the Supabase details saved in this browser.
export function Connection({ onChangeProject }: { onChangeProject: () => void }) {
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
      <p className="hint">
        {isDefaultConfig(config) ? 'This is the default project.' : 'A custom project, saved only in this browser.'}
      </p>
      <button className="btn" onClick={onChangeProject}>
        Change Supabase project
      </button>
      <p className="hint">Changing the project signs you out. Your data stays in Supabase.</p>
    </section>
  )
}
