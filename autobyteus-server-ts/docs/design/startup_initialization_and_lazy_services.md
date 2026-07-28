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
8. Run required app-data migrations.
9. Start transports and background tasks.

## Why This Exists

- `AppConfig` determines `.env` location and derived paths.
- Runtime token and secret model repositories resolve the explicitly initialized
  `repository_prisma` lifecycle; they do not create capability-local clients.
- Media and workspace services derive storage roots from app data dir.
- App-data migrations may read both SQL rows and memory files, so they must run
  after configuration and schema expansion but before runtime/API reads expose
  partially migrated data.
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

## Observed Risk Areas

Direct imports of `src/server-runtime.ts` outside the normal bootstrap path can still create ordering sensitivity and should initialize config first.
