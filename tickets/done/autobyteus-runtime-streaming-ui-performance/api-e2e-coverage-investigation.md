# API/E2E Coverage Investigation — AutoByteus Runtime Streaming UI Performance

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/performance-evidence.md`; implementation render evidence under `implementation-render-evidence/`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/solution-revision-record.md` (`SR-001`, `SR-002`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/architecture-review-revision-record.md` (`ARCH-REV-001`, `ARCH-REV-002`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/code-review-revision-record.md` (`CRR-001`)
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance/tickets/done/autobyteus-runtime-streaming-ui-performance/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `code_reviewer` implementation review Pass at `CRR-001`, score 94/100, with realistic AC-01–AC-07 execution explicitly outstanding.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The reviewed implementation must be proven as one runtime-neutral presentation path, not as an AutoByteus-only special case. Tiny `SEGMENT_CONTENT` receipts must be coalesced on a fixed 100 ms, non-sliding cadence per service; exact resolved context/turn/segment bytes and first-seen ordering must survive; the latest receipt timestamp must advance only its context; and every semantic, disconnect, teardown, or context-replacement boundary must synchronously flush older content. One changed context batch may advance the recent-event-monitor presentation revision at most once, while a no-op payload may advance recency without a revision. The unchanged file/reference APIs must remain truthful and become visibly responsive during a sustained real native stream. Voice input must expose `isStarting` synchronously, guard duplicate/stale attempts, dispose resources, isolate cancellation by `composer` versus `settings-test`, preserve transcription, and clear pending state on permission/device/worklet failures and unmount. Backend protocol and persistence remain directly usable without migration or a new presentation-write path.

Critical runtime thresholds are AC-01 (at least 60 seconds and 30,000 accumulated characters; 50 ms probe p95 drift <=100 ms; no presentation-attributable stall >500 ms; renderer not pinned near one full core) and AC-02 (at least 10 local text opens and 10 team-reference opens during the stream; click-to-visible p95 <=500 ms; direct endpoint success; truthful error/not-found). AC-01/AC-02 failure is a design-return signal, not permission to add an ad hoc runtime/component throttle.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / DS-001, DS-003 | Changed | Requirements FR-01/FR-04/FR-05; design scheduler/projector; implementation and code review | Prove cadence, exact bytes/identity/order, per-context recency, revision count, semantic/lifecycle flushes, and real renderer thresholds. |
| BEH-002 / DS-002 | Preserved outcome under changed load | Requirements FR-02; before evidence shows endpoint fast but renderer starved | Re-run valid file/reference unit tests, then measure real click-to-visible latency and direct endpoint responses under sustained streaming including 404/error truthfulness. |
| BEH-003 / DS-004, DS-005 | Changed | Requirements FR-03/FR-04; guarded store lifecycle and component changes | Cover synchronous starting and duplicates plus permission, device, AudioContext, worklet, source cancel/unmount, recording, transcription, and cleanup across repository and Electron-renderer execution. |
| BEH-004 / shared runtime boundary | Preserved/strengthened | FR-01/FR-05; no runtime gate in reviewed source | Use native as stress input and Codex plus idle/non-streaming as controls through the same frontend build. |
| BEH-005 / DS-006 | Preserved | FR-06; frontend-only diff; Directly Usable — No Migration | Load representative existing run history through the current UI/API, compare persistence files/writes at logical boundaries, and confirm no schema/migration/fallback path. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Backend unchanged | Existing backend health/reference behavior and source diff | Direct-use of prior data and no new per-presentation writes during a live run | Live API / lifecycle observation |
| API / transport / contract | Yes, frontend ingestion only | Parsed WebSocket content receipt and dispatch sequencing | Injected WebSocket service tests | Real native envelope cadence and real backend contract | Browser against Electron-started backend |
| Frontend component / state | Yes | Conversation projection/revision and voice UI/store state | Vitest service/store/component tests | Whole accumulated Markdown cost and visible next-render feedback | Browser and Electron renderer |
| Browser integration / user journey | Yes | File/reference/composer/settings interactions competing with stream work | Existing mocked viewer/component tests; generic responsive probe | Real click-to-visible latency during a 30k+ native stream | Playwright/Chrome against worktree frontend |
| Authentication / session / permissions | Yes, microphone permission only | Browser/Electron media permission state | Mocked Permissions API tests are incomplete for denial/worklet failure | Host/Electron permission/device behavior | Dedicated isolated Electron renderer harness; no user app disruption |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer inside Electron-backed topology | Build and component render evidence | CPU/drift/latency with actual 10 Hz whole Markdown | Browser preferred against Electron-started backend |
| Desktop shell / Electron-specific integration | Yes, bounded | Preload identity and native media/transcription boundary are required by voice availability | Electron extension IPC unit coverage, store mocks | Actual Electron media permission/device/worklet and preload transcription journey | Isolated project Electron validation using a disposable profile/harness |
| Process / lifecycle | Yes | Scheduler/service disconnect/context replacement; voice cancellation/unmount | Some standalone disconnect and component unmount coverage | Remote team disconnect, context replacement, in-flight resource cleanup | Durable focused tests plus lifecycle probe |
| Persisted-data transition | Preserved | No schema/reader/writer change | Diff/source evidence | Representative old run must still load; write cadence must stay logical | Current reader/live API and filesystem observation |
| Worker / queue / distributed coordination | No | No worker/queue change | N/A | N/A | None |
| External integration | Yes, model and microphone as inputs | Provider chunk cadence and device APIs; provider protocol unchanged | Mocked services/store | Native/Codex event shapes; real media stack | Live native/Codex and isolated Electron media |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-streaming-ui-performance`
- Project type and runtime stack: pnpm monorepo; Nuxt 3.21.1/Vue 3.5.28/Vite 7.3.1 frontend; Vitest; Playwright Core; Electron 42.4.1; Node v22.23.1; Electron-started TypeScript backend at `127.0.0.1:29695`.
- Conflicting, missing, or unclear project instructions: no conflict. The web `.env` defaults to port 8000, so the documented development command must be launched with explicit backend base/WS endpoint overrides to use the required Electron-started backend. Actual model output and microphone permission are environment-sensitive; exact observations, not inferred success, will be recorded.
- Required environment variables or secrets available: `Yes` for the already-running local Electron backend's configured runtimes; secret values will not be read or recorded. No secret is needed for deterministic repository coverage.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Closest repository instructions | Colocated tests; `pnpm test:nuxt ... --run`; all tests `pnpm test`; do not stage broadly. |
| `autobyteus-web/README.md` | Development, testing, Electron topology | `pnpm dev`; browser at localhost:3000; internal backend normally 29695; test and build commands; existing browser probe script. |
| `autobyteus-web/ARCHITECTURE.md#testing-strategy` | Test ownership | Vitest unit/component coverage colocated with owners; Electron-specific integration has its own suite. |
| `autobyteus-web/package.json` | Authoritative scripts/versions | `test:nuxt`, `test:electron`, guards, build, and `test:e2e:workspace-responsive`; Playwright Core and Electron are installed. |
| `autobyteus-web/nuxt.config.ts` and `.env` | Runtime endpoint wiring | Dev REST/GraphQL proxy and WebSockets derive from explicit `BACKEND_NODE_BASE_URL`/endpoint environment; default `.env` is port 8000, not the required 29695. |
| `autobyteus-server-ts/AGENTS.md` | Backend test instruction | Use `vitest run ... --no-watch`; backend is unchanged, so only direct current-reader/health/reference execution is planned. |
| `requirements.md`, `performance-evidence.md` | Acceptance topology/baseline | Worktree browser against Electron-started backend/data root; Temp Workspace; native/DeepSeek stress and Codex/Luna control; clean up deliberate teams by termination. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Existing Electron backend | N/A; user-owned `/Applications/AutoByteus.app` | Already running; do not restart | PID ownership must remain user-owned; observed listener PID 83877 at investigation time | `GET http://127.0.0.1:29695/rest/health` returns 200 | Do not stop. Terminate only deliberately created test runs through product controls/API. |
| Worktree Nuxt frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695` plus matching WS/GraphQL/transcription variables, then `pnpm dev --host 127.0.0.1 --port 3000` | Owned process; port checked free before start | HTTP page readiness and endpoint binding inspection | SIGTERM only the PID started by this validation. |
| Browser runtime | `autobyteus-web` | Playwright Core with installed Google Chrome 150 | Disposable browser profile/context; screenshots/JSON retained in ticket evidence | Page load plus health/API response | Close owned context/browser. |
| Isolated Electron voice harness | `autobyteus-web` | Project Electron with disposable user-data directory, fake/controlled media flags where needed, and a test-owned fixture/preload | Must not launch the normal app main or contend for port 29695; must not touch the user's current application/device state | Fixture exposes Electron identity, device list, AudioContext/worklet state, and journey result | Close test window/app and delete temporary profile/fixture/processes owned by the run. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Native sustained stream | Create a clearly test-named run/team in `temp_ws_default` through supported UI/API and request >=30k characters over >=60 s | Do not reuse prior/user production runs as mutable fixtures; do not inspect or copy secrets | Terminate deliberately created team/members; retain only summarized measurements and test IDs. |
| File opens | At least one supported local Markdown/text file in Temp Workspace, opened 10+ times through Files | Test-owned file or an immutable repository README; no edits via viewer | Remove a test-created file if one is created. |
| Team references | References attached to the deliberate team's handoff/message, opened 10+ times | Use only references produced/attached by the test team; do not use unrelated user messages | Team termination; leave ordinary run history intact unless supported deletion is explicitly safe. |
| 404/error reference | Test-owned missing reference/path or supported API error fixture | Do not alter existing user files | Remove any test-only seed record/file if applicable. |
| Existing persisted run | Select a pre-existing completed/offline run read-only through current reader | No transformation, reset, copy, or byte edits | None. |
| Voice media | Chromium fake media input inside isolated Electron harness; real installed extension/preload journey only when isolated and safe | Never seize or modify the user's current AutoByteus app or microphone session | Disposable profile/window and temporary audio fixture removed. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: read an existing completed/offline run and its already-stored conversation/history with the current frontend/backend, without rewrite or transformation.
- Evidence planned: Git/source diff shows no backend/schema/serializer/store change; current-reader browser/API load of an existing run; filesystem/runtime observation that new test-run persistence changes at logical phases and not at each 100 ms presentation batch.
- Migration-specific completion/recovery scenarios: `N/A`
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `services/agentStreaming/presentation/__tests__/StreamContentPresentationScheduler.spec.ts` | Fixed deadline, exact coalescing, per-context recency, first-seen identity order, reentrancy | FR-01/FR-04/FR-05; AC-04 | Still Valid | Assertions match reviewed 100 ms scheduler contract | Retain and rerun. |
| `services/agentStreaming/presentation/__tests__/streamContentBatchProjector.spec.ts` | Exact bytes, one revision, no-op recency | FR-04; AC-04 | Still Valid | Direct owner-level assertions | Retain and rerun. |
| `services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Standalone cadence, semantic end flush, explicit disconnect | FR-01/FR-04/FR-05; AC-04/AC-05 | Needs Update | Valid core coverage, but remote disconnect/context replacement are not directly asserted and AC-04 calls for teardown coverage | Add narrow lifecycle assertions. |
| `services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Interleaved two-context content and status flush; nested identity behavior | FR-04/FR-05; AC-04/AC-05 | Needs Update | Valid status-boundary evidence, but multi-segment plus remote disconnect/context replacement should be explicit | Add exact multi-segment/lifecycle assertions without duplicating scheduler tests. |
| `services/agentStreaming/__tests__/recentEventMonitorProductionDispatch.spec.ts` and `services/eventMonitor/__tests__/*` | Bounded retained presentation, no duplicates, known mutation commit | FR-01/FR-04/FR-05; AC-04/AC-05 | Still Valid | Exercises 1,001-message state/retention and revision semantics | Retain and rerun. |
| `stores/__tests__/voiceInputStore.spec.ts` | Synchronous start, duplicate guard, invalidation/disposal, source isolation, audio device/context/watchdog, transcription | FR-03/FR-04; AC-03 | Needs Update | Permission denial and AudioWorklet load failure clear-state/resource assertions are missing | Add focused denial and worklet-failure cases. |
| `components/agentInput/__tests__/AgentUserInputTextArea.spec.ts`; `components/settings/__tests__/VoiceInputExtensionCard.spec.ts` | Visible starting state, disabled/aria-busy, fixed-source unmount cancellation | FR-03; AC-03 | Still Valid | Direct component assertions match reviewed UI behavior | Retain and rerun. |
| `components/fileExplorer/__tests__/FileViewer.spec.ts` | Loading/error/render-mode truthfulness | FR-02; AC-02/AC-05 | Still Valid | Assertions remain approved; no path change | Retain and rerun. |
| `components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts` and panel tests | Authorized content URL, 200/404/403 truthfulness, selected IDs | FR-02; AC-02/AC-05 | Still Valid | Direct contract/UI assertions remain current | Retain and rerun. |
| `electron/extensions/__tests__/*` | Electron extension IPC/runtime behavior | FR-03/FR-05; AC-03/AC-05 | Still Valid but insufficient alone | Node tests do not exercise renderer permission/device/AudioWorklet | Rerun Electron suite, then use isolated Electron renderer validation. |
| `tests/e2e/workspace-responsive-probe.mjs` | General viewport/workspace responsiveness | AC-05 regression only | Out Of Scope for stream thresholds | No fine-grained stream, Markdown growth, or AC-01/AC-02 latency measurement | Do not treat as AC-01/02 proof; full UI smoke may be unnecessary once targeted journey runs. |

## Stale Or Obsolete Coverage Decisions

None. Existing immediate-content assumptions were already replaced during implementation. No test asserts a legacy direct projection path or compatibility-only behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| STR-AC04-LIFECYCLE | Pending content across multiple identities/contexts flushes exactly once before remote disconnect and context replacement | FR-04/FR-05; AC-04 | Existing standalone/team service specs | Lifecycle regression is deterministic and belongs beside service ownership. |
| VOICE-AC03-DENIED | Permission-denied startup clears `isStarting`/source and reports current error | FR-03; AC-03 | `autobyteus-web/stores/__tests__/voiceInputStore.spec.ts` | Critical deterministic failure path is currently missing. |
| VOICE-AC03-WORKLET | AudioWorklet module failure clears pending state and disposes stream/context | FR-03; AC-03 | `autobyteus-web/stores/__tests__/voiceInputStore.spec.ts` | Critical resource/lifecycle failure path is currently missing. |

A model-backed 60-second/30k stream benchmark and real Electron media journey will use retained executable probes/evidence rather than a permanently pass/fail unit threshold tied to provider speed or host CPU. After implementing the deterministic gaps, no additional repository-resident browser test was added: the existing codebase has no model-independent fixture that crosses the production WebSocket, full workspace renderer, supported file/reference routes, and Electron media boundary without introducing a test-only product API. Retained external probes are the proportional choice for those live thresholds.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| STR-AC04-LIFECYCLE | `AgentStreamingService.spec.ts` / `TeamStreamingService.spec.ts` | Add remote-disconnect/context-replacement flushing and exact retained content/revision expectations | AC-04; design lifecycle flush rules | Keep boundary-focused; do not duplicate every semantic enum. |
| VOICE-AC03-DENIED | `voiceInputStore.spec.ts` | Add denied permission outcome and synchronous pending cleanup assertions | AC-03 | Use existing mocks; no arbitrary waits. |
| VOICE-AC03-WORKLET | `voiceInputStore.spec.ts` | Reject `audioWorklet.addModule`, assert resource disposal and cleared pending/error state | AC-03 | Also proves no recording commit after failure. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt --run` with 17 scheduler/projector/service/event-monitor/voice/component/file/reference files | `autobyteus-web` | AC-02–AC-05 owner-level behavior including lifecycle, denial, and worklet additions | Pass — 17 files / 208 tests | `api-e2e-execution-evidence/focused-nuxt.log` |
| 2 | `pnpm exec vitest --config ./electron/vitest.config.ts run` | `autobyteus-web` | Electron main/preload/extension regression | Pass on clean rerun — 28 files / 121 tests, 1 real-release test skipped by its documented opt-in | `api-e2e-execution-evidence/electron-suite-rerun.log`; the first attempt's concurrent Electron-binary installation race and focused recovery are retained in `electron-suite.log` and `electron-browser-tab-manager-rerun.log` |
| 3 | `pnpm test:nuxt --run` | `autobyteus-web` | Broader frontend regression | Fail on pre-existing baseline: 390 files / 2,188 tests passed; the same 7 files / 24 tests failed with 2 unhandled errors | `api-e2e-execution-evidence/full-nuxt.log` |
| 3b | Same seven failed files at detached `origin/personal` (`d5618bffd`) after offline install and `nuxi prepare` | `/tmp/autobyteus-runtime-streaming-ui-performance-baseline-39596/autobyteus-web` | Failure-origin comparison | Same baseline Fail — 7 files / 24 tests failed, 83 passed, 2 unhandled errors | `api-e2e-execution-evidence/baseline-failing-nuxt-files.log` |
| 4 | `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals`; `pnpm build` | `autobyteus-web` | Architectural boundary, localization, bundling/runtime assets | Pass; build transformed 3,588 modules and prerendered 15 routes | `api-e2e-execution-evidence/guards-and-build.log` |
| 5 | `git diff --check` | worktree root | Patch hygiene after coverage edits | Pass | command output; no whitespace error |

The full Nuxt failures are not attributed to this change: the exact same seven files and 24 assertions fail on detached `origin/personal`, including incomplete event-monitor mocks in run stores, two run-history mock methods, stale copy/glossary expectations, and associated unhandled rejections. The focused changed boundary, file/reference coverage, Electron suite, guards, and build are green.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Direct owner-level AC-03/04 coverage; valid file/reference and compatibility suites; build/guards | AC-01/02 numeric thresholds and live AC-05/06 are not yet proven | Native/Codex/idle, latency, and persisted-data execution |
| Changed-boundary execution directness | 90% | Scheduler, projector, real service callbacks, event monitor, store/components and lifecycle are executed directly | Repository WebSockets/media are injected or mocked | Real backend WebSocket and Electron renderer |
| Cross-boundary integration realism and mock gap | 75% | Nuxt integration and Electron main suites pass | Provider, renderer load, backend content route, and media stack are not integrated together | Browser and isolated Electron execution |
| Environment, configuration, identity, and fixture fidelity | 75% | Exact backend and toolchain are available; baseline comparison was isolated | Deliberate live run/reference/media fixtures are not yet exercised | Safe live setup and evidence |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | New permission/worklet and disconnect/context-replacement checks pass; existing denial/device/context/watchdog/cancel/transcription paths pass | Physical host permission prompts remain environment-specific | Isolated Electron denial/success/cancel journeys |
| User-surface, browser, and desktop-shell confidence | 75% | Component DOM and rendered implementation evidence plus production build | No post-change 60 s/30k renderer trace or live shell media journey yet | Browser and isolated Electron execution |
| Durable regression coverage quality and relevance | 95% | 208 focused tests include exact identities, recency, revisions, viewer truthfulness, and narrowly added deterministic gaps | Model/host performance cannot be a stable unit gate | Retained reproducible live probe evidence |

- Overall post-repository confidence: `85.0%`
- Calculation method: simple average of seven applicable categories `(90+90+75+75+95+75+95)/7`.
- Every critical acceptance criterion directly proven: `No` — AC-01 and AC-02 require broader execution.
- Any applicable category below `90%`: `Yes` — cross-boundary integration realism; environment/fixture fidelity; user-surface/browser/desktop-shell.
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: whole-source Markdown at 10 Hz; semantic-boundary-induced flush cadence; file/reference click-to-paint under load; provider/idle controls; persisted run direct-use/write cadence; Electron permission/device/worklet/cancel/transcription.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`, `Live API`, `Lifecycle`, and isolated `Project Desktop Validation`
- Specific confidence gap or residual risk addressed: AC-01/AC-02 are explicitly runtime-threshold criteria and repository mocks cannot prove renderer drift/CPU or click-to-visible latency. Electron media APIs and preload identity cannot be proven by happy-dom mocks alone. AC-05/AC-06 require live controls and current-reader behavior.
- Why the selected mode can materially improve confidence: browser execution against the Electron-started backend exercises the real Nuxt renderer, WebSocket payload cadence, full Markdown work, file/reference fetch/presentation and current stored reader. An isolated Electron harness exercises actual Electron renderer media and preload identity without disrupting the user's running app.
- Expected confidence after selected validation: >=95% overall, no category below 90%, assuming all critical AC pass directly.
- Browser-specific decision and rationale: required and preferred for the web-equivalent desktop renderer. It can measure the precise UI scheduling and rendering boundary while preserving the user-owned Electron application.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A` at investigation time; backend, runtimes, Chrome, Electron, and installed voice extension are presently observable.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron 42.4.1.
- Relevant README or development instructions: `autobyteus-web/README.md` development/Electron/testing sections; `electron/main.ts`; `electron/preload.ts`; voice store/worklet.
- Web-equivalent behavior: streaming projection, Markdown rendering, file/reference/composer/settings UI is browser-testable against the Electron-started backend.
- Shell-specific or lifecycle behavior: `window.electronAPI` identity/transcription IPC and Electron media permission/device/AudioContext/AudioWorklet behavior.
- Chosen validation approach and why it fits the project: Chrome/Playwright for web-equivalent runtime thresholds; an isolated project Electron harness with disposable profile for shell/media. Starting the normal worktree Electron main is rejected because it would contend for the user-owned fixed backend port 29695.
- Server/frontend setup when browser validation is used: worktree Nuxt on 127.0.0.1:3000 with every backend REST/GraphQL/WS endpoint bound to 127.0.0.1:29695.
- Effect on any already-running desktop application: `None`; do not stop, restart, focus, or reuse its renderer. The backend is consumed read/write only for deliberate test-run creation/termination through supported product boundaries.
- Behavior not directly proven and confidence consequence: actual physical microphone sound quality is not a goal and will not be claimed. If Electron fake-media cannot prove permission/device/worklet state transitions safely, those precise scenarios become a real blocker rather than inferred success.

## Live Environment And Fixture Plan

- Startup order and commands: confirm backend health/ownership; start owned Nuxt dev process with explicit 29695 endpoints; start disposable Chrome; create deliberate Temp Workspace native team/run; establish a reference-bearing handoff; start sustained native response; measure; terminate; run Codex/idle controls; then run isolated Electron voice harness.
- Environment choices: existing user-owned Electron backend/data root as requested; task worktree frontend; isolated browser/Electron profiles; no production-memory copy or reset.
- Health / readiness checks: backend `/rest/health` 200; worktree page load; in-browser REST/WS URLs resolve to 29695; test run reaches subscribed/running state.
- Seed data / fixtures: clearly named API/E2E task/team, >=30k Markdown target, at least one supported file, at least one message reference opened repeatedly, deliberate missing/error reference when safely creatable.
- Test identities/auth/session: local embedded node/session through normal product path; no secret values recorded.
- Requirement-linked journeys: STR-AC01-NATIVE; FILE-AC02; REF-AC02; VOICE-AC03-*; STR-AC04-*; CTRL-AC05-CODEX; CTRL-AC05-IDLE; PERSIST-AC06; EVIDENCE-AC07.
- Evidence: interval/rAF samples, renderer/backend CPU, content/revision counts, latency samples, direct HTTP status/time, DOM state, screenshots, WebSocket envelope metadata, process and persistence-file observations, command logs.
- Owned cleanup: terminate created runs/teams; stop worktree Nuxt, Chrome, and isolated Electron; remove temporary profiles/routes/audio fixtures; do not stop PID 83877/user app.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| STR-AC01-NATIVE | Retained Playwright measurement script against a deliberate model-backed native run | Real >=60 s/30k cadence, drift/stall/CPU, final visible accumulation | Provider speed/output and host CPU are acceptance evidence, not a deterministic CI gate. |
| FILE-AC02 / REF-AC02 | Same browser run plus direct endpoint sampler | Click-to-visible p95 and truthfulness while renderer is loaded | Requires deliberately created server-side run/reference data and local Electron backend. |
| CTRL-AC05-CODEX / IDLE | Same topology with Codex and no stream | Runtime-neutral compatibility and baseline behavior | Model-backed comparison is environment-dependent. |
| PERSIST-AC06 | Read-only current-reader/API plus file metadata polling for the created run | Direct use and logical-boundary persistence | User data locations and live run IDs are environment-specific. |
| VOICE-AC03-ELECTRON | Isolated Electron renderer fixture/harness using production store/worklet and controlled media | Permission/device/worklet/start/cancel/transcription lifecycle | May remain as a retained executable probe if deterministic and maintainable; do not add a production test route or port-conflicting app launch. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Physical microphone acoustic accuracy/model transcription quality | Outside this UI lifecycle/performance change; avoid disturbing user device | None to changed lifecycle if Electron media/worklet/transcription boundary is exercised with controlled input | Record limitation; no pass claim for acoustic quality. |
| Remote/network file latency | Explicitly out of requirements scope | None for supported local path | N/A |
| Server log rotation/token ledger warnings | Upstream declares separate operational follow-up | Existing operational noise remains | Do not conflate with this validation. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| AC-01 or AC-02 fails with actual post-change path | Design Impact | Requirements and design explicitly assign this gate to solution design, not local throttles | `solution_designer` through `code_reviewer` failure-origin review |
| Current reviewed semantics contradict a durable test | Requirement Gap / Design Impact depending evidence | Full upstream package | `solution_designer` before removing/forcing coverage |
| Test-only fixture/environment error | Local Fix | Narrow execution evidence | `api_e2e_engineer`; on completed Fail, route to `code_reviewer` for origin confirmation |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update three existing service/store test files; no removal planned.
- Post-repository confidence: `85.0%`
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: the investigation existed before all durable edits. The planned deterministic additions are implemented and green. Repository evidence requires broader validation because the post-repository score is 85.0% and three categories remain below 90%.

## Broader Validation Execution Update — API-REV-001

The required broader plan completed successfully. The authoritative result and detailed evidence matrix are in `api-e2e-execution-coverage-report.md`; retained raw and summarized evidence is under `api-e2e-execution-evidence/`.

| Scenario | Final Evidence | Result |
| --- | --- | --- |
| STR-AC01-NATIVE | 17,439 real native content events, 121,669 characters, 560.8-second content span; 50 ms p95 drift 3 ms; zero >500 ms attributable stalls; renderer CPU mean/p95 18.23/37.3% | Pass |
| FILE-AC02 | A focused second native run delivered 410 content receipts while 10 local files opened; p95 39.669 ms and every open had fresh stream activity | Pass |
| REF-AC02 | 10 reference opens during progressing content; p95 84.686 ms; 10 direct HTTP 200 reads; truthful HTTP 404 `REFERENCE_NOT_FOUND` | Pass |
| VOICE-AC03-* | Isolated Electron 42 actual permission/media/worklet renderer: next-render Starting state, one getUserMedia request, recording/transcription UI, denied request cleanup, and unmount track stop; deterministic device/worklet failures also passed durable coverage | Pass |
| STR-AC04-LIFECYCLE | Focused 17-file / 208-test execution including exact scheduler/projector/service/event-monitor lifecycle assertions | Pass |
| CTRL-AC05-CODEX / IDLE | Exact prior Codex/Luna history loaded through the current reader; README 22.23 ms, reference 30.22 ms; idle p95 drift 1.1 ms and zero content events | Pass |
| PERSIST-AC06 | Five prior Codex and seven native memory files loaded directly and remained byte/hash/mtime identical after reads; no backend/schema/writer change or presentation persistence path | Pass |

- Final confidence: `97.4%`
- Every critical acceptance criterion directly proven: `Yes`
- Any final category below 90%: `No`
- Final result: `Pass`
- Residual limitation: physical microphone acoustics and actual transcription-model accuracy were intentionally not exercised. The production renderer lifecycle used an Electron fake audio input and controlled IPC response; the user accepted manual coverage of the non-critical physical/audio-quality aspect.
- Cleanup: both owned native teams terminated; Chrome/Electron profiles and windows closed; owned Nuxt stopped; baseline worktree and disposable Temp Workspace fixture removed; user-owned AutoByteus app/backend untouched and backend health remained HTTP 200.
