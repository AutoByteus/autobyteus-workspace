# Requirement Gap: Delegated Task Reference Files And Arguments

## Summary

During implementation/live UI feedback for the Team tab Active Tasks improvement, the user asked whether delegated tasks consider task-level reference files and arguments. The current approved design and current frontend active-task projection do not cover that data.

## User Feedback That Triggered The Gap

The user explained that delegated tasks are task-oriented work items: a task has a description and may also have reference files/attachments and arguments. Team messages already support message content plus reference files, so the Active Tasks UI/functionality should not lose equivalent delegated-task context.

The user also asked whether the delegated task body should be reframed as a "message" rather than a "description".

## Current Implementation Evidence

- `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts`
  - `TaskDelegationProjectionDetails` currently extracts only `taskId`, `taskLabel`, `taskDescription`, `taskTargetKind`, `taskTargetName`, and `taskExecutionStatus` from `TASK_DELEGATION_EVENT`.
  - Extra payload fields are not retained.
- `autobyteus-web/types/agent/AgentTeamContext.ts`
  - `TeamMemberNodeBase` has delegated-task fields for identity/status/description/target, but no task reference-files or task arguments fields.
- `autobyteus-web/utils/teamActiveTaskEntries.ts`
  - `ActiveTaskEntry` exposes task description, target, run ID, status, and members; no task reference-files or task arguments are available to the row UI.
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
  - `TaskDelegationEventPayload` allows unknown fields through `[key: string]: any`, but the projection does not normalize any reference-files/arguments contract.
  - `TeamCommunicationMessagePayload` and `InterAgentMessagePayload` do model message reference files, which is a separate communication-message path.
- The approved design explicitly reused `teamActiveTaskEntries.ts` unchanged and scoped out backend/projection contract changes, so this gap is outside the reviewed implementation scope.

## Recommendation

Route this back through solution design before adding fields ad hoc in the component.

Recommended semantics:

1. Keep the delegated work item modeled as a **task**, not as a generic **message**.
   - A task owns work-item state: target member/team, execution status, result/review flow, approval context, task ID/run ID, and lifecycle.
   - A message owns communication context: sender, receiver, content, timestamp, and message-level reference files.
   - Delegation may be delivered by/alongside a message, but the Active Tasks panel should display task metadata rather than converting the task to a message concept.
2. Keep the data field concept as `taskDescription` or consider a UI/domain wording like **task instruction** / **task brief** if clearer.
   - The UI can omit the visible "Description" label because the paragraph is self-evident.
   - Renaming the concept to `message` would blur task lifecycle and communication boundaries.
3. Add a designed delegated-task metadata contract for task reference files and task arguments.
   - Decide whether they come from `TASK_DELEGATION_EVENT`, a linked team communication message, the delegation tool-call arguments, or a normalized backend task record.
   - Then extend the projection (`TaskDelegationProjectionDetails` -> `TeamMemberNodeBase` -> `ActiveTaskEntry`) and the Active Tasks row UI to render them.
4. Align display behavior with existing message reference-file affordances where possible, but keep ownership separate from `TeamCommunicationPanel` selection/detail state.

## Implementation Status At Reroute

Local UI polish work is in progress for the already-reviewed scope:

- Removed redundant visible `Task`/`Description` label from the Active Task expanded body.
- Removed redundant `Open conversation` button from Active Task rows.
- Made target/member affordances look more clickable.

Those UI changes do not solve the task reference-files/arguments gap because the active-task data model currently does not carry that metadata.
