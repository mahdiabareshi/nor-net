// ساخت اولیه حساب ادمین — فقط وقتی اجرا کنید که کاربر ادمین وجود ندارد
// استفاده: node scripts/seed-admin.js  (یا با رمز دلخواه: ADMIN_PASSWORD=xxxx node scripts/seed-admin.js)
const { PrismaClient } = require('@prisma/client')
const { scryptSync, randomBytes } = require('crypto')
const db = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return salt + ':' + scryptSync(password, salt, 64).toString('hex')
}

;(async () => {
  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase()
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const exists = await db.siteUser.findUnique({ where: { username } })
  if (exists) {
    console.log('admin already exists:', username, '| role:', exists.role)
    if (exists.role !== 'admin') {
      await db.siteUser.update({ where: { username }, data: { role: 'admin' } })
      console.log('→ promoted to admin')
    }
  } else {
    await db.siteUser.create({ data: { username, passwordHash: hashPassword(password), role: 'admin' } })
    console.log('admin created:', username, '/ password:', password)
    console.log('⚠ برای محیط واقعی بعد از اولین ورود، رمز را عوض کنید.')
  }
  await db.$disconnect()
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
