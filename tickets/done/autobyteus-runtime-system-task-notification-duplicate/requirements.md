# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by user on 2026-06-29.

## Goal / Problem Statement

Fix the AutoByteus-runtime-specific duplicate delegated-task activation display in the Nested Classroom Test. When Teacher delegates a task to `StudentStudyGroup` and `student_one` receives the task-team work packet, AutoByteus runtime with DeepSeek 4.0 Flash currently shows the same activation payload both as an ordinary visible member/user input and as a purple `System Task Notification`. Codex and Claude Agent SDK paths do not show that AutoByteus-only duplicate because they do not run the AutoByteus `SenderType.SYSTEM` semantic notification pipeline.

## Investigation Findings

- The reported screenshots match the code path where `TaskDelegationActivationCoordinator` sends the task-team work packet as `AgentInputUserMessage(..., SenderType.SYSTEM, metadata.message_type="task_team_delegation_work_packet")`.
- The mixed-team backend also emits accepted member inputs as `MEMBER_INPUT_MESSAGE` so recipient leaf transcripts can show the input that caused the reply.
- AutoByteus runtime has an additional runtime-level behavior in `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`: every `SenderType.SYSTEM` input emits `AGENT_DATA_SYSTEM_TASK_NOTIFICATION_RECEIVED`, which becomes `SYSTEM_TASK_NOTIFICATION` and renders as `SystemTaskNotificationSegment` in the web UI.
- Therefore the same task work packet reaches the UI through two visible surfaces for AutoByteus: backend member-input echo and AutoByteus runtime semantic notification. Codex and Claude do not emit the AutoByteus runtime semantic notification, so they do not duplicate in the same way.
- The observed run data confirms the work packet was ingested as the first AutoByteus user trace with the `**[System Notification]**` prompt header in `raw_traces.jsonl`, and server logs show `student_one_9cc0c3bb8758450eae60a4974f4a0398` emitted `agent_data_system_task_notification_received` immediately after `agent_turn_started`.
- Prior accepted architecture for self-evolution notifications already established the relevant invariant: UI notifications should use runtime-neutral local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` events, not runtime `postUserMessage(... SenderType.SYSTEM ...)` / model-input injection as the UI notification mechanism.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `TaskDelegationActivationCoordinator` owns task work-packet creation; `MixedAgentMemberHandle`/team stream owns accepted member-input projection; AutoByteus `AgentInputPipeline` independently turns the same `SenderType.SYSTEM` input into a UI notification event; web handlers render both payloads.
- Requirement or scope impact: The fix must separate model-consumed task packet delivery from user-visible notification projection and must be runtime-neutral across AutoByteus, Codex, and Claude.

## Recommendations

- Make server-owned task-delegation notification projection the canonical visible UI path for task work packets and task delegation notifications.
- Keep the task work packet delivered to the model/runtime, but do not also render the same server-authored task packet as an ordinary member/user input in live team transcripts.
- Suppress AutoByteus runtime's generic `SenderType.SYSTEM` semantic notification for server-owned task-delegation messages that the server has already projected as UI notifications.
- Reuse the existing `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` / WebSocket `SYSTEM_TASK_NOTIFICATION` / `SystemTaskNotificationSegment` capability instead of adding a new frontend visual primitive.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Nested Classroom Test team-target delegation from `Teacher` to `StudentStudyGroup`, with `student_one` as task-team ingress coordinator, using AutoByteus runtime and DeepSeek 4.0 Flash.
- UC-002: Same team-target delegation path using Codex runtime.
- UC-003: Same team-target delegation path using Claude Agent SDK runtime.
- UC-004: Member-target and team-target server-owned task-delegation system messages that are delivered as runtime/model input and may also need a user-visible notification.
- UC-005: Live team WebSocket routing to focused/nested task-team leaf conversations.

## Out of Scope

- Changing the mathematical task contents, the StudentStudyGroup instructions, or the task lifecycle protocol (`delegate_task`, `submit_task_result`, `review_task_result`).
- Removing the model-consumed task work packet from the runtime/LLM context.
- Reworking the full durable run-history projection model for persisted notification events, unless required to prevent same-session duplicate rendering.
- Broad changes to Codex or Claude runtime input formatting unrelated to task notification duplication.

## Functional Requirements

- REQ-001: A server-owned task-delegation work packet or task-delegation notification MUST have exactly one user-visible live notification surface in the target member/team conversation.
- REQ-002: The model/runtime MUST still receive the full task work packet contents needed to execute the delegated task and call the lifecycle tools.
- REQ-003: AutoByteus runtime MUST NOT emit an additional visible `SYSTEM_TASK_NOTIFICATION` for server-owned task-delegation messages that are already projected by the server/UI notification path.
- REQ-004: Backend member-input echo projection MUST remain available for ordinary user messages and inter-agent deliveries, because those are the canonical transcript source for accepted recipient-side inputs.
- REQ-005: The fix MUST apply consistently to task-agent and task-team delegation targets, including nested task-team ingress members.
- REQ-006: The fix MUST preserve existing `SYSTEM_TASK_NOTIFICATION` rendering for legitimate runtime-neutral local notification events such as self-evolution notifications.
- REQ-007: The fix MUST not regress task execution: the Nested Classroom geometry task should still be solved and submitted through `submit_task_result`.

## Acceptance Criteria

- AC-001: In a live AutoByteus + DeepSeek Nested Classroom task-team delegation run, `student_one` shows one visible task activation notification for the work packet, not both a plain member/user input and a purple `System Task Notification` with the same payload.
- AC-002: In equivalent Codex and Claude Agent SDK Nested Classroom task-team delegation runs, the target member/team conversation also shows no duplicate activation payload.
- AC-003: The AutoByteus target agent still receives enough task content to solve the right-triangle task and call `submit_task_result` with the three expected answers: hypotenuse `15 cm`, area `54 cm²`, perimeter `36 cm`.
- AC-004: Ordinary user sends and inter-agent `send_message_to` deliveries still produce recipient-side member input transcript entries with stable `message_id`/`dedupe_key` behavior.
- AC-005: Existing self-evolution or other runtime-neutral local `SYSTEM_TASK_NOTIFICATION` events still render as `SystemTaskNotificationSegment`.
- AC-006: Targeted backend/frontend tests prove that server-owned task-delegation system messages are not double-rendered and that ordinary member-input projection is unchanged.

## Constraints / Dependencies

- The model-consumed task packet and visible notification are related but not the same ownership concern.
- Existing team stream routing relies on `source_path`, `task_team_run_id`, and task-team relative member identity for nested team projections.
- AutoByteus raw traces may continue to contain the model-consumed task input; preventing duplicate live UI rendering does not require removing required model context.
- No backward-compatibility dual path should be introduced for the duplicate rendering behavior.

## Assumptions

- The intended UX is one visible task activation entry per recipient conversation, with `System Task Notification` preferred for server-authored task lifecycle notifications.
- It is acceptable for durable history to show the model-consumed task input as a single historical prompt until/unless a separate durable notification-history design is requested.
- Existing `SYSTEM_TASK_NOTIFICATION` handlers can be reused for both standalone and team streams.

## Risks / Open Questions

- If task-delegation notification projection is made live-only, refreshed run history may not use the same visual component unless a durable notification event is later persisted.
- The AutoByteus generic `SenderType.SYSTEM` notification behavior may still be used by older paths; the suppression must be scoped to server-owned task-delegation messages, not blanket-remove all system notifications without review.
- Need implementation confirmation of the exact best owner for server-side notification emission in mixed member/task-team paths.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Yes | Yes | Yes | Yes | Yes |
| REQ-002 | Yes | Yes | Yes | Yes | Yes |
| REQ-003 | Yes | No | No | Yes | Yes |
| REQ-004 | Yes | Yes | Yes | Yes | Yes |
| REQ-005 | Yes | Yes | Yes | Yes | Yes |
| REQ-006 | Yes | Yes | Yes | Yes | Yes |
| REQ-007 | Yes | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Directly verifies the user's reported AutoByteus duplicate is gone. |
| AC-002 | Prevents a runtime-specific fix that creates duplicates in Codex/Claude. |
| AC-003 | Ensures notification UI cleanup does not remove required runtime task context. |
| AC-004 | Protects existing team communication/member-input transcript behavior. |
| AC-005 | Protects the already-accepted runtime-neutral notification path. |
| AC-006 | Gives downstream coverage owners concrete durable test obligations. |

## Approval Status

Approved by user on 2026-06-29.
