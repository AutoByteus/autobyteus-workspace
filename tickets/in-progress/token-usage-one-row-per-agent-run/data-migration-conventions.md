# Production Data-Migration Conventions

## Artifact Metadata

- **Canonical task artifact:** `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- **Purpose:** Centralize the deterministic source-to-target rule, operating assumptions, reachability gate, current-application contract test, database-adapter transport rule, failure-isolation/later-upgrade contract, worked classification examples, and proportionate recovery boundary that govern the token-usage migrations, so individual requirements and design sections can reference one authority instead of re-deriving speculative failure handling.
- **Scope:** The repaired token-usage source-shaping migrations, the new ledger-to-run-record consolidation, and any migration fallback, repair, recovery, or lifecycle branch proposed for this ticket. The principles are reusable for later production app-data migrations.
- **Relationship to core artifacts:** Normative supplement for migration constraints in `requirements.md` and `design-spec.md`; evidence and source provenance remain in `investigation-notes.md`; task-specific schemas, algorithms, batching, overlap handling, and sequencing remain authoritative in `design-spec.md`.
- **Related requirements and acceptance criteria:** `REQ-012`–`REQ-027`; `AC-011`–`AC-026`.
- **Status and approval applicability:** Approved governing intent. It makes the user's explicit production-migration and anti-overengineering direction durable; it does not change the approved one-row-per-canonical-run behavior.
- **Repository source:** `autobyteus-server-ts/README.md`, especially “Production data migrations” and “Production migration practice.” This artifact applies that source without replacing it.

## Core Rule: Known Source To Fixed Target

A production data migration is a deterministic transformation from explicitly investigated supported released source shapes to one fixed current target shape.

“Deterministic” means that the same validated source facts and migration version produce the same target facts or the same explicit unsupported disposition. Migration logic must not guess identity, infer meaning from incidental runtime state, depend on wall-clock luck, or choose different outcomes based on hypothetical failure stories. Every supported source subject has a defined outcome; an unsupported source is reported and left intact rather than guessed into a target.

When the source shapes, target shape, and transformation are known, implementation should contain only the validation, bounded transformation, transaction, result validation, cleanup, and ordinary runner retry needed for that mapping. Determinism does not require application code that attempts to survive arbitrary failures of the operating system, hardware, storage substrate, or trust boundary.

## 1. Basic Operating Assumptions

The normal production migration attempt may assume:

- one startup/app-data migration writer;
- a stable process, power source, and device for the normal attempt;
- sufficient permissions and readable/writable storage; and
- normal SQLite and filesystem behavior.

These are operating prerequisites. They are not failure scenarios that require bespoke application recovery machinery. If an independent product, security, or operations contract later withdraws one of these prerequisites, that separate contract must define the new supported boundary before migration machinery is added.

## 2. Equivalent Abrupt-Termination Cases

User Quit, application kill, operating-system shutdown, and power-off are one architectural category at the migration boundary: the process does not complete the attempt.

- Do not create separate lifecycle branches, recovery state machines, journals, backup copies, tests, or product machinery for each label.
- Use standard SQLite commit/rollback semantics as the recovery boundary: committed work is current; uncommitted work is rolled back.
- A later normal startup may execute the normal migration path again through the existing migration runner.
- Describe and test ordinary relaunch/idempotence once for this category. Do not portray a hypothetical deliberate interruption as an independent product requirement.

This convention does not promise application-level recovery from storage behavior that violates normal SQLite or filesystem guarantees.

## 3. Explicitly Unsupported Premises

The following premises do not justify in-scope migration machinery unless an independently approved security or operations contract makes one reachable:

- hostile database tampering or database theft;
- arbitrary filesystem or database corruption;
- kernel, device, or syscall failures outside normal storage behavior;
- a compromised process; or
- adversarial concurrent writers.

“Could technically happen” is not a product trigger. A downstream recovery mechanism, test scaffold, or proposed defensive abstraction cannot prove its own need by first inventing the scenario that it handles.

## 4. Product-Reachability Gate

Any proposed migration fallback, recovery, repair, backup, or lifecycle branch must name an independent initiating basis and trace it forward to the claimed state and consequence.

Acceptable initiating bases are:

- a supported user action;
- a supported system event;
- an approved operational action; or
- an applicable governing product, security, or operations contract.

| Reachability Result | Required Disposition |
| --- | --- |
| **Reachable** | Record the independent trigger, production path, resulting state, and consequence. Add only the smallest mechanism required by that path. |
| **Not Reachable** | Do not add migration machinery, lifecycle branches, or dedicated coverage for the scenario. |
| **Unclear** | Investigate the initiating basis or record a blocked product/design decision. Do not implement a speculative fallback while reachability is unresolved. |

The claimed consequence must follow from the independently supported path. The existence of a recovery mechanism is never evidence that the path is supported.

## 5. Forward-Only Current Runtime, Migration-Only Legacy Knowledge

Current application source must operate against the current schema and current domain model only. It must not retain backward-compatible database behavior to make an incomplete migration appear usable.

The normal runtime must not contain:

- “read old if new is absent” fallbacks;
- dual old/new readers or writers;
- optional-column or missing-table compatibility branches for a released old schema;
- legacy row decoders, legacy JSON interpretation, or old-schema repositories;
- runtime adapters that query a legacy table to reconcile current writes; or
- compatibility wrappers whose only purpose is to keep historical storage active.

Legacy source knowledge belongs inside the migration boundary. A migration may contain versioned legacy row types, old table/column queries, legacy file decoders, explicit supported-shape classification, and old-to-current transformation logic. That code is retained so supported direct and skip-version upgrades can execute, but current business/runtime code does not call it after startup migration disposition.

The normal structure is:

`current schema expansion -> migration-owned legacy read/transform/validation -> current schema/domain -> forward-only runtime`

If the migration does not establish the required current state, the product must choose an explicit capability or startup disposition. It must not restore operation by teaching current runtime code to understand the past schema.

### 5.1 Database Adapter And Transport Representations

Database meaning, SQLite storage class, ORM result metadata, and JavaScript runtime type are distinct contracts. A TypeScript annotation on `$queryRaw` does not convert or validate the value received at runtime. In particular, nullable SQLite computed expressions such as `json_extract(...)` have dynamic type/affinity; the production Prisma boundary may represent the same semantic integer as `bigint` in one result shape and decimal `string` in another when earlier ordered rows are `NULL`.

Migration code that depends on a derived scalar must therefore:

1. reproduce the query through the actual production database and ORM/driver adapter, not only a mocked row object;
2. choose one deterministic transport representation at the SQL boundary when adapter inference is unstable;
3. carry the source type explicitly when multiple SQLite/JSON types could otherwise share text;
4. validate the complete transport grammar before exact parsing;
5. parse integers through `BigInt` or an equivalently exact mechanism before any narrowing;
6. enforce sign, range, and domain constraints before converting to the target type; and
7. keep the adapter-specific projection and decoder inside the migration boundary.

Do not fix an adapter mismatch with broad `Number(value)`, `parseInt(value)`, truthy coercion, a permissive numeric regex, or an unchecked cast. Such fixes can silently admit fractional, exponent, prefixed, truncated, negative, wrong-source-type, or out-of-range values.

The regression fixture must preserve the result-set condition that exposed the defect. For a nullable expression, include leading `NULL` rows followed by valid values in the same ordered batch. Also cover the supported type tag/value and rejected source types/ranges through a real disposable SQLite database and the production ORM/driver. Do not use or mutate a user's live database for automated coverage.

## 6. Failure Classification And Availability

A migration failure is classified by the current application's ability to satisfy its forward-only platform and capability invariants—not by a blanket rule that every failure is nonfatal.

The primary decision test is:

> After this attempt, are every schema element, current-format value, and integrity/safety invariant required by the current application available and independently valid?

Only current requirements count. The mere presence of an old column, old table, obsolete JSON attribute, superseded file, stale legacy value, or cleanup warning does not make the current application unusable. Conversely, creating the new column or attribute is not sufficient when current code requires valid populated values or a governing integrity/safety contract requires another condition.

Apply the test at the narrowest real boundary:

1. identify the schema and current-format facts the current application actually reads or writes;
2. identify the current integrity, security, privacy, retention, identity, and truthfulness invariants independently required for those operations;
3. validate those required facts without reading through a legacy runtime path;
4. classify any unmet requirement as global/core or capability-scoped; and
5. classify everything else as a bounded nonfatal disposition, including inert legacy residue when cleanup is not itself required.

| Failure Class | Required Product Disposition |
| --- | --- |
| **Current platform/schema unavailable** | If schema deployment fails or a required current table, column, constraint, vault, or other platform invariant is absent, global startup failure is acceptable. Current source stays forward-only; do not add a legacy-schema fallback. Record exact bounded evidence and allow a later corrected installer/release to retry or repair the migration. |
| **Core current data invariant unavailable** | If a required app-data transformation fails and the core current application cannot operate truthfully or safely without that current data, the bootstrap owner may fail startup. Do not expose partial data or run old-domain compatibility code. |
| **Capability-scoped current data unavailable** | If the current platform is valid and unrelated capabilities can operate, start the application and gate only the affected capability or operation. Do not route that capability through legacy data. |
| **Independently valid current result with item warnings** | Record `SUCCEEDED_WITH_WARNINGS` only when admitted current data is independently validated and remaining item dispositions are explicitly nonfatal. |
| **Complete current result** | Record `SUCCEEDED` and run only current code. |

A globally fatal migration state does not have to preserve an in-application update screen. Recovery may be a user downloading and installing a corrected release from the normal external distribution channel, after which the existing migration runner retries or the corrected schema migration executes. Social/release notification and distribution are product-delivery concerns, not reasons to add backward-compatible runtime code.

Status semantics remain truthful:

- `SUCCEEDED` means the required current target and validation completed.
- `SUCCEEDED_WITH_WARNINGS` means independently valid current data is usable with explicit bounded nonfatal dispositions; it never disguises an incomplete required target.
- `FAILED` means the required current result was not established. Its recorded evidence must be bounded and actionable. Whether startup continues is decided by the classification table above.

No failure class permits manual mutation of migration records to fabricate success or presentation of partial/unvalidated data as current.

### 6.1 Cleanup Residue And `SUCCEEDED_WITH_WARNINGS`

`SUCCEEDED_WITH_WARNINGS` is appropriate when the required current target is present, readable/writable as applicable, and independently validated, but a bounded nonessential item could not be transformed or removed. The application must neither depend on nor accidentally enumerate the residue.

A cleanup problem is therefore classified by the final persisted state, not by the fact that a cleanup statement reported a problem:

- If the current target is committed and valid, the residue is unreachable from current code, and no independent security/privacy/retention/storage contract requires immediate removal, record a bounded warning and allow current operation.
- If failed cleanup rolled back the same transaction that created the target, the target is not established; report `FAILED`.
- If current code can observe both source and target and would duplicate, conflict, or choose ambiguously, the residue is not inert; report `FAILED` or gate the affected capability.
- If an independent security, privacy, retention, or storage contract requires removal, failure to remove is not automatically a warning merely because current business code ignores the data. Apply that governing contract.

Warnings must contain bounded reason counts and capped examples. They must not grow with every residual row or item.

### 6.2 Worked Classification Examples

| Example | Final Persisted State | Classification | Startup / Runtime Disposition |
| --- | --- | --- | --- |
| **SQLite optional metadata backfill** | The new nullable `provider_name_snapshot` column exists. Current code can truthfully use a current-only fallback when a released row cannot supply a name. Some rows remain null or blank and are recorded with bounded reasons. | `SUCCEEDED_WITH_WARNINGS` when the validated current contract explicitly permits that fallback. | Start normally; do not read an old column to manufacture the missing value. |
| **SQLite inert old column or table remains** | The new table/columns are complete and validated. An obsolete column or table was not removed, and no current repository queries it or discovers it dynamically. No independent removal contract applies. | `SUCCEEDED_WITH_WARNINGS` if removal was part of this attempt but is nonessential; otherwise the established current migration may simply be `SUCCEEDED` with separately planned cleanup. | Start on the current schema only. The residue is not a compatibility source. |
| **JSON or structured-data file keeps an obsolete attribute** | Every required current attribute exists and validates. An old attribute remains because cleanup was incomplete, while the current parser reads the current format and safely ignores that known obsolete attribute. | `SUCCEEDED_WITH_WARNINGS` with a bounded cleanup disposition. | Start on the current format only; do not add a legacy parser branch merely to consume or remove the ignored attribute. |
| **Superseded file remains beside a valid current file** | The canonical current file is complete and selected by an unambiguous current path. The old file is not enumerated or loaded by current code, and no removal contract applies. | `SUCCEEDED_WITH_WARNINGS` when leftover cleanup is nonessential. | Start using the canonical current file. Never probe the old file as fallback. |
| **Capability data is incomplete** | The current schema exists, but a required dataset for one bounded capability was not established; for example, historical token consolidation is incomplete while new-run storage is valid. | `FAILED`, capability-scoped. This is not disguised as success-with-warnings. | Start unrelated capabilities; gate the affected history/restore operations using current migration readiness. |
| **Required current database shape is absent** | A table, column, constraint, or writable current repository target required by current code is missing. | `FAILED`, critical current platform/schema. | Global startup may fail with bounded actionable evidence. Install a corrected release and retry; do not activate an old-schema runtime. |
| **Required current file shape is absent or invalid** | The canonical current file or a required current attribute is missing, unparseable, or violates a core invariant and the application has no truthful current operation without it. | `FAILED`, critical or capability-scoped according to the real owner. | Stop the dependent capability or global startup. Do not read an obsolete key/file as a runtime fallback. |
| **Legacy residue is observable or independently prohibited** | Current discovery loads both old and new items, producing duplicates/ambiguity, or a governing security/privacy/retention contract requires the old data to be removed. | `FAILED` or capability-scoped failure according to the violated contract. | Do not call it a warning solely because the new attribute/table also exists. |

These examples use “stale,” “malformed,” or “residual” legacy data to mean semantically unusable old-format content. They do not redefine physical SQLite/database corruption, arbitrary filesystem corruption, or hostile mutation as supported migration cases; those remain governed by Section 3.

## 7. Normal Returned Failure Is Not Abrupt Termination

A migration returning a normal `FAILED` result while the process remains healthy is a supported application lifecycle event. Apply the classification in Section 6.

For this ticket, a normal consolidation failure is capability-scoped because the expanded current schema exists and unrelated/new-run work can use it. However, forward-only runtime changes the degraded behavior:

1. stored historical token reads are unavailable;
2. restoration/continuation of a pre-existing canonical agent run is unavailable until consolidation succeeds, because that path could replay a legacy usage fact;
3. new runs receive new canonical run IDs and write only current `token_usage_run_records`; and
4. the later migration retry validates that pre-existing current run IDs are disjoint from legacy run IDs before importing legacy aggregates.

This disposition makes historical `AR-004` / `MP-003` replay overlap **Not Reachable** in the current approved product: the provider for the legacy run never starts while consolidation is incomplete. Therefore the `SR-003` runtime legacy-overlap guard, legacy checkpoint reads, and protocol marker are removed rather than retained as backward-compatible current source.

If the target Prisma schema itself is unavailable, this degraded path cannot operate and startup may fail under the platform/schema classification. The user recovers by installing a corrected release; the product does not fall back to the old ledger runtime.

## 8. Proportionate Default Pattern

Production data migrations should, by default:

1. investigate and validate supported released source shapes;
2. define one deterministic transformation to a fixed current target;
3. keep all legacy decoding/querying inside migration code;
4. use bounded reads, results, validation, diagnostics, and logs;
5. use one real SQLite transaction where it is the established recovery boundary;
6. validate before destructive cleanup;
7. leave source evidence intact when a normal attempt fails;
8. retry through the existing migration runner or a corrected later release;
9. classify failure against forward-only platform/core/capability invariants; and
10. keep normal runtime current-schema-only;
11. define deterministic adapter transport for computed/nullable scalars; and
12. exercise that transport through the real production ORM/driver with result-order/nullability conditions preserved.

Do not add bespoke journals, restoration state machines, exhaustive failure matrices, semantic guessing, parallel recovery formats, backup copies, runtime legacy adapters, dual reads/writes, or infrastructure/security recovery unless a separately approved reachable contract requires them.

## 9. Application To This Ticket

| Ticket Concern | Proportionate Application |
| --- | --- |
| Failed/stale 20260730 source-shaping migrations | Repair unchanged migration definitions with narrow keyset batches, compare-and-set updates, scalar validation, capped diagnostics, and normal runner retry. Their legacy types/queries remain in migration files. |
| Bounded unrecoverable provider-display items | When the current nullable display contract and truthful current-only fallback are independently valid, record aggregate reason counts plus capped examples as `SUCCEEDED_WITH_WARNINGS`; do not block startup or consult an old runtime field. |
| Provider-name display backfill returns `FAILED` | Current schema and unrelated capabilities remain valid, so start the application, keep the failure retryable, use truthful current display fallback, and do not make it a global provider/startup prerequisite. |
| Target Prisma schema migration fails or required current table/columns are absent | Fail startup with bounded evidence. Do not run the old event-ledger application path. A corrected externally installed release may retry/repair. |
| Consolidation returns `FAILED` after current schema expansion | Start unrelated functionality and new runs on the current table; gate historical token reads and pre-existing-run restoration. No current source reads or writes legacy storage. |
| Later consolidation retry | Migration code alone reads legacy rows, validates no `run_id` intersection with current rows admitted from new runs, imports one aggregate per legacy run, validates, and deletes source atomically. Any intersection fails before cleanup rather than invoking runtime compatibility logic. |
| Populated legacy ledger after failed consolidation | Not inert cleanup residue: the required current historical target is incomplete, so the migration remains `FAILED` and history/old-run restore stay gated. It cannot be reclassified as `SUCCEEDED_WITH_WARNINGS` merely because new-run storage works. |
| Empty dormant legacy table/model after validated consolidation | Inert migration-only schema residue required for safe skip-version Prisma ordering. Current code never queries it; its presence does not make the application degraded or backward-compatible. |
| Nullable JSON integer projection | Project each cumulative-source scalar as `NULL` or explicit JSON type plus exact text, then admit only the supported integer tag/canonical digits and SafeInt range. Test leading `NULL` rows followed by integers through real Prisma/SQLite; do not trust a TypeScript raw-query type annotation or accept untagged decimal strings. |
| Attempt ends before consolidation commit | Rely on SQLite rollback and a later normal migration attempt; do not add a progress journal, cause-specific recovery branch, or termination-specific backup. |
| Consolidation commits before its status record is written | Migration code recognizes validated empty legacy source as already current and records completion on relaunch. This is deterministic migration idempotence, not a runtime compatibility mode. |
| Hypothetical tampering/corruption/adversarial writers | Out of scope; do not add code or dedicated migration coverage. |

## 10. Implementation-Mechanics Impact

Relative to `SR-005`, the detailed decision test and worked examples added in `SR-006` do **not** change ticket implementation mechanics. They make the status/startup classification reusable and verifiable.

`SR-007` **does change** the consolidation migration's scalar adapter mechanics: nullable JSON integers receive a deterministic typed-text SQL projection and strict migration-only decoder, with a real Prisma/SQLite leading-`NULL` regression. It does not change current runtime code, the one-row model, degraded readiness behavior, retry semantics, or the supported source/target meaning.

The earlier `SR-005` forward-only refinement **did change** the `SR-003` transition mechanics:

- remove `TokenUsageLegacyOverlapGuard`, its runtime legacy SQL adapter, the status/source transition mode, and `legacy_overlap_protocol_version`;
- do not seed current checkpoints from legacy rows during runtime;
- gate pre-existing-run restoration and historical token reads while consolidation is incomplete;
- allow unrelated features and newly allocated runs to use only the current schema;
- make consolidation migration code validate legacy/current `run_id` disjointness and fail before cleanup on overlap; and
- preserve global startup failure when required current Prisma/platform schema is unavailable.

Coverage proves the two classified paths: capability-scoped app-data failure with forward-only new work and restore gating, and critical current-schema failure without a legacy fallback. It does not create separate test matrices for Quit/kill/shutdown/power-off labels or unsupported infrastructure/security premises.

## 11. Intended Durable Project-Documentation Destination

During delivery documentation sync, promote this reusable convention to:

`autobyteus-server-ts/docs/design/production_data_migration_conventions.md`

and make the README's “Production migration practice” section a concise summary/link to that authoritative file rather than a second full copy. The delivery engineer owns that repository-documentation change and integrated-state consistency check. Until then, this task artifact is the canonical solution-package authority, while the existing README remains the governing repository source.
