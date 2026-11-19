import { NextResponse } from 'next/server'
import { clearSession, getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null })
  const user = await db.siteUser.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, role: true, walletBalance: true },
  })
  return NextResponse.json({ user: user || null })
}

export async function DELETE() {
  await clearSession()
  return NextResponse.json({ ok: true })
}
