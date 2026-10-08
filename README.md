# 🔭 Long-Term Lens

**Research conviction stocks for buy-and-hold, backed by fundamentals — not trading tips.**

🌐 **Live demo:** https://swimkevin.github.io/longterm-stock-lens/
📦 **Repo:** https://github.com/swimkevin/longterm-stock-lens

A free, offline, no-signup educational hub for beginner long-term investors: take a risk profiler quiz, learn fundamental metrics in plain English, keep a conviction journal with a scoring framework, and understand Roth IRAs and account types.

![vanilla JS](https://img.shields.io/badge/vanilla-JS-yellow) ![no dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![tests](https://img.shields.io/badge/tests-132%20passing-brightgreen) [![CI](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml/badge.svg)](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml)

## Key decisions

- **Educational-only boundary, enforced as repo law** — no recommendations, no live prices, no personalized advice; historical examples are labeled illustrations. See [ADR 0001](docs/adr/0001-educational-only-boundary.md).
- **Vanilla HTML/CSS/JS, zero runtime dependencies, no build step** — instant load, fully offline, tests run in plain Node. See [ADR 0002](docs/adr/0002-vanilla-js-zero-dependencies.md).
- **Conviction journal persists in localStorage** (`longterm-stock-lens-v1`), local-first: zero cost, nothing leaves the browser. See [ADR 0003](docs/adr/0003-localstorage-journal.md).
- **No backend, no price feeds — not even free ones** — keeps the educational boundary airtight by construction. See [ADR 0004](docs/adr/0004-no-backend-no-price-feeds.md).

## Verification

**132 assertions**, all passing (`npm test` → `tests/smoke.js`). The strategy is documented in [docs/TESTING.md](docs/TESTING.md): pure-logic coverage of the scoring and review-date math, a jsdom boot of the real page (nav, quiz, journal CRUD, exports, localStorage round-trips), and XSS-escaping checks with a literal probe string. Assertions are added with every logic change; the suite gates every commit. AI-assisted development follows documented guardrails — see [docs/AI-WORKFLOW.md](docs/AI-WORKFLOW.md).

## Automated daily improvements

A scheduled job runs every morning: test suite, live browser check, 1–2 small improvements (mobile polish, UX refinements, accessibility), auto-push. Recent improvements: glossary search/filter, 44px touch targets, visible keyboard focus rings.

> **⚠️ Educational only — not financial advice.** This site teaches research skills. It never recommends securities. Always do your own research before investing real money.

## Why this exists

I'm Kevin Song, a software engineer. I built this in October 2026 as a companion to [Poker Sparring](https://github.com/swimkevin/poker-sparring), my poker training app, with the same philosophy:

1. **Build something genuinely useful.** Most investing content is either day-trading hype or "just buy index funds, stop asking questions." There's a middle path for beginners: learn to research companies you genuinely understand, size positions to your risk tolerance, and hold for years. I wanted a calm place that teaches exactly that — conviction + fundamentals + patience.
2. **Keep leveling up as an engineer.** Like Poker Sparring, this is deliberate practice in AI-assisted development: prompting, reviewing and testing agent-written code, and shipping a polished, honest product. The code is vanilla HTML/CSS/JS with zero runtime dependencies, and it's built to be read.

On the "AI" question, to be precise: there is no machine learning here at all — and that's the point. The scoring frameworks are transparent arithmetic you can check by hand. The site teaches *you* to do the thinking.

## Features (v0.4.0)

- **Risk profiler quiz** — 6 questions (age, timeline, volatility tolerance, income stability, experience, drawdown behavior) → a suggested allocation band between broad index funds and conviction stocks, e.g. 80% index / 20% conviction. Educational starting point, not a prescription.
- **Fundamentals glossary** — P/E, PEG, P/S, free cash flow, revenue growth, gross/operating margin, ROE, debt-to-equity, moat. Plain-English explainers with **search/filter**, typical "healthy" patterns, and red flags. No thresholds presented as rules.
- **Conviction journal** — write your thesis (\"I use X daily, I believe Y lasts 10 years because…\"), name what would prove you wrong, tag themes, track tickers, and score 1–5 on Product Belief / Fundamentals / Moat / Valuation Comfort / Time Horizon → weighted score out of 5. Set a re-check reminder (1/3/6/12 months) per thesis.
- **Watchlist** — journal entries sorted by score with "Review due" badges on overdue theses; due entries surface first and can be marked reviewed to schedule the next re-check (1/3/6/12 months). Persisted in `localStorage`. Export your journal as JSON or Markdown. Nothing leaves your browser.
- **Roth IRA & account explainer** — Roth vs Traditional vs taxable comparison, 2026 contribution limits (labeled \"verify at irs.gov\"), why index funds fit tax-advantaged accounts.
- **Learn section** — SEC EDGAR, company investor relations, Investopedia, Bogleheads, plus three books (*One Up On Wall Street*, *The Intelligent Investor*, *A Random Walk Down Wall Street*).
- **Mobile-friendly** — horizontal-scroll nav, 44px touch targets, readable on phones.
- **100% offline** — no accounts, no servers, no tracking, no real-time prices. All data entry is manual.

## Compliance notes

- Educational content only. No buy/sell recommendations anywhere in the app or docs.
- Historical company examples (AMD, Micron, Nvidia) appear **only as illustrations of past growth**, never as recommendations. No real-time prices are shown or fetched.
- Footer and README carry the disclaimer: *"Educational only, not financial advice. Do your own research."*

## Project structure

```
longterm-stock-lens/
├── index.html          # All six screens: home, risk, fundamentals, journal, accounts, learn
├── styles.css          # Calm dark research theme, responsive, no frameworks
├── app.js              # Quiz logic, glossary render, journal + watchlist, localStorage
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
- **v0.5** — compound-interest visualizer; dollar-cost averaging explainer ← next
- **v0.5** — 10-K reading walkthrough (how to find each metric in a real filing)
- **Later** — PWA for offline phone use; analytics to measure usage before any monetization thoughts

This project will not become a trading tool, will not show real-time prices, and will not give recommendations. Those are permanent boundaries, not backlog items.
