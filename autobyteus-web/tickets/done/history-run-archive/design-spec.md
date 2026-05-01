# Design Spec

## Current-State Read

The default history/sidebar list is backend-authoritative. `WorkspaceAgentRunsTreePanel.vue` fetches `runHistoryStore.fetchTree()` on mount and periodically calls `refreshTreeQuietly()`. The store calls GraphQL `ListWorkspaceRunHistory`, saves `workspaceGroups`, and projections build the agent run tree plus team run tree shown by `WorkspaceHistoryWorkspaceSection.vue`.

Current main paths:

- Default list path: `WorkspaceAgentRunsTreePanel` -> `runHistoryStore.fetchTree` -> `ListWorkspaceRunHistory` -> `RunHistoryResolver.listWorkspaceRunHistory` -> `WorkspaceRunHistoryService.listWorkspaceRunHistory` -> `AgentRunHistoryService.listRunHistory` + `TeamRunHistoryService.listTeamRunHistory` -> frontend projections -> row rendering.
- Existing permanent delete path: row trash -> `useWorkspaceHistoryMutations` -> confirmation -> `runHistoryStore.deleteRun/deleteTeamRun` -> `deleteStoredRun/deleteStoredTeamRun` -> backend history service deletes the run/team directory and removes the index row -> frontend removes local row/context/selection and refreshes. Existing delete services already protect destructive filesystem access with service-level safe-directory resolution. Archive must adapt that safety posture because it also performs metadata filesystem reads/writes from direct GraphQL IDs.
- Existing active termination path: active row stop -> runtime store termination -> runtime service -> history refresh overlays inactive status.

Current ownership boundaries are mostly healthy:

- Row section is presentation and dispatch only.
- `useWorkspaceHistoryMutations` owns UI mutation intent, pending locks, confirmation, and toasts.
- `runHistoryStore` owns frontend history state cleanup.
- GraphQL resolvers are thin API boundaries.
- Agent/team history services own history domain rules for listing and deletion.
- Metadata stores own durable metadata normalization/persistence.
- Index stores are read-model persistence, not the full durable domain record.

The missing invariant is a durable non-destructive history visibility state. Current delete is destructive and cannot be reused as archive. A frontend-only hide flag would be lost on refresh/restart. Removing index rows would hide rows but would blur archive with soft delete and weaken future archived-list/unarchive capability. The target design adds archive state to durable per-run metadata and filters archived inactive rows at backend list boundaries.

A bounded refactor is required because archive writes metadata. Current metadata normalizers omit some optional fields declared by metadata types, such as `applicationExecutionContext`; an archive write must not inadvertently drop unrelated metadata. The design therefore tightens metadata normalization while adding `archivedAt`.

## Intended Change

Add a non-destructive archive action for inactive persisted agent and team history rows. Archive sets durable `archivedAt` metadata and hides archived inactive rows from the default history/sidebar list. Archive does not delete memory directories, raw traces, projections, metadata, or index rows. Permanent delete/remove remains available as a separate destructive action. Direct archive APIs must reject invalid/path-unsafe IDs before metadata read/write.

The first slice does not add archived-list or unarchive UI. The durable `archivedAt` state leaves those follow-ups possible without changing the archive storage model.

## Archive Identity / Path Safety Invariant

`archiveStoredRun(runId)` and `archiveStoredTeamRun(teamRunId)` are direct GraphQL boundaries with user-supplied IDs. Their history services must validate archive identity before calling any metadata store read/write method. This policy belongs in `AgentRunHistoryService` and `TeamRunHistoryService`, not in resolvers, UI, or metadata stores.

Service-level validation must reject at least:

- empty or whitespace-only IDs,
- draft/temp IDs that are not persisted history rows,
- absolute paths,
- traversal-like IDs such as `.` / `..` or IDs containing `..` path segments,
- IDs containing `/` or `\` path separators,
- any ID whose resolved run/team directory or metadata path is not strictly inside the configured agent/team metadata root.

Implementation should reuse or adapt the existing safe-directory resolution used by `deleteStoredRun` and `deleteStoredTeamRun`, or introduce an equivalent private helper such as `resolveSafeArchiveRunIdentity` / `resolveSafeArchiveTeamRunIdentity`. The helper should return a normalized safe ID only after both base-name/path-separator validation and resolved-path containment validation pass. Metadata stores may still normalize valid IDs, but they must not be the only guard for direct archive commands.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, bounded.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus shared structure looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded local refactor.
- Evidence:
  - There is no existing archive/hidden state in agent or team history metadata/index rows.
  - List services already read metadata for each index row; metadata is the right durable source for archive visibility.
  - Existing metadata store normalizers write fixed subsets and omit optional metadata fields; archive writes would otherwise risk unrelated metadata loss.
  - Direct archive mutations use caller-supplied IDs to reach metadata filesystem paths; service-level path-safe identity validation is required before metadata read/write.
  - Existing delete cleanup in `runHistoryStore` contains row/context/selection cleanup needed by archive success too.
- Design response:
  - Add optional `archivedAt` to agent and team metadata, normalized to `null` for existing records.
  - Add service-owned archive identity/path validation before metadata read/write.
  - Add explicit agent/team archive service APIs and GraphQL mutations.
  - Filter archived inactive rows in agent/team history list services before workspace grouping and per-agent limits.
  - Reuse/extract frontend local row/context/selection cleanup so archive and delete do not duplicate cleanup policy.
- Refactor rationale:
  - The refactor is necessary to preserve metadata correctly and avoid duplicating frontend cleanup behavior.
  - No broad runtime/history architecture rewrite is needed because existing owners can absorb archive cleanly.
- Intentional deferrals and residual risk, if any:
  - Archived-list/unarchive UI is deferred. Residual risk: users who archive accidentally cannot recover through a visible UI in this first slice. Data remains on disk and the durable model can support a follow-up archived view/unarchive.

## Terminology

- `Archive`: non-destructive history visibility state represented by metadata `archivedAt`.
- `Archived inactive row`: a persisted agent/team run with `archivedAt` set and no active runtime. Hidden from default list.
- `Permanent delete`: existing destructive remove action that deletes stored memory and removes the index row.
- `Default history list`: `listWorkspaceRunHistory` response consumed by the current sidebar/history tree.

## Design Reading Order

1. Archive/list data-flow spines.
2. Ownership and subsystem allocation.
3. Metadata model and API boundaries.
4. Frontend UI/store flow.
5. File mapping and migration/test sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not overload permanent delete as archive, do not add a frontend-only hidden list, and do not remove index rows as a soft-delete substitute.
- Treat removal as first-class design work: no obsolete archive/delete compatibility path is introduced. Existing permanent delete remains because it is a separate in-scope behavior, not legacy archive behavior.
- Decision rule: the design does not depend on compatibility wrappers, dual-path behavior, or legacy fallback branches. Existing records without `archivedAt` are normalized as visible data migration, not old behavior retention.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-ARCH-001 | Primary End-to-End | User clicks archive on inactive agent history row | Agent run metadata written with `archivedAt` and row hidden from default UI | Agent run history archive boundary (`AgentRunHistoryService`) | Defines non-destructive agent archive behavior. |
| DS-ARCH-002 | Primary End-to-End | User clicks archive on inactive team history row | Team run metadata written with `archivedAt` and row hidden from default UI | Team run history archive boundary (`TeamRunHistoryService`) | Defines non-destructive team archive behavior. |
| DS-ARCH-003 | Primary End-to-End | Default history refresh/fetch | Archived inactive rows omitted before frontend projection | Agent/team history list services | Ensures hiding is backend-authoritative and survives refresh/restart. |
| DS-ARCH-004 | Return-Event | Archive mutation response | Frontend row/context/selection cleanup and toast | `runHistoryStore` + `useWorkspaceHistoryMutations` | Ensures UI state matches backend archive result. |
| DS-ARCH-005 | Bounded Local | Metadata read/write normalization | Existing and new metadata fields preserved | Metadata stores | Prevents archive writes from losing unrelated metadata. |

## Primary Execution Spine(s)

- DS-ARCH-001 Agent archive: `WorkspaceHistoryWorkspaceSection -> useWorkspaceHistoryMutations.onArchiveRun -> runHistoryStore.archiveRun -> ArchiveStoredRun GraphQL mutation -> RunHistoryResolver.archiveStoredRun -> AgentRunHistoryService.archiveStoredRun -> service-level safe ID/path validation -> AgentRunMetadataStore.writeMetadata(archivedAt) -> runHistoryStore local cleanup/refresh -> sidebar hidden`
- DS-ARCH-002 Team archive: `WorkspaceHistoryWorkspaceSection -> useWorkspaceHistoryMutations.onArchiveTeam -> runHistoryStore.archiveTeamRun -> ArchiveStoredTeamRun GraphQL mutation -> TeamRunHistoryResolver.archiveStoredTeamRun -> TeamRunHistoryService.archiveStoredTeamRun -> service-level safe ID/path validation -> TeamRunMetadataStore.writeMetadata(archivedAt) -> runHistoryStore local cleanup/refresh -> sidebar hidden`
- DS-ARCH-003 Default list: `WorkspaceAgentRunsTreePanel -> runHistoryStore.fetchTree -> ListWorkspaceRunHistory -> WorkspaceRunHistoryService -> AgentRunHistoryService/TeamRunHistoryService filter archived inactive rows -> workspaceGroups -> run/team projections -> WorkspaceHistoryWorkspaceSection`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-ARCH-001 | The agent row dispatches archive intent. Frontend store calls a dedicated mutation. Backend service rejects path-unsafe IDs before metadata access, then rejects active/missing runs, writes `archivedAt` to metadata, and returns success. Frontend removes the visible row/context/selection and refreshes. | Agent history row, frontend run history store, GraphQL archive boundary, agent history service, agent metadata | `AgentRunHistoryService` for backend archive; `runHistoryStore` for frontend state | Toasts, pending locks, metadata normalization, safe ID validation |
| DS-ARCH-002 | Same as agent archive, using team-run identity and team metadata; service-level validation rejects path-unsafe team IDs before metadata access. | Team history row, frontend run history store, GraphQL team archive boundary, team history service, team metadata | `TeamRunHistoryService` for backend archive; `runHistoryStore` for frontend state | Toasts, pending locks, metadata normalization, safe ID validation |
| DS-ARCH-003 | Default list fetch remains unchanged at the frontend contract. Backend list services read metadata, omit archived inactive rows, and return only visible rows for projection/counting. | History panel, run history store, workspace history service, agent/team history services, projections | Agent/team history list services | Active overlay, grouping, per-agent limit |
| DS-ARCH-004 | Mutation response flows back to UI. Success triggers local hide/cleanup and success toast; failure leaves state unchanged and shows error. | Archive result, mutation composable, run history store, selection/context stores | `runHistoryStore` for cleanup | Refresh timer, Apollo errors |
| DS-ARCH-005 | Metadata stores accept old records without `archivedAt`, normalize to null, preserve optional fields, and write archive state atomically/consistently with existing write behavior. | Metadata object, normalizer, file store | Metadata store files | Optional field validation, old-file defaulting |

## Spine Actors / Main-Line Nodes

- `WorkspaceHistoryWorkspaceSection`: row rendering and action dispatch.
- `useWorkspaceHistoryMutations`: UI mutation intent/pending/toast owner.
- `runHistoryStore`: frontend history state and local cleanup owner.
- `ArchiveStoredRun` / `ArchiveStoredTeamRun` GraphQL mutations: transport boundary.
- `RunHistoryResolver` / `TeamRunHistoryResolver`: thin GraphQL resolver facades.
- `AgentRunHistoryService` / `TeamRunHistoryService`: authoritative backend archive/list policy owners.
- `AgentRunMetadataStore` / `TeamRunMetadataStore`: durable metadata persistence owners.
- `WorkspaceRunHistoryService`: workspace grouping owner after agent/team filtering.

## Ownership Map

| Node | Owns |
| --- | --- |
| `WorkspaceHistoryWorkspaceSection` | Which buttons are rendered for row state; emits action callbacks; no backend semantics. |
| `useWorkspaceHistoryMutations` | Per-row pending maps, archive/delete/terminate UI intent, confirmation boundaries, toast results. |
| `runHistoryStore` | Apollo action methods, visible history state mutation, local context/selection cleanup after successful backend history mutation. |
| GraphQL resolvers | Schema/API boundary and error-to-result mapping only. |
| `AgentRunHistoryService` | Agent run archive invariant: normalize ID, reject invalid/path-unsafe IDs before metadata access, reject active, require metadata, preserve memory/index, set `archivedAt`, filter archived inactive rows in default list. |
| `TeamRunHistoryService` | Team run archive invariant: normalize ID, reject invalid/path-unsafe IDs before metadata access, reject active, write metadata, and perform default-list filtering. |
| Metadata stores | Metadata validation/normalization/write semantics, including defaulting missing `archivedAt` and preserving optional fields. |
| Index stores | Existing read-model row persistence; no archive authority. |
| `WorkspaceRunHistoryService` | Merge/group already-filtered agent/team histories by workspace and team definition. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `RunHistoryResolver.archiveStoredRun` | `AgentRunHistoryService.archiveStoredRun` | GraphQL transport boundary. | ID/path safety, active guard, metadata semantics, list filtering. |
| `TeamRunHistoryResolver.archiveStoredTeamRun` | `TeamRunHistoryService.archiveStoredTeamRun` | GraphQL transport boundary. | ID/path safety, active guard, metadata semantics, list filtering. |
| `WorkspaceHistoryWorkspaceSection` action callbacks | `useWorkspaceHistoryMutations` + `runHistoryStore` | Component presentation boundary. | GraphQL calls, archive/delete policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Any proposed frontend-only archived ID list | Would lose state on refresh/restart and duplicate backend list policy. | Backend metadata `archivedAt` + history service filtering. | In This Change | Do not implement. |
| Any proposed index-row removal as archive | Would blur archive with soft delete and lose row for future archived listing. | Metadata archive state; index row remains. | In This Change | Existing permanent delete still removes index rows. |
| Duplicate local cleanup branches copied between delete and archive | Would create divergent selection/context cleanup behavior. | Shared local cleanup helper/path in `runHistoryStore`/support. | In This Change | Exact helper placement left to implementation, but cleanup policy must be single-owner. |

## Return Or Event Spine(s) (If Applicable)

- Archive success response: `Backend result(success=true) -> runHistoryStore archive action -> remove visible row from workspaceGroups -> remove local inactive context/resume/selection -> refreshTreeQuietly -> success toast`.
- Archive failure response: `Backend result(success=false) or Apollo error -> runHistoryStore returns false -> mutation composable leaves state unchanged -> error toast`.

## Bounded Local / Internal Spines (If Applicable)

- Metadata normalization spine: `read raw JSON -> validate/normalize known required fields -> normalize optional archive/application context fields -> expose metadata object -> write normalized JSON`.
- Row pending-state spine: `click archive -> guard if archive/delete pending -> mark archiving -> await store action -> clear pending -> toast`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Toast messages | DS-ARCH-004 | `useWorkspaceHistoryMutations` | User feedback for success/failure. | UI concern, not backend policy. | Backend/service code would leak presentation copy. |
| Confirmation modal | Existing delete path; adjacent to DS-ARCH-004 | `useWorkspaceHistoryMutations` / panel | Keep destructive delete confirmation separate. | Archive is non-destructive; delete remains destructive. | Archive could be confused with delete or delete could lose confirmation. |
| Metadata optional-field preservation | DS-ARCH-005 | Metadata stores | Keep persisted metadata semantically intact. | Archive writes metadata and must not drop unrelated fields. | History service would hand-edit JSON or duplicate normalizer rules. |
| Archive ID/path safety | DS-ARCH-001/002 | Agent/team history services | Reject unsafe direct archive IDs before metadata read/write. | Metadata paths are derived from IDs; direct GraphQL APIs need service-owned guard. | Resolvers/UI/metadata stores would become inconsistent or too thin; out-of-root writes could occur. |
| Local context/selection cleanup | DS-ARCH-004 | `runHistoryStore` | Remove hidden row from visible frontend state and clear opened inactive contexts. | Store already owns history state. | UI component would duplicate store internals and selection rules. |
| Active runtime truth | DS-ARCH-001/002/003 | History services | Decide active guard/active override from runtime managers. | Frontend row state is not authoritative. | UI-only checks could hide live work. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Persist archive state | Run/team metadata stores | Extend | Metadata is durable and already read during listing. | N/A |
| Default history filtering | Agent/team history services | Extend | They already own list rules and active overlay. | N/A |
| Direct archive ID/path safety | Agent/team history services | Extend | Existing delete services already own safe directory checks; archive should adapt that policy before metadata access. | N/A |
| GraphQL archive API | Run-history GraphQL resolver modules | Extend | Matches existing delete/query API boundary. | N/A |
| UI row action | Workspace history components/composable | Extend | Existing terminate/delete action owner. | N/A |
| Frontend state cleanup | `runHistoryStore` + support helpers | Extend | Existing delete cleanup path already owns local state removal. | N/A |
| Archived-list/unarchive UI | No existing archive view | Deferred | Not required for first hide-from-default request. | Future feature can extend query/API. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend run history | Archive/list policy and direct archive ID/path safety for agent and team runs. | DS-ARCH-001/002/003 | Agent/team history services | Extend | No new archive service needed. |
| Metadata persistence | Archive timestamp and optional field preservation. | DS-ARCH-005 | Metadata stores | Extend | Top-level `archivedAt` on agent/team metadata. |
| GraphQL API | Archive mutations and result payloads. | DS-ARCH-001/002 | Resolvers | Extend | Keep explicit agent/team methods. |
| Frontend run history state | Archive actions and local cleanup. | DS-ARCH-004 | `runHistoryStore` | Extend | Reuse row removal helpers. |
| Frontend workspace history UI | Archive button/pending state/toasts. | DS-ARCH-001/002/004 | Panel/composable/section | Extend | Keep delete distinct. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-run-metadata-types.ts` | Metadata persistence | Agent metadata shape | Add optional `archivedAt`. | Existing agent metadata type owner. | N/A |
| `agent-run-metadata-store.ts` | Metadata persistence | Agent metadata store | Normalize/preserve archive and optional fields. | Existing agent metadata persistence owner. | N/A |
| `team-run-metadata-types.ts` | Metadata persistence | Team metadata shape | Add optional `archivedAt`. | Existing team metadata type owner. | N/A |
| `team-run-metadata-store.ts` | Metadata persistence | Team metadata store | Validate/normalize/preserve archive and optional fields. | Existing team metadata persistence owner. | N/A |
| `agent-run-history-service.ts` | Backend run history | Agent history service | Archive API, safe ID/path validation, and default-list filtering. | Existing agent list/delete policy owner. | Metadata type |
| `team-run-history-service.ts` | Backend run history | Team history service | Archive API, safe ID/path validation, and default-list filtering. | Existing team list/delete policy owner. | Metadata type |
| `run-history.ts` | GraphQL API | Agent run history resolver | Add archive mutation/result. | Existing agent run history API owner. | Result payload shape can mirror delete. |
| `team-run-history.ts` | GraphQL API | Team run history resolver | Add archive mutation/result. | Existing team run history API owner. | Result payload shape can mirror delete. |
| `runHistoryMutations.ts` | Frontend GraphQL | Mutation documents | Add archive mutation docs. | Existing run history mutation docs. | N/A |
| `runHistoryTypes.ts` | Frontend run history state | Frontend GraphQL/store types | Add archive mutation result types if manually typed. | Existing run history types owner. | N/A |
| `runHistoryStoreSupport.ts` or local helpers in `runHistoryStore.ts` | Frontend run history state | Local cleanup helpers | Share row/context/selection cleanup used by archive/delete. | Existing support file already hosts row-group helpers. | Row removal helpers |
| `runHistoryStore.ts` | Frontend run history state | Store actions | Add archive actions and call cleanup. | Existing frontend history state boundary. | Mutation docs/result types |
| `useWorkspaceHistoryMutations.ts` | Frontend UI mutations | UI intent owner | Add archive pending/actions/toasts. | Existing row action owner. | N/A |
| `workspaceHistorySectionContracts.ts` | Frontend UI contract | Section/panel contract | Add archive action/pending functions. | Existing boundary contract. | N/A |
| `WorkspaceHistoryWorkspaceSection.vue` | Frontend UI row rendering | Row presentation | Render archive buttons for inactive persisted rows. | Existing row action rendering owner. | Contract |
| `WorkspaceAgentRunsTreePanel.vue` | Frontend UI container | Panel wiring | Wire archive params/state/actions. | Existing history panel wiring owner. | Contract/composable |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Mutation result `{ success, message }` | Existing local GraphQL result classes/types per resolver/store | GraphQL/API boundary | Same shape as delete but separate names keep subject explicit. | Yes | Yes | Generic ambiguous `HistoryMutationResult` if it hides agent/team subject. |
| Frontend local remove/hide cleanup | `runHistoryStore` helper or `runHistoryStoreSupport` helper | Frontend run history state | Archive and delete need identical visible-state cleanup after backend success. | Yes | Yes | UI helper that reaches into stores directly. |
| Archive timestamp normalization | Metadata store-local helper(s) | Metadata persistence | Agent/team metadata stores need same nullable timestamp semantics. | Yes | Yes | Cross-cutting common util unless implementation naturally benefits; local duplication is acceptable if tiny. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `archivedAt` on agent/team metadata | Yes: ISO timestamp when archived, `null`/missing when visible. | Yes | Low | Do not also add `isArchived` unless a later API truly needs it; derive boolean from `archivedAt`. |
| Index rows | Yes: remain list read-model rows only. | Yes | Medium if archive copied into index | Do not add archive authority to index in this slice. |
| GraphQL archive result | Yes: operation success/message. | Yes | Low | Keep operation-specific type names. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` | Metadata persistence | Agent metadata type | Add optional `archivedAt?: string | null`. | Existing type owner. | N/A |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | Metadata persistence | Agent metadata store | Normalize missing/blank `archivedAt` to null; preserve `applicationExecutionContext`; write archive state. | Existing persistence owner. | Archive timestamp semantics. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | Metadata persistence | Team metadata type | Add optional `archivedAt?: string | null`. | Existing type owner. | N/A |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts` | Metadata persistence | Team metadata store | Validate optional `archivedAt`; normalize to null/string; preserve member `applicationExecutionContext`. | Existing persistence owner. | Archive timestamp semantics. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Backend run history | Agent history service | Add `archiveStoredRun`; skip archived inactive metadata during `listRunHistory`; keep active archived rows visible. | Existing agent history policy owner. | Agent metadata. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Backend run history | Team history service | Add `archiveStoredTeamRun`; skip archived inactive metadata during `listTeamRunHistory`; keep active archived teams visible. | Existing team history policy owner. | Team metadata. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | GraphQL API | Agent run-history resolver | Add `ArchiveStoredRunMutationResult` and `archiveStoredRun(runId)`. | Existing API boundary. | Service result shape. |
| `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | GraphQL API | Team run-history resolver | Add `ArchiveStoredTeamRunMutationResult` and `archiveStoredTeamRun(teamRunId)`. | Existing API boundary. | Service result shape. |
| `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | Frontend GraphQL | Mutation docs | Add `ArchiveStoredRun` and `ArchiveStoredTeamRun`. | Existing mutation doc owner. | N/A |
| `autobyteus-web/stores/runHistoryTypes.ts` | Frontend run history | Store types | Add archive mutation data types. | Existing run history type owner. | Result shape. |
| `autobyteus-web/stores/runHistoryStoreSupport.ts` | Frontend run history | State helper | Reuse row removal helpers; optionally add cleanup helper if implementation chooses. | Existing support owner. | Existing removal helpers. |
| `autobyteus-web/stores/runHistoryStore.ts` | Frontend run history | Store actions | Add `archiveRun` and `archiveTeamRun`; cleanup visible state only on success; refresh quietly. | Existing history state owner. | Mutation docs/types. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Frontend UI mutations | UI mutation intent | Add `archivingRunIds`, `archivingTeamIds`, `onArchiveRun`, `onArchiveTeam`, toasts, pending conflict guards. | Existing mutation interaction owner. | N/A |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Frontend UI contract | Panel/section contract | Add archive pending/action callbacks. | Existing contract owner. | N/A |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Frontend UI row rendering | Section presentation | Add archive button for inactive persisted agent/team rows; keep delete button separate. | Existing row owner. | Contract. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Frontend UI container | Panel wiring | Pass archive actions/state to section from composable/store. | Existing wiring owner. | Composable/contract. |
| `autobyteus-web/localization/messages/*/workspace*.ts` | Frontend localization | Translation catalogs | Add archive labels/tooltips as required by localization workflow. | Existing localization owner. | N/A |
| Tests listed in Guidance | Validation | Unit/integration coverage | Add archive/default-filter/non-destructive tests. | Existing test locations map to owners. | Fixtures/mocks. |

## Ownership Boundaries

- The backend archive invariant, including ID/path safety, belongs to agent/team history services, not resolvers, metadata stores, or frontend components.
- Metadata stores should not decide whether a run can be archived; they only persist normalized state.
- `WorkspaceRunHistoryService` should not re-filter archive state because it only receives already-filtered agent/team histories and owns grouping/merge.
- Frontend UI should not hide archived rows permanently on its own; it may remove a row locally after backend success for immediate feedback, then refresh from backend.
- Permanent delete remains a separate destructive boundary. Archive must not call delete APIs, remove directories, or remove index rows.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunHistoryService.archiveStoredRun` | Safe ID/path validation, active guard, metadata read/write, archive timestamp assignment | GraphQL resolver | Resolver/UI writing metadata directly, resolver-only ID validation, or index row removal to hide. | Add service method/result fields or private safety helper. |
| `TeamRunHistoryService.archiveStoredTeamRun` | Safe ID/path validation, team active guard, metadata read/write, archive timestamp assignment | GraphQL resolver | Resolver/UI editing `team_run_metadata.json` directly or resolver-only ID validation. | Add service method/result fields or private safety helper. |
| `AgentRunHistoryService.listRunHistory` / `TeamRunHistoryService.listTeamRunHistory` | Archived inactive filtering and active overlay | `WorkspaceRunHistoryService` | Frontend filtering only, workspace service re-reading metadata. | Extend list service options in a future archived view. |
| `runHistoryStore.archiveRun/archiveTeamRun` | Apollo call and local cleanup | UI mutation composable | Component mutating `workspaceGroups`/contexts directly. | Add store action/helper. |
| Metadata stores | JSON validation/normalization/write | History services and runtime metadata services | Service-level ad hoc JSON file writes. | Add typed metadata store API. |

## Dependency Rules

Allowed:

- UI section -> action callbacks only.
- Panel/composable -> `runHistoryStore` actions and runtime terminate/draft remove actions.
- `runHistoryStore` -> GraphQL mutation docs, context stores, selection store, row removal helpers.
- GraphQL resolvers -> history services.
- History services -> private ID/path safety helpers, metadata stores, runtime managers for active checks, index services for listing/stale cleanup.
- Metadata stores -> filesystem only.

Forbidden:

- UI components must not call archive GraphQL mutations directly.
- Resolvers must not write metadata directly or enforce archive policy themselves, including path-safety policy.
- Archive must not call `deleteStoredRun` / `deleteStoredTeamRun` or remove index rows/directories.
- Archive services must not call metadata store read/write before validating that the normalized ID is a safe base-name identity and the resolved metadata/directory path stays inside the configured root.
- `WorkspaceRunHistoryService` must not depend on metadata stores directly; agent/team services remain the subject-owned list boundaries.
- Do not introduce one generic `archiveRun(id, kind?)` GraphQL mutation with ambiguous identity. Use explicit agent/team mutations.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `archiveStoredRun(runId: String!)` | Agent run history | Non-destructive archive of inactive agent run | Agent `runId` safe base-name string, not absolute/traversal/separator path | Rejects empty/draft/path-unsafe/active/missing metadata before write. |
| `archiveStoredTeamRun(teamRunId: String!)` | Team run history | Non-destructive archive of inactive team run | Team `teamRunId` safe base-name string, not absolute/traversal/separator path | Rejects empty/temp/path-unsafe/active/missing metadata before write. |
| `listWorkspaceRunHistory(limitPerAgent)` | Default visible workspace history | Return visible agent/team histories | Limit per agent | Default excludes archived inactive rows. |
| `runHistoryStore.archiveRun(runId)` | Frontend agent run history state | Call mutation, cleanup visible local state on success | Agent `runId` | Returns boolean. |
| `runHistoryStore.archiveTeamRun(teamRunId)` | Frontend team run history state | Call mutation, cleanup visible local state on success | Team `teamRunId` | Returns boolean. |
| `AgentRunMetadata.archivedAt` | Agent metadata | Durable archive timestamp | ISO string or null/missing | Boolean archived derived from truthiness. |
| `TeamRunMetadata.archivedAt` | Team metadata | Durable archive timestamp | ISO string or null/missing | Boolean archived derived from truthiness. |

Rule:
- Agent run IDs and team run IDs must remain separate API subjects.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `archiveStoredRun` | Yes | Yes | Low | Service-level safety helper must reject path-unsafe IDs before metadata access. |
| `archiveStoredTeamRun` | Yes | Yes | Low | Service-level safety helper must reject path-unsafe IDs before metadata access. |
| `listWorkspaceRunHistory` | Yes for default visible list | Yes | Low | Future archived view should add explicit option/query, not change default unexpectedly. |
| `archivedAt` | Yes | Yes | Low | Do not add parallel `isArchived`. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Agent archive mutation | `archiveStoredRun` | Yes | Low | Mirrors `deleteStoredRun`. |
| Team archive mutation | `archiveStoredTeamRun` | Yes | Low | Mirrors `deleteStoredTeamRun`. |
| Metadata field | `archivedAt` | Yes | Low | Timestamp communicates state and audit moment. |
| UI action | `Archive run` / `Archive team history` | Yes | Low | Use clear tooltip. |

## Applied Patterns (If Any)

- Repository-like metadata stores: continue using metadata stores as persistence boundaries.
- Thin GraphQL facade: resolvers remain transport adapters over service methods.
- Read-model index: existing index files remain read models; archive state is not made index-authoritative.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` | File | Agent metadata | `archivedAt` type. | Existing metadata type. | Archive service logic. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | File | Agent metadata store | Normalize/preserve archive and optional fields. | Existing persistence boundary. | Active guard/list filtering. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-types.ts` | File | Team metadata | `archivedAt` type. | Existing metadata type. | Archive service logic. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-store.ts` | File | Team metadata store | Validate/normalize archive and optional fields. | Existing persistence boundary. | Active guard/list filtering. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | File | Agent run history service | Agent archive command, safe ID/path validation, and default filter. | Existing agent history policy owner. | Team-specific identity handling. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | File | Team run history service | Team archive command, safe ID/path validation, and default filter. | Existing team history policy owner. | Agent-specific identity handling. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | File | Agent run-history GraphQL API | Agent archive mutation. | Existing API file. | Metadata write logic. |
| `autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | File | Team history GraphQL API | Team archive mutation. | Existing API file. | Metadata write logic. |
| `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | File | Frontend GraphQL documents | Archive mutation docs. | Existing mutation docs. | UI state cleanup. |
| `autobyteus-web/stores/runHistoryStore.ts` | File | Frontend history state | Archive actions and cleanup. | Existing state owner. | Row button rendering. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | File | UI row mutation intent | Archive click handling, pending maps, toasts. | Existing UI mutation owner. | Direct Apollo calls. |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | File | Row presentation | Archive buttons/visibility. | Existing row UI. | Backend state policy. |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | File | Panel wiring | Wire archive actions/state. | Existing panel wiring. | Archive policy. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services` | Main-Line Domain-Control | Yes | Low | Existing service folder owns list/delete history policy; archive fits. |
| `autobyteus-server-ts/src/run-history/store` | Persistence-Provider | Yes | Low | Existing metadata/index stores own JSON persistence. |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Low | Resolvers remain thin. |
| `autobyteus-web/stores` | Main-Line Domain-Control (frontend state) | Yes | Medium | `runHistoryStore` is large, but archive fits existing history state responsibility; avoid adding UI policy here. |
| `autobyteus-web/components/workspace/history` | Presentation | Yes | Low | Existing history UI components own buttons/rows. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Archive storage | `metadata.archivedAt = "2026-05-01T12:00:00.000Z"`; default list skips when inactive. | `hiddenRunIds` in localStorage/frontend store only. | Archive must survive refresh/restart. |
| Archive vs delete | `archiveStoredRun` writes metadata only; `deleteStoredRun` deletes directory/index. | `deleteStoredRun({ soft: true })` or index-row removal pretending to be archive. | Keeps destructive and non-destructive operations distinct. |
| Agent/team identity | `archiveStoredRun(runId)` and `archiveStoredTeamRun(teamRunId)`. | `archiveHistory(id)` that guesses subject. | Avoids ambiguous selector boundary. |
| Path-safe identity | `run_abc123` passes service-level base-name + resolved containment checks before metadata read/write. | `../outside`, `/tmp/run`, `foo/bar`, or `foo\bar` reach `metadataStore.writeMetadata`. | Direct GraphQL archive IDs must not influence metadata paths outside the intended roots. |
| Active override | `if (metadata.archivedAt && !isActive) skip; else include`. | Always skip archived even when active. | Avoids hiding live restored work. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Reuse delete mutation with optional soft flag | Might minimize API additions. | Rejected | Add explicit archive mutations; leave delete destructive. |
| Frontend-only hidden IDs | Quick UI-only change. | Rejected | Persist `archivedAt` in backend metadata. |
| Remove index row but keep files | Would hide from current list. | Rejected | Keep index row; filter by metadata so archive remains recoverable. |
| Add parallel `isArchived` plus `archivedAt` | Might simplify boolean checks. | Rejected | Use one semantically tight `archivedAt`; derive archived boolean. |
| Keep metadata normalizers as-is | Smaller code change. | Rejected | Tighten normalizers so archive writes preserve optional metadata. |
| Resolver-only path validation | Might protect current GraphQL calls. | Rejected | Keep path-safety policy in history services so all callers use the same authoritative archive boundary. |
| Metadata-store-only path validation | Might centralize filesystem concerns. | Rejected | Metadata stores may normalize valid IDs, but archive command eligibility and safe identity rejection belongs to history services before metadata access. |

## Derived Layering (If Useful)

- Presentation: `WorkspaceHistoryWorkspaceSection.vue`.
- UI interaction: `useWorkspaceHistoryMutations.ts`.
- Frontend state/API client: `runHistoryStore.ts` and GraphQL documents.
- Transport: GraphQL resolver files.
- Domain/control: agent/team history services.
- Persistence: metadata stores and existing index stores.

Layering follows ownership: callers do not bypass service boundaries to reach metadata stores.

## Migration / Refactor Sequence

1. Backend metadata model and store tightening:
   - Add optional `archivedAt?: string | null` to agent/team metadata types.
   - Normalize missing/blank archive values to `null`.
   - Preserve optional `applicationExecutionContext` fields already declared by metadata types.
   - Add tests for old metadata without `archivedAt`, archive roundtrip, and optional-field preservation.
2. Backend service archive/list behavior:
   - Add `archiveStoredRun` and `archiveStoredTeamRun` result APIs.
   - Add private service-level safe identity/path helpers before metadata read/write, adapting existing delete safe-directory resolution or using equivalent base-name plus resolved-containment checks.
   - Reject empty IDs, draft/temp IDs where applicable, path-unsafe IDs, active runs/teams, and missing metadata.
   - Set `archivedAt` idempotently (existing archived timestamp can remain unchanged or be replaced consistently; prefer keep existing to avoid churn).
   - Filter archived inactive rows from list services before grouping/limit projection; keep active archived rows visible.
   - Add tests for list filtering, active override, active reject, invalid/path-unsafe IDs, no out-of-root metadata writes, and non-destructive archive.
3. GraphQL API:
   - Add archive result types/mutations in resolver files.
   - Add frontend mutation docs and generated types if required.
4. Frontend store:
   - Add `archiveRun` / `archiveTeamRun` actions.
   - Share cleanup policy with delete success path: remove visible row, remove cached resume config, remove local inactive context, clear selection when selected, refresh quietly.
   - Add success/failure tests.
5. Frontend UI:
   - Extend section contract and mutation composable with archive pending/actions.
   - Render archive icon for inactive persisted rows; keep draft remove, active stop, and permanent delete behavior distinct.
   - Add panel tests for visibility, click dispatch, no row selection, toasts, failure path.
6. Localization/codegen/verification:
   - Add archive labels to localization catalogs/generation as repository workflow requires.
   - Run targeted backend and frontend tests; run typecheck/codegen where practical.

## Key Tradeoffs

- Metadata vs index for archive state:
  - Chosen: metadata. It is durable per run/team and survives index rebuilds.
  - Tradeoff: list already reads metadata, so no meaningful extra I/O in current path. Future archived list can reuse same state.
- No archived view in first slice:
  - Chosen: defer to keep scope aligned with user request to hide from current list.
  - Tradeoff: accidental archive has no UI undo. Data remains on disk, and the storage model supports follow-up unarchive.
- Separate agent/team mutations:
  - Chosen: explicit boundaries.
  - Tradeoff: slightly more code than a generic mutation, but avoids ambiguous IDs and follows existing delete split.
- Active archived rows visible while active:
  - Chosen: prevents hidden live work and active recovery gaps.
  - Tradeoff: a directly restored archived run may temporarily appear while active, then hide again once inactive.

## Risks

- UI action density: Inactive rows may show both archive and trash on hover. Use distinct archive-box icon/title and keep compact hover opacity.
- Metadata write regression: Archive writes must not drop optional metadata fields. Tests should lock this down.
- Codegen drift: If checked-in GraphQL generated files are required, update them or document why not.
- Product expectation: User may expect an Archive folder/unarchive. This is explicitly follow-up unless scope expands.

## Guidance For Implementation

Suggested test inventory:

Backend:

- `autobyteus-server-ts/tests/unit/run-history/store/agent-run-metadata-store.test.ts`
  - missing `archivedAt` defaults to `null`/visible.
  - roundtrip preserves `archivedAt` and `applicationExecutionContext`.
- `autobyteus-server-ts/tests/unit/run-history/store/team-run-metadata-store.test.ts`
  - missing `archivedAt` defaults visible.
  - roundtrip preserves `archivedAt` and member `applicationExecutionContext`.
- `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-service.test.ts`
  - `archiveStoredRun` writes metadata, does not delete directory, does not remove index row.
  - rejects active run.
  - rejects invalid/path-unsafe IDs such as `../outside`, `/tmp/outside`, `foo/bar`, and `foo\bar`; assert `success=false` and no out-of-root metadata file is created.
  - list filters archived inactive rows and keeps active archived row visible.
- `autobyteus-server-ts/tests/unit/run-history/services/team-run-history-service.test.ts`
  - equivalent team archive/filter tests, including invalid/path-unsafe team IDs and no out-of-root metadata writes.
- Resolver/API tests or e2e schema tests for archive mutations if existing patterns allow.

Frontend:

- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts`
  - `archiveRun` success cleanup mirrors delete visible-state cleanup but calls archive mutation.
  - failure leaves row/context/selection unchanged.
  - rejects draft IDs without mutation.
  - `archiveTeamRun` success/failure cleanup.
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
  - archive action appears for inactive persisted agent/team rows.
  - archive action does not appear for active/draft rows.
  - clicking archive calls archive store action and does not select row.
  - success/failure toasts.
  - permanent delete button and confirmation still work.

Implementation cautions:

- Do not delete or move filesystem memory for archive.
- Do not call metadata store read/write from archive commands until the history service validates the supplied ID as path-safe.
- Do not remove index rows for archive.
- Do not add `isArchived` parallel state unless a future API requires it; derive from `archivedAt`.
- Keep result messages human-readable and stable enough for tests to check success/failure semantics without overfitting full copy.
- Prefer backend filtering before per-agent `limitPerAgent` slicing so archived rows do not consume visible result slots.
