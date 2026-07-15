# Agent Idle Status Lifecycle Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Complete. Requirements were approved on 2026-07-15. Architecture round 4 resolved AR-001/AR-002 and identified AR-003: the frontend's uncorrelated activity-based error repair bypasses exact-turn backend recovery. The design now removes that legacy inference, preserves presentation/contracts, and is ready for architecture review round 5.
- Investigation Goal: Identify why completed Codex-backed team members remain visibly `Running`, define authoritative busy/idle/offline semantics, and locate the narrowest correct change boundary without regressing other runtimes.
- Scope Classification: `Medium`.
- Scope Classification Rationale: The visible symptom is simple, but the shared lifecycle processor feeds individual runs, mixed-team member snapshots, live WebSocket events, reconnect snapshots, and three runtime adapters.
- Scope Summary: Correct canonical run/member status after turn completion, with the reported Codex run as the required regression and shared boundary fallback preserved for AutoByteus/Claude.
- Resolved Questions: Codex has a reliable turn-complete boundary; backend status is stale before it reaches the frontend; ordinary late tool activity reopens `running`; frontend faithfully renders the stale backend state; no persisted-data migration is needed.

## Request Context

The user reports a Software Engineering Team where `solution_designer` and `architecture_reviewer` have stopped visibly producing tools/text but remain blue/`Running`. They expect green/idle after the member completes its work while remaining available for later messages. They also ask for a general definition of idle versus busy for LLM/tool turns. The screenshots were captured while using the Codex runtime with a GPT-5.6-class model.

The historical run matched from the screenshot content records the exact model identifier as `gpt-5.6-luna`, runtime `codex_app_server`, and reasoning effort `xhigh`.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle`.
- Current Branch: `codex/agent-idle-status-lifecycle`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`.
- Bootstrap Base Branch: `origin/personal` at `fbd7b6764bd43751956d69ffe22b943d06188444`.
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-07-15 before worktree creation.
- Expected Base Branch: `personal`.
- Expected Finalization Target: `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared superrepo checkout contains unrelated untracked files. All authoritative task artifacts and later source changes must remain in this dedicated worktree.

## Supplemental Task Artifact Inventory

| Canonical Path | Purpose | Scope | Status | Core Artifact Relationship | Related IDs | Approval Applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/production-trace-evidence.md` | Retain exact production trace timestamps, turn IDs, member IDs, model/runtime metadata, and causal source chain. | Evidence only; does not independently define intended behavior. | Complete | Supports `requirements.md`, these notes, and `design-spec.md`. Must travel with downstream package while relevant. | R-002–R-008, R-011; AC-001–AC-012 | `N/A` |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-15 | Setup | `git fetch origin personal`; `git worktree add -b codex/agent-idle-status-lifecycle ... origin/personal` | Establish latest tracked base and isolated task workspace | Worktree created from `origin/personal@fbd7b6764bd43751956d69ffe22b943d06188444` | No |
| 2026-07-15 | Screenshot | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ae10dd5a1f7146a8b335d509093086dd/solution_designer_9db813dc714342fc8246d7a7a06817a3/context_files/ctx_8804129c318f__image.png` | Inspect architecture reviewer state | Header and team row are blue/`Running` after visible `Pass` and handoff | No |
| 2026-07-15 | Screenshot | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ae10dd5a1f7146a8b335d509093086dd/solution_designer_9db813dc714342fc8246d7a7a06817a3/context_files/ctx_dd990a69a013__image.png` | Inspect solution designer state | Header and team row are blue/`Running` after a complete direct response | No |
| 2026-07-15 | Screenshot | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ae10dd5a1f7146a8b335d509093086dd/solution_designer_9db813dc714342fc8246d7a7a06817a3/context_files/ctx_bd77889ca42c__image.png` | Compare member states | Same tree can show blue/running, green/idle, and gray/offline per member/run | No |
| 2026-07-15 | Stored metadata | `/Users/normy/.autobyteus/server-data/memory/team_run_history_index.json`; `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_835fd076ad954653b8ce99d7367f98ef/team_run_metadata.json`; `jq` member-tree queries | Match screenshot to its historical team and runtime configuration | Exact team, member IDs, `codex_app_server`, `gpt-5.6-luna`, xhigh found | No |
| 2026-07-15 | Production trace | `.../solution_designer_b6ccc40d7bf745b1acf4763200b4d5b8/raw_traces_active.jsonl`; Python timestamp/turn correlation | Determine whether output really ended and whether later activity belonged to the same turn | Final assistant at `16:17:26.576Z`; old same-turn tool result at `16:27:19.175Z`; three newer turns accepted/completed in between | No |
| 2026-07-15 | Production trace | `.../architecture_reviewer_e82cc6a54ac340a1a6701289189309fc/raw_traces_active.jsonl`; Python timestamp/turn correlation | Verify the second affected member | Final assistant at `16:23:27.620Z`; two old same-turn tool results at `16:27:52.066Z`/`.074Z` | No |
| 2026-07-15 | Production trace | `.../implementation_engineer_bafc9717e21741ee87546c96b185b6a4/raw_traces_active.jsonl` | Compare a green/idle member in the screenshot | Handoff and final assistant had no later old-turn result; consistent control | No |
| 2026-07-15 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`; `codex-thread.ts`; `codex-turn-event-converter.ts`; `codex-agent-run-backend.ts` | Trace authoritative Codex lifecycle | Turn start sets running/active ID; turn complete sets idle/clears ID; converter publishes explicit status; backend uses shared pipeline | No |
| 2026-07-15 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-processor.ts` | Find stale-state producer | Generic segment/tool/etc. event types derive `running` regardless of open/completed turn state | No |
| 2026-07-15 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`; `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Trace propagation into team snapshot | Derived status becomes `AgentRun.statusOverride`; mixed handle returns it with member route/path identity | No |
| 2026-07-15 | Code | `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts`; `AgentStreamingService.ts`; `TeamMemberRow.vue`; `useStatusVisuals.ts`; `TeamWorkspaceView.vue` | Determine whether frontend creates or merely shows stale running | Frontend applies backend status directly and does not cause the reported idle-to-running defect; however, a separate activity repair changes `error -> running` without turn identity. Colors/labels remain faithful | Revisited for AR-003 ownership alignment |
| 2026-07-15 | Code | AutoByteus and Claude converters: `autobyteus-stream-event-converter.ts`, `claude-session-event-converter.ts`, `claude-session.ts` | Check shared-runtime constraints | All supported adapters expose turn boundaries; AutoByteus may need boundary-derived status when explicit status is absent; Claude emits boundary plus explicit status | No |
| 2026-07-15 | Prior design | `tickets/done/agent-status-event-analysis/*`; `tickets/done/agent-initializing-status-ux/*`; `tickets/done/mixed-team-nested-agent-team/round36-backend-status-source-of-truth-design-rework-note.md` | Recover established lifecycle ownership/invariants | Canonical states include initializing; backend is authoritative; activity repair was meant to be bounded, originally for stale error/recovery | No |
| 2026-07-15 | Git history | `git show 902274e5a...`; `git show cfa865f91...`; current processor test | Identify regression origin and intended preservation | `902274e5a` removed the prior error-only guard so all activity could derive running; tests now explicitly encode segment-only running | No |
| 2026-07-15 | Deterministic probe | Temporary Vitest case against current worktree source: explicit `TURN_COMPLETED + AGENT_STATUS idle`, then late `TOOL_EXECUTION_SUCCEEDED` with same `turn_id`; temporary test and dependency symlinks deleted afterward | Confirm source-level reproduction independently of historical inference | Probe passed only when expecting `[TOOL_EXECUTION_SUCCEEDED, AGENT_STATUS running]`, proving current idle-to-running resurrection | Replace expectation with no derived status in implementation regression coverage |
| 2026-07-15 | Persistence/read path | `agent-run-status-projection-service.ts`; team metadata/status snapshot services; actual team metadata | Decide migration outcome | Active status is live/in-memory; inactive metadata projects offline; team metadata has identities/config but no stale status field | No migration |
| 2026-07-15 | Architecture review | `tickets/in-progress/agent-idle-status-lifecycle/design-review-report.md`, round 1 AR-001/AR-002 | Recheck target-design completeness | Explicit status effects/mixed-batch reconciliation and command association before result-ID capture required exact contracts | Revised design; return cumulative package for round 2 |
| 2026-07-15 | Code recheck | `agent-run-command-coordinator.ts`; `agent-run-command-types.ts`; `agent-run-command-registry.ts`; Codex/Claude/AutoByteus `postUserMessage` and turn-start paths | Validate AR-002 material premise and choose the target handoff gate | Coordinator subscribes before await, begin-time record remains immutable/null, callbacks can precede result turn ID, Codex/Claude return IDs, AutoByteus accepted result may omit ID | Explicit pending/identified/anonymous association and lifecycle-only replay designed |
| 2026-07-15 | Code recheck | Codex/Claude boundary converters; AutoByteus stream converter; lifecycle processor/pipeline | Validate AR-001 source ordering and explicit-status shapes | Codex/Claude emit boundary then status in one batch; status-only events also exist; pipeline processors append derived events after source | Round-1 append-correction proposal was superseded after round 2 by pre-listener replacement transformation |
| 2026-07-15 | Architecture review | `tickets/in-progress/agent-idle-status-lifecycle/design-review-report.md`, round 2 AR-001/AR-002 and MP-002 | Recheck round-1 resolution and current supported failure path | Internal state/arming were sound; rejected status was still outward before correction, and Claude/Codex failure could lose B and leave a command in flight | Replace append-only output owner and complete error scope/identity for round 3 |
| 2026-07-15 | Code recheck | `agent-run-event-pipeline.ts`; `agent-run-event-transformer.ts`; `dispatch-processed-agent-run-events.ts`; `agent-run.ts` | Choose an output boundary that can prevent transient status | Transformers replace the event array before append-only processors; dispatch and `AgentRun` observe final events sequentially | Replace lifecycle processor with first transformer; filter before listeners |
| 2026-07-15 | Code recheck | Claude `claude-session.ts`/converter; Codex notification handler/thread/lifecycle converters; AutoByteus server converter | Trace supported error identity loss and native mutation order | Claude catch has local B but clears active and emits unscoped error; Codex error/status paths can clear before conversion or emit status-only error; AutoByteus converter clears boolean active for every error | Capture/classify at native origin, guard delayed A, emit ERROR first/status second |
| 2026-07-15 | Code recheck | `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts`; `agent/events/notifiers.ts`; turn runner, LLM/tool phases, response pipeline error publishers | Locate AutoByteus error-origin contract | `ErrorEventData` and notifier currently carry source/message/details only; turn-aware callers can provide active turn ID | Initial scope/ID-only proposal was superseded by round-3 effect-aware publisher inventory |
| 2026-07-15 | Architecture review | `tickets/in-progress/agent-idle-status-lifecycle/design-review-report.md`, round 3 AR-002 and MP-002/MP-003 | Recheck scoped-error semantics against supported AutoByteus outcomes | AR-001 passed; turn scope alone incorrectly granted failure authority to recoverable diagnostics. MP-002 is reachable; `AgentWorker.runTurn` outer catch MP-003 is not a supported-path premise | Add explicit effect and publisher outcome inventory for round 4 |
| 2026-07-15 | Code control-flow inventory | `agent-turn-runner.ts`; all ten `notifyAgentErrorOutputGeneration` calls in `llm-phase.ts`, `tool-phase.ts`, and `llm-response-pipeline.ts`; status deriver/update utilities | Classify every AutoByteus error publisher by whether B continues, completes, or fails | Tool errors return ToolResult and continue; prepare/stream handled errors return final then complete; immediate compaction and response-processor errors are caught/continue; precheck throws to outer catch; only non-interruption AgentTurnRunner catch returns failed/no completion | Structured diagnostic/turn-terminal/global notifier contract; no scope-only default |
| 2026-07-15 | Code recheck | `autobyteus-stream-event-converter.ts`; `status-deriver.ts`; `status-update-utils.ts` | Confirm lifecycle consequences and event ordering | Current converter clears boolean active and returns ERROR hint for every error event; diagnostic publishers do not apply AgentErrorEvent, while genuine runner failure applies AgentErrorEvent after notifier and returns failed | Diagnostic converter must use null hint/no mutation; terminal event is authority and precedes status error |
| 2026-07-15 | Architecture review | `tickets/in-progress/agent-idle-status-lifecycle/design-review-report.md`, round 4 AR-003 and MP-004 | Recheck end-to-end ownership after AR-002 resolution | Backend correlation/effect contract passed. Frontend `applyLiveRuntimeActivityProjectionRepair` can still undo a canonical terminal/global/mismatched error live while reconnect restores backend error | Remove activity lifecycle inference; return cumulative package for round 5 |
| 2026-07-15 | Code recheck | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`; `services/runStatus/agentRuntimeStatusState.ts`; their colocated specs; `handlers/agentStatusHandler.ts` | Inventory exact frontend removal and preserved canonical path | Dispatcher owns a live-activity type set/predicate and calls the repair before handlers. The helper changes only error to running. `handleAgentStatus` already centralizes canonical live status via `applyLiveAgentStatusEvent`; focused tests explicitly expect the old repair | Delete set/predicate/helper/import/call and replace tests with activity-neutral/canonical-status recovery coverage |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Accepted command and runtime `turn/started` | Command coordinator/`AgentRun` publishes initializing; runtime adapter updates active state and emits start/status | Backend is canonical status author; turn start is active boundary | Codex/Claude/AutoByteus source; prior status designs |
| BEH-002 | System | Runtime `turn/completed` or interruption | Runtime state becomes idle; converter emits terminal boundary and usually explicit idle; shared pipeline processes it | Still-live completed runtime should be idle | Codex/Claude/AutoByteus source |
| BEH-003 | System/User-visible | Late old-turn tool/segment event after terminal boundary | Converter emits activity; shared `LifecycleStatusEventProcessor` derives running; `AgentRun.statusOverride` and mixed handle propagate it | Current defect: completed turn is reopened by non-boundary activity; delayed content remains useful | Production traces; deterministic probe; processor source |
| BEH-004 | User/System | New command after idle; recoverable in-turn diagnostic; matching completion or genuine failure | Coordinator callbacks may precede result ID. Claude/Codex can lose error identity. AutoByteus's one notifier serves both continued diagnostic paths and the runner's failed outcome. | Pending versus anonymous, error correlation, and terminal effect are distinct; diagnostics must not fail B, matching terminal B must, and old A must not | Coordinator/registry/runtime source; architecture MP-001 and round-3 MP-002; MP-003 not reachable |
| BEH-005 | System | Runtime termination/disposal/unavailability | `AgentRun.terminate()` emits offline; inactive metadata projections return offline | Offline remains distinct from reusable idle | `agent-run.ts`; projection service |
| BEH-006 | UI | Backend `AGENT_STATUS`, team member snapshot, focus/tree rendering; ordinary streamed activity | Stream status handler applies canonical status and visuals read it, but dispatch also changes live `error -> running` for selected activity messages without a backend status | UI colors/labels are consistent and non-causal for the reported idle bug; activity repair is nevertheless a competing lifecycle owner and can create live/reconnect error divergence | Frontend status owner/dispatcher/components; architecture MP-004 |

## Current Execution Spine

### Primary live-event/status spine

`Codex app-server notification -> CodexThread lifecycle mutation -> CodexThreadEventConverter -> default AgentRunEventPipeline -> LifecycleStatusEventProcessor -> CodexAgentRunBackend listeners -> AgentRun.observeBackendEvent/statusOverride -> MixedAgentMemberHandle -> TeamRun agent event/snapshot -> WebSocket -> frontend central status owner -> header/tree status visuals`

### Correct terminal return spine

`turn/completed(turn-A) -> CodexThread.markTurnCompleted -> currentStatus=IDLE + activeTurnId=null -> TURN_COMPLETED + explicit AGENT_STATUS idle -> processor records idle -> AgentRun override idle -> team/frontend idle`

### Defective late-event spine

`late TOOL_EXECUTION_SUCCEEDED(turn-A) -> no explicit status in batch -> shared processor classifies tool success as active -> derives AGENT_STATUS running -> AgentRun override running -> team snapshot/live event -> blue Running with no later terminal boundary`

### Reconnect/snapshot spine

`team WebSocket connect -> TeamRuntimeStatusSnapshotService -> TeamRun.getMemberStatusSnapshots -> MixedAgentMemberHandle.getStatusSnapshot -> AgentRun.getStatusSnapshot -> stale statusOverride running`

### Competing frontend error-recovery spine

`canonical backend AGENT_STATUS error -> frontend currentStatus=error -> delayed segment/tool/todo/inter-agent/system-task/turn-start activity without canonical running -> AgentStreamingService live-activity predicate -> applyLiveRuntimeActivityProjectionRepair -> live frontend running while backend snapshot remains error -> reconnect restores error`

## Design Health Assessment Evidence

- Change posture: `Bug Fix` with bounded shared lifecycle-state refactor.
- Primary root cause classification: `Missing Invariant` — non-boundary activity cannot establish/reopen a turn.
- Secondary classification: `Boundary/Ownership Issue` / `Duplicated Policy` — runtime adapters already own turn state, while a generic activity projector independently decides busy/idle.
- Refactor posture: `Refactor Needed Now` in `LifecycleStatusEventProcessor`; leaving broad activity inference and adding a Codex-only exception would preserve the broken ownership model.
- Frontend presentation is not the origin of the reported idle-to-running defect and needs no color/label/component redesign. A bounded frontend source refactor is nevertheless required now: delete the activity-triggered error repair so the frontend is a faithful canonical-status consumer in error recovery as well as idle/running projection.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Codex lifecycle source | Runtime already knows active turn and terminal completion | Shared processor must respect, not reinterpret, the boundary | Design active-turn-aware fallback |
| Production traces | Same-turn activity can arrive minutes after final response and after newer turns | Text/tool quietness and raw event recency are unsafe lifecycle authorities | No timeout/text heuristic |
| Git history `902274e5a` | Valid AutoByteus fallback was implemented by broadening every activity event | Fix shared rule, not Codex adapter only | Preserve boundary fallback |
| `AgentRun.statusOverride` | Last backend-derived status dominates backend snapshot | A wrong derived status affects live and reconnect paths uniformly | Correct upstream producer |
| Frontend source | UI visuals map canonical status, but `AgentStreamingService` also invokes an uncorrelated activity `error -> running` repair | Preserve presentation while removing the competing lifecycle source; a UI-only heuristic or browser turn state would bypass backend truth | Remove helper/set/predicate and update focused tests |
| Explicit status/boundary converter source | Status-only callbacks and boundary-plus-status batches are both supported | Shared state machine needs all five status effects, ordered companion handling, and correction rules | Complete AR-001 table in design |
| Command coordinator/registry source | Observer is live before result ID capture and closes over an immutable begin-time record | Command needs a pending association gate, latest-record reads, and replay after result/start correlation | Complete AR-002 contract in design |
| AutoByteus notifier call-site control flow | One API publishes recoverable tool/LLM/compaction/processor diagnostics and the runner's failed outcome | Correlation scope cannot imply terminality; publisher outcome owns effect | Add structured effect and exhaustive inventory |
| Frontend stream dispatcher/status state | Selected activity types call a status mutator before their content handlers; the helper has no turn identity | Delayed A can undo a backend-rejected recovery live; exact B must recover only through canonical backend status | Complete AR-003 removal contract and convergence regressions |

## Relevant Files / Components

### Governing owners

- `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-processor.ts` — shared fallback lifecycle/status derivation; current defect owner.
- `autobyteus-server-ts/src/agent-execution/events/agent-run-event-pipeline.ts` and `agent-run-event-transformer.ts` — existing whole-batch replacement seam required to prevent rejected status dispatch.
- `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` — authoritative public run snapshot override from backend events; downstream propagation owner.
- Runtime-specific lifecycle owners:
  - `.../backends/codex/thread/codex-thread.ts`
  - `.../backends/claude/session/claude-session.ts`
  - `.../backends/autobyteus/events/autobyteus-stream-event-converter.ts`

### Main-line adapters/projections

- `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-turn-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
- `autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-types.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-registry.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts`
- Proposed `autobyteus-server-ts/src/agent-execution/domain/agent-run-error-evidence.ts`
- Proposed `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/lifecycle-status-event-transformer.ts`
- `autobyteus-ts/src/agent/streaming/events/stream-event-payload-lifecycle.ts`
- `autobyteus-ts/src/agent/events/notifiers.ts`
- `autobyteus-ts/src/agent/loop/agent-turn-runner.ts`, `llm-phase.ts`, `tool-phase.ts`, and `agent/pipelines/llm-response-pipeline.ts`
- `autobyteus-ts/src/agent/status/status-deriver.ts` and `status-update-utils.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
- `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`

### Frontend consumers/visuals

- `autobyteus-web/services/runStatus/agentRuntimeStatusState.ts` — canonical status/snapshot utilities plus the legacy activity repair to remove.
- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` — status/content dispatch plus the live-activity set/predicate/pre-hook to remove.
- `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts` — preserved canonical `AGENT_STATUS` path through `applyLiveAgentStatusEvent`.
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/components/workspace/running/TeamMemberRow.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-web/composables/useStatusVisuals.ts`

### Existing focused tests

- `autobyteus-server-ts/tests/unit/agent-execution/events/lifecycle-status-event-processor.test.ts`
- Runtime converter/status tests under `tests/unit/agent-execution/backends/{codex,claude,autobyteus}`.
- Agent/team status WebSocket and snapshot tests under server integration/unit suites.
- `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` — replace the activity-clears-error expectation and add explicit canonical-status recovery.
- `autobyteus-web/services/runStatus/__tests__/agentRuntimeStatusState.spec.ts` — remove helper-only activity repair expectations; preserve canonical reducer coverage.
- Broader frontend status owner, team streaming, running row, and workspace tests remain presentation regressions.

## Runtime / Probe Findings

### Production trace result

Detailed timestamps and identities are retained in [`production-trace-evidence.md`](./production-trace-evidence.md). Both affected runs had delayed same-turn `run_bash` completions after the final visible assistant segment. The solution designer accepted and completed newer turns before the old result returned.

### Deterministic current-source probe

Probe input:

1. `TURN_COMPLETED { turnId: "turn-A" }`
2. explicit `AGENT_STATUS { status: "idle" }`
3. later batch `TOOL_EXECUTION_SUCCEEDED { turn_id: "turn-A" }`

Observed output for step 3:

1. original `TOOL_EXECUTION_SUCCEEDED`
2. derived `AGENT_STATUS { status: "running", can_interrupt: false, agent_id: "reported-run" }`

Vitest result: `1 file / 1 test passed`, where the assertion intentionally captured current broken behavior. Temporary probe test and dependency symlinks were deleted; no product/test source remained modified.

### Why final assistant text is not the authority

- A turn can legitimately run tools after emitting some text.
- The reported provider delivered straggling tool results long after the final assistant segment.
- Runtime `TURN_COMPLETED` and active-turn state are available and semantically stronger.
- Therefore no-visible-output, last-segment type, or quiet-period timeout can reliably define idle.

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: Local source, stored runtime metadata, and production traces are authoritative for this product-specific lifecycle.
- Why it matters: No external runtime assumption is needed to establish the defect or intended ownership.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for the deterministic processor probe.
- Required config, feature flags, env vars, or accounts: None. Historical trace analysis used local AutoByteus memory data.
- External repos, samples, or artifacts cloned/downloaded: None.
- Deterministic probe setup: Temporarily symlinked the task worktree package/root `node_modules` to the already-installed shared superrepo dependencies, wrote one temporary Vitest file, executed it against the task worktree source, and deleted the temporary file/symlinks through cleanup.
- Cleanup verification: `git status --short` shows only the task ticket artifact folder untracked; no probe or dependency symlink remains.

## Findings From Code / Docs / Data / Logs

1. **Exact stale-state producer identified.** `LifecycleStatusEventProcessor` classifies `TOOL_EXECUTION_SUCCEEDED` and many other ordinary activity types as active lifecycle evidence even when its last state is idle.
2. **The processor has insufficient state.** It remembers only last public lifecycle status by run ID, not whether a particular turn is currently open or already terminal.
3. **Explicit status does not prevent a later overwrite.** A completion batch records explicit idle, but an unrelated later activity batch has no explicit status and derives running.
4. **Codex lifecycle is already authoritative.** The provider adapter has an active turn ID and explicit completion status; a Codex-only timeout or frontend inference is unnecessary.
5. **The bug is shared, not team-only.** Any individual or team-backed `AgentRun` using the default pipeline can receive the derived status. Mixed teams make it conspicuous through member dots/snapshots.
6. **Frontend is not the origin.** It applies the derived backend status and consistently renders it. Reconnect also receives the stale backend snapshot.
7. **Prior valid behavior must remain.** AutoByteus live validation previously showed missing explicit running status during an active turn. The shared fallback must still derive lifecycle at `TURN_STARTED`/terminal boundaries.
8. **No migration is indicated.** Stored run/team metadata is identity/config/history; live status is process state.
9. **Append-after-correction is not canonical.** Pipeline dispatch and `AgentRun` observe final events one by one, so preserving rejected idle/error/initializing and appending running later creates a real transient snapshot. The existing transformer seam can remove rejected status before every consumer while preserving non-status content.
10. **Supported failures currently lose correlation.** Claude and Codex can emit turn-agnostic error/status after native state mutation. Claude still has local B at the catch site; Codex native notification/thread state can capture provider/current B before clear; AutoByteus turn publishers can carry active ID through the SDK. Error identity must therefore be attached at origin rather than inferred from the current command on arrival.
11. **Turn correlation is not failure authority.** All AutoByteus notifier calls can carry B, but tool, handled LLM, immediate-compaction, and response-processor errors continue within B and later complete. Scope-only `TURN_SCOPED(B)` would falsely set lifecycle error and fail the command.
12. **One supported AutoByteus publisher owns genuine turn failure.** The `AgentTurnRunner` non-interruption catch publishes error, applies `AgentErrorEvent`, returns `failed`, and emits no `TURN_COMPLETED`; it must publish turn-terminal evidence. Its inner precheck diagnostic may remain content-only before that sole terminal event. The defensive `AgentWorker.runTurn` outer catch is not a supported-path design premise.
13. **Frontend activity repair is a competing lifecycle owner.** `AgentStreamingService` applies `error -> running` before selected activity handlers with no turn ID. The backend target intentionally emits recovery only for exact current B and rejects retired/mismatched A or post-terminal/global activity. Keeping the helper would make live state running while reconnect remains error.
14. **Canonical frontend recovery already exists.** `handleAgentStatus` delegates to `applyLiveAgentStatusEvent`, so a backend-derived `AGENT_STATUS running` performs legitimate exact-B recovery without any frontend turn state or compatibility fallback.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject/location: Team metadata under `.autobyteus/server-data/memory/agent_teams/<teamRunId>/team_run_metadata.json`, run/team history indexes, raw traces, and live in-process status overrides.
- Representative shape/volume: The matched team metadata contains six member nodes with runtime/model/route identity and no persisted lifecycle status field. Raw trace files retain content events independently.
- Relevant code-model, serialization, semantic, or physical-store change: No persisted metadata schema change is required. Live AutoByteus/canonical error event payloads gain additive scope/effect/ID fields; existing incomplete raw traces remain readable diagnostic content and require no rewrite.
- Normal readers/writers: Active projection services query runtime snapshots; inactive/historical metadata projects offline. Team stream connection requests current member snapshots from live handles.
- Required semantics/invariants preserved by direct use: Member identity, history, raw traces, transcript activity, termination metadata, and runtime restoration remain unchanged.
- Outcome: `Directly Usable — No Migration`.
- Operational constraint: Process restart naturally clears in-memory processor/override state; rollout needs no maintenance window.

## Constraints / Dependencies / Compatibility Facts

- Canonical API statuses are `offline | initializing | idle | running | error`.
- Backend/runtime remains sole canonical status authority.
- Final assistant content is not equivalent to turn completion.
- Delayed activity content must remain visible even when it cannot change terminal lifecycle state.
- AutoByteus needs boundary-derived fallback when explicit status is absent; Claude and Codex normally emit explicit status with boundaries.
- Existing raw payloads use both `turnId` and `turn_id`; correlation must handle current canonical event conventions.
- Canonical error payload may add `error_scope`, `error_effect: "diagnostic" | "terminal"`, and conditional `turn_id`; the five-value public status payload remains turn-agnostic.
- Missing/invalid scope, effect, or ID is not terminal/global. It remains diagnostic-only and cannot settle the current command.
- Ordinary frontend activity must never change lifecycle. Legitimate exact-B recovery is a canonical backend `AGENT_STATUS running`; frontend presentation, colors, payloads, and activity rendering remain unchanged.
- Do not introduce public compatibility states, activity timeouts, component inference, or a Codex-only exception around a shared processor defect.

## Open Unknowns / Risks

- Some ordinary provider events omit turn identity. The revised design conservatively preserves their content while forbidding lifecycle opening/recovery; this may expose an adapter that fails to preserve an available ID and must be covered per runtime.
- Retired identified IDs remain for one runtime-context lifetime. WeakMap ownership makes contexts collectible, but implementation must retain only normalized IDs and test restored-context isolation.
- Runtime callbacks overlap asynchronously. The revised design serializes pipeline plus dispatch per run and separately gates command settlement until association is armed; queue failure continuation and pending-evidence cleanup remain implementation-sensitive.
- Existing `error -> running` recovery remains only for activity exactly matching the current identified turn. Anonymous recovery requires explicit running; this conservative restriction requires all-runtime regression coverage.
- Error classification must occur at the publisher before native identity is cleared and must follow actual continuation/outcome. The call-site audit must prove diagnostics do not mutate B, genuine terminal B does, and delayed terminal A cannot.
- AutoByteus's notifier API must have no default effect. A positional/optional flag would let a newly added caller silently regain terminal authority; use a discriminated structured classification and exhaustive compile-time updates.
- The replacement transformer must be registered before token enrichment/all processors and the old processor must be removed atomically; running both would restore duplicate/unsafe output.
- Truly anonymous commands cannot distinguish two anonymous terminal generations after arming. Accepted no-ID result plus positive active evidence and pre-arm rejection bound this unavoidable ambiguity without changing the public protocol.
- Removing the frontend repair may expose any supported backend path that fails to emit canonical exact-B recovery. That must be fixed at the backend owner rather than masked by browser inference; focused live/reconnect convergence tests are required.
- Activity handlers could later regain direct status writes. Source-symbol/status-write audit plus service-level coverage across the current activity categories must guard the projection boundary.

## Notes For Architecture Reviewer

Requirements are approved and round-3 AR-002 design-impact rework is complete. Architecture review round 4 should recheck:

- AR-001 remains resolved: replacement transformation filters rejected status before all listeners while preserving non-status content.
- AR-002: errors resolve to `TURN_DIAGNOSTIC(id)`, `TURN_TERMINAL(id)`, `RUNTIME_GLOBAL`, or null. Scope and effect are independently validated; diagnostics remain content-only, only matching turn-terminal/global evidence mutates lifecycle or settles.
- AutoByteus publisher inventory covers every current notifier caller: recoverable tool, handled LLM, compaction, and response-processor paths are diagnostic; only `AgentTurnRunner` failed outcome is turn-terminal. MP-003 is explicitly excluded as unsupported.
- Claude/Codex mappings preserve diagnostic/terminal/global effect, capture before clear, and guard delayed A. Pending replay buffers only turn-terminal evidence, ignores diagnostics, and prevents post-global resurrection.
- Boundary fallback, exact late-tool delivery, state cleanup, all five explicit statuses, and no-migration/UI-no-change conclusions remain intact.
