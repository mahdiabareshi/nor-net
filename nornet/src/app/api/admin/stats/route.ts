import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/admin/stats?scope=all → آمار؛ scope=users → لیست کاربران با کیف پول
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 })

  if (req.nextUrl.searchParams.get('scope') === 'users') {
    const users = await db.siteUser.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, username: true, role: true, walletBalance: true, createdAt: true },
    })
    return NextResponse.json({
      users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    })
  }

  const agg = await db.transaction.aggregate({ _sum: { amount: true } })
  const purchases = await db.transaction.aggregate({ where: { type: 'purchase' }, _sum: { amount: true }, _count: true })
  const [receiptPending, receiptApproved, receiptRejected, orderDone, orderFailed, userCount] = await Promise.all([
    db.receipt.count({ where: { status: 'pending' } }),
    db.receipt.count({ where: { status: 'approved' } }),
    db.receipt.count({ where: { status: 'rejected' } }),
    db.order.count({ where: { status: 'done' } }),
    db.order.count({ where: { status: 'failed' } }),
    db.siteUser.count(),
  ])
  return NextResponse.json({
    userCount,
    receiptPending,
    receiptApproved,
    receiptRejected,
    orderDone,
    orderFailed,
    totalCharged: agg._sum.amount ?? 0,
    totalPurchase: Math.abs(purchases._sum.amount ?? 0),
    purchaseCount: purchases._count,
  })
}
