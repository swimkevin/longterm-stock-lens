'use strict';
// Property tests — seeded, deterministic invariants over the pure functions.
//
// No new dependency: a 10-line mulberry32 generator with a fixed seed keeps
// runs reproducible (playbook rule 7: no timer/event-loop luck). Each property
// runs 200 generated cases and asserts an invariant that must hold for every
// input, not just the hand-picked examples in tests/smoke.js. This file is a
// supplement to the click-through suite, not a replacement for it.
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
  console.error('SKIP: jsdom not found — run `npm install` to run UI checks.');
  process.exit(2);
}

let failures = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ok - ' + msg); }
  else { failures++; console.error('  FAIL - ' + msg); }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
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
  const L = window.LongTermLens;
  const N = 200;
  const rnd = mulberry32(20261122);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const rInt = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const rNum = () => pick([0, -1, 1, 0.5, -50, 100, 10000, 1e308, Infinity, NaN, 0.01]);
  const rStr = () => pick(['', 'Acme', 'x'.repeat(90), '📈 ETF', '  spaced  ', 'null', '2026-01-01', '2099-01-01', 'not-a-date']);

  console.log('properties: normalizeIdea is idempotent and never throws');
  let thrown = 0;
  let idempotent = true;
  for (let i = 0; i < N; i++) {
    const raw = {
      name: pick([rStr(), 123, null, undefined]),
      tickers: pick([rStr(), 42, null]),
      conviction: pick([1, 3, 5, 0, 6, '4', null]),
      reviewHistory: pick([[], [{ outcome: 'intact', reasonMatch: 'yes' }], 'junk', null]),
      priceLog: pick([[], [{ note: 'spotted', price: 42 }], null]),
      sealed: pick([null, { belief: 'b', falsify: 'f', date: '2026-01-01' }, { belief: '', date: '2099-01-01' }]),
      createdAt: pick(['2026-01-01', 'junk', null]),
    };
    try {
      const once = L.normalizeIdea(raw);
      const twice = L.normalizeIdea(once);
      if (JSON.stringify(once) !== JSON.stringify(twice)) idempotent = false;
    } catch (e) { thrown++; }
  }
  assert(thrown === 0, 'normalizeIdea never throws on hostile shapes (' + N + ' cases)');
  assert(idempotent, 'normalizeIdea is idempotent (' + N + ' cases)');

  console.log('properties: pctMove is finite-only');
  let pctOk = true;
  for (let i = 0; i < N; i++) {
    const v = L.pctMove(rNum(), rNum());
    if (v !== null && (!Number.isFinite(v) || !Number.isInteger(v))) pctOk = false;
  }
  assert(pctOk, 'pctMove returns null or a finite integer, never a phantom move (' + N + ' cases)');
  assert(L.pctMove(100, -50) === null && L.pctMove(100, 0) === null, 'pctMove returns null for non-positive spot prices');

  console.log('properties: spotPriceOf never invents a price');
  let spotOk = true;
  for (let i = 0; i < N; i++) {
    const log = Array.from({ length: rInt(0, 4) }, () => ({ note: pick(['checkin', 'x', 'spotted']), price: rInt(1, 500) }));
    const got = L.spotPriceOf({ priceLog: log });
    const first = log.find(p => p.note === 'spotted');
    if (first ? got !== first.price : got !== null) spotOk = false;
  }
  assert(spotOk, 'spotPriceOf is null without a spotted entry, else exactly that entry\'s price (' + N + ' cases)');

  console.log('properties: calibration rates stay bounded');
  let calOk = true;
  for (let i = 0; i < N; i++) {
    const history = Array.from({ length: rInt(0, 12) }, () => ({
      reasonMatch: pick(['yes', 'no', 'na', undefined, 'bogus']),
      conviction: pick([1, 2, 3, 4, 5, 4.5, null, 'x']),
    }));
    const cal = L.calibration([{ reviewHistory: history }]);
    const answered = history.filter(r => r.reasonMatch === 'yes' || r.reasonMatch === 'no').length;
    const rateOk = v => v === null || (Number.isInteger(v) && v >= 0 && v <= 100);
    if (cal.answered !== answered || !rateOk(cal.overallRate) || !rateOk(cal.hiRate) || !rateOk(cal.loRate)) calOk = false;
  }
  assert(calOk, 'calibration counts answered reviews exactly and keeps every rate in 0..100 (' + N + ' cases)');

  console.log('properties: scoreRisk always lands on a real band');
  let riskOk = true;
  for (let i = 0; i < N; i++) {
    const answers = Array.from({ length: rInt(0, 8) }, () => pick([0, 1, 2, 3, 99, -1, null, '1', 1.5, undefined]));
    const r = L.scoreRisk(answers);
    const inBands = L.BANDS.some(b => b.label === r.band.label);
    if (!inBands || r.total < 0 || r.total > 18 || r.max !== 18 || r.band.min > r.total) riskOk = false;
    if (r.capped !== null && r.band.label !== 'Cautious') riskOk = false;
  }
  assert(riskOk, 'scoreRisk total stays in 0..18, band is real, band floor never exceeds the total, cap implies Cautious (' + N + ' cases)');

  console.log('properties: addMonths round-trips and clamps month-ends');
  let monthsOk = true;
  for (let i = 0; i < N; i++) {
    const d = '20' + String(rInt(20, 29)).padStart(2, '0') + '-' + String(rInt(1, 12)).padStart(2, '0') + '-15';
    const n = rInt(-24, 24);
    if (L.addMonths(L.addMonths(d, n), -n) !== d) monthsOk = false;
  }
  assert(monthsOk, 'addMonths round-trips on mid-month dates (' + N + ' cases)');
  assert(L.addMonths('2026-01-31', 1) === '2026-02-28' && L.addMonths('2024-01-31', 1) === '2024-02-29',
    'addMonths clamps month-ends, leap years included');
  assert(L.addMonths('junk', 1) === null, 'addMonths returns null for a malformed date');

  console.log('properties: journal round-trip + local dates');
  const ideas = [{ name: 'Round Trip Co', tickers: 'RTC' }, { name: 'Second Co' }];
  const parsed = JSON.parse(L.journalToJSON(ideas));
  assert(parsed.length === 2 && parsed[0].name === 'Round Trip Co', 'journalToJSON round-trips through JSON.parse');
  assert(L.journalToMarkdown(ideas, '2026-11-22', []).includes('Round Trip Co'), 'journalToMarkdown carries the idea names');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(L.todayISO()) && !/[TZ]/.test(L.todayISO()), 'todayISO is a local date, never UTC');

  server.close();
  if (failures) { console.error(failures + ' PROPERTY FAILURES'); process.exit(1); }
  console.log('PROPERTIES: all property checks passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
