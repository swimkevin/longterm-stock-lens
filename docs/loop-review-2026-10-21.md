# External review: the Long-Term Lens autonomous improvement loop
Date: 2026-10-21. Reviewer: senior engineer, FANG AI org (outside the project).
Subject: the loop itself — the daily scheduled agent that tests, improves, and ships the site — not the app.

## What the loop is
A daily cron-spawned agent session with a standing grant to test, fix, and ship a static
educational site (vanilla JS, GitHub Pages), plus a mandate to improve its own operating
instructions each run. Evidence base: the cron body, docs/loop-log.md, docs/TESTING.md,
.github/workflows/test.yml, and the shipped history v4.3.5–v4.4.4.

## Strengths (genuine, verified)
1. **Deterministic gates before judgment.** Local suite → push → CI → live verify, now
   codified as three ordered gates (2026-10-21), with the rationale written down
   (API pushes bypass pre-push hooks, so loop discipline is the only front gate).
   This is the correct shape.
2. **Independent backstops, not self-certification.** CI runs the suite on every push;
   fresh-eyes adversarial audits run on a ~4-run cadence. The v4.4.2 C1
   data-integrity catch — missed by 436 assertions and two deep-test rounds — is
   evidence the audit cadence works. Process with a body count behind it.
3. **Honesty instrumentation.** Assertion-counting method defined in TESTING.md after
   drift was found; per-run loop log with measurements; explicit norm that a quiet
   run must not claim improvements. For an owner who calibrates honesty hard,
   this is the right culture.
4. **Appropriate blast radius.** Static site, no backend, no user data beyond
   localStorage; git history is the rollback story. Daily direct-to-main shipping
   is defensible here — and the loop's "when in doubt, CUT" bias matches the risk.
5. **Operational knowledge compounds.** The CDP visual-QA recipe, the Chrome 152
   localhost lesson, and the hermetic-suite rule are written into runbooks, not
   lost between sessions.

## Gaps (honest)
1. **The loop's instructions live outside version control.** The cron body is the
   loop's source code, but it is not diffable, reviewable, or portable — it lives
   in the scheduler, not the repo. A director will ask "where is the design doc
   for the system that ships to production every day?" The answer should be a file
   in the repo. This is the single biggest gap.
2. **No written rollback procedure.** Git history implies revert-and-push works,
   but no runbook states it. A daily-shipping loop should have the rollback path
   in one paragraph.
3. **Metrics are narrative, not tabular.** The loop log records per-run numbers,
   but no trend table exists. A 30-second scan should show assertions,
   issues-found, and dead-code counts over time.
4. **Prompt bloat risk.** The cron body grows with every lesson (~100 lines and
   climbing). Instruction dilution is a real failure mode: the more rules, the
   less attention each gets. Mitigation: stable core in the repo playbook,
   run-specific context in the scheduler, periodic compaction.
5. **Token dependency is undocumented.** Shipping depends on a GitHub PAT via a
   helper script. If the token is revoked, the loop silently cannot ship. The
   failure mode and the recovery pointer belong in the playbook (no secrets
   in the repo, ever).
6. **Stop conditions are implicit.** The Oct 13 pause / Oct 14 re-enable history
   is in the cron body, but "a pause means full stop, no helpful runs" should be
   an explicit rule, not tribal knowledge.

## Recommendations (priority order)
1. Move the loop's operating manual into `docs/loop-playbook.md` in the repo.
   The cron body becomes a thin pointer: read the playbook, follow it, update it
   when the loop learns. Loop evolution becomes diffable and reviewable.
2. Add rollback + token-failure + stop-condition sections to the playbook.
3. Add a metrics trend table to docs/loop-log.md.
4. Slim the cron body to identity + pointer + per-run orientation; compact the
   DONE backlog on a schedule.

## Re-review (2026-10-21, after recommendations 1–4 were implemented)
- The playbook exists in the repo and the scheduler points at it: loop
  instructions are now version-controlled. Gap 1 closed.
- Rollback, token-failure, and stop-condition sections are explicit. Gaps 2, 5, 6 closed.
- Metrics table added; assertions 417→455 across 8 releases, issues-found and
  dead-code counts visible per run. Gap 3 closed.
- Cron body slimmed from ~100 lines to a pointer; compaction rule added for the
  DONE backlog. Gap 4 mitigated with a standing rule.
- Residual risks, stated plainly: the loop still trusts a single daily worker
  with push access (appropriate for a static personal site; would not fly for a
  multi-user backend); prompt-injection surface exists wherever the worker reads
  web content (bounded by the task scope and the REPORT-only delivery rule).
- Verdict: the loop is now the kind of system a director-level hiring manager
  can inspect in one sitting — versioned instructions, measured runs, written
  rollback, explicit gates, and an honest log. It follows current best practice
  for agentic coding loops: deterministic gates before model judgment,
  independent verification (CI + adversarial audits), runbooks over tribal
  knowledge, and metrics that would embarrass vanity.
