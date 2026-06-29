# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; requirements approved by user on 2026-06-29; design spec approved by user on 2026-06-29 for team workflow kickoff; architecture reviewer handoff delivered.
- Investigation Goal: Determine why AutoByteus runtime surfaces delegated task activation text twice in the Nested Classroom Test while Codex and Claude Agent SDK runtimes reportedly do not, then define the behavioral requirements for a safe fix.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The defect crosses task delegation, mixed team member input projection, AutoByteus runtime input processing, WebSocket event mapping, frontend live stream routing, and run-history projection.
- Scope Summary: Runtime-specific duplicate display of server-owned task-delegation system work packets in nested task-team conversations.
- Primary Questions To Resolve:
  - Is the duplicate created by two stored message/event records or by frontend rendering of one record twice? **Answer:** live duplicate comes from two event sources for the same content: backend member-input projection and AutoByteus runtime `SYSTEM_TASK_NOTIFICATION`; durable AutoByteus raw trace also stores the processed task packet as a user trace.
  - Which owner emits the plain message versus the purple `System Task Notification`? **Answer:** backend mixed-team member input projection emits the plain user/member input; AutoByteus `AgentInputPipeline` emits the semantic notification event for `SenderType.SYSTEM`.
  - What differs between AutoByteus runtime and Codex/Claude Agent SDK runtime paths? **Answer:** Codex/Claude input mappers do not emit `SYSTEM_TASK_NOTIFICATION` from `SenderType.SYSTEM`; AutoByteus does.
  - What invariant should prevent internal/system task notification payloads from becoming duplicate user-visible conversation messages? **Answer:** server-owned task notification UI projection must be separate from model input delivery, and exactly one visible notification surface should be authoritative.

## Request Context

User reports a bug in the Nested Classroom Test. Teacher delegates a geometry task to StudentStudyGroup. In AutoByteus runtime with DeepSeek 4.0 Flash, `student_one` shows the delegated task activation text as a plain first message and also as a purple `System Task Notification`; user does not see this problem with Codex or Claude Agent SDK runtimes. User attached screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ab5aebe8410f404ab00912e4881aba25/solution_designer_61d3b4f8a93042d1bad4bff620333376/context_files/ctx_47c94ba8efe1__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ab5aebe8410f404ab00912e4881aba25/solution_designer_61d3b4f8a93042d1bad4bff620333376/context_files/ctx_7fb975eade33__image.png`

Screenshot observation:
- One view shows the delegated task work packet as normal conversation text in `student_one`.
- Another view shows a purple `System Task Notification` block with the same work packet content below the normal text.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git superrepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/done/autobyteus-runtime-system-task-notification-duplicate`
- Current Branch: `personal` in original checkout; dedicated task branch below for authoritative work.
- Current Worktree / Working Directory: Original request landed in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; authoritative task worktree is `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate`.
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-28.
- Task Branch: `codex/autobyteus-runtime-system-task-notification-duplicate` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / tracked `origin/personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Root checkout had pre-existing untracked files unrelated to this task; all authoritative artifacts and future changes should use the dedicated task worktree. User design review was required and completed on 2026-06-29 before architecture reviewer handoff.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-28 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; find . -maxdepth 2 -type d -name .git -print; ls -la` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover repository/worktree state before investigation | Superrepo is Git repository on branch `personal`; root had unrelated untracked artifacts. | No |
| 2026-06-28 | Command | `git remote -v; git branch -vv --all; git symbolic-ref refs/remotes/origin/HEAD` | Resolve base branch and remote context | Remote `origin` points to AutoByteus workspace; remote HEAD is `origin/personal`. | No |
| 2026-06-28 | Command | `git fetch origin --prune` | Refresh remote refs before creating task worktree | Succeeded. | No |
| 2026-06-28 | Command | `git worktree add -b codex/autobyteus-runtime-system-task-notification-duplicate /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate origin/personal` | Create mandatory dedicated task worktree/branch | Succeeded; branch tracks `origin/personal`. | No |
| 2026-06-28 | Other | User screenshots listed in Request Context | Establish observed UI symptoms | `student_one` displays the task activation payload both as a normal visible message and as `System Task Notification`. | No |
| 2026-06-28 | Command | `rg -n "Your team has been activated|System Task Notification|task-scoped team run|accountable task target|Task label:|Ingress coordinator:" autobyteus-server-ts autobyteus-ts autobyteus-web applications` | Locate the strings and current owners | Found `TaskDelegationWorkPacketRenderer` for work-packet text and `SystemTaskNotificationSegment.vue` for frontend segment. | No |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Inspect task activation content owner | Renders the exact header `Your team has been activated as accountable task target...`; includes task ID, task-team run ID, delegator, ingress coordinator, description, reference files, and lifecycle instructions. | No |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Trace how work packet is sent | `activateTeamTask()` calls `teamRun.startTaskTeamInstance()` with `buildWorkPacketMessage(...)`; `buildWorkPacketMessage()` creates `AgentInputUserMessage(renderer.render([record]), SenderType.SYSTEM, ..., metadata.message_type="task_team_delegation_work_packet")`. Member tasks use `message_type="task_delegation_work_packet"`. | Yes: design must distinguish server-owned task work packets from ordinary user/member inputs. |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` | Trace task-team target activation | `start()` creates/restores the child team run and posts the work packet to the ingress member via `childRun.postMessage(..., selectorFromMemberRouteKey(identity.ingress.memberRouteKey))`; child events are prefixed back to the parent stream with task-team identity. | No |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Trace plain visible member input source | `postMessage()` calls `run.postUserMessage(message)` and, when accepted, calls `publishMemberInput(message)`. `publishMemberInput()` publishes `TeamRunEventSourceType.MEMBER_INPUT`. | Yes: system task packets currently share the ordinary member-input echo path. |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | Inspect member-input payload/origin classification | `inferInputOrigin()` only returns `inter_agent_delivery` or `user_message`; a `SenderType.SYSTEM` task work packet falls through to `user_message`. | Yes: requirements must preserve ordinary member input but prevent task system messages from appearing as ordinary user messages. |
| 2026-06-28 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Inspect WebSocket mapping | `MEMBER_INPUT` becomes `MEMBER_INPUT_MESSAGE` with content, `message_id`, `dedupe_key`, member path/route, and task-team scoped identity. | No |
| 2026-06-28 | Code | `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts`; `autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts` | Inspect frontend plain message rendering | `MEMBER_INPUT_MESSAGE` upserts a `UserMessage` into the target conversation by `message_id`/`dedupe_key`. | No |
| 2026-06-28 | Code | `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Inspect AutoByteus runtime-specific system notification behavior | For every `originalMessage.senderType === SenderType.SYSTEM`, `processForLlm()` calls `notifyAgentDataSystemTaskNotificationReceived({ sender_id, content })` before input processors run. This is AutoByteus-only. | Yes: suppress or replace this runtime-coupled UI notification for server-owned task messages. |
| 2026-06-28 | Code | `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts`; `autobyteus-ts/src/agent/streaming/events/stream-events.ts`; `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`; `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Trace AutoByteus semantic notification transport | AutoByteus `AGENT_DATA_SYSTEM_TASK_NOTIFICATION_RECEIVED` becomes stream event `system_task_notification`, then server `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`, then WebSocket `SYSTEM_TASK_NOTIFICATION`. | No |
| 2026-06-28 | Code | `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts`; `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue`; `autobyteus-web/components/conversation/AIMessage.vue` | Inspect purple notification rendering | `SYSTEM_TASK_NOTIFICATION` appends a `system_task_notification` segment to the current AI message; `AIMessage.vue` renders it as `SystemTaskNotificationSegment`. | No |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-user-input-mapper.ts`; `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Compare Codex/Claude behavior | Codex and Claude send `message.content` as user input; they do not inspect `SenderType.SYSTEM` to emit `SYSTEM_TASK_NOTIFICATION`. Explains runtime specificity. | No |
| 2026-06-28 | Code | `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts` | Explain `**[System Notification]**` prefix in AutoByteus raw trace/history | AutoByteus server prompt processor maps `SenderType.SYSTEM` to `**[System Notification]**`; this is why the model-consumed task packet appears in raw traces with that prefix. | No |
| 2026-06-28 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/nested_classroom_test_team_cdf80b8cb84b4415ac7eb64a53d8df9d/studentstudygroup_cf63c6a939e14817a73f52d0863c48e7/student_one_9cc0c3bb8758450eae60a4974f4a0398/raw_traces.jsonl` | Inspect actual reported run artifacts | First raw trace is a `trace_type:"user"`, `source_event:"LLMUserMessageReadyEvent"` containing `**[System Notification]**` plus the delegated geometry task packet. This proves the task packet was consumed as model input. | No |
| 2026-06-28 | Log | `/Users/normy/.autobyteus/server-data/logs/server.log` around lines `2002618`-`2002622` | Confirm live AutoByteus event emission | For `student_one_9cc0c3bb8758450eae60a4974f4a0398`, log shows `agent_turn_started`, then `agent_data_system_task_notification_received`, then `UserInputContextBuildingProcessor completed`. | No |
| 2026-06-28 | Doc | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Check existing member-input contract | Docs say team member input is emitted explicitly so accepted member input is rendered in target transcript before assistant reply; payload includes identity/dedupe fields. | Yes: fix must not regress ordinary member input. |
| 2026-06-28 | Doc | `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Check task delegation ownership | Docs state server-managed task delegation is owned by `autobyteus-server-ts`; agent-level events can include generic `SYSTEM_TASK_NOTIFICATION`. | No |
| 2026-06-28 | Prior Ticket | `tickets/done/self-evolving-harness-feasibility/design-review-report.md`; `tickets/done/self-evolving-harness-feasibility/api-e2e-validation-report.md` | Reuse accepted notification boundary guidance | Prior accepted design says runtime-neutral local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` is canonical UI notification path and `postUserMessage(... SenderType.SYSTEM ...)` must not be used merely for UI rendering. API/E2E evidence verified no notification copy in target runtime raw trace for that feature. | Yes: apply same boundary rule to server-owned task notification UI projection while preserving task packet as real model input. |
| 2026-06-28 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-notification-service.ts` | Inspect implementation pattern for runtime-neutral notification | Service uses `activeRun.emitLocalEvent({ eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, ... })` without injecting runtime input. | No |
| 2026-06-29 | Other | User approval message: "approve... after you finish the design first ask me for review. dont send for architecture reviewer" | Record requirements approval and review-gate instruction | Requirements approved; design must stop for user review before architecture reviewer. | Yes: wait for user review before handoff. |
| 2026-06-29 | Spec | `tickets/done/autobyteus-runtime-system-task-notification-duplicate/design-spec.md` | Capture target ownership, data-flow spines, file responsibilities, and migration sequence | Design uses explicit task-delegation visibility metadata, runtime notification suppression metadata, accepted projection as one local `SYSTEM_TASK_NOTIFICATION`, and no frontend content dedupe. | No: user approved design on 2026-06-29. |
| 2026-06-29 | Other | User design approval/kickoff message: "i agree with your unified solution proposal. now you can kickoff the task. make sure follow design principles and design examples" | Record design approval and permission to enter team workflow | Design approved; proceed to architecture reviewer with design-principles/design-examples guidance observed. | No |
| 2026-06-29 | Other | `send_message_to(recipient_name="architecture_reviewer", message_type="design_review_request")` | Deliver approved design package to architecture reviewer | Handoff succeeded with requirements, investigation notes, and design spec reference files. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `Teacher` tool call `delegate_task({ target: { kind: "team", name: "StudentStudyGroup" }, ... })` in a mixed team run.
- Current execution flow:
  1. `TaskDelegationService.delegateTask()` creates a ledger record and calls `TaskDelegationActivationCoordinator.activateTask()`.
  2. For team target, `TaskDelegationActivationCoordinator.activateTeamTask()` materializes task-team identity/config and calls `teamRun.startTaskTeamInstance()` with an `AgentInputUserMessage` whose `senderType` is `SenderType.SYSTEM` and metadata includes `message_type: "task_team_delegation_work_packet"`.
  3. `MixedTaskTeamMemberHandle.start()` creates/restores the child task-team `TeamRun`, then posts the work packet to the ingress coordinator member (`student_one`).
  4. The child `MixedAgentMemberHandle.postMessage()` ensures the `student_one` `AgentRun` is ready, calls `run.postUserMessage(message)`, and publishes a `MEMBER_INPUT` team event on success.
  5. Team WebSocket maps `MEMBER_INPUT` to `MEMBER_INPUT_MESSAGE`; web handler upserts it as a plain `UserMessage` in `student_one`.
  6. In the AutoByteus runtime only, `AgentInputPipeline.processForLlm()` sees `SenderType.SYSTEM` and emits `AGENT_DATA_SYSTEM_TASK_NOTIFICATION_RECEIVED`.
  7. AutoByteus stream/server/web mapping converts that into `SYSTEM_TASK_NOTIFICATION`; web handler appends a `system_task_notification` AI segment, rendered as the purple block.
- Ownership or boundary observations:
  - `TaskDelegationActivationCoordinator` owns task work-packet content and delivery intent.
  - `MixedAgentMemberHandle` owns accepted member-input projection into recipient transcripts.
  - AutoByteus `AgentInputPipeline` owns AutoByteus model-input conversion and currently also emits a UI-visible semantic event from system inputs.
  - Frontend handlers are behaving as designed: they render both `MEMBER_INPUT_MESSAGE` and `SYSTEM_TASK_NOTIFICATION`.
- Current behavior summary: AutoByteus gets duplicate UI because a single server-owned task work packet is treated simultaneously as ordinary visible member input and as runtime semantic system notification.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: A targeted refactor is needed because the UI notification source is split between runtime model-input processing and server/team projection. Fix should give visible task notification one authoritative owner and prevent AutoByteus runtime from duplicating server-owned task messages.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Same delegated task activation content is visible twice in `student_one`: once plain, once as `System Task Notification`. | User-facing duplicate, not expected product behavior. | Fix duplicate. |
| `task-delegation-activation-coordinator.ts` | Work packet is a `SenderType.SYSTEM` runtime input with task-delegation metadata. | Work packet is both model input and a candidate UI notification. | Separate these concerns. |
| `mixed-agent-member-handle.ts` | Every accepted message, including system task packets, is projected as `MEMBER_INPUT`. | Plain transcript echo is not scoped by message semantic type. | Preserve for ordinary inputs; suppress/redirect for task system notifications. |
| `agent-input-pipeline.ts` | AutoByteus emits `SYSTEM_TASK_NOTIFICATION` for every `SenderType.SYSTEM` input. | Runtime-coupled UI projection duplicates server/team projection and is not runtime-neutral. | Suppress for server-owned task messages or move authority to server. |
| Codex/Claude input code | No equivalent `SenderType.SYSTEM` notification emission. | Explains why bug is AutoByteus-specific. | Avoid runtime-specific fix that changes only UI. |
| Prior self-evolution design | Accepted invariant: local runtime-neutral `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`, not `postUserMessage(... SenderType.SYSTEM ...)`, is canonical UI notification path. | Current task violates the same boundary. | Reuse pattern. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Renders server-owned task work-packet text. | Contains exact reported activation copy. | Keep as model task packet source. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Creates task records and sends work packets to task-agent/task-team execution targets. | Builds work packet as `SenderType.SYSTEM`; metadata distinguishes member/team task packets. | Likely place to stamp server-owned task notification metadata/suppression intent. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts` | Sends result-submitted/revision-requested task lifecycle notifications. | Also creates `SenderType.SYSTEM` messages with `input_origin: "task_delegation_notification"`. | Same duplicate risk for AutoByteus notification messages. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Owns mixed member runtime readiness, posting messages, and accepted member-input publication. | Publishes `MEMBER_INPUT` for any accepted message. | Needs policy/classifier so system task messages are not plain input echoes when a notification is authoritative. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` | Owns task-team child run lifecycle and prefixes child events to parent stream. | Task-team activation posts work packet to child ingress coordinator; child member handle then projects events. | Fix must preserve task-team scoped routing fields. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | Builds member input event payload and origin. | `SenderType.SYSTEM` falls through to `user_message`; no task/system origin. | Member input origin model is too coarse for this case. |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Converts runtime inputs into model input and emits semantic events. | Emits system task notification for any `SenderType.SYSTEM`. | Runtime-specific UI emission must not duplicate server-owned task notifications. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` | Maps AutoByteus stream events into server agent run events. | Maps `StreamEventType.SYSTEM_TASK_NOTIFICATION`. | Transport is correct; source authority is the problem. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts` | Maps agent run events to WebSocket messages. | Maps `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` to `SYSTEM_TASK_NOTIFICATION`. | Reuse for runtime-neutral local events. |
| `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` | Handles `SYSTEM_TASK_NOTIFICATION` in frontend. | Creates `system_task_notification` segment. | Reuse; no new component needed. |
| `autobyteus-web/services/agentStreaming/handlers/memberInputMessageHandler.ts` | Handles accepted member input echoes. | Plain user message path. | Must continue for ordinary messages. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Routes team stream messages to focused/nested member contexts. | Correctly dispatches both message types to `student_one`. | Frontend is not the root cause; backend should prevent duplicate events. |
| `/Users/normy/.autobyteus/.../student_one_9cc0.../raw_traces.jsonl` | Actual AutoByteus run memory. | First trace contains processed system task packet as user trace. | Confirms model input path is required and active. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-28 | Setup | Created dedicated worktree and draft artifacts | Ready for deeper code/runtime investigation. | Complete. |
| 2026-06-28 | Data Probe | `find /Users/normy/.autobyteus/server-data/memory -type d -name '*studentstudygroup_cf63c6a939e14817a73f52d0863c48e7*'` | Found task-team run memory at `/Users/normy/.autobyteus/server-data/memory/agent_teams/nested_classroom_test_team_cdf80b8cb84b4415ac7eb64a53d8df9d/studentstudygroup_cf63c6a939e14817a73f52d0863c48e7`. | Confirms exact run from screenshot. |
| 2026-06-28 | Data Probe | Python script reading first 12 entries of `.../student_one_9cc0c3bb8758450eae60a4974f4a0398/raw_traces.jsonl` | Entry 1 is the task work packet as `trace_type:user`, `source_event:LLMUserMessageReadyEvent`, with `**[System Notification]**` prefix. Later entries show successful geometry solution and `submit_task_result`. | The work packet is real runtime input; do not remove model delivery. |
| 2026-06-28 | Log Probe | `nl -ba /Users/normy/.autobyteus/server-data/logs/server.log | sed -n '2002580,2002725p' | rg ...` | Lines around `2002618`-`2002622` show `student_one` `agent_turn_started`, `agent_data_system_task_notification_received`, and `UserInputContextBuildingProcessor completed`. | Confirms AutoByteus-specific semantic notification emission during the reported run. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Full reproduction would need a Nested Classroom Test team run with AutoByteus runtime and DeepSeek 4.0 Flash; existing user run artifacts were sufficient to identify root cause.
- Required config, feature flags, env vars, or accounts: Existing server data already contains the reported run. Live DeepSeek API key not required for this investigation pass.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

1. The duplicate is not a frontend rendering loop of a single payload. It is two legitimate incoming stream messages for the same server-owned task packet.
2. The plain conversation item comes from backend `MEMBER_INPUT_MESSAGE` projection of an accepted target-member input.
3. The purple `System Task Notification` comes from AutoByteus runtime converting `SenderType.SYSTEM` input into a semantic stream event.
4. Codex and Claude Agent SDK paths do not do the AutoByteus `SenderType.SYSTEM` semantic-notification conversion, explaining why the user does not see the same duplicate there.
5. AutoByteus raw trace/history also records the task packet as a model-consumed user trace, with `**[System Notification]**` added by `UserInputContextBuildingProcessor`. This is expected for runtime task execution but should not force duplicate live UI rendering.
6. Prior accepted architecture already recommends runtime-neutral local `SYSTEM_TASK_NOTIFICATION` events for UI notifications and rejects using runtime message injection as a UI-notification mechanism.

## Constraints / Dependencies / Compatibility Facts

- Must preserve visible task activation notification for task recipients.
- Must preserve internal task prompt/context delivery to runtime/LLM.
- Must avoid regressing Codex and Claude Agent SDK runtime behavior.
- Must preserve ordinary member-input echoes for direct user messages and inter-agent deliveries.
- Must preserve self-evolution and other legitimate local `SYSTEM_TASK_NOTIFICATION` events.
- No backward-compatibility dual rendering path should remain for the in-scope duplicate.

## Open Unknowns / Risks

- Exact implementation owner for live notification emission should be decided in design: likely member acceptance boundary (`MixedAgentMemberHandle`) plus task-delegation metadata stamping, or a small shared task-system-message classifier used by member handles and AutoByteus pipeline.
- Durable history may still show the model-consumed task packet as one plain prompt after refresh. This is not the same live duplicate, but if product wants durable purple notification history, that should be a follow-up design.
- Older paths may depend on generic `SenderType.SYSTEM` AutoByteus notifications. Suppression should be scoped to server-owned task-delegation messages rather than removing all AutoByteus system notifications without a separate review.

## Notes For Architecture Reviewer

- User initially requested a stop for user design review, then approved the unified solution and asked to kick off the task on 2026-06-29.
- Requirements were approved by user on 2026-06-29.
- Design spec approved by user on 2026-06-29 and prepared at `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-runtime-system-task-notification-duplicate/tickets/done/autobyteus-runtime-system-task-notification-duplicate/design-spec.md`.
- Recommended design direction: establish explicit task-delegation system-message visibility metadata, suppress AutoByteus generic runtime notification for those stamped messages, project accepted task-delegation system messages as one local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`, and suppress their member-input echo.
- Reuse existing `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` transport and web `SystemTaskNotificationSegment` rather than adding a new visual primitive.
