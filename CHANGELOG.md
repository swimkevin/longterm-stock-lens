# Changelog — Long-Term Lens

## [0.4.2] — 2026-10-09

Risk-profiler result polish: no label clipping + screen-reader announcement.

### Fixed
- **Allocation bar labels never clip:** the conviction segment is the narrow
  side of the bar (2–20% wide), so even "20% conviction" could clip inside the
  `overflow:hidden` segment on phones. All conviction segments now render the
  short label ("20%", "13%") — the bar's `aria-label` still carries the full
  wording ("20 percent conviction stocks") for assistive tech, completing the
  short-label pattern introduced for narrow segments in v0.4.0.

### Added
- **Quiz results are announced:** `#quiz-result` now has `role="status"`, so
  screen-reader users hear their allocation band (and the "answer every
  question" prompt) when it renders — the same pattern the glossary count
  line and the watchlist-due summary already use.

### Tests
- `tests/smoke.js`: conviction segment asserts short labels for the 20%,
  13%, and 2% bands; `role="status"` asserted on `#quiz-result`; aria-label
  coverage extended to the 13% band's full wording.

## [0.4.1] — 2026-10-08

Closes the thesis-revisit loop + a screen-reader announcement fix.

### Added
- **"Mark reviewed" on due theses:** a "Review due" badge used to sit there
  forever with no way to close the loop. Due entries now show a "Mark
  reviewed" button next to Delete, plus a remind-again-in interval select
  (1/3/6/12 months, defaulting to the thesis's own interval). Marking a
  thesis reviewed sets its next check to today + N months, clears the badge,
  and re-sorts the watchlist. New pure helper `rescheduleReview()` exposed
  on `window.LongTermLens`.

### Fixed
- **Due-review summary is now announced:** `#watchlist-due` carries
  `role="status"`, so screen-reader users hear when theses come due — the
  same pattern the glossary search count line already used. No visual change.

### Tests
- `tests/smoke.js` extended: pure-logic coverage for `rescheduleReview`
  (valid/custom/invalid months, invalid today fallback, entry immutability);
  UI flow for the mark-reviewed loop (backdate → due → mark reviewed with
  default and custom intervals → badge clears, `reviewAt` re-scheduled in
  localStorage); assertion that only due entries render the controls; and
  `role="status"` on the due summary.

## [0.4.0] — 2026-10-07

Glossary search + mobile/a11y polish pass — no behavior changes to scoring or data.

### Added
- **Glossary search:** a "Search the glossary" field filters the 10 terms
  instantly (matches abbreviation, name, and body text, case-insensitive).
  A `role="status"` count line announces "N of 10 terms match", and a
  no-match empty state suggests broader words. The query is only ever
  compared and set via `textContent` — never rendered as HTML. New pure
  helper `filterGlossaryTerms()` exposed on `window.LongTermLens`.
- **Input focus rings:** text inputs, textareas, and selects now show the same
  blue `:focus-visible` outline as buttons for keyboard users (mouse focus
  keeps the subtle border-color change).

### Fixed
- **Journal score buttons** are now 44×44px (was 34px), meeting the WCAG
  2.5.8 touch-target minimum — easier tapping on phones.
- **Allocation bar labels:** narrow conviction segments (2%, 7%) used to clip
  "2% conviction" inside the `overflow:hidden` bar; they now render the short
  label ("2%") while the `aria-label` keeps the full wording for assistive tech.
- Mobile topbar: the theme toggle can no longer shrink in the horizontal-scroll nav.

### Notes
- QA re-verified the ambiguous Export Markdown observation from the last
  pass: the download path is fully covered by the smoke test (two blobs,
  `text/markdown` type, dated `.md` filename, object-URL wiring, exported
  content) — no app bug; the earlier uncertainty was a browser-dialog quirk.

### Tests
- `tests/smoke.js` extended to 132 assertions: pure-logic coverage for
  `filterGlossaryTerms` (empty/null, abbreviation, case-insensitive name,
  body-text, no-match); UI flow for the search (filter, count announcement,
  empty state, clear restores all); an HTML-probe query asserting the search
  never parses as markup; and quiz coverage for the narrow-segment short
  label plus the preserved full `aria-label`.

## [0.3.0] — 2026-10-05

Visual polish pass — no behavior or logic changes, no new features.

### Added
- **Light theme:** a fully re-tokened paper theme (`#f6f4ec` background) via a
  `[data-theme="light"]` CSS-variable block covering every surface, including
  previously hardcoded dark hexes (disclaimer banner, selected options,
  score pills, badges). 🌓 toggle in the topbar; choice persists in
  `localStorage` (`ltl_theme`, dark default). Offline-safe: system font
  stacks only, no webfonts.
- **Diverging conviction scale:** journal score pills now tint red / amber /
  green by weighted score (<40 / 40–69 / 70+ on a 0–100 scale), in both themes.
- **Journal KPI strip:** "Theses tracked / Reviews due / Avg conviction" tiles
  above the watchlist, computed from in-memory entries, tabular numerals.
- **Typography:** Georgia serif display headlines; `tabular-nums` on score
  pills, due badges, allocation bars, KPI values, and the weighted preview.
- **Micro-interactions:** `button:active { scale(.96) }` press physics and a
  `view-in` transition restarted on every screen navigation; both disabled
  under `prefers-reduced-motion`.

### Notes
- Sparkline-per-entry was evaluated and skipped: the data model stores a
  single weighted score per thesis, no per-review score history — adding it
  would require a storage migration, out of scope for a visual-only pass.
- Footer version string corrected to v0.3.0 (it still read v0.1.0).

## [0.2.0] — 2026-10-04

Thesis revisit reminders + journal export.

### Added
- **Revisit reminders:** the journal form now has a "Remind me to re-check this thesis in" selector (1 / 3 / 6 / 12 months, default 6). Each entry stores `reviewAt` (ISO date). Watchlist entries past their review date show an amber "Review due" badge and surface above non-due entries; a summary line ("N theses are due for a re-check") appears when anything is due. Copy is educational throughout — reminders nudge you to re-read your own thesis, never to buy or sell.
- **Journal export:** "Export JSON" and "Export Markdown" buttons in the watchlist header download your entries via Blob (no dependencies, no servers). Markdown has one section per thesis (name, tickers, score + scored-count, written/review dates, thesis, falsify, tags) plus the educational disclaimer. Buttons disable when the journal is empty.
- New pure helpers exposed on `window.LongTermLens` for tests: `addMonths`, `todayISO`, `reviewAtOf`, `isReviewDue`, `journalToJSON`, `journalToMarkdown`, plus `reloadJournal` (re-reads localStorage and re-renders; also the hook a future cross-tab `storage` listener would use).

### localStorage versioning
- No key bump and no data wipe for this release. `reviewAt` is an additive optional field: entries saved before v0.2 have no `reviewAt` and gracefully default to `createdAt` + 6 months via `reviewAtOf()` (lazy migration on read). Key stays `longterm-stock-lens-v1`.

### Tests
- `tests/smoke.js` extended to 114 assertions: pure-logic coverage for `addMonths` (month-end clamping incl. leap year, year rollover, invalid input), `reviewAtOf` (explicit wins, legacy default, invalid fallback), `isReviewDue` (past/today/future, legacy entries), `journalToMarkdown`/`journalToJSON` content (headings, scores, dates, tags, falsify, disclaimer, empty case); UI flow for the interval selector (persisted `reviewMonths`/`reviewAt`, selector reset), due badge + due-first sorting (via direct localStorage backdate + `reloadJournal`), due summary line, and the export download contract (Blob types, dated filenames, object-URL wiring, exported content).

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
