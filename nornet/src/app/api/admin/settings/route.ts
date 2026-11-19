import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { panelConfigured, panelPing } from '@/lib/panel'

export const runtime = 'nodejs'

// GET /api/admin/settings → تنظیمات (کارت بانکی + وضعیت پنل + کاربران)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 })

  const rows = await db.setting.findMany()
  const settings: Record<string, string> = {}
  rows.forEach((r) => (settings[r.key] = r.value))

  const [userCount, pendingCount] = await Promise.all([
    db.siteUser.count(),
    db.receipt.count({ where: { status: 'pending' } }),
  ])
  const ping = panelConfigured() ? await panelPing() : null

  return NextResponse.json({
    settings: {
      cardNumber: settings.cardNumber || '',
      cardName: settings.cardName || '',
      cardBank: settings.cardBank || '',
    },
    panel: ping
      ? { configured: ping.ok, demo: false, version: ping.info?.version || null, totalUser: ping.info?.total_user ?? null, error: ping.error || null }
      : { configured: false, demo: true, version: null, totalUser: null, error: null },
    userCount,
    pendingCount,
  })
}

// POST /api/admin/settings { cardNumber, cardName, cardBank }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const pairs: Array<[string, string]> = []
  // خالی‌کردن فیلدها هم پذیرفته می‌شود (ذخیرهٔ مقدار خالی = پاک‌کردن)
  if (typeof body?.cardNumber === 'string') pairs.push(['cardNumber', body.cardNumber.trim().slice(0, 40)])
  if (typeof body?.cardName === 'string') pairs.push(['cardName', body.cardName.trim().slice(0, 60)])
  if (typeof body?.cardBank === 'string') pairs.push(['cardBank', body.cardBank.trim().slice(0, 60)])
  for (const [key, value] of pairs) {
    if (value) {
      await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
    } else {
      await db.setting.deleteMany({ where: { key } })
    }
  }
  return NextResponse.json({ ok: true, message: 'تنظیمات ذخیره شد' })
}
