/* Long-Term Lens — app logic.
 * Vanilla JS, no dependencies. User data lives in localStorage only.
 * Pure functions (scoreRisk, weightedScore, GLOSSARY, QUIZ) are DOM-free and
 * exported for the Node smoke test via the guarded block at the bottom.
 */
(function () {
'use strict';

/* ---------------- data: risk quiz ---------------- */
// Each option carries a 0-3 score; higher = more capacity/tolerance for risk.
const QUIZ = [
  {
    q: 'How old are you?',
    options: [
      { t: 'Under 30', s: 3 },
      { t: '30–45', s: 2 },
      { t: '45–60', s: 1 },
      { t: 'Over 60', s: 0 },
    ],
  },
  {
    q: 'When will you likely need this money?',
    options: [
      { t: '10+ years away', s: 3 },
      { t: '5–10 years', s: 2 },
      { t: '1–5 years', s: 1 },
      { t: 'Within a year', s: 0 },
    ],
  },
  {
    q: 'Your portfolio drops 20% in a year. You…',
    options: [
      { t: 'Buy more — it\'s on sale', s: 3 },
      { t: 'Hold and do nothing', s: 2 },
      { t: 'Feel anxious but stay invested', s: 1 },
      { t: 'Sell to stop the pain', s: 0 },
    ],
  },
  {
    q: 'How stable is your income?',
    options: [
      { t: 'Very stable, plus an emergency fund', s: 3 },
      { t: 'Stable, small emergency fund', s: 2 },
      { t: 'Somewhat uncertain', s: 1 },
      { t: 'Unstable, or I carry high-interest debt', s: 0 },
    ],
  },
  {
    q: 'How much investing experience do you have?',
    options: [
      { t: 'Years of researching companies', s: 3 },
      { t: 'I\'ve bought index funds before', s: 2 },
      { t: 'I\'ve read a bit, never invested', s: 1 },
      { t: 'This is all new to me', s: 0 },
    ],
  },
  {
    q: 'If your conviction stocks underperformed the index for 3 years, you would…',
    options: [
      { t: 'Re-check my thesis calmly and likely hold', s: 3 },
      { t: 'Hold, but second-guess myself', s: 2 },
      { t: 'Probably rotate back to index funds', s: 1 },
      { t: 'I\'d have sold long before that', s: 0 },
    ],
  },
];

// Bands: total 0-18. Higher score -> larger conviction-stock slice.
// Every band keeps broad index funds as the majority: conviction stocks are
// the satellite, never the core.
const BANDS = [
  { min: 14, index: 80, conv: 20, label: 'Growth-leaning',
    why: 'Long timeline, stable income, and comfort with volatility. You can afford a meaningful conviction slice — but the index core still does most of the work.' },
  { min: 10, index: 87, conv: 13, label: 'Balanced',
    why: 'A solid foundation with room for a few well-researched ideas. Keep conviction positions small enough that a mistake doesn\'t derail your plan.' },
  { min: 6, index: 93, conv: 7, label: 'Cautious',
    why: 'Either your timeline is shorter or volatility would cost you sleep. A small conviction slice lets you learn without much downside.' },
  { min: 0, index: 98, conv: 2, label: 'Capital-preservation',
    why: 'Right now, safety and learning matter more than stock-picking. Build the index core first; revisit conviction stocks as your situation changes.' },
];

function scoreRisk(answers) {
  // answers: array of option indexes, one per QUIZ question
  let total = 0;
  answers.forEach((optIdx, qi) => {
    const opt = QUIZ[qi] && QUIZ[qi].options[optIdx];
    if (opt) total += opt.s;
  });
  const band = BANDS.find(b => total >= b.min) || BANDS[BANDS.length - 1];
  return { total, max: QUIZ.length * 3, band };
}

/* ---------------- data: glossary ---------------- */
// "healthy" describes typical patterns, never rules.
const GLOSSARY = [
  { abbr: 'P/E', name: 'Price-to-Earnings ratio',
    what: 'Share price divided by earnings per share. Roughly: how many dollars investors pay for each dollar of yearly profit.',
    healthy: 'Varies wildly by industry and growth — fast growers often carry higher P/E. Compare against the company\'s own history and close competitors, not an absolute number.',
    flag: 'Extremely high P/E with slowing growth, or a "cheap" P/E that keeps getting cheaper as earnings fall (a value trap).' },
  { abbr: 'PEG', name: 'Price/Earnings-to-Growth ratio',
    what: 'P/E divided by expected earnings growth rate. It asks whether you\'re paying a fair price for the growth you get.',
    healthy: 'Often cited around 1 as "fair value for growth", but estimates are guesses — treat it as a sanity check, not a verdict.',
    flag: 'PEG far above peers with no credible reason the growth will accelerate.' },
  { abbr: 'P/S', name: 'Price-to-Sales ratio',
    what: 'Market value divided by revenue. Useful for young companies that aren\'t profitable yet — there are no earnings to measure.',
    healthy: 'Lower generally means cheaper per dollar of sales, but unprofitable companies deserve extra skepticism about when profits arrive.',
    flag: 'High P/S combined with shrinking or flat revenue — paying growth prices for no growth.' },
  { abbr: 'FCF', name: 'Free Cash Flow',
    what: 'Cash left over after a company pays for operations and equipment. The money it could use to pay down debt, buy back shares, or pay dividends.',
    healthy: 'Consistently positive and growing FCF is one of the strongest signs of a healthy business.',
    flag: 'Years of negative FCF funded by constantly issuing new shares or piling on debt.' },
  { abbr: 'Rev growth', name: 'Revenue growth',
    what: 'How fast sales are increasing year over year. The top line — everything else starts here.',
    healthy: 'Steady growth over 3–5 years beats one spectacular year. For mature companies, even single-digit consistent growth compounds beautifully.',
    flag: 'Growth driven by acquisitions that never quite pay off, or a sudden cliff with no explanation in the filings.' },
  { abbr: 'Gross margin', name: 'Gross margin',
    what: 'Revenue minus cost of goods sold, as a percentage. Measures pricing power before overhead.',
    healthy: 'Stable or rising margins suggest customers value the product. Software-like margins (70%+) and retail margins (20–30%) are both fine — in their own industries.',
    flag: 'Margins compressing year after year while competitors hold steady.' },
  { abbr: 'Op margin', name: 'Operating margin',
    what: 'Profit after operating expenses (but before interest and taxes), as a percentage of revenue. Shows whether the business model itself works.',
    healthy: 'Positive and ideally expanding as the company scales — costs should grow slower than revenue.',
    flag: 'Revenue growing but operating margin stuck near zero: the company may be buying growth at any cost.' },
  { abbr: 'ROE', name: 'Return on Equity',
    what: 'Net income divided by shareholder equity. How efficiently the company turns its owners\' money into profit.',
    healthy: 'Consistently double-digit ROE often signals a strong business — but check it isn\'t juiced by heavy debt (which shrinks equity).',
    flag: 'High ROE paired with high debt-to-equity: the "efficiency" is borrowed, not earned.' },
  { abbr: 'D/E', name: 'Debt-to-Equity ratio',
    what: 'Total debt divided by shareholder equity. How much of the company is funded by borrowing.',
    healthy: 'Low relative to industry peers gives a company room to survive recessions. Some industries (utilities) naturally carry more.',
    flag: 'Rising debt while cash flow falls, or interest payments eating a large share of operating income.' },
  { abbr: 'Moat', name: 'Economic moat',
    what: 'Warren Buffett\'s term for a durable competitive advantage: network effects, high switching costs, brand, cost advantages, patents, or regulation.',
    healthy: 'A real moat shows up as sustained high margins and returns over many years, not just in marketing slides.',
    flag: 'Management claims a moat, but margins and market share have been eroding for years.' },
];

/* ---------------- glossary search ---------------- */
// DOM-free: case-insensitive match against abbreviation, name, and body text.
// Empty/null query matches everything.
function filterGlossaryTerms(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return GLOSSARY.slice();
  return GLOSSARY.filter(g =>
    (g.abbr + ' ' + g.name + ' ' + g.what + ' ' + g.healthy + ' ' + g.flag)
      .toLowerCase().includes(q));
}

/* ---------------- journal scoring ---------------- */
const SCORE_DIMS = ['product', 'fundamentals', 'moat', 'valuation', 'horizon'];
const SCORE_WEIGHTS = { product: 0.20, fundamentals: 0.25, moat: 0.20, valuation: 0.15, horizon: 0.20 };

function weightedScore(scores) {
  // scores: {product:1-5, ...}. Returns 0-5 weighted total, or null if incomplete.
  let total = 0, weight = 0;
  SCORE_DIMS.forEach(d => {
    const v = scores[d];
    if (typeof v === 'number' && v >= 1 && v <= 5) { total += v * SCORE_WEIGHTS[d]; weight += SCORE_WEIGHTS[d]; }
  });
  if (weight === 0) return null;
  return Math.round((total / weight) * 10) / 10;
}

function scoreCount(scores) {
  // How many of the five dimensions have a valid 1-5 score. DOM-free.
  let n = 0;
  SCORE_DIMS.forEach(d => {
    const v = scores[d];
    if (typeof v === 'number' && v >= 1 && v <= 5) n++;
  });
  return n;
}

function thesesLabel(n) {
  // "(1 thesis)" / "(2 theses)" / "" — DOM-free.
  if (!n) return '';
  return '(' + n + (n === 1 ? ' thesis)' : ' theses)');
}

/* ---------------- thesis revisit reminders ---------------- */
// All date math is on ISO "YYYY-MM-DD" strings so it is deterministic and testable.

function addMonths(dateStr, n) {
  // Add n calendar months to an ISO date, clamping to the end of the month
  // (Jan 31 + 1 month -> Feb 28/29). Returns null for invalid input.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!m) return null;
  let y = +m[1], mo = +m[2] - 1 + n, d = +m[3];
  y += Math.floor(mo / 12);
  mo = ((mo % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  if (d > lastDay) d = lastDay;
  const p = x => String(x).padStart(2, '0');
  return y + '-' + p(mo + 1) + '-' + p(d);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function reviewAtOf(entry) {
  // Effective review date for an entry. Entries saved before v0.2 have no
  // reviewAt — they gracefully default to createdAt + 6 months (lazy
  // migration; no localStorage key bump or data wipe needed).
  if (/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewAt || '')) return entry.reviewAt;
  return addMonths(entry.createdAt, 6);
}

function isReviewDue(entry, today) {
  today = today || todayISO();
  const r = reviewAtOf(entry);
  return !!r && r <= today;
}

/* Closing the revisit loop: after re-reading a due thesis, schedule the next
 * check N months out. DOM-free; returns a new entry object — the original is
 * left untouched. Only the 1/3/6/12 intervals the UI offers are honored. */
const REVIEW_INTERVALS = [1, 3, 6, 12];

function rescheduleReview(entry, months, today) {
  const m = parseInt(months, 10);
  const n = REVIEW_INTERVALS.includes(m) ? m : 6;
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : todayISO();
  return Object.assign({}, entry, { reviewMonths: n, reviewAt: addMonths(t, n) });
}

function journalToJSON(entries) {
  return JSON.stringify(entries, null, 2);
}

function journalToMarkdown(entries, stamp) {
  // Plain-text export of the journal — one section per thesis. DOM-free.
  const lines = [
    '# Long-Term Lens — Conviction Journal',
    '',
    'Exported ' + stamp + '. Personal research notes — educational only, not financial advice.',
    ''
  ];
  if (!entries.length) {
    lines.push('_No theses yet._');
    return lines.join('\n');
  }
  entries.forEach(e => {
    const scoredN = (typeof e.scored === 'number') ? e.scored : scoreCount(e.scores || {});
    const scoreLine = (e.weighted === null || e.weighted === undefined)
      ? 'unscored'
      : e.weighted.toFixed(1) + ' / 5 (' + scoredN + ' of 5 dimensions scored)';
    lines.push('## ' + e.name + (e.tickers ? ' (' + e.tickers + ')' : ''));
    lines.push('');
    lines.push('- Score: ' + scoreLine);
    lines.push('- Written: ' + e.createdAt + ' · Review by: ' + reviewAtOf(e));
    if (e.tags && e.tags.length) lines.push('- Tags: ' + e.tags.join(', '));
    lines.push('');
    lines.push('Thesis: ' + (e.thesis || ''));
    lines.push('');
    if (e.falsify) {
      lines.push('Would prove me wrong: ' + e.falsify);
      lines.push('');
    }
    lines.push('---', '');
  });
  return lines.join('\n');
}

/* ---------------- storage ---------------- */
const STORE_KEY = 'longterm-stock-lens-v1';
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw);
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch (e) { return { entries: [] }; }
}
function saveStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* storage full/blocked */ }
}

/* ---------------- helpers ---------------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function $(id) { return document.getElementById(id); }

/* ---------------- navigation ---------------- */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = $('screen-' + name);
  if (el) {
    el.classList.remove('hidden');
    // Restart the view-enter animation on every navigation (visual only).
    el.style.animation = 'none';
    void el.offsetWidth; // force reflow so the animation restarts
    el.style.animation = '';
  }
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === name));
  window.scrollTo(0, 0);
}

/* ---------------- quiz UI ---------------- */
const quizAnswers = new Array(QUIZ.length).fill(null);

function renderQuiz() {
  const box = $('quiz');
  box.innerHTML = '';
  QUIZ.forEach((item, qi) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'q';
    const title = document.createElement('div');
    title.className = 'q-title';
    title.textContent = (qi + 1) + '. ' + item.q;
    qDiv.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'opt-grid';
    item.options.forEach((opt, oi) => {
      const btn = document.createElement('button');
      btn.className = 'opt-btn';
      btn.textContent = opt.t;
      btn.setAttribute('aria-pressed', 'false');
      if (quizAnswers[qi] === oi) { btn.classList.add('selected'); btn.setAttribute('aria-pressed', 'true'); }
      btn.addEventListener('click', () => {
        quizAnswers[qi] = oi;
        grid.querySelectorAll('.opt-btn').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
      });
      grid.appendChild(btn);
    });
    qDiv.appendChild(grid);
    box.appendChild(qDiv);
  });
  const row = document.createElement('div');
  row.className = 'btn-row';
  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.textContent = 'See my allocation band';
  btn.addEventListener('click', showQuizResult);
  row.appendChild(btn);
  box.appendChild(row);
}

function showQuizResult() {
  const missing = quizAnswers.findIndex(a => a === null);
  const res = $('quiz-result');
  if (missing !== -1) {
    res.classList.remove('hidden');
    res.innerHTML = '<p>Please answer question ' + (missing + 1) + ' first — every answer shapes the result.</p>';
    res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  const { total, max, band } = scoreRisk(quizAnswers);
  res.classList.remove('hidden');
  // The conviction segment is the narrow side of the bar (2-20% wide), so even
  // "20% conviction" can clip inside the overflow:hidden bar. Always use the
  // short label ("20%") inside the bar segment itself; the bar's aria-label
  // carries the full wording for assistive tech.
  const convText = band.conv + '%';
  res.innerHTML =
    '<h3>Your band: ' + esc(band.label) + '</h3>' +
    '<p class="fineprint">Score ' + total + ' / ' + max + ' — educational starting point, not advice.</p>' +
    '<div class="alloc-bar" role="img" aria-label="Suggested allocation: ' + band.index + ' percent index funds, ' + band.conv + ' percent conviction stocks">' +
      '<div class="alloc-index" style="width:' + band.index + '%">' + band.index + '% index</div>' +
      '<div class="alloc-conv" style="width:' + band.conv + '%">' + convText + '</div>' +
    '</div>' +
    '<p>' + esc(band.why) + '</p>' +
    '<p class="fineprint">Remember: a higher conviction-stock percentage always means higher risk. ' +
    'Re-take this quiz when your life changes — a new job, a shorter timeline, or new debt all shift the math.</p>';
  res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------------- glossary UI ---------------- */
// {el, term} pairs in render order — the search filter toggles their .hidden.
let glossaryNodes = [];

function renderGlossary() {
  const box = $('glossary');
  box.innerHTML = '';
  glossaryNodes = [];
  GLOSSARY.forEach(g => {
    const d = document.createElement('details');
    d.className = 'gloss';
    glossaryNodes.push({ el: d, term: g });
    const summary = document.createElement('summary');
    const tag = document.createElement('span');
    tag.className = 'ticker';
    tag.textContent = g.abbr;
    summary.appendChild(tag);
    summary.appendChild(document.createTextNode(g.name));
    const body = document.createElement('div');
    body.className = 'body';
    const p1 = document.createElement('p'); p1.textContent = g.what;
    const p2 = document.createElement('p'); p2.innerHTML = '<span class="healthy">Generally healthy:</span> ';
    p2.appendChild(document.createTextNode(g.healthy));
    const p3 = document.createElement('p'); p3.innerHTML = '<span class="flag">Red flag:</span> ';
    p3.appendChild(document.createTextNode(g.flag));
    body.appendChild(p1); body.appendChild(p2); body.appendChild(p3);
    d.appendChild(summary); d.appendChild(body);
    box.appendChild(d);
  });
}

function applyGlossaryFilter() {
  // Instant text filter: non-matching terms hide; the count line announces
  // results (role="status"). The query is only ever matched and set via
  // textContent — never rendered as HTML.
  const q = ($('glossary-search').value || '').trim();
  const visible = new Set(filterGlossaryTerms(q));
  let shown = 0;
  glossaryNodes.forEach(n => {
    const show = visible.has(n.term);
    n.el.classList.toggle('hidden', !show);
    if (show) shown++;
  });
  const count = $('glossary-count');
  const empty = $('glossary-empty');
  if (!q) {
    count.classList.add('hidden');
    empty.classList.add('hidden');
    return;
  }
  count.textContent = shown + ' of ' + GLOSSARY.length + ' terms match "' + q + '"';
  count.classList.remove('hidden');
  empty.classList.toggle('hidden', shown !== 0);
}

/* ---------------- journal UI ---------------- */
let store = loadStore();
const draftScores = {};

function renderScoreButtons() {
  document.querySelectorAll('.score-btns').forEach(group => {
    const dim = group.dataset.score;
    group.innerHTML = '';
    for (let v = 1; v <= 5; v++) {
      const b = document.createElement('button');
      b.className = 'score-btn' + (draftScores[dim] === v ? ' selected' : '');
      b.textContent = v;
      b.setAttribute('aria-label', dim + ' score ' + v + ' of 5' +
        (draftScores[dim] === v ? ' — selected, click again to clear' : ''));
      b.setAttribute('aria-pressed', draftScores[dim] === v ? 'true' : 'false');
      b.addEventListener('click', () => {
        draftScores[dim] = (draftScores[dim] === v) ? undefined : v; // toggle off on re-click
        renderScoreButtons();
        updateWeightedPreview();
      });
      group.appendChild(b);
    }
  });
}

function updateWeightedPreview() {
  const w = weightedScore(draftScores);
  const n = scoreCount(draftScores);
  $('j-weighted').textContent = (w === null) ? '—' : w.toFixed(1) + ' / 5 · ' + n + ' of 5 scored';
}

function showFormError(msg, focusId) {
  const err = $('j-error');
  err.textContent = msg;
  err.classList.remove('hidden');
  if (focusId) $(focusId).focus();
}

function clearFormError() {
  const err = $('j-error');
  err.textContent = '';
  err.classList.add('hidden');
}

function clearJournalForm() {
  ['j-name', 'j-tickers', 'j-tags', 'j-thesis', 'j-falsify'].forEach(id => { $(id).value = ''; });
  $('j-review').value = '6';
  SCORE_DIMS.forEach(d => { delete draftScores[d]; });
  clearFormError();
  renderScoreButtons();
  updateWeightedPreview();
}

function saveEntry() {
  clearFormError();
  const name = $('j-name').value.trim();
  const thesis = $('j-thesis').value.trim();
  if (!name) { showFormError('Give your thesis a company or idea name first.', 'j-name'); return; }
  if (!thesis) { showFormError('Write a sentence or two of thesis — future you will thank present you.', 'j-thesis'); return; }
  const reviewMonths = parseInt($('j-review').value, 10) || 6;
  const entry = {
    id: 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    name,
    tickers: $('j-tickers').value.trim().toUpperCase(),
    tags: $('j-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    thesis,
    falsify: $('j-falsify').value.trim(),
    scores: Object.assign({}, draftScores),
    weighted: weightedScore(draftScores),
    scored: scoreCount(draftScores),
    createdAt: todayISO(),
    reviewMonths,
    reviewAt: addMonths(todayISO(), reviewMonths),
  };
  store.entries.push(entry);
  saveStore(store);
  clearJournalForm();
  renderWatchlist();
}

function deleteEntry(id) {
  // No native confirm(): the delete button uses an inline two-tap arm/confirm
  // so deletion stays testable and consistent with the rest of the UI.
  store.entries = store.entries.filter(e => e.id !== id);
  saveStore(store);
  renderWatchlist();
}

function reloadJournal() {
  // Re-read entries from localStorage and re-render. Exposed for tests;
  // also the hook a future cross-tab `storage` listener would use.
  store = loadStore();
  renderWatchlist();
}

function renderWatchlist() {
  const box = $('watchlist');
  const today = todayISO();
  // Theses due for a re-check surface first, then sort by weighted score.
  const entries = store.entries.slice().sort((a, b) => {
    const aDue = isReviewDue(a, today) ? 0 : 1;
    const bDue = isReviewDue(b, today) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    return (b.weighted || 0) - (a.weighted || 0);
  });
  $('watchlist-count').textContent = thesesLabel(entries.length);
  const dueCount = entries.filter(e => isReviewDue(e, today)).length;
  const dueLine = $('watchlist-due');
  if (dueCount) {
    dueLine.textContent = dueCount + (dueCount === 1 ? ' thesis is' : ' theses are') +
      ' due for a re-check — re-read what you wrote and see what changed.';
    dueLine.classList.remove('hidden');
  } else {
    dueLine.textContent = '';
    dueLine.classList.add('hidden');
  }
  $('export-json').disabled = !entries.length;
  $('export-md').disabled = !entries.length;
  // KPI strip: journal-at-a-glance tiles computed from in-memory entries (visual only).
  const kpis = $('journal-kpis');
  kpis.innerHTML = '';
  if (entries.length) {
    kpis.hidden = false;
    const scored = entries.filter(e => typeof e.weighted === 'number');
    const avg = scored.length
      ? (scored.reduce((s, e) => s + e.weighted, 0) / scored.length).toFixed(1) + ' / 5'
      : '—';
    [['Theses tracked', String(entries.length)],
     ['Reviews due', String(dueCount)],
     ['Avg conviction', avg]].forEach(pair => {
      const card = document.createElement('div');
      card.className = 'kpi-card';
      const lab = document.createElement('div');
      lab.className = 'kpi-label';
      lab.textContent = pair[0];
      const val = document.createElement('div');
      val.className = 'kpi-value';
      val.textContent = pair[1];
      card.appendChild(lab);
      card.appendChild(val);
      kpis.appendChild(card);
    });
  } else {
    kpis.hidden = true;
  }
  if (!entries.length) {
    box.innerHTML = '<div class="empty">No theses yet. Write your first one above — start with a product you already love.</div>';
    return;
  }
  box.innerHTML = '';
  let armedDel = null, armedTimer = null;
  function disarm(btn) {
    if (!btn || !btn.isConnected) return;
    btn.dataset.armed = '';
    btn.textContent = 'Delete';
    btn.classList.remove('armed');
    btn.setAttribute('aria-label', btn.dataset.label || 'Delete');
  }
  entries.forEach(e => {
    const card = document.createElement('div');
    card.className = 'entry';
    const head = document.createElement('div');
    head.className = 'entry-head';
    const nm = document.createElement('span');
    nm.className = 'entry-name';
    nm.textContent = e.name;
    head.appendChild(nm);
    if (e.tickers) {
      const tk = document.createElement('span');
      tk.className = 'entry-tickers';
      tk.textContent = e.tickers;
      head.appendChild(tk);
    }
    const sc = document.createElement('span');
    sc.className = 'entry-score';
    sc.textContent = (e.weighted === null || e.weighted === undefined) ? 'unscored' : e.weighted.toFixed(1) + ' / 5';
    if (typeof e.weighted === 'number') {
      // Diverging conviction scale: 0-5 score mapped to 0-100 (score * 20).
      const pct = e.weighted * 20;
      sc.classList.add(pct < 40 ? 's-low' : pct < 70 ? 's-mid' : 's-high');
    }
    head.appendChild(sc);
    const due = isReviewDue(e, today);
    if (due) {
      const badge = document.createElement('span');
      badge.className = 'due-badge';
      badge.textContent = 'Review due';
      head.appendChild(badge);
      card.classList.add('due');
    }
    card.appendChild(head);
    if (e.tags && e.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'entry-tags';
      e.tags.forEach(t => {
        const s = document.createElement('span');
        s.className = 'tag';
        s.textContent = t;
        tags.appendChild(s);
      });
      card.appendChild(tags);
    }
    const th = document.createElement('p');
    th.className = 'entry-thesis';
    th.textContent = e.thesis;
    card.appendChild(th);
    if (e.falsify) {
      const f = document.createElement('p');
      f.className = 'entry-falsify';
      const strong = document.createElement('strong');
      strong.textContent = 'Would prove me wrong: ';
      f.appendChild(strong);
      f.appendChild(document.createTextNode(e.falsify));
      card.appendChild(f);
    }
    const meta = document.createElement('p');
    meta.className = 'fineprint';
    const scoredN = (typeof e.scored === 'number') ? e.scored : scoreCount(e.scores || {});
    meta.textContent = 'Written ' + e.createdAt + ' · review by ' + reviewAtOf(e) +
      ' · ' + scoredN + ' of 5 dimensions scored · saved in this browser only';
    card.appendChild(meta);
    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    const del = document.createElement('button');
    del.className = 'btn danger';
    del.textContent = 'Delete';
    del.dataset.label = 'Delete thesis: ' + e.name;
    del.setAttribute('aria-label', del.dataset.label);
    del.addEventListener('click', () => {
      if (del.dataset.armed === '1') {
        clearTimeout(armedTimer);
        armedDel = null;
        deleteEntry(e.id);
        return;
      }
      disarm(armedDel);
      clearTimeout(armedTimer);
      armedDel = del;
      del.dataset.armed = '1';
      del.textContent = 'Tap again to confirm delete';
      del.classList.add('armed');
      del.setAttribute('aria-label', 'Confirm deletion of thesis: ' + e.name);
      armedTimer = setTimeout(() => {
        disarm(del);
        if (armedDel === del) armedDel = null;
      }, 3000);
    });
    actions.appendChild(del);
    // Due theses get a "Mark reviewed" loop-closer: re-read the thesis, then
    // schedule the next check instead of leaving the badge on forever.
    if (due) {
      const sel = document.createElement('select');
      sel.className = 'review-again';
      sel.setAttribute('aria-label', 'Remind me to re-check again in');
      REVIEW_INTERVALS.forEach(n => {
        const o = document.createElement('option');
        o.value = String(n);
        o.textContent = n + (n === 1 ? ' month' : ' months');
        if (n === (e.reviewMonths || 6)) o.selected = true;
        sel.appendChild(o);
      });
      const mark = document.createElement('button');
      mark.className = 'btn';
      mark.textContent = 'Mark reviewed';
      mark.setAttribute('aria-label', 'Mark thesis reviewed and schedule the next re-check');
      mark.addEventListener('click', () => {
        const updated = rescheduleReview(e, sel.value, todayISO());
        store.entries = store.entries.map(x => x.id === e.id ? updated : x);
        saveStore(store);
        renderWatchlist();
      });
      actions.appendChild(sel);
      actions.appendChild(mark);
    }
    card.appendChild(actions);
    box.appendChild(card);
  });
}

/* ---------------- journal export ---------------- */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJSON() {
  const stamp = todayISO();
  downloadBlob(
    new Blob([journalToJSON(store.entries)], { type: 'application/json' }),
    'longterm-lens-journal-' + stamp + '.json'
  );
}

function exportMarkdown() {
  const stamp = todayISO();
  downloadBlob(
    new Blob([journalToMarkdown(store.entries, stamp)], { type: 'text/markdown' }),
    'longterm-lens-journal-' + stamp + '.md'
  );
}

/* ---------------- init ---------------- */
function init() {
  // Theme toggle (visual only): persisted light/dark choice, dark default.
  const THEME_KEY = 'ltl_theme';
  let theme = 'dark';
  try { theme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { /* storage blocked */ }
  if (theme !== 'light' && theme !== 'dark') theme = 'dark';
  document.documentElement.dataset.theme = theme;
  $('theme-toggle').addEventListener('click', () => {
    theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage blocked */ }
  });
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.addEventListener('click', () => showScreen(b.dataset.nav)));
  document.querySelectorAll('[data-goto]').forEach(b =>
    b.addEventListener('click', () => showScreen(b.dataset.goto)));
  renderQuiz();
  renderGlossary();
  $('glossary-search').addEventListener('input', applyGlossaryFilter);
  renderScoreButtons();
  updateWeightedPreview();
  renderWatchlist();
  $('j-save').addEventListener('click', saveEntry);
  $('j-clear').addEventListener('click', clearJournalForm);
  $('export-json').addEventListener('click', exportJSON);
  $('export-md').addEventListener('click', exportMarkdown);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose pure logic for the Node smoke test (browsers ignore this).
if (typeof globalThis !== 'undefined') {
  globalThis.LongTermLens = { QUIZ, BANDS, scoreRisk, GLOSSARY, filterGlossaryTerms, weightedScore, scoreCount, thesesLabel, SCORE_WEIGHTS, esc,
    addMonths, todayISO, reviewAtOf, isReviewDue, rescheduleReview, journalToJSON, journalToMarkdown, reloadJournal };
}

})();
