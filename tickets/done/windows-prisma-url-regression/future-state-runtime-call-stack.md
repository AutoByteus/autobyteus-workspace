# Future-State Runtime Call Stack

## Desktop Startup

1. `buildServerRuntimeEnv()` derives native database path and emits `file:C:/...`.
2. Embedded server loads `DATABASE_URL` through `AppConfig.initialize()`.
3. `ApplicationDatabaseLocation.fromConfiguredFileUrl()` decodes and resolves the filesystem path.
4. `ApplicationDatabaseLocation` stores the native path and emits the Prisma datasource URL without generic URL reserialization.
5. `runMigrations()` passes that exact `file:C:/...` value to the Prisma CLI.
6. Prisma opens the SQLite database and the server reaches its health endpoint.

## Explicit Import Target

1. CLI accepts an absolute generic file URL such as `file:///C:/...`.
2. `fromAbsoluteFileUrl()` decodes it with `fileURLToPath()`.
3. The value object validates the native absolute path.
4. The value object emits the equivalent Prisma URL `file:C:/...` for repository initialization.

## Error Branches

- Empty, non-file, relative, query-bearing, fragment-bearing, or null-containing values throw `ApplicationDatabaseLocationError` before filesystem or Prisma access.
