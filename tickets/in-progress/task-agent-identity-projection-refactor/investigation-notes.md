# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree created from latest tracked `origin/personal`.
- Current Status: Current-state investigation complete; requirements/design package produced for architecture review.
- Investigation Goal: Investigate follow-up task-agent identity and frontend active-execution projection refactoring opportunities from the latest merged `personal` state, then produce design-ready requirements and a design spec for architecture review.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The request spans server event identity, frontend streaming/routing projections, UI focus/send/interrupt/history/workspace boundaries, file responsibility pressure, and ownership guards, but it is a follow-up hardening/refactor rather than a new feature rewrite.
- Scope Summary: Harden explicit task-agent identity propagation and active-execution projection ownership; evaluate routing extraction, `TeamRun` separation, optional persistence, and transport naming cleanup.
- Primary Questions Resolved:
  1. Which task-agent-originated events still lack explicit task-agent identity fields? **The mixed runtime command-start/status overlay path lacks identity. Most normal runtime events already include it.**
  2. Where does frontend still rely on `isTaskAgentRunId(...)` or route-key heuristics? **`TeamStreamingService.ts` and `teamActiveExecutionMembers.ts` import/use it.**
  3. Are `TeamStreamingService.ts` and `runHistoryTeamHelpers.ts` still near source-size guardrails? **Yes: `570/496` and `534/493` physical/effective lines respectively by simple nonblank/non-comment count.**
  4. Do active UI, composer, send, interrupt, sidebar, history, or workspace-link paths bypass the active-execution projection? **Several paths already use the projection; `workspace.ts` active workspace metadata is a concrete raw-focus bypass, and mobile/history paths need targeted audit.**
  5. Does `TeamRun` still avoid delegation business policy and keep only runtime lifecycle responsibility? **Yes in inspected code; this boundary should be made an explicit guard in the follow-up design.**
  6. Is durable task-delegation persistence or task-delegation-native transport naming in scope? **No; both are deferred unless separate requirements are added.**

## Request Context

Code-review follow-up requested a new refactoring/improvement ticket after the runtime tool MCP unification / task-delegation ticket was code-review passed and apparently merged. The request explicitly says to bootstrap from the latest tracked `personal` branch state, not from the old ticket worktree.

The code-review scope request included these target areas:

1. Make task-agent identity mandatory on every task-agent-originated event.
2. Evaluate frontend streaming routing extraction if current files remain near source-size guardrails.
3. Strengthen active-execution projection as the authoritative frontend focus/display boundary.
4. Preserve `TeamRun` separation of concerns.
5. Consider durable task-delegation repository only if recovery/history requirements are in scope.
6. Optionally evaluate transport naming cleanup for historical `TASK_PLAN_EVENT` surfaces.

The code-review addendum requested explicit separation-of-concerns framing:

- `TeamRun` should be treated as the team/member/task-agent runtime lifecycle boundary only.
  - It may start concrete member/task-agent runtimes.
  - It may settle/stop concrete task-agent runtimes.
  - It may route postMessage/send/interrupt/approval commands to concrete logical member or task-agent run handles.
  - It may publish runtime/team/member events.
- Task management/lifecycle policy should remain owned by `TaskDelegationService` plus ledger/notifier/settlement coordinator.
  - It owns delegated task records, task IDs, original delegator identity, task-agent binding, status/acceptance transitions, authorization, completion/failure notifications, and the decision that settlement should be requested.
- Design smell to avoid: `TeamRun` or backend managers directly deciding task acceptance/status rules, mutating task records, determining original-delegator authorization, or interpreting task business state.

Useful completed-ticket context artifacts in the fresh worktree are retained for reference only and must not become the authoritative source of current implementation state:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/done/runtime-tool-mcp-unification-analysis/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/done/runtime-tool-mcp-unification-analysis/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/done/runtime-tool-mcp-unification-analysis/design-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/done/runtime-tool-mcp-unification-analysis/review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/done/runtime-tool-mcp-unification-analysis/implementation-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-round27-worker-initializing-after-acceptance-failure.md`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/in-progress/task-agent-identity-projection-refactor`.
- Current Branch: `codex/task-agent-identity-projection-refactor`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor`.
- Bootstrap Base Branch: latest tracked `origin/personal` per request.
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-03; `personal` and `origin/personal` both resolved to `66bdc6d7f6fdcda2b11d39e9f3b7db18478cd723`.
- Task Branch: `codex/task-agent-identity-projection-refactor`, tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is a fresh follow-up worktree from latest `origin/personal`; do not use the old `runtime-tool-mcp-unification-analysis` worktree as current implementation state.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-03 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git worktree list` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover bootstrap repository/worktree state. | Shared checkout was on `personal...origin/personal`; many existing worktrees were present; no current dedicated worktree for this ticket existed. | No |
| 2026-06-03 | Command | `git fetch origin --prune && git rev-parse personal && git rev-parse origin/personal && git log --oneline --decorate -1 origin/personal` | Refresh tracked remote refs and verify requested base. | Fetch succeeded; `personal` and `origin/personal` both at `66bdc6d7 docs(ticket): record final personal push`. | No |
| 2026-06-03 | Command | `git worktree add -b codex/task-agent-identity-projection-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor origin/personal` | Create dedicated task worktree from latest tracked personal. | Worktree created successfully and branch tracks `origin/personal`. | No |
| 2026-06-03 | Repo | `ls -1 tickets/done/runtime-tool-mcp-unification-analysis` | Confirm completed-ticket artifacts in fresh worktree. | The completed task-delegation ticket artifacts are under `tickets/done/...`, not the old in-progress worktree path. | Use done artifacts only as historical context. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Inspect team event to websocket mapping and identity projection. | `TeamRunEventSourceType.AGENT` maps nested agent events and adds `agent_name`, `agent_id`, `member_route_key`, `member_path`, and, when present, `task_agent_instance_id`, `task_agent_run_id`, `task_id`. Task-delegation events still map to `ServerMessageType.TASK_PLAN_EVENT`. | Extend upstream producers so task-agent-originated AGENT events always provide `taskAgentInstance`. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts` | Inspect command-start/status event builder. | `TeamMemberCommandStatusInput` lacks task-agent identity. `buildAgentMemberCommandStartStatusEvent(...)` creates an `AGENT_STATUS` event without `data.taskAgentInstance` and without task-agent fields in payload. | Modify for optional task-agent identity. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts` | Inspect status overlay publisher. | `publishMemberCommandStatus(...)` accepts only logical member context and emits the identity-less builder event. Overlay snapshots are keyed by route key and payload builder has no task-agent identity input. | Add optional task-agent identity through the overlay path; keep logical member path unaffected. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Inspect mixed runtime handle for task-agent and logical member flows. | Normal runtime events from `bindEvents(...)` include `taskAgentInstance: this.options.taskAgentInstance ?? null`. `getStatusSnapshot()` also adds task-agent fields. `publishCommandStatus(...)` does not pass `this.options.taskAgentInstance` into the overlay store, producing the observed identity gap. | Pass task-agent identity into status overlay for task-agent handles. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` | Inspect mixed task-agent instantiation. | A task-agent handle is created with logical member route/path and `memberRunId` set to `request.identity.taskAgentRunId`; the identity is supplied to the handle as `taskAgentInstance`. | Confirms the handle has enough information to fix status identity propagation. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/common/server-managed-task-agent-instance-registry.ts` | Inspect Codex/Claude server-managed task-agent events. | Status snapshots and bound runtime events include explicit `task_agent_instance_id`, `task_agent_run_id`, and `task_id`. This path already follows the target identity shape for normal runtime events. | Add tests/invariant coverage; no broad redesign needed here. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Inspect `TeamRun` responsibility. | `TeamRun` delegates post/message/inter-agent/approve/interrupt/settle/startTaskAgentInstance/settleTaskAgentInstance to the backend and publishes events. No task status/acceptance policy was found. | Preserve this boundary. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Inspect task-management ownership. | `TaskDelegationService` owns `delegateTasks`, `markTaskCompleted`, `markTaskFailed`, `acceptTask`, caller authorization, task-agent binding validation, ledger updates, notifications, and settlement-request decisions. | Preserve this boundary and add review/test guard. |
| 2026-06-03 | Code | `autobyteus-web/services/agentStreaming/taskAgentRunIdentity.ts` | Inspect frontend heuristic. | Defines `isTaskAgentRunId(...)` using substring markers `__task_` and `task-agent-run`. This treats generated IDs as meaningful protocol. | Remove/decommission. |
| 2026-06-03 | Code | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Inspect frontend message routing. | `getMemberContextResolution(...)` first extracts explicit task-agent identity, but falls back to `getTaskAgentContextByRunId(...)` and `isTaskAgentRunId(...)`. It also updates routed logical context run ID when `memberRunId && !isTaskAgentRunId(memberRunId)`. | Extract resolver and remove heuristics; add strict mismatched logical run-id handling. |
| 2026-06-03 | Code | `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts` | Inspect frontend task-agent projection. | Explicit identity extraction exists and is already able to create/remove task-agent contexts/cards using `task_agent_run_id`, `task_agent_instance_id`, `task_id`, logical route/path. | Reuse/extend this projection rather than inventing new task-agent context storage. |
| 2026-06-03 | Code | `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Inspect tests that encode current fallback behavior. | Test named `does not let identity-less task-agent status poison the logical member context before projection exists` sends an identity-less `AGENT_STATUS` with task-agent-looking `agent_id`, expects no logical mutation, then sends explicit identity to create the task-agent context. | Replace with resolver/server identity invariant tests that do not rely on string markers. |
| 2026-06-03 | Code | `autobyteus-web/utils/teamActiveExecutionMembers.ts` | Inspect active execution projection. | The file owns visible active member filtering/focus and uses `isTaskAgentRunId(context?.state?.runId)` to hide logical members if polluted by a task-agent run ID. It also filters task-agent-only work-packet conversations. | Remove heuristic and keep active execution boundary authoritative. |
| 2026-06-03 | Command | `python3` effective line count for `TeamStreamingService.ts` and `runHistoryTeamHelpers.ts` | Verify source-size pressure. | `TeamStreamingService.ts`: `570` physical, `496` effective. `runHistoryTeamHelpers.ts`: `534` physical, `493` effective. | Extract owned concerns where touched. |
| 2026-06-03 | Code | `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Inspect file responsibilities. | File mixes team status conversion, draft summary, workspace root selection, team node aggregation, projection fetching, projection-to-conversation/config building, and live/historical member context construction. | Split by owned concern if near guard after changes. |
| 2026-06-03 | Code | `autobyteus-web/stores/agentTeamContextsStore.ts`, `autobyteus-web/stores/activeContextStore.ts`, `autobyteus-web/stores/agentTeamRunStore.ts` | Inspect active execution target paths. | Store exposes both raw `focusedMemberContext` and active-execution getters. `activeContextStore` and team send/interrupt paths use active-execution target. | Keep raw getters for topology where needed but require active execution consumers to use projection. |
| 2026-06-03 | Code | `autobyteus-web/stores/workspace.ts` | Inspect active workspace metadata. | For selected team, active workspace metadata uses `teamContext.leafAgentContextsByRouteKey.get(teamContext.focusedMemberRouteKey)`, bypassing active-execution focus. | Update to projection boundary. |
| 2026-06-03 | Code | `autobyteus-web/stores/runHistoryTeamRows.ts`, `autobyteus-web/stores/runHistorySelectionActions.ts`, `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts` | Inspect history display/opening. | Live rows are filtered through active execution in `runHistoryTeamRows.ts`; selection actions partially use active execution. `useWorkspaceHistorySelectionActions.ts` resolves from raw history `focusedMemberRouteKey`, which may be acceptable for persisted history but should be audited against active execution semantics. | Design should require projection for active execution subject selection and allow raw topology only for historical metadata/roster. |
| 2026-06-03 | Code | `autobyteus-web/composables/mobile/*` grep for `focusedMemberRouteKey` / `memberTree` | Inspect mobile paths for possible bypasses. | Several mobile composables use raw focused route/member tree for catalog, launch, pending attachments, focus coordination, and promoted context sync. Some are logical selection/roster uses; execution-adjacent ones must be audited. | Include active projection audit requirement. |
| 2026-06-03 | Code | `autobyteus-server-ts/src/services/agent-streaming/models.ts`, `team-run-event-websocket-message-mapper.ts`, frontend protocol/message handlers | Inspect historical transport naming. | `ServerMessageType.TASK_PLAN_EVENT = "TASK_PLAN_EVENT"` remains and task-delegation events map through it. Frontend handler naming also remains task-plan-oriented. | Defer renaming unless separate protocol migration is designed. |

## Current Behavior / Current Flow

### Server event identity

Current good path for most task-agent runtime events:

`TaskDelegationService -> TaskDelegationActivationCoordinator -> TeamRun.startTaskAgentInstance(...) -> backend task-agent handle/registry -> TeamRunAgentEventPayload.taskAgentInstance -> team-run-event-websocket-message-mapper -> websocket payload with task_agent_* fields -> frontend task-agent projection`

The current gap is the task-agent command-start/status overlay path in mixed runtime:

`MixedTeamMemberRegistry.startTaskAgentInstance(...) -> MixedAgentMemberHandle(taskAgentInstance=identity) -> handle.postMessage(...) -> publishCommandStatus("initializing") -> TeamCommandStatusOverlayStore.publishMemberCommandStatus(...) -> buildAgentMemberCommandStartStatusEvent(...) -> websocket AGENT_STATUS without task_agent_* fields`

Because `MixedAgentMemberContext.memberRunId` is the task-agent run ID in this handle, the emitted event can carry `agent_id=<task-agent-run-id>` without explicit task-agent fields. That is exactly the class of event the frontend currently defends against with string heuristics.

### Frontend routing

Current routing in `TeamStreamingService.ts`:

1. Extract explicit task-agent identity via `extractTaskAgentIdentity(message)`.
2. If present, ensure and route to a task-agent context.
3. If absent, use `agent_id` to find an existing task-agent context by run ID.
4. If no existing context, call `isTaskAgentRunId(agent_id)` to skip task-agent-looking status events.
5. Otherwise, resolve by route/path and update the logical context run ID when `agent_id` is present and does not look like a task-agent run ID.

This makes the frontend understand generated ID string conventions, which should be a server/protocol invariant instead.

### Active execution projection

Current projection behavior is partially established:

- `teamTaskAgentContextProjection.ts` creates/removes transient task-agent nodes/contexts by explicit identity.
- `teamActiveExecutionMembers.ts` computes active display rows and active focused member route, including transient task-agent rows under logical members.
- `agentTeamContextsStore` exposes active-execution getters.
- `activeContextStore` uses active-execution focus for interrupt targets.
- `agentTeamRunStore` uses active-execution focus for sending messages.
- `runHistoryTeamRows.ts` filters live rows through active-execution member tree filtering.

Known bypass/risk:

- `workspace.ts` active team workspace metadata uses raw `teamContext.focusedMemberRouteKey`, not active-execution focus.
- Several mobile/history paths use raw focus/tree and require a deliberate classification between logical roster/history metadata and active execution subject selection.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / cleanup / design hardening.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant, boundary/ownership issue, duplicated routing policy, file placement/responsibility drift, legacy/compatibility pressure.
- Refactor posture evidence summary: Current code has an explicit identity shape in most server paths and an existing task-agent projection, so the right fix is to close the remaining producer gap and move frontend routing into an owned resolver while removing heuristic fallback.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `team-member-command-start-status-events.ts` | No task-agent identity in command status input/event. | Missing invariant at producer boundary. | Extend input/event/payload shape. |
| `MixedAgentMemberHandle.publishCommandStatus(...)` | Task-agent handle has identity but does not pass it to overlay. | Local gap in an otherwise viable owner model. | Pass optional identity through overlay. |
| `TeamStreamingService.ts` | Uses `isTaskAgentRunId(...)` and does context resolution in the facade. | Duplicated routing policy and facade responsibility drift. | Extract resolver and remove heuristic. |
| `teamActiveExecutionMembers.ts` | Uses `isTaskAgentRunId(...)` to hide polluted logical members. | Projection is compensating for upstream identity gap. | Remove after strict resolver/server fix. |
| Line counts | `TeamStreamingService.ts` 496 effective; `runHistoryTeamHelpers.ts` 493 effective. | Near guard; adding behavior in-place would worsen file drift. | Split owned concerns. |
| `workspace.ts` | Active workspace metadata uses raw focus. | Active-execution boundary bypass. | Use projection getter/API. |
| `TeamRun` / `TaskDelegationService` | Separation currently good. | Boundary should be guarded, not moved. | Document and test/review. |

## Relevant Files / Components

### Server

- `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-member-input-message-payload.ts`
- `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-instance.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-member-command-start-status-events.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/common/server-managed-task-agent-instance-registry.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts`

### Frontend

- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`
- `autobyteus-web/services/agentStreaming/taskAgentRunIdentity.ts`
- `autobyteus-web/services/agentStreaming/protocol/teamStreamIdentityTypes.ts`
- `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`
- `autobyteus-web/utils/teamActiveExecutionMembers.ts`
- `autobyteus-web/stores/agentTeamContextsStore.ts`
- `autobyteus-web/stores/agentTeamRunStore.ts`
- `autobyteus-web/stores/activeContextStore.ts`
- `autobyteus-web/stores/workspace.ts`
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`
- `autobyteus-web/stores/runHistoryTeamRows.ts`
- `autobyteus-web/stores/runHistorySelectionActions.ts`
- `autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts`
- `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts`
- `autobyteus-web/composables/mobile/useMobileFocusedRunIdentity.ts`
- `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts`
- `autobyteus-web/composables/mobile/useMobilePendingTeamRunAttachments.ts`
- `autobyteus-web/composables/mobile/useMobilePromotedRunContextSync.ts`

## Runtime / Probe Findings

No services were started for this design investigation. The relevant evidence is source inspection and targeted code search/line-count probes.

Probe commands materially used:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor
rg -n "taskAgentInstance|task_agent_run_id|TASK_PLAN_EVENT|TASK_DELEGATION|publishMemberCommandStatus|buildAgentMemberCommandStartStatusEvent" autobyteus-server-ts/src/services autobyteus-server-ts/src/agent-team-execution
rg -n "isTaskAgentRunId|taskAgentRunIdentity|extractTaskAgentIdentity|activeExecutionFocusedMemberRouteKey|focusedMemberRouteKey|memberTree" autobyteus-web/services/agentStreaming autobyteus-web/utils autobyteus-web/stores autobyteus-web/composables autobyteus-web/components/workspace/team
python3 - <<'PY'
from pathlib import Path
files=[Path('autobyteus-web/services/agentStreaming/TeamStreamingService.ts'),Path('autobyteus-web/stores/runHistoryTeamHelpers.ts')]
for p in files:
    lines=p.read_text().splitlines()
    effective=sum(1 for line in lines if line.strip() and not line.strip().startswith('//'))
    print(f"{p}: physical={len(lines)} effective={effective}")
PY
```

Line-count result:

- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`: physical `570`, effective `496`.
- `autobyteus-web/stores/runHistoryTeamHelpers.ts`: physical `534`, effective `493`.

## External / Public Source Findings

Not applicable; this investigation is local repository design work.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for design investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Finding 1: The server already has a good identity shape, but one task-agent producer path does not fill it.

`TeamRunAgentEventPayload` supports optional `taskAgentInstance`. The websocket mapper already converts it into `task_agent_instance_id`, `task_agent_run_id`, and `task_id`. Server-managed Codex/Claude task-agent registry and mixed normal runtime events already use this shape.

The mixed command-start/status overlay path does not. This should be fixed by flowing optional `TaskAgentInstanceIdentity` through the command-status builder/overlay path and by making task-agent handles pass it.

### Finding 2: The frontend heuristic should be removed, not standardized.

`taskAgentRunIdentity.ts` embeds generated-ID markers. This is not a stable protocol contract and creates a hidden dependency between frontend routing and backend ID formatting. The server must emit explicit task-agent identity and the frontend resolver must route by that identity.

A strict non-heuristic guard is still useful: when an identity-less message route-resolves to a logical member but carries an `agent_id` that conflicts with the existing logical context run ID, the resolver should treat it as malformed/stale instead of mutating the logical member. That guard uses known logical identity, not task-agent string markers.

### Finding 3: `TeamStreamingService.ts` owns too much routing policy for the follow-up.

The service should remain a websocket lifecycle and dispatch facade. Message-to-context resolution is now a concrete, reusable concern that should live in a resolver file beside the streaming/projection code. This also helps line-count pressure.

### Finding 4: `runHistoryTeamHelpers.ts` mixes unrelated responsibilities.

The file contains:

- team status conversions,
- draft summary and activity selection,
- workspace root selection,
- team tree node aggregation,
- projection fetching,
- projection-to-conversation/config building,
- live/historical member context construction.

If touched in this ticket and still near the guard, it should be split by owned concerns rather than expanded.

### Finding 5: Active-execution projection exists but is not consistently authoritative.

The current projection utilities are already the right conceptual boundary. The follow-up should strengthen usage instead of replacing them. `workspace.ts` active metadata is a clear bypass and mobile/history paths need classification.

### Finding 6: `TeamRun` separation is currently healthy.

`TeamRun` and backend managers are runtime lifecycle boundaries. `TaskDelegationService` owns task-management policy. The follow-up should codify and preserve this split rather than moving task rules into `TeamRun` while changing task-agent lifecycle wiring.

### Finding 7: Durable repository and transport naming are not part of this ticket.

No current requirement demands recovery/history. The in-memory delegation ledger is acceptable for the completed feature. `TASK_PLAN_EVENT` naming is historical debt but compatibility-sensitive; fixing identity/projection should not depend on a protocol rename.

## Constraints / Dependencies / Compatibility Facts

- Must use latest tracked `origin/personal` as base.
- Treat old completed-ticket artifacts as context, not current state.
- Preserve `TaskDelegationService` / `TeamRun` separation unless a future requirement explicitly changes the architecture.
- Frontend task-agent run IDs must be opaque; no code should depend on ID substrings.
- Active-execution projection must not erase the logical team roster/model. The accepted UI model remains: logical member rows may stay visible; transient task-agent rows/cards appear under them while active and disappear after settlement.
- `TASK_PLAN_EVENT` renaming is compatibility-sensitive and not needed for this follow-up.

## Open Unknowns / Risks

- Some mobile and history paths may intentionally use raw logical topology. Implementation must audit each use rather than blindly replacing all `focusedMemberRouteKey` / `memberTree` references.
- If future server behavior truly allows logical member run IDs to change during a run, it needs an explicit logical-member lifecycle/update event. The current follow-up should not preserve arbitrary run-ID overwrite behavior in generic stream routing.
- The source-size guard appears to be a review/team guard, not an obvious enforced script. Downstream implementation should still treat the measured near-limit files as requiring extraction where touched.

## Notes For Architect Reviewer

- Requirements are marked Design-ready based on code-review requested scope and fresh current-state investigation.
- The main required code change is not a broad task-delegation redesign; it is to close the task-agent command-status identity gap and remove frontend heuristics through a concrete resolver/projection refactor.
- The design intentionally defers durable task repository and `TASK_PLAN_EVENT` transport rename.
- Please scrutinize the proposed active-execution projection boundary: raw logical topology should remain allowed for roster/definition/history metadata, but not for active execution subject selection.

---

## Downstream Reroute Investigation — Packaged Electron ClassRoomSimulation Direct Send (2026-06-04)

### Trigger

API/E2E rerouted a user-reported packaged Electron regression: a newly-created `ClassRoomSimulation` run showed `professor • Offline` and only the local user message after sending `give student a hard math problem to solve`. The user stated the same flow works on `origin/personal`.

Reroute artifact:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/in-progress/task-agent-identity-projection-refactor/api-e2e-classroom-electron-direct-send-reroute.md`

Screenshots inspected:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_c0d736cd0c78__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_36cd04cf/api_e2e_engineer_7a52be060fdd9214/context_files/ctx_ce21d098e9ad__image.png`

### Evidence Consulted

- Packaged Electron backend health: `curl http://localhost:29695/rest/health` returned ok.
- Recent classroom run data under `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_b3bb4088`.
- Electron app logs under `/Users/normy/.autobyteus/logs/app.log` around `2026-06-04T03:20:14Z` to `2026-06-04T03:20:18Z`.
- Live GraphQL queries against packaged backend `localhost:29695`:
  - `getTeamMemberRunProjection(teamRunId: "team_classroomsimulation_b3bb4088", memberRouteKey: "professor")`
  - `getTeamCommunicationMessages(teamRunId: "team_classroomsimulation_b3bb4088")`
  - `listWorkspaceRunHistory(limitPerAgent: 20)`
- Frontend source paths:
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/stores/agentTeamRunStore.ts`
  - `autobyteus-web/services/agentStreaming/teamStreamMemberContextResolver.ts`
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`

### Finding

The reported packaged Electron run did execute successfully on the backend. Evidence:

- `team_communication_messages.json` contains the professor → student message.
- Professor raw trace contains the user input, `send_message_to` call, successful tool result, and professor assistant completion.
- Student raw trace contains the received professor message and student assistant solution.
- Electron app logs show the student runtime started on-demand, direct message posted successfully, team communication projection inserted, and professor turn completed.
- GraphQL projection returns the full professor conversation and activity.
- Run history reports the run as active/idle with both members idle.

The frontend symptom is caused by stale/mismatched local member identity after temporary team-run promotion:

1. Temporary team creation initializes `memberContext.state.runId` from local conversation ID, e.g. `temp-team-...::professor`.
2. `promoteTemporaryTeamRunId(...)` currently only replaces the team prefix, leaving `state.runId = team_classroomsimulation_b3bb4088::professor`.
3. Backend metadata and websocket events use the real logical member run ID, e.g. `professor_50e0abe1bfe7eb6d`.
4. The new strict `resolveTeamStreamMemberContext(...)` correctly rejects identity-less logical messages when routed context run ID differs from payload `agent_id`.
5. Therefore live events are skipped in the newly-created packaged UI context, leaving only the optimistic user message.

### Classification

Local implementation defect exposed by the current strict identity refactor. No broad design rewrite is required.

The strict resolver behavior remains correct and should not be weakened. The implementation must reconcile frontend temporary member contexts with backend-assigned member run IDs after `createAgentTeamRun` succeeds and before connecting/sending or before live events route.

### Decision Artifact

Focused decision and implementation guidance written to:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-identity-projection-refactor/tickets/in-progress/task-agent-identity-projection-refactor/solution-design-electron-direct-send-decision.md`
