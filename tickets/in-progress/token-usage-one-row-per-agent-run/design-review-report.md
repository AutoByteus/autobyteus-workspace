# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`
- Triggering Downstream/Rework Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-rework-record.md`; `delivery-evidence/11-production-migration-failure-dr004.log`; `delivery-evidence/13-exact-root-cause-dr004.log`; `implementation-handoff.md`; `implementation-revision-record.md`; `code-review-report.md`; `code-review-revision-record.md`; `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; `api-e2e-revision-record.md`; `api-e2e-test-review-report.md`; `delivery-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005`, `SR-006`, `SR-007`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-007`
- Current Review Round: `7`
- Trigger: User-directed `SR-007` re-review after production-shaped Electron verification failed at the nullable SQLite/Prisma scalar boundary (`DR-004`).
- Prior Review Round Reviewed: Round 6 / `ARCH-REV-006`
- Latest Authoritative Round: `7`
- Current-State Evidence Basis: Approved `REQ-001`–`REQ-027` / `AC-001`–`AC-026`; investigation and both supplements; `DR-004` delivery rework record; exact production failure and safe-backup reproduction logs; current Prisma raw-query and SQLite JSON semantics; previously confirmed run identity/restoration/startup evidence; historical `MP-003`; and the complete `SR-007` DS-009 transport/parser, ownership, interface, file, rollback, and real-adapter coverage design. Existing downstream source/test edits are not used as proof of design sufficiency.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The one-row model, run-created-range/lifetime semantics, forward-only runtime, migration-only legacy ownership, degraded history/restore gate, disjoint retry, and failure classification remain approved. `SR-007` adds one migration-boundary requirement: every nullable cumulative-source JSON scalar must cross Prisma as explicit source type plus exact text and be strictly decoded before the legacy fold.
- Relevant existing behavior and evidence confirmed: Yes. The Electron candidate attempted the registered startup consolidation three times against 157,742 healthy legacy rows / 1,283 runs and imported zero rows. In the first ordered run, four leading SQL `NULL` values caused later valid SQLite integers `28826658` and `28987545` to arrive from the real Prisma adapter as decimal strings; a non-null-first result returned the same semantic value as `bigint`. The prior TypeScript generic did not normalize runtime values and the old decoder falsely reported a SafeInt failure. SQLite quick-check and all 15 source-field scans ruled out invalid production token data.
- Approved change, preserved behavior, and outside scope understood: Yes. DS-009 replaces bare nullable `json_extract` projections with a closed-field, parameterized type-tagged text transport and exact migration-only parser. It preserves the transaction, rollback/retry, current schema/domain/API, readiness lifecycle, and all prior resolved findings. Broad coercion, runtime compatibility, user-database mutation, shutdown-specific recovery, corruption/tampering handling, and mandatory physical compaction remain excluded.
- Remaining material ambiguity, if any: None. `REQ-023` expressly makes restoration/continuation of any pre-existing canonical run unavailable while consolidation is incomplete; the blanket restore assertion in the design implements that approved availability tradeoff.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | None. Current observations fold atomically; incomplete consolidation rejects pre-existing-run restoration before provider creation. |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | None. Readiness precedes direct current-record run/member/team reads and truthful aggregation. |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | None. Settings selects runs by created/fallback time and displays their lifetime totals. |
| BEH-004 | Operational | Pass | Pass | Pass | Confirmed | None. Both unchanged-ID source-shaping definitions remain bounded, migration-only, ordered, runner-retryable, and classified against the nullable/fallback current display contract. |
| BEH-005 | Operational | Pass | Pass | Pass | Confirmed | None. DS-009 deterministically normalizes the observed Prisma/SQLite representation before DS-006 folding; failure remains atomic and retryable, and the unchanged degraded lifecycle admits only globally new current run IDs. |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | None. The bootstrap classifier tests the final current contract, distinguishes inert residue from incomplete or ambiguous data, and separates capability degradation from critical current-schema failure without an old-runtime fallback. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `token-usage-data-model-analysis.md` | Pass | Pass | Pass | Pass | Pass | None. It remains evidence/context and now preserves the exact production-adapter representation evidence and the deterministic typed-transport conclusion without changing product behavior. |
| `data-migration-conventions.md` | Pass | Pass | Pass | Pass | Pass | None. It coherently distinguishes database meaning, SQLite storage class, ORM metadata, and JavaScript representation; requires production-adapter/result-shape-preserving evidence; and keeps the adapter-specific rule inside migration ownership. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The persisted-data contraction, behavior change, refactor, and migration posture are explicit. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Wrong durable subject, missing invariant, detached persistence, event-array readers, unbounded predecessors, prior compatibility pressure, and the newly observed TypeScript-generic/Prisma-runtime representation mismatch are tied to current code and production-shaped evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor now; physical legacy-contract removal and physical file compaction are explicitly deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Spines, owners, current record, readiness, migrations, disjointness, DS-009 transport/parser, files, removals, sequence, examples, and real-adapter coverage are concrete. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Current runtime write/live path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Bounded current fold | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Run/team/member reads | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Settings statistics | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Bounded released repairs | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Migration-only consolidation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Degraded/fatal startup lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | New-run versus restore admission | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Nullable legacy scalar transport | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-009 is a bounded local spine inside DS-006: SQLite JSON meaning is converted to an explicit type/value transport by the consolidation repository, then admitted by the legacy row decoder as exact `bigint | null` or rejected before any fold/import/delete. It does not create a second consolidation owner or leak adapter types into current runtime. DS-007/DS-008 and all prior lifecycle mechanics remain coherent.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TokenUsageRunAccumulator` | Pass | Pass | Pass | Pass | Owns per-run serialization and the current transaction/fold only. |
| `TokenUsageRunStore` / statistics provider | Pass | Pass | Pass | Pass | Own current subject queries and readiness-scoped summaries. |
| `TokenUsageMigrationReadiness` | Pass | Pass | Pass | Pass | Exposes separate history, restore, and current-schema assertions; it has no legacy data access. |
| Run activation services | Pass | Pass | Pass | Pass | Enforce restore readiness before provider construction and keep migration details outside lifecycle code. |
| Released source-shaping migrations | Pass | Pass | Pass | Pass | Each owns its narrow historical candidate/CAS/scalar path. |
| Consolidation migration | Pass | Pass | Pass | Pass | Sole owner of legacy schema, disjointness, fold, import, validation, and deletion. |
| Consolidation repository / legacy row decoder | Pass | Pass | Pass | Pass | Repository owns closed-field SQL transport; decoder owns untrusted tag/grammar/BigInt/range admission. Neither owns current codecs or fold policy. |
| Bootstrap classifier | Pass | Pass | Pass | Pass | Owns capability-scoped versus critical current-invariant disposition. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current token runtime | Pass | Pass | Pass | Pass | Depends only on current token types/repository/readiness; no migration type or legacy query. |
| Run activation | Pass | Pass | Pass | Pass | Depends on readiness, not migration repositories or legacy facts. |
| GraphQL/statistics | Pass | Pass | Pass | Pass | Uses current use-case boundaries and typed readiness errors; no resolver SQL/event arrays. |
| App-data transition | Pass | Pass | Pass | Pass | Legacy knowledge flows inward to registered migrations only; current target builders may be reused in the allowed direction. |
| Derived legacy scalar transport | Pass | Pass | Pass | Pass | Closed field/path metadata flows to parameterized SQL, then untrusted string-or-null values flow through the exact migration parser; bare computed expressions, unchecked casts, untagged strings, and broad numeric coercion are forbidden. |
| Bootstrap classification | Pass | Pass | Pass | Pass | Current platform/schema evidence determines degraded versus fatal; no fallback constructs an old runtime. |
| Migration governance | Pass | Pass | Pass | Pass | Core artifacts reference one convention; ticket mechanics remain in the design and durable promotion is delivery-owned. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `recordObservation(observation)` | Pass | Pass | Pass | Low | Pass |
| `getSnapshotCheckpoint({runId,seriesKey})` | Pass | Pass | Pass | Low | Pass |
| Run/team/member summary methods | Pass | Pass | Pass | Low | Pass |
| `listRunsCreatedInRange(start,end)` | Pass | Pass | Pass | Low | Pass |
| `assertHistoricalReadReady()` | Pass | Pass | Pass | Low | Pass |
| `assertExistingRunRestoreReady()` | Pass | Pass | Pass | Low | Pass |
| `assertCurrentSchemaReady()` | Pass | Pass | Pass | Low | Pass |
| Source-shaping candidate/CAS methods | Pass | Pass | Pass | Low | Pass |
| `legacyCurrentRunIdOverlapExists()` | Pass | Pass | Pass | Low | Pass |
| `legacySnapshotSourceProjection(field)` | Pass | Pass | Pass | Low | Pass |
| `asSourceSafeInt(value,field)` | Pass | Pass | Pass | Low | Pass |
| `executeConsolidation()` | Pass | Pass | Pass | Medium | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-run event sequencing | Pass | Pass | N/A | Pass | Existing awaited pipeline sequencing is extended; no worker is added. |
| Token projections/pricing | Pass | Pass | N/A | Pass | Provider interpretation remains unchanged. |
| Canonical run identity | Pass | Pass | N/A | Pass | Existing UUID/collision-aware allocator supplies the new-run contract; migration independently checks set intersection. |
| Restore admission | Pass | Pass | Pass | Pass | Existing activation boundaries are the correct place to gate before provider construction. |
| App-data status/retry/SQLite transaction | Pass | Pass | N/A | Pass | Existing runner and real transaction remain the recovery/completion boundary. |
| Nullable derived scalar transport | Pass | Pass | Pass | Pass | Existing closed cumulative-field metadata and the consolidation repository/decoder are extended; no generic adapter layer or runtime type is introduced. |
| Detailed audit history | Pass | Pass | N/A | Pass | Correctly not recreated. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent event pipeline | Pass | Pass | Pass | Pass | Awaited persistence boundary only. |
| Current token domain/services | Pass | Pass | Pass | Pass | Current fold and one-run authority are cohesive and legacy-free. |
| Current SQL persistence | Pass | Pass | Pass | Pass | One target table/repository/codec owner. |
| Token history/statistics | Pass | Pass | Pass | Pass | Current records plus explicit readiness. |
| Run activation | Pass | Pass | Pass | Pass | Restore admission is separated from migration implementation. |
| App-data migrations | Pass | Pass | Pass | Pass | Both repairs and consolidation exclusively own legacy knowledge; DS-009 is contained inside the consolidation repository/decoder boundary. |
| Bootstrap/readiness | Pass | Pass | Pass | Pass | Current-invariant classification is explicit and does not compete with migration ownership. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Unknown/single/mixed merge | Pass | Pass | Pass | Pass | Shared finite-state truth remains tight. |
| Aggregate/status merge | Pass | Pass | Pass | Pass | Reused for current/team/migrated target facts without exposing legacy rows. |
| Bounded checkpoint/idempotency state | Pass | Pass | Pass | Pass | Count/byte caps, digesting, and eviction have one current owner. |
| Compact current record codec | Pass | Pass | Pass | Pass | Enforces BigInt and bounded JSON at the persistence boundary. |
| Migration readiness result | Pass | Pass | Pass | Pass | One current capability object serves history, restore, and bootstrap without becoming a legacy facade. |
| Closed cumulative-source field set | Pass | Pass | Pass | Pass | Existing semantic field metadata safely constrains JSON paths and generated aliases; it does not become open SQL input. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenUsageRunRecord` | Pass | Pass | Pass | Pass | Pass | One cumulative current subject; no raw event or transition marker. |
| `TokenUsageFoldObservation` | Pass | Pass | Pass | Pass | Pass | Transient current input, not a stored or public DTO. |
| Fixed checkpoint/digest state | Pass | Pass | Pass | Pass | Pass | Hard capacities and canonical SHA-256 shapes are explicit. |
| Admission marker | Pass | Pass | Pass | Pass | Pass | Current revision ordering remains separate from event identity; legacy ordinal construction stays migration-only. |
| `TokenUsageMigrationReadiness` | Pass | Pass | Pass | Pass | Pass | Current capability disposition only; no source shape/count. |
| `LegacyJsonIntegerTransport` | Pass | Pass | Pass | Pass | Pass | Explicitly untrusted string-or-null input; the exact parser returns only checkpoint bigint-or-null, so adapter representation never overlaps the current record/API type. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current domain/fold/aggregate files | Pass | Pass | Pass | Pass | Current record, observation, finite-state, and reducer roles are separated. |
| Run store/accumulator/repository/codec | Pass | Pass | Pass | Pass | Current use-case, transaction, SQL, and mapping roles are coherent. |
| `token-usage-migration-readiness.ts` | Pass | Pass | Pass | Pass | Owns current capability assertions only. |
| Standalone/team/task activation services | Pass | Pass | N/A | Pass | Integrate restore/schema readiness at the supported lifecycle boundary. |
| Both released source-shaping files | Pass | Pass | Pass | Pass | Same-ID repair inventories remain complete and bounded. |
| `legacy-token-usage-consolidation-repository.ts` | Pass | Pass | Pass | Pass | Owns closed-field type-tagged SQL projection plus existing bounded consolidation persistence operations. |
| `legacy-token-usage-row.ts` | Pass | Pass | Pass | Pass | Owns untrusted transport shape and exact tag/grammar/BigInt/SafeInt admission before legacy mapping. |
| Remaining `token-usage-run-records-v1/*` | Pass | Pass | Pass | Pass | Retains sole fold/orchestration/validation ownership without absorbing adapter representation. |
| `data-migration-conventions.md` | Pass | Pass | Pass | Pass | Owns reusable migration governance rather than ticket algorithms. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current token domain/services/providers/repository | Pass | Pass | Low | Pass | Explicitly current-schema-only. |
| Run activation services | Pass | Pass | Medium | Pass | Existing lifecycle boundary is reused and must remain migration-detail-free. |
| Released migration files | Pass | Pass | Low | Pass | Historical same-ID owners remain registered. |
| `app-data-migrations/.../token-usage-run-records-v1/` | Pass | Pass | Low | Pass | Correct exclusive historical boundary for DS-009 and DS-006; no tagged transport enters current source. |
| Prisma current model plus dormant legacy declaration | Pass | Pass | Medium | Pass | Physical declaration is retained only for schema-before-data ordering; legacy access remains migration-only. |
| Ticket convention -> durable project docs/README link | Pass | Pass | Low | Pass | One current task authority and one delivery-owned durable destination are explicit. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Detached event persistence and ledger append/list APIs | Pass | Pass | Pass | Pass | Replaced by awaited current run persistence. |
| Event-array summaries and raw payload persistence | Pass | Pass | Pass | Pass | Replaced by current row projections; no replacement event ledger. |
| Whole-ledger behavior in both released repairs | Pass | Pass | Pass | Pass | Replaced by narrow keyset/CAS/scalar behavior. |
| Runtime overlap guard/legacy SQL/source-count mode/checkpoint seed | Pass | Pass | Pass | Pass | Removed under `SR-005`; readiness and migration disjointness replace it. |
| Protocol marker and same-run cross-schema merge | Pass | Pass | Pass | Pass | Removed; migration rejects overlap instead. |
| Populated legacy rows | Pass | Pass | Pass | Pass | Deleted only after migration-owned validation; empty physical contract is explicitly deferred. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Normal token runtime summaries/writes/activation | No | Pass | Pass | Current code has no old-reader/writer/decoder/guard or read-old fallback. |
| Failed-consolidation capability behavior | No | Pass | Pass | Current readiness rejects affected operations; only globally new runs use the target table. |
| Registered migrations | No | Pass | Pass | Historical schema knowledge is transition ownership, not runtime compatibility. |
| Dormant physical legacy table/model declaration | No | Pass | Pass | Retained solely for safe Prisma-before-app-data ordering; it is empty after success and has no runtime callers. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Provider-name source shaping | Migration Required | Pass | Pass | Pass | Pass | Same-ID narrow/batched/CAS/scalar repair remains complete and independently nonfatal. |
| Model-value source shaping | Migration Required | Pass | Pass | Pass | Pass | The transition-critical predecessor is now bounded under its unchanged ID. |
| Event ledger -> run records | Migration Required | Pass | Pass | Pass | Pass | Ordering, isolated migration ownership, scalar disjointness, bounded fold, single transaction, validation, cleanup, and empty-source relaunch recognition are complete. |
| Nullable cumulative-source JSON scalars | Migration adapter normalization | Pass | Pass | Pass | Pass | Observed result-shape instability is resolved at SQL/decoder ownership with closed paths, explicit type tags, canonical digits, exact `BigInt` parsing, SafeInt range enforcement, and pre-cleanup rollback. |
| Failed-interval current rows | Directly usable current rows | Pass | Pass | Pass | Pass | Only globally new run IDs are admitted; retry preserves them unchanged and rejects any legacy intersection before mutation. |
| Current reconciliation state | Migration Required / current fold | Pass | Pass | Pass | Pass | Historical totals remain complete while checkpoint/idempotency state is compacted to the supported hard bounds. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Current runtime cutover | Pass | Pass | Pass | Pass |
| Released predecessor repairs | Pass | Pass | Pass | Pass |
| DS-009 migration adapter correction | Pass | Pass | Pass | Pass |
| Degraded new-run/history/restore lifecycle | Pass | Pass | Pass | Pass |
| Consolidation and dormant-contract phase | Pass | Pass | Pass | Pass |
| Critical current-schema failure and corrected release | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Bounded 8/9/reappearing-series behavior | Yes | Pass | Pass | Pass | Capacity, baseline, undercount flag, and no-overcount rule are explicit. |
| Equal-time latest facts | Yes | Pass | Pass | Pass | Legacy row ordinal and current revision remain explicit and separated by boundary. |
| Large released repairs | Yes | Pass | Pass | Pass | Both ~147k fixtures and bounded query shapes are named. |
| Leading-NULL Prisma transport regression | Yes | Pass | Pass | Pass | Four leading `NULL` rows followed by `28826658` and `28987545` in one ordered real Prisma/SQLite batch reproduces the verified defect; mock/one-row/non-null-first substitutes are explicitly rejected. |
| Wrong source type/grammar/range | Yes | Pass | Pass | Pass | JSON real/text/boolean/container, negative/noncanonical/malformed/untagged transport, and `9007199254740992` are rejected before import/delete with source retained and target empty. |
| Failed consolidation, rejected old restore, new run, retry | Yes | Pass | Pass | Pass | `R-old`/`R-new` covers the full supported lifecycle and injected overlap rejection. |
| Critical current schema failure | Yes | Pass | Pass | Pass | Fatal startup, no legacy call, and corrected external release are explicit. |
| Abrupt termination and unsupported infrastructure/security premises | Yes | Pass | Pass | Pass | One SQLite incomplete-attempt disposition is distinguished from unsupported cause-specific machinery. |
| Final current-contract warning classification | Yes | Pass | Pass | Pass | Nullable metadata, inert database objects, obsolete structured attributes, superseded files, incomplete capability data, absent current shapes, and prohibited/observable residue cover the decision boundary without treating physical corruption as legacy content. |

## Material Premise Validation (Only When Needed)

### MP-004 — Nullable SQLite JSON integers can arrive from the production Prisma adapter as result-shape-dependent JavaScript types

- Related approved requirement or established contract: `REQ-017`–`REQ-020`, `REQ-024`–`REQ-027`, `AC-016`–`AC-020`, `AC-023`–`AC-026`; registered startup consolidation for supported released ledgers.
- Relevant behavior ID(s): `BEH-005`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: A user installs and launches the Electron upgrade against a supported populated token ledger, which invokes the required startup app-data migration through the production Prisma/SQLite adapter.
- Support evidence: `DR-004` records three real Electron attempts against 157,742 healthy legacy rows / 1,283 runs. The bounded production log reports failure before scan/import. Safe reproduction against a copied database shows the first ordered run has four leading `NULL` expressions and later SQLite integers `28826658` and `28987545` arrive as JavaScript strings; a non-null-first result arrives as `bigint`. SQLite `quick_check` and the 15-field scan confirm valid nonnegative SafeInt source data. Evidence is preserved in `delivery-rework-record.md`, `delivery-evidence/11-production-migration-failure-dr004.log`, and `delivery-evidence/13-exact-root-cause-dr004.log`.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Electron launch -> Prisma schema expansion -> `AppDataMigrationRunner` invokes `20260819_token_usage_run_records_v1` -> consolidation repository executes the ordered bounded raw query -> leading nullable computed results influence Prisma result metadata/decoding -> later valid integers cross as strings -> a representation-assuming decoder rejects before scan/import -> migration returns `FAILED` and the established capability gate keeps history/restore unavailable.
- Lifecycle preconditions and material consequence at the claimed point: The populated ledger is a supported released source, the current target table exists, and the migration is the required path to establish current history. Without explicit transport normalization, healthy source data cannot consolidate and repeated normal retries reproduce the same failure while target rows remain absent.
- Reachability: `Reachable`
- Review consequence / proportionate response: DS-009 is required and proportionate. The consolidation repository carries JSON source type plus exact text from a closed/parameterized field set; the migration decoder admits only canonical nonnegative `integer:` digits through exact `BigInt` and SafeInt validation; failures occur before destructive cleanup. The real-adapter leading-`NULL` fixture preserves the observed result shape. No runtime compatibility, generic adapter framework, or unsupported recovery machinery is added.

### MP-003 — A legacy-persisted observation can reach the current writer through restored-run replay while consolidation is incomplete

- Related approved requirement or established contract: Historical `AR-004`; current `REQ-005`, `REQ-019`, `REQ-023`, `REQ-024`, `AC-002`, `AC-017`, `AC-022`, and `AC-023`.
- Relevant behavior ID(s): `BEH-001`, `BEH-005`, `BEH-006`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: The run-history surface supports selecting and continuing a persisted run after a normal application relaunch.
- Support evidence: `StandaloneAgentRunActivationService.restoreStarted` and equivalent lifecycle paths reuse the persisted canonical `runId` and provider conversation identity. This was a complete supported trigger for the historical `SR-002`/`SR-003` lifecycle.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Consolidation returns `FAILED` with valid current schema -> startup establishes `CURRENT_SCHEMA_DEGRADED` before providers -> user selects a pre-existing run in run history -> activation calls `assertExistingRunRestoreReady()` -> readiness returns the migration-incomplete capability error before provider construction -> no provider replay or token observation reaches `recordObservation`. A genuinely new run instead receives a globally allocated ID and uses only the current table.
- Lifecycle preconditions and material consequence at the claimed point: Legacy rows remain intact and consolidation status is incomplete. Because the only supported old-run activation path is rejected before a provider exists, the former same-run cross-schema replay state cannot arise through normal target execution. Retry can therefore require disjoint legacy/current run-ID sets and import only when that invariant holds.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: Preserve `AR-004` and its historical evidence, but do not retain its `SR-003` runtime guard, legacy checkpoint reads, protocol marker, or same-run merge under the superseding product lifecycle. The readiness gate plus migration-owned scalar intersection validation is the proportionate current design.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None.

## Classification

`N/A`

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- The single SQLite consolidation transaction can be long and require significant WAL/temporary capacity; implementation and API/E2E evidence must measure a released-scale synthetic fixture without converting this into a bespoke journal.
- New-run correctness during degraded operation depends on the canonical allocator's uniqueness contract; the migration's scalar intersection check must still reject any violation before mutation or cleanup.
- Pre-existing-run continuation and stored history are intentionally unavailable until consolidation succeeds; the typed errors and corrected-release/restart guidance must be clear across standalone, team, nested, delegated, and task-team paths.
- More than eight cumulative series can cause the approved flagged no-overcount undercount after deterministic eviction.
- SQLite pages become reusable but the physical file does not shrink under `auto_vacuum=NONE`; optional compaction remains outside startup.
- BigInt totals may exceed GraphQL/JavaScript safe-integer boundaries; affected queries must fail exactly rather than round, with implementation and API evidence.
- Prisma/driver upgrades can change raw-query representation independently of SQLite meaning. The required real-adapter fixture must execute the actual ordered consolidation query and transaction, including the four-leading-`NULL` condition, rather than only parser units or a first-row-non-null case.
- Rejection diagnostics must remain bounded, field-specific, and truthful across wrong JSON type, grammar/sign, and range failures; the implementation must not reuse the former misleading SafeInt message as the only explanation for every rejected class.
- Delivery must promote the approved convention to `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` and make README a concise reference without creating a second conflicting authority.
- Migration authors must explicitly inventory current readers/writers and any independently governing security, privacy, retention, or storage contract before treating cleanup residue as inert; a cleanup error alone is neither proof of fatality nor proof of harmlessness.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `SR-007` is implementation-ready. DS-009 directly addresses the independently observed Prisma/SQLite representation seam with a deterministic, bounded, injection-safe, migration-only typed transport and strict exact parser. Its ownership, rollback, real-adapter fixture, and rejection boundaries are coherent with the existing one-row, forward-only, degraded-gate, disjoint-retry, and failure-classification design. Resolved `AR-001`–`AR-004` and historical `MP-003` remain intact.
