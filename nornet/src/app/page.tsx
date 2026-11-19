'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

/* ===================== انواع و ثوابت ===================== */
interface Me { id: string; username: string; role: string; walletBalance: number }
interface Tx { id: string; type: string; amount: number; note?: string | null; createdAt: string }
interface Rcpt { id: string; amount: number; status: string; adminNote?: string | null; createdAt: string }
interface Ord { id: string; kind: string; gb?: number | null; months: number; devices: number; price: number; panelUsername?: string | null; subscriptionUrl?: string | null; status: string; note?: string | null; createdAt: string }
interface ARcpt { id: string; username: string; amount: number; imagePath: string; status: string; adminNote?: string | null; createdAt: string }
interface CardInfo { cardNumber: string; cardName: string; cardBank: string }
interface AStats { userCount: number; receiptPending: number; receiptApproved: number; receiptRejected: number; orderDone: number; orderFailed: number; totalCharged: number; totalPurchase: number }

const UNL_PRICES: Record<number, number> = { 1: 250000, 2: 450000, 3: 650000, 6: 1200000, 12: 2200000 }
function rateFor(m: number) { return m === 1 ? 5000 : m === 2 ? 7000 : 10000 }
function calcPrice(kind: 'volume' | 'unlimited', gb: number, months: number, devices: number): number | null {
  const extra = Math.max(0, devices - 3) * 1000
  if (kind === 'volume') return gb * rateFor(months) + extra
  const base = UNL_PRICES[months]
  return base ? base + extra : null
}
const fa = (n: number) => n.toLocaleString('fa-IR')

// تب‌های پنل؛ «خانه» تب اول و پیش‌فرض است
type TabId = 'home' | 'wallet' | 'buy' | 'orders' | 'receipts' | 'settings'

/* ===================== اجزای کوچک ===================== */
function Toast({ msg, kind }: { msg: string; kind: 'ok' | 'err' }) {
  return (
    <div className={`toastbar ${kind === 'ok' ? 't-ok' : 't-err'}`} role="status">
      {msg}
    </div>
  )
}
function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button className="mini-btn" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) } catch { /* noop */ }
    }} aria-label="کپی">{done ? '✓ کپی شد' : (label || 'کپی')}</button>
  )
}
function Stepper({ value, setValue, min = 1, max = 20 }: { value: number; setValue: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper" dir="ltr">
      <button className="step-btn" onClick={() => setValue(Math.max(min, value - 1))} aria-label="کاهش">−</button>
      <span className="step-val">{fa(value)}</span>
      <button className="step-btn" onClick={() => setValue(Math.min(max, value + 1))} aria-label="افزایش">+</button>
    </div>
  )
}
const STATUS_FA: Record<string, string> = { pending: 'در انتظار بررسی', approved: 'تأیید شده', rejected: 'رد شده', done: 'آماده', creating: 'در حال ساخت', failed: 'ناموفق' }
function Badge({ s }: { s: string }) {
  const cls = s === 'approved' || s === 'done' ? 'b-ok' : s === 'rejected' || s === 'failed' ? 'b-err' : 'b-wait'
  return <span className={`badge ${cls}`}>{STATUS_FA[s] || s}</span>
}

/* ===================== صفحه اصلی ===================== */
export default function Home() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('home')
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const say = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMe(d.user)).catch(() => setMe(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <main className="wrap"><div className="loader" /></main>
  // مهمان هم مستقیم به «خانه» می‌رود (پیش‌فرض)، نه صفحه ورود
  return <App me={me} setMe={setMe} tab={tab} setTab={setTab} say={say} toast={toast} />
}

/* ===================== ورود / ثبت‌نام ===================== */
function AuthScreen({ onAuth, say }: { onAuth: (u: Me) => void; say: (m: string, k?: 'ok' | 'err') => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/auth/' + mode, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'خطا'); return }
      onAuth(data.user)
    } catch { setErr('خطای ارتباط با سرور') } finally { setBusy(false) }
  }

  return (
    <main className="wrap">
      <div className="auth-card">
        <div className="brand"><span className="logo">⚡</span> نورنت <small>حساب کاربری و کیف پول</small></div>
        <div className="seg">
          <button id="tabLogin" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>ورود</button>
          <button id="tabRegister" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr('') }}>ثبت‌نام</button>
        </div>
        <form onSubmit={submit}>
          <label>نام کاربری (انگلیسی)</label>
          <input id="authUser" dir="ltr" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" autoComplete="username" required />
          <label>رمز عبور</label>
          <input id="authPass" dir="ltr" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          {err && <div className="ferr">{err}</div>}
          <button className="btn-main" id="authSubmit" disabled={busy}>{busy ? '...' : mode === 'login' ? 'ورود به حساب' : 'ساخت حساب جدید'}</button>
        </form>
        <p className="hint">نسخه آزمایشی — اطلاعات شما فقط روی سرور تست ذخیره می‌شود.</p>
      </div>
    </main>
  )
}

/* ===================== اپ اصلی (مهمان + کاربر) ===================== */
function App({ me, setMe, tab, setTab, say, toast }: { me: Me | null; setMe: Dispatch<SetStateAction<Me | null>>; tab: TabId; setTab: (t: TabId) => void; say: (m: string, k?: 'ok' | 'err') => void; toast: { msg: string; kind: 'ok' | 'err' } | null }) {
  const isAdmin = !!me && me.role === 'admin'
  const [authOpen, setAuthOpen] = useState(false)
  // مهمان: هر تب غیر از «خانه» یا کلیک روی «ورود/ثبت‌نام» → فرم ورود/ثبت‌نام
  const showAuth = !me && (authOpen || tab !== 'home')

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setMe(null)
    setAuthOpen(false)
    setTab('home')
  }
  function onAuth(u: Me) {
    setMe(u)
    setAuthOpen(false)
    say('خوش آمدید ' + u.username)
  }

  return (
    <div className="shell">
      {toast && <Toast msg={toast.msg} kind={toast.kind} />}
      <header className="topbar">
        <div className="brand"><span className="logo">⚡</span> نورنت <small>حساب کاربری</small></div>
        <div className="top-left">
          {me ? (
            <>
              <span className="balance-chip">کیف پول: <b>{fa(me.walletBalance)}</b> تومان</span>
              <span className="user-chip">{me.username}</span>
              <button className="mini-btn" onClick={logout}>خروج</button>
            </>
          ) : (
            <button id="authEntry" className="mini-btn auth-entry" onClick={() => setAuthOpen(true)}>ورود / ثبت‌نام</button>
          )}
        </div>
      </header>
      <nav className="tabs">
        <button id="tabHome" className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}>خانه</button>
        <button id="tabWallet" className={tab === 'wallet' ? 'on' : ''} onClick={() => setTab('wallet')}>کیف پول</button>
        <button id="tabBuy" className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>خرید کانفیگ</button>
        <button id="tabOrders" className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>سفارش‌های من</button>
        {isAdmin && <button id="tabReceipts" className={tab === 'receipts' ? 'on' : ''} onClick={() => setTab('receipts')}>رسیدها (ادمین)</button>}
        {isAdmin && <button id="tabSettings" className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>تنظیمات (ادمین)</button>}
      </nav>
      <main className="content">
        {showAuth && <AuthScreen onAuth={onAuth} say={say} />}
        {!showAuth && (
          <>
            {tab === 'home' && <HomeTab me={me} setTab={setTab} onNeedAuth={() => setAuthOpen(true)} />}
            {tab === 'wallet' && me && <WalletTab me={me} setMe={setMe as unknown as Dispatch<SetStateAction<Me>>} say={say} />}
            {tab === 'buy' && me && <BuyTab me={me} setMe={setMe as unknown as Dispatch<SetStateAction<Me>>} say={say} />}
            {tab === 'orders' && me && <OrdersTab say={say} />}
            {isAdmin && tab === 'receipts' && <AdminReceipts say={say} />}
            {isAdmin && tab === 'settings' && <AdminSettings say={say} />}
          </>
        )}
      </main>
      <footer className="foot">نورنت — نسخه نمایشی (رزومه) · حالت دمو، بدون اتصال به پنل واقعی</footer>
    </div>
  )
}

/* ===================== خانه (تب پیش‌فرض — مهمان و کاربر) ===================== */
function HomeTab({ me, setTab, onNeedAuth }: { me: Me | null; setTab: (t: TabId) => void; onNeedAuth: () => void }) {
  const [orders, setOrders] = useState<Ord[]>([])
  const [receipts, setReceipts] = useState<Rcpt[]>([])
  const guest = !me

  useEffect(() => {
    if (!me) { setOrders([]); setReceipts([]); return }
    void (async () => {
      const o = await fetch('/api/orders').then(r => r.json()).catch(() => ({ orders: [] }))
      setOrders(o.orders || [])
      const w = await fetch('/api/wallet').then(r => r.json()).catch(() => null)
      if (w) setReceipts(w.receipts || [])
    })()
  }, [me])

  const pendingReceipts = receipts.filter(r => r.status === 'pending').length
  const latest = orders[0] || null // سفارش‌ها بر اساس تاریخ نزولی می‌آیند

  return (
    <div className="home-col">
      <section className="card wide home-hero">
        <div className="hero-main">
          {guest ? (
            <>
              <h2>به نورنت خوش آمدید 👋</h2>
              <p className="sub">این نسخه، دموی پروژه «فروش کانفیگ با ساخت خودکار» است. بگردید و ببینید؛ برای تجربهٔ کامل (شارژ کیف پول، خرید و تحویل لینک اشتراک) حساب بسازید — چند ثانیه بیشتر طول نمی‌کشد.</p>
            </>
          ) : (
            <>
              <h2>سلام {me?.username} 👋</h2>
              <p className="sub">به حساب کاربری نورنت خوش آمدید. از همین‌جا می‌توانید کانفیگ بخرید (ساخت خودکار و آنی)، کیف پول را کارت‌به‌کارت شارژ کنید و سفارش‌ها و لینک اشتراک‌هایتان را مدیریت کنید.</p>
            </>
          )}
          <div className="qa-grid">
            <button id="qaBuy" className="qa" onClick={() => setTab('buy')}>
              <span className="qa-ico">⚡</span>
              <b>خرید کانفیگ</b>
              <small>ساخت خودکار و آنی</small>
            </button>
            <button id="qaWallet" className="qa" onClick={() => setTab('wallet')}>
              <span className="qa-ico">💳</span>
              <b>شارژ کیف پول</b>
              <small>کارت‌به‌کارت + ارسال رسید</small>
            </button>
            <button id="qaOrders" className="qa" onClick={() => setTab('orders')}>
              <span className="qa-ico">🗂️</span>
              <b>سفارش‌های من</b>
              <small>لینک اشتراک‌ها</small>
            </button>
          </div>
        </div>
        <div className="home-side">
          <div className="stat big"><b>{guest ? '—' : fa(me?.walletBalance ?? 0)}</b><span>{guest ? 'موجودی کیف پول' : 'تومان موجودی کیف پول'}</span></div>
          <div className="stat"><b>{guest ? '—' : fa(orders.length)}</b><span>{guest ? 'سفارش‌های شما' : 'سفارش ثبت‌شده'}</span></div>
          <div className="stat"><b>{guest ? '—' : fa(pendingReceipts)}</b><span>{guest ? 'رسیدهای شما' : 'رسید در انتظار بررسی'}</span></div>
        </div>
      </section>
      {guest && (
        <section className="card wide">
          <h2>نسخه نمایشی (رزومه) 🚀</h2>
          <p className="sub">مسیر کامل پروژه این است: ثبت‌نام ← شارژ کیف پول با کارت‌به‌کارت و تأیید رسید توسط ادمین ← خرید کانفیگ و ساخت خودکار و تحویل لینک اشتراک. این دمو بدون اتصال به پنل واقعی اجرا می‌شود و خریدها شبیه‌سازی می‌شوند.</p>
          <button className="btn-main auth-cta" onClick={onNeedAuth}>ورود / ثبت‌نام برای تجربهٔ کامل</button>
        </section>
      )}
      {!guest && latest && (
        <section className="card wide">
          <h2>آخرین کانفیگ شما</h2>
          {latest.status === 'done' && latest.subscriptionUrl ? (
            <>
              <div className="ci-row"><span>مشخصات</span><b>{latest.kind === 'volume' ? fa(latest.gb || 0) + ' گیگ' : 'نامحدود'} / {fa(latest.months)} ماه / {fa(latest.devices)} دستگاه</b></div>
              <div className="ci-row col"><span>لینک اشتراک</span><div className="sublink" dir="ltr">{latest.subscriptionUrl}</div><CopyBtn text={latest.subscriptionUrl} label="کپی لینک اشتراک" /></div>
              <p className="sub">این لینک را در برنامه (v2rayNG، NekoBox، Streisand و...) با گزینه «Import from clipboard» وارد کنید.</p>
            </>
          ) : (
            <p className="sub">وضعیت آخرین سفارش: <Badge s={latest.status} /></p>
          )}
          <button className="mini-btn" onClick={() => setTab('orders')}>مشاهده همه سفارش‌ها</button>
        </section>
      )}
      {!guest && !latest && (
        <section className="card wide">
          <h2>شروع کنید 🚀</h2>
          <p className="sub">هنوز سفارشی ثبت نکرده‌اید. برای شروع، کیف پول را شارژ کنید و سپس کانفیگ دلخواه‌تان را بسازید — ساخت کانفیگ کاملاً خودکار است و لینک اشتراک بلافاصله تحویل داده می‌شود.</p>
        </section>
      )}
    </div>
  )
}

/* ===================== کیف پول ===================== */
function WalletTab({ me, setMe, say }: { me: Me; setMe: Dispatch<SetStateAction<Me>>; say: (m: string, k?: 'ok' | 'err') => void }) {
  const [info, setInfo] = useState<CardInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [txs, setTxs] = useState<Tx[]>([])
  const [myReceipts, setMyReceipts] = useState<Rcpt[]>([])

  const load = useCallback(async () => {
    const [w, i] = await Promise.all([fetch('/api/wallet').then(r => r.json()), fetch('/api/site/info').then(r => r.json())])
    setTxs(w.transactions || []); setMyReceipts(w.receipts || [])
    setMe(prev => ({ ...prev, walletBalance: w.balance }))
    setInfo({ cardNumber: i.cardNumber, cardName: i.cardName, cardBank: i.cardBank })
  }, [setMe])

  useEffect(() => { void load() }, [load])

  // بررسی دوره‌ای وضعیت رسیدها (تا تأیید/رد ادمین زنده نمایش داده شود)
  useEffect(() => {
    const t = setInterval(() => { void load() }, 15000)
    return () => clearInterval(t)
  }, [load])

  async function submitReceipt(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt < 10000) { say('مبلغ باید حداقل ۱۰,۰۰۰ تومان باشد', 'err'); return }
    if (!file) { say('عکس رسید را انتخاب کنید', 'err'); return }
    setBusy(true)
    const fd = new FormData()
    fd.append('amount', String(amt))
    fd.append('image', file)
    try {
      const res = await fetch('/api/wallet/receipt', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { say(data.error || 'خطا در ارسال رسید', 'err'); return }
      say('رسید ثبت شد؛ پس از تأیید ادمین کیف پول شارژ می‌شود.')
      setAmount(''); setFile(null); setPreview('')
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div className="grid2">
      <section className="card">
        <h2>شارژ کیف پول (کارت به کارت)</h2>
        <p className="sub">مبلغ را واریز کنید، سپس مبلغ و عکس رسید را ثبت کنید. پس از تأیید ادمین، کیف پول شما شارژ می‌شود.</p>
        {info && info.cardNumber ? (
          <div className="cardinfo">
            <div className="ci-row"><span>بانک</span><b>{info.cardBank}</b></div>
            <div className="ci-row"><span>شماره کارت</span><b dir="ltr">{info.cardNumber}</b><CopyBtn text={info.cardNumber} /></div>
            <div className="ci-row"><span>به نام</span><b>{info.cardName}</b></div>
          </div>
        ) : (
          <div className="cardinfo cardinfo-empty">اطلاعات کارت به‌کارت هنوز توسط ادمین تنظیم نشده است.</div>
        )}
        <form onSubmit={submitReceipt}>
          <label>مبلغ واریزی (تومان)</label>
          <input dir="ltr" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="250000" />
          <div className="chips">
            {[100000, 250000, 500000, 1000000].map(v => (
              <button type="button" key={v} className="chip" onClick={() => setAmount(String(v))}>{fa(v / 1000)} هزار</button>
            ))}
          </div>
          <label>عکس رسید</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {
            const f = e.target.files?.[0] || null; setFile(f); setPreview(f ? URL.createObjectURL(f) : '')
          }} />
          {preview && <img src={preview} alt="پیش‌نمایش رسید" className="preview" />}
          <button className="btn-main" disabled={busy}>{busy ? 'در حال ارسال...' : 'ارسال رسید'}</button>
        </form>
      </section>
      <section className="card">
        <h2>رسیدها و تراکنش‌های من</h2>
        <h3>رسیدهای ارسالی</h3>
        {myReceipts.length === 0 && <p className="sub">هنوز رسیدی نفرستاده‌اید.</p>}
        <div className="rows">
          {myReceipts.map(r => (
            <div key={r.id} className="row"><span>{fa(r.amount)} تومان</span><small>{new Date(r.createdAt).toLocaleDateString('fa-IR')}</small><Badge s={r.status} />
              {r.status === 'rejected' && r.adminNote && <small className="note-err">دلیل: {r.adminNote}</small>}
            </div>
          ))}
        </div>
        <h3>گردش کیف پول</h3>
        {txs.length === 0 && <p className="sub">تراکنشی نیست.</p>}
        <div className="rows">
          {txs.map(t => (
            <div key={t.id} className="row">
              <b className={t.amount >= 0 ? 'pos' : 'neg'}>{t.amount >= 0 ? '+' : '−'}{fa(Math.abs(t.amount))}</b>
              <small>{t.type === 'charge' ? 'شارژ کیف پول' : t.type === 'purchase' ? 'خرید کانفیگ' : t.type}</small>
              <small>{new Date(t.createdAt).toLocaleDateString('fa-IR')}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ===================== خرید کانفیگ ===================== */
function BuyTab({ me, setMe, say }: { me: Me; setMe: Dispatch<SetStateAction<Me>>; say: (m: string, k?: 'ok' | 'err') => void }) {
  const [kind, setKind] = useState<'volume' | 'unlimited'>('volume')
  const [gb, setGb] = useState(50)
  const [months, setMonths] = useState(2)
  const [devices, setDevices] = useState(2)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<(Ord & { demo?: boolean }) | null>(null)

  const price = calcPrice(kind, gb, months, devices)

  async function buy() {
    setBusy(true); setResult(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, gb: kind === 'volume' ? gb : 0, months, devices }),
      })
      const data = await res.json()
      if (!res.ok) { say(data.error || 'خطا در خرید', 'err'); return }
      setResult(data.order); setMe({ ...me, walletBalance: data.balance })
      say('کانفیگ شما ساخته شد و آماده است!')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid2">
      <section className="card">
        <h2>کانفیگ دلخواه خودت را بساز</h2>
        <p className="sub">قیمت همان لحظه محاسبه می‌شود؛ پرداخت از موجودی کیف پول و ساخت کانفیگ کاملاً خودکار است.</p>
        <div className="seg">
          <button className={kind === 'volume' ? 'on' : ''} onClick={() => { setKind('volume'); setMonths(2) }}>بسته حجمی</button>
          <button className={kind === 'unlimited' ? 'on' : ''} onClick={() => { setKind('unlimited'); setMonths(1) }}>نامحدود</button>
        </div>
        {kind === 'volume' && (
          <>
            <label>حجم (گیگابایت)</label>
            <div className="chips">
              {[10, 20, 50, 100].map(v => <button key={v} className={'chip' + (gb === v ? ' on' : '')} onClick={() => setGb(v)}>{fa(v)} گیگ</button>)}
            </div>
            <input dir="ltr" inputMode="numeric" value={gb} onChange={e => setGb(Math.max(1, Math.min(1000, Number(e.target.value.replace(/[^\d]/g, '')) || 1)))} />
          </>
        )}
        <label>مدت</label>
        <div className="chips">
          {(kind === 'volume' ? [1, 2, 3] : [1, 2, 3, 6, 12]).map(v => (
            <button key={v} className={'chip' + (months === v ? ' on' : '')} onClick={() => setMonths(v)}>{fa(v)} ماه</button>
          ))}
        </div>
        <label>تعداد دستگاه</label>
        <Stepper value={devices} setValue={setDevices} max={20} />
        <p className="sub">تا ۳ دستگاه رایگان است؛ هر دستگاه اضافه ۱٬۰۰۰ تومان.</p>
        <div className="pricebox">
          <span>مبلغ قابل پرداخت</span>
          <b>{price === null ? '—' : fa(price)}</b> تومان
          <span className="sub"> | موجودی: {fa(me.walletBalance)} تومان</span>
        </div>
        <button className="btn-main" disabled={busy || price === null} onClick={buy}>{busy ? 'در حال ساخت کانفیگ...' : 'خرید و ساخت خودکار کانفیگ'}</button>
      </section>
      <section className="card">
        <h2>کانفیگ ساخته‌شده</h2>
        {!result && <p className="sub">پس از خرید، لینک اشتراک کانفیگ شما همین‌جا نمایش داده می‌شود.</p>}
        {result && (
          <div className="resultbox">
            <div className="ci-row"><span>شناسه سفارش</span><b dir="ltr">{result.id}</b></div>
            <div className="ci-row"><span>مشخصات</span><b>{result.kind === 'volume' ? fa(result.gb || 0) + ' گیگ' : 'نامحدود'} / {fa(result.months)} ماه / {fa(result.devices)} دستگاه</b></div>
            <div className="ci-row"><span>نام کاربری پنل</span><b dir="ltr">{result.panelUsername}</b></div>
            <div className="ci-row col"><span>لینک اشتراک{result.demo && <small className="sub"> (دمو — لینک نمونه، بدون اتصال واقعی)</small>}</span><div className="sublink" dir="ltr">{result.subscriptionUrl}</div><CopyBtn text={result.subscriptionUrl || ''} label="کپی لینک اشتراک" /></div>
            <p className="sub">این لینک را در برنامه (v2rayNG، NekoBox، Streisand و...) با گزینه «Import from clipboard» وارد کنید.</p>
          </div>
        )}
      </section>
    </div>
  )
}

/* ===================== سفارش‌های من ===================== */
function OrdersTab({ say }: { say: (m: string, k?: 'ok' | 'err') => void }) {
  const [orders, setOrders] = useState<Ord[]>([])
  useEffect(() => {
    void (async () => {
      const d = await fetch('/api/orders').then(r => r.json()).catch(() => ({ orders: [] }))
      setOrders(d.orders || [])
    })()
  }, [])
  return (
    <section className="card wide">
      <h2>سفارش‌های من</h2>
      {orders.length === 0 && <p className="sub">هنوز سفارشی ثبت نکرده‌اید.</p>}
      <div className="rows">
        {orders.map(o => (
          <div key={o.id} className="row order-row">
            <b dir="ltr">{o.id.slice(-8).toUpperCase()}</b>
            <span>{o.kind === 'volume' ? fa(o.gb || 0) + ' گیگ' : 'نامحدود'} / {fa(o.months)} ماه / {fa(o.devices)} دستگاه</span>
            <span>{fa(o.price)} تومان</span>
            <Badge s={o.status} />
            {o.subscriptionUrl && <span className="sublink short" dir="ltr">{o.subscriptionUrl}</span>}
            {o.subscriptionUrl && <CopyBtn text={o.subscriptionUrl} />}
            {o.status === 'failed' && o.note && <small className="note-err">{o.note}</small>}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ===================== ادمین: رسیدها ===================== */
function AdminReceipts({ say }: { say: (m: string, k?: 'ok' | 'err') => void }) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [list, setList] = useState<ARcpt[]>([])
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const d = await fetch('/api/admin/receipts?status=' + filter).then(r => r.json())
    setList(d.receipts || [])
  }, [filter])
  useEffect(() => { void load() }, [load])

  async function act(id: string, action: 'approve' | 'reject') {
    const res = await fetch('/api/admin/receipts/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, note: noteFor === id ? note : undefined }),
    })
    const data = await res.json()
    if (!res.ok) { say(data.error || 'خطا', 'err'); return }
    say(data.message || 'انجام شد')
    setNoteFor(null); setNote('')
    await load()
  }

  return (
    <section className="card wide">
      <h2>رسیدهای کاربران</h2>
      <div className="seg">
        <button className={filter === 'pending' ? 'on' : ''} onClick={() => setFilter('pending')}>در انتظار بررسی</button>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>همه</button>
      </div>
      {list.length === 0 && <p className="sub">موردی نیست.</p>}
      <div className="rows">
        {list.map(r => (
          <div key={r.id} className="row order-row" style={{ alignItems: 'flex-start' }}>
            <div className="rcpt-meta">
              <b>{r.username}</b>
              <span>{fa(r.amount)} تومان</span>
              <small>{new Date(r.createdAt).toLocaleString('fa-IR')}</small>
              <Badge s={r.status} />
            </div>
            <img className="rcpt-img" src={'/api/receipts/image/' + r.imagePath} alt={'رسید ' + r.username} loading="lazy" />
            {r.status === 'pending' && (
              <div className="rcpt-actions">
                <button className="btn-ok" onClick={() => act(r.id, 'approve')}>تأیید و شارژ کیف پول</button>
                {noteFor === r.id ? (
                  <div className="reject-box">
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="دلیل رد (اختیاری)" />
                    <button className="btn-err" onClick={() => act(r.id, 'reject')}>ثبت رد</button>
                  </div>
                ) : (
                  <button className="btn-err" onClick={() => { setNoteFor(r.id); setNote('') }}>رد رسید</button>
                )}
              </div>
            )}
            {r.status !== 'pending' && r.adminNote && <small className="note-err">یادداشت: {r.adminNote}</small>}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ===================== ادمین: تنظیمات ===================== */
function AdminSettings({ say }: { say: (m: string, k?: 'ok' | 'err') => void }) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardBank, setCardBank] = useState('')
  const [panel, setPanel] = useState<{ configured: boolean; demo?: boolean; version: string | null; totalUser: number | null; error?: string | null } | null>(null)
  const [stats, setStats] = useState<AStats | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const d = await fetch('/api/admin/settings').then(r => r.json()).catch(() => null)
      if (!d) return
      setCardNumber(d.settings?.cardNumber || ''); setCardName(d.settings?.cardName || ''); setCardBank(d.settings?.cardBank || '')
      setPanel(d.panel)
    })()
    void (async () => {
      const s = await fetch('/api/admin/stats').then(r => r.json()).catch(() => null)
      if (s && s.userCount !== undefined) setStats(s)
    })()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber, cardName, cardBank }),
      })
      const data = await res.json()
      if (!res.ok) { say(data.error || 'خطا', 'err'); return }
      say('تنظیمات ذخیره شد')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid2">
      <section className="card">
        <h2>تنظیمات کارت‌به‌کارت</h2>
        <form onSubmit={save}>
          <label>شماره کارت</label>
          <input dir="ltr" value={cardNumber} onChange={e => setCardNumber(e.target.value)} />
          <label>نام صاحب کارت</label>
          <input value={cardName} onChange={e => setCardName(e.target.value)} />
          <label>نام بانک</label>
          <input value={cardBank} onChange={e => setCardBank(e.target.value)} />
          <button className="btn-main" disabled={busy}>{busy ? '...' : 'ذخیره تنظیمات'}</button>
        </form>
      </section>
      <section className="card">
        <h2>وضعیت سیستم</h2>
        <div className="ci-row"><span>پنل پاسارگارد</span><b className={panel?.configured ? 'pos' : ''}>{panel?.demo ? 'حالت دمو (غیرفعال)' : panel?.configured ? 'متصل ✓' : 'قطع ✗'}</b></div>
        {panel?.version && <div className="ci-row"><span>نسخه پنل</span><b dir="ltr">v{panel.version}</b></div>}
        {panel?.totalUser !== null && panel?.totalUser !== undefined && <div className="ci-row"><span>کاربران پنل</span><b>{fa(panel.totalUser)}</b></div>}
        {panel?.error && <div className="ci-row"><span>خطا</span><small className="note-err">{panel.error}</small></div>}
        {stats && (
          <div className="stat-grid">
            <div className="stat"><b>{fa(stats.userCount)}</b><span>کاربر سایت</span></div>
            <div className="stat"><b>{fa(stats.receiptPending)}</b><span>رسید در انتظار</span></div>
            <div className="stat"><b>{fa(stats.receiptApproved)}</b><span>رسید تأییدشده</span></div>
            <div className="stat"><b>{fa(stats.orderDone)}</b><span>کانفیگ ساخته‌شده</span></div>
          </div>
        )}
      </section>
    </div>
  )
}
