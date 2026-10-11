# Long Term Stock Lens — Roadmap

Educational only. No personalized advice, no live prices, no buy/sell
recommendations — see AGENTS.md. The roadmap respects that boundary.

## Next

- **Screenshots in the README** — placeholders are written; needs real captures (phone + desktop).
- **Calibration depth, only if the data earns it** — review-punctuality stats, per-trend calibration. No speculative stats before the reviews exist.
- **Category-level allocation guidance** — from the risk profile (educational; categories, never tickers). Deliberately deferred: sits close to the personalized-advice boundary; needs a framing that stays clearly educational.

## Shipped

### v3.0 — Calibration (2026-10-11)

"Your judgment, measured." Sealed theses (first save seals a timestamped, un-editable copy); reviews record the conviction held; Calibration view with per-conviction hit-rate bars + pattern insight; home calibration strip; review form shows the sealed original. Plus the delete-idea fix with a click-through regression test.

### v2.0 / v2.1 — Radical simplification (2026-10-09/10)

Idea page 9 sections → 4 (Thesis, Conviction, AI verify, Review); three overlapping scoring systems → one 1–5 conviction (legacy scores migrate automatically); empty-state onboarding; ⌘K quick-add; README rewritten as a 30-second pitch; CI fixed and green (Node 24).

### v1.1–v1.5 — Core feature, trends, Learn (2026-10-09)

AI-verify prompt generator as the final gate; quiet secondary nav (Ideas hero, everything else under "More"); inline SVG icons (no emoji); Trends & misses log; Learn expanded to 13 micro-lessons with quizzes; GitHub Actions CI on every push.

### v1.0 — Ideas → Research → Review redesign (2026-10-09)

Full redesign from a 10-product research report (Stockxy, Journalytic, Simply Wall St, Stockopedia, Stock Rover, Morningstar, Fatebook, Metaculus, Zogo, Finimize). Journal → Ideas home with due-for-review queue and quick-add; "did it move for your stated reason?" reviews; track-record calibration (the seed of v3.0); glossary → micro-lessons. v0.x journal data migrates automatically — nothing lost, localStorage key unchanged.

## Deferred

- **Compound-interest visualizer + DCA explainer** — interactive canvas chart, illustration-labeled. Deferred until the calibration core is proven by real use.
- **Review snapshots / sparklines** — per-review score history would unlock conviction-over-time views; requires a storage migration plan per AGENTS.md. Revisit only if calibration usage justifies it.
