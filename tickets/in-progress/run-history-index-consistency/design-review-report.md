# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md`
- Current Review Round: 2
- Trigger: Revised design handoff from `solution_designer` on 2026-05-21 after user clarified the index-as-catalog/no-normal-metadata-scan direction.
- Prior Review Round Reviewed: Round 1 in `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-review-report.md`
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed the revised requirements, investigation notes, persisted attribute audit, revised design spec, and prior round-1 findings. Reused source evidence from the same current worktree for run-history/index/metadata/provisioning/status/frontend/script paths.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design handoff | N/A | 4 | Fail | No | Design direction was sound but under-specified semantic mutation serialization, `createdAt` migration, safe filesystem identity, and standalone/team API scope. |
| 2 | Revised design after user clarification | 4 | 0 | Pass | Yes | Prior findings are resolved. Revised index-as-catalog direction is explicit and ready for implementation. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/run-history-index-consistency/tickets/in-progress/run-history-index-consistency/design-spec.md` together with the revised requirements, investigation notes, persisted attribute audit, and round-1 review report.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The revised design identifies the task as bug fix + behavior cleanup + architecture refactor + performance-cache simplification. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Root cause is now framed as boundary/ownership issue, duplicated coordination, and shared-structure looseness, with evidence that high-frequency index writes and persisted live/status fields create fragility. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design chooses a bounded standalone run-history refactor now; team-run cleanup and cross-process locks remain explicit deferrals. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Catalog owner, semantic mutation queue, V2 index schema, metadata simplification, offline migration script, safe identity resolver, and API/frontend field split support the revised architecture. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-DI-001 | High | Resolved | Revised spec adds catalog-level semantic mutation queue, initialization barrier, queued read/merge/write, in-memory update, atomic flush, and create rollback example. | Physical atomic writer is correctly separated from semantic serialization. |
| 1 | AR-DI-002 | Medium | Resolved | Revised spec adds deterministic migration-script `createdAt` fallback order: V2 index, legacy metadata, preparedAt, legacy lastActivityAt, metadata birthtime/mtime, run-dir birthtime/mtime, migration time with warning. | Now script-scoped, consistent with no normal metadata scan. |
| 1 | AR-DI-003 | Medium | Resolved | Revised spec assigns safe run-id/path validation to the catalog boundary/safe identity resolver; archive/delete/cancel accept raw IDs but validate internally; cleanup script must stop direct index rewriting. | Safety boundary is now explicit. |
| 1 | AR-DI-004 | Medium | Resolved | Revised spec includes concrete GraphQL field-shape example: standalone rows use `createdAt`/`archivedAt`/`terminatedAt`; team rows retain `lastActivityAt`/`lastKnownStatus`. | Team refactor remains safely deferred. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Normal history listing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Catalog mutation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Runtime/command status projection | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Serialized semantic catalog mutation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Operator-run migration/repair | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Archive/delete/cancel filesystem-safe mutation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history` services | Pass | Pass | Pass | Pass | Correct home for catalog service, semantic mutation queue, and safe identity. |
| `run-history` stores | Pass | Pass | Pass | Pass | Stores remain persistence providers, not catalog policy owners. |
| `agent-execution` services | Pass | Pass | Pass | Pass | Runtime services call semantic catalog methods for history changes and keep runtime execution concerns. |
| `api/graphql` + frontend history | Pass | Pass | Pass | Pass | Standalone and team DTO shapes are explicitly separated. |
| scripts / maintenance | Pass | Pass | Pass | Pass | Full metadata scans are isolated to explicit operator scripts. |
| team-run history | Pass | Pass | Pass | Pass | Deferred as residual debt without contaminating standalone changes. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Atomic JSON writer | Pass | Pass | Pass | Pass | Correctly scoped to physical write safety only. |
| Semantic catalog mutation queue | Pass | Pass | Pass | Pass | Correctly owned by catalog service or a tightly scoped catalog queue. |
| Safe run identity/path validation | Pass | Pass | Pass | Pass | Correctly owned by run-history services and usable by scripts if needed. |
| V2 index row derivation for migration script | Pass | Pass | Pass | Pass | Script-local or normalizer choice is acceptable if it does not become source auto-repair. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunMetadataV2` | Pass | Pass | Pass | Pass | Pass | Resume/config plus prepared/start facts only. |
| `AgentRunHistoryIndexRowRecordV2` | Pass | Pass | Pass | N/A | Pass | Standalone history catalog fields only. |
| Standalone GraphQL/frontend history item | Pass | Pass | Pass | Pass | Pass | Uses `createdAt`, `archivedAt`, `terminatedAt`, derived `status`/`isActive`; no standalone `lastKnownStatus`/`lastActivityAt`. |
| Team GraphQL/frontend history item | Pass | Pass with residual debt | Pass | Pass | Pass | Existing team fields are explicitly retained until follow-up. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Durable `lastKnownStatus` in standalone metadata/index | Pass | Pass | Pass | Pass | Removed from source steady-state writes and standalone API. |
| Durable `activationState` | Pass | Pass | Pass | Pass | Replaced by prepared/start facts plus in-memory activation lock. |
| `lastActivityAt` in standalone index | Pass | Pass | Pass | Pass | Replaced by `createdAt` ordering. |
| Catalog fields in metadata target | Pass | Pass | Pass | Pass | Revised direction keeps summary/created/archive/terminate facts in index catalog. |
| Lifecycle direct index service/store calls | Pass | Pass | Pass | Pass | Replaced by catalog service methods. |
| Direct script index writes | Pass | Pass | Pass | Pass | Replaced by migration/cleanup script safe identity + atomic writer contract. |
| Source-code full metadata scan repair | Pass | Pass | Pass | Pass | Replaced by explicit migration/repair script. |
| Team index/status debt | Pass | Pass | Pass | Pass | Follow-up only; team fields preserved. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | Pass | Pass | Pass | Pass | Owns in-memory catalog, semantic queue, catalog mutations, and safe history operations. |
| `run-history/services/agent-run-history-identity.ts` | Pass | Pass | N/A | Pass | Correctly scoped to safe run-history identity/path validation. |
| `run-history/store/atomic-json-file-writer.ts` | Pass | Pass | N/A | Pass | Persistence mechanism only. |
| `run-history/store/agent-run-history-index-*` | Pass | Pass | Pass | Pass | V2 index schema/IO only. |
| `run-history/store/agent-run-metadata-*` | Pass | Pass | Pass | Pass | Resume/config/prepared-start metadata only. |
| `agent-execution/services/*` | Pass | Pass | Pass | Pass | Runtime lifecycle services call catalog for history changes. |
| API/frontend files | Pass | Pass | Pass | Pass | Standalone/team field split is explicit. |
| migration/cleanup scripts | Pass | Pass | Pass | Pass | Explicit maintenance ownership is clear. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService` | Pass | Pass | Pass | Pass | Authoritative standalone history mutation boundary. |
| `AgentRunStatusProjectionService` | Pass | Pass | Pass | Pass | Live status remains non-persistent. |
| `AgentRunMetadataStore` | Pass | Pass | Pass | Pass | Runtime restore/config reads are allowed; catalog/status fields are not written there. |
| `AgentRunHistoryIndexStore` | Pass | Pass | Pass | Pass | Catalog-only source dependency. |
| API/frontend field dependencies | Pass | Pass | Pass | Pass | Team field deferral is explicit. |
| Migration/repair scripts | Pass | Pass | Pass | Pass | Full metadata scanning is script-only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService` | Pass | Pass | Pass | Pass | Semantic methods prevent index/store bypass. |
| `AgentRunStatusProjectionService` | Pass | Pass | Pass | Pass | No persisted status fallback for standalone target. |
| `AgentRunMetadataStore` | Pass | Pass | Pass | Pass | Store remains a metadata persistence provider. |
| `AgentRunHistoryIndexStore` | Pass | Pass | Pass | Pass | No public lifecycle writer role. |
| Migration/repair script | Pass | Pass | Pass | Pass | Source-code auto-repair is explicitly forbidden. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentRunHistoryCatalogService.listCatalogRows()` | Pass | Pass | Pass | Low | Pass |
| `recordPreparedRun` | Pass | Pass | Pass | Low | Pass |
| `recordRunStarted` | Pass | Pass | Pass | Low | Pass |
| `recordRunSummary` | Pass | Pass | Pass | Low | Pass |
| `recordRunTerminated` | Pass | Pass | Pass | Low | Pass |
| `archiveRun` / `unarchiveRun` | Pass | Pass | Pass | Low | Pass |
| `deleteRun` / `cancelPreparedRun` | Pass | Pass | Pass | Low | Pass |
| `repairIndex` script CLI | Pass | Pass | Pass | Low | Pass |
| GraphQL `listWorkspaceRunHistory` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | Pass | Pass | Low | Pass | Correct domain-control placement. |
| `run-history/services/agent-run-history-identity.ts` | Pass | Pass | Low | Pass | Correct if shared by catalog/script adapters; otherwise may remain private. |
| `run-history/store/*` | Pass | Pass | Low | Pass | Correct persistence-provider placement. |
| `agent-execution/services/*` | Pass | Pass | Medium | Pass | Runtime service edits are dependency-retargeting only. |
| `api/graphql/types` | Pass | Pass | Low | Pass | Existing separate standalone/team object classes support split. |
| `autobyteus-server-ts/scripts` | Pass | Pass | Low | Pass | Correct home for migration/repair. |
| frontend run-history files | Pass | Pass | Medium | Pass | Needs careful implementation, but design is clear. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Standalone catalog owner | Pass | Pass | Pass | Pass | New service is justified by ownership cleanup. |
| Metadata/index persistence | Pass | Pass | Pass | Pass | Existing stores extended, not bypassed. |
| Semantic mutation serialization | Pass | Pass | Pass | Pass | New queue is justified because physical writer queue is too low-level. |
| Safe identity validation | Pass | Pass | Pass | Pass | Current service logic is moved/extracted with the filesystem-affecting owner. |
| Legacy repair scan | Pass | Pass | Pass | Pass | Script-only path is sound for revised requirements. |
| Team cleanup | Pass | Pass | N/A | Pass | Correctly deferred. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| V1 standalone index/source auto-repair | No steady-state wrapper | Pass | Pass | Migration/repair is explicit script-only. |
| V1 standalone metadata status fields | No steady-state wrapper | Pass | Pass | Removed from written target. |
| Standalone API `lastKnownStatus`/`lastActivityAt` | No | Pass | Pass | Replaced by derived status and `createdAt`. |
| Team old fields during deferred team refactor | Yes, deliberate deferral | Pass | Pass | Explicitly preserved until team follow-up. |
| Cleanup script direct-write behavior | No target retention | Pass | Pass | Must use safe script/catalog logic. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| V2 standalone index/metadata types | Pass | Pass | Pass | Pass |
| Catalog service introduction | Pass | Pass | Pass | Pass |
| Lifecycle service retargeting | Pass | Pass | Pass | Pass |
| Offline migration/repair script | Pass | Pass | Pass | Pass |
| Cleanup script refactor | Pass | Pass | Pass | Pass |
| GraphQL/frontend standalone/team migration | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Normal history list without metadata scan | Yes | Pass | Pass | Pass | Clear. |
| Index row shape | Yes | Pass | Pass | Pass | Clear. |
| Semantic mutation serialization | Yes | Pass | Pass | Pass | Concrete queued `recordPreparedRun` example provided. |
| Activity handling | Yes | Pass | Pass | Pass | Clear. |
| Legacy `createdAt` migration | Yes | Pass | Pass | Pass | Concrete fallback chain provided. |
| Safe delete identity | Yes | Pass | Pass | Pass | Clear. |
| Standalone/team API coexistence | Yes | Pass | Pass | Pass | Concrete GraphQL example provided. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Cross-process writes to one memory dir | In-process semantic queue does not protect multiple server processes. | Keep explicit residual risk; add lock/journal only if product supports concurrent writers. | Accepted residual. |
| Crash window across metadata/index multi-file operations | File-based design is not a database transaction. | Use ordered writes, rollback for normal errors, and explicit repair script for crash/orphan cases. | Accepted residual. |
| Team-run history analogous debt | Team index/status fields have similar smells. | Track as follow-up; preserve team API fields in this change. | Accepted residual. |

## Review Decision

Pass: the design is ready for implementation.

The revised design is coherent with the updated requirement that `run_history_index.json` remains the normal fast standalone history catalog and that full metadata scans are script-only. The design now gives one owner to semantic catalog mutations, removes high-frequency persisted status/activity fields, scopes legacy repair to an explicit operator path, and preserves team history fields while standalone API/frontend fields change.

## Findings

None.

## Classification

N/A — no open findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Existing partial/corrupt legacy indexes will not self-heal in normal app source; users/operators must run the explicit migration/repair script.
- A process crash can still leave metadata/index or index/filesystem cross-file windows inconsistent; this is an accepted file-based storage residual with script repair guidance.
- Cross-process locking remains deferred unless normal desktop operation permits multiple server processes writing the same memory directory.
- Team-run history keeps analogous status/index debt until a follow-up refactor.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Prior round-1 findings AR-DI-001 through AR-DI-004 are resolved. Proceed to implementation using the revised index-as-catalog/no-normal-metadata-scan design.
