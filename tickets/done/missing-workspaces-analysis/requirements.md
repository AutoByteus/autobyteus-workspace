# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready. User approved moving from investigation into design on 2026-07-06 after the local workspace registry was restored.

## Goal / Problem Statement

Prevent AutoByteus workspace registry truncation after app/server restarts or concurrent workspace operations. The backend currently persists the visible workspace list in `$HOME/.autobyteus/server-data/workspaces.json`; a race in registry loading/persistence likely overwrote a many-entry registry with only the currently touched workspaces. The fix must make the registry persistence owner robust, preserve user workspace visibility, and remove the duplicate persistent temp-workspace entry shape that appeared during recovery.

## Investigation Findings

- The authoritative visible workspace registry is `/Users/normy/.autobyteus/server-data/workspaces.json`.
- Before restoration, that file had been rewritten on 2026-07-05 20:19:52 Europe/Berlin and contained only two filesystem entries:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
  - `/Users/normy/.autobyteus/server-data/temp_workspace`
- The running GraphQL API at `http://127.0.0.1:29695/graphql` returned only those two filesystem registry entries plus the fixed transient `temp_ws_default` row.
- The frontend was not the primary cause: current code intentionally derives top-level workspace rows from the backend `workspaces()` query / registry, not from all run-history roots.
- Server logs showed that many previously visible workspace roots were still loaded on 2026-07-05T18:06:00Z (20:06 Berlin), then the app/server restarted repeatedly around 20:16-20:18 Berlin before the registry file was rewritten.
- The installed app and source code have a race in `WorkspaceRegistryStore.ensureRegistryLoaded()`: it sets `loaded = true` before `fs.readFile(...)` finishes. Concurrent calls can therefore skip loading and persist a partial in-memory map, overwriting `workspaces.json` with only newly touched roots.
- Workspace directories and run history were not deleted. The registry was restored on 2026-07-05 by backing up the truncated file and re-registering 20 recovered roots through the running backend. Backend `workspaces` then returned 21 rows: 20 filesystem registry rows plus fixed `temp_ws_default`.
- Current source also allows the configured temp workspace root to be persisted as a normal filesystem workspace when callers use `ensureWorkspaceByRootPath(tempRoot)`, causing duplicate visibility: one filesystem row for temp root plus the true transient `temp_ws_default` row.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix with localized refactor/cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with a secondary shared-structure/identity looseness issue around temp root identity.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, localized to workspace registry ownership and workspace manager temp-root routing.
- Evidence basis: `WorkspaceRegistryStore` owns persisted workspace visibility but does not enforce single-flight loading, serialized mutations, atomic writes, or shrink protection. `WorkspaceManager.ensureWorkspaceByRootPath` registers every root path as filesystem, even when the root is the configured temp workspace root that already has a transient owner.
- Requirement or scope impact: The fix must strengthen backend persistence invariants and temp-root identity handling. Frontend row derivation from `workspaces()` remains correct and should not be redesigned to use run history as workspace-list authority.

## Recommendations

- Implement a concurrency-safe `WorkspaceRegistryStore`:
  - one shared load promise / single-flight loader;
  - no `loaded = true` until load completes;
  - all mutations serialized through one registry mutation queue;
  - writes use an atomic temp-file replacement so readers never see half-written JSON;
  - suspicious mass-shrink writes are rejected unless caused by an explicit remove operation.
- Strengthen `WorkspaceManager` as the authoritative workspace lifecycle boundary:
  - `ensureWorkspaceByRootPath(configuredTempRoot)` returns `TempWorkspace` instead of registering a filesystem workspace;
  - explicit `createWorkspace` for the configured temp root also resolves to `TempWorkspace` or rejects persistence rather than creating a filesystem registry entry;
  - existing temp-root filesystem registry entries are removed as cleanup, not preserved as a compatibility path.
- Add tests that reproduce the concurrent startup/load/upsert failure and verify the registry remains complete.
- Keep frontend behavior unchanged except for any test expectation updates caused by backend temp-row cleanup.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The root code change is localized, but it is persistence-critical and requires concurrency tests plus temp-root identity cleanup.

## In-Scope Use Cases

- `UC-1`: Server startup lists visible workspaces while active run/team recovery or launch concurrently registers workspace roots.
- `UC-2`: Multiple concurrent `createWorkspace` / `ensureWorkspaceByRootPath` calls preserve all existing registry entries.
- `UC-3`: Explicit workspace removal removes only the requested filesystem workspace and remains non-destructive.
- `UC-4`: The configured temp workspace root is represented by `temp_ws_default`, not persisted as a normal filesystem workspace.
- `UC-5`: The frontend workspace tree continues to derive top-level workspace rows from the backend `workspaces()` registry authority.

## Out of Scope

- Making run history the authority for workspace list visibility.
- Deleting workspace folders, run history, memories, artifacts, or traces.
- Broad workspace UX redesign.
- Release packaging or deployment unless downstream delivery includes it later.

## Functional Requirements

- `REQ-1`: The workspace registry store shall load `workspaces.json` exactly once per store instance using a single-flight load path that all concurrent callers await.
- `REQ-2`: The registry shall not report itself loaded until disk read/parse/canonicalization has completed or an absent-file case has been intentionally handled.
- `REQ-3`: Registry upserts and deletes shall be serialized so concurrent mutations cannot persist partial or stale snapshots.
- `REQ-4`: Registry persistence shall write through a same-directory temporary file and atomic rename rather than writing directly over the authoritative file.
- `REQ-5`: Registry persistence shall reject suspicious mass-shrink snapshots unless the shrink is explained by explicit workspace removal/decommission operations.
- `REQ-6`: Explicit `removeWorkspace` shall remain the only user-facing operation that removes a regular filesystem workspace from visible workspace registry state, and it shall remain non-destructive to files/history.
- `REQ-7`: The configured temp workspace root shall not be persisted or listed as a regular filesystem workspace; `temp_ws_default` remains the authoritative temp workspace identity.
- `REQ-8`: Existing persisted filesystem entries whose root equals the configured temp workspace root shall be cleaned from the registry as part of the fix.
- `REQ-9`: The GraphQL `workspaces()` query shall continue to return registered filesystem workspaces plus transient active workspaces, with no duplicate rows for the same temp root.
- `REQ-10`: Frontend workspace tree behavior shall remain sourced from `workspaces()`; missing historical roots shall not automatically recreate top-level rows.

## Acceptance Criteria

- `AC-1`: A regression test creates an initial registry file with multiple entries, triggers concurrent registry load and upsert operations, and verifies all original entries plus the new entry remain on disk.
- `AC-2`: A regression test verifies concurrent upserts of different workspace roots produce a registry containing all roots.
- `AC-3`: A regression test verifies explicit remove deletes only the target entry and does not trigger mass-shrink protection.
- `AC-4`: A regression test verifies a suspicious non-remove shrink is rejected or fails safe with the prior registry preserved.
- `AC-5`: A GraphQL/workspace-manager test verifies `workspaces()` returns `temp_ws_default` for the configured temp root and does not return a second filesystem row for that same root.
- `AC-6`: Existing workspace create/list/remove tests still pass, including deterministic filesystem workspace IDs and non-destructive removal semantics.
- `AC-7`: Source changes do not require frontend run-history projection to derive workspace rows from historical data.
- `AC-8`: Implementation notes identify the atomic temp-file naming/cleanup behavior and confirm no persistent `.bak` files are created by the new design.

## Constraints / Dependencies

- User data under `/Users/normy/.autobyteus` must not be overwritten destructively.
- The packaged server currently runs with `--data-dir /Users/normy/.autobyteus/server-data`; source fix must later be built/released into the packaged app to affect installed behavior.
- `workspaces.json` currently uses `Record<workspaceId, workspaceRootPath>`; preserve that persisted schema unless implementation proves a schema migration is necessary.
- Workspace IDs remain deterministic `agent_ws_<sha256(canonical-root-path)>` for regular filesystem workspaces.
- `temp_ws_default` remains fixed for the default temp workspace.

## Assumptions

- The July 5 truncation was caused by concurrent startup/run workspace operations racing registry load/persist.
- Existing filesystem roots restored into the registry are valid and should remain visible unless explicitly removed.
- A small registry-level mutation queue is sufficient; no cross-process lock is required for the current single-server packaged runtime. Atomic temp-file replacement prevents half-written JSON if the process exits during persistence.

## Risks / Open Questions

- If multiple OS processes intentionally write the same registry file concurrently, in-process serialization will not be enough. Current runtime evidence shows one packaged server process, so cross-process locking is deferred unless tests or deployment topology prove it is needed.
- Mass-shrink protection must not block legitimate explicit workspace removal.
- Persistent `.bak` files are intentionally not part of the design; without automated recovery they are mostly unused clutter.

## Requirement-To-Use-Case Coverage

- `UC-1`: `REQ-1`, `REQ-2`, `REQ-3`, `REQ-4`, `REQ-5`
- `UC-2`: `REQ-1`, `REQ-3`, `REQ-4`
- `UC-3`: `REQ-3`, `REQ-5`, `REQ-6`
- `UC-4`: `REQ-7`, `REQ-8`, `REQ-9`
- `UC-5`: `REQ-9`, `REQ-10`

## Acceptance-Criteria-To-Scenario Intent

- `AC-1`: concurrent startup/load/upsert truncation reproduction.
- `AC-2`: concurrent user/runtime workspace registration.
- `AC-3`: normal explicit remove path.
- `AC-4`: fail-safe persistence guard.
- `AC-5`: temp workspace identity cleanup.
- `AC-6`: existing behavior preservation.
- `AC-7`: frontend authority boundary preservation.
- `AC-8`: operational recovery evidence.

## Approval Status

Approved by user for design kickoff on 2026-07-06. Implementation approval still pending downstream design review.
