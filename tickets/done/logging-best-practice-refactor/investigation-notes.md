# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale:
  - The issue is architectural rather than local: the server and Electron runtimes already have different logging paths, and server application logging is spread across `138` local logger shims plus `341` direct `console.*` call sites.
  - A repo-wide migration in one pass is too large for one safe change, but a central logging foundation plus migration of the logging infrastructure and highest-noise paths is realistic in one ticket.
- Investigation Goal:
  - Determine the current logging ownership split, confirm why `DEBUG` escapes the global `LOG_LEVEL`, and define a best-practice migration boundary that fixes the noisy path without inventing another ad hoc logger layer.
- Primary Questions To Resolve:
  - Where is the current authoritative log-level configuration?
  - Which logging paths bypass that configuration?
  - What runtime-specific logger boundaries should own server application logs versus Electron main-process logs?
  - Which files must be migrated immediately to make the new logging architecture real rather than decorative?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-09 | Command | `git rev-parse --show-toplevel && git branch --show-current && git remote show origin` | Resolve Stage 0 base branch and bootstrap context | Repo root is the superrepo; current base branch and remote HEAD branch are both `personal` | No |
| 2026-04-09 | Command | `git fetch origin personal` | Ensure ticket bootstrap uses fresh remote state | Remote refresh succeeded before worktree creation | No |
| 2026-04-09 | Command | `git worktree add -b codex/logging-best-practice-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/logging-best-practice-refactor origin/personal` | Create dedicated ticket worktree | Dedicated worktree and branch were created successfully from fresh `origin/personal` | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/config/logging-config.ts` | Find the current server log-level authority | Server already parses `LOG_LEVEL` into `pinoLogLevel`, but only for Fastify/Pino usage | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/server-runtime.ts` | Confirm how logging config is applied at server startup | Fastify gets `getFastifyLoggerOptions(loggingConfig)`, but the rest of the runtime still logs through a local `console.*` shim | Yes |
| 2026-04-09 | Code | `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts` | Inspect the server console/bootstrap behavior | The runtime bootstrap swaps in a plain Node `Console` that fans out stdout/stderr to file but does not enforce log-level thresholds on `console.debug` | Yes |
| 2026-04-09 | Code | `autobyteus-web/electron/logger.ts` | Inspect the Electron main-process logger | Electron has a separate singleton logger with no named child loggers and no threshold enforcement; `DEBUG` is only a printed label | Yes |
| 2026-04-09 | Code | `autobyteus-web/electron/server/baseServerManager.ts` | Confirm the stdout re-labeling path | Child-process stdout is forwarded with `logger.info("Server stdout: ...")`, which misclassifies server debug output as app-level info | Yes |
| 2026-04-09 | Code | `autobyteus-web/electron/server/services/AppDataService.ts` | Check the default runtime log-level config | First-run `.env` generation defaults to `LOG_LEVEL=INFO`, so default behavior should suppress debug | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/cached-agent-team-definition-provider.ts` | Confirm the noisy cache-hit site | The cache-hit line is already emitted with `console.debug` semantics locally; the problem is architectural handling, not this line's local intent | No |
| 2026-04-09 | Command | `rg -l '^const logger = \\{' autobyteus-server-ts/src | wc -l` | Estimate migration breadth for local console logger shims | There are `138` server source files with ad hoc local logger objects | No |
| 2026-04-09 | Command | `rg -n 'console\\.(debug|info|warn|error)\\(' autobyteus-server-ts/src | wc -l` | Estimate breadth of direct server console usage | There are `341` direct server console calls in `autobyteus-server-ts/src` | No |
| 2026-04-09 | Command | `rg -n 'logger\\.(debug|info|warn|error)\\(' autobyteus-web/electron | wc -l` | Estimate Electron logger usage footprint | Electron main-process code already has `111` call sites through the existing singleton logger, so keeping a central Electron logger API is feasible | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - Server startup and Fastify configuration in `autobyteus-server-ts/src/server-runtime.ts`
  - Server console/file bootstrap in `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts`
  - Electron main-process logger singleton in `autobyteus-web/electron/logger.ts`
  - Embedded server process forwarding in `autobyteus-web/electron/server/baseServerManager.ts`
- Execution boundaries:
  - Fastify/Pino boundary already honors `LOG_LEVEL`
  - Server application code mostly bypasses that boundary through direct `console.*`
  - Electron main-process logging is a separate custom boundary
  - Electron server-process forwarding is another boundary that currently rewrites severity
- Owning subsystems / capability areas:
  - `autobyteus-server-ts/src/logging/*` owns server log bootstrap and config
  - `autobyteus-web/electron/logger.ts` owns Electron main-process application logging
  - `autobyteus-web/electron/server/*` owns child server process orchestration and forwarding
- Optional modules involved:
  - None in the current design; logging is mostly file-local and ad hoc
- Folder / file placement observations:
  - Logging concerns are fragmented across runtime bootstrap, startup, Electron process management, and individual feature files rather than being accessed through one shared application logger API

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/config/logging-config.ts` | `getLoggingConfigFromEnv` | Parses server logging env | Real server log-level authority already exists here | The new server logger should reuse this config rather than inventing new env parsing |
| `autobyteus-server-ts/src/logging/runtime-logger-bootstrap.ts` | `initializeRuntimeLoggerBootstrap` | Routes server console output to stdout/stderr + `server.log` | Current bootstrap forwards raw console output without a real logger abstraction or child logger naming | Server logging infrastructure should expose a shared logger factory and keep the bootstrap as an output sink, not the primary logger API |
| `autobyteus-server-ts/src/server-runtime.ts` | startup logger shim | Server startup/shutdown logging | Uses a local `console.*` shim even though this is the central runtime boundary | This file should consume the shared server logger directly |
| `autobyteus-server-ts/src/agent-team-definition/providers/cached-agent-team-definition-provider.ts` | cache logger shim | Team definition cache diagnostics | Uses a local shim and emits noisy cache-hit debug lines | This is a priority migration candidate because it triggered the user-facing issue |
| `autobyteus-web/electron/logger.ts` | `Logger` singleton | Electron main-process app logging | Flat singleton, no module logger names, no level filtering, no shared runtime config lookup beyond manual extensions | Electron needs a proper logger factory / child logger model |
| `autobyteus-web/electron/server/baseServerManager.ts` | child process stdout/stderr bridge | Forwards embedded server process output into app logs | Re-logs all stdout at info level, erasing original intent | This boundary should log forwarded stdout as debug and preserve module ownership |
| `autobyteus-web/electron/server/services/AppDataService.ts` | `.env` generation | Writes runtime defaults | Default `LOG_LEVEL=INFO` is already correct | The refactor should preserve this default and make it effective everywhere |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-09 | Probe | inspect current `runtime-logger-bootstrap.ts` | `globalThis.console` is replaced with a Node `Console` that fans out output to file but does not filter by level | Server application `console.debug` will be written unless another layer blocks it |
| 2026-04-09 | Probe | inspect current `electron/logger.ts` | `write()` always writes `DEBUG` and other levels; there is no configured threshold | Electron default `INFO` behavior is not authoritative today |
| 2026-04-09 | Probe | inspect current `baseServerManager.ts` stdout bridge | Forwarded server stdout is emitted with `logger.info` | Even correctly classified server debug output becomes visible as info in app logs |

### External Code / Dependency Findings

- Upstream repo / package / sample examined:
  - None required for this ticket
- Version / tag / commit / release:
  - N/A
- Files, endpoints, or examples examined:
  - N/A
- Relevant behavior, contract, or constraint learned:
  - N/A
- Confidence and freshness:
  - High / local source of truth on `2026-04-09`

### Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - None for investigation
- Required config, feature flags, or env vars:
  - Existing server `.env` semantics use `LOG_LEVEL=INFO` by default
- Required fixtures, seed data, or accounts:
  - None
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add -b codex/logging-best-practice-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/logging-best-practice-refactor origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - Dedicated worktree should remain until Stage 10 cleanup

## Constraints

- Technical constraints:
  - Fastify/Pino is already the request logger path; the refactor should not break request logging to fix application logging.
  - The codebase currently has hundreds of legacy `console.*` usages, so a safe refactor must introduce a compatibility boundary rather than a single-turn full rewrite.
- Environment constraints:
  - Server and Electron run as separate processes, so they can share log-level semantics without literally sharing one in-memory logger instance.
- Third-party / API constraints:
  - None identified

## Unknowns / Open Questions

- Unknown:
  - Whether the server application logger should wrap Pino directly or remain a lightweight shared facade that uses the existing runtime bootstrap sink
- Why it matters:
  - This choice determines whether the refactor adds a direct `pino` application dependency or keeps the migration smaller while still enforcing the same level semantics
- Planned follow-up:
  - Resolve in Stage 3 design by balancing best-practice target shape against the existing package structure and migration safety

## Implications

### Requirements Implications

- The authoritative log-level policy already exists conceptually, so the refactor should unify around `LOG_LEVEL` instead of adding a second competing default.
- The ticket must define an explicitly incremental migration boundary because the current usage footprint is too broad for a full same-turn rewrite.

### Design Implications

- Best-practice here means a centralized logger API per runtime with named/module loggers, not additional file-local console shims.
- The server bootstrap should become an output transport concern; it should not remain the de facto application logger implementation.
- The Electron app logger should become a factory that supports scoped loggers and the same threshold semantics as the server.

### Implementation / Placement Implications

- Introduce shared logging primitives under `autobyteus-server-ts/src/logging/` and `autobyteus-web/electron/`.
- Migrate the highest-signal files first:
  - `server-runtime.ts`
  - `runtime-logger-bootstrap.ts`
  - `cached-agent-team-definition-provider.ts`
  - `electron/logger.ts`
  - `electron/server/baseServerManager.ts`
- Leave a compatibility path for untouched modules, but ensure new or migrated code does not create more local logger shims.
