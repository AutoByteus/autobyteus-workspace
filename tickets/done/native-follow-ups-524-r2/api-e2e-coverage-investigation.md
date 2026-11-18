# API/E2E Coverage Investigation — autobyteus-524 round 2: FU-006 and FU-007

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `design-spec.md` (SR-002, Ready; Small / Low)
- Supplemental Task Artifacts: `evidence/built-server-stop-probe.mjs`, `evidence/built-server-stop-probe-with-timings.mjs`, `evidence/RF-00*.jsonl`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md` (IR-001 DI-001, IR-002)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1 (of this package)
- Trigger: implementation handoff IR-002 from `/implementation_engineer`, 2026-11-18
- Prior Investigation Reviewed: N/A (round 1 of 524 is a separate package, `native-follow-ups-524`)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

FU-006: the available-agent-runtimes (AAR) E2E hides the DeepSeek Harness (`DEEPSEEK_HARNESS_COMMAND` → a missing command), so it passes whatever is installed (AC-001). FU-007: at process shutdown, the package-folder and skill-folder watchers stop handling events without closing their OS watches; the process exit releases them, so a built server stops in well under a second on a loaded host (AC-002, QR-001: < 1 s at load ~100+). Every other close still closes the OS watches (REQ-003). Order at shutdown: record → stop file watches → `app.close()`; the 10 s shutdown bound and the process-tree sweep are preserved.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (run the E2E suite with `dsh` installed), SCN-002 (stop a built server: E2E harness SIGTERM, desktop quit, node stop).
- Real-use scenario added: SCN-A1, the desktop app quitting its embedded server through the shutdown IPC message (`autobyteus.embedded-server.shutdown.v1:request`), which the SIGTERM probe does not send; same cleanup, different entry. The probe also checks the `complete` reply the desktop waits for.
- Contrived (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 AAR hides `dsh` | Changed (test) | IMP-01 | rerun inside the whole E2E (the in-process server it drives changed in 2e5b0198e2) |
| BEH-002 exit path skips OS close | Changed | IMP-02, IMP-03 | stop probe (SIGTERM) and IPC probe on the built server, at the current load |
| BEH-002 other closes release OS watches | Preserved | IMP-03 | unit reused; in-process E2E servers (closed by `app.close()` without the exit stop) inside the whole E2E and integration runs |
| Moved `closeStudioProcessResources` | Moved unchanged | K-2, IMP-07 | architecture tests reused; whole suites |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | watcher stop, studio composition | IMP-03, IMP-04 | — | — |
| Process / lifecycle | Yes | server shutdown (SIGTERM, IPC) | IMP-02 (SIGTERM), IMP-05 | IPC (desktop) entry; load 100+ | built-server probes |
| API / transport | No | — | — | — | — |
| Frontend / desktop shell | No (desktop quit uses the server's IPC path; no Electron code changed) | — | — | — | IPC probe stands in for the shell's message |
| Persisted data | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2` (branch `codex/native-follow-ups-524-r2`, head `f1b61d0c52`; server built from `2e5b0198e2`, and `2e5b0198e2..f1b61d0c52` changes only one unit test and ticket files)
- Stack: pnpm monorepo, TypeScript, Node 22.23.1, macOS
- Testing guideline: `TESTING.md` (root)
- Conflicting instructions: none
- Changed build-input paths: `None`
- Secrets: `N/A`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` "Choosing the path" | backend, runtimes | server tests + server E2E |
| `TESTING.md` "Environments" | built server for `dist/app.js` suites; one heavy run at a time; busy-Mac file-watching rule | `env -i … HOME=<resolved temp>`; record load and `fseventsd` |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | how suites start a built server | `startBuiltTestServer`, `materializeTestRuntime`, `createSanitizedTestEnvironment` |
| `src/shutdown/server-process-shutdown.ts` | shutdown entries | SIGINT, SIGTERM, IPC `…shutdown.v1:request`, reply `…:complete`/`…:failed` |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` | runtime list with fake CLIs, harness hidden | AC-001 | Still Valid (updated by FU-006) | IMP-01 | Run inside API-04 |
| `tests/unit/compositions/studio-file-watch-exit.test.ts`, watcher test cases, migration-gate order | exit stop vs ordinary close | AC-003 | Still Valid | IMP-03 | Reuse |
| the nine built-server start/stop E2E files of 493 FU-005 | built server start/stop | AC-004 | Still Valid | IMP-05 | Reuse; also inside API-04 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-003, AC-004 (part) | unit, built-server E2E files, typechecks, architecture tests | Reused | IMP-03, IMP-05, IMP-06, IMP-07 | ran on `2e5b0198e2` (+ the test update) |
| API-01 | AC-002, QR-001 | built server, SIGTERM (E2E harness, node stop) | Temporary Probe | `evidence/built-server-stop-probe.mjs <worktree> 10 3000`, load and `fseventsd` recorded; repeated when the load is at the designer's 100–125 if it gets there | the AC's own probe; load-dependent |
| API-02 | AC-002, SCN-A1 | built server, desktop IPC shutdown message | Temporary Probe | `evidence/API-02-ipc-shutdown-probe.mjs <worktree> 10 3000`: spawn `dist/app.js` with an IPC channel as the desktop does, wait for `ready`, send `request`, time to `complete` and exit | the desktop's entry; building Electron is not needed for the server path |
| API-03 | AC-004 | whole server `test:integration` | Existing Test | `test:integration:prepare`, `test:integration` | handoff "still required" |
| API-04 | AC-001, AC-004, REQ-003 (in-process servers closed normally) | whole server E2E | Existing Test | `env -i … pnpm test:e2e` | handoff "still required"; the composition changed |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Linux/Windows | no host (ASM-001) | the change only removes work | No | recorded |
| A packaged desktop quit | the Electron shell is unchanged; API-02 sends the shell's message to the server | the shell's own wait/kill timing | No | recorded |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: one heavy run at a time; load and `fseventsd` recorded.
