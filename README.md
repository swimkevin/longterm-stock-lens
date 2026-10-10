# Long-Term Lens

**I watched Bitcoin at ~$5,000 and thought "this will be huge" — then bought nothing. I watched AI coming for years, used it daily, and still didn't know *what* to invest in. This is the tool I built so it never happens again.**

Live demo: https://swimkevin.github.io/longterm-stock-lens/

![vanilla JS](https://img.shields.io/badge/vanilla-JS-yellow) ![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![tests](https://img.shields.io/badge/tests-250%20passing-brightgreen) [![CI](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml/badge.svg)](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml)

> **Educational only — not financial advice.** This site teaches you how to research. It never tells you what to buy.

## Screenshots

<!--
  SCREENSHOT INSTRUCTIONS (Kevin):
  1. Add an idea or two on your phone, take 1 mobile screenshot (390px): ideas list → save as docs/screenshots/mobile.png
  2. Take 1 desktop screenshot: idea detail page (thesis + conviction + AI verify) → save as docs/screenshots/desktop.png
  3. Uncomment the two lines below.
-->
<!-- ![Mobile — ideas list](docs/screenshots/mobile.png) -->
<!-- ![Desktop — idea detail](docs/screenshots/desktop.png) -->

## By the numbers

- **0 runtime dependencies** — vanilla HTML/CSS/JS, no framework, no bundler, no build step
- **250 test assertions**, all passing, CI on every push
- **4 sections per idea** — down from 9, after I learned complexity was the enemy
- **1–5 conviction scale** — one number, replacing three overlapping scoring systems
- **4 architecture decision records** (`docs/adr/`) explaining every major tradeoff
- **100% local** — your data never leaves the browser

## What I learned (and what I'd do differently)

**Complexity was the enemy, and I was the one adding it.** v1.x had a 5-item checklist, a 3-row scorecard, a 0–100 composite, conviction labels, assumptions with confidence percentages, and research notes — nine sections per idea. It was "thorough" and nobody would use it. v2.0.0 deleted ~290 lines and replaced three scoring systems with one 1–5 tap. The lesson: every field you add is a tax on every future idea. Delete until it hurts, then delete one more.

**The constraint is the feature.** Wordle works because it's one puzzle a day, not because it has more puzzles. This app works because researching an idea takes minutes — thesis, conviction, AI prompt, review date. If I'd kept the scorecard, the app would be "more capable" and less used.

**Don't build the bridge halfway.** The site can't hold data-provider API keys, so a "live analysis" tab would have been a broken half-feature. Instead it generates a structured prompt you paste into Muse/Claude — honest about what a static site can and can't do.

**What I'd do differently next time:** design mobile-first from day one instead of auditing for it after (I got there, but the retrofit pass cost a full version).

## The idea in 30 seconds

Most investing apps answer *"what should I buy?"* — which is financial advice, and a trap. This one answers a better question: *"how do I think clearly about an idea for ten years?"*

The whole app is one loop, ruthlessly simple:

**Capture an idea → write your thesis in two sentences → tap a 1–5 conviction → generate an AI verification prompt → set a review date.**

That's it. Four sections per idea. No price charts, no checklists, no scorecards — I deleted all of those after realizing complexity was the enemy. The constraint *is* the feature: if researching an idea takes more than a few minutes, you won't do it, and the wave passes you by again.

The killer feature is **AI verify**: the app turns your thesis into a structured research prompt (metrics to check, bull/bear cases, red flags, kill criteria) that you paste into Muse or Claude. The site can't hold data-provider keys — so instead of a broken half-feature, it builds the bridge to real analysis honestly.

## Why I built it this way

- **Local-first** (`localStorage`, zero backend) — your research notes are yours; nothing leaves the browser. Also means instant load and zero cost.
- **Vanilla HTML/CSS/JS, no build step** — deploys straight to GitHub Pages from `main`. The entire app is one `app.js` IIFE; pure logic is exposed for tests.
- **Educational boundary as repo law** — no recommendations, no live prices, no personalized advice, ever. Historical examples are labeled illustrations. [ADR 0001](docs/adr/0001-educational-only-boundary.md)
- **Reviewed, not just written** — every idea gets a review-by date; reviews ask *"did it move for your stated reason?"* and feed a calibration score. The discipline is the product.

## Verification

**250 assertions, all passing** (`npm test`), plus CI on every push. The suite covers the conviction model, prompt builder, legacy-data migration (old scores auto-convert to the 1–5 scale — no data loss), review-date logic, and a jsdom boot of the real page (nav, CRUD, review flow, exports, XSS escaping).

## Honest limitations

- **No live data, by design.** No prices, no fundamentals feeds — the AI-verify prompt is the bridge, not a workaround. A static educational site that fakes live data would be dishonest.
- **One device.** localStorage means your ideas live in one browser. No sync, no accounts — that's the privacy tradeoff, stated upfront.
- **The AI prompt is only as good as your thesis.** Garbage in, garbage out — the app makes you write the "what would prove me wrong" field precisely so the prompt has teeth.

## Project structure

```
longterm-stock-lens/
├── index.html          # All screens
├── styles.css          # Calm dark/light theme, no frameworks
├── app.js              # One IIFE; DOM-free logic on globalThis.LongTermLens
├── tests/smoke.js      # 250 assertions: logic + jsdom UI boot
├── docs/               # ARCHITECTURE.md, TESTING.md, adr/
├── CHANGELOG.md
└── package.json        # Dev tooling only (no runtime dependencies)
```

## Run it

```bash
npx http.server        # or: python3 -m http.server 8000
npm test               # 250 assertions
```

---

*Built by Kevin Song — Principal Associate Software Engineer at Capital One. I use this myself; it's the reason the loop keeps getting simpler.*
