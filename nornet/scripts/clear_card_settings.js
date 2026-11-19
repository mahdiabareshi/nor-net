// پاک‌کردن اطلاعات کارت از تنظیمات (نسخه رزومه: کارت خالی)
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
;(async () => {
  const r = await db.setting.deleteMany({ where: { key: { in: ['cardNumber', 'cardName', 'cardBank'] } } })
  console.log('deleted card settings:', r.count)
  await db.$disconnect()
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
