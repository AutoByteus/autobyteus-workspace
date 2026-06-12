# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/code-review-report.md`
- Current Investigation Round: 2
- Trigger: User requested higher-confidence real E2E coverage after Round 1 API/E2E pass, specifically asking to create and run a real E2E test if no such test existed.
- Prior Investigation Reviewed: Round 1 in this same file; Round 1 passed with reviewed durable tests plus a temporary runtime-boundary probe but explicitly did not add a live standalone GraphQL/WebSocket Codex E2E.
- Latest Authoritative Investigation: Round 2, this file.

## Current Requirement And Design Basis

The current approved behavior is selector-first `send_message_to` routing:

- `recipient_name` remains a team-local roster selector requiring `MemberTeamContext`; it continues through team delivery and creates Team Communication projection after accepted input.
- `target_agent_run_id` means exact canonical `AgentRun.runId` and is a global live direct route. It must resolve only through `AgentRunManager.getActiveRun(targetRunId)` and fail closed for unknown, inactive, preallocated-only, lazy-startable-only, terminated, or recoverable-only ids.
- Global direct delivery posts a model-visible target input and emits an `INTER_AGENT_MESSAGE` event on the target run without `team_run_id` or Team Communication projection fields.
- Standalone configured AutoByteus, Codex, and Claude runs expose `send_message_to` when the agent definition includes the tool.
- Optional `DirectAgentRunMessageGrant` narrows server-helper sends but is not target discovery, resurrection, or routing.
- Skill Self-Evolver must have `send_message_to`, pass the target run id into the helper prompt, require the target live at start, record sent/rejected/inactive/not-attempted outcomes truthfully, and avoid duplicate generic success notification after a helper-authored outcome.
- No backward-compatibility wrapper, address directory, `AgentTeamRunManager` claim scan, task-agent recovery, metadata lookup, lazy start, or local run-id generator is allowed in the public `target_agent_run_id` route.

The implementation handoff's `Legacy / Compatibility Removal Check` was clean: no backward-compatibility mechanisms introduced, no legacy old-behavior retained in scope, obsolete shared team-owned paths removed, no `GlobalAgentRunAddressDirectory`/team-claim router implemented, and no duplicate self-evolution success notification retained after successful direct outcome.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Shared `send_message_to` parser/contract/reference validation under `agent-communication` | Changed | REQ-001, REQ-002, REQ-014; design migration steps 2-3 | Existing parser tests remain valid but import path/selector expectations need current validation. |
| `target_agent_run_id` public routing uses global active direct route | Changed | REQ-004 through REQ-010; AC-003, AC-007 through AC-010 | Durable route coverage must prove active delivery, inactive failure, direct event shape, no Team Communication projection, and no forbidden team recovery/lazy lookup. |
| `recipient_name` team route and projection | Preserved | REQ-003, REQ-011; AC-002, AC-011 | Existing team route coverage remains relevant and must be retained/executed. |
| Standalone AutoByteus/Codex/Claude configured exposure | Added | REQ-012, REQ-013; AC-004 through AC-006 | Runtime adapter/factory/bootstrap coverage must prove exposure and dispatcher delivery path; Round 2 adds live Codex GraphQL/WebSocket E2E for this boundary. |
| Direct message grants | Added | REQ-015, REQ-016; AC-012, AC-013 | Durable router/self-evolution coverage must prove target/message/reference/exhaustion/target-inactive enforcement and usage recording. |
| Skill Self-Evolver helper-authored outcome | Changed | REQ-017 through REQ-022; AC-012 through AC-018 | Self-evolution coverage must prove live start check, prompt metadata, sent/not-attempted/failed summaries, and no duplicate generic success notification. |
| Prior address-directory/team-claim/lazy/recoverable exact-run design | Removed | Requirements status, design Legacy Removal Policy, design review Round 2 | Static inspection must confirm no such production route was retained; tests must not preserve old public exact-run behavior. |
| Production run-id creation | Preserved | REQ-023, AC-019 | Build/static inspection must confirm no new local id generator in changed scope. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts` | Canonical selectors, exactly-one validation, alias rejection, content/reference validation under new shared parser imports. | REQ-001, REQ-002, REQ-014; AC-001 | Still Valid | Test imports `src/agent-communication/services/send-message-to-tool-argument-parser.js` and asserts snake_case exact-run selector plus alias rejection. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/unit/agent-tools/team-communication/send-message-to.test.ts` | AutoByteus server-owned tool dispatches `recipient_name` through team context, `target_agent_run_id` through global router without team context, and rejects standalone `recipient_name`. | REQ-003, REQ-005, REQ-011, REQ-012, REQ-013; AC-002, AC-004, AC-011 | Still Valid | Test path name is historical, but assertions cover current `agent-communication` wrapper and dispatcher split. | Execute in focused durable suite and Round 2 regression. |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Active standalone/team-member direct delivery, target-not-active rejection for unknown/preallocated/recoverable-only ids, no event on rejected target input, grant enforcement/usage, target inactive before helper send. | REQ-006 through REQ-010, REQ-015, REQ-016; AC-003, AC-007 through AC-010, AC-012, AC-013, AC-017 | Still Valid | Durable test directly exercises router with `AgentRunManager.getActiveRun` dependency only and direct event payload without `team_run_id`. | Execute in focused durable suite and Round 2 regression. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Configured AutoByteus factory exposes `send_message_to`, warns when only exact-run route is available, and routes team delivery via server-owned dispatcher. | REQ-012, REQ-013; AC-004, AC-011 | Still Valid | Updated tests cover configured exposure and exact-run guidance; delivery is complemented by tool wrapper/router tests and temporary runtime probe. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Standalone Codex bootstrap exposes `send_message_to` as a dynamic tool when configured. | REQ-012, REQ-013; AC-005 | Still Valid | Updated tests assert standalone dynamic tool specs include `send_message_to`, including alongside browser tools. | Execute in focused durable suite and Round 2 regression. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Team-member Codex bootstrap uses runtime-local team context and also exposes exact-run-only send-message guidance when no static recipients are available. | REQ-003, REQ-012, REQ-013; AC-002, AC-005 | Still Valid | Assertions cover current exact-run-only contexts; historical path name does not make behavior stale. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts` | Codex dynamic tool schema exposes canonical fields and reference guidance. | REQ-001, REQ-002, REQ-012; AC-005 | Still Valid | Updated import points at `backends/codex/agent-communication`; schema rejects additional properties and uses snake_case fields. | Execute in focused durable suite and Round 2 regression. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts` | Claude handler validates arguments, emits lifecycle events, and dispatches through `SendMessageToDispatcher` with sender context. | REQ-001, REQ-002, REQ-012, REQ-013; AC-006 | Still Valid | Updated import points at `backends/claude/agent-communication`; assertions cover dispatch and validation failure before delivery. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts` | Claude tool schema exposes content/reference and selector fields. | REQ-001, REQ-002, REQ-012; AC-006 | Still Valid | Updated import points at `backends/claude/agent-communication`; schema validates current contract. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` and `tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts` | Claude session/MCP gating exposes send-message tooling in exact-run-only/team contexts when configured. | REQ-012, REQ-013; AC-006 | Still Valid | Focused code-review suite includes both; builder test proves MCP server can contain send-message without static recipients. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` | Runtime instructions describe exactly-one selector, active exact-run guidance, team recipient route, and no use when not exposed. | REQ-001, REQ-003, REQ-004, REQ-011, REQ-012 | Still Valid | Assertions updated for exact currently active `AgentRun` wording and standalone recipient warning. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts` | Team projection only derives from `INTER_AGENT_MESSAGE` events with `team_run_id`; legacy/direct events without required team metadata are ignored. | REQ-010, REQ-011; AC-002, AC-007, AC-008 | Still Valid | Processor now explicitly continues when `team_run_id`/`teamRunId` is absent. | Execute separately and in Round 2 regression. |
| `autobyteus-server-ts/tests/self-evolution/single-agent-evolver-strategy.test.ts` | Helper launch uses `send_message_to`, target id/message type metadata, editable roots, and records not-attempted when helper does not call tool. | REQ-017, REQ-018, REQ-020, REQ-021; AC-016, AC-018 | Still Valid | Assertions cover exact target id in prompt, hidden source ids, grant target roots, and not-attempted summary. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | Self-evolution record provenance and stale target live-check behavior. | REQ-019, REQ-021; AC-014, AC-015, AC-016 | Still Valid | Integration test stubs `agentRunManager.getActiveRun` active/null and rejects stale target before helper launch. | Execute in focused durable suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-record-lifecycle.test.ts` | Helper-authored direct outcome summary suppresses duplicate generic notification. | REQ-021, REQ-022; AC-015 | Still Valid | Durable test asserts `notificationService.notify` is not called after `send_message_sent`. | Execute in focused durable suite. |
| Existing runtime E2E files: `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts`, `codex-team-inter-agent-roundtrip.e2e.test.ts`, `claude-team-inter-agent-roundtrip.e2e.test.ts`, `mixed-team-runtime-graphql.e2e.test.ts`, `nested-mixed-team-runtime-graphql.e2e.test.ts` | Live team `recipient_name` route, Team Communication projection, runtime lifecycle/memory traces for real runtime teams. | REQ-003, REQ-011; AC-002 | Still Valid | These use `recipient_name` and remain correct for team semantic route; they are heavy external-runtime E2E and not required to change for global direct route. | Inventory as valid retained E2E; do not update in this pass. |
| Existing runtime E2E harness patterns in `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` and helper files | Creates standalone runs through GraphQL, opens standalone agent WebSockets, posts user messages, observes runtime lifecycle events for real runtime suites. | Runtime API/E2E harness for AC-005 and related runtime acceptance criteria. | Still Valid | Existing harness is skipped unless runtime-specific env flags are set; it proves other standalone runtime tool paths and provides patterns for a focused new E2E. | Reuse patterns in the new E2E rather than modifying the large shared file. |
| Existing internal team/task-agent exact-run tests | Task-agent packet/review protocols and internal team exact target ids. | Out of scope for public `send_message_to(target_agent_run_id)`; task tools remain their own channel. | Out Of Scope | Requirements explicitly do not redesign task-delegation lifecycle semantics. Internal team resolver can still support team-owned recovery separate from public dispatcher. | Do not remove or broaden under this ticket. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No existing repository-resident coverage inspected in this stage asserts that the public `send_message_to(target_agent_run_id)` route may lazy-start or recover an inactive target. | Requirements/design require active-only direct route and implementation tests were already updated before code review. | N/A | No removal needed. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-001 | A real standalone Codex sender agent configured with `send_message_to` calls the tool over the standalone GraphQL/WebSocket runtime and delivers to an active standalone target run id; after the target is terminated, the same public exact-run route fails active-only. | REQ-004 through REQ-010, REQ-012, REQ-013; AC-005, AC-007, AC-011, AC-020; code review residual risk: actual configured standalone runtime still needs API/E2E validation. | `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Existing coverage proves unit/handler boundaries; this durable E2E proves the live Codex standalone GraphQL/WebSocket path with real model-driven tool invocation, active target delivery, direct event payload, no Team Communication projection, and inactive target failure. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No existing durable coverage update is planned. | Current tests already updated for live-only semantics and passed code review. | Round 2 adds a new focused E2E instead of modifying existing broad runtime E2E. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage identified for removal. | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Round 1 temporary Vitest probe under `autobyteus-server-ts/tests/.tmp/` using actual AutoByteus bound tool, Codex dynamic registration handler, Claude handler, singleton dispatcher/router, and a spied `AgentRunManager.getActiveRun` returning a mocked active target run. | Standalone runtime tool surfaces can invoke the global route to an active exact run id; posted input/direct events are produced; inactive exact ids fail with `TARGET_AGENT_RUN_NOT_ACTIVE`; direct event without `team_run_id` does not project Team Communication. | Already executed and removed in Round 1. Round 2 adds durable live Codex E2E instead of a temporary probe. |
| TEMP-002 | Static no-forbidden-route scan with `rg` across `src/agent-communication`, `src/agent-tools/agent-communication`, and provider `agent-communication` adapters for `AgentTeamRunManager`, recovery/lazy/metadata/team-claim routing, old path wrappers, and direct event `team_run_id`. | No public direct route compatibility/recovery/lazy path or Team Communication projection field was retained. | Static command evidence belongs in execution report, not repository code. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live LLM-driven standalone AutoByteus and Claude agents invoking `send_message_to` through GraphQL/WebSocket with real model/tool decisions | Round 2 adds live Codex E2E because Codex is the most relevant configured standalone boundary for this change and shares the dispatcher/router with other adapters. AutoByteus and Claude deterministic exposure/handler paths are already covered by durable tests and Round 1 runtime-boundary probe. | Low residual adapter-specific risk for live AutoByteus/Claude process invocation after handler-level coverage. | No escalation required for this ticket; future provider-specific live E2E can be added if product requires it. |
| Actual recoverable task-agent restoration attempt through public `send_message_to(target_agent_run_id)` | The public dispatcher direct route does not call team recovery owners. Router test and static forbidden-dependency scan prove the route cannot reach recovery caches. | Low; static/durable coverage proves the integration boundary. | None unless future code reintroduces team manager dependency into global router. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity, compatibility wrapper, legacy branch, or implementation local-fix trigger identified during coverage investigation. | N/A |

## Execution Plan

1. Add focused durable E2E file `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`.
2. Run the new E2E with `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts --reporter verbose`.
3. Re-run `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
4. Re-run relevant focused durable route/handler regression tests after the E2E:
   - `tests/unit/agent-communication/global-agent-run-message-router.test.ts`
   - `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
   - `tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts`
   - `tests/unit/agent-tools/team-communication/send-message-to.test.ts`
   - `tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts`
5. Run `git diff --check` after coverage edits.
6. Update the execution coverage report to Round 2.
7. Because repository-resident durable coverage is added after initial code review, route cumulative package to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: This round intentionally increases confidence with one narrow live Codex standalone E2E, then returns through code review as required for post-review durable coverage changes.
