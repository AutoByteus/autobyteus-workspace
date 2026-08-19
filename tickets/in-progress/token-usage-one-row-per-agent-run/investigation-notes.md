# Token Usage: One Cumulative Row Per Agent Run — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Investigation complete; requirements are `Design-ready` and approved on 2026-08-19 with strict one-row Option A. `SR-003` passed `ARCH-REV-003`; `SR-004` centralized migration governance; `SR-005` superseded the runtime overlap-guard mechanic with strict forward-only current source and classified failure. User-directed `SR-006` adds the explicit current-application-contract decision test and detailed database/file-format warning, capability-scoped, and critical examples without changing the `SR-005` implementation mechanics. The one-row product choice remains unchanged.
- Investigation Goal: Verify the current token-usage write/read/migration paths and produce a design-ready requirement basis for one cumulative token-usage row per canonical agent run plus scalable same-ID repairs of both transition-critical 20260730 token-ledger backfills.
- Scope Classification: `Large`.
- Scope Classification Rationale: The request affects live event ingestion, database invariants, aggregation semantics, a released large-data transition, and startup availability.
- Scope Summary: Contract the append-per-notification representation to one cumulative state row per run, preserve correct lifetime reporting across all run kinds, migrate existing data safely, and repair the named migration's query and availability failure modes.
- Approved Decision: Date controls select runs created in range (first-usage fallback) and show lifetime totals. No time-rollup/event-history table is in scope.

## Request Context

The user supplied a production incident for AutoByteus 1.4.49 and reported the same implementation in 1.4.52: 147,373 ledger rows (~653 MiB), mainly Codex cumulative snapshots every 5–30 seconds, caused `20260730_token_usage_provider_name_snapshot_backfill` to select ~584.7 MiB of text in one Prisma query. Prisma/NAPI failed converting a Rust string to a Node string before row processing, and a dependent migration made embedded-server startup fatal. The user requests analysis and a target invariant of one cumulative token-usage row per agent run across standalone, team-member, and delegated/task runs, bootstrapped from `origin/personal`.

The user subsequently clarified that the failure occurred on another long-lived installation while upgrading. The ticket must therefore contain **both** an in-place repair of the already-released historical migration so that blocked machines can retry it after installing the fixed version, and a separate new migration for the broader one-row-per-run data-model refactor. The new consolidation migration is not a substitute for repairing the historical ID.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run`.
- Current Branch: `codex/token-usage-one-row-per-agent-run`.
- Bootstrap Base Branch: refreshed `origin/personal`.
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-19; `origin/personal` resolved to `0194fb4fffa69037a46aeace491024fdf816dde7` (`chore(delivery): retire delegation worktree`).
- Expected Finalization Target: local integration branch `personal`, refreshed from `origin/personal` by delivery.
- Bootstrap Blockers: None.
- Downstream Note: authoritative work belongs in this dedicated worktree. The shared superrepo checkout contains unrelated untracked `.article-work/` and must not be modified for this ticket.

## Supplemental Task Artifact Inventory

| Artifact | Type / Purpose | Authority / Approval | Related Requirements |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md` | Evidence/context supplement covering storage measurements, mixed update shapes, bounded reconciliation, released migrations, historical degraded-overlap pressure, forward-only gate disposition, period options, and SQLite compaction | Evidence complete; no separate approval required. `requirements.md` remains authoritative for intended behavior. | REQ-001–REQ-026 |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md` | Normative governance supplement centralizing deterministic mapping, forward-only current source, migration-only legacy ownership, operating prerequisites, abrupt-termination equivalence, unsupported premises, reachability, the current-application-contract test, detailed database/file-format outcome examples, corrected-release recovery, and proportionality | Approved by explicit user direction on 2026-08-19. Governs migration assumptions and review; task-specific mechanics remain in `design-spec.md`. Intended delivery destination: `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`, linked from the README. | REQ-012–REQ-026 |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings |
| --- | --- | --- | --- | --- |
| 2026-08-19 | Issue | User-provided incident report | Establish symptom, data volume, failure, and requested invariant | Healthy SQLite; append-per-snapshot growth; oversized Prisma query; global startup failure |
| 2026-08-19 | User approval | User confirmed the clarified two-migration requirements were clear and directed design to follow the migration conventions in the README | Lock the design input and governing migration practice | Strict one-row recommended option accepted; historical migration repair plus separate consolidation remain in scope; `autobyteus-server-ts/README.md` is mandatory design input |
| 2026-08-19 | User-directed governance refinement after `ARCH-REV-003` | User required a separate committed data-migration convention file and a README link, emphasizing deterministic known-source-to-target transformation and rejection of speculative power, shutdown, kernel, memory, battery, filesystem, and similar defensive assumptions | Make the anti-overengineering boundary durable and reusable | Create `data-migration-conventions.md`; treat abrupt termination as one incomplete-attempt category; require independent product reachability for extra machinery; keep the supported normal-failure/restored-run `AR-004` path |
| 2026-08-19 | User-directed availability convention | User emphasized that a failed production migration must not brick the product or force personal technical/database repair; the user must retain application use and the opportunity to install/run a later corrected release | Make failure isolation and upgrade recoverability a reusable migration principle | Truthful retryable status; healthy unrelated startup/use; affected capability only is unavailable; no false `SUCCEEDED_WITH_WARNINGS`; same-ID corrected retry remains reachable |
| 2026-08-19 | User-directed forward-only and critical-failure refinement | User required zero backward-compatible old-schema behavior in current source, legacy understanding only in migration code, and explicitly accepted global startup failure when required current schema/core invariants are absent; recovery may be external installation of a corrected release | Reclassify failure and remove any runtime legacy transition adapter | Capability-scoped app-data failures gate affected current operations; critical current-schema failure may stop startup; no dual reader/writer or old-schema fallback; `SR-003` guard must be replaced |
| 2026-08-19 | User-directed classification examples | User clarified that startup should be blocked only when facts required by current application code/current integrity contract are unavailable, and requested detailed database and structured-file examples. A valid current column/attribute can remain usable even when obsolete rows, attributes, columns, tables, or files were not cleaned up. | Make the warning-versus-failure test concrete and reusable | Classify the final persisted current contract, not the mere occurrence of a migration/cleanup error; inert bounded residue may be `SUCCEEDED_WITH_WARNINGS`, observable ambiguity or missing required current data is not |
| 2026-08-19 | Git | `git fetch origin personal`; `git rev-parse origin/personal`; worktree/branch commands | Obey explicit bootstrap base and isolate work | Dedicated branch/worktree created from `0194fb4f...` |
| 2026-08-19 | Principle | `.codex/skills/solution-designer/design-principles.md` | Apply canonical design and data-transition rules | Requires explicit ownership, bounded transition, normal-path cleanup, and evidence-backed preservation |
| 2026-08-19 | Repository convention | `autobyteus-server-ts/README.md`, “Production data migrations” / “Production migration practice” | Apply the user-directed migration conventions | Deterministic released-shape conversion; validate before mutation; explicit disposition; bounded independent validation; use SQLite transactions; no speculative bespoke journals; migration problems are truthful terminal warnings unless an independent platform/bootstrap owner establishes current application inoperability; synthetic fixtures only |
| 2026-08-19 | Schema/history | `autobyteus-server-ts/prisma/schema.prisma`; `prisma/migrations/20260624090000_add_token_usage_ledger_events`; later token migrations | Determine row subject, width, keys, indexes, and evolution | 83-column event row; unique event/idempotency keys; no unique run key; repeated raw/pricing JSON |
| 2026-08-19 | Write spine | `src/agent-execution/events/processors/token-usage/*`; `src/token-usage/projections/*`; `src/token-usage/providers/token-usage-ledger-store.ts`; `src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Identify normalization, ownership, and persistence scheduling | Mixed sources normalize to accounting deltas, then every event is asynchronously inserted; persistence completion is not awaited by the event pipeline |
| 2026-08-19 | Runtime adapters | `src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`; `src/agent-execution/backends/claude/session/claude-session-token-usage.ts`; native usage emitters found by `TOKEN_USAGE_UPDATED` search | Establish input meaning | Codex usually cumulative per series; AutoByteus per-call delta; Claude terminal per-turn delta; blind latest-payload replacement is incorrect |
| 2026-08-19 | Identity/topology | `src/agent-execution/services/agent-run-identity-allocator.ts`; provisioning/run services; team topology and task-delegation identity services | Verify one canonical subject across run kinds | Exact opaque agent run ID is already the concrete identity; root/team/task/address are attributes |
| 2026-08-19 | Read spine | `src/token-usage/providers/statistics-provider.ts`; `token-usage-ledger-store.ts`; repository; GraphQL schema/types | Verify summary and period calculations | Run/team/statistics readers load event arrays and sum accounting deltas/costs; current period filter is `observed_at` |
| 2026-08-19 | Frontend/docs | `autobyteus-web/components/settings/TokenUsageStatistics.vue`; token-usage tables/store; `autobyteus-server-ts/docs/modules/token_usage.md` | Verify public semantics and date controls | UI uses date controls; docs explicitly describe append-only ledger and usage events observed in selected range |
| 2026-08-19 | Provider migration | `src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts`; row helper | Reproduce scalability mechanism | `SELECT *` candidates plus full pre/post ledger snapshots, JSON serialization/sort, and uncapped skip details are independently unbounded |
| 2026-08-19 | Sibling source-shaping migration | `src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts`; registry ordering | Validate every predecessor of consolidation | The sibling selects all ledger rows before/after, builds/sorts full raw-identity arrays, and appends one skip detail per non-target row; a direct/skip-version upgrade can exhaust resources before consolidation |
| 2026-08-19 | Migration runner/gate | app-data registry/runner; `custom-provider-readable-id-app-data-migration.ts`; `src/server-runtime.ts` | Trace retries, prerequisites, and startup fatality | Backfill failure is recorded/retryable, but it is a hard prerequisite of the readable-ID migration and its non-success is explicitly fatal to server startup |
| 2026-08-19 | Migration retry semantics | `src/app-data-migrations/app-data-migration-runner.ts`; record repository; registry ordering | Verify how a machine already stuck on the released migration receives a repair | Database stores ID/status, not executable code; `runPending()` retries `FAILED` and stale `RUNNING` records using the newly installed definition under the same ID |
| 2026-08-19 | Manual migration surface | `src/api/graphql/types/app-data-migrations.ts` | Check whether consolidation can be retried while runtime writes are active | `runAppDataMigration` can invoke any registered definition after startup; the long consolidation needs a restart-required/manual-execution guard rather than contending with live token persistence |
| 2026-08-19 | Legacy-table consumer inventory | app-data registry; TeamRun V1 token migration repository; custom-provider model-value and provider-name migrations | Ensure consolidation does not delete evidence needed by older registered migrations | TeamRun V1 and both 20260730 token backfills run earlier against the event table; consolidation must register after them and require the relevant completed source-shaping steps |
| 2026-08-19 | Schema/app-data ordering | `autobyteus-server-ts/README.md`; `src/server-runtime.ts`; prior approved token-ledger cleanup package | Determine safe physical contraction | Prisma expansion executes before app-data transformation, so the same release may add the run table but must not use a normal Prisma drop of the populated event source; validated consolidation may empty/decommission it and reclaim pages |
| 2026-08-19 | Release history | `git show v1.4.49:<path>` and `git show v1.4.52:<path>` for provider migration and runtime gate | Verify affected releases | Both tags contain full-wide selection and fatal dependent gate; current base still has unbounded `SELECT *` behavior |
| 2026-08-19 | Read-only SQLite probes | Aggregate SQL and `dbstat` against `/Users/normy/.autobyteus/server-data/db/production.db` | Test scale, duplication, mixed cases, candidate eligibility, and storage shape | ~154.1k rows / 1,269 runs; ~774.5 MiB table+indexes; ~475 MB repeated JSON; ~635.8 MiB selected text; multiple series/prices exist; current eligible provider candidates are zero |
| 2026-08-19 | SQLite metadata | `PRAGMA auto_vacuum`; `PRAGMA freelist_count` | Establish physical cleanup semantics | `auto_vacuum=NONE`; dropping legacy objects frees reusable pages but does not shrink the file automatically |
| 2026-08-19 | Architecture review | `design-review-report.md` (`ARCH-REV-001`, `AR-001`–`AR-003`); `architecture-review-revision-record.md` | Validate the initial design against approved bounded-state and upgrade-path contracts | Required a hard cumulative-series capacity/overflow rule, bounded same-ID sibling migration repair, and a temporal/admission ordering key instead of event identity |
| 2026-08-19 | Architecture re-review | `design-review-report.md` (`ARCH-REV-002`, `AR-004`, `MP-003`); `architecture-review-revision-record.md` | Validate `SR-002` composition across failed consolidation and resumed writes | Prior findings resolved; reachable same-run replay can enter target while the same fact remains legacy, so additive retry needs an exact bounded overlap admission/provenance protocol |
| 2026-08-19 | Existing-run restore path | `src/agent-execution/services/standalone-agent-run-activation-service.ts`, especially `restoreStarted`; run-history activation callers | Verify `MP-003` is a supported lifecycle | Restore reuses the exact persisted `runId` and provider conversation identity; provider replay after restart is reachable, not synthetic |
| 2026-08-19 | Legacy identity/index evidence | `prisma/schema.prisma`; `createTokenUsageUpdatedPayload`; ledger repository latest-snapshot query | Find bounded overlap keys/checkpoint sources | Legacy has globally unique indexed `usage_event_id` and `idempotency_key`, indexed `(snapshot_series_key,run_id,observed_at)`, and stable run/series facts; exact identity lookup and series-only keyset checkpoint derivation need no full ledger read |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Current Supported Trigger / Contract | Current Production Path And Outcome | Desired / Preserved Outcome | Evidence |
| --- | --- | --- | --- | --- |
| BEH-001 | Runtime emits or replays `TOKEN_USAGE_UPDATED`, including after restoring an existing run | Adapter -> enrichment -> component/delta/cost projections -> scheduled persistence -> one new legacy event row; after target cutover an unguarded replay could overlap retained legacy | After success, atomically fold into one current row. While consolidation is incomplete, reject pre-existing-run restoration before provider startup; newly allocated runs use only current storage | Write spine, restore service, identity allocator, migration readiness |
| BEH-002 | Run/member/team summary requested | Ledger store lists rows; adapters sum per-event accounting/cost columns | Direct run-row read; root/team result sums each concrete member/delegated row once; preserve GraphQL shape | Store/repository/GraphQL sources |
| BEH-003 | Settings statistics query supplies a date range | Repository selects events whose `observed_at` is inside exact timestamps, then groups/sums | Approved: select runs created in range and show lifetime totals; do not add bounded rollups | Statistics provider, GraphQL, web UI/docs |
| BEH-004 | Either released 20260730 token source-shaping migration is pending | Provider-name materializes wide full candidates/pre/post snapshots; model-value materializes full narrow pre/post arrays and linear skip details; provider-name dependency can also lead to startup-fatal readable-provider status | Both unchanged IDs use narrow/batched/CAS/scalar/capped processing; provider display failure is nonfatal and decoupled from independent identity safety | Both migration definitions, registry, dependency, runtime gate |
| BEH-005 | Existing event-ledger installation upgrades; consolidation can fail and later retry after current writes | No contraction path; a naive additive retry can count a restored-run replay in both schemas | Make restored-run replay Not Reachable through current-only readiness gating; permit only globally unique new-run current rows; migration retry proves legacy/current run-ID disjointness before import/cleanup | Schema, runner, restore path, allocator, `MP-003`, SQLite pragmas |
| BEH-006 | Provider-name repair, consolidation, or current schema deployment fails | Readable-provider prerequisite can exit startup; current code does not classify capability versus platform invariants | Provider-display/consolidation app-data failure is capability-scoped with history/restore unavailable and new work current-only; missing required current schema may stop startup without a legacy fallback; corrected external release retries | README convention, Prisma-before-app-data ordering, runtime gate, restore path |

## Design Health Assessment Evidence

- Change posture: `Larger Requirement` combining `Bug Fix`, `Performance`, `Behavior Change`, `Refactor`, and persisted-data contraction.
- Design issue signal: `Yes`.
- Root cause classification: primary `Boundary Or Ownership Issue`, plus `Missing Invariant` and `Shared Structure Looseness`.
- Refactor posture: `Likely Needed` / required in this change.
- Reason: the persistence boundary owns wide events rather than cumulative agent-run accounting state; reconciliation, pricing inputs, derived totals, audit payloads, display facts, and topology metadata share one event structure. Readers compensate by rebuilding current state from arrays, and the migration bypasses bounded access entirely.

| Observation | Design Health Implication |
| --- | --- |
| Event frequency directly multiplies an 83-column durable record | Missing bounded one-row/run invariant |
| Enrichment is serialized per run but persistence is detached via `setImmediate` | Atomicity/order must be owned by durable folding, not assumed from event order |
| Codex cumulative and AutoByteus/Claude delta sources share the pipeline | Persisted API must accept normalized advancement plus compact reconciliation, not raw latest values |
| Run/team readers require event arrays | Repository subject and read APIs are wrong for current-state reporting |
| Both released token source-shaping backfills materialize whole-ledger state/diagnostics | Transition prerequisites violate bounded-memory design and can prevent consolidation from being reached |
| Nonessential label failure blocks a safety migration and server startup | Capability/error boundaries are coupled incorrectly |
| Failed consolidation permits restored-run replay before retry | If restoration remains supported, exact overlap machinery is required; the stronger forward-only policy instead makes restoration unavailable and removes runtime legacy ownership |

## Relevant Files / Components

| Area | Relevant Files / Components | Finding |
| --- | --- | --- |
| Database model | `autobyteus-server-ts/prisma/schema.prisma`; token ledger Prisma migrations | Wide append-only model; event uniqueness only; run is indexed, not unique |
| Ingestion/projection | `src/agent-execution/events/processors/token-usage/`; `src/token-usage/projections/` | Current normalizer produces accounting deltas, including Codex snapshot differencing |
| Persistence | `token-usage-ledger-store.ts`; `sql/token-usage-ledger-repository.ts` | Append/list API and detached per-event inserts encode the wrong subject |
| API/statistics | `statistics-provider.ts`; GraphQL token stats; web statistics components/store | Lifetime summaries can use one row; exact observed-period totals cannot |
| Live UI | event dispatch/websocket Token Meter path | Receives enriched live events independently of database row count and should remain stable |
| App-data migrations | model-value/provider-name backfills, registry/runner, readable-ID migration, consolidation seam | Source-shaping steps were unbounded; provider-name has fatal coupling; all legacy decode/query/fold and retry disjointness validation must remain inside migration boundaries |
| Identity/topology | agent run allocator/provisioning; team topology/delegation services | Exact run ID is suitable unique key for all run kinds |
| Durable docs | `autobyteus-server-ts/docs/modules/token_usage.md`; web settings docs | Must be revised later because they describe append-only/history-period behavior |

## Runtime / Probe Findings

- Representative database file size: ~806 MiB while the application was active.
- Ledger row count advanced from 154,096 to 154,108 during probing; distinct runs remained 1,269. Average was ~121.43 rows/run and maximum 4,499.
- Approximate scope split: Codex cumulative 148,391; AutoByteus per-call 4,908; Codex per-turn/fallback 745; Claude per-turn 52.
- `dbstat` attributed ~690.1 MiB to the table and ~84.4 MiB to its event/idempotency/snapshot/root/run indexes.
- Repeated raw event, raw usage, and pricing snapshot JSON totaled ~475 MB decimal. Text-like values selected by the current 83-column full-row shape totaled ~635.8 MiB.
- Approximately 149.2k rows had null/blank provider names, but zero were currently eligible AutoByteus rows; SQL runtime filtering would have avoided reading them all.
- 228 runs crossed UTC dates (maximum eight days), so a lifetime row cannot reconstruct arbitrary within-run date slices.
- Two runs contained multiple cumulative series (maximum three). Current Codex construction derives one series from `codex_thread:${threadKey}` per run, so multiple legacy series reflect rare resume/rebinding rather than an unbounded supported topology. A hard capacity of eight checkpoints gives more than 2.6× the observed maximum while keeping per-run state fixed.
- Forty-eight runs contained multiple price/status tuples (maximum three), so migration and API semantics cannot truthfully expose only the latest price as if it applied to the lifetime total.
- All sampled runs had one runtime/model identity, but migration must still handle conflicts explicitly rather than relying on this observation.
- Aggregate component identities matched in the sample, supporting sum-based consolidation of normalized accounting columns.
- The local provider migration had succeeded before growth; rerunning the current code now would likely cross the same result-size boundary even though no eligible row exists.
- `TokenUsageSnapshotDeltaNormalizer` presently keys in-memory/durable lookup by raw `(run_id, snapshot_series_key)`, and `snapshot_series_key` embeds an opaque thread key. The target must hash this key before durable storage so provider-sized identity text cannot bypass the entry cap.
- `createTokenUsageUpdatedPayload` can assign multiple observations the same millisecond `observed_at`, while `usage_event_id` may be a random UUID/provider composite. Event identity therefore is not a temporal ordinal. Current legacy persistence has a monotonic numeric SQLite `id`, and the target per-run transaction can increment a durable `fold_revision`; these are the evidence-backed equal-time admission ordinals.
- The custom-provider model-value sibling currently selects seven columns for every ledger row, records scope/valid-non-composite skips linearly, rereads all rows, and builds/sorts whole-ledger identity arrays. Although narrower than the provider-name `SELECT *`, it remains unbounded by row count and runs earlier in the registry.
- `TokenUsageLedgerEvent` has unique indexes for `usage_event_id` and `idempotency_key`, and an index for snapshot series; these remain useful to migration-owned bounded folding but are no longer a permitted runtime dependency.
- `StandaloneAgentRunActivationService.restoreStarted` reuses `metadata.runId` and provider conversation identity. That evidence established `MP-003`: without a gate, a provider can replay a legacy-last observation into current storage.
- A current-only digest ring cannot solve cross-schema overlap without reading legacy state. The new user-approved boundary therefore rejects pre-existing-run restoration while consolidation is incomplete; the provider never starts, and newly allocated run IDs remain disjoint by allocator contract.

## Findings From Code / Docs / Data / Logs

1. The incident diagnosis is confirmed. This is a scalability and ownership defect, not evidence of malformed SQLite data.
2. The user's one-row invariant is compatible with canonical agent run identity and lifetime run/team summaries.
3. A naive latest-payload upsert is not compatible with current source semantics. The new owner must atomically add normalized deltas and reconcile cumulative series with a hard eight-entry/fixed-byte checkpoint state; the ninth-series overflow path must baseline without overcount and disclose possible undercount.
4. Event-level raw JSON and full pricing snapshots are not required by current summary APIs; retaining them in the authoritative cumulative store would preserve the dominant storage defect.
5. The provider-name migration can narrow eligibility completely in SQL and update one display field by compare-and-set. Full-row before/after snapshots are unnecessary.
6. Provider-name snapshots preserve historical display quality but are not the independent authority for secret-vault/provider readable-identity safety. The hard prerequisite can be removed without hiding a separate safety failure.
7. A released-data contraction is required. Selecting the latest legacy row would lose delta usage and costs; legacy rows must be aggregated once per run with deterministic latest/first/mixed-field handling.
8. Partial historical migration must not be exposed as complete statistics. The README convention favors one bounded SQLite transaction over a bespoke journal: failure rolls back the legacy merge, while normal repository code remains current-schema-only.
9. Dropping the old table stops active dependence and makes pages reusable. Mandatory startup `VACUUM` would create a different availability/disk-risk problem.
10. The recovery path requires three ordered migration dispositions: repair `20260730_token_usage_custom_provider_model_value_backfill` and `20260730_token_usage_provider_name_snapshot_backfill` under their unchanged IDs, then run a separately identified consolidation while legacy rows remain. Shipping only the new consolidation would not repair machines stopped at either released predecessor.
11. The event pipeline already awaits transformers per run but the persistence processor detaches writes with `setImmediate`. Replacing it with an awaited persistence transformer preserves live dispatch after processing while establishing durable order; per-event failures can remain contained so the live event still returns.
12. The current GraphQL app-data mutation permits manual retry after startup. The consolidation must be startup-only/restart-required; otherwise a long SQLite transaction can contend with current run-row writes and lose persistence attempts even though live agent work continues.
13. Latest-field order must not use `usage_event_id`. Legacy migration folding uses `(observed_at, numeric ledger id)`; current runtime folding uses `(observed_at, committed fold revision)`. The new disjoint-run rule eliminates same-run cross-schema latest-field merging.
14. `MP-003` was reachable under the earlier continuation policy: failed consolidation -> healthy startup -> `restoreStarted` reuses the same run/provider -> replay enters current storage. `ARCH-REV-003` correctly required exact overlap handling for that policy.
15. `SR-003` supplied exact overlap handling, but it required current runtime to query/interpret the legacy table. The user's stronger forward-only rule now rejects that compatibility seam rather than its correctness.
16. Under `SR-005`, migration-incomplete readiness rejects pre-existing-run restoration before provider startup, so `MP-003` becomes Not Reachable. Newly allocated run IDs may use the current table; migration retry validates their IDs do not intersect legacy IDs.
17. The README convention deliberately assumes one writer, a stable normal attempt, sufficient access, and normal SQLite/filesystem behavior. Quit, kill, shutdown, and power-off collapse to one incomplete-attempt category governed by SQLite commit/rollback and ordinary runner relaunch; unsupported infrastructure/security premises add no machinery.
18. Availability is classified, not absolute. Provider-display/consolidation app-data failure is capability-scoped when the current schema is valid; absence of a required current table/column/constraint or other core current invariant may stop startup. Neither disposition permits a legacy runtime fallback.
19. Forward-only current source means every old table/column decoder, legacy query, and old-to-current fold lives inside registered migration boundaries. Runtime readiness may gate history/restore from migration status, but it cannot query legacy storage.
20. A critically blocked user may install a corrected release from the external distribution channel. The current broken build need not expose an in-app updater; corrected schema/app-data migrations retry without fabricated success or manual production-data mutation.
21. `SUCCEEDED_WITH_WARNINGS` is truthful only after independently valid current data is established; it cannot hide a missing required target or be used merely to keep startup green.
22. The controlling availability question is whether the schema, current-format values, and integrity/safety invariants actually required by current application owners are present and independently valid. Migration-step failure by itself is not the startup criterion.
23. An old database column/table, obsolete JSON attribute, superseded file, or stale legacy value may remain as bounded warning residue when the current target is complete, current code cannot observe the residue, and no independent removal contract applies. Runtime must not read the residue as compatibility input.
24. Residue is not a warning when current discovery observes both shapes and can duplicate/choose ambiguously, when cleanup rollback means the current target was not committed, or when security/privacy/retention/storage rules independently require removal. Missing required current database/file facts remain capability-scoped or critical according to their real application owner.

## Persisted Data Transition Evidence

- Current stored subject/location: Prisma `TokenUsageLedgerEvent` / SQLite `token_usage_ledger_events` in `autobyteus-server-ts`.
- Current representative shape/volume: 83 columns; ~154.1k rows for 1,269 runs; ~774.5 MiB table/index pages.
- Required semantic change: one authoritative cumulative record per canonical `run_id`, with compact reconciliation state and without raw per-notification payloads.
- Current normal readers/writers: all current production token persistence and summary paths use append/list-event APIs; no current one-row compatibility path exists.
- Direct-use conclusion: `No`. Existing duplicate rows violate target uniqueness, and their normalized values are deltas, so they must be aggregated rather than winner-selected.
- Preserve/transform: normalized token components, component/total costs and truthful status, report count, root/run/task/display attribution, observation bounds, latest prompt/context, identity facts, the latest-order marker, and up to eight most-recent compact cumulative-series checkpoints. Lifetime aggregates from all historical series are preserved even when older checkpoints exceed the cap; only future reconciliation state is compacted, with a quality flag.
- Discard only after validation: raw event/usage/pricing JSON, per-event identities/timestamps not needed by aggregates, superseded rows, and event-only indexes.
- Transition constraints: bounded/keyset legacy reads inside one migration transaction; standard rollback when the transaction does not commit; pre-existing-run restore/history gating while incomplete; newly allocated current run IDs disjoint from legacy; per-run/global aggregate and intersection validation. Normal runtime has zero legacy query/decode dependency.
- Availability constraint: provider-display/consolidation app-data failure is capability-scoped when current schema is valid; historical reads and pre-existing-run restore are unavailable, while unrelated/new-run work remains current-only. Missing required current schema/core invariants may stop startup until an externally installed corrected release retries.
- Cleanup constraint: validated success deletes all legacy rows so pages become reusable. The empty table/model/index contract remains migration-only because Prisma deploy precedes app-data migration; unsafe same-release physical drop and startup `VACUUM` are excluded.

## Constraints / Dependencies / Compatibility Facts

- User explicitly directed bootstrap from `origin/personal`.
- Existing lifetime totals must remain accurate for standalone, direct/nested team, and delegated/task agent runs.
- Runtime source normalization remains authoritative; this ticket changes durable folding, not provider interpretation.
- Current GraphQL/live field contracts should remain stable except for the explicitly approved period semantics and truthful mixed/unknown display states.
- The existing migration runner records failure and retries, but has no ready-made durable per-batch progress/capability degradation abstraction; design must allocate these responsibilities explicitly.
- In-place historical definition repairs are compatible with the runner: `FAILED` records retry using definitions from the newly installed build. The consolidation must use a new ID, require success-or-warning completion of both repaired 20260730 source-shaping steps, and leave its source table intact while either prerequisite is failed/retryable.
- Full query results and diagnostics must be bounded independently of ledger cardinality and wide-text size. Migration-owned legacy batches are <=250 minimal scalar rows; current runtime never performs cross-schema identity or checkpoint reads. Retry proves legacy/current run-ID disjointness with bounded/scalar database validation.
- [`data-migration-conventions.md`](./data-migration-conventions.md) is the authoritative assumptions/reachability supplement. It rules out cause-specific abrupt-termination and unsupported infrastructure/security recovery machinery; ordinary SQLite transaction semantics and existing-runner relaunch are the default. Delivery should promote/link the reusable convention at the recorded repository documentation destination.
- The convention classifies failures: valid current schema plus failed noncore app-data migration is capability-scoped; missing required current schema/core invariants may be globally fatal. In both cases current code remains forward-only, and a corrected externally installed version may retry.
- The convention's worked examples classify the final persisted current contract across SQLite and structured files. Inert legacy cleanup residue can be a bounded warning only after the current target is independently valid and only when no current discovery or independent removal contract can observe or prohibit it.

## Open Unknowns / Risks

- Exact arbitrary-period usage is intentionally retired; public copy and GraphQL documentation must describe run selection plus lifetime totals accurately.
- The design fixes cumulative reconciliation at eight SHA-256-keyed checkpoints and 16 KiB encoded state, with deterministic least-recent eviction/no-charge baseline; the residual risk is explicitly bounded undercount if a run churns through more than eight series, not unbounded growth or overcount.
- Current runtime may receive writes for newly allocated runs between failed startup attempts. Global run-ID uniqueness plus restore gating should keep them disjoint from legacy; migration explicitly validates intersection before import. Pre-existing-run continuation is temporarily unavailable rather than supported through compatibility logic.
- SQLite file size will not fall automatically under `auto_vacuum=NONE`; user expectations must distinguish reusable space from physical shrink.
- Degraded startup needs an explicit historical-statistics capability status so partial migrated data is not presented as complete.
- Safe physical schema contraction is constrained by skip-version upgrades: a normal Prisma drop always runs before the app-data consolidation. This ticket therefore decommissions and empties the legacy table but leaves its dormant physical/model contract outside normal runtime ownership.

## Reproduction / Environment Setup

- No external service, account, or network source was required.
- Repository and release-tag inspection was read-only.
- Production SQLite probes were read-only aggregate/metadata queries; the running application continued writing, explaining small count differences.
- No database copy or mutation was made during investigation.
- Cleanup: none required beyond the normal ticket worktree lifecycle.

## Notes For Architecture Reviewer

`SR-006` supersedes the delivered `SR-005` snapshot only as a governance/example clarification. Preserve the historical validity and resolution trail of `AR-001`–`AR-004` and all `SR-005` mechanics: current source remains forward-only, `MP-003` remains Not Reachable through restore gating, and no runtime overlap guard/protocol marker returns. Review should additionally confirm the explicit current-application-contract test and worked SQLite/structured-file classifications: independently valid current target plus inert nonrequired cleanup residue may be `SUCCEEDED_WITH_WARNINGS`; missing required current facts, observable old/new ambiguity, rolled-back target creation, or independently required removal may not.
