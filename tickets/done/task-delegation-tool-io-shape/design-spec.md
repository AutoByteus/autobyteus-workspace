# Design Spec

Status: Refined requirements approved by user on 2026-07-01; ready for architecture review.

## Current-State Read

The task delegation tools are implemented under `autobyteus-server-ts/src/agent-tools/task-delegation` and route through `TaskDelegationToolService` to `TaskDelegationService` in `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`.

Current input boundaries are healthy and remain unchanged:

- `delegate_task` parser/schema accepts only `target`, `description`, and optional `reference_files`.
- `submit_task_result` parser/schema accepts only required `message` and optional `reference_files`.
- `review_task_result` parser/schema accepts only `task_id`, `decision`, optional `comment`, and optional `reference_files`; `comment` is required for `request_revision`.

The initial implementation already simplified `delegate_task` and `review_task_result`, but `submit_task_result` still exposes internal lifecycle telemetry through its public tool result:

- `SubmitTaskResultResult` currently exposes `submission_id`, `notification_delivered`, and `warnings`.
- `submission_id` is internal audit/correlation data; reviewers operate through `task_id`, not `submission_id`.
- `notification_delivered` and `warnings[]` are side-effect telemetry. They are useful internally, but the submitting agent/team only needs task id, resulting status, and an optional concise `message` if notification delivery fails.

Rich fields remain useful in internal events, notifications, stream projection, diagnostics, and tests. The cleanup must therefore apply only to public tool results, not to internal lifecycle/event/notification payloads.

Relevant current files:

- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts`
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts`
- `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`

Constraints:

- Do not change task lifecycle semantics.
- Do not change input schemas.
- Do not remove rich fields from internal task delegation event payloads, notification metadata, websocket payloads, or ledger records.
- Do not keep old verbose fields in public tool results as compatibility aliases.

## Intended Change

Complete the public result cleanup for all three task lifecycle tools.

Target `delegate_task` public result remains:

```ts
type DelegateTaskResult =
  | { task_id: string; status: "active" }
  | { task_id: string; status: "not_started"; message: string };
```

Target `submit_task_result` public result:

```ts
type SubmitTaskResultResult = {
  task_id: string;
  status: "awaiting_review";
  message?: string;
};
```

Runtime output must omit `message` when notification delivery succeeds. If result submission is recorded but reviewer/delegator notification delivery fails, `message` contains the concise delivery failure reason.

Target `review_task_result` public result is tightened further to remove the caller-selected `decision` echo:

```ts
type ReviewTaskResultResult =
  | { task_id: string; status: "accepted" }
  | { task_id: string; status: "active"; message?: string };
```

`message` semantics:

- `delegate_task`: present only when activation fails and the task remains `not_started`; message is the activation failure reason. Do not call this target rejection.
- `submit_task_result`: present only when the submission records successfully but reviewer/delegator notification delivery fails.
- `review_task_result`: present only when the review records successfully but revision notification delivery fails.
- Hard tool failures still use the existing error payload path.
- `review_task_result` does not return `decision`; the caller already chose the decision, and `status` is the meaningful resulting state.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change / public tool contract cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, small boundary issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with a small shared-structure tightness component.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small in-place refactor.
- Evidence: Public tool results should be task-centered. `submit_task_result` still exposes `submission_id`, `notification_delivered`, and raw `warnings`, which are internal lifecycle/audit details. This is inconsistent with the already-approved meaningful-result cleanup for delegate/review.
- Design response: Keep authoritative task lifecycle ownership in `TaskDelegationService`; change `SubmitTaskResultResult` and `publishSubmissionTransition` public return mapping. Preserve internal event/notification/ledger richness.
- Refactor rationale: The public result DTOs should be semantically tight: task id, status, and optional message only when meaningful. Caller-selected decisions should not be echoed.
- Intentional deferrals and residual risk, if any: None for task lifecycle public result cleanup; all three lifecycle tool public outputs are now in scope.

## Terminology

- Public tool result: the JSON object returned to the agent that invoked a task lifecycle tool.
- Internal lifecycle payload: task delegation ledger/event/notification/websocket data used for runtime routing, UI projection, diagnostics, and audit.
- Message: an optional public advisory string attached to a successful tool result only when there is a meaningful lifecycle issue to report.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove old verbose public fields from all three task lifecycle results.
- Obsolete public fields in scope:
  - `delegate_task`: `target`, `execution_kind`, `task_agent_run_id`, `task_team_run_id`, `activation_accepted`, `message: null` on success.
  - `submit_task_result`: `submission_id`, `notification_delivered`, `warnings`.
  - `review_task_result`: `decision`, `review_id`, `reviewed_submission_id`, `notification_delivered`, `settlement_requested`, `warnings`.
- Do not keep compatibility wrappers, aliases, or duplicate old/new result shapes.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent invokes `delegate_task` | Agent receives minimal task activation result | `TaskDelegationService` | Defines public result contract for task activation. |
| DS-002 | Primary End-to-End | Task execution invokes `submit_task_result` | Task execution receives minimal submission result | `TaskDelegationService` | Defines public result contract for result submission. |
| DS-003 | Primary End-to-End | Agent invokes `review_task_result` | Agent receives minimal review result | `TaskDelegationService` | Defines public result contract for review acceptance/revision. |
| DS-004 | Return-Event | Task lifecycle transition | Internal task delegation event/notification payload | `TaskDelegationEventPublisher` / `TaskDelegationNotificationDispatcher` | Ensures rich internal payloads remain unchanged despite public result simplification. |

## Primary Execution Spine(s)

`delegate_task`: `Agent tool call -> TaskDelegationTool parser/manifest -> TaskDelegationToolService -> TaskDelegationService.delegateTask -> ActivationCoordinator/ledger -> Minimal DelegateTaskResult`

`submit_task_result`: `Task execution tool call -> TaskDelegationTool parser/manifest -> TaskDelegationToolService -> TaskDelegationService submit route -> Ledger submission transition + notification side effect -> Minimal SubmitTaskResultResult`

`review_task_result`: `Agent tool call -> TaskDelegationTool parser/manifest -> TaskDelegationToolService -> TaskDelegationService.reviewTaskResult -> Ledger/review transition + notification/settlement side effects -> Minimal ReviewTaskResultResult`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The caller provides target and task description. The parser validates input, the tool service routes to the correct team-run service, the task service creates and activates the task, then projects only task id/status/message to the caller. | Tool call, parser/manifest, tool service, task service, activation coordinator, public result | `TaskDelegationService` | Target resolution, run identity allocation, internal event publication. |
| DS-002 | The task execution submits a result. The task service resolves the bound task, records the submission, publishes internal state, notifies the reviewer/delegator, then returns only task id/status/message. | Tool call, parser/manifest, task service, ledger submission transition, notification, public result | `TaskDelegationService` | Task-agent/task-team context routing, notification delivery, internal event publication. |
| DS-003 | The reviewer submits a decision for a pending task. The task service authorizes the reviewer, records the review, publishes internal state, performs notification/settlement side effects, then returns only task id/status/message. | Tool call, parser/manifest, task service, ledger review transition, notification/settlement, public result | `TaskDelegationService` | Notification delivery, settlement coordinator, internal event publication. |
| DS-004 | Internal transitions continue emitting rich records for runtime and UI consumers; those fields do not leak back through normal public tool results. | Lifecycle transition, event publisher, notification dispatcher, stream/projector consumers | `TaskDelegationEventPublisher` / `TaskDelegationNotificationDispatcher` | Event payload shape, metadata, diagnostics, frontend projection. |

## Spine Actors / Main-Line Nodes

- Agent/tool call: initiates the public task lifecycle command.
- Task delegation parser/manifest: validates the public input contract and dispatches to the service.
- `TaskDelegationToolService`: resolves the correct task delegation service for the current run context.
- `TaskDelegationService`: authoritative owner for lifecycle transition and public tool result projection.
- `TaskDelegationLedger`: internal owner for task delegation record state.
- `TaskDelegationNotificationDispatcher`: internal owner for delivery outcomes and warning construction.
- `TaskDelegationEventPublisher`: internal owner for rich lifecycle events.

## Ownership Map

| Node | Owns |
| --- | --- |
| Tool parser/schema files | Public input argument validation and advertised schema only. |
| `TaskDelegationToolService` | Runtime service routing for tool calls; not result-shape policy. |
| `TaskDelegationService` | Task lifecycle command semantics, authorization, state transition sequencing, and public tool result projection. |
| `TaskDelegationLedger` | Durable in-memory task delegation records and status/review/submission transitions. |
| `TaskDelegationNotificationDispatcher` | Delivery of result/revision notifications and internal warning construction. |
| `TaskDelegationEventPublisher` | Rich internal team-run event payloads. |

`TaskDelegationService` remains the authoritative boundary for public result projection because callers above it should not compose public output from its activation coordinator, notification dispatcher, or ledger internals.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `DelegateTaskTool` / `SubmitTaskResultTool` / `ReviewTaskResultTool` | `TaskDelegationService` via `TaskDelegationToolService` | Native AutoByteus tool class and JSON serialization boundary | Lifecycle semantics or field-selection policy beyond serializing returned result. |
| `TASK_DELEGATION_TOOL_MANIFEST` | `TaskDelegationToolService` / `TaskDelegationService` | Registers parser/schema/execute entries for all task delegation tools | Internal lifecycle state or result field policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `DelegateTaskResult.target` | Echoes caller input; not needed for next action. | Minimal `DelegateTaskResult` in `task-delegation-record.ts` | Already implemented / retain | Keep target in ledger/events. |
| `DelegateTaskResult.execution_kind`, `task_agent_run_id`, `task_team_run_id` | Internal routing/debug identity; not public continuation data. | Internal event/metadata payloads retain identities. | Already implemented / retain | Do not remove from websocket/event payloads. |
| `DelegateTaskResult.activation_accepted` | Duplicates `status`; product wording should not imply target rejection. | `status` + optional activation-failure `message`. | Already implemented / retain | Use activation failure wording only. |
| `SubmitTaskResultResult.submission_id` | Internal audit/correlation id; reviewer uses `task_id`. | Internal submitted event/notification metadata retains submission id. | In This Change | Tests should obtain submission ids from events/metadata when needed. |
| `SubmitTaskResultResult.notification_delivered` | Side-effect telemetry; success is noisy. | Optional public `message` only on delivery failure. | In This Change | Keep notification outcome internally. |
| `SubmitTaskResultResult.warnings` array | Internal warning object includes route/run ids and is empty on success. | Optional concise `message`. | In This Change | Do not expose route/run ids publicly. |
| `ReviewTaskResultResult.decision` | Echoes caller input; status already communicates the resulting state. | Status only. | In This Change | Remove from public result; keep decision in internal review/event payloads. |
| `ReviewTaskResultResult.review_id`, `reviewed_submission_id` | Internal audit ids; not needed for agent continuation. | Internal review/event payloads retain ids. | Already implemented / retain | Keep event coverage. |
| `ReviewTaskResultResult.notification_delivered` | Side-effect telemetry; success/null is noisy. | Optional public `message` only on delivery failure. | Already implemented / retain | Do not expose route/run ids in public message. |
| `ReviewTaskResultResult.settlement_requested` | Internal lifecycle scheduling; agent should not act on it. | Internal settlement coordinators/events. | Already implemented / retain | Acceptance still triggers settlement request. |
| `ReviewTaskResultResult.warnings` array | Internal warning object includes route/run ids and is empty on success. | Optional concise `message`. | Already implemented / retain | `TaskDelegationWarning` remains internal. |

## Return Or Event Spine(s) (If Applicable)

Internal submitted/reviewed/status event spines remain:

`Ledger transition -> TaskDelegationEventPublisher -> TeamRun TASK_DELEGATION event -> streaming/projection consumers`

Notification spine remains:

`Submission/review transition -> TaskDelegationNotificationDispatcher -> target postMessage/postMessageToTaskTeamInstance -> internal delivery outcome`

Only public return projection changes:

`TaskDelegationService lifecycle result -> minimal public result object -> tool serialization/MCP effective-result projection -> calling agent Activity/tool output`

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `TaskDelegationService.publishSubmissionTransition`

`Submission transition -> publish submitted/status events -> notify reviewer/delegator -> derive optional message -> build minimal public result`

Why it matters: the public `message` for submit should be derived only after notification side effects, while internal events must still publish rich submission data.

Parent owner: `TaskDelegationService.reviewTaskResult`

`Review transition -> publish reviewed/status events -> branch by decision -> notify revision target or request settlement -> build minimal public result`

Why it matters: the public `message` for review should be derived only after notification side effects, while internal events must still publish rich transition data before result projection.

Parent owner: `TaskDelegationService.delegateTask`

`Create ledger record -> activate task -> inspect current ledger status -> build minimal public result`

Why it matters: status must come from the authoritative ledger record after activation, while message should only appear for `not_started` activation failure.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Input parsing/schema | DS-001, DS-002, DS-003 | Tool manifest / parser | Keep public arguments strict and unchanged | Prevents input contract drift while result changes. | Mixing parser with result policy would blur responsibilities. |
| Activation identity allocation | DS-001, DS-004 | Activation coordinator | Allocate/bind task-agent or task-team identities | Needed for runtime execution and events. | Returning these identities publicly keeps internal routing details in agent output. |
| Submission id creation | DS-002, DS-004 | Ledger | Record/audit each submitted result | Needed for internal event/notification correlation. | Returning submission id publicly encourages agents to reason about audit internals. |
| Internal event publication | DS-004 | Event publisher | Emit rich transition payloads | UI projection/audit need rich metadata. | Shrinking events with public result would break routing/projection. |
| Notification delivery outcome | DS-002, DS-003, DS-004 | Notification dispatcher / TaskDelegationService | Detect delivery failure and provide concise public message | Caller needs to know if notification did not reach target. | Exposing raw warning objects leaks internal route/run ids. |
| Settlement request | DS-003 | Settlement coordinators | Safely settle accepted task executions | Internal lifecycle cleanup. | Exposing `settlement_requested` encourages agents to reason about internals. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Public tool result shape | Task delegation DTO/service files | Extend | Existing DTO/service files already own this contract. | N/A |
| Internal rich events | Task delegation event publisher | Reuse | Already owns event payload richness. | N/A |
| Notification failure details | Task delegation notification dispatcher | Reuse | Already produces delivery outcome/warning. | N/A |
| Optional message projection | `TaskDelegationService` | Extend | Service sees lifecycle status plus notification/activation outcomes and owns public result projection. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent tools task delegation | Tool names, schemas, parsing, native tool serialization | DS-001, DS-002, DS-003 | Tool facade | Reuse | No input schema change. |
| Agent-team task delegation | Lifecycle command handling, DTOs, ledger, activation, submission, review | DS-001, DS-002, DS-003, DS-004 | `TaskDelegationService` | Extend | Public result DTOs become minimal for all three tools. |
| Agent-team event/notification | Internal event payloads and system notifications | DS-004 | Event publisher / notification dispatcher | Reuse | Preserve rich internal payloads. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-record.ts` | Agent-team task delegation | DTO/type owner | Tighten `SubmitTaskResultResult` public result shape and remove `decision` from `ReviewTaskResultResult`; keep internal DTOs rich. | Existing DTO owner for task delegation. | Existing task status types; internal decision type remains for records/events. |
| `task-delegation-service.ts` | Agent-team task delegation | Lifecycle/public result owner | Return minimal public submit result and derive optional `message`; remove `decision` from public review returns. | Existing authoritative lifecycle service. | Existing notification outcome helper. |
| Unit/integration/e2e tests | Test suites | Coverage owner | Update submit public-result expectations and review public-result expectations; preserve internal submission id/decision/metadata assertions. | Existing focused coverage. | N/A |
| Docs under `autobyteus-server-ts/docs` / `autobyteus-ts/docs` | Documentation | Durable behavior docs | Update statements that claim submit/review tool results expose `notification_delivered` / `warnings[]` / submission ids / decision echoes. | Existing docs mention old result fields. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Minimal public result projection | None; keep inside `TaskDelegationService` | Agent-team task delegation | Three local branches with distinct lifecycle semantics; generic extraction would obscure meaning. | Yes | Yes | Generic tool-result mapper. |
| Optional message inclusion | None; inline or small private method in `TaskDelegationService` | Agent-team task delegation | Semantics differ for activation failure vs submit/review notification failure. | Yes | Yes | Shared helper that hides lifecycle meaning. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `DelegateTaskResult` | Yes | Yes | Low | Keep only `task_id`, `status`, optional `message`. |
| `SubmitTaskResultResult` | Yes after change | Yes | Low | Keep only `task_id`, `status`, optional `message`. |
| `ReviewTaskResultResult` | Yes after change | Yes | Low | Keep only `task_id`, `status`, optional `message`; remove caller-selected `decision` echo. |
| Internal event payload DTOs | Yes | N/A | Low | Preserve rich fields because they serve routing/audit/projection. |
| `TaskDelegationWarning` | Yes internally | N/A | Low | Keep for internal outcomes; do not expose in submit/review public results. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Agent-team task delegation | DTO/type owner | Update `SubmitTaskResultResult` to minimal public result type and remove `decision` from `ReviewTaskResultResult`. Preserve internal record/event/notification DTOs. | Existing task delegation type owner. | Existing status aliases; internal review decision type. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Agent-team task delegation | Authoritative lifecycle service | Build minimal public submit result; include `message` only for notification delivery failure; remove `decision` from public review returns. | Existing owner sees all required lifecycle outcomes. | Existing notification outcome helper. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Tests | Unit lifecycle coverage | Update submit/review public service result expectations; keep internal metadata/event assertions. | Existing focused tests. | N/A |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Tests | Integration tool lifecycle coverage | Update submit result expectations for task-agent and task-team ingress paths, plus review result expectations without `decision`. | Existing integration coverage. | N/A |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` and provider converter tests if affected | Tests | Runtime/API/E2E coverage | Update any assertions or fixtures that include old verbose submit public result fields or review decision echo. | Existing runtime coverage. | N/A |
| Relevant docs found by `rg` | Documentation | Durable docs | Update old statements that tool results expose notification/warning/submission fields or review decision echoes. | Existing docs ownership. | N/A |

## Ownership Boundaries

`TaskDelegationService` is the authoritative public command boundary. It may consult activation, ledger, notification, and settlement internals, but callers and tool facades must not depend on those internals for public result composition.

Internal event and notification owners remain authoritative for their payloads. Public tool result cleanup must not shrink those payloads because stream projection, task-team routing, audit, and diagnostic behavior depend on them.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService.delegateTask` | Ledger create, target resolution, activation coordinator, event publishing | `TaskDelegationToolService`, tool manifest/classes | Tool facade directly reading activation coordinator/ledger to build public output | Add/adjust service return projection. |
| `TaskDelegationService.submitTaskAgentResult` / `submitTaskTeamIngressResult` via `publishSubmissionTransition` | Bound task resolution, ledger submission transition, result-submitted notification, event publishing | `TaskDelegationToolService`, tool manifest/classes | Tool facade exposing submission id or notification warning internals as public result | Add/adjust service return projection. |
| `TaskDelegationService.reviewTaskResult` | Ledger review transition, notification dispatcher, settlement coordinators, event publisher | `TaskDelegationToolService`, tool manifest/classes | Tool facade exposing notification outcome or settlement internals as public result | Add/adjust service return projection. |
| `TaskDelegationEventPublisher` | Rich event payload construction | Team run / streaming consumers | Public tool result DTO reused as internal event payload | Keep separate event DTOs. |

## Dependency Rules

Allowed:

- Tool facades call the manifest/tool service and serialize returned result.
- `TaskDelegationToolService` routes to `TaskDelegationService`.
- `TaskDelegationService` calls internal ledger/activation/notification/settlement/event owners and builds public results.
- Event/notification owners continue to use rich internal DTOs.

Forbidden:

- Do not make tool classes or manifest entries strip fields after receiving verbose service results. That would put public result policy in a facade.
- Do not remove internal event/notification fields just because they are removed from public results.
- Do not preserve old public fields behind compatibility flags or aliases.
- Do not expose raw `TaskDelegationWarning` arrays through `submit_task_result` or `review_task_result` public output.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `parseDelegateTaskInput` | `delegate_task` input | Validate and normalize public input | `{ target: { kind, name }, description, reference_files? }` | Unchanged. |
| `parseSubmitTaskResultInput` | `submit_task_result` input | Validate and normalize public input | `{ message, reference_files? }` | Unchanged. |
| `parseReviewTaskResultInput` | `review_task_result` input | Validate and normalize public input | `{ task_id, decision, comment?, reference_files? }` | Unchanged. |
| `TaskDelegationService.delegateTask` | Delegated task creation/activation | Create, activate, and return minimal public result | `TaskDelegationContext` + `DelegateTaskInput` | Public result does not expose activation internals. |
| `TaskDelegationService.submitTaskAgentResult` / `submitTaskTeamIngressResult` | Delegated task result submission | Record submission, notify reviewer/delegator, and return minimal public result | `TaskDelegationContext` + `SubmitTaskResultInput` plus bound task-agent/task-team context | Public result must not expose submission/notification internals. |
| `TaskDelegationService.reviewTaskResult` | Delegated task review | Review latest submission and return minimal public result | `TaskDelegationContext` + `ReviewTaskResultInput` | Public result does not expose review/notification/settlement internals. |
| `TaskDelegationEventPublisher` methods | Internal lifecycle events | Emit rich event payloads | Team run + record/transition | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegate_task` input | Yes | Yes | Low | None. |
| `submit_task_result` input | Yes | Yes; bound context resolves task id | Low | None. |
| `review_task_result` input | Yes | Yes | Low | None. |
| `DelegateTaskResult` | Yes | Yes | Low | Already minimal. |
| `SubmitTaskResultResult` | Yes after change | Yes | Low | Remove old verbose fields. |
| `ReviewTaskResultResult` | Yes after change | Yes | Low | Remove `decision`; keep only task id/status/message. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `DelegateTaskResult` | Keep | Yes | Low | Keep public-result meaning only. |
| `SubmitTaskResultResult` | Keep existing awkward name for scope minimization | Partially | Low | Rename not required; avoid widening scope. |
| `ReviewTaskResultResult` | Keep existing awkward name for scope minimization | Partially | Low | Rename not required; remove redundant decision field. |
| `message` | Optional public advisory field | Yes | Low | Use for activation failure or notification/lifecycle issue only. |

## Applied Patterns (If Any)

- Facade: native tool classes remain thin facades that serialize service results.
- Authoritative service boundary: `TaskDelegationService` owns lifecycle sequencing and public result projection.
- Event publisher pattern: internal rich event construction remains in `TaskDelegationEventPublisher`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | File | Task delegation DTO owner | Minimal public result types and unchanged internal DTOs | Existing location for task delegation records/results | Compatibility duplicate old result type. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | File | Task lifecycle service | Public result projection after lifecycle transitions | Existing authoritative service | Facade-only result stripping in tool layer. |
| `autobyteus-server-ts/tests/...` | Files | Test coverage | Update public and internal contract assertions | Existing focused test suites | Tests that accept both old and new public outputs. |
| `autobyteus-server-ts/docs/...`, `autobyteus-ts/docs/...` | Files | Docs | Update durable docs that describe old public fields | Existing docs own user/developer-facing contracts | Claims that submit/review tool results expose `notification_delivered`, `warnings[]`, or submission ids as public output. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-tools/task-delegation` | Transport/tool facade | Yes | Low | Keep as parser/schema/facade. No result policy moved here. |
| `src/agent-team-execution/task-delegation` | Main-line domain-control plus internal event concerns | Yes | Low | Existing compact task delegation folder is appropriate for narrow scope. |
| Test folders | Mixed justified by test level | Yes | Low | Update existing coverage rather than adding artificial new structure. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Successful delegate result | `{ "task_id": "task_0001", "status": "active" }` | `{ "target": ..., "task_agent_run_id": ..., "activation_accepted": true, "message": null }` | Shows caller-only result. |
| Activation failure result | `{ "task_id": "task_0001", "status": "not_started", "message": "Task activation failed." }` | `{ "activation_accepted": false, "message": "Rejected" }` | Avoids target-rejection language. |
| Successful submit result | `{ "task_id": "task_0001", "status": "awaiting_review" }` | `{ "submission_id": "task_0001_submission_0001", "notification_delivered": true, "warnings": [] }` | Submission/audit/notification internals stay hidden. |
| Submit notification failure | `{ "task_id": "task_0001", "status": "awaiting_review", "message": "No recipient" }` | `{ "warnings": [{ "target_member_route_key": ..., "target_task_agent_run_id": ... }] }` | Message gives useful information without leaking routing internals. |
| Successful review accept | `{ "task_id": "task_0001", "status": "accepted" }` | `{ "task_id": "task_0001", "status": "accepted", "decision": "accept" }` | The caller chose `accept`; the return should not echo it. |
| Revision notification failure | `{ "task_id": "task_0001", "status": "active", "message": "No recipient" }` | `{ "task_id": "task_0001", "status": "active", "decision": "request_revision", "warnings": [...] }` | Message gives useful information without leaking routing internals or echoing input. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old fields plus new minimal fields | Could avoid breaking tests/unknown callers | Rejected | Replace public DTO/output shape and update tests/docs. |
| Tool-layer post-processing to strip service result | Avoids changing service return DTO | Rejected | Service is authoritative boundary and should return correct public shape. |
| Add feature flag for verbose result | Debug convenience | Rejected | Use internal events/logs/debug history for verbose data, not normal public result. |
| Preserve `warnings` array for submit/review failures | Existing shape already available | Rejected | Public result uses concise `message`; internal warning remains internal. |
| Preserve `decision` on `review_task_result` | It can confirm which branch ran | Rejected | Remove it because it only echoes caller input; `status` is the meaningful resulting state. |

## Derived Layering (If Useful)

- Tool facade layer: input schema/parser and serialization.
- Domain lifecycle layer: `TaskDelegationService` and internals.
- Internal event/notification layer: rich runtime payloads.
- Public result projection sits at the domain lifecycle boundary before returning to the tool facade.

## Migration / Refactor Sequence

1. Preserve existing minimal `DelegateTaskResult` shape.
2. Tighten `ReviewTaskResultResult` further by removing `decision`; keep `task_id`, `status`, and optional `message` only for revision notification delivery failure.
3. Update `SubmitTaskResultResult` in `task-delegation-record.ts` to `{ task_id: string; status: "awaiting_review"; message?: string }`.
4. Update `TaskDelegationService.publishSubmissionTransition`:
   - return `{ task_id, status: "awaiting_review" }` when notification delivery succeeds;
   - include `message` from notification warning when notification delivery fails;
   - do not return `submission_id`, `notification_delivered`, or `warnings`.
5. Keep internal event publisher, notification metadata, ledger record, and result-submitted payload behavior unchanged except where type compile errors require explicitly retaining internal DTOs.
6. Update unit/integration/e2e tests that assert public submit results.
7. Retain or strengthen tests that assert internal rich event/metadata fields such as `submissionId` remain present.
8. Update durable docs that describe old submit/review public result fields.

## Key Tradeoffs

- The public tool result becomes consistent across all task lifecycle tools, but external consumers relying on verbose submit/review fields will need to use internal event/history surfaces instead.
- Keeping public result projection inside `TaskDelegationService` avoids facade stripping, but it makes the service responsible for a small output-shaping concern. This is appropriate because the service owns lifecycle semantics and sees notification outcomes.

## Risks

- Hidden external consumers may expect old verbose `submit_task_result` fields. The requirement explicitly rejects compatibility retention.
- Tests may currently use public `submission_id` to assert later review behavior. Those tests should switch to internal event payloads, notification metadata, or deterministic ledger-derived expectations rather than public tool output.
- Documentation references to `notification_delivered`/`warnings[]`/`submission_id` must be found and updated to avoid stale contract docs.
- Because the requirement gap arrived after downstream implementation/code review/delivery work, downstream artifact reports must be refreshed after reimplementation.

## Guidance For Implementation

- Keep input parser/schema files unchanged unless type-only imports need adjustment.
- Prefer building the minimal submit object directly in `TaskDelegationService.publishSubmissionTransition` rather than creating a generic mapper.
- Use the existing `notificationWarningMessage` helper for submit notification failure messages if suitable.
- Successful submit results should not contain `message: null`, `message: undefined`, `submission_id`, `notification_delivered`, or `warnings: []`.
- For submit notification failure, map `TaskDelegationWarning.message` to public `message`; do not expose `target_member_route_key`, `target_task_agent_run_id`, or `target_task_team_run_id`.
- Remove `decision` from `ReviewTaskResultResult` and `TaskDelegationService.reviewTaskResult` public returns, but preserve `decision` in internal `TaskResultReview` and `TaskDelegationResultReviewedPayload`.
- Preserve all rich fields in `TaskDelegationResultSubmittedPayload`, notification metadata, and websocket stream payloads.
- After code changes, run focused task delegation unit/integration tests first, then rerun affected provider/event/runtime tests according to downstream coverage investigation.
