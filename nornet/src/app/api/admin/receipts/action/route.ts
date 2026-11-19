import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/admin/receipts/action { id, action: 'approve' | 'reject', note? }
// تأیید → شارژ کیف پول + تراکنش  |  رد → فقط ثبت وضعیت رد شده
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const id = String(body?.id || '')
  const action = body?.action === 'approve' ? 'approve' : body?.action === 'reject' ? 'reject' : null
  const note = body?.note ? String(body.note).slice(0, 300) : null
  if (!id || !action) return NextResponse.json({ error: 'پارامترها ناقص است' }, { status: 400 })

  const receipt = await db.receipt.findUnique({ where: { id } })
  if (!receipt) return NextResponse.json({ error: 'رسید یافت نشد' }, { status: 404 })
  if (receipt.status !== 'pending') {
    return NextResponse.json({ error: 'این رسید قبلاً بررسی شده است' }, { status: 409 })
  }

  if (action === 'approve') {
    const updated = await db.siteUser.update({
      where: { id: receipt.userId },
      data: { walletBalance: { increment: receipt.amount } },
    })
    await db.transaction.create({
      data: { userId: receipt.userId, type: 'charge', amount: receipt.amount, note: 'تأیید رسید ' + receipt.id },
    })
    await db.receipt.update({ where: { id }, data: { status: 'approved', adminNote: note, decidedAt: new Date() } })
    return NextResponse.json({ ok: true, message: 'رسید تأیید شد و کیف پول کاربر ' + updated.username + ' شارژ شد.' })
  }

  await db.receipt.update({ where: { id }, data: { status: 'rejected', adminNote: note, decidedAt: new Date() } })
  return NextResponse.json({ ok: true, message: 'رسید رد شد و وضعیت برای کاربر نمایش داده می‌شود.' })
}
