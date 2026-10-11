# ARCHITECTURE — Long-Term Lens

## Overview

Single-page static site. Vanilla HTML/CSS/JS, zero runtime dependencies, no build
step, no backend. All user data persists in `localStorage` under one key
(`longterm-stock-lens-v1`). Deploys to GitHub Pages from `main` as-is.

The product is a **calibration journal**: it seals each investment thesis at first
save (timestamped, un-editable), records the conviction held at every review, and
computes per-conviction hit rates. The architecture exists to serve that one loop.

## Files

| File | Role |
|---|---|
| `index.html` | App shell. Screens toggled by `data-nav` buttons: `ideas` (home), `idea` (detail), `reviews`, `track` (Calibration), `trends`, `profile` (investor quiz), `learn` (micro-lessons), `accounts`. Content sections are static HTML; dynamic regions are empty containers filled by `app.js`. |
| `styles.css` | Calm research theme via CSS custom properties (dark + light themes). Responsive, `prefers-reduced-motion` support, `:focus-visible` states, 44px touch targets. |
| `app.js` | All logic in one IIFE. DOM-free pure functions (`scoreRisk`, `makeIdea`, `convictionOf`, `sealThesis`, `applyReview`, `calibration`, `trackRecord`, `migrateStore`, `buildAnalyzePrompt`, …) are exposed on `globalThis.LongTermLens` for the Node test suite. |
| `tests/smoke.js` | Node + jsdom suite (267 assertions): pure-logic assertions, then a boot of the real page clicking through nav, quiz, idea CRUD, review flow, calibration, exports, and `localStorage` round-trips. |
| `tests/edge-probe.js` | Kept harness for edge cases (XSS probes, oversized input, legacy stores). |

## Data flow

```
Quick-add / ⌘K --makeIdea--> idea { thesis, sealed, conviction, reviewAt, reviewHistory }
Thesis first save --sealThesis--> idea.sealed = { belief, falsify, date }  (never edited again)
Review --applyReview--> entry { date, outcome, reasonMatch, conviction, note }
All entries --calibration--> per-level hit rates + pattern insight --> Calibration view + home strip
Idea + sealed record --buildAnalyzePrompt--> verification prompt --> user's AI tool
Legacy stores --migrateStore--> current schema (old scores mapped to the 1–5 conviction scale)
```

- **Sealed theses:** `sealThesis` snapshots `{belief, falsify, date}` the first time a non-empty thesis is saved. Later thesis edits update the working copy only; reviews always display and judge against the sealed original. This is the product's integrity guarantee — hindsight editing is impossible by construction.
- **Conviction:** a single 1–5 value per idea (`convictionOf` also reads legacy shapes — old level strings and 0–100 composites map onto the scale, so journals from any version still open).
- **Reviews:** every idea has `reviewAt` (default ~90 days out). `applyReview` appends a history entry **including the conviction held at that moment**, re-schedules the next review, and flips `status` to `resolved` on a resolved outcome.
- **Calibration:** `calibration(ideas)` groups scored reviews (`reasonMatch` yes/no) by their conviction snapshot and returns per-level rates, overall rate, high-vs-low rates, and a plain-language insight when the sample supports one. Reviews predating conviction snapshots count toward the overall rate only — the function never fabricates per-level data.
- **Investor profile quiz:** 6 questions × 4 options, each scoring 0–3. Total maps to a risk band; every band keeps broad index funds as the majority holding. Result persists as `quizProfile`.
- **Escaping:** user-entered strings render via `textContent` or `esc()` — never raw `innerHTML`.

## Design decisions

- **No prices, no APIs, no recommendations.** Permanent educational boundary (ADR 0001, 0004): the app cannot fetch quotes and contains no buy/sell language. The AI-verify prompt is the honest bridge to live analysis.
- **localStorage only.** No accounts, no sync, no tracking (ADR 0003). The tradeoff — one device — is stated in the README's limitations.
- **One scoring system.** v1.x had three overlapping ones (checklist-gated levels, 0–100 composite, scorecard). v2.0 deleted them for a single 1–5 conviction; v3.0 made that number meaningful by scoring it against outcomes.
- **jsdom as a real devDependency** (since v2.1.0's CI fix) — `npm ci && npm test` runs identically locally and in GitHub Actions on Node 24.

## Testing

`npm test` runs `tests/smoke.js`, which:
1. Asserts pure-logic behavior: risk bands, conviction mapping, sealing (including "sealed copy never changes"), calibration math and insights, review scheduling, migration, prompt building.
2. Boots `index.html` in jsdom and clicks through the real UI: nav, profile quiz, quick-add (including an XSS-probe name), thesis + conviction, delete end-to-end, review flow, track record, trends, lesson quizzes, exports.

CI (`.github/workflows/test.yml`) runs the same suite on every push.
