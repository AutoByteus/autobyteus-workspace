# API/E2E Coverage Investigation — autobyteus-524 round 1: FU-003 (native command start and stop limits)

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-001, Ready; Small / Low)
- Supplemental Task Artifacts: `evidence/run-bash-burst-probe.mjs`, `evidence/measure-command-start-handshake.mjs`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 from `/implementation_engineer`, 2026-11-17
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

The native command scope's limits are named in `command-deadline.ts`: start handshake 30 s (or the call's timeout when shorter), observation and retirement 10 s, stop confirmation 30 s; graces (500 ms, 500 ms, 1 s) and the 3 s host-shutdown budget unchanged. A single `ps`/WSL run has no cap of its own; it is bounded by its step's deadline. A start that does not complete says "Command did not start within N s: <reason>"; a launch that errors still fails at once. Success: the burst probe passes with 60 and 200 commands at once on a loaded machine (AC-001; QR-001: 200 at load ~160). Implementation decisions to check: I-1 (a Stop during a slow start ends the call as the Stop, `tool-abort`), I-2 (the cancelled-launch error names the stop reason). Risks to measure: K-1 (200-burst slowest start close to 30 s), K-2 (run-end stop confirmation up to 30 s), K-3 (host close keeps 3 s).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (run a command on a busy machine, one or many at once), SCN-002 (stop, inspect, retire on a busy machine).
- Real-use scenarios added from the implementation:
  - SCN-A1: a user presses Stop while the agent's command is still starting on a busy machine (I-1); trigger: the run's Stop / a tool abort signal.
  - SCN-A2: an agent passes a short `timeout_seconds` while starts are slow (AC-002 through the real `run_bash`, not a fake launcher).
  - SCN-A3: a native agent run with background commands is terminated through the real server on a busy machine (K-2: run-end stop).
- Contrived (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 start limit 30 s / call timeout | Changed | REQ-001, IMP-02/03 | burst probe at the current load (API-01); short-timeout probe (API-02) |
| BEH-002 no per-read `ps` cap | Changed | REQ-002, IMP-03 | unit reused; burst probe exercises it (failure kind "Process observation deadline exceeded" must not appear) |
| BEH-003 observation 10 s, stop 30 s | Changed | REQ-003, IMP-03 | unit reused; server background-task and shutdown E2E (API-04) |
| BEH-004 failure text | Changed | REQ-004 | unit reused; API-02 through the real `run_bash` |
| I-1 Stop during start → tool-abort | Added (implementation decision) | handoff I-1 | API-02 through the real `run_bash` with an abort signal |
| I-2 cancelled-launch reason | Changed | handoff I-2 | unit reused |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `autobyteus-ts` command scope, observer, executor | IMP-03, IMP-04, IMP-05 | real OS process table under load | burst probes (Process/Lifecycle) |
| API / transport / contract | No | `run_bash` result shape unchanged; stderr text changed | IMP-03 | — | — |
| Frontend / browser / desktop | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Process / lifecycle | Yes | process start, stop, retirement, run end, host close | IMP-03…IMP-06 | real server run end and shutdown under load | server E2E (background tasks, shutdown, terminal) |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (OS `ps`, WSL) | `ps` read timing | IMP-01/02 | WSL (no host) | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524` (branch `codex/native-follow-ups-524`, source `80483cce9d`)
- Project type and runtime stack: pnpm monorepo, TypeScript; `autobyteus-ts` (library), `autobyteus-server-ts` (server); Node 22.23.1; macOS
- Project testing guideline path(s): `TESTING.md` (root)
- Conflicting, missing, or unclear project instructions: none
- Changed build-input paths: `None` (`git diff --name-only ff13782f36...80483cce9d` touches only `autobyteus-ts/src/tools/terminal/command-execution/*`, tests and ticket files)
- Required environment variables or secrets available: `N/A` (no provider calls)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` "Choosing the path" | core agent runtime or tools | `autobyteus-ts` tests + server tests for integration |
| `TESTING.md` "Rerun by impact" item 4 | `autobyteus-ts` is a shared foundation | server suites rerun; whole server unit and integration here |
| `TESTING.md` "Environments" | one heavy run at a time; clean env; busy Mac rules | `env -i PATH HOME=<resolved temp> TMPDIR`; record load per case |
| server E2E headers (`autobyteus-background-task-transport`, `shutdown/*`, `terminal/*`) | gates and commands | `RUN_NATIVE_BACKGROUND_TASK_E2E=1` for the background-task suite |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` dist | worktree | `pnpm -C autobyteus-ts build` | serialized | `dist/` present | untracked output |
| in-process / built servers | `autobyteus-server-ts` | started by the suites | test-owned data roots | suite readiness | suite teardown |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| temp workspaces for probes | `mkdtemp` in the probe | test-owned | removed by the probe |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/terminal/command-execution/{process-group-observer,shell-command-executor,native-command-process-scope}.test.ts` | limits, no per-read cap, message, immediate launch failure, I-1 | AC-002…AC-005 | Still Valid | read; IMP-03 (8 new cases fail on old source) | Reuse IMP-03 |
| cleanup-hook timeouts in `terminal-tools`, `run-bash-wrapper`, `background-process-manager`, `tool-approval-flow` tests | hooks wait for the stop limit | AC-006, K-2 | Still Valid (tests follow the new stop limit) | read diff | Reuse IMP-04/IMP-05 |
| server `tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts` (gated) | native background commands through the real server: start, kill, Terminate, Stop | SCN-002, K-2 | Still Valid (BGT-09 fails on its root view reading, FU-008 of 515) | read | Run (API-04) |
| server `tests/e2e/shutdown/*.e2e.test.ts`, `tests/e2e/terminal/*.e2e.test.ts` | host shutdown with running commands; terminal sessions | SCN-002, K-3 | Still Valid | read | Run (API-04) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-002…AC-005, I-1, I-2 | command-execution unit | Reused | IMP-03 | ran on `80483cce9d`, the final source |
| API-R2 | AC-006 | whole `autobyteus-ts`, terminal integration, server command tests, typechecks | Reused | IMP-04, IMP-05, IMP-06, IMP-07 | ran on `80483cce9d` |
| API-01 | AC-001, QR-001, K-1, REQ-002 | real `run_bash` through the built library, real OS | Temporary Probe | `evidence/API-01-burst-latency-probe.mjs <root> <N>`: N = 10, 60, 200, three rounds, load recorded; per-call latency percentiles and failure kinds | the probe is the AC's verification intent; a durable test cannot pin machine load |
| API-02 | AC-002 (real path), REQ-004, I-1 (SCN-A1, SCN-A2) | real `run_bash` with `timeout_seconds` and an abort signal during a 200 burst | Temporary Probe | `evidence/API-02-start-cut-probe.mjs <root>` | needs a slow start, which only a burst produces |
| API-03 | AC-006; TESTING rerun by impact | whole server `test:unit` and `test:integration` | Existing Test | `pnpm -C autobyteus-server-ts test:unit`; `test:integration:prepare`, `test:integration` | handoff "not run"; `autobyteus-ts` is a shared foundation |
| API-04 | SCN-002, SCN-A3, K-2, K-3 | real server: native background commands, run end, host shutdown, terminal | Existing Test | `RUN_NATIVE_BACKGROUND_TASK_E2E=1 … autobyteus-background-task-transport.e2e.test.ts`; `tests/e2e/shutdown`; `tests/e2e/terminal` | the server paths that stop native commands |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None planned: the unit cases added by the implementation cover the limits; the burst depends on machine load.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| WSL starts and kills | no WSL host (ASM-001) | WSL `ps`/kill timing unmeasured | No (needs a Windows machine) | recorded |
| QR-001 at exactly load ~160 | the load comes from other processes on this machine | measured at whatever load occurs, recorded per round | No | recorded |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: one heavy run at a time; load average recorded per case.
