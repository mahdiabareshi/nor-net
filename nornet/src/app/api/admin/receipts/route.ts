import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/admin/receipts → رسیدهای در انتظار (و آخرین تصمیم‌ها)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 })
  const status = req.nextUrl.searchParams.get('status') || 'pending'
  const where = status === 'all' ? {} : { status }
  const receipts = await db.receipt.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { username: true } } },
  })
  return NextResponse.json({
    receipts: receipts.map((r) => ({
      id: r.id,
      username: r.user.username,
      amount: r.amount,
      imagePath: r.imagePath,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt.toISOString(),
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    })),
  })
}
