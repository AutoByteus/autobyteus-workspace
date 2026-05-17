# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md`
- Additional Context Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/app-data-migration-design-rework-note.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/command-api-clean-cut-design-rework-note.md`, prior implementation/review/validation artifacts, and prior review rounds in this canonical report.
- Current Review Round: 16
- Trigger: Re-review after solution design corrected the Round 15 app-data-migration spine-audit findings and asked whether all cases/data spines are now complete enough to return to implementation.
- Prior Review Round Reviewed: Round 15 in this same canonical file path.
- Latest Authoritative Round: 16
- Current-State Evidence Basis: Re-read the architecture-reviewer workflow and shared design principles, then reviewed the revised requirements, investigation notes, design spec, app data migration rework note, current use-case/acceptance mappings, DS-001 through DS-030 spine inventory, primary/return/bounded-local spine sections, mandatory spine narratives, spine actors, ownership map, thin facades, off-spine concern table, file responsibility mapping, interface boundary table, migration/refactor sequence, and contradiction scans for stale no-migration/fail-only policy wording.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review before user-requested pause | N/A | None | Pass | No | Superseded by later design-owner revisions. |
| 2 | Review of refined package after design-owner recheck | No unresolved findings from round 1 | None | Pass | No | Superseded by naming and metadata revisions. |
| 3 | Naming revision review | No unresolved findings from round 2 | None | Pass | No | Superseded by metadata revisions. |
| 4 | Canonical metadata storage policy review | No unresolved findings from round 3 | None | Pass | No | Superseded by metadata item-type and no-backcompat clarifications. |
| 5 | Metadata item-type naming review | No unresolved findings from round 4 | None | Pass | No | Superseded by hard no-backward-compatibility clarification. |
| 6 | Historical flat metadata no-backcompat review | No unresolved findings from round 5 | None | Pass | No | Superseded by Round 7 full-pass review. |
| 7 | Independent deep full review requested by user | No unresolved findings from round 6 | 3 | Fail | No | Found public command selector, metadata store/projection, and subteam communication projection gaps. |
| 8 | Revised package after Round 7 design-impact rework | `ARCH-NESTED-001`, `ARCH-NESTED-002`, `ARCH-NESTED-003` | None | Pass | No | Round 7 findings were resolved. Superseded by full-stack UI validation rework. |
| 9 | Revised package after API/E2E frontend nested-team UI failure | Round 7/8 findings and UI failure note | None | Pass | No | Frontend recursive display/read-model/route-key design was sufficient. Superseded by communication-roster design reset. |
| 10 | Revised package after communication-boundary/user-discussion reset | Round 7/8/9 findings and validation-discovered gaps | 2 | Fail | No | Communication-roster direction accepted; representative delivery and descriptor/projection shapes needed rework. |
| 11 | Revised package after Round 10 design-impact response | `ARCH-COMM-001`, `ARCH-COMM-002` | None | Pass | No | Absolute-route representative delivery, descriptor coordinate semantics, and represented-subteam DTO flow became concrete enough. |
| 12 | LLM roster-manifest presentation refinement | Round 10/11 communication findings | None | Pass | No | `TeamMembershipRosterManifest` was a clean prompt-presentation boundary derived from descriptors. |
| 13 | Round 20 clean-cut command API rework | Round 12 pass state plus command API conflict | 1 | Fail | No | Found stale authoritative bare-name/top-level-name command selector allowances. |
| 14 | Round 13 command API correction | `ARCH-CMD-001` | None | Pass | No | Stale command selector allowances were removed; path/route-only command API approved. |
| 15 | App data migration design reset plus deep spine audit | All prior findings plus metadata no-backcompat posture | 3 | Fail | No | Migration boundary direction was sound, but the new migration spines were incomplete. |
| 16 | Round 15 spine-audit correction re-review | `ARCH-MIG-SPINE-001`, `ARCH-MIG-SPINE-002`, `ARCH-MIG-SPINE-003` | None | Pass | Yes | DS-025 through DS-030 are now integrated into the spine-first sections, actors, ownership map, interfaces, file mapping, and implementation sequence. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md` as the current authoritative design package for nested mixed teams plus the 2026-05-17 app-data-migration reset.

The current design now passes architecture review. The app-data-migration boundary preserves the clean runtime schema rule while handling real user upgrades through an observable, retryable, recorded migration subsystem:

- Normal runtime/read/restore/frontend current-schema parsers remain strict and accept only canonical recursive `TeamRunMetadata.memberTree`.
- Known historical `runVersion` + flat `memberMetadata[]` data is converted only by a registered app data migration.
- DS-025 through DS-030 now cover the full migration use-case set: startup execution, concrete conversion, Settings status UI, history/sidebar degraded UX, manual retry/concurrency, and direct restore/open degraded UX.
- The new migration actors are present in the main-line actor list, ownership map, thin-facade table, interface map, file responsibility mapping, and implementation sequence.
- I found no remaining missing data spine for UC-013 or for the older nested-team use cases.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `design-spec.md:1048-1057` classifies the work as a feature/larger requirement with boundary/ownership and shared-structure looseness; requirements add UC-013 and REQ-042 through REQ-046 for app-data migration. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Investigation notes cite metadata store behavior, frontend parser behavior, server startup ordering, Prisma schema, GraphQL resolver patterns, and Settings UI structure at `investigation-notes.md:371-393`. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design requires the app-data-migration subsystem, migration record table, GraphQL status/retry API, Settings UI, history/sidebar degraded handling, and direct restore/open handling. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | The design now binds UC-013 to DS-025 through DS-030 (`design-spec.md:1138`) and carries those spines through mandatory narratives, actors, ownership, interfaces, and sequence. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 7 | `ARCH-NESTED-001` | High | Resolved | Path/route-only command selector design remains intact in DS-004/DS-024 and interface rows. | No regression. |
| 7 | `ARCH-NESTED-002` | High | Resolved / refined | Metadata store remains current-schema-only; historical conversion is isolated to app-data migration. | Current migration design preserves the no-runtime-backcompat boundary. |
| 7 | `ARCH-NESTED-003` | Medium | Resolved | Communication descriptors, represented-subteam metadata, roster manifest, and parent-boundary bridge remain intact. | No action. |
| 10 | `ARCH-COMM-001` | High | Resolved | Absolute-route representative delivery remains canonical. | No regression. |
| 10 | `ARCH-COMM-002` | High | Resolved | Descriptor coordinate shape and represented-subteam DTO flow remain concrete. | No regression. |
| 13 | `ARCH-CMD-001` | High | Resolved | Current command API sections remain path/route-only and scalar aliases remain invalid. | No regression. |
| 15 | `ARCH-MIG-SPINE-001` | High | Resolved | DS-025 through DS-028 now have mandatory narrative rows at `design-spec.md:1203-1206`; migration actors are listed at `design-spec.md:1233-1240`; migration owners are mapped at `design-spec.md:1268-1275`; GraphQL thin facades are listed at `design-spec.md:1285-1286`. | The design is now spine-first for the migration subsystem instead of file-map-first. |
| 15 | `ARCH-MIG-SPINE-002` | High | Resolved | DS-029 is in the inventory at `design-spec.md:1119`, primary spine at `design-spec.md:1159`, narrative at `design-spec.md:1207`, return spine at `design-spec.md:1172`, bounded runner spine at `design-spec.md:1350-1354`, and interface rows at `design-spec.md:1638-1641`. | Manual retry, stale RUNNING, duplicate concurrency rejection, DB summary/log, and status refresh are now explicit. |
| 15 | `ARCH-MIG-SPINE-003` | High | Resolved | DS-030 is in the inventory at `design-spec.md:1120`, primary spine at `design-spec.md:1160`, narrative at `design-spec.md:1208`, return spine at `design-spec.md:1173`, bounded frontend coordinator spine at `design-spec.md:1356-1360`, file mapping at `design-spec.md:1492-1493`, and interface row at `design-spec.md:1642`. | Direct restore/open can no longer bypass the degraded UI policy. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001..DS-024 | Nested topology, runtime, communication, metadata, frontend, and command API | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-025 | Startup app data migration execution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-026 | Concrete legacy metadata conversion | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-027 | Settings migration status UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-028 | History/sidebar degraded UX for unmigrated metadata | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-029 | Manual migration retry and concurrency | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-030 | Direct restore/open degraded UX | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Nested mixed runtime/topology | Pass | Pass | Pass | Pass | Existing DS-001 through DS-024 remain coherent and unchanged by the migration reset. |
| Runtime metadata store/mapper/parser | Pass | Pass | Pass | Pass | `TeamRunMetadataStore` is the current JSON schema gate and exposes typed legacy-unmigrated diagnostics, not conversion. |
| App data migrations backend subsystem | Pass | Pass | Pass | Pass | Registry, runner, record repository, concrete migration, and GraphQL resolver have governing owners and file mapping. |
| Concrete team metadata migration | Pass | Pass | Pass | Pass | DS-026 assigns conversion, validation, backup, atomic write, and per-item details to `TeamRunMetadataMemberTreeMigration`. |
| Prisma/app DB persistence | Pass | Pass | Pass | Pass | `AppDataMigrationRecord` is added via Prisma schema migration before app data migrations run. |
| GraphQL migration status/retry API | Pass | Pass | Pass | Pass | `getAppDataMigrations` is a status facade; `runAppDataMigration(id)` delegates execution policy to the runner. |
| Settings -> Server -> Migrations frontend | Pass | Pass | Pass | Pass | Frontend store/component own status refresh, friendly details, technical expansion, and retry controls. |
| History/sidebar/direct restore degraded UX | Pass | Pass | Pass | Pass | DS-028 and DS-030 cover both passive hydration and explicit restore/open attempts. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppDataMigrationDefinition` / result/status/item-detail types | Pass | Pass | Pass | Pass | `app-data-migration-types.ts` gives migrations one status/result vocabulary. |
| `AppDataMigrationRegistry` | Pass | Pass | Pass | Pass | Registry owns definitions, IDs, display metadata, required/startup policy, and concrete migration binding. |
| `AppDataMigrationRunner` | Pass | Pass | Pass | Pass | Runner owns startup/manual execution, lock, stale RUNNING handling, status transitions, and retry semantics. |
| `AppDataMigrationRecordRepository` | Pass | Pass | Pass | Pass | Repository owns durable status/attempts/summary/error/log record persistence. |
| `TeamRunMetadataMemberTreeMigration` | Pass | Pass | Pass | Pass | The only owner of legacy flat team metadata conversion. |
| `team-run-metadata-schema.ts` canonical validator | Pass | Pass | Pass | Pass | Migration validates converted output through current-schema validation without making the store a converter. |
| `team-run-metadata-flattener.ts` | Pass | Pass | Pass | Pass | Derived projection owner over canonical `memberTree`; consumers do not read old `memberMetadata`. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamRunMetadata.memberTree` | Pass | Pass | Pass | Pass | Pass | Remains the only current restore schema. |
| Legacy flat metadata input shape | Pass | Pass | Pass | Pass | Pass | Recognized only inside the concrete migration boundary. |
| `AppDataMigrationRecord` | Pass | Pass | Pass | Pass | Pass | Fields cover ID, display name, status, attempts, timestamps, summary, error, and log path. |
| Migration result/item detail types | Pass | Pass | Pass | Pass | Pass | Item-level results support partial failure, summaries, logs, and retry. |
| Settings migration DTOs | Pass | Pass | Pass | Pass | Pass | Expose status and retry without filesystem mutation APIs. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime dual-schema metadata readers | Pass | Pass | Pass | Pass | Explicitly forbidden; migration owns legacy conversion. |
| Inline restore/topology guessing for old flat metadata | Pass | Pass | Pass | Pass | Explicitly rejected. |
| Frontend current parser accepting `runVersion`/`memberMetadata` | Pass | Pass | Pass | Pass | Replaced by migration plus friendly degraded UI. |
| Raw legacy parser errors in normal UI | Pass | Pass | Pass | Pass | Replaced by typed diagnostics and Settings Migrations details. |
| Secret best-effort startup migration | Pass | Pass | Pass | Pass | Replaced by DB records and Settings visibility. |
| Projection consumers reading `metadata.memberMetadata` | Pass | Pass | Pass | Pass | Replaced by `team-run-metadata-flattener.ts`. |
| Scalar command target aliases | Pass | Pass | Pass | Pass | Round 14 clean-cut command API remains in force. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `team-run-metadata-store.ts` | Pass | Pass | Pass | Pass | Current-schema validation/read/write plus typed legacy diagnostics, not conversion. |
| `team-run-metadata-schema.ts` | Pass | Pass | Pass | Pass | Current-schema validator shared by store and migration output validation. |
| `app-data-migrations/domain/app-data-migration-types.ts` | Pass | Pass | Pass | Pass | Migration contract/status/result/item detail types. |
| `app-data-migration-registry.ts` | Pass | Pass | Pass | Pass | Migration definitions/startup policy. |
| `app-data-migration-runner.ts` | Pass | Pass | Pass | Pass | Sequencing, locking, stale RUNNING handling, retry, and result aggregation. |
| `app-data-migration-record-repository.ts` | Pass | Pass | Pass | Pass | Durable DB status and summary repository. |
| `team-run-metadata-member-tree-migration.ts` | Pass | Pass | Pass | Pass | Legacy metadata scanning/conversion/validation/backup/atomic write. |
| `api/graphql/types/app-data-migrations.ts` | Pass | Pass | Pass | Pass | Migration status query and retry mutation boundary. |
| `appDataMigrationsStore.ts` / GraphQL operations / `ServerMigrationsManager.vue` | Pass | Pass | Pass | Pass | Frontend status/refresh/retry/detail UX. |
| `TeamRunHistoryService` / restore/history/sidebar consumers | Pass | Pass | Pass | Pass | Uses typed diagnostics to skip/friendly-scope history/sidebar and direct restore/open. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup -> Prisma migrations -> app data migration runner -> normal services | Pass | Pass | Pass | Pass | Correct high-level sequencing. |
| Runner -> registry/repository/migration implementations | Pass | Pass | Pass | Pass | Runner owns orchestration; migrations own conversion. |
| Concrete migration -> canonical validator | Pass | Pass | Pass | Pass | Validates output without making store/frontend parsers backward-compatible. |
| Runtime readers -> current metadata only | Pass | Pass | Pass | Pass | Legacy diagnostics allowed; conversion forbidden. |
| GraphQL resolver -> runner/repository | Pass | Pass | Pass | Pass | Resolver is a facade; runner owns locking/concurrency/execution. |
| Frontend Settings -> migration store -> GraphQL | Pass | Pass | Pass | Pass | UI does not touch files or DB directly. |
| Normal history/sidebar/direct restore -> typed diagnostics/friendly scope | Pass | Pass | Pass | Pass | Both passive and explicit restore paths are covered. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppDataMigrationRunner` | Pass | Pass | Pass | Pass | Startup and manual retry both enter through runner APIs. |
| `AppDataMigrationRecordRepository` | Pass | Pass | Pass | Pass | Persistence hidden behind repository; UI sees DTOs only. |
| `TeamRunMetadataMemberTreeMigration` | Pass | Pass | Pass | Pass | Legacy schema knowledge isolated to one migration. |
| `TeamRunMetadataStore` | Pass | Pass | Pass | Pass | Current schema gate; no inline migration. |
| Settings migration GraphQL API | Pass | Pass | Pass | Pass | Status query and retry mutation are thin facades over repository/runner. |
| Normal history/sidebar/direct restore UI | Pass | Pass | Pass | Pass | Friendly UX result owns presentation; parser text does not leak to normal UI. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AppDataMigrationRunner.runPending()` | Pass | Pass | Pass | Low | Pass |
| `AppDataMigrationRunner.runMigration(id)` | Pass | Pass | Pass | Low | Pass |
| `AppDataMigrationRecordRepository` methods | Pass | Pass | Pass | Low | Pass |
| `TeamRunMetadataMemberTreeMigration.execute()` | Pass | Pass | Pass | Low | Pass |
| GraphQL `getAppDataMigrations` | Pass | Pass | Pass | Low | Pass |
| GraphQL `runAppDataMigration(id)` | Pass | Pass | Pass | Low | Pass |
| `TeamRunMetadataStore.readMetadata/writeMetadata` | Pass | Pass | Pass | Low | Pass |
| `TeamRunService.restore/open` legacy-unmigrated result | Pass | Pass | Pass | Low | Pass |
| Frontend migration store/component | Pass | Pass | Pass | Low | Pass |
| History/sidebar legacy diagnostic handling | Pass | Pass | Pass | Low | Pass |
| Direct restore/open legacy diagnostic handling | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/` | Pass | Pass | Low | Pass | New subsystem is distinct from Prisma schema migrations and runtime stores. |
| `autobyteus-server-ts/src/run-history/store/team-run-metadata-schema.ts` | Pass | Pass | Low | Pass | Current schema validator belongs next to metadata store/types. |
| `autobyteus-server-ts/src/api/graphql/types/app-data-migrations.ts` | Pass | Pass | Low | Pass | Placement matches GraphQL boundary. |
| `autobyteus-web/stores/appDataMigrationsStore.ts` | Pass | Pass | Low | Pass | Dedicated frontend state owner. |
| `autobyteus-web/components/settings/ServerMigrationsManager.vue` | Pass | Pass | Low | Pass | Dedicated Settings surface. |
| `autobyteus-web/pages/settings.vue` | Pass | Pass | Low | Pass | Navigation integration is appropriate. |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Pass | Pass | Low | Pass | Proper owner for direct restore/open operation results. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Schema migrations | Pass | Pass | Pass | Pass | Prisma migrations still own DB schema; app data migrations own persisted app data conversion. |
| Metadata validation | Pass | Pass | Pass | Pass | Current validator is reused for converted output. |
| GraphQL settings pattern | Pass | Pass | Pass | Pass | Add dedicated resolver instead of overloading server settings. |
| Settings UI | Pass | Pass | Pass | Pass | Add Server -> Migrations section/component. |
| History projection | Pass | Pass | Pass | Pass | Existing history services remain display owners and catch typed diagnostics. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Runtime metadata restore/readers | No in target design | Pass | Pass | Current schema only. |
| App data migration for known historical files | Yes, intentionally as one-time maintenance boundary | Pass | Pass | This is not runtime backward compatibility; it rewrites persisted data to current schema before normal use. |
| Frontend current metadata parser | No in target design | Pass | Pass | Does not accept flat schema as current. |
| Raw UI display of parser errors | No in target design | Pass | Pass | Replaced by friendly scoped item/skip plus Migrations diagnostics. |
| Command API scalar aliases | No in target design | Pass | Pass | No regression from Round 14. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| App data migration framework | Pass | Pass | Pass | Pass |
| Concrete metadata conversion | Pass | Pass | Pass | Pass |
| Startup ordering | Pass | Pass | Pass | Pass |
| Manual retry/concurrency handling | Pass | Pass | Pass | Pass |
| Migration status/retry API | Pass | Pass | Pass | Pass |
| Settings migration UI | Pass | Pass | Pass | Pass |
| Normal history/sidebar degraded handling | Pass | Pass | Pass | Pass |
| Direct restore/open degraded handling | Pass | Pass | Pass | Pass |
| Runtime parser no-compat cleanup | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Legacy flat metadata sample | Yes | Pass | Pass | Pass | CR-007b and the rework note show `runVersion` + `memberMetadata[]`. |
| Conversion shape | Yes | Pass | Pass | Pass | Design shows `memberKind: 'agent'`, member path/route, preserved fields, validation, backup, atomic write. |
| Startup migration spine | Yes | Pass | Pass | Pass | DS-025 and expanded spine show Prisma -> app data runner -> normal services. |
| Settings migrations status UI | Yes | Pass | Pass | Pass | DS-027 and rework note list status, timestamps, details, refresh. |
| Settings retry execution | Yes | Pass | Pass | Pass | DS-029 explicitly covers retry, lock, stale RUNNING, duplicate rejection, execution, DB summary/log, and refresh. |
| Failed/unmigrated history/sidebar behavior | Yes | Pass | Pass | Pass | DS-028 provides friendly history/sidebar behavior. |
| Failed/unmigrated direct restore/open behavior | Yes | Pass | Pass | Pass | DS-030 provides a dedicated direct restore/open degraded path. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Missing UC-013 startup/status/conversion/degraded/retry/restore data spines | Round 15 found app-data-migration use cases were only partly integrated. | No further design action required; DS-025 through DS-030 now cover them. | Resolved. |
| Runtime vs migration backward-compatibility boundary | Needed to avoid permanent dual schemas while still supporting real upgrades. | No further design action required; migration is isolated and runtime remains current-schema-only. | Resolved. |
| Implementation verification | The design is ready, but code must still prove retry/concurrency, atomic write, and Electron degraded UX. | Implementation and API/E2E validation must cover AC-034 through AC-039. | Residual implementation risk only. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

No open `Design Impact`, `Requirement Gap`, or `Unclear` findings remain.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must keep legacy conversion isolated to `TeamRunMetadataMemberTreeMigration`; runtime store/mapper/frontend parsers must not grow dual-schema compatibility branches.
- App-data-migration concurrency must be verified with tests for stale `RUNNING`, true duplicate retry rejection, and idempotent skip of already-current files.
- The concrete metadata migration must verify backup and atomic-write behavior for successful, invalid, and partially successful runs.
- Full Electron/browser validation is still required to prove raw unsupported metadata text no longer appears in sidebar/workspace/direct restore UI and Settings -> Server -> Migrations exposes diagnostics/retry.
- Older historical notes in the investigation package that predate 2026-05-17 are superseded by the current app-data-migration reset; implementers should follow the latest requirements/design/rework note.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 15 findings `ARCH-MIG-SPINE-001`, `ARCH-MIG-SPINE-002`, and `ARCH-MIG-SPINE-003` are resolved. The migration package is now spine-complete and ready to return to implementation.
