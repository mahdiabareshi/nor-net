// E2E: نسخه رزومه/دمو — مهمان: خانه پیش‌فرض → ثبت‌نام → رسید → تأیید ادمین → شارژ → خرید دمو
const { chromium } = require('playwright')
const fs = require('fs')

const BASE = 'http://localhost:3000'
const results = []
const ok = (name, pass, info = '') => {
  results.push(pass)
  console.log((pass ? 'PASS' : 'FAIL') + ' | ' + name + (info ? ' | ' + info : ''))
}

// ساخت عکس رسید تستی (PNG کوچک با متن شبیه رسید)
async function makeReceiptPng(path) {
  const sharp = require('sharp')
  const svg = `<svg width="480" height="360" xmlns="http://www.w3.org/2000/svg">
    <rect width="480" height="360" fill="#ffffff"/>
    <rect x="20" y="20" width="440" height="320" fill="#f5f5f5" stroke="#888"/>
    <text x="240" y="80" font-size="26" text-anchor="middle" fill="#111">رسید واریز کارت به کارت</text>
    <text x="240" y="140" font-size="24" text-anchor="middle" fill="#111">مبلغ: ۴۰۰٬۰۰۰ تومان</text>
    <text x="240" y="200" font-size="20" text-anchor="middle" fill="#333">بانک پاسارگاد</text>
    <text x="240" y="260" font-size="18" text-anchor="middle" fill="#555">شماره پیگیری: 123456</text>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(path)
}

;(async () => {
  await makeReceiptPng('/tmp/receipt-test.png')
  const browser = await chromium.launch()
  const errors = []

  const userCtxt = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' })
  const adminCtxt = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' })
  const u = await userCtxt.newPage()
  const a = await adminCtxt.newPage()
  for (const p of [u, a]) {
    p.on('pageerror', e => errors.push('pageerror: ' + e.message))
    p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  }
  u.on('response', r => { const m = r.request().method(); if (m !== 'GET') console.log('U-API:', m, r.url().replace(BASE, ''), '→', r.status()) })
  a.on('response', r => { const m = r.request().method(); if (m !== 'GET') console.log('A-API:', m, r.url().replace(BASE, ''), '→', r.status()) })

  // ---------- ۰) مهمان: باز شدن مستقیم «خانه»، نه صفحه ورود ----------
  await u.goto(BASE); await u.waitForTimeout(1100)
  ok('مهمان: صفحه ورود پیش‌فرض نیست (خانه باز می‌شود)', await u.locator('.auth-card').count() === 0)
  ok('مهمان: تب «خانه» فعال است', await u.locator('#tabHome.on').count() > 0)
  const guestContent = await u.locator('.content').textContent().catch(() => '')
  ok('مهمان: هیرو خوش‌آمد نمایش داده شد', (guestContent || '').includes('خوش آمدید'))
  ok('مهمان: کارت «نسخه نمایشی (رزومه)» هست', (guestContent || '').includes('نسخه نمایشی'))
  ok('مهمان: دکمه «ورود / ثبت‌نام» در نوار بالا', await u.locator('#authEntry').count() > 0)
  ok('مهمان: چیپ موجودی نمایش داده نمی‌شود', await u.locator('.balance-chip').count() === 0)

  // مهمان: کلیک روی تب‌های محافظت‌شده → فرم ورود
  await u.click('#qaBuy'); await u.waitForTimeout(500)
  ok('مهمان: میان‌بر خرید کانفیگ → فرم ورود/ثبت‌نام', await u.locator('.auth-card').count() > 0)
  await u.click('#tabHome'); await u.waitForTimeout(400)
  await u.click('#tabOrders'); await u.waitForTimeout(500)
  ok('مهمان: کلیک تب سفارش‌ها → فرم ورود/ثبت‌نام', await u.locator('.auth-card').count() > 0)

  // ---------- ۱) ثبت‌نام از همان فرم ----------
  const ts = Date.now().toString(36).slice(-5)
  const USERNAME = 'test_' + ts
  await u.click('#tabRegister'); await u.waitForTimeout(300)
  await u.fill('#authUser', USERNAME)
  await u.fill('#authPass', 'secret123')
  await u.click('#authSubmit')
  await u.waitForTimeout(1000)
  ok('ثبت‌نام موفق → ورود به اپ', await u.locator('.topbar').count() > 0, USERNAME)
  ok('پس از ثبت‌نام: همان تب (سفارش‌ها) باز می‌ماند', await u.locator('#tabOrders.on').count() > 0)
  ok('پس از ورود: چیپ موجودی ظاهر شد', await u.locator('.balance-chip').count() > 0)

  // ---------- ۱.۵) خانه برای کاربر لاگین‌شده ----------
  await u.click('#tabHome'); await u.waitForTimeout(500)
  ok('خانه: تب پیش‌فرض پنل = «خانه»', await u.locator('#tabHome.on').count() > 0)
  const heroTxt = await u.locator('.home-hero').textContent().catch(() => '')
  ok('خانه: خوش‌آمد با نام کاربر', (heroTxt || '').includes(USERNAME), (heroTxt || '').slice(0, 70))
  ok('خانه: کارت موجودی کیف پول نمایش داده شد', (heroTxt || '').includes('موجودی کیف پول'))
  ok('خانه: خانه اولین دکمه تب‌هاست', await u.evaluate(() => document.querySelector('.tabs button')?.id === 'tabHome'))
  await u.click('#qaBuy'); await u.waitForTimeout(400)
  ok('خانه: میان‌بر «خرید کانفیگ» → تب خرید', await u.locator('#tabBuy.on').count() > 0)
  await u.click('#tabHome'); await u.waitForTimeout(300)
  await u.click('#qaWallet'); await u.waitForTimeout(400)
  ok('خانه: میان‌بر «شارژ کیف پول» → تب کیف پول', await u.locator('#tabWallet.on').count() > 0)
  await u.click('#tabHome'); await u.waitForTimeout(300)
  await u.click('#qaOrders'); await u.waitForTimeout(400)
  ok('خانه: میان‌بر «سفارش‌های من» → تب سفارش‌ها', await u.locator('#tabOrders.on').count() > 0)
  await u.click('#tabHome'); await u.waitForTimeout(300)

  // ---------- ۲) ادمین: ورود (از حالت مهمان) و تنظیم/پاک‌کردن کارت ----------
  await a.goto(BASE); await a.waitForTimeout(1000)
  ok('ادمین: برای او هم «خانه» پیش‌فرض است', await a.locator('#tabHome.on').count() > 0)
  await a.click('#authEntry'); await a.waitForTimeout(400)
  await a.fill('#authUser', 'admin')
  await a.fill('#authPass', 'admin123')
  await a.click('#authSubmit')
  await a.waitForTimeout(900)
  ok('ورود ادمین', await a.locator('.topbar').count() > 0)
  await a.click('#tabSettings')
  await a.waitForTimeout(800)
  const cardNum = '6037-9975-1234-5678'
  await a.locator('form input').first().fill(cardNum)
  await a.fill('form input >> nth=1', 'فروشگاه نورنت')
  await a.fill('form input >> nth=2', 'سپهر (بانک پاسارگاد)')
  await a.click('button.btn-main')
  await a.waitForTimeout(900)
  // صحت‌سنجی پایدار: رفرش صفحه → مقدار ذخیره‌شده بخوان
  await a.goto(BASE); await a.waitForTimeout(1000)
  await a.click('#tabSettings')
  await a.waitForTimeout(900)
  const savedNum = await a.locator('form input').first().inputValue()
  ok('ادمین: ذخیره تنظیمات کارت (پس از رفرش)', savedNum === cardNum, savedNum)
  // حالا پاک‌کردن کارت (نسخه رزومه: کارت خالی)
  await a.locator('form input').first().fill('')
  await a.fill('form input >> nth=1', '')
  await a.fill('form input >> nth=2', '')
  await a.click('button.btn-main')
  await a.waitForTimeout(800)
  await a.goto(BASE); await a.waitForTimeout(1000)
  await a.click('#tabSettings'); await a.waitForTimeout(900)
  const clearedNum = await a.locator('form input').first().inputValue()
  ok('ادمین: پاک‌کردن اطلاعات کارت ذخیره شد (خالی ماند)', clearedNum === '', 'value="' + clearedNum + '"')
  const adminStats = await a.locator('.content').textContent().catch(() => '')
  ok('ادمین: وضعیت پنل «حالت دمو (غیرفعال)»', (adminStats || '').includes('حالت دمو'), (adminStats || '').slice(0, 120))

  // ---------- ۳) کاربر: کیف پول با کارت خالی + ارسال رسید ----------
  await u.click('#tabWallet')
  await u.waitForTimeout(800)
  const cardShown = await u.evaluate(() => document.querySelector('.cardinfo')?.textContent || '')
  ok('کاربر: کارت خالی → پیام «تنظیم نشده است»', (cardShown || '').includes('تنظیم نشده'), (cardShown || '').slice(0, 80))
  await u.fill('.card form input[dir="ltr"]', '400000')
  await u.locator('input[type="file"]').setInputFiles('/tmp/receipt-test.png')
  await u.waitForTimeout(300)
  await u.click('button.btn-main')
  await u.waitForTimeout(900)
  ok('کاربر: ارسال رسید موفق', await u.getByText('در انتظار بررسی').count() > 0)

  // ---------- ۴) ادمین: تأیید رسید ----------
  await a.click('#tabReceipts')
  await a.waitForTimeout(900)
  const pendingRow = a.locator('.row', { hasText: USERNAME })
  ok('ادمین: رسید در انتظار دیده شد', await pendingRow.count() > 0)
  await a.waitForTimeout(1200)
  const imgOk = await pendingRow.locator('.rcpt-img').evaluate(img => img.complete && img.naturalWidth > 0).catch(() => false)
  ok('ادمین: عکس رسید لود می‌شود (protected image)', imgOk)
  await pendingRow.locator('.btn-ok').click()
  await a.waitForTimeout(900)
  ok('ادمین: تأیید شد (پیام شارژ)', await a.locator('.toastbar.t-ok').count() > 0)

  // ---------- ۵) کاربر: موجودی شارژ شده ----------
  await u.goto(BASE); await u.waitForTimeout(1200) // رفرش کامل → موجودی تازه
  const balanceTxt = await u.locator('.balance-chip').textContent()
  ok('کاربر: کیف پول ۴۰۰٬۰۰۰ شارژ شد', /۴۰۰|400/.test(balanceTxt || ''), balanceTxt?.trim())

  // ---------- ۶) رد رسید: سناریوی دوم ----------
  await u.click('#tabWallet'); await u.waitForTimeout(600)
  await u.locator('input[type="file"]').setInputFiles('/tmp/receipt-test.png')
  await u.fill('.card form input[dir="ltr"]', '50000')
  await u.click('button.btn-main')
  await u.waitForTimeout(800)
  await a.waitForTimeout(600)
  // تب را عوض کن تا رسید جدید از سرور لود شود
  await a.click('#tabSettings'); await a.waitForTimeout(600)
  await a.click('#tabReceipts'); await a.waitForTimeout(900)
  const row2 = a.locator('.row', { hasText: USERNAME }).first()
  await row2.locator('.btn-err').first().click()
  await a.waitForTimeout(400)
  await row2.locator('.reject-box input').fill('عکس رسید واضح نیست')
  await row2.locator('.reject-box .btn-err').click()
  await a.waitForTimeout(800)
  await u.goto(BASE); await u.waitForTimeout(1500) // رفرش → خانه
  await u.click('#tabWallet'); await u.waitForTimeout(700)
  const rejectVisible = await u.getByText('رد شده').count() > 0 && await u.getByText('عکس رسید واضح نیست').count() > 0
  ok('کاربر: وضعیت «رد شده» + دلیل نمایش داده شد', rejectVisible)

  // ---------- ۷) خرید کانفیگ — حالت دمو (بدون پنل واقعی) ----------
  await u.click('#tabBuy')
  await u.waitForTimeout(600)
  // حجمی پیش‌فرض 50GB/2mo/2dev → 350000 (باید موفق شود؛ موجودی 400k)
  const priceShown = await u.locator('.pricebox b').textContent()
  ok('قیمت لحظه‌ای 50GB/2mo/2dev = ۳۵۰٬۰۰۰', /۳۵۰|350/.test(priceShown || ''), priceShown?.trim())
  await u.click('button.btn-main')
  await u.waitForTimeout(2500)
  const resultText = await u.locator('.resultbox').textContent().catch(() => '')
  const subText = await u.locator('.resultbox .sublink').textContent().catch(() => '')
  ok('خرید دمو موفق + لینک اشتراک نمونه ساخته شد', /\/api\/demo-sub\//.test(subText || ''), (subText || '').slice(0, 90))
  ok('نام کاربری دمو (demo_) در نتیجه', (resultText || '').includes('demo_'))
  const subResp = await u.request.get(subText || '').catch(() => null)
  const subBody = subResp ? await subResp.text() : ''
  ok('لینک اشتراک دمو پاسخ 200 + محتوای vmess', !!subResp && subResp.status() === 200 && /vmess:\/\//.test(subBody), 'status=' + (subResp ? subResp.status() : 'ERR'))
  const balAfter = await u.locator('.balance-chip').textContent()
  ok('موجودی بعد از خرید = ۵۰٬۰۰۰', /۵۰|50/.test(balAfter || ''), balAfter?.trim())

  // ---------- ۸) خطای موجودی ناکافی ----------
  await u.locator('.card input[dir="ltr"]').last().fill('200')
  await u.waitForTimeout(300)
  await u.click('button.btn-main')
  await u.waitForTimeout(1200)
  ok('موجودی ناکافی → پیام خطا', await u.locator('.toastbar.t-err').count() > 0)

  // ---------- ۹) سفارش‌های من ----------
  await u.click('#tabOrders')
  await u.waitForTimeout(700)
  ok('سفارش در لیست با وضعیت «آماده»', await u.getByText('آماده').count() > 0)

  // ---------- ۱۰) خروج → بازگشت به خانه مهمان ----------
  await u.click('text=خروج')
  await u.waitForTimeout(900)
  ok('خروج: خانه مهمان دوباره پیش‌فرض است', await u.locator('#tabHome.on').count() > 0 && await u.locator('.auth-card').count() === 0)

  const realErrors = errors.filter(e => !/Failed to load resource.*40[23]/.test(e))
  ok('صفر خطای واقعی Console/PageError (خطای 402 موجودی ناکافی عمدی بود)', realErrors.length === 0, realErrors.slice(0, 3).join(' ; '))

  await browser.close()
  const fails = results.filter(x => !x).length
  console.log('\nTOTAL: ' + results.length + ' | FAIL: ' + fails)
  process.exit(fails ? 1 : 0)
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(2) })
