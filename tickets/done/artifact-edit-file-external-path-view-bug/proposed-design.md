# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | External-path bug redesign | Introduced a run/path-serving stopgap with touched-path authorization. | 1 |
| v2 | Broader redesign re-entry | Replaced the stopgap-centered direction with a backend-owned agent-run file-change projection that supports live rendering and historical rerendering from run memory. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/artifact-edit-file-external-path-view-bug/investigation-notes.md`
- Requirements: `tickets/done/artifact-edit-file-external-path-view-bug/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `Not present as checked-in repo files in this worktree; Stage 3/5 workflow design rules were applied directly from the software-engineering-workflow skill.`
- Common Design Practices: `Not present as checked-in repo files in this worktree; common workflow design practices were applied directly from the software-engineering-workflow skill.`

## Summary

The original bug exposed a deeper problem: file-backed rows in the Artifacts tab are not owned by a backend file-change subsystem. Instead, the current UI synthesizes rows from raw segment/artifact/lifecycle events, while history hydration restores only conversation. The narrower `runId + path` route redesign fixed remote-server authority for current-file reads, but it still left the system path-oriented and unable to rerender file changes from run memory.

The new design makes file changes a first-class backend-owned agent-run capability:

- one visible file-change row per normalized `runId + path`
- one backend owner for `write_file` and `edit_file`
- one durable projection persisted under agent-run memory
- committed content captured as run-memory snapshots for historical rendering
- one live event family for file-change updates
- one historical query path for file-change hydration
- one run-scoped content route backed by run-memory projection/snapshots

Generated media/document outputs remain on the existing artifact flow in current scope. Team-run-owned aggregation is explicitly deferred.

## Goal / Intended Change

Introduce one authoritative backend-owned agent-run file-change subsystem so file-backed rows are no longer inferred in the browser:

- runtime emits ordinary run events,
- backend file-change owner normalizes them into file-change state,
- backend persists that state under agent-run memory,
- backend exposes live file-change updates and historical file-change projection reads,
- frontend renders file-backed rows from that backend projection,
- viewer loads committed content from run-memory snapshots instead of current-path reads.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove file-backed authority from the current browser-owned `agentArtifactsStore` path for `write_file` and `edit_file`.
- Remove file-backed reliance on:
  - raw `SEGMENT_START` / `SEGMENT_CONTENT` parsing in the frontend,
  - `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` as the file-change contract,
  - workspace inference as the file-backed viewer authority,
  - the current `run-artifacts` touched-path manifest route as the long-term file-backed source of truth.
- Keep generated outputs on the existing artifact flow in current scope, but do not keep dual file-backed behavior where some file changes come from the new projection and others still come from the old path-inference logic.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Backend owns a dedicated agent-run file-change projection for `write_file` / `edit_file`. | AC-001, AC-002, AC-003 | Live and historical file-backed rows both come from one backend owner. | UC-001, UC-002, UC-003 |
| R-002 | One visible row per normalized `run + path`, with no public `changeId` required. | AC-005 | Same-path retouches collapse into one visible row. | UC-005 |
| R-003 | Committed file-change content is stored in run memory and served from the server. | AC-002, AC-003, AC-004 | Historical rendering no longer depends on current filesystem state. | UC-002, UC-003, UC-004 |
| R-004 | Failed rows stay visible and generated outputs do not regress. | AC-006, AC-007 | Failure behavior stays explicit; generated outputs remain intact. | UC-006, UC-007 |
| R-005 | Current scope remains agent-run-owned. | AC-001 through AC-008 | Team aggregation is deferred, not accidentally half-implemented. | Scope guard |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Live file-backed rows are synthesized in the frontend from segments, artifact events, and lifecycle fallbacks; history is conversation-only. | `segmentHandler.ts`, `artifactHandler.ts`, `toolLifecycleHandler.ts`, `runContextHydrationService.ts`, `run-projection-types.ts` | None blocking design. |
| Current Ownership Boundaries | The server owns run identity and run memory, but it does not yet own a file-change projection. | `agent-run-service.ts`, `agent-run-memory-layout.ts`, `agent-run-view-projection-service.ts` | None blocking design. |
| Current Coupling / Fragmentation Problems | The current stopgap route solves remote file authority, but still reads current files by path instead of restoring committed content from run memory. | `run-artifact-path-registry-service.ts`, `run-artifacts.ts` | Whether any piece of the stopgap remains useful as migration scaffolding only. |
| Existing Constraints / Compatibility Facts | Team selection currently routes Artifacts through focused member context. The user explicitly deferred team-run aggregation. | `ArtifactsTab.vue`, `activeContextStore.ts`, `agent-team-stream-handler.ts` | Future team aggregation remains a follow-up scope. |
| Relevant Files / Components | The redesign naturally centers on one new `run-file-changes` subsystem plus frontend store/hydration changes. | file plan below | None blocking Stage 3. |

## Current State (As-Is)

Today the browser is doing work it should not own:

- it decides when file-backed rows exist,
- it correlates unrelated runtime events into row state,
- it chooses different content sources depending on transport shape,
- and it cannot hydrate historical file changes because history does not expose them.

The current stopgap `runId + path` route improved one narrow point by making the server the authority for path reads, but it still assumes the path is the thing to preserve. For historical rerendering, the thing to preserve is not the path. It is the run-scoped file-change result.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime emits a `write_file` / `edit_file` run event | Artifacts tab shows a file-backed row from backend-owned live file-change state | `RunFileChangeService` | This is the primary live business path for file changes. |
| DS-002 | Primary End-to-End | User reloads or later reopens a run | Artifacts tab restores file-backed rows from persisted run memory | `RunFileChangeProjectionService` | This is the primary historical rerendering path. |
| DS-003 | Bounded Local | File-change owner receives a run event | Projection row, buffer, and snapshot state are updated and persisted | `RunFileChangeService` + `RunFileChangeProjectionStore` | This is the internal state machine/persistence loop the redesign depends on. |
| DS-004 | Return-Event | User opens a committed file-backed row | Server returns run-memory-backed content to the viewer | `run-file-changes` REST route | This is the authoritative content-return path. |
| DS-005 | Return-Event | File change fails or is denied | UI keeps an explicit failed row | `RunFileChangeService` | This preserves failure visibility. |

## Primary Execution / Data-Flow Spine(s)

- `Runtime event -> RunFileChangeService -> RunFileChangeProjectionStore -> live file-change event -> runFileChangesStore -> ArtifactsTab -> ArtifactContentViewer`
- `Run reopen -> RunFileChangeProjectionService -> GraphQL projection query -> runFileChangesStore hydration -> ArtifactContentViewer -> run-file-changes content route -> snapshot bytes`

Why these spans are long enough:

- they include the initiating runtime or historical entry surface,
- the authoritative backend owner boundary,
- the persistence/read boundary,
- and the user-visible rendering outcome.

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| Runtime run event stream | initiating signal | tells the backend that a file change started, progressed, committed, or failed |
| `RunFileChangeService` | authoritative owner | correlates runtime signals into one file-change row per path |
| `RunFileChangeProjectionStore` | persistence boundary | stores projection JSON plus committed content snapshots under run memory |
| live file-change transport | live notification path | updates the browser without making the browser infer row state |
| `runFileChangesStore` | frontend projection owner | renders backend-owned file-change rows in the UI |
| `RunFileChangeProjectionService` | historical read owner | reconstructs historical file-change rows from run memory |
| `run-file-changes` REST route | content return boundary | serves committed snapshot content or active buffered content from run memory |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Runtime events no longer create file rows in the browser. Instead, the backend file-change owner receives the run event, upserts one row keyed by normalized path, persists the row under run memory, and emits a normalized live file-change update. The browser store simply reflects that backend state. | runtime event, file-change owner, projection store, live transport, browser store | `RunFileChangeService` | generated outputs remain separate |
| DS-002 | Historical reopen now asks the backend for a file-change projection in parallel with the conversation projection. The backend rebuilds file-backed rows from run memory and the browser hydrates them directly, rather than trying to replay conversation segments. | run reopen, projection query, browser hydration | `RunFileChangeProjectionService` | run-history GraphQL wiring |
| DS-003 | Inside the file-change owner, every relevant runtime event is normalized into one path-keyed row. `write_file` may update a live buffer; `edit_file` stays pending until final effective content is captured. Commit stores a snapshot and marks the row available. Failure preserves the row with terminal failed state. | normalize event, upsert row, persist buffer/snapshot, publish live update | `RunFileChangeService` | serializer / atomic writes |
| DS-004 | When the viewer opens a committed row, it calls one run-scoped content route that reads run-memory-backed snapshot content instead of resolving the current filesystem path. | viewer, REST route, projection store | `run-file-changes` REST route | MIME/content-type mapping |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `AgentRunManager` | attaching and detaching the file-change owner to active agent runs | path-level file-change policy, frontend hydration | same role as other active-run observers |
| `RunFileChangeService` | file-change normalization, row identity by normalized path, live buffer updates, commit/fail transitions, snapshot capture, observer notifications | GraphQL schema wiring, frontend rendering, generated-output behavior | authoritative file-change owner |
| `RunFileChangeProjectionStore` | run-memory IO for projection JSON and committed content snapshots | runtime event interpretation, UI state | storage-only helper owned by `RunFileChangeService` |
| `RunFileChangeProjectionService` | historical read API over persisted file-change projection | live event capture, websocket observer management | history-facing read boundary |
| `run-file-changes` REST route | request validation and snapshot/buffer content serving | deciding file-change state transitions | content-return boundary only |
| `runFileChangesStore` | frontend file-change projection state keyed by run/path | generated-output ownership, raw runtime event interpretation | browser should consume normalized file-change events/projections only |
| `agentArtifactsStore` | generated media/document outputs in current scope | file-backed `write_file` / `edit_file` authority | kept only for non-file-change artifact concerns |
| `ArtifactsTab` / `ArtifactContentViewer` | rendering rows and selected content | reconstructing row state from raw segments or workspace scanning | thin UI owners after redesign |

## Return / Event Spine(s) (If Applicable)

- `RunFileChangeService -> live file-change observer -> streaming transport -> frontend handler -> runFileChangesStore`
- `ArtifactContentViewer -> run-file-changes REST route -> RunFileChangeProjectionStore.readContent(...) -> viewer render`
- `RunFileChangeService -> failed row update -> live file-change observer -> failed row state in UI`

## Bounded Local / Internal Spines (If Applicable)

### BLS-001 File-Change Upsert Loop

- Parent owner: `RunFileChangeService`
- Bounded local spine:
  - `receive run event -> normalize candidate file change -> resolve normalized path -> upsert path-keyed row -> persist projection -> optionally persist buffer/snapshot -> notify observers`
- Why it must be explicit:
  - This is the core state machine of the redesign and replaces browser-side inference.

### BLS-002 Historical Projection Load

- Parent owner: `RunFileChangeProjectionService`
- Bounded local spine:
  - `resolve run memory dir -> read projection JSON -> map persisted rows to API payload -> return projection`
- Why it must be explicit:
  - Historical rerendering is a first-class requirement, not an accidental by-product.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Generated outputs | `agentArtifactsStore` / existing artifact flow | keep media/document outputs working during current redesign | Yes |
| Team-run aggregation | future extension | possible future owner widening from agent-run to team-run | Yes |
| Content-type mapping | REST route | choose correct response metadata for committed snapshots | Yes |
| Serializer / atomic persistence | `RunFileChangeProjectionStore` | prevent projection corruption during rapid live updates | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| active run lifecycle hook | `AgentRunManager` | Extend | already owns active-run observer attachment | N/A |
| durable per-run storage | `agent-memory` layout/store | Reuse | agent-run memory is the correct persistence root | N/A |
| historical query surface | `run-history` GraphQL/service layer | Extend | file-change projection is a historical read concern adjacent to run projection | N/A |
| live browser file-row state | current `agentArtifactsStore` | Do Not Reuse As File-Change Authority | current store is browser-owned and mixed-domain | it is the fragmentation source for file changes |
| stopgap run/path file route | `run-artifacts` | Do Not Reuse As Final Owner | path authorization/current-file reads are not historical file-change truth | it solves the wrong long-term problem |
| file-change capability | none | Create New | no existing subsystem owns file-backed live + historical state together | current behavior is spread across unrelated modules |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution` run lifecycle | attach/detach file-change owner to active agent runs | DS-001, DS-003 | `AgentRunManager` | Extend | current scope agent-run only |
| `run-file-changes` | normalization, persistence, live updates, historical reads, content serving | DS-001, DS-002, DS-003, DS-004, DS-005 | `RunFileChangeService` | Create New | new authoritative file-change owner |
| `run-history` | expose historical file-change projection query | DS-002 | `RunFileChangeProjectionService` | Extend | parallels existing run history/read paths |
| frontend file-change state | render backend-owned file-change rows | DS-001, DS-002, DS-004, DS-005 | `runFileChangesStore` | Create New | split from generated-output artifact store |
| existing artifact flow | generated outputs only in current scope | off-spine support | `agentArtifactsStore` | Keep / Narrow | explicitly no longer owns `write_file` / `edit_file` |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `AgentRunManager -> RunFileChangeService`
  - `RunFileChangeService -> RunFileChangeProjectionStore`
  - `RunFileChangeProjectionService -> RunFileChangeProjectionStore`
  - `run-file-changes REST route -> RunFileChangeProjectionService`
  - `runFileChangesStore -> ArtifactContentViewer`
  - `ArtifactsTab -> runFileChangesStore`
- Authoritative public entrypoints versus internal owned sub-layers:
  - historical readers use `RunFileChangeProjectionService`
  - content readers use the `run-file-changes` REST route
  - live browser updates use normalized file-change live events
- Authoritative Boundary Rule per domain subject:
  - upper layers must not depend on both `RunFileChangeService` and `RunFileChangeProjectionStore`
  - frontend components must not depend on both `runFileChangesStore` and raw segment/artifact handlers for file-backed row state
- Forbidden shortcuts:
  - `ArtifactContentViewer -> workspace route` for `write_file` / `edit_file`
  - `ArtifactContentViewer -> Electron file APIs`
  - `runFileChangesStore -> segment/artifact/lifecycle handlers` as file-change authority
  - `RunFileChangeProjectionService -> current filesystem path resolution` as the normal historical content source
- Boundary bypasses that are not allowed:
  - conversation projection rebuilding file-change rows indirectly
  - generated-output artifact flow continuing to drive file-backed rows
- Temporary exceptions and removal plan:
  - The current `run-artifacts` stopgap may remain only as migration scaffolding during implementation; it must be removed once the file-change route and projection are in place.

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - create a backend-owned `run-file-changes` subsystem with projection-first persistence under agent-run memory
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: higher than the stopgap, but replaces scattered browser inference with one owner
  - `testability`: live updates, historical hydration, same-path retouching, and content serving can each be tested directly
  - `operability`: works with remote servers and historical reopen without current-file-path dependence
  - `evolution cost`: current scope stays agent-run-owned, while future team aggregation can widen the owner later without rewriting the file-change UI contract
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Move`/`Remove`):
  - `Add` backend `run-file-changes`
  - `Split` frontend file-backed rows from generated outputs
  - `Remove` current file-backed use of the stopgap path-serving authority

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| authoritative owner + thin consumers | backend file-change subsystem and frontend store | removes browser inference and keeps history/live aligned | `RunFileChangeService`, `runFileChangesStore` | core design principle |
| projection-first persistence | run-memory file-change projection | matches current UX requirement of one visible row per path and final effective content | `RunFileChangeProjectionStore` | simpler than a public multi-revision model |
| split domains by real business concern | file-backed rows vs generated outputs | avoids dragging unrelated media/doc output behavior into the file-change redesign | file-change subsystem, existing artifact subsystem | current-scope simplification |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | frontend currently coordinates file rows across segment, artifact, and lifecycle handlers | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | Yes | `agentArtifactsStore` mixes file changes and generated outputs | Split |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | `RunFileChangeService` owns normalization, persistence, and live/historical contract | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | generated outputs, team aggregation, serializer, and content-type mapping are each explicitly owned | Keep |
| Primary spine is stretched far enough to expose the real business path instead of only a local edited segment | Yes | live and historical spines both start at runtime/history entrypoints and end at user rendering | Keep |
| Authoritative Boundary Rule is preserved | Yes | file-change reads go through dedicated service/query/route boundaries | Keep |

## File / Folder Design Mapping

| Path | Action | Responsibility |
| --- | --- | --- |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | Create | authoritative file-change owner for runtime event normalization, path-keyed row upserts, and observer notifications |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-store.ts` | Create | run-memory IO for projection JSON, live write buffers, and committed content snapshots |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-types.ts` | Create | canonical file-change row/state payloads for live and historical use |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | Create | historical projection reader over persisted agent-run file-change state |
| `autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts` | Create | GraphQL query for historical file-change projection hydration |
| `autobyteus-server-ts/src/api/rest/run-file-changes.ts` | Create | run-scoped content route that serves committed snapshot content or live buffered content from run memory |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Modify | attach/detach `RunFileChangeService` to active runs |
| `autobyteus-server-ts/src/services/agent-streaming/*` | Modify | forward normalized live file-change events to connected clients |
| `autobyteus-web/stores/runFileChangesStore.ts` | Create | frontend file-change projection store keyed by normalized `runId:path` |
| `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts` | Create | consume backend live file-change events instead of synthesizing rows from raw runtime events |
| `autobyteus-web/services/runHydration/runFileChangeHydrationService.ts` | Create | load historical file-change projection into the browser store |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Modify | merge file-change rows from `runFileChangesStore` with generated outputs from the narrowed artifact store |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Modify | use file-change projection/store + run-memory content route for file-backed rows |
| `autobyteus-web/stores/agentArtifactsStore.ts` | Modify | narrow scope to generated outputs in current design |
| `autobyteus-server-ts/src/services/run-artifacts/*` | Remove after migration | decommission the narrower stopgap once file-change subsystem is implemented | temporary migration-only overlap |

## Design Risks / Questions

- Generated outputs remain a separate subsystem in current scope; the tab-level merge must stay clear and non-hacky.
- Snapshot policy for large/binary file changes may need follow-up work. Current redesign is optimized for inspectable text/code file changes.
- Team-run-owned aggregation is deliberately deferred. The current design should not quietly grow half of that scope inside Stage 6.
