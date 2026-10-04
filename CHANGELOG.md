# Changelog — Long-Term Lens

## [0.1.1] — 2026-10-04

First live-playtest fix round.

### Fixed
- Delete buttons no longer use the native `confirm()` dialog — replaced with an inline two-tap confirm ("Delete" → "Tap again to confirm delete", auto-disarms after 3s, arming one disarms the others). Deletion is now testable and consistent with the rest of the UI.
- Form validation in the journal no longer uses `alert()` — inline `role="alert"` error message under the score preview instead.
- Watchlist count grammar: "(1 thesis)" vs "(2 theses)".
- Home screen card copy: "Five questions" → "Six questions" to match the actual quiz.

### Added
- Partial-scoring disclosure: the weighted preview and each watchlist entry now show how many of the 5 dimensions were scored (e.g. "5.0 / 5 · 2 of 5 scored"), so a partially-scored thesis can't be mistaken for a fully-scored one. Stored as `scored` on each entry (older entries fall back to counting their saved scores).
- Score toggle-off is now documented in the hint text and in each score button's `aria-label`.
- New pure helpers `scoreCount()` and `thesesLabel()` exposed on `window.LongTermLens` for tests.

### Tests
- `tests/smoke.js` extended: pure-logic coverage for `scoreCount`/`thesesLabel`; inline-error validation; two-tap delete flow (arm, confirm, cross-disarm, localStorage removal); partial-scoring disclosure in preview, entry meta, and persisted store; stronger XSS assertions (no `img` element, no `onerror` handlers in the watchlist).

## [0.1.0] — 2026-10-04

Initial release.

### Added
- Home screen: hero, "How it works" (Personal Conviction + Fundamentals + Long-term discipline), and a historical illustration of conviction-driven research (educational only, not a recommendation).
- Risk profiler quiz: 6 questions → suggested allocation band between broad index funds and conviction stocks (80/20 down to 98/2), with per-band explanations.
- Fundamentals checklist & glossary: 10 metrics (P/E, PEG, P/S, FCF, revenue growth, gross/operating margin, ROE, debt-to-equity, moat) in expandable sections with plain-English explainers, typical healthy patterns, and red flags; plus a 6-step research checklist.
- Conviction journal: thesis + "what would prove me wrong" + tags + tickers, 1–5 scoring on five weighted dimensions, saved to localStorage.
- Watchlist: journal entries sorted by weighted score, with delete; XSS-safe rendering.
- Accounts screen: Roth vs Traditional vs taxable comparison, 2026 contribution limits (labeled "verify at irs.gov"), why index funds fit tax-advantaged accounts.
- Learn screen: SEC EDGAR, investor relations, Investopedia, Bogleheads, and three recommended books.
- Site-wide educational disclaimer in hero banner and footer: "Educational only, not financial advice."
- Responsive dark theme, keyboard focus states, reduced-motion support.
- `tests/smoke.js`: pure-logic assertions + jsdom boot/click/persistence test.
