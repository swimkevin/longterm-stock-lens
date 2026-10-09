# 🔭 Long-Term Lens

**Research conviction stocks for buy-and-hold, backed by fundamentals — not trading tips.**

🌐 **Live demo:** https://swimkevin.github.io/longterm-stock-lens/
📦 **Repo:** https://github.com/swimkevin/longterm-stock-lens

A free, offline, no-signup educational hub for beginner long-term investors: capture investment ideas, write structured theses, pressure-test assumptions with a pre-decision checklist, score ideas on your own weighted criteria, review them on a schedule, and build an honest track record. Plus an investor-profile quiz, fundamentals micro-lessons, and Roth IRA / account explainers.

![vanilla JS](https://img.shields.io/badge/vanilla-JS-yellow) ![no dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![tests](https://img.shields.io/badge/tests-163%20passing-brightgreen) [![CI](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml/badge.svg)](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml)

## Key decisions

- **Educational-only boundary, enforced as repo law** — no recommendations, no live prices, no personalized advice; historical examples are labeled illustrations. See [ADR 0001](docs/adr/0001-educational-only-boundary.md).
- **Vanilla HTML/CSS/JS, zero runtime dependencies, no build step** — instant load, fully offline, tests run in plain Node. See [ADR 0002](docs/adr/0002-vanilla-js-zero-dependencies.md).
- **Conviction journal persists in localStorage** (`longterm-stock-lens-v1`), local-first: zero cost, nothing leaves the browser. See [ADR 0003](docs/adr/0003-localstorage-journal.md).
- **No backend, no price feeds — not even free ones** — keeps the educational boundary airtight by construction. See [ADR 0004](docs/adr/0004-no-backend-no-price-feeds.md).

## Verification

**163 assertions**, all passing (`npm test` → `tests/smoke.js`). The strategy is documented in [docs/TESTING.md](docs/TESTING.md): pure-logic coverage of the scorecard math, checklist gate, migration, and review-date logic, a jsdom boot of the real page (nav, quiz, idea CRUD, review flow, track record, lesson quizzes, exports, localStorage round-trips), and XSS-escaping checks with a literal probe string. Assertions are added with every logic change; the suite gates every commit. AI-assisted development follows documented guardrails — see [docs/AI-WORKFLOW.md](docs/AI-WORKFLOW.md).

## Automated daily improvements

A scheduled job runs every morning: test suite, live browser check, 1–2 small improvements (mobile polish, UX refinements, accessibility), auto-push. Recent improvements: glossary search/filter, 44px touch targets, visible keyboard focus rings.

> **⚠️ Educational only — not financial advice.** This site teaches research skills. It never recommends securities. Always do your own research before investing real money.

## Why this exists

I'm Kevin Song, a software engineer. I built this in October 2026 as a companion to [Poker Sparring](https://github.com/swimkevin/poker-sparring), my poker training app, with the same philosophy:

1. **Build something genuinely useful.** Most investing content is either day-trading hype or "just buy index funds, stop asking questions." There's a middle path for beginners: learn to research companies you genuinely understand, size positions to your risk tolerance, and hold for years. I wanted a calm place that teaches exactly that — conviction + fundamentals + patience.
2. **Keep leveling up as an engineer.** Like Poker Sparring, this is deliberate practice in AI-assisted development: prompting, reviewing and testing agent-written code, and shipping a polished, honest product. The code is vanilla HTML/CSS/JS with zero runtime dependencies, and it's built to be read.

On the "AI" question, to be precise: there is no machine learning here at all — and that's the point. The scoring frameworks are transparent arithmetic you can check by hand. The site teaches *you* to do the thinking.

## Features (v1.0)

- **Ideas home** — quick-add (name only → draft idea), a "Due for review" queue sorted by review-by date, and all ideas showing ticker, 0–100 composite score, conviction label, and review-due badge. Reviews tab carries a due-count badge.
- **One-page research summary per idea** — opinionated 3-field thesis template (what I believe / why / what would prove me wrong), key assumptions each with a confidence % (quick-set chips), a 5-item pre-decision checklist (moat, earnings, debt, valuation, circle of competence), a scorecard with user-adjustable Quality/Value/Conviction weights → composite 0–100, a manual price log rendered as a dated timeline, and attached research notes.
- **Checklist conviction gate** — conviction can't rise above "Watching" until every checklist item is checked; debiasing in the flow, not optional.
- **Review flow** — every idea has a review-by date (~90 days out, editable). Reviews ask "did it move for your stated reason?" with outcomes thesis intact / thesis changed / resolved; resolved ideas stay listed with a Resolved tag so the record can't be edited away.
- **Track record** — counts of intact/changed/resolved reviews plus a calibration line: how often your ideas moved for your stated reasons.
- **Investor profile quiz** — 6 questions → a suggested allocation band between broad index funds and conviction stocks (80/20 down to 98/2); latest result is saved.
- **Learn: fundamentals micro-lessons** — the 10 glossary terms as 2-minute lessons (explainer + typical "healthy" patterns + red flags + 3-question quiz), with search/filter and completion badges. No thresholds presented as rules.
- **Accounts** — "What's going on here? / Why should I care?" explainers for Roth IRA, Traditional IRA/401(k), and taxable brokerage; 2026 contribution limits (labeled "verify at irs.gov"); why index funds fit tax-advantaged accounts.
- **Data** — all in `localStorage` (`longterm-stock-lens-v1`), nothing leaves the browser; v0.x journal entries migrate automatically into the v2 ideas schema (theses, scores, and review dates preserved). Export ideas as JSON or Markdown.
- **Mobile-friendly** — horizontal-scroll nav, 44px touch targets, readable on phones.
- **100% offline** — no accounts, no servers, no tracking, no real-time prices. All data entry is manual.

## Compliance notes

- Educational content only. No buy/sell recommendations anywhere in the app or docs.
- Historical company examples (AMD, Micron, Nvidia) appear **only as illustrations of past growth**, never as recommendations. No real-time prices are shown or fetched.
- Footer and README carry the disclaimer: *"Educational only, not financial advice. Do your own research."*

## Project structure

```
longterm-stock-lens/
├── index.html          # All screens: ideas, idea detail, reviews, track record, profile, learn, accounts
├── styles.css          # Calm dark/light research theme, responsive, no frameworks
├── app.js              # Quiz logic, ideas CRUD, review flow, micro-lessons, localStorage + migration
├── tests/
│   └── smoke.js        # Node smoke test: pure-logic assertions + jsdom UI boot
├── docs/
│   ├── ARCHITECTURE.md # Module map and design decisions
│   ├── ROADMAP.md      # Release plan
│   ├── TESTING.md      # Testing strategy (114 assertions)
│   ├── AI-WORKFLOW.md  # How AI-assisted development is run here
│   └── adr/            # Architecture decision records (0001–0004)
├── README.md
├── CHANGELOG.md
├── AGENTS.md
└── package.json        # Dev tooling only (no runtime dependencies)
```

## Run it

No build step. Open `index.html` directly in a browser, or serve it:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # runs the smoke test
```

Deploy to GitHub Pages from `main` — it's a static site, nothing to build.

## Roadmap

- **v0.2** — ✅ shipped 2026-10-04: thesis revisit reminders ("Review due" badges, due-first watchlist) + journal export as JSON/Markdown
- **v0.3** — ✅ shipped 2026-10-05: light/dark themes, conviction color scale (red/amber/green), journal KPI strip, serif/tabular typography, press physics
- **v0.4** — ✅ shipped 2026-10-07: glossary search/filter + mobile/a11y polish (44px score-button touch targets, input focus rings, alloc-bar narrow-label fix); v0.4.1 (2026-10-08): "Mark reviewed" closes the revisit loop + due-summary `role="status"` announcement
- **v1.0** — ✅ shipped 2026-10-09: full redesign around an Ideas → Research → Review loop, built from a 10-product research report: ideas home with due-for-review queue, one-page research summaries (3-field thesis template, assumptions with confidence %, pre-decision checklist gating conviction, user-weighted 0–100 scorecard, manual price timeline, attached notes), "did it move for your stated reason?" reviews with intact/changed/resolved outcomes, track-record calibration, glossary → micro-lessons with 3-question quizzes, accounts → "What's going on here? / Why should I care?" skeleton. v0.x journal data migrates automatically (nothing lost); localStorage key unchanged.
- **v0.5** — compound-interest visualizer; dollar-cost averaging explainer ← next
- **v0.5** — 10-K reading walkthrough (how to find each metric in a real filing)
- **Later** — PWA for offline phone use; analytics to measure usage before any monetization thoughts

This project will not become a trading tool, will not show real-time prices, and will not give recommendations. Those are permanent boundaries, not backlog items.
