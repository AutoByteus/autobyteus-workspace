# Production Data-Migration Conventions

## Purpose

Use these conventions for production app-data migrations that transform a
known released database or file shape into the current application contract.
They define the normal operating assumptions, forward-only runtime boundary,
failure classification, reachability test, and proportionate recovery model.
Migration-specific schemas, sequencing, and algorithms still belong with the
owning migration and module documentation.

## Known Source To Fixed Target

A production data migration is a deterministic transformation from explicitly
investigated, supported released source shapes to one fixed current target.
Given the same validated source facts and migration version, it must produce
the same target facts or the same explicit unsupported disposition.

The migration must not guess identity, infer meaning from incidental runtime
state, depend on timing luck, or choose different outcomes for speculative
failure stories. Every supported source subject receives a defined outcome. An
unsupported source is reported and kept intact rather than guessed into a
target.

When source and target shapes are known, implement only the validation,
bounded transformation, transaction, result validation, cleanup, and normal
runner retry required for that mapping. Determinism does not require business
logic that tries to survive arbitrary operating-system, hardware, storage, or
trust-boundary failures.

## Normal Operating Assumptions

A normal migration attempt may assume:

- one startup/app-data migration writer;
- a stable process, power source, and device for the attempt;
- sufficient permissions and readable/writable storage; and
- normal SQLite and filesystem behavior.

These are operating prerequisites, not separate product failure scenarios. If
an independent product, security, or operations contract withdraws one of
them, that contract must define the newly supported boundary before additional
migration machinery is added.

## Abrupt Termination

User Quit, application kill, operating-system shutdown, and power loss are one
architectural category at the migration boundary: the attempt did not finish.

- Do not create separate journals, state machines, backup copies, lifecycle
  branches, or test matrices for each label.
- Use normal SQLite commit/rollback behavior as the recovery boundary:
  committed work is current and uncommitted work rolls back.
- Let a later ordinary startup retry through the existing migration runner.
- Cover relaunch and idempotence once for this category.

This does not promise application-level recovery when storage behavior violates
normal SQLite or filesystem guarantees.

## Unsupported Premises

The following premises do not justify migration machinery unless a separately
approved security or operations contract makes them reachable:

- hostile database tampering or theft;
- arbitrary database or filesystem corruption;
- kernel, device, or syscall failures outside normal storage behavior;
- a compromised process; or
- adversarial concurrent writers.

Technical possibility is not a product trigger. A fallback cannot prove its own
need by inventing the state that it handles.

## Product-Reachability Gate

Every proposed fallback, repair, backup, recovery, or lifecycle branch must
identify an independent initiating basis and trace it to the claimed persisted
state and product consequence. Valid initiating bases are a supported user
action, supported system event, approved operational action, or applicable
product/security/operations contract.

| Reachability | Required disposition |
| --- | --- |
| **Reachable** | Record the independent trigger, production path, resulting state, and consequence. Implement the smallest required mechanism. |
| **Not Reachable** | Do not add migration machinery, branches, or dedicated coverage. |
| **Unclear** | Investigate or record a blocked product/design decision. Do not implement a speculative fallback. |

The existence of a recovery mechanism is never evidence that its initiating
path is supported.

## Forward-Only Current Runtime

Current application source operates only on the current schema and domain
model. It must not retain old-database compatibility to make an incomplete
migration appear usable.

Current runtime code must not contain:

- read-old-if-current-is-absent fallbacks;
- dual old/current readers or writers;
- optional-column or missing-table branches for released old schemas;
- legacy row/file decoders or old-schema repositories;
- adapters that query legacy storage to reconcile current writes; or
- compatibility wrappers whose purpose is to keep historical storage active.

Legacy tables, columns, row types, file decoders, classification rules, and
old-to-current transforms belong inside registered migration boundaries. Keep
those migrations available for supported direct and skip-version upgrades, but
do not call them from normal runtime code after startup disposition.

The normal structure is:

`current schema expansion -> migration-owned legacy read/transform/validation -> current schema/domain -> forward-only runtime`

If a migration does not establish the required current state, choose an
explicit capability or startup disposition. Do not teach current runtime code
to understand the historical format.

## Database Adapter And Transport Representations

Database meaning, SQLite storage class, ORM result metadata, and JavaScript
runtime type are distinct contracts. A TypeScript annotation on `$queryRaw`
does not convert or validate the received runtime value. Nullable computed
SQLite expressions such as `json_extract(...)` can expose the same semantic
integer as a `bigint` or decimal `string`, depending on result-set shape and
leading `NULL` rows.

When a migration depends on a derived scalar:

1. reproduce the query through the production database and ORM/driver adapter,
   not only a mocked row object;
2. choose a deterministic SQL-boundary representation when adapter inference
   is unstable, and carry the source type when distinct SQLite or JSON types
   could otherwise share the representation;
3. validate the complete transport grammar before exact parsing;
4. parse integers with `BigInt` or an equivalently exact mechanism;
5. enforce sign, range, and domain constraints before narrowing; and
6. keep the adapter-specific projection and decoder inside the migration
   boundary.

Do not use broad `Number(value)`, `parseInt(value)`, truthy coercion,
permissive numeric regular expressions, or unchecked casts to repair an adapter
mismatch. They can silently admit fractional, exponent, prefixed, truncated,
negative, wrong-source-type, or out-of-range values.

Regression coverage must preserve the result-set condition that exposed the
defect. For a nullable expression, include leading `NULL` rows followed by
valid values in the same ordered batch. Cover admitted and rejected source
types and ranges through a real disposable database plus the production
ORM/driver. Never use or mutate a user's live database for automated coverage.

## Startup Scheduling And Public Recovery Actions

Automatic startup scheduling and public recovery capability are separate
contracts. The migration runner owns one closed, nonpersisted recovery action
for each current status snapshot:

- `MANUAL_RETRY` when the public/manual command can execute the migration now;
- `RESTART_TO_RETRY` when an ordinary later startup is the supported executor;
  or
- `NONE` when no truthful public recovery action is available.

Derive legacy `canRetry` only from `MANUAL_RETRY`. A required `STARTUP_ONLY`
migration in `NOT_RUN`, `FAILED`, or stale `RUNNING` state may publish
`RESTART_TO_RETRY` only when the ordinary startup runner will actually select
it. Active attempts and terminal success/warning states publish `NONE`.
Direct manual invocation of a startup-only definition remains rejected rather
than silently taking a different path.

Carry the server-owned action through GraphQL and client state. Settings may
render localized restart guidance and a disabled Retry control for
`RESTART_TO_RETRY`, but it must dispatch no manual mutation. The UI must not
infer policy from a migration ID, metadata field, execution policy, or local
status combination.

Do not use a migration-specific recovery question to authorize unrelated
migration-framework redesign. Historical summary projection, audit/log
compaction, retention, or filesystem-recovery work needs its own approved
scope; it is not implied by bounded execution evidence or restart guidance.

## Classify The Final Current State

Do not treat every migration failure as globally fatal or automatically
nonfatal. Ask:

> After this attempt, are every schema element, current-format value, and
> integrity/safety invariant required by current application owners available
> and independently valid?

Apply this test at the narrowest real boundary:

1. identify the schema and current-format facts current code reads or writes;
2. identify the independently required integrity, security, privacy, retention,
   identity, and truthfulness invariants;
3. validate those facts without a legacy runtime path;
4. classify each unmet requirement as global/core or capability-scoped; and
5. treat only the remaining bounded issues as nonfatal dispositions.

| Final-state class | Required product disposition |
| --- | --- |
| **Current platform/schema unavailable** | Global startup failure is acceptable when a required table, column, constraint, vault, or platform invariant is absent. Record bounded evidence and allow a corrected release to retry. Do not add a legacy fallback. |
| **Core current data invariant unavailable** | Bootstrap may fail when the application cannot operate truthfully or safely without required current data. Do not expose partial data. |
| **Capability-scoped current data unavailable** | Start unrelated capabilities and gate only the affected current operation. Do not route it through legacy data. |
| **Independently valid current result with warnings** | Record `SUCCEEDED_WITH_WARNINGS` only when admitted current data validates and every remaining item disposition is explicitly nonfatal. |
| **Complete current result** | Record `SUCCEEDED` and run only current code. |

A fatal state need not preserve an in-application update screen. Recovery may be
installation of a corrected release from the normal external distribution
channel, followed by the existing runner or corrected schema migration.

Status meanings must remain truthful:

- `SUCCEEDED`: the required current target and validation completed.
- `SUCCEEDED_WITH_WARNINGS`: current data is independently valid and only
  bounded, explicit, nonfatal items remain.
- `FAILED`: the required current result was not established; record bounded,
  actionable evidence.

Never mutate migration records manually to fabricate success or present
partial/unvalidated data as current.

## Cleanup Residue

Classify cleanup by the final persisted state, not merely by whether a cleanup
statement reported a problem.

- If the current target committed and validates, residue is unreachable from
  current code, and no independent contract requires immediate removal, the
  bounded residue may be a warning.
- If cleanup failure rolled back target creation, the target was not
  established: report `FAILED`.
- If current discovery sees both source and target and may duplicate, conflict,
  or choose ambiguously, the residue is not inert: fail or gate the affected
  capability.
- If security, privacy, retention, or storage rules require removal, apply that
  contract even when business code ignores the residue.

Warning evidence must use aggregate reason counts and capped examples. It must
not grow with source cardinality.

## Worked Classifications

| Example | Final state | Classification and runtime disposition |
| --- | --- | --- |
| Nullable metadata backfill | Required current column exists; current code has a truthful fallback; some values remain null with bounded reasons. | `SUCCEEDED_WITH_WARNINGS`; run current code and do not read an old field to fabricate the value. |
| Inert old database column/table remains | Current target is complete; no current repository or dynamic discovery reads the residue; no removal contract applies. | `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`, depending on the migration contract; runtime remains current-only. |
| Structured file keeps an obsolete attribute | Required current attributes validate; the current parser safely ignores the known old attribute. | `SUCCEEDED_WITH_WARNINGS` with bounded cleanup evidence; do not restore a legacy parser. |
| Superseded file remains beside a valid canonical file | The current path is complete and unambiguous; current code neither enumerates nor loads the old file. | `SUCCEEDED_WITH_WARNINGS` when cleanup was nonessential; never probe the old file as fallback. |
| One capability's current data is incomplete | Current platform exists, but required current data for that bounded capability did not complete. | `FAILED`, capability-scoped; start unrelated work and gate the affected operation. |
| Required current database/file shape is absent | A required current table, column, constraint, file, attribute, or core invariant is missing or invalid. | `FAILED`, critical or capability-scoped according to its actual owner; no legacy fallback. |
| Residue is observable or independently prohibited | Current discovery sees both shapes, or a governing security/privacy/retention rule requires removal. | `FAILED` or capability-scoped failure; the presence of a new target does not make the residue a warning. |

These examples concern semantically stale or unsupported old-format content.
They do not redefine physical corruption or hostile mutation as supported
migration cases.

## Proportionate Default

Production data migrations should normally:

1. investigate supported released source shapes;
2. define one deterministic transform to one current target;
3. keep all legacy interpretation inside migration code;
4. bound reads, results, validation, diagnostics, and logs;
5. use one real SQLite transaction where it is the established recovery
   boundary;
6. validate before destructive cleanup;
7. retain source evidence when a normal attempt fails;
8. retry through the existing runner or a corrected later release;
9. classify failure against current platform/core/capability invariants; and
10. keep the normal runtime current-schema-only.

Do not add bespoke journals, restoration state machines, exhaustive failure
matrices, semantic guessing, parallel recovery formats, backup copies, runtime
legacy adapters, dual reads/writes, or infrastructure/security recovery without
a separately approved reachable contract.

## Review Checklist

- Are all supported released source shapes and invariants explicit?
- Is the target fixed and the transform deterministic?
- Are every read, diagnostic, and validation result bounded?
- Does one migration-owned boundary contain all legacy knowledge?
- Does current runtime use only the current schema and model?
- Does destructive cleanup occur only after target validation?
- Is retry/relaunch idempotent through the existing runner?
- Are computed scalar results transported deterministically and decoded with
  complete grammar, exact parsing, and explicit source/range checks?
- Does real-adapter coverage preserve nullable result ordering such as leading
  `NULL` rows followed by valid values in the same batch?
- Is every advertised recovery action executable through the entrypoint it
  names, with startup-only work distinguished from manual retry?
- Does the UI consume server-owned recovery policy without inferring it or
  dispatching a disabled action?
- Is every warning based on an independently valid current result?
- Are capability-scoped and critical failures classified by actual current
  owners rather than by a blanket startup rule?
- Does every extra recovery branch pass the product-reachability gate?
