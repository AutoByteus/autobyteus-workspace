# API/E2E Coverage Investigation — Runtime Streaming Performance Follow-up

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/performance-evidence.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/solution-revision-record.md` (`SR-001`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/implementation-revision-record.md` (`IR-001`, `IR-002`, `IR-003`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-revision-record.md` (`CRR-001` through `CRR-004`)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `CRR-004` pass after IR-003 resolved API-REV-001's WS-EGRESS-001 implementation failure.
- Prior Investigation Reviewed: `Round 1 / API-REV-001 Fail at 77.1%.`
- Latest Authoritative Investigation: `Round 2 — prior failure resolved; affected repository coverage is green; browser/runtime and real-provider validation were required and completed.`

## Current Requirement And Design Basis

IR-003 preserves routine `AGENT_STATUS running` messages as immediate, separate, client-visible events while allowing the actual pending same-identity content tail to remain mergeable. Different identities remain ordered A/B/A groups; dependent, terminal, error, and unclassified messages flush earlier content. The server is the sole timed cadence owner; the browser projects shaped messages immediately and uses cheap escaped live text/reasoning until one final rich render. The persisted bound-node interval defaults to 500 ms, accepts only integer 100–2,000 ms, applies to a new window without moving an existing timer, and needs no data migration.

Critical direct proof remains AC-001 through AC-008: real socket semantics, exact equality, default output rate/reduction, 10-minute/120k browser performance, live/final DOM behavior, Settings API/persistence/bound-node behavior, and compatibility across affected standalone/team/runtime paths.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / sustained runtime-to-visible performance | Changed | FR-001/FR-006; AC-001/AC-006 | Measure a current candidate for at least 10 minutes and 120k characters, not historical evidence. |
| BEH-002 / cadence ownership | Removed + Added | FR-002; DS-003; IR-003 | Server real-socket cadence must pass; no frontend timer may add delay. |
| BEH-003 / WebSocket egress shaping | Added | FR-003/FR-004; AC-003/AC-004; CRR-004 | Recheck WS-EGRESS-001 first, then prove exact ordering, status visibility, and reduction. |
| BEH-004 / runtime/team compatibility | Preserved | FR-005; AC-005 | Run standalone/team and affected runtime/browser regressions; supplement with real provider control when safely available. |
| BEH-005 / active versus completed presentation | Changed | FR-007; AC-007 | Real Chrome must show escaped live text/reasoning and one safe rich completion transition. |
| BEH-006 / bound-node interval setting | Added | FR-008; AC-008 | Durable GraphQL and component coverage plus two real isolated nodes/browser binding. |
| Existing data/canonical internal events | Preserved | AC-003/AC-006; implementation handoff | Prove all source events remain internal/fine-grained and absent existing config directly uses 500 with no migration. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence | Remaining Risk Before Broader Validation | Selected Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend | Yes | Lifecycle output through per-session egress and typed setting | Server unit/integration suites | Fake time or short duration cannot prove host performance | Real WS + sustained harness |
| API/transport | Yes | GraphQL Settings and agent/team WebSockets | Durable API/WS E2E | Bound-node browser rebinding and long open socket | Two nodes + Chrome |
| Frontend/state | Yes | Immediate projection, live/final renderer, Settings card/store | 13 web suites | Real DOM, parser transition, interaction latency | Chrome |
| Browser/user journey | Yes | Conversation rendering and Settings | Component coverage only | Long output and integration/bundling | Chrome + Nuxt |
| Auth/session | No material change | Local supported session behavior | Existing coverage | None introduced | N/A |
| Web-equivalent desktop renderer | Yes | Same Nuxt renderer used by Electron | Web tests/build | Host CPU/drift not covered by unit tests | Browser-preferred |
| Electron shell | No | No preload/IPC/window/package source changed | Diff review | Negligible unchanged-shell uncertainty | Do not launch desktop |
| Process/lifecycle | Yes | Timer/dispose/open socket/status/completion | Egress and WS suites | Real timer/process cleanup | Real WS/processes |
| Persisted data | Additive, directly usable | Existing `.env` reader/writer | GraphQL E2E | Two-node isolation | Two real isolated nodes |
| Worker/queue/distributed | No | No changed contract | N/A | None | N/A |
| External provider | Shared runtime path, not required for determinism | Provider feeds canonical AgentRun | Existing live-E2E harness | Deterministic source is not an actual provider | Supplemental DeepSeek/OpenAI agent-flow |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup`; branch `codex/runtime-streaming-performance-followup`; implementation `75b9be359`.
- Stack: pnpm monorepo, TypeScript/Fastify/Mercurius/WebSocket, Nuxt/Vue/Pinia, Vitest, Playwright Core/Chrome, Electron wrapper.
- User-owned ports 3000, 8000, and 29695 were not stopped or reused; all broader validation used free loopback ports and owned data roots.
- User explicitly authorized `/Users/normy/.autobyteus/server-data/.env` for supplementary real-provider tests. Secret values were never printed or copied to ticket artifacts. The importer and live-E2E runner's value-safe evidence scanner were used.

| Instruction / Configuration | Authority / Learned Constraint |
| --- | --- |
| Root `README.md`; server `README.md` | `pnpm test:e2e`; `pnpm test:e2e:real:preflight`; `pnpm test:e2e:real`; plaintext `.env` is not a runtime provider; use the sole importer with explicit absolute DB URL. |
| `autobyteus-server-ts/AGENTS.md` | Focused Vitest `run ... --no-watch`; server test ownership. |
| `autobyteus-web/AGENTS.md`, web README | Colocated Nuxt tests; browser probes are supported; browser is preferred for web-equivalent Electron behavior. |
| `test-support/live-e2e/run-live-e2e.mjs` | Built isolated server, sanitized environment, selected scenarios, captured output, secret leak scan, owned process stop. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Test DB constrained under `autobyteus-server-ts/db`; runtime roots under tests `.tmp`; free loopback ports. |
| Package scripts/configs | Server/web build, guard, unit, E2E, and real-provider commands are authoritative. |

| Component | Setup / Runtime | Readiness | Cleanup |
| --- | --- | --- | --- |
| Durable server API/WS | Vitest on real Fastify sockets and isolated settings roots | Assertions/socket open | Test `finally`/Vitest exit |
| Browser production path | Scripted production AgentRun/default pipeline/handler/egress -> real WS -> production WebSocketClient/service/renderers in Nuxt | Harness 202, WS connected, DOM signals | Close Chrome; stop owned Nuxt/harness/nodes; remove fixture and roots |
| Settings nodes A/B | Two built servers on free ports with distinct temp roots | GraphQL query/effective 500 | Reset setting, stop, remove roots |
| Live providers | Value-safe import into initially absent `autobyteus-server-ts/db/test.db`; real-E2E runner | Preflight `READY` | Remove imported DB/key and live runtime root; leave source unchanged |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Existing isolated `.env` without the interval key reports/uses 500 without rewrite; valid saves persist canonical values; invalid direct input falls back to 500; reset returns 500.
- GraphQL E2E and two browser-bound node roots directly prove the current reader/writer. No migration, compatibility wrapper, version branch, or dual read/write is present.
- Upstream ambiguity: `None`.

## Existing Durable Coverage Inventory And Decisions

| Path / Scenario | Decision | Action / Result |
| --- | --- | --- |
| `tests/unit/config/streaming-content-flush-interval-setting.test.ts` | Still Valid | Retained; affected unit run passed. |
| `tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts` | Still Valid | Retained; cadence/boundary unit run passed. |
| `tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Needs Update -> Updated | API-SET-001 added; combined server run passed. |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` | Needs Update -> Updated | WS-EGRESS-001/002 and current 9-message runtime matrix passed. |
| `tests/integration/agent/agent-team-websocket.integration.test.ts` | Needs Update -> Updated | WS-EGRESS-003 A/B/A passed. |
| 13 affected web service/store/component suites | Still Valid | 140 tests passed. |
| `tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Still Valid | Preflight and DeepSeek/OpenAI real agent-flow passed after harness repair. |
| `test-support/live-e2e/live-e2e-harness.ts` | Needs Update -> Updated | Compare normalized DB paths; wrap raw backend in production `AgentRun` facade. |
| Historical v1.4.37 evidence | Out Of Scope as current proof | Comparator only; not counted toward pass. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Replacement |
| --- | --- | --- |
| Agent status runtime matrix | Expected two separate `one`/`two` client content frames and 10 messages | Current intended same-identity aggregate `onetwo`, 9 messages, four visible undeduplicated statuses. No scenario removed. |

## Durable Coverage Added Or Updated

| Scenario ID | Path | Change / Requirement | Result |
| --- | --- | --- | --- |
| API-SET-001 | `server-settings-graphql.e2e.test.ts` | Default, valid values, rejection, fallback, reset, persistence / AC-008 | Pass |
| WS-EGRESS-001/002; WS-STATUS-001 | `agent-status-websocket.integration.test.ts` | Real default aggregation, next-window setting, status/terminal order / AC-002–AC-005/008 | Pass |
| WS-EGRESS-003 | `agent-team-websocket.integration.test.ts` | Team A/B/A exact identity/order / AC-004/005 | Pass |
| LIVE-E2E-HARNESS-001 | `live-e2e-harness.test.ts`; `test-support/live-e2e/live-e2e-harness.ts` | Normalized one-DB identity and production AgentRun adapter | Pass |

Durable coverage removed: `None`.

## Repository Coverage Execution Plan And Results

| Order | Command / Scope | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Exact unchanged WS-EGRESS-001 command first | Pass, 1 passed / 6 skipped | `ws-default-window-rate-api-rev-002.log` |
| 2 | Combined status/team/settings, then corrected stale expectations and rerun | Pass, 3 files / 28 tests | `api-rev-002-combined-server-coverage-rerun.log` |
| 3 | Status runtime matrix | Pass, 3 passed / 4 skipped | `ws-status-runtime-matrix-api-rev-002.log` |
| 4 | Six affected server unit suites | Pass, 6 files / 141 tests | `api-rev-002-server-unit-regression.log` |
| 5 | 13 affected web suites | Pass, 13 files / 140 tests | `api-rev-002-web-13-file-regression.log` |
| 6 | Server build-tsconfig, server build, web guards, web production build | Pass; web generated 15 routes | `api-rev-002-server-build-typecheck.log`, `api-rev-002-server-build.log`, `api-rev-002-web-guards.log`, `api-rev-002-web-build.log` |
| 7 | Focused live-E2E harness unit after two infrastructure fixes | Pass, 1 file / 17 tests | `real-provider-harness-unit-rerun.log` |

## Post-Repository Confidence Scorecard

| Category | Score | Support | Remaining Gap Before Broader Validation |
| --- | ---: | --- | --- |
| Requirement/AC proof | 90% | Direct API/WS semantics and broad affected regression | Long performance and real DOM pending |
| Changed-boundary directness | 95% | Production lifecycle/mapper/handler/egress and real sockets | Browser half pending |
| Cross-boundary realism/mock gap | 90% | Real API and sockets | Performance source deterministic; no real provider yet |
| Environment/config/identity fidelity | 90% | Isolated settings/real sockets/runtime matrix | Two-node browser binding pending |
| Failure/edge/lifecycle/recovery | 95% | Boundary, terminal, error, interval, A/B/A, reconnect suites | Sustained teardown pending |
| User/browser/desktop confidence | 75% | Component suites/build only | Independent Chrome required |
| Durable regression quality | 95% | Stable requirement-linked API/WS tests | Proportional review pending |

- Overall post-repository confidence: `90.0%` (`630 / 7`).
- Critical acceptance criteria all directly proven at this point: `No — AC-001, AC-006, AC-007 browser, and AC-008 bound-node browser remained.`
- Applicable category below 90%: `Yes — user/browser 75%.`
- Clean 95% target met: `No`.

## Broader Validation Decision

- Decision: `Required`.
- Selected modes: `Browser + Live API + real WebSocket/Lifecycle + supplemental real-provider agent-flow`.
- Gap: host performance, exact 120k equality, live/final DOM, two-node Settings behavior, and external-provider runtime realism.
- Expected confidence: `>=95%` if all critical thresholds pass.
- Browser rationale: changed Electron behavior is web-equivalent; Chrome exercises the relevant production Nuxt/service/render boundary without disrupting the user's desktop app. Electron-only shell execution adds no material evidence.

## Live Environment And Fixture Plan / Outcome

- Deterministic source: 601,000 ms at about 40 content events/s through production AgentRun/default lifecycle/handler/egress and real WS; 120,220 expected characters and SHA-256 exact comparison.
- Browser: production WebSocketClient, AgentStreamingService, live/final text and reasoning renderers, Settings store/card, file/reference/member/panel interactions; Chrome on free loopback Nuxt port.
- Settings: two distinct built server nodes and roots; query/save/rebind/reset with direct file inspection.
- Real providers: value-safe import into isolated test DB; preflight; `deepseek.agent-flow` and `openai.agent-flow`; captured evidence scanner.
- Evidence: structured summaries, logs, live/final screenshots, process/cleanup records under `api-e2e-execution-evidence/`.
- Cleanup: all browser/harness/node/provider processes stopped; temporary page and data roots removed; imported test DB/key removed; user source and ports untouched.

## Temporary Executable Validation

| Scenario | Method | Why Temporary |
| --- | --- | --- |
| PERF-001 / PERF-EXACT-001 / PERF-INTERACT-001 | 601-second Chrome + production-path deterministic harness | Slow and hardware-sensitive; retained as ticket evidence, not CI. |
| BROWSER-RENDER-001 / BROWSER-SET-001 | Temporary Nuxt route, production components/services, two isolated servers | Multi-process evidence fixture is ticket-specific. |

## Not Tested / Residual Scope

| Boundary | Reason | Risk / Follow-up |
| --- | --- | --- |
| Electron preload/IPC/window/package | No shell source changed; browser is the applicable renderer boundary | Negligible; do not claim shell execution. |
| Pending content replay after physical socket loss | Approved no-replay limitation | Preserve limitation; reconnect correctness remains covered. |
| Provider-generated 10-minute 40/s load | Provider output is nondeterministic and costly; unsuitable for exact equality/rate proof | DeepSeek/OpenAI real agent turns supplement, not replace, deterministic proof. |

## Ambiguities Or Reroute Triggers

No requirement/design ambiguity remains. The two live-E2E failures were API/E2E-owned test-infrastructure defects (URL serialization comparison and raw-backend/facade mismatch), corrected with durable unit coverage and successful live reruns. No production implementation source was changed by API/E2E.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed.`
- Repository-resident durable coverage changed: `Yes — five paths updated; none removed.`
- Post-repository confidence: `90.0%`.
- Broader validation: `Required and completed.`
- Reroute before execution: `No after local test-infrastructure corrections.`
- Final routing: successful round must return through `code_reviewer` for proportional review of durable coverage changes.
