# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md`
- Current Review Round: 3
- Trigger: Latest design update from `solution_designer` on 2026-05-21 after user pointed out the existing app-data migration framework.
- Prior Review Round Reviewed: Round 2 pass in this canonical report path.
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Reviewed the latest requirements, investigation notes, persisted attribute audit, and design spec. Spot-checked existing app-data migration framework source: `server-runtime.ts`, `app-data-migration-runner.ts`, `app-data-migration-registry.ts`, `repositories/app-data-migration-record-repository.ts`, and `migrations/team-run-metadata-member-tree-migration.ts`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | 4 | Fail | No | Direction was sound but under-specified semantic mutation serialization, `createdAt` migration, safe filesystem identity, and standalone/team API scope. |
| 2 | Revised index-as-catalog/no-normal-scan design | 4 | 0 | Pass | No | Prior findings were resolved; optional script was the primary legacy repair path. |
| 3 | Design update to use startup app-data migration framework | 0 | 0 | Pass | Yes | Existing app-data migration framework is a better owner for automatic V1→V2 repair than an operator-only script; normal history listing remains index-only. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md` together with the revised requirements, investigation notes, persisted attribute audit, and existing app-data migration source.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design continues to classify the work as a bug fix + behavior cleanup + architecture refactor + performance-cache simplification. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The design ties the bug to over-frequent global index writes, stale read-modify-write exposure, direct script bypass, and persisted live/status fields. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design keeps the bounded standalone refactor now; team-run cleanup and cross-process locking remain named deferrals. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The latest design uses `AgentRunHistoryCatalogService` for steady-state semantic mutations and `RunHistoryIndexV2AppDataMigration` for one-time legacy/full-scan migration. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-DI-001 | High | Resolved | Semantic mutation queue remains in the design and is unaffected by the app-data migration update. | Still passed. |
| 1 | AR-DI-002 | Medium | Resolved | Deterministic `createdAt` fallback is now assigned to the app-data migration/fallback script rather than only an operator script. | Still passed. |
| 1 | AR-DI-003 | Medium | Resolved | Safe identity/path resolver remains catalog-owned for archive/delete/cancel; scripts must not direct-write unsafely. | Still passed. |
| 1 | AR-DI-004 | Medium | Resolved | Standalone/team API split remains explicit; team fields are preserved. | Still passed. |
| 2 | N/A | N/A | No unresolved findings | Round 2 passed. | Latest revision introduces no new finding. |

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
| `run-history` services | Pass | Pass | Pass | Pass | Correct home for catalog service, semantic mutation queue, and safe identity. |
| `run-history` stores | Pass | Pass | Pass | Pass | Stores remain persistence providers. |
| `agent-execution` services | Pass | Pass | Pass | Pass | Runtime lifecycle services request catalog mutations but do not own index policy. |
| `app-data-migrations` | Pass | Pass | Pass | Pass | Existing required-on-startup migration framework is the correct automatic full-scan boundary. |
| `api/graphql` + frontend history | Pass | Pass | Pass | Pass | Standalone and team DTO shapes remain separated. |
| scripts / maintenance | Pass | Pass | Pass | Pass | Optional script remains a fallback/diagnostic path, not the primary migration owner. |
| team-run history | Pass | Pass | Pass | Pass | Deferred without contaminating standalone changes. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Atomic JSON writer | Pass | Pass | Pass | Pass | Used by stores/migration/script for physical write safety. |
| Semantic catalog mutation queue | Pass | Pass | Pass | Pass | Correctly distinct from physical writes. |
| Safe run identity/path validation | Pass | Pass | Pass | Pass | Correctly attached to catalog/filesystem-affecting operations. |
| V2 index row derivation / legacy migration mapper | Pass | Pass | Pass | Pass | Now belongs primarily to `RunHistoryIndexV2AppDataMigration`; optional script may reuse or mirror it. |
| App-data migration record/log summary | Pass | Pass | Pass | Pass | Existing framework provides status, retry, logs, and summaries. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunMetadataV2` | Pass | Pass | Pass | Pass | Pass | Resume/config plus prepared/start facts only. |
| `AgentRunHistoryIndexRowRecordV2` | Pass | Pass | Pass | N/A | Pass | Standalone history catalog fields only. |
| Standalone GraphQL/frontend history item | Pass | Pass | Pass | Pass | Pass | Uses `createdAt`, `archivedAt`, `terminatedAt`, and derived status fields. |
| Team GraphQL/frontend history item | Pass | Pass with residual debt | Pass | Pass | Pass | Existing team fields are explicitly retained. |
| App-data migration summary/details | Pass | Pass | Pass | N/A | Pass | Existing migration summary/detail structure fits this file-data migration. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Durable `lastKnownStatus` in standalone metadata/index | Pass | Pass | Pass | Pass | Removed from steady-state standalone writes/API. |
| Durable `activationState` | Pass | Pass | Pass | Pass | Replaced by prepared/start facts and in-memory activation lock. |
| `lastActivityAt` in standalone index | Pass | Pass | Pass | Pass | Replaced by `createdAt` ordering. |
| Lifecycle direct index service/store calls | Pass | Pass | Pass | Pass | Replaced by catalog service methods. |
| Direct script writes to `run_history_index.json` | Pass | Pass | Pass | Pass | Cleanup and fallback scripts must use safe identity + atomic writer contract. |
| Source-code full metadata scan repair in history listing | Pass | Pass | Pass | Pass | Replaced by startup-once app-data migration, not list-time behavior. |
| Operator-only primary migration path | Pass | Pass | Pass | Pass | Replaced by app-data migration as primary; script is fallback only. |
| Team index/status debt | Pass | Pass | Pass | Pass | Follow-up only. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | Pass | Pass | Pass | Pass | Owns steady-state catalog and semantic mutations only. |
| `run-history/services/agent-run-history-identity.ts` | Pass | Pass | N/A | Pass | Safe identity/path resolver is correctly scoped. |
| `run-history/store/atomic-json-file-writer.ts` | Pass | Pass | N/A | Pass | Persistence mechanism only. |
| `run-history/store/agent-run-history-index-*` | Pass | Pass | Pass | Pass | V2 index schema/IO only. |
| `run-history/store/agent-run-metadata-*` | Pass | Pass | Pass | Pass | Resume/config/prepared-start metadata only. |
| `app-data-migrations/migrations/run-history-index-v2-migration.ts` | Pass | Pass | Pass | Pass | Correct owner for automatic full metadata scan and V2 index repair. |
| `app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | N/A | Pass | Correct registration point for `requiredOnStartup`. |
| API/frontend files | Pass | Pass | Pass | Pass | Standalone/team field split is explicit. |
| fallback repair/cleanup scripts | Pass | Pass | Pass | Pass | Optional/manual maintenance only. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService` | Pass | Pass | Pass | Pass | Authoritative steady-state standalone history mutation boundary. |
| `RunHistoryIndexV2AppDataMigration` | Pass | Pass | Pass | Pass | Authorized automatic full-scan boundary through startup migration runner. |
| `AgentRunStatusProjectionService` | Pass | Pass | Pass | Pass | Live status remains non-persistent. |
| `AgentRunMetadataStore` | Pass | Pass | Pass | Pass | Runtime restore/config reads are allowed; catalog/status fields do not live there. |
| `AgentRunHistoryIndexStore` | Pass | Pass | Pass | Pass | Internal to catalog/migration persistence use. |
| API/frontend field dependencies | Pass | Pass | Pass | Pass | Team field deferral is explicit. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService` | Pass | Pass | Pass | Pass | Semantic methods prevent lifecycle/index-store bypass. |
| `RunHistoryIndexV2AppDataMigration` | Pass | Pass | Pass | Pass | Full metadata scan is encapsulated in the migration framework, not list path. |
| `AgentRunStatusProjectionService` | Pass | Pass | Pass | Pass | No persisted standalone status fallback. |
| `AgentRunMetadataStore` | Pass | Pass | Pass | Pass | Store remains a metadata persistence provider. |
| `AgentRunHistoryIndexStore` | Pass | Pass | Pass | Pass | No public lifecycle writer role. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService.listCatalogRows()` | Pass | Pass | Pass | Low | Pass |
| Catalog mutation methods (`recordPreparedRun`, `recordRunStarted`, `recordRunSummary`, `recordRunTerminated`) | Pass | Pass | Pass | Low | Pass |
| `archiveRun` / `unarchiveRun` / `deleteRun` / `cancelPreparedRun` | Pass | Pass | Pass | Low | Pass |
| `RunHistoryIndexV2AppDataMigration.execute()` | Pass | Pass | Pass | Low | Pass |
| Optional repair script CLI | Pass | Pass | Pass | Low | Pass |
| GraphQL `listWorkspaceRunHistory` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | Pass | Pass | Low | Pass | Correct domain-control placement. |
| `run-history/services/agent-run-history-identity.ts` | Pass | Pass | Low | Pass | Correct safe identity placement. |
| `run-history/store/*` | Pass | Pass | Low | Pass | Correct persistence-provider placement. |
| `app-data-migrations/migrations/run-history-index-v2-migration.ts` | Pass | Pass | Low | Pass | Correct startup data migration placement. |
| `app-data-migrations/app-data-migration-registry.ts` | Pass | Pass | Low | Pass | Correct registration placement. |
| `agent-execution/services/*` | Pass | Pass | Medium | Pass | Runtime service edits remain dependency-retargeting. |
| `api/graphql/types` | Pass | Pass | Low | Pass | Existing separate standalone/team object classes support split. |
| `autobyteus-server-ts/scripts` | Pass | Pass | Low | Pass | Correct home for optional manual repair. |
| frontend run-history files | Pass | Pass | Medium | Pass | Careful implementation needed, design is clear. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Standalone catalog owner | Pass | Pass | Pass | Pass | New service remains justified. |
| Metadata/index persistence | Pass | Pass | Pass | Pass | Existing stores are extended. |
| Semantic mutation serialization | Pass | Pass | Pass | Pass | New queue remains justified. |
| Safe identity validation | Pass | Pass | Pass | Pass | Current history-service safety logic is moved/extracted with the filesystem owner. |
| Automatic legacy repair scan | Pass | Pass | Pass | Pass | Existing app-data migration framework is the right reusable capability. |
| Manual repair scan | Pass | Pass | N/A | Pass | Optional fallback only. |
| Team cleanup | Pass | Pass | N/A | Pass | Correctly deferred. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| V1 standalone index/source list auto-repair | No steady-state wrapper | Pass | Pass | V1→V2 repair is app-data migration, not history-list code. |
| V1 standalone metadata status fields | No steady-state wrapper | Pass | Pass | Removed from written target. |
| Standalone API `lastKnownStatus`/`lastActivityAt` | No | Pass | Pass | Replaced by derived status and `createdAt`. |
| Team old fields during deferred team refactor | Yes, deliberate deferral | Pass | Pass | Explicitly preserved until team follow-up. |
| Operator-only primary migration | No | Pass | Pass | Automatic app-data migration is primary; script fallback optional. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| V2 standalone index/metadata types | Pass | Pass | Pass | Pass |
| Catalog service introduction | Pass | Pass | Pass | Pass |
| Lifecycle service retargeting | Pass | Pass | Pass | Pass |
| Startup app-data migration | Pass | Pass | Pass | Pass |
| Optional repair/cleanup script refactor | Pass | Pass | Pass | Pass |
| GraphQL/frontend standalone/team migration | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Normal history list without metadata scan | Yes | Pass | Pass | Pass | Clear. |
| Startup app-data migration flow | Yes | Pass | Pass | Pass | Clear and mapped to existing runner/registry. |
| Index row shape | Yes | Pass | Pass | Pass | Clear. |
| Semantic mutation serialization | Yes | Pass | Pass | Pass | Concrete queued `recordPreparedRun` example remains. |
| Activity handling | Yes | Pass | Pass | Pass | Clear. |
| Legacy `createdAt` migration | Yes | Pass | Pass | Pass | Concrete fallback chain provided. |
| Safe delete identity | Yes | Pass | Pass | Pass | Clear. |
| Standalone/team API coexistence | Yes | Pass | Pass | Pass | Concrete GraphQL example provided. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Cross-process writes to one memory dir | In-process semantic queue does not protect multiple server processes. | Keep explicit residual risk; add lock/journal only if product supports concurrent writers. | Accepted residual. |
| Post-migration crash window across metadata/index multi-file operations | A one-time app-data migration will not automatically rerun after a later successful migration record unless retried/versioned. | Treat as accepted file-based residual; optional repair script or future journal/locking task covers rare future inconsistency. | Accepted residual. |
| App-data migration failure or warning | Users may not see legacy orphan metadata until migration succeeds/retries. | Existing runner supports retry/status/logs; optional script remains fallback. | Accepted residual. |
| Team-run history analogous debt | Team index/status fields have similar smells. | Track as follow-up; preserve team API fields in this change. | Accepted residual. |

## Review Decision

Pass: the design remains ready for implementation with the app-data migration update.

The latest revision improves the prior round-2 design by using Autobyteus's existing required-on-startup app-data migration framework as the primary V1→V2 full-scan repair boundary. This preserves the key architecture rule that normal history listing/catalog initialization reads the compact V2 index only, while giving legacy users an automatic, recorded, retryable migration path.

## Findings

None.

## Classification

N/A — no open findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Normal history listing will not scan metadata to self-heal; legacy repair depends on the app-data migration succeeding or being retried.
- A future crash after the V2 migration has already succeeded can still create a rare metadata/index or index/filesystem inconsistency; this remains an accepted file-based storage residual covered by manual repair/future hardening, not by routine list-time scans.
- Cross-process locking remains deferred unless normal desktop operation permits multiple server processes writing the same memory directory.
- Team-run history keeps analogous status/index debt until a follow-up refactor.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Latest authoritative design is round 3. Proceed with the `RunHistoryIndexV2AppDataMigration` startup-once migration design, while keeping normal history list/catalog initialization index-only.
