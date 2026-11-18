# IMP-12 — reproduction after the fix (final)

- Command: `node evidence/repro/phone-live-repro.mjs --output-dir=<this folder> --scenarios=R1,R2,R3,R4,R6,R7`
- Commit: feb69495a5 (server `dist` and phone bundle rebuilt from it, IMP-13). The probe's own changes (R7, the fresh client's wait) are in this ticket folder. Environment: macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2, headless Chrome. Date: 2026-11-08.
- Results (`repro-summary.json` → `scenarios`):
  - R1 `delays` 44, 40, 47 ms (BEH-001 preserved).
  - R2 `markerDuringOutage.phoneShowsAfterMs: 7181` (BEH-002 preserved).
  - R3 `phoneShowsByItselfWithin60s: 47`; `socketsDuring.openedAt` 66575 … 126599: attempts at +1, +3, +7, +15, +31, +61 s after the loss; reconnected ~16 s after the node was reachable again (AC-001: ≤ 35 s).
  - R6 `freshDuringTurn.copies: 1`, before `run_command`; `stored` user entry `hasMessageId: true` (AC-005).
  - R7 `socketsOpenedWhileHidden: 0`, `shownAfterVisibleMs: 104`, `nextMarkerMs: 46` (AC-003 within 5 s; AC-004 nothing while hidden).
  - R4 `phoneShowsByItselfWithin90s: null` (screen-on silent dead path: out of scope, FU-001).
  - `error: null`; `cleanup: { serverExited: true, rootRemoved: true }`.
