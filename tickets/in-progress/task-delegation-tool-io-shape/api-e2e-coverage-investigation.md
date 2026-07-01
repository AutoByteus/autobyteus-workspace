# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass for task-delegation tool public result cleanup; API/E2E coverage investigation required before final execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved change narrows only the agent-facing public result contracts for `delegate_task` and `review_task_result` while preserving existing input schemas, parser behavior, hard-error paths, ledger semantics, rich internal lifecycle events, notification metadata, websocket projection identity, and `submit_task_result` behavior.

Required public behavior to prove:

- `delegate_task` success for member and team targets returns exactly `{ task_id, status: "active" }`.
- `delegate_task` activation failure returns `{ task_id, status: "not_started", message }` with a concise activation-failure reason and no target/run-id/execution/activation fields.
- `review_task_result` accept returns exactly `{ task_id, status: "accepted", decision: "accept" }`.
- `review_task_result` request-revision success returns exactly `{ task_id, status: "active", decision: "request_revision" }`.
- `review_task_result` request-revision notification failure returns task id/status/decision plus concise `message`, without raw warning arrays or route/run-id details.
- Hard failures continue through the error path.
- Internal events/notifications/websocket payloads retain execution run ids, review/submission ids, notification metadata, and routing identities.
- No backward-compatible public aliases, compatibility wrappers, or legacy verbose public fields are retained.

Implementation handoff legacy/compatibility check was clean: no backward-compatibility mechanisms introduced, legacy old behavior not retained, obsolete public-result fields removed, and internal rich payloads preserved. Code review passed with no findings and confirmed the branch is behind `origin/personal`, with later integration refresh owned by delivery.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `delegate_task` successful public result | Changed | REQ-003, AC-001, AC-002; design target `DelegateTaskResult`; implementation handoff “What Changed” | Existing service/unit and tool lifecycle integration assertions must be exact minimal objects. |
| `delegate_task` activation failure public result | Changed | REQ-004, AC-003; design message semantics; implementation handoff downstream hints | Existing activation-failure tests must assert `not_started` + concise `message` and absence of verbose public fields by exact equality. |
| `review_task_result` accept public result | Changed | REQ-005, AC-004 | Existing service/unit and integration tests must assert exact minimal accept result and still observe settlement side effects internally. |
| `review_task_result` request-revision public result | Changed | REQ-006, AC-005 | Existing service/unit and integration tests must assert exact minimal revision result and still observe notification delivery internally. |
| `review_task_result` request-revision notification failure public result | Changed / Added edge coverage | REQ-007, AC-006 | Existing service/unit coverage must assert concise public `message`; no raw `warnings` or route/run ids in public result. |
| Parser/schema inputs for both tools | Preserved | REQ-001, REQ-002, AC-007 | Existing parser/default/strictness tests remain valid and must continue passing. |
| Hard tool failures | Preserved | REQ-008 | Existing unauthorized/stale-state parser/service error assertions remain valid. |
| Internal lifecycle event/notification/websocket richness | Preserved | REQ-009, AC-008; design DS-003 | Existing internal-rich assertions remain valid and must continue passing. |
| `submit_task_result` result shape | Preserved / Out of scope | Requirements “Out of Scope”; implementation handoff assumptions | Existing `notification_delivered`/`warnings` assertions for `submit_task_result` remain valid, not stale. |
| Legacy verbose public fields for delegate/review | Removed | Design removal/decommission plan; code review legacy verdict | Do not add or retain coverage expecting old public fields; use exact-object assertions to catch reintroduction. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — repeated member delegation | Service returns exact `{ task_id, status: "active" }`; internal task-agent start identity, notification metadata, activation event payload remain rich. | REQ-003, REQ-009, AC-001, AC-008 | Still Valid | Source inspection shows exact equality on public result and internal assertions for `taskAgentRunId`, metadata, event payload. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — explicit team target delegation | Service returns exact `{ task_id, status: "active" }`; internal task-team identity, metadata, activation payload remain rich. | REQ-003, REQ-009, AC-002, AC-008 | Still Valid | Exact equality for public result; internal `task_team_run_id` and event assertions remain. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — parser/tool exposure strictness | `delegate_task`, `submit_task_result`, `review_task_result` names and parsers; defaults for `reference_files`; rejects legacy/extra inputs and missing revision comment. | REQ-001, REQ-002, REQ-008, AC-007 | Still Valid | Test asserts accepted/defaulted inputs and rejects `member_name`, `tasks`, `message` on review, etc. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — submit/revise/resubmit/accept lifecycle | `review_task_result` revision and accept return exact minimal objects; submit result remains rich; notifications/events/settlement still use internal metadata. | REQ-005, REQ-006, REQ-009, AC-004, AC-005, AC-008 | Still Valid | Exact equality for review public results; internal review/submission ids and notification metadata assertions retained. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — revision notification failure | Public review revision result includes only concise `message`; internal review event still carries review/submission ids. | REQ-007, AC-006, AC-008 | Still Valid | Added during implementation before code review; exact expected object contains task id/status/decision/message and no warning array. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` — rejected/throwing activation | Public delegate result is `not_started` with concise `message`; no active event or directory entry is published for rejected task. | REQ-004, AC-003 | Still Valid | Exact equality on public result; activation event/directory assertions cover lifecycle side effects. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — manifest/tool lifecycle, member target | Executes manifest parser + tool service + task delegation service; member `delegate_task` and `review_task_result` public outputs exact minimal; websocket event projection remains rich. | REQ-001 to REQ-009, AC-001, AC-004, AC-008 | Still Valid | Integration helpers execute `getTaskDelegationToolManifestEntry(...).parseInput/execute`; assertions are exact minimal for public delegate/review and rich websocket/event payloads. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — task-agent child delegation/review | Task-agent context can delegate/review child; public results minimal; internal child delegator identity remains rich. | REQ-003, REQ-005, REQ-009, AC-001, AC-004, AC-008 | Still Valid | Exact public result assertions plus internal `taskAgentRunId`/delegator payload checks. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — team target/revision/settlement/sequential delegation | Team-target `delegate_task`, revision, accept paths return minimal public objects; task-team run ids and notification metadata remain internal. | REQ-003, REQ-005, REQ-006, REQ-009, AC-002, AC-004, AC-005, AC-008 | Still Valid | Exact public assertions; identity retrieved from internal start records instead of public result. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` — activation failure | First delegate returns `not_started` + `message`; later delegate succeeds; stale rejected task cannot be reviewed. | REQ-004, REQ-008, AC-003 | Still Valid | Exact public assertion on rejected result and hard-error path for review. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — Agent Tools MCP `delegate_task` envelope | Codex converter projects MCP JSON text envelope to direct minimal `{ task_id, status }`, strips MCP envelope fields. | REQ-003; prior MCP envelope behavior; AC-001/AC-002 | Still Valid | Fixture updated to minimal delegate result; asserts result lacks `content`, `structuredContent`, `_meta`. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — Agent Tools MCP `review_task_result` envelope | Codex converter projects MCP JSON text envelope to direct minimal `{ task_id, status, decision }`, strips MCP envelope fields. | REQ-005/REQ-006; prior MCP envelope behavior; AC-004/AC-005 | Still Valid | Fixture updated to minimal accept result and current input spelling. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` — Agent Tools MCP task-delegation envelope | Claude converter projects MCP JSON text envelope to direct minimal task result and strips MCP envelope fields. | REQ-003; prior MCP envelope behavior | Still Valid | Generic Claude MCP projection path is tool-agnostic; delegate fixture asserts minimal result. | Run in focused final Vitest command. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` — live member/task-team runtime E2E | With external LMStudio/Codex flags, exercises GraphQL/team websocket/runtime tool approval; verifies inputs, task notifications, internal events, and no legacy lifecycle tool names. | Broad API/E2E confidence for REQ-001/REQ-002/REQ-009 and activation/revision runtime flow | Still Valid | Existing live E2E remains aligned; it does not assert exact public result payload fields but is useful broader runtime coverage. It is environment gated by `RUN_MIXED_TASK_DELEGATION_E2E` or LMStudio+Codex flags. | Run the file as an environment-gated executable check; expect local skip when flags are absent. Do not edit. |
| Documentation mentions of old review fields in `autobyteus-server-ts/docs/modules/agent_team_execution.md` and `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Durable docs currently mention old public review fields. | Docs-impact noted by design/code review; delivery owns docs sync. | Out Of Scope | Not executable coverage; code review identified docs impact for delivery. | No API/E2E coverage action; include in handoff for delivery. |
| Existing `submit_task_result` public result assertions containing `notification_delivered`/`warnings` | Submit result remains verbose by approved out-of-scope decision. | Requirements out-of-scope and implementation handoff assumption. | Still Valid | `submit_task_result` not changed; tests remain meaningful for unchanged boundary. | Run as part of focused lifecycle tests; do not remove. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None in the current review-passed state | N/A | Implementation already updated old public-result assertions before code review; remaining old-field assertions are internal-rich or `submit_task_result` out-of-scope assertions. | Requirements REQ-009 and submit out-of-scope section; code review “No legacy old-behavior retention”. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Existing reviewed durable coverage already covers the required delegate/review public result shapes, parser stability, hard-error paths, notification failure message, internal-rich event/notification payloads, and provider MCP projection. | Code review confirms focused tests cover exact public result assertions and internal-rich assertions. | N/A | Adding duplicate tests in API/E2E stage would broaden coverage code without a current uncovered behavior. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Implementation already updated necessary durable coverage before code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-001 | Focused Vitest command for reviewed service/tool lifecycle/provider converter tests. | Current durable coverage passes against the review-passed implementation. | Uses existing durable tests only; no temporary code. |
| APIE2E-002 | Environment-gated live E2E file `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`. | Confirms the live E2E artifact remains loadable and records whether local environment executes or skips it. | Existing durable E2E; no new temporary code. Local environment is not expected to have live flags. |
| APIE2E-003 | Source build TypeScript check `tsc -p tsconfig.build.json --noEmit`. | Changed source compiles under build config. | Existing compiler check; no temporary code. |
| APIE2E-004 | Full `pnpm -C autobyteus-server-ts typecheck` to reclassify known baseline status if run. | Confirms whether the known TS6059 rootDir/test include baseline still blocks full typecheck. | Existing command; failure is expected baseline and not a durable coverage artifact. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live multi-runtime E2E with actual LMStudio/Codex model execution | Environment flags and external model/server setup are not guaranteed locally; the durable live E2E is gated by `RUN_MIXED_TASK_DELEGATION_E2E`, `RUN_LMSTUDIO_E2E`, and `RUN_CODEX_E2E`. | Low-to-medium residual runtime-provider risk; mitigated by integration harness exercising manifest/service/runtime lifecycle and converter tests exercising MCP result projection. | If delivery or user requires live provider proof, rerun with required live E2E environment flags. No implementation reroute needed. |
| Integrated branch state after refresh from current `origin/personal` | Delivery owns refresh/integrated-state check. | Low; code review noted upstream commits do not touch reviewed files, but delivery must verify integrated state. | Delivery-stage integrated refresh. |
| Durable docs synchronization for changed public result contract | Delivery owns docs sync after integrated validation. | Docs may remain stale until delivery. | Delivery should update or record no-impact for docs. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified | N/A | Requirements/design/implementation/code review consistently require clean-cut public result simplification and internal payload preservation; no compatibility wrapper observed in inspected changed source. | N/A |

## Execution Plan

1. Generate/update local Prisma client if needed for test execution: `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`.
2. Run whitespace check: `git diff --check`.
3. Run focused durable coverage: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts`.
4. Run environment-gated live E2E file for load/skip evidence: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`.
5. Run source TypeScript build check: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
6. Optionally rerun full typecheck to document known baseline failure classification: `pnpm -C autobyteus-server-ts typecheck`.
7. Write canonical execution coverage report and route to `delivery_engineer` if no repository-resident durable coverage was added, updated, or removed during API/E2E.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable coverage is sufficient for the approved public result cleanup. No stale coverage needs removal, and no missing behavior requires additional durable coverage in the API/E2E stage.
