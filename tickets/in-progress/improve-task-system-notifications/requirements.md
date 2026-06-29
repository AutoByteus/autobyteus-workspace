# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Backend-generated system task notifications for delegated-task lifecycle messages currently expose the same machine/protocol-oriented content that is sent to the target runtime/model. For `delegate_task`, `submit_task_result`, and `review_task_result` follow-up flows, the visible transcript notification should read naturally to humans and receiving agents, similar to ordinary inter-agent message surfaces, while the runtime/model input remains focused on actionable task/review instructions.

The change must verify and correct how task-delegation notifications are generated and delivered for both individual agent targets and agent-team targets. In this same ticket, rename the `review_task_result` free-text argument from `message` to `comment`, because that text is a review comment attached to a lifecycle decision rather than ordinary agent-to-agent message delivery.

## Investigation Findings

- Task delegation is server-owned in `autobyteus-server-ts/src/agent-team-execution/task-delegation`.
- The `delegate_task` activation path creates a detailed work-packet `AgentInputUserMessage` in `TaskDelegationActivationCoordinator.buildWorkPacketMessage(...)`, using `TaskDelegationWorkPacketRenderer.render(...)` as the message content.
- The `submit_task_result` and `review_task_result(decision="request_revision")` follow-up paths use `TaskDelegationNotificationDispatcher` to build system messages for result-submitted and revision-requested notifications.
- All task-delegation system messages are marked by `markTaskDelegationSystemTaskNotificationMetadata(...)`, which also sets generic AutoByteus system-task-notification suppression metadata.
- In mixed agent/team execution, `MixedAgentMemberHandle.postMessage(...)` forwards stamped task-delegation system messages to the runtime and then emits a local `SYSTEM_TASK_NOTIFICATION` event using `buildTaskDelegationSystemTaskNotificationEvent(...)` instead of publishing a duplicate `MEMBER_INPUT_MESSAGE`.
- `buildTaskDelegationSystemTaskNotificationEvent(...)` currently sets the visible event payload `content` directly to `message.content`. That couples the runtime/model instruction packet to the human-visible notification surface.
- Current activation work packets include internal/runtime terms such as `target_agent_run_id`, `Task-team run ID`, `Task-agent`, `Task-team`, `Lifecycle instructions`, framework/internal state wording, and tool protocol instructions. Current result/revision notification content includes `Execution kind`, exact run IDs, JSON examples for `review_task_result`, and `send_message_to` protocol warnings. These are useful for model/tool behavior, but poor as visible system notification copy.
- Ordinary inter-agent delivery already separates recipient model input from communication/event display payloads via `buildRecipientVisibleInterAgentMessageContent(...)` and `TeamRunCommunicationEventPayload.content`. Task delegation should follow the same separation principle rather than using one content string for both concerns.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `task-delegation-system-message-visibility.ts` uses runtime/model message content as the visible notification event content; work-packet and lifecycle notification renderers currently mix model action instructions with transcript notification copy.
- Requirement or scope impact: Requirements must separate runtime/model input content from visible `SYSTEM_TASK_NOTIFICATION` display content without weakening task lifecycle routing, tool instructions, suppression behavior, or target identity handling.

## Recommendations

- Add an explicit task-delegation visible-notification content path owned by the task-delegation subsystem.
- Treat task-delegation agent-facing copy as an actionable task/review surface, not a debug dump and not sender-centered messaging: include task content, task id where the receiving agent must reference it, review comments/instructions, decision/status, and reference files; keep delegator/sender/receiver names out of the visible text by default unless a specific action genuinely requires a name. Keep submission ids, review ids, execution kind, task-agent run ids, task-team run ids, task-team instance ids, and routing metadata out of visible text unless a specific model action requires them.
- Preserve backend metadata/events/tool-result fields that are needed for routing, correlation, diagnostics, status projection, or exact-run addressing, but do not expose those fields in the human/agent-facing notification text by default.
- Make `review_task_result.comment` the canonical model-facing review feedback/instruction field in this ticket; do not leave `message` as a parallel accepted alias.
- Preserve the existing detailed runtime/model message content only where it is truly needed for the execution target to act; remove non-actionable internal identifiers from the model-facing work-packet/review-notification content too, not only from the UI display copy.
- Stamp each task-delegation system message with a concise, natural display-content field in metadata, and update `buildTaskDelegationSystemTaskNotificationEvent(...)` to prefer that display content over `message.content` when building the frontend/system-notification event.
- Centralize human-facing task-delegation notification copy in a dedicated renderer instead of duplicating strings across activation and notification dispatcher paths.
- Update unit/integration/E2E expectations so durable coverage protects the new actionable-content boundary.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A coordinator delegates a task to an individual agent member.
- UC-002: A coordinator delegates a task to an agent-team/subteam target.
- UC-003: A task-agent or task-team ingress submits a result for delegator review.
- UC-004: The original delegator requests revision through `review_task_result` using `comment` for the revision feedback/instructions.
- UC-006: The original delegator accepts a submitted result through `review_task_result` using optional `comment` for acceptance feedback.
- UC-005: The frontend receives `SYSTEM_TASK_NOTIFICATION` events for the above flows.

## Out of Scope

- Changing task-delegation routing, ledger states, task execution identity allocation, or settlement behavior.
- Removing task/tool instructions from the actual runtime/model input content.
- Redesigning the frontend `SystemTaskNotificationSegment` UI beyond consuming the improved backend `content` payload.
- Changing ordinary `send_message_to` communication delivery.
- Adding new delegation tools.
- Changing model-facing tool schemas beyond the in-scope `review_task_result.message` to `review_task_result.comment` rename.

## Functional Requirements

- **FR-001:** For task-delegation activation to an individual agent, the visible `SYSTEM_TASK_NOTIFICATION.content` must use concise task-centered wording that describes the task, task identity, and reference files without mentioning the delegator/sender by default and without exposing task-agent run IDs, internal lifecycle mechanics, or tool-call protocol text.
- **FR-002:** For task-delegation activation to an agent-team target, the visible `SYSTEM_TASK_NOTIFICATION.content` must use concise task-centered wording that describes the task, accountable team only when useful for the team context, task identity, and reference files without mentioning the delegator/sender by default and without exposing task-team run IDs, ingress routing internals, child-run mechanics, or tool-call protocol text.
- **FR-003:** For `submit_task_result`, the visible notification to the original delegator must state naturally that a task result is ready for review, include the task id, task context, submitted result content, and reference files, and avoid sender/receiver framing, submission id, execution kind, run ids, review ids, and tool-protocol details.
- **FR-004:** For `review_task_result(decision="request_revision")`, the visible notification to the task execution target must state naturally that the task needs revision, include the task id, task context, review comment/instructions, and reference files, and avoid sender/reviewer framing, review id, reviewed submission id, execution kind, run ids, and tool-protocol details.
- **FR-005:** The `review_task_result` model-facing schema, parser, manifest/prompt wording, runtime instructions, and examples must use `comment` instead of `message` for the reviewer's task-specific free-text feedback/instructions, because the text is a review comment attached to a task lifecycle decision rather than an ordinary delivered message. The old `message` argument must be removed from the accepted model-facing schema rather than retained as a compatibility alias.
- **FR-010:** Tool parameter descriptions and runtime instruction text for `delegate_task.description` and `review_task_result.comment` must frame those fields as task-centered content. `delegate_task.description` should ask for the objective, context, constraints, done conditions, expected output, and reference guidance for the task itself. `review_task_result.comment` should ask for acceptance feedback or revision instructions about the task result itself. Neither schema description should encourage ordinary sender/recipient message wording.
- **FR-006:** Runtime/model input content delivered to task agents and task-team ingress contexts must remain actionable, but must not include internal lifecycle identifiers unless the receiving model needs that exact field to perform a supported action.
- **FR-007:** The task-delegation subsystem must be the owner of the human-visible notification text for task-delegation system notifications; frontend handlers should not infer/rewrite task-delegation copy from raw model input.
- **FR-008:** Generic AutoByteus system-task-notification suppression and mixed leaf de-duplication must remain intact: a stamped task-delegation system message must produce exactly one visible `SYSTEM_TASK_NOTIFICATION` event and no duplicate `MEMBER_INPUT_MESSAGE` echo for the same payload.
- **FR-009:** Notification delivery outcomes, warnings, task-delegation events, ledger transitions, and target identity metadata used for routing/debugging must remain available to backend code and tool results even though visible content is cleaned up.

## Acceptance Criteria

- **AC-001:** When `delegate_task` targets an individual agent, the emitted `SYSTEM_TASK_NOTIFICATION.content` includes a natural task summary and the task description, but does **not** mention who delegated/sent it and does **not** contain `target_agent_run_id`, `task_agent_run_id`, `Task-agent run`, `Execution kind`, `Lifecycle instructions`, `submit_task_result`, `review_task_result`, JSON tool-call examples, or `send_message_to` protocol warnings.
- **AC-002:** When `delegate_task` targets an agent-team, the emitted `SYSTEM_TASK_NOTIFICATION.content` includes a natural task summary and the task description, but does **not** mention who delegated/sent it and does **not** contain `task_team_run_id`, `Task-team run ID`, `task_team_instance_id`, `Ingress coordinator`, `Execution kind`, `Lifecycle instructions`, `submit_task_result`, `review_task_result`, JSON tool-call examples, or `send_message_to` protocol warnings.
- **AC-003:** When `submit_task_result` succeeds, the visible notification sent to the original delegator includes the submitted result content and any reference files, but does **not** use sender/receiver phrasing and does **not** contain submission id, review id, runtime execution IDs, `Execution kind`, JSON `review_task_result(...)` snippets, or `send_message_to` warnings.
- **AC-004:** When `review_task_result` requests revision, the visible notification sent to the execution target includes the revision review comment/instructions and any reference files, but does **not** use sender/reviewer phrasing and does **not** contain review id, reviewed submission id, runtime execution IDs, `Execution kind`, JSON/tool protocol snippets, or `send_message_to` warnings.
- **AC-005:** Tool schema, manifest/prompt wording, parser, and serialization tests use `comment` for `review_task_result` free text; `message` is not retained as a parallel accepted argument.
- **AC-010:** Tool schema/manifest/runtime-instruction tests verify `delegate_task.description` and `review_task_result.comment` descriptions are task-centered and do not frame those fields as ordinary messages from one agent to another.
- **AC-006:** Unit coverage proves `buildTaskDelegationSystemTaskNotificationEvent(...)` uses the task-delegation display-content override when present and falls back to `message.content` for existing stamped messages without an override.
- **AC-007:** Service-level tests prove runtime/model `AgentInputUserMessage.content` remains actionable while both model-facing and emitted local system-notification content omit non-actionable internal identifiers.
- **AC-008:** Existing no-duplicate behavior remains covered: accepted stamped task-delegation messages still produce one `SYSTEM_TASK_NOTIFICATION` surface and no duplicate `MEMBER_INPUT_MESSAGE` surface.
- **AC-009:** Existing task-delegation lifecycle tests still pass for delegate activation, result submission, revision request, acceptance, notification delivery warnings, and task-agent/task-team target routing.

## Constraints / Dependencies

- Must preserve existing delegation routing and delivery semantics.
- Must account for delegation targets that can be individual agent members or agent teams.
- Must preserve task-delegation metadata used by backend routing, warnings, and debugging.
- Must not rely on frontend heuristics to hide backend-generated protocol text.
- Must not introduce backward-compatibility dual surfaces for visible notifications; use one canonical visible content field/path for task-delegation notifications.

## Assumptions

- “System notification” refers to the backend-emitted `SYSTEM_TASK_NOTIFICATION` event rendered by `SystemTaskNotificationSegment` in the conversation transcript.
- Task IDs are acceptable in visible copy as task-domain identifiers; execution/run IDs and raw tool-call protocol text are not acceptable in visible notification copy.
- The receiving runtime/model still needs detailed lifecycle/tool instructions, so the fix should split display content from runtime content rather than only simplifying `message.content`.

## Risks / Open Questions

- If downstream product preference wants task IDs hidden as well, the visible renderer can be adjusted; current requirements keep task IDs for correlation.
- Frontend snapshot tests may need updates if they assert exact content shape, although investigation found frontend mostly passes through backend payload content.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 individual agent delegation | FR-001, FR-006, FR-007, FR-008, FR-009, FR-010 |
| UC-002 agent-team delegation | FR-002, FR-006, FR-007, FR-008, FR-009, FR-010 |
| UC-003 result submitted for review | FR-003, FR-006, FR-007, FR-008, FR-009 |
| UC-004 revision requested | FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010 |
| UC-005 frontend receives system notification event | FR-001, FR-002, FR-003, FR-004, FR-007, FR-008 |
| UC-006 acceptance feedback comment | FR-005, FR-006, FR-009, FR-010 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Protect natural visible copy for individual-agent activation. |
| AC-002 | Protect natural visible copy for agent-team activation. |
| AC-003 | Protect natural visible copy for submitted-result review notification. |
| AC-004 | Protect natural visible copy for revision-request notification. |
| AC-005 | Protect the `review_task_result.comment` schema and prompt terminology. |
| AC-006 | Protect the new content-selection boundary. |
| AC-007 | Prove model/runtime content remains actionable while non-actionable internals are omitted. |
| AC-008 | Prevent regression to duplicate visible surfaces. |
| AC-009 | Prevent lifecycle/routing regressions. |
| AC-010 | Protect task-centered tool parameter descriptions and runtime instruction wording. |

## Approval Status

Approved by user in conversation on 2026-06-29; user confirmed continuation after adding `review_task_result.comment` to scope.
