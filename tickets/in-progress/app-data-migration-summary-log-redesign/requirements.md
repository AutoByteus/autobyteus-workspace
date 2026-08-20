# App-Data Migration Summary And Diagnostic Log Redesign — Requirements

## Status (`Refined`)

The user approved the refined direction in the current conversation: `summary_json` becomes one short summary string, the existing per-attempt log remains the sole full count/detail destination, numeric summary/error caps are unnecessary, and a small database migration script must transition released records. The latest clarification removes previously proposed count columns, definition-result refactoring, and log redesign. The user has now explicitly approved this simplified package for downstream review.

## Goal / Problem Statement

Redesign app-data migration outcome storage so the database contains only concise migration status information rather than source-cardinality-sized per-item diagnostics. A migration record should carry one short human-readable summary string, any concise terminal error, and a path to its detailed migration log. Execution counts exist only long enough to construct the string. Detailed entry-level diagnostics belong only in the migration's filesystem log.

The current `summary_json` design allows detailed per-item migration entries to be stored in a database column, making the alleged summary behave as a second log and allowing very large database/API/UI payloads. This ticket is independent of the completed token-usage one-row-per-canonical-agent-run change and is bootstrapped from the current `origin/personal` branch.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Migration execution persists a structured JSON summary containing counts and per-item details. | Persist one very short, deliberately constructed plain-text final summary plus the existing status/error/log-path metadata. Counts remain temporary execution data used to construct the string; they are not stored again as columns. | Migration status, attempt, timing, prerequisite, and retry evidence remains available. | REQ-001–REQ-006, REQ-019; AC-001–AC-006, AC-019 |
| BEH-002 | Supported status readers can deserialize and transmit the stored JSON summary, including all embedded detail entries. | Status APIs and settings UI consume only the current summary string and existing record metadata and never materialize per-item details from a database field. | Users can still see whether a migration succeeded, failed, or completed with warnings and can read the useful outcome counts in the summary sentence. | REQ-007–REQ-009; AC-007–AC-009 |
| BEH-003 | The runner writes counts and every returned item detail into a per-attempt log, while duplicating the same information into `summary_json`. Product code displays the path but does not read or transmit historical log contents. | Preserve the current per-attempt log contents and write path: counts plus every returned detail remain in the log. Stop copying the detail-bearing execution summary into the database. Historical logs remain untouched and no logging subsystem is redesigned. | The existing per-attempt log format/content and its database path remain available. | REQ-010–REQ-013; AC-010–AC-013 |
| BEH-004 | Released databases may contain legacy `summary_json` values, including very large values. | Legacy database records are deterministically transitioned to the current one-summary-string representation without rewriting historical filesystem logs or leaking legacy decoding into current application paths. | Existing migration terminal status and materially useful aggregate outcome evidence are preserved. | REQ-014–REQ-018; AC-014–AC-018 |

## Investigation Findings

1. The SQLite model contains one nullable `summary_json TEXT` column and no scalar count or text-summary columns.
2. `AppDataMigrationSummary` combines the four counts with `details: AppDataMigrationItemDetail[]`. On the refreshed design base, all 16 registered definitions and 21 migration/helper source files participate in the detail-bearing contract.
3. `AppDataMigrationRunner` serializes that entire object into `summary_json`, then serializes the same details again into a per-attempt log.
4. `AppDataMigrationRecordRepository.listRecords()` selects every full `summary_json` value before the runner filters the rows to registered definitions. `parseSummary()` parses the JSON in Node.js; GraphQL exposes it as `GraphQLJSON`; the web store and Settings component receive it and render expandable details.
5. Read-only inspection of the observed production database found 21 valid released-shape JSON summaries totaling 31,383,761 characters and 212,008 detail objects. The largest two summaries were 14,318,058 and 13,964,274 characters. Every inspected summary used exactly the five expected top-level fields.
6. The referenced provider-name log's first detail exactly matched the first database detail, confirming duplication. Product source only displays `logPath`; it has no reader for historical migration-log contents.
7. Aggregate counts are independent measures, not necessarily a partition: one observed migration scanned 158,025 source rows and migrated 1,283 target rows. The target must preserve each count without imposing `scanned = migrated + skipped + failed`.

## Relevant Supplemental Task Artifacts

None. The previously planned migration-definition adaptation matrix was removed after the user explicitly preserved the current definition result and log writer.

## Design Health Assessment (Mandatory)

- Change posture (`Behavior Change` / `Refactor` / `Performance`): The persisted contract and its readers/writers must change, while useful migration outcome observability is preserved.
- Initial design issue signal (`Yes`): A field named and consumed as a summary can contain unbounded per-item detail and duplicate the log.
- Root cause classification (`Boundary Or Ownership Issue` and `Missing Invariant`): Concise database status and detailed diagnostics are not separated, and no database-summary size/cardinality invariant is enforced.
- Refactor posture (`Bounded Refactor Needed`): Change the runner's persistence/status projection, repository/schema, API, and UI. Preserve shared definition outcome types and the current log writer.
- Evidence basis: Current code traces the full JSON through runner -> repository -> GraphQL JSON -> web store -> expandable UI. Read-only production inspection found 31,383,761 summary characters and 212,008 database-resident details across 21 rows; the same details are already present in referenced logs.
- Requirement or scope impact: This ticket owns the generic migration outcome representation and the required legacy database transition. It does not reopen token-ledger consolidation.

## Recommendations

1. Treat the database record as concise indexed/status evidence, not as a diagnostic document store.
2. Use one short plain-text summary rather than JSON or parallel persisted count columns for current records.
3. Keep counts and item-level diagnostic details in the referenced per-attempt log file using the existing writer and format.
4. Keep current application code forward-only; isolate legacy `summary_json` interpretation in the one Prisma/SQLite schema migration script, following the canonical `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` boundary.
5. Prefer one deterministic, proportionate database-only transition. Do not read, validate, rewrite, or compact historical log files, and do not add speculative filesystem recovery machinery.
6. Do not redesign the migration log or the definition result contract in this ticket. The runner continues writing the returned counts and details into the log; only database persistence/status projection changes.

## Scope Classification (`Small-to-Medium`)

The behavior is conceptually small but crosses a persisted schema, the migration runner, repository/domain contracts, GraphQL/status readers, and settings UI, and it requires an evidence-backed legacy-data transition.

## In-Scope Use Cases

1. A successful migration records one concise text summary, timestamps/status/attempt metadata, and a log path.
2. A migration with skipped or failed items records aggregate counts and concise outcome/error information without placing item details in the database.
3. The existing counts and detailed diagnostic entries remain available in the per-attempt migration log.
4. Migration status APIs and the settings UI display the concise current record without reading legacy JSON details.
5. Existing released records with `summary_json` are transitioned to the current representation through migration code.
6. Future migration implementations cannot accidentally make database status payload size proportional to source row count.
7. A migration with very many details may continue producing a correspondingly large attempt log, but its database result and API payload remain one short summary string; existing historical logs remain untouched.

## Out of Scope

1. Reopening or changing token-usage consolidation, one-row-per-canonical-agent-run storage, provider backfills, or token statistics semantics.
2. Rewriting, shrinking, parsing, relocating, or otherwise migrating existing historical filesystem log files.
3. Building a log browser, download workflow, search service, retention service, or log archival subsystem.
4. Bespoke handling for power loss, OS shutdown, device/kernel faults, hostile database tampering, arbitrary filesystem corruption, or adversarial concurrent writers.
5. Keeping current application readers compatible with the legacy `summary_json` shape after the transition boundary.
6. Changing migration registration order, prerequisites, retry eligibility, startup scheduling, or existing feature-specific fatal gates except where the new outcome field shape requires mechanical adaptation.
7. A general log browser, historical-path validation, repair of missing log paths, log rotation, retention, archival, or cross-attempt log compaction.
8. Changing the existing per-attempt log header/detail format, adding a generic cap/sampler, or refactoring registered migration definitions to stream diagnostics.

## Functional Requirements

- **REQ-001:** The current app-data migration record shall store a human-readable summary as plain text rather than a structured JSON document.
- **REQ-002:** Scanned, migrated, skipped, and failed counts remain in the existing internal execution summary and attempt log and are used by the runner to construct the canonical persisted summary. The database record, status API, and UI model shall not store or expose them again as separate fields.
- **REQ-003:** The current record shall preserve status, attempt count, start/completion timestamps, concise error information, and log path as first-class fields.
- **REQ-004:** For a returned terminal result, the generic runner shall construct the very short plain-text statistical summary `Scanned {scanned}; migrated {migrated}; skipped {skipped}; failed {failed}.` from the four aggregate counts. It shall not accept arbitrary summary content from a definition and shall not contain JSON, per-item details, serialized source rows, or exception dumps.
- **REQ-005:** The current database outcome written for one migration attempt shall remain independent of the number of scanned items. No arbitrary numeric summary or error-message length limit is introduced by this ticket; the structural rule is that summary and error strings must not be used as alternate diagnostic-document carriers.
- **REQ-006:** The transient scanned, migrated, skipped, and failed values are independent non-negative aggregate measures. Each migration shall define their subject consistently; the system shall not require them to form a mathematical partition.
- **REQ-007:** Supported migration-status API responses shall expose the current summary string and existing record metadata and shall not expose a legacy JSON summary, separate count fields, or database-resident per-item details.
- **REQ-008:** The settings UI shall present current migration status, the concise statistical summary string, error information, and log-path availability without depending on legacy detail arrays or separate count fields.
- **REQ-009:** Current application readers shall remain forward-only and shall not include compatibility parsing for released `summary_json` values.
- **REQ-010:** The current definition execution result may continue containing four counts and `details[]` for the runner's existing log writer. The runner shall write the counts and every returned detail to that attempt's filesystem log as it does today, but shall not persist or expose `details[]` in the database/status API.
- **REQ-011:** The database shall retain the path identifying the detailed log associated with the recorded attempt.
- **REQ-012:** The runner shall explicitly project the returned execution summary into two destinations: the existing full count/detail representation goes to the attempt log, while only the runner-formatted short summary string goes to the repository/status contract. No migration-definition signature or detail-construction refactor is required.
- **REQ-013:** This ticket shall not read, validate, rewrite, compact, relocate, or delete any pre-existing filesystem migration log. Existing `log_path` strings are preserved as historical evidence even when the referenced file is no longer present.
- **REQ-014:** Existing released database records containing `summary_json` require an explicit deterministic database-schema migration script to the current one-summary-string representation before current application code starts.
- **REQ-015:** The legacy transition shall preserve migration identity/display name, terminal status, attempts, timestamps, log path, error information, and the four aggregate values within the deterministic concise sentence. It shall not create separate count columns and shall remove database-resident item details.
- **REQ-016:** Legacy summary interpretation shall exist only inside the database-schema migration script and shall not be retained in the app-data runner, repository, API, UI, or any other current runtime code.
- **REQ-017:** The legacy transition shall run transactionally inside SQLite, extract the four legacy counts only to construct the target summary string, preserve all non-summary record evidence, and follow `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` without transporting legacy detail arrays into Node.js or adding speculative recovery machinery.
- **REQ-018:** If a released-shape database cannot complete the schema/data script, the transaction shall leave the legacy table and its evidence intact. Existing database-migration startup failure handling applies because the required current table shape is unavailable; the application shall not continue with a legacy runtime fallback.
- **REQ-019:** Existing app-data migration registration, prerequisite, attempt, stale-running, retry, scheduling, recovery-action, and feature-specific startup-gate semantics shall remain unchanged. The redesign uses the already-existing database-schema migration startup boundary and shall not add a new app-data-runner migration or a new generic app-data fatal gate.

## Acceptance Criteria

- **AC-001:** After a representative successful migration, direct database inspection shows one plain-text summary, no separate scanned/migrated/skipped/failed columns, and no current JSON detail document.
- **AC-002:** The summary exactly follows `Scanned {scanned}; migrated {migrated}; skipped {skipped}; failed {failed}.`, contains no JSON/detail/exception payload, and does not grow with the number of items in a large fixture.
- **AC-003:** Status, attempt, timestamp, error, and log-path values remain correctly recorded through success, warning, returned-failure, and unexpected-thrown-failure fixtures; a thrown failure preserves the current `emptySummary()` behavior and therefore stores/logs the canonical zero-count sentence alongside the error.
- **AC-004:** No current persisted migration outcome field contains per-item result arrays or serialized source records.
- **AC-005:** A migration with many skipped/failed items produces database evidence whose shape and summary size are independent of item count; no failure or truncation occurs merely because a summary or error crosses an arbitrary ticket-defined character threshold.
- **AC-006:** Representative success, warning, failure, and consolidation-style fixtures construct the correct summary from each independent non-negative execution count, including a valid fixture where `scannedCount` differs from `migratedCount + skippedCount + failedCount`.
- **AC-007:** The supported status API returns the current summary string and existing status metadata, with neither count fields nor item details.
- **AC-008:** The settings UI renders current status, the stored statistical summary with its four visible counts, error, and log-path availability without querying or expanding database-resident item details.
- **AC-009:** Static/code review evidence shows no legacy `summary_json` parser in current repository, GraphQL, store, or UI paths.
- **AC-010:** A migration producing representative item diagnostics writes the same counts and every returned detail to its referenced attempt log as before, and writes nothing item-level to the database/status API.
- **AC-011:** The stored log path identifies the corresponding per-attempt log.
- **AC-012:** A large migration fixture may return a detail collection to the runner for existing log serialization, but direct database/API inspection shows only the canonical summary string. The resulting attempt log retains the existing header/count/detail format.
- **AC-013:** Before/after evidence confirms existing historical log files are untouched and all pre-existing `log_path` strings are preserved without checking whether the files exist.
- **AC-014:** A released-shape database fixture with legacy `summary_json` is transformed by the Prisma/SQLite schema migration into the current single-text-summary representation before the current server runtime starts.
- **AC-015:** The transformed record preserves terminal status, attempts, timestamps, log path, concise error, and all recoverable aggregate values in the canonical summary sentence without separate count columns.
- **AC-016:** Current API/UI paths operate after transition without legacy JSON compatibility code.
- **AC-017:** A large legacy database fixture is transformed inside SQLite without selecting or materializing its source-cardinality-sized `details[]` in Node.js; this criterion does not change the existing runtime log size behavior.
- **AC-018:** An invalid legacy-shape fixture makes the transactional schema migration fail without dropping or partially replacing the legacy table; no current runtime fallback parses it.
- **AC-019:** Existing runner lifecycle tests continue to prove registration/prerequisite/attempt/stale-running/retry/recovery behavior, and source inspection proves no new app-data migration registration or generic app-data fatal gate was added.

## Constraints / Dependencies

1. Bootstrap base is the refreshed `origin/personal` commit recorded in `investigation-notes.md`.
2. The canonical `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`, linked from the README's **Production data migrations** section, governs the legacy data transition.
3. Current application code must use only the current schema/data contract; legacy knowledge belongs only to the Prisma/SQLite migration script.
4. The target must remain proportionate: normal SQLite transaction/rollback, the existing database-deployment failure path, and existing app-data retry semantics are sufficient at their respective boundaries; unsupported infrastructure/security failure premises must not drive new machinery.
5. The summary column name and diagnostic-writer interface are design decisions. The schema transition must complete in the existing Prisma deployment phase before the app-data runner uses the table. The design must not add parallel persisted count fields, reintroduce details through summary/error strings, or impose arbitrary numeric caps that are not required by the product contract.
6. The current full-detail log can grow with source cardinality, which is in tension with the convention's proportionate bounded-log default. The user explicitly preserved current log behavior for this ticket; changing generic logging, sampling, retention, rotation, or definition result construction is therefore outside scope and may be addressed separately.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: App-data migration record outcome columns in the application SQLite database, especially released `summary_json`; filesystem migration logs are referenced but not transformed.
- Required outcome (`Migration Required`): Transform legacy database summary data into the new one-summary-string current representation and remove database-resident detail content.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve terminal/status metadata, log path, error, timestamps/attempts, and the recoverable aggregate values inside the new summary sentence; do not create separate count columns or carry item-level details into current database fields; leave existing filesystem logs unchanged.
- Unacceptable data loss or corruption: Loss or alteration of migration status/attempt/timing identity, aggregate values represented in the concise sentence, concise terminal error, or the existing log-path reference; mutation of unrelated migration or application data.
- Relevant availability, maintenance-window, or rollout constraints: The schema migration transaction both transforms the released records and installs the forward-only table shape before server initialization. Failure leaves the old table intact and follows the existing database-migration fatal path because current columns are unavailable. No separate maintenance command or app-data-runner retry is introduced.
- Related requirement and acceptance-criteria IDs: REQ-014–REQ-018; AC-014–AC-018.

## Assumptions

1. There is one startup/app-data migration writer under normal operation.
2. Normal SQLite/filesystem behavior, stable process/device/power for a normal attempt, sufficient permissions, and readable/writable storage are operating prerequisites—not separate product recovery requirements.
3. An abrupt app-data attempt relies on the existing runner retry behavior; an interrupted database-schema transform relies on SQLite transaction rollback and the existing database-deployment failure path. Neither requires bespoke journals or lifecycle branches.
4. The database migration record is for compact product-visible status/audit evidence; detailed diagnostics are owned by the referenced log file.

## Risks / Open Questions

1. The current UI exposes item details. Their removal is intentional; the concise statistical summary string, status, error, and log path become the complete product-visible contract.
2. Details are not removed from the internal definition result in this ticket. The runner continues using that result to write the existing full-detail log; it simply stops serializing the same object into the database.
3. Rewriting the legacy JSON values in place before renaming the column logically removes the database-resident detail documents and frees pages for SQLite reuse; forced `VACUUM` and a guaranteed immediate reduction of the physical database file are outside this ticket.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| Concise successful outcome | REQ-001–REQ-006 |
| Warning or failed outcome | REQ-002–REQ-006, REQ-010–REQ-012, REQ-019 |
| Status API and settings UI | REQ-007–REQ-009 |
| Detailed diagnostic log | REQ-010–REQ-013 |
| Released-data transition | REQ-014–REQ-018 |

## Acceptance-Criteria-To-Scenario Intent

| Scenario | Acceptance Criteria |
| --- | --- |
| Normal small migration | AC-001, AC-003, AC-006, AC-007, AC-008 |
| Large migration with many item diagnostics | AC-002, AC-004, AC-005, AC-010–AC-012 |
| Legacy released database and rejected invalid fixture | AC-014–AC-018 |
| Historical filesystem logs | AC-013 |
| Forward-only current application | AC-009, AC-016 |
| Preserved runner/startup lifecycle | AC-019 |

## Approval Status

- Status: **Approved by user; ready for architecture re-review after the completed design-only `AR-DI-001` correction**
- User-approved direction: Independent ticket; `summary_json` becomes one short summary string; existing status/error/log-path metadata remains; no separate persisted count fields or entry-level details in the database/API/UI; detailed evidence belongs in the per-attempt migration log; use a migration script; keep the design simple.
- Incorporated user clarification: The summary is simply a deliberately constructed very short string with final/statistical meaning; item-level evidence belongs only in the per-attempt log; no arbitrary character cap applies to the canonical database summary or terminal database error. The current log and definition result remain unchanged: the log continues containing counts plus every returned detail. This ticket only stops duplicating that object into the database/API/UI.
- Routing instruction: The earlier hold for user review is satisfied; proceed to architecture review with the approved simplified package.
