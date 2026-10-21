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
  const bootReal = errors.filter(e => !e.includes('Not implemented'));
  assert(bootReal.length === 0, 'no console/script errors on boot (' + bootReal.length + ' real of ' + errors.length + ')');
  bootReal.forEach(e => console.error('    ' + e));
  assert(!document.getElementById('screen-profile').classList.contains('hidden'),
    'fresh visitor (no saved profile) lands on Profile first');
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
  const legacyHi = L.normalizeIdea({ name: 'Old', scores: { quality: 5, value: 5, conviction: 5 }, weights: { quality: 40, value: 30, conviction: 30 } });
  assert(L.convictionOf(legacyHi) === 5 && legacyHi.scores === undefined, 'legacy top scores migrate to conviction 5 at load');
  const legacyLow = L.normalizeIdea({ name: 'Old', scores: { quality: 1, value: 1, conviction: 1 }, weights: { quality: 40, value: 30, conviction: 30 } });
  assert(L.convictionOf(legacyLow) === 1, 'legacy low scores migrate to conviction 1 at load');

  console.log('makeIdea defaults:');
  const idea0 = L.makeIdea('Test Co', 'TST', '2026-10-09');
  assert(idea0.status === 'open' && idea0.conviction == null, 'draft defaults: open + unscored');
  assert(idea0.reviewAt === '2027-01-09' && idea0.reviewMonths === 3, '~90-day review default (got ' + idea0.reviewAt + ')');
  assert(idea0.tickers === 'TST', 'ticker uppercased');

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
  assert(L.setReviewAt({ id: 'e1' }, '0001-02-18') === null, 'year 0001 rejected (live-regression: automation-typed date)');
  assert(L.setReviewAt({ id: 'e1' }, '1999-12-31') === null, 'year 1999 rejected');
  assert(L.setReviewAt({ id: 'e1' }, '2101-01-01') === null, 'year 2101 rejected');
  assert(L.setReviewAt({ id: 'e1' }, '2026-13-01') === null, 'month 13 rejected');
  assert(L.setReviewAt({ id: 'e1' }, '2026-00-10') === null, 'month 00 rejected');
  assert(L.setReviewAt({ id: 'e1' }, '2026-02-30') === null, 'Feb 30 rejected');
  assert(L.setReviewAt({ id: 'e1' }, '2023-02-29') === null, 'non-leap Feb 29 rejected');
  assert(L.isPlausibleLocalDate('2024-02-29') === true, 'leap Feb 29 accepted');
  assert(L.isPlausibleLocalDate('2026-10-18') === true, 'ordinary date accepted');

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

  console.log('prices (spotted + check-in):');
  assert(L.spotPriceOf({ priceLog: [] }) === null && L.spotPriceOf({}) === null, 'no price log -> no spot price');
  assert(L.spotPriceOf({ priceLog: [{ date: '2026-10-09', price: 84.5, note: 'spotted' }] }) === 84.5, 'spot price is the first log entry');
  const arP = L.applyReview(idea0, { outcome: 'intact', reasonMatch: 'yes', note: '', nextMonths: '3', priceNow: 97.25 }, '2026-11-01');
  assert(arP.reviewHistory[0].priceNow === 97.25, 'check-in price stored on the entry');
  assert(arP.priceLog.length === 1 && arP.priceLog[0].price === 97.25 && arP.priceLog[0].note === 'check-in',
    'check-in price appended to the price log');
  const arBad = L.applyReview(idea0, { outcome: 'intact', reasonMatch: 'na', note: '', nextMonths: '3', priceNow: -4 }, '2026-11-01');
  assert(arBad.reviewHistory[0].priceNow === null && (arBad.priceLog || []).length === 0, 'invalid price ignored');
  const normP = L.normalizeIdea({ name: 'P', priceLog: [{ price: '55', date: 'bogus' }, { price: -1 }, null, { price: 12, date: '2026-01-01', note: 'x'.repeat(200) }] });
  assert(normP.priceLog.length === 2 && normP.priceLog[0].price === 55 && /^\d{4}-\d{2}-\d{2}$/.test(normP.priceLog[0].date) &&
    normP.priceLog[1].note.length === 80, 'normalizeIdea sanitizes the price log');

  console.log('discover prompt:');
  const dp = L.buildDiscoverPrompt({ name: 'AI infrastructure', why: 'Every model needs more compute' });
  assert(dp.includes('AI infrastructure') && dp.includes('Every model needs more compute'), 'discover prompt carries the trend + why');
  assert(dp.includes('Categories') && dp.includes('Companies'), 'discover prompt asks for categories and companies');
  assert(dp.includes('no buy or sell recommendations'), 'discover prompt forbids recommendations');

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

  console.log('calibration:');
  const calIdeas = [
    { reviewHistory: [
      { outcome: 'intact', reasonMatch: 'yes', conviction: 5 },
      { outcome: 'intact', reasonMatch: 'yes', conviction: 4 },
      { outcome: 'changed', reasonMatch: 'no', conviction: 1 },
    ] },
    { reviewHistory: [
      { outcome: 'resolved', reasonMatch: 'yes', conviction: 5 },
      { outcome: 'intact', reasonMatch: 'na', conviction: 3 },
      { outcome: 'intact', reasonMatch: 'yes' },  // legacy entry, no conviction
    ] },
  ];
  const cal = L.calibration(calIdeas);
  assert(cal.answered === 5, 'calibration counts answered reviews (got ' + cal.answered + ')');
  assert(cal.overallRate === 80, 'overall rate 4/5 -> 80% (got ' + cal.overallRate + ')');
  assert(cal.levels[5].rate === 100 && cal.levels[5].n === 2, 'level 5: 2/2 -> 100%');
  assert(cal.levels[1].rate === 0 && cal.levels[1].n === 1, 'level 1: 0/1 -> 0%');
  assert(cal.levels[3].rate === null, 'na review not counted at level 3');
  assert(cal.hiRate === 100 && cal.loRate === 0, 'hi/lo rates computed');
  assert(cal.yesCount === 4, 'yesCount exposed for honest n-of-m display (got ' + cal.yesCount + ')');
  assert(cal.legacyAnswered === 1, 'legacy review without conviction counted separately (got ' + cal.legacyAnswered + ')');
  assert(typeof cal.insight === 'string' && cal.insight.includes('your gut means something'),
    'positive insight when hi >> lo (got: ' + cal.insight + ')');
  const calEmpty = L.calibration([]);
  assert(calEmpty.overallRate === null && calEmpty.answered === 0 && calEmpty.insight === null, 'empty -> nulls, no insight');
  const arConv = L.applyReview(Object.assign({}, idea0, { conviction: 4 }),
    { outcome: 'intact', reasonMatch: 'yes', nextMonths: '3' }, '2026-10-09');
  assert(arConv.reviewHistory[0].conviction === 4, 'applyReview records conviction snapshot');

  console.log('sealThesis:');
  const unsealed = { thesis: { belief: 'AI at the edge', falsify: 'loses share' }, sealed: null };
  const sealed1 = L.sealThesis(unsealed, '2026-10-10');
  assert(sealed1.sealed && sealed1.sealed.belief === 'AI at the edge' && sealed1.sealed.date === '2026-10-10', 'first write seals the thesis');
  assert(!unsealed.sealed, 'seal does not mutate the original');
  const edited = L.sealThesis(Object.assign({}, sealed1, { thesis: { belief: 'EDITED', falsify: '' } }), '2026-11-01');
  assert(edited.sealed.belief === 'AI at the edge', 'sealed copy never changes after first write');
  assert(L.sealThesis({ thesis: { belief: '  ', falsify: '' }, sealed: null }).sealed === null, 'blank belief does not seal');

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
  assert(prompt.includes('HOW SURE I AM: 4 / 5'), 'prompt carries how sure you are');
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
  assert(md.includes('How sure I am: 4 / 5'), 'markdown shows how sure you are');
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

  console.log('wisdom + principles:');
  assert(L.WISDOM.length === 10, '10 wisdom quotes');
  assert(L.WISDOM.every(q => q.text && q.who && q.source), 'every quote carries text, attribution, and a primary source');
  assert(L.WISDOM.every(q => !/warren buffett.{0,20}warren buffett/i.test(q.who)), 'no doubled attributions');
  const w1 = L.wisdomFor('2026-10-18');
  assert(L.wisdomFor('2026-10-18') === w1, 'wisdomFor is deterministic for a date');
  assert(L.wisdomFor('not-a-date') === L.WISDOM[0], 'wisdomFor falls back to the first quote on bad input');
  const seen = new Set();
  for (let d = 1; d <= 10; d++) seen.add(L.wisdomFor('2026-10-' + String(d).padStart(2, '0')).text);
  assert(seen.size === 10, '10 consecutive days rotate through all 10 quotes');
  assert(L.PRINCIPLES.length === 5, '5 timeless principles');
  assert(L.PRINCIPLES.every(p => p.title && p.body.length === 2 && p.tryIt && p.quote && p.quote.text && p.quote.who && p.quote.source),
    'every principle has a title, two paragraphs, a try-it, and a sourced quote');
  assert(L.PRINCIPLES.every(p => L.WISDOM.some(q => q.text === p.quote.text)), 'every principle quote comes from the verified wisdom set');

  console.log('glossary search:');
  assert(L.filterGlossaryTerms('').length === EXPECTED_LESSONS, 'empty query matches all');
  assert(L.filterGlossaryTerms('moat').length === 1, 'query "moat" finds Economic moat');
  assert(L.filterGlossaryTerms('xyzzy').length === 0, 'no-match query returns empty');

  // ---- navigation ----
  console.log('navigation:');
  const tabs = ['profile', 'ideas', 'reviews', 'track', 'learn'];
  assert(document.querySelectorAll('.nav > .nav-btn').length === 5, 'exactly five tabs');
  tabs.forEach(t => {
    document.querySelector('.nav-btn[data-nav="' + t + '"]').click();
    const visible = !document.getElementById('screen-' + t).classList.contains('hidden');
    const othersHidden = tabs.filter(x => x !== t)
      .every(x => document.getElementById('screen-' + x).classList.contains('hidden'));
    assert(visible && othersHidden, 'tab "' + t + '" shows its screen only');
  });
  assert(document.getElementById('screen-trends') === null && document.getElementById('screen-accounts') === null,
    'standalone Trends/Accounts screens are gone (merged)');
  assert(document.querySelector('#screen-ideas #trends-part') !== null, 'trends live inside the Ideas tab');
  assert(document.querySelector('#screen-learn #accounts-part') !== null, 'accounts live inside the Learn tab');
  // idea detail screen is not in the nav; reachable via openIdea only
  assert(document.getElementById('screen-idea').classList.contains('hidden'), 'idea detail hidden until an idea opens');

  // ---- investor profile quiz ----
  console.log('investor profile quiz:');
  document.querySelector('.nav-btn[data-nav="profile"]').click();
  document.querySelectorAll('#quiz .q').forEach(q => q.querySelector('.opt-btn').click());
  document.querySelector('#quiz .btn.primary').click();
  const res = document.getElementById('quiz-result');
  assert(!res.classList.contains('hidden'), 'result appears after answering all questions');
  assert(res.textContent.includes('Saved '), 'result confirms the save immediately (Saved <date> line, no reload needed)');
  assert(res.textContent.includes('80% index'), 'result shows 80% index allocation');
  assert(res.querySelector('.alloc-conv').textContent === '20%', 'conv segment uses short label');
  assert(res.getAttribute('role') === 'status', 'quiz result announced via role=status');
  assert(res.querySelector('.alloc-bar').getAttribute('aria-label').includes('20 percent conviction stocks'),
    'aria-label carries full wording');
  const prof = readStore().quizProfile;
  assert(prof && prof.bandLabel === 'Growth-leaning' && prof.total === 18, 'quiz result persisted to store (quizProfile)');
  assert(Array.isArray(prof.answers) && prof.answers.length === 6 && prof.answers.every(a => a === 0),
    'quiz ANSWERS persisted with the profile (old state can be restored)');
  const quizCta = Array.from(res.querySelectorAll('.btn-row .btn'))
    .find(b => b.textContent.includes('Start spotting ideas'));
  assert(!!quizCta, 'quiz result offers a forward CTA');
  quizCta.click();
  assert(!document.getElementById('screen-ideas').classList.contains('hidden') &&
    document.getElementById('screen-profile').classList.contains('hidden'),
    'quiz CTA lands on the Ideas tab');
  // leave and return: the saved profile + answers must be right there
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.querySelector('.nav-btn[data-nav="profile"]').click();
  const res2 = document.getElementById('quiz-result');
  assert(!res2.classList.contains('hidden') && res2.textContent.includes('Your band: Growth-leaning'),
    'returning to Profile shows the saved result immediately');
  assert(res2.textContent.includes('Saved '), 'saved result carries its date');
  assert(document.querySelectorAll('#quiz .opt-btn.selected').length === 6,
    'previous answers are restored as selections');
  // change one answer and re-submit: profile updates in place
  const q1opts = document.querySelectorAll('#quiz .q')[0].querySelectorAll('.opt-btn');
  q1opts[q1opts.length - 1].click();
  document.querySelector('#quiz .btn.primary').click();
  const prof2 = readStore().quizProfile;
  assert(prof2.total === 15 && prof2.answers[0] === q1opts.length - 1,
    'changing an answer and re-submitting updates the saved profile');

  // ---- legacy saved profile (score only, no answers — pre-3.6 saves) ----
  console.log('legacy profile restore:');
  window.localStorage.setItem(KEY, JSON.stringify({
    schema: 3, ideas: [], trends: [], glossary: {},
    quizProfile: { total: 13, max: 18, bandLabel: 'Balanced', index: 87, conv: 13, date: '2026-09-01' }
  }));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="profile"]').click();
  const lres = document.getElementById('quiz-result');
  assert(!lres.classList.contains('hidden') && lres.textContent.includes('Your band: Balanced'),
    'legacy profile result still renders');
  assert(lres.textContent.includes('before answers were kept'), 'legacy result is honest that answers were not kept');
  assert(document.querySelectorAll('#quiz .opt-btn.selected').length === 0,
    'legacy profile restores no selections (nothing was stored)');

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
  Array.from(document.querySelectorAll('#idea-detail .btn'))
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
  assert(document.querySelector('#idea-detail .analyze-sec'), 'second opinion section present');
  assert(document.querySelector('#idea-detail .link-danger'), 'subtle delete link present');

  console.log('streamlined page: what you think, how sure, second opinion, check in');
  const secTitles = [...document.querySelectorAll('#idea-detail .panel h2, #idea-detail .analyze-sec h3')]
    .map(el => el.textContent);
  assert(JSON.stringify(secTitles) === JSON.stringify(['What you think', 'How sure are you?', 'Second opinion', 'Check in']),
    'page order: what-you-think -> how-sure -> second-opinion -> check-in (got ' + JSON.stringify(secTitles) + ')');

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

  console.log('dedicated tabs nav:');
  assert(document.querySelector('details.nav-more') === null, 'no More dropdown — every section is a dedicated tab');
  ['profile', 'ideas', 'reviews', 'track', 'learn'].forEach(t => {
    const btn = document.querySelector('.nav > .nav-btn[data-nav="' + t + '"]');
    assert(btn !== null, 'tab "' + t + '" is a top-level nav button');
  });
  document.querySelector('.nav > .nav-btn[data-nav="learn"]').click();
  assert(!document.getElementById('screen-learn').classList.contains('hidden'), 'tab navigates to its screen');
  assert(document.querySelector('.nav > .nav-btn[data-nav="learn"]').classList.contains('active'), 'active tab highlights');
  document.querySelector('.nav > .nav-btn[data-nav="ideas"]').click();
  assert(!document.querySelector('.nav > .nav-btn[data-nav="learn"]').classList.contains('active'), 'highlight moves with navigation');
  const navBadge = document.getElementById('reviews-badge');
  assert(navBadge !== null && navBadge.closest('.nav-btn').dataset.nav === 'reviews', 'due badge lives on the Check-ins tab');

  console.log('brand goes home + update check:');
  const brandBtn = document.getElementById('brand-home');
  assert(brandBtn && brandBtn.tagName === 'BUTTON', 'brand is a real button');
  document.querySelector('.nav > .nav-btn[data-nav="learn"]').click();
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
  const appSrcUpdate = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert(/fetch\('version\.txt\?v=' \+ Date\.now\(\)\)/.test(appSrcUpdate),
    'boot version check fetch is cache-busted (no stale version.txt phantom notice)');
  assert(appSrcUpdate.includes("sessionStorage.getItem('lrl-healed-'"),
    'self-heal loop guard intact');
  const hadFetch = 'fetch' in window;
  const realWindowFetch = window.fetch;
  window.fetch = () => Promise.resolve({ ok: true, text: () => Promise.resolve('9.9.9') });
  window.sessionStorage.removeItem('lrl-healed-9.9.9');
  L.checkForUpdates(false);
  await new Promise(r => setTimeout(r, 100));
  assert(window.sessionStorage.getItem('lrl-healed-9.9.9') === '1',
    'auto update check arms the one-shot self-heal guard for the newer version');
  L.checkForUpdates(false);
  await new Promise(r => setTimeout(r, 100));
  assert(window.sessionStorage.getItem('lrl-healed-9.9.9') === '1',
    'repeat auto check does not re-arm the guard (exactly one reload attempt)');
  if (hadFetch) window.fetch = realWindowFetch; else delete window.fetch;
  window.sessionStorage.removeItem('lrl-healed-9.9.9');

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
  const nowBtn = Array.from(document.querySelectorAll('#idea-detail .review-row .btn'))
    .find(b => b.textContent === 'Check in now');
  assert(nowBtn, 'detail page offers Check in now');
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
  assert(document.getElementById('reviews-badge').getAttribute('aria-label') === '1 check-in ready',
    'badge aria-label uses plain language');
  document.querySelector('.nav-btn[data-nav="reviews"]').click();
  assert(document.querySelectorAll('#reviews-list .entry.due').length === 1, 'due-today idea surfaces in Reviews');
  // Review now from the detail page, without waiting for the date.
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  Array.from(document.querySelectorAll('#ideas-list .idea-row .idea-main'))
    .find(b => b.getAttribute('aria-label') === 'Open research for Review Co').click();
  const nowBtn2 = Array.from(document.querySelectorAll('#idea-detail .review-row .btn'))
    .find(b => b.textContent === 'Check in now');
  nowBtn2.click();
  assert(document.querySelector('#idea-detail .detail-review-wrap .review-form'),
    'review form opens inline on the detail page');
  assert(document.querySelector('#idea-detail .detail-review-wrap .review-form').textContent.includes('Did it play out the way you said?'),
    'detail check-in asks the play-out question');
  Array.from(document.querySelectorAll('#idea-detail .detail-review-wrap .review-form .chip'))
    .find(b => b.textContent === 'Still holds up').click();
  document.querySelector('#idea-detail .detail-review-wrap .review-form textarea').value = 'Detail-page review.';
  Array.from(document.querySelectorAll('#idea-detail .detail-review-wrap .review-form .btn.primary'))
    .find(b => b.textContent === 'Save check-in').click();
  st = readStore();
  const reviewed2 = st.ideas.find(i => i.name === 'Review Co');
  assert(!document.querySelector('#idea-detail .review-form'), 'check-in form closes after save on the detail page');
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
    .find(b => b.textContent === 'Check in');
  assert(startBtn, 'due card offers Check in');
  startBtn.click();
  assert(document.querySelector('#reviews-list .review-form'), 'review form renders inline');
  assert(document.querySelector('#reviews-list .review-form').textContent.includes('Did it play out the way you said?'),
    'check-in asks the play-out question');
  Array.from(document.querySelectorAll('#reviews-list .review-form .chip'))
    .find(b => b.textContent === 'Yes — for my reasons').click();
  Array.from(document.querySelectorAll('#reviews-list .review-form .chip'))
    .find(b => b.textContent === 'Done with this one').click();
  document.querySelector('#reviews-list .review-form textarea').value = 'Thesis played out.';
  Array.from(document.querySelectorAll('#reviews-list .review-form .btn.primary'))
    .find(b => b.textContent === 'Save check-in').click();
  st = readStore();
  const reviewed = st.ideas.find(i => i.id === firstId);
  assert(reviewed.status === 'resolved', 'resolved outcome flips idea status');
  assert(reviewed.reviewHistory.length === 1 && reviewed.reviewHistory[0].reasonMatch === 'yes',
    'review history recorded with reasonMatch');
  assert(reviewed.reviewHistory[0].note === 'Thesis played out.', 'review note saved');
  assert(!document.querySelector('#reviews-list .review-form'), 'check-in form closes after save on the Check-ins screen');
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
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  assert(!document.getElementById('screen-ideas').classList.contains('hidden'), 'ideas screen shows (trends live here now)');
  assert(document.getElementById('trends-part') !== null, 'trends section present on the Ideas tab');
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
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  assert(document.querySelectorAll('#trends-chased .note-card').length === 1, 'chased trend under Became ideas');
  assert(document.querySelectorAll('#trends-watching .note-card').length === 0, 'watching list empty after chase');
  const chasedBtn = document.querySelector('#trends-chased .note-card .btn');
  assert(chasedBtn && !chasedBtn.disabled && chasedBtn.textContent.includes('Open idea'),
    'chased row links back to the idea');
  chasedBtn.click();
  assert(!document.getElementById('screen-idea').classList.contains('hidden'), 'chased row opens the linked idea');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
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

  console.log('wisdom + principles render:');
  const wisdomLine = document.getElementById('wisdom-line');
  assert(!!wisdomLine && wisdomLine.textContent.includes(L.wisdomFor(L.todayISO()).text),
    'Ideas home shows today\u2019s wisdom quote');
  const principleCards = document.querySelectorAll('#principles .principle');
  assert(principleCards.length === 5, 'Learn renders 5 principle cards (got ' + principleCards.length + ')');
  assert(Array.from(principleCards).every(c => c.querySelector('blockquote.wisdom') && c.textContent.includes('Try it:')),
    'every principle card carries its quote and a try-it');
  const wisdomItems = document.querySelectorAll('#wisdom-list .wisdom');
  assert(wisdomItems.length === 10, 'Learn wisdom list shows all 10 quotes (got ' + wisdomItems.length + ')');
  assert(!document.querySelector('#wisdom-list').innerHTML.includes('<img'), 'wisdom list renders no markup from data');
  const whyExists = Array.from(document.querySelectorAll('#profile-explainer summary'))
    .find(s => s.textContent === 'Why this exists');
  assert(!!whyExists, 'Profile carries a "Why this exists" origin story');
  document.querySelector('.nav-btn[data-nav="track"]').click();
  const emptyStateStore = window.localStorage.getItem(KEY);
  window.localStorage.setItem(KEY, JSON.stringify({ schema: 3, ideas: [], trends: [], glossary: {} }));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="track"]').click();
  assert(document.querySelector('#track-record .wisdom') !== null, 'Scorecard empty state carries a wisdom line');
  window.localStorage.setItem(KEY, emptyStateStore);
  L.reloadJournal();
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
  const stamp = L.todayISO();
  assert(createdURLs.length === 2, 'two blobs created');
  assert(createdURLs[0].type === 'application/json', 'JSON blob has right type');
  assert(createdURLs[1].type === 'text/markdown', 'Markdown blob has right type');
  assert(clickedAnchors[0].download === 'longterm-lens-ideas-' + stamp + '.json', 'JSON download filename dated');
  assert(clickedAnchors[1].download === 'longterm-lens-ideas-' + stamp + '.md', 'Markdown download filename dated');
  const mdText = await createdURLs[1].text();
  assert(mdText.includes('## Test Co (TST)') && mdText.includes('## Second Co'), 'exported markdown contains ideas');
  assert(mdText.includes('How sure I am:'), 'exported markdown includes how sure you are');
  const jsonText = await createdURLs[0].text();
  assert(JSON.parse(jsonText).length === readStore().ideas.length, 'exported JSON contains all ideas');

  console.log('delete idea (regression: deleteIdea was undefined in v2.0.0):');
  window.confirm = () => true;
  const delBefore = readStore().ideas.length;
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const firstRow = document.querySelector('#ideas-list .idea-main');
  assert(!!firstRow, 'an idea row exists to open');
  const victimName = firstRow.textContent;
  firstRow.click();
  const delLink = document.querySelector('#idea-detail .link-danger');
  assert(!!delLink, 'delete link found on detail page');
  delLink.click();
  const afterStore = readStore();
  assert(afterStore.ideas.length === delBefore - 1, 'delete removes exactly one idea (before ' + delBefore + ', after ' + afterStore.ideas.length + ')');
  assert(!document.querySelector('#screen-ideas.hidden') || document.getElementById('screen-ideas').classList.contains('active') ||
         window.getComputedStyle(document.getElementById('screen-ideas')).display !== 'none',
    'returns to the ideas screen after delete');

  // ---- v4.3.6: independent-audit fixes ----
  console.log('audit fixes:');
  const imp1 = L.importIdeasFromJSON(JSON.stringify([{ name: 'Imported Co', tickers: 'IMP' }]));
  assert(!imp1.error && imp1.ideas.length === 1 && imp1.ideas[0].name === 'Imported Co', 'import accepts the export JSON array shape');
  assert(typeof imp1.ideas[0].id === 'string' && imp1.ideas[0].id.length > 0, 'imported ideas get ids assigned');
  const imp2 = L.importIdeasFromJSON(JSON.stringify({ ideas: [{ name: 'Wrapped Co' }] }));
  assert(!imp2.error && imp2.ideas.length === 1, 'import accepts the {ideas:[...]} shape');
  assert(L.importIdeasFromJSON('not json at all').error === 'not-json', 'import rejects non-JSON text');
  assert(L.importIdeasFromJSON('{"foo":1}').error === 'not-a-backup', 'import rejects JSON that is not a backup');
  const rt = L.importIdeasFromJSON(L.journalToJSON([{ name: 'Round Trip', id: 'rt1', thesis: { belief: 'b', falsify: 'f' } }]));
  assert(!rt.error && rt.ideas[0].name === 'Round Trip' && rt.ideas[0].thesis.belief === 'b', 'export → import round-trips ideas');
  assert(typeof L.normalizeIdea({ name: 'No Id' }).id === 'string', 'normalizeIdea assigns a missing id');
  assert(!('thesesLabel' in L), 'dead thesesLabel removed from the API surface');

  document.querySelector('#trend-name').value = 'Orphan Audit Trend';
  document.querySelector('#trend-add').click();
  const oRow = Array.from(document.querySelectorAll('#trends-watching .note-card'))
    .find(r => r.querySelector('.entry-name').textContent === 'Orphan Audit Trend');
  assert(!!oRow, 'orphan-test trend quick-added to Watching');
  oRow.querySelector('.btn.primary').click();
  assert(!!document.querySelector('#idea-detail .link-danger'), 'Make an idea opens the new idea detail');
  document.querySelector('#idea-detail .link-danger').click();
  const oTrend = readStore().trends.find(t => t.name === 'Orphan Audit Trend');
  assert(oTrend && oTrend.status === 'watching' && !oTrend.ideaId, 'deleting the idea returns its trend to Watching');

  document.querySelector('#qa-name').value = 'Audit Fix Co';
  document.querySelector('#qa-add').click();
  const ciBtn = document.querySelector('#idea-detail [data-action="checkin-now"]');
  assert(!!ciBtn, 'check-in button present on the new idea');
  ciBtn.click(); ciBtn.click();
  assert(document.querySelectorAll('#idea-detail .detail-review-wrap').length === 1, 'double-clicking Check in now yields one form, not two');
  const beliefBox = document.querySelector('#idea-detail .thesis-belief');
  beliefBox.value = '';
  document.querySelector('#idea-detail [data-action="thesis-save"]').click();
  const hint = document.querySelector('#idea-detail .thesis-hint');
  assert(!!hint && hint.textContent.includes('Write what you think first'), 'empty save shows inline guidance instead of a silent no-op');
  assert(!readStore().ideas.find(i => i.name === 'Audit Fix Co').sealed, 'empty save seals nothing');
  beliefBox.value = 'Autosave draft words';
  beliefBox.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 950));
  const draftIdea = readStore().ideas.find(i => i.name === 'Audit Fix Co');
  assert(draftIdea && draftIdea.thesis && draftIdea.thesis.belief === 'Autosave draft words', 'typed thesis draft autosaves to the store after a pause');

  // ---- disclaimers ----
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  assert(document.querySelector('.disclaimer-banner').textContent.includes('not financial advice'), 'hero disclaimer present');
  assert(document.querySelector('#screen-profile .disclaimer-banner').textContent.includes('not financial advice'), 'profile hero carries the disclaimer');
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

  // ---- v3.5 package: funnel + prices + chart + check-in-early ----
  console.log('v3.5 package flows:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('trend-name').value = 'AI infrastructure';
  document.getElementById('trend-why').value = 'Every model needs more compute';
  document.getElementById('trend-add').click();
  st = readStore();
  assert(st.trends.some(t => t.name === 'AI infrastructure'), 'trend logged for funnel test');
  const aiRow = Array.from(document.querySelectorAll('#trends-watching .note-card'))
    .find(r => r.querySelector('.entry-name').textContent === 'AI infrastructure');
  assert(aiRow, 'AI infrastructure trend row rendered');
  const findBtn = Array.from(aiRow.querySelectorAll('.btn'))
    .find(b => b.textContent === 'Find companies');
  assert(findBtn, 'watching trend offers Find companies');
  findBtn.click();
  const dbox = aiRow.querySelector('.discover-box');
  assert(dbox && dbox.querySelector('textarea').value.includes('AI infrastructure'),
    'discover box opens with the trend prompt');
  assert(dbox.querySelector('textarea').value.includes('no buy or sell recommendations'),
    'discover prompt keeps the no-recommendations rule');
  const dInputs = dbox.querySelectorAll('input[type="text"]');
  dInputs[0].value = 'CoreWeave';
  dInputs[1].value = 'CRWV';
  Array.from(aiRow.querySelectorAll('.discover-box .btn')).find(b => b.textContent === 'Add as idea').click();
  st = readStore();
  const cwIdea = st.ideas.find(i => i.name === 'CoreWeave');
  assert(cwIdea && cwIdea.tickers === 'CRWV', 'company added as an idea from the trend');
  assert(cwIdea.trendId === st.trends.find(t => t.name === 'AI infrastructure').id, 'idea linked to its trend');
  assert(st.trends.find(t => t.name === 'AI infrastructure').status === 'chased', 'trend marked chased after adding a company');

  // price-at-spot: write thesis + price, save, price locks in
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  Array.from(document.querySelectorAll('#ideas-list .idea-row .idea-main'))
    .find(b => b.getAttribute('aria-label') === 'Open research for CoreWeave').click();
  const detailText = () => document.getElementById('idea-detail').textContent;
  assert(detailText().includes('See the chart'), 'chart link shows when a ticker exists');
  const chartLink = Array.from(document.querySelectorAll('#idea-detail a')).find(a => a.textContent === 'See the chart');
  assert(chartLink && chartLink.href.includes('google.com/finance/quote/CRWV'), 'chart link points at Google Finance for the ticker');
  document.querySelector('#idea-detail textarea').value = 'Compute demand compounds for a decade.';
  const priceIn = document.querySelector('#idea-detail input[type="number"]');
  assert(priceIn, 'price-when-spotted input offered before any price is locked');
  priceIn.value = '40.25';
  Array.from(document.querySelectorAll('#idea-detail .btn')).find(b => b.textContent === 'Save').click();
  st = readStore();
  const cw2 = st.ideas.find(i => i.name === 'CoreWeave');
  assert(cw2.priceLog.length === 1 && cw2.priceLog[0].price === 40.25 && cw2.priceLog[0].note === 'spotted',
    'spotted price recorded at thesis save');
  assert(cw2.sealed && cw2.sealed.belief.includes('Compute demand'), 'thesis sealed alongside the price');
  const promptNow = document.querySelector('#idea-detail .analyze-sec textarea').value;
  assert(promptNow.includes('Compute demand compounds'), 'second-opinion prompt is fresh immediately after Save (no stale window)');
  assert(promptNow.includes('PRICE WHEN I SPOTTED IT: $40.25'), 'prompt carries the spotted price immediately');
  assert(detailText().includes('Spotted at $40.25'), 'locked spotted line shows immediately after Save');
  assert(detailText().includes('from trend:'), 'idea page links back to its trend');
  // check in with a price now -> history shows the move on the Scorecard
  Array.from(document.querySelectorAll('#idea-detail .btn')).find(b => b.textContent === 'Check in now').click();
  const pnIn = document.querySelector('#idea-detail .review-form input[type="number"]');
  assert(pnIn, 'check-in form offers a price-now field');
  pnIn.value = '60.50';
  Array.from(document.querySelectorAll('#idea-detail .review-form .btn.primary'))
    .find(b => b.textContent === 'Save check-in').click();
  st = readStore();
  const cw3 = st.ideas.find(i => i.name === 'CoreWeave');
  assert(cw3.reviewHistory.length === 1 && cw3.reviewHistory[0].priceNow === 60.5, 'check-in price saved');
  assert(cw3.priceLog.length === 2, 'price log grows with the check-in');
  assert(document.querySelector('#idea-detail .idea-history'), 'idea page shows its own past check-ins after saving');
  assert(document.querySelector('#idea-detail .idea-history').textContent.includes('$40.25 when spotted'),
    'idea-page history shows the price move');
  document.querySelector('.nav-btn[data-nav="track"]').click();
  assert(document.getElementById('track-record').textContent.includes('$40.25 when spotted'),
    'past check-ins show spotted vs now with the move');

  // check in early from the Check-ins screen (upcoming idea)
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-name').value = 'Early Bird Co';
  document.getElementById('qa-add').click();
  document.getElementById('idea-back').click();
  document.querySelector('.nav-btn[data-nav="reviews"]').click();
  const earlyBtn = Array.from(document.querySelectorAll('#reviews-list .btn'))
    .find(b => b.textContent === 'Check in early');
  assert(earlyBtn, 'upcoming idea offers Check in early');
  earlyBtn.click();
  assert(document.querySelector('#idea-detail .review-form'), 'Check in early opens the idea with the form ready');

  // ---- accounts: Roth income window (2026 IRS figures) ----
  console.log('accounts income window:');
  document.querySelector('.nav-btn[data-nav="learn"]').click();
  const acctText = document.getElementById('accounts-part').textContent;
  assert(acctText.includes('The Roth income window'), 'accounts page has the income-window section');
  assert(acctText.includes('$153,000') && acctText.includes('$168,000'), 'single phase-out window shown (2026)');
  assert(acctText.includes('$242,000') && acctText.includes('$252,000'), 'joint phase-out window shown (2026)');
  assert(acctText.includes('$24,500'), 'pre-tax 401(k) lever quantified');
  assert(acctText.includes('backdoor Roth') && acctText.includes('pro-rata'), 'backdoor path + its caution included');
  assert(acctText.includes('verify at irs.gov'), 'figures carry the verify-at-irs.gov label');

  // ---- no EDGAR links anywhere (owner directive) ----
  console.log('external links policy:');
  assert(document.querySelectorAll('a[href*="sec.gov"]').length === 0, 'no SEC/EDGAR links anywhere in the page');
  assert(!document.body.textContent.includes('SEC EDGAR'), 'footer and Learn no longer plug EDGAR');
  assert(!document.body.textContent.includes('Muse or Claude'), 'prompt hints name ChatGPT or Claude, never the same tool twice');

  // ---- zero code comments in shipped source (owner directive) ----
  console.log('comment-free source:');
  const stripStrings = s => s.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/`(?:[^`\\]|\\.)*`/g, '``');
  for (const f of ['app.js', 'styles.css']) {
    const code = stripStrings(require('fs').readFileSync(__dirname + '/../' + f, 'utf-8'));
    assert(!/\/\/|\/\*/.test(code), f + ' ships with zero code comments');
  }

  // ---- delete my data (two-step) + quiz retake ----
  console.log('data wipe + retake:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const delBtn = document.getElementById('delete-data');
  assert(delBtn, 'Delete my data button exists in Your data');
  delBtn.click();
  assert(delBtn.classList.contains('armed') && readStore().ideas.length > 0, 'first click only arms; data intact');
  delBtn.click();
  st = readStore();
  assert(st.ideas.length === 0 && st.trends.length === 0, 'second click wipes ideas and trends');
  assert(delBtn.textContent.includes('Deleted'), 'wipe gives feedback');
  document.querySelector('.nav-btn[data-nav="profile"]').click();
  assert(document.getElementById('quiz-result').classList.contains('hidden'), 'wipe hides the saved quiz result');
  assert(document.querySelectorAll('#quiz .opt-btn.selected').length === 0, 'wipe clears pressed quiz answers');
  const qBtns = document.querySelectorAll('#quiz .opt-btn');
  assert(qBtns.length > 0, 'quiz renders for retake test');
  // answer every question via first options, submit, then retake
  const qCount = document.querySelectorAll('#quiz .q').length;
  for (let qi = 0; qi < qCount; qi++) {
    document.querySelectorAll('#quiz .q')[qi].querySelector('.opt-btn').click();
  }
  document.querySelector('#quiz .btn.primary').click();
  assert(!document.getElementById('quiz-result').classList.contains('hidden'), 'quiz result shows after submit');
  const retakeBtn = Array.from(document.querySelectorAll('#quiz-result .btn')).find(b => b.textContent === 'Retake the quiz');
  assert(retakeBtn, 'result offers Retake the quiz');
  retakeBtn.click();
  assert(document.getElementById('quiz-result').classList.contains('hidden'), 'retake hides the result');
  assert(document.querySelectorAll('#quiz .opt-btn.selected').length === 0, 'retake clears all selections');


  // ---- v4.1: dates are local, sealing is real, denominators are labeled ----
  console.log('local dates + hard seal:');
  const appSrc = require('fs').readFileSync(__dirname + '/../app.js', 'utf-8');
  const tioBody = appSrc.slice(appSrc.indexOf('function todayISO()'), appSrc.indexOf('function todayISO()') + 260);
  assert(tioBody.includes('getFullYear') && tioBody.includes('getMonth'), 'todayISO builds the LOCAL date');
  assert(!appSrc.includes('toISOString'), 'no UTC stamps anywhere in app.js');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(L.todayISO()), 'todayISO format');
  const sealedPrompt = L.buildAnalyzePrompt({ name: 'SealTest', tickers: 'ST',
    thesis: { belief: 'EDITED WORDS', falsify: 'EDITED FALSIFY' },
    sealed: { belief: 'ORIGINAL WORDS', falsify: 'ORIGINAL FALSIFY', date: '2026-10-01' }, conviction: 3 });
  assert(sealedPrompt.includes('MY THESIS: ORIGINAL WORDS'), 'second-opinion prompt uses the SEALED words, not later edits');
  assert(sealedPrompt.includes('WHAT WOULD PROVE ME WRONG: ORIGINAL FALSIFY'), 'prompt uses the sealed falsify line');
  // Build a fresh fixture on the wiped store: add + seal Seal Corp at $84
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-name').value = 'Seal Corp';
  document.getElementById('qa-tickers').value = 'SC';
  document.getElementById('qa-add').click();
  const scAreas = document.querySelectorAll('#idea-detail textarea');
  scAreas[0].value = 'Sealed words stay sealed.';
  scAreas[1].value = 'It ships.';
  const scInputs = document.querySelectorAll('#idea-detail input');
  scInputs[0].value = 'If it slips.';
  Array.from(scInputs).find(i => i.type === 'number').value = '84';
  document.querySelector('#idea-detail [data-action="thesis-save"]').click();
  assert(document.querySelector('#idea-detail .sealed-words') !== null, 'sealed idea shows the locked-words view');
  assert(document.querySelector('#idea-detail [data-action="thesis-save"]') === null, 'no thesis Save button after sealing');
  assert(!Array.from(document.querySelectorAll('#idea-detail textarea:not(.analyze-prompt)')).some(t => t.value.includes('Sealed words')),
    'no editable field carries the sealed belief (the read-only prompt box aside)');
  assert(document.querySelector('#idea-detail .sealed-words').textContent.includes('Sealed words stay sealed.'),
    'locked view quotes the sealed words');

  console.log('check-in live preview + price stats:');
  document.querySelector('#idea-detail [data-action="checkin-now"]').click();
  const rfA = document.querySelector('#idea-detail .review-form');
  const pnA = Array.from(rfA.querySelectorAll('input')).find(i => i.type === 'number');
  pnA.value = '105';
  pnA.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(rfA.querySelector('.price-preview').textContent.includes('+25%'), 'typing a price previews the move vs spotted (+25%)');
  Array.from(rfA.querySelectorAll('.chip')).find(c => c.textContent.includes('Yes — for my reasons')).click();
  rfA.querySelector('textarea').value = 'On track.';
  Array.from(rfA.querySelectorAll('button')).find(b => b.textContent === 'Save check-in').click();
  // a second, too-early check-in for the denominator line
  const ciBtn2 = document.querySelector('#idea-detail [data-action="checkin-now"]');
  assert(!!ciBtn2, 'check-in button returns after the first save');
  ciBtn2.click();
  const rfB = document.querySelector('#idea-detail .review-form');
  rfB.querySelector('textarea').value = 'Too soon.';
  Array.from(rfB.querySelectorAll('button')).find(b => b.textContent === 'Save check-in').click();
  const scHist = readStore().ideas.find(i => i.name === 'Seal Corp').reviewHistory;
  assert(scHist.length === 2 && scHist[0].priceNow === 105, 'both check-ins saved on the fixture');

  console.log('denominator honesty + scorecard price side:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const stripTxt2 = document.getElementById('cal-strip').textContent;
  assert(stripTxt2.includes('with a verdict'), 'strip labels its denominator as verdicts only');
  assert(stripTxt2.includes('too early to tell'), 'strip names the too-early check-ins it excludes');
  document.querySelector('.nav-btn[data-nav="track"]').click();
  const trackTxt2 = document.getElementById('track-record').textContent;
  assert(trackTxt2.includes('The price side of your record'), 'scorecard shows the price-side summary');
  assert(trackTxt2.includes('+25% on average'), 'scorecard averages the priced moves (+25% on the single sample)');

  console.log('scorecard empty states:');
  // check-ins with no verdicts must not claim "No check-ins yet."
  const savedStore = readStore();
  const nvStore = { schema: 3, ideas: [{ id: 'nv1', name: 'No Verdict Co', tickers: 'NV', reviewHistory: [
    { at: '2026-10-17', outcome: 'intact', reasonMatch: 'na', note: 'Too soon.' },
  ] }], trends: [], glossary: {}, quizProfile: null };
  window.localStorage.setItem(KEY, JSON.stringify(nvStore));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="track"]').click();
  const scEmpty1 = document.getElementById('track-record').textContent;
  assert(scEmpty1.includes('No verdicts yet'), 'scorecard with verdict-less check-ins says "No verdicts yet"');
  assert(!scEmpty1.includes('No check-ins yet'), 'scorecard with check-ins never claims "No check-ins yet"');
  // zero check-ins keeps the original empty state
  nvStore.ideas[0].reviewHistory = [];
  window.localStorage.setItem(KEY, JSON.stringify(nvStore));
  L.reloadJournal();
  document.querySelector('.nav-btn[data-nav="track"]').click();
  const scEmpty2 = document.getElementById('track-record').textContent;
  assert(scEmpty2.includes('No check-ins yet'), 'scorecard with zero check-ins keeps the original empty state');
  window.localStorage.setItem(KEY, JSON.stringify(savedStore));
  L.reloadJournal();

  console.log('ideas filter + learn anchors:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const filterEl = document.getElementById('idea-filter');
  filterEl.value = 'seal';
  filterEl.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(document.querySelectorAll('#ideas-list .idea-row').length === 1, 'filter narrows the ideas list');
  assert(document.getElementById('ideas-count').textContent.includes('of'), 'count shows filtered share');
  filterEl.value = 'zzz-nothing';
  filterEl.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(document.getElementById('ideas-list').textContent.includes('No ideas match'), 'empty filter state explains itself');
  filterEl.value = '';
  filterEl.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(document.querySelectorAll('#ideas-list .idea-row').length === 1, 'clearing the filter restores the list');
  document.querySelector('.nav-btn[data-nav="learn"]').click();
  assert(document.querySelectorAll('#screen-learn a[href^="#learn-"], #screen-learn a[href="#accounts-part"]').length === 6,
    'Learn carries six jump links');
  assert(document.getElementById('accounts-part') !== null && document.getElementById('learn-checklist') !== null &&
    document.getElementById('learn-principles') !== null && document.getElementById('learn-wisdom') !== null,
    'Learn jump targets exist');


  // ---- v4.2: profile explainer ----
  console.log('profile explainer:');
  document.querySelector('.nav-btn[data-nav="profile"]').click();
  const sub = document.querySelector('#screen-profile .subtitle');
  assert(sub && sub.textContent.trim().length < 140 && !sub.textContent.includes('starting point for thinking'),
    'profile subtitle is one concise line');
  const expl = document.getElementById('profile-explainer');
  assert(!!expl, 'profile explainer exists');
  const dets = expl.querySelectorAll('details');
  assert(dets.length === 4, 'explainer has four dropdowns');
  assert(dets[0].open === true, 'first dropdown starts open (how it works)');
  assert(dets[0].querySelector('summary').textContent === 'How this works', 'dropdown 1: how this works');
  assert(dets[1].querySelector('summary').textContent === 'The four bands', 'dropdown 2: the four bands');
  assert(dets[2].querySelector('summary').textContent === "What this isn't", 'dropdown 3: what this isn\'t');
  const bandText = dets[1].textContent;
  L.BANDS.forEach(b => {
    assert(bandText.includes(b.label) && bandText.includes(b.index + '% index') && bandText.includes(b.conv + '%'),
      'explainer band matches quiz data: ' + b.label + ' ' + b.index + '/' + b.conv);
  });
  const learnLink = expl.querySelector('[data-goto="learn"]');
  assert(!!learnLink, 'explainer links onward to Learn');
  learnLink.click();
  assert(!document.getElementById('screen-learn').classList.contains('hidden'), 'explainer link lands on Learn');
  document.querySelector('.nav-btn[data-nav="profile"]').click();

  // ---- v4.3: typing a thesis then tapping conviction must not wipe the draft ----
  console.log('thesis draft survives re-renders:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-name').value = 'Draft Corp';
  document.getElementById('qa-tickers').value = 'DC';
  document.getElementById('qa-add').click();
  document.querySelector('#idea-detail .thesis-belief').value = 'Draft survives conviction taps.';
  document.querySelector('#idea-detail .thesis-falsify').value = 'Only if the code regresses.';
  document.querySelector('#idea-detail .thesis-price').value = '120';
  // tap "How sure are you?" BEFORE saving — the reported bug wiped the typed text here
  Array.from(document.querySelectorAll('#idea-detail .conv-btn')).find(b => b.textContent === '4').click();
  assert(document.querySelector('#idea-detail .thesis-belief').value === 'Draft survives conviction taps.',
    'belief text survives a conviction tap');
  assert(document.querySelector('#idea-detail .thesis-falsify').value === 'Only if the code regresses.',
    'falsify text survives a conviction tap');
  assert(document.querySelector('#idea-detail .thesis-price').value === '120',
    'price draft survives a conviction tap');
  document.querySelector('#idea-detail [data-action="thesis-save"]').click();
  assert(document.querySelector('#idea-detail .sealed-words') !== null, 'drafted idea shows the locked view after Save');
  assert(document.querySelector('#idea-detail .sealed-words').textContent.includes('Draft survives conviction taps.'),
    'locked view quotes the drafted words');
  assert(document.getElementById('idea-detail').textContent.includes('Spotted at $120'),
    'drafted price logged at seal');

  // ---- v4.4.2: a check-in from the Check-ins tab must never borrow another idea's draft ----
  console.log('cross-idea draft guard:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-name').value = 'Draft A';
  document.getElementById('qa-add').click();
  document.querySelector('#idea-detail .thesis-belief').value = 'A DRAFT WORDS';
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  document.getElementById('qa-name').value = 'Checkin B';
  document.getElementById('qa-add').click();
  const bDueDate = document.querySelector('#idea-detail input[type="date"]');
  bDueDate.value = L.todayISO();
  bDueDate.dispatchEvent(new window.Event('change', { bubbles: true }));
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  Array.from(document.querySelectorAll('.idea-main'))
    .find(b => b.getAttribute('aria-label') === 'Open research for Draft A').click();
  document.querySelector('#idea-detail .thesis-belief').value = 'A DRAFT WORDS';
  document.querySelector('.nav-btn[data-nav="reviews"]').click();
  const bCheckinBtn = Array.from(document.querySelectorAll('#screen-reviews .btn.primary'))
    .find(b => b.getAttribute('aria-label') === 'Check in on Checkin B');
  assert(!!bCheckinBtn, 'due list offers an inline Check in button for B');
  bCheckinBtn.click();
  const bForm = bCheckinBtn.closest('.entry').querySelector('.review-form');
  assert(!!bForm, 'check-in form mounts inside the Check-ins tab card');
  bForm.querySelector('textarea').value = 'B note.';
  Array.from(bForm.querySelectorAll('button')).find(b => b.textContent === 'Save check-in').click();
  const bStored = readStore().ideas.find(i => i.name === 'Checkin B');
  assert(bStored.reviewHistory.length === 1, 'the check-in itself saved on B');
  assert(bStored.thesis.belief !== 'A DRAFT WORDS', 'B\'s thesis was not overwritten with A\'s on-screen draft');
  document.querySelector('#idea-detail [data-action="checkin-now"]').click();
  const aForm = document.querySelector('#idea-detail .review-form');
  aForm.querySelector('textarea').value = 'A note.';
  Array.from(aForm.querySelectorAll('button')).find(b => b.textContent === 'Save check-in').click();
  const aStored = readStore().ideas.find(i => i.name === 'Draft A');
  assert(aStored.thesis.belief === 'A DRAFT WORDS', 'detail-page check-in still captures the same idea\'s draft');
  assert(aStored.reviewHistory.length === 1, 'A\'s check-in saved');

  console.log('screen navigation moves focus:');
  document.querySelector('.nav-btn[data-nav="track"]').click();
  const trackH = document.querySelector('#screen-track h1');
  assert(document.activeElement === trackH, 'opening Scorecard moves focus to its heading');
  assert(trackH.getAttribute('tabindex') === '-1', 'screen heading is focusable without joining the tab order');

  console.log('trend Enter key:');
  document.querySelector('.nav-btn[data-nav="ideas"]').click();
  const trendsBefore = readStore().trends.length;
  document.getElementById('trend-name').value = 'NoSubmit Trend';
  document.getElementById('trend-why').value = 'why text';
  document.getElementById('trend-why').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert(readStore().trends.length === trendsBefore, 'Enter in the trend why box types a newline, not a submit');
  document.getElementById('trend-name').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert(readStore().trends.length === trendsBefore + 1, 'Enter in the trend name box still adds the trend');

  console.log('import hardens malformed sealed records:');
  assert(!L.normalizeIdea({ name: 'Bad Seal', sealed: {} }).sealed, 'sealed without date/belief is dropped');
  assert(!L.normalizeIdea({ name: 'No Date', sealed: { belief: 'words' } }).sealed, 'sealed without a date is dropped');
  const goodSeal = L.normalizeIdea({ name: 'Good', sealed: { belief: 'words', falsify: 'x', date: '2026-10-01' } });
  assert(goodSeal.sealed && goodSeal.sealed.belief === 'words', 'well-formed sealed records survive');

  console.log('v2 migration keeps trends:');
  const upgraded = L.migrateV2ToV3({ schema: 2, ideas: [], trends: [{ id: 't9', name: 'Old Trend', why: 'because', status: 'watching' }], glossary: {}, quizProfile: null });
  assert(upgraded.schema === 3, 'migration lands on the current schema');
  assert(upgraded.trends.length === 1 && upgraded.trends[0].name === 'Old Trend', 'v2 trends survive the v3 migration');

  console.log('CSS custom properties stay valid and used:');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const defined = new Set([...css.matchAll(/(^|\s)--([a-zA-Z0-9-]+)\s*:/gm)].map(m => m[2]));
  const used = new Set([...css.matchAll(/var\(--([a-zA-Z0-9-]+)/g)].map(m => m[1]));
  const undefinedUsed = [...used].filter(v => !defined.has(v));
  const unusedDefined = [...defined].filter(v => !used.has(v));
  assert(undefinedUsed.length === 0, 'every var(--x) used in styles.css is defined' + (undefinedUsed.length ? ' (missing: ' + undefinedUsed.join(', ') + ')' : ''));
  assert(unusedDefined.length === 0, 'every --x defined in styles.css is used' + (unusedDefined.length ? ' (dead: ' + unusedDefined.join(', ') + ')' : ''));

  const realErrors = errors.filter(e => !e.includes('Not implemented') && !e.includes('scrollIntoView'));
  assert(realErrors.length === 0, 'no script errors across the whole run (' + realErrors.length + ' real of ' + errors.length + ')');
  realErrors.forEach(e => console.error('    ' + e));
  console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : '\n' + failures + ' FAILURES');
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('SMOKE TEST ERROR:', e.message); process.exit(1); });
