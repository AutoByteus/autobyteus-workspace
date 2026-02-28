# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis
- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/server-default-log-file-port/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/in-progress/server-default-log-file-port/implementation-plan.md`
- Source Design Version: `v1`
- Referenced Sections: `Solution Sketch`, `Step-By-Step Plan`

## Use Case Index
| use_case_id | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | REQ-002 | N/A | Default startup file sink bootstrap | Yes/Yes/Yes |
| UC-002 | Requirement | REQ-003 | N/A | Fastify logger wiring after bootstrap | Yes/N/A/Yes |
| UC-003 | Requirement | REQ-001 | N/A | Runtime state parity for fanout streams | Yes/N/A/Yes |

## Transition Notes
- No temporary migration behavior required.
- No compatibility branch retained.

## Use Case: UC-001 [Default startup file sink bootstrap]
### Goal
Initialize default server file sink (`server.log`) in runtime logs directory.

### Preconditions
- `startServer()` has called `initializeConfig()`.
- logs directory resolved by `appConfigProvider.config.getLogsDir()`.

### Expected Outcome
- `<logsDir>/server.log` exists and receives append writes from console fanout streams.

### Primary Runtime Call Stack
```text
[ENTRY] src/app.ts:startServer()
└── src/logging/runtime-logger-bootstrap.ts:initializeRuntimeLoggerBootstrap({ logsDir })
    ├── fs.mkdirSync(logsDir, { recursive: true }) [IO]
    ├── fs.openSync(path.resolve(logsDir, "server.log"), "a") [IO]
    ├── new FanoutWritable(process.stdout, fd) [STATE]
    ├── new FanoutWritable(process.stderr, fd) [STATE]
    ├── new Console({ stdout, stderr }) [STATE]
    └── runtimeState = { initialized, logFilePath, fileDescriptor, stdoutFanoutStream, stderrFanoutStream } [STATE]
```

### Branching / Fallback Paths
```text
[FALLBACK] if runtimeState.initialized is true
initializeRuntimeLoggerBootstrap(...)
└── return cached logFilePath (or default path join)
```

```text
[ERROR] if logsDir create/open fails
initializeRuntimeLoggerBootstrap(...)
└── error bubbles to src/app.ts:startServer() catch -> process.exit(1)
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Fastify logger wiring after bootstrap]
### Goal
Ensure Fastify logger stream uses runtime fanout stream.

### Preconditions
- runtime logger bootstrap has completed in startup path.

### Expected Outcome
- `buildApp()` uses stream-enabled logger options.

### Primary Runtime Call Stack
```text
[ENTRY] src/app.ts:buildApp({ loggingConfig })
└── src/logging/runtime-logger-bootstrap.ts:getFastifyLoggerOptions(loggingConfig)
    ├── if stdoutFanoutStream present -> return { level, stream }
    └── else -> return { level }
```

### Branching / Fallback Paths
```text
[ERROR] if logger stream unavailable unexpectedly
getFastifyLoggerOptions(...)
└── fallback to level-only options (no thrown error)
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Runtime state parity for fanout streams]
### Goal
Align runtime state shape with enterprise implementation for stdout/stderr stream references.

### Preconditions
- module runtime state initialized in process.

### Expected Outcome
- runtime state includes both stdout and stderr fanout references for parity and lifecycle consistency.

### Primary Runtime Call Stack
```text
[ENTRY] src/logging/runtime-logger-bootstrap.ts:initializeRuntimeLoggerBootstrap(...)
└── runtimeState assignment includes stderrFanoutStream field [STATE]
```

### Branching / Fallback Paths
```text
[ERROR] if reset is invoked
src/logging/runtime-logger-bootstrap.ts:__testOnly.resetRuntimeLoggerBootstrap()
└── runtimeState reset preserves full field shape including stderrFanoutStream=null
```

### Coverage Status
- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
