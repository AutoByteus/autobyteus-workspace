# Investigation Notes

## Status

- Current Status: `SR-013 ready for architecture re-review after removing ARCH-REV-008's two stale migration-fatal design statements and making warning/fatal ownership explicit.`
- Current authoritative requirements: `requirements.md`, design-ready after the user's 2026-08-18 one-migration, availability-first, optimistic operating-assumption, and reusable migration-practice documentation approvals.
- Prior `SR-001`–`SR-003` broad package and `SR-007` two-migration design: withdrawn from implementation consideration.
- Architecture review: `ARCH-REV-008` resolves `AR-007`, keeps `AR-006` closed and `AR-008` withdrawn, and confirms the `AR-009` requirements gap is resolved. `AR-009` remains only as focused design coherence: remove two stale storage-exception launch-failure sentences and state that the migration coordinator aggregates warnings only while an independent platform/bootstrap owner alone may establish startup fatality. No generic recovery framework is requested.

## Workspace And Base

- Repository root: `/Users/normy/autobyteus_org/autobyteus-worktrees/canonical-identity-startup-recovery`
- Ticket branch: `codex/canonical-identity-startup-recovery`
- Ticket base: `origin/codex/agent-team-universal-task-delegation`
- Base commit: `f78df7feb241df28086c251a79c6d9f0f888fd81`
- Comparison baseline requested by user: `origin/personal`
- Refreshed `origin/personal`: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- `git merge-base origin/personal origin/codex/agent-team-universal-task-delegation`: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- Conclusion: `origin/personal` is the direct ancestor, so the three-dot comparison is the exact branch refactor delta rather than an unrelated divergent comparison.

## Scope Reset Trigger

The user rejected the earlier solution as over-scoped. In particular:

- this is not a general “migrate every persisted application subject” ticket;
- external channels are excluded;
- the design must start from the actual AgentTeam refactor relative to `origin/personal`;
- the failing canonical migration and the token database are first priority;
- the three Team persistence files must be validated;
- existing Agent memory must remain loadable, but its content schema was not intentionally changed for this refactor.
- migration success must be judged by the production upgrade outcome: supported existing Team runs must still be discoverable, openable, and continuable, not merely rewritten without error.
- an unexpected item-level conversion failure must preserve/report only that item and must not block health, new Agent/AgentTeam work, unrelated valid roots, or successfully migrated history; whole-store failures remain fatal only when current runtime operation is impossible.

The prior design widened from the observed canonical failure into external-output conversion, Team-history safety, registry-wide gating, generic completion contracts, and a general artifact/journal subsystem. Those expansions are no longer current requirements.

## One-Final-Migration Decision

The user approved consolidation after asking whether two migrations were necessary for one unreleased branch refactor. Repository verification supports that decision:

- `origin/personal` contains neither `team-canonical-identity-migration.ts` nor `team-run-execution-tree-v1-app-data-migration.ts`;
- both were introduced only in `origin/personal..origin/codex/agent-team-universal-task-delegation` while developing the same Team persistence target;
- no released runtime needs the intermediate canonical on-disk form;
- the observed canonical record is `FAILED`, not terminal success, and the production-shape inventory remains in released predecessor form;
- `20260814_team_run_execution_tree_v1` already names the final target and owns the protected package backup/promotion boundary.

Therefore the release-facing cutover keeps only `20260814_team_run_execution_tree_v1`. `20260801_team_canonical_identity` is removed from the registry/definition/prerequisite/startup gate. Its existing failed database row is not edited or deleted; unregistered rows are absent from `AppDataMigrationRunner.listStatuses()`/`runPending()` and are operationally inert. The final migration interprets released inputs in memory, writes only validated V1 packages and current token roots, and retains predecessor evidence where destructive cleanup is not required by the runtime.

## Focused Change-Origin Analysis

### Refactor commits and directly relevant persistence changes

The branch history contains these relevant milestones:

| Commit | Change relevant to this ticket |
| --- | --- |
| `3927e878d` | Adopted canonical rooted AgentTeam identity; introduced the now-development-only `20260801_team_canonical_identity`; changed Team metadata, task delegation, communication, token identity, and memory-location consumption. |
| `24597cf19` | Made canonical token migration atomic. |
| `57ab99fcc` | Closed execution-projection boundaries and made exact rooted identity the current model. |
| `fa86df6d6` | Added/refined retry-aware `20260814_team_run_execution_tree_v1` recovery and current three-file package validation; this ID survives as the single final migration. |

The relevant source diff from `origin/personal` adds or replaces:

- canonical Team metadata conversion;
- exact Team execution-address conversion;
- V1 execution-tree persistence;
- V1 task-delegation persistence;
- V1 Team communication persistence;
- token execution-identity migration;
- V1-tree-based memory location resolution.

External-channel delivery and the broader Team-history/UI subsystem also changed on the long-lived branch, but those are not part of the user's corrected ticket boundary. The current development migrations call external-channel converters; consolidation removes those calls so the single final Team migration never inspects channel data, without interpreting, converting, or changing external-channel data/runtime. The final migration's bounded history-index projection is considered only because a successfully migrated Team root must remain discoverable and continuable.

## Observed Failure Boundary

### Prisma versus app-data migration

The database has two distinct migration mechanisms:

1. Prisma `_prisma_migrations`, which completed successfully for the launch.
2. Application-data migration records in `app_data_migration_records`, where the failure actually occurs.

The observed failure is therefore not a pending Prisma SQL migration. It is the now-development-only application conversion `20260801_team_canonical_identity`; the approved solution replaces that two-step path with the single final V1 migration.

### Read-only database evidence

Read-only URI used:

`file:/Users/normy/.autobyteus/server-data/db/production.db?mode=ro`

Observed on 2026-08-18:

| Subject | Observation |
| --- | --- |
| SQLite file | `836,919,296` bytes at the earlier snapshot |
| Canonical record | `20260801_team_canonical_identity = FAILED`, attempts `6` |
| V1 record | no `20260814_team_run_execution_tree_v1` record observed; it becomes the sole final migration record |
| Earlier communication record | `20260701_team_communication_projection_addresses = SUCCEEDED_WITH_WARNINGS`, attempts `1`; runner skips it |
| Token rows | `152,616` total |
| Team token rows | `147,858` with `root_team_run_id` and `execution_address_json` |
| Token schema | still pre-V1, retaining `execution_address_json` and legacy identity columns |
| Prisma migration | complete; not causal |

The released token table already contains nullable `root_team_run_id` plus `token_usage_ledger_events_root_team_run_id_observed_at_idx`. The current Prisma model omits the legacy identity columns, but SQLite/Prisma tolerate those extra columns and current repository reads/writes do not select them. The branch's `20260814090000_team_run_execution_tree_v1/migration.sql` itself says `execution_address_json` remains for the isolated application-data migration. Therefore the current runtime does **not** require destructive legacy-column removal. Retaining those columns as inert evidence is the smallest availability-safe transition.

### Complete retained target-registry terminal cohort

`ARCH-REV-004/AR-006` exposed a test-lifecycle gap rather than a new product migration. `AppDataMigrationRunner.runPending()` executes every registered required definition that lacks a terminal record. After the design removes canonical and keeps final V1, the target registry contains fourteen other retained definitions. A second read-only database query on 2026-08-18 confirmed that the reporter profile has a terminal attempt-1 row for every one:

| Target registry order relative to final V1 | Migration ID | Observed terminal status | Attempts |
| --- | --- | --- | ---: |
| before | `20260727_custom_provider_v1_secret_migration` | `SUCCEEDED` | 1 |
| before | `20260706_remove_global_skill_discovery_mode` | `SUCCEEDED` | 1 |
| before | `20260517_team_run_metadata_member_tree` | `SUCCEEDED` | 1 |
| after | `20260731_remove_external_runtime_working_context_snapshots` | `SUCCEEDED` | 1 |
| after | `20260617_raw_trace_rotation_layout` | `SUCCEEDED` | 1 |
| after | `20260707_raw_trace_active_file_name` | `SUCCEEDED` | 1 |
| after | `20260731_migrate_native_working_context_snapshots_v5` | `SUCCEEDED_WITH_WARNINGS` | 1 |
| after | `20260701_team_communication_projection_addresses` | `SUCCEEDED_WITH_WARNINGS` | 1 |
| after | `20260730_token_usage_custom_provider_model_value_backfill` | `SUCCEEDED` | 1 |
| after | `20260730_token_usage_provider_name_snapshot_backfill` | `SUCCEEDED` | 1 |
| after | `20260623_remove_self_evolution_run_metadata` | `SUCCEEDED` | 1 |
| after | `20260521_team_run_history_index_v2` | `SUCCEEDED` | 1 |
| after | `20260521_run_history_index_v2` | `SUCCEEDED_WITH_WARNINGS` | 1 |
| after | `20260803_custom_provider_readable_identity` | `SUCCEEDED_WITH_WARNINGS` | 1 |

The synthetic full-server fixture must name this exact ordered set as `RETAINED_TARGET_MIGRATION_TERMINAL_COHORT`, seed its observed status and attempts, and snapshot every complete record before launch. The old canonical failed-attempt-6 record is a separate unregistered inert row; final V1 is absent. On first launch and relaunch, all fourteen cohort snapshots and the canonical snapshot must compare equal while final V1 is the sole new attempt. This is essential because `20260521_team_run_history_index_v2` is registered after final V1: omitting its terminal row would cause the real registry path to run it and could overwrite the V1 history projection. This fixture contract adds no production registry behavior.

### Token evidence cases

- `4,758` standalone rows.
- `147,655` direct Team member rows.
- `203` task-Team multi-member rows.
- `36` task-Team rows retain task-record plus physical-run proof.
- `167` task-Team rows outlived their task records but retain complete internally consistent released row evidence.
- A read-only proposed-policy preview classified all `152,616` rows without contradiction.

The bounded token correction inside the single final migration is therefore:

1. inspect schema before selecting columns;
2. plan every row independently;
3. use retained task topology when it exists and require agreement;
4. use complete released row evidence only for a retired token-ledger subject;
5. retain each planned exact address only in memory as package-building evidence;
6. update resolved `root_team_run_id` values transactionally and verify unchanged accounting facts/current index;
7. leave an unresolved row and its predecessor evidence unchanged with a row-specific warning;
8. retain legacy evidence columns for this release because current Prisma/runtime ignores them and their removal adds availability risk without a runtime benefit.

No canonical token schema or evidence bridge table is persisted between migrations because there is no longer a second migration boundary. Retained released columns are source evidence, not an intermediate authority or runtime compatibility path.

## Three Team Persistence Files

### Predecessor authority

- `team_run_metadata.json`
- optional `task_delegation_records.json`
- optional `team_communication_messages.json`

### Current package

- `team_run_execution_tree.json`
- `task_delegation_records.json`
- `team_communication_messages.json`

The current runtime treats the three current files as one validated TeamRun state package. A partial set is not current. The ticket must therefore plan and validate all three, but it need not absorb unrelated profile files.

## File-Format Findings Kept In Scope

### Team metadata

- `507` predecessor roots contain metadata.
- `25` nested Team nodes occur across nine roots.
- `20` use equal wrapper/child IDs.
- `4` omit child `teamRunId`.
- `1` has explicit child `teamRunId` different from wrapper `memberRunId`.
- Released tags `v1.3.90`, `v1.3.97`, `v1.4.0`, `v1.4.20`, `v1.4.40`, and `v1.4.52` consistently use explicit child `teamRunId` first and `memberRunId` only as the absence fallback.

### Task delegation

- Two roots contain five released Team-target task records.
- The failing shape is `member(parent) -> task_team(nested run) -> member(nested participant)`.
- Thirty-five task/update address occurrences use released builder grammar.
- The current normalizer loses the parent member ancestry and rejects the second member segment.

### Team communication

- `306` files use the address-bearing predecessor shape.
- `40` files use the older `{version,messages}` run-ID shape and contain `741` messages.
- Every one of the `1,482` older participant sides maps uniquely by AgentRun ID within its validated same-root metadata tree in the observed profile.
- Optional route/path values corroborate the mapping; no observed contradiction exists.

The smallest coherent owner is the single V1 final-package planner: it reads predecessor communication to produce current `team_communication_messages.json`. The terminal `20260701_team_communication_projection_addresses = SUCCEEDED_WITH_WARNINGS` record remains unchanged and skipped; the final migration handles the 40 old files itself. No earlier migration replay or completion contract is added.

### Authority-less roots

- Five roots are empty shells.
- One root is content-bearing but lacks a recognized root authority file.
- This is a direct final-migration preflight input, not a general filesystem-cleanup request.
- The minimal behavior is a distinct preserved disposition that keeps these roots out of current package admission without blocking unrelated valid roots.

## Availability-First Mechanism Evidence

The requirement correction does not require a generic degraded-mode framework. Existing local mechanisms already support the bounded behavior:

1. `TeamRunV1PackageCatalog.rebuild()` catches load/validation errors per root, records diagnostics, excludes that root, and continues other roots. A predecessor marker also excludes an unconverted root without teaching runtime code to read predecessor files.
2. `TeamRunV1PackagePromoter` has the right per-root boundary, protected backup, staged writes, complete-package validator, and predecessor metadata marker. Its current catch is not a rollback, so a post-error warning must never claim byte preservation. The existing current loader can instead observe without further mutation: a complete marker-absent valid package is admitted with warning; every incomplete/invalid state is excluded with warning; unrelated startup continues.
3. `AppDataMigrationRunner` treats `SUCCEEDED_WITH_WARNINGS` as terminal during `runPending()` and preserves failed item details/logs. Multiple existing app-data migrations already use `FAILED` details inside a terminal warning result.
4. The released/current token runtime schema already has nullable `root_team_run_id` and its index. `SqlTokenUsageLedgerRepository` reads/writes only the Prisma model's current fields; legacy columns can remain physically present without a runtime old-schema branch. `server-runtime.ts` runs Prisma SQL and initializes the current Prisma client **before** `runPending()` invokes the application-data migration, so the observed launch already proves current Prisma initialization coexists with those legacy columns.
5. Prisma/current database initialization and platform bootstrap occur before or outside migration-detail aggregation. If the current application cannot operate on that substrate at all, the platform owner may fail startup; a migration operation alone never owns that result.

These facts support a precise failure-classification boundary:

| Failure class | Examples | Migration result | Runtime consequence |
| --- | --- | --- | --- |
| Supported released shape | all observed metadata/task/message/token cases | `SUCCEEDED` unless another warning exists | migrated/admitted/continuable |
| Root-local pre-mutation data/read issue | malformed metadata, ambiguous old participant, partial/unsafe root, readable item-specific incompatibility | `SUCCEEDED_WITH_WARNINGS` | no live mutation; source/marker preserved; other roots and new work continue |
| Row-local token issue | invalid/conflicting/unresolvable predecessor identity | `SUCCEEDED_WITH_WARNINGS` | row/evidence unchanged; other resolved rows update; current writes continue |
| Optional data-migration apply issue on an already runtime-usable token table | resolved-root update transaction rolls back while current schema/index remain usable | `SUCCEEDED_WITH_WARNINGS` | old token attribution may remain degraded; server/new writes continue |
| Live promotion migration issue | backup/stage/rename/sync/post-promotion validation error | `SUCCEEDED_WITH_WARNINGS` | stop mutation; current loader admits valid complete package or excludes; no preservation claim; continue/start |
| History migration issue | snapshot/backup/write/validation error | `SUCCEEDED_WITH_WARNINGS` | strict package catalog remains authority; current history reader requires readable current tree; continue/start |
| Current-platform inoperability | current database/runtime cannot initialize or required substrate cannot operate independently of migration | platform startup error, not migration result | current application cannot operate; prompt error |

The current SR-008 all-root `TeamRunV1UpgradePlan`, `any row failure blocks entire plan`, exact destructive token contraction, and `unknowns fail closed` policy conflict with this evidence and user requirement. The corrected design replaces those policies without making infrastructure fault recovery a second product.

### Per-root promotion boundary and optimistic fault model

`ARCH-REV-005/AR-007` identified an exact reachable filesystem gap:

1. the promoter copies optional predecessor metadata/task/message files into an attempt backup and writes a minimal manifest;
2. it stages and validates the three final files;
3. it renames tree, task, and message staging files one after another onto live paths;
4. it syncs the root, then renames the predecessor metadata marker into the backup;
5. on any exception it removes only staging paths and rethrows.

The task/message target names are also predecessor source names. A failure after either rename can therefore change live files while `team_run_metadata.json` still excludes the root. A failure after the metadata move can leave a complete catalog-admittable package. `AR-007` is valid insofar as SR-009 proposed catching either case as a recoverable item warning: that claim was unsafe.

The user clarified the intended engineering posture before SR-010 was handed off. The migration may assume one stable process, normal same-filesystem rename/write behavior, normal SQLite transactions, sufficient permission/space, stable power/storage, and correct logic for the investigated released formats. It is not required to implement a hash journal, rollback every rename/fsync, or simulate every power/device failure.

The proportionate correction is policy and strict observation—not a recovery subsystem:

- all released-data interpretation and complete three-file validation occurs before live mutation; those failures can remain source-preserved item warnings;
- the existing protected backup is completed before live target replacement;
- successful promotion returns only after current package validation and marker removal;
- any backup/staging/live write/rename/sync/post-promotion validation exception stops further mutation and becomes a distinct promotion warning, never `PRESERVED_WARNING`;
- read-only current validation after the error returns admitted-current warning for a complete valid package or excluded warning for every other state;
- later explicit/future retry can use existing marker/backup/current states, but terminal warning still permits catalog/listen/health now;
- durable proof covers both post-error observations and continued new work/unaffected history. It does not inject failure at every syscall or promise in-process byte restoration.

This closes the coordinator/catalog disagreement without violating availability: migration details are truthful, while the catalog independently governs current admission. A terminal promotion warning reaches catalog/listen/health; it cannot falsely label a partial root current or preserved. The design still covers known formats deterministically under documented prerequisites and avoids speculative infrastructure recovery.

## Memory Findings

### What changed

Before the rooted-identity refactor, the physical Team memory path used:

`rootTeamRunId + teamRunPath + agentRunId`

After the refactor it uses:

`rootTeamRunId + ancestorTeamRunIds + agentRunId`

The `AgentMemoryLayout` path construction is otherwise the same. The important transition is that the current resolver obtains those exact identities from `team_run_execution_tree.json` instead of predecessor metadata.

### What did not change for this ticket

No ticket-specific transformation is required for:

- `working_context_snapshot.json`
- `raw_traces_active.jsonl` and raw-trace archives/manifests
- `episodic.jsonl`
- `semantic.jsonl`

The earlier aggregate scan found about `5.49 GB` beneath Team roots. Rewriting or copying all memory is disproportionate and unnecessary.

### Required proof

For representative top-level, nested configured-Team, and task execution memory:

1. derive the post-migration path from the target V1 tree;
2. assert it equals the existing physical directory;
3. assert file hashes are unchanged;
4. read the available files through current memory readers.

If a target identity would change the physical path, migration must preserve and exclude that Team root before replacing its authority unless stronger evidence defines a bounded conversion. It must not block unrelated roots or application startup. No bulk memory move is designed or authorized.

## Minimal Startup Boundary

The original observed user experience remains direct ticket evidence:

`canonical failure -> server returns before listen -> child exits without a recognizable terminal error -> Electron polls until generic timeout`

The scope reset keeps only the minimal correction for this exact path:

- preserve the existing migration status/summary/log evidence;
- accept the final migration's `SUCCEEDED_WITH_WARNINGS` result and continue through catalog/listen/health;
- reserve embedded-child failure for a genuinely fatal whole-store/bootstrap outcome and make it recognizable/prompt;
- remove `BaseServerManager.checkForReadyMessage()` and both output-handler ready branches;
- make current-generation `/rest/health` the single owner that may settle `ready`.

It excludes registry-wide readiness redesign, generic completion contracts, and a new cross-application status architecture.

## Historical TeamRun Continuation Boundary

The current branch's normal continuation path is directly dependent on the migrated package:

1. `TeamRunHistoryIndexReconciler` projects admitted V1 roots into the Team history index during `20260814_team_run_execution_tree_v1`.
2. `TeamRunHistoryService` lists a history item only when the indexed root has a readable current execution tree.
3. `openTeamRun` / `hydrateLiveTeamRunContext` load the execution tree, task records, Team messages, and per-AgentRun projections.
4. When the user sends to an inactive Team, `agentTeamRunStore.sendMessageToFocusedMember` invokes `RestoreAgentTeamRun`.
5. `AgentTeamRunManager.restoreTeamRun` admits and validates the exact three-file V1 package, restores the backend using the same root TeamRun identity, and the frontend sends the new user submission to the focused AgentRun.

`ARCH-REV-006` questioned the existing history warning, but the user correctly identified that making it fatal would recreate the startup blocker. `ARCH-REV-007` withdraws `AR-008`. `TeamRunHistoryIndexReconciler.reconcile()` already uses strict input read, optional backup, and the atomic index writer; `TeamRunExecutionTreeV1AppDataMigration.reconcileTeamHistory()` catches errors as failed details. That is the correct availability direction when the final result remains `SUCCEEDED_WITH_WARNINGS`.

Safety does not depend on a perfect index write. `TeamRunV1PackageCatalog` admits current packages independently, and `TeamRunHistoryService` lists a history row only when its execution tree is readable. A history warning may reduce visibility, but it cannot make a predecessor/partial root current. The proportionate target keeps the warning, exact diagnostics, catalog/listen/health, new work, and unaffected continuation; it does not add a journal or make history completion a startup gate.

Therefore, migration success is still insufficient as the only user proof: catalog visibility, open/hydration, memory/projection loading, restore, and a controlled new submission must work for independently valid roots. This does not justify redesigning Team history or blocking the application when its projection migration warns.

Roots without sufficient identity authority cannot honestly be guaranteed resumable. They remain byte-preserved and explicitly unavailable while unrelated proven roots migrate and continue normally. This is a per-root warning outcome, not a reason to withhold the application from the user.

### Approved isolated validation shape

The user ultimately chose fully synthetic E2E data rather than copying any production TeamRun into a test profile. The read-only production investigation remains the shape authority, while committed fixtures reproduce those shapes without raw content or identifiers.

- fixture selection is shape-based rather than volume-based: every materially different nested-Team, older-message, task-Team, token, orphan, memory, and current-package case must be represented;
- the synthetic profile must include not only TeamRun directories but also the necessary migration records, token rows/schema state, and Team history index dependencies.
- the same synthetic profile must combine valid roots with independently invalid root/message/token items, then prove warning status, health, new standalone Agent work, new AgentTeam work, valid-history continuation, excluded-root preservation, and idempotent relaunch.

The repository already supports isolated server execution: the server accepts `--data-dir`, E2E tests initialize `appConfigProvider` with a temporary `appDataDir`, and `autobyteus-web/scripts/verify-packaged-server-startup.mjs` starts a packaged server against a temporary data directory and waits for `/rest/health`. The script currently creates a fresh profile; downstream coverage can extend or reuse that boundary to seed the selected predecessor sample before startup.

The Electron main process currently derives server data from `~/.autobyteus/server-data`. Therefore an actual packaged-client check is safe only after the test harness proves that the process has an isolated home/base-data directory. Until that isolation is proven, automated validation must use the packaged server plus browser/API paths and must not launch the ticket build against the reporter's default home profile.

Recommended evidence tiers, without expanding product scope:

1. minimized sanitized durable fixtures cover every observed migration format deterministically;
2. a fully synthetic disposable profile containing the complete observed-shape matrix proves migration, history listing, package hydration, restore, controlled send, and idempotent relaunch through the test server;
3. a packaged Electron smoke against that same isolated synthetic profile proves the desktop startup boundary; browser automation may own durable click/open/send coverage only when the downstream coverage investigation proves it exercises the identical renderer/server path.

## Explicitly Excluded Investigation Findings

The read-only profile scan also found external-channel delivery records and identified a broader potential Team-history mutation concern. Those facts remain in `released-data-shape-inventory.md` for historical evidence, but they do not authorize external-channel conversion or a Team-history redesign. The consolidated final migration has no external-channel reads/writes. Current coverage verifies only its V1 index projection and normal continuation path for successfully migrated roots.

Likewise, the prior architecture finding about an old terminal canonical record plus old communication was caused by the withdrawn broad design. The one-migration released cutover deregisters the development-only canonical definition, leaves its observed failed row inert, and converts communication in the final V1 planner; no generic terminal-record replay is required.

## Source And Command Log

| Date | Source / Command | Material Result |
| --- | --- | --- |
| 2026-08-18 | `git fetch origin personal codex/agent-team-universal-task-delegation` | Refreshed both comparison refs. |
| 2026-08-18 | `git merge-base origin/personal origin/codex/agent-team-universal-task-delegation` | `origin/personal` is the direct ancestor at `acb898...`. |
| 2026-08-18 | `git log origin/personal..origin/codex/agent-team-universal-task-delegation` | Located canonical identity, token atomicity, execution-projection, and migration-recovery commits. |
| 2026-08-18 | `git diff --name-status origin/personal...origin/codex/agent-team-universal-task-delegation` over migration/Team/token/memory paths | Isolated the persistence subjects caused by the AgentTeam refactor. |
| 2026-08-18 | `git show 3927e878d`, `24597cf19`, `57ab99fcc`, `fa86df6d6` | Confirmed why the two current Team migration IDs exist and which formats they own. |
| 2026-08-18 | `git show origin/personal:...app-data-migration-registry.ts` and `git cat-file -e origin/personal:<canonical/V1 files>` | Confirmed the released registry has the older Team migrations but neither development-only canonical nor V1 definition; both new files are absent. |
| 2026-08-18 | SQLite `mode=ro`, explicit read transaction, schema/status/count queries | Confirmed Prisma is not causal, canonical is failed at attempt six, V1 has not run, and token evidence remains pre-V1. |
| 2026-08-18 | `team-canonical-identity-migration.ts`, metadata/address/token planners | Confirmed the exact current failure path and database dependency. |
| 2026-08-18 | V1 package planner/promoter/validators | Confirmed the exact three-file target package and current communication ownership. |
| 2026-08-18 | current/parent `AgentMemoryLayout` plus V1 tree location service | Confirmed same physical path formula with renamed/authoritative ancestor identity input. |
| 2026-08-18 | `TeamRunHistoryIndexReconciler`, `TeamRunHistoryService`, `teamRunOpenCoordinator`, `teamRunContextHydrationService`, `AgentTeamRunManager.restoreTeamRun`, and `agentTeamRunStore.sendMessageToFocusedMember` | Confirmed the current catalog -> open/hydrate -> restore -> new-submission path that defines whether a migrated production TeamRun is actually continuable. |
| 2026-08-18 | `autobyteus-web/scripts/verify-packaged-server-startup.mjs`, server `--data-dir`, temporary `appDataDir` E2E setup, Electron `appDataPaths.ts` and `BaseServerManager` | Confirmed that server/API validation can use an isolated data directory, while actual Electron requires a proven isolated home/base-data boundary before it is safe to launch against synthetic test data. |
| 2026-08-18 | current canonical/V1 migration coordinators, classifier, promoter, token repositories, `server-runtime.ts`, `BaseServerManager`, and current Team history/restore/send services | Completed the SR-008 one-final-migration ownership/state/health design and full data-flow proof recorded in `design-spec.md` and `design-use-case-validation.md`. |
| 2026-08-18 | `ARCH-REV-003`, `BaseServerManager.setupProcessHandlers/checkForReadyMessage/waitForServerReady`, and runner terminal-warning behavior | Confirmed two bounded corrections to carry into SR-008: remove log-driven ready in favor of current-generation health, and seed/assert the earlier communication `SUCCEEDED_WITH_WARNINGS` ledger row. |
| 2026-08-18 | User production-availability clarification; SR-008 review hold message | Established that legacy item failures must not block application usability; paused review before implementation. |
| 2026-08-18 | `server-runtime.ts`, `prisma/schema.prisma`, `origin/personal:prisma/schema.prisma`, Prisma SQL `20260702093000`, `20260801090000`, `20260814090000`, and `SqlTokenUsageLedgerRepository` | Confirmed startup initializes current Prisma before app-data migration, released/current runtime already share nullable indexed `root_team_run_id`, and extra legacy SQLite columns are ignored by current Prisma/runtime rather than needing a drop. |
| 2026-08-18 | `AppDataMigrationRunner`, warning-result migrations/tests, `TeamRunV1PackageCatalog`, `TeamRunV1PackagePromoter`, classifier/history reconciler | Confirmed existing terminal-warning, per-root exclusion, protected promotion, and diagnostic mechanisms can implement availability without a generic framework. |
| 2026-08-18 | V1 coordinator/planner/evidence/token repository | Confirmed exact SR-008 conflicts: global all-root/row failure, token-evidence coupling, and destructive contraction; identified the required per-root/per-row isolation boundary. |
| 2026-08-18 | reporter filesystem/JSON `lstat` and aggregate read-only probes | Established the observed metadata/task/message/root/memory categories without copying raw data. |
| 2026-08-18 | `ARCH-REV-004`, target `app-data-migration-registry.ts`, runner behavior, and SQLite `mode=ro` query for every retained registry ID | Confirmed the exact fourteen-record terminal cohort, all at attempt 1, and why the later Team-history row must be seeded/skipped in full-process proof. |
| 2026-08-18 | `ARCH-REV-005`, `team-run-v1-package-promoter.ts`, `team-run-predecessor-source-resolver.ts`, and `team-run-v1-package-catalog.ts` | Confirmed sequential live replacement, staging-only catch cleanup, marker-based exclusion/admission, and the need for one typed commit/recovery result at the existing per-root promoter boundary. |
| 2026-08-18 | User optimistic-migration prerequisite clarification | Rejected exhaustive defensive handling for power/device/syscall failures; established normal single-writer/filesystem/SQLite/process operation as explicit assumptions and restricted warnings to no-live-mutation data failures. |
| 2026-08-18 | `ARCH-REV-006` then corrected `ARCH-REV-007`; `team-run-history-index-reconciler.ts`, `team-run-history-index-store.ts`, V1 `reconcileTeamHistory()`, package catalog, history service | `AR-008` withdrawn. History migration errors remain warnings; strict package/current-tree reads prevent false admission while startup continues. |
| 2026-08-18 | User foundational availability reaffirmation after reviewing `ARCH-REV-006` | Superseded the intermediate restriction of warnings to pre-mutation cases. Every conversion/promotion/token/history migration problem must warn and reach health; truthful post-mutation admit/exclude replaces false preservation or startup failure. |
| 2026-08-18 | User reusable migration-practice documentation request; `autobyteus-server-ts/README.md` **Database migrations** | Located the durable project documentation home. The note is a delivery-stage docs sync requirement; it does not change runtime scope or authorize the solution designer to edit project docs before integrated delivery. |

## Current Design Health Assessment

- Change posture: `Focused production-upgrade bug fix and clean-cut consolidation of an unreleased two-step persisted-data transition`.
- Root cause: development split one release cutover across incomplete canonical/V1 planners, persisted an unnecessary intermediate, coupled all historical items into one startup admission decision, proposed destructive token cleanup not required by runtime, and left health competing with log-driven Electron readiness.
- Refactor required: `Limited` to one final V1 coordinator with per-root planning isolation, truthful post-promotion current validation/admit-exclude warning results, per-row token dispositions and non-destructive transactional updates, non-blocking history warnings, terminal migration-warning aggregation, strict valid-root catalog/history readers, removal of the canonical definition/intermediate/external calls, and health-owned Electron startup settlement.
- Refactor explicitly not required: general migration framework, generic artifact/journal subsystem, exhaustive crash consistency, per-syscall failure recovery, external-channel, Team-history subsystem redesign, runtime compatibility, or memory schema.

## Current Supplemental Artifact Inventory

| Artifact | Status / Authority |
| --- | --- |
| `ticket-description.md` | Original request baseline; user scope correction in `requirements.md` is later authority. |
| `released-data-shape-inventory.md` | Current read-only evidence; out-of-scope sections do not create requirements. |
| `migration-recovery-policy.md` | Superseded by scope reset. |
| `startup-blocker-status-contract.md` | Superseded by scope reset. |
| `design-use-case-validation.md` | SR-012 one-migration availability proof, retaining resolved `AR-004`–`AR-006`, addressing reopened `AR-007`/new `AR-009`, and recording withdrawn `AR-008`; approval applicability N/A. |

## Remaining Validation Boundary

No requirements clarification remains open. SR-013 retains the SR-012 proof obligation: complete retained-ledger lifecycle, supported deterministic migration, truthful pre-mutation preservation, post-promotion valid-current admission versus invalid/incomplete exclusion, token rollback warning, history warning, health/new work/unaffected continuation after every migration warning, and independently owned platform-only fatal boundary. `delivery_engineer` must add the approved reusable practice note to `autobyteus-server-ts/README.md` during integrated docs sync. The reporter's live profile remains read-only and must not be copied or launched by automated validation.
