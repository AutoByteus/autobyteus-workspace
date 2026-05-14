# Design Spec

## Current-State Read

The reported corruption lives on the agent terminal-tool path, not the server terminal path.

Current foreground `run_bash` flow:

`Agent tool invocation -> run-bash.ts -> TerminalSessionManager -> getDefaultSessionFactory() -> PtySession on macOS/Linux -> interactive shell prompt detection -> TerminalResult`

Current background process flow:

`Agent tool invocation -> run-bash.ts(background=true) or start-background-process.ts -> BackgroundProcessManager -> getDefaultSessionFactory() -> PtySession/WslTmuxSession -> session read loop -> synthetic bg_### process id`

Current server interactive terminal flow:

`Web xterm -> websocket terminal endpoint -> TerminalHandler -> server PtySessionManager -> getDefaultSessionFactory() -> PtySession/WslTmuxSession -> streamed terminal bytes`

Important current facts:

- `run_bash` is stateless in practice. It creates and closes a fresh `TerminalSessionManager` per foreground call, so it does not preserve `cd`, exported variables, or other shell state across calls.
- The default foreground path still uses an interactive PTY on macOS/Linux. Repro probes show large one-shot heredoc writes through this PTY path corrupt or fail while the same command through a direct non-PTY shell preserves exact bytes.
- `BackgroundProcessManager` also uses terminal sessions/PTYs and exposes synthetic public ids such as `bg_001`.
- `BackgroundProcessManager.listProcesses()` exists internally, but there is no registered `get_background_processes` tool.
- `get_process_output` and `stop_background_process` currently take `process_id`, which refers to the synthetic id, not a real OS PID.
- Tool docs and XML usage examples still describe stateful terminal behavior and a `background` attribute on `run_bash`, both of which conflict with the approved target contract.
- The server/web terminal is a real interactive terminal. It uses websocket input, resize, and streamed output, so PTY remains correct there.

Constraints the target design must respect:

- Agent `run_bash` must be non-PTY and stateless.
- Normal bash syntax must remain the primary agent interface. The agent should be able to run `npm run dev > server.log 2>&1 &` without a special tool parameter.
- Public process identity must be PID-only. Do not expose both `bg_001` and `pid`, and do not expose process-group id by default.
- Keep `start_background_process` as a convenience interface, but make it share the same PID-based non-PTY owner.
- Keep PTY-backed behavior for server/web interactive terminal sessions.
- Do not implement compatibility wrappers or dual paths for the replaced in-scope behavior.

## Intended Change

Replace agent command execution with a non-interactive process-spawn execution owner under the terminal tool capability area.

Target foreground `run_bash` flow:

`Agent tool invocation -> run-bash.ts thin facade -> ShellCommandExecutor -> NonInteractiveShellResolver -> child_process.spawn(shell -lc command) -> TerminalResult + observed backgroundProcesses[]`

Target background tracking flow for bash-native commands:

`ShellCommandExecutor -> ProcessGroupObserver -> BackgroundProcessManager.adoptObservedProcesses(...) -> PID-keyed background registry -> get_background_processes/get_process_output/stop_background_process`

Target background convenience flow:

`start_background_process.ts thin facade -> BackgroundProcessManager.startCommand(...) -> NonInteractiveShellResolver -> child_process.spawn(detached shell -lc command) -> PID-keyed background registry`

Server terminal remains:

`Web xterm -> websocket terminal endpoint -> TerminalHandler -> server PtySessionManager -> PtySession/WslTmuxSession`

Public result shape principle:

```json
{
  "stdout": "",
  "stderr": "",
  "exitCode": 0,
  "timedOut": false,
  "effectiveCwd": "/path/to/app",
  "backgroundProcesses": [
    {
      "pid": 12345,
      "status": "running",
      "command": "npm run dev > server.log 2>&1 &",
      "startedAt": "2026-05-14T...Z",
      "effectiveCwd": "/path/to/app"
    }
  ]
}
```

`pid` is the only public process identity. The implementation may track process groups, child-tree membership, WSL distro identity, and output-buffer ownership internally, but these must not compete with `pid` in the default agent-facing result.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Refactor + Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - Known-good multi-line HTML heredoc corrupts through current default `run_bash` PTY path with exit code 0.
  - The same heredoc writes exact bytes through a non-PTY/direct-shell path.
  - Chunked PTY writes make the command reliable, proving the shell command and HTML content are not inherently invalid.
  - `run_bash` creates and closes a fresh session per call, so PTY provides no valuable persistent state for the foreground tool.
  - Server/web terminal has a separate real interactive use case where PTY is still appropriate.
- Design response:
  - Create a non-PTY command-execution owner for agent terminal tools.
  - Make `run_bash` a thin public facade over that owner.
  - Rewrite background process tracking around OS PIDs and spawned process groups, not terminal sessions.
  - Keep PTY session infrastructure only for interactive terminal sessions.
- Refactor rationale:
  - Fixing `PtySession.write()` by chunking would preserve the wrong owner and still expose prompt detection, command echo, terminal wrapping, CR artifacts, and interactive-shell lifecycle to a stateless command tool.
  - The approved behavior requires normal bash commands plus PID-based process tracking, which is a process-spawn concern rather than a terminal-session concern.
- Intentional deferrals and residual risk, if any:
  - The separate OpenAI Responses continuation/reasoning-item issue found during live probing is outside this change. It is not needed to explain file corruption and should be tracked separately if it remains reproducible.
  - Perfect adoption of processes that intentionally daemonize into a different session/process group may be limited. The in-scope guarantee is to observe and track ordinary bash background jobs that remain in the spawned shell's process group, which covers typical agent commands such as `npm run dev > server.log 2>&1 &`.

## Terminology

- `Agent command execution`: stateless one-shot shell-command execution for LLM tools.
- `Interactive terminal session`: long-lived PTY-backed terminal used by server/web xterm.
- `Background process`: a live OS process started or adopted by agent command execution and exposed publicly by PID.
- `Process group`: internal cleanup/tracking metadata used by the background manager. It is not a public identity.
- `PID`: the only public process identity accepted and returned by background-process tools.

## Design Reading Order

Read this design spine-first:

1. DS-001 / DS-002 explain command execution and background lifecycle.
2. DS-003 explains why server terminal remains PTY-backed and separate.
3. File responsibilities and folder mapping derive from those owners.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove agent command-tool dependency on `TerminalSessionManager`/`PtySession`; remove synthetic public process ids; remove `run_bash` background parameter from the public schema/usage path; remove docs that claim stateful `run_bash` behavior.
- The design must not keep a PTY fallback for agent command execution. PTY fallback remains only in the interactive terminal session subsystem.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent tool invocation for foreground `run_bash` | `TerminalResult` and filesystem side effects | `ShellCommandExecutor` | This is the corrupted HTML path and the main bug fix. |
| DS-002 | Primary End-to-End | Bash-native background command or `start_background_process` invocation | PID-keyed background registry entry and process metadata | `BackgroundProcessManager` | This owns long-running process lifecycle without PTY and enforces PID-only identity. |
| DS-003 | Primary End-to-End | Web terminal/xterm input | Streamed interactive terminal output | Server `PtySessionManager` / terminal streaming service | This is the valid PTY use case that must remain separate. |
| DS-004 | Return-Event | Background process stdout/stderr bytes | `get_process_output` result | `BackgroundProcessManager` | This lets agents inspect server output after `run_bash` returns. |
| DS-005 | Bounded Local | Spawned foreground shell process | Process group scan/adoption after shell exit | `ShellCommandExecutor` + `ProcessGroupObserver` | This detects ordinary bash background jobs without parsing command text. |

## Primary Execution Spine(s)

- DS-001: `Agent runtime -> run_bash tool facade -> ShellCommandExecutor -> NonInteractiveShellResolver -> spawned shell process -> TerminalResult/filesystem`
- DS-002: `Agent runtime -> run_bash/start_background_process facade -> BackgroundProcessManager -> spawned/adopted OS process -> PID-keyed registry`
- DS-003: `Web xterm -> websocket terminal endpoint -> TerminalHandler -> server PtySessionManager -> PtySession/WslTmuxSession`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The agent submits a bash command. The tool facade resolves cwd and delegates to a non-interactive executor. The executor selects the correct shell invocation, spawns it with pipes, captures stdout/stderr, enforces timeout, and returns a clean `TerminalResult`. | Tool invocation, command executor, shell process, terminal result | `ShellCommandExecutor` | cwd validation, shell selection, timeout, output capture, background adoption |
| DS-002 | A command either starts through the dedicated start tool or leaves background descendants after a normal bash `&`. The background manager records PID-keyed metadata, owns output buffers, refreshes status, and stops process groups when requested. | Background command, OS process, PID registry, background-process tools | `BackgroundProcessManager` | process-group tracking, output buffering, WSL kill/status adaptation |
| DS-003 | The UI sends terminal keystrokes/resizes over websocket. The server terminal owner manages a long-lived PTY session and streams output back. | xterm client, websocket handler, PTY session manager, PTY backend | Server terminal streaming service | terminal resize, PTY startup/fallback, byte streaming |
| DS-004 | Background process streams are appended to an output buffer. `get_process_output(pid)` reads recent lines from the buffer and reports current running status. | Background process record, output buffer, output tool result | `BackgroundProcessManager` | ANSI stripping, line limiting, exited-process refresh |
| DS-005 | After a foreground shell exits, the executor checks the shell's process group for surviving members. Any survivors are adopted as background processes using their real PIDs. | Shell process, process group, live descendants, registry | `ShellCommandExecutor` owns sequence; `ProcessGroupObserver` owns platform query | `ps`/kill probing, WSL process lookup, daemonization edge cases |

## Spine Actors / Main-Line Nodes

- Agent runtime / tool invocation execution
- `run_bash` tool facade
- `ShellCommandExecutor`
- `NonInteractiveShellResolver`
- Spawned shell process
- `BackgroundProcessManager`
- Background OS process / PID registry
- Background process tools (`start_background_process`, `get_background_processes`, `get_process_output`, `stop_background_process`)
- Server terminal streaming service for the separate PTY spine

## Ownership Map

- `run_bash` tool facade owns public argument validation, cwd resolution, and result exposure only. It must not own process spawning, timeout policy, PTY behavior, or background adoption.
- `ShellCommandExecutor` owns foreground command lifecycle: spawn, stdout/stderr capture, timeout, exit code, and adoption check after shell exit.
- `NonInteractiveShellResolver` owns platform-specific shell command construction: POSIX `bash -lc`, shell fallback, and WSL command/cwd conversion.
- `ProcessGroupObserver` owns platform-specific process-group inspection and status probing.
- `BackgroundProcessManager` owns PID-keyed background lifecycle: start, adopt, list, output, status refresh, stop, and cleanup.
- `OutputBuffer` remains a bounded storage concern serving `BackgroundProcessManager`.
- `TerminalSessionManager`, `PtySession`, `WslTmuxSession`, and `DirectShellSession` remain interactive terminal/session infrastructure. They must not govern agent command execution after this refactor.
- Server `PtySessionManager` owns interactive terminal websocket sessions and is not changed into a command executor.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `tools/terminal/tools/run-bash.ts` | `ShellCommandExecutor` | LLM-facing tool registration and cwd argument handling | PTY/session lifecycle, shell spawning, process-group policy |
| `tools/terminal/tools/start-background-process.ts` | `BackgroundProcessManager` | Convenience tool for agents that do not use bash `&` | Separate process identity or separate background manager |
| `tools/terminal/tools/get-background-processes.ts` | `BackgroundProcessManager` | LLM-facing listing of tracked PIDs | Status probing outside the manager |
| `tools/terminal/tools/get-process-output.ts` | `BackgroundProcessManager` | LLM-facing output read by PID | Output buffer ownership outside the manager |
| `tools/terminal/tools/stop-background-process.ts` | `BackgroundProcessManager` | LLM-facing stop by PID | Direct ad hoc kill logic outside the manager |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `run_bash` foreground dependency on `TerminalSessionManager` | It causes PTY corruption and prompt/echo contamination for a stateless command tool | `ShellCommandExecutor` | In This Change | Remove imports and tests expecting TerminalSessionManager use. |
| Session-backed `BackgroundProcessManager` implementation | Background process lifecycle is process-spawn/registry ownership, not PTY session ownership | PID-keyed process-spawn `BackgroundProcessManager` | In This Change | Existing filename may be rewritten or moved under command-execution; no PTY fallback remains. |
| Synthetic public ids (`bg_001`, `processId`) | User approved PID-only identity to avoid agent confusion | `pid` in `BackgroundProcessInfo` | In This Change | Internal maps may use PID as key and hidden process group metadata. |
| Public `process_id` argument on output/stop tools | It encodes legacy synthetic id language | `pid` argument | In This Change | Update schemas, tool descriptions, tests, and docs. |
| Public `run_bash` `background` parameter/attribute as primary path | Approved contract is bash-native command syntax plus retained `start_background_process` convenience | normal bash `&` detection/adoption and `start_background_process` | In This Change | Remove from `run_bash` schema/usage examples/parser metadata. |
| Parser-state extraction of `run_bash` `background` metadata | It would keep a legacy public metadata surface even if tool schema/adapter cleanup is done | Parser states emit only supported `run_bash` metadata such as `timeout_seconds`; adapter receives no `background` metadata | In This Change | Delete all `background` recognition from `custom-xml-tag-run-bash-parsing-state.ts` and `xml-run-bash-tool-parsing-state.ts`. There must be no background-specific compatibility branch, alias, or parse-and-ignore legacy path; unsupported `background` syntax has no semantic effect and must not produce public metadata or args. |
| Docs claiming stateful `run_bash` | Current and target behavior is stateless | Updated terminal tools docs | In This Change | Document server terminal as separate interactive capability if needed. |
| Any agent-command PTY fallback branch | Would retain the faulty boundary | Non-PTY executor only | In This Change | PTY remains only for server interactive terminal/session APIs. |

## Return Or Event Spine(s) (If Applicable)

- DS-004 return flow: `Background OS process stdout/stderr -> stream listeners -> OutputBuffer -> get_process_output(pid) -> agent tool result`
- Foreground return flow: `spawned shell exit/timeout -> ShellCommandExecutor normalizes output/exit/timedOut/effectiveCwd/backgroundProcesses -> run_bash tool result -> agent runtime event history`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ShellCommandExecutor`
  - Chain: `spawn shell -> collect stdout/stderr -> wait for exit or timeout -> scan process group -> adopt survivors -> build TerminalResult`
  - Why it matters: this local sequence replaces prompt detection and prevents PTY artifacts from entering command output.
- Parent owner: `BackgroundProcessManager`
  - Chain: `register process -> attach output streams -> append buffers -> refresh status on read/list/stop -> remove or mark stopped`
  - Why it matters: status/output lifecycle must stay centralized so all background tools agree.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| cwd resolution | DS-001, DS-002 | Tool facades | Validate workspace-root-relative and absolute cwd | Public tools need consistent cwd behavior | Executor would mix public argument policy with process lifecycle. |
| Shell selection | DS-001, DS-002 | `ShellCommandExecutor`, `BackgroundProcessManager` | Build POSIX/WSL non-interactive shell invocation | Platform variance must be isolated | Tool facades would duplicate platform policy. |
| Process group observation | DS-002, DS-005 | `ShellCommandExecutor`, `BackgroundProcessManager` | Detect live survivors and probe status | Enables bash-native background adoption without text parsing | Command executor would become platform-specific and harder to test. |
| Output buffering | DS-004 | `BackgroundProcessManager` | Bounded recent-output storage | Background processes outlive the tool call | Return/event state would scatter across tools. |
| ANSI stripping/line limiting | DS-004 | `get_process_output` via manager | Human/agent-readable recent output | Existing behavior should remain readable | Process registry would expose raw terminal artifacts. |
| Tool usage docs/schema/parser metadata | DS-001, DS-002 | Public tool facades and streaming parser surface | Teach bash-native syntax and PID-only identity; prevent stale XML `background` metadata from reaching tool args | LLM behavior follows schemas/examples and parser metadata controls shorthand invocations | Agents or old examples would keep using obsolete `background` or `bg_001`. |
| Server terminal PTY | DS-003 | Server terminal streaming service | Interactive terminal semantics | Separate valid PTY use case | Changing it with command execution would break xterm behavior. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Tool registration and schemas | `src/tools/terminal/tools` | Reuse | Existing public tool entrypoint pattern is correct | N/A |
| Bounded output buffers | `src/tools/terminal/output-buffer.ts` | Reuse | Existing ring buffer fits background output | N/A |
| WSL distro/path utilities | `src/tools/terminal/wsl-utils.ts` | Reuse/Extend | Existing WSL selection and path conversion are useful | N/A |
| Interactive PTY sessions | `TerminalSessionManager`/`PtySession`/`WslTmuxSession` | Reuse only for server terminal/session APIs | Correct for DS-003, wrong for DS-001/DS-002 | N/A |
| Stateless command execution | Current terminal sessions | Create New | No current owner executes non-interactive one-shot commands and adopts background descendants | Terminal sessions own interaction/prompt semantics, not one-shot command lifecycle. |
| PID-keyed background registry | Current `BackgroundProcessManager` file | Extend/Rebuild | Name/category fits, implementation does not | Existing implementation is session-backed and synthetic-id-based. |
| Run-bash XML parser metadata cleanup | Existing streaming parser state files | Reuse/Modify | These files already own extraction of run-bash XML metadata | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Terminal tool public facades | Tool schemas, argument names, cwd resolution, registry integration | DS-001, DS-002, DS-004 | `ShellCommandExecutor`, `BackgroundProcessManager` | Reuse | Keep facades thin. |
| Agent command execution | Non-PTY spawn, foreground result, timeout, background adoption | DS-001, DS-005 | `ShellCommandExecutor` | Create New | New owner under terminal capability area. |
| Background process management | PID registry, process-group metadata, output buffers, list/output/stop | DS-002, DS-004 | `BackgroundProcessManager` | Extend/Rebuild | Replaces session-backed implementation. |
| Interactive terminal sessions | PTY/WslTmux/direct interactive sessions, prompt handling | DS-003 | Server terminal streaming / session APIs | Reuse | Must be isolated from agent command execution. |
| Tool usage formatting/parser metadata | XML/tool schemas, examples, parser-state metadata extraction, and invocation adapter mapping | DS-001, DS-002 | Public tool facades and streaming invocation pipeline | Modify | Remove obsolete background attribute, remove parser-state `background` extraction, and remove PID naming drift. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `command-execution/shell-command-executor.ts` | Agent command execution | `ShellCommandExecutor` | Foreground command lifecycle and adoption sequence | One owner for one-shot command execution | `TerminalResult`, `BackgroundProcessInfo` |
| `command-execution/non-interactive-shell-resolver.ts` | Agent command execution | `NonInteractiveShellResolver` | POSIX/WSL shell command construction | Platform selection is distinct from process lifecycle | WSL utilities |
| `command-execution/process-group-observer.ts` | Background process management | `ProcessGroupObserver` | Scan/probe/kill process groups and PIDs | Platform process lookup is distinct from registry state | PID/process group metadata |
| `command-execution/background-process-manager.ts` or rewritten `background-process-manager.ts` | Background process management | `BackgroundProcessManager` | PID registry, start/adopt/list/output/stop | One lifecycle owner for background processes | `OutputBuffer`, shared types |
| `types.ts` | Terminal tool shared data structures | Public terminal-tool types | `TerminalResult`, `BackgroundProcessInfo`, `BackgroundProcessOutput` | Shared result shapes used by several tools | N/A |
| `tools/run-bash.ts` | Terminal tool public facades | `run_bash` facade | Tool schema, cwd resolution, delegate to executor | Public entrypoint only | Shared executor/types |
| `tools/get-background-processes.ts` | Terminal tool public facades | listing facade | `get_background_processes` registration and manager delegation | New public tool subject | Shared manager/types |
| `tools/get-process-output.ts` | Terminal tool public facades | output facade | PID argument schema, manager delegation | Public output query only | Shared manager/types |
| `tools/stop-background-process.ts` | Terminal tool public facades | stop facade | PID argument schema, manager delegation | Public stop command only | Shared manager/types |
| `tools/start-background-process.ts` | Terminal tool public facades | start convenience facade | Start command through same manager | Public convenience command only | Shared manager/types |
| `agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts` | Streaming parser metadata | Custom XML run-bash parser state | Delete `background` recognition from `<run_bash ...>` attributes; continue supported metadata such as `timeout_seconds` | This file owns custom `<run_bash>` attribute metadata | N/A |
| `agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts` | Streaming parser metadata | Generic `<tool name="run_bash">` parser state | Delete `background` recognition from opening attributes and `<arg name="background">`; continue command and supported timeout metadata | This file owns structured XML run-bash argument metadata | N/A |
| `agent/streaming/adapters/tool-syntax-registry.ts` | Parser metadata adapter | Segment-to-tool-args mapper | Stop mapping any residual `metadata.background` into `run_bash` arguments | Adapter is the final guard before tool invocation args | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Background process metadata | `src/tools/terminal/types.ts` | Terminal tool shared data structures | Used by `run_bash`, list, start, output, stop | Yes: only `pid`, no `processId` | Yes: no `bg_###` plus OS PID | Kitchen-sink process model with public process-group id |
| Shell invocation selection | `command-execution/non-interactive-shell-resolver.ts` | Agent command execution | Used by foreground and background start | Yes | Yes | Generic service locator |
| Process probing/kill | `command-execution/process-group-observer.ts` | Background process management | Used by adoption, list, stop | Yes | Yes | Public API leaking process-group ids |
| Background manager retrieval from context | A small exported `getBackgroundProcessManager(context)` in the manager/facade area | Background process management | Currently duplicated across tools | Yes | Yes | Hidden global policy outside manager ownership |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TerminalResult.backgroundProcesses` | Yes | Yes | Low | Array contains only PID-keyed public process records. Omit or empty when none. |
| `BackgroundProcessInfo` | Yes | Yes | Low | Fields: `pid`, `status`, `command`, `startedAt`, `effectiveCwd`; no public `processId` or `processGroupId`. |
| `BackgroundProcessOutput` | Yes | Yes | Low | Fields: `pid`, `output`, `isRunning`, optional `error`. |
| Internal background record | Yes | Yes | Medium | May contain hidden process group, WSL distro, streams, buffers; never returned directly. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts` | Agent command execution | `ShellCommandExecutor` | Execute foreground `run_bash` without PTY, capture outputs, handle timeout, call adoption after exit | Central lifecycle owner for DS-001 | `TerminalResult`, shell resolver, process observer, background manager |
| `autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver.ts` | Agent command execution | `NonInteractiveShellResolver` | Build shell executable/args/cwd/env for POSIX, Android, and WSL | Keeps platform shell policy out of tool facades | WSL utilities |
| `autobyteus-ts/src/tools/terminal/command-execution/process-group-observer.ts` | Background process management | `ProcessGroupObserver` | Discover live PIDs in spawned process groups; probe running status; stop groups internally | Isolates platform process-tree behavior | Internal process metadata |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts` | Background process management | `BackgroundProcessManager` | PID-keyed registry, start/adopt/list/output/stop, output buffers | Existing file name fits the owner; implementation is replaced | OutputBuffer, ProcessGroupObserver, shared types |
| `autobyteus-ts/src/tools/terminal/types.ts` | Terminal tool shared data structures | Public result/type owner | Tight PID-only public result classes/interfaces | Prevents duplicated/overlapping DTOs across tools | N/A |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Terminal tool public facades | `run_bash` facade | Resolve cwd, validate public args, delegate to `ShellCommandExecutor`, register schema | Keeps public boundary thin | Executor/types |
| `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | Terminal tool public facades | `start_background_process` facade | Resolve cwd and delegate to `BackgroundProcessManager.startCommand` | Convenience start path, no separate policy | Manager/types |
| `autobyteus-ts/src/tools/terminal/tools/get-background-processes.ts` | Terminal tool public facades | `get_background_processes` facade | List PID-keyed tracked background processes | New public query subject | Manager/types |
| `autobyteus-ts/src/tools/terminal/tools/get-process-output.ts` | Terminal tool public facades | `get_process_output` facade | Read output by `pid` | Public query only | Manager/types |
| `autobyteus-ts/src/tools/terminal/tools/stop-background-process.ts` | Terminal tool public facades | `stop_background_process` facade | Stop by `pid` through manager | Public command only | Manager/types |
| `autobyteus-ts/src/tools/register-tools.ts` | Tool registration | Registry bootstrap | Register `get_background_processes` and updated terminal tools | Central tool registration already exists | Tool facades |
| `autobyteus-ts/src/tools/usage/formatters/run-bash-xml-schema-formatter.ts` | Tool usage formatting | Public usage docs | Explain stateless non-PTY `run_bash`, bash-native background syntax, no background attr | Prevents model misuse | Tool schema |
| `autobyteus-ts/src/tools/usage/formatters/run-bash-xml-example-formatter.ts` | Tool usage formatting | Public examples | Replace background attr example with normal bash `&` or `start_background_process` reference | Teaches approved UX | Tool schema |
| `autobyteus-ts/src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts` | Streaming parser metadata | Custom XML run-bash parser state | Delete `background` attribute parsing from `<run_bash ...>`; no background-specific compatibility handling remains and no background value enters segment metadata | Closes the legacy custom-tag metadata surface identified in DR-001 | N/A |
| `autobyteus-ts/src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts` | Streaming parser metadata | Structured XML run-bash parser state | Delete `background` extraction from opening attributes and `<arg name="background">`; no background-specific compatibility handling remains and no background value enters segment metadata | Closes the legacy structured-tool metadata surface identified in DR-001 | N/A |
| `autobyteus-ts/src/agent/streaming/adapters/tool-syntax-registry.ts` | Parser metadata adapter | XML shorthand mapper | Stop mapping `background` metadata into `run_bash` args | Removes obsolete public parameter | N/A |
| `autobyteus-ts/docs/terminal_tools.md` | Durable docs | Terminal tool docs | Correct stateless behavior, PID-only identity, server PTY separation | Prevents stale design claims | N/A |

## Ownership Boundaries

The authoritative boundary for agent command execution is `ShellCommandExecutor`. Any caller wanting to execute a foreground shell command must go through `run_bash` or this executor, not through `TerminalSessionManager`.

The authoritative boundary for tracked background processes is `BackgroundProcessManager`. Any caller wanting to start, adopt, list, read output, or stop background processes must go through this manager. Tool facades must not directly inspect process groups or kill processes.

The authoritative boundary for interactive terminal sessions remains the server terminal streaming service and its `PtySessionManager`. Agent command execution must not depend on server terminal internals, and server terminal code must not be rewritten around `ShellCommandExecutor`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ShellCommandExecutor` | child_process spawn, shell resolver, timeout, output capture, adoption sequence | `run_bash` facade | `run_bash` creating `TerminalSessionManager` or spawning directly | Add executor methods/options, not facade logic |
| `BackgroundProcessManager` | PID registry, process group metadata, output buffers, status refresh, stop escalation | start/list/output/stop facades and `ShellCommandExecutor` adoption | Tools calling `process.kill` or `ps` directly | Add manager methods |
| `NonInteractiveShellResolver` | POSIX/WSL shell executable, args, cwd conversion | command executor and background manager | Platform shell code in every tool | Extend resolver variants |
| Streaming run-bash parser states | Supported run-bash XML metadata extraction (`command`, `cwd`, `timeout_seconds` where applicable) | Streaming parser and invocation adapter | Emitting legacy `background` metadata from stale XML attributes or args | Remove extraction in parser state, not only adapter mapping |
| Server terminal streaming service | PTY lifecycle, resize, websocket byte streaming | web terminal routes/components | Agent tools importing server PTY manager or changing global default for command execution | Keep separate interactive-session APIs |

## Dependency Rules

Allowed:

- Tool facades may depend on cwd resolution helpers, `ShellCommandExecutor`, `BackgroundProcessManager`, and shared terminal types.
- `ShellCommandExecutor` may depend on `NonInteractiveShellResolver`, `ProcessGroupObserver`, `BackgroundProcessManager`, and shared types.
- `BackgroundProcessManager` may depend on `OutputBuffer`, `ProcessGroupObserver`, `NonInteractiveShellResolver`, and shared types.
- Server terminal code may continue depending on terminal-session infrastructure.

Forbidden:

- Agent `run_bash` must not instantiate or call `TerminalSessionManager`, `PtySession`, or `WslTmuxSession`.
- `BackgroundProcessManager` must not depend on `TerminalSession` or session factories.
- Public tool results must not expose both synthetic id and OS PID.
- Public background tools must not accept both `process_id` and `pid` as compatibility aliases.
- Streaming parser states must not emit `background` metadata for `run_bash` from stale XML attributes or `<arg>` nodes.
- `getDefaultSessionFactory()` must not be changed globally to fix `run_bash`; that would break/alter server terminal ownership.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `runBash(context, command, cwd?, timeoutSeconds?)` | Foreground command execution | Run exact bash command, return result and adopted background processes | command string, cwd | Remove public `background` parameter from schema/primary function if possible; if TypeScript refactor needs overload cleanup, do clean-cut update. |
| `ShellCommandExecutor.execute(command, options)` | Command lifecycle | Spawn shell, capture output, timeout, adopt survivors | command + resolved cwd | Internal API. |
| `BackgroundProcessManager.startCommand(command, cwd)` | Background process start | Start long-running command and register PID | command + resolved cwd | Used by `start_background_process`. |
| `BackgroundProcessManager.adoptObservedProcesses(...)` | Background adoption | Register live PIDs from process group observation | PID(s), internal process group metadata | Called by executor after foreground shell exits. |
| `BackgroundProcessManager.listProcesses()` | Process list | Return tracked background processes | none/context manager instance | Public result uses `pid`. |
| `BackgroundProcessManager.getOutput(pid, lines?)` | Background output | Return recent output/status | `pid: number` | No synthetic id. |
| `BackgroundProcessManager.stopProcess(pid)` | Background stop | Stop process/process group and cleanup | `pid: number` | Internally may kill hidden process group. |
| `get_background_processes` tool | Process list query | Expose tracked processes to agent | none | New registered tool. |
| `get_process_output` tool | Process output query | Expose recent output by PID | `pid` | Rename schema arg from `process_id`. |
| `stop_background_process` tool | Process stop command | Stop by PID | `pid` | Rename schema arg from `process_id`. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `run_bash` | Yes | Yes | Low | Command string only; background detection is observed side effect, not a separate mode. |
| `start_background_process` | Yes | Yes | Low | Starts background command; returns PID. |
| `get_background_processes` | Yes | Yes | Low | Lists tracked PIDs. |
| `get_process_output` | Yes | Yes | Low | Takes `pid` only. |
| `stop_background_process` | Yes | Yes | Low | Takes `pid` only. |
| Internal process observer | Yes | Yes | Medium | Keep process group identity internal to avoid public ambiguity. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Command executor | `ShellCommandExecutor` | Yes | Low | Owns shell command lifecycle. |
| Shell resolver | `NonInteractiveShellResolver` | Yes | Low | Makes non-PTY intent explicit. |
| Process scanner | `ProcessGroupObserver` | Yes | Medium | Use only if implementation truly observes groups; otherwise name `ProcessTreeObserver`. |
| Background registry | `BackgroundProcessManager` | Yes | Low | Existing name remains accurate after rewrite. |
| Public process identity | `pid` | Yes | Low | Remove `processId`/`process_id`. |

## Applied Patterns (If Any)

- Facade: public tool files remain thin facades over governing owners.
- Registry/manager: `BackgroundProcessManager` owns PID-keyed lifecycle state.
- Adapter/resolver: `NonInteractiveShellResolver` adapts platform-specific shell invocation into a stable executor contract.
- Bounded worker/listener loop: background output listeners append to `OutputBuffer` inside `BackgroundProcessManager`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/command-execution/` | Folder | Agent command execution | Non-PTY command execution internals | Separates process-spawn command lifecycle from interactive terminal sessions | Tool registration boilerplate, websocket terminal code |
| `.../shell-command-executor.ts` | File | `ShellCommandExecutor` | Foreground execution, timeout, adoption sequence | Main DS-001 owner | Platform `ps` parsing details beyond observer API |
| `.../non-interactive-shell-resolver.ts` | File | `NonInteractiveShellResolver` | POSIX/WSL shell invocation/cwd conversion | Platform construction concern | Process registry state |
| `.../process-group-observer.ts` | File | `ProcessGroupObserver` | Scan/probe/stop process groups/PIDs | Platform process-tree concern | Public tool schemas |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts` | File | `BackgroundProcessManager` | PID registry and background lifecycle | Existing terminal background owner, rewritten | TerminalSession/PTYSessions, synthetic ids |
| `autobyteus-ts/src/tools/terminal/tools/` | Folder | Public tool facades | LLM-facing terminal tools | Existing public tool pattern | Process-spawn internals |
| `autobyteus-ts/src/tools/terminal/types.ts` | File | Public terminal-tool type owner | Tight result models | Existing shared type location | Parallel process id representations |
| `autobyteus-ts/src/agent/streaming/parser/states/*run-bash*` | Files | Streaming parser metadata | Remove legacy `background` extraction from run-bash parser states | Existing parser states own this metadata surface | Tool execution, process lifecycle, compatibility aliases |
| `autobyteus-ts/docs/terminal_tools.md` | File | Durable docs | Explain current public contract | Existing docs path | Claims of stateful run_bash or PTY agent execution |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/tools/terminal/tools` | Transport/Public Facade | Yes | Low | Public tool wrappers only. |
| `src/tools/terminal/command-execution` | Main-Line Domain-Control | Yes | Low | New owner for non-PTY command lifecycle. |
| `src/tools/terminal` root | Mixed Justified | Yes | Medium | Existing terminal capability area contains shared types, output buffer, manager, and session infra. Keep file responsibilities explicit. |
| `autobyteus-server-ts/src/services/terminal-streaming` | Transport/Main-Line Domain-Control for server terminal | Yes | Low | Separate package/service for interactive terminal. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Bash-native background | `run_bash(command: "npm run dev > server.log 2>&1 &")` returns `{ backgroundProcesses: [{ pid: 12345, ... }] }` | Requiring `run_bash(background=true, command:"npm run dev")` as the only managed path | Agents already know bash; tool should observe actual background processes. |
| PID-only identity | `stop_background_process({ pid: 12345 })` | `stop_background_process({ process_id:"bg_001" })` plus result also showing `osPid` | Two public ids confuse agents and violate approved requirement. |
| Non-PTY foreground | `spawn("bash", ["-lc", command], { stdio:"pipe" })` | `TerminalSessionManager -> PtySession.write(huge heredoc)` | Avoids corruption, prompt detection, echo, and line wrapping. |
| Server terminal separation | xterm websocket continues using PTY manager | Changing `getDefaultSessionFactory()` globally to direct shell | Global change would alter the valid interactive terminal owner. |
| Legacy parser metadata cleanup | Supported run-bash XML omits `background`; implementation deletes all background-specific parsing. If unknown attributes are generically tolerated, `<run_bash background="true">echo hi</run_bash>` has no background semantics and emits no `background` metadata/arg; `<arg name="background">true</arg>` is not recognized for `run_bash` | Parser states keep a legacy branch that recognizes `{ background: true }` and adapter later drops it | Clean-cut removal must happen at the parser metadata surface, not only in final tool args. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep PTY for `run_bash` but chunk writes | It made repros pass in some PTY cases | Rejected | Replace agent command execution with non-PTY spawn. |
| Keep `background` parameter on `run_bash` as parallel path | Existing schema/tests include it | Rejected | Use normal bash syntax and `start_background_process` convenience. |
| Parse stale run-bash XML `background` metadata and ignore it later | Would preserve old parser metadata for compatibility while hiding it from tool args | Rejected | Remove extraction in `custom-xml-tag-run-bash-parsing-state.ts` and `xml-run-bash-tool-parsing-state.ts`; stale background attributes/args must not appear in segment metadata or tool args. |
| Accept both `process_id` and `pid` | Would reduce migration friction | Rejected | Public identity is `pid` only; update schemas/tests/docs. |
| Return both `processId` and `pid` | Internal manager currently has synthetic ids | Rejected | Use PID-only result shape; internal metadata stays hidden. |
| Change `getDefaultSessionFactory()` to direct shell globally | Quick way to avoid PTY in `run_bash` | Rejected | Keep session factory for interactive terminal; route agent tools to new executor. |
| Keep old docs claiming stateful terminal tools | Avoid docs churn | Rejected | Docs must describe stateless `run_bash` and PID tools. |

## Derived Layering (If Useful)

- Public tool layer: LLM-facing schemas and functions in `src/tools/terminal/tools`.
- Command execution layer: non-PTY spawn and foreground lifecycle in `src/tools/terminal/command-execution`.
- Background lifecycle layer: PID-keyed process manager and output buffers.
- Interactive terminal layer: existing PTY/session classes and server terminal streaming. This layer is separate, not below the command execution layer.

## Migration / Refactor Sequence

1. Tighten shared terminal result types in `src/tools/terminal/types.ts`:
   - Add `BackgroundProcessInfo` with public `pid` only.
   - Update `BackgroundProcessOutput` and process-listing shape to use `pid`.
   - Add optional/empty `backgroundProcesses` on `TerminalResult`.
2. Add the non-PTY command-execution internals:
   - `command-execution/non-interactive-shell-resolver.ts`
   - `command-execution/process-group-observer.ts`
   - `command-execution/shell-command-executor.ts`
3. Rewrite `BackgroundProcessManager` around child-process spawn/adoption and PID-keyed registry:
   - Remove `TerminalSession`, `getDefaultSessionFactory`, fallback session factory, and synthetic id generation.
   - Keep output buffering centralized.
4. Update public tools:
   - `run-bash.ts` delegates to `ShellCommandExecutor`, removes `background` schema/param path, and returns background processes detected from normal bash syntax.
   - `start-background-process.ts` delegates to the same manager and returns `pid`.
   - `get-process-output.ts` and `stop-background-process.ts` accept `pid`.
   - Add `get-background-processes.ts` and register it.
5. Update parser/usage/schema docs and parser-state metadata extraction:
   - Remove `background` attribute mapping from run-bash XML adapter in `src/agent/streaming/adapters/tool-syntax-registry.ts`.
   - Remove `background` extraction from `src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.ts`. Delete the `background` attribute recognition code. Do not add a background-specific ignore/compatibility branch. If the generic XML tag parser still accepts unknown attributes, that is generic parser behavior only; `background` has no semantic effect and must not emit public metadata.
   - Remove `background` extraction from `src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.ts`. Delete the `<arg name="background">` and opening-tag `background` recognition code. Do not add a background-specific ignore/compatibility branch. `background` has no semantic effect and must not emit public metadata or tool args.
   - Continue supported `timeout_seconds` / `timeoutSeconds` metadata unless implementation discovers a separate reason to remove it.
   - Update XML schema/examples to teach stateless cwd behavior and bash-native background commands.
   - Update `docs/terminal_tools.md`.
6. Update tests:
   - Replace TerminalSessionManager mocks with executor/manager behavior tests.
   - Add exact-byte HTML heredoc regression for `run_bash`.
   - Add bash-native background detection test using `&`, PID-only result, list/output/stop.
   - Add `start_background_process` PID-only lifecycle test.
   - Update `tests/unit/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.test.ts` so `background` attributes are ignored/no metadata is emitted while timeout metadata still works.
   - Update `tests/unit/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.test.ts` so opening-tag `background` and `<arg name="background">` are ignored/no metadata is emitted while command and timeout metadata still work.
   - Update `tests/unit/agent/streaming/adapters/tool-syntax-registry.test.ts`, `tests/unit/agent/streaming/parser/invocation-adapter.test.ts`, `tests/integration/agent/streaming/parser/streaming-parser.test.ts`, and `tests/integration/agent/streaming/full-streaming-flow.test.ts` to assert no `background` arg is produced from stale XML.
   - Update terminal-tool lifecycle tests such as `tests/integration/tools/terminal/terminal-tools.test.ts` and approval-flow tests that currently call `run_bash` with `background: true` to use bash-native `&` or `start_background_process` as appropriate.
   - Add schema/formatter/parser tests for no `background` attr and PID argument names.
   - Keep or add server terminal/session tests ensuring PTY infrastructure remains available, without requiring local autobyteus server startup for unit-level validation.
7. Remove/decommission obsolete code paths and imports at the end of the patch, not as a compatibility layer.

## Key Tradeoffs

- PID-only public identity improves agent clarity but means internal cleanup metadata cannot be exposed as a second id. The manager must encapsulate process group/session details.
- Bash-native background detection is more natural for agents than a tool-specific flag, but it depends on process observation. Ordinary `&` jobs in the spawned shell's process group are in scope; deliberately daemonized processes may not be fully adoptable.
- Removing `process_id` and `background` is a clean-cut behavior change. This matches the team's no-backward-compatibility rule and the user's preference, but tests/docs/tool schemas must be updated together.
- Keeping PTY for server terminal while removing it from agent tools creates two terminal-related mechanisms. The distinction is intentional: interactive terminal sessions and stateless command execution are different owners.

## Risks

- Process-group scanning differs across macOS, Linux, Android, and WSL. Keep it isolated in `ProcessGroupObserver` and unit-test platform command construction.
- If a command backgrounds a process and redirects output to a file, `get_process_output` may have no captured output. This is expected; agents can read the log file with `run_bash`/file tools.
- If a command uses `setsid`, double-fork daemonization, or external supervisors, the process may escape the spawned process group and not be adopted. Document as out of ordinary bash background scope.
- On Windows, public PID should be the WSL/Linux PID, not the Windows `wsl.exe` PID, because agent bash commands and `kill` run inside WSL.
- Existing tests that assert synthetic ids or `background=true` behavior must be changed, not preserved. This includes parser-state tests that currently expect `background` metadata from run-bash XML attributes or `<arg name="background">`.

## Guidance For Implementation

- Do not touch server/web terminal PTY flow except for compile fallout from shared type exports.
- Do not import `TerminalSessionManager`, `PtySession`, or `WslTmuxSession` from the new command-execution files.
- Prefer `child_process.spawn` over shell-session abstractions.
- Use non-interactive shell invocation (`bash -lc`) rather than interactive (`-i`) shell invocation.
- Start foreground commands in an observable process group so ordinary bash background jobs can be detected after the shell exits.
- Make manager stop logic kill the hidden process group when known, but keep public results PID-only.
- Keep cwd resolution in the tool facade unless a small shared cwd helper is extracted; do not duplicate cwd logic across tools.
- Keep tool result field names and docs aligned: `pid`, not `processId`, `process_id`, or `osPid`.
- Remove stale `run_bash` background metadata at the parser-state extraction sites, not only in the adapter or tool schema; do not replace it with a background-specific compatibility branch.
- Treat the exact-byte HTML heredoc repro as a required regression.
