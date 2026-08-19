# Token Usage: One Cumulative Row Per Agent Run — Design Spec

## Status

User-directed governance revision (`SR-006`) superseding the delivered `SR-005` snapshot after `ARCH-REV-003` passed `SR-003`. Requirements remain `Design-ready` and user-approved on 2026-08-19. The product still requires one authoritative cumulative token-usage row per canonical agent run with run-created-range/lifetime-total statistics. Current application code remains forward-only; every old-schema decoder/query/fold remains migration-only; capability gating or critical startup failure replaces runtime backward compatibility. `SR-006` adds the explicit current-application-contract decision test and detailed SQLite/structured-file classification examples: inert cleanup residue may be a bounded warning only after the required current target is independently valid. It does not change the `SR-005` implementation mechanics. The `SR-003` runtime overlap guard/protocol marker remains removed, `MP-003` remains Not Reachable because pre-existing-run restoration is unavailable while consolidation is incomplete, and `AR-001`–`AR-004` remain preserved in the historical review trail.

## Current-State Read

The current main line is:

`runtime TOKEN_USAGE_UPDATED -> TokenUsageEventEnrichmentTransformer -> component/delta/cost projections -> TokenUsageEventPersistenceProcessor.scheduleAppend -> TokenUsageLedgerStore.append -> SqlTokenUsageLedgerRepository.create -> token_usage_ledger_events`

The dispatch queue serializes event-pipeline work per run, but persistence leaves that queue through `setImmediate`. Every notification becomes a wide row; all summaries later load arrays and rebuild cumulative state. Existing-run restoration reuses the same canonical `runId` and provider conversation identity, so a provider may replay the last usage observation after restart.

Both released 20260730 source-shaping migrations are independently unbounded. The provider-name definition materializes wide candidates and full pre/post ledger snapshots; the model-value sibling materializes whole-ledger arrays and linear skip details. The provider-name display status is also coupled into a startup-fatal readable-provider chain.

Verified constraints from `BEH-001`–`BEH-006`, repository inspection, and the supplements:

- Codex normally supplies cumulative snapshots; AutoByteus and Claude supply deltas. Latest-payload replacement is invalid.
- Exact `run_id` is the canonical identity for standalone, member, nested, delegated, and task-team runs. Newly allocated run IDs are globally unique.
- Existing ledger rows contain normalized deltas and must be aggregated, not winner-selected.
- Cumulative series/checkpoint and idempotency state need enforced count and byte bounds.
- Legacy latest-field ordering uses `(observed_at, numeric ledger id)`; current ordering uses `(observed_at, committed fold revision)`. Event identity is not temporal.
- Prisma schema expansion runs before app-data migration. A same-release drop of the populated source is unsafe for skip-version upgrades.
- Provider-display/consolidation app-data failure can be capability-scoped when current schema exists; absence of required current tables/columns/constraints may be platform-critical.
- `MP-003` proves restored-run replay would overlap schemas if restoration continued. The user now rejects the required runtime legacy adapter, so restoration is gated until consolidation succeeds.
- Current business/runtime code must never query or decode `token_usage_ledger_events`; legacy knowledge is confined to registered migration boundaries.

## Intended Change

Implement three ordered migration dispositions and one forward-only current runtime:

1. Replace the unchanged-ID implementations of `20260730_token_usage_custom_provider_model_value_backfill` and `20260730_token_usage_provider_name_snapshot_backfill` with narrow, keyset-batched, bounded, idempotent transformations. Remove the display backfill as a prerequisite of readable custom-provider identity.
2. Expand the current schema with `token_usage_run_records`, then register startup-only app-data migration `20260819_token_usage_run_records_v1`. Migration-owned code folds released ledger rows into one record per legacy `run_id`, validates in one SQLite transaction, and deletes source rows only after success.
3. Replace append/list-event runtime APIs with an awaited current run-record fold and current-only queries. While consolidation status is incomplete, current readiness gates historical token reads and pre-existing-run restoration before provider startup. Newly allocated runs use only `token_usage_run_records`. Migration retry validates that legacy and current run-ID sets are disjoint before importing legacy aggregates.
4. If required current Prisma/schema/platform invariants are absent, fail startup with bounded actionable evidence rather than reactivating the old ledger runtime. A corrected externally installed release can retry/repair.

The runtime still emits one live `TOKEN_USAGE_UPDATED` event per notification for admitted runs. “One row per run” is a durable invariant, not event-transport suppression.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001–REQ-005, REQ-023, REQ-026; AC-001–AC-005, AC-022, AC-025 | Runtime emits usage for an admitted current run; restore requested while consolidation incomplete | Write spine, allocator, restore path, `MP-003` | Fold admitted current observations into one row; reject pre-existing-run restore before provider replay while incomplete | New/admitted run -> event pipeline -> accumulator -> current repository; restore -> readiness gate; DS-001/DS-002/DS-008 |
| BEH-002 | Contract | REQ-006–REQ-010; AC-006–AC-009 | GraphQL asks for run/member/team summary | Current store lists event arrays | Direct current run read; team result merges concrete current records once | Resolver -> readiness -> run store -> current repository -> aggregate; DS-003 |
| BEH-003 | User | REQ-011; AC-010 | Settings supplies dates | Current repository filters event `observed_at` | Select runs by `COALESCE(run_created_at, first_observed_at)` and show lifetime totals | UI -> GraphQL -> statistics provider -> current query; DS-004 |
| BEH-004 | Operational | REQ-012–REQ-016, REQ-022, REQ-024–REQ-026; AC-011–AC-015, AC-021, AC-023–AC-025 | Either released 20260730 migration is pending/failed | Unbounded definitions and fatal display dependency | Both same IDs retry bounded migration-only code; provider display failure is capability-scoped | Runner -> repaired migration adapter -> status; DS-005 |
| BEH-005 | Operational | REQ-017–REQ-026; AC-016–AC-025 | Populated ledger upgrades; consolidation fails; new work may start | Naive restored-run continuation creates cross-schema overlap | Gate restore/history; admit only globally new run IDs to current; retry validates set disjointness and imports legacy once | Prisma expand -> DS-005/DS-006; failed interval -> DS-007/DS-008; retry DS-006 |
| BEH-006 | Operational | REQ-015–REQ-016, REQ-019–REQ-020, REQ-023–REQ-026; AC-014–AC-015, AC-017, AC-019, AC-022–AC-025 | App-data or schema migration fails | Current fatal coupling lacks classification | Capability-scoped app-data failure starts current-only unrelated/new work; platform-critical current-schema failure stops startup without legacy fallback | Migration result -> bootstrap classifier -> healthy gated app or fatal current-schema error; DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md` | Storage, update semantics, bounded state, released migrations, historical overlap pressure, forward-only gate, period decision, and SQLite constraints | REQ-001–REQ-026; AC-001–AC-025 | Supplies evidence for capacities, restored-run risk, disjointness, fold, ordering, and sequencing | Evidence/context complete; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md` | Deterministic mapping, forward-only current runtime, migration-only legacy knowledge, failure classification, reachability, operating assumptions, and proportionality | REQ-012–REQ-026; AC-011–AC-025 | Governs source ownership and startup/capability disposition; task algorithms remain here | Approved normative supplement |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` / `Bug Fix` / `Performance` / `Behavior Change` / `Refactor` / persisted-data contraction.
- Current design issue found: `Yes`.
- Root cause classification: primary `Boundary Or Ownership Issue`; contributing `Missing Invariant`, `Shared Structure Looseness`, and `Legacy Or Compatibility Pressure`.
- Refactor needed now: `Yes`.
- Evidence: persistence owns immutable notifications rather than cumulative run accounting; readers rebuild state; persistence is detached; both released source-shaping migrations materialize whole-ledger evidence; and the prior degraded guard leaked legacy schema knowledge into current runtime.
- Design response: one current run accumulator and table; awaited current persistence; legacy row types/queries/folds only under registered migrations; readiness gates history and old-run restore; migration retry validates legacy/current run-ID disjointness; bootstrap classifies current-schema-critical versus capability-scoped failure.
- Refactor rationale: fixing only the historical query leaves unbounded growth; keeping the overlap guard violates the now-approved forward-only boundary. The current subject, writer, readers, transition ownership, and failure disposition must change together.
- Intentional deferrals: physical removal of the empty legacy table/model/index contract remains deferred because Prisma deploy precedes app-data conversion for skip-version upgrades. This is a migration-only storage declaration, not a current runtime compatibility path. Physical file shrink also remains separate.

## Terminology

- **Token usage observation**: transient current-runtime notification, delta or cumulative snapshot.
- **Run record**: one authoritative current cumulative token/cost state for one canonical `run_id`.
- **Series checkpoint**: fixed-shape last accepted cumulative source counters for one hashed current series; at most eight per run.
- **Current admission marker**: `(observed_at, committed fold revision)` used by current runtime latest-field selection.
- **Legacy admission marker**: `(observed_at, numeric ledger id)` used only inside migration folding.
- **Legacy event source**: populated released `token_usage_ledger_events`; queried/decoded only by migrations.
- **Historical readiness**: successful or warning completion of `20260819_token_usage_run_records_v1`; required for stored token history and pre-existing-run restoration.
- **New-run readiness**: current schema exists and the run is newly allocated, so it may use current storage even while consolidation is incomplete.
- **Critical current-schema failure**: required current table/column/constraint/platform invariant is absent; startup may fail rather than use old schema.

## Production Migration Convention Application

[`data-migration-conventions.md`](./data-migration-conventions.md) is canonical. Ticket-specific application is:

| Question | Design Disposition |
| --- | --- |
| Deterministic transforms | Each 20260730 definition maps an investigated candidate to one corrected field; consolidation maps supported released ledger rows to one fixed current record per legacy run. |
| Legacy ownership | Only registered migration files contain legacy row/column types, queries, decoders, and folds. Current domain/services/repositories/runtime do not import them. |
| Bounded evidence | Batches <=250, scalar invariants, at most 50 examples, no wide/full-ledger result or linear details. |
| Normal recovery | Existing runner plus real SQLite transaction commit/rollback; no bespoke journal or cause-specific recovery. |
| Capability-scoped failure | With valid current schema, provider-display/consolidation failure keeps unrelated functionality and new runs current-only; history and pre-existing-run restore are gated. |
| Critical failure | Missing required current schema/core invariant may stop startup. No legacy fallback; corrected external release retries. |
| Classification decision test | Judge the final persisted state against schema, current-format data, and integrity/safety facts actually required by the current application—not against whether any migration or cleanup statement emitted an error. |
| Inert cleanup residue | A validated current target plus an unreachable old table/column, obsolete structured-file attribute, or superseded file can be `SUCCEEDED_WITH_WARNINGS` when no independent removal contract applies; observable ambiguity, rollback of the target, or required removal is failure. |
| `AR-004` disposition | Historical `MP-003` would be reachable if restore continued. The new restore gate makes provider replay Not Reachable, so runtime overlap machinery is removed. |
| Durable convention | Delivery promotes `docs/design/production_data_migration_conventions.md` and makes README reference it. |

### SR-005 Impact On Mechanics

This is a real design change from `SR-003`: remove the runtime legacy-overlap guard, legacy SQL adapter, source-count transition mode, checkpoint seeding, protocol marker, and cross-schema merge rules. Replace them with readiness-based history/restore gating and migration-owned set-disjointness validation. The bounded same-ID repairs, one-row fold, and transactional consolidation remain.

### SR-006 Impact On Mechanics

No implementation mechanic changes from `SR-005`. The convention and verification language now make the existing classification rule concrete for database and structured-file migrations. This ticket's consolidation still requires validated import and legacy-row deletion before historical readiness; its populated legacy ledger is not reclassified as inert warning residue because stored history remains incomplete until consolidation and cleanup succeed.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility in current source; legacy understanding is migration-only.`
- Current summaries and writes use only `TokenUsageRunStore` / `SqlTokenUsageRunRepository` and the current schema.
- No dual summary, legacy append, read-old-if-new-empty, runtime legacy query, optional old column, protocol marker, or compatibility wrapper is allowed.
- Registered migration folders retain supported released legacy row/query/decoder logic for direct and skip-version upgrades.
- Runtime readiness reads migration status only; it never counts, probes, or decodes legacy rows.
- After successful consolidation, legacy rows are zero and the dormant physical declaration remains solely for safe Prisma-before-app-data ordering.

## Persisted Data / State Transition Decision

- Source: `TokenUsageLedgerEvent` / `token_usage_ledger_events`, 83 columns, representative ~154.1k rows / ~774.5 MiB.
- Target: one `TokenUsageRunRecord` in `token_usage_run_records` per canonical run.
- Decision: `Migration Required`; direct use violates uniqueness and latest-row selection loses delta facts.
- Preserve: lifetime token/cost/report totals, topology/display attribution, observation bounds, latest prompt/context, identity/pricing truth, and up to eight latest legacy checkpoint facts.
- Discard after validation: raw event/usage/pricing JSON, superseded event rows, and event-only identities/index data not required by the aggregate.
- Failed capability-scoped state: legacy source remains intact; pre-existing-run restore/history is gated; newly allocated current run rows are allowed and must be run-ID-disjoint from legacy.
- Critical state: missing current schema/core invariant may fail startup; do not use the source as current runtime storage.
- Retry: one migration transaction validates target schema, legacy/current run-ID disjointness, per-run/global aggregates, then deletes source.
- Supported criteria: REQ-001–REQ-026; AC-001–AC-025.

### Target Current Record Shape

Prisma model: `TokenUsageRunRecord` mapped to `token_usage_run_records`.

| Field Group | Required Stored Fields / Shape | Invariant |
| --- | --- | --- |
| Key/version | `id`, `run_id @unique`, `revision`, `persisted_at` | Exactly one current row per canonical run; current folds increment revision transactionally. |
| Topology/display | root/team/agent/workspace/task/name/summary/created-at/member fields | Root conflicts become explicit `mixed`; no team-total row. |
| Observation/order | `first_observed_at`, `latest_observed_at`, `latest_observation_generation`, `latest_observation_ordinal`, `usage_report_count` | Migration writes generation 0 with legacy numeric row ordinal; current admission writes generation 1 with fold revision. Event ID never orders facts. |
| Token totals | Existing gross/accounting/cache/reasoning/billable components as SQLite integer / Prisma `BigInt` | Non-negative exact database sums; mapper rejects unsafe JS integer conversion rather than rounding. |
| Costs | Existing estimated component/total cost fields | Preserve null/present and mixed-currency semantics. |
| Aggregate status | `cache_state`, `currency`, `api_cost_status`, bounded `pricing_summary_json`, bounded `quality_flags_json` | Finite/mixed summaries only; no pricing snapshot. |
| Identity | current runtime/provider/provider-name/model scalars plus bounded `identity_summary_json` | Each dimension is unknown/single/mixed; no legacy row DTO. |
| Latest context | prompt/context-window fields | Selected by authoritative generation/ordinal marker. |
| Reconciliation | `snapshot_series_state_json`, `recent_idempotency_digests_json` | <=8 fixed SHA-256-keyed checkpoints / 16 KiB and <=64 SHA-256 digests / 8 KiB; no raw provider key or event payload. |

There is no `legacy_overlap_protocol_version`, receipt table, or cross-schema current state.

```ts
const MAX_CUMULATIVE_SERIES_PER_RUN = 8;
const MAX_RECENT_IDEMPOTENCY_DIGESTS = 64;
const MAX_SNAPSHOT_SERIES_STATE_BYTES = 16 * 1024;
const MAX_RECENT_IDEMPOTENCY_STATE_BYTES = 8 * 1024;

type CurrentAdmissionMarker = {
  observedAt: string;
  generation: 1;
  ordinal: bigint; // committed current fold revision
};

type SnapshotSeriesCheckpoint = {
  seriesDigest: string; // lowercase SHA-256 hex
  sourceTokens: CumulativeSnapshotTokenRecord;
  lastCurrentAdmission?: CurrentAdmissionMarker;
};
```

Current admission rules:

1. SHA-256 hash exact UTF-8 series/idempotency keys before storage; codecs require fixed lowercase hex and enforce count/byte caps.
2. Retained cumulative series adds only non-regressing advancement. Exact current replay changes no totals/report count/revision. Regression adds no advancement and records a bounded quality outcome.
3. A ninth/new digest evicts the least-recent retained checkpoint, establishes a no-charge baseline, and records `cumulative_series_checkpoint_evicted`; reappearance follows the same rule.
4. Direct current deltas add atomically and use the capped digest ring for current idempotency only.
5. Migration folding preserves all legacy aggregate totals but retains only the eight legacy checkpoints with greatest `(observed_at,id)` and records compaction. This logic and the legacy ordinal type live in the migration folder; the persisted target is decoded as the current bounded target shape.

### Degraded Forward-Only Capability Gate

After startup migration execution, `TokenUsageMigrationReadiness` exposes one current-schema capability state from migration records and schema bootstrap outcome:

- `READY`: consolidation is `SUCCEEDED` or truthful `SUCCEEDED_WITH_WARNINGS`; history reads, old-run restoration, new runs, and current persistence are available.
- `CURRENT_SCHEMA_DEGRADED`: required current table/columns exist but consolidation is incomplete/failed. Historical token reads and pre-existing-run restoration are unavailable. Newly allocated runs and unrelated capabilities use only current schema.
- `CRITICAL_CURRENT_SCHEMA_FAILURE`: Prisma deploy or a required current platform/schema invariant is absent. Bootstrap fails with bounded actionable evidence; no current owner constructs an old-ledger fallback.

The capability gate has two narrow current interfaces:

```ts
interface TokenUsageMigrationReadiness {
  assertHistoricalReadReady(): void;
  assertExistingRunRestoreReady(): void;
  assertCurrentSchemaReady(): void;
}
```

`StandaloneAgentRunActivationService.restoreStarted` and the equivalent team/task restoration boundaries call `assertExistingRunRestoreReady()` before constructing/restoring provider state. A migration-incomplete error is returned before any provider can replay usage. New-run allocation uses a new globally unique run ID and requires only `assertCurrentSchemaReady()`.

Normal token domain/services/repositories never receive a legacy repository or transaction adapter. They do not query legacy row count or migration source columns. Readiness is derived from migration status established before providers start.

#### Retry merge and ordinary incomplete attempt

At the next startup, only `TokenUsageRunRecordsV1AppDataMigration` understands both stores. Before mutation it performs bounded/scalar preflight including:

```sql
SELECT EXISTS(
  SELECT 1
  FROM token_usage_ledger_events legacy
  JOIN token_usage_run_records current
    ON current.run_id = legacy.run_id
  LIMIT 1
) AS has_run_id_overlap;
```

Any overlap aborts before import/delete because the approved degraded lifecycle should make it impossible. With zero intersection, the migration folds each legacy run, inserts its one current record, validates per-run/global aggregates while preserving already-current new-run rows unchanged, then deletes legacy rows in the same transaction.

If the transaction does not commit, SQLite restores the pre-attempt state. If it commits but status recording fails, an empty legacy source is the migration-owned already-current proof; the next runner attempt records completion. Neither case creates a runtime compatibility mode.

Manual GraphQL invocation of consolidation remains restart-required; it cannot race live current writes. Source-shaping repairs may retain per-batch CAS commits because successful rows leave eligibility and normal runner retry is deterministic.

### Migration Plan

- Current schema: `token_usage_run_records` exists; dormant legacy table remains for migration ordering only.
- Legacy source: released `token_usage_ledger_events` shapes.
- Trigger/owner: startup `AppDataMigrationRunner.runPending()` / `TokenUsageRunRecordsV1AppDataMigration`.
- Current path: current event persistence, summaries, statistics, and new-run work use only current repository/schema.
- Legacy path: `LegacyTokenUsageLedgerRow`, SQL extraction, fold, and deletion exist only inside registered migrations.
- Completion: app-data status for `20260819_token_usage_run_records_v1`; migration-owned empty-source recognition handles commit-before-status relaunch.
- Failure classification: required current schema absent -> bootstrap fatal; current schema valid but consolidation incomplete -> history/old-run restore gated, unrelated/new work current-only.
- Validation: prerequisite statuses, required schemas, nonblank IDs, scalar counts/sums, zero legacy/current `run_id` intersection, per-run/global aggregates, source coverage, then delete and zero assertion.
- Recovery: SQLite transaction, existing runner, corrected later release. No database copy, journal, compensation, legacy runtime, or manual success fabrication.
- Manual execution: restart-required so consolidation never races active current writes.
- Registry order: TeamRun source consumers -> repaired model-value ID -> repaired provider-name ID -> run-records V1.
- Retention: keep historical migration definitions and empty physical legacy declaration for direct/skip-version upgrades; no transition guard remains.

| Migration Step | Source | Target | Owner | Validation | Failure / Recovery |
| --- | --- | --- | --- | --- | --- |
| Expand | Existing database | Current run table/indexes plus retained source | Prisma migration | Required current tables/columns/constraints | Missing current schema is bootstrap-fatal; corrected release may retry; no old runtime |
| Model-value repair | SQL-filtered legacy candidates | Corrected `model_value` | Same-ID migration | <=250 batches, CAS, scalar counts, capped examples | Normal retry; source retained |
| Provider-name repair | SQL-filtered blank AutoByteus names | Corrected provider snapshot | Same-ID migration | <=250 batches, CAS, scalar counts, capped examples | Capability-scoped failure; normal retry |
| Consolidation preflight | Legacy source + current new-run rows | Scalar facts only | Consolidation migration adapter | Schemas/statuses/counts plus zero `run_id` intersection | Fail before mutation; history/old-run restore remain gated |
| Bounded fold/import | Legacy rows `(run_id,id)` | One inserted current row per legacy run | Migration accumulator/repository | Batch bound, per-run expected aggregate/checkpoint state | Transaction rollback retains source/current new-run rows |
| Validation/cleanup | Imported legacy records + disjoint pre-existing new-run rows | Complete current rows + empty source | Consolidation transaction | Coverage anti-join, per-run/global sums, unchanged pre-existing rows, source zero | Any error rolls back import/delete |
| Capability admission | Migration status + current schema readiness | Ready/degraded/fatal disposition | Readiness/bootstrap classifier | Success/warning, incomplete app data, or missing current schema | Degraded gates history/old-run restore; fatal stops startup |

### Bounded Released Source-Shaping Repairs

Shared enforced constants are `SOURCE_SHAPING_BATCH_SIZE = 250` and `MAX_MIGRATION_EXAMPLE_DETAILS = 50`. Each migration keeps O(reason-count) scalar counters and at most 50 example/failure details total; `scannedCount`/`skippedCount` are counters, never derived from detail-array length. Each batch advances by its maximum numeric `id`, classifies in memory, and applies compare-and-set updates through a batch transaction. If an attempt ends before completion, already-updated rows remain outside eligibility and a later normal runner attempt retries the unchanged ID safely.

| Same-ID Migration | SQL Candidate Scope / Projection | Owned Update | Bounded Validation / Outcome |
| --- | --- | --- | --- |
| `20260730_token_usage_custom_provider_model_value_backfill` | `WHERE id > :afterId AND lower(trim(runtime_kind))='autobyteus' AND upper(trim(model_provider))='OPENAI_COMPATIBLE' AND model_value IS NOT NULL AND substr(trim(model_value),1,length('openai-compatible:'))='openai-compatible:' ORDER BY id LIMIT 250`; select only `id`, `usage_event_id`, `runtime_kind`, `model_provider`, `model_identifier`, `model_value` | `UPDATE ... SET model_value=:next WHERE id=:id AND model_value=:expected`; valid composite rows become plain model names and leave candidate scope | Scalar total row count before/after must match; CAS successes must equal migrated counter; malformed/conflicting/source-changed candidates become per-reason counts with capped examples. Statement shape protects every non-`model_value` column; no pre/post identity array. |
| `20260730_token_usage_provider_name_snapshot_backfill` | `WHERE id > :afterId AND (provider_name IS NULL OR trim(provider_name)='') AND lower(trim(runtime_kind))='autobyteus' ORDER BY id LIMIT 250`; select only `id`, `usage_event_id`, `runtime_kind`, `model_provider`, `provider_name`, `model_identifier` | `UPDATE ... SET provider_name=:next WHERE id=:id AND provider_name still equals the null/blank expected value`; recovered rows leave candidate scope | Scalar total row count before/after must match; CAS successes must equal migrated counter; unrecoverable/source-changed candidates become per-reason counts with capped examples. Statement shape protects every non-`provider_name` column; no preserved-row snapshots. |

SQL prefix comparison is deliberately case-sensitive through `substr(...)=...` so the transfer set matches the released classifier instead of relying on SQLite `LIKE` collation. Both definitions return `SUCCEEDED_WITH_WARNINGS` for bounded malformed/unrecoverable dispositions, `FAILED` for database/update/invariant failures, and retain existing runner retry semantics. The provider-name result alone is removed from readable-provider prerequisites; the consolidation still requires both definitions to finish successfully or with warnings before deleting their shared source.

### Legacy Row Fold Rules

All rules in this subsection are migration-only:

- Sum normalized accounting/component tokens and nullable costs using current aggregate semantics.
- Count each legacy row as one historical usage report.
- Merge cache/currency/cost/unit-price/policy/tier and conflicting attribution through bounded finite-state unknown/single/mixed summaries.
- Select first/latest facts deterministically by legacy `(observed_at,id)`; event identity never orders facts.
- Keep only the latest 64 hashed legacy idempotency facts needed in the migrated current state, enforcing the 8 KiB target codec cap.
- Extract cumulative source counters as SQL scalars, hash exact series keys, preserve all historical totals, retain only the eight greatest legacy checkpoints, enforce 16 KiB, and flag compaction.
- Never select `raw_usage_json`, `raw_event_json`, or `pricing_snapshot_json` into Node.
- Insert one current record only when no current row with that run ID exists. Any legacy/current run-ID intersection aborts preflight; migration never merges two schemas for the same run.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Current token notification | Committed one-run record + live event | Run accumulator | Establishes current one-row invariant with no legacy dependency. |
| DS-002 | Bounded Local | BEH-001 | Observation + current record | Admitted delta/checkpoint + next current record | Pure fold reducer | Enforces bounded reconciliation/idempotency. |
| DS-003 | Primary End-to-End | BEH-002 | Run/member/team query | Current summary DTO | Run store | Removes event-list reconstruction and gates incomplete history. |
| DS-004 | Primary End-to-End | BEH-003 | Settings date selection | Lifetime task/model rows | Statistics provider | Implements approved period meaning. |
| DS-005 | Bounded Local | BEH-004 | Pending released source-shaping migration | Bounded updates/status | Each historical definition | Repairs blocked upgrades independently. |
| DS-006 | Primary End-to-End | BEH-005 | Startup consolidation pending | Disjoint complete current rows + empty source | Run-records V1 migration | Owns every legacy read/fold/import/delete. |
| DS-007 | Return/Lifecycle | BEH-006 | Migration/schema outcome | Healthy gated app or critical startup error | Bootstrap failure classifier/readiness | Makes availability proportional without legacy fallback. |
| DS-008 | Return/Lifecycle | BEH-001/BEH-005/BEH-006 | New-run or restore activation | Current-run admission or migration-incomplete error | Run activation readiness gate | Makes cross-schema replay Not Reachable. |

## Primary Execution Spine(s)

- DS-001: `current runtime event -> enrichment -> awaited persistence transformer -> run accumulator -> current transaction -> pure fold -> current row -> live dispatch`
- DS-003: `GraphQL -> history readiness -> current run store/repository -> aggregate -> DTO`
- DS-004: `date controls -> current statistics query -> select created runs -> lifetime grouping -> UI`
- DS-005: `runner -> repaired same-ID candidate batches/CAS -> bounded result/status`
- DS-006: `Prisma current schema -> migration prerequisites -> scalar disjointness preflight -> bounded legacy fold/import -> validation -> source delete -> status`
- DS-007: `schema/app-data outcome -> classify current invariant -> READY | CURRENT_SCHEMA_DEGRADED | fatal bootstrap error`
- DS-008: `activation -> readiness -> new run admitted to current schema OR pre-existing restore rejected while incomplete`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Subjects | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Awaited persistence serializes one run, applies current-only fold inside one target transaction, and returns authoritative admitted delta. | Observation, current checkpoint, run record | Run accumulator | Pricing lookup, contained logging |
| DS-002 | Hash keys; enforce 8/16-KiB and 64/8-KiB caps; add direct deltas; reconcile retained cumulative series; baseline ninth/reappearing series without overcount. | Current fold state | Pure reducer | No SQL/legacy/GraphQL |
| DS-003 | Readiness rejects incomplete history; otherwise exact run queries read one record and team queries merge each concrete record once. | Current records, summary | Run store | SafeInt/display mapping |
| DS-004 | Select complete current runs by created/fallback timestamp and merge lifetime records into task/model groups. | Selected current records | Statistics provider | Localized copy |
| DS-005 | Each unchanged ID owns SQL-filtered <=250 candidates, CAS updates, scalar counters, and capped examples. | Candidate batch | Historical migration | Logs/status |
| DS-006 | Migration-only code validates schemas/status/disjoint run sets, folds legacy batches, inserts one row per legacy run, validates all aggregates, and deletes source atomically. | Legacy row, migrated aggregate, existing disjoint current rows | Consolidation migration | Timeout/status |
| DS-007 | Valid current schema plus incomplete app data becomes a healthy gated app. Missing required current schema/core invariant becomes a bounded fatal startup error. | Migration outcome, readiness | Bootstrap classifier | External corrected release |
| DS-008 | Restore paths check readiness before provider creation; incomplete consolidation rejects old-run continuation. New-run allocation proceeds with a globally new ID and current-only persistence. | Run activation intent | Activation readiness gate | User-facing error |

## Spine Actors / Main-Line Nodes

- `TokenUsageEventEnrichmentTransformer`: transient current observation projection.
- `TokenUsageRunPersistenceTransformer`: awaited current pipeline boundary.
- `TokenUsageRunAccumulator`: current one-run transaction/fold owner.
- `SqlTokenUsageRunRepository`: current table owner.
- `TokenUsageRunStore` / `TokenUsageStatisticsProvider`: current use-case/read owners.
- `TokenUsageMigrationReadiness`: current history/schema readiness; no legacy query surface.
- `AgentRunRestoreReadiness` or equivalent integration: blocks pre-existing-run restoration while consolidation incomplete.
- Both repaired 20260730 migration definitions: migration-only source-shaping owners.
- `TokenUsageRunRecordsV1AppDataMigration`: sole legacy consolidation owner.
- `ServerRuntime`/schema bootstrap: classifies capability-scoped versus critical current-invariant failure.

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| Enrichment transformer | Transient current observation and optimistic live projection | Persistence/migration/readiness |
| Persistence transformer | Await current fold and return canonical live payload | Fold arithmetic or SQL |
| Run accumulator | Current per-run serialization, target transaction, bounded fold | Legacy schema/query or GraphQL |
| Current repository | Current table mapping/upsert/queries | Legacy fallback/decoder |
| Run store/statistics | Current subject use cases/range/grouping | Event arrays or legacy reads |
| Migration readiness | Current schema/history/restore availability from migration outcome | Legacy row queries or running migrations |
| Restore activation boundary | Enforce readiness before restoring provider state | Token migration internals |
| Historical migrations | Old schema queries/decoders/classification/fold/import/delete | Normal runtime behavior |
| Bootstrap classifier | Degraded versus fatal disposition against current invariants | Old-schema compatibility |

## Thin Entry Facades / Public Wrappers

| Facade | Delegates To | Kept Thin By |
| --- | --- | --- |
| `TokenUsageRunStore` | Accumulator/repository/readiness | Subject-specific current methods only |
| GraphQL token resolvers | Run store/statistics | No SQL, event arrays, or date semantics |
| Run restore services | Restore readiness then current activation | Check before provider construction; no migration query details |
| `AppDataMigrationRunner` | Registered migration definition | Generic status/order only; no token fold logic |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope |
| --- | --- | --- | --- |
| Detached event persistence processor | Breaks durable order | Awaited run persistence transformer | In This Change |
| Ledger append/list repository/store APIs | Wrong persisted subject | Current run repository/store | In This Change |
| Event-array summary/cost aggregation | Current row is cumulative | Record summary/merge projections | In This Change |
| Raw event/usage/pricing JSON persistence | Repeated unbounded data | Transient observation + bounded state | In This Change |
| Full-wide provider migration reads/snapshots/details | Incident cause | Narrow batches/scalars/capped examples | In This Change |
| Unbounded model-value predecessor arrays/details | Blocks direct upgrades | Narrow batches/CAS/scalars | In This Change |
| Provider-name -> readable-identity prerequisite | Incorrect coupling | Independent safety prerequisites | In This Change |
| Runtime `TokenUsageLegacyOverlapGuard`, legacy SQL adapter, transition mode | Violates forward-only source | History/restore readiness gate + migration disjointness | In This Change |
| `legacy_overlap_protocol_version` and protocol code | No same-run cross-schema merge permitted | Set-disjoint import | In This Change |
| Populated legacy rows | Superseded after validation | Current run rows | In This Change |
| Empty physical legacy declaration | Required for schema-before-data ordering | Future safe contract release | Follow-up |

## Return Or Event Spine(s)

- Live success: `current fold -> replacement event -> listeners/websocket -> Token Meter`.
- Live current persistence failure: bounded warning/quality on live event; no legacy fallback.
- History unavailable: readiness error -> GraphQL/UI migration-required state.
- Restore unavailable: readiness error before provider creation -> user-facing retry/update message.
- Critical schema failure: bootstrap error with bounded evidence -> process does not construct old runtime.
- Migration evidence: bounded summary -> existing record/log/status UI.

## Bounded Local / Internal Spines

- Run accumulator: `enqueue run -> current transaction -> read current -> current fold -> upsert -> return`.
- Source-shaping repair: `afterId -> <=250 SQL candidates -> classify -> CAS -> scalar counters/capped examples`.
- Consolidation: `transaction -> schema/status/scalar intersection preflight -> <=250 legacy rows -> migration aggregate -> insert absent run -> validate -> delete -> commit`.
- Readiness: `startup migration/schema outcome -> immutable process capability state -> current history/restore/new-run checks`.

## Off-Spine Concerns Around The Spine

| Concern | Spine IDs | Owner | Responsibility | Risk If Misplaced |
| --- | --- | --- | --- | --- |
| Display capture | DS-001/DS-003 | Run store | Current stable labels | Repository depends on catalogs |
| Pricing policy | DS-001/DS-002 | Accumulator/projections | Apply resolved current pricing | Full pricing JSON persistence |
| Keyed serialization | DS-001 | Accumulator | Prevent current fold races | Assuming caller order |
| SafeInt conversion | DS-003/DS-004 | Codec/API | Reject unsafe conversion | Silent rounding |
| History/restore readiness | DS-003/DS-007/DS-008 | Readiness/activation | Gate incomplete capability without legacy reads | Global over-gate or replay overlap |
| Critical schema classification | DS-007 | Bootstrap | Stop when current platform invariant absent | Runtime optional-schema fallback |
| Capped diagnostics | DS-005/DS-006 | Migrations | Bounded counts/examples | Linear memory/log growth |
| Physical compaction | DS-006 | Future maintenance | Optional disk-aware shrink | Startup outage |

## Ownership Boundaries

Token Usage runtime owns only current observations, current run records, and current summaries. Registered migrations own every legacy table/column/type/query/decoder/fold. Run activation owns restore/new-run lifecycle and consumes only a readiness interface. Bootstrap owns current-schema-critical versus capability-scoped classification. No current runtime boundary imports a legacy migration type or calls a legacy repository.

The older TeamRun migration uses its own migration repository directly. `TokenUsageRunStore` exposes no historical inspection/apply method.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Required Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `TokenUsageRunAccumulator.recordObservation` | Current serialization/transaction/fold | Persistence transformer | Direct repository upsert |
| `TokenUsageRunStore` | Readiness + current queries/summary | GraphQL/use cases | Resolver SQL/event arrays |
| `TokenUsageMigrationReadiness` | Current history/schema/restore capability | Run store, restore services, bootstrap | Runtime legacy count/query |
| Source-shaping migration adapter | Candidate SQL/batches/CAS/scalars | Its registered definition | Whole-ledger reads |
| Consolidation migration adapter | Legacy schema, disjointness, batches, import/validation/delete | Run-records V1 definition | Current runtime legacy access |
| Bootstrap classifier | Current schema/core invariant disposition | Server startup | Migration self-declares global fatality |

## Dependency Rules

- Current event/domain/service/provider/repository/GraphQL code may depend only on current token types and current schema.
- Only registered app-data migration boundaries may reference legacy token table/model columns, legacy row types, or legacy JSON extraction.
- Restore services depend on `TokenUsageMigrationReadiness`, not migration repositories or legacy facts.
- Migration code may reuse pure current aggregate/checkpoint target builders; current code may not import migration types.
- No current code writes or reads `token_usage_ledger_events`; no dual-read/write, optional old column, or read-old fallback.
- Migration queries forbid `SELECT *`, OFFSET pagination, unbounded arrays/details, and raw payload transfer.
- Event/series IDs are identity inputs, never temporal ordering.
- Raw event/usage/pricing JSON is forbidden from target schema.
- Team totals remain derived; no persisted team-total row.
- Consolidation inserts a legacy run only after proving no same-`run_id` current row exists; it never heuristically merges schemas.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `recordObservation(observation)` | One admitted current run | Current atomic fold/result | Exact run ID + current identities | Awaited, no legacy disposition |
| `getSnapshotCheckpoint({runId,seriesKey})` | One current cumulative series | Optimistic/current checkpoint | Compound current key | Current record only |
| Run/team/member summary methods | Current records | Lifetime summary/merge | Exact run/root IDs | History-readiness guarded |
| `listRunsCreatedInRange(start,end)` | Current runs | Approved period selection | Date bounds | Lifetime contents |
| `assertHistoricalReadReady()` | Stored token history | Reject incomplete history | Consolidation status | No legacy count |
| `assertExistingRunRestoreReady()` | Pre-existing activation | Reject restore before provider creation | Consolidation readiness | No token event/legacy query |
| `assertCurrentSchemaReady()` | New current work | Ensure required table/schema | Schema bootstrap state | Fatal when missing |
| Candidate batch/CAS methods | Historical source-shaping rows | Bounded field repair | Numeric legacy cursor | Migration-only |
| `legacyCurrentRunIdOverlapExists()` | Both stores | Scalar disjointness preflight | Canonical run ID | Migration-only boolean |
| `listLegacyRunBatch(...)` | Legacy import | Minimal bounded rows | Run/id cursor | Migration-only |
| `executeConsolidation()` | Released store | All-or-nothing conversion | Startup global token store | Manual call restart-required |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Current fold | Yes | Yes | Low | No migration/legacy parameter |
| Run/team/member reads | Yes | Yes | Low | Preserve distinct subjects |
| Readiness gates | Yes | Yes | Medium | Separate history/restore/schema methods; no generic “isReady” guess |
| Source-shaping adapters | Yes | Yes | Low | Fixed projection/CAS per migration |
| Consolidation | Yes | Yes | Medium | Startup-only, disjointness before mutation |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Durable state | `TokenUsageRunRecord` | Yes | Low | Remove ledger-event names from current API |
| Transient input | `TokenUsageFoldObservation` | Yes | Low | Never store raw DTO |
| Current owner | `TokenUsageRunAccumulator` | Yes | Low | Keep transaction behind it |
| Historical row | `LegacyTokenUsageLedgerRow` | Yes | Low | Migration folder only |
| Capability state | `TokenUsageMigrationReadiness` | Yes | Low | Explicit history/restore/schema assertions |
| Consolidation | `TokenUsageRunRecordsV1AppDataMigration` | Yes | Low | Sole old-to-current owner |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Current event sequencing | Agent-run pipeline | Extend | Await persistence; no new worker |
| Component/pricing | Token projections/pricing | Reuse | Interpretation unchanged |
| Status/retry | Migration runner/records | Reuse | Same-ID/corrected-release retry |
| Run identity | Identity allocator | Reuse | New IDs remain disjoint |
| Restore admission | Activation services | Extend | Gate before provider construction |
| SQLite transaction | Prisma/SQLite | Reuse | Migration recovery boundary |
| Grouping/display | Existing providers | Retarget | Current records replace events |
| Legacy event indexes | Migration adapters | Reuse only there | Bounded historical fold; no runtime access |

## Subsystem / Capability-Area Allocation

| Area | Spines | Owner | Decision | Notes |
| --- | --- | --- | --- | --- |
| Event pipeline | DS-001 | Persistence transformer | Extend | Remove detached processor |
| Current token domain/services | DS-001/DS-002 | Run accumulator | Create/refactor | Current-only |
| Current SQL persistence | DS-001/DS-003/DS-004 | Current repository | Replace | Target schema only |
| History/statistics | DS-003/DS-004 | Run store/statistics | Refactor | Readiness gated |
| Run activation | DS-008 | Activation services + readiness | Extend | Restore blocked, new runs admitted |
| App-data migrations | DS-005/DS-006 | Registered definitions | Extend/create | Sole legacy ownership |
| Bootstrap/readiness | DS-007/DS-008 | Classifier/readiness | Extend/create | Degraded or fatal current-state disposition |
| Web settings | DS-004/DS-007 | UI/store | Extend | Truthful semantics/error |

## Draft File Responsibility Mapping

| Candidate File | Boundary | Responsibility | Must Not Contain |
| --- | --- | --- | --- |
| `domain/token-usage-run-record.ts` | Current domain | Current record/finite summaries | Legacy row/protocol marker |
| `domain/token-usage-fold-observation.ts` | Current input | Typed transient observation | Old schema |
| `services/token-usage-run-accumulator.ts` | Current owner | Serialization/current transaction/fold | Legacy query/guard |
| `projections/token-usage-run-fold.ts` | Pure current reducer | Direct/cumulative bounded next state | Migration branch |
| `repositories/sql/token-usage-run-repository.ts` | Current persistence | Current table mapping/query | Legacy table |
| `providers/token-usage-migration-readiness.ts` | Current capability | History/restore/schema assertions | Source row count/query |
| `app-data-migrations/.../token-usage-run-records-v1/*` | Migration | Legacy types/query/fold/disjoint import/delete | Normal runtime API |
| `tickets/.../data-migration-conventions.md` | Solution governance | Forward-only/failure principles | Task algorithm duplication |

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why Shared | Must Not Become |
| --- | --- | --- | --- | --- |
| Unknown/single/mixed merge | Current domain | Token domain | Runtime/migration target/team merge | Arbitrary JSON merger |
| Aggregate/status merge | Current projections | Token projections | Current fold/migration target/stats | Event adapter |
| Bounded checkpoint state | Current domain | Token domain | Target invariant shared with migration builder | Raw/unbounded map |
| Compact codecs | Current SQL codec | Persistence | One validated target mapping | Permissive dump |
| Migration readiness result | Provider/current capability | Readiness | History/restore/bootstrap share classification | Legacy store facade |

## Shared Structure / Data Model Tightness Check

| Structure | Meaning | Overlap Risk | Corrective Action |
| --- | --- | --- | --- |
| `TokenUsageRunRecord` | Current cumulative state | Low | No legacy/protocol/event fields |
| `TokenUsageFoldObservation` | Current transient input | Medium | Never repository/GraphQL output |
| `DistinctValueSummary` | Bounded truth state | Low | Three states only |
| `TokenUsageAggregateState` | Current/migrated target aggregate | Low | Migration supplies target facts, not legacy DTO |
| `TokenUsageMigrationReadiness` | Current capability disposition | Low | No legacy query/count surface |
| Legacy row/accumulator | Migration source only | Low | Folder/dependency enforcement |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Responsibility | Reuse |
| --- | --- | --- | --- |
| `src/token-usage/domain/token-usage-run-record.ts` | Current subject | Record and bounded truth types | Component types |
| `src/token-usage/domain/token-usage-snapshot-checkpoint.ts` | Current reconciliation | Constants/digests/caps/eviction | Current fold + migration target builder |
| `src/token-usage/domain/token-usage-distinct-value-summary.ts` | Current truth | Unknown/single/mixed | Aggregates |
| `src/token-usage/projections/token-usage-run-fold.ts` | Pure current fold | Direct/cumulative current admission | Pricing apply |
| `src/token-usage/projections/token-usage-run-aggregate.ts` | Current aggregate | Team/model/task merge | Status mergers |
| `src/token-usage/providers/token-usage-run-store.ts` | Use-case facade | Current record/summary methods | Accumulator/repository/readiness |
| `src/token-usage/providers/token-usage-migration-readiness.ts` | Capability gate | History/restore/schema assertions from startup outcome | Migration record status |
| `src/token-usage/services/token-usage-run-accumulator.ts` | Current owner | Queue/transaction/current fold | Reducer/repository |
| `src/token-usage/repositories/sql/token-usage-run-repository.ts` | Current DB | Upsert/current queries | Codec |
| `src/token-usage/repositories/sql/token-usage-run-record-codec.ts` | Current mapper | BigInt/bounded JSON/current marker | Domain constants |
| `src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.ts` | Pipeline | Await current fold and return event | Run store |
| Standalone/team/task activation services | Run lifecycle | Call restore/schema readiness before provider startup | Readiness interface |
| `src/app-data-migrations/migrations/token-usage-run-records-v1/*` | Historical owner | Legacy adapter/decoder/fold/disjoint import/validation/delete | Pure current target mergers |
| Same-ID 20260730 migration files | Historical owner | Bounded source shaping | Shared batch constants |
| `tickets/.../data-migration-conventions.md` | Solution governance | Canonical principles before delivery promotion | README practice |

## Applied Patterns

- **Forward-only current path**: current domain/services/repositories/runtime know only current schema.
- **Migration-only legacy adapter**: old rows/columns/JSON and transformation stay under registered migration folders.
- **Expand -> app-data transform -> deferred physical contract**: create current schema before converting; keep dormant old declaration for skip upgrades; never run old runtime.
- **Capability gate instead of compatibility**: incomplete history/restore is unavailable; new current work may proceed when schema is valid.
- **Critical current-invariant fail-fast**: missing required current schema stops startup with evidence rather than optional-column/old-table fallback.
- **Disjoint-set transition**: newly allocated current run IDs and legacy run IDs must not intersect; migration rejects overlap before import.
- **Hard-bounded current state**: fixed checkpoint/digest counts and bytes.
- **Transaction-as-relaunch-safety**: real SQLite transaction plus existing runner; no custom journal.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `prisma/schema.prisma` | Current schema | Persistence | Add current run model; retain/comment migration-only legacy model | Protocol marker or runtime relation to legacy |
| `prisma/migrations/20260819...add_token_usage_run_records/migration.sql` | Schema expand | Prisma | Create current table/indexes | Source drop/data fold |
| `src/token-usage/domain/` | Current domain | Token usage | Current record/checkpoint/finite-state types | Legacy DTO/column |
| `src/token-usage/services/` | Current control | Accumulator | Current one-run transaction/fold | Migration/legacy SQL |
| `src/token-usage/providers/token-usage-migration-readiness.ts` | Capability | Readiness | History/restore/current-schema assertions | Legacy row count/query |
| `src/token-usage/repositories/sql/` | Current persistence | Repository | Current table/codec/query | Legacy event access |
| Standalone/team/task activation services | Lifecycle | Run activation | Gate old-run restore; admit new current runs | Migration fold/legacy query |
| `src/app-data-migrations/migrations/token-usage-run-records-v1/` | Migration | Consolidation | All legacy types/queries/fold/disjoint import/delete | Current runtime facade |
| Same-ID 20260730 migration files | Migration | Source shaping | Bounded candidates/CAS/scalars | Whole-ledger arrays/details |
| `src/server-runtime.ts` | Bootstrap | Platform | Classify current schema critical vs app-data degraded | Old runtime construction |
| GraphQL/web token statistics | Transport/UI | Current reads | Readiness error/current DTO/copy | Event arrays/legacy fallback |
| `docs/modules/token_usage.md` | Durable feature docs | Delivery | Current one-row/readiness semantics | Append-only claims |
| `docs/design/production_data_migration_conventions.md` + README | Durable governance | Delivery | Promote convention; README concise reference | Duplicated task mechanics |

## Folder Boundary Check

| Path | Boundary | Risk | Justification |
| --- | --- | --- | --- |
| `token-usage/domain`, `services`, `providers`, `repositories` | Current main line | Low | Explicitly legacy-free |
| Run activation services | Lifecycle | Medium | Must gate before provider creation and not absorb migration details |
| `app-data-migrations/.../token-usage-run-records-v1` | Historical off-spine | Low | Sole legacy query/decode/fold owner |
| Same-ID migration files | Historical off-spine | Low | Retained for supported upgrades |
| Prisma legacy model declaration | Migration-only storage contract | Medium | Required by ordering; enforce no current imports |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Current fold | `await accumulator.recordObservation(obs)` -> one current transaction | append one wide event | One row/order |
| Cumulative replay | current checkpoint 210 + current snapshot 210 -> zero change | add/overwrite 210 | Current idempotence |
| Ninth series | evict/baseline/flag, later advance | unbounded map | Fixed storage |
| Provider migration | SQL candidate `id>? LIMIT 250`, CAS, scalars | `SELECT *` and full snapshots | Avoid result overflow |
| Capability-scoped failure | current schema valid; history/old-run restore return typed unavailable; new run works | old-ledger reader fallback | Forward-only availability |
| Restore attempt after failed consolidation | readiness rejects before provider creation | start provider then inspect legacy replay | Makes `MP-003` Not Reachable |
| New work after failed consolidation | allocator creates `R-new`; current row only | reuse old run ID | Set disjointness |
| Retry import | migration scalar join proves no overlap, imports legacy, preserves `R-new` | marker/heuristic same-run merge | Migration-only exactness |
| Unexpected overlap | fail preflight, retain both stores | add/subtract/guess | No silent double count |
| Critical schema failure | missing current table -> bounded fatal bootstrap error | catch and use old table | No backward-compatible runtime |
| Corrected release | external installer -> Prisma/app-data retry | require current app updater or manual DB status edit | Recover without compatibility |
| Incomplete abrupt attempt | SQLite rollback + later normal runner | power/shutdown-specific state machine | Convention boundary |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Dual old/new summary readers | Rejected | Current read + readiness error |
| Old-ledger append fallback | Rejected | Current write only; gate operation if current invariant unavailable |
| `TokenUsageLegacyOverlapGuard` runtime legacy queries | Rejected by SR-005 (historically accepted in SR-003) | Gate pre-existing-run restore; validate disjointness in migration |
| `legacy_overlap_protocol_version` | Rejected | No same-run cross-schema target allowed |
| Optional missing current table/column branch | Rejected | Critical startup failure + corrected release |
| Runtime legacy JSON/row decoder | Rejected | Migration folder only |
| Per-event overlap receipt table | Rejected | Restore gate/set disjointness |
| One-row wrapper around old repository | Rejected | Replace subject/repository |
| Raw JSON or replacement audit table | Rejected | Bounded current state; audit out of scope |
| Same-release source drop | Rejected | Empty dormant migration-only declaration |
| Blanket global fatal for every app-data warning | Rejected | Classify current platform/core/capability invariant |
| Blanket “app must always start” rule | Rejected | Critical current-schema/core failures may stop startup |

## Derived Layering

`current runtime adapter -> event pipeline -> current token owner -> current fold -> current SQL repository`

`GraphQL -> readiness -> current token store/statistics -> current repository`

`run activation -> readiness -> current new/restore service`

`startup runner -> migration-only legacy adapter/fold -> current target inserts -> validation/delete`

`schema/bootstrap -> current-invariant classifier -> degraded current app OR fatal error`

Only the startup migration line may reference legacy token columns. The current lines never import it.

## Change / Refactor Sequence

1. Add current Prisma run table/indexes without protocol marker; retain and document legacy model as migration-only.
2. Add current record/checkpoint/finite-state types, strict codecs, bounded pure fold, and current aggregate projections.
3. Add current repository, accumulator, run store, and awaited persistence transformer; switch event pipeline.
4. Convert run/team/member/statistics reads to current records and add truthful range semantics.
5. Add `TokenUsageMigrationReadiness` with distinct history, old-run restore, and current-schema assertions.
6. Integrate restore readiness into standalone/team/task activation before provider state is constructed; new-run paths require current schema only.
7. Add bootstrap classification: valid current schema + failed app-data -> degraded; missing required current schema/core invariant -> fatal; no old runtime.
8. Repair both 20260730 definitions under unchanged IDs and remove provider-name display from independent readable-identity prerequisites.
9. Add/register startup-only `20260819_token_usage_run_records_v1` with migration-owned legacy schema/decoder/fold.
10. Implement scalar legacy/current run-ID intersection preflight, bounded import, aggregate validation, source delete, and empty-source relaunch recognition in one transaction.
11. Remove event repository/store/mappers/aggregators/raw persistence plus all overlap guard/mode/SQL/protocol-marker code and obsolete tests.
12. Add synthetic coverage for large same-ID repairs, bounded fold, degraded restore gate/new-run disjointness, overlap rejection, critical schema failure, corrected-release retry, and docs/UI errors.
13. Delivery promotes the convention to durable docs, makes README reference it, and updates token-usage documentation.

Temporary-state rule: incomplete consolidation permits only forward-current behavior whose run IDs cannot exist in legacy. Historical reads and pre-existing-run restoration remain unavailable. There is no temporary legacy runtime seam.

## Key Tradeoffs

- **Pre-existing-run restoration is temporarily unavailable after consolidation failure.** This is a deliberate capability restriction that removes backward-compatible runtime code and prevents double count.
- **New work remains available when current schema exists.** Globally unique new run IDs allow current-only persistence; migration must prove disjointness.
- **Startup may fail when current schema/core invariants are absent.** This preserves forward-only code; recovery is a corrected externally installed release.
- **One migration transaction can be long.** It provides atomic import/delete without a journal.
- **Awaited persistence adds latency.** It fixes ordering/correctness.
- **One lifetime row changes date filtering.** This is approved and avoids a second history model.
- **Bounded checkpoint overflow may undercount one first interval.** It is flagged and never overcounts.
- **Empty legacy physical schema remains.** It protects skip upgrades but is dormant and migration-only.

## Risks

- Long consolidation may delay an attempt; mitigate with minimal columns/keyset batches/progress and capability-scoped failure when current schema remains valid.
- The restore gate affects users who want to continue old runs until migration succeeds; expose a clear corrected-release/restart message and keep new work available.
- Correctness depends on global uniqueness of newly allocated run IDs; reuse the allocator and verify zero intersection in migration.
- A false success status could bypass gating; status is set only after transaction validation/source cleanup, with empty-source relaunch recognition inside migration.
- Missing required current table/columns correctly causes fatal startup; error evidence and external release instructions must be actionable.
- Legacy metadata conflict/checkpoint compaction and BigInt mapping remain explicit migration/API test risks.
- SQLite file does not shrink automatically; pages become reusable, optional compaction remains separate.
- Provider candidate sets can be large; every result and diagnostic stays bounded.

## Requirement And Acceptance Traceability

| Design Area | Requirement IDs | Acceptance-Criteria IDs |
| --- | --- | --- |
| One-row identity/fold/bounds/all run kinds | REQ-001–REQ-005 | AC-001–AC-006 |
| Current record/read/team/public semantics | REQ-006–REQ-010 | AC-007–AC-009 |
| Run-created range/lifetime totals | REQ-011 | AC-010 |
| Same-ID provider-name repair/isolation | REQ-012–REQ-016 | AC-011–AC-015 |
| Consolidation/disjoint import/cleanup | REQ-017–REQ-021 | AC-016–AC-020 |
| Same-ID model-value repair | REQ-022 | AC-021 |
| Forward-only degraded gate and replay reachability | REQ-005, REQ-019, REQ-023 | AC-002, AC-017, AC-019, AC-022 |
| Determinism/anti-overengineering | REQ-024 | AC-023 |
| Failure classification/corrected release | REQ-025 | AC-024 |
| Forward-only current source/migration-only legacy | REQ-026 | AC-018, AC-025 |

## Guidance For Implementation

- Read `data-migration-conventions.md` before adding any migration fallback or startup gate.
- Enforce source dependency mechanically: searches/import tests must show legacy token columns/types only under app-data migration boundaries and Prisma migration-only declaration.
- Do not implement `TokenUsageLegacyOverlapGuard`, transition source-count mode, checkpoint seed, protocol marker, or same-run cross-schema merge.
- Gate pre-existing-run restoration before provider creation across standalone, team, nested, delegated, and task-team restoration paths.
- Use the existing canonical allocator for new runs; migration preflight must scalar-check set intersection.
- Keep history/restore/current-schema readiness methods distinct and current-status-based; no legacy row count or table probe from normal runtime.
- Treat missing required current schema as critical. Do not catch Prisma missing-table/column errors and route to old storage.
- Keep statuses truthful: `SUCCEEDED_WITH_WARNINGS` only after valid current target; `FAILED` otherwise. Classify startup separately.
- Use one real transaction for consolidation and bounded <=250 rows/capped 50 examples for migrations.
- Preserve current GraphQL query names where compatible, but return typed readiness errors instead of partial/legacy data.
- Coverage: ~147k provider fixture; ~147k sibling fixture; ordinary relaunch; transaction rollback; failed consolidation -> restore old run rejected before provider -> new run current row -> retry exact import; injected run-ID intersection rejection; current schema missing -> fatal/no legacy call; corrected release retry; 8/9/reappearing series; equal times; mixed pricing/identity; commit-before-status empty-source recognition.
- Do not create separate power/kill/shutdown tests or use a live user profile.
