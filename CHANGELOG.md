# Changelog — Long-Term Lens

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
