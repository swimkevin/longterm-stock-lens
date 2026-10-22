# Loop log — Long-Term Lens daily improvement

How the loop itself is doing. Each entry: what the run shipped, the measurements,
and what the loop learned about its own process. The loop improves when these
entries show it catching more, shipping cleaner, and needing fewer manual rescues.

## Metrics trend

| Date | Release | Assertions | Issues found / fixed | Dead code (fn/css/vars/state) | Notes |
|---|---|---|---|---|---|
| 2026-10-18 | v4.3.5 | 402 | audit → comment strip + README | — | zero-comment source, test-enforced |
| 2026-10-18 | v4.3.6 | 417 | audit → JSON import + 5 fixes | 0 / 0 / — / — | export was write-only |
| 2026-10-18 | v4.3.7 | 418 | deep test → autosave + fetch guard | 0 / 0 / — / — | 10-stock loop, math exact |
| 2026-10-18 | v4.4.0 | 434 | elevation: wisdom engine | 0 / 0 / — / — | quotes primary-sourced |
| 2026-10-18 | v4.4.1 | 436 | usability → post-quiz CTA | 0 / 0 / — / — | 134/134 jsdom + browser pass |
| 2026-10-19 | v4.4.2 | 451 | audit → C1 draft-contamination + 8 fixes | 0 / 0 / 2 undef / 1 write-only | audit caught what 436 missed |
| 2026-10-20 | v4.4.3 | 453 | debloat → dead --red-soft | 0 / 0 / 0 / 0 | CSS token scan test-enforced |
| 2026-10-21 | — | 453 | quiet run, nothing shipped | 0 / 0 / 0 / 0 | honest all-green |
| 2026-10-21 | v4.4.4 | 455 | self-heal behavioral test | 0 / 0 / 0 / 0 | negative control verified |

## 2026-10-22 — v4.4.4 (no bump; docs + test-infra: badge pinned to the suite)
- Shipped: (1) fixed a real docs drift — the README shields badge still read 453 after the v4.4.4 bump to 455, and the per-suite split `(smoke 444 + edge probes 9)` was stale (true split: 446 + 9 = 455); TESTING.md had the same stale numbers; (2) new `tests/run.js` — `npm test` now runs through a runner that spawns both suites, streams their output unchanged, counts runtime `ok` lines per suite, and FAILS the build if the README badge or the per-suite split disagrees with the counts. Negative control verified (badge 999 → runner exits 1 with the exact mismatch). The runner's own confirmation line is deliberately not `ok`-prefixed so it can't pollute the count.
- Also reconciled the tree: the 2026-10-21 rerun had pushed v4.4.4 via the GitHub API, leaving the local clone one commit behind with the shipped changes sitting uncommitted. Verified deployed bundle byte-identical to the tree, then `reset --hard origin/main` before working.
- Measurements: 455 assertions green via the new runner (446 smoke + 9 edge, 0 failed); debloat scan clean — 0 dead functions, 0 dead CSS classes (10 heuristic flags all false positives: compound classNames), CSS token scan test-green; real-browser pass on deployed v4.4.4 bytes: 17/17 PASS, 0 console errors (5 tabs render + activate on click, seal-era flows intact, no sec.gov, footer v4.4.4); Safari-compat inspection clean (unchanged code, no structuredClone/.at()/replaceAll/Intl/:has/backdrop-filter).
- Loop lesson: the API push path leaves the local clone behind the remote — every run must reconcile the tree to origin/main before working, comparing against the DEPLOYED bundle, not assuming. → New rule in the playbook.
- Loop lesson: this is the SECOND assertion-count drift incident (10-21: five docs disagreed; 10-22: badge + split + TESTING.md stale after a bump). Manual "update the numbers" steps decay; the runner now owns them. When a manual checklist step fails twice, it becomes a test.
- Debloat: app.js 2740 / styles.css 342 / index.html 339 lines; 0 dead anything.

## 2026-10-21 — v4.4.4 (manual loop rerun + gate hardening, Kevin's directive)
- Shipped: behavioral self-heal test (auto update check arms the one-shot session guard; repeat check does not re-arm). Replaces the source-grep pin with a click-through test; `checkForUpdates` exposed on LongTermLens as the test seam. Negative control verified: all 3 self-heal assertions fail with the guard key broken.
- Loop change (Kevin's ask): FIXES & PUSHING is now three explicit gates — GATE 1 local `npm test` exit 0 on the exact pushed tree (re-run after the last edit; pushing via API bypasses pre-push hooks), GATE 2 CI green on the pushed SHA (`.github/workflows/test.yml` runs `npm ci` + `npm test` on every push to main — confirmed), GATE 3 live version + deployed verification. v4.4.4 shipped through all three: local 455/455 exit 0, CI tests+pages success on afa8b67c, live version.txt 4.4.4.
- Measurements: 455 assertions green (was 453); debloat clean.
- Loop lesson: the self-heal — a safety mechanism the loop is told never to weaken — was only pinned by a grep. Safety mechanisms deserve behavioral tests; grep-pins are a smell. New rule of thumb: any test that only greps source is a candidate for a behavioral replacement.

## 2026-10-21 — v4.4.3 re-verified (quiet run, nothing shipped)
- Shipped: nothing — the bar held. All verification green on the live v4.4.3.
- Measurements: 453 assertions green (smoke 444 + edge probes 9); debloat scan clean — 0 dead functions, CSS custom-property scan test-enforced green, Safari-compat inspection clean (no structuredClone/.at()/replaceAll/Intl/:has/backdrop-filter), 0 write-only module lets; app.js 2739 / styles.css 342 / index.html 339 lines. Deployed bundle (index.html, app.js, styles.css, version.txt via curl) is BYTE-IDENTICAL to local v4.4.3. Real-browser functional pass against the deployed bytes: 15/15 PASS, 0 console errors (boot title, 5 tabs, quick-add → thesis autosave → seal read-only with exact text, Check-ins due queue, Scorecard render, Learn Accounts/Roth $7,500, no sec.gov, footer 4.4.3, filter narrows, empty filter restores). Visual QA: detail view clean and minimal; the h1 focus outline on navigation is the designed v4.4.2 focus-management behavior.
- Loop lesson: Chrome 152 blocks localhost http:// navigations via CDP (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS), even as the launch URL — the local-http-server route is dead on this build. The working recipe: curl the deployed files, verify byte-identical, load via file:// as Chrome's initial launch arg (not Page.navigate), fresh --user-data-dir per run, drive over CDP with Node's global WebSocket (no options arg — the protocols slot rejects objects). → Added to the loop body rule 8 and docs/TESTING.md.
- Loop lesson: `pkill -f "<pattern>"` matches the shell running it when the pattern sits in its own command line — it killed the operator's shell twice. Use `pgrep -f "[p]attern"` bracket-trick before kill. Recorded so the next run doesn't re-learn it.
- Loop lesson: the harness's "quick-add creates idea row" check FAILED because quick-add opens the draft detail directly (documented fineprint behavior) — the product was right, the check was wrong. Fixed the check to accept the designed flow. When a black-box check contradicts documented product behavior, suspect the check first.
- Loop lesson: the manual shell CSS var()/write-only scan is redundant with the test-enforced token scan — and my hand-rolled grep version had option-parsing bugs. The suite's scan is authoritative; manual heuristics decay (same lesson as 2026-10-20).
- Audit cadence: 2 runs since the 2026-10-19 adversarial audit — next fresh-eyes audit due ~2026-10-23/24 (4th run).
- Debloat: no changes; 0 dead anything.

## 2026-10-19 — v4.4.2 (adversarial-audit fixes)
- Shipped: C1 cross-idea draft-contamination fix (detail DOM stamps the shown idea's id; draft capture bails on mismatch) + click-through regression test; undefined CSS vars `--ink`/`--ink-2` → `--text`; assertion-count docs corrected everywhere with the method defined in TESTING.md; "44px targets" claim softened; write-only `activeReviewId` + dead `q1.innerHTML=''` removed; v2→v3 migration carries trends; Enter in trend-why textarea = newline; malformed `sealed` records dropped on import; screen navigation moves focus to the h1 + `:focus-visible` on all interactive selectors.
- Measurements: 451 assertions green (was 436; smoke 442 + edge probes 9); the C1 regression test was verified to FAIL on the unfixed code (and the focus test too); debloat scan clean — 0 dead functions, 0 dead CSS classes, 0 undefined CSS vars, 0 write-only lets; live five-phase pass on 4.4.1 all PASS (seal read-only, denominators, no sec.gov, plain labels, footer version).
- Loop lesson: the scheduled fresh-eyes audit (4th run since the last one) found a genuine critical data-integrity bug that 436 assertions and two deep-test rounds had all missed — the Check-ins-tab inline check-in path was never exercised with a foreign draft on screen. The ~4-run audit cadence is justified; keep it.
- Loop lesson: assertion counts had drifted because the counting method was never defined (runtime executions 436 vs static statements 426), and five docs disagreed with each other (382/391/418/425/434/436). Defined the method in TESTING.md (runtime `ok` lines) and fixed every number. For an honesty-calibrating owner, vanity metrics must be exactly right — a wrong badge is worse than no badge.
- Loop lesson: the debloat scan's function/class check missed both the undefined CSS vars and the write-only module state — both real issues. The scan now covers undefined `var()` references and write-only `let` state too. → Added as a rule in the loop body.
- Debloat: app.js 2741 → 2739 lines (guard + focus + sealed validation offset by dead-state removal); styles.css 342 → 344; 0 dead anything.

## 2026-10-20 — v4.4.3 (debloat + test-enforced token scan)
- Shipped: removed dead `--red-soft` custom property (light + dark definitions, 2 lines — leftover from v4.4.2's CSS-validity pass; `--red` itself is live and stays); new smoke-suite regression test asserting every `var(--x)` used in styles.css is defined AND every `--x` defined is used. The new assertion was verified to FAIL on the pre-fix stylesheet (`dead: red-soft`) and passes with the fix.
- Measurements: 453 assertions green (was 451; smoke 444 + edge probes 9); debloat scan clean — 0 dead functions, 0 dead CSS classes (5 candidates were false positives: compound classNames the heuristic missed), 0 undefined CSS vars, 0 unused-defined vars after fix, 0 write-only module lets; cleared-localStorage mid-session probe: in-memory store re-persists, no data loss, 0 script errors; Safari-compat inspection clean (no structuredClone/.at()/replaceAll/Intl, no :has/backdrop-filter); live five-tab pass on deployed v4.4.2 all PASS (seal read-only, badge behavior, Learn accounts) — v4.4.3 live-verify after push.
- Loop lesson: the 2026-10-19 entry claimed the debloat scan "covers undefined var() references and write-only let state" — but the scan was operator-manual, not test-enforced, so it found nothing new this run by luck of being run. Turned the custom-property half into a static regression test; it immediately paid off by catching a real leftover. Manual-scan rules decay; test-enforced rules compound.
- Loop lesson: the automated browser reported the idea title "renders as an inline-editable field" — code inspection shows the detail title is a plain `h1` with `textContent` (no input element, no input-like CSS). Treated as a misread, not a defect. When a black-box observation contradicts the source, check the source before filing.
- Loop lesson: caught myself drafting a CHANGELOG line claiming v4.4.3 was "live-verified" before pushing it — the pass had run on v4.4.2. Rewrote to state exactly what was verified where. For an honesty-calibrating owner, the changelog must never claim a verification that hasn't happened yet.
- Debloat: styles.css 344 → 342 lines; 0 dead anything remaining.

## 2026-10-18 — v4.4.1 (usability round)
- Shipped: post-quiz "Start spotting ideas →" CTA (round-2 deep test's top usability finding: the quiz result dead-ended new users).
- Measurements: 436 assertions green (was 434); round 2: 5-stock loop, Scorecard math hand-verified exact (75%), 134/134 jsdom checks + interactive browser pass, zero functional bugs; usability audit: all 5 tabs obvious in seconds, one clear primary action each — bar holds.
- Loop lesson: the usability audit's ranked observations worked — one high-impact item, two defensible non-issues, no vague vibes. Keep the "Muse-easy" audit as a standing deep-test phase.
- Debloat: 0 dead functions, 0 dead CSS classes (scan clean two rounds running).

## 2026-10-18 — v4.4.0 "Wisdom" (manual elevation round)
- Shipped: daily verified Buffett/Munger/Graham quote, 5 timeless-principles essays + wisdom archive in Learn, origin story in Profile, Scorecard empty-state wisdom, serif-italic quote typography.
- Measurements: 434 assertions green (was 418); app.js 2736 lines (was 2706); styles.css 342; 0 dead functions; 0 dead CSS classes.
- Loop lesson: new user-facing features got a deep-test round because the operator chose to, not because the loop required it. → Added rule: every new feature ships with its own deep-test round (jsdom click-through + live verification + assertions).
- Loop lesson: quote/content verification against primary sources was a manual standard. → Added rule: any new factual content (quotes, figures, claims) must cite a primary source; misattributed content is a release-blocker.
- Loop lesson: browser.browse flaked on tab opening; local Chromium over CDP + jsdom-serialized snapshots worked as a visual-QA fallback. → Added to testing playbook.

## 2026-10-18 — v4.3.7 (deep-test follow-ups)
- Shipped: thesis-draft autosave (800ms debounce), fetch guard in checkForUpdates.
- Measurements: 418 assertions green; deep test: 10 stocks, Scorecard math hand-verified exact (63%, per-level rates, +27% avg move), 259/259 jsdom checks, zero functional bugs; real-browser pass clean.
- Loop lesson: the fetch-guard issue (boot timer throwing where fetch is missing) was found by the operator during feature work, not by the loop's test suite — the suite only caught it once a new test's timing exposed it. → Added rule: the suite must be hermetic — no test may depend on timer/event-loop luck. The fetch guard fixed the product; the hermetic-suite rule prevents the class.
- Loop lesson: triage discipline held — conviction-editable-after-seal classified as intentional (caption-documented), back-button routing deferred to its own release rather than shipped risky.

## 2026-10-18 — v4.3.6 (independent-audit triage)
- Shipped: JSON import/restore, check-in form dedupe, orphan-trend reset, empty-save guidance, id hardening.
- Measurements: 417 assertions green; cold audit 7/10 (leans INTERVIEW).
- Loop lesson: an outside-eyes audit found what the loop's own testing missed (export was write-only with no restore path). → Added rule: schedule a periodic adversarial review (fresh-eyes subagent, no live browser needed) — the loop can't audit itself.

## 2026-10-18 — v4.3.5 (comment strip + README)
- Shipped: zero-comment shipped source (test-enforced), README "Why this exists", ADR 0002 TypeScript answer.
- Measurements: 402 assertions green.
- Loop lesson: constraints worth keeping should be questioned on a schedule, not just inherited. The "question previous constraints" pass kept all hard lines but strengthened their documented reasons.
