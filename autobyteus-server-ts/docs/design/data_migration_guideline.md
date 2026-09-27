# Data Migration Guideline

The single canonical policy for production app-data migrations. Read this before
migration design; use the final checklist in the task's design spec. Task-specific
schemas, algorithms, measurements and delivery status belong in their owning
modules/tickets, not in this guideline. This is normative guidance, not a claim
that every released implementation already complies.

## 1. Critical Rule: Historical Data Must Not Lock Users Out

**CRITICAL: reject any design that makes desktop startup or new work conditional
on successfully loading or migrating all historical data.**

An unreadable old run is a data-availability issue, not proof the application
cannot operate. Preserve and exclude unusable history; open the application and
allow new work even if **no historical run is usable**. A missing Team execution
tree prevents loading that Team, not creating an unrelated conversation.

### Consequences

Turning a historical-data problem into startup failure removes every usable
workflow. Users lose access to unrelated work, cannot diagnose the problem, and
may lose trust, abandon the product or cancel paid use. Customer loss and recovery/
support costs can cause serious financial loss. These are foreseeable risks,
not a measured loss estimate for a particular incident.

**Lockout can also block recovery.** If the in-app updater requires normal startup,
users cannot reach it to install our corrective release. Publishing a new version
does not itself rescue them. Do not assume an independent updater or external
installer is accessible or understandable to every customer. Requiring manual
recovery shifts our release failure onto the user and increases abandonment risk.
Review the actual upgrade path; "we can ship another version" is not justification
for a startup-blocking migration.

### Availability and integrity together

- Preserve incomplete historical data; never delete it, guess ownership, expose
  it as valid, or reset the database merely to get an empty working application.
- Gate only the run/capability whose current prerequisites cannot validate.
  Historical failure must not block unrelated work.
- Separate migration audit status from runtime admission. A `FAILED` attempt
  does not automatically mean startup failure; a success label proves neither
  that every directory is current nor that every reference is usable.
- A genuinely unavailable application-wide platform prerequisite is different.
  Its owner must identify the concrete dependency and prove that a narrower gate
  cannot suffice. Never relabel a missing old tree or empty history list as a
  "core" prerequisite. Do not bypass actual current schema/security invariants
  or introduce legacy runtime readers to pretend the platform is ready.

## 2. Deterministic Scope and Operating Assumptions

Map investigated, supported released source shapes to one fixed current target.
The same validated input must produce the same target or explicit unsupported
outcome. Inspect predecessor skips/warnings and retained data, not just happy-path
schemas. Unsupported source data stays intact with a truthful disposition.

Normal attempts assume one migration writer, a stable process/device, sufficient
permissions/storage, and normal SQLite/filesystem behavior. User Quit, process
kill, shutdown and power loss form one unfinished-attempt category: use the
established commit boundary and ordinary restart/idempotence, not separate
recovery state machines for each label. This is not a promise to repair arbitrary
physical corruption or violations of storage guarantees.

Any additional backup, fallback, repair or recovery branch must name an independent
supported user/system action or approved operational/security contract. Show the
path from that trigger to the persisted state and consequence:

- **Reachable:** add only the smallest necessary mechanism.
- **Not reachable:** do not add machinery or dedicated failure matrices.
- **Unclear:** investigate or obtain a scope decision; do not invent a fallback.

Hypothetical hostile tampering, compromised processes, adversarial writers,
arbitrary corruption and kernel/device failures do not independently authorize
new migration infrastructure. A proposed recovery mechanism cannot justify itself.

## 3. Current-Only Runtime

Keep old schemas, selectors, file decoders, classification and transformation
inside registered migrations retained for supported direct/skip-version upgrades.
Current services, repositories and readers use only current contracts: no
read-old-if-new-missing, dual readers/writers, legacy SQL adapters, optional old
columns or runtime reconciliation against historical storage.

The boundary is:

`current schema expansion → migration-owned conversion/validation → current runtime`

Verify actual deployment order before retiring source fields. In this repository
Prisma schema deployment precedes app-data execution; dropping migration inputs
first can make conversion impossible. Availability comes from scoped admission,
not restoring an old-runtime compatibility path.

## 4. Dispositions, Admission and Cleanup

Determine **two outcomes separately**: whether the migration completed its defined
work, and which current operations have independently valid prerequisites.

| Migration result | Meaning | Runtime consequence |
| --- | --- | --- |
| `SUCCEEDED` | Required target/validation completed without warnings. | Conversion is complete; do not re-audit it on startup. Normal operation-specific checks remain. |
| `SUCCEEDED_WITH_WARNINGS` | Work completed with explicit bounded nonfatal dispositions; every admitted target validates. | Preserve/exclude incomplete history and allow independent work, including when all old runs are excluded. |
| `FAILED` | A required transformation/commit did not establish its target. | Record actionable evidence; isolate affected operations. Do not infer global startup failure. |

A known missing historical tree is a skip/preserved exclusion, not a failed
transformation. An otherwise completed attempt with such exclusions uses warning
success. Do not choose status by a majority or require a minimum number of valid
old runs. Item diagnostic names in historical implementations may differ; their
explicit aggregate policy, not a substring or raw count, determines the outcome.
Never fabricate a successful ledger record or turn every exception into a warning.

### Run and reference admission

A discovered directory is only a candidate. Reuse current structural validation;
exclude incomplete packages from usable lists **and direct load/restore/file paths**.
Evaluate structural admission independently of old ledger/log results at the
appropriate discovery/import boundary. Do not make startup or unrelated new work
wait for exhaustive historical attachment-reference validation. Validate the
requested historical operation at its relevant access boundary; a broken old
reference must not prevent the application from opening.

For a typed reference A→B, omitting B does not prove A usable. Validate exact owner,
execution scope and physical file; a matching filename or the referring author is
not ownership. Isolate the dependent operation/package without blocking independent
C. Legacy selector interpretation stays migration-only. Never adopt success labels
or stale/unvalidated cached evidence as a substitute for the required current proof.

### Cleanup and residue

Classify by final state and actual readers, not merely the cleanup statement:

- Complete validated target plus inert, nonrequired old columns/files/attributes
  may succeed with warnings. Nullable data is acceptable only if the current
  contract explicitly allows it; never fill gaps from an old runtime field.
- If cleanup rolled back target creation, the target was not established.
- If discovery can select both shapes, duplicate or ambiguously choose ownership,
  the residue is not inert: isolate the affected capability.
- Security/privacy/retention/storage-removal obligations still apply. A valid
  target alone does not waive them.

**Bounded mirror exception:** nested Team-memory repair permits sync-visible flat
residue only when the canonical target validates, every semantic local/imported
reader selects that target, the existing mirror permits source-deleted files to
remain, no independent removal contract applies, and the product explicitly
accepts the storage consequence. Memory Sync v1 replace-only mirroring explains
this case; it does not authorize generic residue acceptance, legacy readers,
tombstones, remote cleanup or migration-status sync gates. Invalid/missing targets
remain unavailable and are not made valid by the exception.

## 5. Persistence and Proportionate Retry

Writing a target is not the same as creating a backup or migration journal.

| Persistence | Purpose and boundary |
| --- | --- |
| Target | Existing SQLite transaction, atomic file writer or appropriate same-filesystem rename establishes current state. |
| Runner audit | Existing migration record, summary and attempt log report execution; not a second data store. |
| Original preservation | A narrowly justified backup/retained source serves a demonstrated transition or rollback contract. Not "copy everything just in case." |
| Progress journal | Exceptional: justify why source/target recognition and ordinary retry cannot resolve the actual multi-step state. Interruption alone is insufficient justification. |

Prefer transactional commit/rollback for database changes; prefer existing atomic
replacement/rename plus deterministic current-target recognition for files.
An atomic file rename does **not** make a coupled multi-file package transactional:
identify its actual admission/marker boundary. Validate before destructive cleanup.
A temporary replacement file or domain layout manifest is not a backup journal.

For each proposed backup/hash/progress record, explain its reader, supported retry
state, necessity beyond existing primitives, and bytes/passes/sync cost. Repeated
validation must establish a distinct required invariant, not repeat the same proof.
Do not add bespoke restoration engines, parallel recovery formats, per-syscall
matrices or infrastructure-failure simulation without approved reachable need.

Retain existing originals; never overwrite them with newer history or restore them
over later writes. A redesign may leave released artifacts inert only after proving
retry from supported partial source/current states. Do not copy every mechanism
from an older migration merely because it exists.

Worked anti-pattern comparisons and ordinary retry examples are in section 9.

### Completed means completed

Once a migration has completed its defined conversion and validation, ordinary
startup must skip that work. Do not rerun its proof under another name such as
"readiness," "integrity check" or "post-migration validation." Terminal warning
success also stays terminal; preserved exclusions are not a reason to audit the
whole corpus again. Manual retry eligibility is separate; use the runner policy
in section 7 rather than inferring it from automatic startup selection.
Normal checks for an actually requested read, write or import remain distinct:
completion is not blanket authorization for arbitrary later access.

### Correcting a released migration

A same-ID **app-data definition** repair can fix pending/failed installations;
ordinary terminal `SUCCEEDED`/`SUCCEEDED_WITH_WARNINGS` records remain skipped.
Do not reset the ledger or force successful users to replay a conversion. A repair
to a skipped converter alone cannot remove recurring runtime validation cost;
investigate that runtime path separately. If successful installations need another persisted transformation, investigate that
as a separate migration decision. This is not permission to rewrite already-applied
Prisma SQL history. Coordinated client/server and stopped-writer requirements belong
in the task's rollout plan; backup retention is not automatic rollback authority.

## 6. Database Transport Must Be Validated

SQL meaning, SQLite storage type, ORM metadata and JavaScript runtime type differ.
A TypeScript `$queryRaw` annotation does not validate or convert returned values.
The token migration encountered decimal strings after leading `NULL` results;
this is evidence for real-driver tests, not a universal claim about every query.

Use a deterministic transport when inference is unstable, validate its grammar and
source type, then convert and check the actual target domain. Avoid unchecked
casts or coercions that silently accept malformed or out-of-range values. For
**nonnegative token integers**, reject negatives, fractions, exponent notation and
unsafe ranges; these restrictions are not a ban on signed/decimal fields in other
migrations. Exact parsing before safe narrowing is illustrated by
`legacy-token-usage-row.ts` under `token-usage-run-records-v1/`.

Regression fixtures must use the production adapter, including the observed
leading-`NULL` ordered batch and that domain's invalid types/ranges. A mocked
correctly typed row is not evidence of driver correctness.

## 7. Audit Records and Executable Recovery Actions

`app_data_migration_records.summary` is nullable opaque text containing only the
runner-formatted terminal sentence:

`Scanned N; migrated N; skipped N; failed N.`

The runner owns aggregate formatting, status, attempts, timestamps, concise error
and `log_path`; thrown definitions use its existing zero-count summary and separate
error. Do not parse the sentence into domain state, add duplicate persisted counts,
or place item arrays/source rows/exception dumps in database/API/UI status fields.
Full details belong in the referenced attempt log. Grouped warnings use counts and
capped examples. Existing detail logs can grow; global retention/compaction or
historical log rewriting is separate scope, not a silently added requirement.

The released `summary_json`→`summary` transition lives in Prisma migration
`20260820090000_redesign_app_data_migration_summary`: it validates the four known
nonnegative counts, builds the sentence and renames the column transactionally.
Other metadata/log paths remain unchanged; no runtime legacy summary decoder.

The runner also owns the nonpersisted recovery action:

| Action | Meaning |
| --- | --- |
| `MANUAL_RETRY` | Policy permits a manual attempt; duplicate-run and prerequisite guards still apply. |
| `RESTART_TO_RETRY` | Required-on-startup `STARTUP_ONLY` work is pending, failed or stale-running; startup can attempt it subject to guards. |
| `NONE` | No retry offered: active attempts, clean success, or terminal warning for `STARTUP_ONLY` work. |

`ANYTIME` warning success can offer `MANUAL_RETRY`; it is still skipped by automatic
startup. Derive `canRetry` only from the runner-provided `MANUAL_RETRY`, not status
alone. Reject manual invocation of `STARTUP_ONLY` definitions. Carry the action through API/client state; the UI must not infer it
from IDs or local status combinations, nor send a disabled manual retry. Status
presentation must not become a migration-framework redesign.

## 8. Performance and Acceptance Evidence

Record candidate/changed counts, bytes, largest file, full-file read/parse/transform/
hash/write passes and sync operations. A tiny locator edit can still cost a whole
trace rewrite. Measure first conversion, failed-attempt retry and terminal-migration
startup separately; a skipped migration does not imply cheap readiness.

Reuse established same-process validation when its authority remains valid. Do not
replace redundant work with a persistent cache/index protocol before demonstrating
why a simpler bounded pass or existing owner cannot suffice. Nor should removing
a scan default to a background audit, new journal or longer startup timeout.
Such mechanisms need a demonstrated need and separately approved scope. Changes to validation
timing, admission or freshness require explicit behavior approval. Compare before/
after on the same corpus; do not invent a universal millisecond SLA.

For historical-run migration/startup work, acceptance must cover:

1. Known predecessor shapes and warnings; valid history alongside empty/nonempty
   missing-tree roots; **all historical roots excluded with new work still usable**.
2. Exact identity, unavailable cross-root dependencies and independent runs;
   listings, direct-ID load/restore and applicable synchronous file reads.
3. Ordinary retry/idempotence, supported partial commits and already-terminal
   ledger cases; preserved originals and unchanged non-target content.
4. Real applicable startup entrypoints and repeat startup. For an Electron startup
   incident, verify the desktop boundary, not just browser access to a warm server.
5. Faithful released-data fixtures and, when safely available, a stopped-writer
   disposable installed-data copy with all problematic roots retained. No automated
   replay or mutations on the live profile.
6. Actual recovery/update accessibility and explicit user verification before a
   delivery recovery claim. Do not bury an untested required boundary under test
   totals or confidence percentages.

A current-generated fixture with old URLs is not proof of released-data fidelity.
Removing problematic roots from a copy is diagnosis, not acceptance. CPU samples
show activity, not exact time attribution. Migration-only success is not startup
success. Keep genuine current-platform controls so "availability" cannot become
"ignore every failure."

## 9. Historical Practices and Anti-Patterns

Paths below are relative to this server package unless prefixed `tickets/`, which
are repository-relative. Read final ticket decisions; rejected drafts are evidence
of mistakes, not approved templates. Examples illustrate the rules, not a blanket
requirement to reproduce their mechanisms.

### Historical examples: lessons, not templates

| Example source under `src/app-data-migrations/migrations/` | Lesson |
| --- | --- |
| `token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.ts` | Bounded fold in one SQLite transaction; validate coverage/totals before source deletion. Empty-source retry is a no-op, without custom snapshot/hash journals. |
| `team-run-execution-tree-v2-app-data-migration.ts` | Known V1/current V2/missing classification, atomic replacement and current reread. `SKIPPED_MISSING` does not promise a tree exists for the next migration. |
| `team-agent-memory-layout-app-data-migration.ts` | Rename the directory rather than copy/rehash history; explicit preserved conflict/residue dispositions. |
| `team-run-metadata-member-tree-migration.ts`, `remove-global-skill-discovery-mode-migration.ts`, `team-communication-projection-address-migration.ts` | These older implementations back up changed metadata/sidecars before atomic replacement. This records past behavior, not a recommendation to create backups for every similar rewrite. |
| `team-run-execution-tree-v1/team-run-v1-package-promoter.ts` | Coupled authority files retain selected predecessor files and a promotion marker, not a per-trace hash/progress journal. This is a scope distinction, not a claim those files are always small. |
| `raw-trace-rotation-layout-migration-run.ts` | Preserve pending segments, publish/validate domain manifest, then clean old layout; its runtime manifest is not duplicate recovery bookkeeping. |
| `agent-org-flat-team-families-v1/agent-org-history-candidate-plan.ts` and migration entry | Explicit missing-tree warnings preserve sources. Prerequisite warning success certifies stated outcomes, not every directory's validity. |
| `remove-external-messaging-data-migration.ts` | No-backup deletion follows explicit feature-removal approval, never a general permission to delete history for speed. |

### Mistakes not to repeat

| Historical evidence | Mistake and lesson |
| --- | --- |
| `tickets/done/canonical-identity-startup-recovery/solution-revision-record.md`, SR-011–013 | User rejected proposed hash/phase records, restoration and per-syscall recovery. Later revisions also rejected fatal-only handling. Simplify without reintroducing user lockout. |
| `tickets/done/token-usage-one-row-per-agent-run/solution-revision-record.md`, SR-004–006 | Speculative recovery and runtime legacy-overlap machinery were replaced by current-only admission and transactional conversion. Driver assumptions also required real-adapter regression, not permissive parsing. |
| `tickets/done/migration-startup-scope-recovery/investigation-notes.md` | Repeated whole-history transforms/hashes and a separate startup scan were identified. Final ticket scope fixed only the Electron timeout; deferred scanner proposals were not implemented fixes or approved designs. |
| `tickets/done/org-history-startup-latency` | Warm tests missed a measured 26.657-second duplicate cold readiness rebuild. Reusing the established in-process generation fixed first-read latency without weakening admission. |
| `tickets/done/team-attachment-exact-execution`, D1/D2 and DR-007/009 | Whole-record originals plus repeated parse/hash/manifest sync caused substantial work: 363 originals, about 722.23 MiB; recorded attempt 154.845 seconds. Repeat startup was separately 33.846 seconds with conversion skipped. These observations do not isolate hashing's share; preserved evidence is not permission to repeat every mechanism. |

### Worked comparison: attachment migration before and approved correction

**Status:** the left column describes the released implementation. The right column
is the user-approved correction in `tickets/in-progress/startup-performance`
(R1/D1), not proof of completion. Local source/check status is recorded in that
ticket's `implementation-handoff.md` (IR-001); independent validation and release
remain separate gates. Do not copy the old mechanisms merely because they shipped.

| Previous approach / original rationale | Approved correction | Why change it? |
| --- | --- | --- |
| Copy each entire changed history file to `.original` to preserve a pre-conversion snapshot. | Read the source, construct its target and atomically replace only if changed; create no new retained backup. Keep existing originals untouched. | Replacing one locator is not a demonstrated requirement to retain a second large trace. A temporary atomic-write file is not a historical backup. |
| Hash original, target and current bytes to recognize planned/retried states. | Recognize supported old/current structure and preserve already-current content. | A matching fingerprint cannot establish correct attachment ownership or correct transformation. These shapes are recognizable without hashes. |
| Transform during validation, preflight, execution planning, target reconstruction and later rechecks. | Convert each source once and use that computed target for the write. | Regenerating the same target repeats work; it is not independent evidence that the algorithm is correct. Test expected semantics and non-target preservation instead. |
| Persist mappings, hashes and per-file completion in a custom manifest, saving it after each file. | Keep the existing runner's attempt status/log; retry remaining old files from their actual contents. | The unchanged owner trees and old/current records already contain this conversion's inputs. A second progress store adds writes and competing state. |
| After terminal migration success, scan all historical references before server readiness to pre-detect unavailable history. | Skip completed conversion/validation; check the requested attachment at actual use. | One-time upgrade work became a permanent startup cost and blocked unrelated work. The next subsection records the measured consequence. |

**Concrete source/target example:**
`/rest/team-runs/T/members/writer/context-files/f.png` becomes
`/rest/team-runs/T/agent-runs/E/context-files/f.png` only when the existing owner
facts uniquely prove execution `E`. Unsupported or ambiguous ownership stays
unchanged with an actionable diagnostic; "simple conversion" never means guessing.

**Ordinary retry example:** if file A was atomically converted before interruption
and file B was not, leave current A unchanged and convert old B on the next eligible
attempt. Do not restore A from a saved original or require a journal to recognize
it. This is per-file retry, not a multi-file transaction. If the runner already
records terminal completion, neither file is reprocessed at ordinary startup.

These examples are specific to the investigated conversion, not a blanket ban on
backups required by a different approved transition. Reuse the simpler historical
transaction/rename/shape-recognition patterns above according to the actual data.

### Measured consequence of the startup-audit anti-pattern

The v1.4.88 recovery scanned active, rotated and archived traces through a no-op
locator transform even when conversion was skipped. An installed-code read-only
probe measured **24.64 seconds** for readiness, including **24.18 seconds** in
reference validation, **6.39 GB** of instrumented reads and **1.07 million JSON
parses**. These are isolated probe measurements, not an end-to-end startup benchmark.
Evidence: `tickets/in-progress/startup-performance/evidence/readiness-profile-analysis.md`.
The preceding comparison owns the mistake and correction; section 1 owns the
customer/recovery consequences. This repeats the earlier whole-history and duplicate
readiness mistakes cited above, rather than establishing a new validation need.

### Critical release failure: v1.4.87 attachment migration

The exact-execution attachment fix unconditionally read every discovered Team tree,
then required aggregate `SUCCEEDED` in both startup entrypoints. Eight of 553 Team
roots in the investigated installation legitimately lacked trees (five empty, three
retaining history), as predecessor migrations had preserved them. The result was:

`retained historical root → ENOENT → migration FAILED → blanket gate → app lockout`

The defect combined a false source assumption with a false global dependency.
Architecture/review accepted it; 202 passing tests and browser send evidence did
not cover that installed source state. The purported copied-upgrade fixture was
current-generated history with old locators, not representative released residue.

Apply the disposition/admission rules in sections 1 and 4 and acceptance evidence
in section 8. Neither a catch-all warning nor deleting the eight roots is a valid
fix; the defect was not merely a missing exception handler.

This is a **historical incident**, not a statement that the released recovery is
still pending. Cumulative evidence and completion are owned by
`tickets/done/team-attachment-exact-execution` (`API-REV-002` incident,
`API-REV-003` recovery validation, `DR-009` v1.4.88 delivery). Performance remained
a separate follow-up; publication/installation status is not owned by this guide.

## 10. Mandatory Design and Review Checklist

Record concise answers in the task design, not a new framework:

1. **Availability:** can users open the app, create new work and reach recovery
   when all history is unavailable? Identify any real platform dependency separately.
2. **Source/target:** what released shapes, predecessor exclusions and current
   invariants were actually investigated? Which owner admits the fixed target?
3. **Disposition:** what happens to each converted/current/excluded/dependent/
   failed item? Why does aggregate status remain separate from current admission?
4. **Commit/retry:** which existing transaction/atomic writer/marker suffices?
   Justify every backup/hash/journal and preserve released originals/partial states.
5. **Current-only boundary:** where does legacy interpretation end? Verify schema
   ordering, source retirement and same-ID versus new-migration applicability.
6. **Cost:** what files/bytes/passes/syncs are required and measured? Does another
   consumer repeat proof already established? Confirm startup/new work does not
   audit every historical trace. Do not substitute a cache by reflex.
7. **Boundary contracts:** are database values validated through the real adapter,
   audit/log storage separated, and advertised recovery actions executable?
8. **Evidence:** which representative upgrade, retry, cold-start, dependency and
   new-work tests prove the intended behavior? What remains unverified?
9. **History/review:** which final historical lessons were consulted, what rejected
   mechanisms were avoided, and who independently reviews applicable risk?

Stop and revise if the answers require guessing identity, deleting retained data,
fabricating success, old-runtime fallbacks or unnecessary whole-application lockout.
