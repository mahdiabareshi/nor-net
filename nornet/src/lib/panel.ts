// PANEL — کانکتور پنل پاسارگارد (PasarGuard v5)
// مستندات عملی: کلید API با هدر X-API-Key ارسال می‌شود (نه Bearer)
// ساخت کاربر: POST /api/user  →  خواندن: /api/user/by-username/{u}  →  حذف: DELETE
//
// ⚠️ نسخه رزومه/دمو: پنل واقعی عمداً غیرفعال است (PANEL_ENABLED=false)
// برای فعال‌سازی اتصال واقعی بعداً در .env:
//   PANEL_ENABLED=true
//   PANEL_URL=https://...
//   PANEL_API_KEY=pg_key_...
// تا آن موقع، خرید کانفیگ به‌صورت «دمو» شبیه‌سازی می‌شود (بدون تماس با پنل)

const PANEL_ENABLED = (process.env.PANEL_ENABLED || '').trim().toLowerCase() === 'true'
const PANEL_URL = (process.env.PANEL_URL || '').replace(/\/+$/, '')
const PANEL_API_KEY = process.env.PANEL_API_KEY || ''
const GROUP_ID = parseInt(process.env.PANEL_GROUP_ID || '1', 10)

export function panelConfigured(): boolean {
  return PANEL_ENABLED && PANEL_URL.length > 0 && PANEL_API_KEY.startsWith('pg_key_')
}

// پنل واقعی عمداً خاموش است (نسخه رزومه)
export function panelDemoMode(): boolean {
  return !PANEL_ENABLED
}

async function panelFetch<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!panelConfigured()) throw new Error('پنل تنظیم نشده است (PANEL_URL / PANEL_API_KEY)')
  const res = await fetch(PANEL_URL + path, {
    ...init,
    headers: {
      'X-API-Key': PANEL_API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* 204 یا پاسخ غیر JSON */
  }
  return { ok: res.ok, status: res.status, data: (data as T) ?? null }
}

export interface PanelUser {
  username: string
  status?: string
  data_limit?: number | null
  expire?: string | null
  hwid_limit?: number | null
  subscription_url?: string | null
  used_traffic?: number
}

const GB = 1024 * 1024 * 1024
const DAY = 86400

// ساخت کاربر جدید در پنل: حجم گیگابایت + مدت ماه + تعداد دستگاه
export async function createPanelUser(opts: { gb: number; months: number; devices: number; note?: string }): Promise<PanelUser> {
  const username = 'nrt' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36)
  const expire = Math.floor(Date.now() / 1000) + Math.max(1, Math.round(opts.months)) * 30 * DAY
  const body: Record<string, unknown> = {
    username,
    data_limit: Math.round(opts.gb) * GB,
    expire,
    status: 'active',
    note: opts.note || 'سایت نورنت',
    group_ids: [GROUP_ID],
    hwid_limit: Math.max(1, Math.round(opts.devices)),
  }
  const { ok, status, data } = await panelFetch<PanelUser & { detail?: string }>('/api/user', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!ok) {
    throw new Error('ساخت کانفیگ در پنل ناموفق بود (' + status + ')')
  }
  return data as PanelUser
}

// خواندن کاربر (شامل subscription_url)
export async function getPanelUser(username: string): Promise<PanelUser | null> {
  const { ok, status, data } = await panelFetch<PanelUser>('/api/user/by-username/' + encodeURIComponent(username))
  if (!ok) {
    if (status === 404) return null
    throw new Error('خواندن کاربر از پنل ناموفق بود (' + status + ')')
  }
  return data
}

export async function deletePanelUser(username: string): Promise<boolean> {
  const { ok } = await panelFetch('/api/user/by-username/' + encodeURIComponent(username), { method: 'DELETE' })
  return ok
}

// تست اتصال پنل (برای صفحه ادمین)
export async function panelPing(): Promise<{ ok: boolean; info?: Record<string, unknown>; error?: string }> {
  try {
    const { ok, data } = await panelFetch<Record<string, unknown>>('/api/system')
    return ok ? { ok: true, info: data ?? undefined } : { ok: false, error: 'unauthorized' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error' }
  }
}
