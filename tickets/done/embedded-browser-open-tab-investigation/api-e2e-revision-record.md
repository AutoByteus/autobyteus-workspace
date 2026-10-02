# API/E2E Revision Record
## Index
| Revision | Trigger | Related | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer / implementation-handoff.md / IR-001 | SR-005/AP-001; ARCH-REV/CRR/DR N/A | N/A | Pass / 95% |
## API-REV-001 — Canonical browser transport, history and real visible attachment
- Baseline round 1; C-001–006. No prior API failure/result exists.
- Durable changes: agy-failure-cli.mjs and agy-mcp-tool-call-transport.e2e.test.ts exact 14-call preservation/canonicalization/history coverage; run-projection-toolcalls-graphql.e2e.test.ts fixture current-admission maintenance.
- Coverage planned before editing. Initial broader suite 5 failures traced to stale admission snapshot after fixture resets; corrected only test setup using real admitCurrent, retained every assertion; 14/14 rerun and 15/15 final combined pass. Not an implementation/design change.
- Executed 78 server units, 15 server E2E, 9 Nuxt/guard and 22 Electron tests. Real isolated worktree desktop using AGY 1.2.15/Daily Assistant/Gemini 3.8 Flash Medium: two Activity-origin opens automatically visibly attached exact returned IDs 874f12/2a801b at 696×757. Saved run reopened without replayed focus or result/session mutation. Cleanup complete.
- Post-repository confidence 85.71%; broader Required and completed; final 95% all categories. First collapsed-panel opening is assignment/setup evidence only, not counted visibility proof.
- Prior failure resolution: None (no prior completed API round). Within-round fixture failures retained in c003.log and resolved in c003-rerun/final-server-e2e logs.
- Canonical investigation/report/ledger updated. No unresolved findings/blockers. No production edits.
- Small/Low confirmed; test review Not Required — direct low-risk route. Delivery owns user verification/finalization/origin/personal, no push/release here.
- Residual scope: no global reliability/recovery/F-002, unrelated intermittent failure, broad platform/viewport or live other-runtime claim. Exact inventory/commands in current report and evidence/api-e2e.
