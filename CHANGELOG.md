# Changelog — Long-Term Lens

## [4.4.6] — 2026-10-23

### Plain language, enforced
Kevin's call: the second-opinion prompt now speaks plainly — `MY THESIS:` → `What I think:`, and every label decapped (`IDEA:` → `Idea:`, etc.). A new assertion fails the build if any shouty `ALL-CAPS:` label returns. README "Run it locally" now documents every test entry point so anyone can verify the project, not just the owner.
- 1 new assertion; 466 assertions green.

## [4.4.5] — 2026-10-23

### Adversarial-audit fixes: import confirm, Scorecard spot-price math, check-in sanitization
The loop's scheduled fresh-eyes audit (4th run since the last one) found three real issues the suite had missed:
- **Import JSON now asks before replacing.** Picking a backup file used to wipe and replace the entire ideas list instantly — one wrong file meant irreversible loss. It now shows a confirmation naming both counts ("Replace your 3 ideas with the 1 from this file? This cannot be undone.") before replacing; canceling keeps every existing idea.
- **Scorecard math for price-less ideas.** `spotPriceOf` returned the first price-log entry regardless of its note, so an idea sealed *without* a spot price got its first check-in price mislabeled "$X when spotted →" and contributed a phantom 0% move into the Scorecard average. The spot price now resolves to the entry actually noted 'spotted'; without one, no move math renders and the average skips the idea.
- **Malformed check-in entries sanitized on import.** `normalizeIdea` now validates `reviewHistory` entries the way it already did for `priceLog`: entries with invalid dates are dropped, outcomes/reason matches coerced to their allow-lists, non-numeric prices nulled. A bad backup could previously crash the Scorecard sort (`undefined.localeCompare`) or render "NaN% on average".
- Also codified: the real-browser pass is now `tests/browser-pass.js` (`npm run browser-pass`), self-contained CDP harness — 12 checks + zero-console-error assertion against the deployed bundle.
- 10 new assertions; 465 assertions green (smoke 456 + edge probes 9). Live-verified on the deployed URL: browser-pass 12/12, 0 console errors.

## [4.4.4] — 2026-10-21

### Self-heal, behaviorally tested
The version self-heal (the loop-guarded auto-reload that rescues stale cached builds) was only pinned by a source-grep test. It now has a click-through behavioral test: stub fetch to serve a newer version, run the auto check, assert the one-shot session guard arms — then run it again and assert it does not re-arm. Negative control verified (all three self-heal assertions fail with the guard key broken). `checkForUpdates` is now exposed on LongTermLens as the test seam.
- 2 new assertions; 455 assertions green.

## [4.4.3] — 2026-10-20

### Debloat: dead CSS token removed, custom-property scan test-enforced
The daily debloat scan found `--red-soft` (light + dark definitions) defined but never used — leftover from v4.4.2's CSS-validity pass. Removed both definitions; `--red` itself is live (danger buttons, form errors, flags) and stays.
- **New regression test:** the smoke suite now statically checks styles.css — every `var(--x)` used must be defined, and every `--x` defined must be used. Verified the new assertion FAILS on the pre-fix stylesheet (`dead: red-soft`) and passes with the fix. This turns the manual debloat scan's custom-property check into an enforced rule.
- 2 new assertions; 453 assertions green. The v4.4.3 diff is CSS-only (dead token removal) plus the test itself; the deployed v4.4.2 passed the full five-tab live pass (idea loop, seal read-only, check-in, trends, filter, Learn — all clean; edge probes: triple-click dedupe, mid-flow reload, Check-ins badge behavior). Live version check on v4.4.3 after push.

## [4.4.2] — 2026-10-19

### Adversarial-audit fixes: a real data-integrity bug, CSS validity, docs honesty
The loop's scheduled fresh-eyes audit (static review, no live browser) earned its keep — it found one genuine bug the suite and two deep-test rounds had missed:
- **Cross-idea draft contamination (critical).** Saving a check-in from the Check-ins tab called `captureThesisDraft` against the *checked-in* idea while reading `#idea-detail`'s DOM — which still showed whichever idea was last opened. Typing a thesis draft on idea A, then checking in on idea B from the tab, silently overwrote B's thesis with A's draft (for a sealed B, the sealed record survived but the thesis shown in the Check-ins list was corrupted). Fixed: the detail renderer stamps the shown idea's id on the DOM, and draft capture bails unless the ids match. Ships with a click-through regression test (the test fails on the old code).
- **Undefined CSS variables.** `--ink` / `--ink-2` were used in three rules but never defined; replaced with `--text` (pixel-identical to the inherited rendering, now valid).
- **Docs honesty.** Assertion counts are now defined as runtime executions and corrected everywhere (451: smoke 442 + edge 9); the "44px targets" claim was softened to "generous touch targets" (only `.chip` enforces 44px).
- **Small hardening:** write-only `activeReviewId` removed; dead `q1.innerHTML = ''` removed; v2→v3 migration now carries `trends`; Enter in the trend "why" textarea types a newline instead of submitting; imported ideas with malformed `sealed` records are dropped instead of rendering "Locked in on undefined"; screen navigation moves keyboard focus to the screen heading and all interactive selectors have `:focus-visible` styles.
- 15 new assertions; 451 assertions green. Live-verified on the deployed URL (five-tab pass, seal/read-only, check-in, trends, filter, Learn links — all clean).

## [4.4.1] — 2026-10-18

### Usability round: post-quiz momentum
Round-2 deep testing (5-stock loop, Scorecard math hand-verified exact at 75%, 134/134 jsdom checks, interactive browser pass — zero functional bugs) found one first-run friction: the quiz result dead-ended at "Retake the quiz" with nothing pointing new users onward. The result panel now opens with a primary **"Start spotting ideas →"** button that lands on the Ideas tab.
- 2 new assertions; 436 assertions green.

## [4.4.0] — 2026-10-18

### Wisdom: Buffett, Munger & Graham, woven into the product
The app's founding insight is that judgment is a skill — so v4.4.0 puts the masters of judgment inside the product:
- **Daily wisdom** — a verified Buffett/Munger/Graham quote opens the Ideas page every day (deterministic rotation, 10 quotes). Every quote was verified against primary sources (Berkshire Hathaway letters, documented interviews); three popular misattributions were rejected and left out.
- **Timeless principles** — a new Learn track with five plain-English essays: circle of competence, margin of safety, Mr. Market, temperament beats intellect, and time the compounder. Each ends with a "Try it" that ties the principle to something the app asks you to do.
- **Wisdom archive** — all ten quotes with their sources live in Learn, with a note on why verification matters.
- **Why this exists, in the app** — the origin story (Bitcoin at ~$5k, the early-AI miss, "judgment is a skill, and skills improve with a scoreboard") now lives in the Profile explainer, where new visitors land.
- Scorecard's empty state carries a quiet reminder of why the record matters.
- 16 new assertions; 434 assertions green.

## [4.3.7] — 2026-10-18

### Deep-testing follow-ups: draft autosave + fetch-hardened update check
A two-layer deep test (jsdom harness: 10 stocks through the full loop with hand-verified Scorecard math — 63% overall, per-level rates and +27% average move all exact, 259/259 checks green; plus a real-browser pass: visual seal rendering, keyboard-only quiz + quick-add, downloads, due badge, Accounts figures) found no functional bugs. Two improvements shipped from its notes:
- **Thesis drafts now autosave as you type** (debounced 800ms into the store, no re-render, no focus loss). Previously a reload with zero intervening clicks lost the draft; any conviction tap/date change/check-in already persisted it, and now typing alone does too.
- **Update check no longer assumes `fetch` exists** — it bails out (manual clicks show "Check failed") instead of throwing in exotic environments. This also makes the test suite hermetic: the boot timer's network call can no longer surface as a jsdom script error.
- Triaged and deliberately not changed: conviction stays editable after sealing by design (the caption says the number is what future check-ins look back at; check-ins snapshot it per check-in, so history can't be rewritten); browser-back navigation is recorded in ROADMAP.md as needing its own careful release.
- 1 new assertion; 418 assertions green.

## [4.3.6] — 2026-10-18

### Independent-audit fixes (fresh-eyes review scored 7/10, leans interview)
An independent cold audit (adversarial QA + FANG hiring-manager review, no prior context) found one major gap and four minor bugs. All fixed, all test-pinned:
- **Import your JSON backup** (the major): export was write-only — no UI or function could restore a backup, which undercut the local-first story ("what happens when I get a new phone?" had no answer). "Your data" now has Import JSON: validates the file, normalizes/migrates every idea through the same path as the loader, and replaces the idea list with feedback. Pure `importIdeasFromJSON` exposed for tests; export → import round-trips.
- **Double "Check in now" stacked two forms** on the idea page (the Reviews-tab path deduped, the detail path didn't). The detail handler now removes any existing form before appending.
- **Deleting an idea orphaned its trend** in "Became ideas" with a permanently disabled button. `deleteIdea` now returns linked trends to Watching so they can be chased again.
- **Saving an empty thesis was a silent no-op** (worse: the button still flashed "Saved ✓"). Empty saves now show inline guidance and focus the field; nothing seals.
- **Tampered stores could yield id-less ideas**; `normalizeIdea` now assigns a missing id (new shared `newId` helper, also used by `makeIdea`/`makeTrend`).
- Removed dead `thesesLabel` (exported, never called) — a re-sweep confirmed every other low-count function is genuinely referenced (event listeners, `.map()` callbacks, tests).
- Fixed leftover first-person copy in the analyze tip ("paste it here in chat with me…").
- 15 new assertions; 417 assertions green. Deliberately not changed: the single-IIFE structure stays (native modules would break the open-it-and-it-runs property), and README screenshots still need the owner's phone.

## [4.3.5] — 2026-10-18

### Comment-free source, stronger README, ADR answers "why not TypeScript" (owner-directed polish)
- Shipped source is now zero-comment by rule, not by habit: removed the last code comments in `app.js`/`styles.css` (the why lives in `docs/adr/`, `CHANGELOG.md`, and commit messages), recorded the rule in `AGENTS.md`, and added a test that strips string literals and fails the build if any `//` or `/* */` comment appears in shipped source. 2 new assertions; 402 assertions green.
- README rewritten around a proper "Why this exists" section (the Bitcoin-at-$5k and early-AI misses, and why the miss was trust in one's own judgment rather than information), with the engineering notes now pointing at the ADRs and naming the test-enforced owner rules.
- `docs/adr/0002` now answers the question a hiring manager would ask: why not TypeScript — accepted costs named, revisit condition stated (test suite currently doing the type system's job).

## [4.3.4] — 2026-10-18

### "Check in on" date hardening (live-regression follow-up)
- The live regression check typed a date into the idea page's "Check in on" picker and the store accepted `0001-02-18` — `setReviewAt` only checked the `YYYY-MM-DD` shape, so any four-digit year sailed through. It now rejects implausible dates: years outside 2000–2100, impossible months/days, and non-round-tripping calendar dates (Feb 30, non-leap Feb 29), returning `null` so the picker reverts. DOM-free `isPlausibleLocalDate` helper exposed for tests. 9 new assertions; 400 assertions green.

## [4.3.3] — 2026-10-17

### Scorecard empty-state copy fix (live-regression follow-up)
- When check-ins existed but none had a verdict yet (all "too early to tell"), the Scorecard's verdict card read "No check-ins yet." — wrong, and confusing next to the check-in count. It now reads "No verdicts yet …" when verdict-less check-ins exist, keeping the original "No check-ins yet." copy for the true zero state. 3 new assertions; 391 assertions green.
- Test harness: `tests/edge-probe.js` (rapid-click idempotency, oversized/emoji names, legacy-store migration, export contents) is now part of `npm test` and CI instead of a kept-aside script; its jsdom import no longer points at another project's node_modules.

## [4.3.2] — 2026-10-14

### Debloat + docs brought current with the v4.x reality
- Removed dead CSS (`.review-controls` — two rules with no call sites anywhere; verified by sweep, not by eye).
- `docs/ARCHITECTURE.md` corrected: the screen table listed `trends` and `accounts` as separate tabs (gone since v4.0.0), and the sealed-thesis note described a working-copy edit path (gone since v4.1.0). Now documents the five tabs, read-only-after-sealing, local-date stamps, and the real 377-assertion count. `docs/TESTING.md` updated the same (377 count, check-in flow wording, jsdom as a declared local devDependency).
- `docs/ROADMAP.md`: category-level allocation guidance moved from Next to Deferred per the owner's explicit deprioritization; a compact v3.1 → v4.3.1 shipped entry now points to the changelog instead of stopping at v3.0.
- README Roadmap section now says what the app will *not* add — cloud sync (local-first is the point), live prices, stock recommendations — as deliberate trade-offs, not gaps.

## [4.3.1] — 2026-10-13

### "Delete my data" also clears the quiz (live-regression follow-up)
- Deleting all data cleared the stored profile but left the in-memory quiz answers pressed and the old "Saved … Score 18/18" result panel on screen. The wipe now resets the quiz answers, hides the result, and re-renders the quiz, so the Profile tab is genuinely fresh after a delete. 2 new assertions; 377 assertions green.

## [4.3.0] — 2026-10-13

### Thesis draft survives re-renders (live-regression fix, owner-visible)
- The live regression check caught that tapping "How sure are you?" rebuilt the idea page and silently discarded anything typed into the not-yet-saved thesis form — a Save after that sealed nothing, and the typed "What would prove me wrong" text was gone for good. Conviction taps, review-by date changes, and check-in save/cancel on the idea page now capture the thesis draft (words, prove-me-wrong, spotted-price) into the store before any re-render; the form reopens with the draft intact.
- Profile hero now carries the educational-use disclaimer banner (it is the first screen new visitors see; previously only the Ideas hero had it).
- The Check-ins due-count badge's screen-reader label now says "N check-in(s) ready" instead of the work-sounding "review(s) due".
- 8 new assertions pin the fix: draft survives a conviction tap (words + price), seals cleanly on Save, profile hero carries the disclaimer, badge label uses plain language. 375 assertions green.

## [4.2.0] — 2026-10-12

### Profile explains itself (owner-directed)
- The Profile tab — the first thing a new visitor sees — was the least explained page in the app. Its three-line disclaimer subtitle is now one line: "Six questions, one honest answer: how much of your money belongs in index funds — and how much in your own picks?"
- Three dropdowns under it, the first open: **How this works** (6 questions → score 0–18 → one of four bands → index core + conviction slice, with a link onward to Learn's accounts section), **The four bands** (each band's split and a one-line gloss), **What this isn't** (not advice, nothing buys/sells/moves, retake when life changes).
- Result-panel copy tightened to match (saved-date lines and the risk reminder are half their former length). A test pins the explainer's band figures to the live BANDS data so the two can never drift apart.

## [4.1.0] — 2026-10-11

### Dual-persona audit fixes (professional investor + FANG hiring manager)
- **Sealing is now real in the UI.** The audit caught that a sealed thesis stayed editable and the second-opinion prompt read the editable copy — three surfaces claimed "locked" while the page allowed edits. Now: once saved, "What you think" is a read-only locked view (your exact words + the date), and the prompt is built from the sealed record. Check-ins remain the place where thinking updates.
- **Dates are local, not UTC.** todayISO() used toISOString(), so anything stamped after ~8pm Eastern landed on tomorrow — fatal for a timestamped journal. It now builds the local date; every stamp (opened, sealed, check-ins, quiz, exports) heals through the one function.
- **Scorecard denominators labeled.** Headline rates now say "of your check-ins with a verdict" and name the too-early check-ins they exclude — on the Ideas strip and the Scorecard.
- **Price context.** Check-in form previews the move live as you type a price ("+25% vs $84 when you spotted it"); the Scorecard gains "The price side of your record" — the average move across priced check-ins, labeled as journal math, not a benchmark.
- **Scale + findability.** Ideas tab gets a name/ticker filter; Learn gets an "On this page" jump row so the Accounts/Roth section is no longer buried.
- Audit verdicts: hiring manager — INTERVIEW; investor — all 2026 figures verified against the brief, both AI prompts called paste-worthy. 354 assertions.

## [4.0.0] — 2026-10-11

### Five tabs: the structure now matches the funnel (owner-directed)
- **Trends merged into Ideas.** They were two halves of one funnel on separate pages — a trend is an idea before it has a company. The Ideas tab now runs: quick-add → Trends & misses (spot/find companies/became ideas/missed waves) → all ideas → your data. Idea pages keep their "from trend:" link, which now jumps to the trends section of the same tab.
- **Accounts merged into Learn.** Lessons and account/tax reference are both "understand it" content; the Roth window section from 3.8.0 sits at the end of Learn under "Accounts & the Roth IRA".
- **Profile first.** Tab order is Profile · Ideas · Check-ins · Scorecard · Learn, and a first-time visitor (no saved profile) lands on Profile — the profile frames everything else. Returning users open on Ideas.
- 332 assertions, updated for the new structure (landing rule, merged sections, tab integrity).

## [3.8.0] — 2026-10-11

### Accounts: the Roth income window, with the real 2026 IRS numbers
- New section **"The Roth income window — and how to get under it"** on the Accounts tab, verified against IRS Notice 2025-67 (IR-2025-111): contribution $7,500/$8,600; single phase-out $153,000–$168,000 MAGI; joint $242,000–$252,000; the ramp (not a cliff) explained.
- **How to qualify:** pre-tax 401(k) contributions (up to $24,500) lower MAGI dollar-for-dollar — with a worked example ($172k salary → ~$147.5k counting → full Roth unlocked); HSA via payroll ($4,400/$8,750, Rev. Proc. 2025-19); pre-tax premiums/FSA. What does NOT work: Roth 401(k), itemized deductions, and the deductible traditional IRA (added back by design).
- **Backdoor Roth** explained with its two real cautions (pro-rata rule, Form 8606), plus the timing asymmetry (401(k) moves through that year's paychecks; IRA contributions run to April 15, 2027). Verify-at-irs.gov labels throughout; 331 assertions.

## [3.7.0] — 2026-10-11

### Navigation rebuilt (owner-reported on iPhone) + stale-cache self-heal
- **The "More" dropdown is gone.** On the owner's phone it surfaced as an empty page: a mixed stale-cache state (new HTML, older cached script) left the menu unwired, and the Profile page appeared only after an update-check forced a reload. Navigation is now seven dedicated, always-visible tabs — Ideas, Check-ins (with the due badge), Scorecard, Trends, Profile, Learn, Accounts. On phones the tabs form their own scrollable row under the brand, always on screen; Profile is one tap, never buried. No menu state, no dropdown, nothing to break.
- **Self-healing updates:** the silent boot-time version check now reloads the app once (session-guarded against loops) when it finds a newer version, instead of waiting for a manual check — a phone can never sit on a half-old build again. The manual Check for updates flow is unchanged.

## [3.6.1] — 2026-10-11

### Fixes from the mobile full audit (verdict: strong hire / ship; these close its findings)
- **Legacy saved profiles are honest now.** A result saved before answers were kept (e.g. from v3.5) rendered with copy claiming "your answers are filled in below" when none were. It now says the result predates answer-saving and invites a fresh pass; the form also starts blank instead of leaking in-session selections.
- **Save confirmation at submit time:** the quiz result shows "Saved <date>" the moment you submit, not only after a reload.
- **Copy:** two prompt hints read "Paste it into Muse or Claude" — now "ChatGPT or Claude".
- 325 assertions (5 new).

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
