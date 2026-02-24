# Implementation Plan

## Plan Metadata

- Scope: `Large`
- Requirements Source: `tickets/in-progress/android-pty-investigation/requirements.md`
- Design Source: `tickets/in-progress/android-pty-investigation/proposed-design.md`
- Review Gate: `Go (implementation completed and emulator E2E validated)`

## Workstreams

1. Dependency and platform policy foundation
- Make `node-pty` non-mandatory for install/build.
- Add/align compile-time typing so build succeeds when `node-pty` is absent.
- Implement explicit Android detection helpers for backend policy.

2. Direct-shell backend implementation
- Add `DirectShellSession` implementing terminal session contract.
- Implement shell selection policy (`bash` preferred, `sh` fallback).
- Ensure `read`/`write`/`close` semantics match current manager expectations.

3. Session factory integration
- Update default backend selection:
  - Android -> direct-shell backend
  - non-Android -> existing PTY backend policy
- Export helpers for tests and downstream diagnostics.

4. Server path alignment
- Ensure terminal websocket session manager behavior is consistent with updated factory policy.
- Add/adjust logs and explicit errors as needed.

5. Testing and verification
- Update/add unit tests for policy + fallback behavior.
- Add integration coverage for direct-shell path.
- Run targeted regression tests for terminal tools/session manager/server path.

6. Documentation sync
- Update Android deployment notes with Termux + Node baseline.
- Document backend policy and limitations clearly.

7. Android persistence policy alignment
- Validate Prisma runtime compatibility in Android emulator profile.
- Force Android runtime persistence resolution to `file`.
- Ensure startup migration path skips Prisma on Android via shared profile policy.

## Execution Order

1. Apply dependency + platform policy changes.
2. Implement direct-shell backend + session-factory wiring.
3. Update tests to cover new policy behavior.
4. Run targeted test matrix and fix regressions.
5. Apply Android persistence policy update and tests.
6. Update docs and finalize ticket notes.

## Rollback/Failure Strategy

- If direct-shell backend causes regressions on non-Android, keep non-Android default PTY path unchanged and constrain direct-shell activation strictly to Android policy gate during this ticket.
