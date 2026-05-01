# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The frontend history/sidebar currently shows many historical agent and agent-team runs. Existing row actions support termination for active runs and permanent removal for inactive persisted runs; removal deletes the run memory/history from disk. Add a separate, non-destructive archive capability so users can declutter the default history view without deleting stored run memory.

Archived runs must no longer appear in the default history/sidebar list shown in the screenshots. The existing permanent delete/remove behavior must remain distinct and still delete stored memory when explicitly used.

## Investigation Findings

- The visible history list is rendered by `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` and `WorkspaceHistoryWorkspaceSection.vue`.
- Row mutation orchestration lives in `autobyteus-web/composables/useWorkspaceHistoryMutations.ts`; it already separates draft removal, runtime termination, and permanent delete intent.
- Frontend durable history state lives in `autobyteus-web/stores/runHistoryStore.ts`, backed by GraphQL operations in `autobyteus-web/graphql/queries/runHistoryQueries.ts` and `autobyteus-web/graphql/mutations/runHistoryMutations.ts`.
- Backend default history listing enters through `RunHistoryResolver.listWorkspaceRunHistory` -> `WorkspaceRunHistoryService.listWorkspaceRunHistory` -> `AgentRunHistoryService.listRunHistory` and `TeamRunHistoryService.listTeamRunHistory`.
- Permanent delete is already implemented as `deleteStoredRun` / `deleteStoredTeamRun`; these delete the underlying run/team directory and remove the index row.
- Agent and team history services already read metadata for each indexed row while listing. That makes metadata a good authoritative place for non-destructive `archivedAt` visibility state; the index can remain a read model and does not need to drop archived rows.
- Metadata stores currently normalize persisted metadata. Because archive writes metadata, the implementation must preserve unrelated optional metadata fields while adding archive state, rather than accidentally losing them during write normalization.
- Direct archive mutations accept user-supplied IDs and would cause metadata path reads/writes. The archive services must reject invalid/path-unsafe IDs before metadata access, adapting the existing safe directory-resolution pattern used by permanent delete or using an equivalent service-level metadata path safety check.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, narrow shared-structure tightening needed.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing invariant plus shared structure looseness.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely needed, but bounded.
- Evidence basis: Archive requires a persisted non-destructive visibility state. Current index rows contain only status/delete lifecycle; metadata stores are the durable per-run source read during listing. Adding a metadata write for archive would pass through current metadata normalization, so archive state and unrelated optional metadata must be explicitly preserved. Because archive mutations are directly callable GraphQL APIs and metadata paths are derived from supplied IDs, history services must also own path-safe identity validation before metadata read/write.
- Requirement or scope impact: The implementation should add archive state to agent/team metadata and filter default history lists at backend boundaries, rather than removing rows from the index or only hiding rows locally in the frontend.

## Recommendations

- Implement archive as a persisted `archivedAt: string | null` metadata field for both agent runs and team runs.
- Keep permanent delete/remove unchanged and visibly distinct from archive.
- Add explicit GraphQL mutations: `archiveStoredRun(runId)` and `archiveStoredTeamRun(teamRunId)`.
- Reject archive requests for active runs/teams at backend boundaries; the frontend should only render archive actions for inactive persisted rows.
- Reject invalid/path-unsafe archive IDs in `AgentRunHistoryService` and `TeamRunHistoryService` before metadata read/write.
- Default history listing should exclude archived inactive runs/teams before grouping/limit projection. If an archived run/team somehow becomes active again by direct restore/resume, show it while active so active runtime recovery is not hidden.
- Do not remove index rows or memory directories during archive.
- Do not add an archived-list/unarchive UI in this first slice unless the product scope is expanded; archive view and unarchive can be follow-up work.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

Reason: the change spans backend metadata/storage normalization, backend history services, GraphQL API, frontend store, UI row actions, localization, and tests for both agent and team history flows.

## In-Scope Use Cases

- UC-ARCH-001: A user archives an inactive persisted agent run from the history/sidebar row action. The row disappears from the default list, but run memory remains on disk.
- UC-ARCH-002: A user archives an inactive persisted agent-team run from the history/sidebar row action. The row disappears from the default list, but team/member run memory remains on disk.
- UC-ARCH-003: Archived inactive agent/team runs are excluded from the default `listWorkspaceRunHistory` response and therefore from workspace/team/agent counts in the sidebar.
- UC-ARCH-004: Active agent/team runs cannot be archived. The backend rejects such attempts, and the frontend does not render archive actions for active rows.
- UC-ARCH-005: Permanent delete remains available for inactive persisted rows and continues to delete stored memory after confirmation.
- UC-ARCH-006: Archiving the currently selected inactive history run/team clears local selection/context state so the hidden row is not still selected/open in the UI.
- UC-ARCH-007: Archive failures do not mutate frontend state; the row remains visible and an error toast is shown.

## Out of Scope

- Archived history browser/list/filter UI.
- Unarchive/restore-from-archive UI.
- Automatic retention policies or bulk archive.
- Changing permanent delete semantics.
- Archiving draft (`temp-*`) rows; drafts continue to use local remove/discard behavior.
- Moving archived run files to a separate filesystem directory.

## Functional Requirements

- FR-ARCH-001: The system must persist non-destructive archive state for agent runs independently of permanent deletion.
- FR-ARCH-002: The system must persist non-destructive archive state for agent-team runs independently of permanent deletion.
- FR-ARCH-003: The default workspace run-history query must exclude archived inactive agent runs and archived inactive team runs.
- FR-ARCH-004: The archive operation must not delete run/team memory directories, raw traces, projections, metadata, or index rows.
- FR-ARCH-005: The archive operation must reject active agent runs and active team runs.
- FR-ARCH-006: The frontend must expose an archive action for inactive persisted agent runs and inactive persisted team runs.
- FR-ARCH-007: The frontend must not expose archive actions for active rows or draft rows.
- FR-ARCH-008: The frontend must keep permanent delete/remove as a separate action with existing confirmation/destructive semantics.
- FR-ARCH-009: Successful archive must optimistically/practically remove the row from current visible frontend history state and then refresh quietly from the backend.
- FR-ARCH-010: Failed archive must leave visible frontend history and selected/open context unchanged.
- FR-ARCH-011: Metadata normalization must preserve archive state and unrelated optional metadata fields when metadata is read/written.
- FR-ARCH-012: Archive commands must reject invalid/path-unsafe run IDs and team run IDs before any metadata read/write.

## Acceptance Criteria

- AC-ARCH-001: Given an inactive persisted agent run exists in history, when the user clicks archive, the frontend calls the archive mutation, shows a success toast on success, and the run disappears from the default sidebar/history list.
- AC-ARCH-002: Given the same archived agent run, when inspecting the run memory directory on disk, its stored memory files and metadata still exist.
- AC-ARCH-003: Given an inactive persisted team run exists in history, when the user clicks archive, the frontend calls the team archive mutation, shows a success toast on success, and the team run disappears from the default sidebar/history list.
- AC-ARCH-004: Given the same archived team run, when inspecting the team run directory on disk, team metadata and member run memory still exist.
- AC-ARCH-005: Given an archived inactive agent/team run has an index row, when `listWorkspaceRunHistory` runs, that archived row is not returned and does not count toward agent/team group counts.
- AC-ARCH-006: Given an active run/team, the frontend shows terminate/stop behavior rather than archive, and a direct backend archive mutation returns `success=false` without writing archive state.
- AC-ARCH-007: Given an archive mutation fails or returns `success=false`, the frontend row remains in place, the current selection remains unchanged, and an error toast is shown.
- AC-ARCH-008: Given a selected inactive historical agent/team run is archived successfully, local context/selection state for that run is cleared and no hidden row remains selected.
- AC-ARCH-009: Given an inactive persisted row, the permanent delete action is still available separately and still uses the existing confirmation path.
- AC-ARCH-010: Existing metadata files without `archivedAt` read as visible/unarchived.
- AC-ARCH-011: Given direct archive mutations with empty, traversal-like, absolute, or path-separator IDs, the backend returns `success=false`, performs no metadata write, and creates no files outside the configured run/team metadata roots.

## Constraints / Dependencies

- Use existing dedicated task branch/worktree `codex/archive-run-history`.
- Backend history storage is file-based under the configured memory directory.
- The default frontend query is `ListWorkspaceRunHistory`; changing its default behavior to hide archived rows should not require a new query for this first slice.
- Active state truth comes from `AgentRunManager` and `AgentTeamRunManager`, not from frontend row status alone.
- Archive ID/path safety must be enforced in history services, not only in resolvers, UI, or metadata stores.
- GraphQL generated artifacts may need refresh if codegen is part of repository practice.
- Localization guard expects new user-facing strings to be represented in the localization catalogs/generated files.

## Assumptions

- The first version only needs to hide archived rows from the default history list; archived browsing/unarchive UI can be a follow-up.
- Archive should be quick and non-destructive; it does not require the irreversible-delete confirmation copy.
- Existing permanent delete remains for users who explicitly want to delete stored memory.
- If an archived run/team is later active through a direct restore/resume path, the default list may show it while active to avoid hiding live work; when inactive again it can remain archived/hidden.

## Risks / Open Questions

- Product follow-up: users may later need an archived view and unarchive action. This is intentionally out of scope but should be straightforward because archive state is durable and non-destructive.
- UI density: inactive rows will have both archive and delete affordances. The implementation should keep hover-only compact styling and clear titles/icons.
- Metadata normalization currently drops some optional fields; implementation must preserve unrelated optional metadata during archive writes to avoid accidental data loss.
- Path-unsafe ID handling is security-sensitive; implementation must test direct archive API calls with traversal/absolute/separator IDs and prove no out-of-root metadata write occurs.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| FR-ARCH-001 | UC-ARCH-001, UC-ARCH-003 |
| FR-ARCH-002 | UC-ARCH-002, UC-ARCH-003 |
| FR-ARCH-003 | UC-ARCH-003 |
| FR-ARCH-004 | UC-ARCH-001, UC-ARCH-002 |
| FR-ARCH-005 | UC-ARCH-004 |
| FR-ARCH-006 | UC-ARCH-001, UC-ARCH-002 |
| FR-ARCH-007 | UC-ARCH-004 |
| FR-ARCH-008 | UC-ARCH-005 |
| FR-ARCH-009 | UC-ARCH-001, UC-ARCH-002, UC-ARCH-006 |
| FR-ARCH-010 | UC-ARCH-007 |
| FR-ARCH-011 | UC-ARCH-001, UC-ARCH-002 |
| FR-ARCH-012 | UC-ARCH-004, UC-ARCH-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-ARCH-001 | Agent archive happy path from UI through backend and refreshed list. |
| AC-ARCH-002 | Agent archive is non-destructive on disk. |
| AC-ARCH-003 | Team archive happy path from UI through backend and refreshed list. |
| AC-ARCH-004 | Team archive is non-destructive on disk. |
| AC-ARCH-005 | Backend default listing is authoritative for hiding archived rows. |
| AC-ARCH-006 | Active-run guard is enforced both in UI and backend. |
| AC-ARCH-007 | Archive failure path does not hide rows locally. |
| AC-ARCH-008 | Selected/open hidden row cleanup works. |
| AC-ARCH-009 | Archive does not replace or weaken permanent delete semantics. |
| AC-ARCH-010 | Existing persisted history remains visible unless explicitly archived. |
| AC-ARCH-011 | Direct archive API path-safety guard prevents unsafe metadata access/writes. |

## Approval Status

Requirements inferred as design-ready from the user request. No separate interactive approval was captured in this default-mode run; the only product-scope assumption is that archived-view/unarchive UI is a follow-up, not part of this first archive/hide slice.
