# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved by user; design spec produced and ready for architecture review.
- Investigation Goal: Identify how backend system notifications for delegated tasks and review-task-result flows are generated, delivered, and rendered/stored, then define requirements and design changes for more natural recipient-facing notification text.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The likely code change is localized to task-delegation message/notification rendering and tests, but it spans activation, result-submitted, revision-requested notifications, individual-agent targets, agent-team targets, server event projection, and frontend pass-through rendering.
- Scope Summary: Backend notification wording for server-owned task-delegation lifecycle messages.
- Primary Questions To Resolve:
  - Which backend code generates delegate-task and review-task-result system notification messages? Resolved.
  - Is notification text shared with actual inter-agent/runtime delivered message or separately generated? Resolved: task delegation currently shares `message.content`; inter-agent messages already separate surfaces.
  - How does target identity differ for individual agent vs agent team delegation? Resolved.
  - Are there duplicated templates or fragmented policy that should be centralized? Resolved: visible copy is not separately owned; should be centralized under task delegation.

## Request Context

User reports that backend currently supports delegate task and review-task-result/sub-review task results, but the system notification message for these flows sounds unnatural and exposes too much internal detail. The message delivered to the other agent sounds natural; the system notification for delegate task/review task result does not. User asks to analyze how notification delivery/generation works and improve the notification behavior, considering delegation can target an agent team or a single agent.

- User testing of the Electron build showed `Accountable team` still appears in the system notification for team-target activation. Code inspection found `TaskDelegationVisibleNotificationRenderer.renderActivation` intentionally adds `Accountable team:` for team targets and unit tests require it. This proves the previous requirement wording was still ambiguous; requirements/design now explicitly require one uniform activation visible template for agent and team targets and prohibit target-kind labels such as `New delegated team task`, `Accountable team`, and `Logical member`.
- User clarified a task-oriented product principle: the task receiver does not need sender/delegator identity in the notification body because the receiver's job is to work from the task and submit a task result. Review comments and task descriptions should also be task-centered, not framed as ordinary messages from one agent to another. Requirements now include schema/manifest/runtime-instruction wording updates for `delegate_task.description` and `review_task_result.comment`.
- User clarified that agents generally do not benefit from seeing submission ids, review ids, execution kind, task-agent run ids, task-team run ids, or routing/debug identifiers in task/review notifications. Actionable agent-facing content should focus on task content, task id when needed for a tool call or correlation, review comments/instructions, decision/status, visible names, and reference files. User confirmed `review_task_result.message` to `comment` is in scope for this ticket, not merely a recommendation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/improve-task-system-notifications`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/improve-task-system-notifications/tickets/done/improve-task-system-notifications`
- Current Branch: `codex/improve-task-system-notifications`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/improve-task-system-notifications`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-29.
- Task Branch: `codex/improve-task-system-notifications` created from `origin/personal`.
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Main checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had unrelated untracked files; authoritative work is isolated in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD || true && git branch --show-current` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repo context | Superrepo on `personal`, tracking `origin/personal`; remote default is `origin/personal`; unrelated untracked files present in shared checkout. | No |
| 2026-06-29 | Command | `git fetch origin --prune && git worktree list --porcelain` | Refresh tracked refs and find reusable task worktree | Remote refresh succeeded; no existing worktree for this task found. | No |
| 2026-06-29 | Command | `git worktree add -b codex/improve-task-system-notifications /Users/normy/autobyteus_org/autobyteus-worktrees/improve-task-system-notifications origin/personal` | Create dedicated task branch/worktree | Dedicated branch/worktree created successfully at `b633fa774a1909b89abcb4fdff6a6d5bb04c768c`. | No |
| 2026-06-29 | Command | `rg -n "delegate_task|submit_task_result|review_task_result|TaskNotification|system task|notification_delivered|TASK_DELEGATION|task result|TaskDelegation|review task" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-ts/src autobyteus-ts/tests --glob '!**/dist/**' -S` | Locate task-delegation and notification code paths | Found server-owned task delegation under `autobyteus-server-ts/src/agent-team-execution/task-delegation`, tool wrappers under `autobyteus-server-ts/src/agent-tools/task-delegation`, system-task-notification infrastructure in `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`, and UI pass-through handlers in `autobyteus-web/services/agentStreaming`. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Understand lifecycle owner and notification call sites | `delegateTask` creates records and calls activation coordinator; `publishSubmissionTransition` records result and calls `notifyResultSubmitted`; `reviewTaskResult` calls `notifyRevisionRequested` for revision requests; acceptance does not send a system notification. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Understand activation message creation for member/team targets | `buildWorkPacketMessage` creates a `SenderType.SYSTEM` `AgentInputUserMessage` with `TaskDelegationWorkPacketRenderer.render([record])` as content and task-delegation/suppression metadata. Member targets start task-agent instances; team targets start task-team instances. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Inspect activation work packet copy | Work packets include internal/model-oriented text: `target_agent_run_id`, `Task-team run ID`, `Original delegator task-agent run`, `Lifecycle instructions`, framework/internal active/running wording, and explicit `submit_task_result` / `review_task_result` / `send_message_to` protocol instructions. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts` | Inspect result-submitted and revision-requested notification copy | `renderResultSubmitted` and `renderRevisionRequested` build content that includes `Execution kind`, task-agent/task-team run IDs, JSON examples for `review_task_result`, and `send_message_to` protocol warnings. Dispatcher delivers via `TeamRun.postMessage` or `postMessageToTaskTeamInstance`. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.ts` | Identify event payload content source | `buildTaskDelegationSystemTaskNotificationEvent` emits `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` with payload `{ sender_id, content: message.content }`; this is the direct coupling causing visible notification copy to mirror runtime/model instructions. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Understand live projection/de-duplication | For accepted stamped task-delegation system messages, `postMessage` forwards input to runtime, emits a local task-delegation system notification event, and avoids `MEMBER_INPUT` echo. Ordinary messages still use member-input projection. | No |
| 2026-06-29 | Code | `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`; `autobyteus-ts/src/agent/message/system-task-notification-metadata.ts` | Understand generic AutoByteus system-task notification behavior | Generic system notifications are emitted for `SenderType.SYSTEM` unless metadata suppresses them. Task-delegation messages set suppression metadata, preventing duplicate AutoByteus-originated notifications. | No |
| 2026-06-29 | Code | `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts`; `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` | Verify frontend behavior | Frontend handler directly maps payload `{ sender_id, content }` into a `system_task_notification` segment; component renders `segment.content` in a `<pre>`. No frontend copy rewriting was found. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts`; `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` | Compare ordinary inter-agent message delivery | Inter-agent delivery separates runtime input (`buildRecipientVisibleInterAgentMessageContent`) from communication event payload (`TeamRunCommunicationEventPayload.content`), providing a precedent for separating model input from display payload. | No |
| 2026-06-29 | Test | `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Identify durable expectations that will need updates | Tests currently assert work packet content contains internal identifiers/tool instructions and follow-up notification content contains tool protocol. They also assert task-delegation metadata and no-duplicate behavior. | Yes: implementation should update/add tests. |
| 2026-06-29 | Test | `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-task-notification-projection.test.ts` | Check no-duplicate coverage | Test asserts stamped task-delegation system message produces a local `SYSTEM_TASK_NOTIFICATION` and no `MEMBER_INPUT` echo. Needs extension for display-content override. | Yes |
| 2026-06-29 | Test | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Check E2E notification surface coverage | E2E waits for one `SYSTEM_TASK_NOTIFICATION` per activation/result/revision with snippets such as `Task result submitted for review.` and `Revision requested for delegated task.`; expected snippets should be updated to natural display content and internal-detail absence if practical. | Yes |
| 2026-06-29 | Doc | `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-server-ts/docs/modules/agent_streaming.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Understand documented behavior | Docs state task-delegation work packets and follow-up notifications are runtime/model input but visible transcript projection is server-owned and should use one `SYSTEM_TASK_NOTIFICATION` surface. Current docs do not describe separate display copy. | Yes: docs likely need sync after implementation. |
| 2026-06-29 | Command | `cat package.json`; `cat autobyteus-server-ts/package.json`; `cat autobyteus-web/package.json` | Identify relevant checks | Server has `pnpm -C autobyteus-server-ts test` and `typecheck`; frontend has Nuxt/electron tests. Targeted server unit tests are most relevant for implementation. | No |
| 2026-06-29 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`; `task-delegation-tool-input-parsers.ts`; `task-delegation-tool-manifest.ts`; `task-delegation-tool-contract.ts`; `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Inspect model-facing schema/prompt touchpoints for `review_task_result.message` rename | Review schema, zod parser, manifest descriptions, tool contract types, and runtime instruction composer all currently name the review free-text field `message`; request-revision validation path is `message`-specific. | Yes: implementation should rename to `comment`, update strict validation, and avoid retaining `message` alias. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Model/tool calls to `delegate_task`, `submit_task_result`, and `review_task_result` enter through tool wrappers in `autobyteus-server-ts/src/agent-tools/task-delegation` and are routed to `TaskDelegationService`.
- Current execution flow:
  - `delegate_task` → `TaskDelegationToolService.delegateTask` → `TaskDelegationService.delegateTask` → `TaskDelegationActivationCoordinator.activateTask` → `TeamRun.startTaskAgentInstance` or `TeamRun.startTaskTeamInstance` with a stamped `AgentInputUserMessage` work packet.
  - `submit_task_result` → ledger result submission/status events → `TaskDelegationNotificationDispatcher.notifyResultSubmitted` → stamped system message to original delegator.
  - `review_task_result(request_revision)` → ledger review/status events → `TaskDelegationNotificationDispatcher.notifyRevisionRequested` → stamped system message to execution target.
  - Mixed leaf accepted stamped messages → `MixedAgentMemberHandle.postMessage` forwards to runtime, then emits local `SYSTEM_TASK_NOTIFICATION` with `content: message.content`, and avoids duplicate `MEMBER_INPUT_MESSAGE`.
- Ownership or boundary observations:
  - `TaskDelegationService` is the lifecycle owner.
  - `TaskDelegationActivationCoordinator` owns activation and work-packet delivery.
  - `TaskDelegationNotificationDispatcher` owns follow-up notification delivery and message content for result/revision notices.
  - `task-delegation-system-message-visibility.ts` owns stamping/detection/projection of task-delegation system task notifications.
  - Frontend is a pass-through renderer for backend-provided notification content.
- Current behavior summary: Task-delegation visible notifications currently reuse runtime/model instruction message content; this exposes internal run IDs, execution kinds, lifecycle mechanics, and tool protocol text in the UI/system notification surface.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: A small refactor is needed now because visible notification copy and runtime/model instruction content are currently represented by one string. Simply editing the work-packet strings would either leave visible copy too internal or remove instructions needed by the runtime/model. The correct boundary is an explicit visible notification content path owned by task delegation.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `task-delegation-system-message-visibility.ts` | Local event payload always uses `message.content`. | Visible transcript surface depends on runtime/model input internals; boundary is missing. | Add explicit display-content selection. |
| `task-delegation-work-packet-renderer.ts` | Activation content includes lifecycle/tool/run identity instructions. | This content is model-actionable but poor display copy; cannot just simplify it globally. | Keep runtime content; add separate display copy. |
| `task-delegation-notification-dispatcher.ts` | Result/revision notifications include execution kind, run IDs, JSON tool snippets, and protocol warnings. | Follow-up notices also mix agent instructions with human notification content. | Add display renderer and metadata stamping. |
| `inter-agent-message-runtime-builders.ts` / `team-member-delivery-coordinator.ts` | Ordinary inter-agent delivery already separates delivery input from communication payload. | Existing architecture supports the principle of separate model and visible surfaces. | Reuse the pattern conceptually. |
| `mixed-agent-member-handle.ts` | Task-delegation messages are intentionally a single `SYSTEM_TASK_NOTIFICATION` surface. | Fix must preserve de-duplication while changing the content source. | Update projection tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Server-owned task-delegation lifecycle orchestration | Calls activation coordinator and notification dispatcher at all in-scope lifecycle points. | Lifecycle owner remains correct; no routing refactor needed. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Bind/start task-agent or task-team execution and build initial work-packet message | Stamps task-delegation system notification metadata but provides only runtime content. | Should add display-content metadata when building activation messages. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Render model-facing task work packet | Contains needed detailed protocol instructions and internal execution identity. | Should remain model-facing; should not become display renderer. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts` | Deliver result-submitted and revision-requested system messages | Currently owns both delivery and model-facing notification instruction content. | Should stamp display-content metadata using a visible notification renderer. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-system-message-visibility.ts` | Mark/detect/projection helper for task-delegation system messages | Projects visible `content` from `message.content`. | Needs explicit display override metadata and fallback behavior. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed agent member runtime boundary and accepted-input projection | Emits local system notification for stamped task-delegation messages. | Should not own copy; can keep calling projection helper. |
| `autobyteus-web/services/agentStreaming/handlers/systemTaskNotificationHandler.ts` | Client maps server payload into segment | Passes through payload content. | No copy logic should be added here. |
| `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue` | Renders system notification segment | Displays exact content. | Backend content must be improved. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-29 | Static trace | Code path trace from task tool wrappers through service/coordinator/dispatcher to mixed member handle and frontend handler | No runtime execution was needed to identify content coupling; static path is direct and tests cover the surface. | Design can target content boundary and tests without broad environment setup. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: Not applicable.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing unit tests use fake team run backend; E2E exists but live E2E requires Codex/runtime env flags.
- Required config, feature flags, env vars, or accounts: No new config identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The user-observed problem is real: visible task-delegation notifications are not separately generated; they reuse backend runtime input strings.
- The current visible notifications are generated server-side, not by frontend wording. Backend must own the fix.
- The correct design pressure is not to remove lifecycle instructions from work packets. The receiving model needs those instructions. The fix should separate visible transcript copy from delivered runtime/model content.
- The new display content should remain task-delegation-owned and work for member and team targets.
- The agent-facing content principle is stricter than UI display only: if a field is only useful for backend correlation/debugging (submission id, review id, execution kind, task execution run ids), it should remain in metadata/events/tool results rather than the model-facing notification text.
- `review_task_result.message` is semantically a review comment/feedback field, not ordinary message delivery; requirements now make `comment` the canonical model-facing field name for this ticket, with no retained `message` compatibility alias.

## Constraints / Dependencies / Compatibility Facts

- Task lifecycle mutations are committed before notification delivery; delivery failure must remain non-transactional with deterministic warnings.
- System task notification suppression metadata prevents duplicate AutoByteus runtime-originated notification events; keep it.
- Mixed member handle no-duplicate behavior must remain: stamped task-delegation messages should not also publish `MEMBER_INPUT_MESSAGE`.
- Frontend should continue treating backend payload content as authoritative.
- No backward-compatibility dual rendering path is needed for in-scope task-delegation notifications; a metadata display override with fallback for existing unstamped/old messages is enough because event generation is live.

## Open Unknowns / Risks

- Exact final wording should be product-approved if the team wants a specific style; requirements define negative constraints and natural-summary intent.
- If product later wants a structured notification payload instead of text-only content, that is outside this focused backend copy-separation scope.

## Notes For Architect Reviewer

- The design should treat `TaskDelegationService` as lifecycle owner and avoid moving routing/ledger decisions.
- The likely target shape is a new task-delegation visible notification renderer plus a metadata field consumed by `buildTaskDelegationSystemTaskNotificationEvent`.
- The main architecture issue is boundary separation between model-facing runtime input and human-visible notification content.
