# Future-State Runtime Call Stack

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/run-bash-posix-spawn-failure/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/done/run-bash-posix-spawn-failure/implementation-plan.md`
- Source Design Version: `v1`

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `autobyteus-ts/tools/terminal` | Requirement | `R-001`, `R-002` | Foreground `run_bash` recovers from PTY startup failure | Yes/Yes/Yes |
| UC-002 | DS-001 | Bounded Local | `autobyteus-ts/tools/terminal` | Requirement | `R-002` | Repeated foreground calls avoid stale-session cascade | Yes/N/A/Yes |
| UC-003 | DS-002 | Primary End-to-End | `autobyteus-ts/tools/terminal` | Requirement | `R-003` | Background process startup reuses the same fallback policy | Yes/Yes/Yes |
| UC-004 | DS-003 | Bounded Local | `autobyteus-ts/agent/streaming/adapters` | Requirement | `R-004`, `R-005` | XML `run_bash` command text is decoded exactly once | Yes/N/A/Yes |

## Transition Notes

- Replace current unconditional PTY startup assumption with a shared startup policy that can fall back to `DirectShellSession` when PTY startup is unavailable.
- No backward-compatibility wrapper should preserve the current broken `posix_spawnp failed -> Session not started` cascade.

## Use Case: UC-001 Foreground `run_bash` recovers from PTY startup failure

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/tools/terminal`
- Why This Use Case Matters To This Spine:
  - This is the main user-visible `run_bash` path and the direct source of the reported failure.

### Goal

Execute a valid foreground shell command even when the preferred PTY backend cannot start.

### Preconditions

- Tool invocation contains a non-empty `command`.
- Runtime is non-Windows and non-Android.
- PTY startup throws or produces a dead-on-start session.

### Expected Outcome

- The manager retries with `DirectShellSession`.
- The command executes successfully and the direct-shell session becomes the persisted session for later commands in the same context.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/terminal/tools/run-bash.ts:runBash(context, command, timeoutSeconds, false)
├── autobyteus-ts/src/tools/terminal/tools/run-bash.ts:getTerminalManager(context) [STATE]
├── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:ensureStarted(cwd) [ASYNC]
│   ├── autobyteus-ts/src/tools/terminal/session-factory.ts:getDefaultSessionFactory() [STATE]
│   ├── autobyteus-ts/src/tools/terminal/session-factory.ts:getFallbackSessionFactories(primaryFactory) [STATE]
│   ├── autobyteus-ts/src/tools/terminal/session-startup.ts:startTerminalSessionWithFallback(...) [ASYNC]
│   │   ├── autobyteus-ts/src/tools/terminal/pty-session.ts:start(cwd) [ASYNC]
│   │   └── autobyteus-ts/src/tools/terminal/direct-shell-session.ts:start(cwd) [FALLBACK][ASYNC]
│   ├── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:storeRecoveredSession(session) [STATE]
│   └── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:drainOutput(...) [IO]
└── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:executeCommand(command, timeoutSeconds) [ASYNC]
    ├── session.write(Buffer.from(commandWithNewline)) [IO]
    ├── session.read(...) loop [IO]
    ├── autobyteus-ts/src/tools/terminal/prompt-detector.ts:check(output) [STATE]
    └── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:getExitCode() [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if PTY startup throws or session dies during startup
autobyteus-ts/src/tools/terminal/session-startup.ts:startTerminalSessionWithFallback(...)
├── discard/close failed PTY session [STATE]
└── autobyteus-ts/src/tools/terminal/direct-shell-session.ts:start(cwd) [ASYNC]
```

```text
[ERROR] if both PTY and direct-shell startup fail
autobyteus-ts/src/tools/terminal/session-startup.ts:startTerminalSessionWithFallback(...)
└── throw actionable startup error without leaving stale session state
```

### State And Data Transformations

- `command` string -> newline-normalized shell input.
- failing PTY session -> discarded session object.
- recovered direct-shell session -> persistent manager session state.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Repeated foreground calls avoid stale-session cascade

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Bounded Local`
- Governing Owner: `autobyteus-ts/tools/terminal`
- Why This Use Case Matters To This Spine:
  - The user explicitly reported the second-call `Session not started` cascade after the first PTY failure.

### Goal

Ensure a failed startup does not poison subsequent `run_bash` calls in the same context.

### Preconditions

- First startup attempt failed on the primary backend.
- A second command is executed on the same context/manager.

### Expected Outcome

- The second call either reuses the recovered direct-shell session or reruns the same clean fallback attempt.
- No stale `Session not started` error is emitted from the previous failed backend.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/terminal/tools/run-bash.ts:runBash(...)
└── autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:ensureStarted(cwd)
    ├── detect existing live recovered session [STATE]
    └── or perform a fresh startup attempt after clearing failed state [STATE][ASYNC]
```

### Branching / Fallback Paths

```text
[ERROR] if stale failed session would have been reused
autobyteus-ts/src/tools/terminal/terminal-session-manager.ts:ensureStarted(cwd)
└── stale session is cleared before command execution continues
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Background process startup reuses the same fallback policy

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `autobyteus-ts/tools/terminal`
- Why This Use Case Matters To This Spine:
  - Background `run_bash` shares the same PTY startup assumption and should not drift from foreground recovery behavior.

### Goal

Start a background process successfully when PTY startup is unavailable but direct shell works.

### Preconditions

- `run_bash(..., background=true)` or background-process tool call is issued.
- PTY startup fails in the environment.

### Expected Outcome

- Background process manager retries with direct shell and returns a running process handle.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/terminal/tools/run-bash.ts:runBash(context, command, timeoutSeconds, true)
├── autobyteus-ts/src/tools/terminal/tools/run-bash.ts:getBackgroundManager(context) [STATE]
└── autobyteus-ts/src/tools/terminal/background-process-manager.ts:startProcess(command, cwd) [ASYNC]
    ├── autobyteus-ts/src/tools/terminal/session-factory.ts:getDefaultSessionFactory() [STATE]
    ├── autobyteus-ts/src/tools/terminal/session-factory.ts:getFallbackSessionFactories(primaryFactory) [STATE]
    ├── autobyteus-ts/src/tools/terminal/session-startup.ts:startTerminalSessionWithFallback(...) [ASYNC]
    ├── session.write(Buffer.from(commandWithNewline)) [IO]
    ├── autobyteus-ts/src/tools/terminal/background-process-manager.ts:readLoop(process) [ASYNC]
    └── return processId [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if PTY startup throws
autobyteus-ts/src/tools/terminal/session-startup.ts:startTerminalSessionWithFallback(...)
└── autobyteus-ts/src/tools/terminal/direct-shell-session.ts:start(cwd) [ASYNC]
```

```text
[ERROR] if all startup candidates fail
autobyteus-ts/src/tools/terminal/background-process-manager.ts:startProcess(command, cwd)
└── propagate startup error without registering a phantom process record
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 XML `run_bash` command text is decoded exactly once

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `autobyteus-ts/agent/streaming/adapters`
- Why This Use Case Matters To This Spine:
  - The parser boundary is the earliest shared point where XML entity-encoded command text can be normalized for all XML-based tool invocation flows.

### Goal

Return decoded tool-argument text from XML parsing so `run_bash` executes the intended shell command.

### Preconditions

- XML tool-call content or XML `<arguments>` payload contains entity-encoded text such as `&amp;&amp;`.

### Expected Outcome

- Parsed leaf text values are decoded once before the invocation reaches the tool executor.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts:parseXmlArguments(content)
├── autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts:parseXmlFragment(fragment) [STATE]
├── autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts:decodeXmlEntitiesOnce(trimmedInner) [STATE]
└── return parsed arguments record [STATE]
```

```text
[ENTRY] autobyteus-ts/src/agent/streaming/adapters/invocation-adapter.ts:handleEnd(event)
├── autobyteus-ts/src/agent/streaming/adapters/tool-syntax-registry.ts:buildRunBashArgs(metadata, content) [STATE]
└── ToolInvocation('run_bash', { command: decodedCommand, ... }) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if malformed entity sequence is present
autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts:decodeXmlEntitiesOnce(value)
└── leave non-decodable fragments untouched rather than corrupting command text
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
