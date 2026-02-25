# Investigation Notes

## Ticket
- Name: `node-native-dual-logging`
- Goal: implement robust Node-native logging that writes to console and file simultaneously, without shell-level `tee` as primary mechanism.

## Sources Consulted
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/app.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/config/logging-config.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/config/app-config.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/src/logging/http-access-log-policy.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/autobyteus-server-ts/tests/unit/config/logging-config.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/docker/supervisor-allinone.conf`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/docker/allinone-start-server.sh`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/docker/remote-server-entrypoint.sh`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/enterprise-agent-run-id-rename/docker/compose.enterprise-test.yml`

## Key Findings
1. Server logging is currently stdout-first by design.
- `fastify({ logger: { level } })` in `app.ts` has no file destination.
- `logging-config.ts` has no file sink fields, only level + HTTP access mode.

2. `AppConfig.configureLogger()` is a stub and does not configure runtime sinks.
- It prints "logging config ignored" and ensures logs dir exists.

3. A large portion of backend logs bypass Fastify logger.
- Many modules define local `logger` objects that call `console.info/warn/error/debug` directly.
- Therefore, adding only Fastify file sink would still miss many logs.

4. Docker used shell `tee` workaround in startup scripts.
- This persists logs in files, but is outside Node runtime policy and can create coupling/duplication risks if Node-level file logging is later enabled.

5. Data/log path behavior matters for remote nodes.
- Remote server uses `tmpfs` for `/home/autobyteus/data`, so logs there are ephemeral.
- Compose already provides `AUTOBYTEUS_LOG_DIR=/home/autobyteus/logs` with named volume for remote persistence.

## Constraints
- Must keep existing functionality and tests stable.
- Must avoid backward-compatibility branch complexity.
- Must support both host and Docker runtime.
- Must keep logs visible in `docker logs` while adding file persistence.

## Current Entrypoints And Boundaries
- Runtime bootstrap: `src/app.ts:startServer()`
- Config bootstrap: `src/config/app-config.ts:initialize()`
- Fastify HTTP access logs: `src/logging/http-access-log-policy.ts`
- Cross-module app logging style: direct `console.*` wrappers.

## Naming Convention Snapshot
- Config files use kebab-case TS files under `src/config` and `src/logging`.
- Runtime services use noun-based modules with focused responsibility.
- Existing env var style is `AUTOBYTEUS_*` plus legacy `LOG_LEVEL`.

## Open Unknowns
1. Whether any test snapshots/assertions depend on exact console text formatting.
2. Whether all runtime contexts that call `buildApp()` also go through `startServer()`.

## Follow-up Findings (Post-Implementation Validation)
1. Startup-failure durability gap discovered and resolved.
- Initial implementation used async `fs.createWriteStream`, which could lose early logs when startup fails and calls `process.exit(1)` quickly.
- Updated bootstrap now uses synchronous file-descriptor writes (`fs.writeSync`) so fatal startup errors still persist to log file.

2. Process lifecycle behavior clarified.
- Logs emitted before runtime bootstrap (early `AppConfig` constructor/init logs) still go only to console.
- Logs emitted after bootstrap (migrations, runtime errors, Fastify logs) now persist to file and remain visible on stdout/stderr.

3. Docker runtime validation status.
- Compose configuration and entrypoint scripts validate statically (`docker compose config`, `bash -n`).
- Full runtime container verification is currently blocked in this environment due unavailable local Docker daemon socket.

## Implications For Design
- A robust solution needs both:
  - Fastify logger stream duplication (stdout + file).
  - Global console routing so existing `console.*`-based module logs are also duplicated.
- The correct boundary is a central runtime logging bootstrap module in backend source, initialized before app startup side effects.
- `AUTOBYTEUS_LOG_DIR` should be first-class in `AppConfig.getLogsDir()` so runtime log file location is configurable and Docker remote persistence remains correct.
