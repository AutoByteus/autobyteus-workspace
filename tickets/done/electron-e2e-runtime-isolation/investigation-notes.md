# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements basis approved and corrected by the user after code review. Architecture review round 2 passed SR-002 and implementation commit `593ffcb5d243721a703bd15f4bb880e4c56b6d83` was reviewed. Code review round 1 returned `Fail / Design Impact`: `CR-F-001` is resolved in solution revision `SR-003`; `CR-F-003` through `CR-F-005` remain bounded implementation rework. `CR-F-002` is superseded because its credential-deny premise came from AR-F-004's now-user-rejected scope expansion.
- Investigation Goal: Determine how packaged Electron startup chooses backend ports and mutable data locations, identify every concurrency blocker and renderer consumer, and define a production-safe E2E isolation contract.
- Scope Classification: `Medium`
- Scope Classification Rationale: The required behavior crosses Electron bootstrap/import ordering, platform server managers, AutoByteus and Chromium storage roots, node-registry/status IPC, renderer endpoint ownership, updater lifecycle, packaging, and reusable E2E setup.
- Scope Summary: Allow one packaged artifact to run ordinary and isolated E2E instances concurrently through explicit Electron launch profiles.
- Primary Questions To Resolve:
  - Where are backend listener port/base URL and every application/profile data root selected and propagated?
  - What executes early enough to mutate production paths before current startup failure?
  - Which renderer paths still bypass the window-bound node context?
  - Are there additional single-instance or identity locks?
  - Should isolation be build-time or launch-time, and who owns port allocation and cleanup?

## Request Context

The user reports that packaged Electron E2E execution cannot coexist with a running ordinary Electron application because the embedded backend port is hard-coded and suspects the data directory is also fixed. The desired outcome is the ability to build and start Electron for E2E with a separate backend port and data location, enabling future tests inside the actual packaged Electron application while leaving production defaults unchanged.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation`
- Current Branch: `codex/electron-e2e-runtime-isolation`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation`
- Bootstrap Base Branch: `origin/personal` at `1b2e9b94d1de3b7f38aa2803082e0166a469a978`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-20 before worktree creation.
- Task Branch: `codex/electron-e2e-runtime-isolation`, created from and tracking refreshed `origin/personal`.
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Use only the dedicated task worktree above; do not modify the shared `personal` checkout or stop/reset the already-running Electron application.

## Supplemental Task Artifact Inventory

None. No separate supplement materially improves the current requirements basis; the intended launch contract remains authoritative in `requirements.md` and is mapped in `design-spec.md`.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-20 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/SKILL.md`, `design-principles.md`, and artifact templates | Apply the required bootstrap/investigation/design workflow | Dedicated worktree, requirements approval, mandatory artifacts, stable behavior IDs, and design-health/persisted-data decisions are required | No |
| 2026-08-20 | Command | `git fetch origin --prune`; `git worktree add -b codex/electron-e2e-runtime-isolation ... origin/personal` | Establish an isolated authoritative workspace from fresh remote state | Worktree created at refreshed `origin/personal` commit `1b2e9b94...` | No |
| 2026-08-20 | Doc | `autobyteus-web/AGENTS.md`; `autobyteus-web/ARCHITECTURE.md`; `autobyteus-web/docs/electron_packaging.md`; `autobyteus-web/package.json` | Discover project structure, build/test commands, and package entrypoint | Package main is `dist/electron/main.js`; build scripts generate renderer, transpile Electron, package server, and run electron-builder; Electron tests use the dedicated Vitest config | Reuse in validation design |
| 2026-08-20 | Code | `autobyteus-web/shared/embeddedServerConfig.ts`; `autobyteus-web/nuxt.config.ts`; `autobyteus-web/utils/serverConfig.ts`; `autobyteus-web/utils/embeddedNodeBaseUrl.ts` | Trace compiled endpoint defaults across main and renderer | `127.0.0.1:29695` is compiled into main/renderer paths; Electron branches return these constants as runtime values | Replace runtime authority, preserve defaults |
| 2026-08-20 | Code | `autobyteus-web/electron/main.ts`; `electron/server/baseServerManager.ts`; `electron/server/{macOS,linux,windows}ServerManager.ts`; `electron/server/serverManagerFactory.ts`; `electron/server/serverStatusManager.ts` | Trace main-process startup, port check, backend child config, status and shutdown | Singleton manager starts at fixed port, waits for it to be free, launches a child with fixed port/data path, and publishes URLs; all platform launchers repeat compiled base URL use | Central launch profile required |
| 2026-08-20 | Code | `autobyteus-web/electron/appDataPaths.ts`; `electron/server/services/AppDataService.ts`; `electron/server/serverRuntimeEnv.ts`; `electron/logger.ts`; `electron/extensions/managedExtensionService.ts`; `electron/browser/browser-session-profile.ts` | Inventory application-owned mutable state and initialization timing | `~/.autobyteus` owns backend data/logs/extensions/browser artifacts; logger opens with file mode `w`; manager initializes directories during module evaluation; persistent browser partition uses Electron session storage | Resolve isolation before imports/owners |
| 2026-08-20 | Code | `autobyteus-web/electron/nodeRegistryStore.ts`; `electron/preload.ts`; `plugins/20.windowNodeBootstrap.client.ts`; `stores/nodeStore.ts`; `stores/windowNodeContextStore.ts`; `plugins/30.apollo.client.ts`; `utils/nodeEndpoints.ts` | Trace dynamic main-to-renderer node binding | Existing registry/preload/window-context spine can carry a runtime base URL, but both main and renderer normalize the embedded node back to compiled defaults; Apollo and most WebSocket clients already use window-bound endpoints | Extend existing ownership; remove bypasses |
| 2026-08-20 | Code | `composables/useContextAttachmentComposer.ts`; `utils/contextFiles/contextAttachmentPresentation.ts`; `components/tools/McpGatewayPanel.vue`; `services/api.ts`; `stores/serverStore.ts` plus `rg` usage inventory | Find supported renderer paths still using global/static server config | Several attachment, MCP, API fallback, server diagnostics, and initial store paths can use fixed Electron URLs instead of the runtime-bound node | Include renderer cleanup in scope |
| 2026-08-20 | Code | `autobyteus-web/electron/updater/appUpdater.ts`; `electron/main.ts` | Check packaged-instance background side effects | Every packaged app schedules an update check after 8 seconds; updater/session state belongs to the product profile | Disable updater activity in E2E mode |
| 2026-08-20 | Command | `rg -n 'requestSingleInstanceLock|app.setPath|app.getPath|userData|...' autobyteus-web/electron ...` | Check single-instance and Electron profile handling | No application single-instance lock exists; `userData` is read for registry, but no alternate profile path is set | Isolate Electron paths; separate bundle ID not required |
| 2026-08-20 | Trace | `lsof -nP -iTCP:29695 -sTCP:LISTEN`; `ps -axo pid=,ppid=,command= | grep ...`; metadata-only `stat/find` of data roots | Verify the user-reported collision and actual process/data paths without disrupting the running app | Running app owns `29695`; backend child uses `--port 29695 --data-dir /Users/normy/.autobyteus/server-data`; helpers use `/Users/normy/Library/Application Support/autobyteus`; ordinary roots contain backend, browser, updater, local storage, registry, extension, and log state | Retain as runtime evidence |
| 2026-08-20 | Doc | `tickets/done/runtime-tool-mcp-unification-analysis/api-e2e-electron-dmg-startup-failure.md` | Check prior independent API/E2E findings | Prior triage explicitly states no supported runtime CLI/env override for a second packaged Electron port and isolated user data | Confirms gap |
| 2026-08-20 | Code/Doc | `autobyteus-web/scripts/verify-packaged-server-startup.mjs`; prior packaged Electron validation evidence under `tickets/done/**` | Check existing isolation techniques and reusable assets | Backend-only verifier already allocates a free port/temp data directory; prior validation often changes `HOME` and runs packaged server under `ELECTRON_RUN_AS_NODE`, but this does not prove the real Electron shell/renderer on an alternate port | Design reusable real-Electron support |
| 2026-08-20 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/api-e2e-engineer/SKILL.md` | Align requirements with downstream desktop validation policy | Real desktop execution is justified here because bootstrap/profile/IPC/lifecycle are shell-specific and cannot be fully proven in a browser; it must not disrupt the running user app | Require safe packaged-shell evidence |
| 2026-08-20 | User approval | Conversation decisions covering launch/build/profile naming and coexistence | Lock intended behavior before design | Approved one production-equivalent worktree-built artifact selected at launch with the term `launch profile`; approved `production` default and explicit `e2e`; approved launch-process environment rather than repository/data-root `.env` or build-time values; confirmed the ordinary user app must remain running during E2E | Project into design and architecture review |
| 2026-08-20 | Official API doc | `https://www.electronjs.org/docs/latest/api/app` | Confirm early path-override APIs and timing for the design | `app.setPath` requires existing directories; `sessionData` must be overridden before the `ready` event; `userData`, `sessionData`, `logs`, and `crashDumps` are named Electron paths; `app.setAppLogsPath` accepts an absolute custom path | Apply paths synchronously before readiness/session creation |
| 2026-08-20 | Architecture review | `design-review-report.md`, round 1 / `ARCH-REV-001` | Review initial solution baseline `SR-001` | Macro design passed. AR-F-001 through AR-F-003 identified safe-root, Playwright, and client/listener gaps. AR-F-004 additionally imposed credential-safe environment inheritance that was not part of the user-approved ticket; SR-002 accepted it before the later user correction. | Retain AR-F-001 through AR-F-003; explicitly retract AR-F-004-derived scope in SR-003 |
| 2026-08-20 | Code | `autobyteus-server-ts/src/app.ts`; `autobyteus-server-ts/src/server-runtime.ts`; Electron platform manager environment construction | Verify host/listener and current environment behavior | Backend CLI default is `host: "0.0.0.0"`; Fastify listens on that host; platform managers do not pass `--host` and currently spread the caller/application `process.env` into backend children | Preserve wildcard listener policy separately from loopback client URL; preserve existing environment/provisioning behavior |
| 2026-08-20 | Official API evidence via architecture review | `https://playwright.dev/docs/api/class-electron`; `https://playwright.dev/docs/api/class-electronapplication` | Validate future Playwright reuse contract | Playwright `_electron.launch(...)` owns process creation and returns `ElectronApplication`; control methods include `firstWindow()`, `process()`, and `close()`, with no attach-to-prelaunched packaged process path in that API | Split launch preparation from direct and Playwright process adapters |
| 2026-08-20 | Code review | `code-review-report.md`, round 1 / `CRR-001`; implementation commit `593ffcb5d243721a703bd15f4bb880e4c56b6d83`; `scripts/electron-e2e/electronE2ESession.mjs` and both process adapters | Validate the reviewed design against implemented ownership and failure paths | `CR-MP-002` proved a foreign process can win the accepted allocation race; current cleanup lets that ambient listener veto deletion of a preparation-owned root. `CR-MP-003` proved root-process exit does not establish descendant-tree completion. Installed `playwright-core@1.58.2` cleans/waits before rejecting without an application handle. `ElectronApplication.isAppQuitting` is dead. CR-F-002 observed `CODEX_HOME` only because the then-authoritative AR-F-004 policy required denying it. | Revise DS-006 for identity-based cleanup; retain CR-F-003 through CR-F-005; reassess CR-F-002 after user scope clarification |
| 2026-08-20 | User clarification | Conversation after `CRR-001`, corroborated by the code-reviewer reroute message | Resolve whether credential/environment isolation belongs to this ticket | User explicitly states this ticket is not about credentials; existing internal-server/API-key/Codex behavior and caller-provided environment must remain unchanged, and real-provider E2E may require those credentials. Architecture review must not expand approved scope. | Remove AC-013 and the AR-F-004 allowlist/deny/scrub design; add explicit in-scope/out-of-scope guards and preservation criterion AC-014 |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Launch packaged AutoByteus normally | Package executable -> `electron/main.ts` module graph -> logger/server-manager singletons -> `bootstrap()` -> window + backend -> platform launcher on `29695` and `~/.autobyteus/server-data` | One ordinary embedded runtime uses canonical defaults | `embeddedServerConfig.ts`; `main.ts:41-45,479-509`; platform managers; live `ps/lsof` |
| BEH-002 | Operational | Attempt to start a second packaged app while the default listener exists | Second manager -> `waitForPortToBeFree()` -> repeated bind attempts on fixed `29695` -> error after 5/10s -> status error | No supported alternate packaged port; owner of current listener must remain untouched | `baseServerManager.ts:16-28,62-85,92-141`; prior API/E2E triage; live listener evidence |
| BEH-003 | System | Import/start packaged main process | Static imports -> `logger = createElectronLogger()` -> `~/.autobyteus/logs/app.log`; `serverManager` singleton -> `AppDataService(~/.autobyteus)` -> data-directory initialization; later bootstrap reads Electron `userData` registry and creates extension/browser roots | Application/profile state can be touched before backend port failure; backend-only data override would remain incomplete | `logger.ts:154-193,226-249,338-350`; `serverManagerFactory.ts:33-34`; `baseServerManager.ts:43-53`; `main.ts:480-490` |
| BEH-004 | Contract | Renderer starts inside Electron and initializes node context | Preload IPC -> main registry snapshot -> renderer `nodeStore` -> `ensureEmbeddedNodePresent()` -> window context -> derived endpoints/Apollo/WebSockets; parallel global `serverConfig` fallbacks/callers | Most modern traffic is node-bound, but embedded registry/fallback/global consumers normalize or return compiled `29695` | `nodeRegistryStore.ts:25-70`; `nodeStore.ts:126-188`; `windowNodeContextStore.ts:46-91`; `serverConfig.ts`; call-site inventory |
| BEH-005 | Operational | API/E2E packages or probes desktop/server | Build commands create packaged artifact; existing verifier can run the packaged backend binary with free port/temp root under Node mode; actual Electron second-instance path has no isolation helper | Backend packaging can be tested in isolation, but actual shell/profile/renderer cannot safely coexist through a supported contract | `package.json`; `verify-packaged-server-startup.mjs`; prior coverage/evidence; API/E2E triage |
| BEH-006 | Contract | Test-only environment/arguments are absent or partially attempted | No grouped Electron E2E profile exists; compiled constants win; changing `HOME` can redirect some paths but not port and is implicit/platform-dependent | No fail-closed full-isolation invariant | Code search found no supported packaged override; prior triage |
| BEH-007 | Operational | Any packaged app completes renderer/bootstrap startup | `appUpdater.initialize()` -> `startAutoCheck()` -> delayed packaged update check | Test package participates in normal updater lifecycle | `main.ts:484-505`; `appUpdater.ts:47-100` |

## Design Health Assessment Evidence

- Change posture: `Behavior Change`
- Candidate root cause classification: `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Refactor is needed now. The current shared constants correctly centralize production defaults but incorrectly serve as runtime authority. Runtime configuration, persistent-path ownership, and renderer route ownership are split across early singletons and global fallbacks; a local platform-launcher override would leave production writes and renderer misrouting.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `logger.ts`, `serverManagerFactory.ts`, `baseServerManager.ts` | Stateful owners are constructed during static imports before `bootstrap()` | The entry/bootstrap boundary cannot enforce isolation today | Introduce early pure profile resolution and delayed stateful application loading/construction |
| `embeddedServerConfig.ts` usage inventory | Defaults are reused as runtime values across main, status, registry, renderer and first-run env | Centralized constant is not the same as runtime configuration ownership | Separate defaults from resolved active profile |
| Registry/window-context spine | Existing dynamic endpoint owner exists and already governs Apollo/WebSockets | Reuse/extend this subsystem instead of inventing a second renderer config channel | Make main runtime registry authoritative and remove fixed Electron bypasses |
| Data-path inventory and live process | Two major root families exist: `~/.autobyteus` and Electron `userData`; both contain mutable state | A “backend data dir only” fix is unsafe/incomplete | Derive both root families from one E2E root |
| Updater lifecycle | Packaged app auto-checks even in a test instance | E2E mode requires explicit lifecycle policy | Suppress updater side effects only in E2E mode |
| No single-instance lock | Product does not prohibit a second process | Separate bundle identity is unnecessary for direct launch | Do not expand scope to branded test package |
| `app.ts` / `server-runtime.ts` host path | Backend defaults its listener to `0.0.0.0`, while Electron/main/renderer advertise and call `127.0.0.1` | Listener binding and client endpoint are distinct current contracts | Model loopback client endpoint separately; keep listener host unconfigured and preflight the actual wildcard bind semantics |
| Platform environment propagation and existing provider/Codex flows | Electron/backend children receive caller/application environment values, and supported server/provider/Codex paths can consume them | This is established behavior and the user explicitly requires it to remain outside the isolation change | E2E preparation preserves caller env and overlays only the three launch-profile keys; server managers retain existing environment assembly plus selected port/data and normal per-instance overrides |
| `electronE2ESession.mjs` plus direct/Playwright adapters at commit `593ffcb5d` | Session cleanup gates owned-root deletion on selected-port availability, while direct completion observes only the root child | Ambient port state has no process identity and cannot govern root ownership; root disposal needs an adapter-owned whole-tree completion result | Make owned-tree completion authoritative, port observation diagnostic, and preserve the root only when tree completion is unconfirmed |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/electron/main.ts` | Main-process entry, IPC, windows, subsystem/bootstrap lifecycle | Imports all stateful owners before body; starts updater/browser/server and uses fixed data helpers | Split thin early entry from application bootstrap or otherwise guarantee profile initialization before stateful imports |
| `autobyteus-web/shared/embeddedServerConfig.ts` | Shared compiled embedded defaults | Exports fixed host/port/base URLs used as active runtime values | Retain/rename as defaults; active runtime belongs to the Electron launch profile |
| `autobyteus-web/electron/server/baseServerManager.ts` | Governing embedded-server lifecycle | Fixed port/URL and data service; readiness/restart/status derive from fields | Accept resolved runtime config once and own it for full lifecycle |
| Platform server managers | Spawn packaged backend | Repeat fixed public base URL while port field is separately passed | Derive CLI/env from manager-owned active config; no parallel default read |
| `electron/appDataPaths.ts` | Canonical production path derivation | Always defaults to `~/.autobyteus` | Production default should remain; active root must be injected/resolved |
| `electron/logger.ts` | Main-process logging | Opens/truncates production log during module evaluation | Logger creation must occur after active root resolution |
| `electron/server/services/AppDataService.ts` | Backend first-run/runtime directory/env setup and reset | Root supplied by manager, but manager always supplies canonical root | Reuse service with isolated root; ensure generated host/database match active profile |
| `electron/nodeRegistryStore.ts` | Main registry persistence and embedded-node normalization | Hard-rewrites embedded base URL to compiled default | Parameterize with active runtime base URL; main remains authority |
| `stores/nodeStore.ts` | Renderer registry state | Rewrites a main-provided embedded node back to compiled renderer default | Trust Electron main snapshot; use build config only for browser fallback |
| `stores/windowNodeContextStore.ts` and `plugins/20...` | Window-bound active node/endpoint lifecycle | Healthy dynamic routing spine | Reuse as renderer governing owner |
| `utils/serverConfig.ts` and remaining consumers | Global default URL helpers | Several supported Electron paths can bypass window binding | Remove/refactor Electron runtime uses; keep only legitimate browser config if still needed |
| `stores/serverStore.ts` | Embedded backend status UI/health/restart | Initializes display URL/port from compiled defaults and ignores status URLs | Hydrate runtime diagnostics from main status payload |
| `electron/updater/appUpdater.ts` | Packaged auto-update lifecycle | No test-mode policy | Gate updater behavior from the active launch profile |
| `scripts/verify-packaged-server-startup.mjs` | Packaged backend-only isolation probe | Already demonstrates temp data/free-port patterns | Reuse patterns, but add real packaged Electron support rather than overload Node-mode verifier |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-20 | Probe | `lsof -nP -iTCP:29695 -sTCP:LISTEN` | Running `AutoByteus` child owns `*:29695` | User-reported conflict is present now; do not stop it |
| 2026-08-20 | Trace | `ps -axo pid=,ppid=,command= | grep -E '[A]utoByteus...'` | Main packaged process has backend child with `--port 29695 --data-dir /Users/normy/.autobyteus/server-data`; helpers use `--user-data-dir=/Users/normy/Library/Application Support/autobyteus` | Port, backend root, and Chromium profile all need isolation |
| 2026-08-20 | Probe | Metadata-only `stat` and top-level `find` on `~/.autobyteus` and Electron product profile | Ordinary roots exist and contain backend, extension, log, browser artifact, cookies/cache/local storage, updater and registry state | Validation must use sentinels/temp roots, not mutate the real directories |

## External / Public Source Findings

- The official Electron `app` API documentation confirms that `app.setPath(name, path)` requires the target directory to exist, that `sessionData` must be overridden before the app `ready` event, and that `userData`, `sessionData`, `logs`, and `crashDumps` are Electron-owned mutable locations. This supports synchronous E2E-directory creation and path application in the thin entry before `app.whenReady()` or session/window construction: `https://www.electronjs.org/docs/latest/api/app`.
- Repository code and live runtime evidence remain the authority for current AutoByteus behavior; no third-party design source was used.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For final validation, a packaged Electron artifact, a controlled alternate port, an isolated temporary root, and either an existing/default-port listener or a controlled listener that simulates it.
- Required config, feature flags, env vars, or accounts: New E2E profile variables/arguments are not implemented yet. Provider accounts are not needed for isolation/readiness validation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation only; all runtime probes were read-only.
- Cleanup notes for temporary investigation-only setup: None. No process was started/stopped and no data was created for the probe.

## Findings From Code / Docs / Data / Logs

1. **Port is genuinely hard-coded across layers.** `INTERNAL_SERVER_PORT = 29695` feeds base manager, Nuxt-generated Electron runtime config, renderer helpers, registry normalization, diagnostics, and platform launchers.
2. **Backend data is genuinely hard-coded.** `getCanonicalBaseDataPath()` returns `<home>/.autobyteus`; `AppDataService` derives `server-data`; runtime env derives SQLite URL and `AUTOBYTEUS_DATA_DIR` from it.
3. **The broader data problem is larger than the backend.** Logs, extensions, browser artifacts, Chromium/session storage, registry, updater metadata, and persistent browser session state would remain shared unless both the AutoByteus base root and Electron profile paths are isolated.
4. **Current startup can mutate before the known port failure.** Static imports instantiate the logger with `fileMode='w'` and initialize backend directories before `waitForPortToBeFree()` runs.
5. **Backend launch already supports the needed primitive.** All platform managers pass explicit `--port` and `--data-dir`; the missing piece is a safe Electron-level active profile and propagation.
6. **Renderer has a reusable dynamic spine.** The node registry -> preload IPC -> node store -> window context -> derived endpoints flow already supports dynamic node URLs conceptually. Fixed embedded normalization and global fallbacks are the blockers.
7. **A build-time test port is inferior.** It would still require unique data/profile handling, would couple one artifact to one worker port, and would force rebuilds for parallel/repeated runs. Launch-time profile selection lets any fresh packaged build become a test instance.
8. **No separate bundle identity is required for either supported process adapter.** There is no single-instance lock; a direct child-process adapter or Playwright-owned `_electron.launch(...)` can launch the same exact executable when both consume the same isolated prepared launch resources. Alternate branding/signing/updater channels would be unrelated scope.
9. **Test-mode updater activity is a nondeterministic side effect.** The explicit profile should suppress it without changing normal packages.
10. **Existing verification is only partial.** `verify-packaged-server-startup.mjs` proves the packaged server resources with a free port/temp data directory under Node mode, not the Electron main/preload/renderer/profile lifecycle.
11. **The accepted allocation race separates port state from ownership.** Preparation releases its selection socket before launch, so a foreign process can bind the selected port before thin-entry preflight. The E2E process then fails closed and exits, but the foreign listener must neither be killed nor allowed to veto disposal of the still preparation-owned root.
12. **Root-process exit is not whole-tree completion.** The supported packaged runtime owns backend and Chromium descendants. Direct cleanup must confirm the adapter-owned group/tree is gone before deleting its root; the selected port being free does not prove Chromium helpers have exited.
13. **Installed Playwright rejection is settled.** For `playwright-core@1.58.2`, a launch rejection without a returned `ElectronApplication` occurs only after the launcher has cleaned and waited for any spawned process group. The adapter must therefore dispose its preparation-owned root on that rejection; speculative unobservable-process retention is not justified.
14. **Credential sanitization was an unapproved scope expansion.** AR-F-004 introduced the empty-output allowlist, deny policy, main scrub, backend snapshot, explicit secret seeding, and AC-013. The user has now rejected that policy and requires current caller-environment/server provisioning behavior to remain. CR-F-002 therefore must not add `CODEX_HOME` to a denylist; the denylist itself is removed from the target design.
15. **One bounded dead-code correction remains independent.** The unread `ElectronApplication.isAppQuitting` field/assignment must be removed under CR-F-005.
16. **MP-003 is factually reachable but no longer adverse.** Caller-provided provider/API-key/Codex values can reach Electron/backend children, but the corrected user requirement explicitly preserves that journey. Its prior “credential leak” consequence is not an approved contract and cannot drive AR-F-004, AC-013, CR-F-002, or replacement sanitization machinery.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Production backend/application state under `~/.autobyteus/**`; Electron profile state under the OS-specific `userData` path (observed locally as `/Users/normy/Library/Application Support/autobyteus`). Top-level metadata only was inspected; content/volume was not needed because no transformation is proposed.
- Relevant code-model, serialization, semantic, or physical-store change: Location selection changes only for explicit E2E mode. No database, registry, env-file, extension, cookie, or browser-session schema changes.
- Normal readers and writers, including unknown/extra-field behavior: `AppDataService` and backend config read/write the selected server-data root; logger/extensions/browser runtime use siblings below the AutoByteus root; Electron/Chromium and registry use `userData`/session storage.
- Representative direct-read or compatibility evidence: Ordinary code paths already use current locations and will keep those defaults. E2E first-run can use existing blank-root initialization mechanics.
- Required semantics and invariants preserved by direct use: `Yes` — normal profile uses the existing paths unchanged; E2E profile uses a fresh root with the same current schemas/readers/writers.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Production filesystem/profile data must not be read/mutated by E2E. Harness-created roots are disposable; caller-supplied roots must not be automatically deleted by the app. Existing environment-based credential availability and server provisioning behavior are preserved and are not treated as filesystem-root sharing.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration has no benefit because no representation changes and production location remains authoritative. Moving/copying production data would add privacy, corruption, and cleanup risk.
- Existing migration framework or lifecycle constraints, only if migration may be required: Backend first-run/migration remains scoped to whichever server-data root the active profile selects; no cross-root migration is required.

## Constraints / Dependencies / Compatibility Facts

- Production default remains loopback URL `http://127.0.0.1:29695` and base data root `~/.autobyteus`.
- The loopback URL is the Electron/client/advertised endpoint. The backend listener independently retains its current default `0.0.0.0` wildcard bind because platform launchers do not pass `--host`; host selection remains out of scope.
- The backend command accepts explicit port/data-dir already.
- Main package entry must remain `dist/electron/main.js`.
- Electron TypeScript currently uses CommonJS/static import evaluation, so a thin entry plus delayed stateful module loading/construction is likely required for strict no-write-before-validation behavior.
- Existing window-bound routing and remote-node behavior must remain intact.
- No backward-compatibility wrapper or dual runtime path should remain: defaults feed one profile resolver; all owners consume the resolved profile.
- E2E cleanup may not kill processes by broad name matching or delete a root it did not create/mark. A preparation-owned root may be deleted only after the adapter confirms its entire owned process tree is gone (or launch rejected under a verified launcher contract that already completed process cleanup). Port occupancy/availability is diagnostic only and never authorizes deletion, retention, or signaling by itself.
- The application should reject partial E2E configuration rather than honor only a port or only a data root.
- A separate product/bundle identity is not necessary for direct executable/Playwright launch and is out of scope unless the user rejects the recommendation.

## Open Unknowns / Risks

- Architecture review round 2 passed the SR-002 macro launch-profile/application/renderer/no-migration direction. Code review round 1 later exposed one cleanup-ownership design gap in `CR-F-001`; SR-003 corrects it. The user also corrected AR-F-004's credential-policy scope expansion: CR-F-002 is superseded, while CR-F-003 through CR-F-005 remain bounded implementation rework.
- The approved environment names are `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE`, `AUTOBYTEUS_ELECTRON_SERVER_PORT`, and `AUTOBYTEUS_ELECTRON_DATA_ROOT`; exact type and helper CLI structures remain design decisions.
- `playwright-core`/Electron version compatibility for real renderer automation needs downstream execution; it does not change the isolation contract.
- Platform-specific child-process-tree termination must be verified against an explicit whole-tree completion result; a root-child exit event or port-release probe alone is insufficient.
- A final implementation audit must confirm no newly added mutable path bypasses the resolved profile.

## Notes For Architecture Reviewer

Review SR-003 against `CR-F-001`: adapter-owned whole-tree completion is the sole process-lifecycle authorization for preparation-owned root disposal; selected-port state is a bounded diagnostic that cannot veto disposal or authorize signaling a foreign process. Retain SR-002 bootstrap/safe-root/client-listener/process-adapter decisions, but do not restore AR-F-004's credential policy. The approved scope explicitly preserves caller-provided environment and existing server/API-key/provider/Codex provisioning; architecture review must not add allowlists, denylists, secret-seeding requirements, or other credential behavior. `CR-F-002` is superseded. The cumulative reroute retains `CR-F-003` (dispose on settled Playwright rejection), `CR-F-004` (real tree completion), and `CR-F-005` (remove dead field).
