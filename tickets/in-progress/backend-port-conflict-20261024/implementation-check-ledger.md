# IR-002 implementation check ledger

These are local implementation checks, not independent API/E2E acceptance. Source at **10990feb1** for final rows; earlier check snapshots retained below. Commands are from worktree root, with clean-environment pnpm invocation recorded in each log. macOS arm64 / Node26.12.0 / pnpm10.28.2. Evidence prefix is this ticket's `evidence/`.

## Rerun-by-impact plan and final results
Native core is a shared foundation. Its successive deadline/exit/observation fixes invalidate prior native-dependent results, so final terminal, scoped server, Electron and rendered-component checks all reran at10990feb1. Server readiness and desktop bind-race changes likewise have focused and final reruns. No dependency/lockfile/schema change. No base integration has occurred. Source remained unchanged during final checks; documentation edits do not invalidate code checks. Builds serialized; two small final unit/component commands overlapped briefly after the shared type/build completed, not concurrent package-output builds.

| ID | Exact command (after standard clean pnpm prefix) | Commit | Exercised / criteria | Result | Evidence / key line |
|---|---|---|---|---|---|
| IMP-13 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal tests/unit/agent/context/agent-config.test.ts` |10990feb1|Both native commands, real retained groups/HTTP survivor, timeout/host mapping, four-group collective close+unrelated survivor, anchors/framing/denial, config ref; BEH-003/004 AC-004/005|Pass|`IMP-13-terminal-final.log`: `Tests 132 passed (132)`; `"listenerReleased":true`|
| IMP-14 | `pnpm -C autobyteus-web test:electron --run electron/server/__tests__ electron/application/__tests__ electron/updater/__tests__` |10990feb1|Managed stop, actual Windows launcher with mocked OS child, complete/exit permutations,20s force,30s quit owner, no installation updater continuation, read-only real conflict listener, late diagnosis generations; BEH-001..004|Pass|`IMP-14-electron-final.log`: `Tests 141 passed (141)`|
| IMP-15 | `pnpm -C autobyteus-server-ts typecheck` |10990feb1|Production source policy; pretypecheck builds core/contracts/backend SDK; no test-tree type pass claimed|Pass|`IMP-15-server-types-final.log`: core `[verify:runtime-deps] OK`; final `tsc -p tsconfig.build.json --noEmit`, exit0|
| IMP-16 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-provider-factory-builder.test.ts tests/unit/agent-execution/backends/autobyteus tests/unit/startup tests/unit/compositions tests/unit/shutdown tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` |10990feb1|Native factory injection, real Fastify preClose+scope integration, other cleanup on failure, standalone phases, six startup cancellation points, backend IPC owner/wire; BEH-003/004|Pass|`IMP-16-server-final.log`: `Tests 209 passed (209)`|
| IMP-17 | `pnpm -C autobyteus-web test:nuxt --run components/server/__tests__` |10990feb1|Real component/store localization/monitor/loading and shutdown; BEH-001/002 AC-001..003|Pass|`IMP-17-ui-final.log`: `Tests 11 passed (11)`|
| IMP-18 | `autobyteus-web/node_modules/.bin/tsc --noEmit -p autobyteus-web/electron/tsconfig.json` (direct) |10990feb1|Main/preload shared status shape; both ambient declarations still import common type|Pass|`IMP-18-electron-types-final.log`: `No output; shell exit0.`|

Final focused executable total: **493 passing tests**, not all-repository or platform certification. No paid provider calls. Full server/desktop Codex conversation cleanup remains required independently; P-011 is standalone client evidence only.

| ID | Command / steps | Commit | Exercised | Result | Evidence |
|---|---|---|---|---|---|
| IMP-19 | `pnpm -C autobyteus-web build:electron:mac` |10990feb1|Standard guards/localization, production server/shared/core assets, renderer generation, Electron transpile and unsigned task-local packaging|Pass|`IMP-19-desktop-build.log`: `Build completed:`; no publish/install|
| IMP-20 | Standard `isolated-app start --from-worktree`, actual UI interaction and captured-owned fixture described in `IMP-20-rendered-notes.md` |10990feb1 package|English/zh-CN conflict visible without details/reset, actual retry preserves external fixture, manual release→running, sentinel, normal no-active-work quit and unrelated listener survival|Pass scoped self-validation|`IMP-20-retry-settled.json`426; `IMP-20-recovered.json`running; `IMP-20-quit.json`appAbsent/backendAbsent true in218ms; screenshots and cleanup receipt|
| IMP-21 | Changed production nonempty-line count and delta inventory |10990feb1|File size/refactor guardrails|Pass|`IMP-21-source-guardrails.json`; none over500|

The earlier54bd74 desktop build completed but was superseded after native exit/inspection and desktop bind-race fixes; it was never used as current-source acceptance. No installed app substituted.

## Earlier exact-commit attempts retained
- IMP-04: a4bcde070 terminal127 pass, superseded by native source changes/final IMP-13.
- IMP-05:1ad504c03 native23 pass, superseded by final132.
- IMP-06:1ad504c03 scoped server27 pass, superseded by final209.
- IMP-07:1ad504c03 Electron136 pass/1 failure (Windows fake-clock test). **Cause**: after20s client deadline, `waitForChildExit(0)` scheduled a second expired timer; fake timers defer timers created inside timer callbacks to next tick, so the test remained awaiting it. Product correction e3ef32cc2 immediately rejects expired waits, avoiding an unnecessary deadline extension. IMP-08 confirms19 relevant tests pass; IMP-14 confirms all141.
- IMP-09:54bd74c83 backend readiness6 pass; IMP-10:54bd74c83 application/client10 pass; IMP-11/12 production server/Electron types pass. Superseded by final rows above where source changed.

## Early exploratory attempts / failure causality
`IMP-TRIAL-*` preserves logs from the evolving initial implementation tree. Exact intermediate source/invocation was not retained; these are failure-history artifacts, **not reusable evidence of current correctness**. Final reproducible commands above supersede them.

1. Core full tsconfig trial: own union narrowing for SPAWN_FAILED was corrected; remaining global test typing errors originate from strict inclusion of unrelated test fixtures, unlike the documented production build policy. Recorded FU-001, not silently called green.
2. Initial terminal suite: tests for old numeric-PGID adoption, `ShellProcessIdentityParser` marker and stop-with-dead-leader API referenced removed unsafe mechanisms. Replaced with retained-handle/anchor and exact-distro proof tests. Separate actual write-after-end/control decoder reentrancy was fixed (buffer flush moved out of settlement, late output guarded); final real scope and framing tests pass.
3. Focused terminal rerun: mock spawn call history wasn't reset between tests; nonce argv index was wrong in the new WSL assertion. Corrected fixtures (clear history/index13); no product fallback added. Actual WSL remains unexecuted.
4. Server first typecheck lacked built workspace SDK exports and generated Prisma; documented prebuild/production typecheck prerequisites fixed setup. No invented source stubs. Initial standalone lifecycle fake had no `addHook` for new real Fastify preClose installation; fake now exposes it. All actual-source startup/factory checks green in final209.
5. Electron initial tests emitted only `close` and omitted exit state or Windows IPC while the new contract deliberately uses `exit` and complete+exit. Updated fakes/events to that contract and retained negative non-confirmation tests. Final bind-race tests additionally preserve generic HTTP fatal detail, upgrade actual conflict only after captured exit, and reject delayed old diagnosis.
6. Renderer new conflict test used the existing global `$t` placeholder returning `OwnerGuidanceNo reset`, so it never exercised real interpolation/locale. Changed fixture to real catalog translator, preserving expectations for safely rendered owner text. Final component11 passes.
7. First desktop build was setup/frozen earlier source, not a launch/quit/restart proof. Electron downloaded only into task-local dependency/build paths, unsigned package, publishing disabled. No release/install.

## Not run / downstream requirements
- Full repository test suites and API/E2E gates; this is implementation scope, not independent executable sign-off.
- Full Studio+standalone ended-agent/native command scenarios and actual changed desktop with active native/Codex conversations, kill-resistant descendants, failed/forced cleanup, data sentinel and unrelated listener survival. Broad validation belongs to API/E2E.
- Real Windows/WSL. Deterministic launcher/IPC/framing tests are not substitutes; Linux bash-local prior candidate feasibility is not WSL.
- Real updater installation/release (explicitly prohibited); unit continuation reaches mocked existing quitAndInstall only after preparation.
