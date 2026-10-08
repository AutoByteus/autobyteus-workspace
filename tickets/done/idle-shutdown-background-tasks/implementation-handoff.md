# Implementation Handoff

Package: `idle-shutdown-background-tasks` — worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks`, branch `codex/idle-shutdown-background-tasks`, base `origin/personal` @ `3a2496c95`.

This handoff describes the current SR-003 (hybrid) implementation, `IR-003`. The SR-002 removal (IR-001/IR-002, commits `28afa0884`, `bf5889d03`) is superseded and fully undone outside `tickets/` (revert commit `a1dc499e4`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Medium/High) and passed: `ARCH-REV-002` for SR-003. After implementation, the handoff rule routes to source review by `/software_engineering_team/code_reviewer` (architectural_risk=High).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/requirements-doc.md` (SR-003, hybrid)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/investigation-notes.md` (HF-01..HF-08)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-spec.md` (SR-003, Ready)
- Supplemental task artifacts: `problem-report.md` (evidence only); `handoff-architecture-design-complete.md`; historical evidence `evidence/baseline-before*` (base behavior, still the valid "before" receipt) and `evidence/after*` (SR-002, historical)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-review-report.md` (ARCH-REV-002 Pass; AR-N-001 applied)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: SR-003 / ARCH-REV-002 (requirement change approved by the user: hybrid instead of removal). Earlier code review CRR-001/CRR-002 applied to the superseded SR-002 code.

## Current Implementation Summary

A delegated copy is not idle-shut-down while any of its agents' runtime reports a running background task (Claude registry, AGY monitor), with no time limit. Every other copy keeps the existing idle shutdown, grace setting and wake-on-message. When a background task ends, the copy's grace timer is re-armed. DONE, root stop/fail-stop and server stop are unchanged and do not consult background tasks.

- `AgentRunBackend.hasRunningBackgroundTasks(): boolean` is required on all five backends. Claude reads `ClaudeBackgroundTaskRegistry.hasRunningTasks()` through `ClaudeSession`. AGY reads `AgyBackgroundTaskMonitor.hasRunningTasks()`. Codex, AutoByteus and ACP return `false`.
- `AgentRunTermination.tryPrepareIfQuiescent` returns `null` while the backend reports a running task. The term sits before `tryQuiesceIfAlreadyQuiescent`, which closes admission as a side effect. `prepare()`, `isRootShutdownQuiescent` and the root fence are untouched. Team copies are covered because a Team is quiet only when every member's `AgentRun` is.
- `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded(agentRunId)` calls `armLive(chain)` while the root accepts. The Team (`TeamTaskExecutionService.onRootEvent`), Org and Standalone (`onAgentExecutionEvent`) roots forward `BACKGROUND_TASK_UPDATED` events whose status is not `running`.
- LLM contract sentence: "A copy that stays quiet is shut down after a while, but not while it has a running background task; a message to its run ID restores it with its conversation."

- Implementation cycle: `Rework` (requirement change SR-003)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/implementation-revision-record.md`
- Current implementation revision ID: `IR-003`
- Related solution revision IDs: `SR-003` (supersedes SR-002)
- Related architecture-review revision IDs: `ARCH-REV-002` (supersedes ARCH-REV-001)
- Related code-review revision IDs: `CRR-001`, `CRR-002` (reviewed the superseded SR-002 code; N/A to the current code)
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: N/A (applied ARCH-REV-002 note AR-N-001)

Commits on the branch since base `3a2496c95` (current state = base + `ba0437e00` + the hybrid change):
- `ba0437e00` test(baseline): stale `prepareTaskAgent` call in `mixed-team-run-backend.integration.test.ts` (kept).
- `28afa0884`, `62e4edf52`, `bf5889d03`: SR-002 removal and its ticket records (superseded).
- `a1dc499e4` revert: undo SR-002 outside `tickets/`. Check: `git diff 3a2496c95 a1dc499e4 -- . ':!tickets'` = only `ba0437e00`'s test change plus the kept `claude-delegated-background-task.e2e.test.ts`.
- `c304485d9` feat(task-execution): keep delegated copies with running background tasks out of idle shutdown (hybrid implementation, tests, docs, ticket records and hybrid evidence).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: Shared `AgentRunBackend` contract (five implementations) and the idle quiet predicate used by every runtime and all three root kinds; LLM-facing text; plus a full revert on the branch. Diff after the revert: 33 files, +423/−33.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The background signal is used only by `tryPrepareIfQuiescent`. Both runtimes answer synchronously from in-memory state: the Claude registry view and the AGY monitor's `running` map.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Claude copy idle with a running `run_in_background` task is not shut down; task completes; agent reports | `ClaudeBackgroundTaskRegistry.hasRunningTasks` → `ClaudeSession.hasRunningBackgroundTasks` → `ClaudeAgentRunBackend.hasRunningBackgroundTasks` → `AgentRunTermination.tryPrepareIfQuiescent` returns `null` | Live E2E (grace 60 s): fire at 60 s skipped, task `completed` 88.3 s, report 91.0 s, marker `done`. Unit: registry transitions, backend delegation, AgentRun quiet check |
| BEH-002 | Same for AGY background steps | `AgyBackgroundTaskMonitor.hasRunningTasks` → `AgyAgentRunBackend.hasRunningBackgroundTasks` | Unit: monitor transitions (track → exit → none; stopAll); backend true with open daemon, false after terminate. Not run live |
| BEH-003 | Last task ends → grace re-armed → shut down one grace later, with or without a following turn | Roots forward terminal `BACKGROUND_TASK_UPDATED` → `RootTaskExecutionLifecycle.onAgentBackgroundTaskEnded` → `armLive` (`schedule.arm` replaces any pending timer) | Unit (lifecycle, fake timers), Org unit through real `AgentOrgRun` (Agent + Team copy), Team integration, Standalone forward unit. Live: offline 60.3 s after the post-report idle (Claude, AC-005) |
| BEH-004/006/007 | Copies without running tasks keep idle shutdown, grace setting, wake-on-message; Codex/AutoByteus/ACP report none | Base code restored by `a1dc499e4`; three backends return `false` | Restored base idle-shutdown tests green |
| BEH-008 | DONE / root stop / server stop unchanged | No change to `prepare()`, `isRootShutdownQuiescent`, the root fence, release paths | AgentRun unit: `terminate()` and the root fence succeed with a running task and never ask `hasRunningBackgroundTasks` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Paths under `autobyteus-server-ts/src/`.

- Backend contract: `agent-execution/backends/agent-run-backend.ts`.
- Claude: `backends/claude/session/claude-background-task-registry.ts`, `backends/claude/session/claude-session.ts`, `backends/claude/backend/claude-agent-run-backend.ts`.
- AGY: `backends/antigravity/stream/agy-background-task-monitor.ts`, `backends/antigravity/backend/agy-agent-run-backend.ts`.
- `false` backends: `backends/codex/backend/codex-agent-run-backend.ts`, `backends/autobyteus/autobyteus-agent-run-backend.ts`, `backends/acp/backend/acp-agent-run-backend.ts`.
- Quiet term: `agent-execution/domain/agent-run-termination.ts`. The backend `Pick` gains `hasRunningBackgroundTasks`; `AgentRun` already passes its whole backend, so it needs no change.
- Re-arm: `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (`onAgentBackgroundTaskEnded`; `onAgentStatus` doc).
- Forwards: `agent-team-execution/task-delegation/team-task-execution-service.ts`, `agent-org-execution/domain/agent-org-run.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts` (the last two parse the payload with `parseBackgroundTaskUpdatedPayload`).
- LLM contract: `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`. Lines are reflowed so the rest of the paragraph stays byte-identical.
- Docs:
  - server `docs/modules/agent_team_execution.md`: Idle shutdown section and the contract summary.
  - `agent_execution.md`: Claude section.
  - `antigravity_cli_runtime.md`: monitor section.
  - `prompt_engineering.md`: exact mirror and summary (AR-N-001).
  - `agent_tools.md`: AR-N-001.
  - web `docs/agent_teams.md`.
- Tests:
  - `tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts`: 4 new cases.
  - `tests/unit/agent-execution/agent-run.test.ts`: 3 new cases; the harness fake gains the method.
  - Claude registry, Claude backend, AGY monitor and AGY backend tests.
  - `tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts`: Agent and Team cases.
  - `tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts`.
  - `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`: the double gains a set of agents with running background tasks.
  - The LLM contract golden hash plus the REQ-009 assertion, and the parity assertion (AR-N-001).
  - `tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts`: grace 60 s via `vi.stubEnv`, plus the AC-005 phase.

## Important Assumptions

- A Team copy is covered through its members' `AgentRun` quiet checks, so there is no team-level code. This is per HF-06, which the reviewer verified at base.
- Re-arming on every terminal update is harmless when another task still runs or the agent is busy: the fire-time check skips again, and a later idle or terminal update re-arms (design DS-002).
- Claude `clear()` on process close publishes `stopped` for a run being terminated. The hook goes through `armLive`, which arms only live executions (R-3).

## Known Risks

- QR-002 (accepted, DEC-005): a task whose end the runtime never reports (a never-ending AGY daemon, a missed terminal frame, an unreadable AGY exit-message format) keeps that copy live until DONE, root stop or server stop.
- Org teardown-event retirement is unchanged. A terminal `stopped` update published during a quiet shutdown goes to `onAgentBackgroundTaskEnded`, whose `armLive` finds the copy non-live afterwards and does nothing.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant (quiet predicate omitted runtime-owned work)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed` (beyond undoing SR-002)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: The invariant was added at its owner (`AgentRunTermination`) and exposed through the backend contract. The lifecycle never reads runtime registries.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (required method, explicit `false`; no optional field, no flag)
- Legacy old-behavior retained in scope: `No`. SR-002 is fully reverted outside `tickets/`, and no partial keep such as `withLiveChain`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`. The signal is a dedicated method, not a field on `AgentRuntimeLifecycleSnapshot`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`. Additions are 1–12 lines per source file.
- Notes: Untracked API/E2E files from the stopped round (`tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts`, `tests/e2e/runtime/agy-delegated-background-task.e2e.test.ts`, `api-e2e-*.md`, `evidence/api-e2e/`) were not touched and not committed.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Not Affected`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A. Background state is runtime-only, and the grace setting is restored unchanged.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Dependencies were installed earlier in this worktree (`pnpm install --frozen-lockfile`, server `prebuild`). Untracked `autobyteus-application-*/dist` is build output and not staged.
- Live E2E used the local Claude login (CLI 2.1.283, PATH candidate), model `haiku`.
- Pre-existing failures, identical on base, unrelated to this change, not fixed here. They were reported earlier and still need a separate item:
  - 56 tests in the focused suite set below, all in `tests/integration/agent-team-execution` (4 files), `tests/integration/agent-execution`, `tests/integration/agent`, and `tests/unit/services/media-storage-service.test.ts`.
  - The causes are stale backend/factory test doubles (`factory.beginPreparation` / `beginMaterialization is not a function`, `AgentRunManager requires all execution-family dependencies`) and environment-dependent cases.
  - Verified by running the identical suite set with the change stashed: same 56, none new, none fixed.

## Local Implementation Checks Run

- Revert verification:
  - `git diff 3a2496c95 a1dc499e4 -- . ':!tickets'` shows only the two kept files.
  - After the revert, the focused base suites were green apart from the known `media-storage-service` failure (2642 passed).
  - The web spec `agentOrgContextHydration.spec.ts` passed (12).
- `npx tsc -p tsconfig.build.json --noEmit`: pass.
- `npx tsc -p tsconfig.json --noEmit`: no errors other than the existing TS6059 rootDir notices.
- New/changed test files, run individually, all pass:
  - root-task-execution-lifecycle: 21
  - agent-run: 42
  - Claude registry and AGY monitor: 46
  - Claude backend and AGY turn lifecycle: 15
  - agent-org-task-idle-shutdown: 8
  - standalone-agent-run-root: 19
  - task-delegation-tool-lifecycle integration: 11
- Focused suite set: `vitest run tests/unit/agent-collaboration tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/agent-execution tests/unit/standalone-agent-run-root tests/unit/services tests/unit/agent-memory/agent-run-memory-recorder.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/standalone-agent-run-root tests/integration/agent-execution tests/integration/agent`. Its failing-test list is identical to base (56 base failures; 0 new, 0 fixed).
- AC-001/AC-005 gated live Claude E2E: `RUN_CLAUDE_E2E=1 DELEGATED_BACKGROUND_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts --no-watch`. PASS with grace 60 s. Timeline from idle:
  - The grace fire at 60 s was skipped (no `offline`).
  - The task `completed` at 88.3 s; the marker reads `done`.
  - The report reached the delegator at 91.0 s.
  - The copy was idle after the report turn at 92.8 s.
  - The copy went `offline` at 153.1 s, 60.3 s after going quiet (`quietToOfflineMs` 60 271).
  - Receipts: `evidence/hybrid/ac-001-2e190584.json`, `evidence/hybrid.log`. The base "before" receipt stays `evidence/baseline-before/ac-001-64ff1474.json` (task stopped at 60 012 ms).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — backend-only behavior change. The web change is one docs sentence.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: rerun the Claude live E2E (it also covers AC-005).
- AC-002: AGY delegated copy with a daemon `run_command` step past the grace (scripted `agy-failure-cli.mjs` or live AGY). The copy should stay live while the step is open, then shut down one grace after the exit message.
- AC-003: delegated Team copy (Org root) where one member has a running background task. The Team should stay live, then shut down one grace after the task ends.
- AC-004: background task ends with no following turn (AGY). Expect shutdown one grace later.
- AC-006: quiet copies on Codex, AutoByteus and ACP are still shut down after the grace and wake on message (existing `mixed-task-delegation.e2e.test.ts` LIVE-001..005 restored unchanged).
- AC-007: DONE and root stop while a background task runs. The copy and its task stop (`stopped` snapshot), with no waiting.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001..AC-008 across Team, Org and Standalone roots, owned by `api_e2e_engineer` after code review. It can decide whether to reuse the untracked files from the stopped round.
- AGY (AC-002/AC-004) has not been exercised against a real or scripted AGY CLI.
- `mixed-task-delegation.e2e.test.ts` (restored to base) has not been run (it needs LM Studio + Codex + Claude).
