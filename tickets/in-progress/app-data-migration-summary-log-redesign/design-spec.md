# App-Data Migration Summary Persistence Redesign — Design Spec

## Current-State Read

`AppDataMigrationDefinition.execute()` currently returns an `AppDataMigrationExecutionResult` whose `summary` contains four counts plus `details[]`. `AppDataMigrationRunner` uses that same object twice:

1. it serializes the entire object into `app_data_migration_records.summary_json`; and
2. it writes `statusSummary=<four counts>` plus every `details[]` entry into a timestamped per-attempt log.

The two destinations are not byte-identical, but they duplicate the same count/detail evidence. Repository reads select the entire JSON, the runner parses it, GraphQL publishes it as `GraphQLJSON`, and Settings renders both counts and expandable details.

Read-only inspection found 21 released records containing 31,383,761 JSON characters and 212,008 details; two rows exceed 13 MiB. A bounded comparison confirmed that an inspected database detail exactly matches its corresponding log detail. Product code displays `logPath` but does not read historical log contents.

The current definition result and `writeLog()` path already serve the desired detailed-log behavior. The defect is therefore the persistence/status projection, not definition execution or log construction.

Prisma `migrate deploy` runs before Prisma initialization and before `AppDataMigrationRunner.runPending()`. A small transactional Prisma/SQLite migration is the correct old-to-current boundary for existing rows. It is a durable, Prisma-registered migration boundary: legacy interpretation exists only in its timestamped SQL and the migration remains available for direct and skip-version upgrades. Revised real-Prisma probes validate SQL-side summary construction and rollback; implementation must use the final in-place form described below.

## Intended Change

1. Rename `summary_json` to nullable `summary TEXT` and rewrite each non-null released JSON value into one canonical sentence.
2. Keep `AppDataMigrationSummary`, `AppDataMigrationItemDetail`, definition signatures, count/detail construction, and the existing `writeLog()` content/format unchanged.
3. In the runner, format `result.summary` as `Scanned {scanned}; migrated {migrated}; skipped {skipped}; failed {failed}.` for database persistence, while passing the unchanged count/detail object to `writeLog()`.
4. Make repository/status/GraphQL/web models expose only the string summary for this field. Remove JSON parsing and expandable database-detail presentation.
5. Preserve status, attempts, timestamps, error, log path, registration, prerequisites, retry, scheduling, and recovery behavior.
6. Do not read, validate, rewrite, truncate, cap, or otherwise change existing or newly written migration log files in this ticket.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent | Current Path | Target Path / Outcome | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–REQ-006, REQ-019; AC-001–AC-006, AC-019 | Startup `runPending()` or an allowed Settings/API retry enters registry selection, in-flight/record-lock, prerequisite, `markRunning`, definition execution, full-log creation, and terminal record completion; the terminal record stores the rich JSON | Both supported initiators and the complete runner lifecycle remain unchanged through definition execution. At the existing destination split, the runner persists one sentence while the unchanged log branch returns a `logPath` that is stored with the terminal record | DS-001, DS-002, DS-003 |
| BEH-002 | User/API | REQ-007–REQ-009; AC-007–AC-009 | Repository full JSON -> runner parse -> GraphQL JSON -> UI counts/details | Settings/API query -> runner/repository string -> GraphQL String -> UI string; no persisted details or recovery inference | DS-005 |
| BEH-003 | Operational | REQ-010–REQ-013; AC-010–AC-013 | A returned result or thrown-error `emptySummary()` enters `writeLog()`; the runner writes the count header plus every detail/error and stores the resulting `logPath` during completion/failure | The same execution summary/error reaches the same writer and file format; its returned `logPath` is stored on the same terminal record while only database detail duplication is removed | DS-003 |
| BEH-004 | Upgrade | REQ-014–REQ-018; AC-014–AC-018 | Released rows contain five-field `summary_json` | Transaction validates four values, formats one string, renames the column, and commits before runtime | DS-004 |

## Relevant Supplemental Task Artifacts

None. The earlier definition-adaptation matrix was removed after the user clarified that definition results and log generation remain unchanged.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`, `Local Refactor`, and `Performance`.
- Current design issue found: `Yes`.
- Root cause: the runner persists its log input as the product summary instead of projecting a concise status string.
- Refactor needed now: `Yes, but bounded to persistence/status projection`.
- Required refactor: repository/schema, runner persistence/read mapping, GraphQL, and Settings.
- Refactor explicitly not needed: all registered migration definitions, their helpers/count semantics, and the existing log writer.
- Residual risk: the existing full-detail log can grow with source cardinality, which is in tension with the repository convention's normal bounded-log default. The user explicitly preserved that behavior; a generic log/sampling redesign is outside this ticket.

## Terminology

- **Execution summary:** existing internal `AppDataMigrationSummary` containing four counts and `details[]`; used by definitions and `writeLog()` only.
- **Persisted summary:** one runner-formatted text sentence stored in `summary` and exposed through the status API/UI.
- **Attempt log:** existing file containing migration identity, `statusSummary` counts, error, and every returned detail.

## Design Reading Order

The persisted transition is described first, followed by runtime ownership, interfaces, file changes, removals, sequencing, and risks.

## Legacy Removal Policy (Mandatory)

- Policy: `No current-runtime legacy compatibility.`
- Remove current `summaryJson` record/status fields, `parseSummary()`, `JSON.stringify(result.summary)` for database persistence, GraphQL `GraphQLJSON` for this field, frontend count/detail models, and expandable database-detail UI.
- Retain internal `AppDataMigrationSummary`, `AppDataMigrationItemDetail`, `emptySummary()`, definition result shapes, detail builders, and `writeLog()` because they remain the current log-production contract.
- The literal `summary_json` and legacy JSON paths remain only in the timestamped Prisma migration SQL.
- Do not add dual fields, read-old fallbacks, optional-column branches, or summary-string parsing.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: `app_data_migration_records.summary_json` in the operational SQLite database.
- Representative volume: 21 non-null released-shape rows, 31,383,761 characters, 212,008 details, maximum 14,318,058 characters.
- Target: the same table with `summary TEXT`; all other columns unchanged.
- Required semantics: preserve each row's identity, display name, status, attempts, timestamps, error, log path, and four aggregate values as readable text. Database-resident `details[]` is intentionally removed because the referenced log already contains it.
- Decision: `Migration Required`.
- Rationale: renaming alone would leave JSON text in a field consumed as plain text. A small SQL rewrite is required. It belongs in the timestamped Prisma migration because the same atomic operation changes the app-data runner ledger's column contract before the current repository and `runPending()` may use it; no filesystem migration or new `AppDataMigrationDefinition` is needed.

### Migration Plan

- Owner/file: `autobyteus-server-ts/prisma/migrations/20260820090000_redesign_app_data_migration_summary/migration.sql`.
- Trigger: existing startup `prisma migrate deploy`.
- Boundary: one explicit SQLite transaction.
- Validation: a temporary validation table receives the four extracted values plus their `json_type`; checks require JSON integer source types, SQLite integer values, and nonnegative values.
- Transformation: update each non-null `summary_json` with `printf('Scanned %d; migrated %d; skipped %d; failed %d.', ...)` using its validated row.
- Schema contraction: rename `summary_json` to `summary` after the update.
- Cleanup: drop the validation table before commit.
- Null behavior: leave `NULL` as `NULL`.
- Failure behavior: malformed/type/domain/DDL failure rolls the transaction back, preserving the original column and JSON values. Existing Prisma startup failure applies; no runtime fallback is added.
- Filesystem behavior: copy/change nothing; `log_path` and every historical log remain untouched.

| Step | Action | Validation | Failure Result |
| --- | --- | --- | --- |
| 1 | `BEGIN IMMEDIATE` | Single-writer transaction acquired | No mutation |
| 2 | Populate validation table from each non-null legacy JSON | Exact JSON integer type and nonnegative SQLite integer checks | Rollback preserves JSON/source column |
| 3 | Update `summary_json` in place to canonical sentences | One validated staging row per non-null record | Rollback preserves all original values |
| 4 | Rename column to `summary` | SQLite DDL succeeds | Rollback restores old name/values |
| 5 | Drop validation table and commit | No staging residue | Atomic current schema or original schema |

The migration does not rebuild the table, create count columns, load JSON into Node.js, or touch filesystem logs.

### Production Data-Migration Convention Mapping

Governing sources:

- `autobyteus-server-ts/README.md`, **Production data migrations**; and
- `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` (canonical).

The canonical document requires old-to-current knowledge to live in a durable registered migration boundary. For this self-hosting table change, that boundary is the timestamped Prisma migration recorded by `prisma migrate deploy`, not a new app-data-runner definition. The affected table is the runner's own ledger, the current repository requires the renamed field, and Prisma deployment already precedes Prisma initialization and `runPending()`. Splitting the change into an app-data definition would introduce an unnecessary mixed old/current schema and later contraction. The single atomic validate/update/rename migration reaches the same convention goal without any current-runtime legacy branch.

| Canonical Convention | Design Compliance |
| --- | --- |
| Known supported source -> one fixed target | Released non-null values must have exactly usable nonnegative integer counts; each becomes the fixed canonical sentence. `NULL` remains `NULL`. |
| One migration-owned legacy boundary | Only the timestamped Prisma SQL names `summary_json`, calls SQLite JSON functions, or knows the old five-field document. The migration remains in history for direct/skip upgrades. |
| Validate before mutation; explicit unsupported disposition | Validation staging checks every non-null row before update/rename. Malformed, missing, wrong-type, fractional, or negative counts abort rather than being guessed/coerced. |
| Bound reads, results, validation, diagnostics, and migration logs | SQL processes the finite migration-record table in-engine, stages only identity plus four scalars per non-null record, never transports `details[]` into Node, and emits no per-item migration diagnostic/log payload. The separately preserved runtime attempt-log behavior is not produced by this schema transition and remains an approved out-of-scope framework residual. |
| One real SQLite recovery transaction | `BEGIN IMMEDIATE` through validation, update, rename, staging cleanup, and commit; interruption or statement failure rolls back. |
| Retain source evidence on failure | Update and rename occur only after staging succeeds; any failure restores the original column name and values with no staging residue. |
| Exact database/storage/transport semantics | `json_type` must be `integer`; staged SQLite values must have integer storage and be nonnegative. No `Number`, `parseInt`, permissive coercion, or Node legacy decoder exists. |
| Real adapter proof; never live mutation | Prisma 5.22 disposable fixtures cover large, `NULL`, fresh, malformed, missing, wrong-type, fractional, and negative cases. Live profile inspection was read-only. |
| Final-current-state classification and retry | A commit establishes the current `summary` schema before runtime. A failure leaves the required current schema unavailable, so existing Prisma startup failure applies; recovery is a corrected release/deploy, with no legacy fallback or bespoke journal. |
| Forward-only runtime and proportionate recovery | Repository/runner/API/UI know only `summary`; no dual reader/writer, optional-column branch, historical decoder, filesystem rewrite, backup state machine, or new recovery action is added. |

## Data-Flow Spine Inventory

| Spine ID | Class | Supported Initiating Trigger | Meaningful Outcome / End | Governing Owner | Relationship |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary runtime — startup execution | Server bootstrap invokes `runPending()` after Prisma/vault initialization | Required definitions are skipped when already terminal or pass the preserved runner lifecycle and finish with a terminal current record containing the concise summary and stored log path | `AppDataMigrationRunner` | Converges with DS-002 at `runDefinition()`; emits DS-003 after definition return/throw |
| DS-002 | Primary runtime — manual retry | Settings dispatches its enabled Retry action, or an API client calls GraphQL `runAppDataMigration`, for an `ANYTIME` definition whose server-owned action is `MANUAL_RETRY` | The same lifecycle produces and returns the refreshed terminal current status; `STARTUP_ONLY` and other ineligible actions remain rejected/disabled exactly as today | `AppDataMigrationRunner` | Converges with DS-001 at `runDefinition()`; emits DS-003 after definition return/throw |
| DS-003 | Secondary / return — attempt-log evidence | DS-001 or DS-002 obtains a returned execution summary, or the existing catch path creates `emptySummary()` plus an error | The unchanged timestamped attempt file is created and its returned `logPath` is stored on `complete()`/`markFailed()` and later exposed as metadata | `AppDataMigrationRunner` | Attached branch of both runtime primary spines; `writeLog()` remains its owned internal node |
| DS-004 | Primary pre-runtime upgrade | New release bootstrap runs `prisma migrate deploy` against a released or fresh schema | Atomic current `summary` column/data is available before Prisma/current runtime, or deployment fails with the legacy table/evidence rolled back intact | Timestamped Prisma migration SQL | Precondition for DS-001, DS-002, and DS-005 |
| DS-005 | Primary status read | Settings opens Server Migrations or an API client requests migration statuses | Current string summary plus existing status/error/log-path/recovery metadata reaches the UI/client; no JSON/details are materialized | `AppDataMigrationRunner` | Read-only transport through repository, GraphQL, store, and UI |

## Primary Execution Spine(s)

- DS-001: `server bootstrap -> runPending() -> registry order/required/terminal selection -> runDefinition() -> in-flight + record-lock/stale-running check -> prerequisites -> markRunning() -> definition.execute() -> runner destination split -> DS-003 logPath -> complete(summary string, logPath)`; the existing thrown-error branch is `emptySummary() -> DS-003 -> markFailed(zero-count summary, error, logPath)`.
- DS-002: `Settings enabled Retry -> GraphQL runAppDataMigration -> runner.runMigration() -> registry lookup/execution-policy check -> the same runDefinition()/lock/prerequisite/markRunning/execute/destination-split lifecycle -> returned current status -> store/UI`.
- DS-003: `returned result.summary(counts + details) or thrown-error emptySummary + error -> existing writeLog() -> unchanged attempt file -> returned logPath -> complete()/markFailed() terminal record`.
- DS-004: `server bootstrap -> prisma migrate deploy -> validate/update/rename transaction -> current runtime`.
- DS-005: `Settings/API query -> GraphQL -> runner.listStatuses() -> repository summary string -> current recovery projection -> GraphQL String -> store/UI`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Preserved Boundary |
| --- | --- | --- |
| DS-001 | Startup scheduling remains the supported automatic initiator. The runner preserves registry order/selection, terminal skip, in-flight and stale-running behavior, prerequisite checks, attempt marking, definition execution, thrown-error handling, and terminal status semantics. Only the terminal repository payload changes from rich JSON to the formatted sentence; DS-003 supplies the same stored `logPath`. | Registration, prerequisites, attempts, stale-running, scheduling, feature gates, and recovery classification remain unchanged. |
| DS-002 | The existing Settings/API manual-retry surface remains an independent supported initiator. GraphQL delegates to `runMigration()`, server-owned execution policy still rejects `STARTUP_ONLY`, and eligible work converges on the same runner lifecycle and destination split as startup. | UI dispatch eligibility and server-owned recovery action remain unchanged; no new retry route exists. |
| DS-003 | After either primary runtime initiator reaches a returned result—or the existing catch path supplies `emptySummary()` and an error—the runner calls the same log writer, obtains the same timestamped path, and supplies that path to `complete()`/`markFailed()`. | Log content/order, file naming, write timing, thrown-error zero summary, and stored `logPath` remain unchanged. |
| DS-004 | Prisma-registered SQL validates known released JSON, rewrites the column in place, renames it, and commits before Prisma/runtime initialization. | All legacy knowledge remains in the durable migration SQL; failure uses existing deployment recovery. |
| DS-005 | Status reads select a small text field and existing metadata; the runner remains the status/recovery authority and GraphQL/web only transport/render the result. | Recovery policy remains server-owned; no JSON parse, detail transport, or client inference occurs. |

## Spine Actors / Main-Line Nodes

- server bootstrap / `runPending()` initiator
- Settings retry / GraphQL `runAppDataMigration` initiator
- `AppDataMigrationDefinition` (unchanged)
- `AppDataMigrationRunner`
- `AppDataMigrationRecordRepository`
- Prisma/SQLite migration boundary
- GraphQL app-data migration resolver
- web store and `ServerMigrationsManager.vue`

## Ownership Map

| Owner | Owns | Does Not Own |
| --- | --- | --- |
| Definition | Existing transformation, counts, details, status/error | Persistence wording or schema |
| Runner | Summary formatter, destination split, lifecycle, existing log writer | Migration-specific count/detail semantics |
| Repository | String summary and existing metadata CRUD | JSON parsing or logging |
| Prisma SQL | Released JSON validation/update/rename | Runtime compatibility or filesystem logs |
| GraphQL/web | String transport/presentation | Legacy parsing or log reading |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner | Preserved Rule |
| --- | --- | --- |
| `AppDataMigrationResolver` | Runner | Delegates status/retry; no repository access |
| `useAppDataMigrationsStore` | GraphQL status contract | Holds string summary; does not infer recovery |
| `runMigrations()` | Prisma engine | Runs SQL before current runtime |

## Removal / Decommission Plan (Mandatory)

| Remove | Replacement |
| --- | --- |
| Current `summary_json` column/model field | `summary TEXT` |
| Record/status `summaryJson` | `summary: string | null` |
| Runner `parseSummary()` | Direct repository string |
| Database `JSON.stringify(result.summary)` | `formatAppDataMigrationSummary(result.summary)` |
| GraphQL `GraphQLJSON` summary | Nullable `String` |
| Frontend summary counts/details and expandable list | Render stored string |
| `server-runtime.ts` diagnostic access to `summary.failedCount` | Omit that diagnostic property; status/error/log path remain |

## Return Or Event Spine(s) (If Applicable)

DS-003 is the secondary/return path attached to both DS-001 and DS-002. The returned definition object is preserved. At the runner-owned terminal split:

- counts -> canonical persisted summary string;
- counts + every detail -> unchanged attempt log -> returned `logPath`;
- summary string + returned `logPath` + existing status/error/timestamps -> `complete()` terminal record.

On thrown failure, the existing catch path supplies `emptySummary()` plus the error to DS-003, then `markFailed()` stores the corresponding zero-count canonical sentence, error, and returned `logPath`, matching the meaning of existing released failure records.

## Bounded Local / Internal Spines (If Applicable)

No new bounded-local logging spine is introduced. The existing `writeLog()` builds and writes the log exactly as today. Its source-cardinality behavior is recorded as an explicit out-of-scope residual rather than silently redesigned.

## Off-Spine Concerns Around The Spine

| Concern | Owner | Target |
| --- | --- | --- |
| Summary formatting | Runner-owned pure helper | Fixed sentence from four counts only |
| Existing log serialization | Runner `writeLog()` | No change |
| Persistence | Repository | String summary only |
| Upgrade validation | Prisma SQL | Exact old-count validation before update |
| Presentation | GraphQL/web | String only |

## Ownership Boundaries

- Definitions keep their current imports, signatures, details, and tests unless mechanical status-type changes require fixture updates.
- Runner alone decides that the database gets the formatted string while the log gets the full execution summary.
- Repository cannot accept execution-summary objects or JSON.
- Current TypeScript cannot reference `summary_json` or parse legacy JSON.
- Web code cannot read migration log files.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden Bypass |
| --- | --- | --- |
| Runner | formatter, repository call, existing log call | Definitions formatting/persisting summary |
| Repository | current SQL mapping | JSON input or legacy column query |
| Prisma migration | old JSON validation/update/rename | runtime old/current branching |
| GraphQL resolver | current status projection | direct repository/legacy access |

## Dependency Rules

1. Startup and GraphQL depend on the runner public API.
2. Runner depends on unchanged definitions, repository, and the pure formatter.
3. Repository depends on current summary-string snapshots and Prisma only.
4. Only timestamped SQL knows `summary_json`.
5. GraphQL/web expose no count/detail fields for the persisted summary.
6. Existing `writeLog()` must receive the original execution summary unchanged.

## Interface Boundary Mapping

| Interface | Target Responsibility | Shape |
| --- | --- | --- |
| `AppDataMigrationDefinition.execute()` | Existing migration execution | Unchanged `status + AppDataMigrationSummary + error` |
| `formatAppDataMigrationSummary(summary)` | Construct stored prose | `AppDataMigrationSummary -> string` but reads counts only |
| `repository.complete(...)` | Persist terminal record | `summary: string`, never JSON/details |
| `repository.markFailed(...)` | Persist thrown failure | zero-count formatted summary + error/path, matching current outcome meaning |
| `runner.listStatuses()` | Current status collection | string summary + existing metadata |
| GraphQL query/mutation | Transport status | nullable `String` summary |

## Interface Boundary Check

| Interface | Singular? | Correction |
| --- | --- | --- |
| Definition result | Yes for execution/log evidence | Preserve unchanged |
| Formatter | Yes | Accept no arbitrary prose |
| Repository | Yes | Remove JSON/detail inputs |
| GraphQL | Yes | Replace JSON with String |

## Main Domain Subject Naming Check

`AppDataMigrationSummary` remains an internal execution/log structure for compatibility with existing definitions. The persisted record field `summary` always means human-readable text. Do not export the internal structure through the status API.

## Existing Capability / Subsystem Reuse Check

- Reuse the current runner lifecycle and `writeLog()`.
- Reuse the current Prisma startup deployment boundary.
- Reuse the current repository, GraphQL, store, and Settings locations.
- Add no diagnostic sink, logging folder/service, or migration-definition adapter.

## Subsystem / Capability-Area Allocation

| Area | Decision |
| --- | --- |
| Prisma schema/migration | Rename/rewrite summary field |
| Runner | Add pure format/projection; preserve logging |
| Repository | String summary CRUD |
| Definitions/helpers | No change |
| GraphQL/web | String summary; remove count/detail projection |

## Draft File Responsibility Mapping

| File/Area | Change |
| --- | --- |
| `prisma/migrations/20260820090000_redesign_app_data_migration_summary/migration.sql` | Transactional validate/update/rename |
| `prisma/schema.prisma` | Map current `summary` only |
| `domain/app-data-migration-types.ts` | Keep execution summary/detail; change record/status summary fields to string |
| `domain/app-data-migration-summary-formatter.ts` | Pure fixed formatter |
| `app-data-migration-runner.ts` | Remove parser/DB JSON serialization; split string persistence from unchanged log input |
| `repositories/app-data-migration-record-repository.ts` | Select/write `summary` |
| `server-runtime.ts` | Remove old JSON `failedCount` diagnostic projection |
| GraphQL query/mutation/generated files | `summary: String`; no count/detail fields |
| web store/component/locales | Render string; remove expandable details/count formatting |
| registered definitions/helpers | No source changes expected |

## Reusable Owned Structures Check

- Reuse existing `AppDataMigrationSummary` only inside execution/logging.
- Add one pure formatter; do not add a second persisted count representation.
- Current record/status snapshot carries `summary: string | null` only.
- The same field must not be represented simultaneously as JSON and string.

## Shared Structure / Data Model Tightness Check

| Structure | One meaning per field? | Overlap risk | Corrective action |
| --- | --- | --- | --- |
| Internal `AppDataMigrationSummary` | Yes inside execution/logging | Could leak back into status | Repository/API types cannot accept it |
| Persisted/status `summary` | Yes: human-readable text | Could be confused with internal type | Type it as `string | null` and never parse it |
| Prisma `summary` column | Yes: current text only | Legacy JSON residue | One-time SQL rewrite before rename |

## Final File Responsibility Mapping

The draft mapping above is final for implementation. Registered definition/helper files are verification-only and must remain unchanged unless an unavoidable mechanical compilation correction is documented.

## Applied Patterns (If Any)

- **Projection at owner boundary:** runner derives compact persistence from a richer internal result.
- **Forward-only schema migration:** old JSON is interpreted only in timestamped SQL.
- **Preserved off-spine behavior:** existing detailed logging remains untouched.

## Target Subsystem / Folder / File Mapping

No new folder is needed. The formatter belongs with app-data migration domain/runtime helpers; migration SQL, runner, repository, GraphQL, and web files remain in their established folders.

## Folder Boundary Check

The simplified change does not justify a new logging or adapter folder. Historical SQL remains under `prisma/migrations`; current runtime remains under the existing app-data migration subsystem.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

```text
server bootstrap -> runPending() ------------------\
                                                    -> runDefinition -> lock/stale check -> prerequisites -> markRunning -> execute
Settings/API -> GraphQL runAppDataMigration() -----/
  returned result -> format short summary -------------------------------\
                 \-> unchanged writeLog() -> attempt file -> logPath -----> complete(summary, logPath)
  thrown error -> emptySummary() -> unchanged writeLog() -> logPath ------> markFailed(zero-count summary, error, logPath)
```

```ts
const executionSummary = result.summary; // counts + details, unchanged
const persistedSummary = formatAppDataMigrationSummary(executionSummary);
const logPath = await this.writeLog(definition, executionSummary, errorMessage);
await repository.complete({ summary: persistedSummary, logPath, ... });
```

Good persisted value:

```text
Scanned 158025; migrated 1283; skipped 17; failed 2.
```

Avoid: JSON, details, source rows, exception dumps, or parsing the sentence back into counts.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep `summary_json` and project at read time | Rejected | One-time SQL rewrite/rename |
| Dual JSON/string fields | Rejected | Current string only |
| Parse summary string for counts | Rejected | Status/error/log path for current consumers; counts remain internal during execution |
| Refactor all definitions/direct log streaming | Rejected for this ticket | Preserve existing result and `writeLog()` |
| Change/cap current log | Rejected for this ticket | Preserve current full-detail log behavior |
| Rewrite historical logs | Rejected | Touch no filesystem logs |

## Derived Layering (If Useful)

- Deployment: bootstrap -> Prisma -> historical SQL -> current summary column.
- Runtime initiation: bootstrap `runPending()` or Settings/API `runMigration()` -> shared runner lock/prerequisite/attempt lifecycle -> definition.
- Runtime return: definition result or thrown-error `emptySummary()` -> unchanged log/`logPath` branch + formatter/repository terminal record.
- Transport: runner status -> GraphQL -> store -> Settings.

## Change / Refactor Sequence

1. Add the timestamped validate/update/rename Prisma migration and update `schema.prisma`.
2. Add the pure fixed summary formatter.
3. Change record/repository fields from `summaryJson` to `summary` string.
4. Update runner persistence and status projection while leaving `writeLog()` and definition calls unchanged.
5. Remove the diagnostic-only `server-runtime.ts` count extraction.
6. Change GraphQL summary from JSON to String and regenerate client output.
7. Update the web store/UI/locales to render the string and remove count/detail expansion.
8. Update focused tests for migration SQL, formatter, repository, runner fan-out, API/UI contract, and unchanged log output.
9. Prove no current `summary_json` reference remains outside historical SQL and no definition/helper file changed unnecessarily.

## Key Tradeoffs

- Keeping the rich internal result preserves every existing migration and log with minimal risk, while the runner projection permanently prevents database duplication.
- The existing log may remain large, but changing it would be a separate behavior change contrary to the user's clarified scope.
- In-place update/rename is smaller than a table rebuild because the physical type remains nullable `TEXT` and no count columns are added.

## Risks

1. **Destination mix-up:** runner might still serialize JSON to the repository. Mitigation: repository accepts `summary: string` only and tests assert exact content.
2. **Log regression:** simplifying persistence might accidentally remove detail lines. Mitigation: golden test proves unchanged count header and every returned detail.
3. **Legacy validation:** `printf` could coerce wrong JSON types. Mitigation: transaction-local source-type/value validation before update.
4. **Generated/UI drift:** JSON/count/detail shapes could remain in generated or store code. Mitigation: regeneration plus static searches.
5. **Large existing logs:** explicitly preserved and not solved by this ticket.
6. **Physical SQLite size:** rewriting rows frees old payload pages logically but may not immediately shrink the file; no forced `VACUUM`.

## Guidance For Implementation

- The formatter reads only the four counts and has no length threshold.
- Preserve independent count semantics; do not require a partition equation.
- Do not edit registered definition/helper implementations unless a mechanical type-only compilation fix is unavoidable; no behavioral refactor is intended.
- Keep `writeLog()` output ordering and fields unchanged: migration ID, display name, count `statusSummary`, error, `details=`, every JSON detail, final newline.
- The repository, status snapshot, GraphQL, and web model contain no persisted counts/details.
- Use an explicit SQLite transaction and temporary validation table for the released JSON rewrite, then rename the column and remove staging.
- Do not touch historical logs, add a sink/sampler/cap, create count columns, parse the new summary, add dual readers/writers, or add a registered app-data migration.
