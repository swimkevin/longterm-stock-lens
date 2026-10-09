# Long Term Stock Lens — Roadmap

Educational only. No personalized advice, no live prices, no buy/sell
recommendations — see AGENTS.md. The roadmap respects that boundary.

## v1.0 — Ideas → Research → Review redesign ✅ (shipped 2026-10-09)

Full redesign from a 10-product research report (Stockxy, Journalytic,
Simply Wall St, Stockopedia, Stock Rover, Morningstar, Fatebook, Metaculus,
Zogo, Finimize). Journal → Ideas home (due-for-review queue, quick-add,
composite scores); one-page research summaries per idea (3-field thesis
template, assumptions with confidence %, pre-decision checklist gating
conviction, user-weighted 0–100 scorecard, manual price timeline, attached
notes); "did it move for your stated reason?" reviews (intact / changed /
resolved); track-record calibration; glossary → micro-lessons with 3-question
quizzes; accounts → "What's going on here? / Why should I care?" skeleton.
v0.x journal data migrates automatically into the v2 schema — nothing lost,
localStorage key unchanged.

## v0.4 — Compound-interest visualizer + DCA explainer ⬅️ NEXT

Interactive, hand-drawn canvas chart: starting amount, monthly contribution,
years, assumed growth — with a hover crosshair showing values at each point.
Dollar-cost averaging explainer alongside. All illustration-labeled, no live
data. (~80 lines of canvas: DPR scaling, gradient area fill, nearest-point
lookup on mousemove.)

## v0.3.0 — Design polish ✅ (shipped 2026-10-05)

Visual-only pass, no behavior changes: light (paper) theme with remembered
toggle, diverging red/amber/green conviction scale on score pills, journal
KPI strip (theses tracked / reviews due / avg conviction), Georgia serif
headlines + tabular numerals on all figures, press physics + view transitions
with `prefers-reduced-motion` respected. Offline-safe: system stacks only.
Sparkline-per-entry evaluated and skipped — no per-review score history in
the data model; would need a storage migration (a future v0.x may add review
snapshots, which would unlock it honestly).

## Design polish backlog (from competitive research, 2026-10-05)

Surveyed the best open-source/AI-built investing dashboards (Ghostfolio
9.4k⭐, OpenTerminal 1.4k⭐, Maybe). Remaining visual upgrades not yet built,
in priority order — fold into weekly sessions; keep the calm-research
identity, offline-first, zero-dep:

1. **Empty/loading states** — skeleton shimmer while "loading", never a
   blank panel; friendly inline notices, not modals.
2. **Honest footers + PWA shell** — persistent disclaimer line (already in
   footer), `manifest.json` + theme-color for installability.
3. **Review snapshots** — store each re-check's score with its date; unlocks
   honest per-entry SVG sparklines and a conviction-over-time view. (Requires
   a storage migration plan per AGENTS.md.)
4. **Flash-on-change ticks** — subtle pulse when a displayed figure updates
   (matters once live-ish computed figures refresh).

## Engineering credibility backlog (free, high resume signal)

- **GitHub Actions CI** — run `npm test` on every push/PR; passing badge in
  README. Free for public repos.
- **No-backend decision record** — localStorage is a legitimate local-first
  architecture for a personal journal; document the tradeoff in
  ARCHITECTURE.md. Real backend (Supabase/Cloudflare D1 free tiers) only
  when a feature needs it.
