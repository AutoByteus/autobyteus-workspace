# Data Migration Guideline

## Purpose

Use these conventions for production app-data migrations that transform a
known released database or file shape into the current application contract.
They define the normal operating assumptions, forward-only runtime boundary,
failure classification, reachability test, and proportionate recovery model.
Migration-specific schemas, sequencing, and algorithms still belong with the
owning migration and module documentation.

This is the single canonical production migration guideline. Read the policy
sections and the worked production examples below before designing a migration.
The final worksheet is mandatory design input.

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

## Record Summary And Attempt-Log Boundary

`app_data_migration_records` is compact product-visible status and audit
evidence, not a second diagnostic log. Its nullable `summary` field contains
only the runner-formatted terminal sentence:

`Scanned N; migrated N; skipped N; failed N.`

The runner constructs that sentence from the four aggregate counts returned by
the definition. It persists status, attempts, timestamps, a concise terminal
error, and the attempt's `log_path` as separate fields. A thrown definition
uses the existing zero-count summary and records the exception message
separately. Current repositories, GraphQL types, and clients treat `summary` as
opaque text; they must not parse it back into domain data or add separate
persisted count fields.

Migration definitions may continue returning item details for the existing
attempt-log writer. The referenced filesystem log owns the full count/detail
representation; item arrays, serialized source rows, and exception dumps must
not be copied into `summary`, another database status field, the status API, or
the Settings UI. The structural separation, rather than an arbitrary character
limit, keeps database and API outcome size independent of source cardinality.
The current detail-bearing log format can itself grow with migration
cardinality; retention, sampling, compaction, and historical-log repair remain
separate scopes rather than implicit runner behavior.

Released `summary_json` records are transitioned by timestamped Prisma
migration `20260820090000_redesign_app_data_migration_summary`. The SQLite
transaction validates the four known non-negative integer fields, constructs
the canonical sentence inside SQLite, and renames the column to `summary`
before current repositories start. Other record metadata and `log_path` remain
unchanged, historical filesystem logs are neither read nor rewritten, and no
legacy JSON decoder exists in current runtime code.

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

## Availability First: Historical Data Is Not Application Readiness

The default is to open the application and allow new work even when historical
data cannot be migrated or shown. Missing/incomplete historical packages are
preserved exclusions, not failed transformations: an otherwise completed attempt
reports `SUCCEEDED_WITH_WARNINGS`. This remains true when **no historical run is
admitted**. Success does not require a majority, or even one, of the old runs to
be usable; it requires every source to have its truthful disposition and current
operations to meet their own prerequisites.

Keep two questions separate:

1. Did the migration complete its defined transformations/dispositions? This
   determines its audit status. An actual uncompleted write/commit still fails.
2. Which current operations can safely run? This determines scoped admission,
   independently of that audit status. `FAILED` alone never proves that the
   whole application must stop.

A core/schema exception below is not a blanket escape hatch. Name the concrete
current prerequisite and show why opening the application/new work actually
needs it and why a narrower capability boundary cannot suffice. A missing old
execution tree or empty usable-history list does not meet that test. Do not
replace old schemas with runtime compatibility, erase originals, or silently
create a new database to manufacture availability. Existing genuine platform
prerequisite gates are outside this historical-run correction; changing them
requires an evidenced, separately approved design rather than a catch-all ignore.

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
| **Current platform/schema unavailable** | Only a proven application-wide prerequisite can prevent startup; the mere absence of a historical table, file or value is insufficient. Prefer opening the application with the affected capability unavailable. If the concrete current platform prerequisite truly makes that impossible, preserve the existing safe failure. Record bounded evidence and allow a corrected release to retry. Do not add a legacy fallback. |
| **Core current data invariant unavailable** | Bootstrap may fail only when the application itself cannot operate truthfully or safely without the identified current prerequisite; historical run availability is not such a prerequisite. Do not expose partial data. |
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
- `FAILED`: a required transformation/commit did not complete or establish its
  validated target; record bounded, actionable evidence. This does not describe
  an explicitly preserved/excluded incomplete historical source, and does not
  itself dictate startup failure.

Never mutate migration records manually to fabricate success or present
partial/unvalidated data as current.

## Historical Run Packages And Narrow Admission

A directory discovered on disk is a candidate, not proof of a valid current
run. Inspect predecessor migration dispositions as part of the supported
source inventory. `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` from a prerequisite
never implies that every source directory was converted or has an execution
tree. Explicitly retained empty and nonempty missing-tree roots are a real
released source shape, not manufactured corruption.

For run-owned migrations:

- Reuse strict current package validation and admission (for example
  `RootRunPackageReadinessIndex`) rather than assuming directory enumeration
  equals admission. Preserve excluded roots byte-for-byte; do not rename,
  delete, repair by guess, or expose them as usable runs.
- Define each source/root/reference outcome before writing. Distinguish an
  excluded unsupported historical package, a proven current conversion, an
  unresolved reference in an otherwise current package, and a failed attempt.
  Gate only the operation/package that cannot independently validate. A
  missing optional historical tree is not a missing core platform invariant.
- Check references crossing package boundaries. Excluding an owner root does
  not prove its referrers valid. Do not infer the referenced owner from the
  referring author or physical proximity. Explicitly scope the dependent
  operation/package disposition without blocking unrelated valid roots.
- Recompute current admission independently of the migration ledger and
  attempt logs. A success/warning label is not proof; later startup, import or
  package refresh must not re-admit incomplete data. Current validation must
  not decode old schemas or perform migrations.
- Use `SUCCEEDED_WITH_WARNINGS` only after every admitted target validates and
  each excluded item has a bounded explicit nonfatal disposition. It is not
  a majority-success threshold and must not conceal an uncompleted commit or
  unknown ownership. Unexpected attempt failures remain `FAILED`; classify
  their operational boundary instead of either ignoring them or automatically
  crashing the whole application.

Required upgrade evidence includes coexistence of valid roots with empty and
nonempty missing-tree roots, prerequisite warning results, invalid current
packages, cross-root references, repeat startup and both real startup
entrypoints when present. Include a disposable copy of actual installed data
when available; a current-runtime fixture with historical fields alone does
not establish released-upgrade fidelity. Never claim corrected startup from a
migration-only probe or deleting/excluding problematic roots on a copy.

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

Observable residue is not a generic warning exception. A product may approve a
bounded nonfatal disposition for a non-semantic physical mirror only when all
of the following are explicit and verified:

1. the canonical target independently validates;
2. every current semantic local and imported reader resolves that target and
   never selects the residue;
3. the existing mirror contract already permits source-deleted files to remain;
4. no security, privacy, retention, or storage-removal contract requires
   cleanup; and
5. the product explicitly accepts the bounded storage consequence instead of
   silently inferring it from migration success.

The nested Team Agent-memory layout repair is the narrow current example.
Memory Sync v1 recursively emits replace operations and does not propagate
deletes, so it may export both a preserved flat conflict source and the valid
canonical directory, or retain a pre-upgrade flat import after local
relocation. Local and imported Team-memory readers derive the one semantic
member location from the validated V1 execution tree. The migration may
therefore report `SUCCEEDED_WITH_WARNINGS` for a valid canonical target plus
that approved sync-visible residue. A missing or invalid canonical target still
reports `FAILED`; the exception does not authorize a runtime fallback, sync
filter, tombstone/delete protocol, remote cleanup, or migration-status sync
gate.

Warning evidence must use aggregate reason counts and capped examples. It must
not grow with source cardinality.

## Worked Classifications

| Example | Final state | Classification and runtime disposition |
| --- | --- | --- |
| Nullable metadata backfill | Required current column exists; current code has a truthful fallback; some values remain null with bounded reasons. | `SUCCEEDED_WITH_WARNINGS`; run current code and do not read an old field to fabricate the value. |
| Inert old database column/table remains | Current target is complete; no current repository or dynamic discovery reads the residue; no removal contract applies. | `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`, depending on the migration contract; runtime remains current-only. |
| Structured file keeps an obsolete attribute | Required current attributes validate; the current parser safely ignores the known old attribute. | `SUCCEEDED_WITH_WARNINGS` with bounded cleanup evidence; do not restore a legacy parser. |
| Superseded file remains beside a valid canonical file | The current path is complete and unambiguous; current code neither enumerates nor loads the old file. | `SUCCEEDED_WITH_WARNINGS` when cleanup was nonessential; never probe the old file as fallback. |
| Approved replace-only physical mirror retains both nested Team-memory paths | The canonical target independently validates; semantic local/imported readers use only the V1-tree-derived target; Memory Sync v1 may still mirror or retain the old flat path because it propagates no deletes. | `SUCCEEDED_WITH_WARNINGS` with bounded evidence and the documented storage consequence. A missing/invalid canonical target remains `FAILED`; do not add a legacy reader or infer a general observable-residue exception. |
| Required transformation for one capability did not complete | Current platform exists, but a required attempted transformation/commit failed. | `FAILED`, capability-scoped; start unrelated work and gate the affected operation. This is distinct from completed warning exclusions of incomplete historical sources. |
| All historical run packages are incomplete | Every package is preserved with an explicit exclusion; current new-work prerequisites validate. | `SUCCEEDED_WITH_WARNINGS`; open with no usable historical runs and permit new work. No old package is deleted or fabricated. |
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

- Were predecessor retained/skipped/warning dispositions and actual installed
  source shapes inspected, rather than assuming every directory is current?
- Is run admission independent of aggregate migration success, with cross-root
  dependencies bounded and invalid runs absent from normal usable listings?
- Do real startup/restart checks prove valid-run coexistence with empty and
  nonempty missing-tree residue without modifying the retained originals?

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
- Does the database/API status record contain only the canonical opaque summary
  while full item diagnostics remain in the referenced attempt log?
- Is released `summary_json` knowledge confined to the timestamped schema
  migration, with no current-runtime decoder or summary parser?
- Is every warning based on an independently valid current result?
- Are capability-scoped and critical failures classified by actual current
  owners rather than by a blanket startup rule?
- Does every extra recovery branch pass the product-reachability gate?


## Worked Production Implementations And Design Worksheet

The key question is **which current owner cannot operate safely?**, not
**did every historical directory migrate?**.

### Example 1 — A Historical Team Directory Has No Execution Tree

Source: `src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.ts`,
`migrateRoot`, and `src/run-history/services/root-run-package-readiness-index.ts`.

The released Team V2 migration explicitly records `SKIPPED_MISSING` when
`team_run_execution_tree.json` does not exist. It does not manufacture identity
from directory names or delete the directory. Current package admission
requires the current tree and strict sidecars; an incomplete package is not an
admitted usable run.

**Why:** the tree is mandatory for that historical Team, not for the entire
application. Its absence cannot prove that retained files are disposable.
An empty directory and a directory holding old history both remain untouched.
Valid teams and a new conversation do not depend on that missing tree.

**Correct design:** classify the candidate, preserve it, emit a bounded reason,
exclude the incomplete run from usable lists and direct restore/load. Continue
with independently valid roots. Re-check admission on later startup/refresh.
**Wrong design:** enumerate directories, unconditionally read each tree, then
require global migration success before opening any application window.

Regression: one valid root plus one empty missing-tree root plus one nonempty
missing-tree root. Both startup entrypoints admit the valid root; missing roots
stay absent from usable listings and cannot be loaded by ID; retained hashes
are unchanged after a second startup. A synthetic fixture is useful but does
not replace a copied real installation when one is available.

### Example 2 — Prerequisite Warning Success Does Not Certify Every Root

Sources: `src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-history-candidate-plan.ts`
(`missingExecutionTreeWarnings`), `agent-org-flat-team-families-v1-app-data-migration.ts`
(result aggregation), and `src/app-data-migrations/app-data-migration-runner.ts`.

The Org-family transition separates valid flat roots, convertible sources,
missing-tree warnings and real failures. Missing-tree sources remain unchanged.
Its aggregate can be `SUCCEEDED_WITH_WARNINGS`; the runner accepts that as a
completed prerequisite. An item diagnostic can record failed conversion while
the aggregate is warning success under a specifically defined nonfatal exclusion.

**Why:** prerequisite completion certifies its stated postconditions, not that
every enumerated source is a valid current package. The next migration must
inspect those postconditions and retained dispositions. It must not assume
“previous migration passed, therefore every directory has a tree.”

**Truthful warning rule:** all data actually admitted as current independently
validates; every remaining item has an explicit bounded nonfatal disposition.
One valid and one excluded package can satisfy that rule. A thousand converted
packages plus one unknown exposed owner cannot. There is no majority threshold.

Regression: run predecessor and new migration together on retained source
shapes; assert warning semantics, counts, capped reasons and current admission,
not just a mocked enum. Repeat with the existing FAILED new-migration ledger
from an unsuccessful upgrade; let normal startup retry, never edit it to success.

### Example 3 — A Cross-Root Reference Requires Its Own Decision

Sources: `src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-context-file-locator-transition.ts`
(dependencies and exact physical proof), and
`src/context-files/services/context-file-record-locators.ts` (typed references).

Suppose valid package A contains an attachment reference to owner B. Excluding
B from history lists does not prove A's attachment usable. Author/recipient A
is not necessarily the owner, and finding a same-named file is not identity.

For each actual typed reference, establish exact indexed ownership and physical
file proof. If proof is unavailable, retain source evidence and gate the
smallest dependent current operation/package that cannot validate. Package C
with no dependency remains available. Never let an aggregate success/warning
label bypass this check. Current readers must accept only current identities;
old selectors may be interpreted only inside migration code.

Regression: A→excluded B, independent C, and A→valid B; test both old selector
migration inputs and exact current reference validation. Assert no identity
substitution, no old-reader fallback, no loss, and no unrelated startup block.
Do not copy the example migration's every recovery mechanism into a new task;
reuse only the existing owner/mechanism required for the approved scenario.

### Example 4 — Capability Failure Is Not Always Platform Failure

Sources: `src/token-usage/providers/token-usage-migration-readiness.ts`,
`src/startup/token-usage-current-schema-readiness.ts`, `src/server-runtime.ts`.

Token usage distinguishes READY, CURRENT_SCHEMA_DEGRADED and
CRITICAL_CURRENT_SCHEMA_FAILURE. Historical reads/restores can be blocked in a
degraded state while operations needing only a valid current schema can still
proceed. Missing required current tables/columns/constraints is a different
case and can justify startup failure.

**Why:** the gate follows the actual dependency. It is not tied mechanically to
one migration status. `FAILED` is an honest attempt result even when the whole
app can start. Conversely, success-with-warnings does not permit using missing
core invariants. Reuse the distinction, not an unnecessarily global singleton
for a defect that is only per run.

Regression: assert the affected operation fails explicitly and unrelated work
succeeds. Retain the existing platform/schema fatal tests as controls so the
fix cannot become “ignore all migration failures.”

### Example 5 — v1.4.87: Critical Anti-Pattern — Historical Data Blocks Application Startup

**Severity: critical user-availability regression; prohibited engineering practice.**
A release must not turn missing optional historical data into an application-wide
outage. The user could not open the application or start new work. Preserving an
unusable historical run would have been acceptable; making the whole installed
application unusable was not. This is a concrete release failure, not a
hypothetical edge case or an acceptable strictness tradeoff.

#### What was released, and why it failed

The exact-AgentRun attachment fix removed ambiguous address-based ownership.
Its startup converter then enumerated Team directories and unconditionally read
`team_run_execution_tree.json`. Both Studio and standalone entrypoints required
that converter's aggregate status to equal `SUCCEEDED` before continuing startup.
These were two distinct mistakes: an unsupported source assumption and an
unjustified application-wide gate.

The investigated installation contained 553 Team roots, including eight without
trees: five empty and three retaining history. Predecessor migrations deliberately
preserved missing-tree roots through skipped/warning dispositions. Their existence
was therefore a supported released source state—not evidence of user tampering,
corruption, or permission to delete them. Those inventory counts describe the
investigated installation at that time, not a universal data shape.

The actual failure chain was:

`normal upgrade → preserved historical directory → unconditional tree read → ENOENT → converter FAILED → SUCCEEDED-only startup guard → application cannot open`

A missing tree prevents that historical run from validating. It does **not**
prevent the current application from creating a new run. The startup guard
mistook a run-owned prerequisite for a platform prerequisite. Treating every
warning as fatal compounded the error: even a truthful completed warning
conversion could not pass the guard.

#### Why the earlier checks did not protect users

- Source investigation did not carry predecessor preserved/skipped states into
  the new migration's candidate inventory.
- Architecture review accepted the false global invariant. Implementation added
  it to both entrypoints. Review and validation did not challenge that dependency
  boundary before release. This was a workflow failure, not merely a missing
  `catch` in one function.
- The "copied upgrade" test copied a **current-runtime-created fixture** and added
  historical locator fields. It checked locator conversion but omitted real
  released residue. It did not establish representative installed-upgrade fidelity.
- The reported 202 passing tests and real browser send proved other behavior;
  neither proved that the installed desktop could start with retained incomplete
  history. Test totals and confidence percentages cannot replace that evidence.
- A later disposable copy of actual installed data reproduced the startup failure.
  Moving the eight roots out of that copy allowed conversion, but only diagnosed
  the false assumption. It was not an authorized repair, preservation proof, or
  successful application-startup check.

#### Correct behavior, including the all-excluded case

Classify each candidate before reading history; preserve incomplete roots without
renaming, deleting, inventing identity, or rewriting them. Complete their explicit
preserved/excluded dispositions as `SUCCEEDED_WITH_WARNINGS`. Independently
validate current packages and attachment dependencies, then expose only the
usable subset through lists **and** direct load/restore/file operations.

If **zero** historical runs validate, the application must still open and permit
new work when its actual current new-work prerequisites are available. An empty
usable-history list is not a startup failure and is not authorization to discard
the preserved files. A→unavailable B excludes dependent A; independent C remains
usable. A genuinely failed write remains `FAILED` audit evidence, but that label
alone must not stop unrelated startup or fabricate a usable historical run.

Do not "fix" this by returning warning on every exception, manually marking the
ledger successful, resetting the database, deleting troublesome directories,
restoring old selectors in current readers, or opening unvalidated history.

#### Mandatory regression and release evidence

1. Inspect predecessor source/dispositions and representative released data;
   include both empty and nonempty missing-tree roots. Keep their byte/hash evidence.
2. Exercise valid+excluded coexistence **and all historical roots excluded**.
   Verify opening, an empty usable-history view where appropriate, and creation
   of new work. Do not require a minimum number of valid old runs.
3. Prove current admission independently of `SUCCEEDED`, warning, and `FAILED`
   ledger labels, including direct-by-ID and synchronous reads. Test unavailable
   cross-root dependencies without excluding independent valid roots.
4. Execute both real startup entrypoints and ordinary repeat startup. A mocked
   startup unit test or a migration-only probe is not this evidence.
5. Use a stopped-writer disposable copy of the actual installed dataset when
   available, retaining **all** problematic roots. Verify the reported desktop
   startup boundary with the matching candidate build; browser success alone
   does not establish Electron startup.
6. Do not publish a recovery claim or close the incident until these checks and
   explicit user verification pass. An untested required boundary is a release
   blocker, not a caveat to bury beneath a passing count.

Durable incident evidence is in
`team-attachment-exact-execution/api-e2e-evidence/startup-incident/incident-report.md`
and the cumulative `API-REV-002`, `SR-004`/`SR-005`, and `ARCH-REV-002` records.
The recovery implementation, review, and execution reports must establish its
resolution; this guideline does not itself claim the incident is resolved.

### Minimal Design Worksheet

Record these answers in the task design rather than create a new framework:

1. What released source states exist, including predecessor skips/warnings?
2. Which owner defines the fixed current target and admits it?
3. For every source/reference, is the disposition converted, already current,
   preserved-excluded, dependency-blocked, or failed attempt? Why?
4. Which *specific* operation depends on each unresolved invariant? What is
   the evidence that it is global, capability-scoped, or run-scoped?
5. How is current admission validated without reading old data or trusting an
   aggregate label? What about cross-root dependencies and next startup?
6. Which established commit/retry boundary is sufficient? Keep one recovery
   category for ordinary interruption; do not invent journals/backups or
   infrastructure-failure matrices without an approved reachable need.
7. Which real released-data and startup tests distinguish this design from a
   happy-path conversion? What has not been tested?
8. Which canonical convention and code examples were reviewed? Who independently
   reviews admission and warning semantics before implementation?

If any answer requires guessing ownership, deleting retained data, suppressing
all exceptions, fabricating success or reintroducing old runtime decoders,
stop and revise the design. A clear preserved exclusion is better than a false
usable record; a narrowly scoped gate is better than an unjustified whole-app outage.
