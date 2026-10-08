# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` at SR-002, approved by the user 2026-10-08 ("yes. i think we should remove it. lets go", DEC-004)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/investigation-notes.md` (findings AF-01..AF-18)
- Authorities read (2026-10-08): `references/architecture-design.md`, `design-principles.md`, `DESIGN.md` (repo root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–2. `design-examples.md` not used.
- Project design-principle conflicts: none.

## Current-State Read

Delegated copies (task executions: a delegated Agent or Team, including brought-in helpers) are owned per root by `RootTaskExecutionLifecycle` (`agent-collaboration/execution/task/`). It serializes activate / wake / shutdown / reopen through `RootTaskExecutionCommandQueue` and talks to one subject adapter per root kind (`TeamTaskExecutionAdapter`, `AgentOrgTaskExecutionAdapter`, `StandaloneRootTaskExecutionAdapter`).

Idle shutdown is a separate mechanism inside that owner: agent status `idle/offline/error` arms `TaskExecutionIdleShutdownSchedule`; on fire the lifecycle queues `shutdown`, which calls `adapter.tryShutDownIfQuiet`. That descends through registries and team managers to `AgentRun.tryPrepareTerminationIfQuiescent`, whose quiet test ignores runtime background tasks (root cause of BEH-001/002). A lease counter (`withLiveLease`/`acquireLiveLease`) keeps a chain from being shut down during a delivery; the same call also restores a non-live chain at the queue head before delivery.

Everything else — Task DONE release (`releaseTaskAgentResources`), reactivation (`reopen` + restore), root stop / fail-stop, restore after a server restart (`assertRestorableChain`, `restoreChain`), liveness (`isLive`) and status forwarding to the Task side — is independent of idle shutdown (AF-02, AF-16).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: Removal-dominated change in `autobyteus-server-ts`: ~25 source files touched (one file and one class deleted outright, the setting file deleted, the rest are method/field deletions and pass-through removals), one LLM-facing text change, ~15 test files rewritten or deleted, ~8 docs. No new owner, API or persistence. Spans collaboration task lifecycle, team execution, org execution, standalone root, agent-execution termination and settings (AF-01..AF-18).
- Architectural risk: `High`
- Risk rationale: Removes a lifecycle/concurrency authority (idle shutdown, quiet-termination chain, lease counting) that is interleaved with the serialized task-execution queue, restore, DONE release and Org event suppression; changes an LLM-facing collaboration contract; changes operational resource behavior (copies stay live until DONE/root stop). Blast radius covers all three root kinds.
- Escalation trigger: if implementation finds a non-idle caller of any item in the Removal Plan, or a supported path that needs a copy to become non-live other than DONE, root stop, fail-stop or server stop, stop and return a Design Impact.

## Architecture Investigation Evidence

| Source | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code grep | AF-01..AF-12 | Every quiet-shutdown method, schedule, event retirement, teardown error and option is reached only from the idle timer | Remove them all (clean cut) | None found |
| Code | AF-02 | `leases` is read only by `shutdownAtHead`; restore at queue head is used by 13 delivery callers | Keep restore-at-queue-head, drop lease counting; rename the entrypoint | — |
| Code | AF-16 | Non-live copies still arise after restart and DONE | Keep `isLive`, restore, wake command | — |
| Code | AF-15 | Stale settings key becomes a custom setting with no reader | Directly usable, no migration | — |
| Code | AF-13 | LLM contract promises quiet shutdown | Change the sentence | — |
| History | Investigation "Is Idle Shutdown Still Needed?" | DONE releases every new copy since 2026-10-06 | Removal is safe for supported scenarios | Legacy pre-2026-10-06 copies: released only by root/server stop (accepted, out of scope) |

## Intended Change

Delete idle shutdown entirely. Delegated copies stay live until Task DONE, root stop/fail-stop or server stop. Delivery to a non-live copy still restores its chain first. The grace setting, the quiet-termination chain and Org teardown-event suppression are removed. The LLM contract and docs describe the new lifetime.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger / Contract | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001 | Delegated Claude agent ends its turn with a running background task | Shut down after grace; task killed | No timer exists; agent stays live; CLI completion starts a turn; agent reports to delegator | DS-001 |
| BEH-002 | System | REQ-001; AC-001 | Same for AGY / any long wait | Same | Same | DS-001 |
| BEH-004 | System | REQ-001; AC-002 | Delegator messages a quiet copy | Restore after shutdown | Delivered to the live run directly (restore step is a no-op) | DS-002 |
| BEH-007 | Operational | REQ-003; AC-004 | Server settings | Grace setting predefined | Removed; stale value harmless | DS-004 |
| BEH-008 | System | REQ-002; AC-003 | DONE, reactivation, root stop, restart + message | As documented | Unchanged | DS-002, DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related | Relationship | Status |
| --- | --- | --- | --- | --- |
| `problem-report.md` | Original evidence | BEH-001, AC-001 | Reproduction basis | Evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (with removal-driven cleanup)
- Current design issue found: `Yes`
- Structural triggers that fire:
  - Legacy-cleanup trigger: idle shutdown was a stopgap from before Task ownership (investigation notes); keeping it dormant or behind a flag would retain a second release authority.
  - Empty indirection trigger (after removal): `TeamRun`/`FlatTeamRunBackend`/registry pass-throughs exist only to reach `tryPrepareTerminationIfQuiescent`; they go with it.
  - Ruled out: Authoritative-boundary trigger (no caller bypasses the lifecycle for restore; delivery uses the lifecycle entrypoint), Shared-structure trigger (no shared type changes beyond removing optional option fields).
- Root cause classification: `Legacy Or Compatibility Pressure` — release responsibility moved to Task DONE, but the earlier idle release authority remained and its quiet test does not know about runtime background work.
- Refactor needed now: `Yes` (removal)
- Evidence: AF-01..AF-12, AF-16
- Design response: remove the idle authority end to end; keep the single remaining release authorities (DONE, root stop/fail-stop, server stop) and the restore path.
- Refactor rationale: patching the quiet test with a background-task term would keep a now-unneeded authority and spread runtime-specific signals into termination; deletion is smaller and removes the failure class for every runtime.
- Deferrals / residual risk: copies whose delegator never marks DONE hold their runtime process until root/server stop (QR-002, accepted). Pre-2026-10-06 unowned copies: same.

## Terminology

- *Task execution / copy*: a delegated Agent or Team (including brought-in helpers) inside a root.
- *Live*: the copy's runtime is registered and active (`adapter.isLive`).
- *Restore*: rebuilding a non-live copy's runtime with its conversation before delivery.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- No flag, no "disabled" schedule, no grace value of infinity, no dormant `tryShutDownIfQuiet`. See Removal Plan.

## Persisted Data / State Transition Decision

- Stored subject: server settings store (`appConfigProvider` config data / `.env`-backed); possibly one key `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` with a numeric string.
- Change: the key is no longer predefined or read.
- Reader behavior (AF-15): unknown keys are listed as custom settings (editable, deletable); nothing reads this key.
- Decision: `Directly Usable — No Migration`.
- Rationale: the stale value has no effect and causes no error; the user can delete it in Settings. Rewriting settings for cosmetics is not justified. Data migration guideline §2 checklist: (1) no migration needed — tolerant reader; (2) availability unaffected; (3) source: one optional string key; (4) disposition: retained as inert custom setting; (5–8) N/A; (9) AC-004 unit test with the stale key present; (10) no migrations consulted, none added.
- Supports: AC-004.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Delegated agent ends turn with background work | Result delivered to delegator | Runtime backend (Claude/AGY) + `RootTaskExecutionLifecycle` (now: no shutdown) | The failing scenario |
| DS-002 | Primary End-to-End | BEH-004, BEH-008 | `send_message_to(run ID)` / operator message | Copy handles input | `RootTaskExecutionLifecycle.withLiveChain` | Delivery and restore stay correct without leases |
| DS-003 | Primary End-to-End | BEH-008 | Task DONE / root stop | Copy stopped | Task resource scope / root termination | Remaining release authorities |
| DS-004 | Primary End-to-End | BEH-007 | Settings page/API | Settings list/update | `ServerSettingsService` | Setting removal |
| DS-005 | Bounded Local | BEH-004 | Command submitted | Executed at queue head | `RootTaskExecutionCommandQueue` | Kinds become activate / wake / reopen |

## Primary Execution Spine(s)

- DS-001: `Delegated agent turn ends -> AgentRun status idle -> RootTaskExecutionLifecycle.onAgentStatus (forwards status to Task side only) -> runtime keeps background task -> completion -> CLI/agent turn -> send_message_to delegator`
- DS-002: `send_message_to / composer -> Root (Team/Org/Standalone) delivery -> RootTaskExecutionLifecycle.withLiveChain -> queue "wake" -> adapter.restoreChain (only when not live) -> deliver -> AgentRun input`
- DS-003: `create_or_update_task DONE -> Task resource service -> RootTaskExecutionLifecycle.releaseTaskAgentResources -> adapter.releaseOwnedExecution -> runtime terminated` (unchanged); root stop: `closeExternalAdmission -> frozen termination scope` (unchanged minus timer disposal)
- DS-004: `Settings UI/GraphQL -> ServerSettingsService.getAvailableSettings/updateSetting -> appConfigProvider` (grace entry no longer predefined)

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | Idle status only updates the copy's status for the Task side; no timer, no shutdown. The runtime keeps its process and background tasks; the completion produces a turn and the agent reports back | AgentRun, lifecycle, runtime backend | Lifecycle (status), backend (background work) | Task-side status notification |
| DS-002 | Delivery asks the lifecycle to run the operation with the target's chain live. At the queue head it checks input is allowed, restores only non-live executions (after restart or reactivation), then runs the delivery. No lease is taken because nothing shuts copies down concurrently | Root delivery, lifecycle, queue, adapter | Lifecycle | Restore precheck |
| DS-003 | Unchanged | — | Task resources / root | — |
| DS-004 | Grace setting disappears from predefined settings | Settings service | Settings service | — |

## Spine Actors / Main-Line Nodes

Root delivery services, `RootTaskExecutionLifecycle`, `RootTaskExecutionCommandQueue`, subject adapters, AgentRun / runtime backends, `ServerSettingsService`.

## Ownership Map

- `RootTaskExecutionLifecycle`: delegation admission, serialized activate/wake/reopen, restore-before-delivery, DONE release and reactivation, status forwarding. No longer owns idle scheduling or leases.
- Subject adapters: trees, indexes, restore, exact release. No longer own quiet shutdown or post-shutdown offline publishing.
- `AgentRunTermination`: prepare/commit/finish, root-shutdown fence, force terminate. No longer owns try-if-quiescent.
- `FlatTeamExecutionManager`: team termination preparation (the `quiescing` state remains for normal termination). No longer owns quiet preparation.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `TeamTaskExecutionService` | `RootTaskExecutionLifecycle` | Team root entry | Lease or idle logic (remove `acquireLiveLease`) |

## Removal / Decommission Plan (Mandatory)

All `In This Change`. Paths relative to `autobyteus-server-ts/src/`.

| Item | Why Unnecessary | Replaced By |
| --- | --- | --- |
| `agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.ts` (file, `TaskExecutionIdleShutdownSchedule`, `TaskExecutionIdleTimers`) | No idle shutdown | — |
| `config/task-execution-idle-shutdown-setting.ts` (file) and its registration/import in `services/server-settings-service.ts` | Setting removed | — |
| `RootTaskExecutionLifecycle`: `schedule`, `gracePeriodMs`/`timers` options, `onGraceElapsed`, `shutdownAtHead`, `armLive`, `leases`, `TaskExecutionLiveLease`, `acquireLiveLease`, the arm/cancel branch of `onAgentStatus`, `schedule.dispose()` calls | Idle-only | `withLiveChain` (restore-then-run), `onAgentStatus` forwards status only |
| `RootTaskExecutionCommandKind` `"shutdown"` | No shutdown command | — |
| `RootTaskExecutionAdapter.tryShutDownIfQuiet` and implementations in `team-task-execution-adapter.ts`, `agent-org-task-execution-adapter.ts`, `standalone-root-task-execution-adapter.ts` (with their `publishAgentOffline`, `beginTaskExecutionEventRetirement` options when no other use remains) | Idle-only | — |
| `agent-org-execution/services/agent-org-task-event-retirement.ts` (file) and its wiring/check in `agent-org-run.ts` | Only suppressed quiet-shutdown teardown events | — |
| `RootAgentExecutionRegistry.tryShutDownTaskIfQuiet` + `shuttingDown`; `RootTeamExecutionDirectory.tryShutDownRootTaskTeamIfQuiet` + `shuttingDown` + `unregisterTerminated`; `TeamRunResolver.unregisterTerminated` | Idle-only | Reactivation keeps `retireTerminated` |
| `TaskAgentExecutionRegistry.tryShutDownIfQuiet` + `shuttingDown`; `TaskTeamExecutionRegistry.tryShutDownIfQuiet` + `shuttingDown`; `FlatTeamExecutionManager.tryShutDownDirectTaskExecutionIfQuiet`, `tryPrepareTerminationIfQuiescent`, `cancelDeferredPreparation`; `TeamRunBackend`/`FlatTeamRunBackend`/`TeamRun` `tryShutDownDirectTaskExecutionIfQuiet` and `tryPrepareTerminationIfQuiescent` | Idle-only | — |
| `ConfiguredAgentExecutionHandle.tryPrepareTerminationIfQuiescent`; `FlatTeamAgentExecutionHandle.tryPrepareTerminationIfQuiescent`; `AgentRunManager.tryPrepareAgentRunTerminationIfQuiescent`; `AgentRun.tryPrepareTerminationIfQuiescent`; `AgentRunTermination.tryPrepareIfQuiescent` + `tryingQuiescent` (and its branch in `prepare()`); `AgentRunInputAdmissionState.tryQuiesceIfAlreadyQuiescent` | Only callers were the quiet paths | — |
| `TaskExecutionTeardownIndeterminateError` (`task-delegation-command.ts`) and its catches | Thrown only by quiet paths | — |
| Option plumbing `idleShutdown` / `taskExecutionIdleShutdown` in `team-task-execution-service-contract.ts`, `team-task-execution-service.ts`, `root-team-run.ts`, `agent-org-run-options.ts`, `agent-org-run.ts`, `standalone-agent-run-root.ts` (and any composition that passes it) | Idle-only | — |
| Tests: `tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts`, `agent-org-task-shutdown-event-retirement.test.ts`; idle cases in the other AF-17 files | Behavior removed | New AC-001/002 tests |

Before deleting each item, the implementer confirms by grep that no non-idle caller exists (escalation trigger above).

## Return Or Event Spine(s)

- Status: `AgentRun AGENT_STATUS -> root -> lifecycle.onAgentStatus -> resourceScope.taskExecutionsStatusChanged -> Task side status feed` (kept). Offline status for copies is published by DONE/root-stop paths as today; the idle-shutdown offline publication is removed with its path.

## Bounded Local / Internal Spines

- DS-005, parent `RootTaskExecutionLifecycle`: `submit(kind ∈ {activate, wake, reopen}) -> FIFO -> executeAtQueueHead -> resolve/reject`. Fail-stop and close-admission semantics unchanged.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Task-side status notification | DS-001 | Lifecycle | Tell Task side a copy's status changed | Projects UI worker status | None (unchanged) |
| Restore precheck (`assertRestorableChain`) | DS-002 | Lifecycle | Reject wake without readable context | Unchanged | — |

## Ownership Boundaries

Root delivery code calls only the lifecycle (`withLiveChain`, `deliverToExactTarget`); it never calls adapters' restore directly. The lifecycle is the only caller of adapter restore/release.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle` | queue, restore, release, admission | Team/Org/Standalone roots, delivery services, `TeamTaskExecutionService` | Calling `adapter.restoreChain` or the queue from delivery code | Extend lifecycle API |

## Dependency Rules

- Allowed: roots/delivery → lifecycle → adapter → registries/handles → AgentRun.
- Forbidden: any new timer- or status-driven termination of task executions; any reference to the removed setting.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `RootTaskExecutionLifecycle.withLiveChain(agentRunId, operation)` (renamed from `withLiveLease`) | Task-execution chain containing an agent | Check input allowed, restore non-live executions of the chain at the queue head, run the operation | `agentRunId` | Same error codes as today (`ROOT_RUN_NOT_ACTIVE`, `TASK_EXECUTION_CONTEXT_UNAVAILABLE`, `TASK_EXECUTION_RESTORE_FAILED`, closed-Task codes). Re-check `assertOpen()` before the operation as today |
| `RootTaskExecutionLifecycle.onAgentStatus(agentRunId, status)` | Copy status | Forward to Task side | `agentRunId` | No scheduling |
| `RootTaskExecutionAdapter` | Root subject | Unchanged minus `tryShutDownIfQuiet`; update `taskExecutionChainFor` doc to "for restore and status" | — | — |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `withLiveChain` | Yes | Yes | Low | Rename all callers (team, org, standalone deliveries; `TeamTaskExecutionService`; `root-team-run.ts`) |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Restore-then-run entry | `withLiveLease` → `withLiveChain` | Yes | "Lease" implies a hold against shutdown that no longer exists | Rename |
| Queue | `RootTaskExecutionCommandQueue` doc "Activation, wake, idle shutdown and…" | — | Stale | Update doc comment |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Release of copies | Task DONE release, root stop | Reuse | Already authoritative |
| Restore after restart | `restoreChain` wake path | Reuse | Unchanged |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Lifecycle, queue, adapter interface | DS-001, DS-002, DS-005 | Modify (removals, rename) |
| `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root`, `agent-collaboration/execution/backends` | Adapters, registries, team manager | DS-002 | Modify (removals) |
| `agent-execution` | Termination | — | Modify (removals) |
| `config`, `services/server-settings-service.ts` | Setting | DS-004 | Remove/modify |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | LLM contract | DS-002 | Modify text |

## Draft File Responsibility Mapping / Final File Responsibility Mapping

No new files. Responsibilities of every remaining file stay as today minus the removed concerns (Removal Plan). The only behavior-bearing edits:

| File | Change |
| --- | --- |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | Remove schedule/lease/shutdown; `withLiveChain` = queue `wake` → (assert input allowed; if chain non-empty: `assertRestorableChain`, `restoreChain`, re-assert) → run operation. On restore failure keep today's coded errors (no re-arm). `onAgentStatus` → status forwarding only. `closeExternalAdmission`/`enterRootFailStop` lose `schedule.dispose()` |
| `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Replace "A copy that stays quiet is shut down after a while; a message to its run ID restores it with its conversation." with: "A copy stays running until its Task is `DONE` or the run stops. If the copy is not running (for example after a restart), a message to its run ID restores it with its conversation." Keep other text. Update any golden/snapshot test of this text |
| `agent-collaboration/execution/task/task-execution-running-work.ts` | Comment: drop "nor avoids shutdown" |
| `services/server-settings-service.ts` | Drop the predefined grace setting |

## Reusable Owned Structures Check / Shared Structure Tightness Check

N/A — no shared structure is added; option types lose the idle fields.

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

Deletions: `src/agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.ts`, `src/config/task-execution-idle-shutdown-setting.ts`, `src/agent-org-execution/services/agent-org-task-event-retirement.ts`, `tests/unit/agent-org-execution/agent-org-task-idle-shutdown.test.ts`, `tests/unit/agent-org-execution/agent-org-task-shutdown-event-retirement.test.ts`. All other changes are edits in place (Removal Plan, table above).

## Folder Boundary Check

N/A — no folder changes.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Fix shape | Delete idle shutdown; DONE/root stop are the release authorities | Add `hasRunningBackgroundTasks` to the quiet test, or set grace to 24 h | Removes the failure class for all runtimes instead of patching one signal |
| Delivery | `withLiveChain(id, () => deliver())` restores only if non-live | Keeping a lease counter "just in case" | No concurrent terminator remains |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the setting with "0 = disabled" | Operators might want idle shutdown | Rejected | Removed (DEC-004) |
| Keep `tryShutDownIfQuiet` dormant | Possible future use | Rejected | Deleted |
| Keep `withLiveLease` name as alias | Fewer caller edits | Rejected | Rename all callers |
| Migrate/delete the stale settings key | Cleanliness | Rejected | Inert custom setting |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Baseline reproduction (before any edit, on the task branch): run the new gated live E2E (Guidance) against current code with `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=60000`; record that the copy is shut down and the background task stopped (AC-001 "before" evidence).
2. Lifecycle: remove schedule/lease/shutdown, rename to `withLiveChain`, simplify `onAgentStatus`; remove `"shutdown"` kind; remove `tryShutDownIfQuiet` from the adapter interface.
3. Adapters (team/org/standalone) and their options; Org event retirement.
4. Registries, team manager, team backend/run, handles, AgentRunManager, AgentRun, AgentRunTermination, input admission state; teardown error.
5. Setting file and settings registration; option plumbing in root constructors and compositions.
6. LLM contract text; comments.
7. Tests (delete/rewrite; add AC tests); docs (AF-18).
8. Final grep: `IDLE_SHUTDOWN|IdleShutdown|IfQuiescent|IfQuiet|LiveLease|EventRetirement|TeardownIndeterminate|unregisterTerminated` returns nothing in `src`, `tests`, `docs` (except ticket history).

## Key Tradeoffs

- Simplicity and correctness for all runtimes vs. idle resource use until DONE/root stop (accepted by the user, QR-002).
- Renaming `withLiveLease` costs ~15 mechanical edits but keeps names truthful.

## Risks

- R-1: Hidden reliance on idle shutdown in tests/fixtures to create non-live copies (AF-17). Mitigation: create non-live state through supported paths (root reopen/restart restore, DONE + reactivation) or existing release APIs in unit fixtures.
- R-2: Org UI relied on retirement to avoid flicker of teardown statuses during quiet shutdown; with no quiet shutdown there is no such teardown. DONE release status behavior is unchanged.
- R-3: Memory growth when many Tasks stay open. Accepted; documented.

## Guidance For Implementation

- Tests required:
  - AC-001: (a) Unit/integration with a fake backend reporting `idle` and a running `BACKGROUND_TASK_UPDATED`, fake timers advanced ≥ 2 h: the copy stays live, nothing is terminated, and a later completion turn's `send_message_to` reaches the delegator. (b) Gated live E2E (`RUN_CLAUDE_E2E=1`, extend or add next to `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`): a delegated Claude agent runs `run_in_background` `sleep 90 && echo done > <marker>` (longer than the old 60 s minimum grace), ends its turn, then reports to the delegator; assert marker exists, no `[killed]`, delegator receives the result. Record step-1 "before" evidence.
  - AC-002: delegated Agent and Team stay live past a long fake-time advance; same-root message is delivered without calling restore.
  - AC-003: keep/adjust DONE release, reactivation, root stop, restart-restore tests; they must pass with non-live state created via supported paths.
  - AC-004: settings list without the predefined key; `getAvailableSettings` works with the stale key stored.
  - AC-005: final grep (sequence step 8).
- Docs (AC-006): AF-18 list; `agent_team_execution.md` replaces "Idle shutdown"/"Grace period" with a "Lifetime" rule (live until DONE, root stop/fail-stop, server stop; restore on message after restart or reactivation) and drops the setting file from its file list; update `codex_integration.md` E2E instructions (no grace env).
- Do not add any background-task-aware logic; it is unnecessary after removal.
