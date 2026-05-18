# App Data Migration Design Rework Note

## Status

Design-impact rework requested after Electron validation on 2026-05-17 showed raw legacy team metadata errors in the left sidebar. This note supersedes the earlier "fail restore only" legacy metadata posture: runtime code remains clean/current-schema-only, but known historical data is upgraded by an explicit app data migration.

## Problem

The nested-team work introduced canonical recursive `TeamRunMetadata.memberTree`. Existing installations may contain historical team metadata like:

```json
{
  "teamRunId": "team_software-engineering-team_eefd62ea",
  "runVersion": 1,
  "memberMetadata": [
    {
      "memberRouteKey": "solution_designer",
      "memberName": "solution_designer",
      "memberRunId": "solution_designer_e10b0b248e12af82"
    }
  ]
}
```

The new model can represent this old non-nested team as a one-level `memberTree`, but the current parser rejects it and the error leaks into normal UI. That is bad UX and makes upgraded apps look broken.

## Decision

Add a general app data migration framework on the current nested-team ticket/branch.

Architecture rule:

```text
old persisted data -> app data migration -> current canonical data -> runtime reads current schema only
```

Do not add runtime backward compatibility readers. Do not let normal stores, restore mappers, frontend parsers, or projections read both old and new schemas. Known historical conversion belongs to registered migrations only.

## Backend Target Shape

Add an app data migration subsystem:

- `src/app-data-migrations/domain/app-data-migration-types.ts`
- `src/app-data-migrations/app-data-migration-registry.ts`
- `src/app-data-migrations/app-data-migration-runner.ts`
- `src/app-data-migrations/repositories/app-data-migration-record-repository.ts`
- `src/app-data-migrations/migrations/team-run-metadata-member-tree-migration.ts`

Add a Prisma-backed migration record table/model, for example `AppDataMigrationRecord`, with:

- `migrationId`
- `displayName`
- `status`: `NOT_RUN`, `RUNNING`, `SUCCEEDED`, `FAILED`, `SUCCEEDED_WITH_WARNINGS`
- `attempts`
- `startedAt`
- `completedAt`
- `summaryJson`
- `errorMessage`
- `logPath`

Run app data migrations after Prisma/database schema migrations and before normal server services expose history to frontend clients. A failed data migration should not crash the whole server when item-level failure can be recorded safely; it should mark the migration failed/retryable and let normal UI remain usable.

## Specific Migration

Migration ID: `20260517_team_run_metadata_member_tree` or equivalent project timestamp naming.

For each `agent_teams/*/team_run_metadata.json`:

1. If current `memberTree` format: skip as already migrated.
2. If legacy `runVersion` or `memberMetadata[]`: convert to canonical metadata.
3. Add `memberKind: "agent"` to each legacy member.
4. Add `memberPath: [memberRouteKey || memberName]` to each top-level member.
5. Preserve root run fields, member run IDs, runtime/model/config/workspace/application context, and archive timestamps.
6. Validate converted output with the canonical current metadata validator.
7. Create a backup before write.
8. Atomically replace the metadata file.
9. Record migrated/skipped/failed item counts and per-item details.

## Frontend Target Shape

Add Settings -> Server -> Migrations:

- list all registered migrations, including not-run/pending ones from the registry;
- show status pill, last attempt timestamps, attempts, counts/summary, and concise failure explanation;
- allow technical details expansion;
- provide refresh and retry/run action where allowed;
- use a dedicated migration store and GraphQL operations, not `serverSettingsStore` key/value state.

## Failure UX

Normal Agents/workspace/sidebar/history UI must not display raw metadata exceptions like `Unsupported legacy team run metadata ... memberMetadata/runVersion`.

If a legacy file remains because migration failed:

- list/history hydration should skip or friendly-scope the affected historical run;
- direct restore/open should show a friendly message such as: `This team run was created by an older version and has not been upgraded. Open Settings -> Server -> Migrations for details or retry.`;
- detailed technical error belongs in migration status/logs.

## Downstream Implementation Expectations

- Add backend migration framework and concrete team metadata migration.
- Add Prisma schema/migration for migration records.
- Add startup runner after `runMigrations()` and before normal server bootstrap/historical data exposure.
- Add GraphQL migration status/retry resolver.
- Add frontend Settings -> Server -> Migrations UI, store, queries, and tests.
- Update history/sidebar hydration to catch typed legacy-unmigrated diagnostics and avoid raw UI errors.
- Keep runtime metadata parser strict/current-schema-only; conversion code must be isolated to the migration.

## Round 15 Spine Audit Addendum

Architecture review Round 15 required the migration reset to be spine-complete, not only file-map-complete. The design now explicitly includes:

### Startup execution spine

```text
Server startup
  -> Prisma/database schema migrations
  -> AppDataMigrationRunner
  -> AppDataMigrationRegistry
  -> AppDataMigrationRecordRepository
  -> required migration execution
  -> normal services expose current-schema history
```

### Legacy metadata conversion spine

```text
agent_teams/*/team_run_metadata.json
  -> TeamRunMetadataMemberTreeMigration
  -> legacy shape detection
  -> canonical memberTree conversion
  -> canonical validation
  -> backup
  -> atomic write
  -> DB summary/log
```

### Status/listing spine

```text
Settings -> Server -> Migrations
  -> appDataMigrationsStore
  -> GraphQL getAppDataMigrations
  -> registry definitions + DB records
  -> status table/details/retry
```

### Manual retry/concurrency spine

```text
Settings retry click
  -> appDataMigrationsStore.runMigration(id)
  -> GraphQL runAppDataMigration(id)
  -> AppDataMigrationRunner acquire per-migration lock
  -> resolve stale RUNNING or reject true duplicate concurrent run
  -> AppDataMigrationRecordRepository RUNNING transition
  -> migration execute/skip/fail
  -> DB summary/log
  -> GraphQL result/status refresh
  -> Settings UI
```

### Direct restore/open degraded UX spine

```text
User opens/restores historical team run
  -> frontend run-open/restore coordinator
  -> GraphQL restore/open request
  -> TeamRunService
  -> TeamRunMetadataStore typed legacy-unmigrated diagnostic
  -> no runtime start and no topology guessing
  -> friendly operation result/toast/dialog
  -> Settings -> Server -> Migrations details/retry
```

The direct restore/open degraded path is intentionally separate from history/sidebar hydration. Both must prevent raw metadata parser text from reaching normal UI.
