'use strict';
// Golden suite — the held-out proof set for Long-Term Lens.
//
// Ownership rule (playbook rule 27): the daily loop may RUN this file but may
// NOT edit it. Only a fresh-eyes audit run may add, remove, or change a test
// here, and only with a stated reason in the loop log. The implementer writes
// its own regression tests in tests/smoke.js; only this file counts as
// independent proof, because the agent that writes a fix must never be the
// only author of the test that certifies it.
//
// Coverage: one end-to-end pass over the core loop (profile -> idea -> sealed
// thesis -> conviction -> check-in -> scorecard) plus the invariants that
// must never regress: sealed read-only, local-only dates, no sec.gov links,
// export/import round-trip, footer version. Kept small on purpose (~20
// assertions, one jsdom boot) so it stays fast enough to run on every push.
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
  const pkgVer = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
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
  const KEY = 'longterm-stock-lens-v1';
  const readStore = () => JSON.parse(window.localStorage.getItem(KEY));
  const chip = (form, text) => Array.from(form.querySelectorAll('.chip')).find(b => b.textContent === text);

  console.log('golden: fresh visitor + profile');
  const bootReal = errors.filter(e => !e.includes('Not implemented'));
  assert(bootReal.length === 0, 'no console/script errors on boot (' + bootReal.length + ' real of ' + errors.length + ')');
  assert(!document.getElementById('screen-profile').classList.contains('hidden'),
    'fresh visitor lands on Profile first');
  assert(['profile', 'ideas', 'reviews', 'track', 'learn'].every(t => document.querySelector('.nav-btn[data-nav="' + t + '"]')),
    'all five tabs render');

  const quizQs = () => document.querySelectorAll('#quiz .q');
  const submitQuiz = () => document.querySelector('#quiz .btn.primary').click();
  for (let qi = 0; qi < quizQs().length; qi++) quizQs()[qi].querySelectorAll('.opt-btn')[0].click();
  submitQuiz();
  assert(document.getElementById('quiz-result').textContent.includes('Growth-leaning'),
    'max-score quiz lands Growth-leaning');
  assert(!document.getElementById('quiz-result').textContent.includes('Capped at Cautious'),
    'max-score quiz carries no cap note');

  console.log('golden: quiz veto');
  Array.from(document.querySelectorAll('#quiz-result .btn')).find(b => b.textContent === 'Retake the quiz').click();
  const vetoAnswers = [0, 0, 0, 3, 0, 0];
  for (let qi = 0; qi < quizQs().length; qi++) quizQs()[qi].querySelectorAll('.opt-btn')[vetoAnswers[qi]].click();
  submitQuiz();
  assert(document.getElementById('quiz-result').textContent.includes('Cautious'),
    'high-interest-debt answer caps the band at Cautious');
  assert(document.getElementById('quiz-result').textContent.includes('Capped at Cautious'),
    'capped result says so in plain language');

  console.log('golden: idea -> sealed thesis -> conviction -> check-in');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.querySelector('#qa-name').value = 'Golden Co';
  document.querySelector('#qa-add').click();
  assert(document.querySelector('#idea-detail h1').textContent === 'Golden Co', 'quick-add opens the new idea');
  document.querySelector('#idea-detail .thesis-belief').value = 'Golden Co compounds for a decade';
  document.querySelector('#idea-detail .thesis-falsify').value = 'Growth stalls two years running';
  document.querySelector('#idea-detail [data-action="thesis-save"]').click();
  assert(document.querySelector('#idea-detail .sealed-words') !== null, 'first save seals the thesis');
  assert(!document.querySelector('#idea-detail .thesis-belief'), 'sealed thesis offers no edit box');
  const sealed = readStore().ideas.find(i => i.name === 'Golden Co').sealed;
  assert(sealed && sealed.date === L.todayISO() && !/[TZ]/.test(sealed.date), 'seal date is a local date, never UTC');
  Array.from(document.querySelectorAll('#idea-detail .conv-btn')).find(b => b.textContent === '4').click();
  assert(readStore().ideas.find(i => i.name === 'Golden Co').conviction === 4, 'conviction 4 stored');
  document.querySelector('#idea-detail [data-action="checkin-now"]').click();
  const gForm = document.querySelector('#idea-detail .detail-review-wrap .review-form');
  assert(gForm && !gForm.querySelectorAll('.chips')[1].querySelector('.chip.selected'),
    'check-in form pre-selects no outcome');
  chip(gForm, 'Yes — for my reasons').click();
  chip(gForm, 'Still holds up').click();
  gForm.querySelector('textarea').value = 'On track.';
  Array.from(gForm.querySelectorAll('.btn.primary')).find(b => b.textContent === 'Save check-in').click();
  const checked = readStore().ideas.find(i => i.name === 'Golden Co');
  assert(checked.reviewHistory.length === 1 && checked.reviewHistory[0].outcome === 'intact' &&
    checked.reviewHistory[0].reasonMatch === 'yes' && checked.reviewHistory[0].conviction === 4,
    'check-in records outcome, reason, and the conviction snapshot');

  console.log('golden: scorecard + learn + filter');
  document.querySelector('.nav-btn[data-nav="track"]').click();
  assert(document.getElementById('track-record').textContent.includes('100%'),
    'scorecard shows the 1-of-1 verdict at 100%');
  document.querySelector('.nav-btn[data-nav="learn"]').click();
  assert(document.querySelectorAll('#glossary .gloss').length === 13, 'Learn renders 13 lessons');
  assert(document.querySelectorAll('#wisdom-list .wisdom').length === 10, 'Learn wisdom list shows all 10 quotes');

  console.log('golden: export/import round-trip + invariants');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const filter = document.querySelector('#idea-filter');
  filter.value = 'Golden';
  filter.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(document.querySelectorAll('#ideas-list .idea-row').length === 1, 'filter narrows to the one idea');
  filter.value = '';
  filter.dispatchEvent(new window.Event('input', { bubbles: true }));
  const createdURLs = [];
  window.URL.createObjectURL = blob => { createdURLs.push(blob); return 'blob:mock-' + createdURLs.length; };
  window.URL.revokeObjectURL = () => {};
  const origClick = window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click = function () {};
  document.getElementById('export-json').click();
  window.HTMLAnchorElement.prototype.click = origClick;
  const jsonText = await createdURLs[0].text();
  assert(JSON.parse(jsonText).some(i => i.name === 'Golden Co'), 'exported JSON contains the idea');
  const rt = L.importIdeasFromJSON(L.journalToJSON(readStore().ideas));
  assert(!rt.error && rt.ideas.some(i => i.name === 'Golden Co' && i.sealed && i.sealed.belief === 'Golden Co compounds for a decade'),
    'export -> import round-trips the sealed thesis');
  assert(document.querySelectorAll('a[href*="sec.gov"]').length === 0, 'no sec.gov links anywhere on the page');
  assert(document.querySelector('#app-version').textContent === 'v' + pkgVer,
    'footer version matches package.json (v' + pkgVer + ')');

  console.log('golden: delete-my-data');
  const delBtn = document.getElementById('delete-data');
  delBtn.click();
  assert(delBtn.classList.contains('armed') && readStore().ideas.length === 1, 'first click only arms; data intact');
  delBtn.click();
  assert(readStore().ideas.length === 0, 'second click wipes the ideas');

  server.close();
  if (failures) { console.error(failures + ' GOLDEN FAILURES'); process.exit(1); }
  console.log('GOLDEN: all golden assertions passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
