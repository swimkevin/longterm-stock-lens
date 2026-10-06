# ADR 0004: No backend, no price feeds — not even free ones

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Free market-data APIs exist. Using one would enable live watchlists,
price charts, and auto-updating quotes — the features a casual observer
expects from an "investing app."

## Options considered

1. **Free price API (e.g. stooq, Yahoo mirrors).** Live data, but: API
   keys and secrets to manage, rate limits, breakage, and — critically —
   the moment the app shows a live price next to a company name, it
   starts looking like advice infrastructure.
2. **No price feeds or external APIs of any kind.**

## Decision

Option 2. The app fetches nothing, at runtime or build time. There is no
network code in `app.js`; the only downloads are the user's own journal
exports.

## Accepted costs

- No charts of real securities, no auto-updating watchlist, no "current
  price" anywhere. The planned v0.4 compound-interest visualizer charts
  user-supplied hypothetical inputs, not market data.

## Rationale

This keeps the educational boundary (ADR 0001) airtight by construction
rather than by vigilance: you can't accidentally render a recommendation
next to a live quote if there are no quotes. It also means zero secrets
to manage and a fully offline app — the site works identically on a
plane.
