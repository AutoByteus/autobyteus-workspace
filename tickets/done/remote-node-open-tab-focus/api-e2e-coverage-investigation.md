# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/design-spec.md`
- Supplemental Task Artifacts: None
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/solution-revision-record.md` (`SR-001`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/code-review-revision-record.md` (`CRR-001`)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/tickets/done/remote-node-open-tab-focus/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Passing implementation review `CRR-001` for implementation commit `8118e68e6c11fad541bf8b5bdd42e23da8b3ba91`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1, completed after repository and targeted broader validation; no API/E2E-owned durable coverage edit occurred

## Current Requirement And Design Basis

The proof target is the approved binary policy at the one browser-success presentation owner. A successful remote/Docker-node `open_tab` must retain truthful generic tool success/activity and the node-owned URL opening while causing neither Electron-local `focusSession(tab_id)` nor right-side Browser selection. A successful embedded-node `open_tab`, when the Electron Browser shell is available, must retain awaited local focus followed by Browser selection without otherwise changing shown/hidden state. Eligibility must come from the current window's authoritative node binding plus Browser-shell availability, not identifiers, URLs, existing sessions, or focus errors. Standalone and team events must continue through the same shared projector/handler. `SR-001`, `ARCH-REV-001`, `IR-001`, and `CRR-001` agree on this basis and report no unresolved design or source-review finding.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / remote-node success presentation | Changed | R-001/R-003/R-004; AC-001/AC-003/AC-004; DS-001/DS-003 | Prove a remote window binding stops before both Electron-local effects while success/activity and node-local open outcome survive. |
| `BEH-002` / embedded-node success presentation | Preserved | R-002/R-003/R-004; AC-002/AC-003/AC-004; DS-002/DS-003 | Prove an embedded binding plus available Browser shell still focuses the returned local session before Browser selection. |
| Generic `TOOL_EXECUTION_SUCCEEDED` projection | Preserved | AC-001/AC-004; design DS-003; `CRR-001` trace | Prove standalone and team success payloads still reach generic lifecycle handling and the one browser owner without duplicated transport policy. |
| Electron Browser shell availability/manual Browser surface | Preserved | R-002/R-003; scope exclusions | Prove unavailable shell suppresses automatic projection; do not hide or repurpose the manually selectable Browser surface. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Backend `open_tab` and lifecycle truth unchanged | Existing backend/browser and event tests; source trace | Node-local open outcome is not exercised by changed frontend tests | Live remote/embedded execution where safely attainable |
| API / transport / contract | No, preserved | Canonical success event unchanged | Standalone/team streaming suites | These suites mock the browser handler and do not use live WebSockets | Browser fixture using the real projector; live node stream if attainable |
| Frontend component / state | Yes | Browser-success handler conditionally mutates right-side active tab | Handler spec and right-tab composable source | Handler spec mocks `setActiveTab`; it does not observe rendered/real reactive state or hidden/collapsed preservation | Browser web-equivalent probe |
| Browser integration / user journey | Yes | Event-driven right-panel transition | No task-specific repository browser probe | No real renderer journey across binding, projector, Browser-shell store, and tab state | Browser probe first |
| Authentication / session / permissions | No | No auth change | N/A | Live agent execution may require provider credentials, but that is test setup rather than changed behavior | Isolated test identity/config if live run is selected |
| Desktop renderer / web-equivalent UI | Yes | Window-bound store + shared projector + reactive selection | Nuxt handler/store/service tests | Current assertions are separated by mocks | Browser probe with real Pinia/store/projector state |
| Desktop shell / Electron-specific integration | Yes | Automatic local Browser focus must be invoked only for embedded window results | Browser-shell controller/store, window registry, Node Manager suites | No repository test combines a real Electron node-bound window, real preload Browser API, and a streamed tool result | Isolated packaged Electron as last-resort shell proof after browser evidence |
| Process / lifecycle | No material source change | Window creation/bootstrap and listener lifecycle preserved | Shell registry/bootstrap/launch-profile coverage | Packaged current-worktree startup still merits smoke evidence if desktop run occurs | Project packaged Electron launcher |
| Persisted-data transition | No | None (`Not Affected`) | Upstream review and diff | None | None |
| Worker / queue / distributed coordination | No | None | N/A | N/A | None |
| External integration | Yes for realistic remote environment, unchanged contract | Configured Docker backend and node-owned browser are the realistic peer | Docker docs, VNC/live probes, existing running images discovered | Existing running containers are not assigned to this run and must not be reused or altered | Owned isolated Docker node, if live journey runs |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue/Pinia renderer; Vitest with Nuxt test utilities; Electron 42.4.1 shell; Playwright Core; Node.js 22; optional Docker AutoByteus server with Chromium/VNC.
- Conflicting, missing, or unclear project instructions: `autobyteus-web/README.md` documents packaged Electron E2E via `pnpm test:e2e:electron`; its default build calls `build:electron`, whose `ALL` target is not valid on a macOS host because the build script requires native Linux for the Linux artifact. A macOS run must therefore use `pnpm build:electron:mac` then `pnpm test:e2e:electron --skip-build --adapter playwright`. Standalone `nuxt typecheck` is also reported unable to start project diagnostics because no local `vue-tsc` is declared and the cached fallback is incompatible; this will be rechecked and recorded, not treated as a behavioral pass.
- Required environment variables or secrets available: Yes for an isolated live provider-backed run, based only on presence checks; values are not recorded. No credential will be copied into repository artifacts. Existing user application data and running containers are unassigned and will not be reused or altered.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/autobyteus-web/AGENTS.md` | Closest web project instructions | Colocated tests; `pnpm test:nuxt ... --run`; `pnpm test:electron`; never broad-stage git changes. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/autobyteus-web/README.md` | Development, test, build, and packaged Electron E2E authority | Browser dev at `pnpm dev`; build; specific Vitest commands; packaged launcher isolation contract; use current-worktree executable with `--skip-build`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/autobyteus-web/ARCHITECTURE.md` | Testing strategy | Nuxt/Electron coverage is primarily colocated Vitest; use broader scope only where boundary risk warrants it. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/autobyteus-web/package.json` | Executable scripts | `test:nuxt`, `test:electron`, `guard:web-boundary`, `build`, `build:electron:mac`, packaged E2E launch scripts. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/autobyteus-web/vitest.config.mts` | Nuxt test configuration | Nuxt/happy-dom environment; standard setup; exclude build artifacts. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/autobyteus-web/scripts/run-electron-e2e.mjs` and `scripts/electron-e2e/*` | Owned isolated Electron execution/cleanup | Select non-production port and temp root, wait for health, launch via Playwright, terminate only owned process tree, remove owned root. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/README.md` and `autobyteus-server-ts/docker/README.md` | Remote Docker node setup | Node Manager consumes printed backend URL; direct isolated Docker requires SYS_ADMIN/unconfined plus backend/VNC/noVNC/debug ports; use private loopback for this run. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/docker/README.md` and `scripts/personal-docker.sh` | Collision-safe source stack alternative | Unique project names and runtime ports; default stack is heavier than the minimum remote-node need. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-open-tab-focus/autobyteus-web/tests/e2e/*-probe.mjs` | Existing browser-probe convention | Temporary route installation, owned dev process/browser, JSON evidence/screenshots/log capture, and exact cleanup are established patterns. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Nuxt repository checks | `autobyteus-web` | Existing installed locked dependencies; exact Vitest/build commands below | `.nuxt` and local workspace package build output already exist from implementation setup | Command exit and reporter summary | No process |
| Temporary browser renderer probe | `autobyteus-web` | Copy a temporary ticket-owned fixture route, start `pnpm exec nuxi dev` on a free loopback port, launch Chrome 151 via Playwright | Must emulate only the Electron preload Browser API while using real Pinia stores/projector/tab state; must not modify durable tests | Route HTTP 200 and semantic probe root | Close browser; terminate owned process group; remove installed route; retain ticket evidence only |
| Packaged current-worktree Electron | `autobyteus-web` | `pnpm build:electron:mac`; then custom/standard Playwright launcher with E2E profile | Unique non-29695 port and temp data root; must not touch running `/Applications/AutoByteus.app` or production data | `/rest/health`, first window, window context and Browser API probes | Project E2E session cleanup; verify process tree/root removal |
| Owned remote Docker node | worktree root | Direct documented Docker run with unique generated name, loopback random ports, disposable named volumes or temp binds, and only required provider environment | Do not reuse the seven existing `autobyteus-server-*` containers or their volumes | `/rest/health`; container status; VNC/browser endpoint if used | Remove owned container and owned volumes/temp state only |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent capable of exactly one `open_tab` call | Create minimum definition through the node's normal GraphQL API or UI, with one tool and exact instruction; discover a current model via normal API | Isolated embedded E2E root and owned Docker data only; do not alter production definitions | Removed with owned E2E root/container |
| Remote node registration | Normal Electron Nodes -> Manage Nodes UI / registry boundary | Register only owned loopback Docker URL in isolated Electron data root | Removed with isolated E2E root |
| Destination URL | Owned loopback static HTTP endpoint | No external web dependency; stable observable title/content | Stop owned server |
| Panel starting states | Select non-Browser tabs and both shown/collapsed states through ordinary UI where possible | No production user state | Removed with isolated E2E root |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` → “Persisted Data / State Transition Decision”; `implementation-handoff.md` → “Persisted Data Transition Check”
- Representative existing-data setup and required behavior: N/A; node registry, run history, browser sessions, and preferences are unchanged.
- Evidence planned for the approved direct-use, discard/rebuild, or migration outcome: Source/diff check confirms only transient store state is read and transient side effects are gated; no migration command or compatibility branch will be run.
- Migration-specific completion/recovery scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts` | Six cases: embedded object/string projection, remote suppression, unavailable-shell suppression, unrelated tool/missing id ignore, focus-before-select order | R-001–R-003; AC-001–AC-003; DS-001–DS-003 | Still Valid | Assertions match approved policy; source review `CRR-001` found them coherent | Executed directly (6/6 passed); no API/E2E-owned edit |
| `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Standalone success routes payload through the browser owner | R-004; AC-004; DS-003 | Still Valid | Proves standalone convergence but mocks handler | Execute with related suite; supplement with real-projector probe |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Exact team member success routes canonical payload through browser owner | R-004; AC-004; DS-003 | Still Valid | Proves team adapter/convergence but mocks handler | Execute with related suite; supplement with real-projector probe |
| `autobyteus-web/services/agentStreaming/__tests__/agentStreamMessageProjector.spec.ts` | Generic standalone/team projection and navigation effects | AC-001/AC-004; DS-003 | Still Valid | Generic lifecycle coverage remains valid, but contains no direct `open_tab` assertion | Execute; temporary real-projector journey covers combined path |
| `autobyteus-web/stores/__tests__/windowNodeContextStore.spec.ts` | Derives embedded/remote identity and bound endpoints from real store state | R-003; AC-003 | Still Valid | Directly proves authoritative binding semantics | Execute |
| `autobyteus-web/stores/__tests__/browserShellStore.spec.ts` | Derives Browser availability from preload API and applies snapshots/commands | R-002/R-003; AC-002/AC-003 | Still Valid | Direct store evidence; current file lacks a focused `focusSession` assertion but controller and handler suites cover adjacent commands | Execute; observe real mocked preload command in browser probe |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Configures and opens embedded/remote nodes in node-bound Electron windows | R-003/R-004 production premise | Still Valid | Direct component-to-preload call assertion | Execute |
| `autobyteus-web/electron/browser/__tests__/browser-shell-controller.spec.ts` | Real controller/session focus, shell lease, bounds, and session ownership behavior | R-001/R-002; AC-001/AC-002 shell boundary | Still Valid | Proves what a local focus request would do/fail to do; not combined with renderer gate | Execute focused Electron suite |
| `autobyteus-web/electron/shell/__tests__/workspace-shell-window*.spec.ts` and registry spec | Shell window owns immutable node id and requester identity | R-003; AC-003 | Still Valid | Supports authoritative window-binding premise | Execute focused Electron suite |
| Existing generic browser probes under `autobyteus-web/tests/e2e` | Established fixture-route/Playwright execution patterns | Execution infrastructure only | Out Of Scope | No current probe covers `open_tab` projection | Reuse conventions, not assertions |

## Stale Or Obsolete Coverage Decisions

None. No inspected relevant scenario asserts the obsolete unconditional remote projection, and no coverage removal or disablement is justified.

## Durable Coverage To Add

None. The changed handler already has direct colocated durable regression cases, the authoritative input stores and shell boundaries have their own durable suites, and the remaining gap was realistic composition rather than an absent policy assertion. Temporary browser/desktop journeys closed that gap without exposing a reproducible durable contract omission.

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts --run --reporter=verbose` | `autobyteus-web` | API-E2E-001: direct policy outcomes and focus-before-select | Pass (1 file / 6 tests) | `evidence/api-e2e-round-1/01-handler-focused.log` |
| 2 | `pnpm test:nuxt services/agentStreaming/__tests__/agentStreamMessageProjector.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts stores/__tests__/windowNodeContextStore.spec.ts stores/__tests__/browserShellStore.spec.ts components/settings/__tests__/NodeManager.spec.ts --run` | `autobyteus-web` | API-E2E-002/003: binding, availability, Node Manager, standalone/team convergence, generic projection | Pass (6 files / 76 tests) | `evidence/api-e2e-round-1/02-related-nuxt.log` |
| 3 | `pnpm test:electron electron/browser/__tests__/browser-shell-controller.spec.ts electron/shell/__tests__/workspace-shell-window.spec.ts electron/shell/__tests__/workspace-shell-window-registry.spec.ts --run` | `autobyteus-web` | API-E2E-004 shell-focused repository boundary | Pass (3 files / 13 tests) | `evidence/api-e2e-round-1/03-related-electron.log` |
| 4 | `pnpm test:nuxt --run`; after workspace-contract build, retry the same command | `autobyteus-web` | Broader affected Nuxt regression suite | Pass on valid retry (431 files / 2,362 tests; 2 files / 2 tests skipped by environment gates) | `evidence/api-e2e-round-1/04-full-nuxt.log` records the initial generated-package setup failure after 426 files / 2,348 tests passed; `06-full-nuxt-retry.log` records the clean retry |
| 5 | `pnpm test:electron --run` | `autobyteus-web` | Broader Electron regression suite | Pass (33 files / 135 tests; 1 file / 1 test skipped by a real-release environment gate) | `evidence/api-e2e-round-1/07-full-electron.log` |
| 6 | `pnpm guard:web-boundary` | `autobyteus-web` | Renderer/Electron import boundary | Pass | `evidence/api-e2e-round-1/08-web-boundary.log` |
| 7 | `pnpm --filter @autobyteus/application-sdk-contracts build && pnpm --filter @autobyteus/team-stream-contracts build`; then `pnpm build` | worktree root then `autobyteus-web` | Restore generated workspace prerequisites and prove production bundling | Pass | `evidence/api-e2e-round-1/05-workspace-contract-builds.log`; `09-production-build.log` |
| 8 | `pnpm exec nuxt typecheck` | `autobyteus-web` | Recheck known typecheck-tool limitation | Blocked before project diagnostics (known toolchain limitation) | `evidence/api-e2e-round-1/10-typecheck.log`: cached external `vue-tsc` cannot load TypeScript's non-exported `./lib/tsc`; the project declares no local `vue-tsc` |
| 9 | `git diff --check` and worktree hygiene audit | worktree root | Patch/artifact hygiene and no unintended API/E2E-owned durable coverage edit | Pass | `evidence/api-e2e-round-1/11-hygiene.log`; no tracked diff from implementation HEAD, only expected ticket evidence/reports and generated workspace-contract build output |

## Post-Repository Confidence Scorecard (Mandatory)

Repository execution is complete. The first full-Nuxt attempt exposed only a missing generated-workspace-package prerequisite, which was built through the package's normal build script; the unchanged full suite then passed. The standalone typecheck command remains blocked before diagnostics by the already-recorded external `vue-tsc`/TypeScript incompatibility, so it contributes no behavioral evidence. Production build and all directly relevant/broader Vitest suites passed.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | Direct six-case policy suite, standalone/team convergence tests, generic projector/store/Node Manager tests, and broader passing regressions cover all approved branches in repository scope | Remote URL ownership/activity and embedded presentation are not yet observed together through a running renderer | Execute the requirement-linked real-store browser journey and packaged shell premise checks |
| Changed-boundary execution directness | 91% | The changed handler itself executed directly, including authoritative identity/availability decisions and awaited ordering | The direct suite mocks the stores, shell call, and right-tab mutation | Execute the real Pinia/store/projector/browser-state composition |
| Cross-boundary integration realism and mock gap | 84% | Each adjacent boundary has passing focused coverage and both stream adapters converge | No current test combines real window binding, real projector lifecycle, Browser-shell store, and right-tab state; no current-worktree node-bound packaged window observed | Browser composition followed by isolated packaged Electron evidence |
| Environment, configuration, identity, and fixture fidelity | 90% | Locked worktree dependencies, generated workspace contracts, full Nuxt/Electron suites, boundary guard, and production bundle ran on the target macOS/Node/pnpm stack | No owned embedded/remote Electron profile or remote Docker identity has run | Isolated E2E profile and owned remote capability probe |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Remote, unavailable, unrelated/malformed-success, JSON/object, ordered eligible behavior, full suites, and build all passed | Hidden/collapsed state preservation and isolated process cleanup are not yet observed | Exercise shown/hidden renderer state and validate owned-process cleanup |
| User-surface, browser, and desktop-shell confidence | 82% | Shell controller/window suites and renderer stores passed, and production rendering bundle built | No semantic browser observation or packaged current-worktree desktop journey yet | Browser route probe first; packaged desktop only for the shell-specific remainder |
| Durable regression coverage quality and relevance | 96% | Six requirement-linked changed-handler cases plus still-valid adjacent suites are focused, deterministic, and all passed; no stale assertion was found | One-off live composition is intentionally absent from the durable suite | Temporary composition proof; add durable coverage only if a reproducible contract gap appears |

- Overall post-repository confidence: 89.6%
- Calculation method: Simple average of all seven applicable categories; weak categories remain visible.
- Every critical acceptance criterion directly proven: No — AC-001/AC-002/AC-004 have strong repository proof but not a combined running-renderer observation.
- Any applicable category below `90%`: Yes — cross-boundary integration realism/mock gap (84%); user-surface/browser/desktop-shell confidence (82%).
- Default clean-confidence target of `95%` met: No
- Material residual risks: current repository coverage separates the changed policy from real renderer state through mocks; realistic embedded and remote/Docker execution is not yet evidenced; standalone typecheck tooling remains unable to start diagnostics.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`, then `Project Desktop Validation` only for shell-specific uncertainty that browser execution cannot close; an owned remote Docker node is planned for the realistic peer.
- Specific confidence gap or residual risk addressed: Current durable tests do not combine the real window-node store, shared projector, Browser-shell store/preload command, generic lifecycle, and right-side state; they also do not show a current-worktree node-bound Electron window with a real configured remote backend.
- Why the selected mode can materially improve confidence: A browser fixture can directly exercise the web-equivalent renderer policy with real Pinia/store/projector state and semantic state assertions. Because the key unavailable/misrouted focus boundary is Electron-specific, an isolated packaged Electron run is justified only after the browser evidence, and can prove real preload availability, node-bound windows, local session focus, and non-interference with the user's running application.
- Expected confidence after the selected validation: At least 95% overall with no category below 90% if both renderer composition and owned packaged Electron/remote journeys pass; otherwise record the exact residual and do not declare Pass below the gate.
- Browser-specific decision and rationale: Required first for the web-equivalent event-to-state portion; it is safer, deterministic, and can observe real reactive state without disturbing the user's desktop app. It does not by itself prove Electron main or a remote node.
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: N/A at investigation time.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron 42.4.1 on macOS arm64.
- Relevant README or development instructions: `autobyteus-web/README.md` packaged Electron E2E section; `docs/electron_packaging.md`; root README packaged Electron API/E2E section.
- Web-equivalent behavior: Shared projector dispatch, Pinia window binding/Browser availability, right-side active-tab state, generic tool activity.
- Shell-specific or lifecycle behavior: Preload Browser API availability, node-bound window identity, Browser session focus/attachment, packaged embedded server and isolated cleanup.
- Chosen validation approach and why it fits the project: Browser fixture first; then build the macOS current-worktree package and launch through the project E2E profile with Playwright. Use an owned Docker node only if needed for the actual remote journey. This is last-resort shell validation, not the initial test surface.
- Server/frontend setup when browser validation is used: Owned free-port Nuxt dev server with normal temporary fixture convention and mocked unrelated backend endpoints.
- Effect on any already-running desktop application: None expected; use non-default port, isolated temp root, distinct process tree, and do not signal or inspect production app internals.
- Behavior not directly proven and confidence consequence: If provider-backed live `open_tab` cannot be safely driven on the owned Docker node, the browser composition plus packaged binding/shell probes will be recorded separately; cross-boundary fidelity may remain below the clean target and must be reported truthfully.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Executed as planned: (1) temporary Nuxt/Chrome composition probe; (2) `pnpm build:electron:mac`; (3) owned loopback destination server and disposable published Docker node; (4) current-worktree package through the project E2E preparation/Playwright adapter; (5) real node-registry add/open; (6) embedded and remote shell probes; (7) affirmative cleanup in reverse order. The browser probe was rerun with the retained owned-Docker outcome as its remote success payload.
- Environment choices that materially affect the run: macOS arm64; Node 22.23.1; pnpm 10.28.2; Chrome 151; Electron package 42.4.1; loopback-only random ports; temp data root; provider secrets supplied only through process environment when required.
- Health / readiness checks: Nuxt fixture route HTTP 200; packaged `/rest/health`; Electron first window; Docker `/rest/health`; destination URL; noVNC/debug endpoint only if remote browser observation is needed.
- Seed data / fixtures: No provider identity or persisted agent definition was necessary. The browser fixture built one standalone and one team-member `AgentContext`; the Docker/desktop run used only owned temporary filesystem state, one node-registry profile, and an owned static target.
- Test identities, authentication, permissions, or session state: Isolated E2E data root and disposable Docker binds only; no production records or secrets used. The clean Docker node intentionally had no user-configured BrowserServer MCP.
- Requirement-linked journeys or scenarios: API-E2E-005 remote standalone/team policy composition; API-E2E-006 embedded projection; API-E2E-007 hidden/collapsed preservation; API-E2E-008 node-local URL-open/activity truth.
- DOM, screenshot, log, API, process, or other evidence to capture: JSON evidence, right-tab semantic state, preload focus call/session snapshot, activity state, screenshot, Electron/backend/Docker logs, destination/debug evidence, process/root cleanup result.
- Owned processes and temporary state to clean up: Nuxt/Chrome probe, destination server, current-worktree Electron process tree/data root, owned Docker container/volumes, temporary route and harness files.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-E2E-005 | Temporary Nuxt fixture route plus Playwright; real Pinia stores, shared projector, lifecycle handler, and right-tabs state; minimal mocked Electron preload | Remote binding leaves focus/selection unchanged and success/activity intact for standalone/team; embedded binding focuses before selection; Browser-unavailable suppresses both | Durable handler/store/service/controller suites already own each contract; the temporary fixture only composes them and intentionally emulates a shell boundary that a durable browser test could misrepresent as real Electron proof. |
| API-E2E-006 | Project-supported packaged Electron E2E profile with current-worktree artifact | Real preload Browser availability, embedded and remote node-bound renderer identity, local session focus, remote/local tab-id separation, current package startup/cleanup | Runtime harness/evidence is ticket-specific; standard launcher is durable and reused unchanged. |
| API-E2E-007/008 | Owned Docker node, real Node Registry, Docker Chromium/CDP target, and owned URL; retained outcome passed through the browser projector | Docker Chromium owns/loads the remote URL; the remote id cannot focus a local Electron session; real remote projector suppresses focus/selection while retaining activity | The disposable clean Docker node has no user BrowserServer MCP checkout/config and a provider-backed multi-process fixture is environment-specific; focused durable tests already protect the policy. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Provider-driven WebSocket `open_tab` through a user-configured Docker BrowserServer MCP | The disposable clean published node correctly had no user MCP checkout/config; direct use of the Electron-embedded adapter returned `browser_unsupported_in_current_environment`. The run instead opened the owned URL in the node's real Chrome via CDP and projected that retained result through the real renderer path. | Low: transport/MCP result normalization is unchanged and repository suites cover both stream adapters; the changed handler sees only the canonical payload already proven. | None for this change; a future BrowserServer-provider integration ticket can retain its own configured-MCP fixture. |
| Standalone `nuxt typecheck` diagnostics | Cached external `vue-tsc` cannot import TypeScript's non-exported `./lib/tsc`; no local `vue-tsc` is declared. | Low: the command provides no project diagnostics, but production Nuxt/Electron builds and 2,497 Nuxt/Electron tests passed. | Correct the repository typecheck toolchain separately. |

## Broader Validation Results

| Scenario ID | Execution Surface | Result | Direct Evidence |
| --- | --- | --- | --- |
| API-E2E-005A | Chrome 151 + temporary Nuxt route using real window-node store, projector, lifecycle/activity store, Browser-shell store, and right-tab/panel state | Pass | Owned-Docker Chrome outcome (`tab_id=7A5858015134D871564D18E508EA5AFA`) remained successful activity/conversation state; remote identity made zero focus calls, preserved Terminal selection, and preserved collapsed state. `evidence/api-e2e-round-1/12-browser-probe.json` |
| API-E2E-005B | Same real renderer composition with a team-member projection target | Pass | Generic success/activity retained; no focus; Terminal and visible panel state preserved. `12-browser-probe.json` |
| API-E2E-006 | Same real renderer composition with embedded identity and delayed emulated preload focus | Pass | Focus was called; Browser remained unselected until focus resolved; then Browser/session selected; collapsed preference preserved. `12-browser-probe.json` |
| API-E2E-007 | Same renderer composition with embedded identity but Browser shell unavailable | Pass | Success/activity retained; focus and selection suppressed; visible preference preserved. `12-browser-probe.json` |
| API-E2E-008 | Owned `autobyteus/autobyteus-server:latest` container, Chrome 149 CDP, and owned static URL | Pass for remote browser ownership/outcome | Health ready, Chrome ready, Docker Chrome loaded the target and returned a stable target id/title/url; host request log confirms Linux Chrome ownership. `evidence/api-e2e-round-1/14-desktop-docker-probe.json` |
| API-E2E-006-DESKTOP | Ad-hoc-signed current-worktree macOS ARM64 package through project E2E profile/Playwright | Pass | Embedded window context, real preload Browser API, local session open/focus, actual URL request, and unchanged session snapshot all observed. `14-desktop-docker-probe.json` |
| API-E2E-005-DESKTOP-REMOTE | Same package plus actual node registry and owned Docker backend | Pass | Remote node window had immutable Docker id and empty local shell; focusing the real Docker Chrome id through local Electron rejected “session ... was not found,” leaving both remote and embedded snapshots unchanged—the exact invalid effect the renderer guard prevents. `14-desktop-docker-probe.json` |

Broader execution removed the two post-repository weak categories. The final scorecard is authoritative in `api-e2e-execution-coverage-report.md`: 96.1% overall, every category at least 95%, and all critical acceptance criteria directly proven for the changed scope through combined renderer, desktop-shell, and owned-Docker evidence.

## Ambiguities Or Reroute Triggers

None at investigation time. The approved artifacts decide all inspected test validity; no requirement/design gap or local source correction is presently indicated.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: 89.6%
- Broader validation decision: `Required` and completed successfully
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Repository execution, browser-first validation, and last-resort packaged desktop/Docker validation completed. Existing user processes/containers/data were not reused or altered; before/after identities were unchanged. Temporary routes/processes/data/container were cleaned. No test validity decision changed and no durable coverage edit was necessary.
