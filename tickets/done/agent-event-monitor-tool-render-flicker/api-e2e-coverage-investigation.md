# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker/tickets/in-progress/agent-event-monitor-tool-render-flicker/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker/tickets/in-progress/agent-event-monitor-tool-render-flicker/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker/tickets/in-progress/agent-event-monitor-tool-render-flicker/design-spec.md`
- Supplemental Task Artifacts: None; the ticket's sanitized runtime probes and user screenshots are evidence, not behavior-defining supplements.
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker/tickets/in-progress/agent-event-monitor-tool-render-flicker/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker/tickets/in-progress/agent-event-monitor-tool-render-flicker/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker/tickets/in-progress/agent-event-monitor-tool-render-flicker/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code-review round 3 classified `CR-003` as `Local Fix — API/E2E execution/report problem` after API/E2E round 1 `LIVE-002` lacked deterministic same-thread MCP exposure/readiness evidence.
- Prior Investigation Reviewed: Round 1.
- Latest Authoritative Investigation: Round 2. The reviewed production source remains `710ab2f46f1a1bf559b735a8ef5863faed025777`; packaging remains `c93c84b69d1a60156735ea6763fb977c23d10db5`.

## Current Requirement And Design Basis

The approved correction belongs to the Codex provider adapter. Consecutive completed reasoning snapshots remain one logical reasoning block with a stable stream identity. At the first supported ordered boundary, the adapter must emit exactly one status-neutral generic `SEGMENT_END` before the user/text/first-tool/turn/error output. Matching lifecycle updates for a tool card already created in the turn remain non-boundaries. Missing-turn reasoning must emit adjacent content/end with one identity, and reachable global cleanup must close every active block once in deterministic order.

The normalized end must survive server event-to-WebSocket mapping, mark the unchanged frontend Think presentation complete, and allow the unchanged completed-first latest-100 window to evict visuals ordinarily rather than destructively protecting old Thinking while terminal tools disappear. The same lifecycle must persist one ordered reasoning trace per logical block without duplicate flushes. Existing stored traces remain directly readable with no migration. Standalone and focused-team selection/hydration, GraphQL/WebSocket contracts, latest-100 bounds, storage/archive behavior, and web production behavior must remain unchanged.

Critical acceptance evidence therefore requires both deterministic exhaustive boundary coverage and realistic Codex runtime transport evidence. Producing more than 100 real model-chosen tool invocations would be nondeterministic, slow, and costly, so the long-window condition is proven with a deterministic production-spine fixture from real Codex provider messages through the production converter, server mapper/JSON transport shape, and both web dispatchers. Round-1 standalone streams directly showed non-empty reasoning content -> matching neutral end -> assistant text; round 2 separately proves the exact same standalone thread's configured MCP exposure/readiness and active/inactive tool routing. A fresh real Codex focused-team model run proves the combined reasoning/tool lifecycle in the installed environment.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / active standalone and focused-team selection | Preserved | `REQ-004`, `REQ-007`; `AC-002`; `DS-001`, `DS-004` | Re-run selection, hydration, team-context reuse, and live standalone/team transport coverage; do not add selection repair assertions. |
| `BEH-002` / latest-100 completion-aware window | Preserved with corrected input lifecycle | `REQ-001`-`REQ-004`; `AC-001`; implementation handoff | Prove >100 interleaved reasoning/tool visuals through both production dispatchers using converter-produced neutral ends and assert newest terminal tools remain. |
| `BEH-003` / Codex reasoning lifecycle and transport ordering | Changed | `REQ-001`-`REQ-003`; `AC-003`, `AC-004`; `DS-002` | Re-run full boundary/preserve matrix; add temporary cross-project production-spine execution to close the mapper/dispatcher mock gap. |
| `BEH-004` / missing-turn and global cleanup | Changed | `REQ-002`, `REQ-005`; `AC-004` | Re-run adjacent missing-turn, deterministic all-close, repeated-cleanup, and downstream status/error-observer checks. |
| `BEH-005` / runtime memory and history projection | Preserved with earlier normalized flush | `REQ-006`, `REQ-007`; `AC-005`, `AC-006`; `DS-003` | Re-run converter-to-accumulator, live memory, projection, GraphQL, latest-page, and archive coverage; prove no migration/fallback. |
| Defensive 128-turn capacity guard | Preserved and excluded from supported acceptance scope | `MP-CAP-001` = `Not Reachable` | Verify source/test baseline remains unchanged; do not invent live closure behavior for this synthetic branch. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Codex tracker/normalizer/converter lifecycle actions and event ordering | 54 converter tests, 7 tracker tests, parser and downstream error observer | External Codex message cadence and real runtime composition | Live Codex lifecycle E2E |
| API / transport / contract | Indirectly | Existing `AgentRunEventMessageMapper`, agent/team WebSocket envelope, and GraphQL projections consume new end timing | Mapper unit, agent/team WebSocket integration, run-history GraphQL E2E | One execution that carries converter-produced events into actual client dispatch | Temporary in-process production-spine probe plus real WebSocket E2E |
| Frontend component / state | No production source change | Existing generic segment handler and recent-window state receive valid completion | Segment handler and production-dispatch tests | Cross-repository identity/order handoff | Temporary production-spine probe |
| Browser integration / user journey | Preserved | Existing context selection/hydration/rendering | Store/service/hydration tests; investigation browser repro | No changed browser API, DOM, style, input, storage, or routing behavior | Browser not selected; deterministic state and real transport are more direct |
| Authentication / session / permissions | No production change; material validation boundary | Exact standalone Agent Tools MCP descriptor, bearer-authenticated registry session, enabled-tool list, and App Server status/catalog | Existing registry/route tests plus round-2 live harness | Same sender-thread ownership/readiness and ordering were not proven in round 1 | Exact-thread live MCP/App Server probe |
| Desktop renderer / web-equivalent UI | No production renderer change | Existing Event Monitor consumes unchanged generic messages | Nuxt production-dispatch/state tests | No shell/renderer-specific changed boundary | None |
| Desktop shell / Electron-specific integration | No | None | No shell code changed | None material | None |
| Process / lifecycle | Yes | Real Codex app-server process -> backend -> stream; turn/error cleanup | Live Codex E2E suites exist behind `RUN_CODEX_E2E=1` | Environment/model availability and actual event cadence | Real Codex standalone/team lifecycle E2E |
| Persisted-data transition | Yes, semantic timing only | New end may flush current reasoning earlier; schema/readers unchanged | Accumulator coverage and live memory E2E | Representative installed Codex data/read path | Live memory E2E and unchanged projection/API suites |
| Worker / queue / distributed coordination | No | Recorder sequencing is in-process and already awaited | Accumulator/live memory coverage | None | None |
| External integration | Yes | Installed `codex app-server` process/model | Env-gated live Codex E2E | Provider output cannot deterministically generate 100 tools | Real small live journeys plus deterministic long fixture |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker`
- Project type and runtime stack: pnpm monorepo; Node.js/TypeScript Fastify + GraphQL + WebSocket server; Nuxt/Vue/Pinia web/Electron renderer; Vitest; real Codex app-server integration.
- Conflicting, missing, or unclear project instructions: No conflict. Server full `typecheck` is structurally baseline-blocked (`rootDir` versus included tests); web full Nuxt typecheck has unrelated baseline diagnostics. Source build and focused/executable suites are the approved signals. Web instructions require `--run`; server instructions require `vitest run --no-watch`.
- Required environment variables or secrets available: `Yes` for the locally authenticated Codex CLI, subject to live readiness confirmation; no secret value will be captured.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test authority | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration suites can be targeted by path. |
| `autobyteus-server-ts/README.md` | Server development/live E2E authority | Codex live-runtime E2E is enabled by `RUN_CODEX_E2E=1`; suites isolate app data in per-suite temp directories; cleanup is suite-owned. |
| `autobyteus-server-ts/package.json` | Authoritative scripts | `build` prepares shared packages, Prisma, source build, assets, and bootstrap smoke. |
| `autobyteus-web/AGENTS.md` | Web test/release authority | Use `pnpm test:nuxt ... --run`; never use watch mode; do not use broad git staging. |
| `autobyteus-web/README.md` | Browser/server architecture and test guidance | Browser mode is preferred for changed web-equivalent behavior, but no web production source changed here. Nuxt proxy/WebSocket endpoints are controlled by backend base URL. |
| `autobyteus-web/package.json` | Web scripts | Guards, Nuxt tests, and production generation are separately executable. |
| `implementation-handoff.md` and `code-review-report.md` | Reviewed package execution constraints | Preserve unchanged selection/UI/GraphQL/storage boundaries; no push/delivery/finalization; known repository-wide typecheck limitations must not be misreported as clean. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository Vitest | worktree root | Targeted `pnpm -C ... exec vitest run ...` | Uses repo dependencies and server test SQLite under `tests/.tmp` | Vitest discovers intended files and reports non-skipped executed tests | Process exits; suite-owned temp DB reset |
| Real Codex app-server | Spawned inside server live E2E | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run <live spec> --no-watch` | Uses authenticated local `codex`; suite uses temp app data/workspace and dynamic Fastify ports | `codex --version`, model catalog, startup-ready, actual stream assertions | Suite closes client manager/Fastify/WebSockets and deletes temp directories |
| Temporary production-spine probe | Nuxt Vitest | One disposable spec importing server converter/mapper and web production dispatchers | No network or persistent data; JSON round-trip emulates serialized transport exactly | >100 deterministic assertions pass for standalone and focused team member | Delete disposable spec after retaining output/summary evidence |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Long interleaved Codex reasoning/tool stream | Deterministic provider-message fixture through `CodexThreadEventConverter` | Synthetic provider notifications, but production converter/mapper/dispatch code; no user data | Probe file removed; summarized JSON and command log retained under ticket evidence |
| Live standalone Codex run | Existing env-gated suite | Per-suite temp memory/workspace and dynamic process | Suite cleanup; retain sanitized test output only |
| Live focused-team Codex run | Existing env-gated team suite | Temporary definitions/run/app data and dynamic Fastify/WebSocket port | Suite terminates runs, removes definitions/workspaces/temp app data, closes sockets/process manager |
| Representative existing history | Existing run-history and projection fixtures plus prior read-only sanitized trace evidence | No mutation of installed `/Users/normy/.autobyteus` history | Fixture temp directories removed; prior sanitized evidence retained |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` Persisted Data / State Transition Decision; `implementation-handoff.md` Persisted Data Transition Check.
- Representative existing-data setup and required behavior: unchanged raw JSONL trace records, manifests, and snapshots must project normally; future grouped reasoning must be written once in stable tool/reasoning order after the new normalized end.
- Evidence planned: converter-to-accumulator focused coverage, real Codex live-memory E2E, run-history projection/GraphQL suites, latest-page/archive coverage, and prior read-only projection evidence.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-reasoning-block-converter.test.ts` | Grouping, full boundary/preserve matrix, neutral end ordering, missing turn, global cleanup | `REQ-001`-`REQ-005`; `AC-003`, `AC-004`; `DS-002` | Still Valid | Assertions match approved explicit lifecycle and source review passed | Re-run all scenarios |
| `.../codex-reasoning-block-tracker.test.ts` | Typed actions, stable IDs, idempotent per-turn/all-close, missing-turn behavior, unchanged defensive capacity | `REQ-001`, `REQ-002`, `REQ-005` | Still Valid | Direct tracker owner coverage | Re-run |
| `.../codex-thread-event-converter.test.ts`, ordered-tool/parser tests | Existing Codex item/tool/turn/thread conversion contracts | `REQ-003`, `REQ-007`; `AC-004`, `AC-006` | Still Valid | Broad regression matrix; no obsolete assertion identified | Re-run focused set |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | Converter-owned closure persists once, ordering and archive/rotation semantics | `REQ-006`; `AC-005`, `AC-006`; `DS-003` | Still Valid | Uses actual converter output and real memory store | Re-run |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-termination-service.test.ts` | Neutral reasoning end cannot mask following error detail | `REQ-003`, `REQ-005`; `CR-001` | Still Valid | Downstream status observer regression | Re-run |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Generic and team message payload mapping | `REQ-007`; `DS-001` | Still Valid | Existing contract is intentionally preserved | Re-run |
| `autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts` | Real Fastify/WebSocket standalone routing | `REQ-007`; `AC-002`, `AC-006` | Still Valid | Actual transport without external model | Re-run |
| `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` | Real Fastify/WebSocket team routing and identity envelopes | `REQ-007`; `AC-002`, `AC-006` | Still Valid | `TEST-FIX-001` updated only the stale fake to the current address seam; fresh 9/9 pass | Retain updated fixture |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Real Codex app-server events persist into raw traces/snapshot | `REQ-006`; `AC-005` | Still Valid | Real provider/process and memory boundary | Run with `RUN_CODEX_E2E=1` |
| `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Real standalone Codex, GraphQL launch, same-thread MCP readiness/catalog/call, target WebSocket delivery | `REQ-003`, `REQ-007`; `AC-002`, `AC-004`, `AC-006`; `MP-LIVE-002` | Needs Update, then Still Valid | `CR-003` required redacted descriptor/config, authenticated session `tools/list`, exact App Server startup status/order, and deterministic same-thread execution rather than inference from model refusal | Apply `TEST-FIX-003`, then rerun targeted scenario and affected live set |
| `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Real Codex team/member stream, tool/reasoning/lifecycle, memory, projection | `REQ-003`, `REQ-006`, `REQ-007`; `AC-002`, `AC-005`, `AC-006` | Still Valid | Real team GraphQL/WebSocket/runtime | Run targeted focused-team scenario |
| `autobyteus-server-ts/tests/e2e/run-history/*.e2e.test.ts` and workspace archive E2E | Projection shape/tool content/recent bounds/archive | `REQ-006`, `REQ-007`; `AC-006` | Still Valid | Unchanged API/storage contract regression | Run focused E2E |
| `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts` | Current metadata/layout and standalone/team projection across runtimes | `REQ-006`, `REQ-007`; `AC-006` | Still Valid | `TEST-FIX-002` corrected only obsolete archived-row expectations; fresh 13/13 pass keeps archive presence and active-only projection proof | Retain updated assertions |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Generic end completes non-empty Think by identity | `REQ-001`, `REQ-007`; `AC-001`, `AC-003` | Still Valid | Provider-neutral production handler | Re-run |
| `autobyteus-web/services/agentStreaming/__tests__/recentEventMonitorProductionDispatch.spec.ts` | Standalone/team >100 live dispatch remains bounded; generic reasoning ends retain terminal tools | `AC-001`, `AC-002`, `AC-006`; `DS-001` | Still Valid | Production dispatch/window paths; current fixture starts after transport | Re-run and augment only with temporary cross-spine probe |
| Web streaming, selection, team-context, and hydration suites | Context reuse, routing, projection hydration, stream dispatch | `REQ-004`, `REQ-007`; `AC-002`, `AC-006`; `DS-004` | Still Valid | Preserved source boundary | Re-run focused expanded set |

## Stale Or Obsolete Coverage Decisions

None. No current test asserts silent reasoning abandonment, per-snapshot completion, Codex-specific frontend repair, larger history windows, or persisted migration behavior.

## Durable Coverage To Add

None planned. The reviewed implementation already added requirement-linked owner-level durable regressions. The remaining confidence gap is cross-project production-spine execution and real external-runtime evidence, best addressed by a disposable deterministic probe plus existing real Codex E2E rather than a permanent cross-package test dependency or nondeterministic 100-tool model prompt.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `TEST-FIX-001` | `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` / two SEND_MESSAGE scenarios | Replace the stale fake run `postMessage` seam with the current `postMessageToConversationTarget(message, address)` seam and resolve the terminal member address for existing assertions | Preserved current WebSocket/structured target contract under `REQ-007`, `AC-002`, `AC-006` | Test-only local fix; production file is outside the ticket diff and the failing mock error is `TypeError: teamRun.postMessageToConversationTarget is not a function` |
| `TEST-FIX-002` | `autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts` / three runtime-parametrized standalone projection scenarios | Replace archived-conversation summary/rows expectations with the approved active-trace-only projection result while continuing to assert archive bytes remain present and excluded | Preserved active-only source/archive-exclusion contract under `REQ-007`, `AC-006`; investigation constraint explicitly preserves active-only source and archive exclusion | Fresh run passed 10/13; all three failures expected archived user content in the default projection, contradicting the current active-only contract |
| `TEST-FIX-003` | `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` / `LIVE-002` | Observe the exact sender App Server client before thread creation; assert the redacted materialized config enables `send_message_to`; authenticate the same registry session and call `tools/list`; await the exact thread's `autobyteus_agent_tools` terminal startup status; query thread-scoped App Server MCP status/catalog; log only redacted evidence and ordering. Invoke the configured operation deterministically with the same thread's public App Server `mcpServer/tool/call`, then assert active delivery on the real target WebSocket and exact inactive-target rejection. | `CR-003`; reachable `MP-LIVE-002`; `REQ-001`-`REQ-004`, `REQ-007`; `AC-002`-`AC-004`, `AC-006` | Instrumentation proved config/session/catalog/ready before every invocation. Provider-qualified model prompting passed once and refused once with the same ready state, confirming model tool choice is not a valid deterministic hard assertion. The final same-thread App Server call path passed in 1.9 s without a sleep or product-source change; real model-driven lifecycle remains separately covered by `LIVE-003`. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused server 7-file Vitest command | Worktree root; server `--no-watch` | All changed server owner/boundary/persistence/error scenarios; 7 files / 147 tests | Pass | `evidence/api-e2e/repository-server-focused-20260722.log` |
| 2 | Focused web 3-file Nuxt Vitest command | Worktree root; `--run` | Generic end, >100 standalone/team dispatch, recent-window policy; 3 files / 34 tests | Pass | `evidence/api-e2e/repository-web-focused-20260722.log` |
| 3 | Mapper + agent/team WebSocket integration suites | Worktree root; server `--no-watch` | Mapper and standalone WebSocket passed; team suite initially failed 2/9 because its fake lacked current `postMessageToConversationTarget`, then passed 9/9 after `TEST-FIX-001` | Pass after valid test fix | `evidence/api-e2e/repository-transport-integration-20260722.log`; `repository-team-websocket-test-fix-20260722.log` |
| 4 | Run-history recent/tool projection, archive GraphQL, and projection integration suites | Worktree root; server `--no-watch` | Four files / 16 API/integration tests passed initially; memory-layout passed 10/13 then 13/13 after obsolete archived-row assertions were corrected by `TEST-FIX-002` | Pass after valid test fix | `evidence/api-e2e/repository-history-api-20260722.log`; `repository-memory-layout-test-fix-20260722.log` |
| 5 | Expanded web streaming/selection/hydration suites | Worktree root; Nuxt `--run` | Standalone/team context selection, hydration, active browse, unchanged production behavior; 11 files / 92 tests | Pass | `evidence/api-e2e/repository-web-selection-hydration-20260722.log` |
| 6 | Server build; web guards/audit and production generate | Worktree root | Server source/bootstrap; Nuxt production generation; boundary/localization guards and literal audit | Pass | `evidence/api-e2e/repository-build-guards-20260722.log` |
| 7 | Re-run both API/E2E-owned durable test fixes and `git diff --check` | Worktree root; server `--no-watch` | Current team-address fake, active-only archive exclusion expectations, diff hygiene; 2 files / 22 tests | Pass | `evidence/api-e2e/durable-test-fixes-final-20260722.log` |
| 8 | Re-run all nine affected repository files plus the gated live file without `RUN_CODEX_E2E`, then `git diff --check` | Worktree root; server `--no-watch` | Reviewed source-owner lifecycle matrix, both stale-fixture corrections, final same-thread live harness syntax/import integrity, and diff hygiene; 169 passed, 1 correctly environment-skipped | Pass | `evidence/api-e2e/affected-repository-round2-20260722.log` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Direct boundary matrix, >100 standalone/team production dispatch, accumulator, GraphQL/latest/archive, selection/hydration, and build checks passed | Repository tests do not start a real Codex process | Selected live execution |
| Changed-boundary execution directness | 95% | Real `CodexThreadEventConverter` and tracker are exercised across all supported boundary/preserve paths and directly into the accumulator | Server and client spines remain separate in durable tests | Temporary production-spine probe |
| Cross-boundary integration realism and mock gap | 90% | Mapper, agent/team Fastify WebSockets, GraphQL projections, and web production dispatch all passed | No one durable test crosses converter -> mapper -> JSON -> web dispatcher | Temporary production-spine probe and live WebSocket E2E |
| Environment, configuration, identity, and fixture fidelity | 90% | Real SQLite/Prisma, memory stores, GraphQL schema, Fastify sockets, and production generation were exercised | External Codex model/tool exposure not yet exercised | Real standalone/team Codex runs |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Missing turn, matching updates, result-first, turn start/complete/error, global cleanup, duplicate cleanup, active-only/archive, invalid targets and socket recovery all passed | External provider cadence remains nondeterministic | Real live runs |
| User-surface, browser, and desktop-shell confidence | 92% | 126 focused web tests cover production dispatch, selection, focused-member resolution, hydration, browsing and windowing; no renderer/shell source changed | No actual browser/Electron launch | Not selected because it bypasses the changed server adapter; real stream execution is more direct |
| Durable regression coverage quality and relevance | 95% | Owner-level reviewed tests are specific and exhaustive; two stale expanded fixtures were corrected to current contracts, and the bounded live harness now proves exact-thread MCP readiness and execution deterministically | Cross-package spine is intentionally temporary | Proportional test-code review of all three updated files |

- Overall post-repository confidence: `93%` (652 / 7, rounded).
- Calculation method: Simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: `No` — real external standalone/team execution remained outstanding at this point.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: external Codex tool exposure and true converter-to-client composition required broader execution; browser/Electron execution would not close that backend risk.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Lifecycle` + `Live API` + temporary cross-project production-spine probe.
- Specific confidence gap or residual risk addressed: converter-produced ordering/identity across mapper/serialized contract/web dispatch; actual installed Codex app-server standalone/team operation; future raw-trace use.
- Why the selected mode can materially improve confidence: It exercises the real changed provider adapter and external process, actual GraphQL/WebSocket runtime startup paths, and both production client dispatch modes. A deterministic fixture supplies the long-window volume that model-driven execution cannot guarantee.
- Expected confidence after the selected validation: At least 95% overall with no category below 90%, if all critical scenarios pass.
- Browser-specific decision and rationale: Browser validation is not selected. No Vue/component/DOM/style/input/browser API or Electron source changed, and browser-only injection would bypass the changed Codex converter. Production client state dispatch plus real server transport is more direct for this lifecycle defect. The preserved selection/hydration state behavior is exercised by focused Nuxt suites.
- If `Not Required`: N/A.
- If `Blocked`: N/A.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the same Nuxt client.
- Relevant README or development instructions: `autobyteus-web/README.md`, `autobyteus-web/AGENTS.md`.
- Web-equivalent behavior: Generic stream dispatch, selection/hydration, recent-window state.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach and why it fits the project: Nuxt production state suites and real server WebSocket/runtime E2E; no actual Electron launch.
- Server/frontend setup when browser validation is used: N/A.
- Effect on any already-running desktop application: None; no installed app/server process will be stopped or mutated.
- Behavior not directly proven and confidence consequence: Shell window/process packaging is not directly exercised and is immaterial to the changed server lifecycle; no confidence deduction beyond negligible production bundling uncertainty if generate passes.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: confirm `codex --version`; run disposable production-spine Vitest probe; then run real live memory, standalone WebSocket, and focused-team WebSocket specs individually with `RUN_CODEX_E2E=1`.
- Environment choices that materially affect the run: repository source worktree; suite-created temp app data/workspaces; model selected by existing suite catalog logic; dynamic localhost ports; no installed AutoByteus server mutation.
- Health / readiness checks: Codex version command, model catalog success, app-server startup-ready, GraphQL launch success, WebSocket open/connected, expected lifecycle messages.
- Seed data / fixtures: deterministic provider notifications for 110 reasoning/tool cycles; live suites create minimal temporary agents/team definitions and unique tokens.
- Test identities, authentication, permissions, or session state: locally authenticated Codex CLI; team fixture uses its existing isolated approval-policy setup and exact tool instructions.
- Requirement-linked journeys or scenarios: `SPINE-001` deterministic standalone; `SPINE-002` deterministic focused-team member; `LIVE-001` real standalone memory; `LIVE-002` real standalone GraphQL/WebSocket/tool lifecycle; `LIVE-003` real focused-team GraphQL/WebSocket reasoning/tool lifecycle.
- Evidence to capture: exact command logs, summarized event counts/order/identity and retained-window JSON, live suite console output, cleanup results.
- Owned processes and temporary state to clean up: disposable probe file, Codex clients, dynamic Fastify/WebSocket servers, suite temp app data/workspaces/definitions/runs.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `SPINE-001` | Temporary Nuxt Vitest spec imports production `CodexThreadEventConverter`, `AgentRunEventMessageMapper`, JSON round-trip, standalone `AgentStreamingService` dispatch | 110 interleaved grouped reasoning/tool cycles; exactly one neutral end before each first tool; stable identity; matching updates preserve; latest 100 retains 50 closed Thinkings and 50 terminal tools including newest | A permanent web test importing server internals would violate package ownership and duplicate already-durable owner-level tests |
| `SPINE-002` | Same fixture through production team event mapper and focused-team `dispatchGenericTeamMemberMessage` | Same lifecycle/window guarantees with team member identity envelope intact | Same cross-package dependency concern; retained evidence is sufficient execution proof |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real model autonomously emits >100 tool calls in one validation turn | Model behavior is nondeterministic, costly, and not a safe durable assertion | Low after deterministic production-spine >100 plus real smaller live runs | None unless deterministic spine or real runtime fails |
| Defensive 128 simultaneous-turn capacity path | Approved `MP-CAP-001` is not product-reachable | None for supported lifecycle | Do not expand scope absent new reachability evidence |
| Exact historical 3-10 second repair trigger | Approved `MP-RESTORE-001` remains unclear and irrelevant to first-fault correction | Bounded observational uncertainty only | Do not add timer/repair behavior |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `LIVE-002` round-1 inference from raw-alias model refusal | `Resolved — Local Fix / API/E2E` | `live-codex-standalone-websocket-round2-20260722.log` and the qualified-prompt attempts prove the same thread was fully ready despite nondeterministic model choice. `live-codex-standalone-websocket-round2-deterministic-20260722.log` directly proves redacted config, authenticated session `tools/list`, exact ready ordering, App Server status/catalog, active delivery, target WebSocket event, and exact inactive-target rejection through `mcpServer/tool/call`. The affected-set rerun passed 169 tests with one correctly gated live skip and clean diff hygiene. | `code_reviewer` for proportional review of the three API/E2E-owned durable test changes after the round-2 execution report records `Pass`. |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — `TEST-FIX-001`, `TEST-FIX-002`, and bounded live-harness `TEST-FIX-003`; no production source change.
- Post-repository confidence: `93%` from round 1 remains the repository-only baseline; round-2 live reruns determine the final score.
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A.
- Notes: `CR-003` is addressed without an arbitrary delay. Same-thread readiness and both server-side catalogs are directly proven. Because the external model accepted the provider-qualified instruction once and refused it once under the same ready state, `LIVE-002` now uses the public same-thread App Server MCP call API as its deterministic execution surface; `LIVE-003` remains the real model-driven tool-lifecycle check. Preserve all upstream uncommitted package/evidence and the delivery hold.
