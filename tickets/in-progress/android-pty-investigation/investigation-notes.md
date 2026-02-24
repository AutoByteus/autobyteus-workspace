# Android PTY Investigation Notes

## Ticket Context

- Ticket: `android-pty-investigation`
- Branch: `codex/android-pty-investigation`
- Scope of this pass: investigation only (no runtime behavior changes yet)
- Date: 2026-02-24

## Investigation Objective

Determine why `autobyteus-ts` terminal tools (`run_bash` and background-process tools) fail on Android and identify replacement paths for `node-pty`.

## Sources Consulted

### Local Code + Docs

- `autobyteus-ts/package.json`
- `autobyteus-ts/src/tools/terminal/pty-session.ts`
- `autobyteus-ts/src/tools/terminal/wsl-tmux-session.ts`
- `autobyteus-ts/src/tools/terminal/session-factory.ts`
- `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts`
- `autobyteus-ts/src/tools/terminal/background-process-manager.ts`
- `autobyteus-ts/src/tools/register-tools.ts`
- `autobyteus-ts/docs/terminal_tools.md`
- `autobyteus-ts/tests/integration/agent/tool-approval-flow.test.ts`
- `autobyteus-ts/tests/integration/tools/terminal/*`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`
- `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`
- `autobyteus-server-ts/src/api/websocket/terminal.ts`

### External Primary Sources

- `node-pty` package metadata + tarball (`1.1.0`)
  - `scripts/install`: `node scripts/prebuild.js || node-gyp rebuild`
  - prebuilds in published package: `darwin-*` and `win32-*` only
- `https://registry.npmjs.org/node-pty/-/node-pty-1.1.0.tgz`
- `node-pty` README (`1.1.0`) says support is Linux/macOS/Windows
- `https://github.com/microsoft/node-pty/blob/main/README.md`
- `microsoft/node-pty` issue #235 (Android): maintainer response says Android is not supported
- `https://github.com/microsoft/node-pty/issues/235`
- `microsoft/node-pty` issue #665 (Android install failure in Termux): maintainers indicate no Android-specific support path in project binding config
- `https://github.com/microsoft/node-pty/issues/665`

## Findings

1. `autobyteus-ts` has a hard dependency on `node-pty`.
- Evidence: `autobyteus-ts/package.json` includes `"node-pty": "^1.1.0"` in `dependencies`.
- Impact: Android installs can fail before runtime if native build cannot complete.

2. Terminal runtime currently has no non-PTY backend.
- `PtySession` and `WslTmuxSession` both use `await import('node-pty')` on `start()`.
- `TerminalSessionManager` and `BackgroundProcessManager` both depend on `getDefaultSessionFactory()`, which only resolves to PTY-based sessions.

3. Android support is not provided upstream by `node-pty`.
- Upstream README explicitly lists Linux/macOS/Windows support.
- Upstream maintainer response in issue #235 explicitly states Android is not supported.
- Install pipeline relies on prebuild lookup + `node-gyp rebuild`; Android is not a maintained/prebuilt target.

4. `autobyteus-ts` already treats `node-pty` absence as a known condition in tests.
- Integration tests conditionally skip `run_bash` flows when `await import('node-pty')` fails.
- This indicates existing project assumptions already acknowledge non-availability scenarios, but production tool registration/behavior is not yet capability-aware.

5. Problem is split into two different failure surfaces:
- Install-time: native module build/prebuild mismatch on Android.
- Runtime: even if package installation succeeds, PTY behavior is still tied to an unsupported addon path.

6. Server integration path inherits PTY constraints from `autobyteus-ts`.
- `AgentFactory` calls `registerTools()` during initialization, which registers terminal tools by default.
- Server terminal websocket path (`PtySessionManager`) also consumes `getDefaultSessionFactory()` from core.
- Therefore, Android-safe behavior must include both tool execution path and websocket terminal path decisions.

7. Official Android runtime decision for this ticket: `Termux + Node.js`.
- This is the practical deployment baseline for server runtime on Android.
- Termux availability does not make `node-pty` Android support valid; backend still must be direct-shell.

## Root Cause Summary

`autobyteus-ts` terminal tools are tightly coupled to `node-pty`, while `node-pty` does not support Android as a maintained platform. This creates an install/runtime incompatibility for Android deployments.

## Candidate Solution Paths

### Option A: Make PTY optional + disable terminal tools on unsupported platforms

- Change `node-pty` from required dependency to optional dependency.
- Add capability detection and either:
  - do not register terminal tools, or
  - keep tools registered but return explicit `UNSUPPORTED_PLATFORM` errors.
- Pros: fastest path to unblock Android server startup.
- Cons: no `run_bash` capability on Android.

### Option B: Add non-PTY shell backend (recommended direction)

- Introduce a backend interface for terminal sessions.
- Keep `node-pty` backend where available.
- Add pure Node `child_process` pipe backend for Android-compatible operation.
- Use command-boundary sentinels instead of shell prompt detection for completion.
- Pros: preserves terminal tooling API on Android without native addon dependency.
- Cons: behavior differences for TTY-dependent commands; requires careful compatibility tests.

### Option C: Externalize shell execution to platform service

- Move shell execution behind another service/adapter and call over RPC.
- Pros: strongest isolation from Node native module portability.
- Cons: larger architecture change and operational complexity.

## Recommended Next Step

Proceed with **direct-shell backend + Android dependency exclusion**, using `Termux + Node.js` as official Android profile.

## Implementation Feedback Checkpoint (Post-Change)

1. Dependency model implemented:
- `node-pty` moved from required dependency to optional dependency.
- Android profile validation uses Android-scoped `pnpm install --no-optional --filter ./autobyteus-ts... --filter ./autobyteus-server-ts... --filter ./autobyteus-message-gateway...` and confirms `node-pty` is absent.
- Added scripted Android packaging gate: `scripts/verify-android-profile.sh` (`pnpm verify:android-profile`) fails if Android profile resolves/links or imports `node-pty`.

2. Runtime model implemented:
- Android policy resolves to `DirectShellSession`.
- Direct-shell starts a persistent interactive shell session (`bash` preferred, fallback to interactive `sh`).
- Session-persistent shell state is preserved across commands.
- Android policy explicitly has no PTY fallback path.

3. Server alignment implemented:
- Terminal websocket session manager continues using shared default session factory and now logs selected backend.

4. Validation completed:
- direct-shell integration tests pass.
- PTY integration tests auto-skip when PTY runtime is unavailable.
- Android-profile checks pass (`node-pty` absent + Android policy selects direct-shell + `autobyteus-ts` build passes).

5. Verification blocker investigation and resolution:
- `autobyteus-server-ts` full build initially failed with `@prisma/client` missing exported members.
- Root cause: Prisma client typings were not generated before server TypeScript compile in this workspace state.
- Resolution: update server prebuild pipeline to run `prisma generate --schema ./prisma/schema.prisma` before `tsc`.
- Post-fix verification: server full build and file-profile build both pass.

6. Post-completion deep architecture review (SoC focus):
- Found duplicated terminal session contracts between `autobyteus-ts` core managers and server terminal streaming layer.
- Found loose `any` session typing in core terminal managers, reducing enforceable boundaries.
- Improvement applied: introduce shared `TerminalSession`/`TerminalSessionFactory` contract and reuse it in core + server.
- Found shell binary discovery accepted any existing path entry (not necessarily executable), which could select invalid shell fixtures.
- Improvement applied: executable-aware shell resolution (`isFile` + executable access checks) and adjusted tests accordingly.
- Regression check confirms Android policy behavior unchanged and Windows backend selection remains unaffected (`win32 -> WslTmuxSession`).

## Open Questions (Resolved)

1. Android terminal websocket route: supported via shared policy-driven backend path (no route disable in this ticket).
2. Stateful behavior: persistent shell state is required and implemented for direct-shell mode.

## Additional Investigation (Prisma on Android)

### Emulator Runtime Evidence

- Environment:
  - Android Emulator: API 35 / Android 15 / `arm64-v8a`
  - Runtime profile: `Termux + Node.js` (`node v25.2.1`)
- Prisma CLI probe (`pnpm exec prisma -v`) reports:
  - `Operating System: android`
  - `Architecture: arm64`
  - `Computed binaryTarget: debian-openssl-1.1.x`
- Runtime failure observed:
  - Prisma engine load fails with architecture mismatch:
    - `libquery_engine-debian-openssl-1.1.x.so.node is for EM_X86_64 (62) instead of EM_AARCH64 (183)`

### Conclusion

- Prisma runtime engine path is not reliable for Android in this profile.
- Android runtime should not select SQL persistence by default.
- Persistence policy must force Android runtime to `file` profile so startup/migration flow avoids Prisma runtime dependence.

## Additional Investigation (Bootstrap/E2E Validation in Emulator)

### Findings

- Running Android bootstrap through a full monorepo install hit a platform-specific failure in emulator:
  - `electron` postinstall failed with `Electron builds are not available on platform: android`.
- Root cause: Android bootstrap attempted to install desktop-oriented workspace packages (including `autobyteus-web`) that are not required for Android server runtime.
- `termux-battery-status` preflight was blocked until companion Android app `Termux:API` (`com.termux.api`) was installed in the emulator.

### Resolution

- Updated `scripts/android-bootstrap-termux.sh` to run Android-scoped install only:
  - `autobyteus-ts`
  - `autobyteus-server-ts`
  - `autobyteus-message-gateway`
- Kept `termux-api` package + `termux-battery-status` preflight requirement unchanged.

### Verified Result

- `pnpm android:bootstrap` completes successfully in Android emulator Termux profile.
- Runtime lifecycle validation passes:
  - background start works
  - status check reports running
  - REST health endpoint responds at `/rest/health`
  - clean stop works
