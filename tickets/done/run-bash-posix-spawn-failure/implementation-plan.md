# Implementation Plan

## Plan Metadata

- Scope: `Small`
- Requirements Source: `tickets/done/run-bash-posix-spawn-failure/requirements.md`
- Investigation Source: `tickets/done/run-bash-posix-spawn-failure/investigation-notes.md`
- Current Status: `Draft`
- Review Gate: `Pending Stage 5`

## Solution Sketch

- Primary design decision:
  - Reuse the existing `DirectShellSession` implementation as the fallback backend when PTY startup fails on non-Windows/non-Android hosts.
- Fallback ownership:
  - Put startup fallback policy in one shared terminal-session startup helper instead of duplicating retry logic in each manager.
- Session-state correction:
  - Ensure failed startup never leaves a stale session object attached to the manager.
- XML normalization decision:
  - Decode XML entities in shared XML argument parsing / tool-argument construction so `run_bash` receives executable command text.

## Target Behavior

1. Foreground `run_bash`
- `TerminalSessionManager` first tries the primary session factory.
- If PTY startup throws or the session is dead immediately after startup, it closes/discards that session and retries with `DirectShellSession` when fallback is allowed.
- On success, the working fallback session becomes the persistent session for subsequent commands in that context.

2. Background `run_bash`
- `BackgroundProcessManager` uses the same startup-fallback helper so background process startup behaves consistently with foreground execution.

3. XML command parsing
- Shared XML parsing decodes entity-encoded leaf text values once.
- `run_bash` command arguments built from XML content or XML `<arguments>` payloads use decoded text.

## Reuse / Existing Capability Bias

- Reuse `DirectShellSession`; do not introduce a second direct-shell implementation.
- Reuse shared terminal session contracts already exported from `autobyteus-ts`.
- Reuse existing parser/invocation flow; normalize XML text at the shared argument boundary rather than adding runtime-specific decode hacks downstream.
- Reuse the Android PTY investigation outcome that `DirectShellSession` is already the accepted non-PTY backend.

## Touched Files / Modules

- `autobyteus-ts/src/tools/terminal/session-factory.ts`
- `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts`
- `autobyteus-ts/src/tools/terminal/background-process-manager.ts`
- `autobyteus-ts/src/tools/terminal/index.ts`
- `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts`
- `autobyteus-ts/src/agent/streaming/adapters/tool-syntax-registry.ts` or `invocation-adapter` only if decoded-content ownership requires it
- `autobyteus-ts/tests/unit/tools/terminal/terminal-session-manager.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/background-process-manager.test.ts`
- `autobyteus-ts/tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`
- `autobyteus-ts/tests/unit/agent/streaming/parser/invocation-adapter.test.ts`
- `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts`

## File Ownership / Responsibility

- `session-factory.ts`
  - owns primary backend selection and fallback-candidate policy metadata.
- `terminal-session-manager.ts`
  - owns persistent foreground session lifecycle and must recover cleanly from startup failure.
- `background-process-manager.ts`
  - owns one-session-per-background-process startup lifecycle and must use the same startup fallback policy.
- `tool-call-parsing.ts`
  - owns XML argument normalization before parsed values leave the adapter boundary.

## Sequence

1. Add shared fallback-candidate/startup path for terminal sessions.
2. Wire foreground manager to the shared startup helper and stale-session cleanup.
3. Wire background manager to the same helper.
4. Add XML entity decoding at the shared parser boundary.
5. Add targeted regression tests for fallback and XML decoding.
6. Run the focused validation matrix.

## Requirement Traceability

| Requirement | Acceptance Criteria | Planned Change |
| --- | --- | --- |
| `R-001` | `AC-001` | foreground PTY fallback to direct shell |
| `R-002` | `AC-002` | stale-session cleanup after startup failure |
| `R-003` | `AC-003` | background manager uses same fallback policy |
| `R-004` | `AC-004`, `AC-005` | shared XML entity decoding |
| `R-005` | `AC-004`, `AC-005` | decode exactly once in parser layer |
| `R-006` | `AC-001`..`AC-006` | targeted regression coverage |

## Risks

- Direct-shell fallback is not identical to PTY behavior for TTY-specific commands, but it is the accepted non-PTY behavior already used on Android.
- Fallback policy must not silently mask environments where both PTY and direct shell fail; final errors should remain actionable.
- XML decoding must preserve plain text and avoid double-decoding.

## Verification Plan

- Unit tests:
  - simulate PTY startup failure and confirm foreground fallback
  - simulate PTY startup failure and confirm background fallback
  - verify no stale `Session not started` cascade on repeated calls
  - verify XML entity decoding for `parseXmlArguments(...)`
  - verify decoded `run_bash` arguments in parser/invocation flow
- Targeted integration tests:
  - rerun existing direct-shell integration tests
  - rerun existing parser/runtime targeted tests relevant to `run_bash`
