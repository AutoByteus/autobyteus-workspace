# Implementation Plan - first-install-runtime-db-url-cleanup

## Scope
Small

## Solution Sketch
- Keep runtime startup authoritative: set `DATABASE_URL` from app data directory before server boot.
- Remove deprecated `DB_NAME` usage from runtime env builder, server config initializer, tests, and docs/scripts.
- Validate with first-install smoke test and LAN reachability probe.

## Change Inventory
- Modify: `autobyteus-web/electron/server/serverRuntimeEnv.ts`
- Modify: `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts`
- Modify: `autobyteus-server-ts/src/config/app-config.ts`
- Modify: `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
- Modify: `autobyteus-server-ts/tests/unit/config/app-config.test.js`
- Modify: `autobyteus-server-ts/README.md`
- Modify: `autobyteus-server-ts/scripts/android/termux_bootstrap.sh`

## Verification Strategy
- Unit tests:
  - `pnpm vitest --config ./electron/vitest.config.ts electron/server/__tests__/serverRuntimeEnv.spec.ts`
  - `pnpm vitest tests/unit/config/app-config.test.ts`
- Build checks:
  - `pnpm transpile-electron`
  - `pnpm build` (in `autobyteus-server-ts`)
- Runtime smoke / integration:
  - Launch packaged app with clean HOME.
  - Check `GET /rest/health` and GraphQL `agentDefinitions`.
  - Check LAN endpoint on host LAN IP.

## Runtime Call Stack Review Gate
- Future-state call stack document present: Yes
- Review rounds complete: Yes (2 clean rounds)
- Implementation can start: Yes
