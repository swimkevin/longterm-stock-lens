# AGENTS.md — longterm-stock-lens

Repo conventions for AI coding agents.

- Vanilla HTML/CSS/JS, zero runtime dependencies, no build step. GitHub Pages-ready from `main`.
- **Compliance is a hard boundary, not a feature flag:** educational content only. Never add buy/sell recommendations, real-time prices, price fetching, or personalized advice. Historical examples are illustrations only and must be labeled as such. The footer + hero disclaimer stays.
- `app.js` is one IIFE. DOM-free data and pure functions (`QUIZ`, `BANDS`, `scoreRisk`, `GLOSSARY`, `weightedScore`) are exposed on `globalThis.LongTermLens` for `tests/smoke.js` — keep them DOM-free.
- User-entered strings render via `textContent` or `esc()`. Never raw `innerHTML` for user content.
- `npm test` must pass before any commit. Add assertions with every logic change.
- localStorage key: `longterm-stock-lens-v1`. Schema changes need a version bump + migration or a fresh key.
- Contribution limits / tax figures: always label "verify at irs.gov" and never present them as current without the check note.
