# Proposed Design Document

## Design Version

- Current Version: `v7`

## Artifact Basis

- Investigation Notes: `tickets/in-progress/android-pty-investigation/investigation-notes.md`
- Requirements: `tickets/in-progress/android-pty-investigation/requirements.md` (`Refined`)
- Scope: `Large`

## Summary

Implement policy-driven terminal backend selection so Android uses a direct-shell backend and no longer requires `node-pty` in Android build/install/runtime flows. Keep PTY backend behavior on non-Android platforms where supported, while enforcing a strict Android packaging gate that ensures Android profile does not resolve/link or import `node-pty`.

Official Android runtime profile: `Termux + Node.js`.
Android persistence policy: runtime resolves to `file` profile to avoid Prisma runtime engine dependence on Android.

## Current State (As-Is)

- `autobyteus-ts` terminal sessions rely on PTY implementations (`PtySession`, `WslTmuxSession`).
- `autobyteus-ts` package has a hard runtime dependency on `node-pty`.
- `autobyteus-server-ts` inherits backend policy through:
  - agent tool path (`AgentFactory -> registerTools()`),
  - terminal websocket path (`PtySessionManager -> getDefaultSessionFactory()`).

## Target State (To-Be)

- Android selects a direct-shell session backend (no PTY requirement).
- `node-pty` is not resolved/linked/importable in Android install/build profile.
- Shell tool contracts remain unchanged.
- Android shell sessions are persistent and interactive (`bash` preferred, `sh` fallback).
- Android path never falls back to PTY backend classes.
- Server agent tools and terminal websocket paths follow shared backend policy.
- Android persistence resolves to `file` at runtime and migration startup path skips Prisma execution.

## Architecture Decisions

1. Backend selection policy is centralized in core terminal session factory.
2. Add direct-shell session implementation that preserves session lifecycle/read/write contract.
3. Keep PTY backend classes for non-Android usage only.
4. Make `node-pty` non-mandatory and enforce Android profile exclusion (`--no-optional` install profile + verification script).
5. Add tests for both PTY-present and PTY-absent/direct-shell paths.
6. Add scripted Android packaging verification that fails if Android profile resolves/links or imports `node-pty`.
7. Define one shared `TerminalSession` / `TerminalSessionFactory` contract in core terminal module and reuse it in both core managers and server terminal streaming layer.
8. Use executable-aware shell binary detection (`isFile` + executable access check) so shell selection is robust and does not resolve non-executable PATH entries.
9. Force Android runtime persistence selection to `file` in server persistence-profile policy to bypass unsupported Prisma runtime path.
10. Android bootstrap/install flow is workspace-scoped (`autobyteus-ts`, `autobyteus-server-ts`, `autobyteus-message-gateway`) so Android install does not execute desktop-only Electron postinstall paths.

## Change Inventory (Delta-Aware)

| Change ID | Type | Current | Target | Notes |
| --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-ts/src/tools/terminal/direct-shell-session.ts` | direct-shell session backend |
| C-002 | Modify | `autobyteus-ts/src/tools/terminal/session-factory.ts` | same | add Android detection + backend policy + test hooks |
| C-003 | Modify | `autobyteus-ts/src/tools/terminal/index.ts` | same | export direct-shell session and detection helpers |
| C-004 | Modify | `autobyteus-ts/package.json` | same | `node-pty` hard dependency -> non-mandatory dependency strategy |
| C-005 | Add | N/A | `autobyteus-ts/types/node-pty/index.d.ts` | compile-time type fallback when node-pty absent |
| C-006 | Modify | `autobyteus-ts/tests/unit/tools/terminal/session-factory.test.ts` | same | add Android policy assertions |
| C-007 | Add | N/A | `autobyteus-ts/tests/integration/tools/terminal/direct-shell-session.test.ts` | PTY-absent/direct-shell integration coverage |
| C-008 | Modify | `autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts` | same | preserve PTY path checks; keep gating logic explicit |
| C-009 | Modify | `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | same path | behavior aligned with policy-driven default session factory |
| C-010 | Modify | docs | docs | Termux + Node Android profile + backend policy |
| C-011 | Add | N/A | `scripts/verify-android-profile.sh` | machine-checkable gate: fail if Android profile still resolves/links or imports `node-pty` |
| C-012 | Modify | root `package.json` | same | expose Android profile verification script entrypoint |
| C-013 | Add | N/A | `autobyteus-ts/src/tools/terminal/terminal-session.ts` | shared terminal session contract |
| C-014 | Modify | `autobyteus-ts/src/tools/terminal/{terminal-session-manager.ts,background-process-manager.ts}` | same | adopt shared contract and remove `any` session typing |
| C-015 | Modify | `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | same | reuse shared contract type export from core to remove duplicated local terminal session type |
| C-016 | Modify | `autobyteus-ts/src/tools/terminal/direct-shell-session.ts` | same | shell executable detection uses file/executable checks for safer selection |
| C-017 | Modify | `autobyteus-ts/tests/unit/tools/terminal/direct-shell-session.test.ts` | same | ensure test shell fixtures are executable |
| C-018 | Modify | `autobyteus-server-ts/src/persistence/profile.ts` | same | Android runtime forces `file` persistence profile |
| C-019 | Add | N/A | `autobyteus-server-ts/tests/unit/persistence/profile.test.ts` | profile policy tests incl. Android override behavior |
| C-020 | Modify | `scripts/android-bootstrap-termux.sh` | same | Android install uses workspace filters (core/server/gateway only) to avoid desktop package postinstall failures on Android |

## File/Module Responsibilities

| Module | Responsibility | Public APIs | Dependencies |
| --- | --- | --- | --- |
| `direct-shell-session.ts` | Non-PTY shell session lifecycle and I/O queue | `start`, `write`, `read`, `resize`, `close`, `isAlive` | `child_process`, `os/env` |
| `session-factory.ts` | Backend selection policy | `getDefaultSessionFactory`, platform helpers | `PtySession`, `WslTmuxSession`, `DirectShellSession` |
| `pty-session.ts` / `wsl-tmux-session.ts` | PTY backends for non-Android | existing interfaces | optional `node-pty` at runtime |
| `terminal-session.ts` | Shared terminal session contract boundary | `TerminalSession`, `TerminalSessionFactory` | used by core + server |
| `pty-session-manager.ts` (server) | Session orchestration for websocket route | `createSession/getSession/closeSession` | core session factory |
| `persistence/profile.ts` (server) | Runtime persistence-profile resolution policy | `getPersistenceProfile`, `isAndroidRuntime` | env + platform |
| `startup/migrations.ts` (server) | Startup migration behavior by persistence profile | `runMigrations` | persistence profile policy + prisma command path |
| `scripts/verify-android-profile.sh` | Android packaging verification gate | shell entrypoint | workspace install state + runtime factory probe |

## Naming Decisions

- Keep existing public tool names (`run_bash`, `start_background_process`, etc.).
- New backend class name: `DirectShellSession` (clear, backend-specific).
- Keep `PtySessionManager` server class name in this ticket to minimize churn; behavior changes via factory policy.

## Naming Drift Check

| Item | Drift | Action |
| --- | --- | --- |
| `PtySessionManager` name in server | name implies PTY-only while behavior becomes policy-driven | `N/A` for now; defer rename to avoid broad refactor |
| `session-factory` | no drift after policy expansion | `N/A` |

## Dependency Flow

- Agent/tool path: `AgentFactory -> registerTools -> TerminalSessionManager -> getDefaultSessionFactory`.
- Websocket path: `TerminalHandler -> PtySessionManager -> getDefaultSessionFactory`.
- Both converge on centralized policy.
- Startup persistence path: `app.ts -> runMigrations() -> getPersistenceProfile() -> Android => file -> skip Prisma migrations`.
- Packaging verification path: root script -> dependency-graph probe + import probe + backend policy probe; fails on any resolved/linked/importable `node-pty` path.

## Error Handling Expectations

- Android direct-shell backend emits clear errors when shell process cannot start.
- `bash` missing in Termux profile downgrades to interactive `sh` with warning logs.
- No raw native module failures should be user-facing on Android path.

## Use Case Coverage Matrix

| use_case_id | Primary | Fallback | Error | Runtime Call Stack Section |
| --- | --- | --- | --- | --- |
| UC-001 | Yes | N/A | Yes | CS-001 |
| UC-002 | Yes | Yes | Yes | CS-002 |
| UC-003 | Yes | Yes | Yes | CS-003 |
| UC-004 | Yes | N/A | Yes | CS-004 |
| UC-005 | Yes | N/A | N/A | CS-005 |
| UC-006 | Yes | Yes | Yes | CS-006 |
| UC-007 | Yes | Yes | N/A | CS-007 |
| UC-008 | Yes | N/A | Yes | CS-008 |

## Decommission/Cleanup Intent

- Remove hard dependency posture on `node-pty` in core package dependency model.
- Remove assumptions in tests that terminal integration only runs when `node-pty` is available.

## No-Backward-Compat Rule

- No compatibility wrapper that reintroduces mandatory Android PTY path.
- No Android-specific legacy branch keeping `node-pty` required.
