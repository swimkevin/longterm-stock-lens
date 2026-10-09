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

  console.log('score count + labels:');
  assert(L.scoreCount({}) === 0, 'no scores -> 0 counted');
  assert(L.scoreCount({ fundamentals: 5 }) === 1, 'one dimension -> 1 counted');
  assert(L.scoreCount({ product: 5, fundamentals: 4, moat: 3, valuation: 2, horizon: 1 }) === 5, 'all five -> 5 counted');
  assert(L.scoreCount({ product: 0, fundamentals: 6, moat: 'x' }) === 0, 'invalid values not counted');
  assert(L.thesesLabel(0) === '', '0 -> empty label');
  assert(L.thesesLabel(1) === '(1 thesis)', '1 -> singular thesis');
  assert(L.thesesLabel(2) === '(2 theses)', '2 -> plural theses');

  console.log('review dates:');
  assert(L.addMonths('2026-10-04', 6) === '2027-04-04', '6 months from Oct -> Apr next year');
  assert(L.addMonths('2026-10-04', 1) === '2026-11-04', '1 month');
  assert(L.addMonths('2026-10-04', 12) === '2027-10-04', '12 months');
  assert(L.addMonths('2026-01-31', 1) === '2026-02-28', 'clamps to end of Feb (non-leap)');
  assert(L.addMonths('2024-01-31', 1) === '2024-02-29', 'clamps to Feb 29 in leap year');
  assert(L.addMonths('2026-12-15', 1) === '2027-01-15', 'rolls over year boundary');
  assert(L.addMonths('nope', 6) === null, 'invalid input -> null');
  assert(L.reviewAtOf({ reviewAt: '2027-01-01', createdAt: '2026-10-04' }) === '2027-01-01', 'explicit reviewAt wins');
  assert(L.reviewAtOf({ createdAt: '2026-10-04' }) === '2027-04-04', 'legacy entry defaults to createdAt + 6 months');
  assert(L.reviewAtOf({ reviewAt: 'garbage', createdAt: '2026-10-04' }) === '2027-04-04', 'invalid reviewAt falls back to default');
  assert(L.isReviewDue({ reviewAt: '2020-01-01' }, '2026-10-04') === true, 'past review date is due');
  assert(L.isReviewDue({ reviewAt: '2026-10-04' }, '2026-10-04') === true, 'review date == today is due');
  assert(L.isReviewDue({ reviewAt: '2026-10-05' }, '2026-10-04') === false, 'future review date is not due');
  assert(L.isReviewDue({ createdAt: '2020-01-01' }, '2026-10-04') === true, 'legacy entry long past is due');

  console.log('rescheduleReview:');
  const base = { id: 'e1', name: 'Base', thesis: 'T', createdAt: '2026-10-04', reviewMonths: 6, reviewAt: '2020-01-01' };
  const r6 = L.rescheduleReview(base, '6', '2026-10-08');
  assert(r6.reviewAt === '2027-04-08' && r6.reviewMonths === 6, '6 months from explicit today');
  const r12 = L.rescheduleReview(base, 12, '2026-10-08');
  assert(r12.reviewAt === '2027-10-08' && r12.reviewMonths === 12, '12 months (numeric input)');
  const r1 = L.rescheduleReview(base, '1', '2026-10-08');
  assert(r1.reviewAt === '2026-11-08' && r1.reviewMonths === 1, '1 month honored');
  const rBad = L.rescheduleReview(base, '99', '2026-10-08');
  assert(rBad.reviewAt === '2027-04-08' && rBad.reviewMonths === 6, 'invalid months fall back to 6');
  assert(base.reviewAt === '2020-01-01', 'original entry object not mutated');
  assert(r6.name === 'Base' && r6.id === 'e1' && r6.thesis === 'T', 'other entry fields preserved');
  const rToday = L.rescheduleReview(base, '3', 'garbage');
  assert(rToday.reviewAt === L.addMonths(L.todayISO(), 3) && rToday.reviewMonths === 3,
    'invalid today falls back to todayISO');

  console.log('export builders:');
  const expEntries = [
    { id: 'e1', name: 'Acme', tickers: 'ACME', tags: ['AI'], thesis: 'Great.', falsify: 'If not.',
      scores: { product: 5 }, weighted: 5, scored: 1, createdAt: '2026-10-04', reviewMonths: 6, reviewAt: '2027-04-04' },
    { id: 'e2', name: 'Beta', tickers: '', tags: [], thesis: 'Fine.', falsify: '',
      scores: {}, weighted: null, scored: 0, createdAt: '2026-10-04' },
  ];
  const md = L.journalToMarkdown(expEntries, '2026-10-04');
  assert(md.includes('## Acme (ACME)'), 'markdown has name + ticker heading');
  assert(md.includes('## Beta'), 'markdown has second entry heading');
  assert(md.includes('5.0 / 5 (1 of 5 dimensions scored)'), 'markdown shows score + scored count');
  assert(md.includes('unscored'), 'markdown marks unscored entry');
  assert(md.includes('- Written: 2026-10-04 · Review by: 2027-04-04'), 'markdown shows written + review dates');
  assert(md.includes('Review by: 2027-04-04') && (md.match(/Review by: 2027-04-04/g) || []).length === 2,
    'legacy entry gets default review date in markdown');
  assert(md.includes('not financial advice'), 'markdown carries disclaimer');
  assert(md.includes('Would prove me wrong: If not.'), 'markdown includes falsify text');
  assert(md.includes('- Tags: AI'), 'markdown includes tags');
  const js = JSON.parse(L.journalToJSON(expEntries));
  assert(Array.isArray(js) && js.length === 2 && js[0].id === 'e1', 'JSON export round-trips entries array');
  assert(L.journalToMarkdown([], '2026-10-04').includes('No theses yet'), 'empty markdown export handled');

  console.log('glossary:');
  assert(L.GLOSSARY.length === 10, '10 glossary terms');
  assert(L.GLOSSARY.every(g => g.abbr && g.name && g.what && g.healthy && g.flag), 'every term has all fields');

  console.log('glossary search:');
  assert(typeof L.filterGlossaryTerms === 'function', 'filterGlossaryTerms exposed');
  assert(L.filterGlossaryTerms('').length === 10, 'empty query matches all terms');
  assert(L.filterGlossaryTerms(null).length === 10, 'null query matches all terms');
  const moat = L.filterGlossaryTerms('moat');
  assert(moat.length === 1 && moat[0].abbr === 'Moat', 'query "moat" finds Economic moat');
  const margins = L.filterGlossaryTerms('MARGIN');
  assert(margins.length === 3 && margins.some(g => g.name === 'Gross margin') &&
    margins.some(g => g.name === 'Operating margin') && margins.some(g => g.abbr === 'Moat'),
    'case-insensitive search finds both margin terms + Moat (flag text mentions margins)');
  const debt = L.filterGlossaryTerms('debt');
  assert(debt.length === 3 && debt.some(g => g.abbr === 'D/E'), 'body-text search finds D/E + FCF + ROE for "debt"');
  assert(L.filterGlossaryTerms('xyzzy').length === 0, 'no-match query returns empty');
  // UI flow: type, filter, announce, clear
  document.querySelector('.nav-btn[data-nav="fundamentals"]').click();
  const gSearch = document.getElementById('glossary-search');
  const fireInput = () => gSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
  gSearch.value = 'moat';
  fireInput();
  const visibleTerms = Array.from(document.querySelectorAll('#glossary .gloss'))
    .filter(d => !d.classList.contains('hidden'));
  assert(visibleTerms.length === 1 && visibleTerms[0].textContent.includes('Economic moat'),
    'UI filter shows only the matching term');
  const countLine = document.getElementById('glossary-count');
  assert(!countLine.classList.contains('hidden') && countLine.textContent.includes('1 of 10'),
    'match count announced (got "' + countLine.textContent + '")');
  gSearch.value = 'xyzzy';
  fireInput();
  assert(!document.getElementById('glossary-empty').classList.contains('hidden'), 'no-match shows empty state');
  // XSS probe: the query must stay text, never markup
  gSearch.value = '<img src=x onerror=alert(1)>';
  fireInput();
  assert(!document.querySelector('#glossary-count img'), 'search query not parsed as HTML');
  assert(document.getElementById('glossary-count').innerHTML.includes('&lt;img'),
    'search query escaped in count line');
  gSearch.value = '';
  fireInput();
  assert(document.querySelectorAll('#glossary .gloss:not(.hidden)').length === 10, 'clearing search restores all terms');
  assert(document.getElementById('glossary-empty').classList.contains('hidden'), 'empty state hidden after clear');
  assert(document.getElementById('glossary-count').classList.contains('hidden'), 'count line hidden after clear');

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
  assert(res.textContent.includes('80% index'), 'result shows 80% index allocation');
  assert(res.querySelector('.alloc-conv').textContent === '20%', 'conv segment always uses short label (got "' +
    res.querySelector('.alloc-conv').textContent + '")');
  assert(res.getAttribute('role') === 'status', 'quiz result announced via role=status');
  // 13% band: "13% conviction" used to clip in the narrow bar segment
  document.querySelectorAll('#quiz .q').forEach((q, i) => // 5x s=2 + 1x s=1 -> 11/18
    q.querySelectorAll('.opt-btn')[i < 5 ? 1 : 2].click());
  document.querySelector('#quiz .btn.primary').click();
  assert(res.querySelector('.alloc-conv').textContent === '13%', '13% conv segment uses short label (got "' +
    res.querySelector('.alloc-conv').textContent + '")');
  assert(res.querySelector('.alloc-bar').getAttribute('aria-label').includes('13 percent conviction stocks'),
    'aria-label still carries the full 13% wording');
  // narrow conviction slice: short label avoids clipping in the allocation bar
  document.querySelectorAll('#quiz .q').forEach(q => q.querySelectorAll('.opt-btn')[3].click()); // all s=0 -> 0/18
  document.querySelector('#quiz .btn.primary').click();
  assert(res.querySelector('.alloc-conv').textContent === '2%', 'narrow conv segment uses short label (got "' +
    res.querySelector('.alloc-conv').textContent + '")');
  assert(res.querySelector('.alloc-index').textContent === '98% index', 'index segment keeps full label');
  assert(res.querySelector('.alloc-bar').getAttribute('aria-label').includes('2 percent conviction stocks'),
    'aria-label still carries the full wording');
  // incomplete quiz warns
  document.querySelector('.nav-btn[data-nav="journal"]').click();
  document.querySelector('.nav-btn[data-nav="risk"]').click();
  // (quiz keeps answers; verify re-click path works by checking result still rendered)
  assert(!document.getElementById('quiz-result').classList.contains('hidden'), 'quiz result persists on tab revisit');

  // ---- journal flow ----
  console.log('journal flow:');
  document.querySelector('.nav-btn[data-nav="journal"]').click();
  document.getElementById('j-save').click();
  const jerr = document.getElementById('j-error');
  assert(!jerr.classList.contains('hidden') && jerr.textContent.includes('company or idea name'),
    'empty name blocked with inline error (no alert dialog)');
  assert(jerr.getAttribute('role') === 'alert', 'form error has role=alert');
  assert(document.querySelector('.weighted-line .hint').textContent.includes('click a score again'),
    'score toggle-off behavior documented in hint text');

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
  assert(preview.includes('3.9') && preview.includes('5 of 5 scored'),
    'weighted preview shows 3.9 with scored count (got "' + preview + '")');
  document.getElementById('j-save').click();

  let entries = document.querySelectorAll('#watchlist .entry');
  assert(entries.length === 1, 'one watchlist entry rendered');
  assert(document.getElementById('watchlist-count').textContent === '(1 thesis)', 'singular thesis label');
  assert(document.querySelector('#watchlist img') === null, 'XSS probe created no real img element');
  assert(![...document.querySelectorAll('#watchlist *')].some(el => el.hasAttribute('onerror')),
    'no onerror handlers anywhere in watchlist');
  assert(entries[0].querySelector('.entry-name').textContent.includes(probe), 'probe visible as literal text');
  assert(entries[0].querySelector('.entry-score').textContent.includes('3.9'), 'entry shows 3.9 score');
  assert(entries[0].querySelector('.entry-tickers').textContent === 'ACME', 'ticker uppercased');
  assert(entries[0].querySelector('.fineprint').textContent.includes('5 of 5 dimensions scored'),
    'entry meta discloses scored dimensions');

  const stored = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  assert(stored && stored.entries.length === 1 && stored.entries[0].weighted === 3.9, 'entry persisted to localStorage with score');
  assert(stored.entries[0].scored === 5, 'scored count persisted on entry');

  // partial scoring disclosure: only 2 of 5 dimensions scored
  document.getElementById('j-name').value = 'Partial Co';
  document.getElementById('j-thesis').value = 'Only scored two dimensions.';
  const dims2 = document.querySelectorAll('.score-btns');
  dims2[0].querySelectorAll('.score-btn')[4].click(); // product 5
  dims2[1].querySelectorAll('.score-btn')[4].click(); // fundamentals 5
  const preview2 = document.getElementById('j-weighted').textContent;
  assert(preview2.includes('5.0') && preview2.includes('2 of 5 scored'),
    'partial scoring shows 5.0 with 2-of-5 disclosure (got "' + preview2 + '")');
  document.getElementById('j-save').click();

  entries = document.querySelectorAll('#watchlist .entry');
  assert(entries.length === 2, 'two watchlist entries rendered');
  assert(document.getElementById('watchlist-count').textContent === '(2 theses)', 'plural theses label');
  assert(entries[0].querySelector('.entry-name').textContent.includes('Partial Co'),
    'partial 5.0 sorts above 3.9 (sort order unchanged, disclosure added)');
  assert(entries[0].querySelector('.fineprint').textContent.includes('2 of 5 dimensions scored'),
    'partial entry meta shows 2 of 5 dimensions scored');

  // delete uses inline two-tap confirm (no native confirm dialog)
  const delA = entries[0].querySelector('.btn.danger');
  delA.click();
  assert(document.querySelectorAll('#watchlist .entry').length === 2, 'first delete click only arms, entry stays');
  assert(delA.classList.contains('armed') && delA.textContent.includes('confirm'), 'delete button shows armed confirm state');
  const delB = entries[1].querySelector('.btn.danger');
  delB.click(); // arming B must disarm A
  assert(!delA.classList.contains('armed') && delA.textContent === 'Delete', 'arming second delete disarms the first');
  delB.click(); // confirm B
  entries = document.querySelectorAll('#watchlist .entry');
  assert(entries.length === 1, 'confirmed delete removes entry');
  assert(document.getElementById('watchlist-count').textContent === '(1 thesis)', 'count back to singular');
  const storedMid = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  assert(storedMid.entries.length === 1, 'deleted entry removed from localStorage');

  // delete the remaining entry the same way
  const delLast = entries[0].querySelector('.btn.danger');
  delLast.click();
  delLast.click();
  assert(document.querySelectorAll('#watchlist .entry').length === 0, 'last entry deleted via two-tap');
  assert(document.getElementById('watchlist-count').textContent === '', 'count label empty when no entries');
  const stored2 = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  assert(stored2.entries.length === 0, 'all entries deleted from localStorage');

  // ---- revisit reminders ----
  console.log('revisit reminders:');
  assert(document.getElementById('j-review').value === '6', 'review interval defaults to 6 months');
  document.getElementById('j-name').value = 'Reminder Co';
  document.getElementById('j-thesis').value = 'Testing review intervals.';
  document.getElementById('j-review').value = '12';
  document.getElementById('j-save').click();
  let rst = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  assert(rst.entries.length === 1, 'reminder entry saved');
  const expectedReview = L.addMonths(rst.entries[0].createdAt, 12);
  assert(rst.entries[0].reviewMonths === 12, 'reviewMonths persisted');
  assert(rst.entries[0].reviewAt === expectedReview, 'reviewAt = createdAt + 12 months');
  assert(document.getElementById('j-review').value === '6', 'interval selector resets to 6 after save');
  let rcards = document.querySelectorAll('#watchlist .entry');
  assert(rcards[0].querySelector('.fineprint').textContent.includes('review by ' + expectedReview),
    'entry meta shows review-by date');
  assert(rcards[0].querySelector('.due-badge') === null, 'no due badge when review is in the future');
  assert(document.getElementById('watchlist-due').classList.contains('hidden'), 'due summary hidden when nothing due');

  // simulate an overdue review: backdate reviewAt in storage, reload journal
  rst.entries[0].reviewAt = '2020-01-01';
  window.localStorage.setItem('longterm-stock-lens-v1', JSON.stringify(rst));
  L.reloadJournal();
  rcards = document.querySelectorAll('#watchlist .entry');
  const badge = rcards[0].querySelector('.due-badge');
  assert(badge && badge.textContent === 'Review due', 'due badge rendered on overdue entry');
  assert(rcards[0].classList.contains('due'), 'due card highlighted');
  const dueLine = document.getElementById('watchlist-due');
  assert(!dueLine.classList.contains('hidden') && dueLine.textContent.includes('1 thesis is due'),
    'due summary line shown (got "' + dueLine.textContent + '")');

  // due entry surfaces first even with a lower score
  document.getElementById('j-name').value = 'Fresh Co';
  document.getElementById('j-thesis').value = 'High score, not due.';
  document.querySelectorAll('.score-btns').forEach(g => g.querySelectorAll('.score-btn')[4].click()); // all 5s
  document.getElementById('j-save').click();
  rcards = document.querySelectorAll('#watchlist .entry');
  assert(rcards.length === 2, 'two entries present');
  assert(rcards[0].querySelector('.entry-name').textContent.includes('Reminder Co'),
    'due entry sorts above higher-scored non-due entry');
  assert(rcards[1].querySelector('.due-badge') === null, 'no badge on non-due entry');

  // ---- mark reviewed: closes the revisit loop ----
  console.log('mark reviewed:');
  rcards = document.querySelectorAll('#watchlist .entry');
  assert(document.getElementById('watchlist-due').getAttribute('role') === 'status',
    'due summary line uses role=status for screen readers');
  const dueCard = rcards[0];
  const freshCard = rcards[1];
  assert(freshCard.querySelector('.review-again') === null,
    'non-due entry renders no remind-again select');
  assert(!Array.from(freshCard.querySelectorAll('.entry-actions .btn'))
    .some(b => b.textContent === 'Mark reviewed'),
    'non-due entry renders no mark-reviewed button');
  const againSel = dueCard.querySelector('.review-again');
  assert(againSel && againSel.value === '12',
    'remind-again select defaults to the thesis own interval (12) (got "' + (againSel && againSel.value) + '")');
  const markBtn = Array.from(dueCard.querySelectorAll('.entry-actions .btn'))
    .find(b => b.textContent === 'Mark reviewed');
  assert(markBtn, 'due entry renders Mark reviewed button');
  markBtn.click();
  rcards = document.querySelectorAll('#watchlist .entry');
  assert(rcards.length === 2, 'still two entries after mark-reviewed');
  assert(!Array.from(rcards).some(c => c.querySelector('.due-badge')), 'due badge cleared after mark-reviewed');
  assert(document.getElementById('watchlist-due').classList.contains('hidden'),
    'due summary hidden after mark-reviewed');
  const afterMark = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  const rc = afterMark.entries.find(x => x.name === 'Reminder Co');
  assert(rc.reviewAt === L.addMonths(L.todayISO(), 12) && rc.reviewMonths === 12,
    'reviewAt re-scheduled to today + thesis interval in localStorage (got ' + rc.reviewAt + ')');

  // custom interval: re-backdate, pick 3 months, mark reviewed
  afterMark.entries.forEach(x => { if (x.name === 'Reminder Co') x.reviewAt = '2020-01-01'; });
  window.localStorage.setItem('longterm-stock-lens-v1', JSON.stringify(afterMark));
  L.reloadJournal();
  rcards = document.querySelectorAll('#watchlist .entry');
  const dueAgain = rcards[0];
  assert(dueAgain.querySelector('.due-badge'), 'due badge back after re-backdating');
  const sel3 = dueAgain.querySelector('.review-again');
  sel3.value = '3';
  Array.from(dueAgain.querySelectorAll('.entry-actions .btn'))
    .find(b => b.textContent === 'Mark reviewed').click();
  const after3 = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  const rc3 = after3.entries.find(x => x.name === 'Reminder Co');
  assert(rc3.reviewAt === L.addMonths(L.todayISO(), 3) && rc3.reviewMonths === 3,
    'custom 3-month interval honored (got ' + rc3.reviewAt + ')');
  assert(document.querySelectorAll('#watchlist .entry').length === 2, 'entries intact after re-scheduling');

  // ---- export ----
  console.log('export:');
  assert(document.getElementById('export-json').disabled === false, 'export JSON enabled with entries');
  assert(document.getElementById('export-md').disabled === false, 'export Markdown enabled with entries');
  const createdURLs = [];
  window.URL.createObjectURL = blob => { createdURLs.push(blob); return 'blob:mock-' + createdURLs.length; };
  window.URL.revokeObjectURL = () => {};
  const clickedAnchors = [];
  const origClick = window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click = function () {
    clickedAnchors.push({ href: this.getAttribute('href'), download: this.getAttribute('download') });
  };
  document.getElementById('export-json').click();
  document.getElementById('export-md').click();
  window.HTMLAnchorElement.prototype.click = origClick;
  const stamp = new Date().toISOString().slice(0, 10);
  assert(createdURLs.length === 2, 'two blobs created');
  assert(createdURLs[0] instanceof window.Blob && createdURLs[0].type === 'application/json', 'JSON blob has right type');
  assert(createdURLs[1].type === 'text/markdown', 'Markdown blob has right type');
  assert(clickedAnchors[0].download === 'longterm-lens-journal-' + stamp + '.json', 'JSON download filename dated');
  assert(clickedAnchors[1].download === 'longterm-lens-journal-' + stamp + '.md', 'Markdown download filename dated');
  assert(clickedAnchors[0].href === 'blob:mock-1' && clickedAnchors[1].href === 'blob:mock-2',
    'anchors wired to object URLs');
  const mdText = await createdURLs[1].text();
  assert(mdText.includes('## Reminder Co') && mdText.includes('## Fresh Co'), 'exported markdown contains both entries');
  const jsonText = await createdURLs[0].text();
  assert(JSON.parse(jsonText).length === 2, 'exported JSON contains both entries');

  // cleanup: delete both entries via two-tap
  let guard = 0;
  while (document.querySelectorAll('#watchlist .entry').length && guard++ < 10) {
    const b = document.querySelector('#watchlist .entry .btn.danger');
    b.click(); b.click();
  }
  const finalStore = JSON.parse(window.localStorage.getItem('longterm-stock-lens-v1'));
  assert(finalStore.entries.length === 0, 'cleanup removed all entries');
  assert(document.getElementById('export-json').disabled === true, 'export JSON disabled when empty');
  assert(document.getElementById('export-md').disabled === true, 'export Markdown disabled when empty');

  // disclaimer present
  document.querySelector('.nav-btn[data-nav="home"]').click();
  assert(document.querySelector('.disclaimer-banner').textContent.includes('not financial advice'), 'hero disclaimer present');
  assert(document.querySelector('.footer').textContent.includes('Educational only, not financial advice'), 'footer disclaimer present');

  console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : '\n' + failures + ' FAILURES');
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('SMOKE TEST ERROR:', e.message); process.exit(1); });
