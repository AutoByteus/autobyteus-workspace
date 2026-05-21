# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined and approved for revised design direction on 2026-05-21 after user clarified that normal source code must keep `run_history_index.json` as the fast history catalog, must not scan all metadata directories during routine history listing, and should use the existing startup-once app-data migration framework for V1→V2 data migration.

## Goal / Problem Statement

Autobyteus currently persists standalone run resume/config data in `memory/agents/<runId>/run_metadata.json` and also persists the frontend history list in `memory/run_history_index.json`. The original product reason for the index remains valid: after restart, the frontend should render history quickly without reading every full metadata/config file or raw trace.

The reported old-Mac bug happened because the index can lose rows even though metadata directories exist. The root problem is not simply that the application needs to scan metadata on startup. If source code always scans all metadata to repair the index, the index loses its purpose. The better target is to keep the index, but make it a clean, low-write, single-owner history catalog.

The fix must:

- stop writing runtime/activity state into the history index;
- update the index only for meaningful catalog changes;
- serialize the full semantic catalog mutation, not only the physical JSON write;
- remove direct index writers outside the catalog boundary;
- keep full metadata scanning out of normal history/list source paths and run it only inside the existing app-data migration framework, with optional script/docs for manual retry or operator repair.

## Investigation Findings

- `run_history_index.json` was designed to make frontend history listing fast.
- Current code updates the index too often: create/prepare, activation/restore, each accepted activity, status changes, termination, summary recovery, deletion, and rebuild.
- The index stores `lastActivityAt` and `lastKnownStatus`, which make frequent writes look necessary even though they provide little durable value.
- `AgentRunHistoryIndexStore` has atomic-ish temp+rename writes but physical atomic writes do not protect against stale read-modify-write conflicts across semantic operations.
- A direct cleanup script rewrites `run_history_index.json` without using the index store/catalog boundary.
- `activationState` persists transient process states such as `ACTIVATING` and `ACTIVATION_FAILED`; these are not durable facts.
- Live status is already available from runtime managers, command overlays, and streams; it should not be saved in history files.

## Core Status Persistence Principle

Live runtime status must not be persisted to disk. After server restart, a historical run is not active merely because a file says it was previously active. Resume uses `run_metadata.json` config to recreate runtime. Frontend status and controls use derived live state.

Durable standalone storage responsibilities:

- `run_metadata.json`: resume/config and prepared/start facts;
- `run_history_index.json`: fast standalone history catalog fields;
- runtime managers/command overlays: live status.

## Design Health Assessment (Mandatory)

- Change posture: Bug fix with architecture refactor and cleanup.
- Current design issue found: Yes.
- Root cause classification: Boundary/ownership issue, duplicated policy/coordination, shared structure looseness.
- Refactor needed now: Yes, bounded to standalone run-history index ownership and persisted field simplification.
- Evidence basis: Source audit of run-history services/stores, lifecycle services, status projection, frontend run-history stores/components, cleanup script, and design-review feedback.
- Design impact from review/user clarification: revised target keeps the history index as the normal list source and moves full metadata scan repair out of the normal history-list source path into the startup-once app-data migration framework, with optional scripts only for fallback diagnostics.

## Recommendations

1. Keep `run_history_index.json` as the steady-state standalone history catalog.
2. Do not scan all metadata directories during normal history listing or catalog initialization for automatic repair; the startup app-data migration is the only automatic full-scan boundary.
3. Add a new `AppDataMigrationDefinition` for run-history index V2 migration, register it as `requiredOnStartup`, and record completion in `app_data_migration_records`; keep optional script/docs only as manual fallback or operator repair.
4. Simplify index row fields to `runId`, `agentDefinitionId`, `agentName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, and `terminatedAt`.
5. Remove `lastActivityAt`, `lastKnownStatus`, and `activationState` from the standalone index and metadata target.
6. Keep `run_metadata.json` focused on resume/config and prepared/start facts.
7. Add `AgentRunHistoryCatalogService` as the only semantic standalone index mutation owner.
8. Serialize the whole catalog mutation: initialization barrier, current row read, merge, any needed metadata mutation, in-memory catalog update, and atomic index flush.
9. Retarget lifecycle services and cleanup scripts so they do not directly write the index.
10. Scope API/frontend cleanup to standalone history items while team-run history fields remain deferred.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- U-001: Creating/preparing a new standalone run writes both metadata/config and a V2 history index row through one catalog boundary.
- U-002: Runtime activation/restore/activity no longer writes live status or activity timestamps to the index.
- U-003: History listing reads the V2 index/in-memory catalog and overlays live status without scanning all metadata.
- U-004: Archive/unarchive/terminate/delete/cancel update catalog rows through safe, serialized catalog methods.
- U-005: Existing legacy/partial indexes are migrated by a startup-once app-data migration that scans metadata and writes V2 index rows; optional manual repair remains available for retries/diagnostics.
- U-006: Standalone API/frontend fields are simplified without breaking team-run history fields.

## Out of Scope

- Automatic source-code repair during normal history listing.
- Replacing file storage with a database.
- Full team-run history refactor.
- Persistent historical failure-message UX for runs.
- Cross-process locking unless evidence shows multiple server processes normally share one memory dir.

## Functional Requirements

- FR-001: Normal standalone run-history listing must use `run_history_index.json`/in-memory catalog as the history-list source and must not scan all metadata directories for routine repair.
- FR-002: A startup-once app-data migration must scan `memory/agents/*/run_metadata.json` and migrate/repair `run_history_index.json` to V2 when the migration has not already succeeded for this app-data database.
- FR-003: The V2 standalone index row must include `runId`, `agentDefinitionId`, `agentName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, and `terminatedAt`.
- FR-004: The V2 standalone index must not include `lastActivityAt`, `lastKnownStatus`, `activationState`, or a file-level `version` attribute.
- FR-005: Standalone metadata must retain resume/config fields required for restore: `runId`, `agentDefinitionId`, `workspaceRootPath`, `memoryDir`, `runtimeKind`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `skillAccessMode`, `platformAgentRunId`, and `applicationExecutionContext` where applicable.
- FR-006: Standalone metadata may retain prepared/start facts (`preparedAt`, `preparedExpiresAt`, `startedAt`) but must not persist transient `ACTIVATING` or `ACTIVATION_FAILED`.
- FR-007: `AgentRunHistoryCatalogService` must be the only normal source-code owner of standalone index mutations.
- FR-008: Catalog mutations must be serialized at semantic-operation level, covering read/merge/write and in-memory catalog updates, not only physical JSON writes.
- FR-009: Index writes must occur only for meaningful catalog changes: create/prepared run, first/explicit summary/title change, archive/unarchive, terminate, delete/cancel, and explicit migration/repair.
- FR-010: Ordinary message activity and live status transitions must not write `run_history_index.json`.
- FR-011: `terminatedAt` is a catalog lifecycle fact and must not block resume by itself.
- FR-012: Cleanup scripts must not bypass safe index/catalog mutation rules.
- FR-013: Standalone GraphQL/frontend history item shape must remove `lastActivityAt`/`lastKnownStatus` and use `createdAt` plus derived live status.
- FR-014: Team-run GraphQL/frontend history fields must remain current/deferred unless a separate team refactor is explicitly added.

## Acceptance Criteria

- AC-001: Given normal history listing, the backend reads the V2 index/in-memory catalog and does not scan all metadata directories.
- AC-002: Given normal message activity after summary exists, no index write occurs solely for activity/status.
- AC-003: Given concurrent catalog mutations in one server process, the semantic queue prevents stale read-modify-write lost updates.
- AC-004: Given a new prepared run, success is not reported until metadata/config and index row are both committed; normal write failure rolls back newly-created metadata.
- AC-005: Given termination, the V2 index row records `terminatedAt`; later resume is still allowed from metadata/config.
- AC-006: Given archive/unarchive/delete/cancel requests, run IDs are validated for safe identity/path containment inside the catalog boundary.
- AC-007: Given legacy data with metadata directories missing index rows, the app-data migration runs once at startup, records its result, and writes a repaired V2 index; a failed/warning migration can be retried through the existing migration UI/runner.
- AC-008: Given legacy metadata lacks `createdAt`, the app-data migration derives it deterministically and reports last-resort fallbacks in the migration summary/log.
- AC-009: Source schemas and new persisted standalone writes no longer include durable `lastKnownStatus`, `lastActivityAt`, `ACTIVATING`, `ACTIVATION_FAILED`, or standalone index `version`.
- AC-010: Standalone frontend history uses `createdAt` ordering and derived status; team history continues to work with existing team fields.

## Constraints / Dependencies

- Existing user memory directories must be preserved.
- The index remains a file-based JSON catalog.
- The app-data migration must create a backup before writing the V2 index and record details in the migration summary/log. Any optional standalone repair script should be dry-run by default.
- Tests must use isolated temporary memory directories.

## Assumptions

- Reading one compact index file is materially faster and simpler for normal frontend history than reading all metadata files on every startup/list.
- Index write frequency is the main practical source of the reported fragility; removing live/activity writes and serializing semantic mutations substantially reduces risk.
- A tiny crash window across metadata/index multi-file operations remains acceptable with app-data migration/manual repair support; fully eliminating it would require a database or journal out of scope.

## Risks / Open Questions

- OQ-001: Whether process crashes during the small create/delete cross-file window need a stronger journal in a future task.
- OQ-002: Whether team-run history should receive the same cleanup in the next refactor.
- OQ-003: Whether future history scale requires moving from JSON index to SQLite or another transactional catalog.

## Requirement-To-Use-Case Coverage

- U-001: FR-003, FR-005, FR-007, FR-008; AC-004
- U-002: FR-004, FR-006, FR-009, FR-010; AC-002, AC-009
- U-003: FR-001; AC-001
- U-004: FR-007, FR-008, FR-011, FR-012; AC-003, AC-005, AC-006
- U-005: FR-002; AC-007, AC-008
- U-006: FR-013, FR-014; AC-010

## Acceptance-Criteria-To-Scenario Intent

- AC-001 preserves the performance purpose of the index.
- AC-002 validates that frequent activity no longer rewrites the global file.
- AC-003 validates semantic serialization beyond atomic physical writes.
- AC-004 validates that successful new runs are visible in history under normal failures.
- AC-005 validates that termination is not a persisted live-status block.
- AC-006 validates safe filesystem mutation ownership.
- AC-007/AC-008 validate startup-once app-data migration repair outside the normal history-list path.
- AC-009 validates schema simplification.
- AC-010 validates standalone/team API coexistence.

## Approval Status

Approved for revised design direction on 2026-05-21. Final implementation still requires architecture review approval.
