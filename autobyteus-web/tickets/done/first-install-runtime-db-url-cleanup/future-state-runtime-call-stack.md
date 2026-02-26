# Future-State Runtime Call Stack - first-install-runtime-db-url-cleanup

## Version
v1

## UC-001 Fresh Install Startup
1. `electron/main.ts:createWindow(...)`
2. `electron/server/baseServerManager.ts:startServer()`
3. `electron/server/services/AppDataService.ts:initializeFirstRun(...)` copies packaged `.env` into app data dir.
4. `electron/server/macOSServerManager.ts:launchServerProcess()`
5. `electron/server/serverRuntimeEnv.ts:buildServerRuntimeEnv(appDataDir, process.env)` sets runtime `DATABASE_URL=file:<appDataDir>/db/production.db`.
6. `spawn(process.execPath, [serverEntry,...], { env })`
7. Server process boot:
   - `autobyteus-server-ts/src/config/app-config.ts:initialize()`
   - `initSqlitePath()` ensures `DATABASE_URL` matches runtime db path.
8. Prisma initializes against runtime DB file under app data dir.
9. Health endpoint returns OK.

Error/Fallback branch:
- If data dir missing `.env`, first-run initialization recreates and copies baseline `.env` before server spawn.

## UC-002 Agent Definitions Query
1. UI invokes GraphQL query `agentDefinitions`.
2. Server GraphQL resolver executes repository read through Prisma.
3. Prisma reads runtime SQLite DB file.
4. Response returns `[]` for clean DB; no initialization error.

## UC-003 LAN Reachability
1. Server starts with `--host 0.0.0.0` in manager args.
2. OS listener binds `*:29695`.
3. Request to `http://<LAN_IP>:29695/rest/health` returns OK (subject to firewall policy).

## UC-004 Deprecated DB_NAME Removal
1. Runtime env builder writes only `DATABASE_URL` (no `DB_NAME`).
2. Server config initializer writes only `DATABASE_URL` for sqlite path.
3. Tests/docs/scripts no longer assert or set `DB_NAME`.
