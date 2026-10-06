# Testing strategy — Long-Term Lens

## What the suite is

One file, `tests/smoke.js`, run by `npm test`. **114 assertions**, all
passing. It has two halves:

1. **Pure-logic assertions** — the DOM-free core exposed on
   `globalThis.LongTermLens` (`scoreRisk`, `weightedScore`, `addMonths`,
   `reviewAtOf`, `isReviewDue`, `journalToJSON`, `journalToMarkdown`,
   `scoreCount`, `thesesLabel`, `GLOSSARY`): scoring-band boundaries,
   weight math, month-end clamping (incl. leap years), review-date
   computation, export content (headings, scores, dates, tags, falsify
   notes, disclaimer, empty-journal case).
2. **jsdom UI boot** — loads the real `index.html` + `app.js`, asserts no
   script errors, clicks every nav tab, completes the risk quiz, saves a
   journal entry, and verifies `localStorage` round-trips, review-due
   badges and sorting, and the export download contract (Blob types,
   dated filenames, object-URL wiring).

## The rules

- **Assertions are added with every logic change.** The changelog shows
  the pattern: v0.1.1 extended the suite for the two-tap delete flow and
  partial-scoring disclosure; v0.2.0 extended it for review-date logic
  and exports. A feature without assertions is unfinished.
- **`npm test` gates every commit.** The suite must be green before
  anything is committed or pushed. CI (`.github/workflows/test.yml`)
  enforces the same on every push.

## Security testing

User-entered strings (thesis names, tickers, tags, thesis text) render
via `textContent` or the `esc()` helper — never raw `innerHTML`. The
suite verifies this with a literal probe string,
`<img src=x onerror=alert(1)>`, saved as a journal entry: it must render
as inert text, produce no real `img` element, and leave no `onerror`
handlers anywhere in the watchlist.

## Honest limitations

- **No integration tests for price feeds — because there are no price
  feeds.** By design (see ADR 0004): the app fetches nothing, so there
  is nothing to mock, stub, or contract-test.
- jsdom is a dev-only dependency loaded from the sibling
  `poker-sparring` workspace install; the shipped site has zero
  dependencies, so the test harness can never leak into production.

## Verification notes

Examples of the discipline above, from real history:

- **XSS probe renders as plain text.** During a live playtest of the
  journal, an entry containing a literal XSS probe string was verified
  to render as inert text in the browser — the escaping rule held
  outside the test harness too.
- **Footer version staleness.** The v0.3.0 polish pass shipped with the
  footer still reading v0.1.0; the fix (correcting it to v0.3.0) was
  caught in review and is now documented as a release-checklist item:
  version strings in `package.json`, the footer, and the changelog must
  agree before a release is called done.
