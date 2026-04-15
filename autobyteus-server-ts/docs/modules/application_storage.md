# Application Storage

## Scope

Owns platform-created per-application storage roots, the protected split between platform-owned SQLite state and app-owned SQLite state, migration validation/execution, and the runtime/log/status file layout used by the app engine.

## TS Source

- `src/application-storage`
- `src/application-sessions/stores/application-session-state-store.ts`
- `src/application-sessions/stores/application-publication-journal-store.ts`

## Main Service And Supporting Owners

- `src/application-storage/services/application-storage-lifecycle-service.ts`
- `src/application-storage/services/application-migration-service.ts`
- `src/application-storage/stores/application-platform-state-store.ts`
- `src/application-storage/utils/application-storage-paths.ts`

## Storage Layout

Each application gets a platform-owned root under:

```text
<app-data-dir>/applications/<storage-key-derived-from-application-id>/
```

- the public canonical `applicationId` does not change.
- short application ids keep their readable encoded id as the storage key.
- oversized canonical/imported ids compact to a deterministic hash-backed key so the per-app directory stays within filesystem segment limits while remaining stable across restarts.
- only the internal storage-root key changes for oversized ids; transport boundaries and app-visible identity continue using the canonical `applicationId`.

Important children:

- `db/app.sqlite` -> app-owned schema/data
- `db/platform.sqlite` -> platform-owned session/projection/journal/migration metadata
- `logs/worker.stdout.log`
- `logs/worker.stderr.log`
- `runtime/engine-status.json`
- `runtime/engine.lock`

## Authority Split

### Platform-owned `platform.sqlite`

The platform bootstraps and owns reserved tables including:

- `__autobyteus_storage_meta`
- `__autobyteus_app_migrations`
- `__autobyteus_session_index`
- `__autobyteus_session_projection`
- `__autobyteus_publication_journal`
- `__autobyteus_publication_dispatch_cursor`

Application code does not migrate or attach this database.

### App-owned `app.sqlite`

- Created by the platform before migration execution.
- Reserved for app-authored schema/data.
- Passed into the worker through `ApplicationStorageContext.appDatabasePath` and `appDatabaseUrl`.

## Preparation Phases

- `ensurePlatformStatePrepared(applicationId)`
  - creates directories,
  - materializes `platform.sqlite`, and
  - bootstraps reserved platform tables without running app-authored migrations.
- `ensureStoragePrepared(applicationId)`
  - runs the platform-state step,
  - materializes `app.sqlite`, and
  - applies pending app migrations before worker startup.

This split lets platform-owned session/publication state exist without depending on app migration success.

## Migration Contract

- App migrations live under the bundle path declared by `backend.migrationsDir`.
- `.sql` files run in lexicographic filename order.
- The platform stores migration checksums in `__autobyteus_app_migrations` and rejects checksum drift for already-applied files.
- Migrations execute only against `app.sqlite`.

Forbidden SQL patterns include:

- `ATTACH`
- `DETACH`
- `VACUUM INTO`
- `load_extension(...)`
- `PRAGMA writable_schema`
- any `__autobyteus_*` identifier
- any `sqlite_*` identifier

These guards keep app-authored SQL out of platform-owned state.

## Cross-App Lookup Note

When only `applicationSessionId` is known, the current implementation resolves ownership by scanning existing per-app platform session indexes and then loading the owning app snapshot. This keeps the lookup migration-safe but is still linear across installed apps.

## Related Docs

- [`applications.md`](./applications.md)
- [`application_sessions.md`](./application_sessions.md)
- [`application_engine.md`](./application_engine.md)
- [`application_backend_gateway.md`](./application_backend_gateway.md)
- `../../../autobyteus-application-sdk-contracts/README.md`
