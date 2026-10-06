# ADR 0002: Vanilla JS, zero runtime dependencies

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The app is a static single-page site: six screens, a quiz, a glossary, and
a CRUD journal. The temptation is to reach for a framework out of habit.

## Options considered

1. **Framework (React/Vue + bundler).** Component model, ecosystem, but a
   build step, dependency tree, and supply-chain surface for a site that
   doesn't need reactivity beyond show/hide.
2. **Vanilla HTML/CSS/JS, zero runtime dependencies, no build step.**

## Decision

Option 2. `app.js` is one IIFE; `tests/smoke.js` runs in plain Node with
jsdom. `package.json` exists only for the dev test harness — the shipped
site loads no packages at all.

## Accepted costs

- Everything hand-rolled: no chart library, no component system, no router.
- Discipline is on the author: keep functions small, keep the DOM-free
  core pure, expose it for tests (see `AGENTS.md`).

## Rationale

The site's complexity doesn't justify a framework. Vanilla means no
dependency payload to download, parse, or audit; the app is genuinely
offline-capable; the test suite runs anywhere Node runs; and — for a
portfolio piece — the code is built to be read, not hidden behind
framework idioms.
