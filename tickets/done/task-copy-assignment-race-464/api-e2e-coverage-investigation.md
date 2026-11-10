# API/E2E Coverage Investigation — task-copy-assignment-race-464

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464/tickets/in-progress/task-copy-assignment-race-464/requirements-doc.md` (SR-001)
- Investigation Notes: `.../task-copy-assignment-race-464/investigation-notes.md`
- Solution Revision Record: `.../task-copy-assignment-race-464/solution-revision-record.md` (SR-001; SR-002 = ARCH-REV-001's accuracy fixes)
- Design Spec: `.../task-copy-assignment-race-464/design-spec.md`
- Supplemental Task Artifacts: `evidence/REPRO-01-race-diagnostics.log`, `evidence/PROTO-01-queued-release-prototype.log`
- Design Review Report: `.../task-copy-assignment-race-464/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `.../task-copy-assignment-race-464/architecture-review-revision-record.md`
- Implementation Handoff: `.../task-copy-assignment-race-464/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../task-copy-assignment-race-464/implementation-revision-record.md`
- Code Review Report: `.../task-copy-assignment-race-464/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `.../task-copy-assignment-race-464/code-review-revision-record.md`
- API/E2E Revision Record: `.../task-copy-assignment-race-464/api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Code review Pass CRR-001, branch `codex/task-copy-assignment-race-464` @ `3da0b47f31` (source `c29edfb1f7`), base `origin/personal` `c8f303af70`
- Prior Investigation Reviewed: None

## Current Requirement And Design Basis

A Manager's parallel `update_task(A, DONE)` and `delegate_task(copy, B)` must deliver B and leave the copy live in either order, in all root and copy kinds (REQ-001); a closure release never stops a copy an assignment or reactivation reopened, and one that comes first is settled before the reopening commits (REQ-002); deterministic tests fail on base (REQ-003); BEH-003 (DONE stops the copy, repeated DONE retries, root termination stops everything) and all texts and results unchanged (REQ-004); docs (REQ-005). Design D1: hosted closure release as queue step `release`, remote fence outside the queue, direct release while the root no longer admits (`!accepting`); D2/D3: reopening commits inside their `reopen` step; D4 tests; D5 docs. Classification Small/High, reviewed route.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (parallel DONE + assignment), SCN-002 (reactivation during a release), SCN-003 (DONE stops the copy).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-003 + C-01 (code review residual): a Manager DONEs a copy's Task while the copy is mid-turn in a tool call that waits on a root-queue step queued behind the release (`delegate_task` → `activate`, `send_message_to` → `wake`). The release step now stops the copy at the queue head; if the stop waited for that tool call, the root's queue would stall up to the native 10 s deadline and the stop could fail, a change to BEH-003. Real trigger: the native runtime's stop path (`AgentFactory.removeAgent(id, ~10)`). The AGY/Claude/Codex runtimes kill their process, so only the native runtime can hold.
  - SCN-003 + root termination (BEH-003 "root termination stops everything", D1's explicit state rule): a release queued when the root terminates still runs; a release requested after termination (or fail-stop) runs directly instead of being refused by the closed queue.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 (parallel DONE + assignment) | Changed | REPRO-01, D4, IMP-01/02/07 | Reuse D4 unit + EXC-E2E-004 runs; add the gated set run AC-004 names |
| BEH-002 (reactivation during release) | Changed | D4 reactivation case | Reuse |
| BEH-003 (DONE stops; termination stops all) | Preserved (now ordered in the queue) | Code review C-01, C-02 | C-01 probe on the real native agent; durable cases for the `!accepting` branch and a queued release at termination |
| Root queue ordering (all root kinds) | Changed | Design risk High | Gated delegation suites (reuse IMP-08) and the whole scripted gated set |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Per-root lifecycle queue: release and reopening commits | Unit (D4), integration, gated E2E | C-01 on native; termination branch untested | Native agent probe; durable unit cases |
| API / transport / contract | No (texts and results unchanged) | — | E2E | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Runtime stop of a hosted copy at the queue head | Unit doubles; scripted AGY E2E | Native runtime stop during a hanging tool | Probe with the real autobyteus-ts agent |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | Yes | Root queue; remote fence outside it | `remote-messaging-owners` unit | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-copy-assignment-race-464`
- Project type and runtime stack: pnpm monorepo; server `autobyteus-server-ts`; native runtime library `autobyteus-ts` (Vitest); macOS, Node v22.23.1
- Project testing guideline path(s): `TESTING.md` (repository root)
- Conflicting, missing, or unclear project instructions: None
- Changed build-input paths: `None` (`src/` and test files of `autobyteus-server-ts`, docs; no manifest, lockfile, config or contract package)
- Required environment variables or secrets available: `N/A` (scripted AGY CLI; no provider; no Codex)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | Clean env for E2E; scripted AGY gate; one heavy run at a time; rerun by impact; Rule 9 |
| Test file headers (`task-existing-copy-assignment`, gated set) | Gates | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` |
| `autobyteus-ts/tests/integration/agent/agent-loop-event-sequence.test.ts` | Pattern | Real agent with a scripted `BaseLLM` and `FunctionalTool` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server `dist/` and prepared outputs | worktree | IMP-04 (rebuilt after the source change) | — | `dist/app.js` | — |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Root/copy doubles | `tests/fixtures/root-task-copy-resume-fixtures.ts` | In memory | — |
| Native agent | autobyteus-ts `AgentFactory` + scripted LLM | Temp memory dir | Removed by the probe |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `root-task-existing-copy-assignment.test.ts` D4 cases (2 orders × Agent/Team copy) and updated QR-001 case | The interleavings of BEH-001 | AC-001, AC-002, REQ-003 | Still Valid | IMP-01 (fail on base), IMP-02 | Reuse; check what each part of the fix is pinned by (API-03) |
| `root-task-reactivation.test.ts` D4 case | BEH-002 | AC-003 | Still Valid | IMP-01, IMP-02 | Reuse |
| `remote-messaging-owners.test.ts` "fences it … a hosted run is still released" | Remote fence + hosted merge through the lifecycle | D1 | Still Valid | IMP-02 | Reuse |
| Termination with a queued release; release after termination/fail-stop | — (no test) | BEH-003, D1 `!accepting` rule | Missing | grep | Add Durable Coverage (API-02) |
| `task-existing-copy-assignment.e2e.test.ts` EXC-E2E-004 | Parallel DONE + assignment end to end | AC-004 | Still Valid | IMP-07 | Reuse; plus inside the gated set (API-04) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | BEH-003, REQ-004 (C-01) | Real native agent stop during a hanging tool call | Temporary Probe | Temp `autobyteus-ts/tests/integration/agent/zz-api01-probe-stop-during-hanging-tool.test.ts`; `pnpm -C autobyteus-ts exec vitest run <it> --no-watch` | Decides whether C-01 can stall the queue. Not durable: it characterizes autobyteus-ts stop semantics this ticket does not change; the content is kept in the evidence log |
| API-02 | BEH-003, REQ-004, D1 | Lifecycle release at root termination and fail-stop | Durable | New cases in `root-task-existing-copy-assignment.test.ts` (QR-001 describe neighbour); run the file | The new `!accepting` branch and the queued-release-at-termination path have no test |
| API-03 | REQ-003, AC-001, AC-003 | Mutation check of D1, D2, D3 against the unit tests | Temporary Probe | Revert one part of the fix at a time in `src`, run the existing-copy, reactivation and remote-owners unit files, restore | Shows each part of the fix is pinned by a test |
| API-04 | AC-004, AC-005, QR-001 | Whole scripted-AGY gated set (60 files) under the machine's load | Existing Test | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run $(grep -rlE RUN_AGY_FAILURE_E2E tests/e2e \| sort)` | AC-004 names "inside the scripted-AGY gated set"; implementation ran the file and a subset only |
| API-05 | AC-005 | Focused unit folders + server typecheck with API-02's edit | Existing Test | IMP-02's command; `pnpm -C autobyteus-server-ts typecheck` | A unit test file changes |
| API-06 | AC-006 | Docs | Existing Test (docs review) | Read `projects.md`, `agent_team_execution.md` diff | Docs criterion |
| API-07 | AC-001…AC-005 | Implementation checks | Reused | IMP-01, IMP-02, IMP-03, IMP-05, IMP-06, IMP-07, IMP-08, IMP-09 | All at `c29edfb1f7`, the same source as HEAD (`3da0b47f31` adds review documents only) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02 | `autobyteus-server-ts/tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts` | D1's state rule is new code: without a test, a later change that always queues the release would leave copies running after root termination (the closed queue refuses the step) |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| C-02 / MP-002: a release queued at root fail-stop is rejected | Out of scope (requirements, code review) | Logged; repeated DONE retries | No | None |
| Live-provider runtimes | No provider proof needed; user direction on Codex | — | No | None |

## Ambiguities Or Reroute Triggers

None at planning.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-02)
- Reroute Required Before Validation Execution: `No`
