
(function () {
'use strict';

const APP_VERSION = '2.1.0';

function updateReloadURL(pathname, v, hash) {
  return pathname + '?v=' + encodeURIComponent(v) + (hash || '');
}

function isNewerVersion(latest, current) {
  const pa = String(latest).trim().split('.').map(Number);
  const pb = String(current).trim().split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const a = pa[i] || 0, b = pb[i] || 0;
    if (a !== b) return a > b;
  }
  return false;
}

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
  let total = 0;
  answers.forEach((optIdx, qi) => {
    const opt = QUIZ[qi] && QUIZ[qi].options[optIdx];
    if (opt) total += opt.s;
  });
  const band = BANDS.find(b => total >= b.min) || BANDS[BANDS.length - 1];
  return { total, max: QUIZ.length * 3, band };
}

const GLOSSARY = [
  { abbr: 'P/E', name: 'Price-to-Earnings ratio',
    what: 'Share price divided by earnings per share. Roughly: how many dollars investors pay for each dollar of yearly profit.',
    healthy: 'Varies wildly by industry and growth — fast growers often carry higher P/E. Compare against the company\'s own history and close competitors, not an absolute number.',
    flag: 'Extremely high P/E with slowing growth, or a "cheap" P/E that keeps getting cheaper as earnings fall (a value trap).',
    quiz: [
      { q: 'A stock has a P/E of 25. What does that mean?',
        options: ['Investors pay about $25 for each $1 of yearly earnings', 'The company earns $25 per share of cash', 'The price will rise 25% this year', 'The company pays $25 in dividends'],
        a: 0, why: 'P/E is price per share divided by earnings per share — dollars paid per dollar of profit.' },
      { q: 'Why might a fast-growing company have a higher P/E than a slow-growing one?',
        options: ['Higher P/E is always a red flag', 'Investors expect future earnings to grow faster', 'Fast growers always have more debt', 'The math is different for growing companies'],
        a: 1, why: 'Investors pay up for growth they believe will arrive — the question is whether the growth actually shows up.' },
      { q: 'Which is the classic P/E red flag?',
        options: ['P/E in line with competitors', 'Extremely high P/E while growth is slowing', 'P/E that rises with earnings', 'A P/E below the industry average'],
        a: 1, why: 'Paying a growth multiple for shrinking growth is how investors get stuck in value traps or hype cycles.' },
    ] },
  { abbr: 'PEG', name: 'Price/Earnings-to-Growth ratio',
    what: 'P/E divided by expected earnings growth rate. It asks whether you\'re paying a fair price for the growth you get.',
    healthy: 'Often cited around 1 as "fair value for growth", but estimates are guesses — treat it as a sanity check, not a verdict.',
    flag: 'PEG far above peers with no credible reason the growth will accelerate.',
    quiz: [
      { q: 'The PEG ratio divides P/E by…',
        options: ['expected earnings growth rate', 'the dividend yield', 'total debt', 'last year\'s revenue'],
        a: 0, why: 'PEG normalizes the P/E multiple against how fast earnings are expected to grow.' },
      { q: 'A PEG far above 1 with no special growth story suggests…',
        options: ['a bargain', 'the price is expensive for the growth offered', 'the company is about to split its stock', 'analysts love the company'],
        a: 1, why: 'Around 1 is often cited as "fair value for growth" — far above that, you\'d better have a reason.' },
      { q: 'What is the biggest weakness of the PEG ratio?',
        options: ['It ignores the share price', 'The growth estimate is a guess', 'It only works for banks', 'It changes every day'],
        a: 1, why: 'PEG divides by *expected* growth — if the forecast is wrong, the ratio is wrong. Sanity check, not verdict.' },
    ] },
  { abbr: 'P/S', name: 'Price-to-Sales ratio',
    what: 'Market value divided by revenue. Useful for young companies that aren\'t profitable yet — there are no earnings to measure.',
    healthy: 'Lower generally means cheaper per dollar of sales, but unprofitable companies deserve extra skepticism about when profits arrive.',
    flag: 'High P/S combined with shrinking or flat revenue — paying growth prices for no growth.',
    quiz: [
      { q: 'P/S is most useful for which kind of company?',
        options: ['Young companies that aren\'t profitable yet', 'Banks', 'Companies about to be acquired', 'Only dividend payers'],
        a: 0, why: 'With no earnings to measure, revenue is the best yardstick — price divided by sales.' },
      { q: 'High P/S plus flat revenue means…',
        options: ['a safe value play', 'paying growth prices for no growth', 'the company will definitely grow', 'analysts made an error'],
        a: 1, why: 'A high multiple only makes sense if the sales are actually expanding.' },
      { q: 'Why shouldn\'t you always prefer the lowest P/S?',
        options: ['Low P/S stocks never go up', 'The company may never become profitable', 'P/S ignores revenue entirely', 'It\'s too simple a metric'],
        a: 1, why: 'Cheap sales are only a bargain if profits eventually arrive — unprofitable companies deserve extra skepticism.' },
    ] },
  { abbr: 'FCF', name: 'Free Cash Flow',
    what: 'Cash left over after a company pays for operations and equipment. The money it could use to pay down debt, buy back shares, or pay dividends.',
    healthy: 'Consistently positive and growing FCF is one of the strongest signs of a healthy business.',
    flag: 'Years of negative FCF funded by constantly issuing new shares or piling on debt.',
    quiz: [
      { q: 'Free cash flow is…',
        options: ['total revenue', 'cash left after operations and equipment spending', 'the dividend payment', 'money borrowed from banks'],
        a: 1, why: 'It\'s the cash a company could actually hand to owners — after keeping the business running.' },
      { q: 'Why is consistently growing FCF one of the strongest health signs?',
        options: ['It guarantees the stock rises', 'It\'s real money available for dividends, buybacks, or debt payoff', 'Accountants can\'t touch it', 'It replaces the need for revenue'],
        a: 1, why: 'Unlike accounting profit, FCF is cash you can verify — and spend.' },
      { q: 'Which FCF pattern is a red flag?',
        options: ['FCF growing steadily', 'Years of negative FCF funded by issuing new shares', 'FCF dipping one quarter', 'FCF larger than revenue'],
        a: 1, why: 'Constantly selling new shares to cover negative cash flow dilutes existing owners.' },
    ] },
  { abbr: 'Rev growth', name: 'Revenue growth',
    what: 'How fast sales are increasing year over year. The top line — everything else starts here.',
    healthy: 'Steady growth over 3–5 years beats one spectacular year. For mature companies, even single-digit consistent growth compounds beautifully.',
    flag: 'Growth driven by acquisitions that never quite pay off, or a sudden cliff with no explanation in the filings.',
    quiz: [
      { q: 'Which revenue pattern is generally healthier?',
        options: ['One spectacular year then flat', 'Steady growth over 3–5 years', 'Growth that spikes every other quarter', 'Declining revenue with cost cuts'],
        a: 1, why: 'Compounding rewards consistency — a single spike often doesn\'t repeat.' },
      { q: 'Why is one spectacular growth year less convincing?',
        options: ['Investors dislike excitement', 'It may be a one-off that never repeats', 'Growth only counts in dollars', 'Spectacular years are always fraud'],
        a: 1, why: 'Durability is what matters for a decade-long hold — one year proves little.' },
      { q: 'Which revenue-growth story deserves skepticism?',
        options: ['Growth from selling more of the core product', 'Growth driven by acquisitions that never pay off', 'Growth in a growing industry', 'Slow but steady growth'],
        a: 1, why: 'Acquisition-fueled growth can mask a shrinking core business — check the filings for what\'s organic.' },
    ] },
  { abbr: 'Gross margin', name: 'Gross margin',
    what: 'Revenue minus cost of goods sold, as a percentage. Measures pricing power before overhead.',
    healthy: 'Stable or rising margins suggest customers value the product. Software-like margins (70%+) and retail margins (20–30%) are both fine — in their own industries.',
    flag: 'Margins compressing year after year while competitors hold steady.',
    quiz: [
      { q: 'Gross margin measures…',
        options: ['total company profit', 'pricing power after the cost of goods sold', 'how much debt a company has', 'employee satisfaction'],
        a: 1, why: 'Revenue minus what it cost to make the stuff — before overhead, interest, and taxes.' },
      { q: 'Why compare margins within an industry?',
        options: ['Margins are identical everywhere', 'Normal margins differ by industry — software and retail play different games', 'Regulators require it', 'It makes the numbers bigger'],
        a: 1, why: 'A 25% margin is excellent for a grocer and terrible for software. Context is everything.' },
      { q: 'Which margin trend is a red flag?',
        options: ['Margins stable for years', 'Margins compressing while competitors hold steady', 'Margins rising slowly', 'Margins matching the industry'],
        a: 1, why: 'If rivals keep their pricing power and you can\'t, your edge may be fading.' },
    ] },
  { abbr: 'Op margin', name: 'Operating margin',
    what: 'Profit after operating expenses (but before interest and taxes), as a percentage of revenue. Shows whether the business model itself works.',
    healthy: 'Positive and ideally expanding as the company scales — costs should grow slower than revenue.',
    flag: 'Revenue growing but operating margin stuck near zero: the company may be buying growth at any cost.',
    quiz: [
      { q: 'Operating margin tells you…',
        options: ['how much tax the company pays', 'whether the business model itself works, after operating expenses', 'the CEO\'s salary', 'how many shares exist'],
        a: 1, why: 'It\'s profit from the actual business operations, before financing and taxes muddy the picture.' },
      { q: 'Revenue is growing but operating margin stays near zero. What might that mean?',
        options: ['The company is buying growth at any cost', 'The company is definitely profitable', 'Margins don\'t matter', 'Revenue is fake'],
        a: 0, why: 'Selling more while keeping none of it suggests the growth isn\'t sustainable — or isn\'t real leverage.' },
      { q: 'What\'s a healthy operating-margin pattern?',
        options: ['Always above 50%', 'Positive and expanding as the company scales', 'Exactly equal to revenue growth', 'Negative but improving slightly'],
        a: 1, why: 'As a company scales, costs should grow slower than revenue — margins widening is the signature of leverage.' },
    ] },
  { abbr: 'ROE', name: 'Return on Equity',
    what: 'Net income divided by shareholder equity. How efficiently the company turns its owners\' money into profit.',
    healthy: 'Consistently double-digit ROE often signals a strong business — but check it isn\'t juiced by heavy debt (which shrinks equity).',
    flag: 'High ROE paired with high debt-to-equity: the "efficiency" is borrowed, not earned.',
    quiz: [
      { q: 'ROE is net income divided by…',
        options: ['total revenue', 'shareholder equity', 'number of employees', 'market cap'],
        a: 1, why: 'How much profit per dollar of the owners\' money invested in the business.' },
      { q: 'Why be careful with a very high ROE?',
        options: ['High ROE is always fraud', 'Heavy debt shrinks equity and inflates ROE', 'ROE can\'t exceed 10%', 'Equity is irrelevant'],
        a: 1, why: 'Borrowing heavily shrinks the denominator — the "efficiency" is borrowed, not earned.' },
      { q: 'Consistently double-digit ROE (with low debt) often signals…',
        options: ['an accounting error', 'a strong business earning good returns on capital', 'a coming dividend cut', 'management overpay'],
        a: 1, why: 'Sustained high returns on equity are one of the classic markers of a quality company.' },
    ] },
  { abbr: 'D/E', name: 'Debt-to-Equity ratio',
    what: 'Total debt divided by shareholder equity. How much of the company is funded by borrowing.',
    healthy: 'Low relative to industry peers gives a company room to survive recessions. Some industries (utilities) naturally carry more.',
    flag: 'Rising debt while cash flow falls, or interest payments eating a large share of operating income.',
    quiz: [
      { q: 'Debt-to-equity measures…',
        options: ['how much is funded by borrowing versus owners\' money', 'the interest rate on loans', 'total company value', 'dividend safety'],
        a: 0, why: 'Total debt divided by shareholder equity — the balance between borrowed and owned funding.' },
      { q: 'Low D/E relative to industry peers means…',
        options: ['the company can\'t borrow', 'room to survive downturns', 'the stock is cheap', 'management is lazy'],
        a: 1, why: 'Less debt means fewer mandatory payments when revenue drops — survival room.' },
      { q: 'Which debt pattern is a red flag?',
        options: ['Debt falling as cash flow rises', 'Rising debt while cash flow falls', 'No debt at all', 'Debt stable for a decade'],
        a: 1, why: 'Borrowing more while generating less cash is how balance sheets break — check interest coverage too.' },
    ] },
  { abbr: 'Moat', name: 'Economic moat',
    what: 'Warren Buffett\'s term for a durable competitive advantage: network effects, high switching costs, brand, cost advantages, patents, or regulation.',
    healthy: 'A real moat shows up as sustained high margins and returns over many years, not just in marketing slides.',
    flag: 'Management claims a moat, but margins and market share have been eroding for years.',
    quiz: [
      { q: 'An economic moat is…',
        options: ['a type of debt', 'a durable competitive advantage — network effects, switching costs, brand, scale, patents', 'a cash reserve', 'a government subsidy'],
        a: 1, why: 'Buffett\'s term for what keeps competitors from copying a good business.' },
      { q: 'How does a real moat show up in the numbers?',
        options: ['Sustained high margins and returns over many years', 'One great quarter', 'A high stock price', 'Lots of press coverage'],
        a: 0, why: 'Pricing power that lasts shows up as durable profitability — not in marketing slides.' },
      { q: 'Management claims a moat, but margins and market share have eroded for years. That means…',
        options: ['the moat is getting stronger', 'the claimed moat may not be real — trust the numbers', 'margins don\'t matter', 'it\'s a buying opportunity'],
        a: 1, why: 'A moat is a claim about durability; eroding economics is evidence against it.' },
    ] },
  { abbr: 'Value', name: 'Estimating value: three lenses',
    what: 'A stock price is a claim on future cash. Investors estimate what that claim is worth with three lenses: (1) discounted cash flow — project future cash and discount it back to today; (2) comparables — what multiples do similar businesses trade at; (3) reverse-engineering — what growth is already priced in at today\'s price.',
    healthy: 'Using at least two lenses and writing down the assumptions that would have to be true. Valuation is a range, not a number.',
    flag: 'False precision — one method, one exact price target. Or skipping valuation entirely because "the story is great."',
    quiz: [
      { q: 'Discounted cash flow (DCF) means…',
        options: ['Projecting future cash and discounting it to today', 'Adding up last year\'s revenue', 'Dividing price by earnings', 'Copying an analyst\'s price target'],
        a: 0, why: 'DCF values the cash a business will produce, adjusted for the time value of money.' },
      { q: '"Reverse-engineering" a stock price asks…',
        options: ['Who the CEO is', 'What the price was last year', 'What growth is already priced in at this price', 'How many shares exist'],
        a: 2, why: 'Instead of predicting price, ask what the market already assumes — then judge whether that assumption is reasonable.' },
      { q: 'Why do investors say valuation is a range, not a number?',
        options: ['Stock prices are random', 'Every input is an estimate, so precision is false', 'Math doesn\'t apply to stocks', 'Ranges are easier to remember'],
        a: 1, why: 'Growth, margins, discount rates — all guesses. A range respects the uncertainty; a single target hides it.' },
    ] },
  { abbr: 'Trend', name: 'Reading a trend before the companies exist',
    what: 'Trends arrive before tickers. To judge one, ask: who pays whom for what (the mechanism), how big could the spending become, what could kill it, and who captures the value — the inventor, the platform, or the supplier?',
    healthy: 'Writing the mechanism in one sentence before naming any company. Re-reading your Trends & misses log for rhymes with past waves.',
    flag: 'Confusing attention with revenue — a technology everyone talks about and nobody pays for. Or assuming the inventor automatically wins.',
    quiz: [
      { q: 'Before naming any company, a trend investor should first…',
        options: ['Buy the most talked-about stock', 'Wait for a hot IPO', 'Check social media sentiment', 'Write the mechanism: who pays whom for what'],
        a: 3, why: 'If you can\'t say who pays whom for what, you don\'t understand the trend yet — only the hype.' },
      { q: 'Why might the inventor of a technology not capture its value?',
        options: ['Inventors never make money', 'Platforms, distributors, or suppliers can take the profits', 'Patents always fail', 'New technology is always free'],
        a: 1, why: 'Value flows to bottlenecks and distribution — often not the original inventor.' },
      { q: 'Your Trends & misses log is most useful when you…',
        options: ['Delete old misses', 'Only log wins', 'Re-read it for patterns before the next wave', 'Share it publicly'],
        a: 2, why: 'Misses become a pattern library only if you revisit them — that\'s what the log is for.' },
    ] },
  { abbr: 'Case', name: 'Case study: an incumbent stumbles (illustration)',
    what: 'Illustration only — the past is not a prediction. In the mid-2010s, Intel, the dominant CPU maker, repeatedly delayed its next manufacturing process while AMD bet on a new chip architecture (Zen). When Zen delivered competitive performance, AMD regained share in PCs and data centers over several years.',
    healthy: 'Asking "what was knowable at the time?" — the pattern was an incumbent stumble plus a credible alternative, not a guaranteed outcome.',
    flag: 'Reading this as "I should have bought AMD" — hindsight makes every past winner look obvious. The lesson is the pattern, not the pick.',
    quiz: [
      { q: 'This case study is labeled "illustration" because…',
        options: ['The events didn\'t really happen', 'Past patterns inform thinking but never predict outcomes', 'Illustrations are legally required', 'It\'s about art'],
        a: 1, why: 'History rhymes; it doesn\'t repeat. The value is pattern recognition, not a script.' },
      { q: 'What was the core pattern in the AMD illustration?',
        options: ['A CEO gave great interviews', 'The stock had a catchy ticker', 'An incumbent stumbled while a credible alternative emerged', 'Analysts all agreed'],
        a: 2, why: 'The knowable pattern was Intel\'s delays plus AMD\'s Zen delivering — the outcome was still uncertain for years.' },
      { q: 'The wrong takeaway from a case study is…',
        options: ['Studying what was knowable at the time', 'Looking for similar patterns today', 'Writing down the lesson', '"I should have bought X" — hindsight certainty'],
        a: 3, why: 'Hindsight turns every winner obvious. Ask what was knowable then, not what\'s obvious now.' },
    ] },];

function filterGlossaryTerms(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return GLOSSARY.slice();
  return GLOSSARY.filter(g =>
    (g.abbr + ' ' + g.name + ' ' + g.what + ' ' + g.healthy + ' ' + g.flag)
      .toLowerCase().includes(q));
}

const CHECKLIST_ITEMS = [
  { key: 'moat', label: 'Does it have a durable edge?',
    help: 'Something competitors can\'t easily copy — network effects, switching costs, brand, scale, or patents.' },
  { key: 'earnings', label: 'Is it actually profitable — or credibly on the way?',
    help: 'Check operating margin and free cash flow over several years, not just headlines.' },
  { key: 'debt', label: 'Is debt at a safe level?',
    help: 'Debt-to-equity that\'s low for its industry means survival room in downturns.' },
  { key: 'valuation', label: 'Is the price sane compared to its worth?',
    help: 'A great company at an extreme valuation can still be a poor decade-long hold.' },
  { key: 'circle', label: 'Is this inside my circle of competence?',
    help: 'Do I genuinely understand how this business makes money? If not, I can\'t judge the risks.' },
];


const SCORE_DIMS = ['quality', 'value', 'conviction'];
const SCORE_DIM_LABELS = {
  quality: 'Quality — how good is the business?',
  value: 'Value — is the price sane for what you get?',
  conviction: 'Conviction — how well do I understand it?',
};
const SCORE_DIM_HINTS = {
  quality: '1 = shaky, 5 = excellent business',
  value: '1 = far too expensive, 5 = comfortable price',
  conviction: '1 = surface-level, 5 = deep understanding',
};
const DEFAULT_WEIGHTS = { quality: 1, value: 1, conviction: 1 };

function normalizeWeights(weights) {
  let total = 0;
  SCORE_DIMS.forEach(d => {
    const v = Number(weights && weights[d]);
    total += (isFinite(v) && v > 0) ? v : 0;
  });
  if (total <= 0) return null;
  const out = {};
  SCORE_DIMS.forEach(d => {
    const v = Number(weights && weights[d]);
    out[d] = ((isFinite(v) && v > 0) ? v : 0) / total;
  });
  return out;
}

function convictionOf(idea) {
  if (!idea) return null;
  if (typeof idea.conviction === 'number' && idea.conviction >= 1 && idea.conviction <= 5) return idea.conviction;
  const legacy = compositeScore(idea);
  if (legacy === null) return null;
  return Math.max(1, Math.min(5, Math.ceil(legacy / 20)));
}

function convictionDots(n) {
  if (n === null || n === undefined) return 'Unscored';
  return '●'.repeat(n) + '○'.repeat(5 - n);
}

function compositeScore(idea) {
  if (!idea) return null;
  const shares = normalizeWeights(idea.weights);
  if (!shares) return null;
  let total = 0, wSum = 0;
  SCORE_DIMS.forEach(d => {
    const v = idea.scores && idea.scores[d];
    if (typeof v === 'number' && v >= 1 && v <= 5) {
      total += (v / 5) * shares[d];
      wSum += shares[d];
    }
  });
  if (wSum === 0) return null;
  return Math.round((total / wSum) * 100);
}

function scoreBand(score) {
  if (score === null || score === undefined) return 'Unscored';
  if (score >= 75) return 'Strong signal';
  if (score >= 55) return 'Moderate signal';
  if (score >= 40) return 'Weak signal';
  return 'Early days';
}

function buildAnalyzePrompt(idea) {
  const notYet = '(not written yet)';
  const name = (idea && idea.name) || 'Unnamed idea';
  const tickers = (idea && idea.tickers) ? idea.tickers : 'no ticker';
  const th = (idea && idea.thesis) || {};
  const belief = th.belief || notYet;
  const falsify = th.falsify || notYet;
  const conv = convictionOf(idea);
  const reviewBy = (idea && idea.reviewAt) || '(none set)';

  return [
    "I'm researching a long-term (10+ year) investment idea. This is educational analysis only \u2014 never tell me whether to buy or sell.",
    '',
    'IDEA: ' + name + ' (' + tickers + ')',
    '',
    'MY THESIS: ' + belief,
    'WHAT WOULD PROVE ME WRONG: ' + falsify,
    'MY CONVICTION: ' + (conv === null ? 'unscored' : conv + ' / 5'),
    'REVIEW BY: ' + reviewBy,
    '',
    'Please do a full workup:',
    '1. Metrics check \u2014 for the ticker above, report the key long-term metrics (P/E or forward P/E, 3-5y revenue growth, operating margin, free cash flow, debt-to-equity, dividend yield if any). Cite the source and date of each number.',
    '2. Bull case \u2014 the 2-3 strongest arguments FOR a decade-long hold, mapped to my thesis where they overlap.',
    '3. Bear case \u2014 the strongest arguments AGAINST, especially any evidence that would trigger my stated kill criteria.',
    '4. Red flags \u2014 accounting, governance, or business-model concerns I should investigate before deciding anything.',
    '5. Similar companies \u2014 3-5 public companies in the same broad category I could research as alternatives or comparisons, with one line each on why they are comparable.',
    '',
    'Format: headers with short bullets. Analytical, no hype.',
  ].join('\n');
}
function thesesLabel(n) {
  if (!n) return '';
  return '(' + n + (n === 1 ? ' thesis)' : ' theses)');
}

function ideasLabel(n) {
  if (!n) return '';
  return '(' + n + (n === 1 ? ' idea)' : ' ideas)');
}

function addMonths(dateStr, n) {
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

const REVIEW_INTERVALS = [1, 3, 6, 12];

function rescheduleReview(idea, months, today) {
  const m = parseInt(months, 10);
  const n = REVIEW_INTERVALS.includes(m) ? m : 3;
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : todayISO();
  return Object.assign({}, idea, { reviewMonths: n, reviewAt: addMonths(t, n) });
}

const DEFAULT_REVIEW_MONTHS = 3;

function reviewAtOf(idea) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(idea.reviewAt || '')) return idea.reviewAt;
  const fallback = addMonths(idea.createdAt, idea.reviewMonths === 6 ? 6 : DEFAULT_REVIEW_MONTHS);
  return fallback;
}

function isReviewDue(idea, today) {
  today = today || todayISO();
  const r = reviewAtOf(idea);
  return !!r && r <= today;
}

function setReviewAt(idea, dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
  return Object.assign({}, idea, { reviewAt: dateStr });
}

function makeIdea(name, tickers, today) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : todayISO();
  return {
    id: 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    name: name || '',
    tickers: (tickers || '').toUpperCase(),
    tags: [],
    status: 'open',
    createdAt: t,
    updatedAt: t,
    thesis: { belief: '', falsify: '' },
    conviction: null,
    reviewMonths: DEFAULT_REVIEW_MONTHS,
    reviewAt: addMonths(t, DEFAULT_REVIEW_MONTHS),
    reviewHistory: [],
    priceLog: [],
    notes: [],
  };
}

const TREND_STATUSES = ['watching', 'missed', 'chased'];
const TREND_STATUS_LABELS = { watching: 'Watching', missed: 'Missed', chased: 'Became an idea' };

function makeTrend(name, why, today) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : todayISO();
  return {
    id: 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    name: (name || '').slice(0, 80),
    why: (why || '').slice(0, 1000),
    createdAt: t,
    updatedAt: t,
    status: 'watching',
    lesson: '',
    ideaId: null,
  };
}

function normalizeTrend(raw) {
  const trend = Object.assign({
    name: '', why: '', status: 'watching', lesson: '', ideaId: null,
  }, raw || {});
  if (!TREND_STATUSES.includes(trend.status)) trend.status = 'watching';
  if (typeof trend.name !== 'string') trend.name = '';
  if (typeof trend.why !== 'string') trend.why = '';
  if (typeof trend.lesson !== 'string') trend.lesson = '';
  if (typeof trend.ideaId !== 'string') trend.ideaId = null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trend.createdAt || '')) trend.createdAt = todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trend.updatedAt || '')) trend.updatedAt = trend.createdAt;
  if (typeof trend.id !== 'string' || !trend.id) {
    trend.id = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }
  return trend;
}

function markTrendMissed(trend, today) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : todayISO();
  return Object.assign({}, trend, { status: 'missed', updatedAt: t });
}

function setTrendLesson(trend, lesson) {
  return Object.assign({}, trend, {
    lesson: (lesson || '').slice(0, 1000),
    updatedAt: todayISO(),
  });
}

function trendToIdea(trend, today) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : todayISO();
  const idea = makeIdea(trend.name || 'Untitled idea', '', t);
  const why = (trend.why || '').trim();
  idea.thesis = {
    belief: why ? 'Spotted ' + trend.createdAt + ': ' + why : '',
    reasons: '',
    falsify: '',
  };
  idea.trendId = trend.id;
  const nextTrend = Object.assign({}, trend, { status: 'chased', ideaId: idea.id, updatedAt: t });
  return { idea, trend: nextTrend };
}

function applyReview(idea, review, today) {
  const t = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : todayISO();
  const outcome = ['intact', 'changed', 'resolved'].includes(review.outcome) ? review.outcome : 'intact';
  const reasonMatch = ['yes', 'no', 'na'].includes(review.reasonMatch) ? review.reasonMatch : 'na';
  const entry = {
    date: t,
    outcome,
    reasonMatch,
    note: (review.note || '').slice(0, 1000),
  };
  const next = Object.assign({}, idea, {
    reviewHistory: (idea.reviewHistory || []).concat([entry]),
    updatedAt: t,
  });
  if (outcome === 'resolved') next.status = 'resolved';
  const months = parseInt(review.nextMonths, 10);
  return rescheduleReview(next, months, t);
}

function trackRecord(ideas) {
  const out = { intact: 0, changed: 0, resolved: 0, reviews: 0, reasonYes: 0, reasonAnswered: 0 };
  (ideas || []).forEach(idea => {
    (idea.reviewHistory || []).forEach(r => {
      out.reviews++;
      if (out[r.outcome] !== undefined) out[r.outcome]++;
      if (r.reasonMatch === 'yes' || r.reasonMatch === 'no') {
        out.reasonAnswered++;
        if (r.reasonMatch === 'yes') out.reasonYes++;
      }
    });
  });
  out.reasonAccuracy = out.reasonAnswered ? Math.round((out.reasonYes / out.reasonAnswered) * 100) : null;
  return out;
}

function journalToJSON(ideas) {
  return JSON.stringify(ideas, null, 2);
}

function journalToMarkdown(ideas, stamp, trends) {
  const lines = [
    '# Long-Term Lens — Research Ideas',
    '',
    'Exported ' + stamp + '. Personal research notes — educational only, not financial advice.',
    ''
  ];
  if (!ideas.length) {
    lines.push('_No ideas yet._', '');
  }
  ideas.forEach(e => {
    const conv = convictionOf(e);
    lines.push('## ' + e.name + (e.tickers ? ' (' + e.tickers + ')' : ''));
    lines.push('');
    lines.push('- Conviction: ' + (conv === null ? 'unscored' : conv + ' / 5'));
    lines.push('- Status: ' + (e.status || 'open') + ' · Written: ' + e.createdAt + ' · Review by: ' + reviewAtOf(e));
    if (e.tags && e.tags.length) lines.push('- Tags: ' + e.tags.join(', '));
    lines.push('');
    if (e.thesis && (e.thesis.belief || e.thesis.falsify)) {
      lines.push('What I believe: ' + (e.thesis.belief || ''));
      lines.push('');
      if (e.thesis.falsify) { lines.push('Would prove me wrong: ' + e.thesis.falsify); lines.push(''); }
    }
    if (e.assumptions && e.assumptions.length) {
      lines.push('Key assumptions:');
      e.assumptions.forEach(a => lines.push('  - ' + a.text + ' (' + a.confidence + '% confident)'));
      lines.push('');
    }
    if (e.priceLog && e.priceLog.length) {
      lines.push('Price log (manually entered):');
      e.priceLog.forEach(p => lines.push('  - ' + p.date + ': ' + p.price + (p.note ? ' — ' + p.note : '')));
      lines.push('');
    }
    if (e.notes && e.notes.length) {
      lines.push('Notes:');
      e.notes.forEach(n => lines.push('  - ' + n.date + ': ' + n.text));
      lines.push('');
    }
    lines.push('---', '');
  });
  (trends || []).forEach(t => {
    lines.push('## Trend: ' + (t.name || 'Untitled') + ' (' + (TREND_STATUS_LABELS[t.status] || t.status) + ')');
    lines.push('');
    lines.push('- Spotted: ' + (t.createdAt || '—'));
    if (t.why) { lines.push('- Why it could matter: ' + t.why); }
    if (t.lesson) { lines.push('- Lesson from the miss: ' + t.lesson); }
    lines.push('');
    lines.push('---', '');
  });
  return lines.join('\n');
}

const STORE_KEY = 'longterm-stock-lens-v1';
const SCHEMA_VERSION = 3;

function migrateV2ToV3(parsed) {
  const upgraded = blankStore();
  upgraded.ideas = (parsed.ideas || []).map(normalizeIdea);
  upgraded.glossary = parsed.glossary || {};
  upgraded.quizProfile = parsed.quizProfile || null;
  return upgraded;
}

function blankStore() {
  return { schema: SCHEMA_VERSION, ideas: [], trends: [], glossary: {}, quizProfile: null };
}

function migrateStore(raw) {
  const store = blankStore();
  let entries = [];
  if (raw && Array.isArray(raw.entries)) entries = raw.entries;
  else if (raw && Array.isArray(raw.ideas)) {
    store.ideas = raw.ideas.map(normalizeIdea);
    store.glossary = raw.glossary || {};
    store.quizProfile = raw.quizProfile || null;
    return store;
  } else {
    return store;
  }
  store.ideas = entries.map(e => {
    const t = /^\d{4}-\d{2}-\d{2}$/.test(e.createdAt || '') ? e.createdAt : todayISO();
    const oldScores = e.scores || {};
    const num = v => (typeof v === 'number' && v >= 1 && v <= 5) ? v : null;

    const allDims = [num(oldScores.product), num(oldScores.fundamentals), num(oldScores.moat),
      num(oldScores.valuation), num(oldScores.horizon)].filter(v => v !== null);
    const conviction = allDims.length
      ? Math.round(allDims.reduce((s, v) => s + v, 0) / allDims.length)
      : null;
    const idea = makeIdea(e.name || 'Untitled idea', e.tickers || '', t);
    idea.tags = Array.isArray(e.tags) ? e.tags : [];
    idea.thesis = {
      belief: e.thesis || '',
      falsify: e.falsify || '',
    };
    idea.conviction = conviction;
    idea.legacyScores = {
      product: num(oldScores.product),
      fundamentals: num(oldScores.fundamentals),
      moat: num(oldScores.moat),
      valuation: num(oldScores.valuation),
      horizon: num(oldScores.horizon),
    };
    if (/^\d{4}-\d{2}-\d{2}$/.test(e.reviewAt || '')) {
      idea.reviewAt = e.reviewAt;
      idea.reviewMonths = [1, 3, 6, 12].includes(e.reviewMonths) ? e.reviewMonths : 6;
    } else {
      idea.reviewAt = addMonths(t, 6);
      idea.reviewMonths = 6;
    }
    idea.status = 'open';
    return idea;
  });
  return store;
}

function normalizeIdea(rawIdea) {
  const idea = Object.assign({
    tags: [], status: 'open', trendId: null,
    thesis: {}, conviction: null,
    reviewMonths: DEFAULT_REVIEW_MONTHS,
    reviewHistory: [],
  }, rawIdea || {});
  idea.thesis = Object.assign({ belief: '', falsify: '' }, idea.thesis);
  if (!(typeof idea.conviction === 'number' && idea.conviction >= 1 && idea.conviction <= 5)) idea.conviction = null;
  if (!Array.isArray(idea.tags)) idea.tags = [];
  if (!Array.isArray(idea.reviewHistory)) idea.reviewHistory = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(idea.createdAt || '')) idea.createdAt = todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(idea.reviewAt || '')) idea.reviewAt = reviewAtOf(idea);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(idea.updatedAt || '')) idea.updatedAt = idea.createdAt;
  return idea;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blankStore();
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schema === SCHEMA_VERSION && Array.isArray(parsed.ideas)) {
      parsed.ideas = parsed.ideas.map(normalizeIdea);
      parsed.trends = Array.isArray(parsed.trends) ? parsed.trends.map(normalizeTrend) : [];
      parsed.glossary = parsed.glossary || {};
      return parsed;
    }
    if (parsed && parsed.schema === 2 && Array.isArray(parsed.ideas)) {
      const upgraded = migrateV2ToV3(parsed);
      saveStore(upgraded);
      return upgraded;
    }

    const migrated = migrateStore(parsed);
    saveStore(migrated);
    return migrated;
  } catch (e) { return blankStore(); }
}
function saveStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function $(id) { return document.getElementById(id); }
// Rich empty state: acknowledge the zero + explain what appears + one clear action.
function emptyState({ title, body, actionId, actionLabel }) {
  const d = document.createElement('div');
  d.className = 'empty rich';
  const t = document.createElement('div');
  t.className = 'empty-title';
  t.textContent = title;
  const b = document.createElement('div');
  b.className = 'empty-body';
  b.textContent = body;
  d.appendChild(t); d.appendChild(b);
  if (actionId && actionLabel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn empty-action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => { const f = $(actionId); if (f) f.focus(); });
    d.appendChild(btn);
  }
  return d;
}
function uid() {
  return 'x' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = $('screen-' + name);
  if (el) {
    el.classList.remove('hidden');

    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === name));

  const SECONDARY = ['reviews', 'track', 'trends', 'profile', 'learn', 'accounts'];
  document.querySelectorAll('details.nav-more').forEach(d => {
    d.classList.toggle('active', SECONDARY.indexOf(name) !== -1);
    d.removeAttribute('open');
  });
  window.scrollTo(0, 0);
}

let store = loadStore();

function getIdea(id) {
  return (store.ideas || []).find(i => i.id === id) || null;
}

function updateIdea(id, fn) {
  store.ideas = (store.ideas || []).map(i => {
    if (i.id !== id) return i;
    const next = fn(i) || i;
    next.updatedAt = todayISO();
    return next;
  });
  saveStore(store);
}

function openIdeas(today) {
  return (store.ideas || []).filter(i => i.status !== 'resolved');
}

function dueIdeas(today) {
  today = today || todayISO();
  return openIdeas(today).filter(i => isReviewDue(i, today))
    .sort((a, b) => (reviewAtOf(a) || '').localeCompare(reviewAtOf(b) || ''));
}

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

  if (store.quizProfile) {
    const saved = document.createElement('p');
    saved.className = 'fineprint quiz-saved';
    saved.textContent = 'Last result (' + store.quizProfile.date + '): ' +
      store.quizProfile.bandLabel + ' — score ' + store.quizProfile.total +
      ' / ' + store.quizProfile.max + '. Re-take anytime; the latest result is what\'s saved.';
    box.appendChild(saved);
  }
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
  store.quizProfile = { total, max, bandLabel: band.label, index: band.index, conv: band.conv, date: todayISO() };
  saveStore(store);
  // Refresh the "Last result" line so it reflects the result just saved.
  const quizBox = $('quiz');
  quizBox.querySelectorAll('.quiz-saved').forEach(n => n.remove());
  const saved = document.createElement('p');
  saved.className = 'fineprint quiz-saved';
  saved.textContent = 'Last result (' + store.quizProfile.date + '): ' +
    store.quizProfile.bandLabel + ' — score ' + total +
    ' / ' + max + '. Re-take anytime; the latest result is what\'s saved.';
  quizBox.appendChild(saved);
  res.classList.remove('hidden');

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

function convictionPillClass(score) {
  if (score === null || score === undefined) return 's-mid';
  return score < 40 ? 's-low' : score < 70 ? 's-mid' : 's-high';
}

function ideaRow(idea, opts) {
  opts = opts || {};
  const today = opts.today || todayISO();
  const conv = convictionOf(idea);
  const row = document.createElement('div');
  row.className = 'idea-row' + (isReviewDue(idea, today) && idea.status !== 'resolved' ? ' due' : '') +
    (idea.status === 'resolved' ? ' resolved' : '');
  const main = document.createElement('button');
  main.className = 'idea-main';
  main.setAttribute('aria-label', 'Open research for ' + idea.name);
  main.addEventListener('click', () => openIdea(idea.id));
  const top = document.createElement('div');
  top.className = 'idea-top';
  const nm = document.createElement('span');
  nm.className = 'idea-name';
  nm.textContent = idea.name;
  top.appendChild(nm);
  if (idea.tickers) {
    const tk = document.createElement('span');
    tk.className = 'idea-ticker';
    tk.textContent = idea.tickers;
    top.appendChild(tk);
  }
  const sc = document.createElement('span');
  sc.className = 'idea-score ' + (conv === null ? 's-mid' : conv >= 4 ? 's-high' : conv >= 3 ? 's-mid' : 's-low');
  sc.textContent = convictionDots(conv);
  top.appendChild(sc);
  main.appendChild(top);
  const meta = document.createElement('div');
  meta.className = 'idea-meta';
  meta.appendChild(document.createTextNode('review by ' + (reviewAtOf(idea) || '—')));
  if (isReviewDue(idea, today) && idea.status !== 'resolved') {
    const badge = document.createElement('span');
    badge.className = 'due-badge';
    badge.textContent = 'Review due';
    meta.appendChild(document.createTextNode(' '));
    meta.appendChild(badge);
  }
  if (idea.status === 'resolved') {
    const badge = document.createElement('span');
    badge.className = 'tag';
    badge.textContent = 'Resolved';
    meta.appendChild(document.createTextNode(' '));
    meta.appendChild(badge);
  }
  main.appendChild(meta);
  row.appendChild(main);
  return row;
}

function renderIdeasHome() {
  const today = todayISO();

  const due = dueIdeas(today);
  const queue = $('due-queue');
  queue.innerHTML = '';
  if (!due.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'Nothing due. Every idea gets a review-by date — open an idea to set or change it.';
    queue.appendChild(d);
  } else {
    due.forEach(i => queue.appendChild(ideaRow(i, { today })));
  }

  const open = openIdeas(today).slice().sort((a, b) => {
    const sa = convictionOf(a), sb = convictionOf(b);
    if (sa === null && sb === null) return a.name.localeCompare(b.name);
    if (sa === null) return 1;
    if (sb === null) return -1;
    return sb - sa;
  });
  const resolved = (store.ideas || []).filter(i => i.status === 'resolved');
  const list = $('ideas-list');
  list.innerHTML = '';
  const all = open.concat(resolved);
  if (!all.length) {
    list.appendChild(emptyState({
      title: 'Your next ten-bagger starts here',
      body: 'Spot a trend, name a company, write two sentences about why. The app handles the rest — conviction, AI verification, review reminders.',
      actionId: 'qa-name',
      actionLabel: 'Add your first idea'
    }));
  } else {
    all.forEach(i => list.appendChild(ideaRow(i, { today })));
  }
  $('ideas-count').textContent = ideasLabel(all.length);

  $('export-json').disabled = !all.length;
  $('export-md').disabled = !all.length;

  const badge = $('reviews-badge');
  if (due.length) {
    badge.textContent = due.length;
    badge.classList.remove('hidden');
    badge.setAttribute('aria-label', due.length + (due.length === 1 ? ' review due' : ' reviews due'));
  } else {
    badge.textContent = '';
    badge.classList.add('hidden');
  }
}

function quickAddIdea() {
  const err = $('qa-error');
  err.textContent = '';
  err.classList.add('hidden');
  const name = $('qa-name').value.trim();
  const tickers = $('qa-tickers').value.trim().toUpperCase();
  if (!name) {
    err.textContent = 'Give your idea a company or idea name first.';
    err.classList.remove('hidden');
    $('qa-name').focus();
    return;
  }
  const idea = makeIdea(name, tickers);
  store.ideas.push(idea);
  saveStore(store);
  $('qa-name').value = '';
  $('qa-tickers').value = '';
  openIdea(idea.id);
}

function openIdea(id) {
  const idea = getIdea(id);
  if (!idea) { showScreen('ideas'); return; }
  renderIdeaDetail(idea);
  showScreen('idea');
}

function sectionShell(title, hint) {
  const sec = document.createElement('section');
  sec.className = 'detail-sec';
  const h = document.createElement('h3');
  h.textContent = title;
  sec.appendChild(h);
  if (hint) {
    const p = document.createElement('p');
    p.className = 'fineprint';
    p.textContent = hint;
    sec.appendChild(p);
  }
  return sec;
}

function renderIdeaDetail(idea) {
  const box = $('idea-detail');
  box.innerHTML = '';
  const conv = convictionOf(idea);

  const head = document.createElement('div');
  head.className = 'detail-head';
  const h1 = document.createElement('h1');
  h1.textContent = idea.name;
  head.appendChild(h1);
  const meta = document.createElement('p');
  meta.className = 'fineprint';
  if (idea.tickers) {
    const tk = document.createElement('span');
    tk.className = 'idea-ticker';
    tk.textContent = idea.tickers;
    meta.appendChild(tk);
    meta.appendChild(document.createTextNode(' \u00b7 '));
  }
  meta.appendChild(document.createTextNode('opened ' + idea.createdAt + ' \u00b7 ' + convictionDots(conv)));
  head.appendChild(meta);
  box.appendChild(head);

  const th = document.createElement('section');
  th.className = 'panel';
  const thH = document.createElement('h2');
  thH.textContent = 'Thesis';
  th.appendChild(thH);
  const beliefLab = document.createElement('label');
  beliefLab.className = 'field';
  beliefLab.appendChild(document.createTextNode('What I believe and why'));
  const belief = document.createElement('textarea');
  belief.rows = 3;
  belief.maxLength = 2000;
  belief.placeholder = 'One or two sentences: the core claim and the reasons.';
  belief.value = (idea.thesis && idea.thesis.belief) || '';
  beliefLab.appendChild(belief);
  th.appendChild(beliefLab);
  const falsLab = document.createElement('label');
  falsLab.className = 'field';
  falsLab.appendChild(document.createTextNode('What would prove me wrong'));
  const falsify = document.createElement('input');
  falsify.type = 'text';
  falsify.maxLength = 500;
  falsify.placeholder = 'The kill criteria \u2014 write it while you\u2019re honest.';
  falsify.value = (idea.thesis && idea.thesis.falsify) || '';
  falsLab.appendChild(falsify);
  th.appendChild(falsLab);
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn primary';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    updateIdea(idea.id, i => {
      i.thesis = { belief: belief.value.trim(), falsify: falsify.value.trim() };
    });
    renderIdeaDetail(getIdea(idea.id));
  });
  th.appendChild(saveBtn);
  box.appendChild(th);

  const cv = document.createElement('section');
  cv.className = 'panel';
  const cvH = document.createElement('h2');
  cvH.textContent = 'Conviction';
  cv.appendChild(cvH);
  const cvRow = document.createElement('div');
  cvRow.className = 'conv-row';
  cvRow.setAttribute('role', 'radiogroup');
  cvRow.setAttribute('aria-label', 'Conviction, 1 to 5');
  for (let n = 1; n <= 5; n++) {
    const b = document.createElement('button');
    b.className = 'conv-btn' + (conv === n ? ' selected' : '');
    b.textContent = n;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', conv === n ? 'true' : 'false');
    b.setAttribute('aria-label', n + ' out of 5');
    b.addEventListener('click', () => {
      updateIdea(idea.id, i => { i.conviction = n; });
      renderIdeaDetail(getIdea(idea.id));
    });
    cvRow.appendChild(b);
  }
  cv.appendChild(cvRow);
  box.appendChild(cv);

  renderAnalyzeSection(box, idea);

  const rev = document.createElement('section');
  rev.className = 'panel';
  const revH = document.createElement('h2');
  revH.textContent = 'Review';
  rev.appendChild(revH);
  const revRow = document.createElement('div');
  revRow.className = 'review-row';
  const revLab = document.createElement('label');
  revLab.className = 'field inline-field';
  revLab.appendChild(document.createTextNode('Review by'));
  const revDate = document.createElement('input');
  revDate.type = 'date';
  revDate.value = reviewAtOf(idea) || '';
  revDate.setAttribute('aria-label', 'Review-by date for this idea');
  revDate.addEventListener('change', () => {
    const next = setReviewAt(idea, revDate.value);
    if (!next) { revDate.value = reviewAtOf(idea) || ''; return; }
    updateIdea(idea.id, () => next);
    renderIdeasHome();
    openIdea(idea.id);
  });
  revLab.appendChild(revDate);
  revRow.appendChild(revLab);
  const nowBtn = document.createElement('button');
  nowBtn.className = 'btn primary';
  nowBtn.textContent = 'Review now';
  nowBtn.addEventListener('click', () => {
    const wrap = document.createElement('div');
    wrap.className = 'detail-review-wrap';
    box.appendChild(wrap);
    renderReviewForm(wrap, getIdea(idea.id) || idea, () => openIdea(idea.id));
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  revRow.appendChild(nowBtn);
  rev.appendChild(revRow);
  box.appendChild(rev);

  const del = document.createElement('button');
  del.className = 'link-danger';
  del.textContent = 'Delete this idea';
  del.addEventListener('click', () => {
    if (!confirm('Delete "' + idea.name + '"? This cannot be undone.')) return;
    deleteIdea(idea.id);
    showScreen('ideas');
    renderIdeasHome();
  });
  box.appendChild(del);
}

function renderAnalyzeSection(box, idea) {
  const sec = sectionShell('AI verify',
    'The final gate: turn everything above into a verification prompt. Paste it into Muse or Claude for the metric workup, bull/bear cases, red flags, and similar companies. It asks for analysis — never "should I buy".');
  sec.classList.add('analyze-sec');
  const ta = document.createElement('textarea');
  ta.className = 'analyze-prompt';
  ta.rows = 10;
  ta.readOnly = true;
  ta.setAttribute('aria-label', 'Generated analysis prompt for this idea');
  ta.value = buildAnalyzePrompt(idea);
  sec.appendChild(ta);
  const row = document.createElement('div');
  row.className = 'btn-row';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn primary';
  copyBtn.textContent = 'Copy prompt';
  copyBtn.setAttribute('aria-label', 'Copy the analysis prompt to the clipboard');
  copyBtn.addEventListener('click', () => {
    const done = () => {
      copyBtn.textContent = 'Copied';
      copyBtn.disabled = true;
      setTimeout(() => { copyBtn.textContent = 'Copy prompt'; copyBtn.disabled = false; }, 1600);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value).then(done, () => fallbackCopy());
      } else {
        fallbackCopy();
      }
    } catch (e) { fallbackCopy(); }
    function fallbackCopy() {
      try {
        ta.focus(); ta.select();
        if (document.execCommand('copy')) { done(); return; }
      } catch (e) {  }

      ta.focus(); ta.select();
    }
  });
  row.appendChild(copyBtn);
  sec.appendChild(row);
  const fp = document.createElement('p');
  fp.className = 'fineprint';
  fp.textContent = 'Tip: paste it here in chat with me and I\u2019ll do the full workup against your thesis.';
  sec.appendChild(fp);
  box.appendChild(sec);
}

function renderReviews() {
  const today = todayISO();
  const due = dueIdeas(today);
  const box = $('reviews-list');
  box.innerHTML = '';
  const upcoming = openIdeas(today).filter(i => !isReviewDue(i, today))
    .sort((a, b) => (reviewAtOf(a) || '').localeCompare(reviewAtOf(b) || ''));

  if (!due.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'Nothing due for review. The loop is quiet — check back after your ideas\' review-by dates pass.';
    box.appendChild(d);
  }
  due.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'entry due';
    const head = document.createElement('div');
    head.className = 'entry-head';
    const nm = document.createElement('span');
    nm.className = 'entry-name';
    nm.textContent = idea.name;
    head.appendChild(nm);
    if (idea.tickers) {
      const tk = document.createElement('span');
      tk.className = 'entry-tickers';
      tk.textContent = idea.tickers;
      head.appendChild(tk);
    }
    const badge = document.createElement('span');
    badge.className = 'due-badge';
    badge.textContent = 'Review due';
    head.appendChild(badge);
    card.appendChild(head);

    const thesis = document.createElement('p');
    thesis.className = 'entry-thesis';
    thesis.textContent = idea.thesis.belief || '(no thesis written yet)';
    card.appendChild(thesis);
    if (idea.thesis.falsify) {
      const f = document.createElement('p');
      f.className = 'entry-falsify';
      const strong = document.createElement('strong');
      strong.textContent = 'Would prove me wrong: ';
      f.appendChild(strong);
      f.appendChild(document.createTextNode(idea.thesis.falsify));
      card.appendChild(f);
    }
    const meta = document.createElement('p');
    meta.className = 'fineprint';
    meta.textContent = 'Review by ' + (reviewAtOf(idea) || '—') +
      ' · ' + (idea.reviewHistory || []).length + ' past reviews';
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    const open = document.createElement('button');
    open.className = 'btn';
    open.textContent = 'Open research';
    open.addEventListener('click', () => openIdea(idea.id));
    actions.appendChild(open);
    const start = document.createElement('button');
    start.className = 'btn primary';
    start.textContent = 'Start review';
    start.setAttribute('aria-label', 'Start review of ' + idea.name);
    start.addEventListener('click', () => {
      activeReviewId = idea.id;
      renderReviewForm(card, idea);
    });
    actions.appendChild(start);
    card.appendChild(actions);
    box.appendChild(card);
  });

  if (upcoming.length) {
    const h = document.createElement('h2');
    h.textContent = 'Upcoming';
    box.appendChild(h);
    const list = document.createElement('div');
    upcoming.forEach(i => list.appendChild(ideaRow(i, { today })));
    box.appendChild(list);
  }
}

function renderReviewForm(card, idea, onDone) {
  const old = card.querySelector('.review-form');
  if (old) old.remove();
  const form = document.createElement('div');
  form.className = 'review-form panel';

  const q1 = document.createElement('p');
  q1.innerHTML = '';
  const q1t = document.createElement('strong');
  q1t.textContent = 'Did it move for your stated reason?';
  q1.appendChild(q1t);
  const q1h = document.createElement('span');
  q1h.className = 'hint';
  q1h.textContent = ' Compare what happened to the reasons you wrote — this separates luck from skill.';
  q1.appendChild(q1h);
  form.appendChild(q1);
  const reasonChips = document.createElement('div');
  reasonChips.className = 'chips';
  const reasonOpts = [['yes', 'Yes, for my reasons'], ['no', 'No — or for other reasons'], ['na', 'Too early to tell']];
  let reasonMatch = 'na';
  reasonOpts.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'chip' + (reasonMatch === opt[0] ? ' selected' : '');
    b.textContent = opt[1];
    b.setAttribute('aria-pressed', reasonMatch === opt[0] ? 'true' : 'false');
    b.addEventListener('click', () => {
      reasonMatch = opt[0];
      reasonChips.querySelectorAll('.chip').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
      b.classList.add('selected');
      b.setAttribute('aria-pressed', 'true');
    });
    reasonChips.appendChild(b);
  });
  form.appendChild(reasonChips);

  const q2 = document.createElement('p');
  const q2t = document.createElement('strong');
  q2t.textContent = 'Outcome';
  q2.appendChild(q2t);
  form.appendChild(q2);
  const outcomeChips = document.createElement('div');
  outcomeChips.className = 'chips';
  const outcomeOpts = [
    ['intact', 'Thesis intact', 'The story still holds — keep watching.'],
    ['changed', 'Thesis changed', 'New evidence moved the story — update the research.'],
    ['resolved', 'Resolved', 'The question is answered — this feeds your track record.'],
  ];
  let outcome = 'intact';
  outcomeOpts.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'chip' + (outcome === opt[0] ? ' selected' : '');
    b.textContent = opt[1];
    b.title = opt[2];
    b.setAttribute('aria-pressed', outcome === opt[0] ? 'true' : 'false');
    b.addEventListener('click', () => {
      outcome = opt[0];
      outcomeChips.querySelectorAll('.chip').forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
      b.classList.add('selected');
      b.setAttribute('aria-pressed', 'true');
    });
    outcomeChips.appendChild(b);
  });
  form.appendChild(outcomeChips);

  const lab = document.createElement('label');
  lab.className = 'field';
  lab.appendChild(document.createTextNode('Review note (optional)'));
  const ta = document.createElement('textarea');
  ta.rows = 2;
  ta.maxLength = 1000;
  ta.placeholder = 'What changed? What did you learn?';
  lab.appendChild(ta);
  form.appendChild(lab);

  const nextLab = document.createElement('label');
  nextLab.className = 'field inline-field';
  nextLab.appendChild(document.createTextNode('Review again in'));
  const sel = document.createElement('select');
  REVIEW_INTERVALS.forEach(n => {
    const o = document.createElement('option');
    o.value = String(n);
    o.textContent = n + (n === 1 ? ' month' : ' months');
    if (n === (idea.reviewMonths || DEFAULT_REVIEW_MONTHS)) o.selected = true;
    sel.appendChild(o);
  });
  nextLab.appendChild(sel);
  form.appendChild(nextLab);

  const row = document.createElement('div');
  row.className = 'btn-row';
  const save = document.createElement('button');
  save.className = 'btn primary';
  save.textContent = 'Save review';
  save.addEventListener('click', () => {
    const updated = applyReview(getIdea(idea.id), {
      outcome, reasonMatch, note: ta.value.trim(), nextMonths: sel.value,
    }, todayISO());
    updateIdea(idea.id, () => updated);
    activeReviewId = null;
    renderIdeasHome();
    renderReviews();
    if (onDone) onDone();
  });
  row.appendChild(save);
  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => { activeReviewId = null; if (onDone) { onDone(); } else { renderReviews(); } });
  row.appendChild(cancel);
  form.appendChild(row);
  card.appendChild(form);
}

function renderTrackRecord() {
  const box = $('track-record');
  box.innerHTML = '';
  const tr = trackRecord(store.ideas || []);
  const kpis = document.createElement('div');
  kpis.className = 'kpi-strip';
  [
    ['Reviews logged', String(tr.reviews)],
    ['Thesis intact', String(tr.intact)],
    ['Thesis changed', String(tr.changed)],
    ['Resolved', String(tr.resolved)],
  ].forEach(pair => {
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
  box.appendChild(kpis);

  const cal = document.createElement('div');
  cal.className = 'panel';
  const h = document.createElement('h3');
  h.textContent = 'Calibration';
  cal.appendChild(h);
  const p = document.createElement('p');
  if (tr.reasonAccuracy === null) {
    p.textContent = 'No answered "did it move for your stated reason?" reviews yet. ' +
      'Each review asks the question — over time, this number tells you how often you were right for the right reasons.';
  } else {
    p.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = tr.reasonAccuracy + '%';
    p.appendChild(strong);
    p.appendChild(document.createTextNode(' of your answered reviews moved for your stated reasons (' +
      tr.reasonYes + ' of ' + tr.reasonAnswered + '). ' +
      'That is your honesty score — separate from whether prices went up.'));
  }
  cal.appendChild(p);
  const fine = document.createElement('p');
  fine.className = 'fineprint';
  fine.textContent = 'Resolved ideas never disappear — they stay in the Ideas list with a Resolved tag so the record can\'t be edited away. Hindsight editing is the enemy.';
  cal.appendChild(fine);
  box.appendChild(cal);

  const hist = [];
  (store.ideas || []).forEach(idea => {
    (idea.reviewHistory || []).forEach(r => hist.push({ idea, r }));
  });
  hist.sort((a, b) => b.r.date.localeCompare(a.r.date));
  const h2 = document.createElement('h2');
  h2.textContent = 'Review history';
  box.appendChild(h2);
  if (!hist.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'No reviews yet. When an idea\'s review-by date arrives, it appears under Reviews.';
    box.appendChild(d);
  } else {
    hist.forEach(hx => {
      const card = document.createElement('div');
      card.className = 'note-card';
      const head = document.createElement('div');
      head.className = 'entry-head';
      const nm = document.createElement('span');
      nm.className = 'entry-name';
      nm.textContent = hx.idea.name;
      head.appendChild(nm);
      const oc = document.createElement('span');
      oc.className = 'tag';
      oc.textContent = { intact: 'Thesis intact', changed: 'Thesis changed', resolved: 'Resolved' }[hx.r.outcome] || hx.r.outcome;
      head.appendChild(oc);
      card.appendChild(head);
      const meta = document.createElement('p');
      meta.className = 'fineprint';
      const rm = { yes: 'moved for stated reasons', no: 'did not move for stated reasons', na: 'too early to tell' }[hx.r.reasonMatch] || '';
      meta.textContent = hx.r.date + (rm ? ' · ' + rm : '');
      card.appendChild(meta);
      if (hx.r.note) {
        const np = document.createElement('p');
        np.className = 'note-text';
        np.textContent = hx.r.note;
        card.appendChild(np);
      }
      box.appendChild(card);
    });
  }
}

function updateTrend(id, fn) {
  store.trends = (store.trends || []).map(t => {
    if (t.id !== id) return t;
    const next = fn(t) || t;
    next.updatedAt = todayISO();
    return next;
  });
  saveStore(store);
}

function trendRow(trend) {
  const row = document.createElement('div');
  row.className = 'note-card';
  const head = document.createElement('div');
  head.className = 'entry-head';
  const nm = document.createElement('span');
  nm.className = 'entry-name';
  nm.textContent = trend.name || 'Untitled trend';
  head.appendChild(nm);
  const st = document.createElement('span');
  st.className = 'tag';
  st.textContent = TREND_STATUS_LABELS[trend.status] || trend.status;
  head.appendChild(st);
  row.appendChild(head);
  const meta = document.createElement('p');
  meta.className = 'fineprint';
  meta.textContent = 'Spotted ' + (trend.createdAt || '—');
  row.appendChild(meta);
  if (trend.why) {
    const why = document.createElement('p');
    why.className = 'note-text';
    why.textContent = trend.why;
    row.appendChild(why);
  }
  const actions = document.createElement('div');
  actions.className = 'btn-row';
  if (trend.status === 'watching') {
    const mk = document.createElement('button');
    mk.className = 'btn primary';
    mk.textContent = 'Make an idea';
    mk.addEventListener('click', () => {
      const made = trendToIdea(trend, todayISO());
      store.ideas.push(made.idea);
      updateTrend(trend.id, () => made.trend);
      renderTrends();
      openIdea(made.idea.id);
    });
    actions.appendChild(mk);
    const miss = document.createElement('button');
    miss.className = 'btn';
    miss.textContent = 'Missed it';
    miss.addEventListener('click', () => {
      updateTrend(trend.id, t => markTrendMissed(t, todayISO()));
      renderTrends();
    });
    actions.appendChild(miss);
  } else if (trend.status === 'missed') {
    const lab = document.createElement('label');
    lab.className = 'field';
    lab.appendChild(document.createTextNode('What did this miss teach you?'));
    const ta = document.createElement('textarea');
    ta.rows = 2;
    ta.maxLength = 1000;
    ta.placeholder = 'e.g. I noticed it early but waited for a dip that never came.';
    ta.value = trend.lesson || '';
    lab.appendChild(ta);
    row.appendChild(lab);
    const save = document.createElement('button');
    save.className = 'btn';
    save.textContent = 'Save lesson';
    save.addEventListener('click', () => {
      updateTrend(trend.id, t => setTrendLesson(t, ta.value));
      const orig = save.textContent;
      save.textContent = 'Saved ✓';
      save.disabled = true;
      setTimeout(() => { save.textContent = orig; save.disabled = false; }, 1200);
    });
    actions.appendChild(save);
    const back = document.createElement('button');
    back.className = 'btn';
    back.textContent = 'Watching again';
    back.addEventListener('click', () => {
      updateTrend(trend.id, t => Object.assign({}, t, { status: 'watching' }));
      renderTrends();
    });
    actions.appendChild(back);
  } else if (trend.status === 'chased') {
    const idea = trend.ideaId ? getIdea(trend.ideaId) : null;
    const open = document.createElement('button');
    open.className = 'btn';
    open.textContent = idea ? 'Open idea: ' + idea.name : 'Idea no longer exists';
    open.disabled = !idea;
    if (idea) open.addEventListener('click', () => openIdea(idea.id));
    actions.appendChild(open);
  }
  row.appendChild(actions);
  return row;
}

function renderTrends() {
  const trends = (store.trends || []).slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const watching = trends.filter(t => t.status === 'watching');
  const missed = trends.filter(t => t.status === 'missed');
  const chased = trends.filter(t => t.status === 'chased');
  const fill = (id, list, emptyText) => {
    const box = $(id);
    box.innerHTML = '';
    if (!list.length) {
      const d = document.createElement('div');
      d.className = 'empty';
      d.textContent = emptyText;
      box.appendChild(d);
    } else {
      list.forEach(t => box.appendChild(trendRow(t)));
    }
  };
  fill('trends-watching', watching,
    'Nothing on your radar. Spot a trend above — the shift you can see but can\u2019t invest in yet.');
  fill('trends-missed', missed,
    'No missed waves logged. When one gets away, mark it here with the lesson \u2014 that\u2019s the pattern library.');
  fill('trends-chased', chased, 'No trends turned into ideas yet.');
  $('trends-count').textContent =
    watching.length === 1 ? '1 trend watched' : watching.length + ' trends watched';
}

function quickAddTrend() {
  const err = $('trend-error');
  err.textContent = '';
  err.classList.add('hidden');
  const name = $('trend-name').value.trim();
  const why = $('trend-why').value.trim();
  if (!name) {
    err.textContent = 'Give the trend a name first \u2014 e.g. the shift you keep noticing.';
    err.classList.remove('hidden');
    $('trend-name').focus();
    return;
  }
  const trend = makeTrend(name, why);
  store.trends = store.trends || [];
  store.trends.push(trend);
  saveStore(store);
  $('trend-name').value = '';
  $('trend-why').value = '';
  renderTrends();
}

let lessonNodes = [];
let lessonQuizState = {};

function lessonProgress(abbr) {
  const g = (store.glossary || {})[abbr];
  return (g && typeof g.best === 'number') ? g.best : null;
}

function renderGlossary() {
  const box = $('glossary');
  box.innerHTML = '';
  lessonNodes = [];
  GLOSSARY.forEach(g => {
    const d = document.createElement('details');
    d.className = 'gloss lesson';
    lessonNodes.push({ el: d, term: g });
    const summary = document.createElement('summary');
    const tag = document.createElement('span');
    tag.className = 'ticker';
    tag.textContent = g.abbr;
    summary.appendChild(tag);
    summary.appendChild(document.createTextNode(g.name));
    const best = lessonProgress(g.abbr);
    if (best === 3) {
      const done = document.createElement('span');
      done.className = 'lesson-done';
      done.textContent = '✓';
      done.title = 'Quiz completed';
      summary.appendChild(done);
    }
    const body = document.createElement('div');
    body.className = 'body';
    const p1 = document.createElement('p'); p1.textContent = g.what;
    const p2 = document.createElement('p');
    const s2 = document.createElement('span'); s2.className = 'healthy'; s2.textContent = 'Generally healthy: ';
    p2.appendChild(s2); p2.appendChild(document.createTextNode(g.healthy));
    const p3 = document.createElement('p');
    const s3 = document.createElement('span'); s3.className = 'flag'; s3.textContent = 'Red flag: ';
    p3.appendChild(s3); p3.appendChild(document.createTextNode(g.flag));
    body.appendChild(p1); body.appendChild(p2); body.appendChild(p3);

    const qHead = document.createElement('h4');
    qHead.textContent = 'Check your understanding';
    body.appendChild(qHead);
    const quizBox = document.createElement('div');
    quizBox.className = 'lesson-quiz';
    if (!lessonQuizState[g.abbr]) lessonQuizState[g.abbr] = new Array(g.quiz.length).fill(null);
    const picked = lessonQuizState[g.abbr];
    g.quiz.forEach((item, qi) => {
      const qd = document.createElement('div');
      qd.className = 'q';
      const qt = document.createElement('div');
      qt.className = 'q-title';
      qt.textContent = (qi + 1) + '. ' + item.q;
      qd.appendChild(qt);
      const grid = document.createElement('div');
      grid.className = 'opt-grid';
      item.options.forEach((opt, oi) => {
        const b = document.createElement('button');
        b.className = 'opt-btn' + (picked[qi] === oi ? ' selected' : '');
        b.textContent = opt;
        b.setAttribute('aria-pressed', picked[qi] === oi ? 'true' : 'false');
        b.addEventListener('click', () => {
          picked[qi] = oi;
          grid.querySelectorAll('.opt-btn').forEach(x => { x.classList.remove('selected'); x.setAttribute('aria-pressed', 'false'); });
          b.classList.add('selected');
          b.setAttribute('aria-pressed', 'true');
          updateLessonScore(g, quizBox, picked);
        });
        grid.appendChild(b);
      });
      qd.appendChild(grid);
      quizBox.appendChild(qd);
    });
    const scoreLine = document.createElement('p');
    scoreLine.className = 'fineprint lesson-score';
    quizBox.appendChild(scoreLine);
    body.appendChild(quizBox);
    updateLessonScore(g, quizBox, picked, true);
    d.appendChild(summary); d.appendChild(body);
    box.appendChild(d);
  });
}

function updateLessonScore(term, quizBox, picked, silent) {
  const answered = picked.filter(p => p !== null).length;
  const correct = picked.filter((p, i) => p === term.quiz[i].a).length;
  const line = quizBox.querySelector('.lesson-score');
  if (line) line.textContent = answered + ' of 3 answered · ' + correct + ' correct' +
    (lessonProgress(term.abbr) !== null ? ' · best: ' + lessonProgress(term.abbr) + ' / 3' : '');
  if (answered === 3 && !silent) {
    store.glossary = store.glossary || {};
    const prev = lessonProgress(term.abbr);
    store.glossary[term.abbr] = { best: Math.max(prev === null ? 0 : prev, correct), attempts: ((store.glossary[term.abbr] || {}).attempts || 0) + 1 };
    saveStore(store);
    if (correct === 3) renderGlossary();
    else if (line) line.textContent = 'Answered: ' + correct + ' of 3 correct — best saved. Re-open to try again.';
  }
}

function applyGlossaryFilter() {
  const q = ($('glossary-search').value || '').trim();
  const visible = new Set(filterGlossaryTerms(q));
  let shown = 0;
  lessonNodes.forEach(n => {
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
  count.textContent = shown + ' of ' + GLOSSARY.length + ' lessons match "' + q + '"';
  count.classList.remove('hidden');
  empty.classList.toggle('hidden', shown !== 0);
}

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
    new Blob([journalToJSON(store.ideas || [])], { type: 'application/json' }),
    'longterm-lens-ideas-' + stamp + '.json'
  );
}

function exportMarkdown() {
  const stamp = todayISO();
  downloadBlob(
    new Blob([journalToMarkdown(store.ideas || [], stamp, store.trends || [])], { type: 'text/markdown' }),
    'longterm-lens-ideas-' + stamp + '.md'
  );
}

function init() {
  const THEME_KEY = 'ltl_theme';
  let theme = 'dark';
  try { theme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) {  }
  if (theme !== 'light' && theme !== 'dark') theme = 'dark';
  document.documentElement.dataset.theme = theme;
  $('theme-toggle').addEventListener('click', () => {
    theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {  }
  });
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.addEventListener('click', () => showScreen(b.dataset.nav)));

  const brandHome = $('brand-home');
  if (brandHome) brandHome.addEventListener('click', () => { renderIdeasHome(); showScreen('ideas'); });

  const cu = $('btn-check-update');
  function refreshUpdateButton(latest) {
    if (!cu) return;
    if (latest && latest !== APP_VERSION) {
      cu.textContent = 'Update available — reload';
      cu.classList.add('update-available');
    }
  }
  function checkForUpdates(manual) {
    if (!cu) return;
    if (manual) cu.textContent = 'Checking…';
    fetch('version.txt?v=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
      .then(t => {
        const v = (t || '').trim();
        if (v && isNewerVersion(v, APP_VERSION)) {
          refreshUpdateButton(v);
          if (manual && confirm('New version ' + v + ' available (you have ' + APP_VERSION + '). Reload now?')) {
            window.location.href = updateReloadURL(window.location.pathname, v, window.location.hash);
          } else if (manual) {
            cu.textContent = 'Update available — reload';
          }
        } else if (manual) {
          cu.textContent = 'Up to date ✓';
          setTimeout(() => { cu.textContent = 'Check for updates'; }, 2000);
        }
      })
      .catch(() => {
        if (manual) {
          cu.textContent = 'Check failed';
          setTimeout(() => { cu.textContent = 'Check for updates'; }, 2000);
        }
      });
  }
  if (cu) {
    cu.addEventListener('click', () => checkForUpdates(true));

    setTimeout(() => checkForUpdates(false), 2500);
  }
  document.querySelectorAll('[data-goto]').forEach(b =>
    b.addEventListener('click', () => showScreen(b.dataset.goto)));
  $('idea-back').addEventListener('click', () => { renderIdeasHome(); showScreen('ideas'); });
  renderQuiz();
  renderGlossary();
  $('glossary-search').addEventListener('input', applyGlossaryFilter);
  renderIdeasHome();
  renderReviews();
  renderTrackRecord();
  renderTrends();
  $('qa-add').addEventListener('click', quickAddIdea);
  ['qa-name', 'qa-tickers'].forEach(id => {
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') quickAddIdea(); });
  });
  // Cmd/Ctrl+K focuses quick-add from anywhere (keyboard-first, Linear-style).
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      showScreen('ideas');
      const f = $('qa-name');
      if (f) f.focus();
    }
  });
  $('trend-add').addEventListener('click', quickAddTrend);
  ['trend-name', 'trend-why'].forEach(id => {
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') quickAddTrend(); });
  });
  $('export-json').addEventListener('click', exportJSON);
  $('export-md').addEventListener('click', exportMarkdown);

  document.querySelector('.nav-btn[data-nav="reviews"]').addEventListener('click', renderReviews);
  document.querySelector('.nav-btn[data-nav="track"]').addEventListener('click', renderTrackRecord);
  document.querySelector('.nav-btn[data-nav="trends"]').addEventListener('click', renderTrends);
  document.querySelector('.nav-btn[data-nav="ideas"]').addEventListener('click', renderIdeasHome);
}

function reloadJournal() {
  store = loadStore();
  lessonQuizState = {};
  renderIdeasHome();
  renderReviews();
  renderTrackRecord();
  renderTrends();
  renderGlossary();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

if (typeof globalThis !== 'undefined') {
  globalThis.LongTermLens = { QUIZ, BANDS, scoreRisk, GLOSSARY, filterGlossaryTerms,
    REVIEW_INTERVALS, DEFAULT_REVIEW_MONTHS,
    TREND_STATUSES, TREND_STATUS_LABELS,
    convictionOf, convictionDots, normalizeWeights, compositeScore, scoreBand,
    ideasLabel, thesesLabel, esc, addMonths, todayISO, reviewAtOf, isReviewDue, setReviewAt,
    rescheduleReview, makeIdea, makeTrend, normalizeTrend, markTrendMissed, setTrendLesson,
    trendToIdea, migrateV2ToV3,
    applyReview, trackRecord, buildAnalyzePrompt,
    journalToJSON, journalToMarkdown, migrateStore, normalizeIdea, reloadJournal, SCHEMA_VERSION, STORE_KEY,
    APP_VERSION, updateReloadURL, isNewerVersion };
}
})();