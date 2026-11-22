# Director review — 2026-11-22 (v4.6.0)

Third-person review of the Long-Term Lens project as a FANG AI hiring
manager would see it, on the ~8-run cadence (last: Nov 17).

## Verdict: HIRE-leaning, stronger than Nov 17

The Nov 17 review said the strongest artifact was the process, not the
product's scale. This session closed the gap between the two by half:
the product now contains real judgment calls a hiring manager can point
at — a quiz that refuses to contradict the user's own answers, a
scoreboard that refuses to fabricate outcomes or to call a 1-vs-1 split
a pattern — and the process now contains the one thing it lacked, a
held-out proof set the implementer cannot edit. Either half alone is a
good portfolio piece; together they are the argument.

## WHY re-derivation

The WHY: a personal site so Kevin never misses another wave like
Bitcoin ~$5k or early AI; the miss was trust in his own judgment;
judgment is a skill, skills improve with a scoreboard. Mapping the
current feature set:

- Profile quiz + bands → frames the scoreboard. Serves it. The veto
  (v4.6.0) is the first change that makes the frame honest: a band
  that contradicted a disqualifying answer was actively anti-WHY.
- Trends → ideas funnel → serves it; the funnel is the "spot it" half.
- Sealed thesis + conviction → the record itself. Serves it.
- Check-ins + Scorecard → the scoring half. Serves it; the
  outcome-required save (v4.6.0) removes the one way the record could
  be fabricated by accident, and the insight gate (8+) stops the
  scoreboard from inventing patterns before the data earns them.
- Learn (13 lessons, principles, wisdom, accounts) → the teaching
  half. Serves it; the figures are re-verified against IRS sources
  this session and the one misquoted figure (IQ 25 → 125) is fixed.
- Nothing in the current set fails the mapping. Category allocation
  guidance stays cut; cloud sync, live prices, recommendations stay
  out by design.

## What changed since Nov 17

- v4.5.9: self-heal dirty-check hardening, quiz hostile-data
  consistency (699 assertions).
- v4.6.0: the deep review — 2 High / 5 Medium / 4 Low audit findings
  fixed, a held-out golden suite (24) and seeded property tests (13)
  added, playbook rules 27–32 (golden ownership, state-bound
  evidence, drift control, reproduction-required findings,
  micro-specs, dead-man's switch), LICENSE, docs rewritten to the real
  gates (753 assertions).

## Gaps, honestly

- **Phone gate.** Desktop/CI verification only, as always. Kevin's
  iPhone remains the final visual gate; nothing here claims otherwise.
- **Time-gated scoreboard.** The Scorecard's value is calendar time,
  not code. One real check-in exists in the demo data; the calibration
  insight now correctly refuses to fire until 8 answered check-ins.
  No code change accelerates this.
- **Live-region announcements** still deferred (needs a shared live
  region, its own round). **Back-button routing** still deferred
  (touches every nav path). **Backdated check-ins** and
  **seal-with-invalid-price** still Kevin's calls, not the loop's.
- **The hardening spiral is broken, not finished.** Four of the five
  releases before this one added zero product capability. This release
  adds behavior, not just guards — but the next audit cycle should
  still ask whether the highest-value work is a product-facing item
  from the deferred list rather than another guard round.

## What would make this a hire on the repo alone

It is close. The remaining distance is not more guards — it is
evidence of real use: a Scorecard with a year's worth of real
check-ins, and a phone-verified pass. The loop's job from here is to
keep the bar (gates, golden suite, negative controls) while the
calendar does the rest.
