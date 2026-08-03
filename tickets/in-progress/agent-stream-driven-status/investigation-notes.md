# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: The `SR-005` implementation passed `ARCH-REV-005`, `CRR-004`, API/E2E execution and proportional durable-test re-review, then reached delivery verification hold (`DR-004`). On 2026-08-03 the user explicitly reopened the presentation requirement after feedback: binary activity must appear on both the parent agent-team/definition group and each exact team-run row. `SR-006` is now required; prior delivery completion is superseded until this correction passes the pipeline.
- Investigation Goal: Preserve authoritative agent-turn lifecycle and team-run liveness separation while restoring clear, binary activity presentation on both team group and exact run rows without recreating the removed aggregate lifecycle.
- Scope Classification: `Large`
- Scope Classification Rationale: The expanded change crosses server agent lifecycle processing, team aggregate/domain events, active-run/history projection, nested/task-team consumers, frontend history/context/recovery, desktop/mobile presentation, and action guards. It remains bounded to lifecycle/status ownership and does not redesign provider loops, team topology, or task business stages.
- Scope Summary: Five-state agent stream companions and interrupt coherence; no owned team-definition lifecycle; binary manager-owned team-run activity; presentation-only any-child activity on the agent-team group plus exact-run activity on run rows; removal of the public five-state aggregate; preserved member status and separately owned task/failure/open-work facts.
- Primary Questions Resolved:
  - The backend already knows current active-turn identity and can produce `running/can_interrupt=true` snapshots.
  - `currentStatus` and `canInterrupt` independently govern the header and composer and can diverge.
  - Shared derived status and command-start reconciliation can emit `running` while retaining `can_interrupt=false`; runtime-specific projections may repair it later, making ordering significant.
  - A current-turn stream can self-heal busy state; a late retired-turn stream cannot safely establish busy.
  - `TURN_COMPLETED`/`TURN_INTERRUPTED` are the correct immediate idle boundaries; terminal failure and runtime termination remain distinct error/offline boundaries.
  - Enter currently bypasses the disabled primary button guard.
  - Supported local `AgentRun.emitLocalEvent` origins bypass the shared processor/finalizer queue and reach run listeners directly.
  - `AgentRun.getStatusSnapshot()` currently prefers a retained local `initializing` override over fresh backend current-turn evidence; the command coordinator can also broadcast a replacement without applying it to `AgentRun`.
  - Team definition display status is copied from the most recent child run, so the definition has no real status owner.
  - `AgentTeamRunManager` already owns the authoritative active-run registry and exposes `isActive` through history/resume; five-state team aggregation is a parallel representation derived from member statuses.
  - Team action eligibility currently converts aggregate status back into activity, while standalone run actions already consume `isActive` directly.
  - Root/nested `TEAM_STATUS` also serves task-team cleanup, failure observation, and open-work settlement; these consumers need explicit task/failure/work facts, not retained public aggregate status.
  - Live nested task-team agent events preserve `TaskTeamInstanceIdentity` outside `AgentStatusPayload`, while the `SR-003` plain initial snapshot array could not carry that execution scope to reconnect mapping.
  - A discriminated internal `TeamLeafAgentStatusSnapshot` can retain ordinary/task-team scope through recursion, while shared prefix and wire-flatten helpers guarantee live/initial identity parity without broadening standalone `AgentStatusPayload`.
  - `SR-004` retained a complete operational `TaskTeamInstanceIdentity`, but an ordinary parent prefixed only the leaf paths. Its `logicalTeam` path therefore remained in the child coordinate frame and could not be subtracted from the root-relative leaf path.
  - The stream carrier should contain only the task-team execution IDs and logical-team route/path required for outward scoping. That logical-team route/path must be prefixed with member/source paths at every ordinary boundary; operational ingress/coordinator-local selectors must not enter the stream-scoping carrier.
  - The delivery candidate proves aggregate removal can coexist with direct `isActive`, but it removed both desktop team dots. User feedback establishes a distinct presentation need: exact-run `isActive` plus definition-group `runs.some(isActive)` must remain visible.
- Approval Resolution:
  - Approved 2026-08-01: remove separate public/frontend `can_interrupt`/`canInterrupt`; agent `running` governs the member stop action; current-turn delta activity can establish running subject to retired-turn safety.
  - Approved 2026-08-02: team definitions have no status; team runs use only manager-owned `isActive`; public/frontend aggregate `AgentTeamStatus`/root `TEAM_STATUS` is removed; member agent status remains unchanged.
  - Approved 2026-08-03: keep binary activity indicators on both the agent-team/definition group row and each exact team-run row; group activity means any child run is active, and neither indicator restores a five-state team status.

## Request Context

The user first reported that the interrupt button is not active while an agent is visibly working and proposed current-turn streaming plus companion status as the simple busy signal; immediate current-turn terminal events, not a quiet-period timer, settle idle. During architecture rework, the user then challenged the separate five-state team-status model. That aggregate was removed successfully. After inspecting the delivery candidate and receiving additional user feedback, the user explicitly corrected the presentation requirement: users still need a dot on the agent-team name/group to know that active runs exist and a dot on each team-run row to identify the exact active instance. The new requirement is binary visualization over existing `isActive`, not restoration of the aggregate.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status`
- Current Branch: `codex/agent-stream-driven-status`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Initial creation refresh succeeded on 2026-08-01. A fresh `git fetch origin personal` on 2026-08-03 confirmed `origin/personal=2a7271c9d78b71b919f7dbfa3b8f97f61c3a2e2b`; the integrated ticket HEAD `55c5b3c914d64059361d47ec87a29da0e4eb9bbb` is 22 commits ahead / 0 behind.
- Task Branch: `codex/agent-stream-driven-status`
- Current Reviewed Source HEAD: `55c5b3c914d64059361d47ec87a29da0e4eb9bbb` (latest-base integrated delivery candidate). `SR-005` source is `4eca42bf56831eb6561a0f8ceee949c62674c4da`; `CRR-004` source review passed; API/E2E and test-code re-review passed; delivery checkpoint `f4fe07d5d5a980e4bee43f7d81d0db4809e5d780` plus later base integrations produced the current candidate.
- Expected Base Branch: `personal` / `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Use only this dedicated ticket worktree. The shared checkout is not authoritative. The completed SR-005/API/E2E source and evidence are committed. Delivery-owned handoff/build/docs logs are currently modified while finalization is on hold; architecture/implementation must not overwrite or include those delivery-only edits in source commits. The new SR-006 change is frontend presentation plus focused durable coverage only unless review discovers a concrete contract impact.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` | Evidence-only production trace and live WebSocket snapshot | Matched screenshot team/turn, overlapping second input, correct later backend snapshot, source-level divergent-state/race evidence, and late-event safety constraint | Requirements, investigation, design | REQ-001–REQ-012 / AC-001–AC-015 | Complete | N/A | Extend only if implementation-time runtime evidence adds a material fact. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` | User-supplied UI evidence | Selected header is `Running` while composer shows send rather than interrupt | Requirements, investigation | REQ-001, REQ-008 / AC-001, AC-009 | Accepted evidence | N/A | None. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md` | Evidence-only team-definition/team-run authority, consumer trace, and post-delivery presentation correction | Fabricated representative status, manager-owned activity, aggregate removal, binary group/run visualization, nested/task consumer separation, reachability, and no-migration evidence | Requirements, investigation, design | REQ-013–REQ-020 / AC-016–AC-026 | Updated | N/A | Preserve the distinction between domain lifecycle removal and binary presentation. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_9d9c83cf3d30__image.png` | User-supplied team hierarchy evidence | Original team-run dot placement and independently useful member-agent status dots | Requirements, investigation | REQ-013–REQ-020 / AC-016, AC-017, AC-021, AC-023, AC-026 | Accepted evidence | N/A | Reuse placement, not the old five-state meaning. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_ead75793b5e3__image.png` | User-supplied team-definition UI evidence | Runtime-status dot is shown beside reusable `Software Engineering Team` definition/container | Requirements, investigation | REQ-013 / AC-016 | Accepted evidence | N/A | None. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_0fa01fdeb308__image.png` | User-supplied delivery-candidate UI evidence | Both parent agent-team group and exact team-run row lack dots; leaf-agent dots remain | Requirements, investigation, design | REQ-016, REQ-020 / AC-023, AC-026 | Accepted evidence | Approved 2026-08-03 | Add binary group/run visuals without changing leaf status. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-01 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Apply canonical design/investigation rules | Requires production-path, ownership, spine, and clean-cut replacement analysis. | Apply during design after approval. |
| 2026-08-01 | Command | `git fetch origin personal`; `git worktree add -b codex/agent-stream-driven-status /Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status origin/personal` | Establish isolated current task baseline | Worktree created at refreshed remote commit `4b29481d5...`. | No. |
| 2026-08-01 | Other | User report and supplied screenshot | Establish observed failure and desired direction | Header reports `Running`; stop is unavailable; user explicitly accepts repeated streamed status events and asks for idle semantics. | Resolved by approved contract. |
| 2026-08-01 | Other | User approval in conversation | Lock intended behavior before design | User approved the recommendation: one derived public status, `running` as busy/interruptible, status carried with stream activity, terminal boundaries for idle, no separate `can_interrupt`, and unified composer guarding. | Produce design and route to architecture review. |
| 2026-08-01 | Code | `autobyteus-web/types/agent/AgentRunState.ts` | Inspect frontend lifecycle data model | Stores `currentStatus` and `canInterrupt` independently. | Design removal/migration of in-memory field. |
| 2026-08-01 | Code | `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` | Trace status application/hydration ownership | Live status grants interrupt only from `running && can_interrupt`; placeholders and snapshot paths independently clear interrupt. | Design one status-only projection. |
| 2026-08-01 | Code | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` | Trace button/icon/action/keyboard conditions | Header/button state can disagree; `handleKeyDown` calls primary action without checking `isActionDisabled`. | In-scope keyboard guard. |
| 2026-08-01 | Code | `autobyteus-web/stores/activeContextStore.ts`, `agentRunStore.ts`, `agentTeamRunStore.ts`, `utils/teamConversationTargetAddress.ts` | Trace active-context and interrupt routing | Existing standalone/team-member interrupt routes are explicit; team interrupts require exact member route/run identity. | Preserve boundary. |
| 2026-08-01 | Code | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`, `TeamStreamingService.ts`, handlers and protocol types | Trace WebSocket dispatch/order | Status and activity share the stream, but frontend activity deliberately does not repair lifecycle; status only changes on `AGENT_STATUS`/ack. | Add status companion contract without frontend content inference. |
| 2026-08-01 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`, `domain/agent-status-payload.ts` | Trace backend status override/public shape | `AgentRun` retains the latest status payload; public shape independently carries `status` and `can_interrupt`. | Centralize lifecycle projection. |
| 2026-08-01 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/*` | Inspect runtime-neutral lifecycle fallback | Tracks identified/anonymous/retired turns correctly, but every derived status hard-codes `canInterrupt:false`; a derived `TURN_STARTED -> running` can contradict interruptibility. | Redesign derived projection to own complete status invariant. |
| 2026-08-01 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts` and overlay stores | Inspect command-start/ack status | Command coordination publishes initializing and may reconcile to running using a prior snapshot's interrupt flag while runtime event processing is asynchronous. | Remove competing public interrupt bit. |
| 2026-08-01 | Code | Codex/Claude/AutoByteus status projectors and event converters | Verify runtime coverage | All supported runtimes normalize to public status and active-turn identity; Codex/Claude lifecycle converters normally emit boundary plus status, AutoByteus maps detailed internal statuses. | Preserve runtime facts behind one public owner. |
| 2026-08-01 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`, `agent-team-stream-handler.ts`, `agent-run-event-message-mapper.ts` | Trace snapshot, subscription, and wire mapping | Stream handlers bind live sources then send initial snapshots; message mapper normalizes status; team stream sends member and aggregate snapshots. | Companion status should reuse this stream/broadcaster boundary. |
| 2026-08-01 | Doc/Code | `tickets/done/agent-status-event-analysis/*`, `status-lifecycle-hardening/*`, `agent-idle-status-lifecycle/*` | Avoid regressing prior findings | Prior work established backend status authority, frontend live-status ownership, turn-ID monotonicity, and proof that late old-turn tool events must not reopen running. | Carry constraint into requirements/design. |
| 2026-08-01 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_96f09bad9be2477bbba1882c070d6957/team_run_metadata.json` and matched `raw_traces_active.jsonl` | Correlate screenshot to production run | Matched Codex member and exact screenshot assistant text; found continued first-turn activity and a second distinct user input 13 seconds after first submission. | Preserve evidence supplement. |
| 2026-08-01 | Probe | Read-only Node WebSocket connection to `ws://127.0.0.1:29695/ws/agent-team/<teamRunId>`; collected only status/connect messages, sent none | Verify current backend snapshot | Backend returned selected member `running/can_interrupt=true` and team `running`; frontend screenshot contradiction can be repaired by snapshot but was not coherent earlier. | Design redundant self-healing status. |
| 2026-08-01 | Command | `ps`, `lsof`, `curl { __typename }`, app plist/package version inspection | Verify live environment/version | Installed app/server listening at `127.0.0.1:29695`; GraphQL responded; installed and repo version are `1.4.37`. | No. |
| 2026-08-01 | Code/Test | Frontend component/status/stream tests and server lifecycle transformer tests | Identify coverage assumptions/gaps | Tests enforce separate `canInterrupt`; transformer tests check derived status values but not the `running => interruptible` invariant; no Enter-disabled guard case found. | Downstream coverage must replace/add cases. |
| 2026-08-01 | Code | `agent-run-event-pipeline.ts`, `default-agent-run-event-pipeline.ts`, `dispatch-processed-agent-run-events.ts`, transformer/processor contracts | Determine where every final outward event can receive status | Current transformers run before processors, so processor-derived events cannot be paired by the existing lifecycle transformer. A finalizer stage after processors is required. | Reflected in design DS-003/DS-006. |
| 2026-08-01 | Code | `AgentRun`, runtime backends/projectors/converters, command projection/overlay/coordinator, mixed member handles/team overlay/aggregate | Refine status ownership and snapshot evidence path | `AgentRun` is the correct public current-snapshot boundary; lifecycle state is an internal event owner; provider projectors are snapshot adapters; command overlays are legitimate only before active runtime evidence. | Reflected in ownership/removal mappings. |
| 2026-08-01 | Code | `AgentContext`, local submission service, external/member input handlers, composer, active-context facade | Separate request locking from lifecycle | `isSending` is used both as a local request lock and a remote busy proxy. It should be narrowed/renamed to `submissionPending`; status owns busy and a discriminated action policy owns Send/Stop/disabled. | Reflected in DS-005 and frontend file mapping. |
| 2026-08-01 | Review | `design-review-report.md` (`ARCH-REV-001`) and `architecture-review-revision-record.md` | Investigate architecture-review failure before implementation | Review confirmed the status-only DTO, event ordering, turn retirement, team identity, and frontend action policy, but found two production boundary gaps: local `AgentRunEvent` origins bypass the finalizer and active-run snapshot precedence can retain stale startup. | Resolve `ARCH-FIND-001` and `ARCH-FIND-002` in `SR-002`; re-review required. |
| 2026-08-01 | Code/Command | `rg -l 'emitLocalEvent\\(' autobyteus-server-ts/src`; inspected `agent-run.ts`, global message router, artifact publication, skill-improvement notification, and mixed member handle | Inventory every production local `AgentRunEvent` origin | Four non-status production call sites plus `AgentRun`'s own command/termination status facts use direct listener fanout. Processor-derived `FILE_CHANGE` and `TEAM_COMMUNICATION_MESSAGE` are additional final outward origins. | Replace `emitLocalEvent` with one awaited `AgentRun.publishEvent` gateway shared with runtime source batches. |
| 2026-08-01 | Code | `AgentRun`, `AgentRunCommandCoordinator`, `ClaudeSession.sendTurn`, Codex/native status sources, three backend dispatch calls | Trace the exact startup/reconnect race and ownership bypass | `AgentRun` stores `initializing`; Claude establishes `RUNNING` and `activeTurnId` before its fire-and-forget pipeline completes; `getStatusSnapshot()` returns the override first; coordinator replacement publication bypasses `AgentRun`. | Make `AgentRun` own lifecycle reconciliation, serialized event publication, and every active-run status publication/read. |
| 2026-08-02 | Other | User follow-up plus `ctx_9d9c83cf3d30__image.png` and `ctx_ead75793b5e3__image.png` | Establish requested team-status simplification | User distinguishes team definition, live team run, and member agent; definition status is redundant, team activity is binary, and member agent status remains the useful detail. | Refine requirements and obtain approval before redesign. |
| 2026-08-02 | Other | User approval in conversation | Lock the expanded requirements basis | User explicitly approved REQ-013–REQ-019 and AC-016–AC-025 after the second investigation. | Revise full design as SR-003 and route architecture review. |
| 2026-08-02 | Code | `workspaceHistoryTeamDefinitionGroups.ts`, `WorkspaceHistoryWorkspaceSection.vue`, `useWorkspaceHistoryTreeState.ts`, `useWorkspaceHistoryMutations.ts` | Trace definition/run dots and team action policy | Definition status is copied from the latest representative child; Stop/archive/delete eligibility is `teamStatus !== offline` despite `TeamTreeNode.isActive`. | Remove definition status; use `isActive` for team actions. |
| 2026-08-02 | Code | `AgentTeamContext.ts`, `agentTeamContextsStore.ts`, `runHistoryTypes.ts`, `runHistoryTeamHelpers.ts`, `runHistoryStore.ts`, team open/recovery/hydration services | Trace frontend authority and duplication | Frontend stores `currentStatus`, `isActive`, and `isSubscribed`; active becomes synthetic status and context aggregate becomes active again, while contexts include drafts/history. | Keep activity explicit; connection/context existence cannot own liveness. |
| 2026-08-02 | Code | `agent-team-run-manager.ts`, `team-run-history-service.ts`, `team-run-status-projection-service.ts`, GraphQL history/resume types | Verify backend team activity authority | Active registry plus backend liveness already determines `isActive`; history and resume expose it directly. Aggregate status is an additional member-derived field. | Make manager activity the only public team lifecycle fact. |
| 2026-08-02 | Code | `team-status-aggregation.ts`, `mixed-team-manager.ts`, `team-run.ts`, team snapshot/mapper, subteam/task-team handles, `TaskTeamSettlementCoordinator` | Inventory aggregate production consumers | Aggregate drives root/nested `TEAM_STATUS`, subteam status overlays, task-team cleanup, failure observation, and open-work settlement. Member snapshots are independently available. | Separate each consumer by its actual subject; do not preserve aggregate as compatibility. |
| 2026-08-02 | Command | `rg` inventory for `AgentTeamStatus`, `TEAM_STATUS`, `deriveTeamApiStatus`, team status normalizers/visuals | Measure change surface | 46 production/doc files reference public team-status structures; the representation is cross-cutting rather than a local dot. | Scope is Large; design needs a clean removal sequence. |
| 2026-08-02 | Doc | `design-principles.md` | Re-apply ownership, semantic-tightness, and clean-cut replacement rules | Separate definition, live team run, agent lifecycle, task stage, and request/transport state; remove redundant shared shapes instead of adding reconciliation. | Apply after expanded requirements approval. |
| 2026-08-02 | Code | `server-managed-team-member-projections.ts`, mixed member-handle interface, persistent/subteam/task-team handle snapshots, `mixed-team-event-bridge.ts` | Verify nested snapshot semantics before target design | The common handle contract forces subteam/task-team handles to return one agent-shaped aggregate snapshot. Live nested agent events already have an exact path-prefixing boundary, but initial snapshots are not a recursive leaf-only model. | Specialize handles; recursively flatten/prefix actual leaf-agent snapshots and delete pseudo team agent snapshots. |
| 2026-08-02 | Code | `mixed-team-manager.runTermination`, `agent-team-run-manager`, `agent-team-stream-handler`, `team-run-service.observeTeamRunLifecycle` | Verify successful termination and live-client ordering | Backend root offline is emitted before backend listeners are cleared, manager unregisters afterward, and the observer separately polls `run.isActive()` every second. A manager-owned lifecycle subscription can notify after authoritative unregistration and replace both aggregate offline and polling. | Design bind-then-fresh-read manager lifecycle delivery; rejected termination must not publish inactive. |
| 2026-08-02 | Code | `teamTaskExecutionEventRouter.ts`, `teamTaskTeamExecutionProjection.ts`, task-delegation event contract/tests | Verify whether task cleanup needs aggregate offline | `TASK_DELEGATION_TERMINAL_STATUS` already maps to terminal task status and schedules task-team projection cleanup. `TEAM_STATUS offline` is an additional fallback, and task-team nodes also copy task stage into `currentStatus`. | Retain terminal task event/record reconciliation; remove offline fallback and agent-like task-team status projection. |
| 2026-08-02 | Git/Review | `git log 4b29481d..24256a6af`, `implementation-handoff.md`, `code-review-report.md`, `ARCH-REV-002` | Establish the actual branch starting state | The agent-only `SR-002` foundation is already implemented and code-reviewed. API/E2E later began coverage edits before the user expanded team requirements; those uncommitted test edits are held. | Preserve reviewed agent source; architecture-review and implement the team expansion before API/E2E reconciliation. |
| 2026-08-02 | Review | `design-review-report.md` (`ARCH-REV-003`) and `architecture-review-revision-record.md` | Investigate the expanded-design failure before implementation | Manager liveness, aggregate removal, frontend boundary, consumer reassignment, and preserved agent foundation passed structurally. `ARCH-FIND-003` found that plain recursive `AgentStatusPayload[]` cannot carry the live task-team execution envelope during initial reconnect mapping. | Define one tight scoped snapshot carrier plus exact shared live/initial prefix and flatten contracts in `SR-004`; re-review required. |
| 2026-08-02 | Code | `domain/task-team-instance.ts`, `domain/team-run-event.ts`, `backends/mixed/events/mixed-team-event-bridge.ts` | Inventory live nested/task-team identity ownership | `TeamRunEvent.taskTeamInstance` carries complete run/instance/task/logical-team/ingress identity outside the agent payload. The bridge prefixes agent member/source paths and stamps/replaces that outer identity at task-team boundaries. | Preserve the same envelope and override semantics in recursive initial snapshots. |
| 2026-08-02 | Code | `team-run-event-websocket-message-mapper.ts`, `team-runtime-status-snapshot-service.ts`, `domain/agent-status-payload.ts` | Compare live and initial stream representability | Live mapping privately flattens task-team run/instance/task/logical-team plus a source-path-relative member identity. Initial mapping accepts plain agent payloads, so it has no equivalent task-team execution carrier. | Keep `AgentStatusPayload` tight; carry a discriminated envelope until a shared stream mapper flattens it. |
| 2026-08-02 | Code | `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts`, protocol identity types | Verify the frontend selection consequence | `resolveTaskTeamScopedMessage` needs task-team run identity plus relative member route/path to construct `taskTeamRunId/relativeMemberRouteKey`; without them a reconnect status can update the structural or wrong leaf. | Initial `AGENT_STATUS` must expose the same scoped fields as live status for the same leaf. |
| 2026-08-02 | Review/Test | `code-review-report.md`, `code-review-revision-record.md`, `CRR-003`, reviewer reproduction `CR-MP-002` | Investigate post-implementation design-impact failure | A supported `root -> ordinary subteam -> task team -> leaf` flow is reachable through the child agent's exposed `delegate_task` tool. The reproduction passed 2/2 assertions: root-relative leaf path plus child-local logical-team path makes live mapping lose the relative selector and initial mapping throw. | Resolve `CODE-FIND-002` as `SR-005`; keep API/E2E blocked. |
| 2026-08-02 | Code | `mixed-sub-team-run-factory.ts`, `task-team-run-identity-factory.ts`, `mixed-task-team-member-handle.ts`, `mixed-sub-team-member-handle.ts` | Trace the exact coordinate transition | Ordinary child configuration intentionally strips its outer member prefix. `TaskTeamRunIdentityFactory` therefore creates parent-local logical-team coordinates. The task-team handle correctly roots the leaf to that child; the outer ordinary handle then prefixes the leaf to root but clones the task identity. | The next outer boundary must rebase task-team logical coordinates with the leaf, not guess later in transport. |
| 2026-08-02 | Code | implemented `team-leaf-agent-status-snapshot.ts`, `team-run-event.ts`, `mixed-team-event-bridge.ts`, `team-stream-agent-identity-payload.ts` | Assess the tightest corrective contract | The full operational identity includes task-team-local ingress/coordinator selectors that are irrelevant to stream routing. The wire mapper only needs task-team run/instance/task plus logical-team path/key. | Replace the stream carrier's full operational identity with a tight `TaskTeamStreamScope`; share one all-event/live/snapshot rebasing core. |
| 2026-08-02 | Test | `tests/unit/agent-team-execution/team-run-service.test.ts` via `pnpm exec vitest run ... --reporter=dot` (reviewer evidence) | Classify secondary failure | 1 test fails / 12 pass because its `AgentTeamRunManager` double lacks `subscribeToLifecycle` and `getLifecycleSnapshot`. This test is not one of the three held API/integration files. | `CODE-FIND-003` is an implementation-local fixture update after `SR-005` passes; do not add production fallback methods. |
| 2026-08-03 | Review/Delivery | `ARCH-REV-005`, `IR-004`, `CRR-004`, `API-REV-002`, API/E2E test review, `DR-004`, and current git history through `55c5b3c91` | Establish the real continuation state before changing presentation | The aggregate-removal/coordinate implementation passed architecture, source, API/E2E, and test-code review and reached explicit-user-verification hold. The new work is a user-approved post-delivery presentation correction, not an unresolved prior finding. | Preserve all accepted source; reroute SR-006 from solution design. |
| 2026-08-03 | Other/UI | User feedback plus `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_0fa01fdeb308__image.png` | Resolve whether all team visuals should remain absent | User explicitly requires a dot on both the parent agent-team name/group and the exact run row because each answers a useful scan question. | Add REQ-020/AC-026 and SR-006. |
| 2026-08-03 | Code | `WorkspaceHistoryWorkspaceSection.vue`, `workspaceHistoryTeamDefinitionGroups.ts`, `RunningTeamGroup.vue`, `RunningTeamRow.vue`, `StatusDot.vue`, `workspaceStatusDotPresentation.ts` | Trace the smallest current frontend change | The delivery candidate renders no dot in either team position; every required row already has `isActive`, and every definition/group already has the complete child `runs[]`. Existing `StatusDot` is now correctly agent-only. | Add a separate team binary component; do not synthesize AgentStatus. |
| 2026-08-03 | Command | `git fetch origin personal`; `git rev-list --left-right --count HEAD...origin/personal` | Refresh continuation/base context | Integrated HEAD `55c5b3c91` is 22 ahead / 0 behind `origin/personal=2a7271c9d`. | Record current source; delivery must refresh again later. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User sends work to a standalone agent or focused team member and later clicks the primary composer action to stop current execution. | Composer -> `activeContextStore.canInterrupt` -> standalone `agentRunStore.interruptGeneration` or exact team `agentTeamRunStore.interruptFocusedMemberGeneration` -> WebSocket `INTERRUPT_GENERATION` -> server run/member interrupt boundary. | Routing is explicit and target-safe, but the UI only exposes it when separate `canInterrupt` is true; `Running` alone is insufficient today. | Source paths above; screenshot. |
| BEH-002 | System / Contract | A provider runtime, accepted direct agent message, artifact publication, skill-improvement notification, or task-delegation notification produces an outward `AgentRunEvent`. | Provider events use converter -> shared pipeline -> backend listeners -> `AgentRun`; supported local origins instead call `AgentRun.emitLocalEvent` -> local listeners directly. Processor-derived events are appended inside the pipeline. | Activity and status share transport, but local events bypass processors/lifecycle finalization and only sparse/explicit status mutates frontend lifecycle; separate status producers can contradict or fail to accompany activity. | Code trace, `emitLocalEvent` inventory, architecture review MP-001, and live probe. |
| BEH-003 | System | Runtime emits current-turn completion/interruption/error/termination. | Runtime boundary -> converter -> runtime-neutral lifecycle transformer/status event -> stream -> frontend status handler and message completion handlers. | Turn completion should mean idle, runtime termination offline, terminal failure error; current logic is distributed and status can be overwritten by later/racing status sources. | Current lifecycle code; prior `agent-idle-status-lifecycle` evidence. |
| BEH-004 | System | Delayed provider/tool output arrives after original turn terminal boundary or while a newer turn is active. | Same event pipeline and transcript/activity projection, with `AgentTurnLifecycleState.retiredTurnIds` protecting lifecycle. | Late content must remain visible but must not establish current busy state. | Prior production-trace evidence and current state machine. |
| BEH-005 | User | User presses Enter in composer while the action button is disabled/running. | `keydown` -> unconditional `handlePrimaryAction` -> send/interrupt branch based only on `canInterrupt`, bypassing `isActionDisabled`. | Enter may send when button click cannot; matched trace contains a second user input while original turn continued. | Component source and matched trace. |
| BEH-006 | User / Presentation | User scans a collapsed or expanded agent-team/definition group containing child runs. | Current delivered candidate: history/query team nodes -> `buildWorkspaceTeamDefinitionDisplayGroups` retains all `runs[]` and representative metadata -> definition row renders avatar/name/count only. | The bad representative five-state status is gone, but the group no longer reveals that one or more child runs are active. `runs.some(run.isActive)` is directly representable without a new contract. | Current component/group builder; `ctx_0fa01fdeb308__image.png`; explicit user feedback. |
| BEH-007 | System / Contract | Team is created/restored, listed, or terminated. | `AgentTeamRunManager.registerActiveRun/getActiveRun/unregisterActiveRun` -> history/resume `isActive`; parallel member snapshots -> `deriveTeamApiStatus` -> team status. | Binary live registration already exists; aggregate status is neither necessary nor equivalent. | Manager, history, aggregation source. |
| BEH-008 | User | User views/stops/archives/deletes an exact team run. | Current delivered candidate: `TeamTreeNode.isActive` -> Stop/archive/delete policy; `WorkspaceHistoryWorkspaceSection` and `RunningTeamRow` render no root-run dot. | Action authority is correct, but users lose the at-a-glance exact-run liveness cue. The row already has the required boolean. | Current components/types; `ctx_0fa01fdeb308__image.png`; explicit user feedback. |
| BEH-009 | System / Contract | A leaf in an ordinary child team delegates to a visible team target; its task-team leaf later emits live status or is snapshotted for root reconnect. | The child factory strips the ordinary prefix; task identity is child-local; the task-team handle roots leaf and logical team to the child; the outer ordinary handle prefixes only leaf member/source paths; the stream flattener compares two frames. | Live mapping omits the relative leaf selector and the frontend treats it as a task-team root; initial mapping throws. Aggregate removal itself remains sound. | `CR-MP-002`, `CODE-FIND-002`, current bridge/flattener source. |

## Design Health Assessment Evidence

- Change posture: `Bug Fix`, lifecycle/status `Refactor`, and team-status contract `Cleanup`
- Candidate root cause classification: `Missing Invariant`; `Boundary Or Ownership Issue`; `Duplicated Policy Or Coordination`; `Shared Structure Looseness`; local keyboard guard defect.
- Refactor posture evidence summary: The system has the necessary agent current-turn facts and manager-owned team activity fact, but public truth is split among interrupt bits, agent status sources, team aggregate status, active flags, connection state, task stage, and UI request state. Correctness requires separating subjects and removing redundant representations, not adding reconciliation.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Screenshot/component source | Header reads status; button reads separate interrupt bit. | Two public truths directly permit contradiction. | Remove separate authority. |
| Lifecycle transformer | Derived running hard-codes non-interruptible. | Shared lifecycle owner produces an invalid public combination. | Make projection complete/status-only. |
| Command coordinator | Startup reconciliation can publish running from a false startup interrupt snapshot. | Asynchronous coordination duplicates projection policy. | Central owner after command/runtime facts. |
| Runtime projectors/live probe | Active turn can be identified and snapshot correctly. | No provider capability gap; reuse facts. | Stream projection consistently. |
| Prior late-event evidence | Old turn output can arrive minutes late. | Literal “any arrival means busy” is unsafe. | Require current-turn correlation. |
| Composer keydown/matched trace | Enter bypasses disabled action; overlapping input recorded. | Status fix alone leaves a reachable send guard bug. | Central action guard. |
| `emitLocalEvent` production call sites | Direct message, artifact, and two system-task notification paths fan out without the pipeline/queue. | A backend-only finalizer cannot satisfy the approved all-outward-event contract. | Put backend source batches and local events behind one `AgentRun` gateway. |
| `statusOverride ?? backend.getStatusSnapshot()` plus direct coordinator broadcaster | A fresh backend active turn can coexist with a stale public startup override; a streamed replacement need not update the public owner. | Bind-before-read is insufficient until active-run status application and snapshot reconciliation have one owner. | Replace override precedence with `AgentRun` lifecycle reconciliation and forbid direct active-run status broadcast. |
| Team-definition grouping and screenshots | Before the clean cut, definition status was borrowed from one representative child run; the delivery candidate then removed the visual entirely. | The definition has no lifecycle owner, but its displayed child collection can support a narrow binary activity cue. | Keep the borrowed field removed; restore only a presentation-derived any-child-active dot. |
| Active-run manager plus history/resume API | `isActive` already comes from authoritative live registration. | The system does not need a second public team lifecycle. | Keep the manager boundary authoritative. |
| Team history/context helpers | Code repeatedly converts `isActive -> Running/Offline -> isActive`. | Shared structures are loose and circular; status and liveness have overlapping meaning. | Remove `AgentTeamStatus`/team `currentStatus` and retain direct activity. |
| Task-team/observer consumers | Aggregate status is used for task cleanup, failure, and open-work decisions. | A cleanup-only UI edit would leave hidden cross-domain coupling. | Give each consumer a narrow task/failure/work fact during clean-cut removal. |
| `CR-MP-002` reproduction and implemented bridge | Leaf member/source paths are root-relative while `taskTeamInstance.logicalTeam` remains child-local after an ordinary outer boundary. | A tight carrier can still be semantically inconsistent if path-bearing fields use different frames. | Carry only stream-required task-team scope and rebase its logical-team path/key at the same boundary as source/member paths. |
| `team-run-service.test.ts` reviewer command | Manager lifecycle source is sound, but one test double predates its exact interface. | This is a bounded test-fixture defect, not a production compatibility need. | Update the double during implementation rework; do not weaken the production interface. |

## Relevant Files / Components

This table is cumulative investigation provenance. Rows labeled **pre-change** record the source that motivated the accepted `SR-005` clean cut; rows labeled **accepted/current** describe integrated HEAD `55c5b3c914d64059361d47ec87a29da0e4eb9bbb`. Historical rows are not instructions to restore removed contracts.

| Path / Component | Investigated Responsibility / Era | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | Runtime-neutral active/retired turn state | Correct place for current/retired turn identity; currently does not own interrupt projection. | Likely governing lifecycle state behind a strengthened projection boundary. |
| `.../lifecycle-status-event-transformer.ts` | Filters/derives lifecycle statuses | Derives `running/idle/error` but hard-codes `canInterrupt:false` and emits only on transition difference. | Candidate authoritative stream-companion status owner/refactor. |
| `.../services/agent-run-command-coordinator.ts` | Command idempotency/association/ack/status overlays | Mixes command registry settlement with status replacement. | Keep command association/start facts; remove competing public status construction where possible. |
| Runtime status projectors/converters | Normalize runtime-specific internal facts | Each independently builds public status/interrupt payloads. | Preserve runtime facts; centralize public projection semantics. |
| `agent-run-event-message-mapper.ts` / stream broadcasters | Map/broadcast events to WebSocket | Existing shared outbound boundary. | Reuse for repeated status companions. |
| Team member event bridges/snapshot service | Preserve member identity on team stream | Exact member route/run identities already available. | Companion status must remain member-scoped. |
| `autobyteus-web/types/agent/AgentRunState.ts` | Frontend run projection / pre-change | Separate status and interrupt fields originally existed. | Accepted source removes `canInterrupt` as lifecycle authority. |
| `.../runStatus/agentRuntimeStatusState.ts` | Live/snapshot/hydration writes / pre-change | Multiple APIs independently cleared interrupt state. | Accepted source uses canonical status application/preservation. |
| `.../AgentUserInputTextArea.vue` | Composer UI/actions / pre-change | Icon came from interrupt flag; disabled logic was separate; Enter bypassed it. | Accepted source derives action from status plus one central guard. |
| `activeContextStore.ts` and interrupt stores | Resolve selected context and route commands | Existing exact routing is healthy. | Reuse; no refactor of routing unless required by status-only action API. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Public run boundary / pre-change evidence | Backend and local events originally entered different listener paths; a retained override shadowed fresh backend state. | Accepted source gives `AgentRun` one serialized publication gateway, one per-run lifecycle state, and the canonical refresh/read path. |
| `.../backends/agent-run-backend.ts` and three runtime backends | Runtime control / pre-change evidence | Backends originally dispatched processed events themselves. | Accepted runtime adapters expose source batches/lifecycle evidence; `AgentRun` owns final processing/publication. |
| `global-agent-run-message-router.ts` | Grant-authorized direct run delivery | Accepted delivery calls `targetRun.emitLocalEvent(INTER_AGENT_MESSAGE)` directly. | Await the owning run's publication gateway after command acceptance. |
| `published-artifact-publication-service.ts` | Persists artifact projection and notifies active run/application execution | Active-run notification bypasses the finalizer. | Await `run.publishEvent(ARTIFACT_PERSISTED)`; preserve non-AgentRun fallback unchanged. |
| `skill-improvement-target-notification-service.ts` | Notifies an active idle target about future-run skill changes | Direct `SYSTEM_TASK_NOTIFICATION` fanout bypasses the finalizer. | Await `activeRun.publishEvent`; its companion remains idle and does not open a turn. |
| `mixed-agent-member-handle.ts` | Lazy member execution and task-delegation notification | Task-delegation system notification bypasses the finalizer; command status overlay can be emitted even after a nested `AgentRun` exists. | Await the nested run gateway; restrict direct team startup overlay to the pre-`AgentRun` interval. |
| `autobyteus-web/components/workspace/history/workspaceHistoryTeamDefinitionGroups.ts` | Builds team-definition display groups | Current source retains all exact child `runs[]` and no borrowed status. | Add only `hasActiveRuns = runs.some(run.isActive)` as presentation data; never select representative status. |
| `WorkspaceHistoryWorkspaceSection.vue` / `useWorkspaceHistoryTreeState.ts` / `useWorkspaceHistoryMutations.ts` | Render team rows and govern Stop/archive/delete | Current actions correctly use `isActive`, but definition-group and run rows have no binary dot. | Render group/run binary indicators while leaving actions and DTOs unchanged. |
| `AgentTeamContext.ts` / team history/open/recovery/hydration stores | Frontend team state / accepted/current | Accepted source stores direct `isActive` and separate `isSubscribed`; no `AgentTeamStatus`/team `currentStatus` conversion remains. | Preserve unchanged in SR-006. |
| `agent-team-run-manager.ts` | Live root TeamRun registration / accepted/current | Registers, validates, lists, unregisters, and publishes exact binary lifecycle. | Governing owner for public team liveness remains unchanged. |
| `team-status-aggregation.ts` / `team-status-payload.ts` / root `TEAM_STATUS` snapshot and mapper | Aggregate path / pre-change, now deleted | Built and transported the redundant public five-state team contract. | Do not restore. |
| `mixed-sub-team-member-handle.ts` / `mixed-task-team-member-handle.ts` | Child execution / accepted/current | Accepted specializations preserve nested leaf `AGENT_STATUS` and tight task-team stream scope without pseudo team status. | Preserve unchanged in SR-006. |
| `task-team-settlement-coordinator.ts` | Child settlement / accepted/current | Uses explicit member/task open-work facts after aggregate removal. | Preserve unchanged in SR-006. |
| `TeamWorkspaceView.vue`, `RunningTeamGroup.vue`, `RunningTeamRow.vue`, mobile catalog, agent `StatusDot` | Present team groups/runs or focused-member state | Aggregate leakage is removed; mobile is already binary; desktop group/run rows now omit all team activity visuals. | Preserve selected leaf five-state status and mobile binary text; add a separate solid binary `TeamActivityDot` to group/run rows only. |
| `task-team-instance.ts` / proposed `task-team-stream-scope.ts` | Operational task-team identity versus outward routing identity | Full instance identity mixes immutable execution facts with task-team-local ingress data; stream routing needs only run/instance/task plus logical team route/path in the current team frame. | Keep operational identity unchanged; derive a tight stream scope at the task-team handle and rebase only that scope through parent boundaries. |
| `mixed-team-event-bridge.ts` | Prefixes child live events and snapshots | Current core prefixes leaf member/source paths but clones the task-team carrier; non-agent task-team events also bypass a common scope rebase. | One generic `prefixMixedTeamStreamScope` must govern all live event types and initial snapshots; agent adapters additionally prefix member paths with the same private path rule. |
| `team-stream-agent-identity-payload.ts` | Flattens task-team scope to wire fields | Current code receives inconsistent frames and cannot safely infer the missing prefix. | Consume already-consistent `TaskTeamStreamScope`; retain strict leaf validation and no mapper fallback. |


## Team Definition And Team Run Status Investigation

### Historical Aggregate Path (Removed In Accepted Source)

```text
leaf agent/subteam status snapshots
  -> deriveTeamApiStatus
  -> MixedTeamManager.getStatusSnapshot
  -> root/nested TeamRunEventSourceType.TEAM
  -> TEAM_STATUS WebSocket/history status
  -> AgentTeamContext.currentStatus / TeamTreeNode.currentStatus
  -> team dots, mobile label, and canTerminateTeam
  -> representativeRun.currentStatus copied to definition group
```

### Existing authoritative activity path

```text
create/restore TeamRun
  -> AgentTeamRunManager.registerActiveRun
  -> getActiveRun validates backend.isActive
  -> history/resume isActive
  -> create/restore/terminate result and refresh
  -> frontend team-run isActive
```

### Subject/authority separation

| Subject | Current overlap | Evidence-backed authority needed |
| --- | --- | --- |
| Team definition | Borrows latest child team-run status | No runtime status; definition/configuration data only |
| Root team run | Both aggregate `status` and manager-derived `isActive` | Binary active registration only |
| Nested/subteam run | Agent-like five-state aggregate plus child live handle | Binary child live instance only if needed by a surface |
| Leaf agent member | Canonical agent status sometimes folded upward | Five-state AgentRun lifecycle, unchanged through team identity envelope |
| Task execution | Task stage plus aggregate/runtime status | Task ledger/projection stage only |
| Team failure | Aggregate error plus explicit member/operation failure | Explicit failure event/result |
| Team Stop request | `terminatingTeamIds` plus aggregate status mutation | Local pending for request guard; `isActive` stays server-authoritative |
| Stream subscription | `isSubscribed` coexists with status/activity | Connection only; never liveness |

### Reachable constraints

- Live team + all members idle: team remains registered and must keep Stop.
- Live team + member error: team remains registered and must keep Stop until successful termination.
- Disconnected frontend + live server team: `isSubscribed=false` but `isActive=true`.
- Historical hydrated context + no server run: context exists but `isActive=false`.
- Temporary frontend draft: context exists but no active server TeamRun.
- Mixed live/historical child runs under one definition: no single child status can truthfully describe the definition.

### Clean simplification boundary

The public team aggregate can be removed without losing required behavior only if its non-presentation uses are reassigned:

- member snapshots remain `AGENT_STATUS`;
- root/team-run liveness comes from the active-run manager;
- task-team cleanup comes from task terminal/lifecycle facts;
- failure reporting comes from explicit failure facts;
- settlement checks an internal `hasOpenWork`-style predicate over member/task facts, not a public status enum.

Detailed evidence is retained in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/team-status-simplification-evidence.md`.

## Outward `AgentRunEvent` Origin Inventory

| Origin ID | Supported Production Trigger / Contract | Source Location(s) | Current Entry And Dispatch Path | Event Classes | SR-002 Target Path |
| --- | --- | --- | --- | --- | --- |
| ORIGIN-001 | AutoByteus stream, Codex app-server message, or Claude session event | three runtime backends and their converters | backend converter -> backend-owned `dispatchProcessedAgentRunEvents` -> backend listeners -> `AgentRun` wrapper -> subscriber | turn, segment, tool, todo, compaction, token, runtime status, artifact/system/inter-agent, error | converter -> backend neutral source batch -> `AgentRun` gateway -> processors -> lifecycle finalizer -> run subscribers |
| ORIGIN-002 | Active-run command begins/is accepted/fails or run termination is accepted | `agent-run.ts` | `AgentRun.emitStatusPayload` / termination -> `emitLocalEvent` -> local subscribers | `AGENT_STATUS` fact | `AgentRun` lifecycle fact method -> same gateway/canonicalizer -> run subscribers |
| ORIGIN-003 | Grant-authorized `send_message_to` delivery is accepted by the exact target run | `global-agent-run-message-router.ts` | `targetRun.emitLocalEvent` | `INTER_AGENT_MESSAGE` | awaited `targetRun.publishEvent` -> same gateway/finalizer |
| ORIGIN-004 | Active run publishes an artifact | `published-artifact-publication-service.ts` | `run.emitLocalEvent` | `ARTIFACT_PERSISTED` | awaited `run.publishEvent` -> same gateway/finalizer; application-execution fallback remains outside `AgentRunEvent` scope |
| ORIGIN-005 | Skill improvement completes for an active idle target run | `skill-improvement-target-notification-service.ts` | `activeRun.emitLocalEvent` | `SYSTEM_TASK_NOTIFICATION` | awaited `activeRun.publishEvent`; finalizer pairs the existing idle status and does not open a turn |
| ORIGIN-006 | Mixed member accepts a task-delegation system input | `mixed-agent-member-handle.ts` | `run.emitLocalEvent` | `SYSTEM_TASK_NOTIFICATION` | awaited nested `run.publishEvent`; accepted command/current-turn fact is already applied by the run |
| ORIGIN-007 | File-change or team-communication processors derive an outward event from a source batch | file-change and team-communication processors | appended after the current lifecycle transformer | `FILE_CHANGE`, `TEAM_COMMUNICATION_MESSAGE` | processors execute inside the run gateway before the finalizer; each derived event receives its own companion |

There are no other production `emitLocalEvent` callers under `autobyteus-server-ts/src` as of the recorded `rg` inventory. Tests that directly dispatch the pipeline or call `emitLocalEvent` are coverage seams, not additional production origins, and must be rewritten to exercise `AgentRun`.

## Snapshot Race Evidence And Required Precedence

Current reachable sequence for Claude (Codex/native have analogous snapshot timing):

```text
AgentRun.postUserMessage
  -> local statusOverride = initializing
  -> ClaudeSession.sendTurn sets currentStatus=RUNNING + activeTurnId=A
  -> TURN_STARTED callback schedules async backend pipeline processing
  -> command coordinator may broadcast running directly
  -> reconnect calls AgentRun.getStatusSnapshot()
  -> statusOverride still wins, so initializing can be returned for current turn A
```

The target must use these evidence-precedence constraints:

| Existing Canonical Fact | Fresh Runtime Evidence | Required Canonical Result |
| --- | --- | --- |
| startup pending / `initializing` | current identified or anonymous active turn | `running`; fresh current-turn evidence promotes startup immediately |
| identified current turn A / `running` | `idle` or `initializing` without matching terminal evidence | remain `running`; a racy phase read cannot close A |
| identified current turn A | matching terminal boundary/error for A | `idle` or `error` and retire A |
| identified current turn B | late activity/terminal/snapshot for retired A | preserve B/`running`; still deliver late content |
| anonymous current turn | fresh authoritative runtime idle or anonymous terminal boundary | `idle`; anonymous runtimes must use their ordered runtime fact because no ID can be matched |
| any non-offline state | explicit accepted termination or runtime `isActive=false` | `offline`; transport disconnect alone is not this evidence |
| no current turn and no startup | live runtime idle/initializing/error | apply the fresh runtime phase subject to terminal-error classification |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-01 | Trace | `rg`/`jq` against matched team member `raw_traces_active.jsonl` | Exact screenshot assistant text matched; first turn continued; second distinct user input was recorded during it. | UI action state was not safely governing send/interrupt. |
| 2026-08-01 | Probe | Read-only Node global `WebSocket` connection to local team endpoint, no sends, 1.5s capture | Current snapshot returned `running/can_interrupt=true` for the selected member. | Backend facts exist; live frontend convergence is the issue. |
| 2026-08-01 | Setup | `ps`, `lsof -p 44512`, GraphQL `__typename` query | Desktop server is live at port 29695 on app version 1.4.37. | Probe applies to current shipped/local app build. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: The issue is governed by repository-owned runtime and WebSocket contracts.
- Why it matters: External research would not improve the authoritative lifecycle evidence.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing installed AutoByteus desktop app and live local server for read-only snapshot; no setup needed for source analysis.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: Read-only WebSocket probe closed its connections; no server commands or persistent test data were created.

## Findings From Code / Docs / Data / Logs

1. The screenshot's impossible-looking state is actually explicitly permitted by the model: `Running` and `canInterrupt=false` are independent.
2. The user's suggested transport simplification is viable because status already shares the WebSocket stream and every event passes a common server pipeline/broadcast boundary.
3. The safe status derivation is not `any byte arrived => running`; it is `the event belongs to the current open turn => running`. This preserves the recently fixed retired-turn invariant.
4. Idle should be emitted immediately from the matching `TURN_COMPLETED`/`TURN_INTERRUPTED` boundary. A delay would be less accurate and would reintroduce timing heuristics.
5. Terminal error/offline need explicit distinct boundaries; ordinary tool failure remains activity within a live turn.
6. Removing the separate interrupt bit is the cleanest way to enforce `running => stop`, avoid event-order races, and simplify frontend hydration.
7. The Enter-key bypass is independently reachable and materially related; it must be fixed under the same composer action contract.
8. The original backend-only finalizer placement is incomplete: four supported local non-status call sites and `AgentRun`'s own local status facts bypass it.
9. One public owner requires one publication route. Runtime adapters must expose neutral source batches to `AgentRun`; local producers must call an awaited run publication method; subscribers must never attach to backend listeners directly.
10. A retained status override cannot remain the snapshot authority. `AgentRun` must reconcile fresh internal runtime lifecycle evidence into the same per-run turn state used by event finalization, then build the public status-only snapshot from that state.
11. Direct `AgentStreamBroadcaster` status publication is valid only for a pre-runtime command overlay when no `AgentRun` exists. Every status after run creation must be applied and published through that run.
12. Team definition status is mechanically borrowed from one child run and has no authoritative subject owner; it must be removed, not recalculated.
13. `AgentTeamRunManager` already owns the binary fact users need for root team Stop: a live registered `TeamRun`.
14. The five-state team aggregate is not equivalent to activity: idle/error members can coexist with a live, stoppable team.
15. Frontend `AgentTeamContext`, history, open, recovery, and action code maintain circular `isActive`/aggregate conversions; this is the main team-status complexity.
16. Definition and root team-run **five-color/member-derived** dots are invalid; member-agent dots remain meaningful because they govern exact member interaction. Post-delivery feedback later establishes that binary team activity dots remain useful presentation.
17. Socket connection, frontend context existence, and draft existence are not team activity authorities.
18. Root/nested `TEAM_STATUS` cannot simply be deleted because task cleanup, failure observation, and settlement currently consume it; each must move to its actual domain fact.
19. Existing member `AGENT_STATUS` and exact identity can remain unchanged; removing team aggregation does not require changing member status data.
20. A clean-cut public contract should remove team `status`, `AgentTeamStatus`, team-status normalization/visuals, and root aggregate WebSocket messages rather than retain deprecated aliases.
21. `ARCH-FIND-003` is a representability defect, not a reason to retain aggregate team status: live task-team events carry a complete `TaskTeamInstanceIdentity` envelope, while a plain initial `AgentStatusPayload` has no place for task-team run/instance/logical-team and relative-leaf scope.
22. The tight correction is composition rather than payload expansion: recursively carry a discriminated `TeamLeafAgentStatusSnapshot`, prefix live and initial member/source paths through one mixed-team scope function, and flatten task-team wire identity through one stream-owned function immediately before delivery.
23. `CODE-FIND-002` proves that representability alone is insufficient: every path used to calculate the relative leaf must also share the carrier's current `teamRunId` coordinate frame after each ordinary parent boundary.
24. A full operational `TaskTeamInstanceIdentity` is broader than the outward stream scope and embeds task-team-local ingress/coordinator selectors. A specialized `TaskTeamStreamScope { taskTeamRunId, taskTeamInstanceId, taskId, logicalTeamPath, logicalTeamRouteKey }` is tighter and makes its only path explicitly parent-frame-relative.
25. Scope rebasing belongs in the mixed-team bridge, not in the wire mapper or frontend. The task-team handle creates a scope in its immediate parent frame; every ordinary parent prefixes `logicalTeamPath` alongside `sourcePath`/agent `memberPath`; the mapper only subtracts already-consistent paths and rejects invalid leaf scope.
26. `CODE-FIND-003` does not change the design: the manager lifecycle interface remains exact. The stale unit double must implement the existing snapshot/subscription methods rather than production code tolerating an incomplete manager.
27. The accepted SR-005 source and delivery screenshot prove no backend or state-model expansion is needed for the requested visual: exact run rows already receive `isActive`, and definition groups already receive all child runs with `isActive`.
28. Definition-group activity is not definition lifecycle. `runs.some(run => run.isActive)` is a bounded presentation summary over the displayed collection and remains correct when the representative run, member status, or socket state changes.
29. Reusing agent `StatusDot` by mapping `isActive ? running : offline` would silently restore agent semantics and pulse active teams as though they were generating. A separate team-binary component is the tighter contract.
30. Solid blue/gray plus accessible `Active`/`Inactive` meaning preserves scan clarity without claiming member busy/error/idle state. Exact run Stop continues to use the same `isActive`; group activity is display-only and never authorizes an action.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Team/run metadata, raw trace JSONL, transcript/activity projections; live status/interrupt state is in-memory and snapshot-derived.
- Relevant code-model, serialization, semantic, or physical-store change: Agent WebSocket status payload contracts by removing `can_interrupt`; frontend `AgentRunState.canInterrupt` is in-memory only. Team GraphQL/WebSocket/frontend shapes contract by removing computed aggregate team `status` while retaining manager-derived `isActive` and member statuses.
- Normal readers and writers, including unknown/extra-field behavior: Status payload parsers/types are repository-local and server/frontend ship together. Stored traces/transcripts do not depend on frontend `canInterrupt`; team aggregate status is computed live rather than stored required meaning.
- Representative direct-read or compatibility evidence: Live team metadata/traces contain identity/content/topology, not a persisted frontend interrupt bit or required aggregate team lifecycle. History already exposes `isActive` separately; resume config already needs only `isActive`.
- Required semantics and invariants preserved by direct use: `Yes` — all stored run/team/history/task data remains valid; agent status and team activity are recomputed from their authoritative live owners.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Preserve all traces/transcripts and exact member identity.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration benefit; rewriting stored data would be unnecessary and risky.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- Clean-cut repository contract replacement is allowed/preferred; do not add a compatibility alias for separate interrupt state.
- Status companion ordering must not regress high-frequency content presentation batching.
- Team-member status must preserve route/path/run identity for exact interrupt targeting and nested/transient projections.
- Frontend history/recovery may use neutral placeholders before subscription, but subscribed live status must remain authoritative.
- Transport disconnect does not alone prove runtime offline.
- All supported runtimes are in scope; runtime-specific internal fine-grained statuses may remain internal.
- `AgentRunBackend` may expose provider-specific control internally, but its public event side must be neutral source batches plus a runtime lifecycle snapshot; it must not own final outward processing or subscriber dispatch.
- `AgentRun.publishEvent` must be awaited by local producers so persistence/delivery success is not reported before ordered event publication has completed or failed.
- The run gateway's per-run queue must evaluate the backend lifecycle snapshot inside the queued task, not before enqueue, and must apply canonical status before listener delivery.
- Team definition, root team run, leaf agent, task execution, Stop pending, and WebSocket connection are separate subjects; no shared team lifecycle DTO may mix them.
- Public team activity must come through the `AgentTeamRunManager` boundary; frontend helpers must not re-derive it from member status or context/subscription presence.
- Root/nested aggregate team status removal is clean-cut. Existing persisted JSON remains directly usable; no compatibility status alias or dual GraphQL/WebSocket path is justified.
- Internal open-work/failure/task lifecycle mechanisms may reuse existing member/task facts but must not recreate a public five-state team aggregate.
- Standalone `AgentStatusPayload` must remain task-team-agnostic. Recursive team snapshots and live events carry only a tight `TaskTeamStreamScope`, not the complete operational identity, until the shared stream mapper produces wire fields.
- At every boundary, `TeamRunEvent.teamRunId` / snapshot `teamRunId`, `sourcePath`, agent `memberPath`, and `TaskTeamStreamScope.logicalTeamPath` must use that same team-run coordinate frame. The route keys must be rebuilt from their returned paths.
- Both live events and initial snapshots must use the same all-event stream-scope prefix rule and the same task-team relative-member calculation; an unscoped plain-payload initial snapshot or transport/frontend prefix guess is forbidden.
- Operational `TaskTeamInstanceIdentity.ingress` and coordinator selectors remain task-team-local and never enter relative root-stream calculation. The immutable task-team instance remains the activation/directory/persistence owner; the stream scope is a derived outward projection only.
- Team activity presentation must consume only existing run `isActive` booleans. Exact run rows use the exact boolean; definition groups use `runs.some(isActive)`. Do not add backend fields, restore `AgentTeamStatus`, or convert booleans into `AgentStatus`.
- The binary team indicator must remain visually and semantically distinct from agent five-state dots: solid active blue, solid inactive gray, no pulse, and accessible `Active`/`Inactive` text.

## Open Unknowns / Risks

- Complete approval is resolved: the original agent lifecycle/team simplification remains approved, and the user explicitly approved the binary group/run presentation correction on 2026-08-03.
- `SR-005` passed `ARCH-REV-005`, `CRR-004`, API/E2E, and durable-test re-review and reached `DR-004`. `SR-006` supersedes the delivery candidate only for team group/run activity presentation; all accepted backend, transport, member, task, and action boundaries remain sound.
- Pairing decision is resolved: every final non-status `AgentRunEvent` receives one canonical status companion; existing semantic event batching may remain, but sparse transition-only status is not allowed.
- Operational events without turn identity need a conservative rule: repeat current status but do not create a new turn.
- No new interrupt-capability or interrupt-lifecycle field is designed. The red Stop action remains derived from `running`; command rejection/idempotency remains backend-owned.
- `ARCH-FIND-001` and `ARCH-FIND-002` were resolved by `SR-002` and passed `ARCH-REV-002`; accepted source implements them. SR-006 has no permission to edit those paths, and review should reject any presentation design that reintroduces an alternate lifecycle owner.
- Manager lifecycle delivery must cover every root registration removal, including stale-backend cleanup, and remain observable after the terminated backend clears its own event listeners.
- `ARCH-FIND-003`, `CODE-FIND-002`, and `CODE-FIND-003` are resolved in the accepted source and must not be reopened by the presentation-only revision.
- Task-terminal cleanup already has a canonical event path, but removal of the aggregate offline fallback must be validated for failure, cancellation, reconnect, and sequential delegation.
- Delivery artifacts and manual verification evidence are stale for completion after the user correction. API/E2E must investigate whether focused frontend durable coverage is sufficient and replace/extend evidence proportionately after source review.

## Notes For Architecture Reviewer

Review `SR-006` as a user-approved post-delivery presentation correction. The invariant is deliberately narrow: exact run dot = exact `isActive`; parent agent-team/definition group dot = `runs.some(run.isActive)`. Both are solid binary visuals with accessible active/inactive meaning. The group summary is presentation-only, never representative-run status and never an action authority. No backend, GraphQL, WebSocket, lifecycle DTO, member status, Stop policy, nested task-team scope, or mobile binary-text change is authorized. Confirm the separate `TeamActivityDot` boundary, both desktop placements, no definition-owned lifecycle, and focused coverage plan before implementation.
