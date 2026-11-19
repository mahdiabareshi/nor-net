import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET /api/demo-sub/[id] → لینک اشتراک «نمونه» برای حالت دمو (نسخه رزومه)
// هیچ اتصال واقعی وجود ندارد؛ فقط یک محتوای متنی شبیه لینک اشتراک برمی‌گرداند
// تا مسیر خرید در دمو کامل و قابل کلیک باشد.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'demo'
  const demo = {
    v: '2',
    ps: 'Norent DEMO (' + safeId.slice(-8) + ')',
    add: 'demo.norenthost.ir',
    port: '443',
    id: '00000000-0000-0000-0000-000000000000',
    aid: '0',
    net: 'tcp',
    type: 'none',
    host: 'demo.norenthost.ir',
    path: '',
    tls: 'tls',
    sni: 'demo.norenthost.ir',
    scy: 'auto',
  }
  const vmess = 'vmess://' + Buffer.from(JSON.stringify(demo), 'utf8').toString('base64')
  const body = vmess + '\n# نمونهٔ اشتراک — نسخه دمو/رزومه، بدون اتصال واقعی\n'
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="norent-demo-sub"',
      'Cache-Control': 'no-store',
    },
  })
}
