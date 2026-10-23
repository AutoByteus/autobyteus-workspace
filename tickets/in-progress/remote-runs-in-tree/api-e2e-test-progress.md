# API/E2E Test Progress — autobyteus-278 (Remote delegated runs in the run tree)

Evidence: `evidence/api-e2e/` (beside this file).

| # | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Investigation (round 1) | — | `api-e2e-coverage-investigation.md` |
| 2 | API-00 server build | exit 0 | `API-00-server-build.log` |
| 3 | Exploratory RC-31 (standalone): rows, summary, projection, owner message work; no live frames | — | (temporary) |
| 4 | Found: the E2E proxy did not forward WebSocket upgrades (the new observation stream); proxy extended (recorded upgrade, 101) | — | test file |
| 5 | Still no live frames; a direct observation of beta showed an agent frame before `{nodeId}` → F-001 | — | `F-001-observation-first-frame-order.log` |
| 6 | Strict cases RC-31 … RC-37, RC-20 update | — | test file |
| 7 | Run 1 | 31/37: F-001, F-003, plus four test assumptions (RC-06/RC-22 "nothing sent" vs. summary reads; RC-35 `addPeerNode` `nodeId`; RC-20 `sec-websocket-key`) | `API-01-run1*` |
| 8 | Test assumptions fixed | — | test file |
| 9 | Diagnostic: beta's route holds frames until `{nodeId}` (temporary; reverted, dist rebuilt) | 36/37: only RC-32 (F-003) | `API-01-diagnostic-nodeid-first*` |
| 10 | Run 2 (delivered code) | 35/37: F-001 (RC-31 live), F-003 (RC-32) | `API-01-run2*` |
| 11 | Browser probe written; runs 1–8 debugged its tree opening (the Team run disclosure toggles; an SVG disclosure) and checks (the remote Team row has no agent run ID; a Task line replaces the title line; the "Couldn't reach" element includes Retry) | — | `API-02-run1*` … `API-02-run8*` |
| 12 | Probe run 9 | 5/6: RTP-04 fails (F-002 in the Team and Org families; F-001 live answer) | `API-02-run9*` |
| 13 | Report, revision record (API-REV-001 Fail) | → code reviewer | `api-e2e-execution-coverage-report.md` |
| 14 | Round 2 (CRR-004, IR-003 / SR-006, code `e37ad88b98`): E2E checks made hard (live frames RC-31/33/34, C-2 RC-32, Stop final summary); RC-31 expects the owner heading `From the owner of node "alpha-node":` and one user message (N-405); probe RTP-04 also checks Context Files, upload, `@`, one owner message and the heading | — | test files |
| 15 | API-00 round 2 build | exit 0 | `API-00-server-build-round2.log` |
| 16 | E2E run 3 on `e37ad88b98` | **37/37** (F-001, F-003 resolved; heading and N-405 pass) | `API-01-run3*` |
| 17 | Probe runs 10–13 on `e37ad88b98` | per-family affordances pass in all three families (F-002 resolved); live answer shows once with the heading. Open: the `@` check's local control did not open the lead's own view (my probe: the click stayed on the remote run), so `@` is not yet proven; fix the control's selection next round | `API-02-run10*` … `API-02-run13*` |
| 18 | **Held** by the code reviewer: FU-004 (one window owner for Retry and loading) is being fixed first; the full rerun waits for the new code head | — | — |
