/* Edge-case probe for the lens daily loop: rapid clicks, long/emoji names,
 * migration, export contents. Reuses the smoke harness pattern.
 * jsdom quirks baked in: window.location.reload() does NOT navigate (use
 * L.reloadJournal() for the boot path), window.scrollTo is stubbed, and
 * journalToJSON returns a string (JSON.parse it). */
'use strict';
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
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, { url: 'http://127.0.0.1:' + port + '/index.html', resources: 'usable', runScripts: 'dangerously', virtualConsole: vc, beforeParse(window) { window.scrollTo = () => {}; } });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('load timeout')), 15000);
    dom.window.addEventListener('load', () => { clearTimeout(t); resolve(); });
  });
  const { window } = dom;
  const { document } = window;
  // (scrollTo stubbed in beforeParse — app calls it at boot)
  const L = window.LongTermLens;
  const KEY = 'longterm-stock-lens-v1';

  // 1. Rapid quick-add clicks: only one idea created?
  const nameInput = document.querySelector('#qa-name');
  const addBtn = document.querySelector('#qa-add');
  nameInput.value = 'Rapid Co';
  addBtn.click(); addBtn.click(); addBtn.click();
  let store = JSON.parse(window.localStorage.getItem(KEY));
  assert(store.ideas.length === 1, 'rapid triple-click quick-add creates exactly 1 idea (got ' + store.ideas.length + ')');

  // 2. 40+ char name + emoji-only name render inert (textContent, no markup).
  //    quick-add navigates to the idea detail, so re-render the list first.
  nameInput.value = 'A'.repeat(60);
  addBtn.click();
  nameInput.value = '📈🚀💎🙌';
  addBtn.click();
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  store = JSON.parse(window.localStorage.getItem(KEY));
  assert(store.ideas.length === 3, 'three ideas in store (got ' + store.ideas.length + ')');
  const rows = document.querySelectorAll('#ideas-list .idea-name');
  const emojiRow = Array.from(rows).find(r => r.textContent === '📈🚀💎🙌');
  assert(!!emojiRow, 'emoji-only name renders as a row');
  assert(emojiRow && emojiRow.innerHTML.indexOf('<') === -1, 'emoji name is inert text, no inner markup');

  // 3. Legacy store migration through the real boot path (L.reloadJournal),
  //    since jsdom does not implement window.location.reload navigation.
  const legacy = { ideas: [{ id: 'x1', name: 'Old One', thesis: 't' }], glossary: {} };
  window.localStorage.setItem(KEY, JSON.stringify(legacy));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const migrated = JSON.parse(window.localStorage.getItem(KEY));
  assert(migrated.ideas && migrated.ideas.length === 1 && migrated.ideas[0].name === 'Old One',
    'legacy v1 store migrates without losing ideas');
  assert(window.LongTermLens.SCHEMA_VERSION === 3, 'migrated store carries current schema');

  // 4. Export builders include ideas + composite scores (exposed as journalToJSON/journalToMarkdown)
  const js = JSON.parse(L.journalToJSON(migrated.ideas));
  const md = L.journalToMarkdown(migrated.ideas, '2026-10-09', migrated.trends);
  assert(Array.isArray(js) && js.length === 1 && js[0].name === 'Old One', 'export JSON contains the migrated idea');
  assert(typeof md === 'string' && md.indexOf('Old One') !== -1, 'export markdown contains the migrated idea');

  // 5. Second boot, pre-seeded: stored float quiz answer + unknown band label.
  //    beforeParse seeds localStorage before the app's scripts read it.
  const floatSeed = { schema: 3, ideas: [], trends: [], glossary: {},
    quizProfile: { total: 9, max: 18, bandLabel: 'NoSuchBand', date: '2026-10-19', answers: [0, 1, 1.5, 2, 3, 0] } };
  const vc2 = new VirtualConsole();
  const errors2 = [];
  vc2.on('jsdomError', e => errors2.push('jsdomError: ' + e.message));
  vc2.on('error', (...a) => errors2.push('console.error: ' + a.join(' ')));
  const dom2 = new JSDOM(html, { url: 'http://127.0.0.1:' + port + '/index.html', resources: 'usable', runScripts: 'dangerously', virtualConsole: vc2,
    beforeParse(window) { window.scrollTo = () => {}; window.localStorage.setItem(KEY, JSON.stringify(floatSeed)); } });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('load timeout (second boot)')), 15000);
    dom2.window.addEventListener('load', () => { clearTimeout(t); resolve(); });
  });
  const document2 = dom2.window.document;
  document2.querySelector('.nav-btn[data-nav="profile"]').click();
  const barIndex = document2.querySelector('#quiz-result .alloc-index');
  assert(barIndex && barIndex.textContent.includes('93%'), 'unknown band label falls back to the band the stored answers imply (93% index)');
  document2.querySelector('#quiz .btn.primary').click();
  assert(document2.getElementById('quiz-result').textContent.includes('Please answer question 3'),
    'stored float quiz answer counts as unanswered instead of laundering into a band');
  assert(errors2.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the seeded second boot');

  // 6. Third boot, clean state: the auto update check skips its reload while
  //    the page is dirty (a field focused) and still arms the guard once idle.
  const vc3 = new VirtualConsole();
  const errors3 = [];
  vc3.on('jsdomError', e => errors3.push('jsdomError: ' + e.message));
  vc3.on('error', (...a) => errors3.push('console.error: ' + a.join(' ')));
  const dom3 = new JSDOM(html, { url: 'http://127.0.0.1:' + port + '/index.html', resources: 'usable', runScripts: 'dangerously', virtualConsole: vc3,
    beforeParse(window) { window.scrollTo = () => {}; } });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('load timeout (third boot)')), 15000);
    dom3.window.addEventListener('load', () => { clearTimeout(t); resolve(); });
  });
  const w3 = dom3.window;
  const d3 = w3.document;
  const L3 = w3.LongTermLens;
  w3.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve('9.9.9') });
  d3.querySelector('.nav-btn[data-nav="ideas"]').click();
  d3.getElementById('qa-name').focus();
  L3.checkForUpdates(false);
  await new Promise(r => setTimeout(r, 100));
  assert(w3.sessionStorage.getItem('lrl-healed-9.9.9') === null, 'auto-reload skips while a field has focus (dirty state kept)');
  assert(d3.getElementById('btn-check-update').textContent === 'Update available — reload', 'skipped auto-reload still flags the update in the footer');
  d3.getElementById('qa-name').blur();
  L3.checkForUpdates(false);
  await new Promise(r => setTimeout(r, 100));
  assert(w3.sessionStorage.getItem('lrl-healed-9.9.9') === '1', 'auto-reload guard is still set once the page is idle');
  assert(errors3.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the third boot');

  // 7. Later boots share one helper (fresh JSDOM each, suite's own seams).
  async function bootLater(seedFn) {
    const vc = new VirtualConsole();
    const errs = [];
    vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message));
    vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));
    const dom = new JSDOM(html, { url: 'http://127.0.0.1:' + port + '/index.html', resources: 'usable', runScripts: 'dangerously', virtualConsole: vc,
      beforeParse(window) { window.scrollTo = () => {}; if (seedFn) seedFn(window); } });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('load timeout (later boot)')), 15000);
      dom.window.addEventListener('load', () => { clearTimeout(t); resolve(); });
    });
    return { w: dom.window, d: dom.window.document, L: dom.window.LongTermLens, errs };
  }

  // 8. Fourth boot: the thesis-draft autosave must clear its timer, or the
  //    auto self-heal stays disabled for the rest of the session.
  const b4 = await bootLater();
  const w4 = b4.w, d4 = b4.d, L4 = b4.L;
  w4.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve('4.5.8') });
  async function autoCheck4(stub) {
    const prev = w4.fetch;
    w4.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(stub) });
    L4.checkForUpdates(false);
    await new Promise(r => setTimeout(r, 120));
    w4.fetch = prev;
  }
  const readStore4 = () => JSON.parse(w4.localStorage.getItem(KEY));
  const draft4 = L4.makeIdea('DraftCo', '', '2026-01-01');
  w4.localStorage.setItem(KEY, JSON.stringify({ schema: 3, ideas: [draft4], trends: [], glossary: {}, quizProfile: null }));
  L4.reloadJournal();
  d4.querySelector('.nav-btn[data-nav="ideas"]').click();
  assert(d4.querySelectorAll('#ideas-list .idea-row').length === 1, 'autosave boot: seeded idea renders (probe booted)');
  d4.querySelector('#ideas-list .idea-main').click();
  const belief4 = d4.querySelector('#idea-detail .thesis-belief');
  assert(!!belief4, 'autosave boot: detail page shows thesis fields');
  belief4.value = 'draft thesis text';
  belief4.dispatchEvent(new w4.Event('input', { bubbles: true }));
  w4.sessionStorage.removeItem('lrl-healed-9.9.9');
  await autoCheck4('9.9.9');
  assert(w4.sessionStorage.getItem('lrl-healed-9.9.9') === null, 'auto-reload skips while the thesis draft timer is pending');
  await new Promise(r => setTimeout(r, 950));
  assert(readStore4().ideas[0].thesis && readStore4().ideas[0].thesis.belief === 'draft thesis text', 'thesis draft autosaved into the store after 800ms');
  await autoCheck4('9.9.9');
  assert(w4.sessionStorage.getItem('lrl-healed-9.9.9') === '1', 'auto-reload arms once the draft autosave has cleared its timer');
  assert(b4.errs.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the autosave boot');

  // 9. Fifth boot: the dirty check must see unsaved work that has no focus —
  //    a typed check-in note with focus on a chip, and typed quick-add names.
  const b5 = await bootLater();
  const w5 = b5.w, d5 = b5.d, L5 = b5.L;
  w5.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve('4.5.8') });
  async function autoCheck5(stub) {
    const prev = w5.fetch;
    w5.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve(stub) });
    L5.checkForUpdates(false);
    await new Promise(r => setTimeout(r, 120));
    w5.fetch = prev;
  }
  const readStore5 = () => JSON.parse(w5.localStorage.getItem(KEY));
  const due5 = L5.makeIdea('DueCo', '', '2026-01-01');
  w5.localStorage.setItem(KEY, JSON.stringify({ schema: 3, ideas: [due5], trends: [], glossary: {}, quizProfile: null }));
  L5.reloadJournal();
  d5.querySelector('.nav-btn[data-nav="ideas"]').click();
  assert(d5.querySelectorAll('#ideas-list .idea-row').length === 1, 'dirty-check boot: seeded due idea renders (probe booted)');
  d5.getElementById('qa-name').value = 'Unsaved Name';
  d5.querySelector('.nav-btn[data-nav="ideas"]').focus();
  w5.sessionStorage.removeItem('lrl-healed-9.9.9');
  await autoCheck5('9.9.9');
  assert(w5.sessionStorage.getItem('lrl-healed-9.9.9') === null, 'auto-reload skips with a typed-but-unsubmitted quick-add name');
  assert(!JSON.stringify(readStore5()).includes('Unsaved Name'), 'typed quick-add name is not in the store');
  d5.getElementById('qa-name').value = '';
  d5.getElementById('trend-name').value = 'Unsaved Trend';
  d5.querySelector('.nav-btn[data-nav="ideas"]').focus();
  await autoCheck5('9.9.9');
  assert(w5.sessionStorage.getItem('lrl-healed-9.9.9') === null, 'auto-reload skips with a typed-but-unsubmitted trend name');
  d5.getElementById('trend-name').value = '';
  d5.querySelector('.nav-btn[data-nav="reviews"]').click();
  Array.from(d5.querySelectorAll('#reviews-list .btn')).find(b => b.textContent === 'Check in').click();
  const form5 = d5.querySelector('#reviews-list .review-form');
  assert(!!form5, 'dirty-check boot: check-in form opened inline on the Check-ins screen');
  form5.querySelector('textarea').value = 'Probe note';
  form5.querySelector('input[type="number"]').value = '123';
  form5.querySelector('.chip').focus();
  assert(d5.activeElement && d5.activeElement.tagName === 'BUTTON', 'dirty-check boot: focus is on a chip button, not a field');
  assert(!JSON.stringify(readStore5()).includes('Probe note'), 'typed check-in note lives only in the DOM, nowhere in the store');
  await autoCheck5('9.9.9');
  assert(w5.sessionStorage.getItem('lrl-healed-9.9.9') === null, 'auto-reload skips with a typed check-in note open and focus off the fields');
  Array.from(form5.querySelectorAll('.btn')).find(b => b.textContent === 'Cancel').click();
  assert(d5.querySelector('.review-form') === null, 'dirty-check boot: cancelling the form removes it');
  await autoCheck5('9.9.9');
  assert(w5.sessionStorage.getItem('lrl-healed-9.9.9') === '1', 'auto-reload arms once the page is idle (positive control)');
  assert(b5.errs.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the dirty-check boot');

  // 10. Sixth boot: a mixed-validity profile shows the band AND the score
  //     from the same restored answers — never the stored total.
  const q2Seed = { schema: 3, ideas: [], trends: [], glossary: {},
    quizProfile: { total: 13, max: 18, bandLabel: 'Balanced', answers: [0, 99, 2, null, 'x', 3], date: '2026-09-01' } };
  const b6 = await bootLater(w => w.localStorage.setItem(KEY, JSON.stringify(q2Seed)));
  const d6 = b6.d;
  d6.querySelector('.nav-btn[data-nav="profile"]').click();
  const res6 = d6.getElementById('quiz-result').textContent;
  assert(res6.includes('Capital-preservation'), 'mixed-validity profile shows the band its valid answers imply');
  assert(res6.includes('Score 4 / 18'), 'mixed-validity profile shows the score recomputed from those same answers');
  assert(!res6.includes('Score 13 / 18'), 'mixed-validity profile never shows the stored total that contradicts its band');
  assert(b6.errs.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the mixed-validity boot');

  // 11. Seventh boot: string quiz answers never launder into a higher band.
  const q3Seed = { schema: 3, ideas: [], trends: [], glossary: {},
    quizProfile: { total: 3, max: 18, bandLabel: 'Capital-preservation', answers: [0, '1', '1', '1', '1', '1'] } };
  const b7 = await bootLater(w => w.localStorage.setItem(KEY, JSON.stringify(q3Seed)));
  const d7 = b7.d;
  d7.querySelector('.nav-btn[data-nav="profile"]').click();
  const res7 = d7.getElementById('quiz-result').textContent;
  assert(res7.includes('Capital-preservation'), 'string quiz answers do not change the band');
  assert(res7.includes('Score 3 / 18'), 'string-answer profile shows the score from its numeric answers only');
  assert(!res7.includes('Balanced'), 'string answers never launder into a higher band');
  assert(b7.errs.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the string-answers boot');

  // 12. Markdown export carries the price log and notes, not just names.
  const mdIdea = { id: 'e-md', name: 'MdCo', tickers: 'MD', status: 'open', createdAt: '2026-11-01', reviewMonths: 3, reviewHistory: [],
    thesis: { belief: 'Pricing power compounds.', falsify: '' },
    sealed: { belief: 'Pricing power compounds.', falsify: '', date: '2026-11-02' },
    priceLog: [{ date: '2026-11-01', price: 100, note: 'spotted' }, { date: '2026-11-20', price: 125 }],
    notes: [{ date: '2026-11-03', text: 'moat widening, pricing power intact' }] };
  const md12 = L.journalToMarkdown([mdIdea], '2026-11-24', []);
  assert(md12.includes('Price log (manually entered):') && md12.includes('2026-11-01: 100 — spotted') && md12.includes('2026-11-20: 125'), 'markdown export carries the price log with its note');
  assert(md12.includes('moat widening, pricing power intact'), 'markdown export carries the note text');

  // 13. Eighth boot: delete-my-data clears the quiz profile in the store, not just the rendered result.
  const wipeSeed = { schema: 3, ideas: [{ id: 'e-wipe', name: 'WipeCo', status: 'open', createdAt: '2026-11-01', reviewMonths: 3, reviewHistory: [], thesis: { belief: '', falsify: '' } }], trends: [], glossary: {},
    quizProfile: { total: 18, max: 18, bandLabel: 'Growth-leaning', index: 80, conv: 20, date: '2026-11-20', answers: [0, 0, 0, 0, 0, 0] } };
  const b8 = await bootLater(w => w.localStorage.setItem(KEY, JSON.stringify(wipeSeed)));
  const d8 = b8.d, w8 = b8.w;
  const del8 = d8.getElementById('delete-data');
  del8.click();
  assert(JSON.parse(w8.localStorage.getItem(KEY)).quizProfile !== null, 'wipe boot: first click only arms, profile intact');
  del8.click();
  assert(JSON.parse(w8.localStorage.getItem(KEY)).quizProfile === null, 'wipe boot: second click clears the quiz profile from the store');
  assert(b8.errs.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the wipe boot');

  // 14. Ninth boot: a check-in on an idea with no spot price shows no preview element and still records a typed price.
  const npSeed = { schema: 3, ideas: [{ id: 'e-np', name: 'NoPriceCo', tickers: 'NP', status: 'open', createdAt: '2026-11-24', reviewMonths: 3, reviewHistory: [], thesis: { belief: 'Cheap for a reason, or a bargain.', falsify: '' } }], trends: [], glossary: {}, quizProfile: null };
  const b9 = await bootLater(w => w.localStorage.setItem(KEY, JSON.stringify(npSeed)));
  const d9 = b9.d, w9 = b9.w;
  d9.querySelector('.nav-btn[data-nav="ideas"]').click();
  d9.querySelector('.idea-row .idea-main').click();
  const now9 = Array.from(d9.querySelectorAll('button')).find(b => b.textContent === 'Check in now');
  assert(now9, 'no-spot boot: Check in now button on the detail page');
  now9.click();
  const form9 = d9.querySelector('#idea-detail .review-form');
  assert(form9, 'no-spot boot: check-in form opened');
  assert(!form9.querySelector('.price-preview'), 'no-spot boot: no price-preview element without a spotted price');
  const price9 = form9.querySelector('input[type="number"]');
  price9.value = '50';
  price9.dispatchEvent(new w9.Event('input', { bubbles: true }));
  assert(!form9.querySelector('.price-preview'), 'no-spot boot: typing a price still creates no preview element');
  const chip9 = Array.from(form9.querySelectorAll('.chips[aria-label="So where does it stand?"] .chip')).find(c => c.textContent.includes('Still holds up'));
  chip9.click();
  Array.from(form9.querySelectorAll('button')).find(b => b.textContent === 'Save check-in').click();
  const saved9 = JSON.parse(w9.localStorage.getItem(KEY)).ideas.find(i => i.id === 'e-np');
  assert(saved9.priceLog && saved9.priceLog.some(p => p.price === 50), 'no-spot boot: typed price is recorded in the price log on save');
  assert(b9.errs.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the no-spot boot');

  // 15. Tenth boot: the discover box refuses an empty company name (and focuses it) and adds on Enter.
  const discSeed = { schema: 3, ideas: [], trends: [{ id: 't-robo', name: 'Robotaxis', status: 'watching', createdAt: '2026-11-01', updatedAt: '2026-11-01', why: 'Cars without drivers.' }], glossary: {}, quizProfile: null };
  const b10 = await bootLater(w => w.localStorage.setItem(KEY, JSON.stringify(discSeed)));
  const d10 = b10.d, w10 = b10.w;
  d10.querySelector('.nav-btn[data-nav="ideas"]').click();
  Array.from(d10.querySelectorAll('button')).find(b => b.textContent === 'Find companies').click();
  const box10 = d10.querySelector('.discover-box');
  assert(box10, 'discover boot: box opens');
  const name10 = box10.querySelector('input[aria-label^="Company name"]');
  Array.from(box10.querySelectorAll('button')).find(b => b.textContent === 'Add as idea').click();
  assert(JSON.parse(w10.localStorage.getItem(KEY)).ideas.length === 0, 'discover boot: empty company name adds nothing');
  assert(d10.activeElement === name10, 'discover boot: empty add focuses the name input');
  name10.value = 'RoboCo';
  name10.dispatchEvent(new w10.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const added10 = JSON.parse(w10.localStorage.getItem(KEY)).ideas.find(i => i.name === 'RoboCo');
  assert(added10 && added10.trendId === 't-robo', 'discover boot: Enter adds the company, linked to its trend');
  assert(b10.errs.filter(e => !e.includes('Not implemented')).length === 0, 'no script errors on the discover boot');

  console.log('script errors during probe:');
  assert(errors.length === 0, 'no script errors (' + errors.length + ')');
  errors.forEach(e => console.error('    ' + e));
  server.close();
  process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
