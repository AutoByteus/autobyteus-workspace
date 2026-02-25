# Future-State Runtime Call Stacks (Debug-Trace Style)

## Conventions
- Frame format: `path/to/file.ts:functionName(...)`
- Boundary tags: `[ENTRY]`, `[ASYNC]`, `[STATE]`, `[IO]`, `[FALLBACK]`, `[ERROR]`

## Design Basis
- Scope Classification: `Medium`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/node-native-dual-logging/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/in-progress/node-native-dual-logging/proposed-design.md`
- Source Design Version: `v1`

## Use Case Index (Stable IDs)
| use_case_id | Source Type | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001 | N/A | Startup activates dual sink runtime logger | Yes/N/A/Yes |
| UC-002 | Requirement | R-002 | N/A | Fastify logs write to console and file | Yes/N/A/Yes |
| UC-003 | Requirement | R-003 | N/A | `console.*` logs captured by same sink | Yes/N/A/Yes |
| UC-004 | Requirement | R-004 | N/A | Log directory override via `AUTOBYTEUS_LOG_DIR` | Yes/Yes/Yes |
| UC-005 | Design-Risk | R-006 | Bootstrap must not break startup flow or logger availability | Bootstrap resilience and fallback behavior | Yes/Yes/Yes |

## Transition Notes
- Docker server startup scripts no longer own primary server file log persistence.
- Backend runtime logger bootstrap owns server process logging policy.

## Use Case: UC-001 Startup activates dual sink runtime logger

### Goal
Backend startup creates one dual-sink runtime logging policy before app runtime initialization.

### Primary Runtime Call Stack
```text
[ENTRY] src/app.ts:startServer(...)
├── src/app.ts:parseArgs(...)
├── src/config/app-config-provider.ts:appConfigProvider.config
│   └── src/config/app-config.ts:AppConfig.constructor() [STATE]
├── src/config/app-config.ts:AppConfig.initialize() [ASYNC]
│   ├── src/config/app-config.ts:getLogsDir() [IO]
│   └── src/config/logging-config.ts:getLoggingConfigFromEnv(...) [STATE]
├── src/logging/runtime-logger-bootstrap.ts:initializeRuntimeLoggerBootstrap(...) [ASYNC]
│   ├── create write stream for `server.log` [IO]
│   ├── create fanout stream for stdout+file [STATE]
│   └── bind global console to fanout stdout/stderr [STATE]
└── src/app.ts:buildApp(...) [ASYNC]
```

### Error Path
```text
[ERROR] log file stream cannot be created
src/logging/runtime-logger-bootstrap.ts:initializeRuntimeLoggerBootstrap(...)
└── throw startup error with resolved file path context
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 Fastify logs write to console and file

### Goal
Fastify logger output should use dual-sink stream options.

### Primary Runtime Call Stack
```text
[ENTRY] src/app.ts:buildApp(...)
├── src/config/logging-config.ts:getLoggingConfigFromEnv(...) [STATE]
├── src/logging/runtime-logger-bootstrap.ts:getFastifyLoggerOptions(...) [STATE]
├── fastify({ logger: { level, stream: fanout } }) [STATE]
└── src/logging/http-access-log-policy.ts:registerHttpAccessLogPolicy(...)
    └── request.log.info/warn/error(...) -> fanout stream [IO]
```

### Error Path
```text
[ERROR] fastify logger options unavailable
src/logging/runtime-logger-bootstrap.ts:getFastifyLoggerOptions(...)
└── throw startup error (no stdout-only compatibility fallback branch)
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 `console.*` logs captured by same sink

### Goal
Existing module logs that use `console.*` are captured without per-file rewrites.

### Primary Runtime Call Stack
```text
[ENTRY] any module runtime log call
└── console.info/warn/error/debug(...)
    └── global console bound by runtime bootstrap [STATE]
        ├── fanout stdout/stderr stream write [IO]
        └── `server.log` append write [IO]
```

### Error Path
```text
[ERROR] console rebinding fails
src/logging/runtime-logger-bootstrap.ts:initializeRuntimeLoggerBootstrap(...)
└── throw startup error and abort process
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Log directory override via `AUTOBYTEUS_LOG_DIR`

### Goal
Resolved logs directory should follow override env when provided.

### Primary Runtime Call Stack
```text
[ENTRY] src/config/app-config.ts:getLogsDir()
├── read `AUTOBYTEUS_LOG_DIR` from config/env [STATE]
├── resolve absolute/relative path [STATE]
└── ensure directory exists via `fs.mkdirSync(..., { recursive: true })` [IO]
```

### Fallback Path
```text
[FALLBACK] AUTOBYTEUS_LOG_DIR missing/empty
src/config/app-config.ts:getLogsDir()
└── fallback to `${dataDir}/logs` [STATE]
```

### Error Path
```text
[ERROR] logs dir path invalid or not writable
src/config/app-config.ts:getLogsDir()
└── throw AppConfigError with path context
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 Bootstrap resilience and fallback behavior

### Goal
Maintain deterministic startup and explicit failure semantics when logging bootstrap fails.

### Primary Runtime Call Stack
```text
[ENTRY] src/app.ts:startServer(...)
├── initialize config + logging config [STATE]
├── initialize runtime logger bootstrap [ASYNC]
├── build app and start listen [ASYNC]
└── normal startup logs emitted through bound console + fastify stream [IO]
```

### Fallback Path
```text
[FALLBACK] runtime bootstrap already initialized (idempotent path)
src/logging/runtime-logger-bootstrap.ts:initializeRuntimeLoggerBootstrap(...)
└── reuse existing stream handles [STATE]
```

### Error Path
```text
[ERROR] runtime bootstrap initialization throws
src/app.ts:startServer(...)
└── log fatal startup message and exit non-zero
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
