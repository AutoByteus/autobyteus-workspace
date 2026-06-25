# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Rename and reshape the backend agent task-delegation tool from plural `delegate_tasks` to singular `delegate_task`, because each delegated task has an independent task-agent lifecycle and each task-agent independently calls `submit_task_result`. The model-facing schema should expose the singular action directly instead of requiring a one-or-more `tasks` array.

The delegation tool and related prompts/schema descriptions should use positive-only guidance. Remove noisy negative instructions such as "Do not pass delegator, task_name, dependencies, completion_criteria, expected_deliverables, or status" from the parameter description and user-facing tool guidance unless a specific validation error needs to explain an actually supplied invalid field.

## Investigation Findings

Current investigation found that the public delegation tool is plural/batch-shaped (`delegate_tasks({ tasks: [...] })`), while the domain input (`TaskDelegationTaskInput`), task-agent activation, result submission, and review lifecycle are singular per delegated task. The noisy negative field-list guidance is located in delegation schema/runtime docs and should be replaced with positive-only field guidance. Durable tests and docs contain broad exact references to the plural contract and must be updated together. The real mixed-runtime E2E is the strongest existing candidate for the required real E2E validation path.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / API Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness / Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Current public tool is named `delegate_tasks` and exposes `tasks: []`, while the lifecycle entities and downstream `submit_task_result`/`review_task_result` operate on one task at a time.
- Requirement or scope impact: Public tool contracts, manifests, parsers, service input/result shapes, runtime instructions, documentation, and tests likely need synchronized clean-cut replacement.

## Recommendations

Proceed with a clean-cut singular public API: expose `delegate_task(member_name, description, reference_files?)`, remove public `delegate_tasks`/`tasks[]` batching, update lifecycle docs/tests/runtime instructions to the singular name, keep `submit_task_result` and `review_task_result` semantics intact, and require downstream API/E2E validation to include a real runtime/tool-exposure E2E path.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A team member delegates one ready-to-run task to one exact logical team member using `delegate_task` with direct `member_name`, `description`, and optional `reference_files` fields.
- UC-002: The task-agent receives the work packet and later submits its result through existing `submit_task_result` without needing any change to the result submission contract.
- UC-003: A delegator that wants multiple independent tasks can issue multiple `delegate_task` calls, each creating an independent task-agent lifecycle.
- UC-004: Tool descriptions and delegation-input schema guidance should state the correct fields and behavior positively, without mentioning unrelated fields that are not part of the schema.
- UC-005: Validation proves the singular tool through a real runtime/tool-exposure E2E path, not only mocked/unit/service-level coverage.

## Out of Scope

- Changing `submit_task_result` or `review_task_result` semantics beyond references to the renamed delegation tool.
- Adding dependency scheduling, grouped/batch task orchestration, task cancellation, or multi-task transaction semantics.
- Preserving `delegate_tasks` as a long-term compatibility alias unless investigation reveals an unavoidable internal migration constraint.

## Functional Requirements

- FR-001: The model-facing backend agent tool must be named `delegate_task`, not `delegate_tasks`.
- FR-002: `delegate_task` input must accept direct fields: required `member_name`, required non-empty `description`, and optional `reference_files`.
- FR-003: Each successful `delegate_task` call must create exactly one delegated task ledger record and start at most one concrete task-agent instance for that task.
- FR-004: The `delegate_task` result must directly expose the single task's `task_id`, `member_name`, `target_agent_run_id`, and status/activation outcome without nested multi-task arrays as the primary shape.
- FR-005: Agents may delegate multiple independent tasks by making multiple `delegate_task` calls; the API must not require or advertise a batch `tasks` array.
- FR-006: User-facing `delegate_task` tool descriptions, parameter descriptions, member runtime instructions about delegation input, and documentation must use positive-only guidance for the delegation input shape and remove negative/noisy references to fields outside the `delegate_task` schema.
- FR-007: Existing task-agent result submission and delegator review lifecycle must continue to work with the singular delegation tool.
- FR-008: Tests and docs that reference the old plural contract must be updated or removed so durable coverage and durable documentation describe the singular contract.
- FR-009: API/E2E validation must include a real end-to-end test path for this change. The E2E evidence must drive the actual team runtime/tool-exposure path and observe real tool execution/lifecycle events, not only direct service calls, parser calls, manifest assertions, mocked unit tests, or narrow integration harnesses.

## Acceptance Criteria

- AC-001: Tool listing/catalog exposure shows `delegate_task` with direct `member_name`, `description`, and optional `reference_files` parameters.
- AC-002: Calling `delegate_task` with one valid task starts one task-agent and returns a single-task result containing the generated `task_id` and any `target_agent_run_id`.
- AC-003: Two separate `delegate_task` calls create two independent task records/task-agent lifecycles and do not require a batch array.
- AC-004: `delegate_tasks` is not exposed as a model-facing backend agent tool after the clean-cut replacement.
- AC-005: `submit_task_result` and `review_task_result` tests still pass for a task created by `delegate_task`.
- AC-006: `delegate_task` tool/schema descriptions and delegation-input runtime guidance no longer include the noisy negative field list (`delegator`, `task_name`, `dependencies`, `completion_criteria`, `expected_deliverables`, `status`).
- AC-007: Project docs and runtime instructions use `delegate_task` consistently where they describe the active backend agent task-delegation API.
- AC-008: API/E2E evidence includes an updated real E2E test, such as the mixed runtime task-delegation E2E, that creates a team run through the product-facing API/runtime path, exposes `delegate_task` as a configured tool, executes `delegate_task`, observes task-agent activation, observes `submit_task_result`, and completes `review_task_result` acceptance/revision flow through runtime events.

## Constraints / Dependencies

- The change must be made in the dedicated task worktree/branch `codex/singular-delegate-task`.
- Server-owned task delegation lives in `autobyteus-server-ts` and is surfaced through the Agent Tools MCP/static adapter path and native AutoByteus tools.
- Clean-cut replacement is preferred over retaining old plural compatibility.

## Assumptions

- The user intends the public/model-facing API to change, not only the prose description.
- Multiple concurrent independent delegations can be represented by repeated tool calls in supported runtimes.
- No external compatibility commitment requires keeping `delegate_tasks` exposed.

## Risks / Open Questions

- RISK-001: Some tests or documentation may intentionally validate exact old tool names and need broad updates.
- RISK-002: If any provider/runtime cannot reliably issue repeated tool calls for independent fan-out in one turn, removing batch may reduce ergonomics. Current requirement assumes repeated calls are acceptable.
- OPEN-001: Should the internal service method remain batch-capable for implementation reuse, or should internals also become singular? To be resolved in design.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| FR-001 | UC-001, UC-003, UC-004 |
| FR-002 | UC-001, UC-004 |
| FR-003 | UC-001, UC-002 |
| FR-004 | UC-001 |
| FR-005 | UC-003 |
| FR-006 | UC-004 |
| FR-007 | UC-002 |
| FR-008 | UC-001, UC-002, UC-003, UC-004 |
| FR-009 | UC-001, UC-002, UC-003, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Verifies the exposed schema is singular and direct. |
| AC-002 | Verifies the main happy path for one delegated task. |
| AC-003 | Verifies multi-task fan-out is achieved through repeated singular calls. |
| AC-004 | Verifies no public plural compatibility path remains. |
| AC-005 | Verifies lifecycle continuity after renaming/reshaping the delegation entrypoint. |
| AC-006 | Verifies positive-only agent guidance. |
| AC-007 | Verifies durable docs/instructions are synchronized. |
| AC-008 | Verifies downstream validation cannot stop at mocks, parser tests, or service-only integration; it must prove the real runtime/tool lifecycle. |

## Approval Status

Approved by user on 2026-06-25 with added requirement that API/E2E validation must include a real end-to-end test path, not only mocked/unit/integration coverage.
