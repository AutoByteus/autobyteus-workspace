# Design Spec

## Current-State Read

The task delegation tools are implemented under `autobyteus-server-ts/src/agent-tools/task-delegation` and route through `TaskDelegationToolService` to `TaskDelegationService` in `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`.

Current input boundaries are healthy:

- `delegate_task` parser/schema accepts only `target`, `description`, and optional `reference_files`.
- `review_task_result` parser/schema accepts only `task_id`, `decision`, optional `comment`, and optional `reference_files`; `comment` is required for `request_revision`.

Current output boundaries are too close to internal lifecycle DTOs:

- `DelegateTaskResult` currently exposes `target`, `execution_kind`, `task_agent_run_id`, `task_team_run_id`, `activation_accepted`, and `message: null` on normal success.
- `ReviewTaskResultResult` currently exposes `review_id`, `reviewed_submission_id`, `notification_delivered`, `settlement_requested`, and `warnings: []` on normal success.

These fields are useful in internal events, notifications, stream projection, diagnostics, or tests, but they are not meaningful next-step information for the calling agent. The calling agent needs task-level continuation facts: generated task id, resulting status, review decision where applicable, and an optional message only when a successful tool call has an important lifecycle issue to report.

Relevant current files:

- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts`
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts`

Constraints:

- Do not change task lifecycle semantics.
- Do not change input schemas.
- Do not remove rich fields from internal task delegation event payloads, notification metadata, websocket payloads, or ledger records.
- Do not keep old verbose fields in the public tool result as compatibility aliases.

## Intended Change

Replace the agent-facing public result shapes for `delegate_task` and `review_task_result` with minimal task-level results.

Target `delegate_task` public result:

```ts
type DelegateTaskResult =
  | { task_id: string; status: "active" }
  | { task_id: string; status: "not_started"; message: string };
```

Target `review_task_result` public result:

```ts
type ReviewTaskResultResult =
  | { task_id: string; status: "accepted"; decision: "accept"; message?: string }
  | { task_id: string; status: "active"; decision: "request_revision"; message?: string };
```

Implementation can express these as a single object type with optional `message`, but runtime output must omit `message` when there is no meaningful message.

`message` semantics:

- `delegate_task`: present only when activation fails and the task remains `not_started`; message is the activation failure reason. Do not call this target rejection.
- `review_task_result`: present only when the review records successfully but an important lifecycle side effect, currently notification delivery, fails. Hard tool failures still use the existing error payload path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change / public tool contract cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, small boundary issue.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with a small shared-structure tightness component.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small in-place refactor.
- Evidence: The public tool result currently mirrors internal activation/review/notification/settlement state. Production searches show execution identities and review ids are needed in event/stream paths, but not as normal tool-return continuation data.
- Design response: Keep authoritative task lifecycle ownership in `TaskDelegationService`; change only the DTOs and return mapping at the public tool result boundary. Preserve internal event/notification/ledger richness.
- Refactor rationale: Public result DTOs should be semantically tight: one result field should mean one thing to the calling agent. Old fields such as `target`, `activation_accepted`, `notification_delivered`, and `settlement_requested` are either input echoes, derived from status, or internal side-effect telemetry.
- Intentional deferrals and residual risk, if any: `submit_task_result` output simplification is out of scope. It has similar notification fields, but the user explicitly scoped this kickoff to `delegate_task` and `review_task_result`.

## Terminology

- Public tool result: the JSON object returned to the agent that invoked `delegate_task` or `review_task_result`.
- Internal lifecycle payload: task delegation ledger/event/notification/websocket data used for runtime routing, UI projection, diagnostics, and audit.
- Message: an optional public advisory string attached to a successful tool result only when there is a meaningful lifecycle issue to report.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove old verbose public fields from `DelegateTaskResult` and `ReviewTaskResultResult` outputs.
- Obsolete public fields in scope:
  - `delegate_task`: `target`, `execution_kind`, `task_agent_run_id`, `task_team_run_id`, `activation_accepted`, `message: null` on success.
  - `review_task_result`: `review_id`, `reviewed_submission_id`, `notification_delivered`, `settlement_requested`, `warnings`.
- Do not keep compatibility wrappers, aliases, or duplicate old/new result shapes.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Agent invokes `delegate_task` | Agent receives minimal task activation result | `TaskDelegationService` | Defines public result contract for task activation. |
| DS-002 | Primary End-to-End | Agent invokes `review_task_result` | Agent receives minimal review result | `TaskDelegationService` | Defines public result contract for review acceptance/revision. |
| DS-003 | Return-Event | Task lifecycle transition | Internal task delegation event/notification payload | `TaskDelegationEventPublisher` / `TaskDelegationNotificationDispatcher` | Ensures rich internal payloads remain unchanged despite public result simplification. |

## Primary Execution Spine(s)

`delegate_task`: `Agent tool call -> TaskDelegationTool parser/manifest -> TaskDelegationToolService -> TaskDelegationService.delegateTask -> ActivationCoordinator/ledger -> Minimal DelegateTaskResult`

`review_task_result`: `Agent tool call -> TaskDelegationTool parser/manifest -> TaskDelegationToolService -> TaskDelegationService.reviewTaskResult -> Ledger/review transition + notification/settlement side effects -> Minimal ReviewTaskResultResult`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The caller provides target and task description. The parser validates input, the tool service routes to the correct team-run service, the task service creates and activates the task, then projects only task id/status/message to the caller. | Tool call, parser/manifest, tool service, task service, activation coordinator, public result | `TaskDelegationService` | Target resolution, run identity allocation, internal event publication. |
| DS-002 | The reviewer submits a decision for a pending task. The task service authorizes the reviewer, records the review, publishes internal state, performs notification/settlement side effects, then returns only task id/status/decision/message. | Tool call, parser/manifest, task service, ledger review transition, notification/settlement, public result | `TaskDelegationService` | Notification delivery, settlement coordinator, internal event publication. |
| DS-003 | Internal transitions continue emitting rich records for runtime and UI consumers; those fields do not leak back through normal public tool results. | Lifecycle transition, event publisher, notification dispatcher, stream/projector consumers | `TaskDelegationEventPublisher` / `TaskDelegationNotificationDispatcher` | Event payload shape, metadata, diagnostics, frontend projection. |

## Spine Actors / Main-Line Nodes

- Agent tool call: initiates the public task lifecycle command.
- Task delegation parser/manifest: validates the public input contract and dispatches to the service.
- `TaskDelegationToolService`: resolves the correct task delegation service for the current run context.
- `TaskDelegationService`: authoritative owner for lifecycle transition and public tool result projection.
- `TaskDelegationActivationCoordinator`: internal owner for starting task-agent/task-team execution.
- `TaskDelegationLedger`: internal owner for task delegation record state.
- `TaskDelegationEventPublisher` / `TaskDelegationNotificationDispatcher`: internal return/event owners.

## Ownership Map

| Node | Owns |
| --- | --- |
| Tool parser/schema files | Public input argument validation and advertised schema only. |
| `TaskDelegationToolService` | Runtime service routing for tool calls; not result-shape policy. |
| `TaskDelegationService` | Task lifecycle command semantics, authorization, state transition sequencing, and public tool result projection. |
| `TaskDelegationActivationCoordinator` | Internal activation mechanics, run identity binding, activation failure capture, activation event publication trigger. |
| `TaskDelegationLedger` | Durable in-memory task delegation records and status/review/submission transitions. |
| `TaskDelegationEventPublisher` | Rich internal team-run event payloads. |
| `TaskDelegationNotificationDispatcher` | Delivery of result/revision notifications and internal warning construction. |

`TaskDelegationService` remains the authoritative boundary for public result projection because callers above it should not compose public output from its activation coordinator, notification dispatcher, or ledger internals.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `DelegateTaskTool` / `ReviewTaskResultTool` | `TaskDelegationService` via `TaskDelegationToolService` | Native AutoByteus tool class and JSON serialization boundary | Lifecycle semantics or field-selection policy beyond serializing returned result. |
| `TASK_DELEGATION_TOOL_MANIFEST` | `TaskDelegationToolService` / `TaskDelegationService` | Registers parser/schema/execute entries for all task delegation tools | Internal lifecycle state or result field policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `DelegateTaskResult.target` | Echoes caller input; not needed for next action. | Minimal `DelegateTaskResult` in `task-delegation-record.ts` | In This Change | Keep target in ledger/events. |
| `DelegateTaskResult.execution_kind`, `task_agent_run_id`, `task_team_run_id` | Internal routing/debug identity; not public continuation data. | Internal event/metadata payloads retain identities. | In This Change | Do not remove from websocket/event payloads. |
| `DelegateTaskResult.activation_accepted` | Duplicates `status`; product wording should not imply target rejection. | `status` + optional activation-failure `message`. | In This Change | Use activation failure wording only. |
| `DelegateTaskResult.message: null` on success | Null noise. | Omit `message` unless meaningful. | In This Change | Ensure serialization omits absent field. |
| `ReviewTaskResultResult.review_id`, `reviewed_submission_id` | Internal audit ids; not needed for agent continuation. | Internal review/event payloads retain ids. | In This Change | Keep event coverage. |
| `ReviewTaskResultResult.notification_delivered` | Side-effect telemetry; success/null is noisy. | Optional public `message` only on delivery failure. | In This Change | Do not expose route/run ids in public message. |
| `ReviewTaskResultResult.settlement_requested` | Internal lifecycle scheduling; agent should not act on it. | Internal settlement coordinators/events. | In This Change | Acceptance still triggers settlement request as today. |
| `ReviewTaskResultResult.warnings` array | Internal warning object includes route/run ids and is empty on success. | Optional concise `message`. | In This Change | `TaskDelegationWarning` remains for internals and `submit_task_result`. |

## Return Or Event Spine(s) (If Applicable)

Internal event spine remains:

`Ledger transition -> TaskDelegationEventPublisher -> TeamRun TASK_DELEGATION event -> streaming/projection consumers`

Notification spine remains:

`Review/submission transition -> TaskDelegationNotificationDispatcher -> target postMessage/postMessageToTaskTeamInstance -> internal delivery outcome`

Only the public return projection changes:

`TaskDelegationService lifecycle result -> minimal public result object -> tool serialization/MCP effective-result projection -> calling agent Activity/tool output`

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `TaskDelegationService.reviewTaskResult`

`Review transition -> publish reviewed/status events -> branch by decision -> notify revision target or request settlement -> build minimal public result`

Why it matters: the public `message` for review should be derived only after notification side effects, while internal events must still publish rich transition data before result projection.

Parent owner: `TaskDelegationService.delegateTask`

`Create ledger record -> activate task -> inspect current ledger status -> build minimal public result`

Why it matters: status must come from the authoritative ledger record after activation, while message should only appear for `not_started` activation failure.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Input parsing/schema | DS-001, DS-002 | Tool manifest / parser | Keep public arguments strict and unchanged | Prevents input contract drift while result changes. | Mixing parser with result policy would blur responsibilities. |
| Activation identity allocation | DS-001, DS-003 | Activation coordinator | Allocate/bind task-agent or task-team identities | Needed for runtime execution and events. | Returning these identities publicly keeps internal routing details in agent output. |
| Internal event publication | DS-003 | Event publisher | Emit rich transition payloads | UI projection/audit need rich metadata. | Shrinking events with public result would break routing/projection. |
| Notification delivery outcome | DS-002, DS-003 | Notification dispatcher / TaskDelegationService | Detect delivery failure and provide concise public message | Caller needs to know if a revision notification did not reach target. | Exposing raw warning objects leaks internal route/run ids. |
| Settlement request | DS-002 | Settlement coordinators | Safely settle accepted task executions | Internal lifecycle cleanup. | Exposing `settlement_requested` encourages agents to reason about internals. |

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
| Agent tools task delegation | Tool names, schemas, parsing, native tool serialization | DS-001, DS-002 | Tool facade | Reuse | No input schema change. |
| Agent-team task delegation | Lifecycle command handling, DTOs, ledger, activation, review | DS-001, DS-002, DS-003 | `TaskDelegationService` | Extend | Public result DTOs become minimal. |
| Agent-team event/notification | Internal event payloads and system notifications | DS-003 | Event publisher / notification dispatcher | Reuse | Preserve rich internal payloads. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-record.ts` | Agent-team task delegation | DTO/type owner | Tighten `DelegateTaskResult` and `ReviewTaskResultResult` public result shapes; keep internal DTOs intact. | Existing DTO owner for task delegation. | Existing task status/decision types. |
| `task-delegation-service.ts` | Agent-team task delegation | Lifecycle/public result owner | Return minimal public result objects and derive optional `message`. | Existing authoritative lifecycle service. | Existing notification outcome and activation result. |
| `task-delegation-activation-coordinator.ts` | Agent-team task delegation | Activation internal owner | Optionally include operation code fallback in activation message and/or tighten internal activation result if implementer chooses. | Existing activation owner. | Existing activation result type. |
| Unit/integration/e2e tests | Test suites | Coverage owner | Update public-result expectations; preserve internal-rich-payload expectations. | Existing focused coverage. | N/A |
| Docs under `autobyteus-server-ts/docs` / `autobyteus-ts/docs` | Documentation | Durable behavior docs | Update statements that claim review tool results expose `notification_delivered` / `warnings[]`. | Existing docs mention old result fields. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Minimal public result projection | None; keep inside `TaskDelegationService` | Agent-team task delegation | Only two local call sites; extraction would be unnecessary indirection. | Yes | Yes | Generic tool-result mapper. |
| Optional message inclusion | None; inline or small private methods in `TaskDelegationService` | Agent-team task delegation | Semantics differ for activation failure vs review notification failure. | Yes | Yes | Shared helper that hides lifecycle meaning. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `DelegateTaskResult` | Yes after change | Yes | Low | Keep only `task_id`, `status`, optional `message`. |
| `ReviewTaskResultResult` | Yes after change | Yes | Low | Keep only `task_id`, `status`, `decision`, optional `message`. |
| Internal event payload DTOs | Yes | N/A | Low | Preserve rich fields because they serve routing/audit/projection. |
| `TaskDelegationWarning` | Yes internally | N/A | Low | Keep for internal outcomes and existing `submit_task_result`; do not expose in review public result. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Agent-team task delegation | DTO/type owner | Update `DelegateTaskResult` and `ReviewTaskResultResult` to minimal public result types. Preserve internal record/event/notification DTOs. | Existing task delegation type owner. | Existing status and decision aliases. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Agent-team task delegation | Authoritative lifecycle service | Build minimal public results for delegate/review; include `message` only for activation failure or review notification failure. | Existing owner sees all required lifecycle outcomes. | Existing activation/notification outcomes. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Agent-team task delegation | Internal activation owner | Ensure activation failure has a useful message fallback if backend returns no message; optional internal activation-result tightening. | Existing activation owner. | Existing operation result fields. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Tests | Unit lifecycle coverage | Update public service result expectations; keep internal metadata/event assertions. | Existing focused tests. | N/A |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Tests | Integration tool lifecycle coverage | Update manifest/tool-service result expectations for member/team/nested/failure cases. | Existing integration coverage. | N/A |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` and provider converter tests if affected | Tests | Runtime/API/E2E coverage | Update any assertions or fixtures that include old verbose public tool result fields. | Existing runtime coverage. | N/A |
| Relevant docs found by `rg` | Documentation | Durable docs | Update old statements that tool results expose notification/warning fields. | Existing docs ownership. | N/A |

## Ownership Boundaries

`TaskDelegationService` is the authoritative public command boundary. It may consult activation, ledger, notification, and settlement internals, but callers and tool facades must not depend on those internals for public result composition.

Internal event and notification owners remain authoritative for their payloads. The public tool result cleanup must not shrink those payloads because stream projection, task-team routing, audit, and diagnostic behavior depend on them.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService.delegateTask` | Ledger create, target resolution, activation coordinator, event publishing | `TaskDelegationToolService`, tool manifest/classes | Tool facade directly reading activation coordinator/ledger to build public output | Add/adjust service return projection. |
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
- Do not expose raw `TaskDelegationWarning` arrays through `review_task_result` public output.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `parseDelegateTaskInput` | `delegate_task` input | Validate and normalize public input | `{ target: { kind, name }, description, reference_files? }` | Unchanged. |
| `parseReviewTaskResultInput` | `review_task_result` input | Validate and normalize public input | `{ task_id, decision, comment?, reference_files? }` | Unchanged. |
| `TaskDelegationService.delegateTask` | Delegated task creation/activation | Create, activate, and return minimal public result | `TaskDelegationContext` + `DelegateTaskInput` | Public result no longer exposes activation internals. |
| `TaskDelegationService.reviewTaskResult` | Delegated task review | Review latest submission and return minimal public result | `TaskDelegationContext` + `ReviewTaskResultInput` | Public result no longer exposes review/notification/settlement internals. |
| `TaskDelegationEventPublisher` methods | Internal lifecycle events | Emit rich event payloads | Team run + record/transition | Unchanged. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegate_task` input | Yes | Yes | Low | None. |
| `review_task_result` input | Yes | Yes | Low | None. |
| `DelegateTaskResult` | Yes after change | Yes | Low | Remove old verbose fields. |
| `ReviewTaskResultResult` | Yes after change | Yes | Low | Replace warnings/telemetry with optional message. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `DelegateTaskResult` | Keep | Yes | Low | Meaning becomes public result only; avoid stuffing internal activation DTO fields back in. |
| `ReviewTaskResultResult` | Keep existing awkward name for scope minimization | Partially | Low | Rename not required; avoid widening scope. |
| `message` | Proposed optional public advisory field | Yes | Low | Use for activation failure or notification/lifecycle issue only. |

## Applied Patterns (If Any)

- Facade: native tool classes remain thin facades that serialize the service result.
- Authoritative service boundary: `TaskDelegationService` owns lifecycle sequencing and public result projection.
- Event publisher pattern: internal rich event construction remains in `TaskDelegationEventPublisher`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | File | Task delegation DTO owner | Minimal public result types and unchanged internal DTOs | Existing location for task delegation records/results | Compatibility duplicate old result type. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | File | Task lifecycle service | Public result projection after lifecycle transitions | Existing authoritative service | Facade-only result stripping in tool layer. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | File | Activation owner | Activation failure message quality/fallback if needed | Existing activation mechanic owner | Public result field policy beyond activation outcome. |
| `autobyteus-server-ts/tests/...` | Files | Test coverage | Update public and internal contract assertions | Existing focused test suites | Tests that accept both old and new public outputs. |
| `autobyteus-server-ts/docs/...`, `autobyteus-ts/docs/...` | Files | Docs | Update durable docs that describe old public fields | Existing docs own user/developer-facing contracts | Claims that review tool results expose `notification_delivered` and `warnings[]`. |

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
| Successful review accept | `{ "task_id": "task_0001", "status": "accepted", "decision": "accept" }` | `{ "review_id": ..., "settlement_requested": true, "warnings": [] }` | Settlement/audit internals stay hidden. |
| Revision notification failure | `{ "task_id": "task_0001", "status": "active", "decision": "request_revision", "message": "No recipient" }` | `{ "warnings": [{ "target_member_route_key": ..., "target_task_agent_run_id": ... }] }` | Message gives useful information without leaking routing internals. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old fields plus new minimal fields | Could avoid breaking tests/unknown callers | Rejected | Replace public DTO/output shape and update tests/docs. |
| Tool-layer post-processing to strip service result | Avoids changing service return DTO | Rejected | Service is authoritative boundary and should return correct public shape. |
| Add feature flag for verbose result | Debug convenience | Rejected | Use internal events/logs/debug history for verbose data, not normal public result. |
| Preserve `warnings` array for review failures | Existing shape already available | Rejected | Public result uses concise `message`; internal warning remains internal. |

## Derived Layering (If Useful)

- Tool facade layer: input schema/parser and serialization.
- Domain lifecycle layer: `TaskDelegationService` and internals.
- Internal event/notification layer: rich runtime payloads.
- Public result projection sits at the domain lifecycle boundary before returning to the tool facade.

## Migration / Refactor Sequence

1. Update `DelegateTaskResult` and `ReviewTaskResultResult` in `task-delegation-record.ts` to the minimal public result contracts.
2. Update `TaskDelegationService.delegateTask`:
   - return `{ task_id, status: "active" }` on active success;
   - return `{ task_id, status: "not_started", message }` on activation failure;
   - omit `message` on success;
   - do not return target/execution/run-id/activation fields.
3. Ensure activation failure message is non-empty. Use existing activation message, backend operation code if available, or a deterministic fallback such as `Task activation failed.`.
4. Update `TaskDelegationService.reviewTaskResult`:
   - return `{ task_id, status: "active", decision: "request_revision" }` when revision notification succeeds;
   - include `message` from notification warning when notification delivery fails;
   - return `{ task_id, status: "accepted", decision: "accept" }` on acceptance;
   - do not return review/submission ids, notification booleans, settlement booleans, or warning arrays.
5. Keep internal event publisher, notification metadata, ledger record, and settlement behavior unchanged except where type compile errors require explicitly retaining internal DTOs.
6. Update unit/integration/e2e tests that assert public tool results.
7. Retain or strengthen tests that assert internal rich event/metadata fields remain present.
8. Update durable docs that describe old public result fields.

## Key Tradeoffs

- The public tool result becomes much easier for agents to reason about, but external consumers relying on verbose fields will need to use internal event/history surfaces instead.
- Keeping public result projection inside `TaskDelegationService` avoids facade stripping, but it makes the service responsible for a small output-shaping concern. This is appropriate because the service already owns lifecycle semantics and knows which side effects matter to the caller.
- Not changing `submit_task_result` avoids scope creep, though it may warrant a future similar cleanup.

## Risks

- Hidden external consumers may expect old verbose fields. The requirement explicitly rejects compatibility retention.
- Tests may currently use public result run ids to locate task-agent/task-team runs. Those tests should switch to backend start records, internal events, or task directories rather than public tool output.
- Documentation references to `notification_delivered`/`warnings[]` must be found and updated to avoid stale contract docs.

## Guidance For Implementation

- Keep input parser/schema files unchanged unless type-only imports need adjustment.
- Prefer building the minimal object directly in `TaskDelegationService` rather than creating a broad generic mapper.
- Use object spread only for optional `message` when non-empty; successful results should not contain `message: null`, `message: undefined`, `warnings: []`, or booleans that only confirm internal side effects.
- For review notification failure, map the first/current `TaskDelegationWarning.message` to public `message`; do not expose `target_member_route_key`, `target_task_agent_run_id`, or `target_task_team_run_id`.
- Preserve all rich fields in `TaskDelegationActivationPayload`, `TaskDelegationStatusUpdatePayload`, `TaskDelegationResultSubmittedPayload`, `TaskDelegationResultReviewedPayload`, notification metadata, and websocket stream payloads.
- After code changes, run focused task delegation unit/integration tests first, then broader affected runtime/provider tests according to downstream coverage investigation.
