// Supabase connection details live in this browser only (localStorage),
// so nothing is hardcoded into the build.

export type SupabaseConfig = { url: string; key: string }

const STORAGE_KEY = 'eet.supabase'

export function loadConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SupabaseConfig
    return parsed.url && parsed.key ? parsed : null
  } catch {
    return null
  }
}

export function saveConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY)
}

export function normalizeUrl(input: string) {
  let url = input.trim().replace(/\/+$/, '')
  if (url && !/^https?:\/\//.test(url)) url = `https://${url}`
  return url
}

// Hits the public auth settings endpoint to confirm the URL + key pair works.
export async function verifyConfig({ url, key }: SupabaseConfig) {
  if (/service_role|sb_secret_/.test(key) || keyRole(key) === 'service_role') {
    throw new Error('That is a secret (service_role) key. Use the publishable / anon key instead.')
  }
  let res: Response
  try {
    res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
  } catch {
    throw new Error('Could not reach that URL. Check the Project URL.')
  }
  if (!res.ok) throw new Error('Supabase rejected the key. Check the publishable / anon key.')
}

function keyRole(key: string): string | undefined {
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role
  } catch {
    return undefined
  }
}
