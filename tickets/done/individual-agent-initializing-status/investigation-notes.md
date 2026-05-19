# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed in dedicated worktree.
- Current Status: Post-delivery validation rework complete; command-correlated overlay replacement contract incorporated.
- Investigation Goal: Explain why standalone agents miss visible `Initializing` while team members show it, and design the architecture-right fix where backend owns lifecycle status including restore/start.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The architecture-right fix changes standalone command ownership across backend command routing, websocket session semantics, run identity creation, history/status projection, and frontend send orchestration.
- Scope Summary: Replace frontend-orchestrated standalone restore/start/send lifecycle with a backend-owned standalone command/lifecycle boundary, including concrete command idempotency, projection lifecycle, prepared-run activation contracts, and command-correlated overlay replacement that excludes runtime-readiness snapshots.

## Request Context

The user reported that an offline standalone Codex agent remains `Offline` after a message is sent, then later jumps to `Running`, while an offline Codex agent inside an agent team promptly shows `Initializing`. Through follow-up discussion, the user clarified the architectural principle: backend should remain source of truth for lifecycle status, and runtime restore/start should be considered part of `Initializing`. A frontend optimistic status placeholder is therefore not the target architecture. After implementation delivery, the user reported a standalone-only fast flicker `offline -> initializing -> running -> initializing -> running` when resuming an offline individual Codex agent. Source inspection found a premature restore-snapshot status bridge in the standalone command coordinator; the target design now forbids runtime-readiness `running` from replacing command `Initializing`.

## Environment Discovery / Bootstrap Context

- Project Type: Git
- Original User Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status`
- Current Branch: `codex/individual-agent-initializing-status`
- Bootstrap Base Branch: `origin/personal` at `bea1185cde5b77dde7a565983f103085cba8178a`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-18.
- Bootstrap Blockers: None.
- Current Worktree Caveat: The worktree currently contains uncommitted frontend-placeholder implementation files from the now-superseded approach. The new design supersedes those code changes; downstream implementation must not treat them as the target architecture.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-18 | Command | `git rev-parse --show-toplevel && git branch --show-current && git remote -v && git symbolic-ref refs/remotes/origin/HEAD || true && git status --short` | Discover repository root, branch, remote, default branch, and dirty state. | Root was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; shared checkout branch was `personal`; origin HEAD `origin/personal`; clean before task worktree. | No |
| 2026-05-18 | Command | `git fetch origin --prune && git worktree list --porcelain`; `git worktree add -b codex/individual-agent-initializing-status ... origin/personal` | Create dedicated task worktree. | Task worktree created from latest `origin/personal`. | No |
| 2026-05-18 | Doc | `solution-designer/SKILL.md`; `design-principles.md` | Required workflow and design principles. | Authoritative Boundary Rule, data-flow spine inventory, removal-first design, and use-case span sufficiency are mandatory. | Reflected in design spec. |
| 2026-05-18 | Code | `autobyteus-web/stores/agentRunStore.ts:117-205` | Inspect standalone send flow. | Frontend appends local user message, then for inactive existing run calls `RestoreAgentRun`, waits, marks run active, refreshes history, finalizes attachments, connects websocket, then sends message. | Replace frontend runtime restore orchestration. |
| 2026-05-18 | Code | `autobyteus-web/graphql/mutations/agentMutations.ts:13-31` | Inspect current frontend backend commands. | Current commands split `CreateAgentRun` and `RestoreAgentRun`; send happens later over websocket. | Add/reshape backend-owned command boundary. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-run.ts:162-180` | Inspect restore mutation. | `restoreAgentRun` waits on `agentRunService.restoreAgentRun()` and returns only after restore succeeds/fails. | Restore is currently frontend-visible precondition. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:132-144`, `393-445` | Inspect resolve/restore service. | `resolveAgentRun()` restores if inactive; `restoreAgentRun()` reads metadata, ensures workspace, restores backend, writes metadata/index as ACTIVE. | Target command boundary should own this as internal activation. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:97-119` | Inspect runtime restore owner. | `restoreAgentRun()` calls backend factory `restoreBackend()` and registers active run only after backend restore completes. | Need command/status layer before active run exists. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts:64-80` | Inspect Codex restore. | Codex restore bootstraps restore context and calls `threadManager.restoreThread()`. | Slow runtime restore happens before standalone stream/send. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts:47-54`, `94-130`, `167-190` | Inspect Codex thread resume timing. | `restoreThread()` calls `startThread(... resumeThreadId)`; `startThread()` waits for app-server `thread/resume` and `markStartupReady()` before returning. | This restore phase should be visible as `Initializing`. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:87-130`, `305-342` | Inspect standalone websocket. | `connect()` calls `resolveAgentRun()` before session/CONNECTED/status; `SEND_MESSAGE` then calls `activeRun.postUserMessage()`. | Current websocket cannot publish status before runtime restore. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:82-119` | Inspect standalone initializing event. | `postUserMessage()` emits `initializing` for offline/idle before backend post, but only after active `AgentRun` exists. | Keep as runtime-level event; add earlier command-level overlay. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts:154-172` | Compare team member behavior. | Team backend publishes member `initializing` before `ensureMemberReady()` and member `postUserMessage()`. | Team container is the architectural reference. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts:38-73` | Inspect team overlay. | Overlay publishes member command `initializing` and stores status snapshots before member runtime readiness. | Standalone needs analogous command lifecycle/status overlay. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts:103-129`, `197-208`; `run-history/store/agent-run-history-index-record-types.ts` | Inspect history projection. | Durable lastKnownStatus is coarse; `status` can come from active run status when active. Current inactive runs resolve to offline. | Target needs command overlay projection into `status`/isActive without requiring active runtime. |
| 2026-05-18 | Code | `autobyteus-web/stores/runHistoryStore.ts:214-230`, `273-310` | Inspect frontend history projection. | Frontend `markRunAsActive`/reconcile can force active rows to `Running`. | Remove frontend optimistic lifecycle projection for send path. |
| 2026-05-18 | Review | `tickets/in-progress/individual-agent-initializing-status/design-review-report.md` | Consume fresh architecture review of backend-owned lifecycle design. | Direction passed, but AR-002 command idempotency/concurrency, AR-003 projection/overlay lifecycle, and AR-004 prepared new-run activation were blocking. | Rework requirements/design to choose exact policies. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts:1-12` | Check status payload type. | `AgentApiStatus` already includes `initializing`; `AgentStatusPayload` has `status`, `can_interrupt`, and optional identity fields. | Reuse payload for standalone command overlays. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts:6-20` | Inspect metadata fields for prepared-run state. | Current metadata has runId/config/memoryDir/platformAgentRunId/lastKnownStatus but no explicit prepared/activated state. | Add explicit activation/provisioning state. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:234-282`, `314-340` | Inspect current create path and fresh-run preparation helper. | `createAgentRun()` already has private `prepareFreshRun()` but then immediately creates runtime before writing metadata/history. | Split identity preparation from runtime activation. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts:60-90`; `channel-binding-run-launcher.ts:79-95` | Check external standalone send callers. | External channel dispatch directly calls active `AgentRun.postUserMessage()` and launcher can call restore/create directly. | Include migration to `AgentRunCommandCoordinator` for standalone message dispatch above boundary. |
| 2026-05-18 | Post-delivery user validation | Electron app built from delivered implementation | Investigate reported fast `offline -> initializing -> running -> initializing` standalone status sequence. | Sequence occurs during resume/send to an inactive individual agent after app restart; team member remains stable. | Design rework required: command overlay replacement must be command-correlated, not runtime-readiness based. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts:87-95`, `192-200` | Inspect delivered standalone command implementation. | After restore, coordinator calls `clearOverlayForRuntimeOwnedStatus(activeRun, runId)` before `postUserMessage`; that method clears overlay and publishes `activeRun.getStatusSnapshot()` when snapshot is not `offline`/`idle`. If restored Codex reports `running`, UI sees a premature `running`. | Remove restore-snapshot overlay clearing; replace with command-correlated gate. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:82-118` | Inspect command-start local status. | `AgentRun.postUserMessage()` can emit command-start `initializing` only after the command is handed to the active runtime. This is command-correlated and valid as overlay replacement. | Keep command-correlated local status; do not precede it with restored snapshot. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-manager.ts:154-172` | Compare stable team behavior. | Team publishes member command `initializing`, ensures member runtime, posts message, and does not publish an intermediate restored-runtime snapshot as `running`. | Standalone should match team shape. |
| 2026-05-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-status-projector.ts:25-38`; `codex-thread-notification-handler.ts:38-48` | Explain why restored Codex may report `running`. | Codex status tokens `inprogress`/`running`/`active` normalize to `running`; restored thread readiness can therefore produce a running snapshot before the new user-message turn is the visible command lifecycle. | Treat restore/readiness status as internal while command overlay is active. |

## Current Behavior / Current Flow

### Existing offline standalone run today

`User send -> frontend local message/isSending -> RestoreAgentRun GraphQL mutation -> backend reads metadata/workspace -> backend restores runtime/backend -> Codex thread resume if Codex -> backend registers active AgentRun -> mutation returns -> frontend marks run active and refreshes history -> frontend connects websocket -> websocket sends activeRun status snapshot -> frontend sends SEND_MESSAGE -> AgentRun.postUserMessage emits initializing -> runtime emits running/idle/error`.

Problem: the slow restore/start phase happens before backend can publish `Initializing` to the standalone stream.

### Existing offline team member today

`User send -> frontend local message/isSending -> RestoreAgentTeamRun if needed -> connect team websocket -> SEND_MESSAGE with target member route -> TeamRun.postMessage -> team backend publishes member initializing overlay -> ensure/restore/start member runtime -> member AgentRun.postUserMessage -> runtime live events replace overlay`.

Why it works: the team container exists as a command/lifecycle boundary and can publish member `Initializing` before member runtime restore.

### New standalone run today

`User first send -> frontend local message/isSending -> CreateAgentRun GraphQL mutation -> backend creates/restores runtime immediately -> mutation returns permanent runId -> frontend promotes temp id -> mark active/history -> connect websocket -> SEND_MESSAGE -> AgentRun.postUserMessage emits initializing -> runtime live events`.

Problem: runtime creation/start is part of `CreateAgentRun`, before the message command and before stream status observation.

### Post-delivery standalone status flicker

Delivered standalone implementation has a premature restore-snapshot bridge: after command overlay `Initializing` is published and runtime restore completes, `AgentRunCommandCoordinator.clearOverlayForRuntimeOwnedStatus()` clears the overlay and publishes `activeRun.getStatusSnapshot()` when the snapshot is not `offline` or `idle`. For Codex resume, restored runtime readiness may project as `running` before the accepted user message is actually command-correlated. Then the real command lifecycle can emit/settle through `initializing` again. This explains the user-observed fast sequence: `offline -> initializing -> running -> initializing -> running`.

Agent-team members do not show this because the team container publishes member command `Initializing`, ensures member runtime, posts the message, and does not expose a restored-runtime snapshot between readiness and command execution.

Design correction: runtime-readiness status is internal during an accepted inactive-start command. The command overlay remains authoritative until a command-correlated event after message handoff replaces it.

### Command idempotency/concurrency gap

Current standalone websocket `SEND_MESSAGE` has no required command identity. During a backend-owned restore/start command, reconnects/retries can otherwise duplicate message delivery. The design now chooses same-`message_id` idempotency, exact `AGENT_COMMAND_ACK` acknowledgements, and different-`message_id` rejection with `RUN_COMMAND_IN_PROGRESS` instead of queueing.

### Projection/overlay lifecycle gap

Current backend history computes `isActive` from active runtime registration and status from active runtime or offline/error fallback. This is insufficient for command-level `Initializing` before active runtime exists. The design now defines a projection object with `status`, `isActive`, `lastKnownStatus`, `statusSource`, `canInterrupt`, and `shouldConnectStream`, with overlay > active runtime > metadata precedence.

### Prepared new-run activation gap

Current `createAgentRun()` has a private fresh-run preparation step but immediately starts runtime and writes metadata afterward. The design now splits this into durable prepared identity metadata/history plus a coordinator-owned `activatePreparedRun(runId)` create path. Prepared identity needs explicit activation state so coordinator can distinguish prepared-new from historical-offline restore.

## Design Health Assessment Evidence

- Change posture: Larger Requirement / Architecture Bug Fix
- Root cause classification: Boundary Or Ownership Issue + Missing Invariant
- Refactor posture: Needed now

| Evidence Source | Observation | Design Health Implication |
| --- | --- | --- |
| Standalone frontend send store | Frontend sequences runtime restore/create before message command. | Frontend is coordinating lifecycle that backend should own. |
| Standalone websocket handler | `connect()` requires `resolveAgentRun()` and can restore runtime before status session exists. | Status observation is coupled to active runtime existence. |
| Standalone backend `postUserMessage()` | Emits `Initializing`, but only after active runtime exists. | Correct local behavior at wrong boundary/timing. |
| Team backend overlay | Publishes member `Initializing` before member runtime readiness. | Shows healthier command-container architecture. |
| Run history projection | Inactive runs resolve to offline; active without runtime overlay becomes running. | Needs command lifecycle projection independent of active runtime. |
| Websocket SEND_MESSAGE protocol | No required standalone command id/dedupe. | Duplicate retries during activation can double-deliver messages. |
| AgentRun metadata | No explicit prepared/activated lifecycle field. | Prepared-new and historical-offline identities need unambiguous activation mechanics. |
| External channel dispatch | Direct active-run post/restore/create patterns exist. | All standalone message send callers above boundary should use coordinator. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/stores/agentRunStore.ts` | Standalone frontend send orchestration. | Calls `CreateAgentRun`/`RestoreAgentRun` before websocket send. | Remove runtime activation orchestration from frontend send path. |
| `autobyteus-web/graphql/mutations/agentMutations.ts` | Frontend mutation definitions. | Create/restore are lifecycle preconditions today. | Add/reshape run identity/command APIs. |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts` | Agent GraphQL mutations. | Restore waits for full runtime restore. | Do not use as send precondition; introduce command/prepare boundary. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Run creation/restoration, metadata/history writes. | Owns restore mechanics but not command-level lifecycle overlay. | Should be called internally by command coordinator. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Active runtime registry/factory. | Registers active run only after backend restore. | Cannot be the only status boundary. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Standalone websocket session and message handling. | Connect requires active runtime; send requires active runtime. | Split command/status session from active runtime subscription. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Active runtime command lifecycle. | Emits initializing once active runtime receives message. | Keep for runtime-level event; command overlay emits earlier. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-command-status-overlay-store.ts` | Team command/member status overlay. | Healthy reference for pre-runtime member status. | Reuse pattern for standalone, not necessarily same class. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Backend run-history projection. | Only active runtime status or offline/error durable status. | Include command lifecycle status overlay in status projection. |
| `autobyteus-web/stores/runHistoryStore.ts` | Frontend history read model. | Optimistically marks active as running. | Stop using as lifecycle source for send path. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Shared API status payload. | Already supports `initializing`. | Reuse for command overlay/live projections. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` | Stored run metadata. | Lacks activation/prepared state. | Add explicit prepared/activated state. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts` | External channel agent message dispatch. | Posts directly to active runtime. | Migrate to coordinator for standalone sends. |

## Runtime / Probe Findings

Static trace only; no browser repro was executed in this design phase.

## Findings From Code / Docs / Data / Logs

1. History displayed in UI does not imply runtime is restored. Metadata/conversation can be loaded while active runtime is offline.
2. For standalone, runtime restore currently happens in GraphQL restore or create before websocket/status stream can observe startup.
3. For Codex, restore waits for app-server thread resume/startup, making the gap visible.
4. For teams, a container/overlay boundary publishes member `Initializing` before member restore/start; this is the better architecture model.
5. Backend-owned lifecycle requires a standalone command/status boundary that exists at run identity level, not active runtime level.
6. Frontend lifecycle optimism is superseded; frontend can keep local message optimism only.
7. Command idempotency must be explicit: same `message_id` retry is idempotent; different message while a command is in progress is rejected.
8. Status projection must define `isActive` and connection semantics for overlay initializing, not just visible status.
9. Prepared run identity needs an explicit activation state and a dedicated activation method below the coordinator.
10. External standalone send callers must move above the same command boundary.
11. Overlay replacement must be command-correlated. Restored-runtime snapshots/status such as Codex readiness `running` must not clear command `Initializing` before the user-message command is actually executing.

## Constraints / Dependencies / Compatibility Facts

- Backend remains authoritative for lifecycle status.
- Existing team behavior is the conceptual reference and should not regress.
- Existing explicit restore mutation may remain for non-send use cases, but frontend send path must stop depending on it as a runtime lifecycle precondition.
- Durable history `lastKnownStatus` is coarse today; command-level `Initializing` is projected through visible `status`/snapshot while `lastKnownStatus` can remain `ACTIVE` during overlay.
- Different-command queueing during activation is out of scope; the chosen policy is reject with `RUN_COMMAND_IN_PROGRESS`.

## Open Unknowns / Risks

- Architecture review must validate the chosen API split: `PrepareAgentRun` for durable identity and websocket `SEND_MESSAGE` for command activation.
- Attachment finalization still depends on a permanent runId; prepared-run cancel/TTL cleanup must avoid leaked finalized files.
- External channel migration may reveal additional standalone send paths that must route through the command coordinator.

## Notes For Architect Reviewer

The previous frontend accepted-send placeholder design and AR-001 rework are superseded by this architecture pivot. The design should be reviewed as a backend-owned standalone command/lifecycle redesign, not as a frontend status patch.
