# API/E2E Execution Coverage Report — autobyteus-524 round 2: FU-006 and FU-007

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1 of this package, implementation handoff IR-002 (`/implementation_engineer`, 2026-11-18)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: a temporary mutation (the exit stop call removed from `server-runtime.ts`, then restored and rebuilt) ran both probes, to show they detect the slow stop under today's conditions; failing E2E and integration files were compared against the base's source files swapped into the worktree (restored after; `git status` clean)
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2/tickets/in-progress/native-follow-ups-524-r2/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test changed in this round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | head `f1b61d0c52` (source `2e5b0198e2`; `2e5b0198e2..f1b61d0c52` changes one unit test and ticket files) | macOS 10-core, Node v22.23.1 | server `dist` built from `2e5b0198e2` (rebuilt twice after the temporary mutation and base swap; restored builds checked) | `env -i PATH HOME=<resolved temp> TMPDIR`; load 38–64; `fseventsd` 146–168 % CPU (the condition that made stops slow); `~/.local/bin/dsh` installed |
| ENV-2 | base `0570c47fd9`'s six changed source files swapped into ENV-1 (and one base `dist` build for `mcp-bulk-import`) | same | in-process suites run source; built-server suite ran the base build | restored after each comparison |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-003, AC-004 (part) | unit cases, migration-gate order, built-server E2E of 493 FU-005, typechecks, architecture tests | IMP-03, IMP-05, IMP-06, IMP-07 | — | Pass | (IMP-03, 05, 06, 07) | (as in the handoff) | Ran on `2e5b0198e2` + the test update |
| API-01 | AC-002, QR-001 | built server, SIGTERM (E2E harness, node stop) | `env -i … node evidence/built-server-stop-probe.mjs <worktree> 10 3000`; then mutation and restore, 5 + 3 rounds | ENV-1 | Pass | `API-01-sigterm-stop-probe.log` | 10 lines `"outcome":"exit 0"`, `stopMs` 47–71; mutation `stopMs` 354–12462 with `"TEST_SERVER_EXITED_NONZERO"` twice; restored 49–60 | Load 45–55, `fseventsd` 168 %. The designer's load 100–125 did not occur; the slow-stop condition did (the mutation reproduced it) |
| API-02 | AC-002, SCN-A1 (desktop quit) | built server, the desktop's IPC shutdown message | `env -i … node evidence/API-02-ipc-shutdown-probe.mjs <worktree> 10 3000`; mutation and restore rounds | ENV-1 | Pass | `API-02-ipc-shutdown-probe.log`, `API-02-ipc-shutdown-probe.mjs`, mutation rows in `API-01-sigterm-stop-probe.log` | 10 lines `"reply":"complete"`, `replyMs` 35–56, `exitMs` 51–71, `"exitCode":0`; mutation `"reply":"failed"` twice, `exitMs` 2431–17315 | The Electron shell is unchanged; this sends its message to the server |
| API-03 | AC-004 | whole server `test:integration` | `test:integration:prepare`; `env -i … test:integration`; `package-auto-refresh` alone, branch vs base source, alternated | ENV-1, ENV-2 | Pass | `API-03-server-integration.log`, `API-03-fswatch-latency-probe.mjs` | `Tests  11 failed \| 495 passed`; latency `{"latenciesMs":[6355,null,2822,null,12521]}`; failed-case counts base 4, 3, 5 vs branch 5, 5, 8, 3 | All failures in `package-auto-refresh` and `file-system-watcher` (5 s waits for OS events). The package watcher's normal path is unchanged, the skill watcher's `close()` keeps its steps, `closeStudioProcessResources` moved with an identical body |
| API-04 | AC-001, AC-004, REQ-003 (in-process servers close normally) | whole server E2E | `env -i … pnpm test:e2e`; failing files alone on branch; still-failing ones on base; Grok suite alternated 4 + 4; temporary probe log (reverted) | ENV-1, ENV-2 | Pass | `API-04-server-e2e-whole-suite.log` | `Tests  9 failed \| 555 passed`; `✓ tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts (6 tests)`; shutdown failures in the log: `0` | Every failure traced: file-explorer watcher (FSEvents, same on base); configured-skill prompt headings stale since autobyteus-483 (FU-001, same on base); Grok probe time-out read as "unsupported" (FU-002; base 2/4, branch 1/4); five others pass alone (5 s limits under load). 515's run of the same suite had 25 failures, several from slow shutdowns; none here |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 (with `dsh` installed), IMP-01 | Proven | — |
| AC-002 | Yes | API-01, API-02 (and the mutation rows) | Proven at load 45–60 with `fseventsd` busy; the designer's load 100–125 was not available | — |
| AC-003 | Yes | API-R1 (IMP-03) | Proven | — |
| AC-004 | Yes | API-R1, API-03, API-04 | Proven; unrelated failures recorded with causes (FU-001, FU-002, FSEvents) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 95% | API-R1, API-01…04 | QR-001's load 100+ not reached | a run at load 100+ |
| Changed-boundary execution directness | 88% | 96% | both real shutdown entries on the built server | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | whole integration and E2E; mutation shows the probes catch the old behavior | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 91% | `fseventsd` busy (the cause condition) | load lower than QR-001's; Linux/Windows unmeasured (ASM-001) | a loaded run; other platforms |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 94% | exit paths, normal closes in in-process servers (whole suites), unit for folder removal | REQ-003's folder-removal close is unit-proven only | — |
| User-surface, browser, and desktop-shell confidence | 80% | 92% | API-02 sends the desktop's own IPC message | the packaged app's quit (shell unchanged) not run | an isolated desktop instance quit |
| Durable regression coverage quality and relevance | 92% | 95% | implementation's unit cases and order assertion | — | — |

- Overall post-repository confidence: 87%
- Overall final confidence: 94.0% (simple average of 95, 96, 95, 91, 94, 92, 95)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.0%). The gap is environmental (load 100+ not available; other platforms) and the packaged desktop quit; the server side of the desktop quit is proven through its own message. No criterion is unproven and no category is below 90%, so the result is `Pass` with the gap recorded
- Confidence-limiting residual risks: below

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (built-server shutdown through SIGTERM and the desktop IPC message) and whole suites
- Gap it addressed: the unit tests use fake watches; the stop time is a real-OS effect; the desktop's entry differs from the harness's.
- Browser validation needed: No (no UI change).
- If `Blocked`: N/A

## Residual Risks

- QR-001 measured at load 45–60 with `fseventsd` at 146–168 %, not at load 100+.
- In-process servers (tests) and a package folder removed while running still close OS watches on the main thread, by design (REQ-003); under the same backlog these closes can stall the main thread for seconds, which is what made the Grok probe time out in API-04 (FU-002 records the probe side).
- Linux/Windows unmeasured (ASM-001); the change only removes work.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Desktop shell (Electron) | API-02 probe sends its IPC shutdown message | the shell is unchanged; building and launching it adds no server-side evidence | the shell's own wait/kill not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Mutation of `server-runtime.ts` | Yes | restored from copy, rebuilt, dist checked (`calls=1`), probes rechecked | Reverted |
| Base source swaps (three comparisons) | Yes | restored from copies; `git status --short autobyteus-server-ts/src` empty each time; dist rebuilt after the base build | Reverted |
| Grok probe log lines | Yes | restored from copy; `git diff --stat` empty | Reverted |
| Probes `API-02-…`, `API-03-…` | Yes | kept as evidence | Kept |
| `/tmp/524r2` logs | Yes | excerpts in evidence; removed after commit | Removed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: delivery engineer (direct route, Small / Low)
- Notes: follow-ups FU-001 (stale configured-skill test) and FU-002 (Grok probe time-out reported as unsupported) added in `follow-ups.md`.
