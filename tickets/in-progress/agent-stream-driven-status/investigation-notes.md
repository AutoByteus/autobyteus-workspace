# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements remain approved; architecture review `ARCH-REV-001` returned `Design Impact`; `ARCH-FIND-001` and `ARCH-FIND-002` are resolved in completed solution revision `SR-002`, pending architecture re-review
- Investigation Goal: Trace the authoritative agent-turn lifecycle, streaming/status event transport, frontend projection, and interrupt gating; identify the production contradiction; define a simpler safe status contract.
- Scope Classification: `Medium`
- Scope Classification Rationale: The defect crosses server runtime-neutral lifecycle processing, provider event conversion, single/team WebSocket status projection, frontend status/hydration, and composer action state. The change does not require a provider-loop or visual redesign.
- Scope Summary: Stream-companion busy/idle/error/offline lifecycle, removal of separately divergent public interrupt state, and unified send/interrupt interaction guarding for supported standalone and team-agent execution.
- Primary Questions Resolved:
  - The backend already knows current active-turn identity and can produce `running/can_interrupt=true` snapshots.
  - `currentStatus` and `canInterrupt` independently govern the header and composer and can diverge.
  - Shared derived status and command-start reconciliation can emit `running` while retaining `can_interrupt=false`; runtime-specific projections may repair it later, making ordering significant.
  - A current-turn stream can self-heal busy state; a late retired-turn stream cannot safely establish busy.
  - `TURN_COMPLETED`/`TURN_INTERRUPTED` are the correct immediate idle boundaries; terminal failure and runtime termination remain distinct error/offline boundaries.
  - Enter currently bypasses the disabled primary button guard.
  - Supported local `AgentRun.emitLocalEvent` origins bypass the shared processor/finalizer queue and reach run listeners directly.
  - `AgentRun.getStatusSnapshot()` currently prefers a retained local `initializing` override over fresh backend current-turn evidence; the command coordinator can also broadcast a replacement without applying it to `AgentRun`.
- Approval Resolution:
  - The user approved removing the separate public/frontend `can_interrupt`/`canInterrupt` authority so `running` itself governs the stop action.
  - The user reaffirmed that current-turn streaming/delta activity should establish busy/running and accepted the current-turn qualification needed to reject late retired-turn activity.

## Request Context

The user reports that the interrupt button is not active while an agent is visibly working and proposes simplifying status management: because all runtimes stream output, current streaming should establish busy and status should be emitted on the same frontend stream; the open question is how idle should be detected. The recommended refined answer is immediate current-turn terminal detection, not a quiet-period timer.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status`
- Current Branch: `codex/agent-stream-driven-status`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-01; task branch/worktree created at `4b29481d5b6eaea64aebb20abcb5e4d784ea1178`, matching refreshed `origin/personal`.
- Task Branch: `codex/agent-stream-driven-status`
- Expected Base Branch: `personal` / `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Use only this dedicated ticket worktree. The shared checkout had unrelated untracked `codex/` content and was not used as the authoritative task workspace. The installed desktop/server live probe used version `1.4.37`, matching the repository package version/tag line.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/production-trace-evidence.md` | Evidence-only production trace and live WebSocket snapshot | Matched screenshot team/turn, overlapping second input, correct later backend snapshot, source-level divergent-state/race evidence, and late-event safety constraint | Requirements, investigation, design | REQ-001–REQ-012 / AC-001–AC-015 | Complete | N/A | Extend only if implementation-time runtime evidence adds a material fact. |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_6557dd2b51c3__image.png` | User-supplied UI evidence | Selected header is `Running` while composer shows send rather than interrupt | Requirements, investigation | REQ-001, REQ-008 / AC-001, AC-009 | Accepted evidence | N/A | None. |

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

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User sends work to a standalone agent or focused team member and later clicks the primary composer action to stop current execution. | Composer -> `activeContextStore.canInterrupt` -> standalone `agentRunStore.interruptGeneration` or exact team `agentTeamRunStore.interruptFocusedMemberGeneration` -> WebSocket `INTERRUPT_GENERATION` -> server run/member interrupt boundary. | Routing is explicit and target-safe, but the UI only exposes it when separate `canInterrupt` is true; `Running` alone is insufficient today. | Source paths above; screenshot. |
| BEH-002 | System / Contract | A provider runtime, accepted direct agent message, artifact publication, skill-improvement notification, or task-delegation notification produces an outward `AgentRunEvent`. | Provider events use converter -> shared pipeline -> backend listeners -> `AgentRun`; supported local origins instead call `AgentRun.emitLocalEvent` -> local listeners directly. Processor-derived events are appended inside the pipeline. | Activity and status share transport, but local events bypass processors/lifecycle finalization and only sparse/explicit status mutates frontend lifecycle; separate status producers can contradict or fail to accompany activity. | Code trace, `emitLocalEvent` inventory, architecture review MP-001, and live probe. |
| BEH-003 | System | Runtime emits current-turn completion/interruption/error/termination. | Runtime boundary -> converter -> runtime-neutral lifecycle transformer/status event -> stream -> frontend status handler and message completion handlers. | Turn completion should mean idle, runtime termination offline, terminal failure error; current logic is distributed and status can be overwritten by later/racing status sources. | Current lifecycle code; prior `agent-idle-status-lifecycle` evidence. |
| BEH-004 | System | Delayed provider/tool output arrives after original turn terminal boundary or while a newer turn is active. | Same event pipeline and transcript/activity projection, with `AgentTurnLifecycleState.retiredTurnIds` protecting lifecycle. | Late content must remain visible but must not establish current busy state. | Prior production-trace evidence and current state machine. |
| BEH-005 | User | User presses Enter in composer while the action button is disabled/running. | `keydown` -> unconditional `handlePrimaryAction` -> send/interrupt branch based only on `canInterrupt`, bypassing `isActionDisabled`. | Enter may send when button click cannot; matched trace contains a second user input while original turn continued. | Component source and matched trace. |

## Design Health Assessment Evidence

- Change posture: `Bug Fix` plus bounded `Refactor`
- Candidate root cause classification: `Missing Invariant`; `Boundary Or Ownership Issue`; `Duplicated Policy Or Coordination`; local keyboard guard defect.
- Refactor posture evidence summary: The system already has the right runtime facts and stream transport, but public lifecycle/action truth is split among status, interrupt bit, command overlays, lifecycle fallback, provider projectors, hydration, and UI-local sending. Correctness requires collapsing, not adding another fallback.

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

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts` | Runtime-neutral active/retired turn state | Correct place for current/retired turn identity; currently does not own interrupt projection. | Likely governing lifecycle state behind a strengthened projection boundary. |
| `.../lifecycle-status-event-transformer.ts` | Filters/derives lifecycle statuses | Derives `running/idle/error` but hard-codes `canInterrupt:false` and emits only on transition difference. | Candidate authoritative stream-companion status owner/refactor. |
| `.../services/agent-run-command-coordinator.ts` | Command idempotency/association/ack/status overlays | Mixes command registry settlement with status replacement. | Keep command association/start facts; remove competing public status construction where possible. |
| Runtime status projectors/converters | Normalize runtime-specific internal facts | Each independently builds public status/interrupt payloads. | Preserve runtime facts; centralize public projection semantics. |
| `agent-run-event-message-mapper.ts` / stream broadcasters | Map/broadcast events to WebSocket | Existing shared outbound boundary. | Reuse for repeated status companions. |
| Team member event bridges/snapshot service | Preserve member identity on team stream | Exact member route/run identities already available. | Companion status must remain member-scoped. |
| `autobyteus-web/types/agent/AgentRunState.ts` | Frontend run projection | Separate status and interrupt fields. | Remove `canInterrupt` as lifecycle authority. |
| `.../runStatus/agentRuntimeStatusState.ts` | Live/snapshot/hydration writes | Multiple APIs independently clear interrupt state. | Simplify to canonical status application/preservation. |
| `.../AgentUserInputTextArea.vue` | Composer UI/actions | Icon from interrupt flag; disabled logic separate; Enter bypass. | Derive action from status plus one central guard. |
| `activeContextStore.ts` and interrupt stores | Resolve selected context and route commands | Existing exact routing is healthy. | Reuse; no refactor of routing unless required by status-only action API. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Public run boundary plus a backend-wrapping subscription and direct local fanout | Backend events and local events enter different listener paths; the retained override shadows fresh backend state. | `AgentRun` must own one serialized publication gateway, one per-run lifecycle state, and the canonical refresh/read path. |
| `.../backends/agent-run-backend.ts` and three runtime backends | Runtime control, snapshot projection, provider subscription, and currently pipeline dispatch | Backends call `dispatchProcessedAgentRunEvents` themselves, so `AgentRun` cannot govern all origins. | Contract runtime adapters to expose neutral source-event batches and internal lifecycle snapshots; only `AgentRun` invokes processing/finalization. |
| `global-agent-run-message-router.ts` | Grant-authorized direct run delivery | Accepted delivery calls `targetRun.emitLocalEvent(INTER_AGENT_MESSAGE)` directly. | Await the owning run's publication gateway after command acceptance. |
| `published-artifact-publication-service.ts` | Persists artifact projection and notifies active run/application execution | Active-run notification bypasses the finalizer. | Await `run.publishEvent(ARTIFACT_PERSISTED)`; preserve non-AgentRun fallback unchanged. |
| `skill-improvement-target-notification-service.ts` | Notifies an active idle target about future-run skill changes | Direct `SYSTEM_TASK_NOTIFICATION` fanout bypasses the finalizer. | Await `activeRun.publishEvent`; its companion remains idle and does not open a turn. |
| `mixed-agent-member-handle.ts` | Lazy member execution and task-delegation notification | Task-delegation system notification bypasses the finalizer; command status overlay can be emitted even after a nested `AgentRun` exists. | Await the nested run gateway; restrict direct team startup overlay to the pre-`AgentRun` interval. |

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

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Team/run metadata, raw trace JSONL, transcript/activity projections; live status/interrupt state is in-memory and snapshot-derived.
- Relevant code-model, serialization, semantic, or physical-store change: Public WebSocket status payload may contract by removing `can_interrupt`; frontend `AgentRunState.canInterrupt` is in-memory only.
- Normal readers and writers, including unknown/extra-field behavior: Current status payload parser/type is repository-local; existing stored traces/transcripts do not depend on frontend `canInterrupt`.
- Representative direct-read or compatibility evidence: Live team metadata/traces contain identity/content, not a persisted frontend interrupt bit. Current history APIs expose status but not `can_interrupt`.
- Required semantics and invariants preserved by direct use: `Yes` — all stored run/team/history data remains valid; active status is recomputed.
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

## Open Unknowns / Risks

- User approval is resolved; status-only public interrupt semantics are locked design input.
- Pairing decision is resolved: every final non-status `AgentRunEvent` receives one canonical status companion; existing semantic event batching may remain, but sparse transition-only status is not allowed.
- Operational events without turn identity need a conservative rule: repeat current status but do not create a new turn.
- No new interrupt-capability or interrupt-lifecycle field is designed. The red Stop action remains derived from `running`; command rejection/idempotency remains backend-owned.
- Moving lifecycle projection after processors is intentionally in scope so processor-derived outward events receive companions; event-order regressions require focused implementation checks.
- Architecture-review round 1 findings are resolved in the revised design, but remain open until architecture re-review records a pass: `ARCH-FIND-001` (all runtime/local/derived origins through one run gateway) and `ARCH-FIND-002` (one lifecycle reconciliation/read/publication owner with explicit precedence).
- Changing the backend subscription contract is intentionally broader than decorating `emitLocalEvent`, but it is the smallest clean-cut way to ensure there is no second subscriber/finalizer path. Implementation must update direct backend/pipeline tests rather than retain a compatibility subscription.

## Notes For Architecture Reviewer

Requirements remain user-approved. `SR-002` specifically resolves `ARCH-FIND-001` and `ARCH-FIND-002`: review the complete ORIGIN-001–ORIGIN-007 inventory, the clean-cut backend source-batch contract, `AgentRun.publishEvent` as the sole serialized outward gateway, the per-run lifecycle state shared by finalization and snapshot reads, the precedence table above, removal of direct active-run broadcaster publication, and the startup/reconnect examples. The previously accepted status-only contract, finalizer ordering, turn retirement, exact team identity, and unified composer action guard remain unchanged.
