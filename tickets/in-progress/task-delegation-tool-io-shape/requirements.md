# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined

## Goal / Problem Statement
Simplify the agent-facing return values for all task lifecycle tools that currently expose internal lifecycle bookkeeping: `delegate_task`, `submit_task_result`, and `review_task_result`.

The calling agent should receive only meaningful next-step information, while existing input schemas and rich internal task lifecycle/event payloads remain available for routing, UI projection, diagnostics, and audit.

The public tool response should answer: "what does the calling agent need to know after this tool call?" It should not expose input echoes, run ids, audit ids, notification booleans, settlement booleans, or raw warning objects.

## Investigation Findings
- `delegate_task` input is already lean and strict: `target: { kind: "member" | "team", name }`, required `description`, optional `reference_files` defaulting to `[]`.
- `submit_task_result` input is already lean and strict: required `message`, optional `reference_files` defaulting to `[]`.
- `review_task_result` input is already lean and strict: required `task_id`, required `decision: "accept" | "request_revision"`, optional `comment` except required for `request_revision`, and optional `reference_files` defaulting to `[]`.
- Current/refactored `delegate_task` and `review_task_result` have already been cleaned up in implementation, but `submit_task_result` still returns `submission_id`, `notification_delivered`, and `warnings`.
- `submission_id` is internal audit/correlation data. The reviewer reviews by `task_id`, not by `submission_id`, so the submitting task-agent/task-team does not need the submission id as normal public continuation data.
- `notification_delivered` and `warnings[]` are side-effect telemetry. On normal success they are noise; on notification delivery failure the caller needs only a concise `message`.
- Rich execution identities, submission/review ids, notification metadata, and warning details remain necessary in internal task delegation events, notifications, websocket payloads, tests around routing/projection, and diagnostics. The simplification must be limited to the agent-facing tool return contract.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change / public tool contract cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, minor boundary/contract noise issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Small refactor needed now.
- Evidence basis: Task delegation service currently returns or previously returned domain/lifecycle internals directly through public tool responses. The caller only needs task id, resulting status, decision where applicable, and optional `message` when a successful tool call has a non-fatal lifecycle issue to report.
- Requirement or scope impact: Extend the already-approved meaningful-result cleanup to `submit_task_result`; do not alter input schemas, internal ledger records, task delegation events, notification metadata, or websocket identity payloads.

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

### `submit_task_result`

Successful submission and notification delivery:

```ts
{
  task_id: string;
  status: "awaiting_review";
}
```

If the result submission is recorded but reviewer/delegator notification delivery fails:

```ts
{
  task_id: string;
  status: "awaiting_review";
  message: string;
}
```

`message` is for successful tool calls that record the submission but have an important lifecycle notification issue to report. Hard failures such as invalid task context, duplicate submission while awaiting review, or empty result message must still use the existing tool error path.

### `review_task_result`

Successful acceptance or revision request:

```ts
{
  task_id: string;
  status: "active" | "accepted";
  decision: "accept" | "request_revision";
}
```

If the review is recorded but revision notification delivery fails:

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
Small-to-medium implementation. The remaining code change is narrow, but durable tests and docs that assert/describe exact `submit_task_result` public result shape must be updated.

## In-Scope Use Cases
- UC-001: A caller delegates a task successfully and receives only the generated task id and `active` status.
- UC-002: A caller delegates a task whose activation cannot start and receives the generated task id, `not_started` status, and a concise activation-failure `message`.
- UC-003: A task-agent/task-team submits a result successfully and receives only task id and `awaiting_review` status.
- UC-004: A task-agent/task-team submits a result that records successfully but reviewer/delegator notification delivery fails; it receives task id, `awaiting_review` status, and concise `message`.
- UC-005: A reviewer accepts a submitted result and receives only task id, `accepted` status, and `accept` decision.
- UC-006: A reviewer requests revision and receives only task id, `active` status, and `request_revision` decision.
- UC-007: A review records successfully but revision notification delivery fails; the reviewer receives a concise `message` without internal route/run ids.
- UC-008: Internal task delegation events and notification metadata continue to carry rich execution/submission/review identities needed for routing, UI projection, diagnostics, and audit.

## Out of Scope
- Changing `delegate_task`, `submit_task_result`, or `review_task_result` input arguments.
- Changing task delegation lifecycle semantics, ledger records, authorization, activation, submission, review, settlement, or notification routing.
- Removing execution identity, submission id, review id, notification metadata, warning detail, or audit fields from internal task delegation events, websocket payloads, notifications, or stored ledger records.
- Preserving old verbose tool result fields for backward compatibility.

## Functional Requirements
- REQ-001: `delegate_task` input parsing and advertised parameter schema must remain unchanged.
- REQ-002: `submit_task_result` input parsing and advertised parameter schema must remain unchanged.
- REQ-003: `review_task_result` input parsing and advertised parameter schema must remain unchanged.
- REQ-004: `delegate_task` successful activation result must contain exactly meaningful public fields: `task_id` and `status: "active"`; it must not include `target`, `execution_kind`, `task_agent_run_id`, `task_team_run_id`, `activation_accepted`, or `message: null`.
- REQ-005: `delegate_task` activation failure result must contain `task_id`, `status: "not_started"`, and a non-empty `message` with the activation failure reason; it must not frame the result as target rejection.
- REQ-006: `submit_task_result` successful submission result must contain exactly meaningful public fields: `task_id` and `status: "awaiting_review"`; it must not include `submission_id`, `notification_delivered`, `warnings`, or `message: null`.
- REQ-007: If `submit_task_result` records the result but reviewer/delegator notification delivery fails, the public result must include a concise non-empty `message` and must not expose internal route keys, task-agent run ids, task-team run ids, `submission_id`, or warning arrays.
- REQ-008: `review_task_result` acceptance result must contain `task_id`, `status: "accepted"`, and `decision: "accept"`; it must not include `review_id`, `reviewed_submission_id`, `notification_delivered`, `settlement_requested`, or `warnings: []`.
- REQ-009: `review_task_result` revision-request result must contain `task_id`, `status: "active"`, and `decision: "request_revision"`; it must not include `review_id`, `reviewed_submission_id`, `notification_delivered`, `settlement_requested`, or `warnings: []`.
- REQ-010: If `review_task_result` records the review but revision notification delivery fails, the public result must include a concise non-empty `message` and must not expose internal route keys, task-agent run ids, task-team run ids, or warning arrays.
- REQ-011: Hard tool failures must continue to use the existing tool error payload path rather than returning successful result objects with `message`.
- REQ-012: Internal task delegation lifecycle/event/notification payloads must preserve the rich fields needed for runtime routing, frontend projection, diagnostics, and audit.
- REQ-013: Tests that assert old verbose public outputs must be updated to assert the new minimal public contracts, while retaining coverage for internal rich event/metadata payloads where those fields still matter.

## Acceptance Criteria
- AC-001: A successful member-target `delegate_task` call returns exactly `{ task_id: "...", status: "active" }` apart from value differences.
- AC-002: A successful team-target `delegate_task` call returns exactly `{ task_id: "...", status: "active" }` apart from value differences.
- AC-003: A failed task activation path returns `{ task_id: "...", status: "not_started", message: "..." }` with no target/execution/run-id/activation fields.
- AC-004: A successful task-agent `submit_task_result` call returns exactly `{ task_id: "...", status: "awaiting_review" }` apart from value differences.
- AC-005: A successful task-team ingress `submit_task_result` call returns exactly `{ task_id: "...", status: "awaiting_review" }` apart from value differences.
- AC-006: A `submit_task_result` call whose reviewer/delegator notification delivery fails returns task id/status plus a concise `message`, and does not expose `submission_id`, warning-array details, or target route/run ids.
- AC-007: An accepted `review_task_result` call returns exactly `{ task_id: "...", status: "accepted", decision: "accept" }` apart from value differences.
- AC-008: A revision-request `review_task_result` call returns exactly `{ task_id: "...", status: "active", decision: "request_revision" }` apart from value differences when notification delivery succeeds.
- AC-009: A revision-request `review_task_result` call whose notification delivery fails returns task id/status/decision plus a concise `message`, and does not expose warning-array details or target route/run ids.
- AC-010: Existing parser tests still prove all three task lifecycle tools' accepted arguments/defaults/validation are unchanged.
- AC-011: Internal task delegation activation/result-submitted/result-reviewed/status-updated event payload coverage still proves execution identities, submission ids, review ids, notification metadata, and settlement routing remain available where internally required.

## Constraints / Dependencies
- Repository baseline: `origin/personal` as fetched on 2026-07-01; branch later merged `origin/personal` during downstream work.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape`.
- Existing unit/integration/e2e tests currently assert old verbose `submit_task_result` shape and need durable updates.
- Downstream implementation/code review already completed for the initial two-tool scope; this refinement is a requirement-gap reset that must return through architecture review and implementation.

## Assumptions
- The requested contract is the agent-facing tool result for `delegate_task`, `submit_task_result`, and `review_task_result`, not GraphQL/websocket/internal task-delegation event payloads.
- Consumers should use internal events and stream payloads, not tool result objects, for execution run ids, submission ids, review ids, and task-team projection identity.
- `message` is acceptable as the unified optional advisory field for non-fatal lifecycle issues on successful tool calls.

## Risks / Open Questions
- External consumers outside the visible repository could depend on verbose tool result fields; the target design intentionally rejects compatibility retention for this in-scope cleanup.
- If future product UX wants user-visible audit IDs, that should be surfaced through a separate history/debug view, not through normal agent-facing tool results.
- Since downstream delivery/docs work had already started for the two-tool scope, docs and handoff artifacts may need another pass after the submit-result refinement is implemented and reviewed.

## Requirement-To-Use-Case Coverage
- REQ-001 -> UC-001, UC-002
- REQ-002 -> UC-003, UC-004
- REQ-003 -> UC-005, UC-006, UC-007
- REQ-004 -> UC-001
- REQ-005 -> UC-002
- REQ-006 -> UC-003
- REQ-007 -> UC-004
- REQ-008 -> UC-005
- REQ-009 -> UC-006
- REQ-010 -> UC-007
- REQ-011 -> UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007
- REQ-012 -> UC-008
- REQ-013 -> all use cases

## Acceptance-Criteria-To-Scenario Intent
- AC-001 -> successful member task-agent delegation scenario.
- AC-002 -> successful task-team delegation scenario.
- AC-003 -> activation failure scenario.
- AC-004 -> task-agent submit success scenario.
- AC-005 -> task-team ingress submit success scenario.
- AC-006 -> submit notification delivery failure scenario.
- AC-007 -> accepted review scenario.
- AC-008 -> revision-request success scenario.
- AC-009 -> revision notification delivery failure warning scenario.
- AC-010 -> parser/input backward-stability scenario.
- AC-011 -> internal lifecycle/event richness preservation scenario.

## Approval Status
User approved the refined scope on 2026-07-01 after downstream follow-up. `submit_task_result` now receives the same meaningful public result cleanup philosophy as `delegate_task` and `review_task_result`; ready for architecture review.
