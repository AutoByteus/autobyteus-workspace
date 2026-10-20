# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-20 16:44 | API-00 | Started | — | `pnpm -C autobyteus-server-ts build` at `676ecbbb7a` |
| 2026-10-20 16:46 | API-00 | Completed | Pass | `exit=0`; log copied to `evidence/api-e2e/API-00-server-build.log`. Next: write the two-server E2E (API-01 … API-19) |
| 2026-10-20 17:20 | — | Checkpoint | — | Solution Designer hold (ARCH-REV-003, SR-015): steps 3–6 will change. Run only the stable cases now (RC-01, RC-03, RC-20 of the E2E file); hold RC-02, RC-04 … RC-19, API-20/21/22 |
| 2026-10-20 17:21 | API-01/03/20 (RC-01, RC-03, RC-20) | Started | — | `vitest run …two-server.e2e.test.ts -t "RC-(01|03|20) "`, clean env, evidence dir `evidence/api-e2e/API-stable-run1` |
| 2026-10-20 17:01 | API-01/03/20 | Completed | Fail | run 1: RC-01 Pass, RC-20 Pass, RC-03 stopped at the first assertion (non-AutoByteus page → `PEER_UNREACHABLE`). Next: make that check soft (add a 404 variant) and rerun so the rest of RC-03 reports |
| 2026-10-20 17:02 | API-01/03/20 | Started | — | run 2, same command, evidence `evidence/api-e2e/API-03-stable-run2` |
| 2026-10-20 17:02 | API-01/03/20 | Completed | Fail | run 2: RC-01 Pass, RC-20 Pass, RC-03 Fail only on the two soft checks (F-001: HTML page and 404 both reported "could not be reached"); every other RC-03 check passed (the case reached its `record`). Next: report, revision record, commit, failure-origin request for F-001; then wait for the SR-015 code |
| 2026-10-20 17:40 | — | Checkpoint | — | Round 2: CRR-004 pass, code `31d46978ad` (IR-003: SR-015/SR-016, CR-002), docs `7383e89a0f`. Rerun all RC-01 … RC-20 (roots, engine, PeerClient changed), then API-21/22 regression, API-23 browser |
| 2026-10-20 17:40 | API-00 | Started | — | rebuild dist at `7383e89a0f` |
| 2026-10-20 17:40 | API-00 | Completed | Pass | `exit=0`, `evidence/api-e2e/API-00-server-build-round2.log` |
| 2026-10-20 17:40 | API-01 … API-20 | Started | — | full E2E run r2-1, evidence `evidence/api-e2e/API-r2-run1`, log /tmp/api-r2-run1.log |
| 2026-10-20 17:48 | API-01 … API-20 | Completed | Fail | run r2-1: 13 pass, 7 fail. Test defects fixed (RC-06 kind `agent_team`, RC-08 live-only wording, RC-10/11 `update_task` result shape, RC-18 seq counting, RC-19 cascade). RC-13: Team/Org member projection 'not found' → F-002 (package validator rejects remote-endpoint messages), confirmed with the dist validator on kept data |
| 2026-10-20 17:48 | API-01 … API-20 | Started | — | run r2-2 with the test fixes, evidence `evidence/api-e2e/API-r2-run2` |
| 2026-10-20 17:52 | API-01 … API-20 | Completed | Fail | run r2-2: 13 pass; RC-10 test defect (Task key vs ID); RC-13/15/16/18/19 stopped at the Team lead's projection (F-002); RC-17 cascade (RC-15 left the proxy partitioned). Restructured: channel cases use the standalone delegator, try/finally around link changes, RC-14 deletes its own run, RC-13 records Team/Org restore before asserting |
| 2026-10-20 17:52 | API-01 … API-20 | Started | — | run r2-3, evidence `evidence/api-e2e/API-r2-run3` |
| 2026-10-20 17:56 | API-01 … API-20 | Completed | Fail | run r2-3: 19 pass, RC-13 Fail (F-002: after alpha's restart, Team/Org delegators' replies refused 'no longer exists'; restore refused NOT_CATALOGED). Evidence saved |
| 2026-10-20 17:56 | API-23 | Started | — | two-node setup (evidence/api-e2e/API-23-setup-two-nodes.mjs), then Nuxt dev against beta, browser journey |
| 2026-10-20 17:59 | API-23 | Completed | Pass | beta lists the remote run (workspace → Publisher), opens it with the work packet naming node alpha-node, composer message answered, Stop → Offline and process gone; cleanup done. Evidence API-23-* |
| 2026-10-20 17:59 | API-22 | Started | — | same-node E2E suites with ENABLE_REMOTE_COLLABORATION=true (projects, run-history, agent-team-runs, agent-org-runs), log /tmp/api22-switch-on.log |
| 2026-10-20 18:18 | API-22 | Completed | Pass (FU-003 outside scope) | 36/37 files pass with the switch on; delegated-launch-config-defaults fails the same alone with the switch off; cause: stale expectation from autobyteus-197 (in base) → FU-003 |
| 2026-10-20 18:18 | — | Checkpoint | — | Round 2 result Fail (F-002). Report, revision record API-REV-002, FU-003 written; temp data removed. Next: commit, failure-origin request to the code reviewer; round 3 after the fix: whole E2E, API-21, API-22 |
