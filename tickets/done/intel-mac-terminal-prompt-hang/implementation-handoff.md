# Implementation Handoff

## Local Fix Update - 2026-06-18

API/E2E found that fresh macOS x64 packaging was blocked because `autobyteus-ts` build scanned ignored stale `dist/cli/agent-team` files left from a removed native CLI/TUI path and reported missing `ink`/`react`. The Local Fix restores the official build path by cleaning `autobyteus-ts/dist` before `tsc`, so `verify-runtime-dependencies.mjs` scans only the current source build output. This intentionally does not add `ink` or `react` as runtime dependencies because the current source and public-surface tests confirm the native CLI/TUI source path remains removed. See the rework artifact: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/implementation-local-fix-handoff.md`.

## Upstream Artifact Package

- Requirements doc: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/requirements.md`
- Investigation notes: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/investigation-notes.md`
- Design spec: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/design-spec.md`
- Design review report: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang/tickets/intel-mac-terminal-prompt-hang/design-review-report.md`

## What Changed

- Reworked `autobyteus-ts` terminal bootstrap so runtime helper repair follows node-pty's selected native module instead of the first helper that exists on disk.
  - `node-pty-bootstrap.ts` now calls `node-pty/lib/utils.js.loadNativeModule('pty')`, normalizes bundled asar paths, verifies the adjacent `spawn-helper`, exposes diagnostics, and only uses a current-arch fallback when node-pty selection cannot be inspected.
  - `fix-node-pty-permissions.mjs` mirrors the selected-helper behavior for postinstall/development repair.
- Added actionable terminal startup error propagation.
  - `IsolatedPtySession` wraps startup failures with node-pty helper diagnostics.
  - `PtySessionManager` exposes backend name for logs/errors.
  - `TerminalHandler` sends a typed websocket error frame and closes startup failures with `1011` / `Terminal startup failed`.
  - The Fastify websocket adapter preserves startup failures from `TerminalHandler` instead of replacing them with a cwd rejection.
  - `useTerminalSession` preserves backend error messages through websocket close/error events.
- Hardened macOS packaging against the Intel helper mode defect.
  - `prepare-server.sh` now chmods node-pty `spawn-helper` files after `electron-rebuild` on the active non-Windows dispatch path.
  - `prepare-server.mjs` has parity normalization for the JS preparation path.
  - `afterPack.ts` normalizes node-pty helper execute bits before custom resource signing and does not skip this normalization when `APPLE_SIGNING_IDENTITY` is absent.
- Added package-time validation for Darwin terminal runtime resources.
  - New CLI: `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs`.
  - Validates target Darwin `pty.node`, target adjacent `spawn-helper`, selected-helper existence/executable mode, best-effort `file` architecture match, and host-compatible node-pty spawn probe when `--spawn-probe` is requested.
  - Release workflow now validates both staged `resources/server` and final `.app/Contents/Resources/server` for ARM64 and x64, with Electron-Node spawn probes gated to host-compatible arch.
- Added/updated targeted tests for selected-helper resolution, startup diagnostics, websocket error framing, and frontend error preservation.

## Key Files Or Areas

- Runtime helper selection / diagnostics:
  - `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts`
  - `autobyteus-ts/scripts/fix-node-pty-permissions.mjs`
  - `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`
- Terminal server startup error propagation:
  - `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts`
  - `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`
  - `autobyteus-server-ts/src/api/websocket/terminal.ts`
- Frontend error preservation:
  - `autobyteus-web/composables/useTerminalSession.ts`
- Packaging / release validation:
  - `autobyteus-web/scripts/prepare-server.sh`
  - `autobyteus-web/scripts/prepare-server.mjs`
  - `autobyteus-web/build/scripts/afterPack.ts`
  - `autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs`
  - `.github/workflows/release-desktop.yml`
  - `autobyteus-web/package.json`
- Tests:
  - `autobyteus-ts/tests/unit/tools/terminal/node-pty-bootstrap.test.ts`
  - `autobyteus-ts/tests/unit/tools/terminal/isolated-pty-session.test.ts`
  - `autobyteus-server-ts/tests/unit/services/terminal/terminal-handler.test.ts`
  - `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts`

## Important Assumptions

- Current `node-pty@1.1.0` selection authority is `node-pty/lib/utils.js.loadNativeModule('pty')`; runtime repair now uses that authority rather than an independent build-first file search.
- The package validator cannot safely execute cross-arch native modules on every runner, so cross-arch checks remain static mode/existence/architecture checks and the spawn probe runs only when host and target platform/arch match.
- `file` is available on macOS release runners for best-effort architecture validation. If unavailable, the validator warns and still enforces existence and execute-bit invariants.
- Fallback PTY/direct-shell backends remain intentionally out of scope; startup failures are exposed instead of hidden.

## Known Risks

- I did not run a full Electron macOS packaging job locally. The new release workflow validation is intended to exercise staged and final app resource trees during CI packaging.
- The new validator script is a single-purpose CLI and is above the 220-line change-pressure signal. I assessed splitting it, but kept it cohesive because it owns one release validation concern and splitting would create thin indirection; it remains well below the 500-line hard guardrail.
- Full Electron macOS packaging was not rerun by implementation after the Local Fix; API/E2E still owns packaged-app validator, packaged-server websocket prompt probe, and packaged UI Terminal validation. The earlier `autobyteus-ts run build` failure is now addressed by cleaning stale ignored `dist` before build.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant, with duplicated helper-selection policy between runtime repair and packaging/postinstall paths.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, targeted.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The implementation changes the invariant from "some helper exists/executable" to "the selected node-pty native module's adjacent helper exists/executable" and enforces it in runtime bootstrap, postinstall repair, package preparation, afterPack, and release validation.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes
- Notes: No fallback terminal backend was introduced. Runtime fallback remains limited to diagnostics/repair when node-pty's selected native module cannot be inspected.

## Environment Or Dependency Notes

- Worktree: `/Users/ryan-zheng/autobyteus-org/autobyteus-workspace-intel-terminal-prompt-hang`
- Branch: `codex/intel-mac-terminal-prompt-hang`
- Base/current HEAD before implementation: `3171a5a4416e718cb4b38464206d9603733bf7a1`
- Local host for checks: Darwin x64, Node `v24.4.1`.
- Shell startup prints an unrelated `nvm` warning about version `N/A -> N/A`; commands continued normally.
- The server unit test command resets the local Prisma SQLite test database under `autobyteus-server-ts/tests/.tmp` as part of existing test setup.

## Local Implementation Checks Run

Implementation-scoped checks only; API/E2E sign-off still belongs downstream.

- `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/node-pty-bootstrap.test.ts tests/unit/tools/terminal/isolated-pty-session.test.ts tests/integration/tools/terminal/isolated-pty-session.test.ts`
  - Pass: 3 test files, 12 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/terminal/terminal-handler.test.ts`
  - Pass: 1 test file, 11 tests.
- `pnpm -C autobyteus-web exec nuxi prepare`
  - Pass.
- `pnpm -C autobyteus-web exec vitest run composables/__tests__/useTerminalSession.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts`
  - Pass: 2 test files, 20 tests. Existing KaTeX/doctype warnings printed during test setup.
- Typecheck / script syntax bundle:
  - `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit`
  - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
  - `pnpm -C autobyteus-web exec tsc -p build/tsconfig.json --noEmit`
  - `bash -n autobyteus-web/scripts/prepare-server.sh`
  - `node --check autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs`
  - `node --check autobyteus-web/scripts/prepare-server.mjs`
  - `node --check autobyteus-ts/scripts/fix-node-pty-permissions.mjs`
  - Pass: command completed with `typecheck-and-script-syntax OK`.
- `node autobyteus-web/scripts/verify-packaged-terminal-runtime.mjs --server-root . --platform darwin --arch x64 --spawn-probe`
  - Pass: validates workspace node-pty x64 helper and successfully spawns a node-pty probe on host-compatible Darwin x64.
- Temporary package-validation fixture:
  - With `prebuilds/darwin-x64/spawn-helper` forced to mode `0644`, validator fails with `node-pty spawn-helper is not executable ... mode=644`.
  - After `chmod a+x`, validator passes selected-helper checks and host-compatible spawn probe.
- `git diff --check`
  - Pass.
- `pnpm -C autobyteus-ts run build`
  - Pass after Local Fix: `node ./scripts/clean-dist.mjs && tsc -p tsconfig.build.json && node ./scripts/verify-runtime-dependencies.mjs`; output includes `[verify:runtime-deps] OK` and `dist/cli/agent-team` is absent after the clean build.
- `pnpm -C autobyteus-server-ts build`
  - Pass after Local Fix: `prepare:shared` rebuilds `autobyteus-ts`, SDK packages, Prisma client, server TypeScript, managed messaging assets, and built-in agent bootstrap smoke check.
- `pnpm -C autobyteus-ts exec vitest run tests/integration/public-surface/cli-tui-removal.test.ts`
  - Pass: 1 test file, 8 tests. Confirms removed CLI/TUI symbols and source modules remain absent, supporting the decision not to add `ink`/`react`.
- `node --check autobyteus-ts/scripts/clean-dist.mjs`
  - Pass.

## Downstream Coverage Hints / Suggested Scenarios

- Run/review macOS x64 release packaging and confirm both validator placements execute: staged `autobyteus-web/resources/server` and final `.app/Contents/Resources/server`.
- On a host-compatible Intel macOS packaged app, open Terminal and verify prompt appears instead of hanging.
- Temporarily force packaged x64 helper mode to `0644` in a local artifact and verify the validator fails before release upload.
- Verify startup failure UX displays the server-sent backend diagnostic rather than a generic websocket close/error.
- Confirm no DirectShell/Pty fallback path masks node-pty packaging failures.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E coverage investigation, durable coverage decisions, full executable validation, and any packaged-app/manual release validation are still required downstream by `api_e2e_engineer` after code review.
