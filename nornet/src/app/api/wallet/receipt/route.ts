import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const RECEIPTS_DIR = path.join(process.cwd(), 'db', 'receipts')
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024 // ۵ مگابایت

// POST /api/wallet/receipt (multipart) — ارسال رسید کارت‌به‌کارت
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'ابتدا وارد شوید' }, { status: 401 })

  try {
    const form = await req.formData()
    const amount = Math.round(Number(form.get('amount')))
    const image = form.get('image')

    if (!Number.isFinite(amount) || amount < 10000) {
      return NextResponse.json({ error: 'مبلغ باید حداقل ۱۰,۰۰۰ تومان باشد' }, { status: 400 })
    }
    if (!image || typeof image === 'string') {
      return NextResponse.json({ error: 'عکس رسید را انتخاب کنید' }, { status: 400 })
    }
    const file = image as File
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'فقط تصویر PNG / JPG / WEBP مجاز است' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'حجم عکس حداکثر ۵ مگابایت' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    await mkdir(RECEIPTS_DIR, { recursive: true })
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const name = 'r' + Date.now().toString(36) + randomBytes(4).toString('hex') + '.' + ext
    await writeFile(path.join(RECEIPTS_DIR, name), buf)

    const receipt = await db.receipt.create({
      data: { userId: session.userId, amount, imagePath: name, status: 'pending' },
    })
    return NextResponse.json({
      ok: true,
      receipt: { id: receipt.id, amount: receipt.amount, status: receipt.status, createdAt: receipt.createdAt.toISOString() },
      message: 'رسید شما ثبت شد و در انتظار تأیید ادمین است.',
    })
  } catch {
    return NextResponse.json({ error: 'خطا در ذخیره رسید' }, { status: 500 })
  }
}
