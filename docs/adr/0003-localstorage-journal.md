# ADR 0003: Conviction journal persists in localStorage

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The conviction journal is the app's only user data: theses, scores,
re-check dates. It needs to survive reloads without accounts.

## Options considered

1. **Backend + database.** Multi-device sync, sharing, but: accounts,
   auth, hosting cost, privacy surface, and a backend to maintain for a
   personal journal.
2. **localStorage under one versioned key** (`longterm-stock-lens-v1`).

## Decision

Option 2. One key holds the whole journal store. Schema changes get a
version bump plus a migration — or a fresh key. In practice, additive
fields migrate lazily on read (e.g. v0.2's `reviewAt` defaults legacy
entries to `createdAt` + 6 months via `reviewAtOf()`), so no data wipes.

## Accepted costs

- Single-device: no sync, no sharing, no backup beyond the JSON/Markdown
  export (v0.2).
- Storage limits and no cross-tab reactivity (a `storage` listener hook
  exists via `reloadJournal` if ever needed).

## Rationale

A personal research journal doesn't need a server. Local-first means
zero cost, zero latency, and privacy by construction — nothing leaves
the browser, which also reinforces the educational-only posture (no user
data to monetize or leak).
