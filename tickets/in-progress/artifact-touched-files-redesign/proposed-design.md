# Proposed Design Document

## Design Version

- Current Version: `v3`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined artifact-area redesign as a live touched-files projection, preserved runtime artifact events while removing backend artifact persistence/query storage, and specified frontend ownership for early file visibility, content resolution, and failure-state handling. | 1 |
| v2 | Stage 8 round 5 design-impact re-entry | Tightened two missing owner invariants: discoverability is now first-visibility-or-explicit-retouch only, and artifact availability is now success-authorized rather than inferred from any refresh/update event. Runtime `ARTIFACT_UPDATED` is treated as metadata freshness only; generated outputs appear only after confirmed successful persisted events. | 5 |
| v3 | Post-pass architecture iteration | Tightened the touched-entry store boundary so refresh, persisted availability, and lifecycle fallback are explicit public operations instead of one generic event-shaped upsert API. | 6 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/artifact-touched-files-redesign/investigation-notes.md`
- Requirements: `tickets/in-progress/artifact-touched-files-redesign/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. In this template, `module` is not a synonym for one file and not the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Reading Rule

- This document is organized around the live touched-file projection spine first.
- Main domain subject nodes are runtime event ingress, touched-file projection state, and viewer content resolution.
- Off-spine concerns such as tab auto-switching, iconography, and workspace URL resolution are described in relation to those owners.
- Existing streaming and artifact-event subsystems are reused where they already naturally own the work.
- Files remain the main mapping target; no new subsystem is introduced unless the current ownership is inadequate.

## Summary

The artifact area should stop being treated as a persistence-backed artifact register and instead become the live projection of all files/outputs touched in the current run. The frontend store remains the canonical owner of that projection. `write_file` and `edit_file` create entries immediately when their paths are known. Generic generated outputs still arrive through backend artifact events, but those events are now split into two clear meanings: `ARTIFACT_UPDATED` refreshes row metadata/freshness only, while success-authorized `ARTIFACT_PERSISTED` creates or promotes truly available outputs.

The v3 refinement is about public boundary clarity, not product behavior. The store should no longer expose one broad caller-facing `upsertTouchedEntryFromArtifactEvent(...)` API and expect handlers to encode domain meaning through options and optional availability flags. Instead, the caller-facing boundary should mirror the actual spine subjects directly:

- segment-start touch
- artifact-update refresh
- artifact-persisted availability
- lifecycle fallback availability/failure

Any generic merge/upsert helper remains internal to the store.

The source of truth for text/code content is the current workspace file whenever the file can be resolved. The only exception is an actively streaming `write_file`, which keeps its in-memory streamed preview until the file becomes available. Failed or denied `write_file` / `edit_file` operations remain visible in the list with explicit failed state because those rows were intentionally created from segment start. Failed generated-output tools do not create touched rows unless a future design adds an explicit failed-output projection. Backend artifact metadata persistence, GraphQL querying, and related storage/domain code remain removed because current live UX does not consume them.

## Goal / Intended Change

Redefine the existing `Artifacts` panel semantics to mean "files/outputs touched in this run" while keeping the current surface label if desired. Preserve the strong live `write_file` preview experience, add immediate `edit_file` discoverability, keep generated media/document outputs visible, and remove the unused backend artifact persistence/query subsystem from this feature path.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the current backend artifact metadata persistence/query path from this scope instead of keeping it dormant.
- Treat removal as first-class design work: the current `agent-artifacts` backend subsystem, GraphQL query surface, and frontend fetch path are obsolete for the live touched-files experience and should be removed or decommissioned in this change.
- Gate rule: design is invalid if it preserves the current persistence subsystem merely as a dormant dependency of the live artifact UX.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Artifact area is the live touched-files projection for the run. | AC-001, AC-011 | Unified touched-files semantics with files/assets browsing | UC-001, UC-002, UC-003, UC-006 |
| R-002 | `write_file` creates immediate, inspectable touched-file entries. | AC-002, AC-006 | Immediate entry + streamed preview retained | UC-001 |
| R-003 | `edit_file` creates immediate, inspectable touched-file entries. | AC-003, AC-007 | Immediate entry + no diff requirement | UC-002 |
| R-004 | Generated outputs appear in the artifact area. | AC-004, AC-011 | Generated outputs stay visible and browsable | UC-003 |
| R-005 | Text/code touched-file entries show full current file content. | AC-005 | Full file content viewing | UC-004 |
| R-006 | `write_file` keeps live streamed preview UX. | AC-006 | Streamed preview before final file-backed content | UC-001 |
| R-007 | `edit_file` does not require diff rendering in the artifact area. | AC-007 | No diff requirement in viewer | UC-002, UC-004 |
| R-008 | Failed/denied touched-file operations remain visible. | AC-008 | Failure-state clarity | UC-005 |
| R-009 | Live touched-files UX does not depend on persisted artifact reads. | AC-009 | No backend metadata query dependency | UC-006 |
| R-010 | Backend persistence/query path is removed or deactivated. | AC-010 | Persistence/query subsystem removed from live UX scope | UC-006 |
| R-011 | Assets/files grouping remains usable. | AC-011 | Files and assets stay easy to browse | UC-003 |
| R-012 | Selection/discoverability no longer depends only on streaming state. | AC-012 | Non-streaming touched entries become equally discoverable | UC-001, UC-002, UC-003 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | `write_file` and `edit_file` now both enter from segment start, while generated outputs and Codex/runtime file-change signals arrive through artifact events. The remaining gap is semantic: update refresh, successful availability, and discoverability are still partially collapsed in code. | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`, `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | Whether any runtime besides Codex can emit update-only file-change events without a corresponding segment-start row. |
| Current Ownership Boundaries | Frontend store already owns live projection state, viewer already fetches current file content from workspace, and backend persistence is isolated from the live websocket path. The missing owner contract is not location but invariant clarity. | `autobyteus-web/stores/agentArtifactsStore.ts`, `ArtifactContentViewer.vue`, `autobyteus-server-ts/src/agent-artifacts/**` | Whether discoverability should ever re-fire for a same-path re-touch that comes only from a runtime event rather than a segment start. |
| Current Coupling / Fragmentation Problems | The blocking discoverability and success-gating defects are fixed, but the touched-entry store boundary is still more generic than the domain subjects it owns: refresh, persisted availability, and lifecycle fallback creation still compress through one caller-facing event-shaped upsert method. | `agentArtifactsStore.ts`, `artifactHandler.ts`, `toolLifecycleHandler.ts` | Whether lifecycle fallback should become its own explicit store operation or remain a thin wrapper over a shared internal helper. |
| Existing Constraints / Compatibility Facts | Current viewer already resolves content from workspace files and can fall back to run workspace context. Current server runtime events (`ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED`) are used by both AutoByteus and Codex runtime paths. | `ArtifactContentViewer.vue`, `codex-turn-event-converter.ts`, `codex-item-event-converter.ts`, `AgentStreamingService.ts` | Whether wire-event naming should be changed now or preserved and semantically narrowed. |
| Relevant Files / Components | Live behavior is concentrated in a small, coherent set of frontend files plus one backend tool-result processor and one isolated persistence subsystem that has already been removed. | `segmentHandler.ts`, `artifactHandler.ts`, `toolLifecycleHandler.ts`, `agentArtifactsStore.ts`, `ArtifactContentViewer.vue`, `RightSideTabs.vue`, `agent-artifact-event-processor.ts` | None that block redesign Stage 3. |

## Current State (As-Is)

Today the frontend already has the correct core owner for this feature: `agentArtifactsStore.ts` is the live per-run projection. The current branch also already moved both `write_file` and `edit_file` onto early segment-start entry creation, and the viewer is already oriented around workspace-backed file content rather than persisted DB content. That is why the branch scored well on overall direction and cleanup.

The remaining problem is not the presence of the touched-files model, but two still-blurry semantics inside that model. First, refresh-only artifact updates are still allowed to behave like first-visibility discoverability events. Second, backend output projection still treats path extraction too much like success authorization. Those are architecture contract gaps, not reasons to revert the touched-files direction itself.

On the backend, the old persistence subsystem is already isolated and removed from the live UX path. The redesign work now is about tightening the runtime/event semantics that remain after that cleanup, not reintroducing storage.

## Data-Flow Spine Inventory

List every relevant spine that matters to understanding the design.

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Websocket `SEGMENT_START` for `write_file` / `edit_file` | Touched-file row becomes visible and discoverable in the artifact panel | Frontend live touched-file projection (`segmentHandler.ts` -> `agentArtifactsStore.ts`) | This is the primary first-visibility spine for file-tool touches. |
| DS-002 | Return-Event | Runtime/backend `ARTIFACT_UPDATED` or success-authorized `ARTIFACT_PERSISTED` event | Existing row metadata is refreshed, or a missing row is created with the correct availability semantics | Frontend artifact-event reconciliation (`artifactHandler.ts`) governed by backend success-authorized event projection (`AgentArtifactEventProcessor` or native runtime converters) | This unifies Codex/native updates and generated outputs without letting refresh events claim success. |
| DS-003 | Return-Event | Terminal tool lifecycle message (`TOOL_EXECUTION_SUCCEEDED` / `TOOL_EXECUTION_FAILED` / `TOOL_DENIED`) | Segment-created touched row closes as `available` or `failed` | Frontend tool-lifecycle reconciliation (`toolLifecycleHandler.ts`) | This is the authoritative closure spine for rows born from segment start. |
| DS-004 | Bounded Local | Selected touched-file row or its freshness metadata changes | `FileViewer` receives the correct file content or preview URL | Frontend content-resolution owner (`ArtifactContentViewer.vue`) | This is the local spine that determines what the user actually reads. |
| DS-005 | Bounded Local | A row becomes newly visible for the run, or an explicit new segment touch reuses the same path | Right panel and artifact selection react once | Frontend discoverability owner (`agentArtifactsStore.ts`, `ArtifactsTab.vue`, `RightSideTabs.vue`) | This preserves discoverability parity without refresh-driven focus stealing. |

Rule:
- If a loop, worker cycle, state machine, or dispatcher materially shapes behavior inside one owner, add a `Bounded Local` spine for it instead of leaving it implicit.

## Primary Execution / Data-Flow Spine(s)

- `Agent websocket message -> AgentStreamingService -> segmentHandler.handleSegmentStart -> agentArtifactsStore.upsertTouchedEntryFromSegmentStart -> ArtifactsTab / ArtifactList -> ArtifactContentViewer`
- `Backend/runtime artifact event -> AgentStreamingService -> artifactHandler.handleArtifactUpdated/handleArtifactPersisted -> agentArtifactsStore.upsertTouchedEntryFromArtifactEvent -> ArtifactsTab / ArtifactList -> ArtifactContentViewer`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `AgentStreamingService` | Frontend ingress dispatcher | Routes live runtime messages into the correct owner. |
| `segmentHandler.ts` | Early touched-file projection owner for segment-native tools | Creates rows immediately for `write_file` and `edit_file`; streams `write_file` content. |
| `artifactHandler.ts` | Backend/runtime artifact-event reconciliation owner | Calls explicit store boundaries for generated-output availability and touched-file refresh. |
| `toolLifecycleHandler.ts` | Tool lifecycle state reconciler | Converts tool success/failure/deny outcomes into touched-file status transitions through lifecycle-owned store operations. |
| `agentArtifactsStore.ts` | Canonical live touched-file projection owner | Stores one row per run+path, status, timestamps, streaming buffer, discoverability signal, and the explicit public store boundary for refresh/availability/lifecycle fallback operations. |
| `ArtifactsTab.vue` | Projection presentation owner | Selects which touched file is shown and mediates manual vs auto selection. |
| `ArtifactContentViewer.vue` | Content-resolution owner | Chooses between streamed buffer, workspace file fetch, or output URL preview. |
| `RightSideTabs.vue` | Discoverability shell owner | Switches the right panel when a newly visible touched-file entry appears. |
| `AgentArtifactEventProcessor` (renamed from persistence processor) | Backend tool-result -> live event projection owner | Emits runtime artifact events without persisting metadata to storage. |

## Spine Narratives (Mandatory)

For each important spine, describe the end-to-end motion in prose so a reader can understand the design by following the flow instead of reconstructing it from file names.

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a runtime emits `SEGMENT_START` for `write_file` or `edit_file`, the frontend immediately upserts one touched-file row keyed by run+path. `write_file` starts as `streaming`; `edit_file` starts as `pending`. If a new segment-start intentionally re-touches the same path, the same row is reused and re-announced because the run has explicitly touched that file again. | websocket message, `AgentStreamingService`, `segmentHandler`, `agentArtifactsStore`, `ArtifactsTab` | Frontend streaming/touched-file projection | path normalization, selection policy, icon state |
| DS-002 | Runtime artifact events reconcile into the same touched-file row model, but refresh and availability are no longer treated as the same domain event. `ARTIFACT_UPDATED` refreshes metadata/freshness and may create a missing row as `pending` when a runtime-native file-change path appears without a segment-start row. Success-authorized `ARTIFACT_PERSISTED` can create or promote an `available` row, especially for generated outputs and Codex/native completion events. Refresh-only artifact events never re-announce an existing row as newly visible. | runtime converter or backend processor, websocket message, `artifactHandler`, `agentArtifactsStore` | Artifact-event reconciliation governed by success-authorized event projection | runtime-specific payload normalization, missing-row fallback |
| DS-003 | Terminal lifecycle events remain the authoritative closure path for rows that were intentionally created from segment start. Successful `write_file` / `edit_file` operations become `available`; denied/failed ones become `failed`. This means file-tool failure visibility is explicit without making artifact-update refreshes responsible for success authorization. | websocket lifecycle messages, `toolLifecycleHandler`, `agentArtifactsStore` | Frontend lifecycle reconciliation | invocation-to-row matching, keeping failed rows inspectable |
| DS-004 | When a user selects a touched row, the viewer resolves content according to source and availability. Actively streaming writes use the in-memory buffer. All other text/code rows resolve current workspace file content whenever a workspace path can be resolved. Media/doc rows resolve URL or workspace-backed preview sources. | selected row, `ArtifactContentViewer`, workspace endpoint, `FileViewer` | Frontend content resolution | file-type detection, preview/edit mode, deleted-file handling |
| DS-005 | When a touched row becomes newly visible, the store emits a one-shot discoverability signal. The right panel may switch to `Artifacts`, and the tab may auto-select the row once. Refresh-only artifact events, lifecycle status flips, and `updatedAt` changes do not emit discoverability. `RightSideTabs.vue` and `ArtifactsTab.vue` are observers of this store-owned invariant, not second owners of it. | `agentArtifactsStore`, `ArtifactsTab`, `RightSideTabs` | Frontend discoverability owner | manual selection policy, one-shot announcement semantics |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `segmentHandler.ts` | Segment-native touched-entry creation, explicit same-path re-touch signaling, and write-stream buffering | Generated-output creation, viewer fetch policy, success authorization for non-segment outputs | This is the earliest reliable path for `write_file` and `edit_file`, so first visibility starts here. |
| `artifactHandler.ts` | Runtime artifact-event reconciliation into touched-entry metadata and success-authorized persisted availability | Tool lifecycle failure policy, tab/selection policy, inferring success from `ARTIFACT_UPDATED` | It reconciles runtime events into the store; it does not decide that any update event means success. |
| `toolLifecycleHandler.ts` | Success/failure/deny state reconciliation for touched entries keyed by invocation | Content fetching, generated-output creation, discoverability signaling | This is where failed-state parity for `write_file` / `edit_file` belongs. |
| `agentArtifactsStore.ts` | Canonical per-run touched-entry state, row identity, discoverability emission guard, row upsert logic | Direct network fetches, backend persistence, guessing success from timestamps | The store is the one projection owner and the one discoverability owner. |
| `ArtifactsTab.vue` | Artifact-panel selection behavior in response to store-owned discoverability signals | Projection state transitions or backend event interpretation | It owns selection UX only. |
| `ArtifactContentViewer.vue` | Final content/preview resolution for selected row | Row creation, lifecycle status transitions, discoverability logic | Viewer logic must be content-source oriented, not persistence-oriented. |
| `RightSideTabs.vue` | Right-panel discoverability switching | Row lifecycle semantics or “is this newly visible?” inference from raw data | It reacts to a store signal, not to raw artifact freshness. |
| `AgentArtifactEventProcessor` | Success-authorized tool-result -> runtime artifact event emission for output paths | Database persistence, GraphQL serving, emitting availability on denied/failed results | This remains thin and runtime-facing only, but it must enforce the success gate before emitting availability-shaped events. |
| Removed `agent-artifacts` subsystem | Nothing after this redesign | Live touched-files UX | It is obsolete in scope. |

## Return / Event Spine(s) (If Applicable)

- `ToolResultEventHandler -> AgentArtifactEventProcessor.process -> notifier.notifyAgentArtifactUpdated/notifyAgentArtifactPersisted -> agent-run-event mapper -> websocket message -> AgentStreamingService -> artifactHandler -> agentArtifactsStore`
- `Tool approval / execution lifecycle message -> AgentStreamingService -> toolLifecycleHandler.handleToolApproved/Denied/ExecutionSucceeded/ExecutionFailed -> agentArtifactsStore`

These return/event spines are necessary because generated outputs and some runtime-specific file-change updates do not originate solely from the segment parser.

## Bounded Local / Internal Spines (If Applicable)

### BLS-001 Content Resolution Spine

- Parent owner: `ArtifactContentViewer.vue`
- Start: selected row or row freshness (`updatedAt`) changes
- End: `FileViewer` receives text content or preview URL
- Arrow chain: `selected artifact -> determine file type -> decide content source -> workspace fetch or stream-buffer/url fallback -> FileViewer`
- Why explicit: the user requirement is about what content is displayed, and the current bug is caused by overly narrow gating inside this local spine.

### BLS-002 Discoverability Announcement Spine

- Parent owner: `agentArtifactsStore.ts` + `ArtifactsTab.vue` + `RightSideTabs.vue`
- Start: row becomes newly visible in the projection
- End: right panel/selection optionally reacts once
- Arrow chain: `store upsert(new row) -> latestVisibleTouchedEntryIdByRun update -> ArtifactsTab/RightSideTabs watcher -> optional tab switch / auto-selection`
- Why explicit: current discoverability only tracks streaming rows; parity requires a bounded local policy rather than ad hoc watchers.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Workspace URL resolution | `ArtifactContentViewer.vue` | Resolve selected row path to workspace content endpoint or preview URL | Yes |
| File type detection | `ArtifactContentViewer.vue`, `ArtifactList.vue`, `ArtifactItem.vue` | Choose viewer mode, preview support, and icons/grouping | Yes |
| One-shot discoverability signal | `agentArtifactsStore.ts` | Prevent constant focus-stealing while still surfacing new touched rows | Yes |
| Status icon rendering | `ArtifactItem.vue` | Map lifecycle status to visible icon/badge | Yes |
| Backend runtime event mapping | `AgentArtifactEventProcessor` and existing websocket mapping files | Translate tool results into live artifact/touched-output events | Yes |
| Documentation cleanup | Stage 9 docs sync | Remove obsolete persistence-centric explanations | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Early touched-file creation for file tools | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Extend | Segment start is already the earliest trustworthy signal for `write_file`; it should also own `edit_file`. | N/A |
| Runtime output/event reconciliation | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | Extend | Artifact events already unify AutoByteus and Codex runtime outputs. | N/A |
| Failed/denied touched-entry states | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Extend | Lifecycle messages already flow through this owner with invocation identifiers. | N/A |
| Canonical touched-entry projection state | `autobyteus-web/stores/agentArtifactsStore.ts` | Extend | The store already owns live rows per run; only semantics and signals need tightening. | N/A |
| Content display of selected row | `ArtifactContentViewer.vue` | Extend | Viewer already fetches workspace content and is the right display owner. | N/A |
| Live event emission for generated outputs | `autobyteus-server-ts/src/agent-customization/processors/tool-result` | Extend/rename | The existing processor already sits at the right boundary; only persistence work is wrong. | N/A |
| Backend persisted artifact metadata domain | `autobyteus-server-ts/src/agent-artifacts/**` | Remove | The live feature does not consume it; keeping it would preserve obsolete structure. | Existing subsystem is specifically the one being removed. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming` | Live runtime ingress, segment/event/lifecycle routing | DS-001, DS-002, DS-003 | Frontend touched-entry projection | Extend | No new runtime-ingress subsystem needed. |
| `autobyteus-web/stores` | Canonical per-run touched-entry projection and discoverability signal | DS-001, DS-002, DS-003, DS-005 | Artifacts panel + shell | Extend | Store remains the central owner. |
| `autobyteus-web/components/workspace/agent` | List/viewer presentation and selection behavior | DS-004, DS-005 | User inspection UX | Extend | Existing artifact UI components stay in place. |
| `autobyteus-web/components/layout` | Right-panel tab switching based on discoverability signal | DS-005 | Overall shell UX | Extend | Only watch source changes. |
| `autobyteus-server-ts/src/agent-customization/processors/tool-result` | Tool-result -> live artifact event projection | DS-002 | Websocket runtime stream | Extend/rename | Keep runtime event emission, remove storage side. |
| `autobyteus-server-ts/src/agent-artifacts/**` | Former artifact metadata persistence/query | None in target design | None | Remove | Removed as obsolete. |
| `autobyteus-web/graphql/queries` artifact query | Former session-restore metadata query | None in target design | None | Remove | No live caller exists. |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `AgentStreamingService -> handlers -> agentArtifactsStore`
  - `ArtifactsTab / RightSideTabs -> agentArtifactsStore getters/signals`
  - `ArtifactContentViewer -> workspace stores / run context stores`
  - `ToolResultEventHandler -> AgentArtifactEventProcessor -> notifier`
- Authoritative public entrypoints versus internal owned sub-layers:
  - `agentArtifactsStore.ts` is the only authoritative owner for touched-row identity, discoverability, and row state mutation.
  - `AgentArtifactEventProcessor` is the backend boundary for success-authorized output projection from tool results.
- Forbidden shortcuts:
  - UI components directly inferring discoverability from `updatedAt`, raw artifact arrays, or repeated websocket payloads.
  - `artifactHandler.ts` promoting `ARTIFACT_UPDATED` into success/availability by default.
  - Backend tool-result processor emitting `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` for denied/failed tool results.
  - Viewer logic branching on backend persistence availability or GraphQL fetches.
  - A second touched-entry projection state outside `agentArtifactsStore.ts`.
- Boundary bypasses that are not allowed:
  - `RightSideTabs.vue` or `ArtifactsTab.vue` must not re-derive “new visibility” from raw artifact refreshes once the store has already normalized that event.
  - Callers above `AgentArtifactEventProcessor` must not emit artifact availability directly; they go through the processor boundary or native runtime converter.
- Temporary exceptions and removal plan:
  - Wire-event names stay `ARTIFACT_UPDATED` and `ARTIFACT_PERSISTED` in this ticket, but the semantics are narrowed: `UPDATED` = freshness/metadata, `PERSISTED` = success-authorized availability.

## Architecture Direction Decision (Mandatory)

- Chosen direction: keep the current frontend artifact subsystem as the one live touched-files projection owner, tighten its state model around touched-entry lifecycle, and remove the backend artifact persistence/query subsystem while keeping runtime artifact events as live output/update signals with explicit success authorization.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: removes an unused persistence domain and clarifies two missing invariants instead of scattering more special cases.
  - `testability`: frontend behaviors become testable from live events and store state only; backend event processor becomes a small success-gated notifier surface.
  - `operability`: viewer content comes from actual workspace files/URLs, which matches what users inspect.
  - `evolution cost`: future history restore can be designed from raw traces later without keeping a misleading partial persistence layer now.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Boundary encapsulation assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep + Extend + Remove`
- Note: the main structure stays in the existing streaming/store/UI subsystems; the obsolete backend persistence subsystem is removed, and the redesign now explicitly separates `first visibility`, `refresh`, and `success-authorized availability`.

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| One row per run+path identity | `agentArtifactsStore.ts` | Matches the product concept “touched files” and removes temporary-ID confusion once DB IDs are gone | Store | Deterministic identity replaces timestamp-only pending IDs. |
| Repeated coordination owner extraction | `toolLifecycleHandler.ts` -> `agentArtifactsStore.ts` actions | Keeps success/failure/deny transitions from being reimplemented in multiple components | Lifecycle reconciliation | Invocation-based row mutation belongs in one store owner. |
| Success-gated event projection | `AgentArtifactEventProcessor` | Prevents output-path extraction from bypassing actual tool outcome | Backend tool-result boundary | `ARTIFACT_PERSISTED` is emitted only from successful results. |
| One-shot discoverability signal | `agentArtifactsStore.ts`, `ArtifactsTab.vue`, `RightSideTabs.vue` | Prevents refresh-only updates from stealing focus while still surfacing new rows | Discoverability bounded local spine | New visibility and refresh are intentionally separate signals. |
| Bounded local spine for viewer resolution | `ArtifactContentViewer.vue` | Prevents display logic from being hidden behind persistence-centric conditions | Viewer content resolution | Key fix for full-file viewing. |
| Capability-area reuse | `segmentHandler.ts`, `artifactHandler.ts`, `RightSideTabs.vue` | Avoids creating a new touched-files subsystem when the existing artifact subsystem already owns the right categories of work | Multiple | This is a semantic redesign, not a subsystem rewrite. |
| Explicit removal plan | backend `agent-artifacts` + GraphQL query | Keeps the redesign from becoming add-only | Backend cleanup | Required by scope. |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Segment, artifact, and lifecycle handlers all mutate touched-entry state today with persistence-centric assumptions | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | No | Current files are mostly correctly scoped; the problem is state semantics, not file overload | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | Store signal for latest-visible row and backend event processor both own real policy | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | Viewer fetch policy, tab switch policy, and icons each map to clear files | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | All core changes stay in streaming/store/UI owners and tool-result processor boundary | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | Shared touched-entry state model should stay centralized in the store exports | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | No | Keeping backend persistence/query path would preserve the wrong product model | Change |

## Redesign Re-Entry Addendum (v2)

The Stage 8 round 5 fail exposed that the first design draft still left two owner contracts too implicit:

1. **First visibility is not the same thing as refresh.**
   - The row becoming newly visible is a DS-005 discoverability event.
   - A later runtime update to the same row is only a DS-002 freshness event.
   - These must stay separate so the shell and artifact tab do not keep stealing focus on every refresh.

2. **Artifact availability is not the same thing as path extraction.**
   - A tool result exposing a path or URL is not enough by itself.
   - Availability-shaped artifact events must only be emitted after the result is authoritatively successful.
   - This keeps generated outputs from appearing as real files when the underlying tool was denied or failed.

Good-shape example:
- `ToolResultEventHandler -> AgentArtifactEventProcessor(success-gated) -> notifier -> artifactHandler -> agentArtifactsStore`
- `segmentHandler -> agentArtifactsStore(discoverability once)`
- `artifactHandler(refresh only) -> agentArtifactsStore(no discoverability for existing row)`

Bad-shape anti-example:
- `ToolResultEventHandler -> AgentArtifactEventProcessor(path extracted, success not checked) -> available artifact event`
- `artifactHandler(refresh existing row) -> announce latest visible artifact again -> RightSideTabs/ArtifactsTab steal focus repeatedly`

This v2 design hardens those two contracts before returning to runtime modeling and implementation.

## Architecture-Quality Re-Entry Addendum (v3)

The Stage 8 pass at `8.8 / 10` showed that the main architecture is now healthy, but one public boundary still lags behind the spine language:

1. **The store boundary is still more generic than the domain subjects it owns.**
   - `ARTIFACT_UPDATED` refresh,
   - `ARTIFACT_PERSISTED` availability,
   - and lifecycle fallback row creation
   are different domain events on the spine.
   - They should therefore be different caller-facing store operations.

2. **Caller-facing APIs should not rely on option flags to express domain meaning when the subject itself is already known.**
   - If the caller knows it is handling `ARTIFACT_UPDATED`, it should call a refresh-specific store boundary.
   - If the caller knows it is handling `ARTIFACT_PERSISTED`, it should call an availability-specific store boundary.
   - If lifecycle fallback is occurring, it should call a lifecycle-specific fallback boundary.

Good-shape example:
- `artifactHandler.handleArtifactUpdated -> agentArtifactsStore.refreshTouchedEntryFromArtifactUpdate`
- `artifactHandler.handleArtifactPersisted -> agentArtifactsStore.markTouchedEntryAvailableFromArtifactPersisted`
- `toolLifecycleHandler(sync fallback) -> agentArtifactsStore.ensureTouchedEntryTerminalStateFromLifecycle`

Bad-shape anti-example:
- `artifactHandler / toolLifecycleHandler -> agentArtifactsStore.upsertTouchedEntryFromArtifactEvent(input, { announceOnCreate, announceOnExisting, availability })`

This v3 design iteration does not change product behavior. It tightens the caller-facing boundary so the public API shape matches the end-to-end spine more directly.

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Keep backend artifact metadata persistence and simply add `edit_file` rows earlier in the frontend | Smaller server change, fewer deletions | Preserves unused complexity, keeps misleading persistence-centric naming/semantics, still encourages future accidental coupling | Rejected | The user goal is live touched-file inspection, not artifact-history storage. |
| B | Make the artifact area a pure live touched-files projection, keep runtime artifact events, remove DB/query path | Simplest product model, clean ownership, minimal hidden dependencies | Requires removing server code and adjusting tests/docs | Chosen | This matches current real UX and future restore can be designed later from raw traces. |
| C | Rename every runtime artifact event and every frontend artifact file to “touched-files” in this ticket | Strong semantic alignment | Broad cross-runtime churn across AutoByteus/Codex protocol and docs | Rejected | Not required for product behavior; can be follow-up cleanup after the live projection is correct. |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-web/stores/agentArtifactsStore.ts` | same | Reframe store as canonical touched-entry projection; add deterministic row identity, source invocation/source tool metadata, latest-visible signal, and remove GraphQL fetch path | frontend state, selection/discoverability | Central change |
| C-002 | Modify | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | same | Create touched rows for both `write_file` and `edit_file`; only stream content for `write_file` | frontend streaming ingress | Immediate discoverability fix |
| C-003 | Modify | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | same | Split refresh from availability semantics: `ARTIFACT_UPDATED` refreshes metadata, `ARTIFACT_PERSISTED` creates/promotes success-authorized availability | frontend runtime event reconciliation | Must support AutoByteus and Codex |
| C-004 | Modify | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | Mark touched rows available/failed/denied by invocation ID | frontend lifecycle reconciliation | Enables UC-005 |
| C-005 | Modify | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | Fetch full workspace file content for any resolvable text/code row unless actively streaming `write_file`; keep failed rows inspectable | viewer | Core user-facing change |
| C-006 | Modify | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | same | Follow the store-owned one-shot latest-visible signal only; do not re-select on refresh-only updates | artifact panel UX | Avoid focus stealing |
| C-007 | Modify | `autobyteus-web/components/layout/RightSideTabs.vue` | same | Auto-switch on store-owned new-visibility announcements, not raw artifact refreshes | shell UX | Discoverability parity |
| C-008 | Modify | `autobyteus-web/components/workspace/agent/ArtifactList.vue` | same | Keep assets/files grouping and sort newest-first within each group | list UX | Better discoverability |
| C-009 | Modify | `autobyteus-web/components/workspace/agent/ArtifactItem.vue` | same | Render touched-entry statuses/icons using the new lifecycle semantics | list item UX | Likely `pending` / `available` / `failed` |
| C-010 | Remove | `autobyteus-web/graphql/queries/agentArtifactQueries.ts` | removed | No live caller; persistence-backed query removed from scope | web GraphQL | Generated artifacts updated accordingly |
| C-011 | Modify | `autobyteus-web/generated/graphql.ts` | regenerated output | Remove unused `GetAgentArtifacts` artifacts after query deletion | generated frontend types | Regenerated, not hand-owned |
| C-012 | Rename/Move | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts` | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | Remove storage responsibility and keep only success-authorized live event emission | backend runtime projection | Rename reflects new ownership |
| C-013 | Modify | `autobyteus-server-ts/src/startup/agent-customization-loader.ts` | same | Register renamed live event processor | backend startup wiring | Import change |
| C-014 | Remove | `autobyteus-server-ts/src/agent-artifacts/**` | removed | Obsolete metadata persistence subsystem | backend domain/storage | Full removal candidate |
| C-015 | Remove | `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts` | removed | Obsolete query surface | backend GraphQL | Schema update required |
| C-016 | Modify | `autobyteus-server-ts/src/api/graphql/schema.ts` | same | Remove resolver registration | backend GraphQL | Small but required |
| C-017 | Modify | frontend/backend tests touching artifact persistence semantics | same paths or removed | Align tests with live projection and event-only backend processor | tests | Includes deleted persistence tests |
| C-018 | Modify | `autobyteus-web/docs/agent_artifacts.md` and related server docs | same | Rewrite docs around live touched-files projection and removal of GraphQL persistence path | docs | Stage 9 but identified now |
| C-019 | Modify | `autobyteus-web/stores/agentArtifactsStore.ts` | same | Replace the generic public artifact-event upsert boundary with explicit domain operations for refresh, persisted availability, and lifecycle fallback | frontend state/API clarity | v3 architecture-quality refinement |
| C-020 | Modify | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | Call the new explicit store boundaries instead of the generic artifact-event upsert method | frontend handler/API clarity | Keeps handler-to-store dependency aligned with spine subjects |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-artifacts/**` | Current live UX does not read persisted artifact metadata; storage is unused for the product behavior in scope | Frontend live projection + workspace file/URL resolution + thin backend runtime event emission | In This Change | Remove tests tied only to this subsystem as well |
| `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts` | GraphQL artifact query has no live caller | No replacement needed in current scope | In This Change | Future history restore can design a different projection later |
| `autobyteus-web/graphql/queries/agentArtifactQueries.ts` and store fetch path | No production caller and no longer part of design | No replacement in current scope | In This Change | Remove Apollo dependency from store |
| Persistence-centric status semantics (`persisted`, `pending_approval`) in touched-entry UX | They model storage/approval details more than user-visible availability | Touched-entry lifecycle semantics (`streaming`, `pending`, `available`, `failed`) | In This Change | Wire event names may stay for now even if row status names change |
| Timestamp-only temporary IDs for live rows | Touched-files concept is one row per run+path | Deterministic row ID `runId:path` | In This Change | Backend artifact id can remain auxiliary metadata only |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentArtifactsStore.ts` | frontend state | touched-entry projection owner | Canonical touched rows, row upsert rules, lifecycle mutations, latest-visible signal | One store should own one projection model | Yes |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | frontend streaming ingress | segment-native entry creation | Early `write_file` / `edit_file` row creation and streamed write content deltas | Segment semantics belong in segment handler | Yes |
| `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | frontend runtime event ingress | artifact-event reconciliation | Runtime refresh events, missing-row fallback, and success-authorized availability for generated outputs | Artifact events belong in one handler | Yes |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | frontend lifecycle ingress | tool lifecycle reconciliation | Success/failure/deny transitions for touched rows | Lifecycle messages already terminate tool state here | Yes |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | artifact UI | selection observer | React to store-owned new-visibility signals without deriving discoverability itself | Selection policy should stay in panel scope | Yes |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | artifact UI | content resolution boundary | Decide between stream buffer, workspace fetch, or preview URL | One selected-row viewer should own content resolution | Yes |
| `autobyteus-web/components/layout/RightSideTabs.vue` | shell UI | discoverability observer | One-shot tab switching from store-owned new-visibility signals | Shell owns active tab switching | Yes |
| `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | backend runtime projection | success-authorized tool-result boundary | Emit live artifact events from successful tool results without persistence | Tool-result boundary already exists | No |
| `autobyteus-server-ts/src/startup/agent-customization-loader.ts` | backend startup | processor composition | Register live event processor | Startup owns processor registration | No |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Touched-entry state model (`id`, `path`, `status`, `sourceTool`, `sourceInvocationId`, `workspaceRoot`, `url`) | keep exported from `autobyteus-web/stores/agentArtifactsStore.ts` | frontend state | Multiple handlers/components already consume this model; one owner should define it | Yes | Yes | A second parallel type defined separately in handlers/components |
| Deterministic row identity and row lookup helpers | internal helpers inside `agentArtifactsStore.ts` | frontend state | Segment, artifact-event, and lifecycle mutations all need the same matching rules | Yes | Yes | Scattered path/invocation matching logic across handlers |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| `AgentArtifact` / touched-entry row model | Yes | Yes | Low | Yes | Tighten status/source fields and use deterministic `runId:path` identity; keep backend artifact id auxiliary only if still emitted |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentArtifactsStore.ts` | frontend state | touched-entry projection owner | One canonical live row per run+path; status transitions; latest-visible signaling | The touched-files model should not be split across multiple state owners | Yes |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | frontend streaming ingress | segment-native touch creation | Upsert early `write_file` / `edit_file` rows and stream only write buffers | Segment-start/segment-content are cohesive here | Yes |
| `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | frontend runtime event ingress | artifact-event reconciliation | Reconcile runtime refresh events and success-authorized persisted outputs into the same projection | One owner for runtime artifact events keeps DS-002 coherent | Yes |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | frontend lifecycle ingress | lifecycle closure owner | Map invocation lifecycle to touched-entry availability/failure | Lifecycle outcomes belong with lifecycle parsing | Yes |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | artifact UI | selection observer | React to one-shot discoverability and manage selected row propagation | Keeps UI choice separate from store state | Yes |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | artifact UI | content resolution owner | Render full file content or preview source for selected row | One content boundary is easier to reason about and test | Yes |
| `autobyteus-web/components/layout/RightSideTabs.vue` | shell UI | discoverability observer | React to store-owned latest-visible row signal | Shell-level behavior belongs in shell component | Yes |
| `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | backend runtime projection | event emission owner | Translate tool results into live runtime artifact messages | Thin boundary file, no storage responsibility | No |
| `autobyteus-server-ts/src/startup/agent-customization-loader.ts` | backend startup | composition root | Register the runtime event processor | Startup composition remains centralized | No |

## Derived Implementation Mapping (Secondary)

This section exists to map the spine-and-ownership design into concrete implementation locations.
It must not replace the spine-first explanation above.
Use judgment: the goal is readable ownership and structural depth, not a rigid one-folder-per-spine-step rule.

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentArtifactsStore.ts` | Modify | DS-001, DS-002, DS-003, DS-005 | projection + discoverability owner | Keep one row per run+path, separate refresh from availability, and expose those as explicit public store operations rather than one generic event-shaped mutator | Store actions/getters | Deterministic row identity, discoverability guard, and caller-facing boundary clarity stay here |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Modify | DS-001, DS-005 | segment ingress | Call store upsert for both `write_file` and `edit_file`; segment start is the authoritative explicit re-touch trigger | `handleSegmentStart/Content/End` | `edit_file` should not depend on later artifact events to appear |
| `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | Modify | DS-002 | artifact-event reconciliation | Treat `ARTIFACT_UPDATED` as metadata refresh / missing-row fallback and `ARTIFACT_PERSISTED` as success-authorized availability using explicit store methods named for those domain subjects | `handleArtifactUpdated`, `handleArtifactPersisted` | Works for AutoByteus and Codex |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Modify | DS-003 | lifecycle closure | Mark segment-created rows failed/available by invocation ID for `write_file` / `edit_file`, and use an explicit lifecycle fallback store method when invocation matching misses | `handleToolDenied`, `handleToolExecutionSucceeded`, `handleToolExecutionFailed` | Preserve row visibility on file-tool failure without reusing the artifact-event boundary |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Modify | DS-004 | viewer content resolution | Fetch workspace content for any resolvable text/code row except active streaming write; keep URL/media preview path | watcher + content resolver methods | Do not gate text display on `available` only |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Modify | DS-005 | selection observer | React once to the store-owned discoverability signal; do not re-select on refresh-only updates | row watchers | Selection stays downstream of the store |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Modify | DS-005 | shell discoverability observer | Switch to artifacts only on new-visibility signal instead of raw artifact freshness | watcher source | Shell does not derive visibility rules |
| `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | Rename/Modify | DS-002 | backend event projection | Extract output path/type and emit artifact events only when the tool result is successful | `process()` | Wire-event names stay stable in this ticket |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | Modify | none | removal cleanup | Remove obsolete resolver registration | schema build | Small cleanup |

## File Placement And Ownership Check (Mandatory)

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Flat-Or-Over-Split Risk (`Low`/`Medium`/`High`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agentArtifactsStore.ts` | `autobyteus-web/stores/agentArtifactsStore.ts` | same | frontend touched-entry projection state | Yes | Low | Keep | The store already owns the projection; only semantics change. |
| `segmentHandler.ts` | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | same | segment ingress | Yes | Low | Keep | Correct ingress owner. |
| `artifactHandler.ts` | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | same | runtime artifact-event ingress | Yes | Low | Keep | Correct event owner. |
| `toolLifecycleHandler.ts` | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | lifecycle ingress | Yes | Low | Keep | Correct owner for failure/success closure. |
| `ArtifactsTab.vue` | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | same | artifact panel selection UI | Yes | Low | Keep | Selection policy belongs here. |
| `ArtifactContentViewer.vue` | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | selected-row content rendering | Yes | Low | Keep | No new viewer layer needed. |
| `RightSideTabs.vue` | `autobyteus-web/components/layout/RightSideTabs.vue` | same | shell tab switching | Yes | Low | Keep | Existing shell owner is correct. |
| `agent-artifact-persistence-processor.ts` | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts` | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | backend tool-result event projection | No | Low | Move/Rename | Current path folder is right, but file name is wrong after persistence removal. |
| `src/agent-artifacts/**` | `autobyteus-server-ts/src/agent-artifacts/**` | removed | obsolete backend persistence subsystem | No | Low | Remove | Target design gives this concern no owner because it is out of scope and unused. |
| `src/api/graphql/types/agent-artifact.ts` | `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts` | removed | obsolete artifact metadata query | No | Low | Remove | Not part of the live projection target. |

Rules:
- Use a flatter layout when it is genuinely clearer for the scope, but justify it.
- Do not split folders, optional module groupings, and files so aggressively that the structure becomes artificial and ownerless.
- Do not keep a flat mixed folder when it hides real ownership or structural depth.

## Concrete Target Behavior Notes

### Touched-Entry Identity

- One row per `runId + normalized path`.
- Backend `artifact_id` becomes optional metadata only; it is not the primary row identity.
- Re-touching the same path from a new segment-start updates the same row instead of creating a duplicate.

### Target Touched-Entry Lifecycle

- `write_file` segment start -> row status `streaming` and discoverability announcement fires.
- `write_file` segment end -> row status `pending`.
- `edit_file` segment start -> row status `pending` and discoverability announcement fires.
- `ARTIFACT_UPDATED` for an existing row -> refresh metadata (`updatedAt`, `type`, `workspaceRoot`, optional URL), preserve current status, do not announce.
- `ARTIFACT_UPDATED` with no existing row -> create one `pending` runtime-file-change row so the file is inspectable even if the segment-start was absent.
- Success-authorized `ARTIFACT_PERSISTED` -> create or promote row to `available`.
- `TOOL_EXECUTION_SUCCEEDED` for a row already keyed by invocation -> mark that row `available`.
- `TOOL_DENIED` / `TOOL_EXECUTION_FAILED` for a segment-created row -> mark that row `failed` and keep it visible.
- Denied/failed generated-output tools with no existing row -> do not create a touched row in this ticket; failure remains visible in progress/activity UI only.

### Content Resolution Rules

- If selected row is a text/code `write_file` entry still in `streaming` and has buffered content, show the streamed buffer.
- Otherwise, for any text/code row with a resolvable workspace path, fetch current workspace content regardless of whether the row came from `write_file`, `edit_file`, `ARTIFACT_UPDATED`, or `ARTIFACT_PERSISTED`.
- For media/document outputs, prefer explicit URL from runtime event; otherwise use workspace content endpoint when resolvable.
- Failed rows remain viewable: `write_file` may still show buffered attempted content; `edit_file` shows current workspace file content plus failed state in the list.

### Discoverability Rules

- Only two things can emit the discoverability signal: first visibility of a row for the run, or an explicit new segment-start that re-touches an existing path.
- Refresh-only artifact updates, lifecycle status flips, and `updatedAt` changes never emit discoverability.
- `RightSideTabs.vue` and `ArtifactsTab.vue` react to the store-owned signal; they do not infer discoverability from raw artifact arrays.

### Public Store Boundary Rules

- `segmentHandler.ts` calls the segment-touch boundary only.
- `artifactHandler.ts` calls refresh / persisted-availability boundaries only.
- `toolLifecycleHandler.ts` calls invocation-status boundaries and, when needed, lifecycle-fallback boundaries only.
- No caller outside the store should pass generic announce flags to describe a domain subject that is already known at call time.

### Wire-Event Naming Decision

- Keep runtime wire-event names `ARTIFACT_UPDATED` and `ARTIFACT_PERSISTED` in this ticket.
- Narrow their semantics to:
  - `ARTIFACT_UPDATED` = runtime file/output freshness metadata, no success claim by itself.
  - `ARTIFACT_PERSISTED` = success-authorized output availability.
- Do not keep any database write/read path behind those names.
