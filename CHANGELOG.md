# Changelog — Long-Term Lens

## [3.6.0] — 2026-10-11

### Owner-reported fixes from real phone use
- **Saved investor profile is now a real state, not a footnote.** The quiz only saved the score; answers were lost on every visit, so Profile always looked blank. Now the answers save with the profile (`quizProfile.answers`), Profile opens on your saved result (band, allocation bar, date) with your answers already filled in — change any answer and re-submit to update, or Retake for a fresh start. Profile re-renders from the store on every visit.
- **EDGAR links removed everywhere** (footer, Learn resources, idea page) — outbound links are only for things the product itself uses (the chart). Filings guidance stays as plain text: read the company's own 10-K.
- 320 assertions (6 new: answers persisted, state restored on return, in-place update, no sec.gov links).

## [3.5.1] — 2026-10-11

### Fixes from the full click-through audit (25/25 functional pass; these close its top findings)
- **Delete my data restored:** the "Your data" section only had exports — a local-first app with no wipe is a real gap. Two-step arm pattern (same as Delete idea): first click arms with the consequence spelled out, second click wipes the store (ideas, check-ins, trends, profile) and confirms.
- **Thesis Save no longer leaves a stale window:** the old 900ms delayed re-render meant the second-opinion prompt (and the price field) showed pre-save content right after "Saved ✓" — copying the prompt in that window copied stale text. Save now re-renders instantly and flashes "Saved ✓" on the fresh button.
- **Idea page shows its own past check-ins** (date, outcome, the price move, your note) — a just-saved check-in is visible where you saved it, not only on the Scorecard.
- **Trend back-link:** ideas created from a trend say "from trend: …" in the header and link back to Trends.
- **Profile result has a "Retake the quiz" button** (clears selections, hides the result) instead of edit-and-resubmit only.
- 314 assertions (15 new).

## [3.5.0] — 2026-10-11

### The funnel release: trend → companies → ideas, with prices in the record
- **Find companies (Trends):** every watched/chased trend has a "Find companies" prompt — paste it into any AI to map the trend into categories with the public companies in each (no-recommendations rule built in). A mini form adds a company as an idea right there, linked to the trend (`trendId`), and marks the trend chased.
- **Price when you spotted it:** optional price field next to your words; the first save locks it into the (previously dormant) `priceLog` alongside the sealed thesis. Idea header and rows show "spotted at $X".
- **Price now at check-in:** optional field on the check-in form; past check-ins on the Scorecard show "$40.25 when spotted → $60.50 now (+50%)".
- **Chart link:** idea pages link "See the chart" (Google Finance) next to the EDGAR filings link. Still no price feed — prices are journal entries you write, which is what keeps the record honest.
- **Check in early:** upcoming ideas on the Check-ins screen get their own cards with a "Check in early" button that opens the idea with the form ready. Checking in was always allowed any time; now it's obvious.
- The second-opinion prompt now includes the spotted price. 299 assertions (28 new).

## [3.4.1] — 2026-10-11

### Critical fix: check-in buttons silently died in real browsers
- **Root cause:** `activeReviewId` was assigned in three places but never declared. In strict mode, real browsers throw on that assignment: the Check-ins screen handler died before opening the form, and the detail-page save handler died *after* writing data but before closing the form — so saves looked broken and invited duplicate check-ins. One-line fix: the variable is now declared with the app state.
- **Why tests missed it:** jsdom's script environment silently tolerates the undeclared assignment (verified by probe). Guards added so this class can't hide again: both flows now assert the form actually closes after save, and the suite asserts zero real script errors across the whole run (jsdom's `scrollTo`/`scrollIntoView` gaps filtered as environment noise).

## [3.4.0] — 2026-10-11

### Debloat pass
- **Deleted the legacy scoring engine** (~80 lines): SCORE_DIMS/labels/hints, DEFAULT_WEIGHTS, normalizeWeights, compositeScore, scoreBand — runtime machinery for the v1.x scorecard deleted in v2.0. Its one live job (migrating v1 `scores` to the 1–5 scale) moved into `normalizeIdea`, where all data normalization belongs; migration tests rewritten against the loader.
- **Deleted dead code:** CHECKLIST_ITEMS (deleted checklist's data), convictionPillClass, uid — all defined, never called.
- **Removed all comments** from app.js/styles.css and the stale test header (it advertised features deleted in v2.0).
- **README rewritten:** pitch + live demo + real CI badge up top, the loop in the app's plain language, engineering notes, local run instructions, project layout, and a "hardest lesson: deleting" section. Screenshot placeholders retained with capture instructions.
- 268 assertions (one removed with the deleted API; migration coverage kept via the loader).

## [3.3.0] — 2026-10-11

### Plain-language pass — no work words
- **Reviews → Check-ins**, **Calibration → Scorecard** (nav, headings, buttons, badges).
- **Thesis → "What you think"**; the sealed box now reads "What you wrote on [date] — locked in, exactly as you left it."
- **Conviction → "How sure are you?"** everywhere user-facing (detail, dots aria label, AI prompt's "HOW SURE I AM", exports).
- **"Due" is gone:** "Time to check in", "Check in on [date]", "Nothing to check in on right now."
- Check-in form: "Did it play out the way you said?" with answers "Yes — for my reasons / It moved, but for other reasons / Too early to tell"; outcomes "Still holds up / My thinking changed / Done with this one."
- Hero reframed: **"Spot what's next."** — a calm place for ideas about the next big thing (AI, AI infrastructure, crypto), per the product's purpose. Internal data model unchanged (no migration).

## [3.2.1] — 2026-10-11

### Design round 2 (from screenshot review)
- **Conviction selector** no longer shouts: selected = soft green tint + accent border/text instead of a solid saturated fill.
- **AI verify prompt** auto-sizes to its content — no internal scrollbar, no clipped top; it reads as a document.
- **One primary per view:** Thesis Save and Review now are secondary buttons now; Copy prompt is the detail page's single dark primary. (Tests updated to find buttons by label, not by `.btn.primary`.)
- **`color-scheme` per theme** so native controls (date picker, scrollbars) match light/dark.
- Due-queue empty state compacted.

## [3.2.0] — 2026-10-11

### Design refresh — one quiet system
- **New design tokens:** neutral zinc surfaces (was GitHub-dark cosplay + beige light theme), hairline borders, one green accent, amber/red reserved for warnings/danger. Blue survives only as the link color; tickers are now quiet muted caps instead of blue shouts.
- **Primary buttons** are now near-black/white (Claude/Linear pattern) instead of green-filled; accent green is for selection, conviction, and focus rings.
- **Idea rows:** no more traffic-light score pills — conviction is five calm dots (filled = accent) with an aria label.
- **Disclaimer banner** slimmed to a quiet hairline card with an amber tick (still present per the educational-boundary rule).
- **Removed ~120 lines of dead CSS** left over from deleted features (scorecard, checklist, assumptions, notes, price form).
- **Fixed undefined tokens:** `.cal-fill` and `.empty-title` referenced `--accent`/`--ink`, which were never defined — calibration fills would have rendered transparent with data.

## [3.1.0] — 2026-10-11

### Audit fixes — harsh external review round
- **Calibration honesty:** every percentage now carries its count ("80% — 4 of 5"); samples under 5 get an explicit "small sample — a hint, not a verdict" caution; pre-v3 reviews without conviction snapshots are footnoted as overall-only instead of silently vanishing from the level bars; empty level tracks restyled so they no longer read as full bars.
- **Thesis save feedback:** the Save button now confirms ("Saved ✓") — previously it saved silently with no visible state change.
- **Conviction captions:** the 1–5 scale explains itself ("1 · just watching — 5 · highest conviction; this number gets graded at review time").
- **AI verify prompt box:** 10 → 16 rows so the generated prompt isn't scrolled out of view.
- **Consistent headings:** dropped the serif/green heading mix for one clean sans treatment (accent color reserved for interactive states).
- **Research links:** idea detail now links to the company's SEC filings on EDGAR — primary sources, no data fetching.
- **Learn quiz:** a completed lesson re-opened now says "Completed — best: N / 3" instead of the contradictory "0 of 3 answered".
- **Profile quiz:** submitting with unanswered questions scrolls to and highlights the first missing question.
- **Docs:** ARCHITECTURE, TESTING, and ROADMAP rewritten — they described the deleted v1.x system (scorecard/checklist/composite).

## [3.0.0] — 2026-10-11

### The calibration rework — "your judgment, measured"
The app now does the one thing a chat AI structurally cannot: hold your sealed beliefs over time and grade them.

- **Sealed theses:** the first thesis save seals a timestamped, un-editable copy. Reviews judge you against your original words, never an edited version.
- **Calibration engine:** every review records the conviction you held; the Calibration view (formerly Track record) shows hit rates by conviction level (1–5 bars) plus a plain-language pattern insight. Home screen shows a calibration strip once you have scored reviews.
- **Review form shows your sealed thesis** ("What you believed on [date]") above the outcome question.
- **Hero repositioned:** "Your judgment, measured."

### Fixed
- **Delete this idea was broken** — it called `deleteIdea()`, which no longer existed after the v2.0.0 simplification. Restored, plus a click-through regression test (the old suite only checked the link existed).

## [2.1.0] — 2026-10-10

### Added — design principles from studying successful apps
- **Empty state as onboarding:** the zero-ideas screen now sells the loop ("Your next ten-bagger starts here") with a one-tap action, instead of a dead "No ideas yet."
- **⌘K / Ctrl+K quick-add:** keyboard-first capture from anywhere, Linear-style. Hint added to the quick-add panel.
- **README rewritten as a 30-second pitch** (hiring-manager research: the README is the first and often only thing read): personal story up top, "By the numbers", "What I learned", "Honest limitations", screenshot placeholders with instructions.

## [2.0.0] — 2026-10-09

### Changed — radical simplification
- **Idea page rebuilt for simplicity:** 9 sections → 4. Thesis (2 fields),
  Conviction (single 1–5 tap), AI verify, Review. Removed the 5-item checklist,
  3-row scorecard, assumptions, research notes, and danger zone from the UI.
- **One conviction score:** the three overlapping scoring systems (checklist-gated
  levels, 0–100 composite, pills) are now a single 1–5 tap. Old scores migrate
  automatically; no user data is lost.
- **Less text everywhere:** home hero, section intros, and helper copy trimmed
  to the essentials.
- app.js slimmed by ~290 lines of removed UI code.

## [1.5.1] — 2026-10-09

### Fixed
- **Score-band vocabulary collision:** the composite score bands reused the
  conviction-level vocabulary ("Strong conviction", "Growing conviction",
  "Watching", "Early research"), so an idea card could read "80/100 · Strong
  conviction · Conviction: Watching" — the same words meaning two different
  things in one line. Bands are now signal language, distinct from the
  conviction levels: "Strong signal" / "Moderate signal" / "Weak signal" /
  "Early days" (`scoreBand`, renamed from `convictLabel`; smoke assertions
  updated to match).

## [1.5.0] — 2026-10-09

### Added
- **Learn expansion (3 new micro-lessons, 10 → 13):** "Estimating value: three
  lenses" (discounted cash flow, comparables, reverse-engineering — the
  valuation framework the checklist's "Price vs. value?" item was asking for
  but never taught), "Reading a trend before the companies exist" (who pays
  whom for what, who captures the value — feeds the Trends & misses loop),
  and "Case study: an incumbent stumbles" (AMD/Zen vs. Intel delays, labeled
  as illustration only — the past informs pattern recognition, never
  predictions). Same 2-minute format: plain-English explainer, healthy
  patterns, red flags, 3-question check.

### Fixed
- Investor-profile "Last result" line showed the *previous* quiz result until
  a page reload; it now refreshes immediately to the result just saved.

## [1.4.3] — 2026-10-09

### Fixed
- The v1.4.2 bump missed the `APP_VERSION` constant in app.js (it was still
  '1.4.1'), so the deployed app falsely prompted "Update available — reload"
  even though it was current — a regression of the v1.4.1 update-check fix,
  caught by live verification. Added a smoke-test assertion that
  `APP_VERSION`, package.json, version.txt, the footer label, and the `?v=`
  cache-busters all agree, so a partial bump fails `npm test` loudly.

## [1.4.2] — 2026-10-09

### Fixed
- The "Save lesson" button on missed-wave trend cards looked dead: it saved
  correctly but re-rendered the section identically, so nothing appeared to
  happen. It now shows a transient "Saved ✓" confirmation (and briefly
  disables) instead of re-rendering — which also keeps your cursor in the
  textarea and preserves scroll position.

## [1.4.1] — 2026-10-09

### Fixed
- Update check no longer false-positives on a stale cached `version.txt`: it
  now compares versions semantically and only prompts when the fetched version
  is actually newer.

## [1.4.0] — 2026-10-09

### Added
- **SVG icon set for navigation:** every nav item (Ideas + the six More sections)
  now has a simple 15px stroke icon — lightbulb, check-circle, bar chart,
  trending-up, user, book, and card.

### Changed
- **Debloated:** ~155 lines removed — all code comments stripped, 37 lines of
  dead CSS deleted (old table/card/score styles no longer rendered), one dead
  JS wrapper removed. app.js is 2,361 → 2,206 lines of clean, self-explanatory
  code.

## [1.3.1] — 2026-10-09

### Added
- **Update check (poker-sparring pattern):** the footer now has a "Check for
  updates" button backed by a cache-busted `version.txt`. The app also
  auto-detects a newer version shortly after load and turns the button into
  "Update available — reload". One tap navigates to a fresh `?v=` URL, which
  bypasses the HTTP cache that was keeping phones on stale versions.
- **Brand goes home:** tapping the top-left Long-Term Lens logo returns to the
  Ideas home screen.

### Fixed
- AI verify prompt no longer claims scorecard weights are user-set ("my
  weight: 1%") — it reports honest normalized shares (33% each for new ideas).
- Scorecard helper text moved to its own line so it can't overlap the composite.

## [1.3.0] — 2026-10-09

### Changed
- **The idea page is a quick survey now, not a workbook.** Section order is
  thesis → checklist → scorecard → AI verify, with assumptions collapsed as
  optional and notes last. New ideas take minutes, not a research session.
- **No more manual price log.** Kevin's call: never ask the user to hand-look-up
  numbers like stock prices — the AI verify prompt covers the financial workup.
  (Existing priceLog data stays in stored ideas; it just isn't rendered or editable.)
- **Scorecard simplified:** the weight sliders are gone — dimensions are weighted
  equally and the composite still auto-normalizes. Tap 1–5, done.
- **Minimal footer:** "Long-Term Lens v1.3.0 · Your data stays in this browser."
  The build-tech brag is gone.

### Fixed
- **More menu on phones:** the dropdown used `position: fixed; top: auto`, which
  rendered as a broken empty strip under the header in mobile Safari. It now
  positions explicitly below the sticky header.

## [1.2.0] — 2026-10-09

### Added
- **Trends & misses log (under More → Trends).** The "spot a trend" stage of the
  core loop finally has a home: log a trend while it's early — the shift you can
  see but can't invest in yet — with no company required. Each trend is
  Watching, Missed, or Chased. "Make an idea" turns a trend into a research idea
  in one tap (thesis pre-filled with the original observation, back-linked via
  `trendId`). "Missed it" moves it to the Missed waves list, where a lesson field
  turns past misses into a pattern library for the next wave.
- Markdown export now includes a Trends & misses section when trends exist.
- `store.trends` collection; schema bumped 2 → 3 with an additive, lossless
  v2→v3 migration (`migrateV2ToV3`: ideas, glossary, and profile carry over
  untouched).

## [1.1.0] — 2026-10-09

### Added
- **AI verify (prompt generator): the final gate of the core flow.** New
  `buildAnalyzePrompt(idea)` (pure, tested) packages ticker, 3-field thesis,
  assumptions with confidence, checklist state, scorecard dims/weights/
  composite, conviction level, and review-by date into a structured
  verification prompt. The idea detail page gets an "AI verify" section with
  a readonly prompt preview and a Copy button (clipboard API with manual
  fallback). The prompt asks for metrics with cited sources/dates, bull/bear
  cases, red flags, and similar companies — analysis, never "should I buy".

### Changed
- **Quiet secondary nav:** Ideas is now the single hero tab; Reviews, Track
  record, Profile, Learn, and Accounts moved under a "More" menu. The
  reviews-due badge still surfaces inside More, and More highlights while a
  secondary screen is active.
- **SVG icons:** inline SVG lens brand mark and theme-toggle glyph replace
  the emoji; no emoji icons remain in the UI.
- **README + tests:** README rewritten to a concise senior-dev standard;
  smoke suite reorganized with a dedicated Analyze section — 212 assertions
  passing (was 165).

## [1.0.1] — 2026-10-09

### Fixed
- **Review loop is now always reachable (was: gated ~90 days).** The
  review-by date is editable directly on the idea detail page, and a
  "Review now" button opens the review flow inline any time — no more
  waiting for the date to arrive. Found by the v1.0.0 live QA pass.

## [1.0.0] — 2026-10-09

Full redesign around an **Ideas → Research → Review** loop, built from a
10-product research report (`research_notes/long-term-stock-research-apps-20261009-1229/report.md`:
Stockxy, Journalytic, Simply Wall St, Stockopedia, Stock Rover, Morningstar
Investor, Fatebook, Metaculus, Zogo, Finimize).

### Added
- **Ideas home:** quick-add (ticker/name only → draft idea), a "Due for
  review" queue sorted by review-by date, and an ideas list showing
  ticker, 0–100 composite score, conviction label, and review-due badge.
  The Reviews nav tab carries a due-count badge.
- **One-page research summary per idea** (fixed format, every idea):
  - Thesis template — Stockxy's opinionated 3 fields: "What I believe" /
    "Why I believe it (2–3 reasons)" / "What would prove me wrong".
  - Key assumptions — Metaculus-style "what has to be true", each with a
    confidence % (Fatebook quick-set chips: 10/25/50/75/90).
  - Pre-decision checklist — the Journalytic gate: moat, earnings trend,
    debt level, valuation sanity, circle of competence. Conviction can't
    be set above "Watching" until every item is checked.
  - Scorecard — StockRanks-style composite 0–100 on user-weighted Quality /
    Value / Conviction (weights auto-normalize, e.g. 50/30/20 == 5/3/2).
  - Manual price log — Stockxy's thesis-flags idea without a data feed:
    user-typed date + price rendered as a dated timeline. No fetching, ever.
  - Attached research notes.
- **Review flow** — every idea has a review-by date (~90 days out, editable).
  Reviews ask Stockxy's question: *"Did it move for your stated reason?"*
  with outcomes thesis intact / thesis changed / resolved. Resolved ideas
  stay listed with a Resolved tag so the record can't be edited away.
- **Track record** — counts of intact/changed/resolved reviews plus a
  calibration line: how often ideas moved for the stated reasons
  (Fatebook-style honesty score, "too early to tell" excluded).
- **Learn: micro-lessons** — the 10 glossary terms as Zogo-style 2-minute
  lessons (explainer + typical "healthy" patterns + red flags + 3-question
  quiz each), with search/filter and completion badges. Progress persists.
- **Accounts** — Finimize's "What's going on here? / Why should I care?"
  skeleton for Roth IRA, Traditional IRA/401(k), and taxable brokerage;
  2026 contribution limits (verify at irs.gov) and the index-funds section
  are kept.
- **Investor profile** — the risk quiz is renamed (nav: Profile) and the
  latest result is now saved to the store.
- **Migration:** legacy v0.x `{ entries: [...] }` stores migrate into the
  v2 ideas schema on first load and the upgrade is persisted. Old theses
  become ideas: thesis/falsify preserved in the template, the old 5-dim
  scores mapped onto the 3-dim scorecard (Quality←Fundamentals,
  Value←Valuation, Conviction←rounded mean of Product/Moat/Horizon) and
  kept verbatim as `legacyScores`, review dates preserved. localStorage
  key stays `longterm-stock-lens-v1`.
- **Exports** renamed to `longterm-lens-ideas-<date>.{json,md}` and cover
  the new structure (composite score, assumptions, price log, notes).

### Notes
- Patterns from the report deliberately **not** applied: inline `$ticker`
  tagging (notes are already per-idea — the marginal value is near zero),
  opportunity-cost tracking of passed-on ideas (no outcome model for ideas
  never researched), streak/XP mechanics (personal tool, no extrinsic
  rewards needed), percentile forecasts (overkill for a beginner journal),
  Portfolio X-Ray allocation bars (no position sizes in the data model).
- Cache-buster query strings added to `styles.css` and `app.js` (`?v=1.0.0`).

### Tests
- `tests/smoke.js` rewritten and extended to **163 assertions**: pure-logic
  coverage for `compositeScore` (weight normalization, partial scoring),
  `convictLabel`, `checklistComplete`/`canRaiseConviction`,
  `makeIdea` defaults, `applyReview` (outcomes, sanitization, status flip),
  `trackRecord` accuracy, and `migrateStore` (field preservation, score
  mapping, review-date fallback); UI flows for quick-add, thesis save,
  the checklist gate, scorecard + weight changes, assumptions with
  confidence chips, the price log (incl. invalid-price rejection), notes,
  the review flow (due queue, badge, start-review form, resolution),
  due-queue oldest-first sorting, track-record KPIs, a lesson quiz
  completion, migration through the real boot path, exports, and XSS
  probes through the idea name, an assumption, and a note.

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
