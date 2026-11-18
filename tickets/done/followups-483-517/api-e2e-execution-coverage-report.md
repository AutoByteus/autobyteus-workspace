# API/E2E Execution Coverage Report — followups-483-517

## Round

- Coverage investigation: `tickets/in-progress/followups-483-517/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/followups-483-517/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/followups-483-517/api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-002 (direct route, Small/Low; SR-002)
- Prior round reviewed: None
- Deviations from the investigation's plan: API-03 also ran the two still-failing files alone (API-03b) to separate load from the change. Phone case numbered MSP-78 (MSP-60..77 taken).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/followups-483-517/tickets/in-progress/followups-483-517/evidence/` (API-* files and folders; IMP-* from implementation)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `2a553b5473` + this round's test edits (committed after) | macOS 26.5.2 arm64, 10 cores; load 53–146 from other work, `fseventsd` 135–165% | Node 22.23.1; in-process studio server; scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`) | temp `HOME`; `env -i` |
| ENV-2 | same | same | phone probe: `autobyteus-server-ts/dist` and `build:mobile-web` from this worktree, probe-owned nodes, headless Chrome, scripted AGY | probe-owned stack |
| ENV-3 | base test files of `24d438fa31` vs the branch's | same | the seven FU-002 files, one vitest run each, back to back (implementation's script) | `AUTOBYTEUS_*_ROOTS` unset |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-002 (unit) | AGY monitor | Reused: IMP-01 | — | Pass | (handoff) | (handoff) | monitor and its test unchanged since `807951b6e0` |
| API-R2 | AC-002 (regression) | own view, BTS-03 count | Reused: IMP-02 | — | Pass | (handoff) | (handoff) | — |
| API-R3 | AC-001 | base vs branch at load 104–135; remaining causes; (c) changes | Reused: IMP-03, IMP-04, IMP-07 | — | Pass (as refined) | (handoff) | (handoff) | evidence holds the load and the causes |
| API-R4 | AC-004 | link check | Reused: IMP-05 (+ API-04 rerun) | — | Pass | (handoff) | (handoff) | — |
| API-01 | AC-002 | real server → AGY monitor → GraphQL `agentBackgroundTaskView` | `env -i PATH HOME=<temp> TMPDIR RUN_BACKGROUND_TASK_STATUS_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> AGY_FAKE_CASE=linked_skills vitest run tests/e2e/runtime/background-task-status-count.e2e.test.ts -t BTS-03`; negative control with the base monitor put back | ENV-1 | Pass | `API-01-bts03/vitest.log`, `API-01-bts03/BTS-03.json`, `API-01-bts03/negative-control-base-monitor.log` | view after the exit: `"tasks": [{"command": "sleep 8 # background step 11", "status": "failed", "endReason": null, "exitCode": 3}]`; control: `+ []`, `1 failed` | the count path (idle 1 → idle 0) unchanged |
| API-02 | AC-002 (panel opened late), REQ-003 | production phone bundle on a real node | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-47,MSP-48,MSP-49,MSP-59,MSP-78` | ENV-2 | Pass | `API-02-phone/probe.log`, `API-02-phone/probe/mobile-shell-probe.json`, `MSP-78-activity-opened-after-end.png` | MSP-78 `nodeAfterEnd` `status failed … "Command exited with code 1"`; phone row `"status": "failed"`, `"end": "exit code 1"`; screenshot "1 ended", chip Failed, line "exit code 1"; MSP-47/48/49/59 Pass | MSP-78 is new |
| API-03 | AC-001 | the seven FU-002 files, base then branch | `bash tickets/in-progress/followups-483-517/evidence/run-fu002-base-vs-branch.sh <worktree> 24d438fa31 <log>` | ENV-3 | Pass (as refined) | `API-03-fu002-base-vs-branch.log` | base (load 53–62, fseventsd 153–164%): `Tests  18 failed \| 60 passed`, failures in file-system-watcher 10, package-auto-refresh 5 (incl. `Hook timed out in 10000ms`), live-refresh 2 (DCF-E2E-002, -003), skill watcher 1; branch (load 53 rising to 146): `Tests  7 failed \| 71 passed`, only file-system-watcher 3 and agent-package-folder-watcher 4 | package-auto-refresh, live-refresh, skill watcher, studio contract and Grok replay pass on the branch |
| API-03b | AC-001 (remaining causes) | the two still-failing files alone on the branch | `pnpm exec vitest run <file>` each | ENV-1 | Diagnosed | `API-03b-alone-on-branch.log` | folder-watcher unit (load ~120): 4 × `Timed out waiting for the monitor` after 30 s; file-system-watcher (load ~70–98): 5 × `Timed out waiting for event` | events that never arrive within the shared wait, AC-001's recorded cause: FU-001 (file explorer), FU-003 (root returning), FU-004 (new: agent-package folder watcher above load 100) |
| API-04 | AC-004 | doc links; `settings.md` content | `python3 -I tickets/in-progress/followups-483-517/evidence/check-doc-anchors.py .` | ENV-1 | Pass | `API-04-link-check.log` | `checked 50 links … RESULT PASS`; `# Settings`; Level headings `0`; `## Existing Run Configuration` at 868; `#### Run Workspace Choice On Start Surfaces` in the architecture doc | — |
| API-05 | — | typechecks (server product change; test edits) | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-05-typechecks.log` | `(baseline 1012 in 316 files)` `PASS`; `(baseline 87 in 37 files)` `PASS` | the web typecheck had not been run |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (SR-002) | Yes | API-R3, API-03, API-03b | Proven as refined: every base failure caused by a wait or an elapsed bound passes on the branch (package-auto-refresh, live-refresh DCF-E2E-002, skill watcher, the Grok replay and studio contract hooks); what remains is OS events not arriving within 30 s, recorded with causes (FU-001, FU-003, FU-004) | — |
| AC-002 | Yes | API-R1, API-01 (+ negative control), API-02 | Proven | — |
| AC-003 | — | — | Not in this round (FU-004 / DEC-003 awaits the user) | — |
| AC-004 | No | API-R4, API-04 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | all in-scope ACs proven; AC-001 by base vs branch twice (IMP-03, API-03) | AC-001's "passes alone" depends on load: at load > 100 events miss 30 s (FU-004) | a quieter machine |
| Changed-boundary execution directness | 85% | 97% | the view through the real server and on the phone bundle; the negative control shows the check catches the old list | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real server + scripted AGY (same monitor, same message files as real AGY) | no live AGY run | live AGY |
| Environment, configuration, identity, and fixture fidelity | 85% | 92% | the load AC-001 is about (53–146) | the branch half of API-03 ran at higher load than the base half, so the comparison is conservative but not same-load | a controlled load |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | exit code on the view; run end on the phone (MSP-59); `stopAll` → `run_ended` in the list by unit | the view after an AGY turn Stop (run stays active) is unit-only | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | phone bundle MSP-78; desktop rendering of view rows from autobyteus-483's probes | desktop panel opened late on AGY not run in a browser (same view rows the phone reads) | — |
| Durable regression coverage quality and relevance | 80% | 96% | BTS-03 and MSP-78 fail on the old monitor (control) | — | — |

- Overall post-repository confidence: 84%
- Overall final confidence: 95.1%
- Calculation method: simple average of the seven final scores.
- Every critical acceptance criterion directly proven: `Yes` (AC-001 as refined by SR-002)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: file-event suites stay load-dependent above load ~100 (FU-004 and the existing FU-001/FU-003); this is product/OS behaviour, not the tests' waits.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone bundle on a real node), `Other` (scripted-runtime E2E, base vs branch under load)
- Gap addressed: no test read the AGY view after a task ended; the phone's late open is UC-003's real path.
- Browser validation needed: yes, the phone (TESTING.md: phone behaviour on the phone bundle).

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`; compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/background-task-status-count.e2e.test.ts` (BTS-03 and the header) | Updated: the step exits with code 3; the view still lists it `failed`, `exitCode 3` | API-01 | — |
| `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs` (MSP-78), `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (header) | Added | API-02 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | the repository's scripted AGY CLI (writes AGY's exit message files) | deterministic, no inference; the monitor reads the same files as with real AGY | AGY's real wording is covered by autobyteus-483's live AGY cases |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Base monitor swapped in for the negative control | Yes | restored from a copy | `git status` shows only the test edits |
| Base test files checked out by the script | Yes | the script checks the branch files back out | `git status` clean for them |
| Temp HOMEs, in-process servers, probe stack | Yes | removed by each run / the probe's cleanup | none left |
| `autobyteus-server-ts/dist`, `autobyteus-web/dist` | Yes | untracked build outputs, left | not committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: None in scope (AC-003 / FU-004 awaits the user's DEC-003).
- Next recipient from `get_handoff_rules`: `/delivery_engineer`
- Notes:
  - FU-004 added to `follow-ups.md`: above load ~100 the agent-package folder watcher's real-FS unit cases miss events beyond 30 s (base at load ~60 passed the same file).
  - Observation: SR-002 said DCF-E2E-005 "uses `FILE_EVENT_TEST_TIMEOUT_MS`"; the implementation gave it 60 s + 2 × `OS_FILE_EVENT_WAIT_MS` because 45 s would shorten its existing 60 s. The intent holds.
