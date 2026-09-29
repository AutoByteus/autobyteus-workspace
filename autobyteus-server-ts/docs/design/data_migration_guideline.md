# Data Migration Guideline

The single canonical policy for production app-data migrations. Read it before
designing a migration and answer the checklist in section 2 in the task's design
spec.

This guideline holds policy only. Implementation technique is learned from the
existing migrations listed in section 10. Task-specific schemas, algorithms,
measurements and delivery status belong in their owning code and tickets. The
guidance is normative; it does not claim that every released migration already
complies.

## 1. Critical Rule: Historical Data Must Not Lock Users Out

**Reject any design that makes application startup or new work depend on
successfully loading or migrating all historical data.**

An unreadable old run is a data-availability problem, not proof that the
application cannot operate. Preserve and exclude unusable history. Open the
application and allow new work even when **no** historical run is usable. For
example, a missing Team execution tree prevents loading that Team; it does not
prevent creating an unrelated conversation.

Lockout is severe because it removes every workflow at once, including the
in-app update path users need to install a corrected release. "We can ship
another version" does not justify a startup-blocking migration.

- **Preserve.** Never delete incomplete history, guess its ownership, expose it
  as valid, or reset the database to get an empty working application.
- **Gate narrowly.** Gate only the run or capability whose current prerequisites
  cannot validate.
- **Keep status and admission separate.** A `FAILED` attempt does not mean
  startup failure. A success label proves neither that every directory is current
  nor that every reference is usable.
- **Prove platform prerequisites.** An application-wide prerequisite is only
  valid when its owner names the concrete dependency and shows that a narrower
  gate cannot work. A missing old tree or an empty history list is never such a
  prerequisite. Never bypass current schema or security invariants, and never
  add legacy runtime readers to make the platform look ready.

## 2. Mandatory Design and Review Checklist

Record concise answers in the task design. Do not build a new framework to
answer them.

1. **Need:** is a migration needed at all? Can a tolerant reader absorb the
   change (section 3)? Migrate only for a change of meaning or a new required
   fact that only old data can supply.
2. **Availability:** can users open the application, create new work and reach
   recovery when all history is unavailable? Identify any real platform
   dependency separately.
3. **Source and target:** which released source shapes did you actually
   inspect? Include predecessor migrations' skipped, warning and preserved items,
   and representative released data. Which owner admits the fixed target?
4. **Disposition:** what happens to each converted, already-current, excluded,
   dependent and failed item? Why does the aggregate status stay separate from
   current admission?
5. **Commit and retry:** which existing transaction, atomic writer or marker is
   sufficient? Justify every backup, hash and journal. Preserve released
   originals and supported partial states.
6. **Current-only boundary:** where does legacy interpretation end? Confirm that
   the migration uses frozen copies of its source shapes (section 4). Verify
   schema ordering, source retirement and same-ID versus new-migration
   applicability.
7. **Cost:** which files, bytes, passes and syncs are required? Does another
   consumer repeat a proof that is already established? Confirm that startup and
   new work do not audit every historical trace.
8. **References:** which typed references cross package or feature boundaries
   into or out of the changed data, and where is each validated?
9. **Evidence:** which tests (section 9) prove the intended behavior? What
   remains unverified?
10. **Lessons and review:** which existing migrations and lessons (section 10) did
   you consult, which rejected mechanisms did you avoid, and who independently
   reviews the risk?

Stop and revise if an answer requires guessing identity, deleting retained data,
fabricating success, adding old-runtime fallbacks or causing unnecessary
whole-application lockout.

## 3. Persisted Formats: Avoid Migrations by Design

Most format changes should not need a migration. Design persisted formats so
that ordinary evolution is absorbed by the reader.

- **Read tolerantly.** A reader requires the fields it actually uses, validates
  their types and invariants, and ignores unknown or obsolete fields. Parse into a
  projection of known fields, so unknown fields never reach memory or later
  writes.
- **Write exactly.** A writer emits the exact current shape. Tests assert the
  written key set.
- **No schema version fields** in new or changed formats. Recognize a shape by
  its structure (required fields, enum values, identity invariants), not by a
  number. Old files may still contain a version field; readers ignore it.
- **Compatible changes need no migration:**
  - adding an optional field, provided its absence has a truthful meaning;
  - removing an obsolete field, which is ignored on read and dropped on the next
    ordinary save.
- **Never reuse a field name with a different meaning.** Add a new field instead.
  Two cases do justify a migration:
  - a change of meaning;
  - a new required fact that only old data can supply.
- **Tolerant reading is not a compatibility branch.** Current code must not
  contain old-shape decoders, version switches or fallback reads of other files.
- **Released migrations keep strict classifiers.** A released migration that uses
  a validator to tell shapes apart ("is this already current?") must use a frozen
  strict copy of the validator it was released with, never the current tolerant
  reader.
- **Convert strict readers when you touch them.** Some existing readers still
  require exact keys and versions. When a change touches one of those formats,
  convert its reader in the same change rather than adding a migration.

## 4. Deterministic Scope and Current-Only Runtime

### Known source to one fixed target

- Map investigated, supported released source shapes to one fixed current
  target. The same validated input must always produce the same target, or the
  same explicit unsupported outcome.
- Inspect predecessor skips, warnings and retained data, not just the happy-path
  schema.
- Leave unsupported source data intact and give it a truthful disposition.
- **Supported upgrade range:** every released source shape stays supported until
  a release explicitly declares a minimum upgrade-from version. Only then may
  migrations for older shapes be retired.

### Current-only runtime

- Old schemas, selectors, file decoders, classification and transformation live
  only inside registered migrations. Current services, repositories and readers
  use only current contracts. That rules out:
  - reading the old shape when the new one is missing;
  - dual readers or writers;
  - legacy SQL adapters or optional old columns;
  - runtime reconciliation against historical storage.
- **Freeze source shapes inside the migration.** A migration may import current
  code only to validate its output. Its source types and validators are frozen,
  migration-owned copies. Before changing a current schema, repoint any released
  migration that still imports it.
- The boundary is:

  `current schema expansion → migration-owned conversion and validation → current runtime`

- **Deployment order:** in this repository the Prisma schema is deployed before
  app-data migrations run. Dropping migration inputs first can make conversion
  impossible, so verify the order before retiring source fields.
- Availability comes from scoped admission, never from restoring an old-runtime
  compatibility path.

## 5. Operating Assumptions and Reachability

A normal attempt may assume:

- one migration writer;
- a stable process and device;
- sufficient permissions and storage;
- normal SQLite and filesystem behavior.

User Quit, process kill, OS shutdown and power loss are one category: an
unfinished attempt. Handle it with the established commit boundary and ordinary
restart and idempotence (section 7), not a separate state machine per label. This
is not a promise to repair arbitrary physical corruption or violations of storage
guarantees.

Any extra backup, fallback, repair or recovery branch needs an independent basis:
a supported user or system action, or an approved operational or security
contract. Trace the path from that trigger to the persisted state and its
consequence:

| Reachability | Required response |
| --- | --- |
| Reachable | Add only the smallest necessary mechanism. |
| Not reachable | Add no machinery and no dedicated failure matrix. |
| Unclear | Investigate or get a scope decision. Do not invent a fallback. |

Hypothetical hostile tampering, compromised processes, adversarial writers,
arbitrary corruption and kernel or device failures do not by themselves justify
new migration infrastructure. A proposed recovery mechanism cannot justify
itself.

## 6. Dispositions, Admission and Residue

Determine **two outcomes separately**:

1. whether the migration completed its defined work; and
2. which current operations have independently valid prerequisites.

| Migration result | Meaning | Runtime consequence |
| --- | --- | --- |
| `SUCCEEDED` | The required target and validation completed with no warnings. | Conversion is complete; don't re-audit it at startup. Normal operation-specific checks still apply. |
| `SUCCEEDED_WITH_WARNINGS` | The work completed with explicit, bounded, nonfatal dispositions, and every admitted target validates. | Preserve and exclude incomplete history. Allow independent work, even when all old runs are excluded. |
| `FAILED` | A required transformation or commit did not establish its target. | Record actionable evidence and isolate the affected operations. Don't infer a global startup failure. |

Rules for choosing the status:

- A known missing historical tree is a preserved exclusion (a skip), not a failed
  transformation. An otherwise completed attempt with such exclusions is a warning
  success.
- Never decide the status by majority, and never require a minimum number of
  valid old runs.
- The migration's explicit aggregate policy decides the outcome, not a substring
  of an item diagnostic or a raw count.
- Never fabricate a successful ledger record, and never turn every exception
  into a warning.

### Run and reference admission

- **A discovered directory is only a candidate.** Reuse current structural
  validation. Exclude incomplete packages from usable lists **and** from direct
  load, restore and file paths.
- **Evaluate admission from current data**, not from old ledger or log results.
- **Don't validate history at startup.** Startup and unrelated new work must not
  wait for exhaustive validation of historical references. Validate a historical
  operation when it is actually requested.
- **Check both ends of a typed reference.** For a reference A → B, leaving out B
  doesn't prove A is usable. Validate the exact owner, execution scope and
  physical file; a matching filename or the referring author is not ownership.
  Isolate the dependent operation or package, but don't block an independent
  package C.
- Interpreting legacy selectors happens only inside the migration. Never accept a
  success label or stale, unvalidated cached evidence in place of current proof.

### Residue

Classify residue by the final state and its actual readers:

- **Inert residue:** a validated target plus inert, nonrequired old columns,
  files or attributes may succeed with warnings. Nullable data is acceptable only
  when the current contract explicitly allows it. Never fill gaps from an old
  runtime field.
- **Rolled-back cleanup:** if cleanup rolled back target creation, the target
  was not established.
- **Ambiguous residue:** if discovery can see both shapes, or could duplicate or
  ambiguously choose ownership, the residue isn't inert. Isolate the affected
  capability.
- **Removal obligations:** security, privacy, retention and storage-removal
  obligations still apply; a valid target does not waive them.
- **Approved exception:** observable residue is acceptable only when the product
  explicitly approves it. The current example is nested Team-memory repair under
  Memory Sync v1's replace-only mirroring: the canonical target validates and
  every semantic reader selects it. This does not authorize generic residue,
  legacy readers, tombstones, remote cleanup or migration-status sync gates.

## 7. Persistence and Proportionate Retry

Writing the target is not the same as creating a backup or a journal.

| Persistence | Purpose and boundary |
| --- | --- |
| Target | The existing SQLite transaction, atomic file writer or same-filesystem rename establishes current state. |
| Runner audit | The existing migration record and attempt log report the execution. They are not a second data store. |
| Original preservation | Only for a demonstrated transition or rollback contract, not "copy everything just in case". |
| Progress journal | Exceptional. Justify why source/target recognition plus ordinary retry cannot resolve the real multi-step state. Interruption alone is not a justification. |

- **Databases:** prefer transactional commit and rollback.
- **Files:** use atomic replacement per file. Keep sources unchanged until the
  target validates. On retry, recognize already-current files and re-derive
  targets from the remaining sources.
- **Multi-file packages:** an atomic rename does not make a coupled multi-file
  package transactional. Identify its real admission or marker boundary.
- **Validate before any destructive cleanup.** A temporary replacement file or
  domain manifest is not a backup journal.
- **Justify every backup, hash or progress record** by its reader, the supported
  retry state it serves, why existing primitives are insufficient, and its cost
  in bytes, passes and syncs. Repeated validation must prove a distinct required
  invariant.
- **No speculative machinery:** no bespoke restoration engines, parallel recovery
  formats, per-syscall matrices or infrastructure-failure simulation without an
  approved, reachable need.
- **Originals:** retain existing originals; never overwrite them with newer
  history or restore them over later writes.
- **Don't copy by default:** don't reuse a mechanism from an older migration just
  because it exists.

**Retry example:** file A was atomically converted before an interruption and
file B was not. The next eligible attempt leaves the current A unchanged and
converts B. There is no restore from a saved original and no journal. If the
runner already recorded terminal completion, neither file is reprocessed.

### Completed means completed

- Once a migration has completed its conversion and validation, ordinary startup
  skips that work. Do not rerun its proof under another name, such as
  "readiness", "integrity check" or "post-migration validation".
- A terminal warning success is also terminal. Preserved exclusions are not a
  reason to re-audit the whole corpus.
- Checks for a specific requested read, write or import are still separate:
  completion is not blanket authorization for any later access.

### Correcting a released migration

- A same-ID repair to an app-data definition fixes pending or failed
  installations. Terminal `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS` records stay
  skipped.
- Don't reset the ledger or force successful users to replay a conversion.
- If successful installations need another persisted transformation, decide that
  as a separate new migration.
- Repairing a skipped converter does not remove recurring runtime validation
  cost; fix that runtime path separately.
- None of this permits rewriting already-applied Prisma SQL history. Coordinated
  client/server and stopped-writer requirements belong in the task's rollout
  plan. Keeping a backup does not grant rollback authority.

## 8. Use the Runner's Contracts

The migration runner already owns:

- status, the summary sentence and attempt counts;
- the attempt log;
- execution policy and recovery actions: manual retry versus restart-to-retry.

A migration definition returns its aggregate counts and item details. It does not
format status text, add persisted count fields, or put item arrays, source rows
or exception dumps into database, API or UI status fields; full details belong in
the attempt log. Group warnings with counts and capped examples. Clients show
the recovery action the runner provides and must not infer it. For the exact
formats, read `src/app-data-migrations/app-data-migration-runner.ts` and
`src/app-data-migrations/domain/app-data-migration-types.ts`.

Database values must be validated through the real driver. A TypeScript type on a
raw query does not convert or validate the returned value. Section 10 lists the
example to learn from.

## 9. Performance and Acceptance Evidence

### Measure the real cost

- Record candidate and changed counts, bytes, largest file, and the full-file
  read, parse, transform, hash and write passes and sync operations. A tiny
  locator edit can still cost a whole-trace rewrite.
- Measure first conversion, failed-attempt retry and startup after a terminal
  migration separately. A skipped migration does not imply cheap readiness.
- Reuse established same-process validation while its authority is still valid.
- Before replacing redundant work with a persistent cache or index, show why a
  simpler bounded pass or the existing owner is not enough. Don't answer a
  removed scan with a background audit, new journal or longer startup timeout
  without a demonstrated, approved need.
- Changes to validation timing, admission or freshness need explicit behavior
  approval.
- Compare before and after on the same data. Don't invent a universal
  millisecond target.

### Acceptance for historical-run migration or startup work

1. **Released shapes:** known predecessor shapes and warnings; valid history
   alongside empty and nonempty missing-tree roots; and **all historical roots
   excluded, with new work still usable**.
2. **Identity and dependencies:** exact identity, unavailable cross-root
   dependencies next to independent runs, across listings, direct-ID load and
   restore, and applicable synchronous file reads.
3. **Retry:** ordinary retry and idempotence, supported partial commits, and
   already-terminal ledger cases. Originals are preserved and non-target content
   is unchanged.
4. **Startup:** the real startup entrypoints, and repeat startup. For a desktop
   startup issue, verify the desktop boundary, not just browser access to a warm
   server.
5. **Released data:** faithful released-data fixtures committed with the
   migration's tests, including predecessor residue. When safely available, add a
   stopped-writer disposable copy of an installed dataset with all problematic
   roots retained. Never run automated replay or mutations against a live
   profile.
6. **Recovery and user verification:** actual recovery and update
   accessibility, and explicit user verification before any delivery recovery
   claim. Never bury an untested required boundary under test totals or
   confidence percentages.

These don't count as evidence:

- a current-generated fixture with old field values (not released-data
  fidelity);
- a copy with problem roots removed (that is diagnosis, not acceptance);
- migration-only success (that is not startup success).

Keep real current-platform controls so that "availability" cannot turn into
"ignore every failure".

## 10. Learn From Existing Migrations and Past Mistakes

Before designing, read the closest existing migration. The examples below are
lessons, not templates. Reuse only the mechanisms your actual data needs. Paths
are relative to `src/app-data-migrations/migrations/` unless prefixed `tickets/`.
For those, read the final ticket decisions; rejected drafts are evidence of
mistakes, not approved designs.

### Existing migrations to learn from

| Source | Lesson |
| --- | --- |
| `team-run-execution-tree-v2-app-data-migration.ts` | Known old/current/missing classification, atomic replacement and a current reread. `SKIPPED_MISSING` doesn't promise the next migration a tree. |
| `agent-org-flat-team-families-v1/agent-org-history-candidate-plan.ts` and its migration entry | Explicit missing-tree warnings preserve sources. A prerequisite's warning success certifies its stated outcomes, not every directory. A frozen released schema lives in `released-team-run-v2-schema.ts`. |
| `src/app-data-migrations/legacy/released-run-package-shapes/` | Shared frozen strict copies (Team tree v2, Org tree v1, task-records v1, Org state-package v1) that let released migrations keep their classifiers after the current execution-tree readers became tolerant and the records runtime was deleted. Current runtime code never imports it. |
| `agent-org-flat-team-families-v1/agent-org-context-file-locator-transition.ts` | Cross-root references need exact ownership proof and physical file proof. |
| `token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.ts` | A bounded fold in one SQLite transaction, with coverage and totals validated before source deletion. An empty-source retry is a no-op. |
| `token-usage-run-records-v1/legacy-token-usage-row.ts` | Real-driver value handling: SQLite values arrived as decimal strings after leading `NULL` rows. Validate exactly, test through the production adapter, and never use permissive coercion. |
| `team-agent-memory-layout-app-data-migration.ts` | Rename the directory instead of copying and rehashing history. Explicit dispositions for preserved conflicts and residue. |
| `team-run-execution-tree-v1/team-run-v1-package-promoter.ts` | Coupled authority files use retained predecessor files plus a promotion marker, not a per-trace journal. |
| `raw-trace-rotation-layout-migration-run.ts` | Preserve pending segments, publish and validate the domain manifest, then clean up the old layout. |
| `remove-external-messaging-data-migration.ts` | Deletion without a backup followed an explicit feature-removal approval. It is not general permission to delete history. |
| `team-run-metadata-member-tree-migration.ts`, `remove-global-skill-discovery-mode-migration.ts`, `team-communication-projection-address-migration.ts` | These back up changed files before replacing them. That records past behavior; it is not a default for similar rewrites. |

### Mistakes not to repeat

| Where it happened | Lesson |
| --- | --- |
| v1.4.87 attachment migration: `tickets/done/team-attachment-exact-execution` (API-REV-002 incident) | **Critical lockout.** The migration read every discovered Team tree unconditionally, although predecessors had legitimately preserved roots without trees. Both startup entrypoints then required aggregate `SUCCEEDED`. Two false assumptions (source shape and global dependency) combined into a user lockout. Review and a current-generated "upgrade" fixture didn't catch it. The fix is disposition plus narrow admission (sections 1 and 6), not a catch-all warning or deleting roots. |
| Same ticket, D1/D2 and DR-007/009; correction in `tickets/done/startup-performance` | Whole-file `.original` copies, repeated hashing and multi-pass transforms, per-file manifests, and a post-migration scan of all history at startup made one-time upgrade work into a large permanent startup cost. The correction: convert each source once, replace atomically, recognize the current shape, and check a reference only when it is used. |
| `tickets/done/canonical-identity-startup-recovery` (SR-011–013) | The user rejected hash/phase records, restoration and per-syscall recovery, and later also rejected fatal-only handling. Simplify without reintroducing lockout. |
| `tickets/done/token-usage-one-row-per-agent-run` (SR-004–006) | Speculative recovery and runtime legacy-overlap machinery were replaced by current-only admission and a transactional conversion. |
| `tickets/done/org-history-startup-latency` | Warm tests missed a cold-start duplicate readiness rebuild. Reusing the established in-process result fixed it without weakening admission. |
