# Loop log — Long-Term Lens daily improvement

How the loop itself is doing. Each entry: what the run shipped, the measurements,
and what the loop learned about its own process. The loop improves when these
entries show it catching more, shipping cleaner, and needing fewer manual rescues.

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
