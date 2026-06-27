# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review Round 2 PASS requested API/E2E investigation and execution for conversation target addressing; amended after user requested a live full-stack browser proof.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed and approved behavior is a recursive typed `ConversationTargetAddress` for ordinary human `SEND_MESSAGE` routing in agent-team workspaces. The websocket-bound parent `TeamRun` is authoritative. Existing flat structural `target_member_route_key` / `target_member_path` payloads remain valid only as parser-normalized one-segment member addresses. Runtime run ids must appear as typed `task_team` / `task_agent` path segments, never as structural slash-route strings. The server must reject malformed, ambiguous, stale, mismatched, inactive, or invalid runtime targets deterministically with no structural fallback. The frontend must build typed target addresses for structural members, task-agent projections, task-team roots, task-team children, and nested stored runtime paths. Ordinary chat must remain separate from task lifecycle submission, review, approval, revision, settlement, interrupts, and tool approval behavior.

Implementation-handoff `Legacy / Compatibility Removal Check` is clean: no compatibility mechanisms were introduced beyond required parser-boundary flat structural selector normalization, no secondary backend structural `SEND_MESSAGE` route remains, runtime ids are not encoded into route keys, and the old route-only frontend target resolver was removed.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Typed `ConversationTargetAddress` with `member`, `task_team`, and `task_agent` segments | Added | REQ-001 through REQ-006; design Intended Change | Needs parser, serialization, frontend resolver, runtime router, and websocket boundary coverage. |
| Existing flat structural selector payloads normalize to one member segment | Preserved / Changed internally | REQ-014; AC-001 through AC-003; design DS-002 | Existing flat structural chat tests remain valid; websocket/API validation should still prove flat selector path works through the new address boundary. |
| Runtime task-agent chat by exact `taskAgentRunId` | Added | REQ-006, REQ-010; AC-004, AC-005, AC-013 | Existing unit coverage checks resolver/router; API/WebSocket durable coverage should prove payloads reach `TeamRun.postMessageToConversationTarget` with exact typed run ids. |
| Runtime task-team root/default chat by exact `taskTeamRunId` | Added | REQ-005, REQ-009; AC-006, AC-007, AC-012 | Existing unit coverage checks resolver/router; API/WebSocket durable coverage should prove exact typed run ids at the websocket boundary. |
| Task-team child and nested runtime path routing | Added | REQ-011, REQ-012; AC-008 through AC-011 | Existing unit coverage covers frontend stored segments and mixed router remainder preservation; API/WebSocket durable coverage should include nested segment payload acceptance. |
| Runtime target failures reject with no fallback | Added / Changed | REQ-016, REQ-025; AC-014; code-review residual risks | Existing parser negative tests are valid but do not fully exercise websocket backend-result invalid-target handling or router no-fallback behavior; add durable coverage. |
| Scalar/name-only `SEND_MESSAGE` selectors remain rejected | Preserved | REQ-015; AC-015 | Existing parser/handler tests are still valid. |
| Ordinary chat stays separate from task lifecycle/tool approval/interrupt commands | Preserved | REQ-024, REQ-026; AC-017, AC-018; out-of-scope list | Existing task-delegation/tool lifecycle and frontend approval tests remain valid; final execution should include focused lifecycle/tool tests already affected by interface changes. |
| Route-only frontend target utility and task execution focus rejection for addressable runtime nodes | Removed / Changed | Design Removal Plan; implementation handoff removed `teamUserMessageTarget.ts` | Old route-only tests are stale and removed before API/E2E. New frontend address resolver tests are the current durable authority. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/team-conversation-target-address-parser.test.ts` | Flat route/path normalization, nested address parsing, scalar rejection, nested+flat ambiguity rejection, parent mismatch, invalid segment order, route/path disagreement, malformed path array entries | REQ-013 through REQ-016; AC-001, AC-003, AC-014, AC-015 | Still Valid | Static inspection shows tests map directly to parser requirements and CR-002 fix. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Handler delegates old flat selectors through `postMessageToConversationTarget`, sends invalid-target errors, reconnects/restores before send | REQ-014, REQ-018, REQ-025 | Still Valid | Code-review Round 2 passed this suite; handler now calls the `TeamRun` address boundary. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-run.test.ts` | `TeamRun.postMessageToConversationTarget` delegates to backend address boundary | REQ-017, REQ-018 | Still Valid | Test was added during implementation and reviewed. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.test.ts` | Exact dispatch for structural member, structural subteam remainder, task-agent run, task-team root/child, and nested task-team/task-agent remainders | REQ-007 through REQ-012; AC-005, AC-007, AC-009, AC-010, AC-011 | Needs Update | Coverage is valid but lacks explicit concurrent exact-run and no-fallback invalid/stale runtime assertions named in AC-012 through AC-014 and code-review residual risks. | Update with bounded router tests for exact concurrent ids and invalid runtime no-fallback. |
| `autobyteus-web/utils/__tests__/teamConversationTargetAddress.spec.ts` | Frontend focused target resolution for structural, subteam, stale focus, task-agent, task-team root/child, nested stored segments, and active-execution safety fallback | REQ-019 through REQ-023; AC-004, AC-006, AC-008, AC-010, AC-016 | Still Valid | Static inspection shows runtime projections now produce typed segments and stale focus is not silently retargeted. | Retain and execute. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Canonical snake_case `conversation_target_address` serialization; projection event handling; task-team scoped task-agent ancestry refresh; concurrent same-logical task-team projection events; tool approval command separation | REQ-019, REQ-020, REQ-023, REQ-024, REQ-027; AC-004, AC-006, AC-008, AC-016, AC-018 | Still Valid | New serialization and CR-001 coverage are present; existing projection/tool approval tests remain current behavior. | Retain and execute. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Store send orchestration now passes address objects for structural sends; stale focus rejection; active-execution fallback only for task-agent-only logical parent; tool approval no fallback | REQ-019 through REQ-026; AC-001, AC-014, AC-017, AC-018 | Still Valid | Structural sends changed to address payloads; existing stale-focus/lifecycle tests remain valid. | Retain and execute. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Task delegation lifecycle/tool behavior remains accepted and separate | REQ-024, REQ-026; AC-017, AC-018 | Still Valid | Only interface adapter change was needed for `postMessageToConversationTarget`; lifecycle assertions remain in scope. | Retain and execute focused integration if feasible. |
| `autobyteus-server-ts/tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts` | External channel team open delivery remains independent of conversation address feature | REQ-024 / no-regression | Still Valid | Modified only to satisfy updated backend interface; not a primary target-addressing proof. | Retain as compile-safety context; not part of focused final unless needed. |
| Existing live E2E: `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`, `nested-mixed-team-runtime-graphql.e2e.test.ts`, `mixed-team-runtime-graphql.e2e.test.ts`, `autobyteus-team-runtime-graphql.e2e.test.ts` | Full runtime GraphQL/WebSocket flows with real/local external runtimes under opt-in env flags | Runtime/API boundary and task delegation no-regression | Still Valid but environment-gated | These suites are skipped unless LMStudio/Codex/Claude env flags are set; they are not a reliable default gate for this task. | Use as existing optional coverage inventory; do not edit. |
| Removed `autobyteus-web/utils/teamUserMessageTarget.ts` and `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts` | Old route-only focused-target resolver and assertions | Replaced by REQ-019/REQ-020 address resolver | Stale / Remove | Implementation handoff and code review confirm removal; old tests asserted obsolete route-only model. | No further removal needed. |
| Stale docs references in `autobyteus-web/docs/*` to `resolveTeamUserMessageTarget(...)` | Durable docs not executable coverage | REQ-030 documentation | Out Of Scope for API/E2E | Code review docs-impact verdict assigns docs sync to delivery. | Delivery follow-up. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts` | Route-only focused user-message target resolution and `task_execution_focus` rejection for task projections | Addressable runtime projections must now build typed `ConversationTargetAddress` segments | REQ-019, REQ-020, AC-004 through AC-010; design Removal Plan | `autobyteus-web/utils/__tests__/teamConversationTargetAddress.spec.ts` | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-WS-001 | Real Fastify WebSocket team `SEND_MESSAGE` accepts flat structural selectors and canonical nested runtime addresses, then invokes `TeamRun.postMessageToConversationTarget` with exact normalized segments | REQ-014, REQ-018; AC-001, AC-004 through AC-010 | `autobyteus-server-ts/tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` | Existing handler tests use direct handler method calls. A durable websocket integration test better matches the API boundary residual risk without depending on live LLM runtimes. |
| API-WS-002 | WebSocket backend invalid-target result for missing/stale runtime id returns `TEAM_COMMAND_INVALID_TARGET` and does not call structural `postMessage` fallback | REQ-025; AC-014; code-review residual risk | Same new integration test file | Parser negative tests do not prove backend-result failure propagation over the websocket or no structural fallback. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| MIXED-001 | `autobyteus-server-ts/tests/unit/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.test.ts` | Add exact same-logical concurrent task-agent/task-team run id assertions and invalid/stale runtime no-fallback assertions | REQ-010, REQ-011, REQ-012, REQ-025; AC-011 through AC-014 | Narrow durable update to reviewed router test; no implementation source changes planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No additional stale durable coverage found after implementation removal of route-only resolver test. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Source scan for forbidden route-only/fixed-kind compatibility strings and stale resolver references | Confirms no compatibility wrapper, fixed-kind address model, or runtime-run-id route-key strategy is present in source; docs references only are delivery-owned | Static scan is evidence collection, not a stable regression test. Durable behavior is covered by parser/router/frontend tests. |
| TEMP-002 | Execute focused server/web test suites and targeted new websocket integration; execute web typecheck with changed-file diagnostic filtering if needed | Confirms executable state of valid coverage and records known baseline web typecheck issue | Command evidence belongs in execution report, not repository test code. |
| TEMP-003 | Start the real built backend, start the Nuxt frontend from the README flow, open the running workspace in headless Chrome, seed a simple parent/nested team using `gpt-5.5`, and drive actual frontend `TeamStreamingService` messages from the browser to the real backend websocket | Confirms the real UI can load the seeded team, the browser emits canonical typed `conversation_target_address` payloads for task-agent, task-team root/child, nested runtime paths, and concurrent runtime ids, stale runtime ids are rejected over the real backend websocket, malformed blank `member_path` is rejected, and invalid runtime sends do not fall back into persistent member projections | This is task-specific environment proof and evidence capture; durable regression coverage remains in the repository websocket/router/frontend service tests. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live LLM task delegation through LMStudio + Codex + Claude for nested task-team/task-agent ordinary chat | Existing live E2E suites require opt-in external runtime flags and installed/configured external model/runtime services; not reliable as a default local gate in this task | Residual runtime-environment risk remains lower because unit/router/websocket integration tests exercise address handling and optional live suites remain available | No reroute. Record as environment-gated optional coverage. |
| Manual click-through of the persistent-member composer into a live LLM response | Avoided intentionally because the confidence gap is conversation target serialization/routing, and sending to a persistent member would invoke the configured model without adding task-runtime target evidence. A live browser probe did load the real Nuxt workspace and exercised the actual frontend streaming service against the real backend websocket. | Low residual LLM-response risk for this feature; routing/address behavior is covered by durable tests plus TEMP-003. | No reroute. Optional full live LLM suites remain environment-gated. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity or implementation compatibility wrapper found during investigation. | N/A |

## Execution Plan

1. Add bounded durable coverage: a real Fastify team websocket integration test for flat structural and typed runtime `conversation_target_address` payloads, backend invalid-target propagation, and no structural fallback.
2. Update the mixed router unit test with exact concurrent runtime id routing and invalid/stale runtime no-fallback assertions.
3. Run focused server validation: build typecheck and relevant unit/integration/API tests, including the new websocket integration file and reviewed parser/handler/router/team-run/lifecycle tests.
4. Run focused frontend validation: resolver, streaming service, and store tests.
5. Run `git diff --check` and source scan for compatibility/fallback hazards.
6. Record known non-blocking web typecheck baseline if rerun remains unrelated to changed files.
7. Write the execution coverage report. Because repository-resident durable coverage will be added/updated after code review, route the cumulative package back to `code_reviewer` after passing execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is valid but API/E2E residual risks justify narrow additional durable coverage at the websocket boundary and router no-fallback/concurrent-id boundary. A supplemental live browser probe is also planned/executed as temporary evidence because the user requested higher confidence from a running backend/frontend setup. No source implementation change is planned unless tests expose a defect.
