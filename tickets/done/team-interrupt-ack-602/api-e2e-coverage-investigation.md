# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/team-interrupt-ack-602/requirements-doc.md`
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec (required on every route): `design-spec.md`
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `N/A` (first round)
- Current Investigation Round: 1
- Trigger: the implementation engineer's direct handoff (Small / Low), head `7245345fbb`, change `51b49e22e3`
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001: TF-04 waits for the interrupt's `AGENT_COMMAND_ACK` (limit `OS_FILE_EVENT_WAIT_MS`), then asserts it is accepted for the writer; no assertion weakened, no fixed sleep.
- AC-001: the file passes 12 of 12, three runs in a row on a loaded macOS (load ≥ 30) and once in a Linux container, with the header's gated command.
- AC-002: with the ack after the release (587's order), TF-04 still passes, and fails only when no ack arrives within the limit (the receipt records the frame order).
- Out of scope: any server change; TF-01 … 03, 05 … 12.

## Supported Scenarios And Real Usage

- The scenario is the test itself (the gated suite on a loaded developer machine and on Linux); the product behavior (the ack after the interrupt's effects, BEH-001) is unchanged.
- Contrived scenarios: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-002 TF-04's ack read | Changed (a positive, limited wait) | REQ-001 | run the file as AC-001 says; check each TF-04 receipt |
| BEH-001 the ack's order | Preserved | F-1 | the receipt's frame order (ack after `RUN_TREE_CHANGED`) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (test timing) | TF-04's wait and its case time limit | IMP-02 (one run, macOS load 53), IMP-03 (missing ack fails) | repeatability under load; Linux | three consecutive loaded-Mac runs; a Linux container |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `~/autobyteus_org/autobyteus-worktrees/team-interrupt-ack-602`
- Testing guideline: `TESTING.md` (root): the OS-latency limits from `tests/helpers/os-latency-under-load.ts`; clean environment for E2E; the Linux container from the worktree as the run where the OS delivers events promptly.
- Changed build-input paths: none (one test file); no fresh-start build case.
- Secrets: none (scripted AGY).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| the test file's header | the gated command | `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<server>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts --no-watch`; `TEAM_FOLLOWS_E2E_EVIDENCE_DIR` keeps the receipts |
| `TESTING.md` | guideline | OS-latency rule; Linux container from a `git ls-files` archive, frozen install |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| built server (`dist/app.js`) | `autobyteus-server-ts` | the suite's helper | the worktree's `dist` (no `src` change against the base; built after the last `src` commit) | the suite's own | the suite's own |
| Linux container | a temp copy of `git ls-files` | `docker run --rm node:22-bookworm` with a frozen install and a build | test-owned | the suite's result | `--rm`; the temp copy removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Team definitions and runs | the suite's own public calls | test-owned roots | the suite removes them |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `team-run-follows-definition.e2e.test.ts` TF-04 (changed) | the leaving writer's interrupt is acknowledged and the writer released | REQ-001, AC-001, AC-002 | Still Valid (changed by IR-001) | the diff | run as AC-001 |
| the same file, TF-01 … 03, 05 … 12 | 22's cases | out of scope | Still Valid | — | run with the file (AC-001 is the whole file) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| REUSE-IMP | REQ-001, AC-002 (a missing ack fails) | typecheck; one run; the mutation | Reused | IMP-01, IMP-02, IMP-03 | on `51b49e22e3`; `7245345fbb` adds only ticket docs |
| MAC-1, MAC-2, MAC-3 | AC-001, AC-002 | the whole file, three runs in a row | Existing Test | the header's command, load recorded per run | AC-001 |
| LINUX-1 | AC-001 | the whole file in Linux | Existing Test | the header's command in `node:22-bookworm` from a `git ls-files` archive | AC-001 |

- Test progress log needed: `Yes`.

## Durable Coverage To Add

None.

## Durable Coverage To Update

None (IR-001 made the change).

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

None.

## Ambiguities Or Reroute Triggers

None.
