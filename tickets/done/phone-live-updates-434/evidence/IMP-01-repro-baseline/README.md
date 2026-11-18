# IMP-01 — reproduction before the change (baseline)

- Command: `node evidence/repro/phone-live-repro.mjs --output-dir=<this folder> --scenarios=R1,R2,R3,R4,R6` (the repro as handed over, before R7 was added).
- Commit: eebbc2b8ee (no product change; server `dist` and phone bundle from the bootstrap build of that commit). Environment: macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2, headless Chrome. Date: 2026-11-08.
- Confirms the failures the fix must turn: R3 `phoneShowsByItselfWithin60s: null` with `Max reconnection attempts reached` after 5 tries; R4 `null`; R6 `freshDuringTurn.copies: 2` (the second after `run_command`), stored user record `hasMessageId: false`. R1 41–47 ms; R2 caught up 7.2 s.
