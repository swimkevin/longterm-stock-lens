# ADR 0001: Educational-only boundary (hard compliance rule)

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

This app teaches long-term investing research. Investment advice is a
regulated domain: recommendations, personalized guidance, and live pricing
all move a product toward obligations this project cannot and does not
want to carry.

## Options considered

1. **Soft boundary** — a disclaimer banner only, features unconstrained.
   Rejected: disclaimers don't constrain features; a recommendation engine
   with a disclaimer is still a recommendation engine.
2. **Educational-only as repo law** — the boundary is encoded in `AGENTS.md`
   as a hard rule that binds every contributor, human or agent.

## Decision

Option 2. The rule: no buy/sell recommendations, no real-time prices, no
price fetching, no personalized advice — anywhere in the app or docs.
Historical company examples appear only as labeled illustrations of past
growth, never as recommendations. The disclaimer appears in the hero
banner, the footer, and the README.

## Accepted costs

- Narrower feature space: no live screeners, no real-money portfolio
  tracking, no price charts of actual securities.
- The constraint shaped the data model: manual entry only, nothing to
  fetch, nothing to push.

## Rationale

Compliance is architecture, not copy. Encoding the boundary in
`AGENTS.md` makes it enforceable against future changes — including
AI-generated ones — rather than relying on whoever happens to remember.
