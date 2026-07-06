# Design Spec

## Current-State Read

The visible workspace list is a backend-owned registry flow, not a frontend-derived history projection.

Current visible-workspace read spine:

`Frontend Sidebar -> workspaceStore.fetchAllWorkspaces() -> GraphQL workspaces() -> WorkspaceManager.listVisibleWorkspaces() -> WorkspaceRegistryStore.listEntries() -> workspaces.json`

Current registration spine:

`Run/Team Launch Or Restore / Create Workspace Mutation -> WorkspaceManager.ensureWorkspaceByRootPath() / createWorkspace() -> WorkspaceRegistryStore.upsertEntry() -> workspaces.json`

Current removal spine:

`Frontend Remove Action -> GraphQL removeWorkspace() -> WorkspaceManager.removeRegisteredWorkspace() -> WorkspaceRemovalGuard -> WorkspaceRegistryStore.deleteEntry() -> workspaces.json`

The important ownership boundary is already mostly correct: `WorkspaceManager` is the public lifecycle boundary for workspaces and `WorkspaceRegistryStore` is the internal persistence owner for registered filesystem workspace visibility. The bug is that `WorkspaceRegistryStore` does not enforce the persistence invariants its boundary implies.

Current evidence:

- `WorkspaceRegistryStore.ensureRegistryLoaded()` sets `loaded = true` before `fs.readFile(...)` completes. A concurrent caller can skip the disk load and persist an incomplete in-memory map.
- `upsertEntry(...)` and `deleteEntry(...)` mutate the shared `entries` map and write the full file snapshot without a single mutation queue, atomic replace, or shrink guard.
- Non-temp callers use `WorkspaceManager.ensureWorkspaceByRootPath(...)` correctly, but that method currently registers every root path as a regular filesystem workspace. When the root equals the configured temp workspace root, it can create a persistent `agent_ws_<temp-root>` row alongside transient `temp_ws_default`.
- Frontend `workspaceStore.fetchAllWorkspaces()` correctly queries `workspaces()` network-only. `runHistoryReadModel` intentionally uses registered workspace descriptors as the only top-level workspace-row source. That authority boundary should remain unchanged.

Constraints:

- Preserve the existing `workspaces.json` persisted schema: `Record<workspaceId, workspaceRootPath>`.
- Preserve deterministic filesystem IDs: `agent_ws_<sha256(canonical-root-path)>`.
- Preserve fixed temp identity: `temp_ws_default`.
- Do not delete workspace directories, histories, memories, or artifacts.
- Explicit `removeWorkspace` remains the only normal user-facing way to remove a filesystem workspace from visible registry state.

## Intended Change

Strengthen the workspace registry persistence owner and temp workspace identity boundary:

1. Make `WorkspaceRegistryStore` load single-flight, mutation-serialized, atomic-write and shrink-safe.
2. Make `WorkspaceManager` route the configured temp workspace root to `TempWorkspace` rather than registering it as a filesystem workspace.
3. Remove any persisted filesystem registry entry whose root equals the configured temp root as an in-scope cleanup.
4. Keep frontend top-level workspace rows sourced from `workspaces()`.

Simplification decision after user feedback on 2026-07-06: persistent `.bak` files are not part of the target design because the system would not use them automatically. The only temporary file is the atomic-write staging file, which is deleted/renamed and should not accumulate.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix with localized refactor/cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; secondary shared-structure/identity looseness for temp-root identity.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, localized.
- Evidence: The registry store is the correct owner but lacks load completion, serialized mutation, atomic persistence, and shrink invariants. The workspace manager currently lets the same temp root have two identities: persistent filesystem ID and fixed temp ID.
- Design response: Strengthen `WorkspaceRegistryStore` as the sole persistence owner and strengthen `WorkspaceManager` as the temp-root identity router. Do not move authority to frontend or run history.
- Refactor rationale: This cannot be fixed safely as a one-line local bug because the store needs a coherent mutation boundary. The refactor stays inside the existing workspace subsystem and preserves public GraphQL shapes.
- Intentional deferrals and residual risk, if any: Cross-process file locking is deferred. Current evidence shows one packaged server process writes the registry; in-process serialization plus atomic replace covers the observed failure. If future deployment runs multiple server writers against the same data dir, add an interprocess lock.

## Terminology

- `Workspace Registry`: persistent registry of user-visible regular filesystem workspaces, stored at `workspaces.json` under app data.
- `Filesystem Workspace`: regular persisted workspace with deterministic `agent_ws_<hash>` ID.
- `Temp Workspace`: transient/default workspace with fixed ID `temp_ws_default`, backed by a filesystem root but not a registered filesystem workspace.
- `Registry Mutation`: any operation that changes persisted filesystem workspace visibility, currently upsert, explicit delete, and temp-root cleanup.

## Design Reading Order

This design should be read spine-first:

1. Visible workspace read spine and registry mutation spine.
2. Ownership boundaries: `WorkspaceManager` as lifecycle boundary, `WorkspaceRegistryStore` as persistence owner.
3. File responsibilities in the existing workspace subsystem.
4. Migration/refactor sequence and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission persisted temp-root filesystem registry entries. Do not keep a dual representation where the same temp root is both `agent_ws_<temp-root>` and `temp_ws_default`.
- This is cleanup of an invalid persisted state, not a compatibility wrapper.
- Run history for past temp-root runs remains intact; the visible workspace list should show the temp workspace through `temp_ws_default` only.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Frontend workspace tree load | Workspace rows rendered from backend metadata | `WorkspaceManager` | Shows why frontend should depend on backend registry authority instead of run history. |
| DS-002 | Primary End-to-End | Workspace create/run restore/team launch | Durable registry update or temp workspace resolution | `WorkspaceManager` with `WorkspaceRegistryStore` persistence | This is the path that lost entries during restart/concurrent registration. |
| DS-003 | Primary End-to-End | User remove workspace action | One filesystem registry entry removed | `WorkspaceManager` | Must remain explicit and non-destructive while bypassing mass-shrink protection only for the target entry. |
| DS-004 | Bounded Local | Registry operation arrives | Serialized load/mutate/persist completes | `WorkspaceRegistryStore` | Internal queue and single-flight loader materially shape safety. |
| DS-005 | Return-Event | Registry mutation persisted | Updated `workspaces()` response / frontend refresh | `WorkspaceManager` | Confirms the visible effect after mutation and restoration. |

## Primary Execution Spine(s)

- DS-001 visible read:
  - `Frontend Sidebar -> workspaceStore.fetchAllWorkspaces() -> GraphQL workspaces() -> WorkspaceManager.listVisibleWorkspaces() -> WorkspaceRegistryStore.listEntries() -> workspaces.json`
- DS-002 registration / launch / restore:
  - `GraphQL createWorkspace() / Run or Team Service -> WorkspaceManager.ensureWorkspaceByRootPath() -> WorkspaceManager temp-root router -> WorkspaceRegistryStore.upsertEntry() for filesystem roots -> atomic workspaces.json update`
- DS-003 explicit removal:
  - `Frontend Remove Action -> GraphQL removeWorkspace() -> WorkspaceManager.removeRegisteredWorkspace() -> WorkspaceRemovalGuard -> WorkspaceRegistryStore.deleteEntry() -> atomic workspaces.json update`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The frontend asks the backend for visible workspace metadata. The backend ensures transient temp exists, reads the durable filesystem registry, adds non-duplicated transient active workspaces, and returns metadata. | `workspaceStore`, `WorkspaceResolver`, `WorkspaceManager`, `WorkspaceRegistryStore` | `WorkspaceManager` | GraphQL conversion, registry persistence, transient workspace cache. |
| DS-002 | A launch/restore/create path resolves a root path. `WorkspaceManager` first checks whether the root is the configured temp root. Temp roots resolve to `TempWorkspace`; regular filesystem roots are registered through the registry store. | `Run/Team service`, `WorkspaceManager`, `TempWorkspace`, `WorkspaceRegistryStore` | `WorkspaceManager` | Path canonicalization, deterministic ID building, registry persistence. |
| DS-003 | A user explicitly removes one filesystem workspace. The manager validates filesystem identity, checks active-run guards, closes matching active workspace instances, and tells the registry store to delete exactly that entry. | `WorkspaceResolver`, `WorkspaceManager`, `WorkspaceRemovalGuard`, `WorkspaceRegistryStore` | `WorkspaceManager` | Active-run lookup, file-explorer cleanup, non-destructive messaging. |
| DS-004 | Every registry read/write goes through an internal local sequence: await shared load, clone current entries, apply one mutation, validate allowed shrink, atomically persist, then commit in-memory state. | `WorkspaceRegistryStore` | `WorkspaceRegistryStore` | Load promise, mutation queue, atomic temp-file writer, shrink guard. |
| DS-005 | After persistence, later `workspaces()` calls read the updated registry state and frontend refresh renders the corrected list. | `WorkspaceRegistryStore`, `WorkspaceManager`, `workspaceStore` | `WorkspaceManager` | Metadata conversion and frontend store cache refresh. |

## Spine Actors / Main-Line Nodes

- `workspaceStore.fetchAllWorkspaces()`: frontend store action that requests backend workspace metadata.
- `WorkspaceResolver`: thin GraphQL entry boundary.
- `WorkspaceManager`: authoritative lifecycle and identity boundary for filesystem/temp/skill workspace resolution.
- `WorkspaceRegistryStore`: authoritative durable persistence owner for registered filesystem workspace visibility.
- `WorkspaceRemovalGuard`: explicit remove-path guard around active runs.
- `TempWorkspace`: transient workspace identity owner for `temp_ws_default`.

## Ownership Map

| Node | Owns |
| --- | --- |
| `workspaceStore.fetchAllWorkspaces()` | Frontend cache population from backend metadata; not workspace visibility authority. |
| `WorkspaceResolver` | GraphQL transport shape and error mapping only; thin entry facade. |
| `WorkspaceManager` | Workspace lifecycle, identity routing, active workspace cache, temp/filesystem/skill distinction, visible workspace aggregation. |
| `WorkspaceRegistryStore` | Durable filesystem workspace registry loading, mutation sequencing, file persistence, atomic temp-file write, registry shrink invariants. |
| `WorkspaceRemovalGuard` | Active-run/team-run checks before explicit filesystem workspace removal. |
| `TempWorkspace` | Fixed temp workspace metadata and display identity. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkspaceResolver.workspaces()` | `WorkspaceManager` | GraphQL query boundary. | Registry ordering, load state, persistence, or temp/filesystem identity policy. |
| `WorkspaceResolver.createWorkspace()` | `WorkspaceManager` | GraphQL mutation boundary. | Direct registry writes or temp-root special casing outside manager. |
| `workspaceStore.fetchAllWorkspaces()` | Backend `workspaces()` / `WorkspaceManager` | Frontend cache synchronization. | Recreating visible workspaces from historical run roots. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Persisted filesystem registry entry whose root equals configured temp workspace root | Same root already has authoritative temp identity `temp_ws_default`; duplicate row confuses visible list. | `WorkspaceManager.getOrCreateTempWorkspace()` and temp-root routing in `ensureWorkspaceByRootPath`. | In This Change | Add cleanup path through registry store with explicit decommission reason. |
| Early `loaded = true` flag in `WorkspaceRegistryStore.ensureRegistryLoaded()` | Allows callers to skip in-progress load and persist partial state. | Shared `loadPromise` and `loaded` set only after load success/handled ENOENT. | In This Change | Direct source of suspected truncation. |
| Direct whole-file writes without atomic replace | Leaves no protection against partial write/process interruption. | Atomic write method with same-directory temp file followed by rename. | In This Change | No persistent `.bak` file is created; stale temp files are cleanup-only artifacts. |
| Unserialized registry mutations | Allows stale snapshots and interleaved writes. | Store-owned mutation queue. | In This Change | No callers should mutate `entries` outside the queue. |

## Return Or Event Spine(s) (If Applicable)

DS-005 return/visibility spine:

`WorkspaceRegistryStore persisted snapshot -> WorkspaceManager.listVisibleWorkspaces() -> WorkspaceResolver.workspaces() -> workspaceStore.workspaces -> Sidebar tree`

There is no separate event stream for this fix. The user-visible return path is the next query/refresh after a successful mutation.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `WorkspaceRegistryStore`

`Incoming list/upsert/delete -> ensureLoaded single-flight -> registry mutation queue -> clone entries -> apply operation -> validate shrink -> atomic persist -> commit entries / return result`

This bounded local spine matters because the bug is not in one caller; it is the internal load/write sequencing of the registry owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path canonicalization | DS-001, DS-002, DS-003 | `WorkspaceManager`, `WorkspaceRegistryStore` | Normalize root paths before identity comparison and hashing. | Prevent duplicate IDs for same root. | If scattered, temp-root matching and registry dedupe become inconsistent. |
| GraphQL conversion | DS-001, DS-002, DS-003 | `WorkspaceResolver` | Convert workspace instances to GraphQL metadata. | Transport output shape. | If placed in registry, persistence owner starts knowing transport concerns. |
| Active-run removal guard | DS-003 | `WorkspaceManager` | Block removal when active runs use workspace. | Preserve active work safety. | If placed in registry, persistence owner would need runtime knowledge. |
| Atomic file persistence | DS-004 | `WorkspaceRegistryStore` | Write temp file, then rename it over the authoritative file. | Protect disk state. | If callers own it, persistence invariants fragment. |
| Shrink validation | DS-004 | `WorkspaceRegistryStore` | Reject unexpected mass deletion. | Prevent recurrence of truncation. | If callers own it, only some mutation paths are protected. |
| Temp-root cleanup | DS-002, DS-004 | `WorkspaceManager` with registry store | Remove invalid filesystem entry for configured temp root. | Preserve one identity per workspace subject. | If frontend hides duplicate, backend state remains invalid. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Durable workspace visibility | `autobyteus-server-ts/src/workspaces` | Extend | The subsystem already owns workspace lifecycle and registry persistence. | N/A |
| Registry persistence invariants | `WorkspaceRegistryStore` | Extend | It is the existing authoritative store for `workspaces.json`. | N/A |
| Temp workspace identity | `WorkspaceManager` / `TempWorkspace` | Extend | Existing temp owner is correct; manager needs stronger routing. | N/A |
| Frontend display refresh | `workspaceStore` | Reuse unchanged | It correctly consumes backend `workspaces()`. | N/A |
| Run history roots | Run history subsystem | Reuse unchanged, not authority | History remains historical data, not visible workspace source. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Workspaces | Workspace lifecycle, identity routing, registry visibility, temp workspace. | DS-001, DS-002, DS-003, DS-004 | `WorkspaceManager`, `WorkspaceRegistryStore` | Extend | Main scope. |
| GraphQL API | Transport boundary for workspaces query/mutations. | DS-001, DS-002, DS-003 | `WorkspaceResolver` | Reuse | No new API shape required. |
| Frontend Workspace Store | Frontend cache/render source. | DS-001, DS-005 | `workspaceStore` | Reuse | No durable authority change. |
| Test Coverage | Regression guard for persistence race and temp duplication. | All | N/A | Extend | Add targeted store/unit and GraphQL/workspace tests. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts` | Server Workspaces | `WorkspaceRegistryStore` | Registry load, mutation queue, validation, persistence, deterministic ID helper. | Existing persistence owner; cohesive after invariants are added. | Uses existing path canonicalizer. |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Server Workspaces | `WorkspaceManager` | Route temp root to temp workspace, aggregate visible workspaces, invoke temp-root cleanup. | Existing lifecycle owner. | Uses `TempWorkspace`, registry store, path canonicalizer. |
| `autobyteus-server-ts/src/workspaces/temp-workspace.ts` | Server Workspaces | `TempWorkspace` | Fixed temp metadata. | Existing temp subject owner; likely no change or minimal type support. | N/A |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Test Coverage | GraphQL workspace behavior | Visible workspace, remove, temp duplicate behavior. | Existing workspace E2E coverage location. | Existing helpers. |
| `autobyteus-server-ts/tests/workspaces/workspace-registry-store.test.ts` or equivalent | Test Coverage | Registry store behavior | Single-flight load, concurrent mutation, atomic/shrink behavior. | Store-level concurrency should be tested without GraphQL overhead. | Existing app config mocking patterns. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Registry entry shape `{ workspaceId, workspaceRootPath }` | Existing `WorkspaceRegistryEntry` in `workspace-registry-store.ts` | Server Workspaces | Used only by registry store/manager boundary. | Yes | Yes | A generic workspace DTO with temp/skill fields. |
| Registry mutation reason / expected removals | Keep private types in `workspace-registry-store.ts` unless reused. | Server Workspaces | Only persistence owner needs this. | Yes | Yes | Public API surface or caller-owned policy. |
| Atomic write helper | Keep private method in `workspace-registry-store.ts` for now. | Server Workspaces | Only one registry file uses it in this scope. | Yes | Yes | Generic filesystem utility before repetition exists. |

No new shared file is required unless implementation discovers repeated file-atomic-write logic elsewhere. Keeping the atomic writer private avoids creating a broad utility too early.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkspaceRegistryEntry` | Yes | Yes | Low | Keep limited to persisted filesystem workspaces. |
| `WorkspaceMetadata` / GraphQL workspace metadata | Yes, if `kind`/`isTemp` remain authoritative | N/A | Medium due to duplicate temp-root row today | Remove temp root from filesystem registry and route temp roots to `temp_ws_default`. |
| `workspaces.json` record | Yes | Yes | Low after temp cleanup | Preserve `workspaceId -> rootPath`; do not add temp/skill data. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts` | Server Workspaces | Registry persistence owner | Single-flight load, serialized mutations, registry validation, atomic temp-file persistence, deterministic filesystem ID helper. | These are one persistence boundary; splitting now would hide the invariant. | `WorkspaceRegistryEntry`, path canonicalization. |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Server Workspaces | Workspace lifecycle/identity owner | Filesystem/temp/skill routing, visible workspace aggregation, explicit removal orchestration, temp-root cleanup trigger. | Existing authoritative manager; correct place for subject identity decisions. | `TempWorkspace`, registry store. |
| `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts` | Server Workspaces | Path normalization concern | No planned change; continue canonical root/display-name helpers. | Existing focused utility. | N/A |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Test Coverage | API behavior | Add/adjust temp duplicate cleanup and removal behavior tests. | Existing GraphQL workspaces suite. | Existing test helpers. |
| `autobyteus-server-ts/tests/workspaces/workspace-registry-store.test.ts` or similar | Test Coverage | Store invariant behavior | Add focused load/mutation race and shrink-protection tests. | Store-level invariants need direct tests. | App config test setup. |

## Ownership Boundaries

- `WorkspaceManager` is the authoritative public boundary for workspace lifecycle and identity. Callers should not decide whether a root is temp versus filesystem; they should call manager methods.
- `WorkspaceRegistryStore` is internal to the workspace subsystem and owns persisted filesystem registry state. No caller should read/write `workspaces.json` directly or preserve visibility by editing JSON outside this boundary.
- `WorkspaceResolver` is transport-only. It calls manager methods and converts results.
- Frontend workspace store is a cache/consumer. It must not use run history to rebuild missing registry rows automatically.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `WorkspaceManager` | Active workspace map, temp-root routing, registry store, removal guard. | GraphQL resolver, run/team services, metadata mappers. | Caller checks temp root then directly writes registry; caller uses both manager and registry store. | Add manager method with explicit subject semantics. |
| `WorkspaceRegistryStore` | Load promise, mutation queue, entries map, atomic writer, shrink guard. | `WorkspaceManager` only. | Any code outside store reads/writes `workspaces.json`; direct mutation of `entries`. | Add store method for the needed registry operation. |
| `WorkspaceResolver` | GraphQL input/output conversion. | Frontend/API clients. | Frontend directly reads server-data files. | Add GraphQL query/mutation through manager. |

## Dependency Rules

Allowed:

- GraphQL resolver -> `WorkspaceManager`
- Run/team services -> `WorkspaceManager`
- `WorkspaceManager` -> `WorkspaceRegistryStore`, `TempWorkspace`, `FileSystemWorkspace`, `WorkspaceRemovalGuard`
- `WorkspaceRegistryStore` -> filesystem APIs and `workspace-path-utils`
- Frontend store -> GraphQL `workspaces()` / `createWorkspace()` / `removeWorkspace()`

Forbidden:

- Frontend or run-history code writes `workspaces.json`.
- GraphQL resolver bypasses `WorkspaceManager` and calls `WorkspaceRegistryStore` directly.
- Run/team services call registry store directly or implement temp-root identity policy locally.
- Registry store imports run/team managers or frontend/GraphQL types.
- Any in-scope design keeps both a persistent filesystem temp row and `temp_ws_default` as valid steady state.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `WorkspaceResolver.workspaces()` | Visible workspace list | Query visible workspaces. | None | Thin GraphQL facade; manager owns policy. |
| `WorkspaceResolver.createWorkspace(input.rootPath)` | Workspace root registration/resolution | Register regular filesystem workspace or resolve temp root. | Root path string | Manager decides temp vs filesystem. |
| `WorkspaceManager.ensureWorkspaceByRootPath(rootPath)` | Workspace identity by root | Resolve root to temp or filesystem workspace. | Canonicalizable root path | Must not blindly register temp root. |
| `WorkspaceManager.createWorkspace(config)` | Explicit workspace creation/resolution | Create/register filesystem workspace unless root is temp. | `WorkspaceInput` with root path | May be reshaped internally; public GraphQL shape unchanged. |
| `WorkspaceRegistryStore.upsertEntry(workspaceId, rootPath)` | Filesystem registry entry | Add/update one filesystem registry entry. | Deterministic filesystem ID + root path | Serialized, no shrink. |
| `WorkspaceRegistryStore.deleteEntry(workspaceId)` | Filesystem registry entry | Remove exactly one registry entry. | Filesystem workspace ID | Explicit remove only. |
| New/private `WorkspaceRegistryStore.deleteEntryByRootPath(rootPath, reason)` or equivalent | Filesystem registry entry cleanup | Remove temp-root duplicate by root. | Root path + explicit cleanup reason | Internal manager use only. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ensureWorkspaceByRootPath` | Yes | Yes | Medium today because temp root and filesystem root share root-path shape | Add temp-root routing inside manager. |
| `createWorkspace` | Yes | Yes | Medium for temp root | Route or reject temp root persistence through manager. |
| `upsertEntry` | Yes | Yes | Low | Keep filesystem-only; do not pass temp/skill IDs. |
| `deleteEntry` | Yes | Yes | Low | Keep explicit filesystem ID removal. |
| `workspaces()` | Yes | N/A | Low | Keep manager-backed list. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Workspace lifecycle owner | `WorkspaceManager` | Yes | Low | Keep. |
| Registry persistence owner | `WorkspaceRegistryStore` | Yes | Low | Keep and strengthen. |
| Temp workspace | `TempWorkspace` | Yes | Low | Keep. |
| Atomic persistence method | `persistRegistryAtomically` or private equivalent | Yes | Low | Name by concern; avoid `saveHelper`. |
| Mutation queue method | `withSerializedRegistryMutation` or private equivalent | Yes | Low | Name by sequencing policy. |

## Applied Patterns (If Any)

- **Registry pattern**: `WorkspaceRegistryStore` remains the registry for persisted filesystem workspace roots.
- **Repository-like persistence boundary**: `WorkspaceRegistryStore` fulfills storage for `WorkspaceManager` but does not own workspace lifecycle.
- **Serialized mutation queue**: a bounded local sequencing pattern inside `WorkspaceRegistryStore` to ensure one load/mutate/persist path at a time.
- **Atomic file replace**: persistence safety pattern inside the registry store.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/workspaces/` | Folder | Server Workspaces subsystem | Workspace lifecycle and registry ownership. | Existing correct subsystem. | Frontend or GraphQL transport policy. |
| `autobyteus-server-ts/src/workspaces/workspace-registry-store.ts` | File | Registry persistence owner | Load/mutation/persist invariants for `workspaces.json`. | Existing store is the right owner. | Run/team active state, GraphQL conversion, frontend behavior. |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | File | Workspace lifecycle owner | Identity routing, visible aggregation, removal orchestration. | Existing manager is the boundary callers use. | Direct file persistence details. |
| `autobyteus-server-ts/src/workspaces/temp-workspace.ts` | File | Temp workspace identity owner | Fixed temp metadata. | Existing temp identity owner. | Registry persistence. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | File | GraphQL workspace coverage | API-level create/list/remove/temp behavior. | Existing coverage. | Store-level race-only tests if too awkward. |
| `autobyteus-server-ts/tests/workspaces/workspace-registry-store.test.ts` | File | Store invariant coverage | Direct concurrency/shrink/atomic tests. | Keeps race tests near store behavior. | GraphQL run/team orchestration. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/workspaces` | Mixed Justified | Yes | Low | Workspace subsystem is compact; manager/store/temp files make depth readable without extra folders. |
| `src/api/graphql/types/workspace.ts` | Transport | Yes | Low | Thin resolver remains outside workspace persistence owner. |
| `tests/e2e/workspaces` | API behavior | Yes | Low | Existing workspace API tests. |
| `tests/workspaces` or equivalent | Store invariant | Yes | Low | Add if existing test layout supports subsystem unit tests. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Registry load | `await ensureLoaded(); clone entries; mutate clone; persist atomically; commit` | `loaded = true; await readFile(); mutate global map concurrently` | This is the exact race that likely truncated the registry. |
| Temp identity | `ensureWorkspaceByRootPath(tempRoot) -> getOrCreateTempWorkspace() -> temp_ws_default` | `ensureWorkspaceByRootPath(tempRoot) -> createWorkspace() -> agent_ws_<temp-root>` plus `temp_ws_default` | One root must not have two visible workspace identities. |
| Frontend authority | `Sidebar -> workspaces() -> registry-backed descriptors` | `Sidebar merges all run-history roots into top-level workspace rows` | Removed/unregistered historical roots must not silently reappear. |
| Removal | `removeWorkspace(id) -> guard -> delete exactly id` | `persist smaller snapshot from whatever entries are currently in memory` | Explicit remove is allowed; accidental shrink is not. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep filesystem temp registry row but hide it in frontend | Would avoid backend cleanup. | Rejected | Remove temp-root filesystem entry and route temp root to `temp_ws_default`. |
| Rebuild visible workspace list from run history when registry is short | Could mask truncation. | Rejected | Registry remains authority; use explicit recovery/restore tooling for data loss, not silent history promotion. |
| Keep old direct write behavior and only move `loaded = true` | Smaller code diff. | Rejected | Add complete registry mutation boundary: single-flight load, serialized mutation, atomic write, shrink guard. |
| Add a second JSON file for recovered/hidden workspaces | Could preserve lost entries separately. | Rejected for in-scope fix | Restore registry through authoritative store and protect it. |

## Derived Layering (If Useful)

- Transport: `WorkspaceResolver`, frontend GraphQL calls.
- Workspace lifecycle/domain-control: `WorkspaceManager`, `TempWorkspace`, `FileSystemWorkspace`.
- Persistence provider: `WorkspaceRegistryStore` and `workspaces.json` file operations.
- Off-spine guards/adapters: `WorkspaceRemovalGuard`, GraphQL converter, path canonicalizer.

Layering is explanatory only; dependency rules remain ownership-led.

## Migration / Refactor Sequence

1. Add store-level regression coverage for the suspected race:
   - Initial registry has multiple entries.
   - Delay or otherwise overlap load with an upsert.
   - Assert final registry preserves old entries plus new entry.
2. Refactor `WorkspaceRegistryStore` load:
   - Add `loadPromise` / load state.
   - Set loaded only after successful load or handled `ENOENT`.
   - Fail closed for malformed/unreadable non-`ENOENT` file instead of treating it as empty and allowing overwrite.
3. Add serialized registry mutation boundary:
   - Upsert/delete/temp-cleanup use the same queue.
   - Mutations operate on a cloned map and commit after successful validation/persist.
4. Add atomic temp-file persistence without persistent backups:
   - Write the full payload to a same-directory temp file such as `workspaces.json.tmp-<pid>-<timestamp>`.
   - Rename the temp file over authoritative `workspaces.json`.
   - Clean stale temp files on failure/before retry when safe.
   - Do not create rotating or persistent `.bak` files as part of normal writes.
5. Add shrink guard:
   - Upsert cannot reduce count.
   - Delete can reduce by only the target entry.
   - Temp cleanup can remove only entries matching the configured temp root.
   - Any other shrink throws and preserves prior disk state.
6. Update `WorkspaceManager` temp-root routing:
   - Canonicalize root.
   - If root equals configured temp root, return `getOrCreateTempWorkspace()` and do not upsert filesystem registry entry.
   - Add/trigger cleanup for existing temp-root filesystem registry entry.
7. Update/add GraphQL workspace tests:
   - No duplicate filesystem temp row when registry has temp root or when `createWorkspace(tempRoot)` is called.
   - Existing create/list/remove behavior still passes.
8. Run targeted tests and typecheck as appropriate for implementation stage.

No temporary compatibility seam should remain after implementation.

## Key Tradeoffs

- **Single-file store vs new persistence helper file**: Keep logic in `workspace-registry-store.ts` because only this registry needs the invariant today. Extract only if repetition appears.
- **In-process queue vs cross-process lock**: In-process queue addresses observed packaged runtime. Cross-process locking is heavier and deferred until a multi-writer topology exists.
- **Fail closed on malformed registry**: This may surface an error instead of silently continuing, but it prevents catastrophic overwrite of recoverable user data.
- **Atomic temp-file replacement without persistent backups**: Use a same-directory staging file plus rename so readers do not see half-written JSON. Do not create `.bak` files, because the system has no automated recovery consumer for them and they would become clutter.

## Risks

- Tests may need careful isolation because `WorkspaceManager` is a singleton in current E2E setup.
- Atomic temp-file implementation must avoid leaving stale temp files in normal operation.
- Shrink guard must distinguish explicit removal from accidental truncation without becoming a broad compatibility mode.
- Packaged app remains vulnerable until the source fix is delivered into the installed build.

## Guidance For Implementation

- Keep `WorkspaceRegistryStore` the only code that touches `workspaces.json`.
- Prefer private helper methods inside `WorkspaceRegistryStore`:
  - `ensureRegistryLoaded()`
  - `loadRegistryFromDisk()`
  - `withSerializedMutation(...)`
  - `persistRegistryAtomically(...)`
  - `validateRegistryMutation(...)`
- Avoid exposing the mutation queue to callers. Callers express intent through `upsertEntry`, `deleteEntry`, or a narrowly named temp-root cleanup method.
- Do not add frontend fallback logic that repopulates workspace rows from run history.
- When updating tests, include the exact failure shape: concurrent load/upsert must not reduce a many-entry registry to one or two entries.
- The existing manual restoration backup `/Users/normy/.autobyteus/server-data/workspaces.json.backup-before-restore-20260705-204255` is historical evidence from the emergency restore, not part of the new write-path design; do not create new persistent `.bak` files.
