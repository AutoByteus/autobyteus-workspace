# API/E2E Execution Coverage Report — autobyteus-524 round 1: FU-003 (native command start and stop limits)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (`/implementation_engineer`, 2026-11-17)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: API-02 run also at B=10 and B=60, to size the cut-short return time found at B=200 (R-1); API-04 also ran the two gated shutdown suites (credential-free) because they exercise K-2 and K-3 directly
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524/tickets/in-progress/native-follow-ups-524/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test changed in this round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `42df66c542` (source `80483cce9d`) | macOS 10-core, Node v22.23.1 | `autobyteus-ts` dist built 22:37 and again 23:24, server dist 23:24, both from that source | `env -i PATH HOME=<resolved temp> TMPDIR`; load from other processes 43–188 (a VM, two Android emulators, `fseventsd` at 157–164 % CPU) recorded per case |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-002, AC-003, AC-004, AC-005, I-1, I-2 | command-execution unit | IMP-03 | — | Pass | (IMP-03) | (IMP-03) | Ran on `80483cce9d`, the final source; 8 new cases fail on the old source |
| API-R2 | AC-006 | whole `autobyteus-ts`, terminal integration, server command tests, typechecks | IMP-04, IMP-05, IMP-06, IMP-07 | — | Pass | (IMP-04…07) | (IMP-04…07) | Ran on `80483cce9d`; IMP-04's single failure is K-3 (3 s host-close budget, out of scope) |
| API-01 | AC-001, QR-001, REQ-002, K-1 | real `runBash` of the built library on the real OS | `env -i … node evidence/API-01-burst-latency-probe.mjs <worktree> <N>`, N = 10, 60, 200 in three rounds, then two more N = 200 | ENV-1 | Pass | `API-01-burst-latency.log`, `API-01-burst-latency-probe.mjs` | every line `"failed":0` (5 × 200, 3 × 60, 3 × 10 = 1,830 calls); 200-burst `okMs.max` 15,581–35,528; `loadBefore`/`loadAfter` 106–150 | No "Process observation deadline exceeded" or any other start failure. 200-burst whole calls (start + run) take 15–36 s, so the margin to the 30 s start limit is thin (K-1) |
| API-02 | AC-002 (real path), REQ-004, I-1 (SCN-A1, SCN-A2) | real `runBash` with `timeout_seconds` and an abort signal while B other calls start | `env -i … node evidence/API-02-start-cut-probe.mjs <worktree> <B> <K> <T> <S>`: B = 200 (K 10, T 2 s, S 1.5 s), B = 10 and 60 (K 5, T 1 s, S 0.3 s) | ENV-1 | Pass | `API-02-start-cut.log`, `API-02-start-cut-probe.mjs` | B=200: `"Command did not start within 2 s: Process observation deadline exceeded":10`, `"endedAsStop":10`, `"saidDidNotStart":0`; burst `"failed":0` | Every cut start says "did not start within T s"; every Stop during the start ends as `tool-abort`. The call returns after the cleanup stop is confirmed: ≤ 0.7 s at B=10, ≤ 2.8 s at B=60, ~11 s at B=200 (R-1). One B=60 timeout reads "did not start within 1 s: Command launch cancelled" (timer and start limit both 1 s; the launcher's own cancel text) |
| API-03 | AC-006; TESTING rerun by impact | whole server `test:unit` and `test:integration` | `env -i … pnpm -C autobyteus-server-ts test:unit`; `test:integration:prepare`; `env -i … test:integration`; `API-03-fswatch-latency-probe.mjs` | ENV-1 | Pass | `API-03-server-unit-integration.log`, `API-03-fswatch-latency-probe.mjs` | unit `Tests  4 failed \| 8293 passed`, integration `Tests  16 failed \| 490 passed`; probe `{"latenciesMs":[9801,null,null,7685,null]}` | Every failure is in a folder/file-system watcher test; watch events arrived after 7.7–9.8 s or never (`fseventsd` 163.5 %). None of these files reaches the command scope; same failures and cause on the base build in autobyteus-515 |
| API-04 | SCN-002, SCN-A3, K-2, K-3 | real server: native background commands (start, kill, Terminate, Stop, run end), terminal sessions, busy-run Terminate/SIGTERM, standalone host run end and host close | `env -i … RUN_NATIVE_BACKGROUND_TASK_E2E=1 … autobyteus-background-task-transport.e2e.test.ts tests/e2e/shutdown tests/e2e/terminal`; then `RUN_BUSY_STOP_NOW_E2E=1 RUN_NATIVE_STANDALONE_SHUTDOWN_E2E=1 … tests/e2e/shutdown` | ENV-1 | Pass | `API-04-server-command-e2e.log` | `autobyteus-background-task-transport.e2e.test.ts (9 tests)` ✓; terminal `(4 tests)` ✓; shutdown `Tests  3 passed (3)`, receipts `"result":"Pass"` | Load fell to 43–83 during run 2; K-3 at heavy load is shown only by IMP-04's fixture |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (and IMP-01 before / IMP-02 after) | Proven at load 106–150: 0 of 1,000 calls in five 200-bursts, 0 in 60- and 10-bursts. QR-001's load ~160 was approached (1-min 150 after a burst), not held | — |
| AC-002 | Yes | API-R1, API-02 | Proven (unit limit and cap; real path text "did not start within 2 s" / "1 s") | — |
| AC-003 | Yes | API-R1 | Proven (unit: an erroring launch fails at once) | — |
| AC-004 | Yes | API-R1, API-01 (no observation-deadline failure in any burst) | Proven | — |
| AC-005 | Yes | API-R1, API-04 | Proven | — |
| AC-006 | Yes | API-R2, API-03, API-04 | Proven; the unrelated watcher failures are recorded with their cause | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 94% | API-R1, API-R2, API-01…API-04 | QR-001 measured up to load ~150, not held at ~160 | A burst on a machine held at load 160 |
| Changed-boundary execution directness | 85% | 96% | API-01/02 real `runBash` on the real OS; API-04 real server | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | API-03/04 server paths that run and stop commands | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 90% | Node 22, clean env, load recorded | WSL unmeasured (ASM-001); the load came from other processes and could not be set | A Windows/WSL host; a controlled load generator |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 94% | API-02 (cut start, Stop during start), API-04 (run end, host close, Terminate, SIGTERM) | R-1 slow return of cut calls in 200-bursts; K-3 host close at heavy load | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change; the stderr text is model-facing (API-02) | — | — |
| Durable regression coverage quality and relevance | 92% | 95% | implementation's unit cases, 8 of them fail on the old source | the burst cannot be a durable test (load-dependent) | — |

- Overall post-repository confidence: 86%
- Overall final confidence: 94.0% (simple average of the six applicable categories: 94, 96, 95, 90, 94, 95)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.0%). The gap is environmental: WSL has no host here (ASM-001), and QR-001's exact load cannot be produced on demand. No available surface closes either; no criterion is unproven and no category is below 90%, so the result is `Pass` with the gap recorded
- Confidence-limiting residual risks: K-1, R-1, K-3, WSL (below)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (real OS process starts and stops under load) and `Other` (real server suites that run commands)
- Confidence gap it addressed: unit tests use fakes for the launcher and `ps`; AC-001 needs the real OS under load; the run-end and host-close paths needed the real server.
- Browser validation needed: No (no UI change).
- If `Blocked`: N/A

## Residual Risks

- K-1 (thin margin): a 200-command burst at load 106–150 takes 15–36 s per whole call. Starts stayed under 30 s here, but the implementation saw 104 of 200 miss it at load ~200 (outside the non-goal). Realistic agent bursts (10 at once) take ≤ 1.5 s.
- R-1 (found here): a start cut short by a short `timeout_seconds` or a Stop returns only after the cleanup stop is confirmed (`start()`'s catch awaits `stop(handle, 'explicit-stop')`, now up to 30 s): ≤ 0.7 s at 10 concurrent calls, ≤ 2.8 s at 60, ~11 s at 200. The requirements set stop confirmation to 30 s and say nothing about how fast a cut call returns; outcomes and texts are right. Delivery may want the Solution Designer to decide whether a cut start should return before its cleanup is confirmed.
- K-2: run end confirms each stop for up to 30 s (in parallel, `stopAllForRunEnd` uses `Promise.all`); API-04 run end passed at load ≤ 83.
- K-3: host close keeps its 3 s budget (FU-007); can report `unconfirmed` at heavy load (IMP-04 fixture).
- WSL unmeasured (ASM-001).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (the implementation's unit cases and hook timeouts are reused)
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

None in this round's cases (real OS, real built library and server; the background-task and shutdown suites use their scripted models as designed).

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probes `API-01-…`, `API-02-…`, `API-03-…` | Yes | kept as evidence | Kept |
| Temp workspaces, HOMEs, data roots | Yes | removed by probes and suites | Removed |
| `/tmp/524` logs | Yes | excerpts in evidence; folder removed after commit | Removed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: delivery engineer (direct route, Small / Low)
- Notes: no durable test changes; no new follow-up (R-1 is reported for a decision, the watcher failures are the known `fseventsd` cause already in TESTING.md).
