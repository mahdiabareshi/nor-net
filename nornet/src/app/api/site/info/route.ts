import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/site/info → اطلاعات کارت (برای کاربران لاگین‌شده)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'ابتدا وارد شوید' }, { status: 401 })
  const rows = await db.setting.findMany()
  const s: Record<string, string> = {}
  rows.forEach((r) => (s[r.key] = r.value))
  return NextResponse.json({
    cardNumber: s.cardNumber || '',
    cardName: s.cardName || '',
    cardBank: s.cardBank || '',
  })
}
