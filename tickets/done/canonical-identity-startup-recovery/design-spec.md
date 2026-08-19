# Design Spec

## Status

`Ready for architecture re-review — SR-013 removes the last stale migration-fatal wording and makes warning/fatal ownership explicit`

This specification implements the user-corrected foundation recorded in `ARCH-REV-007/AR-009`: **migration failure cannot make the application unable to start**. `AR-008` is withdrawn, and SR-011's fatal-only attempted closure of `AR-007` is superseded. Conversion, promotion, token, and history migration problems complete final V1 as `SUCCEEDED_WITH_WARNINGS`; independently valid current packages are admitted, affected invalid/incomplete subjects are excluded without guessing, and catalog/listen/health/new work/unaffected history continue. SR-013 applies the focused `ARCH-REV-008` coherence correction: the migration coordinator owns warning-only migration-detail aggregation, while only an independent existing platform/bootstrap owner may establish startup-fatal current-platform inoperability. The design retains the one-migration/current-runtime-only scope, the complete fourteen-record cohort that closes `AR-006`, and the user's rejection of exhaustive power/disk/kernel/per-syscall recovery.

## Current-State Read

`origin/personal` is the released direct ancestor and contains neither branch-introduced Team application-data migration. The current branch split one product cutover into `20260801_team_canonical_identity` and `20260814_team_run_execution_tree_v1`, even though no released runtime consumes their canonical intermediate. The observed profile remains in released source state because canonical preflight failed globally at attempt six; the final V1 record is absent. The earlier released communication migration is terminal `SUCCEEDED_WITH_WARNINGS`, so the runner skips it while 40 old run-ID message files remain.

The previous SR-008 consolidation correctly removed that artificial intermediate, covered all observed metadata/task/message/token formats, preserved memory identity, and made health the sole Electron ready signal. Its remaining defect was operational: one complete all-root/all-row plan, one exact destructive token contraction, and a final startup gate still made an unexpected historical item capable of withholding the whole application.

Current code provides better bounded mechanisms than that policy used:

- `TeamRunV1PackageCatalog.rebuild()` excludes and diagnoses roots independently.
- `TeamRunV1PackagePromoter` protects and validates one root at a time. Its sequential live renames and staging-only catch cleanup are not rollback, so a thrown promotion error cannot honestly be labeled `PRESERVED_WARNING`. It can, however, be a non-blocking `PROMOTION_WARNING` when the result reports the observed state and current package validation determines admit versus exclude without attempting restoration.
- `AppDataMigrationRunner` persists detailed `SUCCEEDED_WITH_WARNINGS` results and skips them automatically on later startup.
- released/current token runtime already shares nullable indexed `root_team_run_id`; current Prisma/runtime ignores predecessor-only SQLite columns. Server startup initializes the current Prisma client before application-data migration, so legacy-column coexistence is already on the observed production path.
- current history/restore/memory/Team runtime consumes only admitted final packages and need not learn predecessor formats.

The actual design issue is therefore not missing generic recovery infrastructure. It is incorrect failure ownership inside the final migration: root-local and row-local conversion failures are currently promoted into a global startup failure.

The exact retained cohort and final-sole-attempt proof close `AR-006`. The remaining problem is failure classification. SR-011 made live migration operations fatal in an attempt to avoid false preservation claims, but that violated the product foundation. SR-012 separates **truthful subject state** from **application availability**: a promotion warning never claims byte preservation after mutation, history/token warnings report their own atomic or partial outcome, and current loaders/catalogs independently admit only valid subjects. This resolves reopened `AR-007` and new `AR-009` without adding a recovery framework. `AR-008` is withdrawn.

## Intended Change

Keep only `20260814_team_run_execution_tree_v1` as the release-facing Team migration. Remove the canonical definition/registry/prerequisite/gate and never persist its canonical intermediate authority.

The final coordinator enumerates the Team store once, snapshots available token evidence, and owns independent root dispositions. Each predecessor root is normalized and fully planned/validated in memory. A metadata/task/message/identity problem discovered there leaves the root untouched, records `PRESERVED_WARNING`, and continues. Once promotion begins, the promoter returns either validated `COMMITTED`, `COMMITTED_WITH_WARNING` when the complete post-error current package independently validates, or `EXCLUDED_PROMOTION_WARNING` when it does not. No post-error result claims source preservation and no restoration is attempted. Current packages remain admitted no-ops; historical/authority-less/unsafe roots remain preserved dispositions.

Token evidence is parsed per row/address group rather than through one throwing cohort builder. Resolved rows share one transactional `root_team_run_id` update; unresolved rows remain unchanged and produce warnings. Legacy token evidence columns remain physically present and ignored by current runtime because their removal is not required for new writes or reads. No canonical evidence table/intermediate is created.

After root processing, resolved token updates run transactionally for admitted/current roots while unsupported or failed rows remain unchanged with warnings. History reconciliation uses only independently admitted trees; any snapshot/backup/write/validation error becomes a history warning, not a startup blocker. Zero migration details fail -> `SUCCEEDED`; any conversion/promotion/token/history detail fails -> terminal `SUCCEEDED_WITH_WARNINGS`. The catalog rebuild remains the admission authority and current history readers require a readable current tree, so a stale/incomplete history projection cannot make an invalid package current. The final migration does not own a startup-fatal result. Only an independent existing platform/bootstrap owner may establish that the current application itself cannot initialize or operate and select the separate fatal startup path.

The full-process synthetic seed declares `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`: all fourteen non-canonical/non-final definitions that remain registered, with their observed terminal status and attempt-1 state. It seeds the old canonical failed-6 row separately and leaves final V1 absent. First launch and relaunch snapshot every retained row unchanged; final V1 must be the only new attempt.

Server startup accepts both terminal success states, rebuilds the valid-package catalog, and listens. Electron output is logging/fatal-detail input only. A current-generation health poll is the sole success path.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Acceptance IDs | Trigger / Contract | Existing Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Operational | `REQ-001`, `REQ-008`; `AC-001`, `AC-011` | released-personal cutover | old canonical failed 6; final absent | deregister old canonical, leave row unchanged, run one final owner | runner -> final migration -> terminal result (`DS-001`) |
| `BEH-002` | System | `REQ-003`; `AC-003`, `AC-004` | released metadata authority | 25 nested Teams and released precedence | explicit-first/fallback per root; contradiction excludes root only | root planner (`DS-101`) |
| `BEH-003` | System | `REQ-004`; `AC-005` | released address grammar | 35 nested task address occurrences | one strict decoder; bad evidence excludes owning root | root planner (`DS-101`) |
| `BEH-004` | System/Operational | `REQ-005`; `AC-006`, `AC-011` | earlier communication terminal warning | 306 address files; 40 run-ID files | final converter owns both; old record unchanged; bad file excludes root only | communication stage (`DS-102`) |
| `BEH-005` | System/Contract | `REQ-006`; `AC-007`, `AC-008` | loss-intolerant token ledger | 152,616 rows; runtime root column already present | resolved root updates; unresolved rows/evidence untouched; no column drop | token disposition/apply (`DS-103`) |
| `BEH-006` | Operational | `REQ-002`, `REQ-007`; `AC-002`, `AC-009` | one root cannot plan or promote safely | current global coupling; promoter catch is not rollback | pre-mutation preserve warning or truthful post-error admit/exclude warning; other roots/startup continue | root loop/promoter/catalog (`DS-001`, `DS-104`, `DS-106`) |
| `BEH-007` | User/Operational | `REQ-009`; `AC-013` | health is sole ready contract | log-ready and pre-health close gap | every migration warning reaches health; only current-platform inoperability fails promptly; logs never ready | terminal migration status -> listen/health; platform failure -> error (`DS-003`, `DS-004`, `DS-105`) |
| `BEH-008` | User | `REQ-010`; `AC-011`, `AC-014`, `AC-015` | successful migration must be usable through actual registry | later retained Team-history definition follows final in registry | full retained cohort skips unchanged; admitted roots list/open/restore/send under same IDs | ledger/continuation (`DS-001`, `DS-005`, `DS-006`) |
| `BEH-009` | User/Operational | `REQ-007`, `REQ-011`, `REQ-012`; `AC-009`, `AC-010`, `AC-012`, `AC-016`, `AC-017` | mixed valid and bad legacy items under normal operating assumptions | SR-008 all-or-nothing; SR-010 exhaustive recovery draft | pre-mutation warnings preserve usability; on a promotion/storage exception stop the affected mutation, observe current validity, return admitted-current or excluded warning, and still reach catalog/listen/health | availability/promotion proof (`DS-006`, `DS-106`) |
| `BEH-010` | Operational Documentation | `REQ-013`; `AC-018` | future migration engineer reads the server migration guide | existing README explains execution and one provider migration but not the reusable assumption boundary | delivery adds a concise deterministic-data/native-atomicity/bounded-retry versus infrastructure-catastrophe practice note | delivery documentation sync (`DOC-01`) |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status / Approval |
| --- | --- | --- | --- | --- |
| `ticket-description.md` | request baseline and later scope/availability decisions | all | defines migration-only product boundary | current request authority with later requirements precedence |
| `released-data-shape-inventory.md` | aggregate read-only production/released evidence | `REQ-002`–`REQ-006`, `REQ-009`–`REQ-012` | determines source cohorts, runtime-compatible token store, and evidence-bounded assumptions | evidence; approval N/A |
| `design-use-case-validation.md` | SR-013-revalidated static proof/executable manifest | all | proves supported and migration-warning flows, independent admission, complete retained-ledger lifecycle, explicit assumptions, and platform-only fatal boundary | current evidence; approval N/A |
| `design-review-report.md` | `ARCH-REV-007` result against SR-011 | `AR-007`, `AR-009`; withdrawn `AR-008` | current requirement-gap trigger; `AR-006` remains resolved | current trigger |
| `migration-recovery-policy.md`, `startup-blocker-status-contract.md` | historical broad proposals | N/A | not used | superseded |

## Task Design Health Assessment (Mandatory)

- Change posture: `Production Upgrade Bug Fix` plus clean-cut refactor of an unreleased persisted-data transition.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, `Legacy Or Compatibility Pressure`, and `Missing Invariant`.
- Refactor needed now: `Yes`, bounded to the final Team migration and embedded-startup lifecycle.
- Evidence: two unpublished migration owners, incomplete released decoders, global historical-item coupling, unnecessary destructive token cleanup, wrong startup gate, and competing log/health ready owners.
- Design response: one final coordinator; one migration-only per-root planner; existing per-root backup/promoter extended with truthful post-error current-validation outcomes; one per-row token disposition/apply owner; existing warning record/log contract; strict current package catalog/history readers; health owns current-generation ready. No migration problem owns startup fatality.
- Availability invariant: conversion correctness remains strict **inside one item**, while availability isolation is enforced **between items**. No identity is guessed to make a warning disappear.
- Refactor explicitly not required: generic degraded mode, quarantine browser, warning UI, migration/crash journal, hash/phase recovery record, per-syscall rollback, external-channel/history subsystem redesign, memory schema, or current-runtime legacy readers.

## Terminology

- **Released source:** exact `origin/personal` Team files and token evidence.
- **Final migration:** `20260814_team_run_execution_tree_v1`, the sole branch-introduced Team cutover owner.
- **Root disposition:** `CURRENT`, `MIGRATED`, `COMMITTED_WITH_WARNING`, `PRESERVED_WARNING`, `EXCLUDED_PROMOTION_WARNING`, or `HISTORICAL_RESIDUE`; only independently current/committed variants contribute a V1 tree.
- **Operating assumptions:** one writer, sufficient readable/writable storage, stable process/power/device, and normal SQLite/same-filesystem file-operation contracts for one attempt.
- **Committed promotion:** the existing promoter completes staged validation, live replacement, predecessor-marker removal, and final current-package validation.
- **Bounded retry state:** marker present means migration-owned/excluded and may replan from protected backup; marker absent plus a valid complete package means current/no-op.
- **Resolved token disposition:** one row has a proven final root and may be updated.
- **Preserved token warning:** one row lacks safe final attribution and is left physically unchanged.
- **Runtime-usable token store:** all columns/current indexes required by the Prisma runtime exist; predecessor-only extra columns may also exist and are ignored.
- **Migration warning:** any conversion, promotion, token, or history migration problem; it is truthful about preservation/current validation and cannot block startup.
- **Platform inoperability:** the current application cannot initialize or operate independently of migration semantics; only this separate condition may fail startup.
- **Startup generation:** one `BaseServerManager.startServer()` attempt whose health/events cannot settle another attempt.

## Operating Assumptions And Fault Boundary

The implementation is designed and tested under one startup writer, sufficient permissions/space, stable process/power/storage, normal same-filesystem rename/write semantics, and normal SQLite transaction semantics. Supported inputs are the released shape families established by the read-only investigation; manual/hardware corruption and arbitrary unobserved mutation are not business cases.

Deterministic migration logic must cover every documented metadata, address, task, message, token, orphan, memory, and ledger case. An unexpected readable variation is preserved before mutation. A migration-operation exception is reported truthfully and cannot make the application fail startup: packages are independently validated for admit/exclude, token SQL uses native rollback, and history/catalog readers remain strict. Only proof that the current platform itself cannot operate is fatal. No design or test enumerates power loss, kernel failure, bit flips, disk corruption, or every possible failing syscall.

This is optimistic, not unsafe: the code validates before mutation, uses the existing protected backup and metadata admission marker, validates the final package, and remains idempotent for the two normal retry states. It simply refuses to dirty the business path with a general crash-consistency subsystem outside the ticket's evidence and assumptions.

## Design Reading Order

Read the operating assumptions, state model, and `DS-001` first. The key distinction is truthful migration warning state versus strict independent current admission—not warning versus fatal migration. Then read `DS-106` for post-error package observation, `DS-103` for transactional token warnings, `DS-107` for non-blocking history warnings, `DS-003`/`DS-004` for migration-health versus platform-fatal startup, and `DS-005`/`DS-006` for user-level proof.

## Legacy Removal Policy (Mandatory)

- Remove the `20260801_team_canonical_identity` definition, ID export, registry construction, V1 prerequisite, server import/gate, and dedicated tests.
- Remove canonical file rewrite/coordinator and canonical token intermediate store/migrator; rehome only released decoding/planning logic under final V1 ownership.
- Remove canonical intermediate files/tables/indexes and external-channel converter calls.
- Remove SR-008 exact-column-contraction assumptions; predecessor token columns remain inert evidence, not runtime compatibility behavior.
- Remove `BaseServerManager.checkForReadyMessage()` and stdout/stderr ready branches.
- Do not add runtime dual readers, migration-ID aliases, automatic replay of terminal warning rows, or support for unpublished canonical-intermediate profiles.
- Retain older released migrations and their ledger rows unchanged.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject/location/volume: 507 predecessor Team roots, six authority-less roots, 152,616 token rows, about 5.49 GB Team memory, migration ledger, Team history index.
- Change: supported Team authority becomes the final V1 package; supported token rows receive final root attribution.
- Current reader/writer evidence: V1 package loader/catalog and restore runtime require the final package; token runtime already uses nullable `root_team_run_id` and ignores legacy extra columns.
- Invariants: exact identity within an admitted root; byte preservation only for exclusions decided before mutation; truthful observed-state reporting for post-mutation exclusions; unchanged token accounting; unchanged memory bytes/path; no false admission; new current writes remain possible.
- Decision: `Migration Required` for supported Team authorities and token root values; `Directly Usable — No Migration` for memory and predecessor-only token columns as ignored extras; `Preserve Inert` for old ledger rows.
- Operational boundary: one startup migration, per-root protected FS mutation, one transaction for resolved token rows, warning aggregation, and one history projection from admitted trees with strict post-write verification.
- Failure policy: every migration-level conversion, promotion, token, or history exception becomes a truthful warning and cannot block startup. Pre-mutation failures may claim preservation; mutation-stage failures may not. Strict current validators/catalogs own admit versus exclude. Only a non-migration current-platform condition that makes the application unable to operate is fatal. Hypothetical infrastructure failures outside the operating assumptions receive no bespoke migration recovery design.
- Supported criteria: `AC-001`–`AC-018`.

### Migration Plan

- Trigger: startup `AppDataMigrationRunner.runPending()`.
- Owner: `TeamRunExecutionTreeV1AppDataMigration` plus focused files in its existing V1 folder and token SQL repository.
- Runtime contract: current V1 packages/current token fields only; no predecessor reader in business services.
- Historical decoders: migration-only.
- Completion marker: final V1 ID only; warning is terminal for automatic startup.
- Retry: complete current packages are validated no-ops. Marker-present or invalid/incomplete post-error packages remain excluded and may be reattempted only through the existing explicit migration path or a later release; terminal warning is skipped automatically. Resolved root updates remain idempotent. No in-process restoration journal is added.
- Admission: success and every migration warning permit catalog/listen. Catalog admits only independently validated V1 packages; history lists only rows backed by a readable current tree.
- Concurrency: one startup writer; no simultaneous profile versions.
- Retention: untouched source files remain for warning roots; existing protected backups remain for promotion attempts; token legacy columns remain physically inert.
- Ledger fixture: seed/snapshot every entry in `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`, seed old canonical failed-6 separately, and leave final V1 absent so the actual registry makes V1 the sole new attempt.

`RETAINED_TARGET_MIGRATION_TERMINAL_COHORT` is a stable test-only descriptor in target registry order after canonical removal. Every entry has `attempts: 1`; its complete record snapshot (including summary/log/error/timestamps as seeded) must remain equal before launch, after first launch, and after relaunch.

| Order | Migration ID | Terminal status | Relative to final V1 |
| ---: | --- | --- | --- |
| 1 | `20260727_custom_provider_v1_secret_migration` | `SUCCEEDED` | before |
| 2 | `20260706_remove_global_skill_discovery_mode` | `SUCCEEDED` | before |
| 3 | `20260517_team_run_metadata_member_tree` | `SUCCEEDED` | before |
| 4 | `20260731_remove_external_runtime_working_context_snapshots` | `SUCCEEDED` | after |
| 5 | `20260617_raw_trace_rotation_layout` | `SUCCEEDED` | after |
| 6 | `20260707_raw_trace_active_file_name` | `SUCCEEDED` | after |
| 7 | `20260731_migrate_native_working_context_snapshots_v5` | `SUCCEEDED_WITH_WARNINGS` | after |
| 8 | `20260701_team_communication_projection_addresses` | `SUCCEEDED_WITH_WARNINGS` | after |
| 9 | `20260730_token_usage_custom_provider_model_value_backfill` | `SUCCEEDED` | after |
| 10 | `20260730_token_usage_provider_name_snapshot_backfill` | `SUCCEEDED` | after |
| 11 | `20260623_remove_self_evolution_run_metadata` | `SUCCEEDED` | after |
| 12 | `20260521_team_run_history_index_v2` | `SUCCEEDED` | after |
| 13 | `20260521_run_history_index_v2` | `SUCCEEDED_WITH_WARNINGS` | after |
| 14 | `20260803_custom_provider_readable_identity` | `SUCCEEDED_WITH_WARNINGS` | after |

The old canonical `FAILED`/attempts-6 row is intentionally outside the descriptor because it will be unregistered. The final V1 row is intentionally absent. Tests must derive actual registry IDs after canonical removal and assert the set equals `{final V1} + RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`; this prevents a future retained definition from silently joining full-process migration execution.

### Reachable Persisted-State Model

| State | Root Authorities | Token Store | Final Record | Allowed Action / Recovery |
| --- | --- | --- | --- | --- |
| `SOURCE_READY` | predecessor/current/historical/orphan mix | runtime-usable with released evidence | absent/failed | classify; per-root plan/promote; per-row plan/apply; history |
| `PROMOTION_WARNING_EXCLUDED` | post-error root is marker-present, incomplete, unreadable, or otherwise not a valid complete current package | rows for that unavailable root remain unchanged/warned | `SUCCEEDED_WITH_WARNINGS` | catalog excludes only this root; report observed state without claiming preservation; unrelated roots/new work/health continue |
| `PROMOTION_WARNING_CURRENT` | promotion threw but marker-absent complete current package independently validates | supported rows may use admitted tree | `SUCCEEDED_WITH_WARNINGS` | admit exact current package; report operation warning; unrelated work/health continue |
| `PARTIAL_ROOT_PROGRESS` | some roots current, untouched warnings remain predecessor, and mutation-warning roots may be excluded partial state | runtime-usable; only admitted-root updates applied | terminal warning | catalog independently admits valid roots and excludes all others; listen/health |
| `HISTORY_WARNING_READY` | admitted packages current; history index may remain prior/current/absent after reconciliation error | resolved roots updated or rolled back; runtime usable | `SUCCEEDED_WITH_WARNINGS` | strict package catalog rebuild; history reader shows only rows with readable current trees; listen/health/new work |
| `WARNING_READY` | valid roots current; pre-mutation excluded sources preserved; post-mutation exclusions truthfully reported | resolved roots updated or token apply rolled back; runtime usable | `SUCCEEDED_WITH_WARNINGS` | catalog valid roots; listen/health; automatic relaunch skip |
| `COMPLETE` | all supported roots current; historical residue preserved | all supported row roots resolved; legacy evidence retained | `SUCCEEDED` | listen/health; relaunch skip |
| `CURRENT_RETRY` | complete current packages plus explicitly repaired predecessor items | runtime usable | warning manually retried | current no-op plus bounded reattempt; history reconcile |
| `PLATFORM_INOPERABLE` | current database/runtime or required platform substrate cannot initialize/operate independently of migration semantics | current application cannot operate | startup/ledger may fail | prompt existing Electron error; this is not a migration-warning case |

The target never creates a canonical persisted intermediate. An unpublished intermediate or predecessor root without required evidence is classified as a preserved warning; the root classifier cannot establish startup fatality or brick unrelated current product behavior. If the current storage/platform substrate is independently inoperable, the existing platform/bootstrap owner establishes that condition outside migration-detail aggregation.

| Step | Source | Target / Disposition | Owner | Validation | Failure / Recovery |
| --- | --- | --- | --- | --- | --- |
| current-platform bootstrap | current database/runtime/config/storage substrate | operable application platform | existing server/bootstrap owners | current Prisma/runtime initialization and required store availability | fatal only when the application cannot operate independently of migration; outside migration result aggregation |
| migration source access | Team roots + current token fields/ledger evidence | per-root/per-row evidence or warning | final coordinator/source adapters | enumerate/read independently where possible | migration access/interpretation problem warns; unaffected subjects and startup continue |
| token evidence snapshot | available released/current rows | row evidence successes + warning details | token source adapter/parser | JSON/row facts independently | scan unavailable but runtime usable -> warning; affected roots may exclude |
| root classification | one root entry | current/historical/predecessor/preserved warning | classifier | lstat/authority | root issue warns/preserves/continues; classifier cannot establish startup fatality |
| root planning | one predecessor root + usable evidence | complete immutable three-file root plan | `TeamRunV1RootPlanner` | current metadata/task/message/package validators | warning for owning root only; no mutation |
| root promotion | one fully validated root plan | validated current V1 package or excluded observed root | existing promoter | protected backup, staged/current validators, marker-last ordering, post-error current loader | success -> `MIGRATED`; exception -> committed-with-warning if current valid, else excluded warning; continue |
| token planning/apply | every row/evidence | resolved updates + unchanged warning rows | token planner/repository | one disposition per row; accounting snapshot | bad row warning; SQL rollback warning when store still usable |
| history | admitted trees only | current history projection when possible | existing reconciler | exact tree IDs; normal write validation | unchanged/write -> migrated/skipped; any reconciliation exception -> warning; current catalog remains authority |
| migration result | migration detail aggregate | migration success/warning | final migration coordinator | warning-only migration-detail aggregation | every migration warning -> catalog/listen/health; no migration detail selects fatal |
| startup fatal | independently observed current-platform state | existing platform fatal path | existing server/platform bootstrap owner | current application cannot initialize or operate independently of migration | nonzero error; migration coordinator cannot select this path |

### Per-Root Promotion Observation Contract

`TeamRunV1PackagePromoter.promote()` remains the one filesystem mutation owner and keeps its existing protected-backup, staged-validation, marker-last sequence. Its application contract is deliberately narrow:

```ts
type TeamRunV1PromotionResult =
  | Readonly<{ kind: "COMMITTED"; backupDirectory: string }>
  | Readonly<{ kind: "COMMITTED_WITH_WARNING"; backupDirectory: string | null; message: string }>
  | Readonly<{
      kind: "EXCLUDED_PROMOTION_WARNING";
      backupDirectory: string | null;
      message: string;
      markerPresent: boolean | null;
      validationMessage: string;
    }>;
```

The coordinator maps `COMMITTED` to `MIGRATED`. The promoter catches a root-local backup/stage/live/final-validation exception, performs **read-only bounded observation** through the current package loader, and returns one warning result. A complete marker-absent valid current package returns `COMMITTED_WITH_WARNING` and remains admitted. Every other observed state returns `EXCLUDED_PROMOTION_WARNING`; the root is omitted from token/history admission and later catalog rebuild. The result records the original error and validation observation, never claims rollback or predecessor preservation, performs no repair mutation, and never aborts other roots or startup.

Normal promotion order:

1. the root planner has already read and validated the complete three-file target in memory; all warnable legacy-data decisions are finished;
2. the promoter creates/syncs the existing protected predecessor backup and manifest before touching live target files;
3. it stages/syncs and validates all three targets;
4. it replaces tree/task/message targets, validates the live complete package, moves the metadata marker last, and validates the marker-absent current package before returning `COMMITTED`;
5. if an operation throws, it stops mutation and performs only read-only current-package observation to return the applicable warning variant.

Bounded future/manual retry uses existing software-visible states rather than an added recovery journal:

- **Marker present:** the catalog excludes the root. If target files also exist, `TeamRunPredecessorSourceResolver` resolves task/message inputs from the latest protected V1 backup, and a later normal migration attempt replans/promotes the complete package.
- **Marker absent:** the classifier/loader accepts only a complete valid current package. That package is a no-op on retry. An invalid marker-absent package remains excluded/diagnostic; it does not block the application.

Tests cover normal commit and two representative post-error observations: valid current -> admitted warning; invalid/incomplete -> excluded warning. Both continue unrelated roots, token/history work for admitted subjects, catalog/listen/health/new work, and unaffected continuation. Marker-present and marker-absent fixture states prove strict later/manual admission behavior. Tests do not inject every rename/fsync or simulate power/device/kernel corruption. This resolves reopened `AR-007` without either false preservation or a general restoration subsystem.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behaviors | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`–`BEH-006`, `BEH-009` | runner invokes final ID | terminal final record | final migration coordinator | one availability-safe cutover |
| `DS-003` | Primary End-to-End | `BEH-007`, `BEH-009` | final status returned | current-generation health/ready | server runtime + BaseServerManager | warning must remain usable |
| `DS-004` | Return/Event | `BEH-007` | non-migration platform/process failure | existing Electron error | server gate + startup attempt | exact prompt platform-fatal outcome |
| `DS-005` | Primary End-to-End | `BEH-008` | history selection | controlled event under same IDs | current history/Team runtime | proves migrated continuity |
| `DS-006` | Primary End-to-End | `BEH-009` | mixed synthetic source | health/new work/valid continuation/relaunch | API/E2E harness | proves availability contract |
| `DS-101` | Bounded Local | `BEH-002`, `BEH-003` | one root metadata/tasks | root plan or warning | root planner | item-local strict identity |
| `DS-102` | Bounded Local | `BEH-004` | either message shape | V1 messages or root warning | message converter | same-tree participant authority |
| `DS-103` | Bounded Local | `BEH-005` | token rows | resolved update batch + warning rows | token planner/repository | accounting-safe partial success |
| `DS-104` | Bounded Local | `BEH-006` | root entry | disposition/catalog diagnostic | classifier/catalog | no false admission |
| `DS-105` | Bounded Local | `BEH-007` | child/poll events | exactly-once ready/error | BaseServerManager attempt | health-only lifecycle |
| `DS-106` | Bounded Local | `BEH-006`, `BEH-009` | validated root plan | committed package, admitted-current warning, or excluded promotion warning | TeamRun V1 promoter/current loader | migration error does not block; current validity still governs admission |
| `DS-107` | Bounded Local | `BEH-008`, `BEH-009` | admitted current tree map | history success/no-op or reconciliation warning | TeamRun history reconciler + final coordinator | history migration error does not block current package catalog/startup |

## Primary Execution Spine(s)

- `DS-001`: `existing operable platform bootstrap -> AppDataMigrationRunner -> TeamRunExecutionTreeV1AppDataMigration -> migration source snapshot -> per-root disposition loop (including DS-106) -> admitted-root token transaction/warning -> admitted-tree history projection/warning (DS-107) -> terminal success/warning`.
- `DS-003`: `terminal success/warning -> catalog rebuild -> server listen -> current-generation health poll -> Electron ready`.
- `DS-005`: `Team history selection -> package hydration -> restore TeamRun -> focused AgentRun input -> persisted continuation event`.
- `DS-006`: `isolated mixed profile + full retained terminal cohort -> final-only migration warning -> health/workspace -> new Agent + new AgentTeam -> valid old Team continuation -> relaunch with every retained record unchanged`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Data | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | After the existing platform/bootstrap owner has independently established an operable current substrate, the runner skips the complete retained terminal cohort, ignores the unregistered old canonical row, and invokes final V1 as the sole new attempt. The coordinator snapshots token evidence and loops roots deterministically. Pre-mutation data problems preserve/warn; promotion problems return truthful admitted-or-excluded warnings; unrelated roots continue. Resolved token roots for admitted subjects apply transactionally; unsupported/failed rows stay unchanged. History uses admitted trees and warns on reconciliation error. The final migration returns success/warning and startup continues. | ledger snapshots, states, root plans, promotion observations, row dispositions, history details | final migration | backups, logging |
| `DS-003` | Server accepts success/warning, rebuilds catalog, logs warning summary, listens, and exposes health. Electron logs output but health alone settles ready. | final status, catalog, health, attempt | server/BaseServerManager | poll interval, output forwarding |
| `DS-004` | Only an independently established non-migration platform/bootstrap failure under which the current application cannot operate produces a structured narrow blocker/nonzero exit. Migration conversion/promotion/token/history details never enter this path. | platform fatal payload, child events | server/BaseServerManager | chunk framing |
| `DS-005` | A migrated history root loads its exact package/memory, restores the same TeamRun/AgentRun identities, and persists a controlled new submission. | package, memory, run IDs, event | current runtime | deterministic backend |
| `DS-006` | The same mixed fixture proves preservation and usability together: invalid source hashes stay equal while valid/current/new paths work and relaunch skips the terminal warning. | fixture manifest, API/browser assertions | test harness | isolation guard |
| `DS-106` | The planner supplies a complete validated package. The promoter backs up, stages, replaces, moves the marker last, and validates current state. Success commits. On exception it stops mutation and observes through the current loader: valid current returns admitted warning; anything else returns excluded warning. The coordinator records it and continues. | validated plan, backup, staged/live files, marker, validation observation | TeamRun V1 promoter/current loader | normal filesystem assumptions |
| `DS-107` | The reconciler computes rows only from admitted current trees and uses the existing backup/atomic index writer. Success/no-op returns normally. Any snapshot/backup/write/validation exception returns a history warning; current package catalog remains authoritative, startup continues, and current history readers omit rows without readable current trees. | admitted tree map, prior index snapshot, projected rows, warning detail | TeamRun history reconciler + final coordinator | atomic writer internals, normal filesystem assumptions |

## Spine Actors / Main-Line Nodes

| Node | Owns | Receives | Emits | Must Not Own |
| --- | --- | --- | --- | --- |
| runner | ledger attempts/status/log | definition result | record snapshot | Team interpretation |
| final coordinator | phase order and warning-only migration-detail aggregation | memory/app-data/token adapters | terminal success/warning | detailed parsing/SQL, platform fatal classification, or platform recovery |
| root planner | exact one-root transformation | released files + row evidence | root plan or typed warning | cross-root blocking |
| promoter/current loader/source resolver | one-root backup, normal commit, read-only post-error observation, retry source | validated plan or marker/current state | committed/admitted-warning/excluded-warning result | historical interpretation or restoration framework |
| token planner/repository | row authority policy / SQL apply | raw rows + task/evidence indexes | dispositions / update outcome | package promotion |
| history reconciler | admitted-tree projection | current tree map | changed/skipped result or warning detail | predecessor decoding, catalog admission, or startup blocking |
| server runtime | final status admission/listen | statuses | health-capable server/fatal | item repair |
| BaseServerManager attempt | child lifecycle/health settlement | output/events/health | ready/error | migration policy |

## Ownership Map

| Concern | Governing Owner | Boundary | Invariant |
| --- | --- | --- | --- |
| migration ledger | runner/repository | definition result | one final ID; warning terminal |
| migration-detail classification | final coordinator | conversion/promotion/token/history details | every migration detail becomes a warning; coordinator cannot select startup fatal |
| startup-fatal classification | existing platform/bootstrap owner | independently observed current application substrate | only current-app inoperability independent of migration details may be fatal |
| root identity/package | root planner | one root | strict inside root; no mutation before validation |
| root mutation | promoter/current loader | one root dir/protected backup | successful commit validates current; post-error result truthfully admits valid current or excludes everything else without preservation claim |
| token attribution | row planner | one row/address group | exact evidence or unchanged warning |
| token persistence | final token repository | transaction | resolved rows only; facts/legacy evidence preserved |
| history persistence | history reconciler | snapshot -> optional backup/atomic write/validation | success projects admitted trees; any migration error returns warning and cannot block current package catalog/startup |
| admission | V1 catalog | current package | invalid/predecessor excluded |
| readiness | BaseServerManager attempt | current-generation health | logs cannot settle success |

## Thin Entry Facades / Public Wrappers (If Applicable)

- `TeamRunExecutionTreeV1AppDataMigration.execute()` remains the definition facade and delegates subject detail to focused owned modules.
- `TokenUsageLedgerStore` remains the application-facing token facade; migration-only list/apply APIs delegate to the SQL adapter.
- `BaseServerManager.startServer()` remains the Electron lifecycle boundary; platform launchers only spawn and forward events.

## Removal / Decommission Plan (Mandatory)

| Remove | Why | Replacement | Verification |
| --- | --- | --- | --- |
| canonical migration definition/ID/registry/prerequisite/gate | unpublished artificial boundary | final V1 ID | registry/source search/tests |
| canonical file rewrite coordinator/converters | persisted intermediate | root planner in-memory decoding | no canonical target writes |
| canonical token store/migrator/evidence bridge | two-step dependency | per-row final root planner/repository | no intermediate table/index |
| global `TeamRunV1UpgradePlan` all-or-nothing admission | violates availability | deterministic root dispositions + shared evidence snapshot | mixed cohort test |
| exact legacy-column drop/schema-no-op rule | cleanup not required by runtime | runtime-usable schema probe + retained evidence | Prisma current reads/new writes test |
| external output converter calls | out of scope | none | sentinel no-touch |
| log-driven ready | false readiness | generation health | lifecycle tests |

## Return Or Event Spine(s) (If Applicable)

- `DS-004`: true fatal status/process event -> parsed fatal detail -> one Electron error.
- Warning path is not an error return spine: migration warning -> server warning log/status -> catalog/listen -> health -> ready.
- Root/token warnings return only to the final coordinator's detail aggregate; they do not escape as thrown cohort exceptions.

## Bounded Local / Internal Spines (If Applicable)

- `DS-101`: read one root -> normalize metadata -> normalize tasks/addresses -> build tree/task evidence -> validate plan -> return plan/warning.
- `DS-102`: detect message projection -> same-tree participant resolution -> V1 message validation -> return messages/root warning.
- `DS-103`: parse every row -> group conflicting address evidence -> create one disposition per row -> transactionally update only resolved roots -> verify facts/index -> return warnings/outcome.
- `DS-104`: lstat authority/marker/current package -> classify -> preserve/exclude/admit diagnostic.
- `DS-105`: start generation -> spawn -> log/parse fatal -> poll health -> first valid settlement cancels other callbacks.
- `DS-106`: validated plan -> protected backup -> stage/validate -> marker-last target replacement -> final validation -> committed; any exception -> stop mutation -> current-loader observation -> admitted-current warning or excluded warning.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Owner | Why Off-Spine |
| --- | --- | --- | --- |
| backup/sync/staged files | promotion | promoter | root-local mutation detail under normal filesystem assumptions |
| migration log/summary | runner result | runner | reporting only |
| source hashes | E2E proof | test harness | evidence only |
| task-Team physical index | root/token planning | migration planner | migration-only corroboration |
| warning diagnostics map | catalog/user proof | catalog | admission observability |
| fatal line framing | Electron attempt | focused parser | process transport detail |

## Ownership Boundaries

- Historical shapes may enter only migration-owned source/planner files.
- Root planner cannot mutate filesystem or block another root.
- Promoter accepts only a validated final root plan; the source resolver owns marker-present protected-source selection before planning.
- Token SQL repository accepts typed resolved updates; it cannot decide identity or delete legacy evidence.
- History reconciler accepts only the admitted current-tree map and converts its own snapshot/backup/write/validation exception into a warning detail; it cannot admit a package or block startup.
- Current history/runtime requires a readable current tree for any index row, so stale projection cannot bypass package/catalog validation.
- Server runtime accepts both terminal migration statuses and delegates package admission to the strict catalog; only separately owned platform/process failure reaches the fatal summary path.
- BaseServerManager depends on health/process evidence, not migration registry internals.

## Boundary Encapsulation Map

| Caller | Authoritative Boundary | Internal Mechanism Hidden | Forbidden Bypass |
| --- | --- | --- | --- |
| runner | final migration definition | root/token/history modules | direct promoter/repository calls |
| coordinator | root planner | metadata/task/message decoders | partial subject plans |
| coordinator | promoter | backup, staging, marker-last replacement, final validation, post-error current observation | direct writes/renames, restoration attempts, or treating post-error state as preserved |
| coordinator | token migration boundary | Prisma SQL | raw migration SQL |
| coordinator | history reconciler | snapshot, backup, atomic write, validation, warning result | treating a history migration warning as startup fatal or package admission authority |
| server | runner status | migration item internals | file/schema inspection |
| platform launcher | BaseServerManager | health timers/settlement | ready emission from stdout |

## Dependency Rules

- Allowed: runner -> final definition -> root planner/promoter/token boundary/history reconciler.
- Allowed: root planner -> migration decoders/current validators/physical and token evidence indexes.
- Allowed: token planner -> migration task index; repository -> Prisma only.
- Allowed: server -> final status/catalog -> current runtime.
- Allowed: BaseServerManager -> platform launcher/health client/fatal parser.
- Forbidden: current runtime -> predecessor decoder/legacy token column.
- Forbidden: one root plan failure -> suppression of unrelated root promotion.
- Forbidden: one token row failure -> rejection of resolved rows or app startup.
- Forbidden: token repository -> dropping predecessor evidence columns in this ticket.
- Forbidden: promotion warning -> `PRESERVED_WARNING` claim after live mutation.
- Forbidden: promotion/history/token migration exception -> startup `FAILED` while the current platform itself remains operable.
- Forbidden: generic journal/hash-phase/rollback subsystem for hypothetical infrastructure failures.
- Forbidden: logs -> ready state.

## Interface Boundary Mapping

| Boundary | Input | Output | Failure Contract |
| --- | --- | --- | --- |
| root enumerator | Team root path | ordered entries or migration warning | enumeration failure does not block startup; platform owner separately determines runtime operability |
| root planner | one classified predecessor + shared evidence | `PlannedTeamRunV1Root` | typed root warning; no migration-detail throw across loop |
| package promoter | validated plan | `COMMITTED`, `COMMITTED_WITH_WARNING`, or `EXCLUDED_PROMOTION_WARNING` | exception stops mutation; read-only current validation determines admit/exclude; never throws a root-local migration error across coordinator |
| token evidence parser | one row | exact evidence or row warning | never aborts other rows |
| token apply | resolved admitted-root updates + fact snapshot | changed count/verification or warning | native transaction rollback on migration error; row/accounting state reported; startup continues |
| history reconcile | admitted current-tree map | changed/skipped result or warning detail | snapshot/backup/write/validation error is non-blocking migration warning |
| migration execute | phases/details | success/warning | every migration detail -> warning; platform inoperability is outside migration result ownership |
| server gate | final status | continue/fatal payload | both terminal success states continue |
| startup attempt | child + health | ready/error once | generation scoped |

## Interface Boundary Check

- Every boundary names a concrete subject and identity; no generic profile-item interface is introduced.
- A root warning contains root ID/path/phase/reason and never pretends migration success for that root.
- `PRESERVED_WARNING` is planner-only and therefore no-live-mutation. Promotion warnings use distinct admitted-current/excluded outcome names and never imply preservation.
- A token warning contains event/row identity and reason but does not expose user content.
- A history warning is non-blocking and does not claim exact projection; strict current package/catalog validation remains the admission authority.
- The migration coordinator centralizes warning-only migration-detail aggregation and never infers startup fatality from `failedCount > 0`; only the independent existing platform/bootstrap owner may establish startup-fatal current-platform inoperability.
- Current runtime receives no legacy DTO.

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Action |
| --- | --- | --- | --- |
| one root plan | `PlannedTeamRunV1Root` | Yes | replace global upgrade plan |
| root outcome | `TeamRunV1RootDisposition` | Yes | current/migrated/preserved warning/historical |
| promotion outcome | `TeamRunV1PromotionResult` | Yes | committed, committed-with-warning, or excluded-promotion-warning |
| promotion observation | current loader validation inside promoter catch | Yes | read-only admit/exclude evidence; no recovery record |
| token row outcome | `TeamRunV1TokenRowDisposition` | Yes | resolved/standalone/preserved warning |
| schema probe | `TokenUsageRuntimeSchemaSnapshot` | Yes | migration-visible runtime/evidence-column facts; it produces warning detail and cannot select startup fatal |
| startup attempt | `EmbeddedServerStartupAttempt` | Yes | private lifecycle type |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| ledger warning terminality | runner | Reuse | already correct and tested |
| per-root classification | classifier | Extend | add exact preserved dispositions/global boundary |
| strict root plan | current V1 planner/converters | Refactor | change global throw/coupling to one-root result |
| protected promotion | promoter/backup resolver/current loader | Extend narrowly | keep backup/stage/marker sequence; add truthful read-only post-error admit/exclude warning outcome |
| token runtime schema | Prisma/current repository | Reuse | root column/index already available |
| token row policy | canonical/V1 planners | Rehome/refactor | retain released interpretation, remove cohort failure/destructive DDL |
| catalog exclusion | V1 catalog | Reuse | already per-root diagnostics |
| history | reconciler + atomic index store | Extend narrowly/sequence | admitted tree map only; thrown migration error returns warning and does not block catalog/listen |
| health | BaseServerManager health method | Extend/own | remove competing log path |
| synthetic fixtures | existing test patterns | Extend | no production copy |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| app-data lifecycle | final ID/attempt/status/log | `DS-001` | reuse |
| final Team upgrade | prerequisite/root disposition/promotion observation/warning aggregation | `DS-001`, `DS-101`–`104`, `DS-106` | extend existing V1 folder |
| token persistence | resolved root update/fact verification | `DS-103` | replace destructive repo behavior |
| current Team history/runtime | migration projection verification plus admission/open/restore/send/new work | `DS-005`, `DS-107` | narrow reconciler change; runtime reuse unchanged |
| embedded lifecycle | migration-warning admission/health/platform-fatal | `DS-003`, `DS-004`, `DS-105` | narrow change |
| API/E2E | supported/mixed migration-warning/platform-inoperable proof | `DS-006` | extend tests |

## Draft File Responsibility Mapping

| Candidate File | Owner | Concern | Why One File |
| --- | --- | --- | --- |
| V1 app migration | coordinator | phase order/migration-warning result | existing owner |
| `team-run-v1-root-migration-planner.ts` | root planner | one-root immutable plan/result | explicit isolation boundary |
| predecessor metadata/task/message files | subject decoders | released transforms | cohesive subjects |
| `token-usage-team-run-v1-row-planner.ts` | token policy | one row/address disposition | no SQL/global throw |
| `token-usage-team-run-v1-migration-repository.ts` | token SQL | usable-schema probe/resolved updates | persistence only |
| classifier/history reconciler | existing owners | root disposition; history projection/warning | classifier reuse; reconciler non-blocking result change |
| promoter/current loader/source resolver | root mutation/observation/retry source | existing backup, marker-last commit, post-error current validation, marker-present backup selection | narrow extension; no recovery helper |
| server runtime | startup | accept all migration warning outcomes; reserve error for platform/process failure | lifecycle owner |
| Electron fatal parser/BaseServerManager | process lifecycle | framing/health settlement | AR-004 boundary |

## Reusable Owned Structures Check

| Logic | Shared Structure | Owner | Must Not Become |
| --- | --- | --- | --- |
| one root result | `TeamRunV1RootDisposition` | final migration | generic quarantine record |
| promotion result | `TeamRunV1PromotionResult` | promoter | generic transaction/result framework |
| exact address evidence | predecessor address type | root/token planners | runtime legacy DTO |
| token row result | `TeamRunV1TokenRowDisposition` | token planner | persisted intermediate |
| migration warning aggregation | coordinator result builder | final migration | generic migration framework or platform error owner |
| fixture cases | stable case descriptors | tests | production-data exporter |

## Shared Structure / Data Model Tightness Check

| Structure | Fields | Overlap Risk | Action |
| --- | --- | --- | --- |
| root plan | root ID/paths/package only | Low | no token batch/global state |
| root warning | root ID/path/phase/reason | Low | no fabricated package |
| promotion result | kind + backup directory/error/marker/validation observation | Low | root-local truthful result; no restore phases or hashes |
| token resolved | row ID/event ID/final root/authority | Low | exact one update |
| token warning | row/event/reason | Low | source row untouched |
| runtime schema snapshot | required-current flags + legacy-evidence flags | Low | extras do not define runtime variant |
| startup attempt | generation/settled/fatal/timers | Low | no generic status taxonomy |

## Final File Responsibility Mapping

| File | Area | Responsibility | Change |
| --- | --- | --- | --- |
| `app-data-migration-registry.ts` | lifecycle | remove canonical; register final once | Modify |
| V1 constants/app migration | final upgrade | sole ID; prerequisite probe; root loop; token/history; result | Modify |
| new/renamed `team-run-v1-root-migration-planner.ts` | final upgrade | one released root to immutable final package or warning | Add/refactor |
| classifier | final upgrade | exact root disposition; global enumeration boundary | Modify |
| metadata/address/task/message converters under V1 | final upgrade | all observed released formats | Rehome/modify |
| token row planner under V1 | final upgrade/token | per-row evidence/disposition | Rehome/modify |
| `token-usage-team-run-v1-migration-repository.ts` | token SQL | schema probe; resolved root update transaction; fact/index verify; no drops | Replace/rename |
| `team-run-v1-package-promoter.ts` | file mutation | existing protected backup/staged commit; final validation; post-error read-only current observation; typed commit/warning result | Modify narrowly |
| `team-run-predecessor-source-resolver.ts` | file mutation | marker-present partial target resolves predecessor task/message from existing protected backup | Reuse/cover |
| history reconciler | projection | admitted trees after root/token work; returns warning on snapshot/backup/write/validation error | Modify narrowly |
| `server-runtime.ts` | startup | gate final; accept warning; fatal projection; catalog/listen | Modify |
| Electron fatal parser | embedded lifecycle | narrow line framing | Add or focus existing local code |
| `baseServerManager.ts` | embedded lifecycle | health-only generation settlement | Modify |
| tests/fixtures | validation | supported/mixed/fatal synthetic proof | Add/modify downstream |

## Applied Patterns (If Any)

- **Item-local Result instead of cohort exception:** strict conversion returns one root/row disposition.
- **Pre-mutation result isolation:** only untouched legacy-data items can warn.
- **Protected per-root promotion with truthful observation:** reuse existing backup/stage/marker-last boundary; success commits; exception stops mutation and returns admitted-current or excluded warning after read-only validation.
- **Bounded state retry:** marker-present uses protected source; marker-absent valid package is current/no-op.
- **Partial-success transaction:** one transaction updates all resolved token rows; unsupported rows are absent from the update set and retain evidence.
- **Runtime-compatible superset:** current runtime uses current fields while ignored legacy columns remain; no runtime branching.
- **Projection after admission:** history receives only successfully current trees.
- **Non-blocking projection:** history success/no-op is recorded when available; a persistence/validation exception becomes warning while current package catalog remains authoritative.
- **Generation-local exactly-once settlement:** health/fatal/process events share one Electron owner.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/` | folder | final migration | historical-to-final Team logic/dispositions | external/generic framework |
| `.../team-run-execution-tree-v1-app-data-migration.ts` | file | coordinator | sole phase/status owner | detailed parsing/SQL |
| `.../team-run-v1-root-migration-planner.ts` | file | root planner | one root plan/warning | cross-root mutation |
| `.../team-run-v1-package-promoter.ts` | file | root promoter | existing backup/stage/marker-last commit, final validation, post-error read-only admit/exclude warning | identity interpretation/generic recovery framework |
| `.../predecessor-team-communication-converter.ts` | file | message converter | both observed projections | task/external logic |
| token row planner in V1 folder | file | token policy | row dispositions/evidence | Prisma calls |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-team-run-v1-migration-repository.ts` | file | SQL | usable schema + resolved updates | identity policy/column drops |
| `.../team-run-history-index-reconciler.ts` | file | history projection | admitted-tree rows, existing backup + atomic write, non-blocking warning result | predecessor decoding, package admission, generic recovery |
| removed canonical files | delete | N/A | decommission intermediate | wrappers |
| `autobyteus-server-ts/src/server-runtime.ts` | file | startup | all migration warnings -> catalog/listen; platform/process failure -> error | per-item migration policy |
| `autobyteus-web/electron/server/...` | files | embedded lifecycle | fatal parser + health attempt | log ready |

Exact test placement remains subject to downstream coverage investigation, but the proof case IDs/layers are mandatory.

## Folder Boundary Check

| Path | Depth | Clear? | Justification |
| --- | --- | --- | --- |
| V1 migration folder | domain-control | Yes | all predecessor knowledge stays under sole migration owner |
| token SQL repo | persistence | Yes | policy remains above SQL |
| server runtime | application bootstrap | Yes | terminal admission only |
| Electron server folder | process lifecycle | Yes | health/fatal transport adjacent |
| test support | off-spine | Yes | synthetic predecessor formats never enter production runtime |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Bad / Avoided | Why |
| --- | --- | --- | --- |
| root isolation | root A validates/promotes; root B bad message remains predecessor warning; app starts | B aborts A and server | availability without guessing |
| token isolation | rows 1..N resolved update; bad row X unchanged with evidence | drop evidence or roll back all because X bad | accounting/data safety |
| schema | keep ignored `execution_address_json`; current Prisma uses `root_team_run_id` | drop every old column during first production cutover | no operational benefit for risk |
| nested Team | explicit child ID else wrapper fallback | equality assertion/runtime fallback | released authority/current-only runtime |
| warning status | failed details + `SUCCEEDED_WITH_WARNINGS` -> catalog/listen/health | `failedCount > 0` -> global `FAILED` | exact approved policy |
| platform fatal status | current application database/runtime cannot initialize independently of migration -> nonzero error | any migration conversion/promotion/token/history detail -> fatal | migration cannot brick the application; platform inoperability is a separate boundary |
| readiness | `Server listening` log does nothing; health settles | log emits ready | AR-004 |
| promotion exception | stop mutation; read-only validate; admit valid current or exclude; record warning; continue/start | claim source was preserved or globally fail startup | truth and availability are independent |
| history write exception | record warning; catalog valid packages; history reader rejects rows without readable current tree; continue/start | block startup until projection succeeds | history migration failure cannot prevent upgrade/use |
| retry state | marker present -> excluded/replan from backup; marker absent valid package -> current no-op | build a generic journal for every syscall/power loss | bounded deterministic states are enough under assumptions |
| ledger fixture | seed all fourteen retained terminal rows; final is sole attempt | seed only canonical/communication rows | real registry lifecycle remains equivalent |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Clean Cut |
| --- | --- | --- |
| retain two Team IDs | Rejected | one final V1 definition/gate |
| canonical ID alias/replay | Rejected | old row inert |
| runtime predecessor readers | Rejected | preserved roots excluded; migration-only decoders |
| canonical evidence bridge | Rejected | in-memory evidence only |
| drop legacy token evidence now | Rejected as unnecessary destructive cleanup | current runtime ignores retained extras |
| generic quarantine/status UI | Rejected | source preservation + existing detail/log/catalog diagnostics |
| generic promotion journal/hash-phase rollback | Rejected | protected backup + post-error validation/admit-exclude warning are sufficient for availability |
| history recovery journal/restore state machine | Rejected | existing atomic writer + warning + strict current-tree reader preserve safe availability |
| rerun earlier communication migration | Rejected | final converter owns old files; row unchanged |
| log-ready fallback | Rejected | health only |
| production-profile E2E | Rejected | synthetic shape-equivalent profile |

Retaining ignored predecessor SQLite columns is not a runtime backward-compatibility path: no normal repository reads or writes them, no version branch exists, and the migration remains the only owner that understands them.

## Derived Layering (If Useful)

`runner -> final coordinator -> per-root/per-row migration boundaries -> protected FS / transactional current-root SQL -> admitted history -> current runtime`

Electron: `terminal success/warning -> server listen/health -> child process -> current-generation health settlement -> UI`; fatal uses the parallel return path to one error.

## Change / Refactor Sequence

1. Lock registry/ledger tests: one final ID; exact fourteen-entry `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`; old canonical failed row unchanged; final sole new attempt; later Team-history row skipped.
2. Lock runtime token-schema evidence: released/current required columns/index work while legacy extra columns remain; new writes/read summaries do not select predecessor columns.
3. Rehome strict metadata/address/task/message/token interpretation under final V1 ownership; remove canonical writes.
4. Replace global root plan with deterministic per-root plan/result and warning aggregation; preserve current packages/orphans/invalid roots independently.
5. Make the per-root promoter result boundary explicit: validated `COMMITTED`; post-error independently valid current -> `COMMITTED_WITH_WARNING`; every other post-error state -> `EXCLUDED_PROMOTION_WARNING`. Continue without recovery records or source-preservation claims.
6. Split token evidence parsing into per-row/address-group dispositions so one bad row cannot poison other root plans.
7. Replace destructive token migration repository with runtime-schema probe and resolved-root transaction; retain legacy columns/evidence.
8. After existing platform bootstrap has established an operable current application substrate, sequence the migration coordinator: token snapshot/dispositions -> root loop (planner and promotion warnings isolated) -> admitted-root token apply/rollback warning -> admitted-tree history success/warning -> final success/warning. No migration exception selects startup fatal.
9. Delete canonical definition/intermediate files/registry/prerequisite/gate/external calls and obsolete tests.
10. Gate final status in server runtime: accept success/warning for every migration outcome; rebuild strict catalog; fail promptly only for independently established current-platform/process inoperability.
11. Remove `checkForReadyMessage`/output-ready branches and centralize current-generation health/fatal settlement.
12. Implement supported, mixed conversion warning, normal promotion, representative post-error admitted/excluded promotion warnings, token rollback warning, history warning, continuation/new-work, and platform-only fatal synthetic coverage at required layers.
13. Search for canonical ID/intermediate tables/column drops/external calls/log-ready/global-plan/false-preservation and any migration-error-to-startup-fatal assumptions; no leftovers.
14. During delivery documentation sync, update `autobyteus-server-ts/README.md` **Database migrations** with the reusable `REQ-013` operating-assumption/practice note; keep ticket-specific Team shapes in ticket artifacts rather than presenting them as a universal framework.

## Key Tradeoffs

- Some unsupported historical subjects may remain unavailable, but the product and all validated data remain usable. This is safer than guessing identity or bricking the application.
- Retaining unused token columns leaves physical cleanup for a future evidence-backed release, but removes destructive risk now and requires no current-runtime compatibility branch.
- Per-root planning may produce more detail records than one cohort error, but aligns failure ownership with the catalog and promoter.
- The design intentionally does not recover in-process from every filesystem failure. Under the explicit operating assumptions, this keeps business migration logic deterministic and reviewable. A promotion/storage exception stops the affected mutation, observes current validity, returns an admitted-current or excluded warning, and still reaches catalog/listen/health; any later item repair/retry is not a prerequisite for application availability.
- FS and SQLite remain separate phases. A token warning may leave old historical attribution degraded while current/new writes work; source evidence remains available for explicit retry.
- Health may declare ready later than a log string, but proves the actual usable contract.

## Risks

- An implementation may relabel global failures as warnings without isolating mutation. Mitigation: root planner/promoter result boundary and mixed-cohort byte/hash assertions.
- A token row conflict may still poison an address group needed by a valid root. Mitigation: invalidate only that evidence group; roots that truly depend on it become their own preserved warnings, unrelated roots continue.
- Keeping old root values on unresolved rows can make old token statistics imperfect. Mitigation: exact warning, retained evidence, no silent deletion; all observed rows are expected to resolve under the investigated policy.
- SQL apply failure after packages promote can leave valid packages with old token attribution. The runtime schema remains usable; transaction rollback/facts are verified and warning is explicit. Explicit retry is idempotent.
- History reconciliation warning can leave the index stale. Mitigation: catalog admits only valid current packages, and history listing already requires a readable current tree; warning is explicit while health/new work remain available.
- Any migration exception could accidentally be routed to startup fatal and recreate the blocker. Mitigation: final migration result union is success/warning only; platform inoperability is established outside migration-detail aggregation.
- A true current-platform failure could be mislabeled as a migration warning. Mitigation: database/runtime/bootstrap owners establish whether the current application can operate independently of the migration; only that separate path is fatal.
- Synthetic coverage may miss a future shape. The availability invariant ensures such an item is preserved/excluded rather than globally fatal.
- An implementation may falsely claim a live-mutated root is preserved. Mitigation: distinct planner `PRESERVED_WARNING` versus promoter `COMMITTED_WITH_WARNING`/`EXCLUDED_PROMOTION_WARNING`, plus byte-stability assertions only for the planner class.
- The operating assumptions may be violated by power/device/kernel failure. This is explicit residual operational risk, not a business-data case. Migration detail still remains warning-only; the independent existing platform/bootstrap path reports fatal only if it separately establishes that the current application can no longer initialize or operate, while existing protected evidence remains wherever the normal filesystem persisted it.
- A synthetic server test may accidentally execute retained definitions and obscure V1 behavior. Mitigation: exact cohort descriptor, actual-registry set assertion, full-row snapshots, and final-sole-attempt assertion.

## Guidance For Implementation

- Do not modify repository source until SR-013 passes architecture review. The README practice note is delivery-owned durable documentation and should be applied against the integrated state, not by the solution-design stage.
- Keep strict validation inside each root/row. Availability does not authorize identity fallback beyond the documented released rules.
- Do not use `details.some(FAILED)` to choose startup `FAILED`: every migration detail, including promotion/token/history, yields terminal warning. Platform/process failure is a separate owner/path.
- Catch root-local read/plan errors before mutation as preserved warnings. For promotion, stop on raw error, perform read-only current validation, and return admitted-current or excluded warning without restoration.
- Keep the existing protected backup before live mutation, metadata marker last, and final current-package validation. Do not add hash/phase records, restoration code, or per-syscall recovery machinery.
- Parse token evidence independently. Apply only typed resolved updates; verify row count/accounting/current root index; never drop predecessor columns or create a bridge table.
- Treat current Prisma's indifference to extra SQLite columns as the runtime contract; do not add normal runtime reads for those columns.
- Reconcile history from successfully current trees after root attempts/token apply; catalog remains the final admission authority.
- Seed the exact fourteen-entry `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`, seed `LEDGER-01` old canonical failed-6 separately, leave final absent, and assert every retained snapshot unchanged on first launch/relaunch. The communication warning and later Team-history rows are members of that cohort.
- Prove normal promotion, one representative promotion exception ending in valid-current admitted warning, one ending in invalid/incomplete excluded warning, token rollback warning, and history warning. Do not inject every rename/fsync or simulate power/device failure.
- Required proof has three top-level classes: all-supported `SUCCEEDED`; mixed conversion/promotion/token/history `SUCCEEDED_WITH_WARNINGS` plus health/new work/valid continuation; independently platform-inoperable prompt no-ready. Migration failure never occupies the third class.
- Delete `checkForReadyMessage`; output containing `Server listening` before health cannot affect ready state.
- Current history/restore/send/UI modules remain unchanged unless executable proof exposes a separate requirement/design gap.
- Never run against `/Users/normy/.autobyteus/server-data`; assert realpath isolation before server/Electron launch.
