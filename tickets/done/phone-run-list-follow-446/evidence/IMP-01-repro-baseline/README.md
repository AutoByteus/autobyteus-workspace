# IMP-01 — reproduction before the change (baseline)

- Command: `node evidence/repro/closed-task-rows-repro.mjs --output-dir=<this folder> --wait-s=120`
- Commit: a85bf4f38d (no product change; server `dist` and phone bundle as built by the Solution Designer from that commit). Environment: macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2, headless Chrome. Date: 2026-11-09.
- Confirms the failure: `"goneAfterMs":{"host":2,"other":null}`; `otherStillShownAtEnd` lists the agent row and the Team row after 120 s; `otherAfterReload: []`.
