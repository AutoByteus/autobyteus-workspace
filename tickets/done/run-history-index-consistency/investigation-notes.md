# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated worktree and branch created from refreshed `origin/personal`.
- Current Status: Requirements approved for design on 2026-05-21. Design principles reloaded; design spec produced for architecture review.
- Investigation Goal: Locate every writer/reader/reconciler of `run_history_index.json`, determine whether index writes are atomic and serialized, identify why persisted Codex run directories can be absent from the frontend run list, and audit whether persisted runtime/status attributes actually provide backend/frontend value.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The bug crosses runtime lifecycle persistence, file-store consistency, backend run-history listing, maintenance scripts, logging, and regression tests. It does not require a frontend redesign if backend history data is corrected.
- Scope Summary: Replace the fragile frequently-updated global-index design with a low-write, single-owner standalone history index catalog; keep metadata focused on resume/config; simplify persisted status/lifecycle fields to durable catalog facts only.
- Primary Questions To Resolve:
  - Which code path creates `agents/<runId>/run_metadata.json`? Resolved.
  - Which code paths insert/update/delete/read `run_history_index.json`? Resolved for source and maintenance script.
  - Are writes atomic and protected against concurrent stale read-modify-write? Partially; temp+rename per store instance, no global queue, no fsync, direct script bypass.
  - When is an ACTIVE run first inserted into the index? It is inserted as IDLE on prepare, then upserted ACTIVE on activation/restore/activity if those steps complete.
  - Is there startup/load-time reconciliation against agent folders? Only empty-index rebuild on list; partial indexes are not reconciled.
  - What tests already cover run-history projection/index consistency? Existing tests cover empty rebuild and same-store updates, not partial-index repair or multi-store concurrent writes.
  - Which persisted metadata/index attributes are actual durable facts versus runtime/display shadows? Resolved for standalone metadata/index; team/index and application `lastFailure` assessed for adjacent cleanup pressure.

## Request Context

User provided an old-Mac incident report dated 2026-05-19. For workspace `/Users/ryan-zheng/learning/normy_projects/german_speaking_practice_B2`, four Codex run directories existed on disk but `run_history_index.json` contained only two rows. The missing run IDs were `d32cbae0-b6c5-480b-ae45-d2de889ef0a4` and `89216683-25fe-444e-9345-4880f0614b6a`. Local data repair added the two rows and verified four indexed Codex runs. The user asked to analyze why and specifically inspect all places modifying index files and the atomicity of those operations.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency`
- Current Branch: `codex/run-history-index-consistency`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-20 before worktree creation; worktree fast-forwarded to current `origin/personal` on 2026-05-21 before architecture handoff.
- Task Branch: `codex/run-history-index-consistency` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifacts for this task live in the dedicated worktree above, not the user's original `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-20 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap current repository context | Current checkout was Git repo on branch `personal` tracking `origin/personal`; no working tree changes reported. | No |
| 2026-05-20 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree | Fetch completed successfully. | No |
| 2026-05-20 | Command | `git worktree add -b codex/run-history-index-consistency /Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency origin/personal` | Create dedicated ticket branch/worktree | Worktree created at HEAD `96703369b8fa54e6b2fef736f33d0d9339de6321`. | No |
| 2026-05-20 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design guidance read | Design must identify data-flow spine, authoritative boundary, atomicity/serialization ownership, and avoid fragmented writers. | No |
| 2026-05-20 | Command | `rg -n "run_history_index|RunHistoryIndex|recordRunCreated|recordRunActivity|rebuildIndexFromDisk" ...` | Find index readers/writers and lifecycle update paths | Relevant source lives under `autobyteus-server-ts/src/run-history` and `autobyteus-server-ts/src/agent-execution`; one maintenance script writes the file directly. | No |
| 2026-05-20 | Code | `autobyteus-server-ts/src/run-history/store/agent-run-history-index-store.ts` | Audit atomicity and mutation mechanics | Uses per-instance `writeQueue`; `upsertRow`, `updateRow`, `mutateRow`, `removeRow` read current file then write temp+rename. No global/per-file queue, no fsync, no temp cleanup on failure. | Design stronger store boundary. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | Audit index service behavior and rebuild | `recordRunCreated`, `recordRunRestored`, and activity with metadata upsert rows. `recordRunTerminated` only updates existing row. `rebuildIndexFromDisk` scans all run dirs but is a full rewrite. | Superseded design direction: keep the index as steady-state catalog, remove high-frequency writes, and move scan/rebuild to the startup-once app-data migration framework with optional script fallback. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Audit list source used by frontend | `listRunHistory` calls `rebuildIndexFromDisk` only when rows length is zero. Partial non-empty index is treated as authoritative and missing rows stay hidden. | Revised direction: normal history-list source should use a V2 index catalog; legacy partial indexes are repaired by startup-once app-data migration, not list-time automatic metadata scan. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` and `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Confirm frontend list path | `listWorkspaceRunHistory` uses `WorkspaceRunHistoryService`, which calls `AgentRunHistoryService.listRunHistory`. | Backend fix should surface in UI. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Audit creation/activation sequence | `prepareAgentRun` writes metadata then index row. `activatePreparedRun` writes ACTIVATING metadata, creates runtime, writes ACTIVATED metadata, then upserts index. Crash/failure between metadata and index leaves durable metadata without row. | Remove dual write; update one per-run record/catalog boundary. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Audit restore/activity/termination sequence | Restore/activity/termination write metadata before index update. Termination update is no-op if row missing. | Update index catalog facts and terminal facts through one catalog authority. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts` | Check message path activity writes | After `activeRun.postUserMessage` accepts, coordinator awaits `agentRunService.recordRunActivity`. If that index write fails, command can be marked failed after runtime accepted. | Store hardening reduces false command failures. |
| 2026-05-20 | Code | `autobyteus-server-ts/scripts/cleanup-codex-e2e-run-history.mjs` | Find direct non-service writers | Script reads index, filters rows, removes run dirs, then rewrites index with direct `fs.writeFile`; bypasses temp+rename queue. | Remove direct legacy-index writer or retarget script to authoritative per-run storage. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/run-history/store/team-run-history-index-store.ts` | Check analogous team index pattern | Team index store has the same per-instance queue and temp+rename pattern. User-reported bug is standalone agent index, but shared atomic writer could harden both. | Optional extension/follow-up. |
| 2026-05-20 | Test | `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-service.test.ts` | Inspect current coverage | Has test for empty index rebuild only; no non-empty partial repair case. | Add regression test. |
| 2026-05-20 | Test | `autobyteus-server-ts/tests/unit/run-history/store/agent-run-history-index-store.test.ts` and `agent-run-history-index-service.test.ts` | Inspect store/index service coverage | Same-store upsert/update and summary ordering covered; multi-store concurrency not covered. | Add multi-store concurrent mutation test. |
| 2026-05-20 | Command | `rg -n "lastKnownStatus|activationState|lastFailure|preparedAt|preparedExpiresAt|ACTIVATING|ACTIVATION_FAILED|deleteLifecycle" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web` | Audit all current uses of questioned status/lifecycle/failure fields | `lastKnownStatus` is widespread in run history API/types/tests but backend status projection already derives live status from overlay/runtime; `activationState` is used for prepared workflow and restore gating; `lastFailure` is not in run metadata/index and belongs to application engine status. | Use evidence to tighten durable field model. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` and `agent-run-metadata-store.ts` | Enumerate standalone metadata attributes and normalization | Metadata currently stores resume config plus `lastKnownStatus`, `activationState`, `preparedAt`, `preparedExpiresAt`, `archivedAt`, `applicationExecutionContext`. Store normalizes missing `activationState` to `ACTIVATED` and missing `lastKnownStatus` to `IDLE`. | Replace status enum with durable lifecycle facts. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts` | Determine whether persisted status drives live UI status | Projection precedence is command overlay, active runtime, metadata fallback. This proves active/running state is already derived; persisted `ACTIVE` is not authoritative. | Remove durable `ACTIVE`/`IDLE` status storage. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Audit `activationState` lifecycle value | `PREPARED` supports frontend prepared identity; `ACTIVATING` is persisted before runtime creation and can wedge a run after crash; `ACTIVATION_FAILED` is persisted only as failed attempt/retry signal. | Replace enum with `preparedAt`/`preparedExpiresAt`/`startedAt`/`terminatedAt` facts and in-memory activation lock. |
| 2026-05-20 | Code | `autobyteus-web/stores/agentRunStore.ts` and `graphql/mutations/agentMutations.ts` | Confirm frontend dependency on prepared identity | Frontend prepares a permanent run id, promotes temp context, finalizes attachments, connects WebSocket, then sends first message. Prepared identity has product value even if enum representation is bad. | Preserve prepared identity concept unless UX is redesigned; simplify persisted representation. |
| 2026-05-20 | Code | `autobyteus-web/stores/runHistoryReadModel.ts`, `runHistoryStore.ts`, `utils/runTreeProjection.ts`, `utils/runTreeLiveStatusMerge.ts`, `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`, `composables/mobile/useMobileWorkCatalog.ts` | Audit frontend value of `lastKnownStatus` | Main history UI visual status/actions use derived `currentStatus`/`isActive`; `lastKnownStatus` is mostly copied/normalized or used for labels that can be derived from status. | Frontend should not force durable `lastKnownStatus` storage. |
| 2026-05-20 | Code | `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts`, `autobyteus-web/stores/applicationHostStore.ts`, `ApplicationShell.vue` | Answer user question about `lastFailure` | Existing `lastFailure` belongs to application engine status, not run history. It is used to show backend launch/worker failure reason. It should not be added to run metadata as part of this fix. | Keep out of run-history schema unless separate product requirement emerges. |
| 2026-05-20 | Doc Artifact | `tickets/done/run-history-index-consistency/persisted-attribute-audit.md` | Durable field audit | Classified standalone metadata/index fields, team metadata/index fields, activation states, `lastKnownStatus`, and adjacent `lastFailure`. | Feed requirements and design spec. |
| 2026-05-21 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` and `templates/design-spec-template.md` | Reload design principles and mandatory design structure before writing final design | Reinforced authoritative-boundary rule, data-flow spine inventory, removal/decommission plan, and no legacy dual-path behavior. | No |
| 2026-05-21 | Doc Artifact | `tickets/done/run-history-index-consistency/design-spec.md` | Target design production | Defines `AgentRunHistoryCatalogService`, simplified metadata/index V2 shapes, index-cache demotion, lifecycle field removal, migration sequence, and implementation guidance. | Architecture review. |
| 2026-05-21 | Command | `git merge --ff-only origin/personal` in task worktree | Refresh task branch against latest tracked base before handoff | Fast-forwarded from `96703369` to `aa58fabc`; no run-history source conflicts; ticket artifacts remain untracked. | Architecture/implementation should use refreshed tree. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Frontend calls GraphQL `listWorkspaceRunHistory`; resolver delegates to `WorkspaceRunHistoryService.listWorkspaceRunHistory`.
- Current execution flow:
  1. `WorkspaceRunHistoryService.listWorkspaceRunHistory` calls `AgentRunHistoryService.listRunHistory` and `TeamRunHistoryService.listTeamRunHistory`.
  2. `AgentRunHistoryService.listRunHistory` reads `run_history_index.json` through `AgentRunHistoryIndexService.listRows`.
  3. If rows length is `0`, it calls `rebuildIndexFromDisk`; otherwise it trusts the non-empty index.
  4. It validates each indexed row has metadata; stale indexed rows are removed. It does not scan metadata for unindexed runs.
  5. UI receives only grouped rows that were in the index or came from empty-index rebuild.
- Ownership or boundary observations:
  - Current `AgentRunHistoryIndexService` is the intended boundary for index semantics, but the real durable identity is in `AgentRunMetadataStore`.
  - Current `AgentRunHistoryIndexStore` owns low-level JSON file mutation, but not the metadata/index consistency invariant.
  - Current `AgentRunMetadataStore` owns durable per-run metadata but does not own catalog/list fields such as summary and last activity.
  - Target ownership should move list correctness into one run-history catalog/per-run record boundary rather than requiring every lifecycle service to keep metadata and a global index synchronized.
- Current behavior summary: A non-empty but incomplete index is durable and visible to the frontend as the complete run list until manually repaired or fully rebuilt.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Primary Missing Invariant / Boundary Or Ownership Issue. Secondary Duplicated Policy Or Coordination and Shared Structure Looseness (`lastKnownStatus`/`activationState`).
- Refactor posture evidence summary: A bounded architecture refactor is needed because current mutation safety is split across lifecycle services, per-instance store queues, a direct maintenance script, and loose persisted status fields. The list/catalog invariant should live in one run-history catalog boundary; lifecycle callers should update a per-run authoritative record instead of maintaining a global index peer.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User incident report | `agents/<runId>` directories existed but index rows missing. | Metadata and index are not treated as one authoritative record. | Make per-run metadata/catalog authoritative; use legacy reconciliation only for migration/repair. |
| `AgentRunHistoryService.listRunHistory` | Rebuild only if `rows.length === 0`. | Partial legacy index is a data repair problem; frequent/status index writes are the root source risk. | Keep V2 index as normal catalog; repair legacy partial data through startup-once app-data migration, with optional script fallback. |
| `AgentRunProvisioningService.prepareAgentRun` | Metadata write precedes index upsert. | Crash/write failure after metadata can create missing row. | Collapse lifecycle persistence into one per-run record/catalog update. |
| `AgentRunHistoryIndexStore` | Queue is instance-local; read-modify-write uses target file snapshot. | Two store instances can race and lose a row. | Avoid correctness-critical global read-modify-write; if snapshots remain, own them behind one catalog writer. |
| `cleanup-codex-e2e-run-history.mjs` | Direct `fs.writeFile` to index. | Bypasses store boundary and proves index ownership is leaky. | Remove/decommission direct global-index writer. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-store.ts` | Low-level JSON index file read/write/mutate. | Temp+rename but no fsync; per-instance queue; no temp cleanup; no cross-instance serialization. | Keep as low-level V2 index writer behind catalog boundary; semantic mutation serialization belongs above it. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | Converts run metadata/raw traces into index rows and records lifecycle changes. | Has full rebuild from disk but no merge/repair for partial index; also encodes `lastKnownStatus`. | Decommission normal lifecycle writer role; new catalog service owns low-write V2 index mutations. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Lists/group standalone run history and archive/delete. | Only empty-index self-heal; removes stale indexed rows; does not add missing rows. | Source rows from V2 index-backed catalog and derive live status at read time; no automatic metadata scan. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | Reads/writes `memory/agents/<runId>/run_metadata.json`. | Direct `writeFile`, no atomic write; metadata lacks summary/lastActivityAt but contains loose `lastKnownStatus`/`activationState`. | Strengthen as per-run record writer: atomic writes, catalog fields, durable lifecycle facts only. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Creates/prepares/activates run identities and writes metadata/index. | Several metadata-before-index windows; persists `ACTIVATING` and `ACTIVATION_FAILED`. | Update one per-run record/catalog owner; use in-memory activation lock; no durable transient states. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Restore/activity/terminate operations. | Metadata-before-index windows; termination only updates existing row and uses `lastKnownStatus` as terminal policy. | Write `summary`/`terminatedAt` through per-run record owner; remove global index update dependency and do not persist `lastActivityAt` for normal list ordering. |
| `autobyteus-server-ts/src/run-history/services/workspace-run-history-service.ts` | Merges agent/team history for GraphQL/UI. | Uses agent run history service; no direct file access. | Backend agent history fix reaches UI list. |
| `autobyteus-server-ts/scripts/cleanup-codex-e2e-run-history.mjs` | Maintenance cleanup for e2e artifact rows. | Directly rewrites `run_history_index.json`. | Decommission or retarget to per-run catalog/metadata cleanup; no direct global snapshot mutation. |
| `autobyteus-server-ts/src/run-history/store/team-run-history-index-store.ts` | Low-level team index JSON store. | Same atomicity pattern as agent store and also persists `lastKnownStatus`. | Team cleanup is follow-up; standalone change must not remove team fields. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-20 | Static trace | `nl -ba` slices for index store, index service, history service, provisioning service, run service, cleanup script | Confirmed exact lines for metadata-before-index windows, empty-only rebuild, temp+rename write path, and direct script write. | Static code path explains the reported partial index persistence. |

## External / Public Source Findings

No external sources used; investigation is local codebase analysis.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No live server needed for current source audit. Regression tests should create temporary memory data for V2 index listing, semantic mutation serialization, and explicit migration-script repair of partial legacy indexes.
- Required config, feature flags, env vars, or accounts: None for design.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Why the reported data shape can persist

The reported index was non-empty, so `AgentRunHistoryService.listRunHistory` would not call `rebuildIndexFromDisk`. It would validate only the rows already present in `run_history_index.json`, remove stale indexed rows if their metadata is missing, and then group those rows. It never scans `memory/agents/*/run_metadata.json` for missing run IDs unless the index is entirely empty.

### How rows can become missing

The code intentionally persists per-run metadata before index rows in multiple lifecycle paths. That ordering is understandable because metadata is the durable run identity, but it creates a gap: if the process exits, the app is force-quit, the memory directory is removed during teardown, or an index write fails after metadata has been written, the run directory exists but the index row is absent. Old/slower hardware plausibly increases this window.

### Atomicity and race assessment

`AgentRunHistoryIndexStore` does better than direct `writeFile`: it writes a temporary file and renames it over the target. That means a normal successful write should replace the target atomically on local POSIX filesystems. However:

- the target file is not fsynced through the temp file and parent directory, so a crash/power loss can lose the latest rename;
- the mutation queue is per object instance, so two store instances can perform stale read-modify-write concurrently;
- no cross-process lock exists;
- direct script writers bypass the store entirely;
- temporary files are not removed after failures.



### User clarification: performance index purpose and architecture direction

The user clarified why `run_history_index.json` was originally created: the frontend needs a fast run-history list, and a user may eventually have hundreds or thousands of runs. Re-reading every full metadata/config file on every frontend history render is not desirable.

After further discussion on 2026-05-21, the final design direction is sharper: if normal history-list source code always scans all metadata to repair or rebuild history, the index becomes redundant. Therefore the steady-state application should keep `run_history_index.json` as the normal fast standalone history catalog and should not scan all metadata directories during routine history listing or catalog initialization. Full scans belong to the startup-once app-data migration framework, with optional explicit migration/repair scripts only as fallback diagnostics.

The corrected authority split is:

- `run_history_index.json`: standalone history-list catalog for normal frontend history rendering;
- `run_metadata.json`: per-run resume/config plus prepared/start facts;
- runtime manager / command overlay / streams: live status.

This addresses the user's concern that constant repair is the wrong direction. The root source fix is to make index updates rare, semantic, single-owner, and serialized, not to hide fragility behind automatic scans.

### Architecture conclusion after attribute audit

The current architecture is not sound enough because it combines two design problems:

1. **Over-frequent global index writes**: lifecycle services rewrite the global JSON index for activity/status fields (`lastActivityAt`, `lastKnownStatus`) that should not be persisted as catalog facts. On slower hardware, stale read-modify-write windows can lose rows.
2. **Loose persisted status model**: `lastKnownStatus` and parts of `activationState` persist runtime/process state (`ACTIVE`, `ACTIVATING`, `ACTIVATION_FAILED`) that should be derived from live managers/command overlays.

A cleaner target spine is:

```text
Run lifecycle/catalog event
  -> AgentRunHistoryCatalogService semantic mutation queue
  -> V2 run_history_index.json catalog update when needed
  -> GraphQL workspace history response with derived live status
  -> frontend history tree
```

`run_history_index.json` remains the steady-state standalone history catalog. It should not be a frequently updated runtime-status file, and it should not be bypassed by scripts or lifecycle services.

### User clarification: original index purpose versus current implementation

The user clarified the original design intent: after application restart, the frontend should show history quickly; full resume metadata/config should be needed mainly when a run is resumed or otherwise reconstructed at runtime.

Current code only partially follows that principle. `run_history_index.json` is used as the run-list source, so it avoids directory scanning and raw-trace summary extraction. But current code also writes it for activity/status and reads metadata/status fallback for indexed rows, so it is not a clean history catalog.

Final architecture implication after the latest simplification discussion: do not introduce a separate per-run `run_catalog.json`; keep `run_history_index.json` as the catalog file and make its schema stable and low-write. Keep `run_metadata.json` focused on resume/config.

### Does `run_history_index.json` actually bring performance?

Yes, if the normal path does not scan all metadata. The V2 design preserves the index's performance value by loading one compact file into an in-memory catalog and overlaying live status.

The better steady-state performance shape is:

- normal history listing/catalog initialization: read V2 `run_history_index.json` only, then use in-memory catalog;
- catalog mutation: update the index only for meaningful catalog changes;
- legacy/repair: run `RunHistoryIndexV2AppDataMigration` through the existing app-data migration runner; optional explicit script may scan all metadata only as a fallback/manual repair tool.

Final flush strategy for the V2 history index:

- update the in-memory catalog synchronously inside a catalog-level semantic mutation queue;
- flush `run_history_index.json` synchronously after meaningful catalog changes because the write set is small: create/prepared identity, summary/title fill or explicit title change, archive/unarchive, terminate, delete/cancel prepared, and explicit migration/repair;
- write the index atomically and through one owner;
- do not flush for live status transitions or ordinary message activity;
- if a crash leaves legacy/orphan data, use the app-data migration retry path or optional fallback repair script rather than normal history-list automatic scan.

### User refinement: keep history index, simplify updates

User prefers keeping `run_history_index.json` because it is useful as a startup/history-list file. The final target is not deletion and not routine metadata-scan repair; the target is to keep it as a low-write V2 history catalog with one semantic writer.

Current code updates index more often than the simplified mental model: prepare creates a row, activation/restoration writes `ACTIVE`, each accepted user message records activity and status, termination writes `TERMINATED`, summary recovery can write, delete removes, and rebuild can rewrite the whole file. Many of those writes exist only because the index stores `lastKnownStatus`. Removing live status from the index should significantly reduce writes.

Final simplified index write events:

- create/prepared run identity: add row with catalog fields;
- first accepted summary/title fill, explicit title change, or one-time summary recovery/migration: update `summary` only when it changes meaningfully;
- archive/unarchive: update `archivedAt`/visibility in the row;
- terminate: update `terminatedAt` as a durable lifecycle fact;
- delete/cancel prepared run: remove row;
- app-data migration/manual repair: reconcile index rows against per-run metadata outside the normal history-list source path.

Do not write the index for live status transitions such as `ACTIVE`, `IDLE`, `ACTIVATING`, `PROCESSING`, or transient `ERROR`.



### Final persisted lifecycle/catalog attribute decision

After discussion, the useful persisted lifecycle/catalog timestamps for the history index/cache are:

- `createdAt`: stable chronological ordering and creation/audit fact;
- `archivedAt`: durable user visibility decision; archived runs are hidden from normal frontend history without deleting data;
- `terminatedAt`: durable fact that the user stopped/terminated the live runtime, useful for audit/display/control semantics, but not a live status and not necessarily a permanent non-resumable state unless product policy says so.

Fields to remove from the persisted history index/cache:

- `lastActivityAt`: low value for normal history UX and forces frequent writes;
- `lastKnownStatus`: stale live/display state;
- `activationState`: over-modeled runtime state; prepared/start facts can live in metadata if needed for launch flow.

### `lastActivityAt` assessment

User questioned whether `lastActivityAt` is needed in the persisted history index. The refined product judgment is that it should not be part of the normal history-list cache. Creation-time ordering is enough for the intended history UX, and users usually work with a small set of recently created runs. Persisting `lastActivityAt` would turn every accepted message/activity into a history-index write, while bringing little value.

Recommended replacement:

- persist `createdAt` for stable chronological ordering;
- persist `archivedAt` because it controls visibility;
- persist `terminatedAt` because it is a durable terminal lifecycle fact;
- optionally compute last activity on-demand from traces/projection when opening details, but do not use it as a startup-list/index field;
- if the current session wants active/recent items on top, do that in memory/frontend from live context, not by rewriting the persisted index.

### Live status persistence principle

User restated the key product/architecture principle: live status should not be saved in files. On server restart, historical agents/teams are offline because no runtime exists. Resume uses persisted metadata/config to recreate a runtime. Display/control status for `running`, `processing`, `error`, `can interrupt`, terminate buttons, reconnect behavior, and similar frontend controls should come from live runtime managers, command overlays, and API projection, not from a stale persisted status string.

This supports removing durable `lastKnownStatus`, durable `ACTIVE`/`IDLE`, and transient activation states. It also clarifies that `terminatedAt` and `archivedAt` are not live status; they are durable lifecycle/user facts that affect allowed actions and visibility.

### `lastKnownStatus` assessment

User's suspicion is supported by code evidence.

Current uses found:

- metadata/index writes set `ACTIVE`, `IDLE`, `ERROR`, or `TERMINATED`;
- `AgentRunStatusProjectionService` uses command overlay and active runtime manager before metadata fallback;
- restore/send paths use `metadata.lastKnownStatus === "TERMINATED"` to block further commands;
- frontend types and stores copy/normalize `lastKnownStatus`, but primary history UI actions/status dots use derived `status/currentStatus` and `isActive`.

Assessment by value:

- `ACTIVE`: no durable value. After server restart, a run is not active just because metadata says `ACTIVE`.
- `IDLE`: mostly display fallback; inactive/offline can be derived from absence of active runtime/overlay.
- `ERROR`: currently preserves a failed activation or runtime error badge, but no audited product requirement requires a historical error badge after restart.
- `TERMINATED`: the terminal policy has value, but should be explicit `terminatedAt`/`terminalState`, not a broad status enum.

Conclusion: remove `lastKnownStatus` from durable metadata and persisted index/snapshot. If API/frontend temporarily keep a field with that name, compute it from derived status and lifecycle facts at read time.

### `activationState` assessment

Current values and audit result:

- `PREPARED`: has product value because the frontend currently calls `prepareAgentRun`, promotes a temporary id to a permanent run id, finalizes attachments, opens a stream, and then sends the first message. Keep the prepared identity concept if this UX remains.
- `ACTIVATING`: no durable value. It is written before runtime creation and used to reject concurrent activation. If the process crashes while metadata says `ACTIVATING`, future activation rejects the run as already activating. This is a robust evidence point that `ACTIVATING` must not be persisted.
- `ACTIVATED`: means the run started at least once and can be restored. The fact has value, but it should be represented as `startedAt`, not a runtime-ish enum.
- `ACTIVATION_FAILED`: weak/no durable value. It is a failed attempt outcome. It can be reported through command response/overlay/logs. Persisting it only creates another stale state to interpret after restart.

Conclusion: replace `activationState` with durable facts such as `preparedAt`, `preparedExpiresAt`, `startedAt`, and `terminatedAt`. Use an in-memory per-run activation lock/command registry for concurrent activation. Do not persist `ACTIVATING` or `ACTIVATION_FAILED`.

### `lastFailure` assessment

There is no `lastFailure` field in standalone agent run metadata or `run_history_index.json` today. I should not introduce it as part of the run-history cleanup.

The existing `lastFailure` found by source search belongs to application engine status:

- `ApplicationEngineHostService` sets it when application backend startup/load fails or a worker exits unexpectedly;
- `applicationHostStore` and `ApplicationShell.vue` use it to show launch errors.

That is a different subsystem. For run history, no current backend or frontend evidence justifies adding `lastFailure` as a durable run metadata field. If historical run-failure display becomes a product requirement later, it should be designed as a narrow failure record with retention semantics, not as a substitute for broad runtime status.

### Persisted field audit result

The dedicated audit file is:

`/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/persisted-attribute-audit.md`

Key decisions from the audit:

- Keep standalone durable resume/config fields: `runId`, `agentDefinitionId`, `workspaceRootPath`, `memoryDir`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `skillAccessMode`, `runtimeKind`, `platformAgentRunId`, `applicationExecutionContext`.
- Keep durable user lifecycle field: `archivedAt`.
- Add or move catalog fields into per-run authoritative storage: `createdAt` and `summary`; do not persist `lastActivityAt` as a normal history-list/index field.
- Replace broad status/lifecycle fields with durable facts: `preparedAt`, `preparedExpiresAt`, `startedAt`, `terminatedAt`.
- Remove durable `lastKnownStatus`.
- Remove durable `ACTIVATING` and `ACTIVATION_FAILED`.
- Do not add durable run-history `lastFailure` now.

### Most likely root cause for the old-Mac incident

The most defensible root cause is not a frontend cache problem. It is a backend file-store consistency gap: per-run metadata is durable enough to survive, while the global index is a derived projection that is only rebuilt when completely empty and can be lost/skipped/overwritten independently.

Old or slower hardware plausibly increases timing windows between metadata and index writes, but hardware is not the root cause. The root cause is allowing a correctness-critical global read model to be manually maintained through non-transactional dual writes and then trusted as complete.

## Constraints / Dependencies / Compatibility Facts

- The reported local data file has already been repaired; source fix must prevent recurrence and heal similar local stores.
- Existing local memory layout under `~/.autobyteus/server-data/memory` is user data and must be treated carefully.
- The GraphQL/frontend path already uses backend run-history services, so the source-of-truth correction should stay backend-side; frontend should receive one canonical history response with derived live status.
- Archive/delete behavior must remain intact: archive writes durable per-run metadata; delete removes the run directory and any derived catalog/snapshot row if such a snapshot remains.

## Open Unknowns / Risks

- Whether normal desktop operation can leave two backend processes writing the same memory directory. If yes, in-process serialization is insufficient and a file lock/lease is required.
- Whether team-run index should be hardened in the same change or left as an explicit follow-up.
- Whether metadata writes should also become atomic in a separate hardening pass. After the revised design, this belongs in-scope for create/prepared/start facts because metadata remains the resume/config authority and participates in create operations.

## Notes For Architect Reviewer

- Do not accept a design that only changes `writeIndexFile`; that would improve durability but would not fix the dual-truth architecture or non-empty partial indexes like the reported case.
- Do not accept a design that makes `lastKnownStatus`, `ACTIVATING`, or `ACTIVATION_FAILED` more durable. The architecture should remove those as persisted runtime state.
- The intended governing owner should be a run-history catalog/per-run record boundary. Legacy index reconciliation is app-data migration/manual repair only, not steady-state correctness.
- Avoid frontend-side reconciliation or dual read paths. The backend run-history list source should expose one canonical V2 index-backed standalone list with derived live status; legacy metadata scanning belongs only to the startup-once app-data migration or optional fallback scripts.


## Persisted Attribute Audit Addendum

A dedicated attribute audit was updated at `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/done/run-history-index-consistency/persisted-attribute-audit.md`. It classifies every current standalone run metadata field and run-history index field, plus team metadata/index fields, by current use and recommended keep/remove/refactor posture.

## Design Rework Addendum After Architecture Review Round 1

Date: 2026-05-21

Architecture review round 1 failed the initial design because it under-specified semantic mutation serialization, legacy `createdAt` migration, archive/delete/cancel safe identity ownership, and standalone/team API scope.

The user then clarified a stronger product/design direction: if normal history-list source code scans every metadata directory on startup/list, `run_history_index.json` becomes redundant. Therefore the revised target keeps `run_history_index.json` as the normal fast standalone history catalog. Normal history-list code should not scan all metadata to repair the index. Full scans were initially placed in an explicit script/README, then revised again after the app-data migration framework check: the primary path is a startup-once app-data migration recorded in the database, with scripts only as manual fallback diagnostics.

Revised conclusions:

- Normal history list path reads V2 `run_history_index.json` / in-memory catalog only, then overlays live status.
- `run_metadata.json` is resume/config storage, not the history-list source.
- The old-Mac bug is primarily addressed by removing high-frequency index writes (`lastActivityAt`, `lastKnownStatus`, live statuses) and routing rare catalog mutations through one serialized owner.
- The normal history-list source code should not retain automatic legacy repair. `RunHistoryIndexV2AppDataMigration` should scan all metadata only through the app-data migration runner, and a script such as `autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs` should be optional/manual fallback only.
- The app-data migration/fallback script must use deterministic `createdAt` fallback: existing V2 index `createdAt`, legacy metadata `createdAt`, legacy metadata `preparedAt`, legacy index `lastActivityAt`, metadata file birthtime, metadata file mtime, run directory birthtime, run directory mtime, then current migration time with warning.
- Archive/delete/cancel safety should move behind the catalog boundary: raw external run IDs are accepted by catalog methods, normalized/validated internally, checked for containment under the agents root, and guarded against active-run deletion/archive.
- Standalone API/frontend item fields may change to `createdAt`/`archivedAt`/`terminatedAt` plus derived status, while team-run history fields remain deferred and must not be removed in this task.


## App Data Migration Framework Check

Date: 2026-05-21

The user pointed out that the project already has an app-data migration framework that runs during startup and records completed migrations in the database. Source inspection confirms this:

- `autobyteus-server-ts/src/server-runtime.ts` runs `getAppDataMigrationRunner().runPending()` after Prisma migrations and before normal server bootstrap.
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts` runs registered definitions with `requiredOnStartup === true`, skips records whose status is `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`, writes migration logs, and supports retry.
- `autobyteus-server-ts/src/app-data-migrations/repositories/app-data-migration-record-repository.ts` records status in `app_data_migration_records`.
- `autobyteus-server-ts/prisma/schema.prisma` contains `AppDataMigrationRecord`, mapped to `app_data_migration_records`.
- `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.ts` is the existing pattern for a file/data migration over memory metadata.

Revised migration design implication:

- The run-history V1→V2 index migration should be implemented as a new `AppDataMigrationDefinition`, registered in `AppDataMigrationRegistry`, with `requiredOnStartup = true`.
- This migration may scan all `memory/agents/*/run_metadata.json`, because it is a one-time app-data migration path, not the normal history-list path.
- The normal `listWorkspaceRunHistory` path still must not scan all metadata.
- A standalone script/README can remain useful as a manual fallback or diagnostic wrapper, but the primary compatibility path for existing user data should be startup-once app-data migration.

## Standalone Index Version Attribute Judgment

Date: 2026-05-21

The user asked whether a persisted `version` attribute is needed in `run_history_index.json`. Design judgment: remove it from the standalone index target. The app-data migration framework already records migration execution/status in `app_data_migration_records`, and steady-state run-history source code should not support parallel V1/V2 schemas. A file-level `version` wrapper would add another persisted attribute with no product/runtime value and would encourage compatibility branching. The target standalone index file should be a plain JSON array of V2 catalog rows; strict row validation plus the startup app-data migration provide the necessary schema boundary. This judgment applies to standalone agent history only; team-run index cleanup remains deferred.

## Team Run History Refactor Scope Gap

Date: 2026-05-21

The user challenged the earlier standalone-only scope and asked whether agent team history has the same index/metadata problem. Source and local data inspection confirm yes.

Evidence:

- Team history index file exists at `memory/team_run_history_index.json`.
- Current team index type is `TeamRunIndexFileRecord { version, rows }` with row fields `teamRunId`, `teamDefinitionId`, `teamDefinitionName`, `workspaceRootPath`, `summary`, `lastActivityAt`, `lastKnownStatus`, and `deleteLifecycle`.
- `TeamRunHistoryService.listTeamRunHistory()` reads team index rows and rebuilds from metadata only when the index is empty. A non-empty but incomplete team index is trusted.
- Current local data has 142 valid `memory/agent_teams/*/team_run_metadata.json` files but only 140 team index rows. Missing team metadata-backed runs: `team_software-engineering-team_1479a41d`, `team_software-engineering-team_918ba294`.
- Existing team metadata migration `20260517_team_run_metadata_member_tree` succeeded and converts `memberMetadata` to `memberTree`; it does not repair `team_run_history_index.json`.
- `TeamRunService.recordRunActivity()` writes team metadata and team history index on activity/status. `TeamRunMetadataMapper.buildMetadata()` currently sets `createdAt` and `updatedAt` to the current timestamp each time metadata is rebuilt, so these metadata timestamps are not reliable stable catalog facts.
- Backend source search shows no writer that sets team `deleteLifecycle` to `CLEANUP_PENDING`; current personal behavior effectively uses `READY` only.

Design implication:

- The current design must no longer defer team-run history cleanup. Team run history has the same architecture smell and an observed partial-index issue.
- Add a team history catalog/index refactor parallel to standalone: remove persisted team index `version`, `lastActivityAt`, `lastKnownStatus`, and currently-unused `deleteLifecycle`; use `createdAt`, `archivedAt`, and `terminatedAt` catalog facts; keep stable `teamDefinitionName`, `createdAt`, and `archivedAt` in team metadata and copy the catalog-relevant values into the team catalog; keep live status derived.
- Add `TeamRunHistoryIndexV2AppDataMigration` to repair/migrate `team_run_history_index.json` from canonical team metadata. It should run after `TeamRunMetadataMemberTreeMigration`.
- See `team-history-refactor-analysis.md` for the detailed field audit and target flow.

## Team Metadata Stable Manifest Correction

Date: 2026-05-21

The user challenged the initial team metadata simplification that removed `teamDefinitionName`, `createdAt`, and `archivedAt`. Revised judgment: that was too aggressive. Team metadata is a team-run manifest, not only a minimal runtime resume config. Stable facts `teamDefinitionName`, `createdAt`, and `archivedAt` should remain in team metadata because they are low-write, useful for historical display/repair, and do not carry live runtime status. `createdAt` and `archivedAt` are also copied into the team history catalog for fast list ordering/filtering; rare archive/unarchive operations must update metadata and catalog together through the team catalog boundary. `updatedAt` remains the field to remove from the V2 target because it is activity-ish and currently rewritten on metadata refresh.

## 2026-05-21 Architecture Review Round 5 Rework

Architecture review round 5 failed the expanded design on two team-specific design-impact gaps:

1. `TeamRunHistoryIndexV2AppDataMigration` row synthesis was under-specified, especially because legacy team metadata `createdAt` is known unreliable: `TeamRunMetadataMapper.buildMetadata()` rewrites `createdAt`/`updatedAt` to `now` on metadata refresh.
2. The team catalog/list boundary was incomplete: team history rows need `memberTree`/members from metadata, but normal listing must still avoid full `agent_teams/*` scans and list-time repair.

User clarification during this rework: keep stable team metadata facts `teamDefinitionName`, `createdAt`, and `archivedAt`; `updatedAt` is not needed. Final design decision: V2 team metadata keeps `teamDefinitionName`, `createdAt`, `archivedAt`, and `memberTree`, and removes `updatedAt` from the target. If a future product requirement needs a durable config-change timestamp, it should be introduced separately and must not become a history-list activity driver.

Design response now recorded in `design-spec.md`:

- Added a concrete team migration row synthesis algorithm with field-by-field fallbacks for `teamRunId`, `teamDefinitionId`, `teamDefinitionName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, and `terminatedAt`.
- `createdAt` fallback treats legacy team metadata `createdAt` as unreliable and prefers existing V2 row value, team directory birthtime, member prepared timestamps, and metadata birthtime before warning-level legacy metadata/activity fallbacks.
- Migration reporting now distinguishes stale index rows, no-metadata directories, unsafe IDs, invalid/unsupported metadata, identity mismatches, and missing metadata-backed rows. The two observed missing team rows (`team_software-engineering-team_1479a41d`, `team_software-engineering-team_918ba294`) are covered by the missing-row repair case.
- Added the normal team list/projection spine: `TeamRunHistoryCatalogService` supplies catalog rows from `team_run_history_index.json`; `TeamRunHistoryService` may read `team_run_metadata.json` only for selected indexed row IDs to project `memberTree`/members; `TeamRunStatusProjectionService` overlays live team/member status.
- Explicitly forbidden in normal team listing: `listTeamRunIds()`, `rebuildIndexFromDisk()`, full `agent_teams/*` scan, stale-row removal, or missing-row repair.
- Added concrete `TeamRunHistoryCatalogService` semantic methods and forbidden bypasses for `TeamRunService`, `TeamRunHistoryService`, scripts, and lifecycle code.
