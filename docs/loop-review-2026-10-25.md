# External review: the Long-Term Lens autonomous improvement loop
Date: 2026-10-25. Reviewer: senior director, FANG AI org (outside the project).
Subject: the loop itself — the daily scheduled agent that tests, improves, and ships
the site — not the app. This is the second review; the first (2026-10-21) is in
docs/loop-review-2026-10-21.md. Standard: hire only if impressed.

## What the loop is
A daily scheduled agent session with a standing grant from the owner. The scheduler
holds only a pointer; the operating manual is `docs/loop-playbook.md` in the repo,
version-controlled like any other source file. Each run: reconcile the tree to
origin/main, run the suite, probe the live site, fix what it finds, and ship
through three ordered gates — local tests exit 0 on the exact pushed tree, CI
green on the pushed SHA, live version plus deployed-byte verification. The run is
logged in `docs/loop-log.md` with measurements and a metrics trend table.
Every ~4 runs a fresh-eyes adversarial audit (a separate agent, no live browser)
attacks the code; every ~8 runs the loop re-derives the product from its WHY,
re-questions its constraints, and subjects itself to a director-level review.

## Evidence base
- Loop log: 13 releases from v4.3.5 (402 assertions) to v4.4.8 (496), each with
  measurements, issues found/fixed, and a stated loop lesson.
- Playbook: 16 testing rules, 3 shipping gates, rollback/token/stop-condition
  runbooks, explicit risk tiering — each rule annotated with the incident that
  earned it.
- CI: `.github/workflows/test.yml` runs `npm ci` + `npm test` on every push to
  main and every PR; verified intact by the loop itself on a cadence.
- Audit body count: the audit cadence caught a C1 cross-idea draft contamination
  (v4.4.2), a Scorecard spot-price math error (v4.4.5), and a corrupt-store
  data-loss path (v4.4.8) — all missed by the suite at the time, all fixed with
  regression tests verified to fail on the unfixed code.

## Strengths (each verified, not claimed)
1. **Deterministic gates before model judgment.** The three gates are ordered,
   and the order is the point: local suite first (the API push path bypasses
   pre-push hooks, so loop discipline is the only front gate), then independent
   CI, then live verification. A run is not "done" until all three pass. This is
   the single most important design decision in the loop, and it is written down
   with its rationale.
2. **Independent verification, twice over.** CI re-runs the suite on a clean
   runner; adversarial audits attack blind spots the suite cannot see (the
   audit's findings were all default-path-only coverage gaps — the loop's own
   rule 13 names the failure shape). Two independent channels, not self-grading.
3. **Negative controls as discipline.** A regression test must be seen failing
   on the unfixed code before it ships (rule 14). This is the difference between
   a test suite and a security blanket, and it is rare in personal projects.
4. **Honesty instrumentation.** The assertion-counting method is defined in
   TESTING.md after drift was found; a test runner pins the README badge to
   live suite counts and fails the run on drift; quiet runs are reported as
   quiet, never dressed up. An owner who calibrates honesty hard gets a loop
   that calibrates honesty hard.
5. **Self-improvement as a system, not a slogan.** The loop's instructions live
   in version control, so every improvement is diffable and reviewable. The
   newest rules — a mandatory three-question retrospective (what did we learn /
   what nearly went wrong / what would have caught it earlier), deferred-item
   triage with dispositions, a suite time budget — were earned by real incidents
   in the last week, not brainstormed. The loop demonstrably learns: the Oct 21
   review's four gaps are all closed, and the Oct 25 rules close four more.
6. **Appropriate risk posture, stated explicitly.** Static site, no backend, no
   user data beyond the visitor's own localStorage; git history is the rollback
   story, and the rollback procedure is written down. Direct-to-main shipping
   is defensible here precisely because the loop says why — and says it would
   not transfer to a multi-user system.
7. **Operational knowledge compounds.** The CDP visual-QA recipe, the Chrome 152
   localhost lesson, the selector gotchas, the poll-interruption recovery —
   all written into runbooks instead of evaporating between sessions.

## Gaps (honest, with severity)
1. **Metrics are hand-maintained.** The trend table is edited by the worker each
   run. Counts are machine-pinned (the runner), but issue counts are manual and
   could drift. Low severity today; the fix is generating the table from test
   output, which the loop should do when it next touches the log format.
2. **Single-worker push access.** One agent holds push rights via a personal
   token. Appropriate for a static personal site; it would not fly for a
   multi-user backend, and the loop correctly does not pretend otherwise.
3. **Phone verification is human-gated.** The loop names Kevin's iPhone as the
   final visual gate and is honest that desktop passes are not phone passes.
   This is a stated blind spot, not a hidden one — the right handling.
4. **Prompt-injection surface.** The worker reads web content (the live site,
   audit probes). The exposure is bounded by task scope and REPORT-only
   delivery, but it is the loop's most consequential attack surface and
   deserves the periodic attention the audit cadence gives it.
5. **Audit cadence is time-based, not risk-based.** Every ~4 runs is a good
   default, but a large or risky change should trigger an audit immediately
   rather than waiting for the calendar. The loop should add a "big diff →
   audit now" trigger.

## What changed since the Oct 21 review
- Playbook rules 11–16 added: copy rules test-enforced, docs-with-numbers
  machine-checked, non-default paths pinned, negative controls mandatory,
  deferred-item triage, suite budget.
- The retrospective rule (three mandatory questions per run) and the
  deferred-triage rule are the direct implementation of the owner's directive
  to "keep asking for lessons" — the loop now interrogates itself by structure,
  not by mood.
- The pointer architecture held: the Oct 23–25 loop iterations changed the
  playbook without touching the scheduler body once.

## Verdict: HIRE
This loop is the strongest artifact in the project. It demonstrates the exact
skills a FANG AI org hires senior engineers for: designing a system with
verifiable gates instead of vibes, building independent verification channels,
instrumenting honesty, and improving the system itself from evidence. The app
is a good personal product; the loop is production engineering judgment. A
director reading the playbook, the loop log, and the audit body count can see
in one sitting that this engineer builds agents the way senior engineers build
services: with gates, runbooks, metrics, and a written rollback story. The
residual risks are stated, bounded, and appropriate to the blast radius.
Impressed — and the trajectory is still upward, which is the rarest signal of all.

## What would make it stronger still
- Generate the metrics table from test/CI output instead of hand-editing it.
- Add a "big diff triggers an audit now" rule alongside the time-based cadence.
- A second-model diff review before push (two-model rule) when the change
  touches data integrity or money-adjacent math.
- None of these block the verdict; they are the next iteration's work, which
  the loop is already structured to absorb.
