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

# IR-003 — CRR-001 Local Fix rerun plan

Trigger: CRR-001 Fail / CR-001, CR-002, reviewer artifactsffac4611d. Production delta d0338db0b modifies only three core terminal owners; two durable regression files added. Requirements R1/design D3.1/SR-001..006/ARCH-REV-003 unchanged. Classification Large/High.

Shared-core foundation changed, so all prior scoped executable/type checks IMP-13..18 are **Rerun** (not assumed green from IR-002). New regressions run once first; the existing terminal run excludes those two already-passing files to avoid duplicate execution in this round. Rebuild desktop from current source (IMP-19 **Rerun**) before handing its output onward. IMP-20's runtime observations remain explicitly at10990feb1, not re-labelled current; broad changed-build active/ended-agent native and composed Codex shutdown remain API/E2E obligations. Its static visual/interaction design observations remain useful because no renderer, desktop/status/UI source changed in IR-003. No fresh frontend implementation feedback loop is required for this core-only correction. No installed app or provider use.

## Fix mechanics
- **CR-001:** `ScopeOperation` distinguishes inspection/retirement from actual stop. A first stop records intent and publishes one stop promise synchronously, awaits pending retirement within the original caller deadline, then rechecks retired state or performs the real drain. Only stop work satisfies duplicate stop. Retirement's finally clears only its own entry, so it cannot delete a queued stop; retirement yields to stop intent before RELEASE. Existing3s collective close still bounds pending operations. New tests cover survivor, expired budget/no early signal, duplicate stop and empty-release completion.
- **CR-002:** output capture keeps its detachable callback alongside the bounded buffer. Manager releases capture/listeners only when no background record consumes it. Executor finally releases foreground/failed captures after preserving result output; background start finally handles launch failure. Adopted/live and completed background records preserve readable output until confirmed removal. Stop paths detach callbacks instead of blindly clearing buffers. New tests cover3 foreground commands, both failed launch forms, adopted asynchronous output and completed background history.

Before-fix reviewer probe re-executed unchanged atffac4611d and failed both invariants; after d0338db0b the same probe passes2/2 with stopped/empty group and zero unused captures/bytes. These ticket probes supplement, not replace,8 durable regressions.

| Check | Exact command / steps | Commit | Result / exercised contract | Evidence / look for |
|---|---|---|---|---|
| IMP-22 | Existing reviewer probe: `autobyteus-ts/node_modules/.bin/vitest run --config tickets/in-progress/backend-port-conflict-20261024/evidence/probe.config.mjs tickets/in-progress/backend-port-conflict-20261024/evidence/CR-01-native-review.probe.test.ts` |ffac4611d|Fail, both expected-invariant failures reproduced before correction; BEH-003/004|`evidence/IMP-22-review-reproduction.log`:2 failed, survivor still present /3 captures|
| IMP-23 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal/command-execution/stop-retirement-race.test.ts tests/unit/tools/terminal/command-execution/output-capture-lifetime.test.ts` |d0338db0b|Pass,8 durable regressions; CR-001/002|`evidence/IMP-23-durable-regressions.log`:8 passed|
| IMP-24 | Same exact reviewer-probe command as IMP-22, unchanged probe source |d0338db0b|Pass; same2 invariants now achieved|`evidence/IMP-24-review-probe-after.log`:2 passed; `"retainedCaptures":0,"retainedOutputBytes":0`; stopped/no survivors|
| IMP-25 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/terminal tests/unit/agent/context/agent-config.test.ts --exclude '**/stop-retirement-race.test.ts' --exclude '**/output-capture-lifetime.test.ts'` |d0338db0b|Pass,132 existing cases, new8 already passed in same source round; BEH-003/004|`evidence/IMP-25-core-rerun.log`:132 passed|
| IMP-26 | `pnpm -C autobyteus-server-ts typecheck` |d0338db0b|Pass; builds core/contracts/backend SDK then production server typecheck|`evidence/IMP-26-server-types.log`:runtime-deps OK, tsc exit0|
| IMP-27 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-provider-factory-builder.test.ts tests/unit/agent-execution/backends/autobyteus tests/unit/startup tests/unit/compositions tests/unit/shutdown tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts` |d0338db0b|Pass; same209 server/host/factory/startup checks rerun against current core|`evidence/IMP-27-server-rerun.log`:209 passed|
| IMP-28 | `pnpm -C autobyteus-web test:electron --run electron/server/__tests__ electron/application/__tests__ electron/updater/__tests__` |d0338db0b|Pass;141 desktop lifecycle/diagnosis/IPC/updater tests; no actual install|`evidence/IMP-28-electron-rerun.log`:141 passed|
| IMP-29 | `pnpm -C autobyteus-web test:nuxt --run components/server/__tests__` |d0338db0b|Pass;11 component/localization/derived monitor tests|`evidence/IMP-29-components-rerun.log`:11 passed|
| IMP-30 | `autobyteus-web/node_modules/.bin/tsc --noEmit -p autobyteus-web/electron/tsconfig.json` |d0338db0b|Pass; main/preload/shared status types|`evidence/IMP-30-electron-types.log`:No output; shell exit0|
| IMP-31 | `pnpm -C autobyteus-web build:electron:mac` |d0338db0b|Pass; current task-local server/core/renderer/Electron package, no publish/install|`evidence/IMP-31-desktop-build.log`:Build completed|
| IMP-32 | Nonempty-line count of changed production owners |d0338db0b|Pass; all3 remain under500; no large new monolith|`evidence/IMP-32-local-fix-size.json`|

**Current result:**501 durable scoped tests pass (140 core including8 new,209 server,141 Electron,11 components), plus2 unchanged reviewer probes. All prescribed scoped production typechecks and current task-local build pass. Commands serialized; no provider calls or app launch in this rework. New regression/probe fixtures close owned anchors and remove their private roots in finally. Prior full test-tree exploratory typing follow-up FU-001 remains unchanged. No API/E2E acceptance, source re-review pass, merge, release or install claimed.


# IR-004 — DS-005 authoring checkpoint / validation plan (NOT RUN)
2026-10-26, parentb903d187e. R2/D4.1/SR-001..008/ARCH-REV-004; Large/High. All executable checks paused by user; coordinator clarification still pending. Static reads/diffs/source edits only. No new numbered executable success/failure receipt exists. Two SDK dist directories and prior build outputs untouched.

| Surface | Prior exact evidence | Disposition after DS-005 | Required authorized next action |
|---|---|---|---|
| Core terminal scope/capture/anchor, AgentConfig | IMP-23..25 atd0338db0b | Still valid for unchanged core source | No habitual rerun; investigate if a later shared-foundation change occurs |
| Codex thread/backend, AgentRun public read, manager/registry | Prior source review D3.1; new DS-005 behavior untested | New/Rerun by changed runtime path | Run authored view/inspection, backend control, registry and query unit files; relevant existing Codex/thread/AgentRun/manager and idle controls |
| New GraphQL schema/query and generated types | No DS-005 baseline | Incomplete | Use repository codegen from current task-local schema; generated/graphql.ts currently lacks imported new types. No hand-written generated substitutes |
| Production server types | IMP-26 atd0338db0b | Rerun | Documented server typecheck after permitted prerequisite/generation work |
| Native compositions/startup/shutdown | IMP-27 atd0338db0b | Prior receipt retained; exact changed integration impact to assess | Do not relabel as DS-005 coverage; no broad rerun merely because another server area changed |
| Electron lifecycle/diagnosis/IPC/updater | IMP-28/30 atd0338db0b | Still valid for unchanged main/preload source | No installer, no lifecycle-source change this round |
| ServerLoading/Monitor conflict components | IMP-29 atd0338db0b; IMP-20 rendered at10990feb1 | Still valid for unchanged conflict renderer | Not evidence for BackgroundTaskPanel |
| BackgroundTaskPanel/composable/locales | New authored unit files and updated stream/catalog control expectations | New/Rerun | `pnpm -C autobyteus-web test:nuxt --run components/progress/__tests__/BackgroundTaskPanel.spec.ts components/progress/__tests__/BackgroundTaskPanel.inspection.spec.ts localization/messages/__tests__/backgroundTaskPanelCatalog.spec.ts`; applicable web/localization guards/types |
| Task-local production desktop build | IMP-31 atd0338db0b | Stale for DS-005 | Serialized current task-local build after authorization; no installed substitute |
| Rendered visibility feedback loop | None | Required / paused | Normal/narrow English/zh-CN; loading/unknown/unavailable/empty/running/terminal and selected-agent transitions; actual interaction and privacy, not screenshots alone |
| Independent integrated Codex/native + R2 acceptance | API-04/06 scoped receipts in API report at their own source; c88a6224c partial checkpoint | Preserve exact receipts; NOT overall pass, NOT DS-005 coverage | API/E2E owner, separately user-paused. New actual Codex→query→panel journey and changed-runtime cleanup assessment require their authorization and applicable source review |

No test count or result is inferred from authored files. No paid model, provider fixture or server/app launch occurred. Codegen, compilation and rendered inspection remain explicit readiness blockers until authorized and completed.
