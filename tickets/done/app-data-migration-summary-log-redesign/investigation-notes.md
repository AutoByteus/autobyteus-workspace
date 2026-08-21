# App-Data Migration Summary And Diagnostic Log Redesign — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated worktree and draft requirements created from refreshed `origin/personal`.
- Current Status: Architecture-level investigation, final in-place Prisma/SQLite transition proof, canonical convention audit, and user approval complete. Architecture round 1 returned one design-documentation finding (`AR-DI-001`); the full runtime/log spine correction is complete and the package is ready for re-review.
- Investigation Goal: Establish the released/current migration outcome model, actual database/API/UI/log production paths, representative legacy shapes, and the smallest safe forward-only redesign that separates concise database status from detailed log diagnostics.
- Scope Classification (`Small-to-Medium`): Persisted model plus runner/repository/API/UI projection and a small legacy database rewrite.
- Scope Classification Rationale: The conceptual rule is simple, but it crosses multiple current owners and affects released persisted data.
- Scope Summary: Replace database-resident JSON detail documents with one deliberately constructed very short summary string; keep the existing definition result and full-detail log writer unchanged; migrate legacy database records without modifying historical log files.
- Primary Questions Resolved:
  1. The user approved one plain-text stored/API/UI summary string, per-attempt-log ownership of diagnostics, no arbitrary summary/error caps, and a migration script; the latest clarification explicitly rejects separate persisted count fields as redundant.
  2. The canonical convention is `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`, linked by the README. The smallest compliant forward-only transition is one durable, Prisma-registered transactional validation/update/column-rename boundary before current runtime, not a table rebuild or new `AppDataMigrationDefinition`.
  3. The runner already owns both destinations. It should keep writing the unchanged execution summary to the existing log and persist only a formatted sentence; definitions continue returning `details[]`.

## Request Context

The user identified the migration outcome model as an independent design problem after a separate token-usage ticket exposed oversized app-data migration audit records. The user considers `summary_json` misleading and incorrectly scoped: a summary should be short text, while detailed per-item diagnostics should live in a per-migration log referenced by path. The user explicitly requested a new ticket from `origin/personal`, no historical log-file migration, no entry-level database details, and the simplest proportionate solution.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`): Git super-repository with component directories.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/app-data-migration-summary-log-redesign`
- Current Branch: `codex/app-data-migration-summary-log-redesign`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Initial bootstrap fetch resolved `origin/personal` to `1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`. Before approved design work, `origin/personal` had advanced; a second fetch and clean fast-forward reset updated this dedicated task branch to `3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`.
- Task Branch: `codex/app-data-migration-summary-log-redesign`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): Local `personal`, refreshed from `origin/personal` by delivery before finalization.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This ticket is independent from `token-usage-one-row-per-agent-run`, although the refreshed base now contains that completed work and its generic recovery-action contract. Do not restore its withdrawn audit-compactor or historical-log rewrite. Existing filesystem log files are evidence/reference only and must not be read or rewritten by the transition.

## Supplemental Task Artifact Inventory

None. The earlier definition-adaptation matrix was removed after the user clarified that the current definition result and full-detail log writer must remain unchanged.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-20 | Command | `git fetch origin personal`; `git worktree add -b codex/app-data-migration-summary-log-redesign ... origin/personal`; `git rev-parse HEAD`; `git rev-parse origin/personal` | Bootstrap an isolated ticket from the user's requested current base | Worktree and task branch both start at refreshed `origin/personal` commit `1f5663ddb86e478d0b4ffdd878d57dee72d67b4b` | No |
| 2026-08-20 | User | Current conversation request | Capture approved problem direction before deeper investigation | Summary must be short text containing the useful final statistics; error/log path remain record evidence; no entry-level details in DB; details belong in log; keep solution simple and independent | Refine exact contract after code/data inspection |
| 2026-08-20 | User | Requirements clarification in current conversation | Resolve proposed caps and final-result construction | Summary is simply a deliberately constructed very short final/statistical string; per-item evidence belongs only in the per-migration attempt log; refactor how migrations construct/return results; arbitrary database summary/error length caps are unnecessary | Confirm refined basis, then design the diagnostic-writer boundary |
| 2026-08-20 | User | Approval/continuation instruction in current conversation | Lock the corrected requirements basis and routing | Proceed through the completed solution-designer package, include a migration script, and stop for user review rather than sending immediately to architecture review | Produce design and SR-001; do not hand off yet |
| 2026-08-20 | User | Requirements clarification in current conversation | Challenge redundant storage and clarify what “remove details from migration results” means | The requested product outcome is simply one short stored summary string plus detailed evidence in the log; separate persisted count columns are unnecessary. Diagnostic details may exist while execution is happening, but must not be retained as the final database/API/UI result | Remove persisted/API/UI count fields from the target; keep transient counts only for summary construction and preserve the bounded log sink |
| 2026-08-20 | User | Requirements clarification in current conversation | Confirm that the existing log already is the complete detail destination and minimize the change | Preserve the existing log unchanged: it contains the four-count `statusSummary` plus every returned detail. Keep the existing definition result; stop only the database/API/UI duplication and rewrite released database summaries to text | Remove diagnostic-sink/definition refactor and log cap from current scope; simplify SQL to a validated in-place update/rename |
| 2026-08-20 | Command | `git fetch origin personal`; inspect `HEAD..origin/personal`; verify no tracked changes; `git reset --hard origin/personal` in the dedicated ticket worktree | Re-verify bootstrap before approved design and incorporate the now-completed token ticket/recovery contract | Dedicated branch cleanly advanced from `1f5663ddb` to current `origin/personal` `3b81b5ebd`; relevant app-data runner/API/UI changes are now present while the prior audit-compactor remains intentionally removed | Use refreshed code as design authority |
| 2026-08-20 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/design-principles.md` | Apply shared design and persisted-data rules | Requires a current-schema runtime, evidence-backed transition, clean-cut replacement, and product-reachability gate for proposed recovery machinery | Apply during design after approval |
| 2026-08-20 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/references/design-examples.md`, Example 7 | Check the concrete current-schema/runtime versus required-migration shape | Historical interpretation belongs in one owned pre-runtime transition; current repositories must remain single-schema and startup stays blocked when required current schema is unavailable | Applied to DS-004 and compatibility rejection |
| 2026-08-20 | Doc | `autobyteus-server-ts/README.md`; `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Locate and repeatedly re-read the exact project convention after the user's explicit requests | The separate canonical file is `docs/design/production_data_migration_conventions.md`. It requires a deterministic known-source/fixed-target transform, migration-owned legacy knowledge, bounded transition work/evidence, exact scalar validation, one SQLite recovery transaction, source preservation, final-current-state classification, proportionate recovery, and current-only runtime | Applied to the dedicated transition conformance map. Its bounded-log preference remains an explicit residual for the separately preserved existing runtime log, not a reason to redesign that user-preserved behavior in this ticket |
| 2026-08-20 | Code | `autobyteus-server-ts/prisma/schema.prisma`; `prisma/migrations/20260517090000_add_app_data_migration_records/migration.sql` | Verify persisted record | One `summary_json TEXT` field holds outcome JSON; no text summary or count columns exist | Yes—schema transition required |
| 2026-08-20 | Code | `autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-types.ts` | Verify current outcome contract | `AppDataMigrationSummary` combines four counts and `details[]`; repository snapshots carry raw `summaryJson`; status snapshot carries parsed summary | Yes—replace shared shape |
| 2026-08-20 | Code | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts` | Trace write/read/log path | Runner JSON-stringifies the entire summary into DB, writes the same details to a log, lists all DB rows, parses summary JSON in Node, and exposes parsed summary | Yes—runner is authoritative split boundary |
| 2026-08-20 | Code | `autobyteus-server-ts/src/app-data-migrations/repositories/app-data-migration-record-repository.ts` | Verify database materialization | `listRecords()` selects full `summary_json` for every row before registry filtering; no size/cardinality constraint exists | Yes—repository contract must become scalar only |
| 2026-08-20 | Code | `autobyteus-server-ts/src/api/graphql/types/app-data-migrations.ts`; web query/mutation/store; `ServerMigrationsManager.vue` | Trace supported status reader | GraphQL exposes `summary` as `GraphQLJSON`; web types contain counts plus `details[]`; Settings renders counts and an expandable per-item list | Yes—replace JSON with one string and remove count/detail UI models |
| 2026-08-20 | Command / Code | `rg` over `src/app-data-migrations/migrations` for `details:`, `AppDataMigrationItemDetail`, and `implements AppDataMigrationDefinition` after base refresh | Determine whether definition changes are necessary | All 16 definitions participate in the detail-bearing internal contract, but the runner already consumes that contract for the desired full-detail log. The user's clarified scope means these files should remain unchanged | Delete the planned adaptation matrix and test for unnecessary definition edits |
| 2026-08-20 | Code | `autobyteus-server-ts/src/server-runtime.ts`; `app-data-migration-registry.ts`; runner unit tests | Identify preserved lifecycle | Startup invokes `runPending`; runner catches per-migration failures and continues; explicit feature-specific gates exist; retry/prerequisite/stale-running behavior is already covered | Preserve; no new generic fatal gate |
| 2026-08-20 | Command / Data | Read-only `sqlite3` queries against `/Users/normy/.autobyteus/server-data/db/production.db` selecting schema, lengths, JSON scalar extracts, JSON key/type inventories, and counts only | Inspect representative observed released data without mutating or loading detail documents into Node | 21 rows; 31,383,761 summary characters; max 14,318,058; all 21 valid and use exactly counts+details; 212,008 detail objects; error max 79 chars; path max 242 chars | Use as transition fixture basis, never run proof on live profile |
| 2026-08-20 | Data / Code | Read first/last bounded lines of provider-name migration log and first DB detail through SQLite JSON extraction; searched all `logPath` uses | Verify duplication and log consumption | First detail is identical in DB and file; product source only transmits/displays `logPath` and never reads historical log contents | Historical log mutation has no product value and is out of scope |
| 2026-08-20 | Data | Read-only aggregate-count comparison | Test whether counts partition scanned items | `20260819_token_usage_run_records_v1` has scanned=158,025 and migrated=1,283, proving counts are independent measures | Do not impose scanned=sum invariant |
| 2026-08-20 | Command | `sqlite3 -readonly ... SELECT sqlite_version(), json_valid(...), json_extract(...)` | Verify observed SQLite JSON support without changing data | Observed runtime SQLite 3.51.0 supports JSON functions; target production transport/DDL still requires isolated fixture proof in design/implementation | Yes |
| 2026-08-20 | Probe / Setup | Temporary minimal Prisma 5.22 project under `/tmp/app-migration-record-redesign-proof-run.dBMR0y`; real `prisma migrate deploy`; transactional table rebuild using `json_extract`; 100,000-detail/6,488,980-byte synthetic legacy JSON | Prove the proposed deployment boundary and data mapping through the actual repository Prisma version without touching live data | Explicit `BEGIN IMMEDIATE` migration applied successfully; target row was `Scanned 158025; migrated 1283; skipped 17; failed 2.` with all four integers, error and `/kept/path.log` preserved; `summary_json` was absent; `PRAGMA integrity_check` returned `ok` | Retain result here; implementation must create the real migration/test |
| 2026-08-20 | Probe / Setup | Temporary invalid-shape Prisma fixture under `/tmp/app-migration-record-redesign-prisma-invalid.Dy9zwn`; real `prisma migrate deploy` | Verify failure atomicity for malformed JSON | Prisma returned `P3018`; the explicit transaction rolled back the new table, original `summary_json='{not-json'` and `/preserved.log` remained, no `new_app_data_migration_records` table remained, and integrity check was `ok` | Treat malformed/tampered data as unsupported; no current runtime fallback |
| 2026-08-20 | Code / Command | `src/server-runtime.ts`, `src/startup/migrations.ts`, schema migration inventory, and `rg` for current migration/log tests | Choose schema versus app-data transition owner | Prisma `migrate deploy` is already fatal and runs before Prisma initialization and `runPending()`. Changing the runner's own record table through a registered app-data migration would require a mixed old/current table; one transactional schema migration is the cleaner owner | Design schema migration, not registry entry |
| 2026-08-20 | Probe / Setup | Revised temporary Prisma 5.22 fixture under `/tmp/app-migration-summary-string-proof.rQRjfS`; transaction-local exact-type validation staging; final table with only `summary TEXT`; 100,000-detail/7,988,980-byte synthetic legacy JSON | Re-prove the user-simplified one-column target through the production migration adapter | Deploy produced exactly `Scanned 158025; migrated 1283; skipped 17; failed 2.`, preserved error/path and a null running summary, left no count columns or staging table, and passed `PRAGMA integrity_check` | Use this revised shape as implementation authority |
| 2026-08-20 | Probe / Setup | Same revised Prisma fixture with legacy `scannedCount` encoded as JSON text instead of integer | Prove exact legacy-type rejection without final count-column constraints | Prisma returned `P3018` / staging `CHECK constraint failed: scanned_json_type`; transaction rollback preserved the original JSON, error, path, and legacy schema; no staging/new table remained; integrity check was `ok` | Keep staging validation inside historical SQL and no runtime fallback |
| 2026-08-20 | Probe / Setup | Final simplified Prisma 5.22 fixture under `/tmp/app-migration-summary-inplace-proof.AFw2pZ`; validation staging plus in-place `UPDATE` and `ALTER TABLE ... RENAME COLUMN`; 100,000-detail/8,188,980-byte JSON | Prove the minimal user-requested migration without a table rebuild | Deploy produced the exact summary sentence, preserved null/status/error/path/index, left only the renamed `summary` column, removed staging, and passed integrity check | Use the in-place migration as final design authority |
| 2026-08-20 | Probe / Setup | Same final in-place fixture with JSON-text `scannedCount` | Prove rollback before update/rename on invalid source type | Prisma returned `P3018` / `CHECK constraint failed: scanned_json_type`; original JSON, `summary_json` column, error/path, and integrity remained; no staging table remained | Final SQL failure behavior proven |
| 2026-08-20 | Probe / Setup | Final in-place Prisma fixture matrix: negative integer, fractional number, missing count, malformed JSON, and empty fresh install | Audit final SQL against README/canonical exact validation, rollback, cleanup, and fresh-install expectations | Every invalid case failed before update/rename, retained exact legacy column/value, removed staging through rollback, and passed integrity; fresh install produced `summary`, zero rows, no staging, and integrity `ok` | Convention evidence complete; reproduce as repository coverage during implementation |
| 2026-08-20 | User | Explicit approval in current conversation | Close the requested user-review hold and authorize downstream review | User confirmed the final behavior: stop database JSON persistence, migrate old JSON to the short summary, and keep current log writing unchanged; requested adherence to README migration conventions | Hand approved package to architecture review |
| 2026-08-20 | Architecture review | `design-review-report.md`, round 1, `AR-DI-001`; `architecture-review-revision-record.md`, `ARCH-REV-001` | Verify implementation readiness after user approval | Product direction, ownership, one-string contract, unchanged log behavior, forward-only runtime, and Prisma transition passed. The design's runtime/log spine started too late and did not attach `writeLog()` through stored `logPath` to startup/manual initiators and the preserved lifecycle | Correct behavior map, spine inventory/narratives, return path, and arrow example without changing behavior |
| 2026-08-20 | User | Latest explicit convention instruction in current conversation | Reconfirm the governing source and demand convention compliance after the review interruption | User requires the separate data-migration convention to be found and the design checked against it | Record exact canonical path and explicit clause-by-clause design mapping before re-review |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | A registered definition is selected by startup `runPending()` or an eligible Settings/API manual retry | `runPending()` / GraphQL `runAppDataMigration` -> registry/policy -> shared `runDefinition()` in-flight/record-lock/stale-running check -> prerequisites -> `markRunning()` -> definition `execute()` -> log creation/returned `logPath` -> `complete()` or thrown-error `emptySummary()` -> log -> `markFailed()` | The preserved lifecycle governs registration, prerequisites, attempts, retry, recovery and terminal evidence; today the terminal database outcome can grow once per source/detail item because it stores the rich JSON | Domain types, runner, registry, GraphQL mutation, repository, runner tests, 16 definitions / 21 participating files |
| BEH-002 | User / Contract | Settings opens server migrations or a client calls `getAppDataMigrations` | Settings -> Pinia/Apollo query -> GraphQL resolver -> runner `listStatuses()` -> repository selects every full JSON -> Node `JSON.parse` -> GraphQL JSON -> UI counts/expandable details | A supported read materializes and can transmit all database detail documents; unregistered rows are also selected before filtering | Repository, runner, GraphQL, store/UI, observed 31.38M-character data |
| BEH-003 | Operational | Either supported runtime initiator reaches a returned result or the runner catch path supplies `emptySummary()` plus an error | Runner builds log lines containing header/counts/error and `summary.details.map(JSON.stringify)` -> writes a timestamped file -> returns the path -> `complete()`/`markFailed()` stores `log_path`; Settings only displays path | Detailed entries are duplicated in DB and log. The log branch is a secondary/return path attached to both supported execution initiators; historical log contents are not a product read path | Runner, exact DB/log detail match, product-wide `logPath` search |
| BEH-004 | System | Start a newer release against a released database | `runMigrations()` / `prisma migrate deploy` -> Prisma initialization -> app-data runner; released rows contain valid five-field JSON and current repository reads it | Database-schema migration already owns pre-runtime table changes. Status/count/timing/error/path evidence survives one transactional validate/update/column-rename | Server runtime ordering, schema, convention, released data inventory, final synthetic Prisma proof |

## Design Health Assessment Evidence

- Change posture (`Behavior Change` / `Refactor` / `Performance`)
- Candidate root cause classification (`Boundary Or Ownership Issue` / `Missing Invariant`)
- Refactor posture evidence summary: The generic outcome contract appears to make detailed diagnostics part of the database summary. Investigation must confirm where to split the contract rather than add a local truncation patch at one reader.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Current domain/runner/repository/API/UI trace | One shared `summary` structure is simultaneously execution aggregate, database document, API JSON, UI detail collection, and log input | Boundary/ownership issue: concise status and diagnostics are not separate contracts | Split in target design |
| Read-only production data | 21 rows contain 31.38M characters and 212,008 detail entries while the useful summary facts are tiny | Missing invariant is observable in a supported product read, not a hypothetical | Add enforced one-string outcome contract |
| Product-wide log-path search | Product displays the path but never reads historical content | Historical file migration would not serve a reachable behavior | Explicitly reject it |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/prisma/schema.prisma` / app-data migration table migration | Physical record model | `summary_json` is the only aggregate outcome field | Replace with one plain summary string; legacy content requires transition |
| `src/app-data-migrations/domain/app-data-migration-types.ts` | Shared definition/result/record/status contracts | Mixes aggregate counts with per-item details and raw JSON | Tighten into concise persisted/status shape plus log-only diagnostic shape |
| `src/app-data-migrations/app-data-migration-runner.ts` | Migration lifecycle, execution, record completion, log creation, status projection | Owns both DB serialization and log serialization; therefore it is the correct boundary to prevent detail persistence | Runner should split concise persistence from detailed log output once, not each migration/repository caller |
| `src/app-data-migrations/repositories/app-data-migration-record-repository.ts` | App-data migration record persistence | Selects raw JSON for every row and accepts arbitrary JSON strings | Repository should accept/return one current summary string plus existing metadata |
| `src/api/graphql/types/app-data-migrations.ts` | Product API projection | Uses `GraphQLJSON` for summary | Replace with one text field; no JSON/count/detail projection |
| `autobyteus-web/stores/appDataMigrationsStore.ts` | Frontend status state | Models summary counts/details | Adopt the current string-summary API only |
| `autobyteus-web/components/settings/ServerMigrationsManager.vue` | Settings status presentation | Renders counts and expandable database details; displays log path | Render the stored summary string with status/error/path; remove separate count/detail presentation |
| `src/app-data-migrations/migrations/*` | Individual deterministic transformations | 16 definitions / 21 definition-helper files produce the counts/details already consumed by the current log writer | Preserve; no behavioral or signature change required |
| `src/server-runtime.ts` / registry | Database deployment, startup scheduling, recovery actions, and explicit feature gates | Prisma migration failure is already platform-fatal; generic app-data runner continues normal definition failures; recovery action is current contract | Preserve both existing boundaries; do not add a registered outcome-schema migration or new gate |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-20 | Probe | Read-only SQLite schema/length/`json_extract`/`json_each` queries on the observed production database | All 21 summaries were valid five-field released shapes; two exceeded 13 MiB; total details=212,008; the query never returned full documents | Supported legacy counts can be extracted in SQLite without transporting detail text into Node; proof must use synthetic fixtures |
| 2026-08-20 | Trace | Bounded read of one log and one SQLite-extracted detail | The database and log contain the same first detail | Database detail is duplicate evidence, so deliberate removal is semantically safe for product status when logs remain untouched |
| 2026-08-20 | Probe | Real Prisma 5.22 deploy of an explicit transactional table rebuild plus a 100,000-detail SQLite fixture | The transform extracted the four legacy values, generated the fixed summary, removed the legacy column, preserved error/path, accepted a `NULL` in-progress outcome, and passed integrity check | `Migration Required` and SQL-side summary construction are proven feasible without a Node legacy reader; the revised final fixture must omit count columns |
| 2026-08-20 | Probe | Real Prisma 5.22 deploy against malformed legacy JSON | The transform failed with `P3018`, rolled back completely, and retained legacy evidence | Current runtime must not start; unsupported malformed data does not justify compatibility code |
| 2026-08-20 | Probe | Revised real Prisma 5.22 deploy to a final schema containing only `summary TEXT` | A 7,988,980-byte/100,000-detail legacy document became the expected 52-character summary; non-summary fields and null outcomes were preserved; no count/staging columns remained | The simpler user-requested persistence shape is adapter-proven and current-runtime-readable without JSON parsing |
| 2026-08-20 | Probe | Revised real Prisma 5.22 deploy with a JSON-string count | Transaction-local type/value staging rejected the row and rolled the entire attempt back, leaving source evidence and schema intact | Exact legacy validation remains convention-compliant even though the final table intentionally stores no machine-readable counts |
| 2026-08-20 | Probe | Final real Prisma 5.22 in-place update/rename migration against an 8,188,980-byte/100,000-detail row | The result was the expected summary string with metadata/index/null row preserved, no count or staging columns, and integrity `ok` | Table rebuild is unnecessary; the final transition is a small transactional rewrite/rename |
| 2026-08-20 | Probe | Final in-place migration against a wrong-source-type count | Validation failed before update/rename and rollback retained the exact legacy schema/value | The simpler migration retains the previously proven failure guarantees |
| 2026-08-20 | Probe | Final invalid/fresh-install convention matrix through real Prisma 5.22 | Negative/fractional/missing/malformed values all failed atomically with original schema/value and no staging residue; fresh install reached the final empty schema cleanly | Exact validation, transaction rollback, cleanup, forward-only schema, and fresh-install behavior are all adapter-proven |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None expected; repository contract is authoritative.
- Version / tag / commit / freshness: Current refreshed `origin/personal` and task HEAD at `3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`.
- Relevant contract, behavior, or constraint learned: N/A at bootstrap.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No running product service was required. Synthetic SQLite databases and a minimal temporary Prisma schema/migration set were used for transition proof.
- Required config, feature flags, env vars, or accounts: None for static investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Worktree bootstrap/base-refresh commands and the temporary Prisma 5.22 deploy commands recorded above.
- Cleanup notes for temporary investigation-only setup: Proof directories remain under `/tmp` only as disposable local evidence and are not supplemental artifacts or repository inputs. No live database or historical log was mutated.

## Findings From Code / Docs / Data / Logs

### Current Writer

Every definition returns `AppDataMigrationExecutionResult.summary`. The runner serializes the complete summary into `summary_json`, serializes its counts/details again into a log, and only then completes the record. Thrown errors receive an empty JSON summary. The material defect is the runner's database projection: it persists its rich log input instead of a short sentence. The internal result remains useful for the unchanged log writer.

### Current Reader

`listRecords()` selects full JSON for every database row. The runner parses each registered record in Node, GraphQL exposes an untyped JSON field, and Settings renders the four counts plus every detail. The read path therefore scales with all stored diagnostic entries rather than with the small number of registered migrations.

### Persisted Evidence

The observed released data validates one consistent old family: exactly `scannedCount`, `migratedCount`, `skippedCount`, `failedCount`, and `details`. All counts were integers and all details used itemId/status/message with optional path fields. This supports one deterministic old-to-current transformation. Counts cannot be required to partition `scannedCount` because consolidation-style migrations count different source/target subjects.

### Log Reachability

The runner writes detail lines and the database stores the resulting path. Current product code does not open the file. Consequently, preserving the exact path string is meaningful audit evidence, but checking or rewriting historical files is not an in-scope supported behavior.

### Transition Boundary Choice

The current server calls Prisma `migrate deploy` before Prisma initialization and before the app-data runner. A new `AppDataMigrationDefinition` would have to operate while both the legacy `summary_json` and current summary meaning coexist, then a later deployment would still be needed to remove or rename the legacy field. The final proven Prisma/SQLite transaction is itself a durable registered migration boundary: it is timestamped, recorded by Prisma, and retained for direct/skip upgrades. It validates the known rows, rewrites the same nullable `TEXT` column in place, renames it to `summary`, and commits before any current reader starts. No table rebuild, mixed runtime, or legacy app-data-runner branch is needed.

### Canonical Production Data-Migration Convention Audit

The exact separate convention requested by the user is:

`autobyteus-server-ts/docs/design/production_data_migration_conventions.md`

It is linked from `autobyteus-server-ts/README.md` under **Production data migrations**. The transition was checked against its review checklist:

| Convention Check | Evidence / Design Result |
| --- | --- |
| Supported released sources explicit | Read-only inventory found 21 non-null values with the released five-field object; `NULL` is separately supported. Unsupported malformed/type/domain fixtures are rejected. |
| One deterministic current target | Each valid non-null source becomes exactly `Scanned {scanned}; migrated {migrated}; skipped {skipped}; failed {failed}.`; `NULL` stays `NULL`; the column becomes `summary`. |
| Legacy interpretation in one boundary | Only timestamped Prisma SQL knows `summary_json` and SQLite JSON paths. No current TypeScript reader, repository, API, or UI retains legacy knowledge. |
| Bounded transition work/evidence | SQL stages one migration ID plus four scalars per non-null migration record, does not load `details[]` into Node, and creates no per-item diagnostic result or log. |
| Exact scalar/storage validation | Staging requires `json_type='integer'`, SQLite integer storage, and nonnegative values; wrong type, fractional, negative, missing, and malformed fixtures all fail before mutation. |
| One SQLite recovery transaction | `BEGIN IMMEDIATE` encloses staging, update, rename, cleanup, and commit; invalid fixtures prove rollback and no staging residue. |
| Validate before destructive cleanup | All non-null rows enter checked staging before the source column is rewritten/renamed. |
| Source evidence retained on failure | Every invalid real-Prisma fixture retained the exact legacy column/value and non-summary metadata. |
| Final-state classification | Commit makes the current column/schema available before runtime; rollback leaves it unavailable, so existing Prisma startup failure and a corrected later release apply. |
| Forward-only runtime | Current repository/status/API/UI expose only `summary`; no dual reads/writes, missing-column branch, fallback parser, or summary-string parser is allowed. |
| Proportionate recovery | No bespoke journal, backup, filesystem change, migration-history repair, new retry action, or generic app-data fatal gate is added. |
| Real adapter/disposable proof | Prisma 5.22 disposable fixtures cover large/valid, null, fresh, wrong-type, negative, fractional, missing, and malformed cases; live user data was inspected read-only only. |

The convention's normal bounded-log preference also identifies a residual in the pre-existing `writeLog()` behavior. The user explicitly requires that runtime log to remain unchanged in this ticket. The new database transition itself emits no source-cardinality diagnostic log, and the preserved framework log is recorded as a separate requirement question rather than silently changed.

### Target Summary Construction

The summary is derived once by the runner from the four returned counts using `Scanned {scanned}; migrated {migrated}; skipped {skipped}; failed {failed}.` Definitions do not supply arbitrary summary strings. This makes the summary structurally cardinality-independent without a character cap and preserves the observed fact that the four counts are independent measures.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: `app_data_migration_records.summary_json`; 21 observed valid values totaling 31,383,761 characters, maximum 14,318,058, containing 212,008 details. Scalar status/error/path/timing columns are separate.
- Relevant code-model, serialization, semantic, or physical-store change: Replace the JSON document with one plain summary text column; remove database-resident details, the legacy JSON field, and any proposed parallel persisted count representation from the current model.
- Normal readers and writers, including unknown/extra-field behavior: Runner is the only production repository writer. Repository/runner/GraphQL/web are the supported reader chain. All observed released documents used exactly the known five fields.
- Representative direct-read or compatibility evidence: SQLite `json_extract` returned the four counts from both very large summaries without selecting/transmitting the detail array. Current code has no generic projection; it parses all JSON.
- Required semantics and invariants preserved by direct use: `No` — current JSON does not meet the target bounded/current contract and current code must not retain a legacy parser.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: SQLite app-data database; historical filesystem logs must not be transformed.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Required benefit is eliminating 31.38M characters of duplicate query-visible database details and allowing the current reader to load one summary string. Count values remain readable in that sentence; status/path/error and logs are untouched. The database engine parses and rewrites each legacy JSON value once inside a transaction, then renames the column. No table copy or forced `VACUUM` is needed; physical file shrink is not guaranteed.
- Existing migration framework or lifecycle constraints, only if migration may be required: Prisma schema deploy runs before Prisma initialization and the app-data runner and already has a platform-fatal failure boundary. The explicit transaction was proven through Prisma 5.22. Current `runPending()` lifecycle/recovery behavior remains separate and unchanged.
- Transition decision: `Migration Required` through one Prisma/SQLite schema migration; no registered app-data definition, no current legacy decoder, and no filesystem-log migration.

## Constraints / Dependencies / Compatibility Facts

1. Current application paths must not parse legacy JSON after the transition boundary.
2. Historical filesystem logs are out of scope for mutation.
3. The legacy database transition must follow project migration conventions and use one explicit SQLite transaction in the Prisma migration file.
4. The target should not introduce an additional orchestrator, bespoke journal, or speculative shutdown/corruption recovery.

## Open Unknowns / Risks

1. The refreshed base contains the completed token ticket and its recovery-action contract, but deliberately not its withdrawn audit compactor. This design must replace the generic JSON contract without restoring token-specific or historical-log machinery.
2. Final real Prisma/SQLite proof established the in-place validation/update/rename boundary, large mapping, index/metadata preservation, transaction, and rollback shape; implementation still needs repository-resident coverage with the real migration file and generated Prisma client.
3. All 16 registered definitions and 21 definition/helper files participate in the internal detail type, but that type remains the preserved log input. Broad definition adaptation is now explicitly out of scope.
4. Malformed/tampered legacy JSON is not an observed supported release shape. Transaction rollback preserves it, but Prisma reports `P3018` and current startup cannot continue; no automatic migration-history repair or legacy runtime fallback belongs in this ticket.
5. The canonical convention normally prefers bounded logs, while the current log writes every returned detail. The user explicitly preserved that log behavior and narrowed this ticket to removal of database/API/UI duplication. Record the tension as residual risk rather than redesigning logging without scope.
6. The in-place rewrite replaces large JSON values with short text, but the physical database file may not shrink immediately because forced `VACUUM` is intentionally out of scope.

## Notes For Architecture Reviewer

The user has approved the complete simplified package and has explicitly repeated that the separate canonical convention must govern the migration. Round-1 `AR-DI-001` is addressed by extending the production-path map from both startup and Settings/API retry through registry/policy, lock/stale-running, prerequisites, `markRunning`, execution, terminal fan-out, and completion/failure, with the unchanged log writer classified as a secondary/return path through stored `logPath`. Re-review must also verify the explicit canonical-convention mapping while preserving the simplest product boundary: keep the current definition result and full-detail `writeLog()` unchanged, persist/expose only the runner-derived summary string, and confine old JSON knowledge to timestamped Prisma migration SQL. Do not reintroduce count columns, a diagnostic sink, log caps, historical-log work, or current-runtime compatibility paths.
