# One-Final-Migration Availability Design Use-Case Validation

## Status

`Current SR-013 static proof — revalidated after the ARCH-REV-008 migration-fatal wording cleanup and ready for architecture re-review`

This supersedes the unhanded SR-010 defensive-recovery draft, SR-011's fatal-only promotion design, and the unhanded AR-008 response. SR-013 revalidates the proof after `ARCH-REV-008`: every conversion, promotion, token, and history migration problem is a terminal warning and cannot block application startup; the migration coordinator owns warning-only detail aggregation, and only an independent existing platform/bootstrap owner may establish current-platform inoperability as startup-fatal. Static proof is not executable evidence.

## Proof Boundary

Included:

- one final Team migration and immutable old canonical/communication ledger rows;
- Team root classification, metadata, tasks, both message formats, token root attribution, exact V1 package, memory path/loadability, and bounded history projection with strict post-write equality;
- per-root/per-row preservation and warning isolation before mutation;
- normal promotion success plus representative post-error valid-current admission and invalid/incomplete exclusion warnings;
- complete retained registry terminal state so final V1 is the sole new attempt;
- all-supported success, mixed conversion/promotion/token/history warning availability, explicit retry/relaunch, and platform-only fatal classification;
- health-only Electron readiness;
- successfully migrated same-identity continuation plus new standalone Agent and new AgentTeam work.

Excluded:

- external-channel conversion;
- runtime predecessor readers, warning/quarantine UI, generic migration framework, arbitrary-data repair;
- production-profile copies/execution.
- exhaustive per-rename/fsync failure injection, power/device/kernel corruption, hash/phase journaling, and in-process restoration after unreliable storage.

## Assumption Validation Boundary

The executable environment must establish only the prerequisites the migration relies upon: isolated single-writer profile, writable data roots with sufficient space, same-filesystem promotion paths, initialized current SQLite schema, and no deliberate power/process/storage disruption during a normal supported migration. Within that boundary, the format matrix below is exhaustive and deterministic.

Tests inject representative promoter outcomes to prove truthful admit-or-exclude warnings and non-blocking startup, plus one token rollback and one history warning. They do not claim to prove arbitrary hardware, power, kernel, or every syscall failure. Those remain outside the business-data fault model rather than hidden edge cases.

## Evidence Cohorts

| Cohort | Observed / Released Evidence | Synthetic Obligation |
| --- | --- | --- |
| ledger | canonical `FAILED` attempts 6; final absent; fourteen retained target-registry definitions terminal at attempt 1, including communication warning and later Team-history success | seed exact cohort descriptor, canonical separately, and assert all complete record snapshots immutable |
| roots | 507 predecessor; 5 empty; 1 content-bearing authority-less | minimal supported roots plus both orphan dispositions and injected invalid root |
| metadata | 408 standard; 99 `updatedAt`; 20 equal nested IDs; 4 missing; 1 explicit-different | every identity case |
| tasks | 5 records; nested multi-member grammar | parent/task-Team/member/task-Agent cases |
| messages | 306 address files; 40 older run-ID files; 741 old messages | both equivalent success shapes and invalid participant case |
| tokens | 4,758 standalone; 147,655 direct Team; 36 retained task-Team; 167 retired | one per authority case plus unsupported row |
| token schema | nullable indexed `root_team_run_id`; predecessor columns remain; current Prisma ignores extras | prove current reads/new writes with extras retained |
| memory | about 5.49 GB unchanged | minimal top/nested/task files with hash/read proof |
| usability | history/open/restore/send path | valid old continuation, new Agent, new Team, warning relaunch |

### `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`

The stable test-only descriptor is ordered exactly as the target registry after canonical removal, excluding final V1. Every row has `attempts: 1`.

| Order | Migration ID | Status | Position |
| ---: | --- | --- | --- |
| 1 | `20260727_custom_provider_v1_secret_migration` | `SUCCEEDED` | before final |
| 2 | `20260706_remove_global_skill_discovery_mode` | `SUCCEEDED` | before final |
| 3 | `20260517_team_run_metadata_member_tree` | `SUCCEEDED` | before final |
| 4 | `20260731_remove_external_runtime_working_context_snapshots` | `SUCCEEDED` | after final |
| 5 | `20260617_raw_trace_rotation_layout` | `SUCCEEDED` | after final |
| 6 | `20260707_raw_trace_active_file_name` | `SUCCEEDED` | after final |
| 7 | `20260731_migrate_native_working_context_snapshots_v5` | `SUCCEEDED_WITH_WARNINGS` | after final |
| 8 | `20260701_team_communication_projection_addresses` | `SUCCEEDED_WITH_WARNINGS` | after final |
| 9 | `20260730_token_usage_custom_provider_model_value_backfill` | `SUCCEEDED` | after final |
| 10 | `20260730_token_usage_provider_name_snapshot_backfill` | `SUCCEEDED` | after final |
| 11 | `20260623_remove_self_evolution_run_metadata` | `SUCCEEDED` | after final |
| 12 | `20260521_team_run_history_index_v2` | `SUCCEEDED` | after final |
| 13 | `20260521_run_history_index_v2` | `SUCCEEDED_WITH_WARNINGS` | after final |
| 14 | `20260803_custom_provider_readable_identity` | `SUCCEEDED_WITH_WARNINGS` | after final |

The old canonical failed-6 row is seeded separately because it is unregistered. Final V1 is absent. The fixture asserts actual target registry IDs equal the cohort plus final V1; it snapshots all fields of every seeded record, not only status/attempts.

## Proof Obligations

| ID | Obligation |
| --- | --- |
| `PO-01` | Exactly one final Team application-data definition/record owns the release cutover. |
| `PO-02` | Every observed supported format produces a strict valid final package/root attribution. |
| `PO-03` | Strictness is item-local: no ambiguous identity is guessed. |
| `PO-04` | Availability is cohort-wide: one root/row failure cannot suppress unrelated success or health. |
| `PO-05` | Pre-mutation excluded root source and unsupported token row/evidence remain byte/value stable; post-mutation excluded roots use truthful observed-state diagnostics instead of a preservation claim. |
| `PO-06` | Current token runtime works with retained extra columns; resolved updates are atomic/idempotent. |
| `PO-07` | Memory path/bytes remain unchanged for migrated roots. |
| `PO-08` | Old canonical and the complete retained terminal cohort remain unchanged; final is the sole new attempt and a final warning is terminal on relaunch. |
| `PO-09` | Conversion, promotion, token, and history migration warnings reach health/new work; only independent current-platform inoperability is fatal. |
| `PO-10` | Logs cannot signal ready; current-generation health alone can. |
| `PO-11` | Successfully migrated history continues under the same identities. |
| `PO-12` | Synthetic-only validation cannot touch the reporter profile. |
| `PO-13` | Promotion has truthful warning results: post-error complete current packages remain admitted; all other post-error states are excluded; neither blocks startup or claims preservation. |
| `PO-14` | Proof covers every deterministic released-data case but does not manufacture infrastructure-failure business cases outside the documented assumptions. |
| `PO-15` | A history snapshot/backup/write/validation error is terminal warning; strict current catalog/history-read validation preserves safe admission while health/new work continue. |
| `PO-16` | Delivery documentation records the reusable deterministic migration assumption boundary without turning ticket-specific Team shapes into a generic framework. |

## Spine Reference

| Spine | Static Span |
| --- | --- |
| `DS-001` | runner -> final coordinator -> prerequisite -> root dispositions -> token apply -> admitted history -> terminal record |
| `DS-003` | success/warning -> catalog -> listen -> health -> Electron ready |
| `DS-004` | independently platform-inoperable -> nonzero child -> exactly-once Electron error |
| `DS-005` | history -> hydrate -> restore -> focused input -> persisted event |
| `DS-006` | mixed synthetic profile -> warning -> health/new work/continuation -> relaunch |
| `DS-101` | one root metadata/task -> plan/warning |
| `DS-102` | one message file -> current messages/root warning |
| `DS-103` | rows -> dispositions -> resolved transaction/warnings |
| `DS-104` | one root entry -> admit/exclude diagnostic |
| `DS-105` | generation child/health events -> one ready/error |
| `DS-106` | validated plan -> backup/stage/replace/marker/final validation -> commit; thrown error -> stop mutation -> current validation -> admitted-current or excluded warning |
| `DS-107` | admitted trees -> history snapshot/backup/atomic write -> success/no-op or warning; catalog/current-tree reader remains strict and startup continues |

## Consolidation And Persisted-State Matrix

| Case | Seed | Data-Flow Span | Expected Result | Availability / Preservation | IDs |
| --- | --- | --- | --- | --- | --- |
| `STATE-01` | released files/token evidence; final absent | runner -> prerequisite -> root/token/history -> record | `SUCCEEDED` for all supported | all supported roots current | `REQ-001`, `REQ-008` |
| `STATE-02` | some complete V1; other predecessor | classifier -> current no-op + predecessor promotion -> token/history | terminal success/warning by pre-mutation item outcomes | no duplicate current writes | `REQ-008` |
| `STATE-03` | marker-present partial targets plus existing protected backup | catalog exclusion -> source resolver backup -> fresh full plan/promotion | later attempt converges under normal storage assumptions | no warning is recorded from the prior promotion exception | `REQ-007`, `REQ-008` |
| `STATE-04` | marker-absent complete valid package; prior attempt may be failed | classifier/loader -> current no-op -> token/history | later attempt converges | exact current package not rewritten | `REQ-007`, `REQ-008` |
| `STATE-05` | packages current; token root updates not committed | current root no-op -> token dispositions/apply -> history | converges | no package duplicate | `REQ-006`, `REQ-008` |
| `STATE-06` | terminal warning; untouched excluded predecessor remains | `runPending` terminal skip -> catalog current roots -> health | no attempt increment | excluded bytes stable; product usable | `REQ-008`, `REQ-011` |
| `STATE-07` | terminal warning after operator/test repairs untouched item; explicit retry | `runMigration` -> current no-ops + repaired root -> history | new attempt terminal | same ID; no alias/manual ledger edit | `REQ-008` |
| `STATE-08` | predecessor root but legacy token evidence absent/unpublished contracted state | pre-mutation plan uses available evidence; dependent root warns if insufficient | warning, not global fatal | unrelated roots/new work continue | `REQ-011` |
| `STATE-09` | current DB/runtime cannot initialize independently of app-data migration | platform bootstrap -> error/process exit | no false migration success; no listen | prompt platform error; this is not a migration detail | `REQ-009`, `REQ-011` |
| `STATE-10` | one Team root cannot be read/classified but the current platform and other roots remain usable | root warning -> continue | `SUCCEEDED_WITH_WARNINGS` | root excluded; other roots/new work/health continue | `REQ-002`, `REQ-011` |
| `STATE-11` | representative promotion operation throws; post-error package is complete current or invalid/incomplete | stop mutation -> current loader -> admitted-current or excluded warning -> continue token/history/catalog | `SUCCEEDED_WITH_WARNINGS` | no preservation claim; unrelated roots/new work/health and unaffected history continue | `REQ-007`, `REQ-011` |
| `STATE-12` | history snapshot/backup/write/validation error after packages/tokens | history warning -> final warning -> strict catalog -> listen/health | `SUCCEEDED_WITH_WARNINGS` attempt 1 | current packages admitted independently; stale/absent invalid history rows cannot bypass readable-tree check; new work continues | `REQ-008`, `REQ-010`, `REQ-011`, `REQ-012` |

**State proof:** all deterministic released-data variations either produce a valid plan or a warning. Pre-mutation warnings are byte-preserved; mutation-stage warnings report observed state and use strict independent admission. `STATE-11/12` prove that promotion/history migration problems do not block startup. `STATE-09` is the only error path and belongs to platform bootstrap, not migration. No power/device/syscall recovery state machine is required.

## Root Matrix

| Case | Source | Data-Flow Span | Disposition | Effect On Other Roots / Startup | IDs |
| --- | --- | --- | --- | --- | --- |
| `ROOT-01` | metadata only | classify -> root plan -> empty task/message package -> promote | `MIGRATED` | continues | `REQ-003`, `REQ-007` |
| `ROOT-02` | metadata + address messages | classify -> metadata/message -> package -> promote | `MIGRATED` | continues | `REQ-005`, `REQ-007` |
| `ROOT-03` | metadata + task + message | full root plan with token evidence -> promote | `MIGRATED` | continues | `REQ-003`–`REQ-007` |
| `ROOT-04` | complete valid V1 | package loader/validator -> current tree | `CURRENT`/skipped | admitted | `REQ-008` |
| `ROOT-05` | valid historical manifest only | classifier | `HISTORICAL_RESIDUE` | unchanged/excluded from V1; no block | `REQ-002` |
| `ROOT-06` | empty directory | classifier -> `EMPTY_ORPHAN` | warning | byte-identical; valid roots/health continue | `REQ-002`; `AC-002` |
| `ROOT-07` | nonempty authority-less | classifier -> `CONTENT_ORPHAN` | warning | recursive hash equal; valid roots/health continue | `REQ-002`; `AC-002` |
| `ROOT-08` | partial V1/unsafe authority/invalid current package | classify -> preserved warning | warning | only root excluded | `REQ-002`, `REQ-011` |
| `ROOT-09` | one metadata/file read permission or parse failure | root loop catch -> detail | warning | no mutation of root; loop continues | `REQ-002`, `REQ-011` |
| `ROOT-10` | representative promoter exception; post-error complete current package validates | stop mutation -> current loader | `COMMITTED_WITH_WARNING` | root admitted; other migration work and startup continue | `REQ-007`, `REQ-011` |
| `ROOT-11` | representative promoter/root read exception; post-error current package invalid/incomplete | stop mutation/read -> observation | `EXCLUDED_PROMOTION_WARNING` or root warning | root excluded without preservation claim; other work/startup continue | `REQ-007`, `REQ-011` |

## Metadata Matrix

| Case | Source | Data-Flow Span | Expected | Negative Isolation | IDs |
| --- | --- | --- | --- | --- | --- |
| `META-01` | standard predecessor | read -> validate released schema -> initial/final tree | exact root/AgentRuns | bad field warns this root | `REQ-003` |
| `META-02` | standard + `updatedAt` | recognized-field projection -> tree | same semantics as standard | ignored extra preserved in backup/source | `REQ-003` |
| `META-03` | nested equal IDs | explicit ID -> recursive tree | stored ID | duplicate contradiction warns root | `REQ-003` |
| `META-04` | missing child `teamRunId` | wrapper `memberRunId` fallback -> tree | fallback identity | both missing warns root | `AC-003` |
| `META-05` | explicit child differs from wrapper | explicit ID -> tree/memory location | explicit identity | stronger structural contradiction warns root | `AC-004` |
| `META-06` | root/directory mismatch, duplicate/coordinator/handoff contradiction | strict root planner | no plan | source unchanged; other roots migrate/start | `REQ-003`, `REQ-011` |

## Address And Task Matrix

| Case | Source | Data-Flow Span | Expected | Negative Isolation | IDs |
| --- | --- | --- | --- | --- | --- |
| `ADDR-01` | `member` | strict grammar -> exact address | root/member | route/path mismatch warns owner root | `REQ-004` |
| `ADDR-02` | `member -> task_agent` | terminal task-Agent -> exact address | member/taskAgent | repeated/nonterminal warns root | `REQ-004` |
| `ADDR-03` | `member -> task_team` | parent member + ordered task ID | task Team execution | missing member/duplicate warns root | `REQ-004` |
| `ADDR-04` | `member -> task_team -> member` | concatenate member scopes; retain task IDs | nested final member | invalid order/tree/physical conflict warns root | `AC-005` |
| `ADDR-05` | current exact address | current parser + root agreement | validated evidence/no-op | extra/missing field warns evidence item/root | `REQ-008` |
| `TASK-01` | five accepted Team tasks | ordered plan -> tree execution + V1 record | equal non-identity values | one malformed task warns only owning root | `REQ-004`, `REQ-007` |

## Communication Matrix

| Case | Source | Data-Flow Span | Expected | Negative Isolation | IDs |
| --- | --- | --- | --- | --- | --- |
| `COMM-01` | absent file | optional read -> empty V1 messages | valid empty package subject | N/A | `REQ-005` |
| `COMM-02` | address-bearing `{teamRunId,messages}` | strict address -> tree/run resolution -> V1 | exact participants/non-identity | bad side warns root | `REQ-005` |
| `COMM-03` | older `{version,messages}` run IDs | same-tree unique AgentRun lookup -> V1 | exact participants/non-identity | bad side warns root | `REQ-005` |
| `COMM-04` | equivalent address/run-ID fixtures | both paths -> normalized comparison | semantic equality success | N/A | `AC-006` |
| `COMM-05` | missing/ambiguous run ID or corroboration mismatch | same-tree resolution -> typed root warning | no package/promotion | owning source unchanged; other roots/health continue | `AC-006`, `REQ-011` |
| `COMM-06` | earlier ledger warning with 40 old files | runner skips earlier row -> final `COMM-03` converter | files current; old row unchanged | no earlier retry/attempt change | `AC-011` |

## Token Matrix

| Case | Source | Data-Flow Span | Disposition / Target | Preservation / Availability | IDs |
| --- | --- | --- | --- | --- | --- |
| `TOK-01` | standalone row (`root=null`) | row planner | standalone/no update | all facts unchanged | `REQ-006` |
| `TOK-02` | direct Team released address | strict row root/member/run agreement | resolved exact final root | evidence column retained | `REQ-006` |
| `TOK-03` | task-Team with retained topology | task index strongest + row corroboration | resolved actual root/chain | mismatch becomes row warning, not cohort failure | `REQ-006` |
| `TOK-04` | retired topology; stored root distinct from task segment | self-contained released row policy | resolved stored root | no Team recreation | `AC-007` |
| `TOK-05` | retired topology; stored root equals task segment | bounded row policy | resolved recorded root | no invented reinterpretation | `AC-007` |
| `TOK-06` | full supported cohort | every row -> one disposition -> update batch | count equals input; zero warnings | expected observed production success | `AC-007` |
| `TOK-07` | malformed JSON/repeated segments/conflicting row | row parser -> preserved warning | no update for row | exact pre-row values/evidence equal; other rows apply/startup continues | `REQ-006`, `REQ-011` |
| `TOK-08` | two rows conflict for one exact address/run mapping | address-group invalidation -> warnings | neither conflicting use is authority | unrelated evidence/roots continue; dependent root may warn itself | `REQ-006` |
| `TOK-09` | released runtime-usable schema with extra legacy columns | schema probe -> current-required + evidence-available | usable | current Prisma reads/new write succeeds; extras retained | `AC-008` |
| `TOK-10` | exact current schema without predecessor columns | schema probe | usable/evidence absent | current packages no-op; evidence-dependent predecessor root may warn, not global fatal | `REQ-011` |
| `TOK-11` | resolved updates + one unsupported row | transaction updates resolved IDs only -> fact/index verify | warning terminal | unsupported row unchanged; row count/accounting equal | `AC-007`, `AC-008`, `AC-010` |
| `TOK-12` | injected late SQL apply failure | transaction rollback -> usability re-probe | warning if current schema/ledger still usable | all root updates roll back; app/new writes continue | `AC-008`, `REQ-011` |
| `TOK-13` | current DB/runtime cannot initialize independently of migration | platform bootstrap owner | platform fatal | no false health; not a migration-detail test | `REQ-009`, `REQ-011` |

## Package, Memory, History Matrix

| Case | Source | Data-Flow Span | Expected | Failure Isolation | IDs |
| --- | --- | --- | --- | --- | --- |
| `PKG-01` | valid root plan | protected backup -> stage/validate -> replace targets -> live validate -> move marker last -> final validate | `COMMITTED` exact package | protected predecessor retained by existing mechanism | `REQ-007` |
| `PKG-02` | invalid target/cross-file identity discovered by planner/current validators | pre-mutation plan returns warning | `PRESERVED_WARNING` | no live mutation; source/marker unchanged; others continue | `AC-009`, `AC-010` |
| `PKG-03` | complete current package | loader/validator -> current | no rewrite | invalid current package is diagnostic/excluded, never fabricated or startup-blocking | `REQ-008` |
| `PKG-04` | marker-present partial targets with protected backup | catalog excludes -> source resolver selects backup -> fresh complete promotion | retry converges | no restoration journal or partial admission | `REQ-008`, `AC-009` |
| `PKG-05` | marker-absent complete current package after prior failed attempt | loader validates -> current no-op | retry converges | no duplicate package write | `REQ-008`, `AC-009` |
| `PKG-06` | representative promotion operation throws | stop mutation -> current loader -> admitted-current/excluded warning | final warning; catalog/listen/health | no false source-preservation claim; unrelated roots continue | `REQ-007`, `REQ-011` |
| `MEM-01` | top-level Agent memory | final tree location -> current reader | same path/hash/load | affected root warns before promotion if mismatch | `AC-014` |
| `MEM-02` | nested configured Team memory | explicit/fallback ancestor IDs -> path | same path/hash/load | root isolation | `AC-014` |
| `MEM-03` | task execution memory | task chain/run IDs -> path | same path/hash/load | root isolation | `AC-014` |
| `HIST-01` | admitted current trees | reconciler last -> index | valid roots visible | excluded roots omitted, bytes preserved elsewhere | `REQ-010` |
| `HIST-02` | one root warning | admitted tree map excludes it -> reconcile | other valid rows visible | warning root cannot falsely open | `REQ-011` |
| `HIST-03` | injected snapshot/backup/write/validation error after packages/tokens are current | reconciler warning -> coordinator final warning | attempt 1 `SUCCEEDED_WITH_WARNINGS`; catalog/listen/health | package catalog remains strict; no journal/restore machinery | `REQ-008`, `REQ-011`, `REQ-012` |
| `HIST-04` | catalog/history after `HIST-03` | catalog validates packages; history list requires readable current tree | valid current roots remain safe; stale invalid rows not admitted | new work and unaffected continuation available | `REQ-010`, `REQ-011`; `AC-011` |
| `HIST-05` | relaunch after terminal warning/success | runner skip -> catalog rebuild | no duplicate index mutation by migration | current product loads | `AC-011` |

## Bounded Promotion Contract Matrix

| Case | Constructed/Injected Condition | Required proof |
| --- | --- | --- |
| `PROMO-01` | normal supported promotion under declared operating assumptions | exactly one `COMMITTED` result; marker absent; current three-file package validates |
| `PROMO-02` | planner rejects a readable legacy-data variation before promoter call | untouched root warning; promoter not invoked; unrelated roots continue/start |
| `PROMO-03` | one representative promoter operation throws and current package independently validates | `COMMITTED_WITH_WARNING`; final V1 warning; root admitted; other work/catalog/listen/health continue |
| `PROMO-04` | one representative promoter operation throws and marker-present/invalid/incomplete package remains | `EXCLUDED_PROMOTION_WARNING`; no preservation claim; root excluded; other work/catalog/listen/health continue |
| `PROMO-05` | marker-absent complete valid package on current or explicit retry | current package no-op; remaining migration work continues |
| `PROMO-06` | test attempts to enumerate every rename/fsync/power/device failure | explicitly not required; rejected by operating-assumption boundary |

`PROMO-03/04` verify the truthful post-error contract, not hardware recovery. No durable hash/phase record, restoration helper, or per-syscall failure matrix is authorized.

## Bounded History Completion And Retry Matrix

| Case | Constructed/Injected Condition | Required proof |
| --- | --- | --- |
| `HISTORY-01` | computed rows already equal strict history snapshot | no backup/write; reconciler returns verified unchanged |
| `HISTORY-02` | computed rows differ under normal storage assumptions | existing index backup when present -> atomic write -> strict reread -> exact ordered-row equality -> verified changed result |
| `HISTORY-03` | one representative snapshot/backup/write/validation error | warning detail; final attempt `SUCCEEDED_WITH_WARNINGS`; strict catalog/listen/health/new work continue |
| `HISTORY-04` | history/catalog reads after warning | rows are usable only with readable valid current trees; independently valid packages remain available |
| `HISTORY-05` | request for history journal or exact restoration after arbitrary infrastructure failure | explicitly rejected; atomic writer, warning, and strict current admission are the bounded design |

`HISTORY-03` is one representative code-contract failure, not exhaustive filesystem simulation. `HISTORY-04` proves the user-corrected availability rule; withdrawn `AR-008` creates no fatal retry requirement.

## Ledger Matrix

| Case | Seed | Data-Flow Span | Expected | Assertions | IDs |
| --- | --- | --- | --- | --- | --- |
| `LEDGER-01` | canonical `FAILED`, attempts 6 | registry projection omits removed ID -> final runs | old row inert | complete record snapshot unchanged | `AC-001`, `AC-011` |
| `LEDGER-02` | exact fourteen-entry retained cohort, all terminal attempt 1 | real registry `runPending` visits order and skips each | every retained row inert | registry set equals cohort + final; every full snapshot unchanged | `AC-011` |
| `LEDGER-03` | cohort communication warning member with 40 details + old message files | earlier definition skipped; final converts via `COMM-03` | earlier row inert | full communication record unchanged | `AC-006`, `AC-011` |
| `LEDGER-04` | cohort later Team-history success member | runner skips after final | V1 history remains final projection | Team-history row/full snapshot unchanged; no later rewrite | `AC-011` |
| `LEDGER-05` | final absent; all supported | runner marks/runs final | attempt 1 `SUCCEEDED` | final is sole new attempt | `REQ-001` |
| `LEDGER-06` | final absent; mixed item failures | runner completes returned result | attempt 1 `SUCCEEDED_WITH_WARNINGS` | failedCount/details/log retained; final sole new attempt | `AC-010` |
| `LEDGER-07` | terminal final success/warning | `runPending` skips final and full cohort | no attempt increment | all snapshots stable | `AC-011` |
| `LEDGER-08` | final warning; repaired source; explicit retry | `runMigration(final ID)` | attempt 2 converges success/warning | retained cohort unchanged; no new ID/manual ledger edit | `REQ-008` |
| `LEDGER-09` | current database/ledger substrate cannot operate at all | platform/database owner failure | platform fatal/throw | no server readiness claim; not a migration-detail outcome | `REQ-009`, `REQ-011` |
| `LEDGER-10` | final attempt has promotion/token/history warning | runner completes returned result | attempt 1 `SUCCEEDED_WITH_WARNINGS` | retained cohort unchanged; relaunch skips; startup remains available | `AC-011` |

## Availability, Startup And Electron Matrix

| Case | Seed / Event | Full Data-Flow Span | Expected | IDs |
| --- | --- | --- | --- | --- |
| `AVAIL-01` | one valid root + `ROOT-08` + `TOK-07` | final root loop/token apply -> warning record -> catalog/listen/health | valid root admitted; invalid sources unchanged; one ready | `AC-010`, `AC-012` |
| `AVAIL-02` | warning-ready server | GraphQL/API create standalone Agent -> run/send | new Agent works | `REQ-011` |
| `AVAIL-03` | warning-ready server | create AgentTeam -> start/send | new Team works/current package written | `REQ-011` |
| `AVAIL-04` | valid migrated history plus warning root | history -> hydrate -> restore -> send | valid old Team continues same IDs | `REQ-010`, `REQ-011` |
| `AVAIL-05` | attempt to open excluded warning root | catalog/history admission check | unavailable/diagnostic, no fabricated runtime | `REQ-011` |
| `AVAIL-06` | any terminal migration warning | health -> workspace/application shell | product remains usable; migration no-start cannot prevent a later normal product upgrade | `REQ-011`, `AC-012` |
| `START-01` | final `SUCCEEDED` | final gate -> catalog -> listen -> health | one ready | `REQ-009` |
| `START-02` | final `SUCCEEDED_WITH_WARNINGS` | same path plus warning log/status | one ready; no error | `REQ-009`, `REQ-011` |
| `START-03` | current platform/bootstrap cannot operate independently of migration | platform fatal stderr -> nonzero -> attempt settlement | exact prompt error; no listen/health | `AC-013` |
| `START-04` | stdout/stderr contains `Server listening` before health | output forward/fatal parse only | not ready | `AR-004`, `AC-013` |
| `START-05` | current-generation health success | poll -> settle ready -> cancel timers | one ready | `AC-013` |
| `START-06` | child error/close pre-health, including code 0 | process event -> prefer parsed fatal -> settle error | one error/no timeout | `AC-013` |
| `START-07` | stale prior health resolves after new generation | generation guard | ignored | `AC-013` |
| `START-08` | health timeout | current attempt timeout | one error | `AC-013` |
| `START-09` | stop after ready | normal stop lifecycle | no migration error | preserved behavior | `REQ-009` |
| `START-10` | promotion/token/history migration exception | final warning -> strict catalog -> listen -> health | one ready; no startup error | `REQ-011`, `AC-013` |

## Continuation And New-Work Matrix

| Case | Trigger | Data-Flow Span | Assertion | IDs |
| --- | --- | --- | --- | --- |
| `CONT-01` | list valid migrated Team history | history API -> tree availability | exact root visible | `REQ-010` |
| `CONT-02` | open | open coordinator -> hydration -> tasks/messages/memory | exact expected package | `REQ-010` |
| `CONT-03` | send to inactive valid Team | store -> restore manager -> package admission -> backend | same root/member run IDs | `REQ-010` |
| `CONT-04` | controlled response/event | runtime -> persistence -> UI/API | event exactly once | `AC-015` |
| `CONT-05` | relaunch | terminal skip -> catalog -> reopen | no duplicate; continuation retained | `AC-011`, `AC-015` |
| `NEW-01` | create/run standalone Agent after warning | API -> runtime -> memory/token current writers | successful new work | `AC-012` |
| `NEW-02` | create/run AgentTeam after warning | API -> Team runtime -> current V1 package/token writer | successful new work/current data | `AC-012` |

## Combined Supported Success Walkthrough (`E2E-01`)

### Supported seed

1. Isolated disposable data/memory root with realpath guard.
2. Exact old canonical failed-6 row; final absent; full `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT` at attempt 1 with minimal synthetic summaries/log refs, including communication warning with 40 synthetic failure details and the later Team-history success row. Snapshot every complete seeded record.
3. Minimal roots covering `META-01`–`05`, `ADDR-01`–`04`, `TASK-01`, `COMM-01`–`04`, and memory files.
4. Runtime-usable released token schema with all `TOK-01`–`06` supported rows and legacy columns.
5. Existing Team history rows and deterministic runtime definitions.

### First launch (`DS-001` -> `DS-003`)

1. Assert registry contains final ID once and not canonical; assert its remaining IDs/order exactly match `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`.
2. Run server startup.
3. Assert all supported roots become exact packages; all supported token roots are correct; legacy columns/facts remain.
4. Assert final record attempt 1 `SUCCEEDED`; it is the sole new attempt; canonical and every retained cohort record remain full-snapshot equal. Assert the later Team-history definition was skipped and the V1 history projection was not overwritten.
5. Assert catalog/history/memory load and health; log-ready strings cannot settle Electron.

### Continuation (`DS-005`)

1. List/open representative standard, nested-Team, task-Team, and old-message roots.
2. Assert exact tree/tasks/messages/memory.
3. Restore and send controlled input; assert same root/member IDs and one event.

### Relaunch

1. Snapshot hashes/rows/attempts.
2. Relaunch; assert final attempt remains 1, every canonical/cohort snapshot remains equal, no retained attempt/status changes, no package/token/memory/history rewrite, health succeeds, and continuation persists.

## Mixed Warning Availability Walkthrough (`E2E-02`)

### Mixed warning seed

Start from `E2E-01`, then add:

- `ROOT-06`, `ROOT-07`, one `ROOT-08/09` invalid/unreadable-local fixture, and one `COMM-05` owning root;
- one `TOK-07` unsupported row among resolved rows;
- source hashes/row snapshots for every warning item; and
- no promoter failure: `E2E-02` proves data warnings under the declared healthy infrastructure assumptions.

### First launch (`DS-006`)

1. Run final migration and assert valid supported roots still promote.
2. Assert invalid root/message sources remain byte-identical and excluded.
3. Assert resolved token rows update and unsupported row/all evidence remain value-identical.
4. Assert final attempt 1 is `SUCCEEDED_WITH_WARNINGS`, failedCount/details/log enumerate exact pre-mutation items, every warning root/source was never live-mutated, every committed root is exact current, and canonical/full retained cohort snapshots remain unchanged.
5. Assert server catalog/listen/health and Electron ready once; warning is not emitted as startup error.

### Minimum usable product

1. Create/run/send to a new standalone Agent.
2. Create/run/send to a new AgentTeam and assert current V1/token writes.
3. List/open/restore/send to a valid migrated historical Team under unchanged IDs.
4. Attempt excluded root and assert it is not falsely current; diagnostic/source preservation remains.

### Relaunch and explicit retry

1. Relaunch without repair: final attempt remains 1; canonical/full retained cohort attempts and records remain unchanged; warning items stay exact predecessor state; health/new/valid history still work.
2. In a separate fixture copy, repair one untouched warning source and invoke explicit final-ID retry: current roots no-op, repaired root may migrate, final attempts increment once, retained rows stay unchanged, and no new ID/duplicate appears.

## Platform-Inoperable Walkthrough (`E2E-03`)

1. Seed an isolated environment where the current database/runtime cannot initialize independently of app-data migration semantics. Do not use a migration conversion/promotion/token/history exception for this case.
2. Assert the platform owner fails before the current application can operate and no migration detail is misclassified as the cause.
3. Assert no catalog/listen/health and no ready from any log string.
4. Assert Electron reports one prompt error rather than waiting for timeout.
5. Keep this fixture synthetic; do not simulate arbitrary corruption on the reporter profile.

## Mutation-Stage Warning Availability Walkthrough (`E2E-04`)

1. Start from the all-supported `E2E-01` seed and create focused variants for: promotion exception ending in valid current package, promotion exception ending in invalid/incomplete package, token transaction rollback, and history reconciliation error.
2. Assert every variant completes final V1 attempt 1 as `SUCCEEDED_WITH_WARNINGS`, never `FAILED`, while the canonical and retained cohort snapshots remain unchanged.
3. Assert valid-current promotion warning is admitted; invalid/incomplete promotion warning is excluded without a source-preservation claim; token accounting/root values remain transactionally rolled back in the token-error variant; history error is reported while catalog admission remains package-driven.
4. Assert unrelated valid roots, catalog/listen/health, one Electron ready, new standalone Agent, new AgentTeam, and representative unaffected historical continuation all work.
5. Relaunch and assert terminal warning skip, stable retained records, strict admit/exclude behavior, and continued application usability. No generic recovery record or exhaustive infrastructure simulation is introduced.

## Delivery Documentation Check (`DOC-01`)

At integrated delivery, inspect `autobyteus-server-ts/README.md` **Database migrations** and assert it contains the reusable `REQ-013` practice boundary: known released shapes and deterministic transforms, pre-mutation validation/isolation, normal one-writer/storage/SQLite/filesystem prerequisites, native atomicity and strict independent admission, non-blocking truthful migration warnings, platform-only startup fatality, and no bespoke defense against every hypothetical infrastructure catastrophe. Ticket-specific Team shape details remain in ticket artifacts.

## Requirement And Acceptance Coverage

| Behavior | Proof Cases |
| --- | --- |
| `BEH-001` | `STATE-01`, `LEDGER-01`, `LEDGER-02`, `LEDGER-05` |
| `BEH-002` | `META-01`–`06` |
| `BEH-003` | `ADDR-01`–`05`, `TASK-01` |
| `BEH-004` | `COMM-01`–`06`, `LEDGER-03` |
| `BEH-005` | `TOK-01`–`13` |
| `BEH-006` | `ROOT-05`–`10`, `PKG-02`–`06`, `PROMO-01`–`06` |
| `BEH-007` | `START-01`–`10` |
| `BEH-008` | `HIST-01`–`05`, `HISTORY-01`–`04`, `CONT-01`–`05`, `LEDGER-02/04/10`, `E2E-04` |
| `BEH-009` | `STATE-08`–`12`, `PROMO-01`–`06`, `HISTORY-03`–`05`, `AVAIL-01`–`06`, `NEW-01/02`, `E2E-02/03/04` |
| `BEH-010` | `DOC-01` |

| Requirement / AC | Proof Cases |
| --- | --- |
| `REQ-001`, `AC-001` | `STATE-01`, `LEDGER-01/02/05` |
| `REQ-002`, `AC-002` | `ROOT-05`–`11`, `E2E-02/03` |
| `REQ-003`, `AC-003`, `AC-004` | `META-01`–`06` |
| `REQ-004`, `AC-005` | `ADDR-01`–`05`, `TASK-01` |
| `REQ-005`, `AC-006` | `COMM-01`–`06`, `LEDGER-03` |
| `REQ-006`, `AC-007`, `AC-008` | `TOK-01`–`13` |
| `REQ-007`, `AC-009` | `ROOT-01`–`04`, `ROOT-10`, `PKG-01`–`06`, `PROMO-01`–`06` |
| `REQ-008`, `AC-010`, `AC-011` | `STATE-02`–`08`, `STATE-11/12`, `LEDGER-01`–`10`, `PROMO-02`–`05`, `HISTORY-03/04`, `E2E-04` |
| `REQ-009`, `AC-013`, `AC-014` | `MEM-01`–`03`, `START-01`–`10` |
| `REQ-010`, `AC-015` | `HIST-01`–`05`, `HISTORY-01`–`04`, `CONT-01`–`05`, `E2E-01/04` |
| `REQ-011`, `AC-012`, `AC-016` | `STATE-08`–`12`, `PKG-06`, `PROMO-03/06`, `HISTORY-03/04`, `AVAIL-01`–`06`, `NEW-01/02`, `E2E-02/03/04` |
| `REQ-012`, `AC-017` | assumption boundary; `STATE-01/03/04/11/12`; `PROMO-01`–`06`; `HISTORY-03`–`05`; `DV-045`–`DV-054` |
| `REQ-013`, `AC-018` | `DOC-01` |

## Required Durable Coverage Layers

1. **Unit:** registry consolidation and exact cohort descriptor/set equality; platform-versus-migration classifier; root dispositions; metadata precedence; address grammar; communication formats; per-row token dispositions; runtime-schema superset; promoter commit/admitted-warning/excluded-warning result; history warning result; health generation settlement.
2. **Migration integration:** `PROMO-01`–`05`; post-error strict admit/exclude; no false preservation; mixed root byte stability only for pre-mutation warnings; resolved token transaction with unsupported row; SQL rollback warning; history warning from admitted map; complete retained-ledger snapshots/terminal skip/final sole attempt.
3. **Full server E2E:** `E2E-01` supported success, `E2E-02` pre-mutation warning availability, `E2E-04` promotion/token/history warning availability, and `E2E-03` independently platform-inoperable/no-ready, all through isolated synthetic state and the actual registry where applicable.
4. **Browser-equivalent journey:** list/open/send valid history and create/use new work against the warning-ready server if it exercises the identical renderer/server path.
5. **Packaged Electron:** isolated conversion/promotion/token/history warning profile reaches health/ready despite former ready logs; only independently platform-inoperable case produces prompt error/no ready.
6. **Safety guard:** test bootstrap fails before launch if data/home realpath resolves to reporter production paths.

The `api_e2e_engineer` owns final durable coverage investigation/edit decisions and may prove equivalent cases with existing suites, but may not omit the behavior above.

## Static Findings

| Finding | Result | Evidence |
| --- | --- | --- |
| `DV-027` | Pass | User availability requirement maps to per-root pre-mutation planning, the existing catalog/promoter boundary, and warning ledger mechanisms; no generic framework required. |
| `DV-028` | Pass | All observed structurally supported formats retain complete data-flow spans and convert; the six observed authority-less roots retain their explicit warnings. |
| `DV-029` | Pass | Root/message/task failures are strict locally yet preserved/continued globally. |
| `DV-030` | Pass | Token runtime already supports current root fields with legacy extras; destructive contraction is unnecessary. |
| `DV-031` | Pass | Unsupported token rows remain unchanged while resolved rows can update atomically. |
| `DV-032` | Pass | Warning status reaches health/new Agent/new Team/valid history; excluded roots cannot masquerade as current. |
| `DV-033` | Superseded | The prior migration-fatal classification is withdrawn by the user's foundational availability correction and `ARCH-REV-007`. |
| `DV-034` | Pass | Old canonical failed-6 and the complete fourteen-entry retained terminal cohort remain explicit immutable subjects. |
| `DV-035` | Pass | `AR-004` remains closed: output-driven ready is removed; health is singular current-generation success owner. |
| `DV-036` | Pass | `AR-005` remains closed: communication warning ledger is seeded/asserted while final converts old files. |
| `DV-037` | Pass | External channels and production data remain outside every spine/fixture. |
| `DV-038` | Pass | One final migration remains the only release-facing Team application-data owner. |
| `DV-039` | Pass | `AR-006` is closed in design: the stable cohort names all fourteen retained target definitions/statuses/attempts, actual registry set equality is asserted, and final V1 is the sole new attempt. |
| `DV-040` | Pass | The later `20260521_team_run_history_index_v2` terminal row is seeded/skipped/full-snapshot stable, so the real registry path cannot overwrite V1 history in `E2E-01/02`. |
| `DV-041`–`DV-044` | Superseded | The unhanded SR-010 hash/restore/failure-injection design was rejected by the user's explicit optimistic-operating-assumption clarification. |
| `DV-045` | Pass | The fault model explicitly assumes one writer, normal filesystem/SQLite/process/power behavior, sufficient storage, and correct logic for every investigated released shape. |
| `DV-046` | Superseded | SR-011's fatal-only attempted closure of `AR-007` conflicted with the foundational availability requirement. |
| `DV-047` | Pass | `PROMO-04/05` prove the only bounded retry states already represented by marker, protected backup, and current package; no new durability record is required. |
| `DV-048` | Pass | Exhaustive rename/fsync/power/device failure injection is explicitly excluded as infrastructure behavior outside the approved migration assumptions. |
| `DV-049` | Pass | Every observed metadata/task/message/token/root/memory/ledger format still has a complete deterministic data-flow span and executable case. |
| `DV-050` | Superseded | Promotion migration failure is no longer a startup-fatal case. |
| `DV-051` | Pass | `AR-008` is withdrawn; history migration errors remain non-blocking warnings and current package/history-read validation prevents false admission. |
| `DV-052` | Pass | Reopened `AR-007` is addressed truthfully: post-error current validation returns admitted-current or excluded warning without restoration or preservation claims. |
| `DV-053` | Pass | `AR-009` is covered across conversion, promotion, token rollback, and history warnings; each reaches catalog/listen/health/new work/unaffected continuation. |
| `DV-054` | Pass | The only no-ready case is independently current-platform-inoperable and contains no migration failure as its cause. |

## Static Verdict

`Pass for self-validation and ready for architecture re-review.`

The SR-012 design is internally consistent with the user-corrected foundation, inspected released data, actual target-registry lifecycle, and optimistic fault model. It predicts deterministic success for every observed supported format. Pre-mutation problems remain untouched warnings; promotion/token/history migration problems produce truthful non-blocking warnings with strict independent admission; only current-platform inoperability blocks startup. The proof does not turn hypothetical infrastructure catastrophes into migration business logic. Executable confidence remains downstream work.
