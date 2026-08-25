# Startup Initialization and Lazy Service Access

## Problem

Some services depend on configuration-derived paths and environment (`DATABASE_URL`, app data dir, base URL). If these services are instantiated too early (for example at import time), they can bind to incorrect runtime state.

## Required Ordering

The server must execute these steps in order:

1. Parse CLI args.
2. Initialize `appConfigProvider` with the effective `--data-dir`.
3. Call `AppConfig.initialize()`.
4. Import `src/server-runtime.ts` after bootstrap is complete.
5. Run Prisma schema migrations.
6. Initialize `repository_prisma` with AppConfig's exact canonical database URL
   and no WAL request.
7. Initialize or verify the secret vault through that shared repository
   lifecycle.
8. Run registered app-data migration attempts in registry order and persist their
   ordinary results.
9. Log migration failures/warnings, then bootstrap built-in agents, construct the
   application, and start transports/background tasks.

## Why This Exists

- `AppConfig` determines `.env` location and derived paths.
- Runtime token and secret model repositories resolve the explicitly initialized
  `repository_prisma` lifecycle; they do not create capability-local clients.
- Media and workspace services derive storage roots from app data dir.
- App-data migrations may read both SQL rows and memory files, so they must run
  after configuration and schema expansion but before runtime/API reads expose
  partially migrated data.
- The destructive `20260730_reset_pre_lineage_memory` migration is removed.
  Registry order is external-runtime snapshot cleanup, raw-trace rotation-layout,
  raw active-filename normalization, then
  `20260731_migrate_native_working_context_snapshots_v5`.
- The native migration classifies exact AutoByteus standalone/team-member
  locations. It skips missing snapshots and every nonempty-lineage location;
  absent/zero-byte lineage permits a forward-only v1/v3/v4/v5-to-strict-v5
  conversion backed only by same-location active raw facts. It validates the
  complete candidate before snapshot replacement and only then removes obsolete
  episode, semantic, and compacted-memory-manifest files. Raw traces/manifests and
  lineage remain untouched.
- `AppDataMigrationRunner` attempts every registered pending migration and
  persists/returns `SUCCEEDED`, warning, or `FAILED` results without an aggregate
  startup exception. `startConfiguredServer` logs infrastructure/result failures
  and continues normal bootstrap. Failed attempts remain retryable; strict runtime
  restore still rejects an unconverted or missing existing-run snapshot.
- Migration dependencies are declarative `prerequisiteMigrationIds` on each
  definition. The registry rejects empty/duplicate IDs and prerequisites that are
  not registered earlier. Before creating an attempt, the runner admits a
  dependent only when every prerequisite is `SUCCEEDED` or
  `SUCCEEDED_WITH_WARNINGS`. `FAILED`, `RUNNING`, and `NOT_RUN` leave the
  dependent record and attempt count unchanged. Startup reports the typed
  prerequisite diagnostic and continues later independent definitions; explicit
  manual execution propagates the same typed error to its caller.
- `20260814_team_run_execution_tree_v1` is a predecessor-conversion stage, not
  the current runtime schema. It promotes admitted released Team roots to a
  complete migration-owned V1 package and reconciles their history/token
  evidence. `20260823_repair_team_agent_memory_layout` then uses that validated
  intermediate to repair physical nested-member storage.
- Required migration `20260824_team_run_execution_tree_v2` runs after the
  memory-layout repair and is the current Team package cutover. It validates an
  exact V1 tree, preserves IDs/topology/tasks/handoffs/application binding and
  Agent launch snapshots, maps runtime labels, writes root address `/`, and
  materializes every Team's complete default from its unique direct coordinator
  snapshot. Exact V2 is idempotently skipped. The migration uses the shared
  atomic writer and accepts a post-rename warning only when reread validates the
  canonical file as exact V2. Runtime, history, API, and stream readers are
  V2-only; they do not scan predecessor metadata or fall back to V1.
- Shutdown drains the default token persistence processor, closes/zeroizes the
  secret runtime, and only then shuts down the shared repository client.

## Design Decision

Use lazy service access patterns to avoid import-time construction:

- Prefer `getInstance()` and accessor functions.
- Keep `src/app.ts` bootstrap-only so broad runtime imports happen after config is resolved.
- Avoid eager `export const x = X.getInstance()` in modules that can load before startup initialization.

## Related Implementation Files

- `src/app.ts`
- `src/server-runtime.ts`
- `src/config/app-config.ts`
- `src/config/app-config-provider.ts`
- `src/startup/background-runner.ts`
- `src/app-data-migrations/app-data-migration-runner.ts`
- `src/app-data-migrations/app-data-migration-registry.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-history-index-reconciler.ts`
- `src/app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.ts`
- `src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.ts`
- `src/run-history/services/team-run-package-catalog.ts`
- `src/run-history/services/team-run-history-index-row-projector.ts`
- `src/run-history/store/team-run-history-index-store.ts`
- `src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts`
- `src/agent-memory/services/runtime-memory-location-classifier.ts`

## Observed Risk Areas

Direct imports of `src/server-runtime.ts` outside the normal bootstrap path can still create ordering sensitivity and should initialize config first.
