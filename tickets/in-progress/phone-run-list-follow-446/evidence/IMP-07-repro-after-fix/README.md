# IMP-07 — reproduction after the fix

- Command: `node evidence/repro/closed-task-rows-repro.mjs --output-dir=<this folder> --wait-s=120`
- Commit: 8e686b7f36 (server `dist` and phone bundle rebuilt from it). Environment: macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2, headless Chrome. Date: 2026-11-09.
- Result (`repro-summary.json` → `result`): `"goneAfterMs":{"host":1,"other":3242}`, `otherStillShownAtEnd: []`, `otherAfterReload: []`.
  - phone-other (another run open, the PTM only listed): the agent row and the Team row of the closed Tasks left the list 3.2 s after both `update_task` calls returned (AC-001: ≤ 10 s; before: still listed after 120 s, IMP-01).
  - phone-host (the PTM is its open run): 1 ms, as before (AC-004).
