# AI-assisted development on this repo

This repo is built with AI coding agents, deliberately and with
guardrails. The workflow is the point: prompting, reviewing, and testing
agent-written code is itself an engineering skill, and this project
practices it in the open.

## Executable guardrails

`AGENTS.md` is the contract every agent works under. It is not a style
guide — it binds behavior:

- **Compliance boundary is hard law.** Agents may never add buy/sell
  recommendations, real-time prices, price fetching, or personalized
  advice. Historical examples stay labeled as illustrations; the footer
  and hero disclaimers stay. This rule outranks any feature request.
- **Test gate.** `npm test` must pass before any commit; every logic
  change ships with new assertions.
- **Rendering rule.** User-entered strings render via `textContent` or
  `esc()` — never raw `innerHTML`.
- **Layering.** `app.js` stays one IIFE; the DOM-free core
  (`QUIZ`, `BANDS`, `scoreRisk`, `GLOSSARY`, …) stays
  DOM-free and exposed on `globalThis.LongTermLens` for tests.
- **Data rules.** Contribution limits and tax figures are always labeled
  "verify at irs.gov"; localStorage schema changes need a version bump
  plus a migration or a fresh key.

## What agents may do

- Implement a briefed feature, refactor within the brief, add tests,
  fix bugs found by the suite or by review.

## What agents may never do

- Push or deploy outside the loop's standing grant (see below).
- Invent metrics, dates, events, or performance claims.
- Touch the compliance boundary — or reinterpret it.
- Expand scope beyond the brief ("helpful" additions are reverted).

## The daily loop (the actual shipping model)

A scheduled improvement loop runs daily under the owner's standing
grant (2026-10-14): it may ship fixes directly to `main`, but only
through three gates — local `npm test` green on the exact pushed tree,
CI green on the pushed SHA, live bundle byte-identical and verified on
the deployed URL. The operating manual is
[docs/loop-playbook.md](loop-playbook.md); the per-run record is
[docs/loop-log.md](loop-log.md).

What keeps an autonomous loop honest:

- **Held-out golden suite** (`tests/golden.js`) — owned by fresh-eyes
  audit runs; the loop runs it but never edits it, so a fix can't
  certify itself.
- **Negative controls** — every regression test must be seen failing
  on the unfixed code before it ships.
- **Fresh-eyes audits** every ~4 runs and **director reviews** every
  ~8 runs — the loop cannot audit itself.
- **Counts are machine-pinned** — `tests/run.js` fails the build if
  the README badge or per-suite split disagrees with runtime counts
  (see [docs/TESTING.md](TESTING.md) for the method).

## Authorship

Architecture decisions stay human. The ADRs in `docs/adr/` are written
by the maintainer, not generated — they record judgment calls with real
tradeoffs and accepted costs. Kevin Song owns every result in this
repo: the agents are tools, the responsibility is his.
