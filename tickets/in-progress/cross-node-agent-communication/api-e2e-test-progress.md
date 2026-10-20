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
| 2026-10-20 18:46 | — | Checkpoint | — | Round 3: CRR-006 pass, code `7a5a9af077` (IR-004, F-002 fix: the two package validators), docs `284769f392`. Plan: API-00, whole E2E (RC-13 extended: reopen Team/Org after restart + new root, follow-ups from the woken delegators), API-21 + API-22; API-23 reused (beta side untouched) |
| 2026-10-20 18:46 | API-00 | Started | — | rebuild dist |
| 2026-10-20 18:46 | API-00 | Completed | Pass | `evidence/api-e2e/API-00-server-build-round3.log` |
| 2026-10-20 18:46 | API-01 … API-20 | Started | — | run r3-1, evidence `evidence/api-e2e/API-r3-run1` |
| 2026-10-20 18:48 | API-01 … API-20 | Completed | Pass | run r3-1: 20/20 (RC-13 Team/Org restored, reopened, follow-ups) |
| 2026-10-20 18:48 | API-21 | Started | — | same-node E2E suites, switch off, log /tmp/api21-switch-off.log |
| 2026-10-20 19:03 | API-21 | Completed | see report | switch off done; API-22 (switch on) started, log /tmp/api2x-switch-on.log |
| 2026-10-20 19:21 | API-21 | Checkpoint | — | switch off: FU-003 + task-reactivation-root-visibility QR-001 race timeout (1/7). Alone: off 5/5 pass, on 4/5 pass (1 same timeout). Bisect: temp worktree at base 5de6a698b9 |
| 2026-10-20 19:28 | API-21/22 | Completed | Pass (FU-003, FU-004 outside scope) | switch off: 35/37 files (FU-003 + the base-reproduced QR-001 race, FU-004); switch on: 36/37 (FU-003). Race: branch 1/10, base 1/10 |
| 2026-10-20 19:28 | API-01 … API-20 | Started | — | stability rerun r3-2, evidence `evidence/api-e2e/API-r3-run2` |
| 2026-10-20 19:30 | API-01 … API-20 | Completed | Fail (test defect) | r3-2: 19 pass; RC-20 false positive: the 'sk-' heuristic matched 'Sk-S-5a77…' inside a random messageId (canary and header checks passed). Pattern made case-sensitive with a left boundary |
| 2026-10-20 19:30 | API-01 … API-20 | Started | — | r3-3 and r3-4 with the final test file |
| 2026-10-20 19:38 | API-01 … API-20 | Completed | Pass | r3-3 and r3-4: 20/20 each with the final test file |
| 2026-10-20 19:38 | API-24 | Completed | Not Tested | image dist differs in 31 files outside this branch; TESTING forbids the dist mount; no container started |
| 2026-10-20 19:38 | — | Checkpoint | — | Round 3 result Pass / 95%. Report, API-REV-003, FU-004 written. Next: commit, test-code review request to the code reviewer |
| 2026-10-20 20:20 | — | Checkpoint | — | Round 4 (DR-001): RC-10 test race under load (delivery DEL-06). Fix: take the remote run from the worker's delegate_task result (returned after the work packet); CRR-007 notes applied. Next: API-00 at 303eb6ca1d, two full runs |
| 2026-10-20 20:20 | API-01 … API-20 | Started | — | run r4-1 (load 139.00 154.33 131.80) |
| 2026-10-20 20:23 | API-01 … API-20 | Completed | Pass | run r4-1:  Tests 20 passed (20) |
| 2026-10-20 20:23 | API-01 … API-20 | Started | — | run r4-2 (load 103.54 133.73 126.84) |
| 2026-10-20 20:25 | API-01 … API-20 | Completed | Pass | run r4-2:  Tests 20 passed (20) |
| 2026-10-20 20:29 | API-23b | Completed | Pass | isolated-app composer screenshot on node B (integrated build, real model); duplicate PNG removed |
| 2026-10-20 20:29 | — | Checkpoint | — | Round 4 result Pass / 95%. Report, API-REV-004 written. Next: commit, test-code review request |
| 2026-10-20 21:09 | — | Checkpoint | — | Round 5: CRR-009 pass of the integration merge c59c6f7359 (origin/personal 3b9014215e, autobyteus-205) + test 300bf4c09a; HEAD 2155dc1aef. Plan: API-00, E2E ×2, API-22 once |
| 2026-10-20 21:09 | API-00 | Started | — | rebuild dist at 2155dc1aef |
| 2026-10-20 21:10 | API-00 | Completed | exit=0 | API-00-server-build-round5.log |
| 2026-10-20 21:10 | API-01 … API-20 | Started | — | run r5-1 |
| 2026-10-20 21:12 | API-01 … API-20 | Completed | Pass | run r5-1:  Tests 20 passed (20) |
| 2026-10-20 21:12 | API-01 … API-20 | Started | — | run r5-2 |
| 2026-10-20 21:14 | API-01 … API-20 | Completed | Pass | run r5-2:  Tests 20 passed (20) |
| 2026-10-20 21:14 | API-22 | Started | — | same-node E2E suites, switch on, at 2155dc1aef; log /tmp/api22-r5.log |
| 2026-10-20 21:29 | API-22 | Completed | Pass (FU-003 outside scope) | 36/37 files; only delegated-launch-config-defaults (FU-003), same lines as before |
| 2026-10-20 21:29 | — | Checkpoint | — | Round 5 result Pass / 95%. Report, API-REV-005 written. Next: commit, handoff |
