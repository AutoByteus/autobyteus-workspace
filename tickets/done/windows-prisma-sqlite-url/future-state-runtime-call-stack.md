# Future-State Runtime Call Stack

## Spine: Embedded Server Startup Database URL

1. Electron resolves app data directory as `C:\Users\<user>\.autobyteus\server-data`.
2. `AppDataService` generates first-run `.env` with `DATABASE_URL=file:C:/Users/<user>/.autobyteus/server-data/db/production.db`.
3. `buildServerRuntimeEnv` starts the embedded server with the same `DATABASE_URL`.
4. Server `AppConfig` loads `.env`; if `DATABASE_URL` is absent, it generates the same normalized URL shape.
5. Prisma migration deploy reads `env("DATABASE_URL")` from `prisma/schema.prisma`.
6. Prisma opens `C:/Users/<user>/.autobyteus/server-data/db/production.db` successfully.
7. Backend reaches listen/health-ready state, allowing Electron health polling to pass.

## Ownership

- Electron server startup owns packaged desktop runtime env generation.
- Electron app-data service owns first-run `.env` generation.
- Server config owns fallback generation only when no explicit runtime `DATABASE_URL` exists.

## Error Boundary

If Prisma still fails after URL repair, classify the next failure from the new logs. Do not delete `server-data` unless the new error proves database corruption or incompatible persisted state.
