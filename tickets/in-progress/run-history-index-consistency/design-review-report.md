# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md`
- Current Review Round: 4
- Trigger: Latest design update from `solution_designer` on 2026-05-21 after user questioned whether standalone `run_history_index.json` needs a persisted file-level `version` attribute.
- Prior Review Round Reviewed: Round 3 pass in this canonical report path.
- Latest Authoritative Round: 4
- Current-State Evidence Basis: Reviewed latest requirements, investigation notes, persisted attribute audit, and design spec. Rechecked prior design conclusions around app-data migration framework, index-as-catalog boundary, and standalone/team scope.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | 4 | Fail | No | Direction was sound but under-specified semantic mutation serialization, `createdAt` migration, safe filesystem identity, and standalone/team API scope. |
| 2 | Revised index-as-catalog/no-normal-scan design | 4 | 0 | Pass | No | Prior findings were resolved; optional script was the primary legacy repair path. |
| 3 | Design update to use startup app-data migration framework | 0 | 0 | Pass | No | App-data migration framework became the primary automatic V1→V2 repair boundary. |
| 4 | Design update to remove standalone file-level index `version` | 0 | 0 | Pass | Yes | Plain JSON row array is accepted; app-data migration records provide migration/version execution state. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md` with emphasis on the latest standalone index file shape:

```ts
type AgentRunHistoryIndexFileRecordV2 = AgentRunHistoryIndexRowRecordV2[];
```

The design explicitly removes a standalone file-level `version` wrapper and keeps team index cleanup deferred.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design still classifies the task as bug fix + behavior cleanup + architecture refactor + performance-cache simplification. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Root cause remains boundary/ownership issue, duplicated coordination, and shared-structure looseness from high-frequency index writes and persisted live/status fields. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Standalone refactor is in scope; team-run index/version cleanup remains a named follow-up. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Plain row-array index, strict row validation, app-data migration records, and no steady-state V1/V2 branching form a coherent data-model boundary. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-DI-001 | High | Resolved | Semantic mutation queue remains in the latest design. | Still passed. |
| 1 | AR-DI-002 | Medium | Resolved | Deterministic `createdAt` fallback remains assigned to app-data migration/fallback script. | Still passed. |
| 1 | AR-DI-003 | Medium | Resolved | Safe identity/path resolver remains catalog-owned for archive/delete/cancel. | Still passed. |
| 1 | AR-DI-004 | Medium | Resolved | Standalone/team API split remains explicit. | Still passed. |
| 2 | N/A | N/A | No unresolved findings | Round 2 passed. | Still no open finding. |
| 3 | N/A | N/A | No unresolved findings | Round 3 passed. | Latest no-version revision introduces no new finding. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Normal history listing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Catalog mutation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Runtime/command status projection | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Serialized semantic catalog mutation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Startup app-data migration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Archive/delete/cancel filesystem-safe mutation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history` services | Pass | Pass | Pass | Pass | Catalog owner remains the steady-state mutation authority. |
| `run-history` stores | Pass | Pass | Pass | Pass | Store should read/write a plain V2 row-array file for standalone history. |
| `app-data-migrations` | Pass | Pass | Pass | Pass | Existing migration records are the correct version/migration-state authority. |
| `agent-execution` services | Pass | Pass | Pass | Pass | Runtime lifecycle services call catalog methods only. |
| `api/graphql` + frontend history | Pass | Pass | Pass | Pass | Standalone item field changes remain scoped; team fields retained. |
| scripts / maintenance | Pass | Pass | Pass | Pass | Optional fallback script must use same plain row-array target. |
| team-run history | Pass | Pass | Pass | Pass | Team index version cleanup is explicitly deferred. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Atomic JSON writer | Pass | Pass | Pass | Pass | File writer remains physical-write safety only. |
| Semantic catalog mutation queue | Pass | Pass | Pass | Pass | Unchanged and sound. |
| Safe run identity/path validation | Pass | Pass | Pass | Pass | Unchanged and sound. |
| V2 index row validation/normalization | Pass | Pass | Pass | Pass | Strict row validation replaces file-level schema version branching. |
| App-data migration record/log summary | Pass | Pass | Pass | Pass | Correct owner for migration/version execution state. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunMetadataV2` | Pass | Pass | Pass | Pass | Pass | Resume/config plus prepared/start facts only. |
| `AgentRunHistoryIndexFileRecordV2` | Pass | Pass | Pass | N/A | Pass | Plain array of standalone history catalog rows; no file-level `version`. |
| `AgentRunHistoryIndexRowRecordV2` | Pass | Pass | Pass | N/A | Pass | Standalone catalog fields only. |
| Standalone GraphQL/frontend history item | Pass | Pass | Pass | Pass | Pass | Uses `createdAt`, `archivedAt`, `terminatedAt`, and derived status fields. |
| Team GraphQL/frontend history item | Pass | Pass with residual debt | Pass | Pass | Pass | Current fields, including team index/version concerns, remain deferred. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Durable `lastKnownStatus` in standalone metadata/index | Pass | Pass | Pass | Pass | Removed from steady-state standalone writes/API. |
| Durable `activationState` | Pass | Pass | Pass | Pass | Replaced by prepared/start facts and in-memory activation lock. |
| `lastActivityAt` in standalone index | Pass | Pass | Pass | Pass | Replaced by `createdAt` ordering. |
| File-level `version` in standalone index | Pass | Pass | Pass | Pass | Replaced by app-data migration record plus strict V2 row validation. |
| Lifecycle direct index service/store calls | Pass | Pass | Pass | Pass | Replaced by catalog service methods. |
| Source-code full metadata scan repair in history listing | Pass | Pass | Pass | Pass | Replaced by startup-once app-data migration. |
| Team index/status/version debt | Pass | Pass | Pass | Pass | Follow-up only. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | Pass | Pass | Pass | Pass | Owns steady-state catalog and semantic mutations. |
| `run-history/store/agent-run-history-index-record-types.ts` | Pass | Pass | Pass | Pass | Should define plain array file shape and row type, no standalone version constant/wrapper. |
| `run-history/store/agent-run-history-index-store.ts` | Pass | Pass | Pass | Pass | Should read/write strict plain row arrays. |
| `run-history/store/agent-run-metadata-*` | Pass | Pass | Pass | Pass | Resume/config metadata only. |
| `app-data-migrations/migrations/run-history-index-v2-migration.ts` | Pass | Pass | Pass | Pass | Owns automatic migration to plain row-array index. |
| `app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | N/A | Pass | Registers migration as `requiredOnStartup`. |
| API/frontend files | Pass | Pass | Pass | Pass | Standalone/team split unchanged. |
| fallback repair/cleanup scripts | Pass | Pass | Pass | Pass | Optional maintenance only; same plain row-array target. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService` | Pass | Pass | Pass | Pass | Authoritative steady-state standalone history mutation boundary. |
| `RunHistoryIndexV2AppDataMigration` | Pass | Pass | Pass | Pass | Authorized automatic full-scan and schema/data conversion boundary. |
| `AgentRunHistoryIndexStore` | Pass | Pass | Pass | Pass | Internal plain-array persistence provider; no schema-version branching authority. |
| `AgentRunStatusProjectionService` | Pass | Pass | Pass | Pass | Live status remains non-persistent. |
| API/frontend field dependencies | Pass | Pass | Pass | Pass | Team field deferral explicit. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService` | Pass | Pass | Pass | Pass | Semantic methods prevent lifecycle/index-store bypass. |
| `RunHistoryIndexV2AppDataMigration` | Pass | Pass | Pass | Pass | App-data migration records own migration execution state, not the index file. |
| `AgentRunHistoryIndexStore` | Pass | Pass | Pass | Pass | Strict V2 row-array validation only. |
| `AgentRunStatusProjectionService` | Pass | Pass | Pass | Pass | No persisted standalone status fallback. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService.listCatalogRows()` | Pass | Pass | Pass | Low | Pass |
| Catalog mutation methods | Pass | Pass | Pass | Low | Pass |
| `archiveRun` / `unarchiveRun` / `deleteRun` / `cancelPreparedRun` | Pass | Pass | Pass | Low | Pass |
| `RunHistoryIndexV2AppDataMigration.execute()` | Pass | Pass | Pass | Low | Pass |
| `AgentRunHistoryIndexStore.readIndex/writeIndex` target shape | Pass | Pass | Pass | Low | Pass |
| GraphQL `listWorkspaceRunHistory` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | Pass | Pass | Low | Pass | Correct domain-control placement. |
| `run-history/store/agent-run-history-index-*` | Pass | Pass | Low | Pass | Correct index row-array schema/persistence placement. |
| `app-data-migrations/migrations/run-history-index-v2-migration.ts` | Pass | Pass | Low | Pass | Correct startup data migration placement. |
| `agent-execution/services/*` | Pass | Pass | Medium | Pass | Runtime service edits remain dependency-retargeting. |
| `api/graphql/types` | Pass | Pass | Low | Pass | Existing separate standalone/team object classes support split. |
| `autobyteus-server-ts/scripts` | Pass | Pass | Low | Pass | Correct home for optional manual repair. |
| frontend run-history files | Pass | Pass | Medium | Pass | Careful implementation needed, design is clear. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Standalone catalog owner | Pass | Pass | Pass | Pass | New service remains justified. |
| Metadata/index persistence | Pass | Pass | Pass | Pass | Existing stores are extended. |
| App-data migration/version state | Pass | Pass | N/A | Pass | Existing migration record table makes standalone file-level version unnecessary. |
| Semantic mutation serialization | Pass | Pass | Pass | Pass | Queue remains justified. |
| Team cleanup | Pass | Pass | N/A | Pass | Correctly deferred. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| V1 standalone index/source list auto-repair | No steady-state wrapper | Pass | Pass | V1→V2 repair is app-data migration, not history-list code. |
| Standalone file-level `version` wrapper | No target retention | Pass | Pass | Removed to avoid multi-schema branching pressure. |
| V1 standalone metadata status fields | No steady-state wrapper | Pass | Pass | Removed from written target. |
| Standalone API `lastKnownStatus`/`lastActivityAt` | No | Pass | Pass | Replaced by derived status and `createdAt`. |
| Team old fields/version handling | Yes, deliberate deferral | Pass | Pass | Explicitly preserved until team follow-up. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| V2 standalone index/metadata types | Pass | Pass | Pass | Pass |
| Plain row-array index store conversion | Pass | Pass | Pass | Pass |
| Catalog service introduction | Pass | Pass | Pass | Pass |
| Lifecycle service retargeting | Pass | Pass | Pass | Pass |
| Startup app-data migration | Pass | Pass | Pass | Pass |
| Optional repair/cleanup script refactor | Pass | Pass | Pass | Pass |
| GraphQL/frontend standalone/team migration | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Plain index file shape | Yes | Pass | Pass | Pass | `type AgentRunHistoryIndexFileRecordV2 = AgentRunHistoryIndexRowRecordV2[]` is concrete. |
| Normal history list without metadata scan | Yes | Pass | Pass | Pass | Clear. |
| Startup app-data migration flow | Yes | Pass | Pass | Pass | Clear. |
| Semantic mutation serialization | Yes | Pass | Pass | Pass | Queued mutation example remains clear. |
| Legacy `createdAt` migration | Yes | Pass | Pass | Pass | Fallback chain remains clear. |
| Standalone/team API coexistence | Yes | Pass | Pass | Pass | Concrete GraphQL example remains clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Future standalone index schema changes | Without a file-level version, future schema changes should use new app-data migrations and strict row validation. | Accept current design; add future migration if the file shape changes again. | Accepted. |
| Post-migration crash window across metadata/index multi-file operations | A one-time migration record will not automatically rerun after a later successful migration record unless retried/versioned. | Treat as accepted file-based residual; optional repair script or future journal/locking task covers rare future inconsistency. | Accepted residual. |
| Cross-process writes to one memory dir | In-process semantic queue does not protect multiple server processes. | Keep explicit residual risk. | Accepted residual. |
| Team-run history analogous debt | Team index/status/version fields have similar smells. | Track as follow-up; preserve team API fields in this change. | Accepted residual. |

## Review Decision

Pass: the design remains ready for implementation with the no-file-level-version standalone index update.

The latest revision improves data-model tightness. A plain JSON array of V2 standalone catalog rows is a cleaner steady-state shape because the app-data migration framework already records migration/version execution state in `app_data_migration_records`. Strict V2 row validation plus startup app-data migration gives enough schema boundary without adding persisted file-level surface area or encouraging V1/V2 compatibility branches.

## Findings

None.

## Classification

N/A — no open findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Normal history listing will not scan metadata to self-heal; legacy repair depends on the app-data migration succeeding or being retried.
- Future standalone index schema changes should be handled with a new app-data migration rather than a standing file-level version branch.
- A future crash after V2 migration has already succeeded can still create a rare metadata/index or index/filesystem inconsistency; this remains an accepted file-based storage residual covered by manual repair/future hardening.
- Cross-process locking remains deferred unless normal desktop operation permits multiple server processes writing the same memory directory.
- Team-run history keeps analogous status/index/version debt until a follow-up refactor.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Latest authoritative design is round 4. Proceed with a standalone `run_history_index.json` stored as a plain JSON array of strict V2 catalog rows; do not implement a standalone file-level `version` wrapper.
