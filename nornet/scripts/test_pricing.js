// Configurator pricing verification against the spec formula
const { chromium } = require('playwright');
const URL = 'file:///home/z/my-project/download/index.html';
const fa = s => String(s).replace(/[۰-۹٬]/g, c => ({ '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٬':'' }[c] || c));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL); await page.waitForTimeout(900);

  const cases = [
    { gb: '10', months: '1', devs: 1, expect: 50000 },
    { gb: '50', months: '2', devs: 3, expect: 350000 },
    { gb: '50', months: '2', devs: 4, expect: 351000 },   // spec example
    { gb: '100', months: '3', devs: 5, expect: 1002000 },
    { gb: '25', months: '1', devs: 6, expect: 128000 },
    { gb: '7', months: '3', devs: 2, expect: 70000 }
  ];
  let allPass = true;
  // open custom tab
  await page.evaluate(() => { const t = document.querySelector('[data-tab="custom"]'); if (t) t.click(); });
  await page.waitForTimeout(300);

  for (const c of cases) {
    await page.fill('#cfgGbInput', String(c.gb));
    await page.waitForTimeout(120);
    const mBtn = await page.$(`#cfgMonths [data-months="${c.months}"], #cfgMonths input[value="${c.months}"]`);
    if (mBtn) { const tag = await mBtn.evaluate(el => el.tagName); if (tag === 'INPUT') await mBtn.check(); else await mBtn.click(); }
    // set devices: adjust from current to target using +/- buttons
    for (let i = 0; i < 12; i++) {
      const cur = fa(await page.textContent('#cfgDevCount'));
      if (parseInt(cur, 10) === c.devs) break;
      await page.click(parseInt(cur, 10) < c.devs ? '#cfgDevPlus' : '#cfgDevMinus');
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(150);
    const got = parseInt(fa(await page.textContent('#cfgPriceTotal')).replace(/\D/g, ''), 10);
    const pass = got === c.expect;
    if (!pass) allPass = false;
    console.log((pass ? 'PASS' : 'FAIL') + ` | ${c.gb}GB/${c.months}mo/${c.devs}dev → ${got} (انتظار ${c.expect})`);
  }
  console.log('pageerrors:', errors.length ? errors.join(';') : 'none');
  console.log(allPass ? 'ALL PRICING OK' : 'PRICING FAILURES');
  await browser.close();
  process.exit(allPass && errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });
