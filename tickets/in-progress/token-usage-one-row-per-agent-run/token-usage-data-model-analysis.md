# Token Usage Data-Model And Migration Analysis

## Status And Purpose

- **Status:** Investigation evidence/context updated through the successful corrected live consolidation, the `DR-006` terminal-audit requirement gap, and `ARCH-REV-008` / `AR-005` runner-reachability analysis; Option A remains approved.
- **Purpose:** Explain the verified current model, why it grows without bound, why a naive latest-row upsert is insufficient, bounded reconciliation, released source-shaping failures, the failed-consolidation replay seam, the Prisma/SQLite scalar-transport defect, the supported already-terminal audit residue, and the period-statistics decision that constrains the design.
- **Authority:** This file supports the requirements and investigation notes. Intended behavior remains authoritative in `requirements.md`; migration operating assumptions and the reachability/anti-overengineering boundary are authoritative in [`data-migration-conventions.md`](./data-migration-conventions.md).

## Executive Finding

The report is correct: the durable model is wrong for the desired product invariant. AutoByteus persists an 83-column immutable event for every usage update and reconstructs run state by summing events. On the representative local production database, 154k rows for 1,269 runs consume about 774.5 MiB including indexes. Roughly 475 MiB is repeated raw/pricing JSON.

However, the incoming data is not uniformly cumulative. Codex supplies cumulative snapshots; native AutoByteus and Claude currently supply deltas. The correct target is therefore one **cumulative run record** whose owner folds normalized observations atomically—not a blind `upsert(... update: latestPayload)`.

## Verified Current Production Spine

`Runtime token notification -> runtime adapter -> AgentRun event pipeline -> context/component/delta/cost enrichment -> TokenUsageEventPersistenceProcessor -> TokenUsageLedgerStore -> SqlTokenUsageLedgerRepository.create -> token_usage_ledger_events`

Return/read spines:

- `Token Meter websocket listener <- enriched TOKEN_USAGE_UPDATED event` (live, before durable completion).
- `GraphQL run/team summary -> TokenUsageLedgerStore -> list event rows -> buildTokenUsageRunSummary -> sum deltas/costs`.
- `Settings statistics -> listEventsInPeriod(observed_at) -> group event rows by root/run or runtime/model -> sum deltas/costs`.

## Current Stored Shape

The current row combines distinct concerns:

1. event identity/idempotency;
2. run/root/task/display attribution;
3. runtime/model/provider identity;
4. reported source values;
5. delta-normalized accounting components;
6. raw event and raw usage JSON;
7. pricing inputs and a full pricing snapshot JSON;
8. derived component/total costs;
9. latest prompt/context pressure;
10. cumulative-source reconciliation links.

This wide mixed subject is why event frequency directly multiplies storage.

## Representative Local Data Evidence

Source: read-only aggregate queries against `/Users/normy/.autobyteus/server-data/db/production.db`. The application was active, so row counts advanced slightly between queries; values are intentionally reported as approximate/current observations rather than immutable fixture claims.

| Measure | Observation |
| --- | ---: |
| Database file | ~806 MiB |
| Ledger rows | ~154,100 |
| Distinct run IDs | 1,269 |
| Average / maximum rows per run | 121.43 / 4,499 |
| Codex cumulative snapshot rows | ~148,400 |
| Native AutoByteus per-call rows | 4,908 |
| Claude per-turn rows | 52 |
| Ledger table pages | ~690.1 MiB |
| Ledger table + index pages | ~774.5 MiB |
| Raw event JSON | ~231.3 MB decimal bytes |
| Raw usage JSON | ~21.8 MB decimal bytes |
| Pricing snapshot JSON | ~239.2 MB decimal bytes |
| Current full-row selected text | ~635.8 MiB |
| Current null-name candidate selected text | ~620.8 MiB |
| Null-name candidate rows | ~149,200 |
| Actually eligible null-name AutoByteus rows | 0 in this current sample |
| Runs crossing UTC dates | 228 (maximum 8 days) |
| Runs with >1 cumulative snapshot series | 2 (maximum 3) |
| Runs with >1 price/status tuple | 48 (maximum 3) |
| Runs with >1 runtime/model tuple | 0 in this sample |

The report's 147,373 rows / ~653 MiB / ~584.7 MiB selected text is consistent with this independently observed, slightly later/larger state.

## Incoming Update Semantics

| Runtime path | Current scope | Source meaning | Correct one-row fold |
| --- | --- | --- | --- |
| Native AutoByteus | `per_call` | One model-call delta | Add normalized component/cost deltas atomically |
| Claude Agent SDK | `per_turn` | One terminal-result delta | Add normalized component/cost deltas atomically |
| Codex with `tokenUsage.total` | `cumulative_snapshot` | Cumulative thread/series snapshot; `last` supplies baseline/validation | Compare with the stored checkpoint for that series, add only non-regressing advancement, update checkpoint atomically |
| Codex fallback without `total` | `per_call` | Provider `last` delta | Add normalized delta atomically |

### Why “latest payload wins” is incorrect

- It would overwrite earlier native/Claude deltas.
- The current persisted Codex accounting columns are per-snapshot **deltas**, not lifetime totals; selecting the latest legacy row loses earlier usage.
- First Codex attachment may baseline from provider `last` rather than charge the full existing thread total, so the run's accounted lifetime total is the sum of admitted deltas, not necessarily the latest reported provider total.
- A run may have more than one snapshot series; checkpoints must be per series even though the authoritative record is per run.
- Cost totals may span more than one price tuple. Replacing with the latest event cost/price produces an incorrect lifetime cost or false unit-price explanation.

### Bounded cumulative-series reconciliation

Current Codex emits `snapshot_series_key = codex_thread:${threadKey}`. The supported topology is one Codex thread/series for one canonical run; representative legacy data contained only two multi-series runs and a maximum of three, attributable to restart/resume/rebinding. A hard capacity of eight checkpoints is therefore a conservative supported envelope rather than a claim that distinct provider strings can grow forever.

The target stores `sha256(UTF-8 exact snapshot_series_key)` rather than the raw opaque key, at most eight fixed-shape checkpoints, and no more than 16 KiB of encoded checkpoint JSON. Each checkpoint contains source token counters and a last-admission marker (legacy epoch/row ID or current epoch/fold revision). On admission of a ninth distinct digest, the fold deterministically evicts the least-recently admitted checkpoint (digest as stable final tie-break), inserts the newcomer as a no-charge baseline, and records `cumulative_series_checkpoint_evicted`. Later advancement of the retained newcomer is accounted normally. A reappearing evicted series is treated identically: baseline first, never add an unknown full cumulative total. This deliberately prefers a bounded, disclosed possible undercount over double charging.

Observation idempotency stores at most 64 SHA-256 digests and at most 8 KiB encoded JSON. These independent entry and byte caps make provider/event identifier length unable to defeat boundedness. The values 8, 64, 16 KiB, and 8 KiB are named constants with codec/fold/migration boundary tests.

## Provider-Name Migration Failure Mechanics

Current `origin/personal` implementation:

1. queries all null/blank `provider_name` rows with `SELECT *`;
2. queries all ledger rows with `SELECT *` for a before snapshot;
3. JSON-serializes every non-`provider_name` field of every row and sorts those strings;
4. records an uncapped detail for every skipped candidate;
5. updates eligible rows individually;
6. queries the full ledger again and repeats full-row JSON snapshots for invariants.

The result is unbounded at the SQL-result, JS-array, JSON-string, sort, summary, and log layers. On the local database the first full result alone contains ~635.8 MiB of text. The failure is therefore expected before row processing and is not evidence of database corruption.

The migration is also a prerequisite of `20260803_custom_provider_readable_identity`. `server-runtime.ts` treats that dependent migration's non-success as `APP_DATA_STARTUP_GATE_FAILED`, turning a historical display-name backfill into a global availability gate.

### Why the sibling model-value migration must also be repaired under the same ID

`20260730_token_usage_custom_provider_model_value_backfill` is registered before the provider-name migration and the proposed consolidation. Its projection is narrower, but it still reads every ledger row, adds one detail for every scope mismatch/non-composite row, rereads the complete ledger, and builds/sorts whole-ledger raw-identity arrays. A direct/skip-version installation whose record is `NOT_RUN`, stale `RUNNING`, or `FAILED` can therefore exhaust memory or summary size before it reaches the bounded consolidation.

Its unchanged-ID repair is narrow:

- SQL potential-scope filter: `lower(trim(runtime_kind))='autobyteus'`, `upper(trim(model_provider))='OPENAI_COMPATIBLE'`, non-null `model_value`, and case-sensitive `trim(model_value)` prefix `openai-compatible:`;
- projection only `id`, `usage_event_id`, `runtime_kind`, `model_provider`, `model_identifier`, and `model_value`;
- numeric-ID keyset batches of at most 250;
- compare-and-set update of `model_value` only;
- scalar total-row/candidate/update counts, per-reason counters, and capped examples instead of full before/after identity arrays or linear details.

Successful updates no longer match the prefix, making an ordinary incomplete attempt and later runner retry idempotent. Invalid/conflicting prefixed candidates can remain warnings without making details grow with row count. Non-`model_value` fields are protected by the single-column SQL update shape; copying them into Node solely to prove they did not change is both weaker operationally and the source of the scale defect.

### Why the already-released migration must be repaired under the same ID

The migration runner does not freeze the old implementation in the database. It stores the migration ID and status, while the newly installed application supplies the executable definition. `runPending()` retries `FAILED` records (and stale `RUNNING` records after its stale-run threshold). Therefore, a computer blocked on the released oversized query can recover by installing a version that registers a bounded implementation under the unchanged ID `20260730_token_usage_provider_name_snapshot_backfill`.

Adding only a newer consolidation migration would not repair this path safely: the blocked installation encounters the historical migration first, and the provider-name snapshot still needs the legacy rows while they exist. The migration dispositions must be explicit and ordered:

1. repair and execute/retry the historical model-value migration in place;
2. repair and execute/retry the historical provider-name migration in place;
3. only after both source-shaping steps succeed or succeed with warnings, run a separately identified one-row-per-run consolidation migration;
4. validate before the consolidation migration deletes the legacy event rows.

The historical migration should succeed for the reported data class, but an unrelated remaining failure must still be recorded as retryable rather than terminating unrelated application startup. In that failure state, the consolidation remains pending and the legacy source remains intact, so the historical step can be retried later.

### Required correction shape

- SQL eligibility: null/blank name **and** `lower(trim(runtime_kind))='autobyteus'`.
- Required projection only: ID/event ID, runtime kind, model provider, provider name, and model identifier (plus no fields not used by classification/CAS).
- Keyset batch by numeric ID.
- Compare-and-set single-column update.
- Scalar before/after counts and SQL/update-shape guarantees instead of snapshots of every non-target value.
- Aggregate reason counts and cap example/failure details.
- Failed/retry-pending display backfill must not block independent readable-provider identity work or the whole server.

## Failed-Consolidation Replay Seam And Forward-Only Disposition

The evidence behind `AR-004` remains valid: if consolidation fails, the app starts, and `restoreStarted` restores the same canonical run/provider state, a legacy-last usage fact may replay into current storage and later be counted again during import.

`SR-003` solved that path exactly with bounded runtime legacy identity/checkpoint reads plus scalar provenance. The user's later convention is stricter: current runtime must contain no old-schema reader/decoder/adapter. Therefore the design changes the initiating product path instead of retaining the guard:

1. Current schema expansion must succeed before any degraded current path exists.
2. If consolidation is incomplete, stored history and pre-existing-run restoration are gated from migration status before provider construction.
3. The legacy provider never starts, so its replay cannot reach current persistence; `MP-003` is Not Reachable.
4. Newly allocated runs use globally new canonical run IDs and current storage only.
5. On retry, migration-owned SQL proves the legacy and current run-ID sets are disjoint. Any intersection fails before mutation/delete.
6. With zero intersection, migration imports one aggregate per legacy run and preserves already-current new-run rows unchanged.

This removes the runtime overlap guard, checkpoint seed, source-count mode, and protocol marker. It trades temporary old-run restoration availability for a clean forward-only current source and simpler exact migration boundary.

If current Prisma schema itself is absent or invalid, the application may fail startup. It must not fall back to the old ledger runtime; a corrected external release may repair/retry.

## Production Verification: Nullable JSON Scalar Transport

The delivered Electron candidate reached the intended degraded mode but its consolidation failed three times before scanning a row. The reported field was `source_reported_input_tokens`, supposedly outside JavaScript SafeInt. Read-only production SQL disproved the message: every non-null cumulative-source token value was a nonnegative SQLite integer within SafeInt; the largest total was `1,374,407,961`.

Exact Prisma execution against a SQLite backup exposed the actual boundary:

1. the first ordered run's first four `json_extract(...)` values were `NULL`;
2. later values `28,826,658` and `28,987,545` were SQLite integers;
3. in that nullable ordered result, Prisma returned the later values as JavaScript decimal strings;
4. when a result began with a non-null expression, Prisma returned the same semantic type as `bigint`; and
5. the migration's TypeScript row annotation admitted only `number | bigint`, so `Number.isSafeInteger("28826658")` returned false.

The target migration boundary must not depend on that result-shape inference. Each cumulative-source scalar is projected as either `NULL` or an explicit JSON type plus exact text, for example `integer:28826658`. The migration decoder accepts only `integer:(0|[1-9][0-9]*)`, parses the suffix through `BigInt`, enforces `<= Number.MAX_SAFE_INTEGER`, and then folds it. JSON strings, real values, booleans/containers, negative/noncanonical/malformed tags, and out-of-range integers fail before cleanup. A real Prisma/SQLite fixture must contain leading `NULL` rows followed by valid integers in the same ordered batch; a mocked row or a single non-null row does not exercise the defect.

## Production Verification: Terminal Migration Audit Residue

The `SR-007` correction subsequently passed the supported live upgrade. Read-only verification recorded `20260819_token_usage_run_records_v1` attempt 6 as `SUCCEEDED`: 158,025 legacy rows became 1,283 unique current rows, the legacy source was empty, the database passed `quick_check`, current statistics returned correctly, and an active run updated its existing row. The remaining large database file mostly contains reusable freelist pages; it is not evidence that the one-row transition failed.

The same verification found a different bounded-evidence defect in migration infrastructure:

| Released record | Status | Stored `summary_json` bytes | Detail count | Preserved `(scanned,migrated,skipped,failed)` |
| --- | --- | ---: | ---: | --- |
| `20260730_token_usage_custom_provider_model_value_backfill` | `SUCCEEDED` | 13,964,274 | 100,530 | `(100528,0,100528,0)` |
| `20260730_token_usage_provider_name_snapshot_backfill` | `SUCCEEDED` | 14,318,058 | 103,041 | `(104696,1657,103039,0)` |

The exact current `GetAppDataMigrations` frontend request returned 31,387,995 bytes. This is a supported current path: the record repository selects raw `summary_json`, the runner parses it into the status snapshot, and GraphQL returns it. The repaired same-ID definitions cannot reach these rows because the runner correctly skips `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS` records.

The target needs two owners, not one compatibility branch:

1. The **current status repository** applies a 64 KiB per-summary envelope in SQL before Node materialization. For an oversized valid uniform summary it projects the four exact scalar counts plus one truthful omission marker; for an invalid/unsupported shape it emits a bounded unavailable marker. It does not know the two historical migration IDs or their business semantics.
2. A **separate registered audit-compaction migration** knows the two released IDs and historical regular-log shape. For a supported terminal record it preserves migration identity/name/status/attempts/timestamps/error and the four aggregate counts, replaces only row-linear details with one deterministic compaction marker, and replaces an owned oversized regular log with a canonical bounded log derived from the preserved outcome. It never reruns or relabels the old business migration and never touches token ledger/run rows.

The provider-name regular log is an owned 14,318,198-byte file under the configured migration-log directory. The custom-provider record points to a missing `/tmp` log. Missing content is not reconstructed; an unowned or unwritable path is not rewritten. Malformed/unsupported summary or log source remains intact and produces bounded warnings, while the current read boundary keeps the application/status API usable.

A read-only SQL proof returned the two valid oversized summaries as 326/324-byte projections with exact counts and one omitted-details marker, without loading the original arrays. This establishes that the reader protection is both deterministic and independent of historical detail cardinality. At-rest compaction remains necessary for the two known sources so valid released evidence no longer persists as multi-megabyte blobs.

### Production scheduling and criticality

Current runner inspection establishes a separate reachability constraint:

- `AppDataMigrationRunner.runPending()` schedules only definitions whose `requiredOnStartup` is `true`;
- public/manual `runMigration()` rejects definitions whose execution policy is `STARTUP_ONLY`; and
- `ServerRuntime` invokes only `runPending()`, then applies explicit status gates to selected capability-critical migrations.

Therefore `requiredOnStartup=false` plus `STARTUP_ONLY` has no supported caller and would leave the audit compactor `NOT_RUN` forever (`MP-005`). The current-code fit is `requiredOnStartup=true` plus `STARTUP_ONLY`: this makes the compactor reachable in ordinary registry/startup order. It does **not** make audit cleanup globally fatal, because its ID is absent from the consolidation prerequisite list and from every explicit ServerRuntime fatal-status gate.

Retry claims follow the runner's actual state machine. A normal partial log/database failure must leave the compactor record `FAILED`, or stale `RUNNING` if final status persistence did not complete; later `runPending()` retries those states. `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` are terminal and skipped, so unsupported-source warnings are a final bounded disposition, not a promise of automatic repair. Production-path coverage must invoke the registered definition through `runPending()`, not only call its `execute()` method.

## One-Row Invariant Versus Period Statistics

The current period query asks: “Which accounting deltas were observed between exact timestamps?” A single lifetime cumulative row knows only a first time, a latest time, and final totals. It cannot reconstruct how much of the total belongs on each side of an arbitrary boundary.

| Option | Storage | User-visible semantics | Fit with explicit request | Tradeoff |
| --- | --- | --- | --- | --- |
| **A. Runs created in range, lifetime totals (approved)** | Exactly one authoritative token row per agent run | Date range selects tasks/runs; each row shows complete lifetime cost/usage | Strongest fit | Changes current “usage during period” semantics and copy |
| B. One run row + bounded time rollups | One authoritative run row plus extra per-run/time/model aggregate rows | Can preserve period usage approximately/exactly according to bucket contract | Acceptable only if “one token usage row” means one authoritative row, not one physical aggregate row total | More schema/write/migration complexity; bounded by buckets rather than notifications |
| C. Latest update in range, lifetime totals | Exactly one row | Selects runs whose latest update is in range | Superficially simple | Misleading: long runs disappear/move between periods; not recommended |

The frontend uses date-only controls today, but GraphQL accepts `DateTime`, so a daily bucket would change the API's arbitrary-boundary precision unless the contract is explicitly narrowed.

## Legacy Consolidation Constraints

The data transition must aggregate, not select a winner:

- **Sum** normalized accounting token components and component/total costs.
- **Count** usage reports.
- **Keep earliest/latest** legacy observation bounds and prompt/context facts using `(observed_at,numeric ledger id)` inside migration; current runtime later uses committed fold revision. Migration rejects same-run legacy/current overlap, so no cross-schema latest-wins merge is needed.
- **Preserve** run/root/task/display attribution with deterministic, truthful conflict handling.
- **Summarize** price, currency, missing-dimension, cache-state, and model/provider identity as single/mixed/unknown rather than choosing the latest blindly.
- **Extract** no more than the eight most recently admitted source checkpoints (ordered by legacy `(observed_at,id)`), hash their keys, enforce the 16 KiB codec cap, preserve lifetime totals from all series, and flag checkpoint compaction if older series are dropped.
- **Validate** per-run and global aggregates before dropping the old ledger.

Because app-data migrations run after Prisma expansion and before normal providers, consolidation follows [`data-migration-conventions.md`](./data-migration-conventions.md): bounded migration-only reads, scalar disjointness preflight, and import/validation/delete inside one SQLite transaction. Noncommit leaves source and disjoint new-run current rows intact for a later attempt. Abrupt-termination labels add no separate machinery.

Normal summary/persistence/activation code is current-schema-only. While consolidation is incomplete, readiness gates history and old-run restoration; no runtime exception may read legacy data. Missing required current schema may stop startup until a corrected release is installed.

## SQLite Physical-Size Constraint

The representative database reports `PRAGMA auto_vacuum=0` (`NONE`). Deleting all legacy event rows after validated consolidation places their data/index pages on SQLite's freelist for reuse, preventing continued physical growth, but does not automatically shrink the ~806 MiB file. A full `VACUUM` can require significant time and temporary disk space and must not run unconditionally on global startup.

The repository's migration convention adds an ordering constraint: Prisma schema migrations run before app-data migrations. A same-release Prisma drop of the populated legacy table would therefore destroy the source before consolidation, especially for users upgrading across skipped versions. The safe current contract is an empty, dormant, migration-only legacy table/model with no runtime readers or writers. Physical table/model removal requires a later mechanism whose ordering cannot bypass the app-data transition; it is not required to achieve one authoritative row per run or reclaim reusable SQLite pages.

## Investigation Conclusion

- **Confirmed:** the append-only wide ledger is the root storage scalability problem for the requested product model.
- **Confirmed:** the named provider-name migration is unbounded in several independent ways and the fatal dependency coupling magnifies a display-metadata failure into application outage.
- **Confirmed:** the earlier custom-provider model-value backfill is also unbounded by ledger cardinality and can block supported direct/skip-version upgrades before consolidation.
- **Confirmed:** one row per canonical agent run is compatible with standalone/team/delegated identity and current lifetime run/team summaries.
- **Confirmed historical premise:** existing-run restoration would make cross-schema replay reachable after failed consolidation; `SR-003` proved one exact guard, but the stronger forward-only rule now rejects that runtime legacy dependency.
- **Confirmed production adapter defect:** nullable SQLite JSON expressions can cross the Prisma raw-query boundary with result-shape-dependent JavaScript representations. A TypeScript generic is not runtime normalization; migration-owned typed transport and exact parsing are required.
- **Confirmed corrected transition:** the fixed consolidation produces one unique current record per canonical run, empties the legacy source, and supports current statistics/in-place updates.
- **Confirmed terminal-audit gap:** already-successful released summaries remain observable as a 31.4 MB current status response and cannot be reached by same-ID retry. A generic bounded read envelope plus a separate migration-owned compactor is required; token data and original business outcomes remain unchanged.
- **Confirmed scheduling constraint:** current runner metadata couples startup scheduling inclusion to `requiredOnStartup=true`, while fatality is decided separately by ServerRuntime gates. The compactor must use the real `runPending()` path and remain absent from fatal/prerequisite dependencies.
- **Approved incompatibility decision:** exact event-observed period statistics are intentionally retired because they cannot be preserved from one cumulative row alone.
- **Approved direction:** strict one-row run totals; hard-bounded current state; no replacement event history; run-created-period filtering; bounded same-ID repairs and migration-only consolidation; deterministic nullable-scalar transport through real Prisma/SQLite; a 64 KiB current migration-status envelope and separate terminal token-audit compaction; forward-only current source; history/old-run restore gating after capability-scoped failure; critical startup failure when required current schema/core invariants are absent; and corrected external-release recovery.
