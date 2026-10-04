# ARCHITECTURE — Long-Term Lens

## Overview

Single-page static site. Vanilla HTML/CSS/JS, zero runtime dependencies, no build
step, no backend. All user data persists in `localStorage` under one key
(`longterm-stock-lens-v1`). Deploys to GitHub Pages from `main` as-is.

## Files

| File | Role |
|---|---|
| `index.html` | App shell. Six screens toggled by `data-nav` buttons: `home`, `risk`, `fundamentals`, `journal`, `accounts`, `learn`. Content sections are static HTML; dynamic regions are empty containers filled by `app.js`. |
| `styles.css` | Dark "research desk" theme via CSS custom properties. Responsive (`auto-fit` grids, one mobile breakpoint at 640px), `prefers-reduced-motion` support, `:focus-visible` states. |
| `app.js` | All logic. IIFE; DOM-free data + pure functions (`QUIZ`, `BANDS`, `scoreRisk`, `GLOSSARY`, `weightedScore`) are exposed on `globalThis.LongTermLens` for the Node smoke test. |
| `tests/smoke.js` | Node test: asserts on `scoreRisk`/`weightedScore`/`GLOSSARY`, then boots the real page in jsdom, clicks through nav/quiz/journal, and checks `localStorage` round-trips. |

## Data flow

```
QUIZ answers (0-3 each) --scoreRisk--> { total, band } --> allocation bar UI
Journal form + draftScores --weightedScore--> entry { scores, weighted }
  --> store.entries (localStorage) --renderWatchlist--> sorted cards
```

- **Risk quiz:** 6 questions × 4 options. Each option scores 0–3. Total 0–18 maps to the first `BANDS` entry whose `min` is satisfied. Every band keeps broad index funds as the majority holding.
- **Journal scoring:** five 1–5 dimensions with fixed weights (Fundamentals 25%, Product 20%, Moat 20%, Horizon 20%, Valuation 15%). `weightedScore` returns `null` when nothing is scored; the watchlist sorts `null` as 0 and labels it "unscored".
- **Escaping:** user-entered strings (names, tickers, tags, thesis) are rendered via `textContent` or the `esc()` helper — never raw `innerHTML`. (The quiz result band copy is developer-authored content.)

## Design decisions

- **No prices, no APIs, no recommendations.** Permanent compliance boundary: the app cannot fetch quotes and contains no buy/sell language. Historical examples are hard-coded prose illustrations.
- **localStorage only.** No accounts, no sync, no tracking. Journal entries include `createdAt` so future "revisit your thesis" reminders can compute age.
- **`<details>` for the glossary.** Zero JS needed for expand/collapse; accessible by default.
- **Score buttons toggle.** Clicking a selected 1–5 score clears it, so "I don't know" is expressible without a fake neutral value.

## Testing

`npm test` runs `tests/smoke.js`, which:
1. Requires `app.js` with stubbed `document`/`localStorage`/`window` globals so the IIFE's `init()` runs harmlessly, then asserts `scoreRisk` band boundaries and `weightedScore` math.
2. Boots `index.html` in jsdom, asserts no script errors, clicks every nav tab, completes the quiz, saves a journal entry (including an XSS-probe string), and verifies the watchlist renders it escaped and persists to `localStorage`.

jsdom is loaded from the sibling `poker-sparring` workspace install (dev-only); the shipped site has zero dependencies.
