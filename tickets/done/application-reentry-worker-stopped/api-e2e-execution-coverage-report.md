# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: 2, test review CRR-002 TR-001 (Local Fix, API/E2E-owned): RE-05's `readBrief` now selects the fields the test reads (`briefId latestRunId latestBindingStatus lastErrorMessage`), as Brief Studio's UI does; the optional `ps` portability note applied (`ps -A -o …`, as the repository's existing process listing). Round 1: code review CRR-001 passed (reviewed route, `Medium` / `High`)
- Prior round reviewed: round 1 (`API-REV-001`, Pass; test review CRR-002 Fail on TR-001)
- Deviations from the investigation's plan, and why: RE-05's trigger changed during the round. The first design ended the drafting run with the host's GraphQL `terminateAgentTeamRun`, and the first run showed that this mutation cannot find application-owned team runs. A temporary probe confirmed it fails while the app is ACTIVE too: app runs end through the host's binding API, which Brief Studio does not expose (`API-07-probe-re05.log`). RE-05 now uses another real way for a run to end: its runtime process dies while the application is quarantined (`API-07-probe-re05b.log`).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 1: `1103e38619` + the API/E2E test change (`ebb6c8ef88`); round 2: `c24014c46b` + the TR-001 fix (committed with this report); code `6950a24e1b` throughout | macOS 26.5.2, Node v22.23.1 | Server E2E from source (vitest), real studio server over HTTP; real application worker processes; scripted runtime CLIs (`agent-runtimes-fake-cli.mjs`) | `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned data dir; Brief Studio importable package |
| ENV-1-mut-a | ENV-1 with `resumePendingEventsForApplication` removed from `ApplicationReentryService.recoverParticipants` | same | same | Restored with `git checkout`; `git diff` of `src` empty |
| ENV-1-mut-b | ENV-1 with the handle-less reset removed from `ApplicationEngineController.stopEngine` | same | same | Restored with `git checkout`; `git diff` of `src` empty |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-004 | real server reload/repair | Reused: IMP-01, IMP-00 | — | Pass | — | — | Ran on `6950a24e1b`; only ticket files changed since. Rerun as part of API-07 (RE-01…03 pass again) |
| API-02 | AC-005, AC-006, AC-007, MP-001 | units + architecture | Reused: IMP-02 | — | Pass | — | — | Same reason |
| API-03 | AC-007 | 238 import e2e, running-agents e2e | Reused: IMP-03 | — | Pass | — | — | Same reason |
| API-04 | AC-007 | application-backend integration | Reused: IMP-04 | — | Pass | — | — | Same reason |
| API-05 | AC-007 | server typecheck | Reused: IMP-05 | — | Pass | — | — | Same reason |
| API-06 | AC-008 | docs | Review of `git diff ddd6fdcdf6 6950a24e1b -- autobyteus-server-ts/docs` against the code and the observed RE-04/RE-05 behavior | — | Pass | — | `application_orchestration.md`: "reruns binding recovery … then restores `ACTIVE` with the worker still `stopped`, then resumes pending-event dispatch … opens its application tools"; "Reentry never starts the worker. The next `ensure-ready`, application tool call or pending event boots a fresh worker"; "a reentry also resets a crashed worker"; `applications.md` bullet the same | RE-05 shows a pending event booting the worker; RE-04 shows the crash reset |
| API-07 | AC-001…AC-004 (RE-01…03), MP-001 / REQ-001 / SCN-004 (RE-04), REQ-002 / AC-005 / BEH-002 / SCN-005 (RE-05) | real server, real worker process, real journal, real dispatch | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-reload-repair.e2e.test.ts --no-watch --reporter=verbose` (cwd: worktree root) | ENV-1 | Pass | `API-07-e2e-reload-repair-RE-01-05.log`; first run with the first RE-05 design `API-07-e2e-run1-RE-05-first-design.log`; design probes `API-07-probe-re05.log`, `API-07-probe-re05b.log` | `Tests  5 passed (5)`. RE-04: worker SIGKILLed → status `failed` with "Application worker exited unexpectedly" → repair `state: ACTIVE` → status `stopped` → usable, new worker pid. RE-05 (probe log shows the values): after the repair, with no application call, status `preparing_storage` → `ready`; brief `"latestBindingStatus":"FAILED","lastErrorMessage":"Codex app server process closed unexpectedly (SIGKILL)."` | RE-04/RE-05 are new durable cases. RE-05 trigger: Codex signed out → package reload → quarantined with the reason (503, "Codex authentication is unavailable") → the run's runtime process dies → sign in → repair → the resumed dispatch delivers the run's failure to the application |
| API-07 (round 2) | same as API-07 | same | TR-001 fix: `readBrief` selection set, `ps -A -o`; the API-07 command | ENV-1 | Pass | `API-07-r2-e2e-reload-repair-TR-001-fix.log` | `Tests  5 passed (5)` | Only the two lines changed (`git diff ebb6c8ef88 HEAD -- <file>`); API-08's mutations exercised the same assertions, unchanged |
| API-08 | discrimination of RE-04 / RE-05 | same, with one mutation each | (a) remove the dispatch resume from reentry; (b) remove the controller's handle-less reset; the API-07 command each time; restore | ENV-1-mut-a, ENV-1-mut-b | Pass (each mutation is caught by its case only) | `API-08a-mutation.log`, `API-08b-mutation.log` | (a) `RE-05 … → the dispatch drain started the worker: last value {… "state":"stopped" …}`, `Tests  1 failed \| 4 passed (5)`; (b) `RE-04 … → expected 'failed' to be 'stopped'`, `Tests  1 failed \| 4 passed (5)` | Shows that RE-05 guards REQ-002 on the real stack and RE-04 guards MP-001 |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-07 (RE-01) | Proven | — |
| AC-002 | Yes | API-01, API-07 (RE-02) | Proven | — |
| AC-003 | Yes | API-01, API-07 (RE-03) | Proven | — |
| AC-004 | Yes | API-01, API-07 (RE-03) | Proven | — |
| AC-005 | Yes | API-02 (unit order); API-07 RE-05 + API-08 (a) (real stack: dispatch after ACTIVE starts the worker and delivers the event) | Proven | — |
| AC-006 | Yes | API-02 | Proven | — |
| AC-007 | Yes | API-02…05 | Proven | — |
| AC-008 | No | API-06 | Proven (review) | — |
| AC-009 | No | — | Not in API/E2E scope (the Solution Designer's Terminal report) | — |
| MP-001 (SR-002) | Yes | API-02; API-07 RE-04 + API-08 (b) (real worker process) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 100% | AC-001…008 and MP-001 (API-01…08) | — | — |
| Changed-boundary execution directness | 90% | 100% | Real reentry with a real worker, journal and dispatch (API-07) | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | Units fake the worker start; RE-04/RE-05 use the real worker process and the real dispatch drain | Runtime CLIs scripted (no inference needed for this path) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Clean env, test-owned data, Brief Studio package | Server E2E, not the packaged desktop server (no shell code changed) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Signed-out import and recovery; worker crash and recovery; an event recorded while quarantined | Accepted residuals (stop clears `lastFailure`; brief ACTIVE window before tools open; start failure surfaces on first use) | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Server-only change; the web app has no reload/repair action (finding 4); the open UI's backend calls are the gateway calls RE-01/RE-02 make | — | — |
| Durable regression coverage quality and relevance | 90% | 95% | RE-01…05; mutations show RE-04/RE-05 catch their regressions | — | — |

- Overall post-repository confidence: 88%
- Overall final confidence: 97% (simple average of the six applicable final scores)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the accepted residuals listed in the design and code review

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` / `Worker or Distributed` (server E2E with real worker processes and the real dispatch)
- Gap closed: the real worker crash and the pending-event dispatch after a reentry, which the code review left to API/E2E
- Browser / desktop validation needed: no. It is a server-only change with no shell code; the web app has no reload/repair action, and an open UI's backend calls are the gateway calls the e2e makes after the reload.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`; compatibility-only behavior observed: `No`; durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts` RE-04 | Added | API-07, API-08 (b) | — |
| same file, RE-05 | Added | API-07, API-08 (a) | — |
| same file, header (cases list), helpers (`status`, `appGraphql`, `childPids`, `workerPids`, `until`), RE-03 stores the imported application in `imported` | Updated | API-07 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs (Codex, Claude, AGY, Grok) | Scripted `agent-runtimes-fake-cli.mjs` | Deterministic sign-in states; no inference needed | None for this change |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `tests/e2e/runtime/zz-probe-ab296-re05*.e2e.test.ts` (two design probes) | Yes | Deleted after each run | Not in the tree |
| Mutations (a) and (b) in `src` | Yes | `git checkout` right after each run | `git diff` of `src` empty |
| Test servers, data dirs, worker and runtime processes | Yes | Test teardown (`fastify.close`, `fake.dispose`) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None` (AC-009 is outside API/E2E: the Solution Designer's report)
- Next recipient from `get_handoff_rules`: Code Reviewer (proportional test-code review)
- Notes: a product fact found while designing RE-05 (outside this ticket): the public GraphQL `terminateAgentTeamRun` cannot find application-owned team runs. App runs are ended through the host's binding API, which Brief Studio does not expose, so a user cannot stop a Brief Studio run from the run views. Recorded as FU-006 in `follow-ups.md`. RE-04 and RE-05 also cover part of FU-003 (a worker crash followed by a repair; a pending event delivered after a reentry). Package removal with a live run and a crash followed by a tool call remain in FU-003.
