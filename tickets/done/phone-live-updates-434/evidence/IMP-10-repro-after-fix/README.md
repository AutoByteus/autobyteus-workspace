# IMP-10 — first reproduction run after the fix (superseded by IMP-12)

- Command: `node evidence/repro/phone-live-repro.mjs --output-dir=<this folder> --scenarios=R1,R2,R3,R4,R6,R7`
- Commit: feb69495a5 (server `dist` and phone bundle rebuilt from it). Environment: macOS 26.5.2 arm64, node v22.23.1, headless Chrome. Date: 2026-11-08.
- Results: R1 43–45 ms; R2 caught up 7.2 s; **R3 shown by itself** (was `null`); R4 `null` (out of scope, FU-001).
- Two probe problems, diagnosed in IMP-11 and fixed in the probe before IMP-12:
  - R6 `freshDuringTurn` is empty: the fresh client's click did not open the run screen (screenshot shows the run list) and the probe only slept 5 s.
  - R7 `shownAfterVisibleMs: null`: R7 then ran after R4 and black-holed every connection, including the browser's pooled HTTP keep-alive connections; the member reload's GraphQL reads after the re-sync never returned (IMP-11). R7 now runs before R4 and black-holes only the open WebSocket connections.
