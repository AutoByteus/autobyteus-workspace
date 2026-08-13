# API/E2E Coverage Investigation — Background Agent Renderer Contention

## API-REV-003 Recheck Plan — IR-006 Fresh-Catalog Correction (2026-08-10)

- Trigger: `CRR-008` source-review Pass for `IR-006`, reviewed HEAD `1d6d9f2da40d30b9ef95faa04cf82a12b8e67d1f`, source correction `f0aa52702c96dafc1d24cef5b9292a05ffb914a9`.
- Prior authoritative API/E2E result: `API-REV-002 Fail / 77.1%`, failure `API-F-001 / WORKSPACE-BOOT-001`.
- Prior failure resolution claim to verify: `WorkspaceAgentRunsTreePanel` now delegates mount-time initialization to `runHistoryStore.loadWorkspaceCatalogForNavigation`; a successful initial asynchronous workspace catalog load publishes exactly one cached-navigation topology refresh, while later already-fetched calls no-op and no global history tree is fetched.
- Existing coverage validity:
  - IR-006 real composition coverage for an initially empty workspace store plus already-seeded empty navigation cache is `Still Valid` and directly targets the defect;
  - API-REV-001 real WebSocket, production-effects, retained hierarchy/focus/latest-100, responsiveness, paste, fake-media, build/guard, and real Classroom evidence remains boundary-valid but must be proportionally rerun after the critical startup recheck;
  - API-REV-002 browser/API probes are `Still Valid` as the exact failure baseline and will be reused without changing production source or user data.
- Durable coverage decision before execution: `No API/E2E-owned repository edit planned initially`. IR-006 already adds durable source-level regression coverage at the ownership boundary. A new durable browser scenario will be added only if the real fresh-data result exposes a gap not captured by the existing reusable execution probe.
- Required execution order:
  1. **WORKSPACE-BOOT-001 first**: new owned snapshot of `/Users/normy/.autobyteus/server-data`, required `pnpm secrets:import`, requested `/Users/normy/autobyteus_org/autobyteus-agents` catalog verification, current branch backend, fresh current branch browser renderer, and immediate workspace-row/API assertions;
  2. `WORKSPACE-BOOT-002`: current branch browser renderer against the already-running Electron backend on `29695` and the live data directory, read-only;
  3. focused IR-006 workspace-navigation durable suites;
  4. retained real-WebSocket regression, affected frontend correctness matrix, durable aggregate browser performance/correctness probe, guards/build, and only the proportional real-system checks necessary to re-establish the superseding result.
- Pass condition: both fresh-data paths render every returned registered workspace row immediately; no `No run history yet` empty-state contradiction; the retained correctness/performance thresholds remain green; no material acceptance criterion remains unresolved.
- Failure routing: any critical recheck failure updates the canonical report and appends `API-REV-003`, then returns to `code_reviewer` for failure-origin review. On Pass, any API/E2E-owned durable test change requires proportional test-code review; without such changes, the complete successful result still returns through `code_reviewer` as required by the cumulative workflow.

### API-REV-003 Investigation Outcome

- Result: **Pass / 98.9%**. `API-F-001` is resolved on the exact formerly failing boundary.
- `WORKSPACE-BOOT-001` was the first behavioral execution. A fresh current-branch renderer and backend using an owned real-data snapshot returned 26 workspaces and rendered exactly 26 visible workspace rows; the contradictory `No run history yet.` state was absent. The setup used the required `pnpm secrets:import`, verified `/Users/normy/autobyteus_org/autobyteus-agents`, and confirmed both Classroom team definitions.
- `WORKSPACE-BOOT-002` independently passed against the already-running Electron backend and `/Users/normy/.autobyteus/server-data`: API 26 workspaces / 28 history groups / 79 agent runs / 184 team runs; UI exactly 26 visible workspace rows. A second full navigation/reload again rendered 26/26.
- The IR-006 workspace-navigation matrix passed 5 files / 126 tests. The retained server real-WebSocket matrix passed 4 files / 57 tests, and the retained affected frontend matrix passed 28 files / 345 tests.
- The durable real-Chrome contention probe passed every `BG-BROWSER-000–007` scenario. Under the approved 40-window/80-dispatch-per-second aggregate equivalent, Files/Teams p95 was `6.9 ms` versus `6.7 ms` idle (`1.03×`), with zero topology rebuilds and no long tasks. Paste p95 was `7.6 ms`; fake-media Starting p95 was `5.9 ms` and Recording p95 `32.5 ms`.
- Production build, `guard:web-boundary`, `guard:localization-boundary`, and localization literal audit passed. The committed production-source range is clean; retained historical evidence files still contain previously recorded whitespace and are not production source.
- Coverage decision after execution: the existing retained API/E2E coverage remains valid; IR-006 already provides the durable empty-cache-to-populated-catalog regression at the real store/panel composition boundary. API/E2E added, updated, or removed **no repository-resident durable coverage** in this round.
- Desktop strategy: actual packaged Electron rerun was not required for IR-006 because the changed boundary is web-equivalent renderer initialization and was directly exercised twice in a real browser, including once against the active Electron backend and real data. The user-owned Electron process on `29695` remained running and untouched.
- Cleanup: owned tabs, both owned Nuxt frontends, the owned backend, and the owned snapshot were removed/stopped; owned ports `63931–63933` are free; user port `29695` still listens.

## API-REV-002 Re-entry — Delivered Electron Workspace Catalog Failure (2026-08-10)

- Trigger: the user reports that the Electron application built by delivery opens with no workspaces visible and explicitly rejects the prior isolated-fixture Electron evidence as insufficient for the delivered-build/real-data startup path.
- Re-entry artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/delivery-revision-record.md` (`DR-002`), `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/handoff-summary.md`, and `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/electron-build-macos-arm64-delivery.log`.
- Prior-evidence validity correction: `ELECTRON-SMOKE-001` remains valid only for the isolated shell/preload/file/media scenario it executed. It did **not** prove the delivery-built application against `/Users/normy/.autobyteus/server-data`, the real workspace catalog, or the installed application. The earlier direct-reload `No run history yet` observation is reclassified from a dismissed unsupported-precondition diagnostic to a material reproduction signal requiring resolution.
- Current critical requirements at risk: AC-007 preserved workspace hierarchy/focus/current persisted history; AC-009 end-to-end product correctness; the approved `Directly Usable — No Migration` persisted-data outcome; and delivery startup/configuration fidelity.
- Changed/runtime boundaries under investigation: installed-versus-candidate Electron artifact provenance; packaged renderer/backend configuration; real workspace metadata and run-history GraphQL responses; fresh renderer initialization and `runHistoryStore` population; real-data browser and Electron presentation.
- Existing durable coverage decision: all Round-1 tests remain valid for their stated boundaries, but they are **insufficient** for initial workspace discovery from an existing Electron data directory. No durable test is edited or removed before reproduction and failure-origin review.
- Required API-REV-002 execution order:
  1. fingerprint `/Applications/AutoByteus.app` and the DR-002 worktree build to establish which artifact the user opened;
  2. query the already-running Electron backend on `29695` read-only to distinguish missing data from frontend projection failure;
  3. run the reviewed frontend against that real backend and inspect `/workspace` through a real browser;
  4. reproduce on an owned copy of `/Users/normy/.autobyteus/server-data`, using `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env` and importing `/Users/normy/autobyteus_org/autobyteus-agents`, without mutating the user's live data;
  5. execute the DR-002 packaged candidate against the copied data if it can be done without stopping the user's application; otherwise record the exact fixed-port conflict and rely only on browser-equivalent evidence for source classification.
- Expected behavior: existing workspaces are visible immediately after a fresh application open/reload, and normal selection exposes their existing run history without manual re-registration.
- Failure condition: the backend returns existing workspaces/history while the fresh renderer shows no workspace entries, or the delivered/installed artifact uses an unintended data/configuration source.
- Outcome routing: any reproduced critical failure will update the canonical execution report to `Fail`, append `API-REV-002`, and return the cumulative package to `code_reviewer` for focused failure-origin review. Delivery is not authorized by the superseded Round-1 result while this re-entry is unresolved.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/performance-evidence.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/probe-evidence/`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/solution-revision-record.md` (`SR-004`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/architecture-review-revision-record.md` (`ARCH-REV-004`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/implementation-revision-record.md` (`IR-006`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/code-review-revision-record.md` (`CRR-008`)
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-002`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: `3`
- Trigger: `CRR-008` Pass for IR-006 correction of `API-F-001 / WORKSPACE-BOOT-001`.
- Prior Investigation Reviewed: `API-REV-002 Fail / 77.1%` and the exact fresh real-data failure baseline.
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The implementation must reduce aggregate background-stream renderer work without disconnecting, dropping, reordering, or hiding any active background run. The UI-facing WebSocket egress may suppress only an exact repeated client-visible status per exact enriched identity and connection; the first snapshot, any payload/status transition, terminal state, malformed/unkeyable status, content cadence/flush ordering, and canonical internal subscriber events remain immediate and exact. Standalone and team sessions must use the same typed filter/scheduler/observer composition with one scheduling owner.

The frontend must project handled-event effects explicitly. No-op protocol/status/token/connection inputs do no Event Monitor presentation work and no complete navigation build. Content changes update the conversation and final witness without retention scanning; structural changes enforce latest-100 once. Run-history navigation is built/indexed once per real topology change, exact presentation/activity patches are bounded, unrelated workspace/team branches retain reference identity, task details remain outside navigation, and source hierarchy/focus remains exact while collapsed or unfocused. Team open/recovery/historical hydration must prime one final Event Monitor baseline only after all conversation/activity writers finish.

Under the approved aggregate equivalent of twenty runs producing one redundant status plus one shaped content update per 500 ms window, warmed file/panel p95 must be `<=100 ms` and `<=1.5×` idle, paste-to-placeholder p95 must meet the same bounds, click-to-visible Starting microphone must be `<=100 ms`, fake-device click-to-Recording must be `<=1.5×` idle and add `<=50 ms`, and stream projection must create no individual `>=50 ms` task. Final Electron smoke must rule out application-origin multi-second voice/file delay while distinguishing permission/device failures.

Existing persisted conversations, histories, traces, settings, attachments, and current WebSocket shapes remain directly usable without migration or compatibility fallback. The default/effective content cadence remains 500 ms and focused text/reasoning remains progressive rich Markdown. Repository-wide frontend/server typecheck baselines are explicitly non-green and cannot be cited as clean.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-007 / AC-001 status projection | Changed | shared per-connection status-transition filter after exact identity enrichment | Real socket must show first/changed statuses only while a canonical subscriber still sees every companion. Reconnect must reset state. |
| BEH-009 / AC-010 egress composition | Added | typed filters, one scheduler, observers, immutable inputs, one composition root | Retain direct contract coverage for order, mutation resistance, observer non-authority, scheduler semantics, disposal, and agent/team parity. |
| BEH-004 / AC-002–AC-003 explicit effects | Changed | one shared generic projector and handler-returned actual effects | No-op/content/structural inputs need exact presentation/retention/navigation count evidence across standalone/team paths. |
| BEH-005 / AC-003 Event Monitor owner | Changed | cached final witness plus reset/prime/commit lifecycle | Validate no-effect zero work, presentation-only no retention, structural once, latest-100 exactness, and single final-prime ownership after open/recovery/lazy hydration. |
| BEH-006 / AC-002, AC-007 navigation projection | Changed | run-history-owned indexed projection, tight patches, completed stable/transient rows | Prove zero full build for irrelevant traffic, at most one build per topology mutation, branch stability, exact collapsed/nested hierarchy/focus/status. |
| BEH-001/002 / AC-004–AC-006 foreground responsiveness | Changed indirectly | removal of synchronous background amplification | Durable browser load probe and final Electron smoke are required; unit timing alone is insufficient. |
| BEH-003 / AC-007 background correctness | Preserved | all active recovery/subscriptions remain | Sustained traffic followed by selection/reopen must retain exact content/tools/lifecycle/latest-100/hierarchy/focus. |
| BEH-008 / AC-008 cadence/rich rendering | Preserved | one scheduler retains 500 ms configuration and lossless content ordering; frontend renderer unchanged | Retained WebSocket cadence and progressive rich-render tests must remain green. |
| Persisted data / wire schema | Preserved | `Directly Usable — No Migration`; no schema/envelope/settings change | Normal current projection/readers and representative existing history must work without migration/fallback. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | UI-only status filtering and egress control composition | focused egress unit suite | real Fastify/WebSocket plus canonical `AgentRun` subscriber parity | real WebSocket integration |
| API / transport / contract | Yes | same wire shape with fewer exact redundant UI statuses | existing real standalone/team WebSocket integration | retained standalone integration currently asserts obsolete duplicate socket statuses; team/nested identity is unit-only | update integration and execute real sockets |
| Frontend component / state | Yes | shared projector, Event Monitor coordinator, indexed navigation/cache/focus | 34+ changed-path suites and CRR-005 matrices | aggregate timing and real component composition | durable browser probe |
| Browser integration / user journey | Yes | collapsed/unfocused history tree plus foreground input responsiveness | implementation-only temporary fixture and existing presentation probe | one/20-run load, paste placeholder, voice start, file/panel latency, sustained reselect | durable browser probe + real product browser |
| Authentication / session / permissions | Preserved | no auth change | existing local product session | media permission and file ownership can affect smoke | fake media plus Electron observation |
| Desktop renderer / web-equivalent UI | Yes | main-thread scheduling and Vue projection | component tests | actual browser event-loop timing | Playwright/Chromium |
| Desktop shell / Electron-specific integration | Preserved but acceptance-critical | voice extension/preload/native file path boundaries unchanged | Electron unit/integration suites | application-origin delay in actual shell | final isolated Electron smoke |
| Process / lifecycle | Yes | per-connection reset/dispose; active/history open; live recovery; lazy hydration | focused unit/composition coverage | real reconnect and sustained recovery | real socket + browser reload/reopen |
| Persisted-data transition | No schema change | in-memory caches only | source audit and hydration suites | representative current history in normal UI | browser current reader |
| Worker / queue / distributed coordination | No | none | N/A | none; Web Worker explicitly deferred | none |
| External integration | Preserved | LLM/media devices and upload API unchanged | mocked store/component tests | device/provider variability | fake media, delayed upload, final shell smoke |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention`
- Project type/runtime: pnpm monorepo; Fastify/WebSocket/GraphQL TypeScript server; Nuxt 3/Vue/Pinia frontend; Electron desktop wrapper; Vitest and Playwright-core coverage.
- Conflicting/missing instructions: no `AGENTS.md` was found. Root/server/frontend READMEs agree on pnpm, server build/run, external-backend browser mode, and colocated tests. The user-owned desktop/backend on fixed port `29695` must not be stopped or reused as an owned process.
- Required secrets: `N/A` for deterministic socket/browser probes. Real provider activity may reuse an already-running configured backend but is not required to assert structural timing. Secret values will not be copied or recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| root `README.md` | monorepo setup and local server model | `pnpm install`; backend/GraphQL/WS endpoints; preserve managed/user-owned processes |
| `autobyteus-web/README.md` | browser/Electron development and tests | external backend env, `pnpm dev`, `pnpm test:nuxt --run`, Electron build paths |
| `autobyteus-web/package.json` | executable scripts | Nuxt/Electron tests, build/guards, existing Playwright probes |
| `autobyteus-server-ts/README.md` | server build/run/data-dir | `pnpm build`; custom isolated `--data-dir`; GraphQL/REST/WS paths |
| `autobyteus-server-ts/package.json` | server tests/build | `pnpm exec vitest run ... --no-watch`; build config is the usable TypeScript boundary |
| `performance-evidence.md` | exact baseline and representative stress shape | aggregate equivalent is 40 windows/s = 80 status+content dispatches/s for 6.5 s; compare warmed foreground p95 to idle |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server integration tests | `autobyteus-server-ts` | Vitest file commands | Fastify binds ephemeral ports; no external server/data | sockets open and tests complete | test harness closes app/sockets |
| Durable browser fixture | `autobyteus-web` | probe copies fixture to a temporary Nuxt page and starts `nuxi dev` on an ephemeral port | backend health may be stubbed; fake media flags for deterministic microphone | fixture control API + DOM markers | probe removes page, closes browser, terminates owned Nuxt group |
| Current product browser | worktree frontend + current backend only if needed | isolated frontend port with endpoints to user-owned `:29695` | do not stop backend or modify definitions unrelated to test | health + app shell | close owned tab/process only |
| Electron smoke | `autobyteus-web` | build/transpile then launch isolated app/user-data with remote debugging when safe | fixed embedded port is already user-owned; shell may use it but must not attempt to own/stop it | visible window/renderer, file and voice UI state | close only owned app; remove temp user-data |

| Data / Fixture / Identity Need | Existing Mechanism Or Creation Method | Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| exact socket identities | scripted `AgentRun` backend and mapped team identity fixtures | ephemeral only | harness closes |
| 26-workspace/38-team navigation shape | deterministic browser fixture matching retained baseline topology | no user data | temporary route removed |
| aggregate content/status stream | actual frontend `dispatchAgentStreamMessage` at 40 windows/s | synthetic aggregate rate, explicitly not 20 real providers | fixture torn down |
| delayed attachment upload | route interception/promise delay after synchronous placeholder creation | do not upload user files | synthetic blob/file released |
| fake microphone | Chromium fake media device/UI flags and actual voice store/component | no real recording or transcription | stop/cleanup capture resources |
| collapsed/nested hierarchy | deterministic stable + task-agent + task-team fixture and current product reader | no Bible/current user team mutation | disposable fixture / read-only live selection |
| existing persisted history | current backend projection reader if used | read-only/reselect only | no deletion |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: requirements “Persisted Data Outcome”; design “Persisted Data / State Transition Decision”; implementation handoff “Persisted Data Transition Check”.
- Representative setup: current run/team history plus projection-present/absent/lazy-hydration fixtures.
- Planned evidence: all real composition hydration suites, normal browser open/reselect of existing history, and confirmation of unchanged GraphQL/wire shapes.
- Migration-specific scenarios: `N/A`
- Ambiguity/reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion / Intent | Related IDs | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts` | filter identity/equality, order, immutable input, one scheduler, cadence/flush/dispose | AC-001, AC-008, AC-010 | Still Valid | direct changed boundary, 32 tests in IR-005 | execute first-stage server set |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | real Fastify socket, initial/reconnect, canonical activity/status, default cadence | AC-001, AC-008, AC-009 | Needs Update | first/changed/reconnect/cadence remain valid, but two traces assert exact duplicate statuses reach UI socket, which is now explicitly obsolete | update expectations and add canonical-subscriber count proof; run this exact file before broader coverage |
| `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` | real team socket routing/content grouping/command lifecycle | AC-001, AC-007–AC-009 | Still Valid but insufficient | exercises real team handler/egress but lacks nested status-dedup assertions | execute; rely on focused nested identity test unless real-team harness can accept a narrow status case without duplication |
| egress unit nested stable/task/task-team identity cases | exact identity isolation, malformed fail-open, per-connection reset | AC-001, AC-010 | Still Valid | direct mapped-message boundary | retain/execute |
| `agentStreamMessageProjector.spec.ts`; `AgentStreamingService.spec.ts`; `TeamStreamingService.spec.ts` | no-op/effect parity, server-shaped content, task identity, cleanup | AC-002, AC-003, AC-007 | Still Valid | real projector/handlers with mocked transport | execute affected matrix |
| `recentEventMonitorMutationCoordinator.spec.ts`; `recentEventMonitorProductionDispatch.spec.ts` | effect-specific work and latest-100 after 1,001 messages | AC-003, AC-007, AC-009 | Still Valid | direct coordinator/production dispatch | execute |
| `runHistoryNavigationProjection.spec.ts`; `runHistoryTeamExecutionRows.spec.ts`; run-history/store/open/hydration suites | build/patch bounds, referential stability, stable/transient hierarchy, final primes | AC-002, AC-007, AC-009 | Still Valid | direct and CRR-005 real composition | execute broad frontend set |
| `teamRunOpenCoordinator.primeOwnership.spec.ts` and related hydration specs | one final prime across present/absent/replacement/preserved/recovery/lazy paths | AC-003, AC-007 | Still Valid | real production composition | execute unchanged |
| workspace history/team focus/mobile component/composable suites | cached execution rows/focus and selection behavior | AC-002, AC-007 | Still Valid | component/store coverage; no aggregate load | execute |
| `tests/e2e/team-activity-presentation-probe.mjs` + fixture | real components, collapse/expand, desktop/mobile activity dots | AC-007, AC-009 | Still Valid but insufficient | rendered regression surface only | execute after new probe |
| `ContextFilePathInputArea.spec.ts`; `AgentUserInputTextArea.spec.ts`; `voiceInputStore.spec.ts`; `tests/integration/voice-input-extension.integration.test.ts` | paste/upload UI semantics and voice lifecycle/error paths | AC-005, AC-006 | Still Valid but insufficient | no aggregate timing | execute; add durable load timing probe |
| repository-wide `nuxi typecheck` and server `pnpm typecheck` | broad type baselines | N/A | Out Of Scope as clean gates | upstream records 220 frontend diagnostics and server TS6059 rootDir baseline | do not claim pass; use focused tests/build-config checks |

## Stale Or Obsolete Coverage Decisions

No file is removed. The obsolete assertions are the duplicate UI-status expectations inside `agent-status-websocket.integration.test.ts`; the scenario remains valuable and will be updated in place to the approved first/transition-only socket contract while retaining canonical subscriber proof.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable |
| --- | --- | --- | --- | --- |
| `BG-BROWSER-001` | idle vs one-run vs twenty-run aggregate file/panel latency; zero topology builds/long tasks | AC-002, AC-004, AC-009 | `autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs` + fixture | Numeric acceptance target and prior regression require repeatable browser evidence. |
| `BG-BROWSER-002` | paste dispatch-to-placeholder with delayed upload under aggregate load | AC-006, AC-009 | same probe/fixture | Must separate synchronous scheduling from upload completion. |
| `BG-BROWSER-003` | click-to-Starting and fake-device click-to-Recording under aggregate load | AC-005, AC-009 | same probe/fixture | Deterministic media timing is required before shell smoke. |
| `BG-BROWSER-004` | collapsed/unfocused nested stable/task-agent/task-team rows, detail no-navigation, expand/focus/current state/latest-100 | AC-002, AC-003, AC-007, AC-009 | same probe/fixture plus existing direct suites | Browser composition and exact retained state were previously implementation-only. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement Evidence | Notes |
| --- | --- | --- | --- | --- |
| `WS-STATUS-001` | `agent-status-websocket.integration.test.ts` real standalone socket traces | expect initial/changed only; assert repeated exact statuses absent; assert canonical subscriber still receives companions; keep reconnect and cadence | AC-001, AC-008, AC-009 | This exact retained file must run before broader tests. |
| `PKG-SCRIPT-001` | `autobyteus-web/package.json` | add one explicit script for the durable contention probe if the probe is accepted | FR-006 / AC-009 | narrow discoverability change only. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts --no-watch` | `autobyteus-server-ts` | retained exact real-WebSocket regression | The unchanged stale test correctly failed 2/7 because five waits still required duplicate UI-status frames that the approved contract suppresses. After the durable assertion update and one ordering-harness correction, the exact file passed 7/7. The observed implementation frames were approved throughout. | `api-e2e-execution-evidence/ws-status-first-unchanged.log`; `ws-status-corrected-attempt-1.log`; `ws-status-first-corrected.log` |
| 2 | `pnpm exec vitest run tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts tests/unit/agent-execution/events/lifecycle-status-event-transformer.test.ts tests/integration/agent/agent-status-websocket.integration.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts --no-watch` | `autobyteus-server-ts` | filters/scheduler, canonical companions, real standalone/team WebSockets, reconnect/ordering | **Pass — 4 files / 57 tests.** | `api-e2e-execution-evidence/server-focused-and-real-ws.log` |
| 3 | `pnpm test:nuxt --run <28 affected files>` | `autobyteus-web`; exact file list is in the log header | generic projection effects, Event Monitor, navigation projection, prime ownership, run open/hydration, history/hierarchy/focus, input/paste, voice | **Pass — 28 files / 344 tests.** | `api-e2e-execution-evidence/frontend-affected.log` |
| 4 | `pnpm build`; `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `git diff --check` | server, web, worktree | production server build/runtime-dependency verification, structural guards, whitespace | **Pass.** Repository-wide Nuxt/server typecheck baselines remain the documented upstream non-green baseline and are not claimed green. | `api-e2e-execution-evidence/build-guards-diff.log` |
| 5 | `pnpm test:e2e:background-contention -- --output-dir ../tickets/.../background-contention-browser-final-pass` | real Chrome, production Pinia/projectors/components, fixture-only backend stubs | 26-workspace/38-team aggregate performance, exact state, latest-100, hierarchy/focus, paste and fake-media voice, desktop/mobile | **Pass — BG-BROWSER-000 through BG-BROWSER-007.** | `api-e2e-execution-evidence/background-contention-browser-final-pass/evidence.json`; screenshots/log in same directory |
| 6 | `node tests/e2e/team-activity-presentation-probe.mjs ...` | real Chrome | retained rendered collapse/expand/activity presentation | **Pass.** | `api-e2e-execution-evidence/team-activity-presentation/evidence.json` |
| 7 | `pnpm prepare-server`; `pnpm transpile-electron`; isolated Electron 42 via CDP with an ephemeral generated port override | isolated HOME, DB, user-data, backend `63372`; user-owned app on `29695` untouched | actual Electron/preload/embedded-server lifecycle, native file bridge, aggregate Files/Teams and fake-media voice | **Pass.** | `api-e2e-execution-evidence/electron-prepare-transpile.log`; `electron-runtime.log`; `electron-contention-smoke.json`; `electron-contention-smoke.png` |
| 8 | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url <isolated SQLite URL>` followed by package import and real UI | isolated backend `63362`, frontend `63712`, imported `/Users/normy/autobyteus_org/autobyteus-agents`, Classroom Simulation Team, `deepseek-v4-flash` | real external provider, tool/file handoffs, team streaming, live navigation, persisted history selection | **Pass.** Nine secret identifiers imported without printing values; real professor/student exchange completed two `send_message_to` handoffs and file work, then rehydrated after supported history registration/reselection. | `api-e2e-execution-evidence/real-classroom-validation-summary.json` and referenced raw logs/screenshots |

## Post-Repository Confidence Scorecard

The scores below are the state after repository checks and before real browser/Electron/provider execution.

| Confidence Category | Score | Support After Repository Execution | Remaining Uncertainty | Improvement Selected |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | socket, server, frontend and input/voice suites passed | numeric aggregate and real surface | browser/Electron/provider |
| Changed-boundary execution directness | 95% | real Fastify/WebSocket plus production frontend handlers/projectors | actual browser event loop | browser aggregate |
| Cross-boundary integration realism and mock gap | 90% | real WebSocket and production-composition frontend tests | browser/backend/provider/shell crossings | all three broader modes |
| Environment/configuration/identity/fixture fidelity | 90% | migrated test DBs and exact 26/38 topology fixture | user-directed secret/package/provider path | isolated real Classroom run |
| Failure/edge/lifecycle/recovery evidence | 94% | reconnect, terminal/error, open/recovery/lazy paths passed | browser sustained state and cleanup | browser + lifecycle cleanup |
| User-surface/browser/desktop-shell confidence | 82% | component/integration coverage only | browser timing and Electron shell not yet executed | browser + Electron |
| Durable regression coverage quality/relevance | 97% | stale socket coverage corrected and numeric browser probe added | proportional test-code review remains downstream | code review after API/E2E |

- Overall post-repository confidence: **91.4%** (simple mean).
- Every critical acceptance criterion directly proven at that point: `No — broader execution was still mandatory`.
- Applicable category below 90%: `User-surface/browser/desktop-shell confidence (82%)`.
- Broader validation decision remained: `Required`.

## Broader Validation Result

- Decision: `Required — completed`.
- Durable browser result: **Pass**. Representative aggregate produced 260 windows / 520 dispatches in 6.5 seconds. Files/Teams p95 was `7.1 ms` versus `7.6 ms` idle (`0.934×`), topology delta `0`, and no `>=50 ms` task. Paste p95 was `7.8 ms` versus `8.1 ms` idle with 160 windows / 320 dispatches, topology delta `0`, and no long task. Fake-media click-to-Starting p95 was `6.2 ms`; click-to-Recording p95 `24.5 ms` versus `31.1 ms` idle. Latest-100 was exactly `retained-10` through `retained-109`; hierarchy/focus/task rows and detail-only no-navigation behavior were exact.
- Actual Electron result: **Pass**. Electron 42/preload and isolated embedded backend were directly observed. Under 180 aggregate windows / 360 dispatches, Files/Teams p95 was `35.13 ms`, topology delta `0`, no long task. Under 260 windows / 520 dispatches, click-to-Starting p95 was `6.5 ms`, click-to-Recording p95 `29.3 ms` versus `22.9 ms` idle (`1.28×`, `+6.4 ms`), and no long task. The native file bridge returned exact bytes.
- User-directed real Classroom result: **Pass**. The isolated vault imported nine configured secret identifiers from the requested `.env`; the agent package imported 7 shared agents, 54 team-local agents, and 13 teams. A real `deepseek-v4-flash` Classroom run emitted 298 received frames across professor/student, two successful `send_message_to` handoffs, nine successful tool executions, persisted file-backed work, an exact final marker, and live Files/Team navigation p95 `39.69 ms`. After a direct reload correctly showed no history for an unregistered temporary workspace, the supported UI history flow registered the isolated workspace, issued the scoped history query, reselected professor, and rehydrated the marker, Thinking, tools, messages, and answer file. The first direct-reload assertion remains recorded as a non-green diagnostic, not hidden as a pass.
- Existing user application effect: **None**. Port `29695` remained owned by the user's app and was never stopped. The generated Electron-only port constant was changed only in ignored transpiled output for this owned run, restored afterward, and never changed repository source.

## Final Confidence Scorecard

| Confidence Category | Final Score | Direct Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 99% | all AC-001–AC-010 have direct durable or realistic evidence | aggregate-equivalent rather than 20 independent providers, as approved |
| Changed-boundary execution directness | 99% | real sockets, real Chrome event loop, actual Electron, production source components | none material |
| Cross-boundary integration realism and mock gap | 98% | real Fastify/WebSocket, actual Electron embedded backend, real DeepSeek Classroom run | deterministic stress traffic is synthetic by design |
| Environment/configuration/identity/fixture fidelity | 98% | isolated migrated SQLite stores, requested secret import/package/team/provider, exact topology | fake device used for repeatable voice timing |
| Failure/edge/lifecycle/recovery evidence | 98% | reconnect/error/terminal, open/recovery/lazy, browser sustained state, persisted history selection, cleanup | much-higher-scale parsing intentionally deferred |
| User-surface/browser/desktop-shell confidence | 99% | desktop/mobile Chrome plus actual Electron/preload/file bridge/fake media and real team UI | no physical-microphone permission prompt, which is device-origin and not needed for app scheduling proof |
| Durable regression coverage quality/relevance | 98% | transition-only socket regression and repeatable browser probe/script | proportional test-code review pending |

- Overall final confidence: **98.4%** (simple mean).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default 95% target met: `Yes`.

## Desktop Application Validation Decision

- Executed actual Electron 42 rather than substituting browser-only evidence.
- To protect the user's active app on fixed port `29695`, only ignored transpiled output was temporarily rewritten to isolated backend port `63372`; repository source stayed unchanged. Electron used an isolated HOME/user-data/SQLite tree, production-prepared server resources, the worktree Nuxt renderer, fake media, and CDP.
- Shell evidence: Electron user agent, preload `electronAPI`, running isolated embedded server, exact native `readLocalTextFile`, renderer event-loop metrics, fake-media voice lifecycle, no renderer errors.
- Cleanup: Electron, embedded server, CDP, generated route, isolated home/data, and generated port override were removed/restored. User app remained listening on `29695`.

## Live Environment And Fixture Result

- Secret setup used the requested project command. A dry run succeeded; the first non-TTY live attempt correctly required explicit `IMPORT`; the subsequent TTY-confirmed import succeeded. No secret values were logged.
- The first backend launch inherited an ambient `DATABASE_URL`, was stopped before mutation, and is retained as a non-green setup attempt. The corrected launch explicitly pinned an isolated DB and applied all 19 migrations.
- Importing the agent package initially reported already-present definitions because ambient package roots were inherited. The backend was restarted with `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=''`; the GraphQL import then succeeded in the isolated store.
- Two owned Classroom team runs were terminated through GraphQL before shutdown. All owned ports were free and both temporary data trees were deleted; `cleanup.log` is authoritative.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-up |
| --- | --- | --- | --- |
| 20 independent live provider requests/sockets | the approved target is aggregate-equivalent and upstream explicitly distinguishes it | low; real provider/team streaming plus exact 40-window/s structural/timing proof cover the material boundaries | none unless a separate provider-fanout benchmark is requested |
| much-higher-scale JSON parsing/worker | explicitly deferred until post-correction evidence isolates it | accepted | separate ticket only if measured |
| transcript virtualization/Markdown optimization | out of scope | accepted | none |

## Ambiguities Or Reroute Triggers

No active ambiguity remains. API-REV-002 conclusively exposed the IR-005 initialization/invalidation defect. API-REV-003 then proved IR-006 resolves that defect on both the owned real-data backend and the active Electron backend, including a second full reload, while the retained correctness/performance matrix remains green.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed with API-REV-003 Pass`.
- Repository-Resident Durable Coverage Added / Updated / Removed In API-REV-003: `No`.
- Prior API-REV-002 confidence: `77.1%`.
- Current final confidence: `98.9%`.
- Broader validation decision: `Required — completed against an owned real-data backend, the active Electron backend, and retained real-Chrome performance/correctness coverage`.
- Current result: `Pass`; `API-F-001 / WORKSPACE-BOOT-001` resolved.
- Reroute Required: `No`.
- Recommended Recipient: `code_reviewer`.
