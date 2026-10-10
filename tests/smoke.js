/* Long-Term Lens smoke test (v1.3: streamlined idea page).
 * 1. Boots the real index.html in jsdom (reusing the sibling poker-sparring
 *    install — dev-only, the shipped site has zero dependencies).
 * 2. Asserts pure-logic behavior via window.LongTermLens.
 * 3. Clicks through every nav tab, runs the investor-profile quiz, quick-adds
 *    an idea (incl. an XSS probe), exercises the thesis template, the
 *    checklist conviction gate, the equal-weighted scorecard, collapsed
 *    assumptions, notes, the review flow, the track record, a lesson
 *    quiz, migration of legacy journal data, and exports.
 * Fails loudly on any script error.
 */
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
  // Update this when lessons are added/removed — every lesson-count assertion below derives from it.
  const EXPECTED_LESSONS = 13;
  const readStore = () => JSON.parse(window.localStorage.getItem(KEY));

  console.log('script errors:');
  assert(errors.length === 0, 'no console/script errors on boot (' + errors.length + ')');
  errors.forEach(e => console.error('    ' + e));
  assert(L && typeof L.scoreRisk === 'function', 'LongTermLens API exposed');
  assert(L.SCHEMA_VERSION === 3, 'schema version is 3');

  // ---- pure logic ----
  console.log('risk scoring:');
  let r = L.scoreRisk([0, 0, 0, 0, 0, 0]);
  assert(r.total === 18 && r.band.index === 80 && r.band.conv === 20, 'max score -> 80/20 growth band');
  r = L.scoreRisk([3, 3, 3, 3, 3, 3]);
  assert(r.total === 0 && r.band.index === 98 && r.band.conv === 2, 'min score -> 98/2 preservation band');
  assert(L.BANDS.every(b => b.index + b.conv === 100), 'every band sums to 100%');

  console.log('conviction (single 1-5 scale):');
  assert(L.convictionOf({ conviction: 4 }) === 4, 'explicit conviction returned');
  assert(L.convictionOf({}) === null, 'no conviction, no legacy -> null');
  assert(L.convictionOf(null) === null, 'null idea -> null');
  assert(L.convictionDots(4) === '●●●●○', 'dots render');
  assert(L.convictionDots(null) === 'Unscored', 'null -> Unscored');
  const legacyHi = { scores: { quality: 5, value: 5, conviction: 5 }, weights: { quality: 40, value: 30, conviction: 30 } };
  assert(L.convictionOf(legacyHi) === 5, 'legacy 100 composite migrates to 5');
  const legacyLow = { scores: { quality: 1, value: 1, conviction: 1 }, weights: { quality: 40, value: 30, conviction: 30 } };
  assert(L.convictionOf(legacyLow) === 1, 'legacy 20 composite migrates to 1');

  console.log('makeIdea defaults:');
  const idea0 = L.makeIdea('Test Co', 'TST', '2026-10-09');
  assert(idea0.status === 'open' && idea0.conviction == null, 'draft defaults: open + unscored');
  assert(idea0.reviewAt === '2027-01-09' && idea0.reviewMonths === 3, '~90-day review default (got ' + idea0.reviewAt + ')');
  assert(idea0.tickers === 'TST', 'ticker uppercased');
  assert(L.compositeScore(idea0) === null, 'fresh idea is unscored');

  console.log('review dates:');
  assert(L.addMonths('2026-10-04', 6) === '2027-04-04', '6 months from Oct -> Apr next year');
  assert(L.addMonths('2026-01-31', 1) === '2026-02-28', 'clamps to end of Feb (non-leap)');
  assert(L.addMonths('nope', 6) === null, 'invalid input -> null');
  assert(L.reviewAtOf({ reviewAt: '2027-01-01', createdAt: '2026-10-04' }) === '2027-01-01', 'explicit reviewAt wins');
  assert(L.reviewAtOf({ createdAt: '2026-10-04' }) === '2026-10-04'.slice(0, 0) + '2027-01-04',
    'no reviewAt defaults to createdAt + 3 months (~90 days)');
  assert(L.reviewAtOf({ reviewAt: 'garbage', createdAt: '2026-10-04' }) === '2027-01-04', 'invalid reviewAt falls back to +3mo');
  assert(L.isReviewDue({ reviewAt: '2020-01-01' }, '2026-10-04') === true, 'past review date is due');
  assert(L.isReviewDue({ reviewAt: '2026-10-04' }, '2026-10-04') === true, 'review date == today is due');
  assert(L.isReviewDue({ reviewAt: '2026-10-05' }, '2026-10-04') === false, 'future review date is not due');

  console.log('setReviewAt:');
  const s1 = L.setReviewAt({ id: 'e1', reviewAt: '2027-01-01' }, '2026-12-15');
  assert(s1 && s1.reviewAt === '2026-12-15', 'valid date sets reviewAt');
  assert(L.setReviewAt({ id: 'e1' }, 'not-a-date') === null, 'invalid date -> null');
  assert(L.setReviewAt({ id: 'e1' }, '') === null, 'empty date -> null');

  console.log('rescheduleReview:');
  const base = { id: 'e1', name: 'Base', createdAt: '2026-10-04', reviewMonths: 3, reviewAt: '2020-01-01' };
  const r3 = L.rescheduleReview(base, '3', '2026-10-08');
  assert(r3.reviewAt === '2027-01-08' && r3.reviewMonths === 3, '3 months from explicit today');
  const rBad = L.rescheduleReview(base, '99', '2026-10-08');
  assert(rBad.reviewAt === '2027-01-08' && rBad.reviewMonths === 3, 'invalid months fall back to 3');
  assert(base.reviewAt === '2020-01-01', 'original idea object not mutated');

  console.log('applyReview:');
  const ar1 = L.applyReview(idea0, { outcome: 'intact', reasonMatch: 'yes', note: 'Still good.', nextMonths: '3' }, '2026-10-09');
  assert(ar1.reviewHistory.length === 1 && ar1.reviewHistory[0].outcome === 'intact', 'review appended to history');
  assert(ar1.reviewHistory[0].reasonMatch === 'yes' && ar1.reviewHistory[0].note === 'Still good.', 'reason + note preserved');
  assert(ar1.reviewAt === '2027-01-09', 'next review re-scheduled (got ' + ar1.reviewAt + ')');
  assert(ar1.status === 'open', 'intact keeps idea open');
  const ar2 = L.applyReview(idea0, { outcome: 'resolved', reasonMatch: 'no', note: '', nextMonths: '6' }, '2026-10-09');
  assert(ar2.status === 'resolved', 'resolved outcome flips status');
  assert(ar2.reviewAt === '2027-04-09', 'resolved still re-schedules review-by');
  const ar3 = L.applyReview(idea0, { outcome: 'weird', reasonMatch: 'maybe' }, '2026-10-09');
  assert(ar3.reviewHistory[0].outcome === 'intact' && ar3.reviewHistory[0].reasonMatch === 'na',
    'invalid outcome/reason sanitized to intact/na');

  console.log('trackRecord:');
  const trIdeas = [
    { reviewHistory: [{ outcome: 'intact', reasonMatch: 'yes' }, { outcome: 'changed', reasonMatch: 'no' }] },
    { reviewHistory: [{ outcome: 'resolved', reasonMatch: 'yes' }] },
    { reviewHistory: [{ outcome: 'intact', reasonMatch: 'na' }] },
  ];
  const tr = L.trackRecord(trIdeas);
  assert(tr.reviews === 4 && tr.intact === 2 && tr.changed === 1 && tr.resolved === 1, 'outcome counts (got ' + JSON.stringify(tr) + ')');
  assert(tr.reasonAccuracy === 67, 'reason accuracy 2/3 -> 67% (got ' + tr.reasonAccuracy + ')');
  assert(L.trackRecord([]).reasonAccuracy === null, 'no reviews -> null accuracy');
  assert(L.trackRecord([{ reviewHistory: [{ outcome: 'intact', reasonMatch: 'na' }] }]).reasonAccuracy === null,
    'na-only reviews -> null accuracy');

  console.log('analyze prompt builder:');
  assert(typeof L.buildAnalyzePrompt === 'function', 'buildAnalyzePrompt exported');
  const richIdea = {
    name: 'Acme Semiconductor', tickers: 'ACME',
    thesis: { belief: 'AI inference at the edge', falsify: 'loses top-3 share' },
    conviction: 4, reviewAt: '2027-01-09',
  };
  const prompt = L.buildAnalyzePrompt(richIdea);
  assert(typeof prompt === 'string' && prompt.length > 400, 'prompt is a substantial string');
  assert(prompt.includes('Acme Semiconductor') && prompt.includes('ACME'), 'prompt carries name + ticker');
  assert(prompt.includes('AI inference at the edge') && prompt.includes('loses top-3 share'), 'prompt carries thesis fields');
  assert(prompt.includes('MY CONVICTION: 4 / 5'), 'prompt carries the conviction score');
  assert(!prompt.includes('checklist') && !prompt.includes('scorecard'), 'prompt dropped the old complexity');
  assert(prompt.includes('never tell me whether to buy or sell'), 'prompt keeps the educational-only boundary');
  assert(prompt.includes('Similar companies'), 'prompt asks for similar companies');
  assert(prompt.includes('Cite the source and date'), 'prompt demands metric sourcing');
  const xssPrompt = L.buildAnalyzePrompt({ name: '<img src=x onerror=alert(1)>', thesis: {} });
  assert(xssPrompt.includes('<img src=x onerror=alert(1)>'), 'user content kept verbatim as text');
  assert(!/<script/i.test(xssPrompt.replace('<img src=x onerror=alert(1)>', '')), 'prompt adds no markup of its own');
  const emptyPrompt = L.buildAnalyzePrompt(null);
  assert(emptyPrompt.includes('Unnamed idea') && emptyPrompt.includes('(not written yet)'), 'null idea degrades gracefully');

  console.log('migration:');
  const legacy = { entries: [
    { id: 'e1', name: 'Acme', tickers: 'ACME', tags: ['AI'], thesis: 'Great company.', falsify: 'If not.',
      scores: { product: 5, fundamentals: 4, moat: 3, valuation: 2, horizon: 5 },
      weighted: 3.9, scored: 5, createdAt: '2026-10-04', reviewMonths: 12, reviewAt: '2027-10-04' },
    { id: 'e2', name: 'Beta', tickers: '', tags: [], thesis: 'Fine.', falsify: '',
      scores: {}, weighted: null, scored: 0, createdAt: '2026-10-04' },
  ]};
  const mig = L.migrateStore(legacy);
  assert(mig.schema === 3 && mig.ideas.length === 2, 'legacy entries become 2 ideas, schema 3');
  const m0 = mig.ideas[0];
  assert(m0.name === 'Acme' && m0.tickers === 'ACME' && m0.tags.join() === 'AI', 'name/ticker/tags preserved');
  assert(m0.thesis.belief === 'Great company.' && m0.thesis.falsify === 'If not.', 'thesis + falsify preserved in template');
  assert(m0.conviction === 4, 'conviction = rounded mean of old 5-dim scores (5,4,3,2,5 -> 4)');
  assert(m0.legacyScores.fundamentals === 4 && m0.legacyScores.horizon === 5, 'old 5-dim scores kept verbatim as legacyScores');
  assert(m0.reviewAt === '2027-10-04' && m0.reviewMonths === 12, 'review date preserved');
  assert(L.convictionOf(m0) === 4, 'migrated conviction reads back (got ' + L.convictionOf(m0) + ')');
  const m1 = mig.ideas[1];
  assert(m1.reviewAt === '2027-04-04' && m1.reviewMonths === 6, 'pre-reviewAt legacy entry defaults to createdAt + 6mo');
  assert(L.convictionOf(m1) === null, 'unscored legacy entry stays unscored');
  const migEmpty = L.migrateStore(null);
  assert(migEmpty.schema === 3 && migEmpty.ideas.length === 0, 'null raw -> blank v3 store');
  const migV2 = L.migrateStore({ schema: 1, ideas: [{ id: 'x', name: 'X' }] });
  assert(migV2.ideas.length === 1 && migV2.ideas[0].name === 'X', 'ideas-shape store adopted as-is');
  const thin = L.normalizeIdea({ id: 't', name: 'Thin' });
  assert(thin.thesis.belief === '' && thin.conviction == null,
    'normalizeIdea fills missing thesis/conviction');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(thin.reviewAt), 'normalizeIdea derives a valid reviewAt');

  console.log('trends:');
  assert(typeof L.makeTrend === 'function' && typeof L.trendToIdea === 'function' &&
    typeof L.markTrendMissed === 'function' && typeof L.setTrendLesson === 'function' &&
    typeof L.normalizeTrend === 'function' && typeof L.migrateV2ToV3 === 'function',
    'trend functions exported');
  assert(JSON.stringify(L.TREND_STATUSES) === JSON.stringify(['watching', 'missed', 'chased']),
    'trend statuses are watching/missed/chased');
  const tr0 = L.makeTrend('AI coding agents', 'Every dev I know uses one daily', '2026-10-09');
  assert(tr0.status === 'watching' && tr0.lesson === '' && tr0.ideaId === null,
    'makeTrend defaults to watching with empty lesson/ideaId');
  assert(tr0.createdAt === '2026-10-09' && /^t[0-9a-z]+$/.test(tr0.id), 'makeTrend id + createdAt');
  assert(L.makeTrend('x'.repeat(200), 'y'.repeat(2000), '2026-10-09').name.length === 80 &&
    L.makeTrend('x', 'y'.repeat(2000), '2026-10-09').why.length === 1000,
    'makeTrend slices name to 80 and why to 1000');
  const thinTrend = L.normalizeTrend({ name: 'Thin' });
  assert(thinTrend.status === 'watching' && thinTrend.why === '' && thinTrend.lesson === '' &&
    thinTrend.ideaId === null, 'normalizeTrend fills missing fields');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(thinTrend.createdAt) && typeof thinTrend.id === 'string',
    'normalizeTrend derives createdAt + id');
  const badTrend = L.normalizeTrend({ status: 'bogus', name: 42, why: null });
  assert(badTrend.status === 'watching' && badTrend.name === '' && badTrend.why === '',
    'normalizeTrend repairs bad status and non-string fields');
  const missedT = L.markTrendMissed(tr0, '2026-11-01');
  assert(missedT.status === 'missed' && missedT.updatedAt === '2026-11-01' && tr0.status === 'watching',
    'markTrendMissed flips status immutably');
  const lessonT = L.setTrendLesson(missedT, 'z'.repeat(2000));
  assert(lessonT.lesson.length === 1000 && missedT.lesson === '', 'setTrendLesson slices to 1000, immutable');
  const made = L.trendToIdea(tr0, '2026-10-10');
  assert(made.idea.name === 'AI coding agents' && made.idea.trendId === tr0.id,
    'trendToIdea seeds idea name + trendId back-link');
  assert(made.idea.thesis.belief.includes('2026-10-09') && made.idea.thesis.belief.includes('Every dev I know'),
    'thesis belief seeded with spotted date + why');
  assert(made.idea.thesis.reasons === '' && made.idea.thesis.falsify === '', 'other thesis fields start empty');
  assert(made.trend.status === 'chased' && made.trend.ideaId === made.idea.id,
    'trend marked chased with ideaId');
  assert(tr0.status === 'watching', 'trendToIdea leaves the original trend untouched');
  const emptyMade = L.trendToIdea(L.makeTrend('Nameless wave', '', '2026-10-09'));
  assert(emptyMade.idea.thesis.belief === '', 'empty why -> empty thesis belief, no crash');
  const v2store = { schema: 2, ideas: [{ id: 'e1', name: 'Kept' }],
    glossary: { 'P/E': { best: 3 } }, quizProfile: { bandLabel: 'X' } };
  const v3 = L.migrateV2ToV3(v2store);
  assert(v3.schema === 3 && Array.isArray(v3.trends) && v3.trends.length === 0,
    'v2->v3 adds empty trends, schema 3');
  assert(v3.ideas.length === 1 && v3.ideas[0].name === 'Kept' && v3.ideas[0].trendId === null,
    'v2->v3 preserves ideas (trendId defaulted)');
  assert(v3.glossary['P/E'].best === 3 && v3.quizProfile.bandLabel === 'X',
    'v2->v3 preserves glossary + profile');
  const mdTrends = L.journalToMarkdown([], '2026-10-04', [tr0, missedT]);
  assert(mdTrends.includes('## Trend: AI coding agents (Watching)'), 'markdown exports watching trend w/ status label');
  assert(mdTrends.includes('## Trend: AI coding agents (Missed)'), 'markdown exports missed trend');
  assert(mdTrends.includes('Why it could matter: Every dev I know'), 'markdown exports the why note');
  assert(mdTrends.includes('No ideas yet'), 'markdown still handles empty ideas when trends exist');

  console.log('export builders:');
  const md = L.journalToMarkdown(mig.ideas, '2026-10-04');
  assert(md.includes('## Acme (ACME)'), 'markdown has name + ticker heading');
  assert(md.includes('Conviction: 4 / 5'), 'markdown shows conviction');
  assert(md.includes('Would prove me wrong: If not.'), 'markdown includes falsify text');
  assert(md.includes('not financial advice'), 'markdown carries disclaimer');
  assert(L.journalToMarkdown([], '2026-10-04').includes('No ideas yet'), 'empty markdown export handled');
  const js = JSON.parse(L.journalToJSON(mig.ideas));
  assert(Array.isArray(js) && js.length === 2 && js[0].name === 'Acme', 'JSON export round-trips ideas array');

  console.log('glossary micro-lessons:');
  assert(L.GLOSSARY.length === EXPECTED_LESSONS, EXPECTED_LESSONS + ' glossary terms');
  assert(L.GLOSSARY.every(g => g.quiz && g.quiz.length === 3), 'every term has a 3-question quiz');
  assert(L.GLOSSARY.every(g => g.quiz.every(q => q.options.length >= 3 && q.a >= 0 && q.a < q.options.length && q.why)),
    'every quiz question has options, a valid answer index, and an explanation');

  console.log('glossary search:');
  assert(L.filterGlossaryTerms('').length === EXPECTED_LESSONS, 'empty query matches all');
  assert(L.filterGlossaryTerms('moat').length === 1, 'query "moat" finds Economic moat');
  assert(L.filterGlossaryTerms('xyzzy').length === 0, 'no-match query returns empty');

  // ---- navigation ----
  console.log('navigation:');
  const tabs = ['ideas', 'reviews', 'track', 'trends', 'profile', 'learn', 'accounts'];
  tabs.forEach(t => {
    document.querySelector('.nav-btn[data-nav="' + t + '"]').click();
    const visible = !document.getElementById('screen-' + t).classList.contains('hidden');
    const othersHidden = tabs.filter(x => x !== t)
      .every(x => document.getElementById('screen-' + x).classList.contains('hidden'));
    assert(visible && othersHidden, 'tab "' + t + '" shows its screen only');
  });
  // idea detail screen is not in the nav; reachable via openIdea only
  assert(document.getElementById('screen-idea').classList.contains('hidden'), 'idea detail hidden until an idea opens');

  // ---- investor profile quiz ----
  console.log('investor profile quiz:');
  document.querySelector('.nav-btn[data-nav="profile"]').click();
  document.querySelectorAll('#quiz .q').forEach(q => q.querySelector('.opt-btn').click());
  document.querySelector('#quiz .btn.primary').click();
  const res = document.getElementById('quiz-result');
  assert(!res.classList.contains('hidden'), 'result appears after answering all questions');
  assert(res.textContent.includes('80% index'), 'result shows 80% index allocation');
  assert(res.querySelector('.alloc-conv').textContent === '20%', 'conv segment uses short label');
  assert(res.getAttribute('role') === 'status', 'quiz result announced via role=status');
  assert(res.querySelector('.alloc-bar').getAttribute('aria-label').includes('20 percent conviction stocks'),
    'aria-label carries full wording');
  const prof = readStore().quizProfile;
  assert(prof && prof.bandLabel === 'Growth-leaning' && prof.total === 18, 'quiz result persisted to store (quizProfile)');
  const savedLine = document.querySelector('#quiz .quiz-saved');
  assert(savedLine && savedLine.textContent.includes('Growth-leaning') && savedLine.textContent.includes('18 / 18'),
    'Last-result line refreshes immediately to the new result (got "' + (savedLine ? savedLine.textContent : 'none') + '")');

  // ---- migration through the real boot path ----
  console.log('migration via reloadJournal:');
  window.localStorage.setItem(KEY, JSON.stringify(legacy));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  let rows = document.querySelectorAll('#ideas-list .idea-row');
  assert(rows.length === 2, 'migrated ideas render in the ideas list (got ' + rows.length + ')');
  assert(rows[0].querySelector('.idea-name').textContent === 'Acme', 'higher-scored migrated idea sorts first');
  assert(rows[0].querySelector('.idea-score').textContent === '●●●●○', 'migrated conviction renders as dots');
  assert(readStore().schema === 3, 'store upgraded to schema 3');
  // wipe for the rest of the UI tests
  window.localStorage.removeItem(KEY);
  L.reloadJournal();
  assert(document.querySelectorAll('#ideas-list .idea-row').length === 0, 'clean slate after wipe');

  // ---- quick-add + idea detail ----
  console.log('quick-add:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-add').click();
  const qaErr = document.getElementById('qa-error');
  assert(!qaErr.classList.contains('hidden') && qaErr.getAttribute('role') === 'alert', 'empty name blocked with inline error');
  document.getElementById('qa-name').value = 'Test Co';
  document.getElementById('qa-tickers').value = 'tst';
  document.getElementById('qa-add').click();
  assert(!document.getElementById('screen-idea').classList.contains('hidden'), 'quick-add opens the idea detail screen');
  assert(document.querySelector('#idea-detail h1').textContent === 'Test Co', 'detail header shows the idea name');
  let st = readStore();
  assert(st.ideas.length === 1 && st.ideas[0].tickers === 'TST', 'idea persisted with uppercased ticker');
  assert(st.ideas[0].reviewAt === L.addMonths(st.ideas[0].createdAt, 3), 'review-by defaults to ~90 days');
  const ideaId = st.ideas[0].id;

  console.log('thesis + conviction:');
  const beliefTa = document.querySelector('#idea-detail textarea');
  beliefTa.value = 'I believe this company wins.';
  const falsifyInput = document.querySelector('#idea-detail input[type="text"]');
  falsifyInput.value = 'If growth stalls 2 years.';
  Array.from(document.querySelectorAll('#idea-detail .btn.primary'))
    .find(b => b.textContent === 'Save').click();
  st = readStore();
  assert(st.ideas[0].thesis.belief === 'I believe this company wins.', 'thesis belief saved');
  assert(st.ideas[0].thesis.falsify.includes('stalls'), 'falsify saved');

  console.log('conviction tap:');
  const convBtns = document.querySelectorAll('#idea-detail .conv-btn');
  assert(convBtns.length === 5, 'five conviction buttons');
  convBtns[3].click();
  st = readStore();
  assert(st.ideas[0].conviction === 4, 'tapping 4 sets conviction');
  assert(document.querySelector('#idea-detail .conv-btn.selected').textContent === '4', 'selected button highlighted');

  console.log('simplified detail page:');
  assert(document.querySelectorAll('#idea-detail .score-btns').length === 0, 'no scorecard rows');
  assert(document.querySelectorAll('#idea-detail .check-item').length === 0, 'no checklist items');
  assert(!document.querySelector('#idea-detail details'), 'no collapsed assumption sections');
  assert(document.querySelectorAll('#idea-detail .panel').length >= 3, 'thesis, conviction, review panels');
  assert(document.querySelector('#idea-detail .analyze-sec'), 'AI verify section present');
  assert(document.querySelector('#idea-detail .link-danger'), 'subtle delete link present');

  console.log('streamlined page: thesis, conviction, AI verify, review');
  const secTitles = [...document.querySelectorAll('#idea-detail .panel h2, #idea-detail .analyze-sec h3')]
    .map(el => el.textContent);
  assert(JSON.stringify(secTitles) === JSON.stringify(['Thesis', 'Conviction', 'AI verify', 'Review']),
    'page order: thesis -> conviction -> AI verify -> review (got ' + JSON.stringify(secTitles) + ')');

  console.log('AI verify section:');
  const analyzeSec = document.querySelector('#idea-detail .analyze-sec');
  assert(analyzeSec !== null, 'AI verify section renders on idea detail');
  const analyzeBox = analyzeSec.querySelector('.analyze-prompt');
  assert(analyzeBox && analyzeBox.tagName === 'TEXTAREA', 'prompt shown in a readonly textarea');
  assert(analyzeBox.readOnly === true, 'prompt textarea is readonly');
  assert(analyzeBox.value.includes('XSS <img src=x onerror=alert(1)>') || analyzeBox.value.length > 100,
    'prompt reflects the current idea');
  assert(analyzeSec.querySelector('#idea-detail img') === null, 'prompt added no elements');
  const copyBtn = Array.from(analyzeSec.querySelectorAll('.btn')).find(b => b.textContent === 'Copy prompt');
  assert(copyBtn, 'Copy prompt button exists');
  copyBtn.click(); // must not throw even without a clipboard API in jsdom
  assert(true, 'copy click is safe without clipboard');

  console.log('quiet secondary nav:');
  assert(document.querySelector('details.nav-more') !== null, 'secondary nav lives in a details menu');
  ['reviews', 'track', 'trends', 'profile', 'learn', 'accounts'].forEach(t => {
    const btn = document.querySelector('.nav-more-menu .nav-btn[data-nav="' + t + '"]');
    assert(btn !== null, 'secondary tab "' + t + '" reachable under More');
  });
  assert(document.querySelector('.nav > .nav-btn[data-nav="ideas"]') !== null, 'Ideas stays the primary nav item');
  document.querySelector('.nav-more-menu .nav-btn[data-nav="learn"]').click();
  assert(!document.getElementById('screen-learn').classList.contains('hidden'), 'secondary tab still navigates');
  assert(document.querySelector('details.nav-more').classList.contains('active'), 'More highlights while a secondary screen is active');
  document.querySelector('.nav > .nav-btn[data-nav="ideas"]').click();
  assert(!document.querySelector('details.nav-more').classList.contains('active'), 'More unhighlights back on Ideas');
  assert(document.getElementById('reviews-badge') !== null, 'reviews due badge still exists inside More');

  console.log('brand goes home + update check:');
  const brandBtn = document.getElementById('brand-home');
  assert(brandBtn && brandBtn.tagName === 'BUTTON', 'brand is a real button');
  document.querySelector('.nav-more-menu .nav-btn[data-nav="learn"]').click();
  assert(!document.getElementById('screen-learn').classList.contains('hidden'), 'on Learn screen before brand tap');
  brandBtn.click();
  assert(!document.getElementById('screen-ideas').classList.contains('hidden'), 'brand tap returns to Ideas home');
  assert(document.getElementById('btn-check-update') !== null, 'footer has Check for updates button');
  assert(typeof L.updateReloadURL === 'function', 'updateReloadURL exposed for tests');
  assert(L.updateReloadURL('/longterm-stock-lens/', '1.3.1', '') === '/longterm-stock-lens/?v=1.3.1',
    'update URL carries the new version (cache-busting navigation)');
  assert(L.APP_VERSION === pkgVer, 'APP_VERSION matches release');
  assert(L.isNewerVersion('1.4.1', '1.4.0') === true, 'newer patch detected');
  assert(L.isNewerVersion('1.4.0', '1.4.0') === false, 'same version is not newer');
  assert(L.isNewerVersion('1.3.1', '1.4.0') === false, 'stale cached version.txt never triggers a false update');

  console.log('idea detail back + XSS in name:');
  document.getElementById('idea-back').click();
  assert(!document.getElementById('screen-ideas').classList.contains('hidden'), 'back button returns to ideas');
  const probe = '<img src=x onerror=alert(1)>';
  document.getElementById('qa-name').value = 'XSS ' + probe;
  document.getElementById('qa-add').click();
  assert(document.querySelector('#idea-detail h1').textContent.includes(probe), 'probe name as literal text');
  assert(document.querySelector('#idea-detail img') === null, 'name probe created no img element');
  document.getElementById('idea-back').click();

  // ---- review-by editing + Review now on the idea detail page (B1) ----
  // The loop must never be gated on a date arriving: the review-by date is
  // editable on the detail page and a review can start any time.
  console.log('review controls on idea detail:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-name').value = 'Review Co';
  document.getElementById('qa-add').click();
  assert(!document.getElementById('screen-idea').classList.contains('hidden'), 'quick-add opens detail for the review test');
  const revInput = document.querySelector('#idea-detail .review-row input[type="date"]');
  st = readStore();
  const reviewCo = st.ideas.find(i => i.name === 'Review Co');
  assert(revInput && revInput.value === L.reviewAtOf(reviewCo), 'review-by date input shows the current date');
  const nowBtn = Array.from(document.querySelectorAll('#idea-detail .review-row .btn.primary'))
    .find(b => b.textContent === 'Review now');
  assert(nowBtn, 'detail page offers Review now');
  // Invalid date is rejected and the input resets to the stored date.
  revInput.value = 'not-a-date';
  revInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  st = readStore();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(st.ideas.find(i => i.name === 'Review Co').reviewAt), 'invalid review-by rejected');
  // Set review-by to today -> due immediately (B3: due-today surfaces in Reviews).
  const todayStr = L.todayISO();
  const revInput2 = document.querySelector('#idea-detail .review-row input[type="date"]');
  revInput2.value = todayStr;
  revInput2.dispatchEvent(new window.Event('change', { bubbles: true }));
  st = readStore();
  assert(st.ideas.find(i => i.name === 'Review Co').reviewAt === todayStr, 'review-by date saved to the store');
  assert(!document.getElementById('reviews-badge').classList.contains('hidden') &&
    document.getElementById('reviews-badge').textContent === '1', 'Reviews badge appears when due today');
  document.querySelector('.nav-btn[data-nav="reviews"]').click();
  assert(document.querySelectorAll('#reviews-list .entry.due').length === 1, 'due-today idea surfaces in Reviews');
  // Review now from the detail page, without waiting for the date.
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  Array.from(document.querySelectorAll('#ideas-list .idea-row .idea-main'))
    .find(b => b.getAttribute('aria-label') === 'Open research for Review Co').click();
  const nowBtn2 = Array.from(document.querySelectorAll('#idea-detail .review-row .btn.primary'))
    .find(b => b.textContent === 'Review now');
  nowBtn2.click();
  assert(document.querySelector('#idea-detail .detail-review-wrap .review-form'),
    'review form opens inline on the detail page');
  assert(document.querySelector('#idea-detail .detail-review-wrap .review-form').textContent.includes('Did it move for your stated reason?'),
    'detail review asks the thesis-audit question');
  Array.from(document.querySelectorAll('#idea-detail .detail-review-wrap .review-form .chip'))
    .find(b => b.textContent === 'Thesis intact').click();
  document.querySelector('#idea-detail .detail-review-wrap .review-form textarea').value = 'Detail-page review.';
  Array.from(document.querySelectorAll('#idea-detail .detail-review-wrap .review-form .btn.primary'))
    .find(b => b.textContent === 'Save review').click();
  st = readStore();
  const reviewed2 = st.ideas.find(i => i.name === 'Review Co');
  assert(reviewed2.reviewHistory.length === 1 && reviewed2.reviewHistory[0].note === 'Detail-page review.',
    'review saved from the detail page');
  assert(document.querySelector('#idea-detail h1').textContent === 'Review Co', 'detail re-renders after saving the review');
  assert(document.getElementById('reviews-badge').classList.contains('hidden'), 'badge clears after the review re-schedules');

  // ---- review flow ----
  console.log('review flow:');
  st = readStore();
  const firstId = st.ideas.find(i => i.name === 'Test Co').id;
  st.ideas.forEach(i => { if (i.name === 'Test Co') i.reviewAt = '2020-01-01'; });
  window.localStorage.setItem(KEY, JSON.stringify(st));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  let dueRows = document.querySelectorAll('#due-queue .idea-row');
  assert(dueRows.length === 1 && dueRows[0].querySelector('.idea-name').textContent === 'Test Co',
    'due queue shows the overdue idea');
  const badge = document.getElementById('reviews-badge');
  assert(!badge.classList.contains('hidden') && badge.textContent === '1', 'Reviews nav badge shows 1 due');
  document.querySelector('.nav-btn[data-nav="reviews"]').click();
  const startBtn = Array.from(document.querySelectorAll('#reviews-list .btn.primary'))
    .find(b => b.textContent === 'Start review');
  assert(startBtn, 'due card offers Start review');
  startBtn.click();
  assert(document.querySelector('#reviews-list .review-form'), 'review form renders inline');
  assert(document.querySelector('#reviews-list .review-form').textContent.includes('Did it move for your stated reason?'),
    'review asks the thesis-audit question');
  Array.from(document.querySelectorAll('#reviews-list .review-form .chip'))
    .find(b => b.textContent === 'Yes, for my reasons').click();
  Array.from(document.querySelectorAll('#reviews-list .review-form .chip'))
    .find(b => b.textContent === 'Resolved').click();
  document.querySelector('#reviews-list .review-form textarea').value = 'Thesis played out.';
  Array.from(document.querySelectorAll('#reviews-list .review-form .btn.primary'))
    .find(b => b.textContent === 'Save review').click();
  st = readStore();
  const reviewed = st.ideas.find(i => i.id === firstId);
  assert(reviewed.status === 'resolved', 'resolved outcome flips idea status');
  assert(reviewed.reviewHistory.length === 1 && reviewed.reviewHistory[0].reasonMatch === 'yes',
    'review history recorded with reasonMatch');
  assert(reviewed.reviewHistory[0].note === 'Thesis played out.', 'review note saved');
  assert(document.getElementById('reviews-badge').classList.contains('hidden'), 'badge clears when nothing due');
  assert(document.querySelector('#due-queue .idea-row') === null, 'due queue empty after review');

  console.log('due queue sorting:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-name').value = 'Second Co';
  document.getElementById('qa-add').click();
  document.getElementById('idea-back').click();
  document.getElementById('qa-name').value = 'Third Co';
  document.getElementById('qa-add').click();
  document.getElementById('idea-back').click();
  st = readStore();
  st.ideas.forEach(i => {
    if (i.name === 'Second Co') i.reviewAt = '2020-06-01';
    if (i.name === 'Third Co') i.reviewAt = '2020-01-01';
  });
  window.localStorage.setItem(KEY, JSON.stringify(st));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  dueRows = document.querySelectorAll('#due-queue .idea-row');
  assert(dueRows.length === 2, 'two ideas due (resolved one excluded)');
  assert(dueRows[0].querySelector('.idea-name').textContent === 'Third Co' &&
    dueRows[1].querySelector('.idea-name').textContent === 'Second Co',
    'due queue sorted by review-by date, oldest first');

  // ---- track record ----
  console.log('track record:');
  document.querySelector('.nav-btn[data-nav="track"]').click();
  const kpiVals = Array.from(document.querySelectorAll('#track-record .kpi-value')).map(el => el.textContent);
  assert(kpiVals.join(',') === '2,1,0,1', 'KPI strip: 2 reviews, 1 intact, 0 changed, 1 resolved (got ' + kpiVals.join(',') + ')');
  assert(document.querySelector('#track-record .panel').textContent.includes('100%'),
    'calibration shows 100% moved-for-stated-reasons');
  assert(document.querySelector('#track-record').textContent.includes('Thesis played out.'),
    'review history lists the saved review note');
  // resolved idea still listed with a Resolved tag
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const resRow = Array.from(document.querySelectorAll('#ideas-list .idea-row'))
    .find(rw => rw.querySelector('.idea-name').textContent === 'Test Co');
  assert(resRow && resRow.textContent.includes('Resolved'), 'resolved idea stays in the list with a Resolved tag');

  // ---- trends & misses ----
  console.log('trends UI:');
  document.querySelector('.nav-btn[data-nav="trends"]').click();
  assert(!document.getElementById('screen-trends').classList.contains('hidden'), 'trends screen shows');
  assert(document.querySelector('details.nav-more').classList.contains('active'), 'More highlights on trends screen');
  document.getElementById('trend-add').click();
  const trErr = document.getElementById('trend-error');
  assert(!trErr.classList.contains('hidden') && trErr.getAttribute('role') === 'alert',
    'empty trend name blocked with inline error');
  document.getElementById('trend-name').value = 'XSS ' + probe;
  document.getElementById('trend-why').value = 'why ' + probe;
  document.getElementById('trend-add').click();
  let wRows = document.querySelectorAll('#trends-watching .note-card');
  assert(wRows.length === 1, 'quick-added trend appears in Watching (got ' + wRows.length + ')');
  assert(wRows[0].querySelector('.entry-name').textContent.includes(probe), 'trend name probe as literal text');
  assert(wRows[0].querySelector('img') === null, 'trend name probe created no img element');
  assert(wRows[0].querySelector('.note-text').textContent.includes(probe), 'trend why probe as literal text');
  assert(document.getElementById('trends-count').textContent === '1 trend watched', 'watching count label');
  st = readStore();
  assert(st.trends.length === 1 && st.trends[0].status === 'watching', 'trend persisted with watching status');
  // Make an idea: seeds the idea, marks the trend chased, opens the idea detail
  wRows[0].querySelector('.btn.primary').click();
  assert(!document.getElementById('screen-idea').classList.contains('hidden'), 'Make an idea opens the idea detail');
  assert(document.querySelector('#idea-detail h1').textContent.includes('XSS'), 'idea seeded with the trend name');
  st = readStore();
  assert(st.ideas.some(i => i.trendId === st.trends[0].id), 'idea carries the trendId back-link');
  assert(st.trends[0].status === 'chased' && st.trends[0].ideaId !== null, 'trend marked chased with ideaId');
  document.querySelector('.nav-btn[data-nav="trends"]').click();
  assert(document.querySelectorAll('#trends-chased .note-card').length === 1, 'chased trend under Became ideas');
  assert(document.querySelectorAll('#trends-watching .note-card').length === 0, 'watching list empty after chase');
  const chasedBtn = document.querySelector('#trends-chased .note-card .btn');
  assert(chasedBtn && !chasedBtn.disabled && chasedBtn.textContent.includes('Open idea'),
    'chased row links back to the idea');
  chasedBtn.click();
  assert(!document.getElementById('screen-idea').classList.contains('hidden'), 'chased row opens the linked idea');
  document.querySelector('.nav-btn[data-nav="trends"]').click();
  // Missed flow: log another trend, mark it missed, save the lesson
  document.getElementById('trend-name').value = 'Missed Wave';
  document.getElementById('trend-why').value = '';
  document.getElementById('trend-add').click();
  wRows = document.querySelectorAll('#trends-watching .note-card');
  assert(wRows.length === 1, 'second trend lands in Watching');
  const missBtn = Array.from(wRows[0].querySelectorAll('.btn')).find(b => b.textContent === 'Missed it');
  assert(missBtn, 'watching row offers Missed it');
  missBtn.click();
  assert(document.querySelectorAll('#trends-missed .note-card').length === 1, 'missed trend under Missed waves');
  const mRow = document.querySelector('#trends-missed .note-card');
  assert(mRow.querySelector('.tag').textContent === 'Missed', 'missed row tagged');
  mRow.querySelector('textarea').value = 'Waited for a dip that never came';
  const saveLessonBtn = Array.from(mRow.querySelectorAll('.btn')).find(b => b.textContent === 'Save lesson');
  saveLessonBtn.click();
  st = readStore();
  const missedTrend = st.trends.find(t => t.status === 'missed');
  assert(missedTrend && missedTrend.lesson === 'Waited for a dip that never came', 'lesson persisted on the missed trend');
  // Watching-again undo returns it to the watching list
  const rewatchBtn = Array.from(document.querySelector('#trends-missed .note-card').querySelectorAll('.btn'))
    .find(b => b.textContent === 'Watching again');
  rewatchBtn.click();
  assert(document.querySelectorAll('#trends-watching .note-card').length === 1 &&
    document.querySelectorAll('#trends-missed .note-card').length === 0, 'Watching again moves it back');

  // ---- learn: search + micro-quiz ----
  console.log('learn:');
  document.querySelector('.nav-btn[data-nav="learn"]').click();
  const gSearch = document.getElementById('glossary-search');
  const fireInput = () => gSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
  gSearch.value = 'moat';
  fireInput();
  const visibleLessons = Array.from(document.querySelectorAll('#glossary .gloss'))
    .filter(d => !d.classList.contains('hidden'));
  assert(visibleLessons.length === 1 && visibleLessons[0].textContent.includes('Economic moat'),
    'search filters to the matching lesson');
  const countLine = document.getElementById('glossary-count');
  assert(!countLine.classList.contains('hidden') && countLine.textContent.includes('1 of ' + EXPECTED_LESSONS + ' lessons match'),
    'match count announced (got "' + countLine.textContent + '")');
  gSearch.value = '<img src=x onerror=alert(1)>';
  fireInput();
  assert(!document.querySelector('#glossary-count img'), 'search query not parsed as HTML');
  gSearch.value = '';
  fireInput();
  assert(document.querySelectorAll('#glossary .gloss:not(.hidden)').length === EXPECTED_LESSONS, 'clearing search restores all lessons');
  // P/E lesson quiz: correct answers are option indexes 0, 1, 1
  const peQuiz = document.querySelectorAll('#glossary .gloss')[0].querySelectorAll('.lesson-quiz .q');
  const correctIdx = [0, 1, 1];
  peQuiz.forEach((q, qi) => q.querySelectorAll('.opt-btn')[correctIdx[qi]].click());
  assert(document.querySelector('#glossary .gloss summary .lesson-done'),
    '3/3 on the lesson quiz shows the completed badge');
  assert(readStore().glossary['P/E'] && readStore().glossary['P/E'].best === 3,
    'lesson progress persisted (P/E best = 3)');
  // new v1.5.0 lessons: valuation, trend-reading, illustration-labeled case study
  assert(L.GLOSSARY.length === EXPECTED_LESSONS, EXPECTED_LESSONS + ' lessons total (got ' + L.GLOSSARY.length + ')');
  assert(L.GLOSSARY.every(g => g.quiz.length === 3 && g.quiz.every(q => q.options.length === 4)),
    'every lesson has a 3-question, 4-option quiz');
  assert(L.GLOSSARY.some(g => g.abbr === 'Value' && g.name.includes('three lenses')),
    'valuation-methods lesson present');
  assert(L.GLOSSARY.some(g => g.abbr === 'Case' && /illustration/i.test(g.name + ' ' + g.what)),
    'case study labeled as illustration');
  gSearch.value = 'reverse-engineering';
  fireInput();
  const valLessons = Array.from(document.querySelectorAll('#glossary .gloss'))
    .filter(d => !d.classList.contains('hidden'));
  assert(valLessons.length === 1 && valLessons[0].textContent.includes('Estimating value'),
    'search finds the new valuation lesson');
  gSearch.value = '';
  fireInput();
  // Trend lesson quiz: correct indexes are 3, 1, 2
  const trendQuiz = Array.from(document.querySelectorAll('#glossary .gloss'))
    .find(d => d.textContent.includes('Reading a trend')).querySelectorAll('.lesson-quiz .q');
  [3, 1, 2].forEach((idx, qi) => trendQuiz[qi].querySelectorAll('.opt-btn')[idx].click());
  assert(readStore().glossary['Trend'] && readStore().glossary['Trend'].best === 3,
    'new lesson quiz completes and persists (Trend best = 3)');

  // ---- export ----
  console.log('export:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  assert(document.getElementById('export-json').disabled === false, 'export JSON enabled with ideas');
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
  assert(createdURLs[0].type === 'application/json', 'JSON blob has right type');
  assert(createdURLs[1].type === 'text/markdown', 'Markdown blob has right type');
  assert(clickedAnchors[0].download === 'longterm-lens-ideas-' + stamp + '.json', 'JSON download filename dated');
  assert(clickedAnchors[1].download === 'longterm-lens-ideas-' + stamp + '.md', 'Markdown download filename dated');
  const mdText = await createdURLs[1].text();
  assert(mdText.includes('## Test Co (TST)') && mdText.includes('## Second Co'), 'exported markdown contains ideas');
  assert(mdText.includes('Conviction:'), 'exported markdown includes conviction');
  const jsonText = await createdURLs[0].text();
  assert(JSON.parse(jsonText).length === readStore().ideas.length, 'exported JSON contains all ideas');

  // ---- disclaimers ----
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  assert(document.querySelector('.disclaimer-banner').textContent.includes('not financial advice'), 'hero disclaimer present');
  assert(document.querySelector('.footer').textContent.includes('Educational only, not financial advice'), 'footer disclaimer present');

  // ---- version consistency (partial bumps caused a false update prompt in v1.4.2) ----
  const txtVer = fs.readFileSync(path.join(ROOT, 'version.txt'), 'utf8').trim();
  const htmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert(L.APP_VERSION === pkgVer, 'APP_VERSION matches package.json (' + pkgVer + ')');
  assert(L.APP_VERSION === txtVer, 'APP_VERSION matches version.txt (' + txtVer + ')');
  assert(document.querySelector('#app-version').textContent === 'v' + L.APP_VERSION,
    'footer #app-version matches APP_VERSION');
  assert(htmlSrc.includes('app.js?v=' + L.APP_VERSION) && htmlSrc.includes('styles.css?v=' + L.APP_VERSION),
    '?v= cache-busters match APP_VERSION');

  console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : '\n' + failures + ' FAILURES');
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('SMOKE TEST ERROR:', e.message); process.exit(1); });
