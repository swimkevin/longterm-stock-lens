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
  (`QUIZ`, `BANDS`, `scoreRisk`, `GLOSSARY`, `weightedScore`, …) stays
  DOM-free and exposed on `globalThis.LongTermLens` for tests.
- **Data rules.** Contribution limits and tax figures are always labeled
  "verify at irs.gov"; localStorage schema changes need a version bump
  plus a migration or a fresh key.

## What agents may do

- Implement a briefed feature, refactor within the brief, add tests,
  fix bugs found by the suite or by review.

## What agents may never do

- Push or deploy without explicit human approval.
- Invent metrics, dates, events, or performance claims.
- Touch the compliance boundary — or reinterpret it.
- Expand scope beyond the brief ("helpful" additions are reverted).

## Verification

Every agent change goes through the same pipeline: full `npm test`
(114 assertions), then a human reads the complete diff before commit.
The suite catches regressions; the diff review catches judgment calls
the suite can't (wording, scope creep, honest labeling).

## Authorship

Architecture decisions stay human. The ADRs in `docs/adr/` are written
by the maintainer, not generated — they record judgment calls with real
tradeoffs and accepted costs. Kevin Song owns every result in this
repo: the agents are tools, the responsibility is his.
