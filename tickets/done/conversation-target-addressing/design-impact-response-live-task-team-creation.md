# Design Impact Response — Live Task-Team Creation For Conversation Target Addressing

## Trigger

API/E2E live `open_tab` validation could not complete the user-requested task-team-child click/send because no real task-team projection could be created through the live frontend/backend path.

Observed attempts:

1. Codex GPT-5.5 coordinator: the visible composer send succeeded, but the coordinator reported that `delegate_task` was not exposed.
2. AutoByteus GPT-5.5 coordinator: the runtime instruction advertised `BuildSquad` as a valid team target and the coordinator invoked `delegate_task`, but tool execution failed with `TASK_TEAM_TARGET_NOT_FOUND` for `BuildSquad`.

Evidence artifacts:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-ui-click-open-tab-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-ui-click-evidence/open-tab-failure-summary.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/live-ui-click-evidence/open-tab-task-team-delegate-failure.png`

## Decision

Real UI task-team creation through a supported `delegate_task` runtime is in scope as a no-regression and validation precondition for conversation-target-addressing.

This does **not** change the core conversation target design:

- The address model remains recursive typed `ConversationTargetAddress` segments.
- Ordinary chat remains separate from task lifecycle commands.
- The websocket handler still must not manufacture task-team projections or bypass runtime owners.

It does add a narrow implementation requirement:

- If an AutoByteus native coordinator exposes `delegate_task` and advertises a visible team target, the native tool execution context must preserve the visible `agent_team` descriptor metadata needed for `TaskDelegationInputResolver.resolveTeamTarget(...)` to resolve that team target.

Codex app-server coordinators are not required by this ticket to expose `delegate_task`. The live UI validation path should use a runtime family that actually exposes task delegation in the local setup; the observed supported runtime family is AutoByteus native.

## Required Design Clarification

`buildAutoByteusManagedTeamContext(...)` currently serializes `members` as generic rows containing only:

- `memberName`
- `memberPath`
- `memberRouteKey`
- `memberRunId`

That is insufficient for team targets. The native AutoByteus context must preserve the same semantic distinction that already exists in `MemberTeamContext.members` and in the task-delegation tool context:

- agent member rows: `memberKind: 'agent'`, route/path/run identity, `runtimeKind`, role, description;
- team member rows: `memberKind: 'agent_team'`, route/path/run identity, `teamDefinitionId`, optional `childTeamRunId`, optional `coordinatorMemberRouteKey`, role, description, and ingress/representative identity.

The parser side (`task-delegation-autobyteus-context.ts`) must normalize and validate those typed rows into `TaskDelegationContextMember` values. It must not silently turn an advertised team row into an agent row because `memberKind` was dropped.

## Implementation Guidance

Preferred implementation shape:

1. Update `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-managed-team-context-builder.ts` so native `customData.teamContext.members` carries typed member/team descriptors.
2. Update or complete `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-autobyteus-context.ts` so it consumes that typed descriptor shape.
3. Consider extracting a focused task-delegation descriptor mapper if otherwise duplicating `MemberTeamDescriptor -> TaskDelegationContextMember` logic from `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts`.
4. Add durable tests proving an AutoByteus native context with `BuildSquad` as an `agent_team` lets `delegate_task` resolve the team target, and proving malformed missing team metadata fails clearly.
5. After implementation and code review, API/E2E should rerun the real `open_tab` UI flow: create projection through the visible composer, click a task-team child, send from the composer, and verify `conversation_target_address` segments.

## Worktree Note

No production-source diff remains from the API/E2E diagnostic edit. The implementation owner should start from committed source and add the AutoByteus managed context builder / native context parser / durable tests intentionally. The known committed blocker is that the AutoByteus managed context builder still serializes visible members as generic rows and drops `agent_team` metadata.

## Updated Upstream Artifacts

- Requirements amended: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/requirements.md`
- Investigation notes amended: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/investigation-notes.md`
- Design spec amended: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-target-addressing/tickets/in-progress/conversation-target-addressing/design-spec.md`
