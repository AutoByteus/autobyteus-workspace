# Design Spec

## Current-State Read

Standalone agent history currently has two persisted files whose responsibilities are blurred:

- `memory/agents/<runId>/run_metadata.json` stores resume/runtime configuration but also stores live-ish status fields such as `lastKnownStatus` and `activationState`.
- `memory/run_history_index.json` was originally intended as a lightweight history list index for fast frontend history rendering, but it is currently updated for live/activity/status events and is also only partially repaired.

The current frontend history path is:

```text
Frontend listWorkspaceRunHistory query
  -> GraphQL run-history resolver
  -> WorkspaceRunHistoryService
  -> AgentRunHistoryService.listRunHistory
  -> AgentRunHistoryIndexService / AgentRunHistoryIndexStore
  -> run_history_index.json
```

Current lifecycle paths update the index too frequently:

- prepare/create writes an index row;
- activation/restoration writes `ACTIVE`;
- ordinary activity/message acceptance records `lastActivityAt` and status;
- termination writes `TERMINATED`;
- summary recovery writes the index;
- delete removes index rows;
- a cleanup script rewrites the index file directly.

This causes two distinct architecture problems:

1. **Over-frequent global JSON rewrites.** A whole index array is rewritten for ordinary activity/status. On slower hardware, overlapping stale read-modify-write windows can overwrite rows that another operation just added.
2. **Wrong data model.** The index contains fields that should not be persisted as catalog truth: `lastActivityAt`, `lastKnownStatus`, and activation/runtime state.

Important refined design constraint from the user discussion:

- The normal application source code must **not** scan every `agents/<runId>/run_metadata.json` on startup/list as a repair mechanism. If we scan everything in normal code, the history index loses its purpose.
- Full metadata scanning belongs in an explicit offline migration/repair script with a README, not in steady-state source behavior.
- The steady-state history index remains the fast normal history catalog. Robustness comes from rare, serialized, semantic index mutations, not automatic repair on every list.

## Intended Change

Keep `run_history_index.json`, but restore its original purpose:

```text
run_history_index.json = standalone history-list catalog for fast frontend rendering
run_metadata.json      = per-run resume/config record
runtime/command state  = live status source
```

Target normal history flow:

```text
Frontend history query
  -> GraphQL resolver
  -> WorkspaceRunHistoryService
  -> AgentRunHistoryService
  -> AgentRunHistoryCatalogService
  -> in-memory catalog loaded from run_history_index.json
  -> AgentRunStatusProjectionService overlays live status
  -> frontend history tree
```

Target migration/repair flow, outside normal source path:

```text
Operator runs explicit script
  -> read legacy run_history_index.json if present
  -> scan memory/agents/*/run_metadata.json
  -> synthesize missing V2 rows
  -> remove stale rows when requested
  -> write run_history_index.json V2 atomically
  -> print dry-run/apply report
```

The index remains useful because normal frontend history no longer reads every metadata file. The exact reported old-Mac data shape is handled by a one-time/manual repair script, while the source bug is addressed by making steady-state index mutations rare and serialized.

### Target standalone metadata shape

`run_metadata.json` is kept focused on resume/config and prepared/start facts:

```ts
type AgentRunMetadataV2 = {
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string;
  memoryDir: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode | null;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
  applicationExecutionContext?: ApplicationExecutionContext | null;

  // prepared identity / runtime reconstruction facts, not live status
  preparedAt?: string | null;
  preparedExpiresAt?: string | null;
  startedAt?: string | null;
};
```

Removed from standalone metadata:

```ts
lastKnownStatus;
activationState;
lastActivityAt;
summary;
archivedAt;
terminatedAt;
createdAt; // catalog field, owned by the history index in steady state
```

Rationale: summary, creation ordering, archive visibility, and termination display are history-list catalog facts. They belong in the index/catalog, not in resume metadata. Prepared/start facts stay in metadata because command routing and restore need to distinguish prepared identity from started/restorable run.

### Target standalone history index row shape

```ts
type AgentRunHistoryIndexRowRecordV2 = {
  runId: string;
  agentDefinitionId: string;
  agentName: string;
  workspaceRootPath: string;
  summary: string;
  createdAt: string;
  archivedAt?: string | null;
  terminatedAt?: string | null;
};
```

Removed from the standalone history index:

```ts
lastActivityAt;
lastKnownStatus;
activationState;
```

## Task Design Health Assessment (Mandatory)

- Change posture: Bug fix + behavior cleanup + architecture refactor + performance-cache simplification.
- Current design issue found: Yes.
- Root cause classification: Primary `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`; secondary `Shared Structure Looseness`.
- Refactor needed now: Yes.
- Evidence:
  - User incident: valid metadata directories existed while the global history index missed rows.
  - Current source writes `run_history_index.json` for ordinary activity and status transitions.
  - Current index contains persisted live/status fields that make frequent writes appear necessary.
  - Direct cleanup script writes bypass the index store.
- Design response:
  - Keep the index as the normal fast catalog, not as a disposable cache that is always repaired by scanning metadata.
  - Remove high-frequency/status fields from the index.
  - Introduce `AgentRunHistoryCatalogService` as the only semantic standalone index/catalog mutation owner.
  - Add semantic mutation serialization covering read-normalize-merge-write, in-memory update, and atomic flush.
  - Move legacy full metadata scanning into explicit scripts/README, not application source.
- Refactor rationale:
  - A repair-on-every-list design would make the index redundant.
  - A metadata-only design would be simpler but gives up the original performance reason for the index.
  - A transactional database is out of scope. The file-based design becomes robust enough by making index mutations rare, single-owner, and serialized.
- Intentional deferrals and residual risk:
  - No true cross-file transaction exists between metadata and index. Normal errors are handled with ordered writes and rollback; process crash in the tiny create/delete window may still require the explicit repair script.
  - Team-run history retains its current fields until a follow-up. Standalone API/frontend cleanup must not remove team fields.
  - Cross-process locking is deferred unless normal desktop operation supports multiple server processes writing the same memory directory.

## Terminology

- `Run metadata`: per-run resume/config file under `memory/agents/<runId>/run_metadata.json`.
- `Standalone history index`: `memory/run_history_index.json`; authoritative standalone history-list catalog for normal frontend history rendering.
- `Catalog row`: an in-memory and persisted history row with fields needed for history list display and visibility.
- `Live status`: command/runtime state derived from command overlays, active runtime manager, and streams. It is never persisted in history files.
- `Migration/repair script`: explicit operator-run script that may scan all metadata directories to repair/migrate index data. It is not part of normal startup/list behavior.

## Design Reading Order

1. Authority split: metadata owns resume/config; index owns history list catalog; runtime owns live status.
2. Steady-state data flow: normal history query reads index/in-memory catalog only, not all metadata.
3. Mutation discipline: rare semantic catalog mutations are serialized through one owner.
4. Offline repair/migration: full metadata scanning exists only in scripts.
5. API/frontend scope: standalone fields change; team fields remain deferred.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility in steady-state source code; remove legacy code paths.`
- Source code must not keep V1 auto-repair or dual schema behavior in normal list paths.
- Legacy data repair is handled by an explicit script and README.
- Steady-state code writes only V2 standalone metadata/index shapes.
- Old persisted standalone fields are removed from new writes: `lastKnownStatus`, `activationState`, `lastActivityAt`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Frontend history query | History response | `AgentRunHistoryCatalogService` via `AgentRunHistoryService` | Keeps normal list fast by reading the index/in-memory catalog without metadata scanning. |
| DS-002 | Primary End-to-End | Run catalog mutation | V2 index + optional metadata config update | `AgentRunHistoryCatalogService` | Ensures every meaningful history change has one serialized writer. |
| DS-003 | Return-Event | Runtime/command state | Frontend status/control state | `AgentRunStatusProjectionService` | Keeps live status out of metadata/index. |
| DS-004 | Bounded Local | Catalog mutation request | Serialized read-merge-write + in-memory update + flush | `AgentRunHistoryCatalogService` | Prevents stale read-modify-write overwrites. |
| DS-005 | Primary Maintenance | Operator-run migration/repair script | V2 index report/file | `migrate-agent-run-history-index-v2.mjs` script | Repairs existing legacy/partial indexes without adding source-code compatibility. |
| DS-006 | Primary End-to-End | Archive/delete/cancel request | Index row update/removal and safe filesystem effect | `AgentRunHistoryCatalogService` | Keeps path containment and active-run checks explicit after moving mutations behind the catalog boundary. |

## Primary Execution Spine(s)

Normal history listing:

```text
Frontend GraphQL query
  -> RunHistoryResolver
  -> WorkspaceRunHistoryService
  -> AgentRunHistoryService
  -> AgentRunHistoryCatalogService
  -> in-memory catalog loaded from run_history_index.json
  -> AgentRunStatusProjectionService live overlay
  -> GraphQL history response
```

Catalog mutation:

```text
AgentRunProvisioningService / AgentRunService / AgentRunHistoryService
  -> AgentRunHistoryCatalogService.enqueueMutation
  -> load current in-memory/index row state
  -> merge semantic change
  -> write metadata if the operation includes resume/config changes
  -> update in-memory catalog
  -> write run_history_index.json atomically
```

Offline migration/repair:

```text
node autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs --memory-dir <dir> --apply
  -> scan memory/agents/*/run_metadata.json
  -> read legacy run_history_index.json if available
  -> derive createdAt deterministically
  -> write V2 run_history_index.json
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A history list request asks for standalone history rows. The catalog service serves rows from its in-memory catalog loaded from the V2 index. Live runtime status is overlaid separately. | GraphQL resolver, workspace history service, agent history service, catalog service, status projection | `AgentRunHistoryCatalogService` for catalog rows; `AgentRunStatusProjectionService` for live status | Index parse, grouping, DTO mapping. |
| DS-002 | A lifecycle event that changes catalog facts is submitted as a semantic operation. The catalog service serializes it, updates catalog state, and flushes the V2 index. | provisioning/run/history services, catalog service, index store, metadata store | `AgentRunHistoryCatalogService` | Atomic JSON writes, rollback on normal create failures, agent-name resolution. |
| DS-003 | Runtime state is projected from command overlays and active runtimes. Persisted files only provide identity/catalog or resume config. | status projection service, command overlay, run manager | `AgentRunStatusProjectionService` | Status/control flag mapping. |
| DS-005 | A human/operator runs a migration or repair script when legacy data needs repair. The script can scan all metadata and use deterministic fallbacks, but this logic is not part of normal app source. | script, metadata dirs, legacy index, V2 index store/writer | Migration script | Dry-run report, backup creation, deterministic timestamp fallback. |
| DS-006 | Archive/delete/cancel requests validate run identity and active-run state before mutating index and/or filesystem. The catalog boundary owns safe path containment and row removal. | GraphQL resolver, history service, catalog service, safe identity resolver, filesystem | `AgentRunHistoryCatalogService` | Active-run guard, path containment, cleanup script reuse. |

## Spine Actors / Main-Line Nodes

- `RunHistoryResolver`: GraphQL transport boundary.
- `WorkspaceRunHistoryService`: combines standalone and team history groups.
- `AgentRunHistoryService`: standalone history application boundary; delegates catalog ownership.
- `AgentRunHistoryCatalogService`: governing owner for standalone history index/catalog mutations and safe history identity.
- `AgentRunHistoryIndexStore`: low-level V2 index persistence provider.
- `AgentRunMetadataStore`: low-level resume metadata persistence provider.
- `AgentRunStatusProjectionService`: live status projection owner.
- `AgentRunProvisioningService` / `AgentRunService`: runtime lifecycle owners that request catalog changes but do not own the index.
- `migrate-agent-run-history-index-v2.mjs`: explicit offline legacy migration/repair tool.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `RunHistoryResolver` | Transport mapping and input forwarding. | Index mutation, filesystem path decisions, live status persistence. |
| `WorkspaceRunHistoryService` | Combining standalone/team history responses. | Standalone index mutation or team-field migration policy. |
| `AgentRunHistoryService` | Public standalone history use cases and result messages. | Low-level index writes or path containment internals if catalog exposes safe methods. |
| `AgentRunHistoryCatalogService` | Standalone history index authority, semantic mutation serialization, safe run-id/path validation for history mutations, in-memory catalog, allowed write events. | Runtime execution, provider session management, frontend state. |
| `AgentRunHistoryIndexStore` | Atomic V2 index file read/write. | Deciding when catalog rows change. |
| `AgentRunMetadataStore` | Atomic metadata file read/write/mutate for resume/config fields. | History-list ordering/visibility/status. |
| `AgentRunStatusProjectionService` | Derived live status/control flags. | Persisting status fields. |
| Migration/repair script | Explicit legacy data scan and V2 index repair. | Normal app list behavior or runtime lifecycle. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `getAgentRunHistoryService()` | `AgentRunHistoryService` | Existing singleton entry for history operations. | Index consistency policy. |
| `getAgentRunHistoryCatalogService()` | `AgentRunHistoryCatalogService` | Singleton by memory dir for catalog state and mutation queue. | Runtime lifecycle execution. |
| GraphQL `listWorkspaceRunHistory` | `WorkspaceRunHistoryService` and subject-specific services | Transport boundary. | Standalone/team field migration policy beyond DTO exposure. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Durable `lastKnownStatus` in standalone metadata | Live status is runtime-derived and stale after restart. | `AgentRunStatusProjectionService` response fields. | In This Change | Remove from metadata writes and normalizers. |
| `lastKnownStatus` in standalone index | Causes live/status writes and stale UI state. | Derived API `status`, `isActive`, `statusSource`. | In This Change | V2 standalone index excludes it. |
| Durable `activationState` enum | Persists transient process state; `ACTIVATING` can wedge after crash. | `preparedAt`/`preparedExpiresAt`/`startedAt` facts + in-memory activation lock. | In This Change | No persisted `ACTIVATING`/`ACTIVATION_FAILED`. |
| `lastActivityAt` in standalone index | Forces writes on ordinary activity and undermines index robustness. | Stable `createdAt` ordering; optional projection detail when opening a run. | In This Change | Normal history no longer sorts by activity. |
| `summary`, `createdAt`, `archivedAt`, `terminatedAt` in standalone metadata target | They are list/catalog facts, not resume config. | V2 standalone index row. | In This Change | Existing legacy metadata fields, if any, are not used by steady-state source. |
| Lifecycle direct calls to index service/store | Duplicates catalog policy and permits stale read-modify-write. | Semantic methods on `AgentRunHistoryCatalogService`. | In This Change | `AgentRunHistoryIndexService` becomes deleted or internal-only if no longer needed. |
| Direct script writes to `run_history_index.json` | Bypasses safe identity and semantic mutation ownership. | Catalog-safe script API or dedicated migration script with atomic writer. | In This Change | Cleanup script must not blindly rewrite index. |
| Source-code automatic full metadata scan repair | Makes the index redundant and adds hidden legacy compatibility. | Explicit migration/repair script + README. | In This Change | Normal source reads index only. |
| Team index `lastKnownStatus` / `lastActivityAt` | Same design smell. | Team follow-up refactor. | Follow-up | Must not be accidentally removed in standalone change. |

## Return Or Event Spine(s) (If Applicable)

Live status return path:

```text
Command overlay / active runtime snapshot
  -> AgentRunStatusProjectionService
  -> AgentRunHistoryService list item
  -> GraphQL response
  -> frontend controls/status dots
```

Persisted standalone history files do not carry `ACTIVE`, `IDLE`, `PROCESSING`, `ERROR`, `ACTIVATING`, or `ACTIVATION_FAILED` as durable truth.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `AgentRunHistoryCatalogService`

```text
Semantic mutation request
  -> await catalog initialization barrier
  -> enqueue on memory-dir catalog mutation queue
  -> read current in-memory row/index state
  -> read/mutate metadata only if this operation includes resume/config facts
  -> merge semantic row change
  -> update in-memory catalog
  -> atomic index flush
  -> return mutation result
```

Why it matters: serialization covers the whole semantic mutation, not only physical file writes. Two operations cannot both read an old catalog snapshot and then overwrite each other's fields.

Parent owner: `AgentRunHistoryCatalogService`

```text
Catalog initialization
  -> read V2 run_history_index.json
  -> validate row shape
  -> populate in-memory catalog
  -> if missing/corrupt, return empty/error state and log repair-script guidance
```

Why it matters: normal initialization does not scan metadata directories. The index remains the fast catalog.

Parent owner: migration/repair script

```text
Dry-run/apply request
  -> backup existing index
  -> scan agents/*/run_metadata.json
  -> merge legacy index summaries/timestamps
  -> derive createdAt deterministically
  -> write V2 index atomically on --apply
  -> print report
```

Why it matters: legacy repair is explicit, inspectable, and removable from source-code compatibility paths.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Semantic mutation queue | DS-002, DS-004 | Catalog service | Serialize full catalog mutations per memory dir. | Prevents stale read-modify-write lost updates. | Atomic writes alone would still allow lost updates. |
| Atomic JSON writing | DS-002, DS-005 | Stores/scripts | Temp write, rename, cleanup, best-effort fsync. | Prevents torn/corrupt JSON files. | Callers would implement inconsistent file safety. |
| Safe run identity resolver | DS-006 | Catalog service | Reject absolute paths, separators, `.`/`..`, draft/temp prefixes where appropriate; ensure target path stays under agents root. | Prevents unsafe archive/delete/script filesystem effects. | GraphQL/script callers could bypass containment checks. |
| Agent-name resolution | DS-002, DS-005 | Catalog service/script | Fill `agentName` for index row. | Needed for fast list display. | Lifecycle services duplicate display lookup. |
| Offline legacy migration | DS-005 | Script | Read old metadata/index and write V2 index. | Existing users may need one-time repair. | Source code would keep legacy scan/repair paths. |
| Live status projection | DS-001, DS-003 | Status projection service | Convert overlay/runtime state to response status/control flags. | Frontend needs controls without persisted status. | Persisted files would regain live status. |
| Standalone/team API split | DS-001 | GraphQL/frontend types | Change standalone item fields while preserving team item fields. | Team refactor is deferred. | Broad field removal could break team history. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Standalone history catalog ownership | `run-history` services | Extend | Existing subsystem owns history list/projection. | N/A |
| Metadata persistence | `AgentRunMetadataStore` | Extend | Existing store owns metadata paths. | N/A |
| Index persistence | `AgentRunHistoryIndexStore` | Extend | Existing store owns index file path. | N/A |
| Semantic mutation serialization | New class/private queue inside catalog service | Create inside `run-history` | Current stores serialize file writes only, not semantic operations. | Existing writer queue is too low-level. |
| Safe identity/path validation | Existing history service logic | Move/Extract into catalog-owned resolver | Current checks exist in history service but must move with archive/delete ownership. | Keeping it in GraphQL or scripts would duplicate safety policy. |
| Legacy repair scan | Scripts | Create/extend script | Source code should not retain legacy repair path. | Normal services must stay clean-cut V2. |
| Team run analogous cleanup | Team run history subsystem | Defer | Same smell but not in standalone scope. | Must preserve team API fields during standalone change. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history` services | Standalone catalog, semantic mutation queue, history DTO shaping, safe archive/delete/cancel identity. | DS-001, DS-002, DS-004, DS-006 | `AgentRunHistoryCatalogService`, `AgentRunHistoryService` | Extend | Primary edited subsystem. |
| `run-history` stores | Metadata/index atomic persistence. | DS-002, DS-004 | Catalog service | Extend | Stores do file IO, not catalog policy. |
| `agent-execution` services | Runtime create/restore/terminate and prepared activation lock. | DS-002, DS-003 | Run/provisioning services | Extend | Must call catalog for semantic history changes. |
| `api/graphql` | Transport schema/query fields. | DS-001, DS-006 | Resolver | Modify | Standalone item shape changes; team item shape remains. |
| `autobyteus-web` history store/projection | Frontend read model and controls. | DS-001, DS-003 | Pinia stores/components | Modify | Standalone fields change; team fields retained. |
| `autobyteus-server-ts/scripts` | Explicit migration/repair and cleanup tools. | DS-005, DS-006 | Operator scripts | Extend | Full metadata scan lives here, not source services. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | `run-history` | Catalog owner | In-memory catalog from index, semantic mutation serialization, safe archive/delete/cancel methods. | One governing boundary for standalone history index. | Index/metadata types, safe identity. |
| `run-history/services/agent-run-history-identity.ts` | `run-history` | Safe identity resolver | Normalize/validate run ids and paths for history filesystem operations. | Extract if reused by service + script; otherwise private to catalog. | N/A |
| `run-history/store/agent-run-history-index-record-types.ts` | `run-history` | Index schema | V2 standalone index row/file types. | One cache/catalog schema owner. | N/A |
| `run-history/store/agent-run-history-index-store.ts` | `run-history` | Index persistence | Atomic V2 index read/write. | Store owns file IO only. | Atomic writer. |
| `run-history/store/agent-run-metadata-types.ts` | `run-history` | Metadata schema | V2 resume/config shape. | One metadata type owner. | N/A |
| `run-history/store/agent-run-metadata-store.ts` | `run-history` | Metadata persistence | Atomic metadata read/write/mutate. | Store owns metadata IO. | Atomic writer. |
| `run-history/store/atomic-json-file-writer.ts` | `run-history` | Persistence mechanism | Temp+rename atomic JSON writes. | Shared file-safety mechanism. | N/A |
| `autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs` | Scripts | Migration/repair tool | Full metadata scan, deterministic V2 index generation, dry-run/apply report. | Explicit legacy data operation. | Atomic writer or local safe write. |
| `autobyteus-server-ts/scripts/run-history-index-migration.md` | Scripts/docs | Operator README | Explain when/how to run migration/repair script and backups. | User-facing process doc. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Atomic JSON write | `run-history/store/atomic-json-file-writer.ts` | `run-history` persistence | Metadata/index both need safe physical writes. | Yes | Yes | Business transaction coordinator. |
| Semantic catalog mutation queue | private in `agent-run-history-catalog-service.ts` or `catalog-mutation-queue.ts` | `run-history` services | Queue covers full semantic mutation, not just file write. | Yes | Yes | Generic event bus. |
| Safe run identity/path validation | `agent-run-history-identity.ts` if shared | `run-history` services | Needed by archive/delete/cancel and cleanup script path selection. | Yes | Yes | General filesystem helper for unrelated paths. |
| V2 index row derivation for script | script-local mapper or shared index row normalizer | Scripts / run-history | Deterministic repair generation. | Yes | Yes | Source-code legacy auto-repair path. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentRunMetadataV2` | Yes | Yes | Low | Resume/config + prepared/start facts only. |
| `AgentRunHistoryIndexRowRecordV2` | Yes | Yes | Low | Standalone history catalog fields only. |
| Standalone GraphQL history item | Yes | Yes | Low | Uses `createdAt`, `archivedAt`, `terminatedAt`, derived `status`/`isActive`; no `lastKnownStatus`/`lastActivityAt`. |
| Team GraphQL history item | Existing meaning retained | No, by deferral | Medium, accepted residual | Keep current team fields until team refactor. Do not map standalone assumptions onto team rows. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-catalog-service.ts` | `run-history` | Authoritative standalone history catalog boundary | Load V2 index into memory; expose list rows; serialize semantic mutations; own archive/delete/cancel safety; flush V2 index. | One owner for standalone history index correctness. | Index store, metadata store, safe identity. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts` | `run-history` | Safe identity resolver | Validate normalized run ids and contained paths for history operations. | Explicit owner for filesystem safety if reused beyond one file. | N/A |
| `autobyteus-server-ts/src/run-history/store/atomic-json-file-writer.ts` | `run-history` | Persistence mechanism | Canonical-path queue, temp write, rename, cleanup, best-effort fsync. | Reused by metadata/index stores. | N/A |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-record-types.ts` | `run-history` | Standalone index schema | V2 file/row types without live fields. | One schema owner. | N/A |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-store.ts` | `run-history` | Index persistence provider | Read/write V2 index only; no metadata scanning; no lifecycle policy. | File IO only. | Atomic writer. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` | `run-history` | Metadata schema | V2 resume/config/prepared-start facts; no live/catalog fields. | One metadata owner. | N/A |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | `run-history` | Metadata persistence provider | Read/write/mutate V2 metadata; allow runtime restore reads. | File IO only. | Atomic writer. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | `run-history` | Decommissioned | Remove public lifecycle writer role; delete if fully replaced. | Avoid competing index owner. | N/A |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | `run-history` | Public standalone history service | Delegate list/archive/delete/cancel to catalog service and overlay status. | Existing API-facing use-case boundary. | Catalog service. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | `agent-execution` | Preparation/activation owner | Create metadata then catalog row through catalog service; no durable activationState. | Existing runtime lifecycle owner. | Catalog service. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `agent-execution` | Runtime service | Restore without persisted TERMINATED block; record terminate/summary through catalog service. | Existing runtime lifecycle owner. | Catalog service. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts` | `agent-execution` | Command routing | Use metadata prepared/start facts for activate vs restore. | Existing command owner. | Metadata store/service. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts` | `agent-execution` | Live status owner | Derive status from overlay/runtime; no persisted status fallback for standalone. | Existing owner. | N/A |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | API | GraphQL transport | Split standalone item shape change from retained team item shape. | Existing schema file already has separate standalone/team object classes. | Domain types. |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Frontend GraphQL | Query shape | Query standalone `createdAt`, `archivedAt`, `terminatedAt`; keep team fields until follow-up. | Existing query file. | Frontend types. |
| `autobyteus-web/stores/runHistoryTypes.ts` and history projections | Frontend store/projection | Frontend read model | Standalone sort by `createdAt`; team sort remains current `lastActivityAt`. | Existing read-model owners. | Frontend types. |
| `autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs` | Scripts | Offline migration/repair | Scan metadata, merge legacy index data, write V2 index; dry-run by default. | Explicit operator tool. | Safe identity/atomic writer if importable; otherwise local equivalent. |
| `autobyteus-server-ts/scripts/run-history-index-migration.md` | Scripts/docs | Operator documentation | Explain backup, dry-run, apply, and when to use repair. | Keeps legacy repair out of source. | N/A |
| `autobyteus-server-ts/scripts/cleanup-codex-e2e-run-history.mjs` | Scripts | Maintenance cleanup | Stop direct index rewriting; call safe cleanup routine or use same safe identity/atomic writer. | Removes boundary bypass. | Safe identity. |

## Ownership Boundaries

`AgentRunHistoryCatalogService` is the authoritative boundary for standalone history index/catalog correctness. All callers that want to create, update summary/title, archive, unarchive, terminate, delete, or cancel a standalone history row must call semantic catalog methods.

`AgentRunMetadataStore` remains readable by runtime restore/config paths. That read access is allowed because resume metadata is its own subject. However, catalog-visible fields are not mutated through metadata store because they no longer live there in the target model.

`AgentRunHistoryIndexStore` is internal to the catalog boundary. No lifecycle service, GraphQL resolver, or script may direct-write `run_history_index.json` unless it is an explicit offline migration script using the documented script path.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService` | Index store, in-memory catalog, semantic mutation queue, safe identity resolver, metadata store for paired create/delete/cancel operations | `AgentRunHistoryService`, `AgentRunService`, `AgentRunProvisioningService`, cleanup script adapters | Direct `AgentRunHistoryIndexStore` calls or `fs.writeFile(run_history_index.json)` from lifecycle code | Add semantic catalog method. |
| `AgentRunStatusProjectionService` | Command overlay, command registry, active runtime manager | History service, GraphQL status callers | Reading `lastKnownStatus` from persisted files for controls | Add projected status/control field. |
| `AgentRunMetadataStore` | Metadata path/normalization/atomic JSON write | Runtime restore/config callers and catalog service | External writes of removed catalog/status fields | Add metadata method for config/prepared/start facts only. |
| Migration/repair script | Full metadata scan and legacy fallback logic | Operator only | Embedding legacy scan/repair in normal source services | Update script/README. |

## Dependency Rules

Allowed:

- `AgentRunHistoryService` may depend on `AgentRunHistoryCatalogService` and `AgentRunStatusProjectionService`.
- `AgentRunHistoryCatalogService` may depend on metadata/index stores, safe identity resolver, and agent definition lookup.
- `AgentRunService` and `AgentRunProvisioningService` may depend on catalog service for semantic standalone history mutations.
- Runtime restore/config services may read metadata through `AgentRunMetadataStore`/existing service because metadata owns resume config.
- Offline scripts may scan metadata directories, but only as explicit operator tools.

Forbidden:

- Normal source list/startup path must not scan all metadata directories to repair the history index.
- Lifecycle services must not call index store/service directly.
- Scripts must not direct-write `run_history_index.json` without using the migration/cleanup script's safe identity and atomic writer contract.
- Persisted standalone files must not store live status (`ACTIVE`, `IDLE`, runtime `ERROR`, `ACTIVATING`, `ACTIVATION_FAILED`).
- Normal message activity must not write the index solely to update recency.
- Team fields must not be removed as a side effect of standalone field cleanup.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService.listCatalogRows()` | Standalone history catalog | Return rows from in-memory V2 index-backed catalog. | memory-dir singleton | No metadata scan. |
| `recordPreparedRun({ runId, metadata, row })` | Standalone run creation | Create metadata/config and index row as one serialized semantic operation. | normalized runId + metadata + row | If index write fails normally, rollback metadata and return failure. |
| `recordRunStarted({ runId, platformAgentRunId, startedAt })` | Metadata prepared/start facts | Mark started/restorable metadata facts. | normalized runId | Does not write `ACTIVE`; may clear index `terminatedAt` on resume. |
| `recordRunSummary({ runId, summary })` | Catalog summary | Fill/update summary only when changed by accepted policy. | normalized runId | No activity timestamp. |
| `recordRunTerminated({ runId, terminatedAt })` | Catalog lifecycle fact | Store explicit termination timestamp in index. | normalized runId | Does not block resume. |
| `archiveRun(rawRunId)` / `unarchiveRun(rawRunId)` | User visibility lifecycle | Validate ID, ensure inactive, set/clear `archivedAt` in index. | raw external runId accepted, normalized internally | Catalog validates, not caller. |
| `deleteRun(rawRunId)` / `cancelPreparedRun(rawRunId)` | Run deletion/cancel | Validate ID/path, ensure inactive where needed, remove index row and filesystem data in chosen order. | raw external runId accepted, normalized internally | Catalog owns path containment. |
| `repairIndex` script CLI | Offline repair | Scan all metadata and write V2 index. | `--memory-dir`, `--dry-run`, `--apply` | Not imported into source list path. |
| GraphQL `listWorkspaceRunHistory` | Workspace history DTO | Return standalone and team groups with subject-specific item fields. | `limitPerAgent` | Standalone field cleanup; team fields retained. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Catalog mutation methods | Yes | Yes | Low | Operation-specific methods; no generic row patch exposed to callers. |
| Archive/delete/cancel methods | Yes | Yes after revision | Low | Accept raw ID but validate/normalize internally through safe identity resolver. |
| `listWorkspaceRunHistory` | Yes | Yes | Medium | Keep separate standalone/team object shapes and frontend types. |
| `repairIndex` script | Yes | Yes | Low | CLI only; no source-code auto-repair. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Standalone history catalog owner | `AgentRunHistoryCatalogService` | Yes | Low | Owns catalog semantics, not only index IO. |
| Low-level index file store | `AgentRunHistoryIndexStore` | Yes | Low | Store remains file IO provider. |
| Safe ID/path resolver | `AgentRunHistoryIdentity` or `agent-run-history-identity.ts` | Yes | Low | Use concrete history wording, not generic helper. |
| Offline repair tool | `migrate-agent-run-history-index-v2.mjs` | Yes | Low | Names explicit migration/repair purpose. |

## Applied Patterns (If Any)

- **Catalog owner**: `AgentRunHistoryCatalogService` owns the standalone history-list catalog and mutation policy.
- **Semantic mutation queue**: serializes full mutation transactions at catalog level. This is distinct from atomic physical writes.
- **Atomic JSON persistence**: stores/scripts write JSON via temp+rename and cleanup.
- **Offline migration script**: legacy repair is operator-run, not normal source compatibility.
- **Safe identity resolver**: centralizes run-id/path containment checks for filesystem-affecting history operations.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-catalog-service.ts` | File | Catalog owner | Index-backed in-memory catalog, semantic mutation queue, catalog lifecycle methods. | History service layer owns catalog policy. | Runtime execution/provider logic. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-identity.ts` | File | Safe identity resolver | Safe run-id and path containment validation. | Used by history mutations and possibly scripts. | Generic unrelated path helpers. |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-record-types.ts` | File | Index schema | V2 standalone index types. | Existing schema owner. | Team row schema or live status types. |
| `autobyteus-server-ts/src/run-history/store/agent-run-history-index-store.ts` | File | Index persistence | Atomic read/write of V2 index. | Existing store path. | Metadata scan/repair policy. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` | File | Metadata schema | Resume/config/prepared-start facts. | Existing metadata owner. | History catalog fields/live status. |
| `autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts` | File | Metadata persistence | Atomic metadata read/write/mutate. | Existing store path. | Index/catalog mutation decisions. |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | File | GraphQL transport | Separate standalone/team item shapes. | Existing schema file. | Hidden migration compatibility. |
| `autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs` | File | Offline migration | Full metadata scan and V2 index generation. | Scripts are correct home for manual repair. | Runtime service imports that create normal auto-repair. |
| `autobyteus-server-ts/scripts/run-history-index-migration.md` | File | Operator docs | Explain migration/repair workflow. | Near script. | Product source behavior. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `run-history/services` | Main-Line Domain-Control | Yes | Low | Catalog and safe identity belong near history use cases. |
| `run-history/store` | Persistence-Provider | Yes | Low | Stores do IO and schema normalization only. |
| `agent-execution/services` | Runtime Domain-Control | Yes | Medium | Runtime services call catalog but do not own index policy. |
| `api/graphql/types` | Transport | Yes | Low | Subject-specific GraphQL object classes already exist. |
| `autobyteus-server-ts/scripts` | Maintenance | Yes | Low | Explicit scan/repair belongs outside source services. |
| `autobyteus-web/stores` | Frontend read model | Yes | Medium | Must keep standalone/team field assumptions separate. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Normal history list | `index -> in-memory catalog -> live status overlay` | `index -> scan all metadata -> repair on every list` | Preserves reason for the index. |
| Index row shape | `{ runId, agentDefinitionId, agentName, workspaceRootPath, summary, createdAt, archivedAt, terminatedAt }` | `{ ..., lastActivityAt, lastKnownStatus, activationState }` | Keeps index stable and low-write. |
| Semantic mutation serialization | `enqueue(recordRunSummary) -> read current row -> merge summary -> update memory -> atomic flush` | `read index outside queue -> later queued write` | Prevents stale overwrites. |
| Activity handling | First title/summary fill may update index; ordinary messages do not. | Every message updates `lastActivityAt` and `ACTIVE`. | Removes frequent conflict source. |
| Legacy createdAt migration | Script fallback: V2 index createdAt -> legacy metadata createdAt -> legacy metadata preparedAt -> legacy index lastActivityAt -> metadata birthtime -> metadata mtime -> run dir birthtime -> run dir mtime -> migration time warning. | Source list silently invents createdAt every startup. | Keeps migration deterministic and explicit. |
| Safe delete identity | `deleteRun(rawId)` validates no separators/absolute/`.`/`..`, resolves under agents root, checks inactive, removes catalog row, then filesystem. | Script joins arbitrary runId into path and rewrites index directly. | Prevents unsafe filesystem effects. |
| Standalone/team API coexistence | Standalone item has `createdAt`; team item keeps `lastActivityAt`/`lastKnownStatus` until follow-up. | Remove common `lastActivityAt` everywhere. | Prevents accidental team breakage. |

Concrete standalone/team GraphQL field shape during this refactor:

```graphql
query ListWorkspaceRunHistory($limitPerAgent: Int) {
  listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
    workspaceRootPath
    workspaceName
    agentDefinitions {
      agentDefinitionId
      agentName
      runs {
        runId
        summary
        createdAt
        archivedAt
        terminatedAt
        status
        isActive
        shouldConnectStream
        statusSource
      }
    }
    teamDefinitions {
      teamDefinitionId
      teamDefinitionName
      runs {
        teamRunId
        summary
        lastActivityAt
        lastKnownStatus
        status
        deleteLifecycle
        isActive
        members { memberRouteKey memberName memberRunId status runtimeKind workspaceRootPath }
      }
    }
  }
}
```

Concrete create/prepared semantic mutation shape:

```text
recordPreparedRun(rawInput)
  -> catalogQueue.enqueue(async () => {
       validate normalized runId and row fields
       write V2 metadata/config atomically
       add row to in-memory catalog
       try atomicFlushIndex()
       catch error:
         remove row from in-memory catalog
         best-effort remove newly-created metadata dir
         throw creation failure
     })
```

This is deliberately stronger than an atomic file writer: the read/merge/in-memory update/flush/rollback sequence is one serialized semantic operation.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Source-code scan of all metadata to repair partial indexes | Would self-heal old broken data. | Rejected | Explicit migration/repair script + README. |
| Keep V1 and V2 index fields in source | Easier frontend transition. | Rejected | Write V2 standalone fields only; update standalone frontend/API. |
| Keep `lastKnownStatus` in standalone API while removing persisted field | Reduce frontend churn. | Rejected for standalone target | Use derived `status`/`isActive`/`statusSource`. |
| Keep `activationState` but avoid some values | Smaller backend diff. | Rejected | Replace with prepared/start facts and in-memory activation lock. |
| Remove team fields in same API sweep | Symmetric cleanup. | Rejected/deferred | Preserve team item shape until team history refactor. |
| Add `run_catalog.json` sidecar | Could separate list data from index name. | Rejected | Existing `run_history_index.json` is the catalog file for this refactor. |

## Derived Layering (If Useful)

- Transport: GraphQL run-history types/resolvers.
- Application/use-case: `WorkspaceRunHistoryService`, `AgentRunHistoryService`.
- Domain-control/catalog: `AgentRunHistoryCatalogService`, status projection service, runtime lifecycle services.
- Persistence providers: metadata store, index store, atomic JSON writer.
- Maintenance: migration/repair scripts.
- Frontend read model: run history stores/projections/components.

Layering is descriptive only. The boundary rule is primary: source callers use the catalog owner for standalone history mutations.

## Migration / Refactor Sequence

1. Add V2 standalone index and metadata types.
2. Add atomic JSON writer if not already available for both metadata and index stores.
3. Implement catalog-level semantic mutation queue in `AgentRunHistoryCatalogService`:
   - queue is per memory dir;
   - initialization barrier runs before mutation;
   - reducer/operation executes inside queue;
   - in-memory catalog update and atomic index flush occur in the same queued operation.
4. Implement safe run identity/path resolver and move archive/delete/cancel validation behind catalog methods.
5. Implement V2 index store read/write without metadata scanning.
6. Implement `AgentRunHistoryCatalogService` list/load from index only; if missing/corrupt, log actionable migration-script guidance and return an empty catalog or explicit recoverable error per existing UI expectations.
7. Retarget lifecycle services:
   - prepare/create writes metadata/config and index row through catalog service;
   - runtime start sets `startedAt`/platform reference in metadata but never writes `ACTIVE`;
   - activity no longer writes index except summary/title fill;
   - terminate writes `terminatedAt` in index and does not block resume;
   - archive/delete/cancel use catalog safe methods.
8. Decommission public lifecycle uses of `AgentRunHistoryIndexService`; delete or internalize it.
9. Add explicit migration/repair script and README:
   - dry-run by default;
   - backup current index before apply;
   - scan all metadata only inside script;
   - deterministic `createdAt` fallback;
   - report orphan metadata and stale index rows.
10. Update cleanup script so it does not directly rewrite `run_history_index.json`; it must use safe catalog/script logic or a local safe atomic writer with the same identity rules.
11. Update GraphQL/backend types:
   - standalone history item removes `lastActivityAt`/`lastKnownStatus` and adds `createdAt`, `archivedAt`, `terminatedAt`;
   - team history item keeps existing fields.
12. Update frontend query/types/projections:
   - standalone rows use `createdAt` sorting and derived status labels;
   - team rows continue using team `lastActivityAt`/`lastKnownStatus` until follow-up.
13. Add tests for semantic mutation serialization, rare write events, safe identity/delete/archive, explicit script migration, standalone/team API coexistence, and no index writes on ordinary activity/status.

## Key Tradeoffs

- Keeping the index preserves the original fast history-list purpose. The cost is maintaining a second file, but the second file now owns a distinct catalog subject rather than duplicated live state.
- Removing `lastActivityAt` sacrifices cross-restart recency ordering. This is accepted to avoid frequent writes and because creation-time ordering matches the desired UX.
- No automatic metadata scan means corrupted/partial legacy indexes require an explicit script. This is intentional to avoid backward-compatible source complexity and preserve index performance.
- File-based cross-file operations cannot be perfectly transactional. The design reduces risk by rare writes, one semantic queue, ordered operations, rollback on normal errors, and manual repair for crash windows.

## Risks

- Existing data with partial indexes must be repaired by the new script; source code will not silently fix it.
- Users who skip the migration/repair script may still not see legacy orphan metadata runs until repair is run.
- Frontend fixtures/tests need standalone/team field split updates.
- Delete/cancel operations can still leave orphan files if process crashes after catalog removal and before filesystem cleanup; cleanup script should report/remove orphans.
- Team-run index/status debt remains until a follow-up.

## Guidance For Implementation

- Do not implement automatic metadata scanning in `AgentRunHistoryService` or `AgentRunHistoryCatalogService` normal list path.
- Treat `run_history_index.json` as the standalone history catalog, not merely a cache.
- Make catalog service mutation methods semantic and queued; do not expose generic row patching to lifecycle callers.
- Ensure physical atomic writer is not mistaken for full mutation serialization.
- On create/prepared run, do not report success/start runtime until metadata/config and index row are both committed. On ordinary write failure, rollback any newly-created metadata directory.
- On delete/cancel, prefer removing the catalog row first, then filesystem data, so deleted runs do not remain visible if cleanup is interrupted; report cleanup failure and provide script guidance.
- Keep migration script dry-run by default and backup the existing index on apply.
- The migration script's `createdAt` fallback order must be deterministic:
  1. existing V2 index `createdAt`;
  2. legacy metadata `createdAt` if present;
  3. legacy metadata `preparedAt`;
  4. legacy index `lastActivityAt` for that run;
  5. metadata file birthtime;
  6. metadata file mtime;
  7. run directory birthtime;
  8. run directory mtime;
  9. current migration time with warning.
- Persist the derived `createdAt` into the V2 index row; do not add source-code fallback branches for old data.
- Standalone API/frontend cleanup must not remove or reinterpret team history fields until the team follow-up.
