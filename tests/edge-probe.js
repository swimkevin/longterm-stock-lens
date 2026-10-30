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
  assert(errors2.filter(e => !e.includes('Not implemented') && !e.includes('scrollIntoView')).length === 0, 'no script errors on the seeded second boot');

  console.log('script errors during probe:');
  assert(errors.length === 0, 'no script errors (' + errors.length + ')');
  errors.forEach(e => console.error('    ' + e));
  server.close();
  process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
