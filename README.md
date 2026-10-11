# Long-Term Lens

**Your judgment, measured.**

I watched Bitcoin at ~$5,000 and thought "this will be huge" — then bought nothing. I watched AI coming for years, used it daily, and still didn't know *what* to invest in. The miss wasn't information. It was trust: I didn't know how much to trust my own gut, because I'd never kept score.

This is the tool that scores it.

Live demo: https://swimkevin.github.io/longterm-stock-lens/

![vanilla JS](https://img.shields.io/badge/vanilla-JS-yellow) ![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen) ![tests](https://img.shields.io/badge/tests-269%20passing-brightgreen) [![CI](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml/badge.svg)](https://github.com/swimkevin/longterm-stock-lens/actions/workflows/test.yml)

> **Educational only — not financial advice.** This site teaches you how to research. It never tells you what to buy.

## The one thing it does

**It remembers what you believed — sealed, timestamped, un-editable — and grades it when reality arrives.**

Ask a chat AI "was I right about Nvidia?" and it will happily reconstruct a story. It can't tell you what you *actually* wrote on the day, how sure you were, or whether your 5-out-of-5 calls beat your 2-out-of-5s across two years of decisions. That requires a sealed longitudinal record of *your* judgment. That's the whole app:

1. **Capture** — name a company in seconds (⌘K from anywhere).
2. **Seal a thesis** — two sentences: what you believe, and what would prove you wrong. The first save seals it forever. Later edits never touch the sealed copy.
3. **Say how sure you are** — one tap, 1–5.
4. **Verify with AI** — the app builds a structured research prompt from your record; paste it into Muse or Claude for the metric workup.
5. **Check in** — on the date you picked, the app shows you your own locked-in words and asks one question: *did it play out the way you said?* Your answers build your scorecard.

The **Scorecard** is the payoff: how your calls did, broken down by how sure you were, plus a plain-language read of your pattern ("When you're sure (4–5), you're usually right — trust the strong calls sooner"). No AI can generate this. It's computed from your locked-in history, or it doesn't exist.

## Screenshots

<!--
  SCREENSHOT INSTRUCTIONS (Kevin):
  1. Mobile (390px): ideas list with the scorecard strip → docs/screenshots/mobile.png
  2. Desktop: the Scorecard with per-level bars → docs/screenshots/desktop.png
  3. Uncomment the two lines below.
-->
<!-- ![Mobile — ideas + scorecard strip](docs/screenshots/mobile.png) -->
<!-- ![Desktop — Scorecard](docs/screenshots/desktop.png) -->

## By the numbers

- **0 runtime dependencies** — vanilla HTML/CSS/JS, no framework, no bundler, no build step
- **269 test assertions**, all passing, CI on every push
- **4 sections per idea** — Thesis, Conviction, AI verify, Review. Down from 9.
- **1 scorecard engine** — hit rates by how sure you were + pattern insights from your locked-in record
- **100% local** — your data never leaves the browser

## What I learned (and what I'd do differently)

**Complexity was the enemy, and I was the one adding it.** v1.x had a checklist, a weighted scorecard, a 0–100 composite, conviction labels, assumptions, and notes — nine sections per idea. "Thorough," and nobody would use it. v2.0 deleted three scoring systems for one 1–5 tap. Lesson: every field is a tax on every future idea.

**The moat is memory, not features.** Any AI can analyze a stock. None can hold your sealed beliefs for two years and grade them. When I stopped competing with AI on analysis and built the thing AI structurally can't do, the product finally had a reason to exist.

**Sealed means sealed.** The review compares reality against your *original* words — the app never lets you quietly edit history. Hindsight editing is how journals become fiction.

**What I'd do differently:** design mobile-first from day one, and find the calibration angle in v1 instead of v3.

## Engineering highlights

- **Pure-logic core, DOM-free** — calibration, sealing, prompt building, and migration live outside the UI and are unit-tested in Node (`globalThis.LongTermLens`). The same code runs in the browser.
- **Migration without data loss** — three generations of scoring (levels → 0–100 composite → 1–5) auto-convert; a user's journal from any version still opens.
- **XSS-safe by construction** — user strings render via `textContent`/`esc()` only; the suite includes literal injection probes.

## Honest limitations

- **Calibration needs reviews.** With zero scored reviews the engine has nothing to say — the app is honest about that instead of inventing stats.
- **One device.** localStorage = no sync. That's the privacy tradeoff, stated upfront.
- **No live data, by design.** The AI-verify prompt is the bridge to live analysis; a static educational site faking prices would be dishonest.

## Project structure

```
longterm-stock-lens/
├── index.html          # All screens
├── styles.css          # Calm dark/light theme, no frameworks
├── app.js              # One IIFE; pure logic on globalThis.LongTermLens
├── tests/smoke.js      # 269 assertions: logic + jsdom UI boot
├── docs/               # ARCHITECTURE.md, TESTING.md, adr/
├── CHANGELOG.md
└── package.json        # Dev tooling only
```

## Run it

```bash
python3 -m http.server 8000
npm test               # 269 assertions
```

---

*Built by Kevin Song — Principal Associate Software Engineer at Capital One. I use this myself; every review makes the next call better calibrated.*
