# Investigation Notes: Codex Provider Compaction Boundary Capture

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Requirements approved by user; design production in progress.
- Investigation Goal: Determine why Codex provider compaction is not producing `provider_compaction_boundary` raw traces or rotated raw trace segment files, and define the target behavior for a new ticket.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The likely source change is narrow, but the behavior crosses Codex runtime event conversion, memory recording, raw trace rotation, and integration coverage.
- Scope Summary: Capture current Codex app-server completed context compaction item shapes, route them through the existing provider compaction boundary recorder, and prove Codex/Claude provider compaction status uses the existing frontend-visible `COMPACTION_STATUS` path.
- Primary Questions To Resolve:
  - Which Codex event shapes are currently recognized?
  - Which current Codex app-server protocol shapes indicate context compaction?
  - Does raw trace storage already support provider boundary rotation?
  - Is the defect in storage, memory recording, or Codex event conversion?
  - Are Codex and Claude provider compaction events sent to the frontend the same way raw AutoByteus compaction events are?

## Request Context

The user observed that Software Engineering Team agents using Codex runtime did not have multiple raw trace files even though Codex likely compacts context. Earlier local inspection showed no `provider_compaction_boundary` traces for the current team. User requested a fresh ticket based on `origin/personal` because the prior raw trace layout ticket has already been finalized. On 2026-06-18 the user added that, because raw AutoByteus compaction events are sent to the frontend, Codex Runtime and Claude Agent SDK runtime compaction events should also be sent to the frontend so users can see them.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture/tickets/in-progress/codex-provider-compaction-boundary-capture`.
- Current Branch: `codex/codex-provider-compaction-boundary-capture`.
- Current Worktree / Working Directory: dedicated ticket worktree at `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-provider-compaction-boundary-capture`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` succeeded.
- Task Branch: `codex/codex-provider-compaction-boundary-capture`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): likely `personal`, following recent ticket flow.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The shared superrepo checkout had unrelated untracked article docs; they were not touched. The task uses a dedicated clean worktree. Requirements approved by user on 2026-06-18.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-18 | Command | `git fetch origin personal`; `git worktree add -b codex/codex-provider-compaction-boundary-capture ... origin/personal` | Create isolated ticket from the finalized base branch. | Worktree created at base commit `3171a5a4416e718cb4b38464206d9603733bf7a1`. | No |
| 2026-06-18 | Data | Structured scan of `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e7b2bea880d14b83904d03906fde574f/*/raw_traces.jsonl` | Check whether current Codex team runs had recorded compaction boundaries. | Zero `provider_compaction_boundary` traces; each member had only active `raw_traces.jsonl`. | Use as symptom evidence. |
| 2026-06-18 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_edbbe55c/solution_designer_20f3afe41163964e/raw_traces_manifest.json` | Check the only Software Engineering Team directory with multiple raw trace files. | Segments were `native_compaction`, `runtime_kind: AUTOBYTEUS`, not Codex. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts` | Identify recognized Codex event method names. | Existing enum includes `thread/compacted` and `rawResponseItem/completed`; no explicit current `contextCompaction` item handling. | Yes |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts` | Identify current Codex compaction conversion owner. | `thread/compacted` creates a provider boundary; item events are handled before raw response events. | Yes |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts` | Check raw-response compaction support. | Only `item.type` normalized to `compaction` creates a boundary. `context_compaction` is not included. | Yes |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Check thread item completion behavior. | `item/completed` with unknown/non-tool type falls through to normal `SEGMENT_END`; `contextCompaction` would not become a provider boundary. | Yes |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Verify persistence owner. | Appends `provider_compaction_boundary`, rotates when `rotation_eligible`, dedupes existing boundary state. | No |
| 2026-06-18 | Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Verify storage owner. | `rotateActiveRawTracesBeforeBoundary` already moves pre-marker records into direct segment files. | No |
| 2026-06-18 | Command | `codex --version` | Identify local Codex version. | `codex-cli 0.140.0`. | No |
| 2026-06-18 | Command | `codex app-server generate-ts --out <tmp>` | Generate current app-server protocol from local Codex installation. | Protocol includes deprecated `thread/compacted`, `ThreadItem` type `contextCompaction`, and `ResponseItem` types `context_compaction`, `compaction`, and `compaction_trigger`. | Use for design input. |
| 2026-06-18 | Log | `rg -i "codex|thread.compact|compaction|compact_boundary|response.*compaction|item.*compaction" ~/.autobyteus/server-data/logs` | Look for live raw Codex compaction payloads. | Available logs showed Codex process warnings and old runtime errors but no useful recent raw compaction payload. | Coverage should use generated protocol plus focused tests. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Verify raw AutoByteus compaction frontend pipeline. | `StreamEventType.COMPACTION_STATUS` maps to `AgentRunEventType.COMPACTION_STATUS`. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Verify Claude Agent SDK provider compaction pipeline. | `STATUS_COMPACTING` and `COMPACT_BOUNDARY` both emit `AgentRunEventType.COMPACTION_STATUS` with `kind: provider_compaction_boundary`; only compact boundary is `rotation_eligible: true`. | Preserve and cover frontend visibility. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Check whether provider compaction events are websocket-visible. | Every `AgentRunEventType.COMPACTION_STATUS` maps to `ServerMessageType.COMPACTION_STATUS`; no runtime-specific mapper branch is needed. | Add/keep coverage for provider payload fields. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`; `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Check team frontend stream path. | Team agent events reuse `AgentRunEventMessageMapper.map(...)` and then add member/team identity, so provider compaction status from team members is websocket-visible when emitted. | Add/keep coverage if implementation touches team path. |
| 2026-06-18 | Code | `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`; `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts`; `autobyteus-web/stores/agentActivityStore.ts` | Check frontend live visibility. | `handleCompactionStatus` projects `COMPACTION_STATUS` payloads to `AgentRunState.compactionStatus` and upserts `kind: compaction` activities; provider payload identity fields drive boundary/provider activity ids. | Existing path should be reused, not bypassed. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`; `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts`; `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Check historical/reopen visibility. | Recorded `provider_compaction_boundary` raw traces project to compaction activities, and frontend hydration loads them while excluding compaction entries from conversation replay. | Preserve with regression coverage. |
| 2026-06-18 | Command | `rg -n "COMPACTION_STATUS|provider_compaction_boundary|native_compaction|compact_boundary|status_compacting|compaction|Compaction" autobyteus-server-ts autobyteus-ts autobyteus-web autobyteus-application-* autobyteus-message-gateway -g '!node_modules' -g '!dist'` | Find compaction event propagation and frontend surfaces. | Found existing streaming mapper, frontend handler/projection, activity store, docs, and historical hydration paths for compaction status. | No |
| 2026-06-18 | Web | `https://developers.openai.com/codex/app-server` | Verify current documented Codex app-server compaction event surface. | Official docs say `thread/compact/start` returns immediately and progress streams via `turn/*` and `item/*`, including `contextCompaction` item lifecycle: `item/started` then `item/completed`. | Use `item/completed contextCompaction` as authoritative completed boundary event. |
| 2026-06-18 | Web | `https://github.com/openai/codex/issues/28495` | Check current app-server compaction lifecycle issue reports. | A June 16, 2026 issue reports app-server compaction completing server-side while terminal `turn/completed` notification may not be delivered, highlighting that clients rely on notification streams around compaction. | Keep provider boundary capture tied to explicit `contextCompaction` item completion, not only turn completion. |
| 2026-06-18 | Web | `https://developers.openai.com/codex/hooks` | Check current Codex lifecycle hook naming. | Official docs list `PreCompact` and `PostCompact` hooks, supporting that compaction has first-class lifecycle semantics, but hooks are not the app-server notification surface used by AutoByteus. | Do not use hooks for runtime event streaming in this ticket. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: runtime-specific event conversion into `AgentRunEvent` (`AutoByteusStreamEventConverter`, `CodexThreadEventConverter`, or `ClaudeSessionEventConverter`), then generic run/team streaming and frontend compaction projection.
- Current execution flow for raw AutoByteus compaction visibility:
  - AutoByteus runtime emits `StreamEventType.COMPACTION_STATUS`.
  - `AutoByteusStreamEventConverter` maps it to `AgentRunEventType.COMPACTION_STATUS`.
  - `AgentRunEventMessageMapper` maps it to websocket `ServerMessageType.COMPACTION_STATUS`.
  - Frontend `handleCompactionStatus` calls `projectCompactionStatusToActivity`, stores latest status on `AgentRunState.compactionStatus`, and upserts a `kind: compaction` activity.
- Current execution flow for Codex provider compaction:
  - `CodexThread` receives app-server messages.
  - `CodexThreadEventConverter.convert` dispatches by method name.
  - `thread/compacted` directly creates a provider compaction boundary `COMPACTION_STATUS`.
  - `rawResponseItem/completed` with legacy `item.type: "compaction"` creates a provider compaction boundary `COMPACTION_STATUS`.
  - Current `item/started contextCompaction`, `item/completed contextCompaction`, and `rawResponseItem/completed context_compaction` are not recognized, so no `COMPACTION_STATUS` is emitted and the frontend cannot see those current Codex compaction lifecycle events.
- Current execution flow for Claude provider compaction:
  - `ClaudeSessionEventConverter` maps `status_compacting` to provider boundary `COMPACTION_STATUS` with `rotation_eligible: false`.
  - It maps `compact_boundary` to provider boundary `COMPACTION_STATUS` with `rotation_eligible: true`.
  - The generic mapper and frontend handler are the same as raw AutoByteus; no Claude-specific frontend transport is required.
- Team stream behavior:
  - Team agent events pass through `convertTeamRunEventToServerMessage`, which delegates agent events to `AgentRunEventMessageMapper` and adds member/team identity.
  - Therefore Codex/Claude provider compaction is team-frontend visible when the backend emits `AgentRunEventType.COMPACTION_STATUS`.
- Historical/reopen behavior:
  - `ProviderCompactionBoundaryRecorder` records durable `provider_compaction_boundary` raw traces.
  - Run-history projection turns those traces into compaction activity entries.
  - Frontend hydration loads compaction activities and intentionally ignores compaction entries in conversation replay.
- Ownership or boundary observations:
  - Runtime event shape recognition belongs in runtime-specific converter owners.
  - Generic websocket mapping from `AgentRunEventType.COMPACTION_STATUS` belongs in `AgentRunEventMessageMapper` and should remain runtime-agnostic.
  - Frontend user-visible projection belongs in `compactionActivityProjection` / `AgentActivityStore`, not in runtime converters.
  - Provider boundary persistence and dedupe belong in `ProviderCompactionBoundaryRecorder`.
  - Raw trace segment layout belongs in the raw trace store and should not be changed here.
- Current behavior summary:
  - Older/deprecated Codex boundary surfaces and Claude provider surfaces are already routed into frontend-visible `COMPACTION_STATUS` when recognized.
  - Current Codex `contextCompaction` / `context_compaction` surfaces are not recognized, which blocks frontend visibility for start/completion and blocks storage rotation at the completed boundary.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant.
- Refactor posture evidence summary: Small local refactor likely needed inside Codex event conversion so all completed compaction item surfaces share one classifier/route into `createCodexCompactionBoundaryEvent`; frontend transport should be proven through existing `COMPACTION_STATUS` mapping rather than redesigned.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Generated Codex protocol | `ContextCompactedNotification` is deprecated and instructs use of `ContextCompaction` item type. | Current `thread/compacted` handling is not sufficient for current protocol. | Add current item handling. |
| Generated Codex protocol | `ThreadItem` includes `contextCompaction`; official docs describe `item/started` then `item/completed`. | `item/started` should create non-rotating frontend progress and `item/completed` must create the completed provider boundary. | Add converter branches. |
| Generated Codex protocol | `ResponseItem` includes `context_compaction`. | Raw response converter should include this type in completed boundary classification. | Add classifier branch. |
| Current converter source | `contextCompaction` falls through to normal `SEGMENT_END`. | Bug is in event conversion, not storage. | Update converter and tests. |
| Frontend streaming mapper | `AgentRunEventType.COMPACTION_STATUS` maps to websocket `ServerMessageType.COMPACTION_STATUS` for all runtimes. | No new frontend protocol is needed; missing Codex visibility is caused by no event being emitted for current Codex shapes. | Add mapper/team-stream coverage for provider fields if absent. |
| Frontend compaction projection | Provider payload fields are already interpreted as compaction activities. | Existing frontend ownership can absorb Codex/Claude provider visibility. | Add or preserve frontend handler coverage for Codex/Claude provider payloads. |
| Claude converter source | Claude SDK `status_compacting` and `compact_boundary` already emit provider compaction `COMPACTION_STATUS`. | Claude requirement is regression/visibility assurance, not a new converter feature. | Keep current behavior and cover live projection. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts` | Top-level Codex app-server event conversion. | Owns `thread/compacted` boundary conversion and shared `createCodexCompactionBoundaryEvent`. | Keep this as authority for Codex boundary event creation. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Converts `item/*` Codex thread item events. | `item/completed contextCompaction` currently falls through as normal segment completion. | Add or delegate a completed-context-compaction branch. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts` | Converts raw response item completed events. | Handles `compaction`, not `context_compaction`. | Expand completed boundary classifier. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Normalizes Codex item payload fields. | Normalization already collapses `context_compaction` / `contextCompaction` to `contextcompaction`. | Reuse this parser/classifier rather than ad hoc string checks. |
| `autobyteus-server-ts/src/agent-memory/services/provider-compaction-boundary-recorder.ts` | Records and dedupes provider compaction boundaries, rotates eligible raw traces. | Existing behavior is the desired persistence path. | Do not bypass. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Raw trace persistence and rotation. | Direct rotation layout already exists. | Out of scope except regression coverage. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Cross-runtime memory persistence coverage. | Existing Codex test covers `thread/compacted` + raw `compaction`, not current `contextCompaction` item. | Add/update focused coverage. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Generic run-event to websocket message mapper. | Maps all `COMPACTION_STATUS` run events to websocket `COMPACTION_STATUS`. | Frontend visibility should reuse this boundary. |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Team websocket event mapper. | Delegates member agent events to the generic run-event mapper and adds team/member identity. | Provider compaction status remains visible in team views if emitted by member runtime. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Raw AutoByteus stream conversion. | Maps raw `StreamEventType.COMPACTION_STATUS` to `AgentRunEventType.COMPACTION_STATUS`. | This is the baseline frontend-visible behavior the user referenced. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude SDK event conversion. | Already emits `COMPACTION_STATUS` for compacting and compact boundary provider events. | Preserve and prove frontend visibility. |
| `autobyteus-web/services/agentStreaming/handlers/compactionActivityProjection.ts` | Frontend live compaction projection. | Normalizes provider statuses like `compacting`/`compacted` to frontend phases and stable provider/boundary activity ids. | Existing frontend owner should remain authoritative. |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Frontend historical activity hydration. | Hydrates durable compaction activity projection rows. | Historical visibility already has an owner; preserve coverage. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-18 | Data scan | Python scan of current Software Engineering Team raw traces | No `provider_compaction_boundary`; no rotated files. | Live data supports user's suspicion. |
| 2026-06-18 | Protocol generation | `codex app-server generate-ts --out <tmp>` | Current protocol exposes `contextCompaction` / `context_compaction`. | Existing synthetic tests are stale relative to current Codex protocol. |
| 2026-06-18 | Trace | Static trace of `AgentRunEventType.COMPACTION_STATUS` from converters through websocket mapper to frontend handler | Raw AutoByteus, recognized Codex, and Claude compaction status events share the same websocket/frontend projection path. | Codex current compaction visibility depends on fixing converter classification; Claude path should be covered as regression. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: Local official Codex CLI `0.140.0` generated app-server protocol on 2026-06-18.
- Relevant contract, behavior, or constraint learned: `thread/compacted` is deprecated in generated local protocol; official app-server docs now document `contextCompaction` item lifecycle (`item/started` then `item/completed`) for thread compaction progress.
- Why it matters: The project currently catches deprecated/legacy boundary surfaces but misses the documented current item type.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing integration test harness can synthesize Codex app-server events and verify raw trace persistence.
- Required config, feature flags, env vars, or accounts: No live account required for focused converter/recorder tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `codex app-server generate-ts --out <tmp>`
  - local searches under `$HOME/.autobyteus/server-data/logs`
- Cleanup notes for temporary investigation-only setup: Generated protocol was written to a temporary directory under `/var/folders/.../T/`; it is investigation-only.

## Findings From Code / Docs / Data / Logs

- Persistence and raw trace rotation are already present and should be reused.
- The missing behavior is in Codex event conversion: current compaction item types are not classified as completed provider boundaries.
- Existing test coverage proves an older/deprecated shape, so it can pass while live Codex events remain uncaptured.
- The user-visible frontend path for provider compaction does not need a new transport: once Codex/Claude converters emit `AgentRunEventType.COMPACTION_STATUS`, the existing single-agent/team websocket mapper and frontend compaction projection will surface the event.
- Claude converter support is already present; the added requirement is to preserve/prove live frontend projection and not regress the started-to-completed identity behavior.

## Constraints / Dependencies / Compatibility Facts

- No app-data migration is needed; this fixes future capture.
- No raw trace filename/layout change is needed.
- Do not rotate on trigger-only events.
- Do not create a parallel provider-compaction websocket message; use existing `COMPACTION_STATUS`.
- Do not move frontend compaction visibility into runtime-specific frontend code; frontend projection should stay runtime-agnostic around the `COMPACTION_STATUS` payload contract.
- Do not remove support for `thread/compacted` or `compaction` response item unless implementation proves they are impossible; they remain useful duplicate surfaces and are part of existing coverage.

## Open Unknowns / Risks

- Live logs did not reveal a recent actual compaction payload, so the strongest evidence comes from generated protocol.
- If Codex emits both `item/completed contextCompaction` and `rawResponseItem/completed context_compaction` with different ids for the same compaction, dedupe policy must avoid false duplicates while still preventing duplicate archive segments for equivalent boundaries.
- If frontend users still do not see Claude compaction after backend `COMPACTION_STATUS` emission, the issue would be downstream subscription/context identity rather than runtime conversion; coverage should include at least the mapper/projection boundary to localize such failures.

## Notes For Architect Reviewer

- The recommended design should keep `CodexThreadEventConverter` as the authority for Codex provider boundary event creation and keep `ProviderCompactionBoundaryRecorder` as the authority for persistence/dedupe/rotation.
- This is not a raw trace store redesign.
- The key design choice is where to put the shared Codex context compaction classifier so `item/started`, `item/completed`, and raw response completion conversion do not drift again.
- For the user's frontend visibility point, current analysis says reuse/prove the existing `COMPACTION_STATUS` stream and frontend projection. Do not design a second frontend event path for Codex/Claude provider compaction.
