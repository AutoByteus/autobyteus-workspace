# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`

## Goal / Problem Statement

Enable Android deployment of the server and core library without any hard dependency on `node-pty`, while preserving shell tool functionality through a direct-shell backend.

Primary outcome:
- On Android, build/install/runtime must not require `node-pty`.
- On Android profile, runtime artifact must not resolve/link or import `node-pty`.
- Official Android deployment profile uses `Termux + Node.js`.
- Shell tools must work on Android through direct interactive shell execution with `bash` primary and `sh` fallback for robustness.
- On Android runtime, persistence profile must resolve to `file` (not SQL/Prisma-backed providers).

## Scope Classification

- Classification: `Large`
- Rationale:
  - Cross-module impact: `autobyteus-ts` terminal/tool registration + `autobyteus-server-ts` runtime behavior.
  - Affects dependency model, backend selection, and integration behavior for agent tools and terminal websocket paths.
  - Requires platform-specific build validation criteria and regression coverage on non-Android platforms.

## In-Scope Use Cases

- `UC-001`: Android server install/build succeeds without pulling `node-pty` into the Android artifact/runtime dependency set.
- `UC-002`: Android agent `run_bash` executes commands successfully using direct shell backend.
- `UC-003`: Android background process tools (`start_background_process`, `get_process_output`, `stop_background_process`) work through direct shell backend.
- `UC-004`: Non-Android platforms continue using PTY backend behavior (Linux/macOS/Windows where supported).
- `UC-005`: Backend selection is deterministic and observable (logs/diagnostics show selected terminal backend).
- `UC-006`: Terminal websocket behavior on Android is explicitly supported via direct-shell session behavior or explicitly rejected with clear, actionable error.
- `UC-007`: Official Android runtime profile is Termux with Node.js installed, and direct-shell backend uses Termux shell environment.
- `UC-008`: Android runtime selects file persistence and skips Prisma migration/runtime engine usage.

## Out Of Scope / Non-Goals

- Full parity for TTY-only interactive applications on Android (fullscreen TUIs, strict pseudo-terminal semantics).
- External shell execution service or architecture split into a separate process/service.
- Changes to LLM streaming syntax (`<run_bash>`) or user-visible tool names.

## Definitions

- `PTY backend`: current `node-pty` based session implementation.
- `Direct-shell backend`: session implementation using `child_process` pipes and shell invocation.
- `Android artifact`: dependency set and build output used for Android deployment.
- `Shell availability order`: `bash` (if present) then `sh` fallback.
- `Android official runtime profile`: running server inside Termux with Node.js installed.

## Functional Requirements

- `R-001 Platform Detection`
  - System shall detect runtime platform (`android`, `linux`, `darwin`, `win32`) at startup.
  - Android detection shall not rely on user-provided flags only; runtime detection must be authoritative.

- `R-002 Android Dependency Exclusion`
  - Android build/install path shall not require `node-pty`.
  - Android install/profile artifact shall not resolve/link `node-pty` in the runtime dependency graph.
  - If a monorepo lockfile references `node-pty` for non-Android targets, Android packaging flow must still exclude it from Android install artifact.

- `R-002A Android Runtime Baseline`
  - Officially supported Android runtime shall be `Termux + Node.js`.
  - Android deployment documentation shall declare Termux and Node.js setup as required prerequisites for supported deployment path.

- `R-002B Android Packaging Gate`
  - A scripted verification gate shall fail if Android profile resolves/links or imports `node-pty`.
  - Android profile verification gate shall be reproducible from repository scripts/docs.

- `R-003 Backend Selection Policy`
  - Android default terminal backend shall be direct-shell backend.
  - Android path shall never fallback to PTY backends (`PtySession`, `WslTmuxSession`).
  - Non-Android default behavior shall remain PTY backend where available.
  - Backend selection shall be centralized (single policy point), not duplicated across tools.

- `R-004 Shell Selection Policy (Android)`
  - In official Termux profile, direct-shell backend shall start a persistent interactive `bash` shell as primary command shell.
  - If `bash` is unexpectedly unavailable, backend shall fallback to persistent interactive `sh` and emit warning-level diagnostics.
  - Shell fallback is shell-executable fallback only; no PTY fallback is allowed on Android.
  - Termux is the supported baseline for Android deployment.

- `R-005 Tool Compatibility`
  - Existing tool names and contracts remain unchanged:
    - `run_bash`
    - `start_background_process`
    - `get_process_output`
    - `stop_background_process`
  - Android direct-shell implementation shall preserve current response schema (stdout/exit/timed_out shape and background result schema).

- `R-006 Stateful Behavior Expectations`
  - For Android direct-shell backend, command execution behavior must be explicitly defined:
    - either session-persistent shell state is supported, or
    - behavior differences are documented and tests enforce the chosen behavior.
  - Silent behavior drift is not allowed.

- `R-007 Error Semantics`
  - Unsupported operations/capabilities shall return clear typed errors with remediation hints.
  - No opaque dynamic import failures or native module stack traces should leak as top-level user-facing errors.

- `R-008 Server Integration`
  - `autobyteus-server-ts` flows that rely on default tool registration and terminal session factory shall work on Android without `node-pty`.
  - If terminal websocket cannot support Android semantics, route behavior must fail fast with explicit message.

- `R-009 No Legacy Compatibility Layers`
  - Do not keep legacy PTY-only fallback branches that reintroduce Android hard dependency on `node-pty`.
  - Clean replacement and clear backend abstraction boundaries are required.

- `R-010 Observability`
  - Startup/runtime logs shall include selected terminal backend and selected shell executable on Android.
  - Errors shall include backend type and command context identifiers (no secrets).

- `R-011 Android Persistence Policy`
  - Android runtime shall resolve persistence profile to `file`.
  - When Android runtime is detected, SQL persistence profiles (`sqlite`, `postgresql`) shall not be selected.
  - Startup migration flow shall skip Prisma migrations on Android via file persistence profile resolution.

## Build/Packaging Requirements

- `B-001 Android Build Profile`
  - A documented Android build/install profile shall exist and be reproducible.
  - Running the documented Android install/build flow shall not trigger `node-pty` native build or package install.
  - Android install flow shall avoid desktop-only workspace packages (for example Electron-bound `autobyteus-web`) and use Android-targeted workspace filters.
  - The documented profile shall target Termux environment explicitly.

- `B-002 Dependency Verification Gate`
  - CI or scripted verification shall assert Android artifact does not resolve/link or import `node-pty`.
  - Verification output shall be machine-checkable.

- `B-003 Non-Android Regression Gate`
  - Linux/macOS/Windows builds must keep PTY path valid and tested where currently supported.

## Testing Requirements

- `T-001 Unit Tests`
  - Backend selection unit tests for platform matrix.
  - Shell selection tests (`bash` present vs absent) for Android backend.
  - Error path tests for unsupported capabilities.

- `T-002 Integration Tests`
  - Terminal tool integration tests for PTY-available path.
  - Terminal tool integration tests for PTY-unavailable path (Android-like direct-shell mode).
  - Server-level integration check for agent tool execution path without `node-pty`.

- `T-003 Contract Tests`
  - Validate tool return payload schemas remain backward-stable.
  - Validate timeout and exit code behavior in direct-shell backend.

## Acceptance Criteria

1. Android-targeted install/build of the server succeeds without requiring `node-pty`.
2. Android-targeted profile does not resolve/link or import `node-pty`.
3. Android runtime in Termux can execute `run_bash` and background process tools through direct-shell backend.
4. Runtime/backend selection logs clearly identify Android direct-shell mode.
5. Android backend policy never resolves PTY backend classes.
6. Non-Android platforms preserve existing PTY-backed behavior.
7. Failure cases return explicit actionable errors; no raw `node-pty` native load failures surface to end users.
8. Terminal websocket behavior on Android is either functional with defined semantics or explicitly rejected with clear reason and guidance.
9. Test suite includes both PTY-present and PTY-absent coverage for terminal tool paths.
10. Deployment docs include exact Termux + Node.js setup steps and verification commands.
11. Android runtime persistence resolves to `file`, and Prisma runtime engine usage is not required for startup flow.

## Constraints / Dependencies

- Upstream `node-pty` does not provide maintained Android support.
- Prisma CLI/client platform detection currently reports Android as unsupported/unknown and can resolve incompatible Linux engine targets.
- Existing public tool names and API contracts must remain stable.
- Security posture unchanged: shell execution remains privileged and must follow existing sandbox/workspace constraints.

## Assumptions

- Android deployment needs command execution capability; strict PTY fidelity is secondary to compatibility.
- Termux is available and used in the supported Android deployment path.
- Server and core packages may both require updates in this ticket.

## Risks

1. Some commands may behave differently without PTY (prompting, color, interactive modes).
2. Background process handling in pipe mode can differ from PTY buffering behavior.
3. Packaging edge cases in monorepo lockfiles can accidentally retain `node-pty` in Android artifact unless explicitly gated.

## Resolution Notes

1. Android terminal websocket route remains enabled and uses the shared policy-driven backend path; Android resolves to `DirectShellSession`.
2. Session-persistent shell state is required and implemented for Android direct-shell mode.

## Requirement IDs

- `R-001` platform detection
- `R-002` Android dependency exclusion
- `R-002A` Android runtime baseline (Termux + Node.js)
- `R-002B` Android packaging gate
- `R-003` backend selection policy
- `R-004` shell selection policy
- `R-005` tool compatibility
- `R-006` stateful behavior expectations
- `R-007` error semantics
- `R-008` server integration
- `R-009` no legacy compatibility branches
- `R-010` observability
- `R-011` Android persistence policy
- `B-001` Android build profile
- `B-002` dependency verification gate
- `B-003` non-Android regression gate
- `T-001` unit tests
- `T-002` integration tests
- `T-003` contract tests
