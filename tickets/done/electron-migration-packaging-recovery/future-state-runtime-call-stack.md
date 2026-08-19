# Electron Migration And Packaging Recovery — Future-State Runtime Call Stacks

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v8`
- Requirements: `requirements.md` (`Refined`)
- Source Artifact: `proposed-design.md`
- Source Design Version: `v8`
- Solution Revision: `SR-005` (`F-006` strict snapshot boundary), with `SR-004` as the history-discoverability behavior basis
- Referenced Sections: `Data-Flow Spine Inventory`, `Ownership Map`, `Bounded Local / Internal Spines`, `Derived Implementation Mapping`

## Conventions

- `[ENTRY]`: external/startup entry
- `[ASYNC]`: awaited boundary
- `[STATE]`: in-memory state
- `[IO]`: filesystem/database/process/network boundary
- `[FALLBACK]`: safe non-primary path
- `[ERROR]`: rejected path
- Function names in new files are target names; existing frames use current exact names.

## Use Case Index

| Use Case | Spine(s) | Scope | Governing Owner | Source | Requirements | Name | Coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-MIG-001` | `DS-MIG-001`, `003` | Primary End-to-End | Runner | Requirement | `R-MIG-004`, `007` | Clean predecessor canonical then V1 | Primary/Error |
| `UC-MIG-002` | `DS-MIG-002`, `005` | Primary + Bounded Local | Classifier/canonical | Requirement | `R-MIG-001`–`003`, `009` | Historical residue safe skip | Primary/Error |
| `UC-MIG-003` | `DS-MIG-002`, `003`, `005` | Primary + Bounded Local | Classifier | Requirement | `R-MIG-001`–`003`, `007` | Complete current V1 safe skip | Primary/Error |
| `UC-MIG-004` | `DS-MIG-001`–`003`, `006` | Primary + Bounded Local | Runner/migrations | Requirement | `R-MIG-006`–`009` | Mixed-state convergence and idempotency | Primary/Fallback/Error |
| `UC-MIG-005` | `DS-MIG-002`, `003`, `005` | Primary + Bounded Local | Classifier/migrations | Requirement | `R-MIG-002`, `009`, `010` | Invalid state preservation | Error |
| `UC-MIG-006` | `DS-MIG-001`, `004` | Primary + Return | Runner | Design-Risk | `R-MIG-004`, `005` | Dependent block and independent continuation | Primary/Fallback/Error |
| `UC-MIG-007` | `DS-MIG-002`, `006` | Primary + Bounded Local | Token task-Team index | Design-Risk | `R-MIG-003`, `006` | Current V1 task-Team token evidence | Primary/Error |
| `UC-MIG-008` | `DS-MIG-002`, `003`, `007` | Primary + Bounded Local | Canonical/V1 migrations | Design-Risk | `R-MIG-002`, `007`, `009` | Interrupted promotion protected-source recovery | Primary/Fallback/Error |
| `UC-MIG-009` | `DS-MIG-001`, `003`, `008` | Primary + Bounded Local | V1 migration/address normalizer | Requirement | `R-MIG-011`–`014` | Released communication-address retry after terminal prerequisites | Primary/Fallback/Error |
| `UC-MIG-010` | `DS-MIG-009`, `010` | Primary End-to-End + Bounded Local | V1 migration/history reconciler | Requirement | `R-MIG-015`–`020` | Validated V1 Team history-index discoverability | Primary/Fallback/Error |
| `UC-PKG-001` | `DS-PKG-001` | Primary End-to-End | Web build boundary | Requirement | `R-PKG-001`, `002` | Build input outside production graph | Primary/Error |
| `UC-PKG-002` | `DS-PKG-001` | Primary End-to-End | Electron build pipeline | Requirement | `R-PKG-003`, `004`, `005` | Canonical Linux x64 build | Primary/Error |
| `UC-PKG-003` | `DS-PKG-002` | Return-Event | Embedded server manager | Requirement | `R-PKG-004` | Packaged server lifecycle | Primary/Error |
| `UC-TEST-001` | All migration spines | Verification | Server tests | Design-Risk | `R-TEST-001` | Durable migration fixtures | Primary/Error |

Every requirement and acceptance criterion maps to at least one use case above. No temporary compatibility flow is required.

## Transition Notes

- The existing migration IDs and persisted records remain unchanged.
- A prior `FAILED` record is retried by the ordinary runner; successful retry increments that existing record once.
- `team_run_metadata.json` remains the interrupted-promotion authority while it exists.
- The classifier is migration-only transition code and does not become a runtime dual reader.
- V1's protected predecessor source lookup becomes one shared read-only resolver; it does not restore/copy predecessor files over live V1 targets.
- Terminal `20260701` and `20260801` records remain unchanged. Failed/unreleased `20260814` owns migration-only normalization of the exact or released communication address evidence it consumes.
- The execution-address normalizer is transition-only code extracted from the existing canonical converter and shared by canonical structured conversion, the older communication migration, and retryable V1 planning. Target V1 messages contain exact AgentRun IDs, so no released address representation enters current runtime storage or APIs.
- Projection-only flat sender/receiver fields are adapted locally by `20260701`; they do not become a general address schema or a V1 input contract.
- Design v6 adds explicit behavior, design-health, persisted-transition, and supplement evidence only; the v5 three-consumer runtime flow remains unchanged and is revalidated below.
- Design v7 adds one migration-owned projection cutover: every validated current or newly promoted V1 tree is reconciled into the current Team history index before `20260814` can succeed. Runtime readers remain unchanged and index-driven.
- Design v8 makes the store boundary implementable: strict read yields immutable normalized rows plus store-owned source existence/path evidence, and only that snapshot can drive equality and protected backup.
- A terminal local `20260814` ledger record is not silently reset. Corrected behavior is validated against disposable copied state with that migration record made retryable; any operational reset/repair remains a separately authorized action.
- No operational data is repaired manually and no workspace link is materialized.

## UC-MIG-001 — Clean Predecessor Canonical Then V1

### Goal

Convert a valid predecessor root in dependency order and leave a complete validated V1 package.

### Preconditions

- Canonical and V1 records are not terminal successes.
- Root has authoritative predecessor metadata.
- Canonical prerequisite conversion is recoverable.

### Primary Runtime Call Stack

```text
[ENTRY] src/server-runtime.ts:startConfiguredServer(options)
└── src/app-data-migrations/app-data-migration-runner.ts:runPending() [ASYNC]
    ├── runDefinition(canonicalDefinition)
    │   ├── assertPrerequisites(canonicalDefinition) # none
    │   ├── repositories/app-data-migration-record-repository.ts:markRunning(...) [IO]
    │   └── migrations/team-canonical-identity-migration.ts:execute() [ASYNC]
    │       ├── migrations/team-run-migration-state-classifier.ts:listAndClassifyRoots() [IO]
    │       ├── classifyRoot(rootId) -> PREDECESSOR [STATE]
    │       ├── team-run-execution-tree-v1/team-run-predecessor-source-resolver.ts:resolve(rootId, rootDir) [IO]
    │       ├── team-canonical-metadata-converter.ts:convertLegacyTeamRunMetadata(...)
    │       ├── team-canonical-structured-file-converter.ts:convertTaskDelegationFile(...)
    │       │   └── team-execution-address-normalizer.ts:normalizePredecessorTeamExecutionAddress(value, rootId, label) [STATE]
    │       ├── token-usage-canonical-execution-address-migrator.ts:migrate() [IO]
    │       └── app-data-migration-record-repository.ts:complete(SUCCEEDED) [IO]
    └── runDefinition(v1Definition)
        ├── assertPrerequisites(v1Definition)
        │   └── repository:getRecord(canonicalId) -> SUCCEEDED [IO]
        ├── repository:markRunning(v1Id) [IO]
        └── migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.ts:execute()
            ├── team-run-migration-state-classifier.ts:classifyRoot(rootId) -> PREDECESSOR [IO]
            ├── predecessor-team-run-planner.ts:planPredecessorTeamRunV1Package(...)
            │   └── predecessor-task-package-converter.ts:convertPredecessorPackage(...)
            │       └── team-execution-address-normalizer.ts:normalizePredecessorTeamExecutionAddress(value, rootId, label) [STATE]
            ├── team-run-v1-package-promoter.ts:promote(...) [IO]
            ├── run-history/services/team-run-state-package-validator.ts:validateTeamRunStatePackage(...)
            └── repository:complete(SUCCEEDED) [IO]
```

### Error Path

```text
[ERROR] canonical converter returns failed detail
TeamCanonicalIdentityMigration.execute() -> FAILED
└── runner:complete(canonical FAILED) [IO]
    └── runner:assertPrerequisites(v1) -> AppDataMigrationPrerequisiteError
        # no V1 markRunning, no V1 filesystem call
```

### Transformations / Observability

- Predecessor JSON -> validated canonical JSON -> atomic backup/replace.
- Predecessor package -> staged validated V1 package -> promoted package with protected backup.
- Existing migration log and record summaries retain per-root status/path/backup information.

### Coverage

- Primary: `Covered`; Fallback: `N/A`; Error: `Covered`.
- Legacy compatibility branch: `No`; cyclic dependency: `No`; naming drift: `No`.

## UC-MIG-002 — Historical Residue Safe Skip

### Goal

Treat a positively identified manifest-only historical root as outside both migrations, without writes.

### Primary Runtime Call Stack

```text
[ENTRY] TeamCanonicalIdentityMigration.execute()
└── TeamRunMigrationStateClassifier.classifyRoot(rootId) [IO]
    ├── inspect team_run_metadata.json -> absent
    ├── inspect three V1 authority files -> all absent
    ├── read team_run_manifest.json [IO]
    ├── validateHistoricalManifest(raw, rootId)
    │   # runVersion=1, matching teamRunId, coordinator member, valid member bindings
    └── return HISTORICAL_RESIDUE [STATE]
        └── canonical migration records SKIPPED; no converter invoked

[ENTRY] TeamRunExecutionTreeV1AppDataMigration.execute()
└── classifier.classifyRoot(rootId) -> HISTORICAL_RESIDUE
    └── V1 migration records SKIPPED; no promoter invoked
```

### Error Path

```text
[ERROR] manifest identity/shape invalid
validateHistoricalManifest(...) -> INVALID(reason, manifestPath)
└── migration records FAILED detail; source bytes unchanged
```

### Coverage

- Primary: `Covered`; Fallback: `N/A`; Error: `Covered`.
- Missing metadata alone never decides the outcome.

## UC-MIG-003 — Complete Current V1 Safe Skip

### Goal

Recognize a root already promoted by an earlier partial run and never parse it as predecessor data.

### Primary Runtime Call Stack

```text
[ENTRY] TeamRunMigrationStateClassifier.classifyRoot(rootId) [IO]
├── metadata -> absent
├── target presence -> execution tree + task records + messages all present
├── TeamRunExecutionTreeStore.read(rootDir, rootId) [IO]
├── TaskDelegationRecordsV1Store.read(rootDir, rootId) [IO]
├── TeamCommunicationV1Store.read(rootDir, rootId) [IO]
├── validateTeamRunStatePackage(...) -> ValidatedTeamRunStatePackage
└── return CURRENT_V1(package) [STATE]
    ├── canonical: SKIPPED "already current"
    └── V1: SKIPPED "complete validated V1 package"
```

### Error Path

```text
[ERROR] any target missing or package validation fails
classifier -> INVALID(exact path/reason)
└── canonical/V1 records FAILED; no predecessor parser or promoter runs
```

### Coverage

- Primary: `Covered`; Fallback: `N/A`; Error: `Covered`.

## UC-MIG-004 — Mixed-State Convergence And Idempotency

### Goal

Recover the observed mixture in one retry, then prove a second startup is a no-op.

### Preconditions

- Cohort includes predecessor, current V1, and historical residue roots.
- Old canonical token rows remain.
- Existing migration records are `FAILED` from the earlier partial run.

### Primary Runtime Call Stack

```text
[ENTRY] AppDataMigrationRunner.runPending()
├── TeamCanonicalIdentityMigration.execute()
│   ├── classifier:listAndClassifyRoots()
│   │   ├── predecessor roots -> PREDECESSOR
│   │   ├── promoted roots -> CURRENT_V1(validated package)
│   │   └── manifest-only roots -> HISTORICAL_RESIDUE
│   ├── TeamRunPredecessorSourceResolver.resolve(all predecessor roots) [IO]
│   │   # all live/protected paths are validated before conversion writes
│   ├── convert only PREDECESSOR metadata/task files [IO]
│   ├── TokenUsageCanonicalExecutionAddressMigrator.migrate()
│   │   ├── buildTokenUsageTaskTeamRunIndex(memoryDir, classifier)
│   │   │   ├── predecessor -> normalizePredecessorTaskDelegationRecordsFile(...)
│   │   │   ├── current -> deriveCurrentV1Entries(validatedPackage)
│   │   │   └── residue -> no mapping
│   │   ├── planTokenUsageExecutionAddressBackfillRow(...) [STATE]
│   │   └── store.applyCanonicalTeamIdentityTransaction(updates) [IO]
│   └── complete canonical SUCCEEDED [IO]
└── TeamRunExecutionTreeV1AppDataMigration.execute()
    ├── prerequisite canonical -> SUCCEEDED
    ├── predecessor -> normalize communication address evidence -> plan/promote/validate [IO]
    ├── current -> skip and retain package tree
    ├── residue -> skip
    ├── tokenStore.migrateExecutionIdentity() [IO]
    ├── convertPredecessorExternalOutputDeliveries(...) [IO]
    └── complete V1 SUCCEEDED [IO]
```

### Idempotent Second Run

```text
[FALLBACK] next application startup
AppDataMigrationRunner.runPending()
├── repository:getRecord(canonicalId) -> SUCCEEDED [IO]
│   └── return snapshot # no markRunning, execute, backup, or rewrite
└── repository:getRecord(v1Id) -> SUCCEEDED [IO]
    └── return snapshot # attempts and bytes unchanged
```

### Error Path

```text
[ERROR] any classifier issue or token plan conflict
canonical -> FAILED with exact details
├── token transaction not applied or rolled back
└── V1 blocked before attempt creation
```

### State / Verification

- First retry: existing failed attempt counts each increment once and finish terminal success.
- Second run: byte/path/backup inventory and attempt counts remain identical.
- Primary: `Covered`; Fallback/idempotency: `Covered`; Error: `Covered`.

## UC-MIG-005 — Invalid State Preservation

### Goal

Reject unknown or partial roots without mutation.

### Error Runtime Call Stack

```text
[ENTRY] classifier.classifyRoot(rootId) [IO]
├── no metadata + one/two V1 files -> INVALID("partial V1 package")
├── no metadata + malformed complete V1 -> INVALID(validation reason)
├── no authorities + malformed/mismatched manifest -> INVALID(manifest reason)
└── no recognized authority files -> INVALID("unrecognized TeamRun root")
    └── calling migration appends FAILED detail
        # converter/promoter/token transaction not entered for unsafe cohort
```

### Invariants

- All pre-run bytes and paths remain unchanged.
- No fabricated metadata, deletion, compatibility reader, or unconditional `ENOENT` skip.
- Primary: `N/A`; Fallback: `N/A`; Error: `Covered`.

## UC-MIG-006 — Dependent Block And Independent Continuation

### Goal

Block only declared dependents before attempt creation and prevent manual bypass.

### Startup Runtime Call Stack

```text
[ENTRY] AppDataMigrationRunner.runPending()
├── for prerequisite status in [SUCCEEDED, SUCCEEDED_WITH_WARNINGS]
│   └── runDefinition(dependent)
│       ├── assertPrerequisites(dependent) -> admitted
│       ├── repository:markRunning(...) [IO]
│       └── definition.execute() [ASYNC]
└── for prerequisite status in [FAILED, RUNNING, NOT_RUN]
    ├── runDefinition(dependent)
    │   └── assertPrerequisites(dependent)
    │       ├── repository:getRecord(prerequisiteId) -> exact status [IO]
    │       └── throw AppDataMigrationPrerequisiteError [ERROR]
    │           # no dependent markRunning; prior record/attempt count unchanged
    └── runDefinition(laterIndependent)
        ├── assertPrerequisites(laterIndependent) # declared prerequisites only
        ├── repository:markRunning(...) [IO]
        └── definition.execute() [ASYNC]
```

### Manual Runtime Call Stack

```text
[ENTRY] api/graphql/types/app-data-migrations.ts:runAppDataMigration(v1Id)
└── runner.runMigration(v1Id)
    └── for prerequisite status in [FAILED, RUNNING, NOT_RUN]
        └── assertPrerequisites(v1)
            └── throw AppDataMigrationPrerequisiteError [ERROR]
                ├── no markRunning and no filesystem mutation
                └── resolver returns success=false/message; migration=null
```

### Registry Error Path

```text
[ERROR] AppDataMigrationRegistry.constructor(definitions)
└── validateDefinitionTopology()
    └── reject duplicate ID, duplicate prerequisite, self/unknown prerequisite, or prerequisite after dependent
```

### Coverage

- Primary: `Covered`; Fallback/independent continuation: `Covered`; Error/manual: `Covered`.
- Verification matrix: both admitted statuses execute exactly once; all three blocked statuses execute zero times and preserve dependent attempts.

## UC-MIG-007 — Current V1 Task-Team Token Evidence

### Goal

Build canonical token mappings from validated V1 state without invoking predecessor normalization.

### Primary Runtime Call Stack

```text
[ENTRY] buildTokenUsageTaskTeamRunIndex(memoryDir, classifier)
└── classifier.classifyRoot(rootId) -> CURRENT_V1(package)
    └── deriveCurrentV1Entries(package)
        ├── package.taskRecords.records[]
        ├── package.index.getTaskExecution(record.taskExecution)
        ├── package.index.listTeamAncestorsDeepestFirst(taskTeamRunId)
        ├── reverse + filter executionKind="task" -> ordered taskTeamRunIds
        ├── indexed task team address -> teamAddress
        └── add mapping(taskTeamRunId, rootId, chain, address, taskId)
            └── existing duplicate/conflict/ancestor validation
```

### Error Path

```text
[ERROR] duplicate/conflicting mapping or invalid ancestry
buildTokenUsageTaskTeamRunIndex -> issues[]
└── TokenUsageCanonicalExecutionAddressMigrator.migrate()
    └── return FAILED details before store.listRows/apply transaction
```

### Coverage

- Primary: `Covered`; Fallback: `N/A`; Error: `Covered`.

## UC-MIG-008 — Interrupted Promotion Protected-Source Recovery

### Goal

Recover an old V1 attempt that published target files but crashed before moving authoritative predecessor metadata, without parsing or overwriting live V1 targets.

### Preconditions

- `team_run_metadata.json` remains in the root, so classification is `PREDECESSOR`.
- A live V1 execution-tree target exists.
- The V1 backup tree contains a matching protected manifest and predecessor task/message evidence.

### Primary Runtime Call Stack

```text
[ENTRY] TeamCanonicalIdentityMigration.execute()
├── TeamRunMigrationStateClassifier.classifyRoot(rootId)
│   └── metadata regular file exists -> PREDECESSOR # target presence does not override authority
├── TeamRunPredecessorSourceResolver.resolve(rootId, rootDir) [IO]
│   ├── detect live team_run_execution_tree.json
│   ├── list V1 backup attempts newest-first
│   ├── validate manifest migrationId/rootTeamRunId/sourceRootDir
│   └── return PROTECTED_V1_BACKUP task/message paths [STATE]
├── preflight all cohort states and predecessor sources # no writes before this completes
├── canonical metadata converter reads live metadata [IO]
├── canonical task validation reads protected task source [IO]
│   └── require conversion/normalization to be byte-equivalent; protected file is never rewritten
└── token task-Team index reads the same protected task source [IO]
    └── canonical token transaction succeeds

[ENTRY] TeamRunExecutionTreeV1AppDataMigration.execute()
├── runner prerequisite admission -> canonical SUCCEEDED
├── classifier -> PREDECESSOR
├── TeamRunPredecessorSourceResolver.resolve(...) -> same protected paths
├── planPredecessorTeamRunV1Package(protected paths)
└── TeamRunV1PackagePromoter.promote(...)
    ├── stage and validate the complete V1 package [IO]
    └── move authoritative metadata to the new protected attempt [IO]
```

### Fallback / Error Paths

```text
[FALLBACK] no V1 execution-tree target exists
resolver -> LIVE task/message paths # ordinary predecessor path

[ERROR] target exists but no matching usable protected backup
resolver -> exact root/backup failure
└── cohort preflight fails before canonical or V1 writes
```

### State And Verification

- Live V1 targets and old protected backups are unchanged during canonical recovery.
- V1 promotion alone publishes the final validated targets and retires metadata.
- Primary: `Covered`; Fallback: `Covered`; Error: `Covered`.

## UC-MIG-009 — Released Communication-Address Retry After Terminal Prerequisites

### Goal

Converge otherwise-valid predecessor roots whose communication projections contain the released segment-based address representation, without rerunning terminal migrations, independently rewriting predecessor communication files, or admitting multiple runtime schemas.

### Preconditions

- `20260701_team_communication_projection_addresses` is persisted `SUCCEEDED`; its attempt count must remain unchanged.
- `20260801_team_canonical_identity` is persisted `SUCCEEDED`; its attempt count must remain unchanged.
- `20260814_team_run_execution_tree_v1` is persisted `FAILED` and therefore retryable.
- At least one classified predecessor root has valid metadata/task/physical-run evidence plus `team_communication_messages.json` rows whose sender/receiver addresses use released `segments` evidence.

### Primary Runtime Call Stack — Failed V1 Retry With Released Segments

```text
[ENTRY] src/server-runtime.ts:startConfiguredServer(options)
└── src/app-data-migrations/app-data-migration-runner.ts:runPending() [ASYNC]
    ├── repository:getRecord(20260701) -> SUCCEEDED [IO]
    │   └── return persisted snapshot # no markRunning/execute; attempts unchanged
    ├── repository:getRecord(20260801) -> SUCCEEDED [IO]
    │   └── return persisted snapshot # no markRunning/execute; attempts unchanged
    └── runDefinition(20260814)
        ├── assertPrerequisites(v1)
        │   └── repository:getRecord(20260801) -> SUCCEEDED [IO]
        ├── repository:markRunning(20260814) [IO] # retry failed record
        └── team-run-execution-tree-v1-app-data-migration.ts:execute() [ASYNC]
            ├── TeamRunMigrationStateClassifier.listAndClassifyRoots() [IO]
            ├── TeamRunPredecessorSourceResolver.resolve(all PREDECESSOR roots) [IO]
            ├── predecessor-team-run-planner.ts:planPredecessorTeamRunV1Package(each root)
            │   ├── build initial execution tree + physical/token evidence index [STATE]
            │   └── predecessor-task-package-converter.ts:convertPredecessorPackage(...)
            │       └── for each communication row and [senderAddress, receiverAddress]
            │           └── team-execution-address-normalizer.ts:normalizePredecessorTeamExecutionAddress(value, rootTeamRunId, label)
            │               ├── exact four-field parse -> not exact [FALLBACK]
            │               ├── read released address.segments[]
            │               ├── member segment -> validate memberPath/memberRouteKey agreement -> canonical memberAddress
            │               ├── ordered task_team segments -> taskTeamRunIds[]
            │               ├── optional single task_agent segment -> taskAgentRunId
            │               └── createTeamExecutionAddress({rootTeamRunId, ...}) [STATE]
            │           ├── TeamExecutionIndex:resolveAgentRunId(senderAddress) -> senderAgentRunId
            │           ├── TeamExecutionIndex:resolveAgentRunId(receiverAddress) -> receiverAgentRunId
            │           └── emit current TeamCommunicationMessageV1 # no address object persisted
            ├── validate every planned V1 package and complete cohort [STATE]
            ├── TeamRunV1PackagePromoter.promote(each plan) [IO]
            │   └── existing staged write/protected backup/rename semantics
            └── repository:complete(20260814, SUCCEEDED) [IO]
```

### Exact-Address Fallback / No-op Input

```text
[FALLBACK] communication side already has exactly rootTeamRunId/taskTeamRunIds/memberAddress/taskAgentRunId
normalizePredecessorTeamExecutionAddress(value, expectedRootTeamRunId, label)
├── parse exact TeamExecutionAddress
├── assert root matches expected root
└── recreate/return exact address [STATE]
    # predecessor source file is not independently rewritten; V1 output still stores resolved AgentRun IDs only
```

### Malformed / Ambiguous / Root-Mismatched Error Path

```text
[ERROR] released evidence has no member segment, multiple member/task-Agent segments, unsupported/invalid segments, contradictory member path/route, or exact address for another root
normalizePredecessorTeamExecutionAddress(...)
└── throw contextual error(rootId, messages[index], senderAddress|receiverAddress, reason)
    └── V1 cohort planning records failed root detail
        ├── promoter is never called for any plan in the cohort
        ├── predecessor bytes and existing protected backups remain unchanged
        └── repository:complete(20260814, FAILED) [IO]
```

### Idempotent Second Startup

```text
[FALLBACK] next startup after successful retry
AppDataMigrationRunner.runPending()
├── 20260701 -> SUCCEEDED snapshot, unchanged attempts
├── 20260801 -> SUCCEEDED snapshot, unchanged attempts
└── 20260814 -> SUCCEEDED snapshot, unchanged attempts
    # no classifier, normalizer, planner, promoter, backup, or rewrite call
```

### State And Data Transformations

- Released `{segments:[member, task_team*, task_agent?]}` evidence -> existing exact `TeamExecutionAddress` domain type.
- Exact address -> validated same exact domain type.
- Exact address + planned execution tree -> current sender/receiver AgentRun IDs.
- Current AgentRun IDs -> V1 communication message; the predecessor address object is not copied into current storage.

### Shared-Owner Consumer Traces

```text
[ENTRY] 20260801 canonical predecessor task/update conversion
team-canonical-structured-file-converter.ts:convertTaskDelegationFile(...)
└── for task sender/receiver, taskRun.address, and update sender/receiver
    └── normalizePredecessorTeamExecutionAddress(storedAddress, teamRunId, label)
        └── exact/segments -> exact expected-root TeamExecutionAddress

[ENTRY] 20260701 older communication projection conversion for a not-yet-terminal installation
team-communication-projection-address-migration.ts:convertMessage(...)
├── stored senderAddress/receiverAddress exists
│   └── normalizePredecessorTeamExecutionAddress(storedAddress, rootTeamRunId, label)
│       └── exact/segments -> exact expected-root TeamExecutionAddress
└── stored address absent [FALLBACK]
    ├── adapt projection-only sender/receiver member path, route key, and task-Agent fields locally
    ├── reject contradictory path/route or missing member identity
    └── normalizePredecessorTeamExecutionAddress(adaptedSegments, rootTeamRunId, label)
        # no general normalizer dependency on a projection row/envelope
```

- The canonical consumer preserves the existing exact/segment conversion responsibility while removing its private duplicate.
- The older migration preserves its envelope, timestamp, reference-file, and flat-field responsibilities; only exact/segment address validation is shared.
- A persisted `SUCCEEDED` 20260701 record is still skipped by the runner, so these reuse traces do not pretend to repair already-terminal user data.

### Observability And Debug Points

- Migration record logs distinguish terminal prerequisite skips from the failed V1 retry.
- Per-root failure includes root ID, communication row index, sender/receiver side, and normalization reason, but not message content.
- Per-root success remains recorded by the existing V1 detail/promoter log and protected backup path.

### Coverage

- Primary released-segment path: `Covered`.
- Exact-address fallback/no-op input: `Covered`.
- Malformed/ambiguous/root-mismatch error: `Covered`.
- Terminal prerequisite attempts + successful retry + second-start inventory idempotency: `Covered`.
- Runtime compatibility branch: `No`; cyclic dependency: `No`; naming drift: `No`.

## UC-MIG-010 — Validated V1 Team History-Index Discoverability

### Spine Context

- Spine IDs: `DS-MIG-009`, `DS-MIG-010`
- Spine scope: primary startup-to-sidebar path plus the bounded local projection/commit flow inside the existing V1 migration.
- Governing owner: `TeamRunExecutionTreeV1AppDataMigration`; `TeamRunHistoryIndexReconciler` owns only projection/commit policy.
- Why it matters: a valid V1 package is not user-visible history until the persisted Team history index admits it.

### Goal

Make every complete validated current or successfully promoted V1 Team run discoverable through the unchanged Team/workspace history APIs without admitting invalid roots or creating standalone Agent rows.

### Preconditions

- `20260814_team_run_execution_tree_v1` is admitted by the migration runner.
- The migration's validated tree map contains all already-current V1 roots and all successfully promoted roots from this attempt.
- The existing Team history index is missing, valid, or valid-but-incomplete. Malformed/unreadable input is an error, not an empty index.

### Primary Runtime Call Stack — Reconcile And Expose

```text
[ENTRY] src/app-data-migrations/app-data-migration-runner.ts:runPendingMigrations(...)
└── src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.ts:execute(...)
    ├── classify/validate/promote roots already traced by UC-MIG-001..009 [ASYNC] [IO]
    ├── [STATE] validatedTrees.set(rootTeamRunId, executionTree) for current/promoted roots
    └── src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-history-index-reconciler.ts:reconcile(validatedTrees) [ASYNC]
        ├── src/run-history/store/team-run-history-index-store.ts:readIndexStrict() [IO]
        │   └── return immutable { rows, sourceExists, sourcePath } # sourcePath remains store-owned
        ├── key snapshot.rows by exact teamRunId [STATE]
        ├── for each validated tree, deterministic root-ID order
        │   ├── recoverCoordinatorSummaryBestEffort(tree) [IO] [FALLBACK]
        │   └── src/run-history/services/team-run-history-index-row-projector.ts:projectTeamRunHistoryIndexRow(...) [STATE]
        ├── sort projected rows by createdAt descending, then teamRunId [STATE]
        ├── compare normalized projected rows with snapshot.rows
        ├── if changed && snapshot.sourceExists
        │   └── copy snapshot.sourcePath + manifest to backupRoot/team-history-index/<token>/ and sync [IO]
        └── src/run-history/store/team-run-history-index-store.ts:writeIndex(projectedRows) [ASYNC] [IO] # atomic rename commit
```

```text
# normal restart/catalog-rebuild boundary after migration success
src/run-history/services/team-run-v1-package-catalog.ts:rebuild(...)
└── src/run-history/services/team-run-history-catalog-service.ts:listHistory(...)
    ├── src/run-history/store/team-run-history-index-store.ts:readIndex() [IO]
    └── admit rows whose V1 packages are current and valid
        └── src/run-history/services/team-run-history-service.ts:listTeamRunHistory(...)
            └── src/run-history/services/workspace-run-history-service.ts:getWorkspaceRunHistory(...)
                └── GraphQL workspaceRunHistory resolver -> Electron workspace sidebar
```

### Partial-Cohort Fallback

```text
[FALLBACK] one unrelated predecessor root is invalid/unresolved
team-run-execution-tree-v1-app-data-migration.ts:execute(...)
├── record contextual root failure; do not add that root to validatedTrees
├── continue classifying/promoting independent roots
└── team-run-history-index-reconciler.ts:reconcile(validatedTrees)
    └── project every valid root and no invalid/unresolved root
```

The migration attempt remains failed/retryable when any root failed, but valid packages and their history rows are atomically usable on the next normal catalog rebuild.

### Preservation And Summary Fallback

```text
[FALLBACK] existing row has summary/terminatedAt
projectTeamRunHistoryIndexRow({ tree, existingRow, recoveredSummary })
├── tree owns team identity, canonical workspace, createdAt, archivedAt
└── existing row preserves valid summary and terminatedAt

[FALLBACK] summary is absent/empty
recoverCoordinatorSummaryBestEffort(tree)
├── attempt current coordinator raw-trace summary [IO]
└── missing/malformed/unreadable trace -> diagnostic + "" # never hides the valid run
```

### Error And Atomicity Paths

```text
[ERROR] malformed/unreadable existing index
TeamRunHistoryIndexStore.readIndexStrict()
├── missing -> immutable { rows: [], sourceExists: false, sourcePath: canonicalStorePath }
└── malformed/unreadable -> throw contextual reconciliation error before backup/write
    └── migration records team-history-index failure and remains retryable

[ERROR] backup or atomic write fails
TeamRunHistoryIndexReconciler.reconcile(...)
└── surface contextual failure; pre-commit index bytes remain authoritative
```

```text
[FALLBACK] normalized projection equals current strict index
TeamRunHistoryIndexReconciler.reconcile(...)
└── return SKIPPED; no backup and no write [STATE]
```

### State And Data Transformations

- `Map<rootTeamRunId, TeamRunExecutionTree>` -> exactly one current Team history row per validated key.
- `TeamRunHistoryIndexStore` -> one immutable strict snapshot; the reconciler never recomputes the index path or performs a second existence probe.
- Tree-authoritative overlap: `teamRunId`, Team definition identity/name, canonical workspace root, `createdAt`, `archivedAt`.
- Index-only preservation: valid existing `summary`, `terminatedAt`; recovered summary is used only when existing summary is empty.
- No transformation writes `run_history_index.json`; Team-member runs remain reachable only through the Team package.

### Observability And Debug Points

- Reconciliation result records validated root count, projected row count, changed/skipped state, backup path when any, and one contextual `team-history-index` failure detail on error.
- Logs never include message/trace content.
- Stage 7 verifies the operational-equivalent eight-row projection, five exact-superrepo workspace rows, GraphQL visibility, failure atomicity, partial cohort, and second-run no-op.

### Coverage

- Primary: `Covered`
- Fallback: `Covered`
- Error: `Covered`
- Legacy/backward-compatible runtime branch: `No`
- Ownership/dependency/file-placement drift: `No`

## UC-PKG-001 — Build Input Outside Production Graph

### Goal

Keep the contracts package resolvable by Nuxt while excluding it from Electron production Node modules.

### Primary Runtime Call Stack

```text
[ENTRY] pnpm install --frozen-lockfile
├── pnpm-lock.yaml importer autobyteus-web.devDependencies
└── node_modules/@autobyteus/team-stream-contracts workspace link available [IO]

[ENTRY] autobyteus-web/scripts/guard-web-boundary.mjs
├── read package.json [IO]
├── assert contracts absent from dependencies
├── assert contracts present in devDependencies
└── scan electron/build/scripts runtime sources for forbidden contract imports [IO]

[ENTRY] pnpm generate:electron
└── Nuxt/Vite resolves and bundles renderer runtime schema imports from devDependency
```

### Error Path

```text
[ERROR] contracts package in dependencies or Electron runtime source imports it
guard-web-boundary.mjs:fail(...) -> exit 1 before prepare-server/build
```

### Coverage

- Primary: `Covered`; Fallback: `N/A`; Error: `Covered`.

## UC-PKG-002 — Canonical Linux x64 Build

### Goal

Produce the personal x64 AppImage with ordinary workspace links unchanged.

### Primary Runtime Call Stack

```text
[ENTRY] CI=true NO_TIMESTAMP=1 CSC_IDENTITY_AUTO_DISCOVERY=false AUTOBYTEUS_BUILD_FLAVOR=personal corepack pnpm -C autobyteus-web build:electron:linux:x64
├── package.json:guard:web-boundary
├── package.json:guard:localization-boundary
├── package.json:audit:localization-literals
├── scripts/prepare-server-dispatch.mjs [ASYNC]
│   └── scripts/prepare-server.sh / prepare-server.mjs
│       ├── stageRuntimeBundle() [IO]
│       ├── packWorkspaceDependencies(server manifest) [IO]
│       ├── installPortableRuntimeDependencies() [IO]
│       └── assertNoSymlinks(resources/server/node_modules)
├── package.json:generate:electron # Nuxt assets
├── package.json:transpile-electron
├── tsc -p build/tsconfig.json
└── build/dist/build.js --linux --x64
    └── build/scripts/build.ts:main()
        ├── verify required server files/notices [IO]
        └── electron-builder:build(buildConfig) [ASYNC]
            ├── discover package.json production dependencies
            │   # contracts package absent; external workspace link not traversed
            ├── create ASAR/resources/update metadata
            └── emit AutoByteus_personal_linux-x64-<version>.AppImage [IO]
```

### Error / Invariant Paths

```text
[ERROR] any external-link production dependency violates app root
electron-builder fails build # durable guard should make contracts recurrence fail earlier

[STATE] before/after readlink snapshot
└── contracts workspace link target identical; no delete/dereference/restore operation
```

### Coverage

- Primary: `Covered`; Fallback: `N/A`; Error: `Covered`.

## UC-PKG-003 — Packaged Server Lifecycle

### Goal

Prove the AppImage still starts its embedded server against disposable data, becomes healthy, and shuts down cleanly.

### Primary Runtime Call Stack

```text
[ENTRY] produced AppImage
└── electron/server/baseServerManager.ts:startServer()
    ├── validateServerEnvironment(resources/server) [IO]
    ├── electron/server/linuxServerManager.ts:launchServerProcess()
    │   └── spawn(process.execPath, resources/server/dist/app.js, --data-dir disposableDir) [ASYNC]
    │       └── server-runtime.ts:startConfiguredServer(options)
    │           ├── startup/migrations.ts:runMigrations(...) [IO]
    │           ├── initializePrisma(...) [IO]
    │           ├── AppDataMigrationRunner.runPending() [IO]
    │           ├── TeamRunV1PackageCatalog.rebuild() [IO]
    │           └── app.listen(...) [ASYNC]
    └── baseServerManager.ts:waitForServerReady()
        └── checkServerHealth() -> GET /rest/health -> 200 {status:"ok"} [IO]

[ENTRY] BaseServerManager.stopServer()
└── child SIGTERM
    └── server-runtime.ts:shutdown("SIGTERM")
        └── app.close() -> shutdownPrisma() -> process exit 0
```

### Error Path

```text
[ERROR] missing server resource, migration failure, or health timeout
BaseServerManager.startServer() -> emit error + reject
# artifact validation fails and retains logs/disposable data for diagnosis
```

### Coverage

- Primary: `Covered`; Fallback: graceful-to-force kill exists but is not expected; Error: `Covered`.

## UC-TEST-001 — Durable Migration Fixtures

### Goal

Keep migration tests independent of ticket lifecycle and private operational data.

### Primary Runtime Call Stack

```text
[ENTRY] vitest migration suites
├── tests/fixtures/app-data-migrations/team-run-execution-tree-v1/... [IO]
├── tests:createDisposableEnvironment()
├── copy fixture into temp memory/agent_teams [IO]
├── execute classifier/runner/canonical/V1 against in-memory repo + disposable DB/files
├── compare byte/path/backup/attempt inventory [IO]
└── remove disposable environment [IO]
```

### Error Path

```text
[ERROR] repository audit
rg ticket-path references under autobyteus-server-ts/tests
└── any tickets/(in-progress|done) match fails AC-TEST-001
```

### Coverage

- Primary: `Covered`; Fallback: `N/A`; Error: `Covered`.

## Cross-Use-Case State Boundaries

| State | Authority | Reads | Writes |
| --- | --- | --- | --- |
| Migration status/attempts | Migration record repository | Runner | Runner only after admission |
| Team root classification | Migration classifier | Filesystem/current validators | None |
| Predecessor source selection | V1 recovery resolver | Live paths + validated V1 backup manifests | None |
| Predecessor execution-address evidence | Migration execution-address normalizer | Exact/released values supplied by canonical, older projection, or V1 converters | None; normalized in memory only |
| Canonical predecessor files | Canonical migration | Classified predecessor paths | Atomic backup/replace |
| V1 package | V1 promoter/validator | Classified predecessor/current package | Staged promote + protected backup |
| Team history projection | V1 history reconciler | Validated V1 tree map + immutable store-owned strict index snapshot + optional coordinator trace | Exact validated-root projection; snapshot-driven protected backup + atomic index commit only when changed |
| Token identities | Token migration store | State-aware task-Team index + rows | One transaction |
| Web dependency class | `autobyteus-web/package.json` + lockfile | pnpm/Nuxt/Electron Builder | Package maintenance only |
| Packaged server data | Disposable Stage 7 directory | Packaged runtime | Disposable only |

## Observability And Debug Points

- Runner: definition ID, prerequisite ID/status, attempt count, terminal status.
- Classifier: root ID, chosen state, evidence path, invalid reason; never private file contents.
- Predecessor resolver: root ID, `LIVE`/`PROTECTED_V1_BACKUP` provenance, validated backup directory; never file contents.
- Migration execution-address normalizer: expected root ID, caller label, admitted evidence kind (`EXACT`/`RELEASED_SEGMENTS`), and precise structural error; never message content.
- Migration logs: per-root migrated/skipped/failed details and backup paths.
- Team history reconciliation: validated/projected counts, changed/skipped result, protected index backup path, and contextual failure without trace contents.
- Packaging: production dependency list, pre/post link target, canonical build log, emitted artifact path.
- Artifact runtime: embedded server stdout/stderr, migration log paths, health result, shutdown exit.

## Design-Smell Check

- Backward compatibility or runtime dual path: `No`.
- Authoritative-boundary bypass: `No`; runner alone owns prerequisite admission.
- Bidirectional/cyclic dependency: `No`.
- Generic filesystem helper owning business semantics: `No`; classifier is TeamRun migration-owned.
- Multiple missing-metadata interpretations: `No`.
- Packaging workaround or link mutation: `No`.
- Terminal migration rerun/new migration ID/runtime address fallback: `No`; failed/unreleased V1 planning owns the transition.
- Duplicate migration address parser: `No`; exact/segment rules have one owner, while projection-flat adaptation remains with its envelope owner.
- Runtime package scan/history fallback: `No`; the existing V1 migration owns the persisted cutover and runtime remains index-driven.
- Standalone Team-member history duplication: `No`; reconciliation writes only the Team history index.
- Unmapped use case or requirement: `No`.

## Open Questions

- None blocking Stage 5 review.
