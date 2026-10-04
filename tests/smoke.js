/* Long-Term Lens smoke test.
 * 1. Boots the real index.html in jsdom (reusing the sibling poker-sparring
 *    install — dev-only, the shipped site has zero dependencies).
 * 2. Asserts pure-logic behavior via window.LongTermLens.
 * 3. Clicks through every nav tab, completes the quiz, saves a journal entry
 *    (including an XSS probe string), verifies escaped rendering + localStorage
 *    persistence, and verifies delete.
 * Fails loudly on any script error.
 */
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSDOM_PATH = path.resolve('/home/hatch/workspace/poker-sparring/node_modules/jsdom');
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require(JSDOM_PATH));
} catch (e) {
  console.error('SKIP: jsdom not found at ' + JSDOM_PATH + ' — install dev deps to run UI checks.');
  process.exit(2);
}

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ok - ' + msg); }
  else { failures++; console.error('  FAIL - ' + msg); }
}

async function main() {
  // Serve over http:// so jsdom gets a real origin (localStorage works;
  // file:// URLs are opaque origins and block it).
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('nope'); return; }
      const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:' + port + '/index.html',
    resources: 'usable',
    runScripts: 'dangerously',
    virtualConsole: vc,
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('load timeout')), 15000);
    dom.window.addEventListener('load', () => { clearTimeout(t); resolve(); });
  });

  const { window } = dom;
  const { document } = window;
  const L = window.LongTermLens;

  console.log('script errors:');
  assert(errors.length === 0, 'no console/script errors on boot (' + errors.length + ')');
  errors.forEach(e => console.error('    ' + e));
  assert(L && typeof L.scoreRisk === 'function', 'LongTermLens API exposed');

  // ---- pure logic ----
  console.log('risk scoring:');
  let r = L.scoreRisk([0, 0, 0, 0, 0, 0]);
  assert(r.total === 18 && r.band.index === 80 && r.band.conv === 20, 'max score -> 80/20 growth band');
  r = L.scoreRisk([3, 3, 3, 3, 3, 3]);
  assert(r.total === 0 && r.band.index === 98 && r.band.conv === 2, 'min score -> 98/2 preservation band');
  r = L.scoreRisk([0, 0, 0, 0, 1, 3]); // 3+3+3+3+2+0 = 14
  assert(r.total === 14 && r.band.label === 'Growth-leaning', 'boundary 14 -> top band');
  r = L.scoreRisk([0, 0, 0, 1, 1, 3]); // 3+3+3+2+2+0 = 13
  assert(r.total === 13 && r.band.label === 'Balanced', 'boundary 13 -> second band');
  r = L.scoreRisk([1, 1, 1, 1, 1, 1]);
  assert(r.total === 12 && r.band.index === 87, 'mid score -> 87/13 balanced band');
  r = L.scoreRisk([2, 2, 2, 2, 2, 2]);
  assert(r.total === 6 && r.band.label === 'Cautious', 'score 6 -> cautious band');
  assert(L.BANDS.every(b => b.index + b.conv === 100), 'every band sums to 100%');

  console.log('journal scoring:');
  assert(L.weightedScore({ product: 5, fundamentals: 5, moat: 5, valuation: 5, horizon: 5 }) === 5, 'all 5s -> 5.0');
  assert(L.weightedScore({ product: 1, fundamentals: 1, moat: 1, valuation: 1, horizon: 1 }) === 1, 'all 1s -> 1.0');
  assert(L.weightedScore({}) === null, 'no scores -> null');
  assert(L.weightedScore({ fundamentals: 4 }) === 4, 'single dimension -> its own value');
  // fundamentals 25% * 5 + product 20% * 1 = 1.45 / 0.45 weight = 3.222 -> 3.2
  assert(L.weightedScore({ fundamentals: 5, product: 1 }) === 3.2, 'partial weights compute correctly');

  console.log('glossary:');
  assert(L.GLOSSARY.length === 10, '10 glossary terms');
  assert(L.GLOSSARY.every(g => g.abbr && g.name && g.what && g.healthy && g.flag), 'every term has all fields');

  // ---- navigation ----
  console.log('navigation:');
  const tabs = ['home', 'risk', 'fundamentals', 'journal', 'accounts', 'learn'];
  tabs.forEach(t => {
    document.querySelector('.nav-btn[data-nav="' + t + '"]').click();
    const visible = !document.getElementById('screen-' + t).classList.contains('hidden');
    const othersHidden = tabs.filter(x => x !== t)
      .every(x => document.getElementById('screen-' + x).classList.contains('hidden'));
    assert(visible && othersHidden, 'tab "' + t + '" shows its screen only');
  });

  // ---- quiz flow ----
  console.log('quiz flow:');
  document.querySelector('.nav-btn[data-nav="risk"]').click();
  document.querySelectorAll('#quiz .q').forEach(q => q.querySelector('.opt-btn').click());
  document.querySelector('#quiz .btn.primary').click();
  const res = document.getElementById('quiz-result');
  assert(!res.classList.contains('hidden'), 'result appears after answering all questions');
  assert(res.textContent.includes('80% index') && res.textContent.includes('20% conviction'), 'result shows 80/20 allocation');
  // incomplete quiz warns
  document.querySelector('.nav-btn[data-nav="journal"]').click();
  document.querySelector('.nav-btn[data-nav="risk"]').click();
  // (quiz keeps answers; verify re-click path works by checking result still rendered)
  assert(!document.getElementById('quiz-result').classList.contains('hidden'), 'quiz result persists on tab revisit');

  // ---- journal flow ----
  console.log('journal flow:');
  document.querySelector('.nav-btn[data-nav="journal"]').click();
  let alertMsg = null;
  window.alert = m => { alertMsg = m; };
  document.getElementById('j-save').click();
  assert(alertMsg && alertMsg.includes('company or idea name'), 'empty name blocked with alert');

  const probe = '<img src=x onerror=alert(1)>';
  document.getElementById('j-name').value = 'Acme ' + probe;
  document.getElementById('j-tickers').value = 'acme';
  document.getElementById('j-tags').value = 'AI infra, test';
  document.getElementById('j-thesis').value = 'I use it daily. ' + probe;
  document.getElementById('j-falsify').value = 'If growth stalls 2 years.';
  // score: product 5, fundamentals 4, moat 3, valuation 2, horizon 5
  const dims = document.querySelectorAll('.score-btns');
  const picks = [5, 4, 3, 2, 5];
  dims.forEach((g, i) => g.querySelectorAll('.score-btn')[picks[i] - 1].click());
  const preview = document.getElementById('j-weighted').textContent;
  // 5*.2 + 4*.25 + 3*.2 + 2*.15 + 5*.2 = 1+1+.6+.3+1 = 3.9
  assert(preview.includes('3.9'), 'weighted preview shows 3.9 (got "' + preview + '")');
  document.getElementById('j-save').click();

  const entries = document.querySelectorAll('#watchlist .entry');
  assert(entries.length === 1, 'one watchlist entry rendered');
  assert(!document.getElementById('watchlist').innerHTML.includes('<img src=x'), 'XSS probe escaped in watchlist HTML');
  assert(entries[0].querySelector('.entry-name').textContent.includes(probe), 'probe visible as literal text');
  assert(entries[0].querySelector('.entry-score').textContent.includes('3.9'), 'entry shows 3.9 score');
  assert(entries[0].querySelector('.entry-tickers').textContent === 'ACME', 'ticker uppercased');

  const stored = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  assert(stored && stored.entries.length === 1 && stored.entries[0].weighted === 3.9, 'entry persisted to localStorage with score');

  // delete
  window.confirm = () => true;
  entries[0].querySelector('.btn.danger').click();
  assert(document.querySelectorAll('#watchlist .entry').length === 0, 'entry deleted from watchlist');
  const stored2 = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  assert(stored2.entries.length === 0, 'entry deleted from localStorage');

  // disclaimer present
  document.querySelector('.nav-btn[data-nav="home"]').click();
  assert(document.querySelector('.disclaimer-banner').textContent.includes('not financial advice'), 'hero disclaimer present');
  assert(document.querySelector('.footer').textContent.includes('Educational only, not financial advice'), 'footer disclaimer present');

  console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : '\n' + failures + ' FAILURES');
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('SMOKE TEST ERROR:', e.message); process.exit(1); });
