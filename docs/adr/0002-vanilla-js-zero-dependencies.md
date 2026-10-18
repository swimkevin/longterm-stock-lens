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
2. **TypeScript (with or without a framework).** Static types would catch a
   real bug class in this codebase (shape mismatches across schema
   migrations, date-string handling). Cost: a compile step between the
   repo and the deployed site, which breaks the "open index.html and it
   runs" property, complicates the GitHub Pages deploy, and adds a
   toolchain every future contributor must adopt for a ~2,500-line app.
   Revisit if the data model grows past what disciplined JSDoc-free
   vanilla can carry — the test suite (400+ assertions, including
   migration round-trips) is currently doing the type system's job.
3. **Vanilla HTML/CSS/JS, zero runtime dependencies, no build step.**

## Decision

Option 3. `app.js` is one IIFE; `tests/smoke.js` runs in plain Node with
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
