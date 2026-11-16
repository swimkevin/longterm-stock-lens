# Director review — 2026-11-17 (third-person, ~8 runs since the 2026-11-09 review)

Standard: would a FANG AI hiring manager be impressed enough to hire on this
project alone? Evidence only; no faked verification.

## Verdict: HIRE-leaning, stronger than the 2026-11-09 review

The compounding artifact keeps compounding. Since the last review: 605 → 672
assertions green in ~34s, two more adversarial-audit rounds (round 5: 25
verified findings, 20 fixed; round 6: 7 verified, 5 fixed), and the loop's own
edge probe caught a latent silent-data-loss footgun — a bare `saveStore()`
call writing the literal string "undefined" into localStorage, which the next
load would have parsed as corrupt and blanked the app — that no audit round
had found. The negative-control discipline now survives full runs (rule 17,
after two aborted controls), and the loop keeps catching its own probe errors
before they become false findings: rules 20, 21, 23 and 24 are all
instrument-checks, not product fixes. A process that audits its own
instruments — and writes the lesson into a versioned playbook the same run —
is the strongest signal in the repo, and it is stronger now than it was on
November 9. Debloat still holds: app.js 3224 lines (fix-driven growth only),
styles.css 346, index.html 339, zero dead code, zero TODOs, zero code comments
in shipped source, copy rules test-enforced. The deployed site verifies live
every run: v4.5.8 byte-identical to the tree, all five tabs rendering real
content, the filter narrowing and restoring, no sec.gov links, the Roth figures
matching the verified source values.

## Gaps, stated honestly

- Phone gate: the loop has still never verified the site on a real phone.
  Screenshots are Chromium renders and say so; Kevin's iPhone remains the
  final visual gate and it has not been exercised by this loop. A recruiter
  opening the demo on a phone is the one path the loop cannot vouch for.
- The scoreboard's value is time-gated, not code-gated: the Scorecard only
  becomes impressive with real check-ins over calendar months. The live
  demo state is seeded test data (TestCo and friends, one verdict at 100%),
  not a track record — which is fine as a demo and must never be dressed up
  as more. No code change substitutes for that, and the loop must not
  manufacture sample history to look further along than it is.
- Open Kevin-call items, unchanged: check-ins cannot be backdated, browser-back
  navigation needs its own release, the JSON backup's trends exclusion needs a
  format decision, and sealing with an invalid spot price (warn / block /
  leave silent) was escalated to Kevin on 2026-11-07. None is a defect the
  loop should silently decide.
- Audit yield is shifting: round 6's two Mediums were the same bug shape
  twice — a render wiping transient state without capturing it first — and
  the product is stabilizing around a few hardening classes (import/load,
  draft preservation, re-render survival). The next fresh-eyes audit (due
  ~Nov 20) should probe new surfaces — the update-check path under hostile
  fetch responses, the self-heal guard under stale-cache states, the quiz
  under hostile profile data — rather than re-sweeping draft preservation
  for a third time.
- This review is written by the loop about its own project. The "third-person"
  posture is a discipline, not independence. The genuinely independent check
  the loop has is the fresh-eyes subagent audit, which has now run six rounds
  and keeps finding real issues — real independence, but narrow (source plus
  jsdom probes, no live browser). A hiring manager should weigh the audit
  record more than this document.
- Feature-to-WHY re-derivation (this review): every shipped feature still maps
  to the WHY — spot a trend, write down what you think before the outcome is
  known, check back and keep score. Nothing in the current feature set is a
  cut candidate on fresh grounds. The "Find companies" trend prompt and the
  AI second-opinion prompt are the only features that lean on an external tool
  (an AI chat); both serve the research step and stay inside the educational
  boundary. Learn's size (13 lessons plus 5 essays plus a wisdom archive plus
  accounts) remains the surface to watch: it earns its place only because it
  teaches the judgment the scoreboard measures — if it grows further, it
  should split or shrink, not accrete.

## What would strengthen it next

Real-device captures (Kevin's phone), a real first check-in cycle on a live
idea, and the browser-back release. All three are outside this loop's grant to
decide alone; the loop's job is to keep the tree green until they land.
