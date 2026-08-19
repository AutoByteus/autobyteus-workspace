# Investigation Notes

## Status

Stage 1 investigation is current through the `UV-002` Stage 10 user-verification finding. Stage 2 requirements re-entry is active.

## Investigation Goals

1. Determine why `20260801_team_canonical_identity` treats existing Agent Team directories as fatal and why retries become worse after the first failed startup.
2. Determine whether the failure is database corruption, operational-data shape, or branch code behavior.
3. Identify the correct migration dependency and retry boundary without broadly ignoring filesystem errors.
4. Determine why the canonical Linux Electron build fails after successful server/web preparation.
5. Identify the packaging owner that can remove the workaround without mutating workspace links.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `requirements.md` | Approved/refined behavioral authority | Use cases, requirements, acceptance criteria, constraints, and out-of-scope boundaries | Core requirements | All | Current / Refined | User approved; current | No |
| `proposed-design.md` | Canonical target design | Spines, ownership, migration transition, file mapping, removal, and refactor posture | Core design | All | v8 current; `F-006` corrected | Technical design; re-entry active | Stage 4 regeneration |
| `future-state-runtime-call-stack.md` | Supplemental runtime trace | Primary/fallback/error paths, mutation barriers, and idempotency | Requirements and design | All; especially `R/AC-MIG-011`–`020` | v7 historical; Stage 4 reopened after `F-006` | Context/evidence; `N/A` | Regenerate strict-snapshot frames as v8 |
| `workflow-state.md` | Workflow authority | Bootstrap/base, stage gates, edit lock, re-entry, and transition log | All core artifacts | All | Current | Process context; `N/A` | Continue append-only updates |
| `implementation.md` | Implementation planning/progress supplement | Existing completed work, planned address-normalizer work, test strategy, and downstream state | Design | All | Paused/source locked | Downstream plan; `N/A` | Refresh after review pass |
| `solution-revision-record.md` | Solution revision chronology | `SR-001` baseline plus each solution re-entry delta | Requirements/investigation/design/supplements | All | `SR-005` current | Solution navigation; `N/A` | Append future solution revisions |
| `design-review-report.md` | Canonical architecture verdict | Template-based structural review and current findings | Design | All | Architecture round 6 Fail on `F-006`; v8 correction pending verification | Review evidence; `N/A` | Re-review after runtime v8 |
| `architecture-review-revision-record.md` | Architecture review chronology | `ARCH-REV-*` decisions and finding resolution | Design review | All | Current | Review evidence; `N/A` | Append next review |
| `future-state-runtime-call-stack-review.md` | Workflow deep-review chronology | Review rounds, clean-streak gate, and use-case sweeps | Design/runtime | All | Round 13 No-Go; clean streak zero after `F-006` | Review evidence; `N/A` | Restart clean rounds after runtime v8 |
| `api-e2e-*.md`, `code-review*.md`, `docs-sync.md`, `handoff-summary.md`, `release-deployment-report.md`, `delivery-revision-record.md` | Downstream evidence from the pre-`UV-001` candidate | Prior validation/review/delivery findings retained as re-entry context, not current approval | Implementation and delivery | All | Revalidation required | Historical downstream context; `N/A` | Refresh only after implementation changes |

## Design Health Assessment Evidence

- Change posture: `Bug Fix` with a bounded ownership refactor and packaging dependency correction.
- Candidate root cause classification: `Duplicated Policy Or Coordination` for execution-address conversion, plus `Missing Invariant` / `Boundary Or Ownership Issue` for migration prerequisite/state admission; packaging is a `Local Implementation Defect` in dependency classification.
- Refactor posture: `Required now` for the migration-only exact/segment converter because canonical and the older projection migration currently duplicate policy and failed V1 needs the same semantics. The refactor remains bounded to migration code; current runtime schemas and services are unchanged.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `team-canonical-structured-file-converter.ts` | Existing `convertLegacyConversationAddress` already owns exact/segment conversion. | Reuse/extract this capability instead of creating a communication-only duplicate. | Implement after review pass. |
| `team-communication-projection-address-migration.ts` | Duplicates stored exact/segment parsing and separately owns projection-only flat fields. | Share only the coherent address-value core; retain flat envelope adaptation locally. | Regression-test both branches. |
| V1 predecessor converter + operational log | Strict exact parsing blocks released segment evidence after terminal prerequisites. | Failed/unreleased V1 planning must consume the shared migration normalizer before AgentRun resolution. | Add operational-equivalent retry coverage. |

## Scope Triage

`Medium`.

Rationale: there are two bounded defects, but the migration fix crosses runner orchestration, filesystem state classification, predecessor/current schema boundaries, token identity indexing, and integration fixtures. The packaging fix crosses the web package manifest, pnpm lockfile, Electron Builder's production dependency discovery, and full AppImage validation. No public API or UI behavior changes are expected.

## Branch / Bootstrap Evidence

- Ticket worktree: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-electron-migration-packaging-recovery`
- Ticket branch: `codex/electron-migration-packaging-recovery`
- Requested base: `origin/codex/agent-team-universal-task-delegation`
- Base commit after fetch: `840fa0d2443f624a36a507905540164f80c7640e`
- Latest `origin/personal`: `acb8985930ccce49b632cdca22b92f5b237e35bf`
- `git rev-list --left-right --count origin/personal...HEAD`: `0 118`; `origin/personal` is the merge base.
- Neither failing migration exists on `origin/personal`.
- `origin/personal` also does not list `@autobyteus/team-stream-contracts` in `autobyteus-web/package.json`.
- Canonical migration introduced by `3927e878db0318138b6e39ad7cea1b032584e08f` (`refactor: adopt canonical rooted AgentTeam identity`, 2026-08-05).
- V1 migration introduced by `3f3aafa7cfacdc1cfadd497882bf52aab0fac9e9` (`chore(delivery): checkpoint reviewed universal delegation package`, 2026-08-15).
- Web Team stream dependency introduced by `57ab99fcc410f75b535e3c07ad54182455547683` (`refactor(team): close execution projection boundaries`, 2026-08-11).

Conclusion: both defects are activated by branch-only changes. They are not pre-existing `origin/personal` migration or packaging behavior.

## Migration Investigation

### Runtime Entry And Execution Spine

1. `autobyteus-server-ts/src/server-runtime.ts:startConfiguredServer(...)`
2. Database/Prisma initialization completes successfully.
3. `AppDataMigrationRunner.runPending()` iterates required definitions in registry order.
4. `TeamCanonicalIdentityMigration.execute()` scans every directory under `memory/agent_teams`.
5. `TeamRunExecutionTreeV1AppDataMigration.execute()` currently runs later even when canonical identity failed.
6. `TeamRunV1PackageCatalog.rebuild()` admits valid V1 packages and excludes predecessor/incomplete roots.
7. Startup explicitly checks canonical identity and halts when its status is not `SUCCEEDED`.

Primary owner: `AppDataMigrationRunner` owns startup execution sequencing and attempt creation. Individual migration definitions own their bounded data conversion. No owner currently expresses inter-migration prerequisites.

### Current Source Findings

#### Generic runner and registry

- `autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-types.ts`
  - `AppDataMigrationDefinition` has identity, display metadata, `requiredOnStartup`, and `execute()` only.
  - There is no prerequisite/dependency field.
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
  - Registry order places canonical identity immediately before execution-tree V1.
  - Order is implicit; it does not state that V1 requires canonical identity success.
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts:runPending()`
  - Continues through every required definition after a failed result or thrown execution.
  - The runner creates a `RUNNING` record/attempt before executing each definition.
  - Existing behavior deliberately allows independent migrations to continue; global fail-fast would be a behavioral regression.
- `autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts`
  - Baseline test explicitly expects `m-fail`, `m-success`, and `m-throws` all to execute.
  - Therefore the correct model is dependency-aware continuation: block dependents, continue independent definitions.

#### Canonical identity migration

- `autobyteus-server-ts/src/app-data-migrations/migrations/team-canonical-identity-migration.ts`
  - `execute()` enumerates every child directory under `memory/agent_teams`.
  - `migrateTeamFiles()` unconditionally treats `team_run_metadata.json` as required.
  - Missing task records are optional, but missing metadata always produces `FAILED`.
  - There is no directory-state classification before conversion.
  - Any metadata/task failure suppresses global token migration.
  - The converter itself is atomic per file (backup + staged file + rename), but the aggregate is not cohort-transactional.

#### Predecessor-only token task index

- `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-task-team-run-index.ts`
  - Scans `task_delegation_records.json` in every Team root.
  - Always calls `normalizePredecessorTaskDelegationRecordsFile(...)`.
  - A valid V1 file uses `rootTeamRunId`, not predecessor `teamRunId`, so the index rejects a valid current file with `teamRunId is required`.
- `autobyteus-server-ts/src/app-data-migrations/predecessor-task-delegation-records.ts`
  - Correctly documents itself as historical-shape admission used only by predecessor migrations.
  - The bug is using it without first proving the root is a predecessor root.
- `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-canonical-execution-address-planner.ts`
  - Can convert ordinary legacy root member addresses without task mappings.
  - Needs a task-Team index only when reconstructing task-Team ancestry.

#### V1 migration and partial promotion

- `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.ts`
  - If predecessor metadata is absent, it privately attempts to validate a complete V1 package.
  - If current validation fails, it broadly labels any remaining state `Ignored non-predecessor incomplete TeamRun residue`.
  - If predecessor metadata remains while target files exist, it resolves predecessor task/message sources from protected backups.
- `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-v1-package-promoter.ts`
  - Writes and validates staged V1 files, renames all three into place, then moves predecessor metadata into the protected backup.
  - Consequently, missing metadata plus three valid target files is a positive, durable current-state marker.
- `autobyteus-server-ts/src/run-history/services/team-run-v1-package-catalog.ts`
  - Treats remaining metadata as predecessor/pending and otherwise validates V1 through the current package loader.
  - This is runtime admission, not a reusable migration filesystem classifier.

### Operational Data Evidence (Read-Only)

Operational root inspected without mutation:

`/home/ryan-ai/.autobyteus/server-data/memory/agent_teams`

Observed 12 directories:

- 6 remaining predecessor roots: metadata present, no execution tree.
- 2 complete V1 roots: no metadata; all three V1 files present.
  - `classroomsimulation_399c01bef4974c5ea783ab6e2e9b5a55`
  - `software_engineering_team_115da06d59d44ca3861340471485621b`
- 4 historical manifest-only roots: no metadata, no V1 files, but a valid `team_run_manifest.json` and per-member `run_manifest.json` files.
  - `team_class-room-simulation_2676c8e2`
  - `team_class-room-simulation_a0f74a93`
  - `team_class-room-simulation_bd4a9bf6`
  - `team_class-room-simulation_c5bfa307`

Each historical Team manifest has these top-level keys:

`coordinatorMemberRouteKey`, `createdAt`, `memberBindings`, `runVersion`, `teamDefinitionId`, `teamDefinitionName`, `teamRunId`, `updatedAt`, `workspaceRootPath`.

All four have `runVersion: 1`, a `teamRunId` matching the containing directory, a coordinator route, and two member bindings. This positively distinguishes historical residue from an arbitrary empty/incomplete directory.

The two current V1 task files validate as schema V1 and contain zero task records. No predecessor task backup exists for them because there was no source task file. Canonical token recovery therefore only needs to avoid parsing their V1 task files; no task-Team mapping is required for the observed cohort.

### Persisted Migration Records

Read-only SQLite query against:

`/home/ryan-ai/.autobyteus/server-data/db/production.db`

Result:

- `20260801_team_canonical_identity | FAILED | attempts=2 | 9 required items failed`
- `20260814_team_run_execution_tree_v1 | FAILED | attempts=2 | 7 items unresolved`

### First And Second Attempt Evidence

Canonical attempt 1 log:

`/home/ryan-ai/.autobyteus/server-data/logs/app-data-migrations/20260801_team_canonical_identity-2026-08-16T07-09-43-207Z.log`

- Summary: scanned 15, migrated 10, skipped 0, failed 5.
- Four failures are `ENOENT` for metadata in the historical manifest-only roots.
- Fifth failure is the intentionally suppressed token conversion dependency.

V1 attempt 1 log:

`/home/ryan-ai/.autobyteus/server-data/logs/app-data-migrations/20260814_team_run_execution_tree_v1-2026-08-16T07-09-43-419Z.log`

- Ran despite the canonical failure.
- Promoted two valid roots to V1.
- Remaining roots failed primarily because token rows still held pre-canonical execution addresses.
- Historical manifest-only roots were skipped.

Canonical attempt 2 log:

`/home/ryan-ai/.autobyteus/server-data/logs/app-data-migrations/20260801_team_canonical_identity-2026-08-16T07-24-29-161Z.log`

- Summary worsened to scanned 17, migrated 0, skipped 8, failed 9.
- The two V1 roots now fail missing metadata and fail predecessor task parsing (`teamRunId is required`).
- The same four historical roots still fail missing metadata.
- Token conversion remains suppressed.

V1 attempt 2 log:

`/home/ryan-ai/.autobyteus/server-data/logs/app-data-migrations/20260814_team_run_execution_tree_v1-2026-08-16T07-24-29-216Z.log`

- Correctly recognizes the two promoted roots as complete V1.
- Remaining failures persist because canonical token conversion never ran.

### Migration Root Cause

The database itself is not the initiating problem. Prisma migrations completed successfully. The root cause is a missing migration state model:

1. Canonical identity assumes every directory is predecessor input.
2. Its token index assumes every task file is predecessor format.
3. The generic runner has ordering but no dependency semantics, so V1 runs after its required canonical prerequisite failed.
4. The V1 migration changes filesystem state, making the next canonical retry see new current-format inputs it cannot classify.

This is a deterministic branch-code defect triggered by a legitimate mixed historical cohort, followed by a partial successor promotion.

### Required Migration Behavior Implications

- Do not make missing metadata universally optional.
- Introduce one read-only migration-owned classifier with four explicit outcomes:
  - predecessor (metadata is authoritative),
  - complete validated V1,
  - positively recognized historical manifest-only residue,
  - invalid/ambiguous.
- Canonical identity and token task indexing must consume that same classification.
- V1 must also use the shared classifier and fail unknown/partial current states instead of broadly calling them residue.
- App-data definitions need explicit prerequisites enforced before `markRunning`, so a blocked dependent does not increment attempts.
- Independent required migrations must continue to run.
- A successful retry must be idempotent: current V1 and recognized residue are skips; remaining predecessor roots and token rows convert; V1 then processes only remaining predecessor roots.

## Electron Packaging Investigation

### Canonical Build Spine

1. `autobyteus-web/package.json:build:electron:linux:x64`
2. guards and localization audit
3. `scripts/prepare-server-dispatch.mjs` -> Linux `scripts/prepare-server.sh`
4. server build/deploy, Prisma generation, mobile build, native rebuild
5. Nuxt Electron generation and Electron/build TypeScript compilation
6. `build/dist/build.js` -> Electron Builder 25.1.8
7. Electron Builder discovers production dependency modules from `autobyteus-web/package.json`
8. ASAR packaging fails while traversing the linked Team stream contracts package.

### Exact Failure Evidence

Prior canonical build command at the same base commit:

```text
CI=true NO_TIMESTAMP=1 CSC_IDENTITY_AUTO_DISCOVERY=false \
AUTOBYTEUS_BUILD_FLAVOR=personal \
corepack pnpm -C autobyteus-web build:electron:linux:x64
```

Evidence:

- `tickets/done/agent-team-universal-task-delegation/delivery-evidence/electron-build-linux-x64-dr008.log`
- `tickets/done/agent-team-universal-task-delegation/delivery-evidence/electron-build-linux-x64-dr008-report.md`

The pipeline reached Electron Builder and failed with:

`autobyteus-team-stream-contracts/LICENSE must be under autobyteus-web/`

The ignored dependency path is:

`autobyteus-web/node_modules/@autobyteus/team-stream-contracts -> ../../../autobyteus-team-stream-contracts`

Its resolved license is outside the Electron app root. A temporary materialized package plus `zod` allowed packaging to finish, proving that content resolution—not application compilation—was the blocker.

### Source / Ownership Findings

- `autobyteus-web/package.json`
  - Lists `@autobyteus/team-stream-contracts: workspace:*` in `dependencies`.
- `pnpm --filter autobyteus list --prod --depth 1`
  - Confirms Electron Builder sees the linked contracts package and transitive `zod` in the production dependency graph.
- `autobyteus-web/build/scripts/build.ts`
  - Packages `dist/**/*` and `package.json`.
  - Electron Builder separately computes production node module file sets; the `files` list does not make a linked production dependency disappear.
- Electron Builder 25.1.8 local source:
  - `app-builder-lib/out/packager.js:getNodeDependencyInfo(...)` creates lazy production dependencies.
  - `app-builder-lib/out/util/appFileCopier.js:computeNodeModuleFileSets(...)` creates file sets for those dependencies.
  - `app-builder-lib/out/util/AppFileWalker.js` resolves links outside the project.
  - `app-builder-lib/out/util/filter.js:getRelativePath(...)` throws for a file outside the app root when it is not under a `node_modules` path.
- No file under `autobyteus-web/electron`, `autobyteus-web/build`, or `autobyteus-web/dist-scripts` imports `@autobyteus/team-stream-contracts`.
- Web services use its runtime schemas and types, but Nuxt bundles those imports into generated web assets before Electron packaging.
- `scripts/prepare-server.sh` removes links only inside `resources/server`; it successfully reported zero remaining external server links. The failing path is the web app's own `node_modules`, so changing embedded-server cleanup would target the wrong boundary.

### Packaging Root Cause

`@autobyteus/team-stream-contracts` is a Nuxt build input but is classified as an Electron application production module. Electron Builder therefore attempts to copy its pnpm workspace link as a runtime Node dependency and reaches a file outside `autobyteus-web`.

The clean owner is the web package dependency classification and its lockfile representation, not migration code, embedded-server staging, or an Electron Builder symlink workaround.

### Required Packaging Behavior Implications

- Reclassify the contracts package as a build/development dependency for the web app while retaining it as a real production dependency of the embedded server, where the staging pipeline already packs workspace dependencies into portable tarballs.
- Add a durable manifest-level packaging test that prevents frontend-only workspace links from re-entering the Electron production dependency graph.
- Validate Nuxt generation/tests to prove runtime schemas are bundled.
- Validate the full canonical AppImage command without link replacement.
- Verify the produced artifact's embedded server startup and migration entry.

## Baseline Test / Environment Evidence

### Setup

Commands:

```text
pnpm install --frozen-lockfile
pnpm -C autobyteus-server-ts exec prisma generate --schema prisma/schema.prisma
```

The first focused Vitest run failed before collection because the clean worktree had no generated Prisma client. After the explicit Prisma generation, test collection was valid.

### Focused Baseline Command

```text
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/app-data-migrations/app-data-migration-runner.test.ts \
  tests/unit/app-data-migrations/team-run-execution-tree-v1-app-data-migration.test.ts \
  tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts \
  tests/unit/app-data-migrations/token-usage-canonical-execution-address-migration.test.ts \
  --no-watch
```

Result after Prisma generation: 16 tests passed, 2 failed.

- Runner: 7/7 pass, confirming continue-after-failure baseline.
- Metadata/canonical integration: 4/4 pass.
- Token canonical migration: 5/5 pass.
- V1 migration: 0/2 because its tests load fixtures from `tickets/in-progress/agent-team-universal-task-delegation`, but that ticket is correctly archived under `tickets/done`.

The V1 fixture path is a durability defect in directly impacted tests. Reusable migration fixtures must be owned under `autobyteus-server-ts/tests/fixtures`, not a time-bound ticket folder. Correcting that test ownership is part of the durable migration validation scope.

## File Placement Findings

| Concern | Current Placement | Assessment / Canonical Owner |
| --- | --- | --- |
| Migration execution sequencing | `src/app-data-migrations/app-data-migration-runner.ts` | Correct owner; add prerequisite enforcement here. |
| Migration definition contract | `src/app-data-migrations/domain/app-data-migration-types.ts` | Correct owner for prerequisite metadata/error type. |
| Team root filesystem state | Duplicated/implicit across canonical and V1 migrations | Missing owner; add a shared migration-owned classifier under `src/app-data-migrations/migrations/`. |
| Canonical file conversion | `team-canonical-identity-migration.ts` | Correct owner after it consumes classification rather than inferring state. |
| Token task-Team evidence | `token-usage-task-team-run-index.ts` | Correct owner; make it state-aware and able to derive current V1 mappings from the validated execution tree. |
| V1 promotion | `team-run-execution-tree-v1/` | Correct owner; replace its private/broad state inference with shared classification. |
| V1 test fixtures | archived ticket folder | Wrong owner; move/copy minimal reusable fixtures into server test fixtures. |
| Web dependency classification | `autobyteus-web/package.json` + root `pnpm-lock.yaml` | Correct packaging owner for the external workspace link. |
| Embedded server symlink cleanup | `autobyteus-web/scripts/prepare-server.*` | Correct for server staging but not the failing web dependency; no packaging fix belongs here. |

## Constraints

- Do not mutate the user's operational app data during development or tests.
- Use synthetic or copied disposable fixture roots and disposable SQLite databases.
- Do not fabricate missing Team metadata.
- Do not broadly swallow `ENOENT`; only positive classification can turn missing predecessor metadata into a skip.
- Do not add runtime legacy readers or dual-format runtime behavior.
- Preserve independent migration continuation while blocking declared dependents.
- Full Electron packaging is expensive; run it after focused implementation checks and retain command/output evidence.

## Open Questions Resolved For Design

- Global fail-fast vs dependency-aware: dependency-aware. Existing runner behavior intentionally continues independent work.
- Historical directory detection: validate the old Team manifest marker and require absence of predecessor/current authority files.
- Already-current V1 detection: require all three files and current package validation.
- Current V1 token task mapping: derive from the validated execution tree when task-Team mappings exist; do not parse V1 task files as predecessor records.
- Packaging boundary: manifest dependency classification, not server staging or manual materialization.

## Remaining Design Choices

1. Exact naming of the definition prerequisite field/error and whether the existing custom-provider prerequisite guard should be migrated to the generic contract in this ticket.
2. Whether the state classifier returns validated package contents directly or a narrower classification plus execution tree. It should avoid repeated reads while staying read-only.
3. Exact minimal server-owned fixture copied from the archived normative scenarios.

## Design Implications Summary

- Two independent data-flow spines are required in the proposed design: startup migration and Electron packaging.
- The migration spine needs one state-classification off-spine concern shared by canonical conversion, token indexing, and V1 promotion.
- The runner remains the authoritative migration sequencing boundary; definitions declare prerequisites but do not query migration records themselves.
- The package manifest remains the authoritative Electron production dependency boundary; build scripts should not patch or materialize web workspace links.

## Stage 10 User-Verification Re-entry Evidence — Released Communication Addresses

### Trigger

The real-data AppImage verification on 2026-08-16 contradicted the synthetic mixed-cohort convergence result. The application could list only the two roots that already had complete V1 packages; four indexed predecessor roots remained unavailable because `20260814_team_run_execution_tree_v1` stayed `FAILED` after three attempts.

### Operational State (Read-only)

- Database: `/home/ryan-ai/.autobyteus/server-data/db/production.db`
- Migration records:
  - `20260701_team_communication_projection_addresses`: `SUCCEEDED`, attempts `1`
  - `20260801_team_canonical_identity`: `SUCCEEDED`, attempts `3`
  - `20260814_team_run_execution_tree_v1`: `FAILED`, attempts `3`, error `4 TeamRun V1 migration item(s) remain unresolved; valid target roots remain available.`
- V1 log: `/home/ryan-ai/.autobyteus/server-data/logs/app-data-migrations/20260814_team_run_execution_tree_v1-2026-08-16T09-43-25-136Z.log`
- Failed roots: `classroomsimulation_25a7d08f76e24b9aabf2dbadd39c5010`, `software_engineering_team_3d1f933ae33d4018a09a436103e8d3cc`, `software_engineering_team_b9f693970ea54330b407d79f3ada609c`, and `team_software-engineering-team_ffc3cd70`.
- Each failure occurs at `messages[0].senderAddress`: the V1 converter requires the exact four-field `TeamExecutionAddress`, while the persisted communication file contains the released `{ segments: [...] }` representation.
- Example released evidence includes `member` segments with `memberRouteKey`, optional `task_team` segments with `taskTeamRunId`, and optional `task_agent` segments with `taskAgentRunId`. The evidence is structurally sufficient for the existing migration-only legacy converter to reconstruct an exact address.

### Source Cause

- `team-communication-projection-address-migration.ts` now contains conversion logic for both exact current addresses and released segment addresses, but the operational record for its existing migration ID is terminal `SUCCEEDED`; runner admission therefore never invokes the newer implementation.
- `team-canonical-identity-migration.ts` converts metadata, task, token, and external-binding identity, but does not own the communication projection file.
- `predecessor-task-package-converter.ts` calls strict `parseAddress` directly for communication sender/receiver rows, so the retryable V1 migration rejects released segment evidence rather than normalizing it before agent-run resolution.
- `20260814` remains `FAILED`, so it is the only existing migration ID guaranteed to retry on the affected operational state. Changing the already-terminal `20260701` implementation cannot repair existing users; changing `20260801` alone also cannot repair this observed machine because that record is now terminal `SUCCEEDED`.

### Requirement And Design Implications

- Refine the current ticket rather than create a new migration ID: `20260814_team_run_execution_tree_v1` is unreleased/retryable and must own migration-only admission of both exact and released segment address evidence when converting predecessor communication messages.
- Reuse one migration-owned address normalizer instead of copying the older migration's parser or making runtime schemas dual-format.
- Normalize in memory during cohort planning, resolve exact sender/receiver AgentRun IDs against the planned V1 execution tree, validate the complete target package, and only then promote through the existing backup/rename owner.
- Exact current predecessor addresses remain accepted without rewriting the predecessor source independently.
- Malformed, ambiguous, or root-mismatched segment evidence remains a precise pre-promotion failure with source bytes preserved.
- A retry from terminal `20260701` + terminal `20260801` + failed `20260814` must converge, and the next startup must be idempotent.
- The separately observed live Team-stream `AGENT_STATUS` contract mismatch and token-ledger Prisma/schema mismatch are base-feature-branch defects outside this ticket's migration-and-packaging scope; they require a separate ticket and do not change the migration ownership decision.

## Stage 10 User-Verification Re-entry Evidence — Missing Team History Index

### Trigger And Reachability

`UV-002` is a reachable user-verification path, not a synthetic state: the rebuilt ticket AppImage started against the user's existing app data, the user opened the registered `autobyteus-workspace-superrepo` workspace, and the sidebar rendered `No task history in this workspace.` The governing product path is AppImage startup -> required app-data migrations -> V1 package catalog rebuild -> GraphQL `workspaceRunHistory` -> workspace sidebar.

Stable behavior ID: `BEH-MIG-010`.

### Read-Only Operational Evidence

- Registered workspace root in `/home/ryan-ai/.autobyteus/server-data/workspaces.json`:
  `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo`.
- Latest `20260814_team_run_execution_tree_v1` log reports `scannedCount=14`, `migratedCount=7`, `skippedCount=7`, `failedCount=0`; the migration ledger records `SUCCEEDED`, attempts `4`, with no error.
- Eight complete `team_run_execution_tree.json` packages exist. Five Software Engineering Team packages carry the exact registered superrepo root:
  - `software_engineering_team_3d1f933ae33d4018a09a436103e8d3cc`
  - `software_engineering_team_b9f693970ea54330b407d79f3ada609c`
  - `software_engineering_team_c8cb1499e313447f9317b62968038933`
  - `software_engineering_team_cc86d4c9ed784ae991e7c3d28123f396`
  - `team_software-engineering-team_ffc3cd70`
- `/home/ryan-ai/.autobyteus/server-data/memory/team_run_history_index.json` contains only two rows: one Temp Workspace ClassroomSimulation run and one `autobyteus_rpa_llm_workspace` Software Engineering Team run. It contains no superrepo row.
- `/home/ryan-ai/.autobyteus/server-data/memory/run_history_index.json` contains 13 standalone Agent rows, all assigned to Temp Workspace. No standalone Agent row belongs to the superrepo; Team member Agents are represented by the Team execution tree and must not be duplicated into the standalone index.
- The live GraphQL `listWorkspaceRunHistory(limitPerAgent: 50)` response contains only the RPA workspace and Temp Workspace. It contains no superrepo group, exactly matching the sidebar.

### Current Production Path And Root Cause

1. `server-runtime.ts:startConfiguredServer()` runs pending app-data migrations, then rebuilds `TeamRunV1PackageCatalog` from complete validated V1 packages.
2. `TeamRunExecutionTreeV1AppDataMigration.execute()` inventories/promotes V1 packages and converts token/external identity, but never reconciles `team_run_history_index.json`.
3. `TeamRunHistoryCatalogService.ensureInitialized()` reads only existing index rows and filters them against package admission. It does not synthesize a missing row from an admitted V1 package.
4. `TeamRunHistoryService.listTeamRunHistory()` therefore never receives the five valid superrepo packages.
5. `WorkspaceRunHistoryService` correctly applies exact canonical workspace filtering, but it can only group the rows supplied by Team history.

Root-cause classification: `Missing Invariant` plus a bounded `Boundary Or Ownership Issue`. The V1 migration promises validated target-root admission, while the persisted Team history index is a separate required projection whose convergence is not owned by that migration. Runtime filtering is correct; adding runtime directory scanning or a compatibility fallback would hide the transition defect and create two history authorities.

### Persisted-Data And Design Implications

- Persisted-data decision remains `Migration Required` inside the existing unreleased `20260814_team_run_execution_tree_v1` boundary. Validated V1 packages are authoritative current data; the Team history index is a derived persisted projection that must converge before the migration reports success.
- Reconciliation must cover every currently validated and newly promoted V1 root, including valid roots when another predecessor root remains unresolved. Unresolved/invalid/historical-residue roots remain excluded.
- The execution tree owns overlapping current fields (Team identity, workspace, creation/archive state). Existing index-only user-facing/lifecycle fields such as summary and termination time must be preserved when a valid row already exists; a missing summary may be reconstructed best-effort but cannot make an otherwise valid history disappear.
- The index update must be deterministic, strict-read, protected-backup, and atomic. Invalid/unreadable input or write failure leaves the prior index bytes and all Team packages unchanged, reports a contextual migration failure, and remains retryable.
- A byte-equivalent retry performs no index write and creates no additional backup. A successful second startup remains attempt/path/byte idempotent.
- Do not edit/rely on the already-completed `20260521_team_run_history_index_v2`, introduce a new migration ID, reset terminal records automatically, or add runtime V1-package scanning/fallback. The unreleased `20260814` owner must write the current projection directly.
- Because this development machine has already recorded the unreleased candidate's `20260814` as `SUCCEEDED`, a later binary using the corrected code will not automatically rerun it against this operational database. Verification must use a disposable copied state with the migration record reset/failed; any repair/reset of the user's operational data requires separate explicit authorization.

### Exact Sources And Commands Consulted

- Source: `src/server-runtime.ts`, `src/run-history/services/team-run-history-catalog-service.ts`, `team-run-history-service.ts`, `workspace-run-history-service.ts`, `team-run-v1-package-catalog.ts`, `team-run-history-index-store.ts`, and `team-run-execution-tree-v1-app-data-migration.ts`.
- Data probes: `jq` over `workspaces.json`, both history indexes, and all current execution trees; read-only `find`/`rg` over `memory/agent_teams`; read-only GraphQL POST to `http://127.0.0.1:29695/graphql`.
- No operational file, migration record, database row, or package was modified during diagnosis.
