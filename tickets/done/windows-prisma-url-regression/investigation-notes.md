# Investigation Notes

- Status: Complete
- Scope: Small

## Runtime Evidence

- Installed executable: `D:\Program Files\AutoByteus\AutoByteus.exe`, version `1.4.42`.
- Electron log: `C:\Users\happy\.autobyteus\logs\app.log`.
- The Electron shell and embedded Node process start successfully.
- The embedded server receives the intended data directory and begins initialization.
- Prisma logs datasource URL `file:///C:/Users/happy/.autobyteus/server-data/db/production.db`.
- Prisma migration then fails with `Failed to open SQLite database` and Windows OS error 161.
- The server exits with code 1 and never reaches a healthy state.

## Root Cause

Commit `ccc373f37` introduced `ApplicationDatabaseLocation`. Its constructor uses `pathToFileURL(databasePath).href`. On Windows this produces a generic canonical file URL with three slashes. Prisma 5's SQLite connector expects the established datasource syntax `file:C:/...` for an absolute drive path.

Electron's `buildServerRuntimeEnv()` and the persisted `.env` both already contain the correct `file:C:/...` form. `AppConfig` parses that value into `ApplicationDatabaseLocation`, whose constructor changes it to the failing triple-slash form before migrations.

## Existing Capability

- Electron already owns a tested `toPrismaSqliteUrl()` implementation.
- Server `AppConfig.toPrismaSqliteUrl()` uses the same correct normalization.
- The database-location value object should use that same Prisma-specific representation rather than Node's generic URL serializer.

## Risk

Low and localized. The value object is shared by runtime initialization and secret import flows, so direct round-trip tests are required in addition to the startup configuration test.
