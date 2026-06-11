# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Updated `api-e2e-engineer` skill now requires explicit durable coverage investigation before final API/E2E execution; user requested reload and redo.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `1`

## Current Requirement And Design Basis

The approved behavior is a pure task-delegation protocol, not a generic-message lifecycle protocol:

- Model-facing task lifecycle tools are exactly `delegate_tasks`, `submit_task_result`, and `review_task_result`.
- `submit_task_result` is task-agent-only, selector-free, and infers task identity from the bound task-agent context.
- Result submission records a distinct `submissionId`, moves the task to `awaiting_review`, publishes a result-submitted event, and attempts system notification to the original delegator.
- `review_task_result` is original-delegator-only and accepts a generated `task_id`, decision `accept` or `request_revision`, optional `reference_files`, and a required message for revisions.
- `request_revision` records a review linked to the latest pending submission, returns the task to `active`, publishes a review/status event, and attempts system revision notification to the same task-agent.
- `accept` records a review linked to the latest pending submission, moves the task to `accepted`, invalidates the task-agent as a pending review/revision target, publishes review/status events, and requests settlement only after safe idle/no-open-work gates.
- Settlement must be blocked when the task-agent has assigned non-terminal work or owns non-terminal child delegations.
- `send_message_to` remains valid only for ordinary teammate communication; it must not be task result, revision, acceptance, or finalization protocol.
- Removed names and legacy state (`accept_task`, `mark_task_completed`, `mark_task_failed`, `awaiting_acceptance`) must not remain in active source/docs/tests.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Task-agent result reporting | Changed | REQ-003..REQ-005, AC-005, design DS-002 | Existing E2E assertions based on worker `send_message_to` completion reports are invalid and need replacement with `submit_task_result` + result event assertions. |
| Delegator revision feedback | Changed | REQ-006..REQ-007, REQ-013, AC-006, design DS-004 | Existing E2E assertions based on delegator `send_message_to` to exact task-agent run are invalid and need replacement with `review_task_result(request_revision)` + review event assertions. |
| Delegator acceptance | Changed/Removed old surface | REQ-008..REQ-009, AC-007, design DS-003 | Existing E2E assertions based on `accept_task` are invalid and need replacement with `review_task_result(accept)` + accepted review event assertions. |
| Result/review event payloads | Added | REQ-016, AC-016, code review residual risk | Durable coverage must assert `submissionId`, `pendingSubmissionId`, `reviewId`, `reviewedSubmissionId`, `awaiting_review`, and terminal flag. |
| Generic communication | Preserved but narrowed | REQ-014, AC-012 | Existing E2Es for ordinary `send_message_to` communication remain valid if not asserting task lifecycle semantics. |
| Old lifecycle tool names/states | Removed | REQ-009, AC-010, implementation legacy check | Active source/docs/tests scans must prove removed names are absent except ticket artifacts. |
| Nested child delegation and settlement | Changed/strengthened | REQ-012, REQ-017, AC-009, AC-017, code-review report | Durable unit/integration coverage remains required for child result notification/review and settlement blocking. |
| Gated live mixed-runtime E2E | Changed | AC-014 and user feedback that old E2E model was wrong | One existing E2E scenario must be updated to current protocol; default no-live-flags run should still skip by design. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` / live mixed-runtime task delegation | Before this API/E2E pass, this scenario asserted worker lifecycle via `send_message_to`, coordinator revision via `send_message_to`, and acceptance via `accept_task`. It is now updated to `submit_task_result` / `review_task_result`. | AC-014, REQ-001, REQ-003..REQ-009, REQ-016, REQ-019 | `Needs Update` -> updated | User explicitly challenged old E2E validity; upstream requirements remove generic-message lifecycle and `accept_task`. | Updated durable E2E scenario and kept it gated for live execution. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Harnessed server-managed delegation, result submission, review, events/websocket mapping, nested child delegation, activation rejection, and settlement. | AC-005..AC-007, AC-009, AC-014, AC-016, AC-017 | `Still Valid` | Current assertions already use `submit_task_result`, `review_task_result`, `TASK_DELEGATION_RESULT_SUBMITTED`, and `TASK_DELEGATION_RESULT_REVIEWED`. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Service-level lifecycle, notification warning, stale/settled task-agent guards, nested child settlement blocking, parser/tool exposure checks. | REQ-005..REQ-018, AC-005..AC-008, AC-015..AC-017 | `Still Valid` | Focused tests reflect current protocol and code-review CR-001 fix. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Manifest/descriptions/projected provider tool definitions expose current task tools and wording. | REQ-001, REQ-003, REQ-006, REQ-009..REQ-011, AC-001..AC-004, AC-010 | `Still Valid` | Tool names and descriptions match current pure protocol. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts` | Configured tool exposure does not expose removed legacy task tools and derives plural/current task-tool exposure. | REQ-001, REQ-009, REQ-019, AC-010, AC-011 | `Still Valid` | Verifies runtime exposure boundary. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts` | AutoByteus mixed runtime filters removed local task-plan tools and preserves server-owned task delegation tools. | REQ-019, AC-011 | `Still Valid` | Current expectations use `delegate_tasks`, `submit_task_result`, `review_task_result`. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | Claude team MCP server exposure when task delegation tooling is enabled. | REQ-019, AC-011 | `Still Valid` | Exercises shared manifest exposure. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Claude tool gating includes current task delegation tools only when configured. | REQ-019, AC-011 | `Still Valid` | Exercises configured tool boundary. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Codex dynamic tool registration includes task delegation tools only when enabled. | REQ-019, AC-011 | `Still Valid` | Covers Codex runtime projection. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` | Runtime instructions teach task delegation only when tools are enabled and separate task lifecycle from generic communication. | REQ-010, REQ-011, REQ-014, AC-004, AC-012 | `Still Valid` | Covers prompt/instruction boundary. | Retain and execute. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Live ordinary `send_message_to` team communication roundtrips in Codex runtime. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | Uses `send_message_to` as ordinary communication, not task lifecycle; `send_message_to` remains valid. | No task-protocol update. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Live ordinary `send_message_to` team communication roundtrips in Claude runtime. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | Uses `send_message_to` as ordinary communication, not task lifecycle. | No task-protocol update. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Mixed runtime ordinary team communication and runtime behavior. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | Uses explicit ordinary `send_message_to` JSON commands; no task-delegation protocol terms. | No task-protocol update. |
| `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Nested mixed-team ordinary `send_message_to` routing. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | No direct task-delegation protocol terms; ordinary communication remains valid. | No task-protocol update. |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | AutoByteus ordinary `send_message_to` between real team members. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | Ordinary communication only. | No task-protocol update. |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Run projection of `send_message_to` tool calls/results. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | Projection of ordinary communication remains valid. | No task-protocol update. |
| `autobyteus-server-ts/tests/e2e/agent-definitions/json-file-persistence-contract.e2e.test.ts` | Agent definition persistence for configured `send_message_to`. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | Persistence of ordinary communication tool is still valid. | No task-protocol update. |
| `autobyteus-server-ts/tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts` | External-channel reply filtering and ordinary delivered inter-agent message content. | REQ-014, AC-012 | `Out Of Scope` for task lifecycle change | Only suspicious phrase is content text `worker has completed the task`; it is an ordinary `deliverInterAgentMessage` payload with `messageType: "validation"`, not task lifecycle. | No task-protocol update. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` old worker result path | Worker uses `send_message_to` with `task_completion_report`. | Task-agent result submission must be `submit_task_result`; generic messaging is not lifecycle protocol. | REQ-003..REQ-005, REQ-014, AC-005, AC-014. | Updated same E2E to expect `submit_task_result`, `TASK_DELEGATION_RESULT_SUBMITTED`, `awaiting_review`, `submissionId`, `pendingSubmissionId`. | N/A |
| Same E2E old revision path | Coordinator sends revision with `send_message_to` to `target_agent_run_id`. | Revision must be `review_task_result(request_revision)` and system notification to same task-agent. | REQ-006..REQ-007, REQ-013, AC-006. | Updated same E2E to expect `review_task_result`, `TASK_DELEGATION_RESULT_REVIEWED`, `reviewId`, `reviewedSubmissionId`, status `active`. | N/A |
| Same E2E old acceptance path | Coordinator calls `accept_task`. | `accept_task` is removed with no compatibility alias; acceptance is `review_task_result(accept)`. | REQ-008..REQ-009, AC-007, AC-010. | Updated same E2E to expect `review_task_result(accept)`, accepted review event, settlement/offline proof, and negative legacy lifecycle tool assertion. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-001 | Live mixed-runtime lifecycle must assert the pure result/review protocol and reject legacy lifecycle tools. | AC-014, REQ-001, REQ-003..REQ-009, REQ-016 | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Existing live E2E boundary was the main stale durable E2E surface; it must encode current protocol. |
| COV-002 | Frontend/websocket payloads include `submissionId`, `pendingSubmissionId`, `reviewId`, and `reviewedSubmissionId`. | AC-016 and code-review residual risk | Same E2E plus integration websocket mapper assertions | Consumers should not infer review/submission links from array order. |
| COV-003 | Active E2E suite contains no other direct task-delegation tests needing update. | Coverage investigation rule; user question | Coverage investigation artifact | Prevent treating unrelated `send_message_to` E2Es as obsolete when they are ordinary communication coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-001 | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Replace old `send_message_to`/`accept_task` lifecycle flow with `delegate_tasks -> submit_task_result -> review_task_result(request_revision) -> submit_task_result -> review_task_result(accept) -> settlement`. | AC-014, REQ-001, REQ-003..REQ-009 | Already updated in current worktree. |
| COV-002 | Same E2E | Add event payload assertions and negative legacy lifecycle tool assertion. | AC-010, AC-016 | Already updated in current worktree. |
| COV-004 | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` | Update gated E2E command/test names and current Codex task-delegation protocol text. | AC-013, AC-014 | Already updated in current worktree. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | No whole durable coverage file needs removal. Only obsolete assertions inside `mixed-task-delegation.e2e.test.ts` were replaced. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-001 | `rg`/Python audit over all 42 E2E files under `autobyteus-server-ts/tests/e2e`. | Only `mixed-task-delegation.e2e.test.ts` directly covers task-delegation lifecycle; other `send_message_to` E2Es are ordinary communication. | Static inventory/audit evidence belongs in investigation artifact, not as a repository test. |
| TMP-002 | Temporary model-catalog probe used in previous validation pass. | Local live prerequisites existed (`codex` binary, LMStudio/Codex models visible). | It was environment inspection only and was removed. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live AutoByteus/LMStudio + Codex model E2E execution | Live run is explicitly opt-in and was previously interrupted while stale E2E contract was being corrected. Deterministic harnessed mixed-runtime execution and gated E2E import/skip validation will be executed in this pass. | Live model tool-choice behavior remains a residual runtime confidence risk. | Optional follow-up: run with `RUN_MIXED_TASK_DELEGATION_E2E=1 RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1` when live runtime time/cost is acceptable. |
| Browser UI visual inspection | Changed boundary is server protocol/events and durable server-side E2E/integration coverage. | UI consumer regressions beyond websocket payload shape could remain. | Delivery or frontend owner may run UI-specific checks if a frontend harness exists. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Requirements/design clearly reject old lifecycle tools and generic-message task lifecycle. | N/A |

## Execution Plan

1. Treat this investigation artifact as authoritative coverage-validity decision record.
2. Confirm no active old lifecycle names remain in source/docs/tests outside tickets.
3. Execute the focused task-delegation unit/integration suite.
4. Execute the gated `mixed-task-delegation.e2e.test.ts` default run to verify import/compile/default skip behavior.
5. Execute build/typecheck and whitespace checks.
6. Update the execution coverage report with final evidence.
7. Because repository-resident durable coverage/docs changed after code review, route the cumulative package plus investigation and execution report to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The only direct E2E task-delegation lifecycle file requiring update is `mixed-task-delegation.e2e.test.ts`; unrelated `send_message_to` E2Es remain valid ordinary communication coverage.
