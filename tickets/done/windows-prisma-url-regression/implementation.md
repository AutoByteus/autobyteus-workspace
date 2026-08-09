# Implementation

## Stable Baseline

- Scope: Small
- Owning subsystem: `autobyteus-server-ts/src/config`
- Authoritative value object: `ApplicationDatabaseLocation`

## Solution Sketch

1. Replace generic `pathToFileURL(databasePath).href` output with a Prisma-specific formatter that prefixes `file:` and normalizes native separators to `/`.
2. Keep generic file URL parsing only at the explicit absolute-import boundary.
3. Make the absolute-import boundary accept both canonical generic file URLs and already-normalized Prisma absolute URLs so the value object round-trips.
4. Add a focused `application-database-location.test.ts` covering POSIX, Windows, round-trip, and rejection behavior.
5. Update `app-config.test.ts` expectations to assert Prisma datasource syntax.

## Execution Tracking

- Source edit: Complete. `ApplicationDatabaseLocation` now owns Prisma SQLite URL
  serialization, and `AppConfig` reuses that owner.
- Unit tests: Complete. Focused config, import CLI, migration environment, and
  Electron runtime environment suites pass (83 tests total).
- Build/typecheck: Production server build passes. The standalone server typecheck
  remains blocked by the pre-existing `rootDir = src` configuration while tests are
  included; all reported `TS6059` paths are outside the changed source behavior.
- Disposable Prisma validation: Complete. Prisma opened a generated Windows URL and
  applied all 19 migrations to a fresh database.

## Ownership And Compatibility Checks

- The formatter is defined at the database-location value-object boundary rather
  than duplicated in callers.
- Generic file URLs remain accepted only at the explicit import boundary and are
  normalized immediately to the single Prisma representation.
- No backward-compatibility wrapper, dual runtime path, or legacy serializer remains
  in the changed flow.
- Both changed source files remain in the existing `src/config` owning subsystem and
  introduce no dependency cycle.
