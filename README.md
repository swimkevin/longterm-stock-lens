# Long-Term Lens

**An educational idea-research journal for buy-and-hold investing — thesis in, verification out, no recommendations ever.**

Live site: https://swimkevin.github.io/longterm-stock-lens/ · Repo: https://github.com/swimkevin/longterm-stock-lens

![vanilla JS](https://img.shields.io/badge/vanilla-JS-yellow) ![no dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![tests](https://img.shields.io/badge/tests-212%20passing-brightgreen) [![CI](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml/badge.svg)](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml)

> **Educational only — not financial advice.** This site teaches research skills. It never recommends securities. Always do your own research before investing real money.

## What it is

A personal, offline-first research journal built around one core loop: **capture an idea → write the thesis → pressure-test it → score it → verify with AI → review on schedule.** Everything is stored in the browser's localStorage; nothing leaves the device.

The design comes from a research pass over ten comparable products (thesis journals like Stockxy and Journalytic; research tools like Simply Wall St, Stockopedia, Stock Rover, Morningstar; decision journals like Fatebook and Metaculus; educational apps like Zogo and Finimize). The transferable patterns — opinionated 3-field thesis, mandatory review-by dates, "did it move for your stated reason?" post-mortems, pre-decision checklist gates, user-weighted composite scores, calibration tracking, micro-lessons with quizzes — are ported without the parts a static educational site can't honestly do (live prices, recommendations).

## The core flow

1. **Ideas** (the hero screen) — quick-add by name, a due-for-review queue, and every idea showing its 0–100 composite score and conviction label. Reviews, Track record, Profile, Learn, and Accounts live quietly under a "More" menu; they never compete with the core.
2. **One-page research record** — 3-field thesis (what I believe / why / what would prove me wrong), assumptions with confidence %, a 5-item pre-decision checklist (moat, earnings, debt, valuation, circle of competence) that gates conviction above "Watching", a Quality/Value/Conviction scorecard with your own weights → composite 0–100, a manual price timeline, and attached notes.
3. **AI verify** — the final gate. The site can't hold data-provider keys, so instead of a broken half-feature it builds a structured verification prompt from your whole research record (ticker, thesis, assumptions, checklist state, scorecard). One tap copies it; paste into Muse/Claude for the metric workup, bull/bear cases, red flags, and similar companies. It asks for analysis — never "should I buy".
4. **Review** — every idea has an editable review-by date and a "Review now" button; reviews resolve as thesis intact / changed / resolved and feed a calibration score (how often ideas moved for the stated reasons).

## Key decisions

- **Educational-only boundary, enforced as repo law** — no recommendations, no live prices, no personalized advice; historical examples are labeled illustrations. [ADR 0001](docs/adr/0001-educational-only-boundary.md)
- **Vanilla HTML/CSS/JS, zero runtime dependencies, no build step** — instant load, fully offline, tests run in plain Node. [ADR 0002](docs/adr/0002-vanilla-js-zero-dependencies.md)
- **Local-first journal in localStorage** (`longterm-stock-lens-v1`) — zero cost, nothing leaves the browser; schema changes ship with a migration, never data loss. [ADR 0003](docs/adr/0003-localstorage-journal.md)
- **No backend, no price feeds — not even free ones** — keeps the educational boundary airtight by construction; the AI-verify prompt is the honest bridge to live analysis. [ADR 0004](docs/adr/0004-no-backend-no-price-feeds.md)

## Verification

**212 assertions, all passing** (`npm test` → `tests/smoke.js`). Strategy documented in [docs/TESTING.md](docs/TESTING.md): pure-logic coverage of scorecard math, checklist gate, prompt builder, migration, and review-date logic; a jsdom boot of the real page exercising nav, quiz, idea CRUD, review flow, track record, lesson quizzes, exports, and localStorage round-trips; XSS-escaping checks with a literal probe string. Assertions are added with every logic change; the suite gates every commit. AI-assisted development follows documented guardrails — [docs/AI-WORKFLOW.md](docs/AI-WORKFLOW.md).

A scheduled daily job runs the suite, live-tests the deployed site (desktop + 390px screenshots), and ships small improvements — always with a run report, never silent.

## Project structure

```
longterm-stock-lens/
├── index.html          # All screens: ideas, idea detail, reviews, track record, profile, learn, accounts
├── styles.css          # Calm dark/light research theme, responsive, no frameworks
├── app.js              # One IIFE; DOM-free logic exposed on globalThis.LongTermLens for tests
├── tests/smoke.js      # Node smoke test: pure-logic assertions + jsdom UI boot
├── docs/               # ARCHITECTURE.md, ROADMAP.md, TESTING.md, AI-WORKFLOW.md, adr/0001-0004
├── AGENTS.md           # Repo conventions for AI coding agents (read this first)
├── CHANGELOG.md
└── package.json        # Dev tooling only (no runtime dependencies)
```

## Run it

```bash
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # runs the smoke test
```

Deploys to GitHub Pages from `main` — static site, nothing to build.

## Roadmap

- **v1.0** — ✅ 2026-10-09: Ideas → Research → Review redesign from the 10-product research report
- **v1.0.1** — ✅ 2026-10-09: review loop reachability fix (editable review-by date + Review now on idea detail)
- **v1.1** — ✅ 2026-10-09: one core feature (Ideas hero, quiet secondary nav), AI-verify prompt generator as the final gate, inline SVG icons (no emoji), senior-dev README + upgraded tests (212 assertions)
- **Next** — trends & misses log (past misses as a pattern library), category-level allocation guidance from the risk profile (educational; categories, never tickers), Learn expansion (market analysis, valuation methods, historical case studies as labeled illustrations)
- **Later** — compound-interest visualizer + DCA explainer; 10-K reading walkthrough

This project will not become a trading tool, will not show real-time prices, and will not give recommendations. Those are permanent boundaries, not backlog items.
