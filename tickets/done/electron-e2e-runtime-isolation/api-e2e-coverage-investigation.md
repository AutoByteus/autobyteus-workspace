# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/design-spec.md`
- Supplemental Task Artifacts: None.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A.
- Relevant Delivery Revision IDs: N/A.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation/tickets/done/electron-e2e-runtime-isolation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` handoff after `CRR-003` passed implementation source commit `edb123b47f86d69ea7ceb1aaefa799321760cde4`.
- Prior Investigation Reviewed: None; no prior canonical coverage investigation or API/E2E result exists.
- Latest Authoritative Investigation: Round 1; this file is the canonical investigation and will be updated with execution evidence.

## Current Requirement And Design Basis

The same production-equivalent packaged Electron artifact must support the unchanged `production` launch profile and an explicit fail-closed `e2e` launch profile. A valid E2E launch requires a non-default port and an existing safe absolute root, must resolve and apply all application-owned AutoByteus and Electron/Chromium mutable paths before stateful owners write, must preserve the caller environment and existing server/API-key/provider/search/Codex provisioning behavior, must propagate one selected loopback client base URL through backend launch, health/status, registry, preload, renderer HTTP, and renderer WebSocket consumers while preserving the backend's wildcard listener default, and must suppress updater activity.

The executable support boundary must prepare one single-use exact-artifact launch that either the direct adapter or Playwright Electron adapter consumes. The adapter, not the selected port, owns its launched process tree. An affirmative whole-tree completion result authorizes disposal of a preparation-owned root; caller roots and roots whose tree completion is unconfirmed are retained. Ambient or foreign port occupancy is diagnostic only and never authorizes signaling or vetoes owned-root disposal.

Production state remains `Directly Usable — No Migration`: the ordinary application continues to use port `29695`, canonical `~/.autobyteus` state, and the ordinary Electron product profile in place. E2E starts from a separate blank or deliberately seeded current-schema root; no production data is copied, translated, reset, or migrated.

Critical executable proof is required for same-artifact coexistence (`AC-002`), selected backend and renderer routing (`AC-003`/`AC-004`), full path/profile isolation (`AC-005`/`AC-006`), parallel distinct instances (`AC-007`), fail-closed raw packaged startup (`AC-008`), direct and Playwright cleanup ownership (`AC-009`/`AC-012`), updater suppression (`AC-010`), reuse without rebuild (`AC-011`), and caller/backend environment preservation plus a usable provider/settings journey (`AC-014`). `AC-001` production preservation is supported by repository coverage and read-only observation of the already-running ordinary application because launching a second production-profile artifact while it owns `29695` would itself be unsafe and would not represent a supported successful production journey.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / ordinary packaged defaults | Preserved | R-001, R-006; AC-001, AC-011; `SR-003`; `IR-003` | Re-run production-default contracts and observe the existing ordinary process without starting or mutating another production-profile instance. |
| `BEH-002` / alternate packaged listener | Added | R-001 through R-003; AC-002, AC-003 | Real current-worktree artifact must become healthy while the existing ordinary listener remains alive on `29695`. |
| `BEH-003` / mutable roots and caller environment | Changed and Preserved | R-002 through R-004, R-007, R-009; AC-004 through AC-006, AC-008, AC-014 | Exercise real Electron paths, helper arguments, backend data arguments, controlled production sentinels, and non-secret caller/provider/Codex sentinels. |
| `BEH-004` / endpoint authority | Changed | R-003, R-005; AC-003, AC-004 | Correlate backend child command, health, registry/status preload APIs, renderer requests, and provider/settings GraphQL traffic to the selected port; reject any observed `29695` renderer request. |
| `BEH-005` / prepared launch and cleanup | Added | R-007, R-008; AC-007, AC-009, AC-012 | Run both adapters against the same exact artifact, parallel launches, whole-tree cleanup, owned-root deletion/retention rules, and foreign-port diagnostics. |
| `BEH-006` / grouped fail-closed validation | Added | R-002, R-009; AC-008 | Spawn the packaged entry with raw invalid/partial environments against controlled production sentinels and prove early nonzero exit/no backend/window/canonical mutation. |
| `BEH-007` / updater policy | Changed and Preserved | R-010; AC-010 | Keep an E2E instance alive past the former delayed updater-start interval; inspect request/process/file/log evidence for updater absence. Production updater construction remains repository-covered and is not exercised against the user's updater state. |
| Windows exact-identity process tree | Changed | R-008; AC-009, AC-012; `IR-003`, `CRR-003` | Deterministic durable contracts remain required. A real Windows CIM/taskkill run is conditional on a supported Windows host/runner; the assigned host is macOS. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes, bounded | Embedded backend runtime configuration and data-root selection; no business schema change | Manager/AppDataService/runtime-env tests | Packaged child arguments, actual first-run root initialization, and live health | Project Desktop Validation / Live API |
| API / transport / contract | Yes | Status/registry IPC plus renderer REST/GraphQL/WebSocket endpoint derivation | Status, registry, node-store, API-routing, endpoint tests | Actual preload bridge and renderer traffic from a packaged window | Playwright Electron / Live API |
| Frontend component / state | Yes, bounded | Consumers formerly using compiled endpoint fallbacks | Focused component/store tests | Provider/settings page loading through the packaged selected backend | Playwright Electron |
| Browser integration / user journey | Yes | Browser-mode defaults are intentionally preserved while generic fallbacks were removed | Browser config and Nuxt tests | Broader renderer/browser regression from generated assets | Focused Nuxt plus packaged renderer |
| Authentication / session / permissions | Yes, preservation only | Caller provisioning inputs and isolated Electron session/profile | Environment and platform handoff tests | Real process inheritance and fresh isolated renderer session | Packaged process inspection / Playwright Electron |
| Desktop renderer / web-equivalent UI | Yes | Window-bound selected node controls supported HTTP/WebSocket clients | Store/service/component tests | Real generated renderer, preload bootstrap, DOM/provider journey | Playwright Electron (preferred for the renderer) |
| Desktop shell / Electron-specific integration | Yes, critical | Early entry, `app.setPath`, preload/IPC, updater policy, packaged executable | Electron Vitest contracts | Actual packaged path timing, windows, helpers, and Playwright compatibility | Project Desktop Validation |
| Process / lifecycle | Yes, critical | Direct/Playwright process-tree ownership and cleanup | Seventeen Node support contracts plus POSIX/Windows algorithms | Real backend/Chromium descendants and actual adapter close behavior | Lifecycle / packaged desktop |
| Persisted-data transition | Yes, location only | Production direct-use in place; blank E2E roots use current readers | Path/profile tests and no migration code | Live proof that E2E writes remain under its root and controlled production sentinels remain unchanged | Packaged desktop plus filesystem evidence |
| Worker / queue / distributed coordination | No | No worker/queue protocol changed | N/A | N/A | None |
| External integration | Yes, preservation plus user-requested live check | Provider/search/Codex environment/provisioning must remain available | Environment/platform handoff contracts | Actual backend inheritance, isolated vault import, local agent-package import, and one live team/provider completion | Process inspection plus packaged provider/settings UI and one minimal packaged classroom simulation |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/electron-e2e-runtime-isolation`
- Project type and runtime stack: pnpm workspace; Node/TypeScript backend; Nuxt/Vue renderer; Electron `42.4.1`; Vitest; `playwright-core` resolved by the workspace at `1.58.2`; electron-builder packaged desktop.
- Conflicting, missing, or unclear project instructions: `autobyteus-web/README.md` and `docs/electron_packaging.md` still describe only fixed port `29695`; this is a known delivery-owned documentation impact, not execution authority. The new package script and reviewed implementation define the current launch contract. The README does not yet document the new `test:e2e:electron` command.
- Required environment variables or secrets available: The isolation proof uses only controlled non-secret sentinels. On 2026-08-20 the user additionally authorized the owner-private source `/Users/normy/.autobyteus/server-data/.env` for one isolated live-provider check. Its recognized values will be previewed and imported only through `pnpm secrets:import` into the disposable E2E SQLite database; no value may appear in evidence. The current caller environment remains available to the build step, and the packaged child environment retains normal runtime essentials.
- Host observation before execution: macOS arm64; an ordinary AutoByteus process from the shared checkout is running as PID `97821`, with backend child PID `98429` listening on wildcard port `29695`. It must not be stopped, reset, activated, or repurposed. No current-worktree `electron-dist` artifact exists yet.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Closest repository instructions | Colocated tests; `pnpm test:nuxt ... --run`; Electron suite command; never bulk-stage. |
| `autobyteus-web/README.md` | Development, build, and test guide | `pnpm build:electron:mac`; `electron-dist`; `pnpm test:electron`; Nuxt tests require `--run`; browser development is web-equivalent only. |
| `autobyteus-web/ARCHITECTURE.md#testing-strategy` | Test placement/strategy | Vitest and colocation are authoritative for unit/component coverage. |
| `autobyteus-web/package.json` | Executable scripts and pinned runtime | `pnpm build:electron`, `pnpm test:e2e:electron`, `pnpm generate:electron`, `pnpm transpile-electron`, Electron `42.4.1`, Playwright dependency. |
| `autobyteus-web/docs/electron_packaging.md` | Packaging/runtime resource setup | Packaged server lives under app resources; package validation must use host-native macOS output. Some port/path text is intentionally stale pending delivery. |
| `autobyteus-web/electron/vitest.config.ts` and Nuxt Vitest config | Test-runner configuration | Electron checks run with the dedicated config; renderer tests run with `NUXT_TEST=true` through package script. |
| `scripts/electron-e2e/**` and `scripts/run-electron-e2e.mjs` | Current reusable launch boundary | Preparation builds by default or reuses exact artifact with `--skip-build`; it chooses a wildcard-bind-safe non-default port and safe root; direct and Playwright adapters share common readiness/cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository checks | `autobyteus-web` | Focused Node/Vitest first, then Electron and affected Nuxt suites | Do not use watch mode | Command exit/result | No runtime resources |
| Packaged artifact | `autobyteus-web` | `pnpm build:electron` | Host-native macOS arm64 artifact; one build must be reused for all port/root pairs | Exact executable exists and hash recorded | Build artifact retained as repository output/evidence, not an active process |
| Direct packaged E2E | `autobyteus-web` | Prepared launch -> `launchPreparedElectronDirect` | Dedicated POSIX process group; controlled E2E root/env | `/rest/health` on selected loopback port | Common session confirms group absence, then deletes only preparation-owned root |
| Playwright packaged E2E | `autobyteus-web` | Prepared launch -> `_electron.launch` adapter | Playwright owns Electron process/application/window | Health plus `firstWindow`, preload registry/status, and semantic DOM/provider route | `ElectronApplication.close` through controller; common session confirms whole group and root disposition |
| Ordinary application | External/shared checkout process | Already running; no start command | PID/default-port identity recorded read-only | Default port listener and health remain responsive | No action; never signal or modify |
| Foreign-port race fixture | Validation process only | Owned `net.Server` on selected/rebound port | Has no AutoByteus identity or E2E-root ownership | Server remains listening | Close only the fixture server created by the probe |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| E2E application root | `prepareElectronE2ELaunch` owned `mkdtemp` | Separate from real and controlled production roots | Deleted only after affirmative owned-tree completion |
| Controlled production sentinel | Probe-created temporary caller `HOME` with `.autobyteus`/Electron-profile sentinel files | Avoids writing test sentinels into the user's real production state; child E2E paths must not touch it | Probe owns and removes after unchanged-content/metadata assertion |
| Caller/provider/search/Codex sentinels | `sourceEnv`/`extraEnv` non-secret marker values | Never use or record real credential values; assert presence as booleans or known non-secret markers only | Process-scoped; temp `CODEX_HOME` fixture removed if probe-owned |
| Renderer state isolation | Per-instance localStorage/cookie marker through Playwright | Each instance has a distinct `userData`/`sessionData` descendant | Removed with owned E2E root after tree completion |
| Provider/settings journey | Existing packaged settings route and GraphQL provider catalog/settings requests | First use controlled read-only catalog proof; for `E2E-LIVE-006`, target only the disposable E2E database and record configured identifiers/status without values | Delete the disposable root and its database/key pair only after the team run is terminated and packaged process tree is confirmed complete |
| Requested agent package | Settings -> Agent Packages local-path import of `/Users/normy/autobyteus_org/autobyteus-agents` | Import links the owner-supplied path read-only/in place; do not edit or remove package source files; verify `classroom-simulation-team` catalog identity | Package registry remains inside disposable E2E root and is deleted with it; external package source remains byte-for-byte untouched |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data decision and DS-001/DS-002/DS-005; `implementation-handoff.md` Persisted Data Transition Check.
- Representative existing-data setup and required behavior: The already-running ordinary app continues serving from its existing canonical roots. Packaged E2E uses fresh current-schema roots. A controlled temporary caller-home sentinel represents production canonical locations for mutation assertions without altering the user's actual state.
- Evidence planned for the approved direct-use outcome: Record ordinary PID/port health before, during, and after E2E; record its command identity unchanged; assert controlled production sentinel content/metadata and real ordinary listener identity are unchanged; assert all new packaged test paths and first-run server data are descendants of the isolated root; assert no migration/legacy branch appears.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `electron/launch-profile/__tests__/e2eDataRootSafety.spec.ts` | Existing safe root, missing/symlinked/overlapping root rejection | R-002 through R-004, R-009; AC-005, AC-008 | Still Valid | Assertions match SR-003 safe-root contract | Re-run focused and full Electron suites. |
| `electron/launch-profile/__tests__/electronLaunchProfile.spec.ts` | Production defaults, grouped E2E inputs, verified path descendants | R-001 through R-004, R-006, R-009; AC-001, AC-005, AC-006, AC-008 | Still Valid | Current assertions use approved three-key profile and no legacy fallback | Re-run. |
| `electron/launch-profile/__tests__/e2eLaunchPreflight.spec.ts` | Wildcard-exclusive occupied-port rejection | R-002, R-005, R-009; AC-003, AC-008 | Still Valid | Matches preserved listener semantics | Re-run and add raw packaged occupied-port execution. |
| `electron/server/__tests__/platformServerEnvironment.spec.ts` | Caller API-key/provider/search/Codex markers reach all platform spawns before existing overrides; no host option | R-005, R-007; AC-003, AC-014 | Needs Update (runner scoping only; assertion remains valid) | The test passed in the authoritative Electron Node config but deterministically failed when the Nuxt runner also discovered `electron/**`; Nuxt application setup preloads a different browser-oriented module boundary before this spawn mock. This is not evidence against the approved assertion, but the test must explicitly skip the non-authoritative `NUXT_TEST` runner so the broader suite does not report a false implementation failure. | Add a narrow `NUXT_TEST` runner gate, then prove skip under Nuxt and pass under Electron; correlate real macOS child environment/command. |
| `electron/server/__tests__/BaseServerManager.spec.ts`, `ServerStatusManager.spec.ts`, AppDataService/runtime-env tests | Selected launch config drives health/status/data/start/restart | R-003 through R-005; AC-003, AC-004, AC-012 | Still Valid | Assertions represent current injected configuration | Re-run focused/full. |
| `electron/__tests__/nodeRegistryStore.spec.ts`, `stores/__tests__/nodeStore.spec.ts`, `windowNodeContextStore.spec.ts` | Main-selected embedded URL is trusted, bootstrap fails rather than falling back, remote/browser paths remain | R-005; AC-004 | Still Valid | Explicit selected URL and preserved remote/browser assertions | Re-run focused Nuxt/Electron groups. |
| `services/__tests__/api.nodeRouting.spec.ts`, browser server config, attachment/MCP/component tests | Bound endpoint drives REST/other renderer consumers; browser defaults remain scoped | R-005; AC-004 | Still Valid | Covers removed generic fallback call sites | Re-run affected Nuxt tests and broader suite. |
| `scripts/electron-e2e/__tests__/electronE2EEnvironment.node-test.mjs` | Caller provisioning values remain and only three isolation values are forced | R-007; AC-014 | Still Valid | Directly matches corrected user scope | Re-run. |
| `scripts/electron-e2e/__tests__/directElectronProcessAdapter.node-test.mjs` | Exact artifact/env spawn and failure cleanup semantics | R-007, R-008; AC-009, AC-012, AC-014 | Still Valid | Adapter contract remains current | Re-run; supplement with real packaged direct launch. |
| `scripts/electron-e2e/__tests__/playwrightElectronProcessAdapter.node-test.mjs` | Playwright-owned launch/application and settled rejection cleanup | R-007, R-008; AC-009, AC-012 | Still Valid | Installed launcher premise was reviewed and source-approved | Re-run; supplement with real packaged Playwright launch/close. |
| `scripts/electron-e2e/__tests__/electronE2ESession.node-test.mjs`, `ownedElectronProcessTree.node-test.mjs` | Whole-tree completion controls root disposal; foreign port is diagnostic; force escalation/idempotence | R-008; AC-009, AC-012 | Still Valid | Matches SR-003 ownership correction | Re-run; supplement with actual process groups and foreign fixture. |
| `scripts/electron-e2e/__tests__/windowsOwnedProcessTree.node-test.mjs` | Creation-qualified targeting, PID reuse avoidance, incomplete history fail-closed | R-008; AC-009, AC-012; IR-003/CRR-003 | Still Valid | Final source finding is closed by these deterministic scenarios | Re-run on macOS; execute real CIM/taskkill only if a Windows host is available. |
| `scripts/run-electron-e2e.mjs` / `pnpm test:e2e:electron` | Builds/prepares one launch, waits for health/window, prints metadata, cleans up | R-007; partial AC-002, AC-003, AC-009, AC-011 | Needs Update in coverage role | It is a useful launch smoke but does not assert coexistence identity, paths, endpoint traffic, parallelism, invalid config, updater suppression, provider journey, or evidence output | Keep launcher behavior; add a dedicated durable packaged isolation probe rather than turning the thin launcher into a monolithic test. |
| Existing browser E2E probes under `tests/e2e/` | Browser-only responsive/diagram/content behavior | No direct launch-profile requirement | Out Of Scope | They do not exercise Electron entry/preload/profile/process boundaries | Do not run unless broader Nuxt failures point to them. |

## Stale Or Obsolete Coverage Decisions

None. No existing durable test asserts the removed fixed Electron endpoint, credential filtering, root-child-only completion, port-gated root retention, or another legacy path. No assertion was deleted or disabled. The platform-server environment test was gated out only under the incompatible Nuxt runner and remains enabled under its authoritative Electron Node runner.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `E2E-PKG-001` | Real same-artifact direct coexistence, selected backend args/health, isolated roots, ordinary listener preservation, whole-tree cleanup | R-001 through R-008; AC-002, AC-003, AC-005, AC-006, AC-009, AC-011, AC-012 | `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` | No repository test currently crosses the packaged executable -> embedded backend -> OS process/path boundary. |
| `E2E-PKG-002` | Real Playwright Electron renderer/preload registry/status/request routing, provider/settings catalog journey, caller/main/backend environment sentinels, updater inactivity | R-003 through R-007, R-010; AC-004, AC-006, AC-009 through AC-011, AC-014 | Same probe plus package script | These are critical shell/renderer boundaries and Playwright compatibility is an explicit residual risk. |
| `E2E-PKG-003` | Two simultaneous instances using one exact artifact with distinct ports/roots and isolated renderer local state | R-007, R-008; AC-007, AC-011, AC-012 | Same probe | Parallel same-artifact operation is a core acceptance criterion and currently has no executable regression. |
| `E2E-PKG-004` | Raw packaged invalid/partial/unsafe/default/occupied-port configurations fail before backend/window or controlled production mutation | R-002, R-003, R-009; AC-008 | Same probe | Resolver/preflight unit tests do not prove thin-entry ordering in the actual artifact. |
| `E2E-PKG-005` | Accepted allocation race: foreign port owner survives, E2E fails closed, owned tree completion still disposes owned root and reports occupancy | R-008, R-009; AC-009, AC-012 | Same probe | This previously caused a design-impact finding and warrants durable cross-boundary regression. |

The probe will write machine-readable evidence below the caller-selected `--output-dir`, use existing preparation/adapters rather than duplicate product support logic, emit only non-secret sentinel results, and clean up only its own roots/processes/servers.

The user's later request adds `E2E-LIVE-006`: reuse the exact already-built packaged artifact with a caller-supplied disposable E2E root; initialize its current-schema database; run the documented value-free secret-import dry run and confirmed import against that exact database; import `/Users/normy/autobyteus_org/autobyteus-agents` as a local agent package; select the imported `Classroom Simulation Team`; select AutoByteus runtime model `deepseek-v4-flash`; and exercise one minimal professor -> student -> professor file-backed message loop through the packaged renderer. This is temporary live validation, not durable secret/provider coverage: it depends on an owner-private source, a paid/external service, mutable provider availability, and user-authorized cost.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `E2E-PKG-001` through `005` | `autobyteus-web/package.json` | Add a named script for the durable isolation probe while retaining `test:e2e:electron` as the thin reusable launch smoke | R-007; AC-009, AC-011 | Avoid changing the established launcher semantics. |
| `E2E-REPO-ENV-001` | `autobyteus-web/electron/server/__tests__/platformServerEnvironment.spec.ts` | Gate this Node-only mocking test when the Nuxt runner preloads the browser graph; keep it authoritative and enabled in Electron Vitest | R-005, R-007; AC-003, AC-014 | The assertion is unchanged. The initial Nuxt failure proved wrong-runner contamination; Electron execution passes it in the intended process environment. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `node --test scripts/electron-e2e/__tests__/*.node-test.mjs` | `autobyteus-web` | Preparation environment, direct/Playwright adapters, session ownership, POSIX behavior, deterministic Windows creation-identity/PID-reuse behavior | Pass — 17/17 | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/node-electron-e2e-support.log` |
| 2 | `pnpm test:electron -- --run <focused paths>` | `autobyteus-web`; package argument handling selected the entire authoritative Electron suite | Launch profile, path/config/updater/platform/registry/server-manager contracts and broader Electron regression | Pass — 33 files/135 tests; one existing gated real-release skip | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/focused-electron.log` |
| 3 | `pnpm test:nuxt <8 focused paths> --run` | `autobyteus-web` / Nuxt Vitest | Node/window endpoint authority, REST routing, browser defaults, attachment and MCP consumers | Pass — 8 files/45 tests | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/focused-nuxt-routing.log` |
| 4 | Nuxt- and Electron-runner checks for `platformServerEnvironment.spec.ts` after the runner gate | `autobyteus-web` | Ensures a Node/Electron mocking test is not invalidated by Nuxt browser-graph preloading while remaining authoritative in Electron | Pass — Nuxt: one intentional skip; Electron: full 33/135 pass | `.../logs/platform-server-environment-nuxt-config-after-gate.log`; `.../logs/platform-server-environment-electron-config-after-gate.log` |
| 5 | `pnpm test:nuxt --run` | `autobyteus-web` | Broad renderer/browser regression | Fail outside changed boundary — 406 files/2244 tests passed, 3 files/3 tests failed, 2 skipped | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/full-nuxt-after-runner-gate.log` |
| 6 | `pnpm transpile-electron` | `autobyteus-web` | Main/preload TypeScript compilation | Pass | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/transpile-electron.log` |
| 7 | `pnpm generate:electron` | `autobyteus-web` | Production Electron main/preload bundling and generated renderer | Pass | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/generate-electron.log` |
| 8 | `pnpm build:electron` | `autobyteus-web`; default all-platform target on macOS arm64 | All build prerequisites passed; packaging target selection was exercised | Fail by documented host/target constraint — Linux package requires Linux host | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/build-electron.log` |
| 9 | `NO_TIMESTAMP=1 node build/dist/build.js --mac` after successful prerequisites | `autobyteus-web`; native macOS arm64 target | Host-supported packaged artifact | Pass — app, DMG, ZIP and blockmaps built | `tickets/done/electron-e2e-runtime-isolation/probes/api-e2e/logs/package-mac.log` |
| 10 | `node --check tests/e2e/electron-launch-profile-probe.mjs` and package JSON parse | `autobyteus-web` | Durable probe syntax and package-script registration | Pass | Final verification recorded in the execution coverage report. |

The three broad Nuxt failures were checked rather than assumed: `AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` (WebSocket spy count), `zhCnGlossaryConsistency.spec.ts` (pre-existing deprecated glossary), and `HistoricalTeamLazyHydration.integration.spec.ts` (undefined reactive value) are outside the launch-profile, endpoint-routing, provisioning, and Electron process-lifecycle changes. Focused changed-boundary renderer coverage passed. They remain transparent repository baseline failures, not ticket failures.

The initial Nuxt-runner failure of `platformServerEnvironment.spec.ts` was a coverage-environment defect owned here: Nuxt preloaded a browser dependency graph before the Node module mock. The test is now skipped only when `NUXT_TEST=true` and continues to run and pass under the authoritative Electron Vitest configuration. Its assertion was not weakened.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 86% | Reviewed unit/integration contracts passed across profile resolution, path isolation, endpoint authority, updater policy, environment preservation, and lifecycle ownership | The real packaged entry, renderer, backend, and coexistence criteria were not yet crossed | Run `E2E-PKG-001` through `005` and the authorized live journey |
| Changed-boundary execution directness | 80% | All changed source owners ran in the authoritative repository suites | Most repository coverage isolates modules or adapters | Launch the exact packaged executable directly and through Playwright |
| Cross-boundary integration realism and mock gap | 78% | Generated bundles compiled and affected renderer routing tests passed | Mocking does not prove main -> preload -> renderer -> bundled backend or OS descendants | Packaged semantic and process-correlated execution |
| Environment, configuration, identity, and fixture fidelity | 82% | Environment construction and path/identity contracts passed | Actual inherited environment, distinct roots, child args, and ordinary identity preservation were unobserved | Controlled sentinels and live process/filesystem evidence |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Invalid profile, occupied port, direct/Playwright cleanup, POSIX groups, and Windows PID-reuse contracts passed | Raw artifact failures, parallel trees, and accepted live port race were not yet observed | Packaged invalid/race/parallel runs |
| User-surface, browser, and desktop-shell confidence | 77% | Electron and renderer repository suites plus generated renderer passed | No packaged window, bridge, provider UI, updater delay, or live team journey yet | Playwright Electron and live provider/team journey |
| Durable regression coverage quality and relevance | 92% | Existing coverage remained current and the new probe mapped the critical cross-boundary gap without replacing unit contracts | The new durable probe still required real execution and proportional review | Run the packaged probe, then return it through code review |

- Overall post-repository confidence: **83.3%**.
- Calculation method: Simple average of the seven applicable categories: `(86 + 80 + 78 + 82 + 88 + 77 + 92) / 7 = 83.3%`.
- Every critical acceptance criterion directly proven: `No` — the host-applicable packaged boundaries still required execution.
- Any applicable category below `90%`: `Yes` — all except durable regression coverage.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: Exact-artifact direct and Playwright compatibility; main/preload/renderer/backend endpoint continuity; actual mutable-root placement; parallel instances; raw fail-closed behavior; updater inactivity; actual POSIX descendant cleanup; the accepted port race; caller-provisioned provider journey; and unavailable real Windows execution.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Project Desktop Validation` + `Lifecycle` + `Live API`, using Playwright Electron for semantic interaction with the actual packaged renderer.
- Specific confidence gap or residual risk addressed: Repository tests could not prove the real package entry, path timing, bundled backend resource, preload bridge, generated renderer, Playwright adapter, actual process group, simultaneous exact-artifact instances, or user-authorized provider/team workflow.
- Why the selected mode can materially improve confidence: It crosses the changed boundaries as one realistic system while preserving strict ownership of ports, roots, and processes.
- Expected confidence after the selected validation: At least `95%` overall and no category below `90%` if all critical host-applicable scenarios pass.
- Browser-specific decision and rationale: Standalone browser execution cannot prove Electron main/preload/profile/updater/process behavior. Playwright Electron provides browser-like semantic DOM and request inspection against the real packaged shell.
- If `Not Required`: N/A.
- If `Blocked`: N/A.
- Completion status: Completed. `E2E-PKG-001` through `005` and `E2E-LIVE-006` passed; final confidence and evidence are authoritative in `api-e2e-execution-coverage-report.md`.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron `42.4.1`, packaged by electron-builder; generated Nuxt/Vue renderer.
- Relevant README or development instructions: `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md`, and `autobyteus-web/package.json`.
- Web-equivalent behavior: Provider/settings catalog, selected team/model UI, registry/status state, REST/GraphQL routing, renderer local-state isolation, and visible workspace completion.
- Shell-specific or lifecycle behavior: Thin-entry validation, early `app.setPath`, bundled backend child, preload IPC, updater policy, exact executable reuse, process groups/descendants, foreign-port ownership, and root disposal.
- Chosen validation approach and why it fits the project: Build once for native macOS, reuse the exact executable through project adapters, use Playwright Electron for semantic assertions, correlate API/process/filesystem evidence, and exercise raw invalid profiles only against controlled temporary sentinels.
- Server/frontend setup when browser validation is used: The packaged app starts its own bundled backend and generated renderer; no development server was used.
- Effect on any already-running desktop application: `None`. Ordinary main PID `97821`, backend PID `98429`, port `29695`, health, and identity fingerprint remained unchanged across packaged and live validation.
- Behavior not directly proven and confidence consequence: Real Windows CIM/`taskkill` execution was unavailable on macOS. Deterministic Windows identity coverage passed, but Windows remains explicitly host-unverified and limits the user-surface/shell and lifecycle scores below 100%.

## Live Environment And Fixture Plan

- Startup order and commands: Completed repository checks; built the host-native artifact once; recorded its path/hash; observed the ordinary app; ran direct coexistence, Playwright renderer/updater/provider catalog, parallel launches, raw invalid profiles, and the foreign-port race; then initialized a separate caller-owned root, used the documented secrets importer, imported the local package through Settings, ran the Classroom Simulation Team, terminated it, closed the Electron tree, and rechecked the ordinary app.
- Environment choices that materially affected the run: Controlled child `HOME`, `CODEX_HOME`, and non-secret provider/search/API-key sentinels for the durable probe. The live harness passed a curated desktop-safe caller environment because the API runner itself had `ELECTRON_RUN_AS_NODE=1`, which must not be inherited by a desktop Electron process. Only the three approved isolation variables were forced by preparation.
- Health / readiness checks: Selected `/rest/health`; preload status and selected registry URL; ordinary `http://127.0.0.1:29695/rest/health`; window readiness; final port availability.
- Seed data / fixtures: Controlled production sentinel, per-instance renderer state, owned foreign socket, disposable current-schema SQLite database/vault, homework and answer files within the isolated workspace, and the read-only local package source.
- Test identities, authentication, permissions, or session state: Fresh isolated Electron profiles. The owner-authorized `.env` was imported by identifier through `pnpm secrets:import` only into the disposable database; logs contain no secret values. No ordinary account or database was modified.
- Requirement-linked journeys or scenarios: `E2E-PKG-001` through `E2E-PKG-005` and `E2E-LIVE-006`.
- Evidence captured: Machine-readable JSON; process/path/base-URL conditions; artifact hash; semantic DOM and request evidence; screenshots; value-free import logs; package source digest; ordinary PID/fingerprint/health checkpoints; cleanup and port observations.
- Owned processes and temporary state cleanup: Every direct/Playwright process tree and foreign socket completed. All probe-owned roots were disposed after affirmative tree completion. The live caller-owned root/database/key was explicitly removed after team termination and process-tree completion. Ticket evidence was retained.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TMP-AUDIT-001` | Read-only `ps`/`lsof` and health correlation | Ordinary identity stayed unchanged and launched descendants belonged to owned groups | Host diagnostics are supplemental/platform-specific; durable evidence records sanitized results |
| `TMP-AUDIT-002` | Static audit of runtime endpoint/config/updater patterns | No fixed renderer runtime `29695` bypass or newly retained compatibility path | Static audit supplements behavioral evidence |
| `E2E-LIVE-006` | Ticket-local Playwright Electron harness, isolated current-schema DB/vault, Settings package import, AutoByteus `deepseek-v4-flash`, Classroom Simulation Team | Real credential provisioning continuity, local package/team import, persisted runtime/model selection, professor -> student -> professor file-backed communication, visible completion, termination and cleanup | Secret-backed external execution is non-hermetic, mutable, user-authorized, and potentially billable; it must not become unattended durable CI coverage |

The live harness required five ticket-local corrections before the canonical pass: selectors for the actual Settings/main-shell layouts, evidence queries aligned to the current GraphQL schema, dismissal of the E2E-only updater error notice that intercepted a click, and normalization of persisted `AUTOBYTEUS` versus UI `autobyteus`. The actual team journey already succeeded in the fifth attempt; the final rerun corrected evidence normalization. These were temporary harness defects, not product failures.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real Windows CIM/`taskkill` direct and Playwright cleanup | Assigned host is macOS arm64; no supported Windows runner was discovered | External Windows command behavior and timing remain host-unverified | Run the durable probe on a supported Windows release runner when available; do not infer a Windows host pass from deterministic contracts |
| Other paid-provider or Codex variants | One minimal AutoByteus `deepseek-v4-flash` classroom journey was authorized and sufficient; a provider matrix adds cost and nondeterminism | Does not compare provider implementations | No ticket blocker; retain deterministic packaged coverage as the stable release gate |
| Successful second `production` profile launch from the changed artifact | Ordinary app owns `29695`; a second production launch could touch ordinary roots before port conflict and is not a supported coexistence case | AC-001 success is supported by resolver/build contracts and live preservation rather than a risky second production launch | Keep the safety constraint; use release smoke on a clean production host if desired |
| Clean full Nuxt baseline | Three unrelated pre-existing failures remain in interrupt UI, Chinese glossary, and historical hydration tests | Broader repository health is not fully green | Track with their owning features; focused changed-boundary 45/45 coverage and packaged renderer journey pass |
| Silent E2E updater UI | The actual E2E updater correctly performed no check/schedule/download/install and had no IPC handler, but the renderer displayed “Failed to initialize app updates” | Non-blocking test-only UX/automation friction; the notice intercepted one temporary-harness click | Optional follow-up: make intentional updater unavailability a quiet/expected E2E state without enabling updater side effects |

## Ambiguities Or Reroute Triggers

None. The wrong-runner test failure was corrected locally within coverage scope. The default all-platform build failure was a host-target selection issue; native macOS packaging passed. The three broad Nuxt failures were validated as unrelated baseline failures. All ticket-critical host-applicable packaged and live scenarios passed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — added `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs`; updated `autobyteus-web/package.json` and `autobyteus-web/electron/server/__tests__/platformServerEnvironment.spec.ts`; removed nothing.
- Post-repository confidence: **83.3%**.
- Broader validation decision: `Required` and completed.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: N/A.
- Notes: Final validation result is `Pass` at **96.7%** confidence. Because durable repository coverage changed, the cumulative package must return through `/code_reviewer` for proportional test-code review before delivery.
