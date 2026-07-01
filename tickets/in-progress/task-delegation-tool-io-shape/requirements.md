# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Simplify the agent-facing return values for `delegate_task` and `review_task_result` so the calling agent receives only meaningful next-step information, while preserving existing input schemas and preserving rich internal task lifecycle/event payloads for routing, UI projection, diagnostics, and audit.

The current outputs mirror internal lifecycle bookkeeping. The desired public tool response should answer: "what does the calling agent need to know after this tool call?"

## Investigation Findings
- `delegate_task` input is already lean and strict: `target: { kind: "member" | "team", name }`, required `description`, optional `reference_files` defaulting to `[]`.
- `review_task_result` input is also lean: required `task_id`, required `decision: "accept" | "request_revision"`, optional `comment` except required for `request_revision`, and optional `reference_files` defaulting to `[]`.
- Current `delegate_task` result exposes `target`, execution kind, task-agent/task-team run ids, `activation_accepted`, and `message: null` on success. These fields are internal/debug confirmation rather than meaningful agent continuation data.
- Current `review_task_result` result exposes review/submission ids, notification booleans, settlement status, and empty warning arrays. These fields are internal lifecycle/audit details rather than meaningful agent continuation data.
- Rich execution identities and audit fields remain necessary in internal task delegation events, notifications, websocket payloads, tests around routing/projection, and diagnostics. The simplification must be limited to the agent-facing tool return contract.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change / public tool contract cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, minor boundary/contract noise issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small refactor needed now.
- Evidence basis: Task delegation service returns domain/lifecycle internals directly through the public tool response; the caller only needs task id, status, decision where applicable, and an optional message when a non-fatal lifecycle issue occurs.
- Requirement or scope impact: Introduce a clean public result shape for `delegate_task` and `review_task_result`; do not alter input schemas, internal ledger records, task delegation events, notification metadata, or websocket identity payloads.

## Target Public Tool Result Shapes

### `delegate_task`

Successful activation:

```ts
{
  task_id: string;
  status: "active";
}
```

Activation failure that leaves the delegated task not started:

```ts
{
  task_id: string;
  status: "not_started";
  message: string;
}
```

`message` means the activation failure reason. Do not describe this as target rejection; the product model does not treat task targets as rejecting delegated work.

### `review_task_result`

Successful acceptance or revision request:

```ts
{
  task_id: string;
  status: "active" | "accepted";
  decision: "accept" | "request_revision";
}
```

If the review is recorded but a lifecycle notification side effect fails, include a concise message:

```ts
{
  task_id: string;
  status: "active" | "accepted";
  decision: "accept" | "request_revision";
  message: string;
}
```

`message` is for successful tool calls that produce an important lifecycle warning. Hard failures such as invalid task id, unauthorized reviewer, invalid decision, or missing required revision comment must still use the existing tool error path, not a successful result with `message`.

## Scope Classification (`Small`/`Medium`/`Large`)
Small-to-medium implementation. The code change is narrow, but durable tests that assert exact tool result shapes must be updated.

## In-Scope Use Cases
- UC-001: A caller delegates a task successfully and receives only the generated task id and `active` status.
- UC-002: A caller delegates a task whose activation cannot start and receives the generated task id, `not_started` status, and a concise activation-failure `message`.
- UC-003: A reviewer accepts a submitted result and receives only task id, `accepted` status, and `accept` decision.
- UC-004: A reviewer requests revision and receives only task id, `active` status, and `request_revision` decision.
- UC-005: A review records successfully but a revision/result notification delivery side effect fails; the reviewer receives a concise `message` describing that issue without internal route/run ids.
- UC-006: Internal task delegation events and notification metadata continue to carry rich execution/review/submission identities needed for routing, UI projection, diagnostics, and audit.

## Out of Scope
- Changing `delegate_task` input arguments.
- Changing `review_task_result` input arguments.
- Changing `submit_task_result` behavior or result shape.
- Changing task delegation lifecycle semantics, ledger records, authorization, activation, settlement, or notification routing.
- Removing execution identity or audit fields from internal task delegation events, websocket payloads, notifications, or stored ledger records.
- Preserving old verbose tool result fields for backward compatibility.

## Functional Requirements
- REQ-001: `delegate_task` input parsing and advertised parameter schema must remain unchanged.
- REQ-002: `review_task_result` input parsing and advertised parameter schema must remain unchanged.
- REQ-003: `delegate_task` successful activation result must contain exactly meaningful public fields: `task_id` and `status: "active"`; it must not include `target`, `execution_kind`, `task_agent_run_id`, `task_team_run_id`, `activation_accepted`, or `message: null`.
- REQ-004: `delegate_task` activation failure result must contain `task_id`, `status: "not_started"`, and a non-empty `message` with the activation failure reason; it must not frame the result as target rejection.
- REQ-005: `review_task_result` acceptance result must contain `task_id`, `status: "accepted"`, and `decision: "accept"`; it must not include `review_id`, `reviewed_submission_id`, `notification_delivered`, `settlement_requested`, or `warnings: []`.
- REQ-006: `review_task_result` revision-request result must contain `task_id`, `status: "active"`, and `decision: "request_revision"`; it must not include `review_id`, `reviewed_submission_id`, `notification_delivered`, `settlement_requested`, or `warnings: []`.
- REQ-007: If `review_task_result` records the review but notification delivery fails, the public result must include a concise non-empty `message` and must not expose internal route keys, task-agent run ids, task-team run ids, or warning arrays.
- REQ-008: Hard tool failures must continue to use the existing tool error payload path rather than returning successful result objects with `message`.
- REQ-009: Internal task delegation lifecycle/event/notification payloads must preserve the rich fields needed for runtime routing, frontend projection, diagnostics, and audit.
- REQ-010: Tests that assert the old verbose public tool outputs must be updated to assert the new minimal public contract, while retaining coverage for internal rich event/metadata payloads where those fields still matter.

## Acceptance Criteria
- AC-001: A successful member-target `delegate_task` call returns exactly `{ task_id: "...", status: "active" }` apart from value differences.
- AC-002: A successful team-target `delegate_task` call returns exactly `{ task_id: "...", status: "active" }` apart from value differences.
- AC-003: A failed task activation path returns `{ task_id: "...", status: "not_started", message: "..." }` with no target/execution/run-id/activation fields.
- AC-004: An accepted `review_task_result` call returns exactly `{ task_id: "...", status: "accepted", decision: "accept" }` apart from value differences.
- AC-005: A revision-request `review_task_result` call returns exactly `{ task_id: "...", status: "active", decision: "request_revision" }` apart from value differences when notification delivery succeeds.
- AC-006: A revision-request `review_task_result` call whose notification delivery fails returns task id/status/decision plus a concise `message`, and does not expose warning-array details or target route/run ids.
- AC-007: Existing parser tests still prove `delegate_task` and `review_task_result` accepted arguments/defaults/validation are unchanged.
- AC-008: Internal task delegation activation/result-reviewed/status-updated event payload coverage still proves execution identities, review/submission ids, notification metadata, and settlement routing remain available where internally required.

## Constraints / Dependencies
- Repository baseline: `origin/personal` as fetched on 2026-07-01.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape`.
- Existing unit/integration/e2e tests currently assert old verbose shapes and need durable updates.

## Assumptions
- The requested contract is the agent-facing tool result for `delegate_task` and `review_task_result`, not GraphQL/websocket/internal task-delegation event payloads.
- Consumers should use internal events and stream payloads, not tool result objects, for execution run ids, review ids, submission ids, and task-team projection identity.
- `message` is acceptable as the unified optional advisory field for non-fatal lifecycle issues on successful tool calls.

## Risks / Open Questions
- External consumers outside the visible repository could depend on verbose tool result fields; the target design intentionally rejects compatibility retention for this in-scope cleanup.
- If future product UX wants user-visible audit IDs, that should be surfaced through a separate history/debug view, not through the normal agent-facing tool result.

## Requirement-To-Use-Case Coverage
- REQ-001 -> UC-001, UC-002
- REQ-002 -> UC-003, UC-004, UC-005
- REQ-003 -> UC-001
- REQ-004 -> UC-002
- REQ-005 -> UC-003
- REQ-006 -> UC-004
- REQ-007 -> UC-005
- REQ-008 -> UC-001, UC-002, UC-003, UC-004, UC-005
- REQ-009 -> UC-006
- REQ-010 -> all use cases

## Acceptance-Criteria-To-Scenario Intent
- AC-001 -> successful member task-agent delegation scenario.
- AC-002 -> successful task-team delegation scenario.
- AC-003 -> activation failure scenario.
- AC-004 -> accepted review scenario.
- AC-005 -> revision-request success scenario.
- AC-006 -> notification delivery failure warning scenario.
- AC-007 -> parser/input backward-stability scenario.
- AC-008 -> internal lifecycle/event richness preservation scenario.

## Approval Status
User approved the final recommended shapes on 2026-07-01 and requested kickoff.
