import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/wallet → موجودی + تراکنش‌ها + رسیدهای من
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'ابتدا وارد شوید' }, { status: 401 })
  const user = await db.siteUser.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })
  const [transactions, receipts] = await Promise.all([
    db.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.receipt.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ])
  return NextResponse.json({
    balance: user.walletBalance,
    transactions: transactions.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    receipts: receipts.map((r) => ({
      id: r.id,
      amount: r.amount,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
    })),
  })
}
