import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSession, verifyPassword } from '@/lib/auth'

export const runtime = 'nodejs'

// اطمینان از وجود ادمین پیش‌فرض (اولین اجرا)
async function ensureAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const admin = await db.siteUser.findUnique({ where: { username: adminUsername } })
  if (!admin) {
    await db.siteUser.create({
      data: { username: adminUsername, passwordHash: hashPassword(adminPassword), role: 'admin' },
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureAdmin()
    const body = await req.json().catch(() => null)
    const username = String(body?.username || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const user = await db.siteUser.findUnique({ where: { username } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, { status: 401 })
    }
    await setSession({ userId: user.id, username: user.username, role: user.role })
    return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role, walletBalance: user.walletBalance } })
  } catch {
    return NextResponse.json({ error: 'خطای سرور در ورود' }, { status: 500 })
  }
}
