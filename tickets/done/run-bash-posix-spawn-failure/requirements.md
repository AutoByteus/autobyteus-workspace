# Requirements

- Status: `Design-ready`
- Ticket: `run-bash-posix-spawn-failure`
- Last Updated: `2026-03-22`
- Scope Triage: `Small`
- Triage Rationale: The defect is contained within `autobyteus-ts` terminal session startup/recovery and XML argument decoding. The fix should remain within a small shared-runtime surface plus targeted tests.

## Goal / Problem Statement

`run_bash` must continue to work for ordinary shell commands even when the preferred PTY backend cannot start in the current runtime environment. The current implementation defaults to `PtySession` on macOS/Linux, but when PTY startup fails it surfaces `posix_spawnp failed`, can leave the next command in a misleading `Session not started` state, and can also receive XML-encoded commands such as `&amp;&amp;` without decoding them before execution.

## In-Scope Use Cases

- `UC-001`: A foreground `run_bash` call such as `pwd` succeeds in environments where PTY startup is unavailable but a direct shell is available.
  - Expected outcome: execution falls back to a working direct shell instead of failing with `posix_spawnp failed`.
- `UC-002`: Two consecutive `run_bash` calls on the same context do not cascade from PTY startup failure into a stale-session `Session not started` error.
  - Expected outcome: failed startup is recovered cleanly and subsequent calls either execute successfully via fallback or report the same root cause deterministically.
- `UC-003`: A background `run_bash` call can still start when PTY startup is unavailable but direct shell is available.
  - Expected outcome: background process startup uses the same recovery policy as foreground execution.
- `UC-004`: XML tool-call arguments containing entity-encoded command text are decoded before invocation execution.
  - Expected outcome: `&amp;&amp;`, `&quot;`, `&lt;`, `&gt;`, and numeric entities become the intended command text exactly once.
- `UC-005`: Automated tests reproduce the PTY-unavailable case and protect the XML decoding behavior.
  - Expected outcome: the new coverage fails without the fix and passes with it.

## Requirements

- `R-001`: Foreground terminal execution must recover from PTY startup failure by retrying with a supported direct-shell backend when that backend is applicable in the current platform/runtime.
  - Expected outcome: valid commands still execute in PTY-unavailable environments.
- `R-002`: Startup failure handling must clear or replace invalid session state so later calls do not emit misleading stale-session errors.
  - Expected outcome: no follow-on `Session not started` cascade from a failed first startup attempt.
- `R-003`: Background process startup must use the same PTY failure recovery policy as foreground terminal execution.
  - Expected outcome: `background=true` continues to work when PTY is unavailable.
- `R-004`: XML argument parsing must decode XML entities in leaf text values before tool arguments are returned to invocation execution.
  - Expected outcome: parsed command/path/content strings represent executable or intended user text, not literal entity syntax.
- `R-005`: XML entity decoding must not double-decode already-normalized strings.
  - Expected outcome: plain text remains unchanged and entity-encoded text is decoded once.
- `R-006`: Targeted automated tests must cover PTY startup fallback, no stale-session cascade, and XML entity decoding for `run_bash`.
  - Expected outcome: regressions are caught without depending on a packaged app repro.

## Acceptance Criteria

- `AC-001`: A targeted terminal-session test simulating PTY startup failure verifies foreground command execution falls back to a direct shell session and succeeds.
- `AC-002`: A targeted terminal-session or `run_bash` test verifies two consecutive calls after PTY startup failure do not surface a stale `Session not started` error.
- `AC-003`: A targeted background-process test simulating PTY startup failure verifies the process starts successfully via fallback backend.
- `AC-004`: A targeted XML parsing test verifies `parseXmlArguments(...)` decodes command text containing `&amp;&amp;`.
- `AC-005`: A targeted parser/invocation test verifies `run_bash` tool arguments derived from XML retain decoded command text.
- `AC-006`: Existing directly relevant targeted tests still pass after the fix.

## Constraints / Dependencies

- Windows and Android default backend selection should remain unchanged unless explicitly required by the fix.
- Stateful shell behavior should remain intact in environments where PTY startup already works.
- Background process behavior should stay aligned with foreground execution semantics.
- The fix should stay within the shared runtime/tooling layer so server/web consumers benefit without per-adapter hacks.

## Assumptions

- `DirectShellSession` is an acceptable fallback on non-Windows/non-Android platforms when PTY is unavailable.
- XML entity decoding at the shared parser layer is the correct place to normalize encoded tool argument values.
- The user-visible failures shown in the screenshots are produced by the same shared runtime used by the current repository.

## Open Questions / Risks

- If some environments require PTY-only behavior for specific commands, fallback may not be equivalent for every shell edge case.
- XML decoding in shared parsing affects all XML tool arguments, so tests should confirm the normalization is safe for existing tools.
- If PTY startup can succeed and then die immediately after startup, the fallback logic must also treat dead-on-start sessions as startup failure.

## Requirement Coverage Map

- `R-001` -> `UC-001`
- `R-002` -> `UC-002`
- `R-003` -> `UC-003`
- `R-004` -> `UC-004`
- `R-005` -> `UC-004`
- `R-006` -> `UC-005`

## Acceptance Criteria Coverage Map (Stage 7 Scenario Mapping)

- `AC-001` -> `SCN-001`
- `AC-002` -> `SCN-002`
- `AC-003` -> `SCN-003`
- `AC-004` -> `SCN-004`
- `AC-005` -> `SCN-005`
- `AC-006` -> `SCN-006`

Where Stage 7 scenarios are:

- `SCN-001`: Foreground `run_bash` succeeds after simulated PTY startup failure by using direct-shell fallback.
- `SCN-002`: Repeated `run_bash` calls after simulated PTY startup failure do not emit a stale-session error.
- `SCN-003`: Background process startup succeeds after simulated PTY startup failure by using direct-shell fallback.
- `SCN-004`: XML argument parsing decodes `&amp;&amp;` and related entities in leaf text values.
- `SCN-005`: Parser/invocation flow produces decoded `run_bash` command arguments from XML tool-call content.
- `SCN-006`: Existing relevant terminal/parser targeted tests continue to pass.
