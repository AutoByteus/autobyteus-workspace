# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md`
- Supplemental Task Artifacts: `production-trace-evidence.md`, `team-status-simplification-evidence.md`, `codex-steering-stale-running-evidence.md`, and the six user screenshots listed in the implementation/code-review package
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-revision-record.md`
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/delivery-revision-record.md` (superseded `DR-005` context only)
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Investigation Round: `4` / first `SR-008` round
- Trigger: `CRR-009` source-review Pass for `IR-006` / `SR-008`, reviewer artifact commit `a634155ba`
- Prior Investigation Reviewed: `Yes` — `API-REV-003` / `SR-006` is accepted preservation and browser-presentation context only, not `SR-008` sign-off.
- Latest Authoritative Investigation: this `SR-008` investigation, written before any `SR-008` durable coverage edit or final execution.

## Current Requirement And Design Basis

`REQ-021`, `AC-027`, and `AC-028` require the bundled Codex runtime to use strict `turn/start` only while idle and strict `turn/steer(expectedTurnId=A)` while provider turn A is identified. Steering must preserve A through the operation result, runtime memory association, canonical lifecycle, terminal settlement, and reconnect; start/terminal and steer/terminal races must not reopen or invent a phantom B. A non-steerable, mismatched, malformed, or provider-rejected steer must remain a structured failure and must never fall back to `turn/start`.

`REQ-022` and `AC-029` require every current standalone or exact team-member `INTERRUPT_GENERATION` request to carry a client command ID and complete with one discriminated same-socket `AGENT_COMMAND_ACK`. Accepted means provider/runtime admission only and cannot optimistically set idle. Rejected/failed results retain exact command and target identity, expose a code/message visibly, and must not become a generic runtime error, transcript entry, team-activity mutation, or retry. Locally nonconnected, synchronous-send-failed, and disconnected admitted commands must each complete exactly once.

Preserved requirements remain active regression constraints: member `AGENT_STATUS` is canonical and event-driven; exact team-run activity stays manager-owned binary `isActive`; task-team routes use the established outward coordinate frame; Stop is enabled only by canonical running status; companion batching stays transparent; persisted state is `Not Affected`; no legacy interrupt or active-input fallback may be protected.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Codex idle input -> strict start S | Changed | `REQ-021`, `AC-028`, `BEH-010` | Recheck method schema and real bundled provider start/terminal behavior. |
| Codex active input -> strict steer A | Added | `REQ-021`, `AC-027`, live phantom-B evidence | Add real app-server execution proving exact A, no second start, terminal idle, and memory association. |
| Start/terminal and steer/terminal races | Added | `AC-028`, reviewed `lastTerminalTurnId` design | Preserve deterministic race coverage and execute broader live terminal settlement where deterministic. |
| Structured steer rejection/no fallback | Added | `REQ-021`, `AC-028` | Preserve direct mocked/provider-protocol assertions; scan and execute failure path without accepting a fallback B. |
| Standalone interrupt result | Added | `REQ-022`, `AC-029`, `BEH-011` | Update stale real WebSocket scenarios to current command ID and assert exact same-socket accepted/rejected/failed arms. |
| Exact nested team interrupt result | Added | `REQ-022`, `AC-029`, task-team coordinate contract | Update root -> ordinary subteam -> task team -> leaf WebSocket coverage with exact ack identity and reconnect convergence. |
| Frontend admission/cleanup/result presentation | Added | `ARCH-FIND-004` resolved, `BEH-011` | Preserve focused helper/service/store tests and add real-browser WebSocket/toast/Stop journey. |
| Agent lifecycle, binary team activity, companion batching | Preserved | prior `API-REV-002/003`, `CRR-009` | Rerun affected preservation suites; ack cannot flush content or mutate status/activity. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `CodexThread` serialized start/steer identity and structured result | Unit tests directly script request/notification races | Bundled provider response/timing | Live Codex app-server |
| API / transport / contract | Yes | Discriminated interrupt ack over originating WebSocket | Handler units | Real Fastify/`ws` ordering, exact socket/target | Integration WebSocket |
| Frontend component / state | Yes | Shared admission, service correlation, store-owned toast | 5 focused changed suites / 117 tests | Browser DOM/toast and real socket timing | Chrome + owned WS fixture |
| Browser integration / user journey | Yes | Stop click -> command -> ack/disconnect -> toast/canonical status | Mounted component test is mocked and currently has stale payload expectation | Real WebSocket, rendered toast count, Stop persistence | Browser |
| Authentication / session / permissions | No | No auth shape changed | Existing session handshake | None material | None |
| Desktop renderer / web-equivalent UI | Yes | Ordinary Nuxt/Vue renderer behavior | Component tests | Real Chromium rendering/event loop | Browser |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package source changed | N/A | None | None |
| Process / lifecycle | Yes | Codex provider turn terminal race; socket reconnect/disconnect | Unit lifecycle and prior reconnect integration | Live app-server process and browser socket disconnect | Live provider + lifecycle/browser |
| Persisted-data transition | No | Runtime-ephemeral IDs/correlation only | Handoff says `Not Affected` | None | None |
| Worker / queue / distributed coordination | No | No worker/queue change | N/A | None | None |
| External integration | Yes | Bundled `codex app-server` protocol | Env-gated live integration exists | Current installed/authenticated CLI behavior | `RUN_CODEX_E2E=1` focused live run |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Stack: pnpm monorepo; TypeScript/Fastify/WebSocket/Vitest server; Nuxt/Vue/Pinia/Vitest frontend; Playwright Core + installed Chrome for durable browser probes; Electron wraps the same renderer.
- Conflicting/missing instructions: none. Existing dirty delivery/solution artifacts are upstream-owned and must not be reverted or swept into an API/E2E commit.
- Required environment/secrets available: Codex binary `0.146.0` is installed. Provider/auth availability must be established by fresh execution; secret values will not be recorded. Chrome `150.0.7871.187` is available.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test authority | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration path supported. |
| `autobyteus-web/AGENTS.md` | Frontend test authority | Use `pnpm -C autobyteus-web test:nuxt <paths> --run`; avoid watch mode. |
| root `README.md`, `autobyteus-server-ts/README.md` | E2E/live runtime | Deterministic `pnpm test:e2e`; Codex live suites require `RUN_CODEX_E2E=1`; test-owned temp app data; targeted cleanup exists. |
| `autobyteus-web/README.md` | Browser/web-equivalent desktop | Browser development path is authoritative for ordinary renderer behavior; Playwright Core/local Chrome probes are supported. |
| root/server/web `package.json` | Scripts | Server build/typecheck/tests; Nuxt tests/guards; direct durable browser-probe invocation. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository tests | worktree root | focused pnpm/Vitest commands | test-owned DB/temp state | process exit | Vitest teardown |
| Codex app-server | server package | `RUN_CODEX_E2E=1 pnpm exec vitest run <live files> --no-watch` | test creates temp workspace/client | startup-ready/model catalog | thread/client manager teardown + temp removal |
| Nuxt browser fixture | web package | durable probe starts `nuxi dev` on free loopback port | no production/user data | HTTP fixture route | probe-owned process-group termination and page removal |
| Browser fixture WS server | durable probe | ephemeral loopback `ws` server | deterministic standalone/team ack/status scripts | socket open/recorded connection | close clients/server |
| Chrome | probe | Playwright Core local executable | headless, isolated context | page ready/DOM controls | browser/context close |

| Data / Fixture / Identity Need | Existing Mechanism | Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Codex workspace/run/thread | live integration temp directories and run IDs | isolated from user workspace/history | terminate threads and remove temp dirs |
| Standalone/team WebSocket identities | in-test fake `AgentRun`/`TeamRun` and exact nested route constants | no persistent data | app/socket close |
| Browser run/team/context | deterministic fixture-created Pinia state | no auth/backend/user data | route, sockets, processes removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- References: design `Persisted Data / State Transition Decision`; implementation handoff `Persisted Data Transition Check`.
- All new provider-turn and pending interrupt state is ephemeral. No schema, GraphQL, history DTO, or migration changed.
- Memory coverage validates current raw-trace turn association, not a migration. No compatibility or dual-read coverage is allowed.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Intent | Related Requirement | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/.../codex-thread.test.ts` strict start/steer/races/rejections | Method selection, serialization, strict identities, terminal precedence, no fallback | REQ-021 / AC-027/028 | Still Valid | Direct request/notification control; source review passed | Rerun unchanged. |
| `tests/unit/.../codex-agent-run-backend.test.ts` structured result | Preserve codes across runtime adapter | REQ-021 | Still Valid | Direct adapter assertions | Rerun unchanged. |
| `tests/integration/.../codex-thread.integration.test.ts` live start/interrupt | Real bundled app-server start/terminal/interrupt | AC-027/028 | Needs Update | No live active-A steer assertion | Add exact live steer scenario. |
| `tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Real raw-trace persistence | AC-027 | Needs Update | Only one ordinary turn; no steered input/turn association | Add steer-to-same-A memory assertion if live flow is deterministic. |
| `tests/unit/services/...agent*-stream-handler.test.ts` | Every interrupt ack arm/target | REQ-022 / AC-029 | Still Valid | Current command IDs and discriminated acks | Rerun unchanged. |
| `tests/integration/agent/agent-websocket.integration.test.ts` | Real Fastify standalone lifecycle/command | REQ-022 / AC-029 | Needs Update | Existing interrupt sends no command ID and expects silence | Replace obsolete expectation with exact rejected/accepted/failed ack checks. |
| `tests/integration/agent/agent-team-websocket.integration.test.ts` | Real Fastify team targeting | REQ-022 / AC-029 | Needs Update | Interrupt requests are pre-command-ID and do not assert ack | Add IDs and exact ack assertions. |
| `tests/integration/agent/team-lifecycle-websocket.integration.test.ts` | Exact nested task-team leaf + reconnect | AC-027/029 | Needs Update | Route/reconnect is valid but interrupt omits ID/ack | Add exact nested same-socket ack barrier; retain reconnect running->idle assertions. |
| Runtime interrupt E2Es for AutoByteus/Claude | Provider interrupt/resume/follow-up | REQ-022 preserved origins | Needs Update | Current requests omit required `command_id`, so they no longer execute approved path | Add IDs; keep provider behavior assertions; assert ack where practical. |
| Frontend admission/service/store suites | Exact correlation, nonconnected/send/disconnect cleanup, one callback, no lifecycle mutation | ARCH-FIND-004 / AC-029 | Still Valid | Current 5 files / 117 tests passed | Rerun unchanged. |
| `AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | Visible focused team Stop -> exact socket target | AC-029 | Needs Update | Expected payload omits new `command_id` | Assert generated command ID plus exact route/run. |
| Existing SR-006 browser probe | Binary team activity presentation | preserved BEH-006/007 | Still Valid | `API-REV-003` and `CRR-008` accepted | Rerun only as preservation if changed browser fixture exposes risk; no edit. |
| Existing browser probe for SR-008 | None | AC-029 | Replace / absent | No real-browser Stop/result coverage exists | Add focused durable probe/fixture. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `agent-websocket.integration.test.ts` inactive interrupt | Missing-ID request produces no message | Every current interrupt must complete with an ack; command ID is required | REQ-022 / AC-029 | Same real socket asserts `RUN_NOT_FOUND` with exact ID/target and no restore | N/A |
| Existing server/browser interrupt payload expectations | Interrupt payload has target only or no payload | Current protocol requires `command_id`; old request proves only invalid-command behavior | REQ-022 / BEH-011 | Update in place with command ID and retain provider/routing assertions | N/A |

No durable file will be deleted. No compatibility-only scenario is retained.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement | Planned Artifact / Path | Why Durable |
| --- | --- | --- | --- | --- |
| API-E2E-020 | Real Codex idle start then active-A steer, exact A, terminal idle | REQ-021 / AC-027/028 | `codex-thread.integration.test.ts` | Provider schema/behavior can drift independently of mocks. |
| API-E2E-021 | Steered user input persists under canonical A | AC-027 | `codex-live-memory-persistence.e2e.test.ts` when deterministic | Guards the phantom-B memory association defect. |
| API-E2E-022 | Standalone real socket exact accepted/failed/inactive ack | REQ-022 / AC-029 | `agent-websocket.integration.test.ts` | Handler units bypass real WebSocket ordering/same-socket evidence. |
| API-E2E-023 | Nested root -> ordinary subteam -> task team -> leaf exact ack and reconnect convergence | AC-027/029 | `team-lifecycle-websocket.integration.test.ts` | Directly protects the reported nested route and connection boundary. |
| API-E2E-024 | Browser standalone accepted/failed/disconnect behavior | AC-029 | new web E2E probe + fixture | User-visible Stop/toast/canonical transition requires browser evidence. |
| API-E2E-025 | Browser nested team failure exactness and no team/transcript mutation | AC-029 | same probe + fixture | Shared mechanics still need exact team surface proof. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-022 | `agent-websocket.integration.test.ts` | Add IDs and exact accepted/failed/rejected ack assertions | REQ-022 / AC-029 | No lifecycle payload in interrupt ack. |
| API-E2E-023 | `agent-team-websocket.integration.test.ts`, `team-lifecycle-websocket.integration.test.ts` | Add IDs, exact target acks, deterministic wait | REQ-022 / AC-029 | Includes exact nested leaf. |
| API-E2E-026 | AutoByteus/Claude runtime interrupt E2Es | Add command IDs and retain current provider settlement/resume | REQ-022 | Removes stale invalid-request fixtures. |
| API-E2E-027 | `AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | Match generated `client_interrupt_*` ID | AC-029 | Keeps click-to-exact-target proof valid. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

All commands ran from the assigned worktree. Status sidecars are `0` for every authoritative result.

| Order | Command / Scope | Working Directory / Configuration | Boundary Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused changed server/API files | server, Vitest | updated real sockets plus current Codex integration (live file skipped without flag) | Pass — 3 files / 18 tests; 1 live file / 5 tests skipped here by design | `api-e2e-evidence/sr008-repository/server-focused.log` |
| 2 | focused frontend helper/service/store/component files | web, Nuxt Vitest | admission, correlation, exactly-once cleanup, one-toast owner, Stop/lifecycle invariants | Pass — 6 files / 118 tests | `api-e2e-evidence/sr008-repository/frontend-focused.log` |
| 3 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | root/server | server compile contract | Pass | `api-e2e-evidence/sr008-repository/server-build.log` |
| 4 | explicit 13-file expanded server set | server, Vitest | strict Codex unit races/rejections, standalone/team real sockets, nested reconnect, lifecycle/companion preservation, provider-origin fixtures | Pass — 10 files / 116 tests; 3 provider-gated files / 31 tests skipped | `api-e2e-evidence/sr008-repository/server-expanded.log`; classification alongside |
| 5 | explicit 16-file expanded frontend set | web, Nuxt Vitest | interrupt admission/result plus binary team activity, recovery, history, exact team Stop, companion batching | Pass — 16 files / 144 tests | `api-e2e-evidence/sr008-repository/frontend-expanded.log`; classification alongside |
| 6 | web/localization guards and literal audit | web | web boundary and localized result-message integrity | Pass | `api-e2e-evidence/sr008-repository/frontend-guards.log` |
| 7 | structural/current-payload/legacy/diff checks | root | no API/E2E source edit, clean diff, current IDs, strict start/steer owner, clean browser result/cleanup | Pass | `api-e2e-evidence/sr008-repository/structural.log` |
| 8 | fresh real-provider capability preflight | root | current provider capability without value disclosure | Pass — 18/18; Codex selected; absent external secrets/local endpoints classified | `api-e2e-evidence/sr008-live/preflight.log`; `preflight-classification.txt` |
| 9 | live Codex thread suite with `RUN_CODEX_E2E=1` | server, installed/authenticated Codex CLI `0.146.0` | start, exact active-A steer/no phantom B, terminal, approve/deny, interrupt | Pass — 1 file / 5 tests | `api-e2e-evidence/sr008-live/codex-thread-live.log` |
| 10 | live Codex memory suite with `RUN_CODEX_E2E=1` | server | initial and steered input retained under canonical A, terminal idle | Pass — 1 file / 2 tests | `api-e2e-evidence/sr008-live/codex-steer-memory.log` |
| 11 | live Codex thread-manager suite with `RUN_CODEX_E2E=1` | server | remote thread restore/reconnect and same-ID continuation | Pass — 1 file / 3 tests | `api-e2e-evidence/sr008-live/codex-thread-manager-live.log` |
| 12 | durable Playwright Core probe, owned Nuxt + loopback WS, Chrome | web | rendered exact result, one toast, Stop persistence, canonical terminal, disconnect cleanup, nested team invariants | Pass — 4/4 scenarios; zero page/console errors | `api-e2e-evidence/sr008-browser/evidence.json` |

Fresh non-green observations were classified rather than inherited: provider-gated tests were skipped because the fresh preflight found their external secrets/endpoints absent; expected negative-path stderr did not fail assertions; four browser harness attempts and two structural-scan harness attempts are retained with classifications. None exposed an implementation defect.

## Post-Repository Confidence Scorecard

These scores reflect repository/build/integration execution before crediting the live Codex and rendered-browser runs. Real Fastify/`ws` integration is repository coverage and is included here; the live external process and Chrome journeys are reserved for the final score in the execution report.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | Direct strict-method/race/rejection tests, exact real-socket acknowledgements, frontend invariants | Bundled provider and rendered UI not yet credited | Live Codex + browser |
| Changed-boundary execution directness | 94% | Production Codex owner, handlers, services, stores, and component executed | Provider subprocess and browser event loop not yet credited | Live Codex + Chrome |
| Cross-boundary integration realism and mock gap | 92% | Real Fastify WebSockets and integrated Nuxt/component/store suites | Server and browser peer remain separately controlled | Live provider + real browser WS |
| Environment, configuration, identity, and fixture fidelity | 92% | Current TypeScript build, actual nested identities, current schemas/config | Current provider auth/model and Chrome not yet credited | Preflight + live/browser |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Deterministic races/rejections plus real accepted/rejected/failed socket arms and reconnect | Browser disconnect/toast behavior not yet credited | Chrome disconnect/result journeys |
| User-surface, browser, and desktop-shell confidence | 84% | Component/store tests prove logic; no shell boundary changed | No rendered browser proof yet | Chrome; Electron not required |
| Durable regression coverage quality and relevance | 96% | Narrow requirement-linked updates, no deletions/compatibility fixtures, combined suites green | Proportional test review remains downstream | Code reviewer test pass |

- Overall post-repository confidence: `92.4%` (simple average of seven applicable categories).
- Every critical acceptance criterion directly proven: `No — live provider identity and rendered result/Stop behavior still required at this gate.`
- Any applicable category below `90%`: `Yes — user-surface/browser 84%.`
- Default clean-confidence target met: `No`.
- Material residual risks: actual bundled `turn/steer` schema/identity, live thread restore/memory, browser same-event-loop ack/disconnect handling, duplicate toast, and optimistic Stop/lifecycle mutation.

## Broader Validation Decision

- Decision: `Required`.
- Selected modes: `Live API / Lifecycle` through the installed bundled Codex app-server, plus `Browser` through production Nuxt/Vue/Pinia services/components and real loopback WebSockets in Chrome.
- Gap addressed: repository tests control provider responses and DOM/socket timing; the two historically defective boundaries require real subprocess and renderer event loops.
- Expected confidence: at least `95%`, with no category below `90%`, only if every selected journey passes.
- Browser rationale: one-toast visibility, Stop persistence, canonical terminal convergence, and absence of transcript/team mutation are web-equivalent user-surface requirements. Electron execution is not required because no shell/preload/IPC source changed.

## Desktop Application Validation Decision

- Framework: Electron wrapping Nuxt.
- Web-equivalent behavior: all changed frontend behavior is ordinary Vue/Pinia/WebSocket/localization DOM behavior.
- Shell-specific behavior: none.
- Chosen approach: Chrome against an owned Nuxt fixture and real loopback WS server.
- Effect on user Electron application: none.
- Not directly proven: packaged Electron rendering; negligible because no shell/package boundary changed and delivery owns the eventual integrated rebuild.

## Live Environment And Fixture Result

- Fresh preflight passed 18/18 capability checks without retaining secret values. Bundled Codex CLI `0.146.0` was installed, authenticated, and successfully executed; unrelated managed-provider secrets and LM Studio/Ollama were unavailable and are classified in evidence.
- Live Codex used test-owned temporary workspaces/run/thread identities. The thread, memory, and manager suites all passed and cleaned clients/threads/temp state through their teardowns.
- The durable browser probe chose free loopback Nuxt/WS ports, launched isolated headless Chrome `150.0.7871.187`, mounted actual production stores/services/component/global toast UI, and asserted semantic DOM/state plus exact recorded frames.
- Browser scenarios `SR008-BR-001..004` passed: standalone failed ack, accepted ack followed by canonical idle, pending disconnect, and exact nested team failed ack.
- Four initial browser attempts are retained and classified as probe/fixture expectation errors; the final run has zero failures, zero page errors, zero console errors, and terminated only its owned Nuxt process. No screenshot was required because semantic DOM/state and exact frame evidence directly established the material behavior.

## Temporary Executable Validation Plan / Result

None. The provider and browser coverage is repository-resident and durable. Failed harness attempts are retained only as truthful evidence chronology, not as accepted results.

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Packaged Electron | No shell/preload/IPC/package source changed | Negligible | Delivery integrated rebuild |
| Forced live provider rejection or exact terminal-race injection | Bundled provider offers no deterministic timing/error injection | Low: production owner is directly covered with deterministic request/notification scripts; real start/steer/terminal all pass | Retain deterministic coverage; do not fabricate live control |
| External AutoByteus/Claude managed-provider journeys | Fresh preflight found secrets absent; origins unchanged | Low: updated fixtures compile, fake Claude runtime paths pass, and shared current socket/result path has real integration/browser proof | Run only if provider credentials become part of scope |
| Repository-wide frontend typecheck | Upstream `IR-006` already records 5,456 baseline diagnostics and zero changed-source intersection; this round changes tests/fixtures only | Low for changed scope: Nuxt Vitest and real Nuxt browser compilation pass | Repository-wide debt remains separate |

## Ambiguities Or Reroute Triggers

None. All selected critical scenarios passed; no requirement, design, implementation, or environment finding requires reroute.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes — two files added, ten files updated, none removed.`
- Post-repository confidence: `92.4%`.
- Broader validation decision: `Required and completed — live Codex, live thread restore/memory, real Fastify WebSockets, and Chrome.`
- Reroute Required Before Validation Execution: `No`.
- Recommended next recipient: `code_reviewer` for proportional durable-test review after the execution report and `API-REV-004` are finalized.
- Notes: This is the authoritative `SR-008` investigation. `API-REV-003` remains accepted `SR-006` historical context only.
