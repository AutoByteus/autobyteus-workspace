# IMP-11 — diagnostic run for R6 (fresh client) and R7 (hidden + dead path)

- Command: `node /tmp/imp434-diag/diag-repro.mjs --output-dir=/tmp/imp434-diag/run1 --scenarios=R6,R7` (a temporary copy of
  `evidence/repro/phone-live-repro.mjs` with page-error, console and `/graphql` request-timing capture; not kept, not committed).
- Commit: feb69495a5 (server `dist` and phone bundle built from it). Environment: macOS 26.5.2 arm64, node v22.23.1, headless Chrome.
- Date: 2026-11-08.

Findings (from `repro-summary.json`, `diag` key):

1. R6 fresh client: `freshDuringTurn.copies: 1`, the message before `run_command`; `diag.freshScreen.state: "open"`;
   `diag.pageErrors: []`. In IMP-10 the fresh client's run screen never opened (screenshot shows the run list) because the
   probe slept a fixed 5 s after a click that did not open the run. The probe now waits for the run screen (and clicks once more).
2. R7 with **every** open proxied connection black-holed (the R4 `blackhole` mode): the page became visible at t=80983 ms,
   the Team stream reconnected at 80985 ms (re-sync), and the snapshot's member reload sent `GetTeamMemberRunProjection` and
   `GetTeamMemberFileChanges` at 80996 ms; both have `done: null, failed: null` — they went out on pooled HTTP keep-alive
   connections that the blackhole keeps dead for ever, so they never returned. Live events after that showed (`nextMarkerMs: 47`).
   The probe's R7 now black-holes only the open WebSocket connections (the design's "old connection"); see the handoff's
   Known Risks and `follow-ups.md` FU-003 for the read-without-timeout behaviour.
