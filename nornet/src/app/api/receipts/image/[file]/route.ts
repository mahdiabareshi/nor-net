import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const RECEIPTS_DIR = path.join(process.cwd(), 'db', 'receipts')

// GET /api/receipts/image/{file} → نمایش عکس رسید (فقط مالک یا ادمین)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ file: string }> }) {
  const session = await getSession()
  if (!session) return new NextResponse('unauthorized', { status: 401 })
  const { file } = await ctx.params
  if (!/^[a-z0-9]+\.(png|jpg|webp)$/i.test(file)) return new NextResponse('bad request', { status: 400 })

  const receipt = await db.receipt.findFirst({ where: { imagePath: file } })
  if (!receipt) return new NextResponse('not found', { status: 404 })
  if (session.role !== 'admin' && receipt.userId !== session.userId) {
    return new NextResponse('forbidden', { status: 403 })
  }

  try {
    const buf = await readFile(path.join(RECEIPTS_DIR, file))
    const type = file.toLowerCase().endsWith('.png') ? 'image/png' : file.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return new NextResponse('not found', { status: 404 })
  }
}
