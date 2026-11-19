import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calcPrice, getPricing } from '@/lib/pricing'
import { createPanelUser, panelConfigured } from '@/lib/panel'

export const runtime = 'nodejs'

// GET /api/orders → سفارش‌های من
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'ابتدا وارد شوید' }, { status: 401 })
  const orders = await db.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      kind: o.kind,
      gb: o.gb,
      months: o.months,
      devices: o.devices,
      price: o.price,
      panelUsername: o.panelUsername,
      subscriptionUrl: o.subscriptionUrl,
      status: o.status,
      note: o.note,
      createdAt: o.createdAt.toISOString(),
    })),
  })
}

// POST /api/orders → خرید از کیف پول + ساخت خودکار کانفیگ در پنل پاسارگارد
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'ابتدا وارد شوید' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const kind = body?.kind === 'unlimited' ? 'unlimited' : 'volume'
  const gb = Math.round(Number(body?.gb) || 0)
  const months = Math.round(Number(body?.months) || 0)
  const devices = Math.round(Number(body?.devices) || 1)

  if (kind === 'volume' && (gb < 1 || gb > 1000)) {
    return NextResponse.json({ error: 'حجم باید بین ۱ تا ۱۰۰۰ گیگابایت باشد' }, { status: 400 })
  }
  if (months < 1 || months > 12) {
    return NextResponse.json({ error: 'مدت باید بین ۱ تا ۱۲ ماه باشد' }, { status: 400 })
  }
  if (devices < 1 || devices > 20) {
    return NextResponse.json({ error: 'تعداد دستگاه باید بین ۱ تا ۲۰ باشد' }, { status: 400 })
  }

  const pricing = await getPricing()
  const price = calcPrice(kind, gb, months, devices, pricing)
  if (price === null || price <= 0) {
    return NextResponse.json({ error: 'ترکیب انتخابی قابل فروش نیست' }, { status: 400 })
  }

  // برداشت اتمی از کیف پول (شرط: موجودی کافی)
  const updated = await db.siteUser.updateMany({
    where: { id: session.userId, walletBalance: { gte: price } },
    data: { walletBalance: { decrement: price } },
  })
  if (updated.count === 0) {
    return NextResponse.json({ error: 'موجودی کیف پول کافی نیست؛ ابتدا کیف پول را شارژ کنید' }, { status: 402 })
  }

  const order = await db.order.create({
    data: { userId: session.userId, kind, gb: kind === 'volume' ? gb : null, months, devices, price, status: 'creating' },
  })

  // ---- حالت دمو (نسخه رزومه): بدون تماس با پنل واقعی، ساخت شبیه‌سازی‌شده کانفیگ ----
  if (!panelConfigured()) {
    const demoUsername = 'demo_' + order.id.slice(-8)
    const sub = new URL(req.url).origin + '/api/demo-sub/' + order.id
    const done = await db.order.update({
      where: { id: order.id },
      data: { panelUsername: demoUsername, subscriptionUrl: sub, status: 'done' },
    })
    await db.transaction.create({
      data: { userId: session.userId, type: 'purchase', amount: -price, note: 'خرید کانفیگ ' + done.id },
    })
    const balance = (await db.siteUser.findUnique({ where: { id: session.userId } }))?.walletBalance ?? 0
    return NextResponse.json({
      ok: true,
      demo: true,
      order: {
        id: done.id,
        kind: done.kind,
        gb: done.gb,
        months: done.months,
        devices: done.devices,
        price: done.price,
        panelUsername: done.panelUsername,
        subscriptionUrl: done.subscriptionUrl,
        status: done.status,
        createdAt: done.createdAt.toISOString(),
      },
      balance,
    })
  }

  try {
    const panelUser = await createPanelUser({
      gb: kind === 'volume' ? gb : 0, // نامحدود: بدون سقف حجم
      months,
      devices,
      note: 'سایت نورنت — سفارش ' + order.id,
    })
    const sub = panelUser.subscription_url || ''
    const done = await db.order.update({
      where: { id: order.id },
      data: { panelUsername: panelUser.username, subscriptionUrl: sub, status: 'done' },
    })
    await db.transaction.create({
      data: { userId: session.userId, type: 'purchase', amount: -price, note: 'خرید کانفیگ ' + done.id },
    })
    const balance = (await db.siteUser.findUnique({ where: { id: session.userId } }))?.walletBalance ?? 0
    return NextResponse.json({
      ok: true,
      order: {
        id: done.id,
        kind: done.kind,
        gb: done.gb,
        months: done.months,
        devices: done.devices,
        price: done.price,
        panelUsername: done.panelUsername,
        subscriptionUrl: done.subscriptionUrl,
        status: done.status,
        createdAt: done.createdAt.toISOString(),
      },
      balance,
    })
  } catch (e) {
    // خطا در پنل → بازگشت کامل مبلغ به کیف پول
    await db.siteUser.update({ where: { id: session.userId }, data: { walletBalance: { increment: price } } })
    await db.order.update({
      where: { id: order.id },
      data: { status: 'failed', note: e instanceof Error ? e.message : 'panel error' },
    })
    return NextResponse.json({ error: 'ساخت کانفیگ در پنل ناموفق بود؛ مبلغ به کیف پول شما برگشت داده شد.' }, { status: 502 })
  }
}
