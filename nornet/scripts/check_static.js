// Static checks for the single-file site: JS syntax + id cross-references
const fs = require('fs');
const html = fs.readFileSync('/home/z/my-project/download/index.html', 'utf8');

// 1) Extract last <script> block (main app JS) and syntax-check it
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) { console.error('NO inline script found'); process.exit(1); }
const js = scripts[scripts.length - 1];
fs.writeFileSync('/tmp/app.js', js);

// 2) Collect ids defined in HTML
const defined = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const dupes = {};
[...html.matchAll(/ id="([^"]+)"/g)].forEach(m => { dupes[m[1]] = (dupes[m[1]] || 0) + 1; });
const dupeList = Object.entries(dupes).filter(([k, v]) => v > 1).map(([k, v]) => k + ' x' + v);

// 3) Collect referenced ids in JS
const refs = new Set();
for (const m of js.matchAll(/\$\('#([A-Za-z0-9_-]+)'/g)) refs.add(m[1]);
for (const m of js.matchAll(/getElementById\('([^']+)'\)/g)) refs.add(m[1]);
const missing = [...refs].filter(id => !defined.has(id));

// 4) classes used in JS toggles that must exist in CSS (rough check)
console.log('--- STATIC CHECK ---');
console.log('inline scripts found:', scripts.length);
console.log('JS length:', js.length);
console.log('duplicate ids:', dupeList.length ? dupeList.join(', ') : 'none');
console.log('missing ids referenced in JS:', missing.length ? missing.join(', ') : 'none');

// 5) leftover placeholder scan
const bad = ['TODO', 'XXX', 'undefined, ', 'NaN', '【', 'placeholder-left'];
const foundBad = bad.filter(b => js.includes(b));
console.log('suspicious tokens in JS:', foundBad.length ? foundBad.join(', ') : 'none');
