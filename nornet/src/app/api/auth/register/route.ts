import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, setSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const username = String(body?.username || '').trim().toLowerCase()
    const password = String(body?.password || '')
    if (username.length < 3 || !/^[a-z0-9_.-]+$/.test(username)) {
      return NextResponse.json({ error: 'نام کاربری باید حداقل ۳ حرف و فقط شامل حروف انگلیسی، عدد و . _ - باشد' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ حرف باشد' }, { status: 400 })
    }
    const exists = await db.siteUser.findUnique({ where: { username } })
    if (exists) {
      return NextResponse.json({ error: 'این نام کاربری قبلاً ثبت شده است' }, { status: 409 })
    }
    const user = await db.siteUser.create({
      data: { username, passwordHash: hashPassword(password), role: 'user' },
    })
    await setSession({ userId: user.id, username: user.username, role: user.role })
    return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, role: user.role, walletBalance: user.walletBalance } })
  } catch {
    return NextResponse.json({ error: 'خطای سرور در ثبت‌نام' }, { status: 500 })
  }
}
