# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale:
  - The problem spans multiple capability areas, but the architectural break is still centered on one bounded read path: memory read models, run-history projection, and frontend run hydration.
  - The issue is not a full product redesign; it is a layering and ownership refactor around a specific shared data-flow spine.
  - The likely implementation surface is bounded to `autobyteus-server-ts/src/agent-memory/**`, `autobyteus-server-ts/src/run-history/**`, GraphQL projection contracts, and the frontend run-hydration consumer types.
- Investigation Goal:
  - Determine whether the memory subsystem currently owns responsibilities that belong to the run-history projection layer, define the actual historical replay data-flow spine so the refactor can separate raw memory data from server-side replay projection cleanly, and verify whether the right-side activity pane should become a sibling historical read model under `run-history`.
- Primary Questions To Resolve:
  - Which files own raw memory storage and raw memory read concerns?
  - Which files currently synthesize human-readable conversation/projection data from raw traces?
  - Which subsystem currently owns the canonical historical run projection contract?
  - Where does the frontend perform final UI hydration, and is that layering itself a problem?
  - How is the right-side activity pane populated during live execution, and what historical source exists to reopen it?
  - Can the same run-history boundary own both the middle historical replay and the right-side historical activity feed without deriving one from the other?
  - Which current consumers still need raw-trace fidelity because the projection contract is lossy?
  - Is historical file-change replay reconstructed from raw memory, from a dedicated read model, or from generic artifact rows?
  - Can the current file-change replay path reproduce the same right-side artifact UI for reopened runs, especially when the same file path is touched multiple times?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-11 | Command | `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}`, `git fetch origin personal`, `git worktree add -b codex/memory-projection-layer-refactor ... origin/personal` | Bootstrap the ticket into an isolated worktree from the latest tracked base branch. | The shared `personal` worktree had unrelated dirty changes; the ticket now lives in a dedicated worktree rooted at `origin/personal`. | No |
| 2026-04-11 | Command | `rg -n "projection|memory view|working context|transcript|memory" ...`, `rg --files ... | rg "memory|projection|transcript|context|conversation|history"` | Locate the memory, run-history, and projection surfaces quickly. | The key paths are concentrated in `autobyteus-server-ts/src/agent-memory/**`, `autobyteus-server-ts/src/run-history/**`, and `autobyteus-web/services/runHydration/**`. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/agent-memory/domain/models.ts` | Inspect the current shared domain shapes. | `AgentMemoryView` mixes raw memory tabs with a derived `conversation` field, and `MemoryConversationEntry` is defined inside `agent-memory`. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | Inspect who builds the derived conversation view. | `AgentMemoryService.getRunMemoryView(...)` merges raw traces, converts them to `rawTraces`, and also calls `buildConversationView(...)` to produce `conversation` in the same service. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/agent-memory/transformers/raw-trace-to-conversation.ts` | Inspect the raw-trace-to-conversation transformation boundary. | The transformer is a pure derived-view builder that collapses tool calls/results, but it drops raw-trace identity such as `turn_id`. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts`, `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts`, `autobyteus-server-ts/src/agent-memory/services/team-member-memory-projection-reader.ts` | Verify who owns the canonical run-history projection contract. | `RunProjection.conversation` is typed as `MemoryConversationEntry[]`; the local AutoByteus provider reuses `AgentMemoryService` conversation output; `TeamMemberMemoryProjectionReader` lives under `agent-memory` but returns `RunProjection`. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`, `claude-run-view-projection-provider.ts` | Compare runtime-backed providers against the local memory-backed path. | Codex and Claude providers also emit `MemoryConversationEntry`, so the memory DTO has become the cross-runtime canonical projection type rather than a memory-only type. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/api/graphql/types/memory-view.ts`, `autobyteus-server-ts/src/api/graphql/types/run-history.ts`, `team-run-history.ts` | Inspect public API boundaries for memory view vs run-history projection. | Memory GraphQL has typed memory-oriented objects; run-history projection GraphQL exposes `conversation` as `[GraphQLJSON]`, but the underlying server contract is still the same memory DTO. | No |
| 2026-04-11 | Code | `autobyteus-web/graphql/queries/agentMemoryViewQueries.ts`, `teamMemoryQueries.ts` | Check whether the memory inspector actually consumes the derived conversation field. | Both memory-view queries explicitly force `includeConversation: false`, which means the current memory inspector does not use the mixed `conversation` field at all. | No |
| 2026-04-11 | Code | `autobyteus-web/services/runHydration/runContextHydrationService.ts`, `runProjectionConversation.ts`, `teamRunContextHydrationService.ts` | Inspect the frontend rehydration boundary. | The frontend converts server run projection entries into UI `Conversation` messages and segments. This is a normal presentation-layer hydration step, not the main architectural defect. | No |
| 2026-04-11 | Code | `autobyteus-web/stores/agentActivityStore.ts`, `autobyteus-web/components/progress/ActivityFeed.vue`, `ActivityItem.vue` | Inspect the right-side activity pane boundary. | The activity pane reads only from `agentActivityStore`, and that store expects invocation IDs, lifecycle status, arguments, logs, results, and errors. No historical reopen path hydrates this store today. | No |
| 2026-04-11 | Code | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`, `segmentHandler.ts`, `protocol/segmentTypes.ts` | Verify how the live event monitor and activity pane are populated. | Live streaming produces richer segment types and activity lifecycle transitions (`awaiting-approval`, `approved`, `denied`, `executing`, `success`, `error`) plus log entries. | No |
| 2026-04-11 | Command | `rg -n "TOOL_APPROVAL_REQUESTED|TOOL_APPROVED|TOOL_DENIED|TOOL_EXECUTION_STARTED|TOOL_EXECUTION_SUCCEEDED|TOOL_EXECUTION_FAILED|TOOL_LOG" ...`, `rg --files ... | rg "event.*store|run.*event|agent-run-event"` | Check whether historical reopen has a persisted lifecycle-event source. | Tool lifecycle events exist in the live server/runtime path, but no dedicated persisted run-event store for historical reopen was identified. Local replay appears to rely on coarse raw traces instead. | No |
| 2026-04-11 | Doc | `autobyteus-ts/docs/agent_memory_design.md` | Verify the intended memory doctrine. | The memory design declares raw trace, episodic, and semantic as core memory types, with derived views explicitly non-stored and layered above the raw records. | No |
| 2026-04-11 | Doc | `autobyteus-server-ts/tickets/memory_view_api_ticket/MEMORY_VIEW_API_DESIGN.md`, `autobyteus-web/tickets/memory_view_ui_ticket/MEMORY_VIEW_UI_DESIGN.md`, `autobyteus-web/docs/memory.md` | Check original intent of the memory-view feature and current frontend product behavior. | The memory-view design intentionally separated the memory inspector from conversation history UI; current UI docs show only working context, episodic, semantic, and raw traces as active surfaces. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | Check whether any current consumers depend on raw traces because the projection is lossy. | Turn-scoped reply recovery reads `rawTraces` directly because the generic run projection strips `turnId`; this proves the projection is not a lossless substitute for raw memory data. | No |
| 2026-04-11 | Code | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`, `run-file-change-types.ts`, `run-file-change-projection-store.ts`, `run-history/services/run-file-change-projection-service.ts`, `api/rest/run-file-changes.ts`, `api/graphql/types/run-file-changes.ts` | Inspect the backend owner for historical touched-file reconstruction. | Historical `write_file` / `edit_file` replay already uses a dedicated run-scoped projection persisted under the run memory dir. The backend captures final committed content on tool success or artifact persistence, then reopens from that projection rather than reconstructing from conversation replay. | No |
| 2026-04-11 | Code | `autobyteus-web/stores/runFileChangesStore.ts`, `services/agentStreaming/handlers/fileChangeHandler.ts`, `stores/agentArtifactsStore.ts`, `components/workspace/agent/ArtifactsTab.vue`, `ArtifactContentViewer.vue`, `docs/agent_artifacts.md` | Inspect the frontend artifact and touched-file read path. | The frontend keeps `write_file` / `edit_file` rows in a dedicated `runFileChangesStore`, keeps generated outputs in `agentArtifactsStore`, then merges both into one artifact UI surface. The viewer component branches behavior across both models. | No |
| 2026-04-11 | Code | `autobyteus-web/stores/__tests__/runFileChangesStore.spec.ts`, `autobyteus-server-ts/tests/unit/run-history/services/run-file-change-projection-service.test.ts` | Confirm historical replay fidelity and same-path behavior. | The file-change model is keyed by `runId + path`, so repeated same-path touches overwrite the historical row instead of preserving a full per-invocation timeline. | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-server-ts/src/api/graphql/types/memory-view.ts:getRunMemoryView`
  - `autobyteus-server-ts/src/api/graphql/types/memory-view.ts:getTeamMemberRunMemoryView`
  - `autobyteus-server-ts/src/api/graphql/types/run-history.ts:getRunProjection`
  - `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts:getTeamMemberRunProjection`
  - `autobyteus-web/services/runHydration/runContextHydrationService.ts:loadRunContextHydrationPayload`
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:loadTeamRunContextHydrationPayload`
- Execution boundaries:
  - Raw memory read boundary today: `MemoryFileStore` plus `AgentMemoryService`.
  - Derived conversation view boundary today: also `AgentMemoryService`, through `buildConversationView(...)`.
  - Historical run-projection boundary today: nominally `run-history`, but the contract is still owned by `agent-memory` types.
  - Right-side live activity boundary today: `agentActivityStore`, fed by streaming lifecycle handlers only.
  - Right-side historical activity boundary today: none; reopen hydration does not populate the activity store.
  - UI hydration boundary today: `autobyteus-web/services/runHydration/**`.
- Owning subsystems / capability areas:
  - `agent-memory`
  - `run-history`
  - `api/graphql`
  - `autobyteus-web/services/runHydration`
- Folder / file placement observations:
  - Raw file IO and raw memory models are correctly placed under `agent-memory`.
  - Runtime-aware historical projection providers are correctly placed under `run-history/projection/providers`.
  - `agent-memory/services/team-member-memory-projection-reader.ts` is misplaced because it returns `RunProjection` instead of a memory-layer artifact.
  - `run-history/projection/run-projection-types.ts` importing `MemoryConversationEntry` from `agent-memory` is a boundary leak rather than a placement issue.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` | `MemoryTraceEvent`, `MemoryConversationEntry`, `AgentMemoryView` | Memory-layer types | The file defines both raw memory records and the shared derived conversation DTO used by run-history. | `MemoryConversationEntry` is misplaced here as the canonical replay projection type. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | `getRunMemoryView(...)` | Compose memory read results from disk | The service produces raw traces and a derived conversation view in one API. | The derived replay projection should move upward to `run-history`; memory service should expose raw inputs or memory-only views. |
| `autobyteus-server-ts/src/agent-memory/transformers/raw-trace-to-conversation.ts` | `buildConversationView(...)` | Derived trace view builder | The transformer is purely a projection concern layered on raw traces. | It should not remain the owner of the canonical run-history replay contract under `agent-memory`. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts` | `RunProjection` | Run-history projection contract | `conversation` is typed as `MemoryConversationEntry[]`. | `run-history` should own its own projection DTO. |
| `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts` | local memory-backed projection provider | Build historical replay from local memory | The provider reuses `AgentMemoryService.getRunMemoryView(...includeConversation: true)` and wraps it. | This makes local run-history projection subordinate to the memory-view contract instead of owning the projection itself. |
| `autobyteus-server-ts/src/agent-memory/services/team-member-memory-projection-reader.ts` | `getProjection(...)` | Team-member local memory reader | Lives in `agent-memory`, but returns `RunProjection` and computes run-history summary/activity metadata. | File should move to `run-history` or be replaced by a run-history-owned reader. |
| `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` | `transformThreadPayload(...)` | Codex runtime payload adaptation | Emits `MemoryConversationEntry` as the final run-history DTO. | Runtime providers should converge on a run-history-owned projection type instead. |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | Memory GraphQL contract | Exposes memory inspector data | The schema still includes `conversation`, but the current product path does not request it. | Memory GraphQL can be narrowed later if desired; it should not drive run-history shape. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | `RunProjectionPayload` | Historical run projection GraphQL contract | Exposes `conversation` as generic JSON. | GraphQL type is weak, but the deeper architectural issue is that its server contract is still memory-owned. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | `buildConversationFromProjection(...)` | Convert server projection into UI messages/segments | This is a presentation-layer hydration step, not a storage/projection owner. | The frontend boundary is acceptable; it should consume a cleaner server projection contract. |
| `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | `resolveReplyText(...)` | Turn-accurate reply recovery | Reads raw traces directly because projection loses `turnId`. | Raw-trace access must remain available and clearly layered below replay projection. |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | `RunFileChangeService` | Live file-change projection owner | Converts run events into one file-change row per `runId + path`, captures final committed text, emits `FILE_CHANGE_UPDATED`, and persists run-scoped file-change history. | Backend file replay is already a separate read-model layer and should not be folded into `agent-memory` or conversation replay. |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | `RunFileChangeProjectionService` | Historical file-change read boundary | Reads live file changes from the in-memory owner for active runs and from persisted projection storage for inactive runs. | Historical touched-file replay belongs beside run history, not inside memory raw data. |
| `autobyteus-web/stores/runFileChangesStore.ts` | `useRunFileChangesStore()` | Frontend touched-file store | Stores hydrated and live `write_file` / `edit_file` rows keyed by run and path. | Dedicated client store is appropriate, but it mirrors the backend latest-path-state limitation. |
| `autobyteus-web/stores/agentArtifactsStore.ts` | `useAgentArtifactsStore()` | Frontend generated-output store | Stores non-file-change artifacts such as images/audio/video/pdf. | Generated outputs are already separated from touched-file replay. |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Artifacts tab composition | Presentation-layer merged list | Merges `runFileChangesStore` with `agentArtifactsStore` into one sorted UI list. | The merge belongs in presentation, but it is where the two read models become visually conflated. |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Artifact viewer | Mixed viewer for file changes and generated outputs | Switches behavior based on `sourceTool` and store-specific fields to render buffered drafts, REST-backed text, or generated asset URLs. | This is the main current concern-mixing point in the artifact area. |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-11 | Probe | Static read of `AgentMemoryService.getRunMemoryView(...)` and `buildConversationView(...)` | One service composes both raw memory tabs and replay conversation entries from the same raw inputs. | The memory service is carrying both storage-read and read-model projection concerns. |
| 2026-04-11 | Probe | Static read of `RunProjection` and provider implementations | The local provider delegates to `agent-memory` for conversation entries, while Codex/Claude providers construct the same memory DTO independently. | The shared replay contract is currently attached to the wrong owner. |
| 2026-04-11 | Probe | Static read of memory GraphQL queries in the web app | The memory inspector never requests `conversation`. | The mixed `conversation` field is not justified by the active memory UI path. |
| 2026-04-11 | Probe | Static read of `agentActivityStore`, `ActivityFeed.vue`, and `runContextHydrationService.ts` | The right-side activity pane is populated only by the live streaming path and is not hydrated on reopen. | Historical activities need their own run-history-owned read model and hydration path. |
| 2026-04-11 | Probe | Static read of `toolLifecycleHandler.ts`, `segmentTypes.ts`, and `runProjectionConversation.ts` | Live streaming carries richer tool lifecycle/log detail than historical projection hydration, which currently creates only coarse generic `tool_call` segments. | Exact live-parity historical activities are not available from the current projection contract. |
| 2026-04-11 | Probe | Static search for persisted run-event history sources | No dedicated historical run-event store was identified for AutoByteus reopen. | Local historical activity replay must be designed around actual persisted sources and explicit fidelity limits. |
| 2026-04-11 | Probe | Static read of `ChannelTurnReplyRecoveryService` | Turn-accurate consumers bypass projection and read raw traces directly. | The architecture already acknowledges that raw traces and replay projection are different layers. |
| 2026-04-11 | Probe | Static read of `RunFileChangeService` and `docs/agent_artifacts.md` | File replay is not rebuilt from memory conversation data. The backend persists a separate `run-file-changes/projection.json` under the run memory dir. | The touched-file problem is not the same layering bug as memory conversation replay; the backend already has a separate server-owned read model. |
| 2026-04-11 | Probe | Static read of `RunFileChangeService.upsertEntry(...)` and `runFileChangesStore` tests | The projection key is `runId + path`, not `runId + invocation` or `runId + revision`. | Reopened history can show the latest state for each touched path, but it cannot fully reconstruct repeated same-path artifact history. |
| 2026-04-11 | Probe | Static read of `ArtifactContentViewer.vue` and `ArtifactsTab.vue` | One viewer component handles both touched-file rows and generated-output artifacts by switching on `sourceTool` and store-specific fields. | The main artifact-area concern mix is in presentation composition, not in backend projection ownership. |

### External Code / Dependency Findings

- Upstream repo / package / sample examined:
  - `None`
- Version / tag / commit / release:
  - `N/A`
- Files, endpoints, or examples examined:
  - `N/A`
- Relevant behavior, contract, or constraint learned:
  - `N/A`
- Confidence and freshness:
  - `High` for local codebase findings on `2026-04-11`

### Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - None for the design investigation pass
- Required config, feature flags, or env vars:
  - None
- Required fixtures, seed data, or accounts:
  - None
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add -b codex/memory-projection-layer-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - Dedicated ticket worktree should remain until Stage 10 finalization/cleanup

## Constraints

- Technical constraints:
  - Raw traces remain the file-backed source of truth for memory events.
  - Runtime-specific history providers for Codex and Claude must remain runtime-aware.
  - Replay projection is intentionally lossy relative to raw traces, so the system must preserve a raw-trace read path for consumers that require trace/turn identity.
  - No dedicated persisted lifecycle-event history for reopened AutoByteus runs was identified during investigation, so historical activity replay cannot assume exact live-parity detail unless a new persisted source is introduced later.
- Environment constraints:
  - The shared `personal` worktree contains unrelated dirty changes; implementation should remain isolated in the dedicated ticket worktree.
- Third-party / API constraints:
  - None identified for the design investigation itself.

## Unknowns / Open Questions

- Unknown:
  - Whether the same ticket should also strengthen `RunProjectionPayload` GraphQL typing instead of leaving `conversation` as generic JSON during the first refactor step.
- Why it matters:
  - A stronger API contract would reinforce boundary ownership, but it may enlarge the scope beyond the core layering fix.
- Planned follow-up:
  - Resolve in design as an explicit option: include typed GraphQL projection in scope only if it materially improves the clean cut without delaying the ownership split.

## Implications

### Requirements Implications

- Requirements should explicitly separate raw memory, server projection, and frontend hydration as different layers.
- Requirements should forbid `agent-memory` from owning the canonical run-history replay DTO or returning `RunProjection` artifacts.
- Requirements should preserve raw-trace fidelity for consumers that need turn-accurate data.
- Requirements should treat historical activities as a sibling run-history projection to historical conversation rather than deriving the right-side pane from conversation UI state.
- Requirements should make historical activity fidelity explicit and source-dependent.

### Design Implications

- The clean target layering is:
  - `disk-backed raw memory data`
  - `run-history projection built from raw memory or runtime-native history`
  - `frontend run-hydration into UI message/segment models and activity models`
- The touched-file/artifact area already has its own adjacent layering:
  - `run events / artifact events`
  - `run-scoped file-change projection`
  - `frontend file-change hydration`
  - `presentation-layer artifact composition`
- `run-history` should own the canonical projection entry type and all providers should converge on it.
- `run-history` should own both historical conversation replay and historical activity replay as sibling read models produced from the same historical source boundary.
- `agent-memory` should own raw read models and memory-inspector-oriented models only.
- The frontend hydration layer can remain, but it should consume a clearly server-owned run-history projection contract rather than a repurposed memory DTO.
- The right-side activity pane should hydrate from a run-history-owned activity projection instead of trying to infer history from the middle conversation UI.
- Historical activity replay must acknowledge fidelity limits explicitly: local raw-trace-backed reopen can be simplified, while runtime-backed providers may expose richer lifecycle/log detail when the source supports it.
- Historical touched-file replay should stay separate from conversation replay. The system should not try to rebuild the right-side artifact pane from `MemoryConversationEntry` or UI conversation segments.
- The current file-change backend is mostly aligned with that principle already; the remaining design issue is that the artifact presentation layer mixes two distinct read models and the file-change model only preserves latest state per path.

### Implementation / Placement Implications

- Likely implementation files:
  - `autobyteus-server-ts/src/agent-memory/domain/models.ts`
  - `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`
  - `autobyteus-server-ts/src/agent-memory/transformers/raw-trace-to-conversation.ts`
  - `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts`
  - `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts`
  - `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`
  - `autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts`
  - `autobyteus-server-ts/src/agent-memory/services/team-member-memory-projection-reader.ts` or its replacement path under `run-history`
  - `autobyteus-server-ts/src/api/graphql/types/run-history.ts`
  - `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
  - `autobyteus-web/services/runHydration/runProjectionConversation.ts`
  - `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` or equivalent historical activity hydration boundary
  - `autobyteus-web/stores/agentActivityStore.ts`
  - `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
  - `autobyteus-web/stores/runFileChangesStore.ts`
- Candidate removals or decommissions:
  - `agent-memory` ownership of the canonical `MemoryConversationEntry` as the shared replay DTO
  - `agent-memory/services/team-member-memory-projection-reader.ts` as a run-history producer under the wrong subsystem
  - local run-history provider dependence on `AgentMemoryService` conversation output as the authoritative projection contract
  - presentation-layer reliance on a loose `sourceTool` union over two backend models inside one viewer component, if a clearer display adapter is introduced

## Re-Entry Additions

### 2026-04-11 Re-Entry: Historical File Changes And Artifact Viewer

- The user expanded the design ask to include touched-file reconstruction and the right-side artifact content viewer.
- The backend file-change path is already an explicit run-scoped projection:
  - `RunFileChangeService` listens to run events, recognizes only `write_file` and `edit_file`, captures final committed content, and persists `run-file-changes/projection.json`.
  - `RunFileChangeProjectionService` reopens active runs from the live in-memory owner and inactive runs from the persisted projection.
  - `getRunFileChanges` GraphQL and `/runs/:runId/file-change-content` REST expose that projection to the web client.
- Raw memory/tool-call traces are not the authoritative historical file-content source today:
  - `write_file` can buffer streamed text deltas live.
  - `edit_file` does not carry authoritative final file contents in the replay path, so the backend snapshots committed workspace content when the tool succeeds.
  - This means raw tool calls are enough to know that a file was touched and, sometimes, enough to show a draft, but not enough to guarantee final historical file contents on reopen.
- The main current limitation is replay fidelity, not reconstruction existence:
  - the file-change model is keyed by `runId + path`
  - repeated edits or writes to the same path overwrite the historical row
  - reopened history therefore shows the latest known state per path, not an exact same-path revision timeline
- The main current artifact-area concern mix is in presentation:
  - `runFileChangesStore` owns touched-file rows
  - `agentArtifactsStore` owns generated outputs
  - `ArtifactsTab` merges both into one list
  - `ArtifactContentViewer` branches across both models using `sourceTool`
- Design consequence:
  - keep backend file-change projection separate from memory and conversation replay
  - treat exact per-invocation artifact replay as a distinct decision from the memory/run-history layering cleanup

### 2026-04-11 Scope Decision

- The user later narrowed the active ticket back to the projection boundary only.
- The touched-file and artifact findings remain valid investigation context, but they are explicitly deferred from the implementation/design scope for this ticket.

### 2026-04-11 Re-Entry: Historical Activities

- The user then expanded the active projection scope to include the right-side historical activity pane.
- Live behavior today:
  - `agentStreaming` lifecycle handlers create and update `ToolActivity` rows in `agentActivityStore`.
  - The store expects invocation IDs, lifecycle status, arguments, logs, results, and errors.
  - `ActivityFeed.vue` reads only from that live store.
- Historical reopen behavior today:
  - `runContextHydrationService` loads conversation and file changes only.
  - `buildConversationFromProjection(...)` synthesizes generic `tool_call` segments with synthetic invocation IDs, empty logs, and inferred coarse statuses.
  - No historical activity data is hydrated into `agentActivityStore`.
- Design consequence:
  - the right-side historical pane should not be derived from the middle conversation UI
  - both panes should be sibling read models owned by `run-history`
  - local AutoByteus historical activities are likely to be simplified at first because the persisted source appears to be raw traces rather than a dedicated lifecycle-event store

### 2026-04-11 Re-Entry: Codex Live-Monitor Parity

- The direct live Codex `thread/read` probe added during Stage 7 strengthened the runtime evidence in two important ways:
  - it confirmed that a real Codex history payload can return separate `userMessage`, `agentMessage`, and `commandExecution` items under `thread.turns[].items[]`
  - it also showed that separate `reasoning` items are not guaranteed, because the captured live run returned none even with `reasoning_effort: "high"`
- Static inspection of the current implementation against that evidence shows a remaining contract gap:
  - `historical-replay-event-types.ts` still models only `message` and `tool`
  - `CodexRunViewProjectionProvider` can parse a `reasoning` item if one appears, but currently folds it into assistant-message text through `combineAssistantContent(...)`
  - frontend historical conversation hydration still rebuilds only assistant text/media/tool-call shapes and does not hydrate a replay-native `think` segment
- Implication:
  - the current implementation is correct for the weaker requirement "materialize a truthful historical replay bundle from the available source"
  - it is not yet correct for the stronger requirement "reopened Codex history should preserve the same live-monitor structure whenever the source persisted that structure"
- Re-entry classification rationale:
  - this is not a local implementation bug in the existing requirement set
  - this is a `Requirement Gap` because the ticket requirements and acceptance criteria did not yet require preservation of source-native reasoning/think structure for runtime-backed historical replay
- Design consequence:
  - the replay contract needs to distinguish "preserve source-native reasoning when present" from "do not fabricate reasoning when absent"
  - direct Codex runtime evidence must remain part of the acceptance story for any later claim of live-monitor parity
