# Testing strategy — Long-Term Lens

## What the suite is

Two files, run by `npm test` via `tests/run.js`: `tests/smoke.js` (488 assertions) and
`tests/edge-probe.js` (9 assertions) — **497 assertions**, all
passing. Counts are runtime assertion executions: every `assert()` call
that runs prints one `  ok` line, and looped assertions count each
execution, so the number tracks executed checks, not distinct
`assert()` statements in source. The published numbers are pinned by the runner:
`tests/run.js` (the `npm test` entry point) spawns both suites, streams their
output, counts runtime `ok` lines per suite, and fails the build if the README
badge (`tests-N%20assertions`) or the `(smoke A + edge probes B)` split disagrees
with the counts. The runner's own confirmation line is deliberately not
`ok`-prefixed so it can't pollute the count. This exists because v4.4.4 shipped
with a stale 453 badge and a stale per-suite split — the second assertion-count
drift incident. Numbers Kevin can see are numbers the suite owns.

smoke.js has two halves:

1. **Pure-logic assertions** — the DOM-free core exposed on
   `globalThis.LongTermLens` (`scoreRisk`, `makeIdea`, `convictionOf`,
   `sealThesis`, `applyReview`, `calibration`, `trackRecord`,
   `migrateStore`, `addMonths`, `reviewAtOf`, `isReviewDue`,
   `rescheduleReview`, `journalToJSON`, `journalToMarkdown`,
   `ideasLabel`, `GLOSSARY` with quizzes): conviction mapping from legacy
   shapes, sealing (first write seals; sealed copy never changes),
   calibration math (per-level rates, hi/lo split, insight thresholds),
   legacy migration, month-end clamping (incl. leap years), review-date
   computation, export content.
2. **jsdom UI boot** — loads the real `index.html` + `app.js`, asserts no
   script errors, clicks every nav tab, completes the investor-profile quiz
   (result persisted), quick-adds an idea, fills the thesis, taps
   conviction, deletes an idea end-to-end (click-through, not just
   presence), completes a check-in (verdict: played out for my reasons /
   moved for other reasons / too early to tell; thesis still holds /
   changed / done), verifies the check-ins queue sorts oldest-first,
   the Scorecard labels its denominator, a lesson quiz earns its badge,
   the export download contract (Blob types, dated filenames, object-URL
   wiring), and verifies `localStorage` round-trips including a seeded
   v0.x migration.
3. **edge probes** (`tests/edge-probe.js`) — rapid triple-click quick-add
   creates exactly one idea, 60-char and emoji-only names render as inert
   text, legacy v1 store migrates without losing ideas, and the export
   builders include the migrated idea.

## The rules

- **Assertions are added with every logic change.** The changelog shows
  the pattern: v0.1.1 extended the suite for the two-tap delete flow and
  partial-scoring disclosure; v0.2.0 extended it for review-date logic
  and exports. A feature without assertions is unfinished.
- **`npm test` gates every commit.** The suite must be green before
  anything is committed or pushed. CI (`.github/workflows/test.yml`)
  enforces the same on every push.

## Security testing

User-entered strings (idea names, tickers, tags, theses, assumptions,
notes) render via `textContent` or the `esc()` helper — never raw
`innerHTML`. The suite verifies this with a literal probe string,
`<img src=x onerror=alert(1)>`, saved as an idea name, an assumption, and
a note: it must render as inert text, produce no real `img` element, and
leave no `onerror` handlers anywhere in the idea detail.

## Honest limitations

- **No integration tests for price feeds — because there are no price
  feeds.** By design (see ADR 0004): the app fetches nothing, so there
  is nothing to mock, stub, or contract-test.
- jsdom is a dev-only dependency declared in `package.json`; the
  shipped site has zero dependencies, so the test harness can never leak
  into production.

## Real-browser verification (documented 2026-10-21, codified as a script 2026-10-23)

The jsdom suite is the primary gate. For the deployed bundle, the verified
recipe on this VM is codified in `tests/browser-pass.js` — run it with
`npm run browser-pass [bundle-dir]` (defaults to the repo root; pass the
dir the deployed files were curled into to test a live deploy). It asserts
12 checks plus zero console errors, and exits nonzero otherwise. Rule 2 of
the loop body ("live-test the deployed site") means: curl the deployed
`index.html`, `app.js`, `styles.css`, `version.txt`, diff against the local
tree (must be byte-identical), then run `npm run browser-pass <that dir>`.

What the script does under the hood:

1. `curl` the deployed `index.html`, `app.js`, `styles.css`, `version.txt`
   and `diff` against the local tree — they must be byte-identical.
2. Launch `/opt/meta-chromium/chrome --headless=new --no-sandbox` with
   `--remote-debugging-port=<port>`, a fresh `--user-data-dir` per run, and
   the bundle's `file:///…/index.html` as the initial launch URL. Do NOT
   navigate via CDP's `Page.navigate` and do NOT serve over localhost http —
   Chrome 152 blocks local-network navigations initiated that way
   (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`).
3. Drive with Node's global `WebSocket` against the page's
   `webSocketDebuggerUrl` from `/json/list` (no constructor options —
   the second argument is the protocols slot).
4. Assert: zero console errors, five tabs render, and click through the
   real flows (quick-add opens the draft detail directly — assert that,
   not a list row; seal produces the read-only block; filter narrows and
   restores). Screenshots via `Page.captureScreenshot`.
5. Kill Chrome on exit, using the `pgrep -f "[p]attern"` bracket trick so
   the cleanup never matches the script's own command line.

## Verification notes

Examples of the discipline above, from real history:

- **XSS probe renders as plain text.** During a live playtest of the
  idea detail, a probe string saved as an idea name, an assumption, and a
  note was verified to render as inert text — the escaping rule held in
  the new components too.
- **Footer version staleness.** The v0.3.0 polish pass shipped with the
  footer still reading v0.1.0; the fix (correcting it to v0.3.0) was
  caught in review and is now documented as a release-checklist item:
  version strings in `package.json`, the footer, and the changelog must
  agree before a release is called done.
