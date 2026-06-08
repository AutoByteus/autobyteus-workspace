# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Move team communication ownership fully to the server-side mixed-team execution spine and remove the remaining native AutoByteus team package responsibilities from `autobyteus-ts`.

The current mixed-team-manager simplification establishes `TeamRun -> MixedTeamManager -> AgentRunManager -> runtime AgentRun backend` as the universal team execution path. This follow-up should clean up the remaining split ownership where AutoByteus still carries native agent-team code, native team prompt injection remnants, and native `send_message_to` routing concepts while Codex and Claude already use server-owned team communication adapters.

Target ownership:

```text
autobyteus-ts
  no native agent-team
  no TeamManifestInjectorProcessor
  no native TeamCommunicationContext
  no native send-message-to team routing

autobyteus-server-ts
  owns team member context
  owns team prompt construction
  owns send_message_to routing
  owns mixed team orchestration
```

## Investigation Findings

Initial user-confirmed direction:

- Do not remove team communication capability.
- Remove native `autobyteus-ts` implementation/ownership of `send_message_to` team routing.
- Keep `send_message_to` behavior available to team members, but make delivery consistent through server-side `MemberTeamContext`, shared argument parsing/validation, and `MixedTeamManager.deliverInterAgentMessage`.
- Bootstrap this as a new stacked ticket using `codex/mixed-team-manager-simplification-analysis` as the base branch.

Deep investigation confirms:

- Codex and Claude already route `send_message_to` through server-owned adapters using `parseSendMessageToToolArguments`, `buildInterAgentMessageDeliveryRequestFromRecipientName`, `MemberTeamContext`, and `MixedTeamManager.deliverInterAgentMessage`.
- AutoByteus is the outlier: it still uses a native `autobyteus-ts` `SendMessageTo` tool, native `TeamCommunicationContext`, and native `InterAgentMessageRequestEvent` before bridging back into server delivery.
- `autobyteus-ts/src/agent-team/**` contains 51 source files and its native unit/integration tests contain 34 files; the current base ticket no longer needs this package for server team execution.
- `team-local-definition-id` is actively used by server definition providers/tests and should move to server definition utilities before deleting the native package.
- Server-delivered inter-agent messages already reach targets as server-built `AgentInputUserMessage` instances, so native AutoByteus inter-agent event formatting is not required for mixed team delivery.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Duplicated Policy Or Coordination; Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The mixed team manager is now the universal server team spine; Codex and Claude already use server-owned `send_message_to` adapters; AutoByteus still has native `SendMessageTo`, native `TeamCommunicationContext`, native `InterAgentMessageRequestEvent`, native `TeamManifestInjectorProcessor`, and the full native `agent-team` package that duplicate or conflict with server team communication responsibilities.
- Requirement or scope impact: The design must preserve cross-runtime team communication while removing native AutoByteus team ownership from the runtime package.

## Recommendations

Draft recommendation: perform this as a stacked cleanup/refactor ticket on top of `codex/mixed-team-manager-simplification-analysis`. Keep public team behavior stable, but move ownership and implementation of AutoByteus member `send_message_to` routing to server-side adapters/services.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-1: An AutoByteus-runtime team member can call `send_message_to` in a mixed team run, and the message is delivered by the server-side mixed team communication path.
- UC-2: Codex, Claude, and AutoByteus members use the same server-owned recipient resolution, argument validation, delivery request construction, and `MixedTeamManager.deliverInterAgentMessage` spine.
- UC-3: `autobyteus-ts` no longer exports or depends on native agent-team orchestration, prompt injection, team communication context, or native inter-agent routing events.
- UC-4: Existing server-side team communication projections/reference files remain intact for all runtime combinations.
- UC-5: Existing prompt construction from the current base ticket remains server-owned and does not regress for AutoByteus members.
- UC-6: Task-agent delegation uses a simplified communication model: delegators create active task-agent runs with `delegate_tasks`, task-agents and delegators exchange progress/completion/revision/blocker messages with `send_message_to`, and the original delegator closes the task with `accept_task`.
- UC-7: Same-runtime Codex and Claude team runs coordinate multiple provider sessions/threads through explicit team-run cohort ownership rather than hidden shared-client/session heuristics.

## Out of Scope

- Removing team communication capability.
- Renaming `MixedTeamManager` to a different manager name.
- Reintroducing specialized server team managers.
- Changing external user-facing team definitions beyond what is required to remove native AutoByteus agent-team remnants.
- Introducing additional task lifecycle features beyond the simplified `delegate_tasks` + `send_message_to` + `accept_task` model, such as a separate parent-side cancel/fail-close tool. The current ticket removes worker-owned result tools rather than adding more task-specific tools.

## Functional Requirements

- FR-1: Server-side team communication must remain the single routing owner for `send_message_to` across AutoByteus, Codex, and Claude runtime members.
- FR-2: AutoByteus-runtime team members must receive a usable `send_message_to` tool in managed team runs without depending on `autobyteus-ts/src/agent-team/**`.
- FR-3: `send_message_to` argument schema/validation semantics must remain consistent across supported runtimes, including the exactly-one target selector (`recipient_name` or `target_agent_run_id`), `content`, optional `message_type`, and optional `reference_files`.
- FR-4: Recipient resolution must use server-owned context and routing: static teammate recipients come from `MemberTeamContext`, active task-agent recipients come from the server task-agent directory, and no runtime may use native AutoByteus team manifests for routing.
- FR-5: Delivery must flow through `TeamRun.deliverInterAgentMessage` / `MixedTeamManager.deliverInterAgentMessage`, preserving cross-runtime and nested-team routing behavior from the base ticket.
- FR-6: `autobyteus-ts/src/agent-team/**` and native team prompt/communication remnants must be removed or relocated to appropriate server/neutral ownership so no runtime package import depends on the deleted tree.
- FR-7: Existing team communication UI/projection/reference-file behavior must continue to receive canonical server events and metadata.
- FR-8: Tests and documentation must be updated to remove native agent-team assumptions and cover the new server-owned AutoByteus communication path.

## Acceptance Criteria

- AC-1: Repository search shows no active source import from `autobyteus-ts/src/agent-team/**` after the cleanup, except deleted-file history or intentionally removed docs references.
- AC-2: `autobyteus-ts/src/agent-team/**` is deleted, or any retained files are explicitly justified as neutral relocated utilities outside native team ownership.
- AC-3: AutoByteus team member `send_message_to` calls route through server-side delivery services and `MixedTeamManager.deliverInterAgentMessage`.
- AC-4: Codex, Claude, and AutoByteus `send_message_to` adapters share the same server parser/validator and delivery request builder, or any runtime-specific divergence is explicitly isolated to adapter schema/tool-registration mechanics.
- AC-5: `TeamManifestInjectorProcessor` is removed and no longer required for AutoByteus team prompt behavior.
- AC-6: Existing all-AutoByteus, all-Codex/all-Claude, and mixed-runtime team communication scenarios remain supported by `MixedTeamManager`.
- AC-7: Validation includes targeted unit/integration coverage or equivalent executable evidence for AutoByteus server-owned `send_message_to` routing and absence of native agent-team imports.
- AC-8: Project exports/docs no longer advertise native `autobyteus-ts` agent-team APIs as active capabilities.

## Constraints / Dependencies

- This ticket depends on the current mixed team manager simplification base branch: `codex/mixed-team-manager-simplification-analysis`.
- The current base branch makes `MixedTeamManager` the universal team manager and adds server-owned AutoByteus member instruction composition.
- Cleanup must not break Electron/server runtime behavior that the user has already tested on the base branch.
- Runtime-specific tool adapter mechanics may differ by provider, but routing ownership must be server-side.

## Assumptions

- The base branch is committed and stable enough to stack a cleanup ticket on it.
- Team communication remains a required feature.
- No external consumer relies on native `autobyteus-ts` agent-team APIs as a public supported surface after the current architecture direction.

## Risks / Open Questions

- Active imports from `autobyteus-ts/agent-team` are confirmed in server definition utilities/tests for `team-local-definition-id`, in AutoByteus backend/tests for native communication bridge types, in `autobyteus-ts` native send-message/pipeline code, and in native agent-team tests.
- Cleanest server-side adapter point appears to be a server-owned AutoByteus `BaseTool` plus AutoByteus backend factory binding/registration, following the existing server-owned task-delegation tool pattern.
- `team-local-definition-id` should be relocated to server definition utilities; the rest of native agent-team runtime/orchestration package is a deletion candidate.
- Server-delivered inter-agent messages already use `buildInterAgentDeliveryInputMessage`; native `resolveTeamCommunicationContext` should be removed from `agent-input-pipeline.ts` or replaced with metadata-only fallback for non-server `postInterAgentMessage` usage.

## Requirement-To-Use-Case Coverage

- FR-1: UC-1, UC-2
- FR-2: UC-1, UC-3
- FR-3: UC-1, UC-2, UC-4
- FR-4: UC-1, UC-2, UC-5, UC-6
- FR-5: UC-1, UC-2, UC-4
- FR-6: UC-3, UC-5
- FR-7: UC-4
- FR-8: UC-1, UC-2, UC-3, UC-4, UC-5

## Acceptance-Criteria-To-Scenario Intent

- AC-1, AC-2, AC-5, AC-8 verify cleanup/removal of legacy native team ownership.
- AC-3, AC-4, AC-6 verify consistent server-owned runtime behavior.
- AC-7 verifies the implementation is executable and regression-resistant.

## Approval Status

User approved for architecture review on 2026-06-07 after reviewing the server-owned team communication direction and data-flow spine.

## Round 4 Simplified Task-Agent Requirement Refinement (2026-06-08)

The original native AutoByteus removal requirements remain valid. API/E2E Round 4 still proves that server-owned tool registration alone is not enough, but the task-agent remedy is now intentionally simpler than the earlier revision-state proposal.

This section **supersedes the prior Round 4 task-agent revision requirements** that required `mark_task_completed`, `mark_task_failed`, `awaiting_acceptance`, and `revision_requested` lifecycle states. The provider same-runtime coordination and committed-delivery requirements remain in scope.

Additional / revised functional requirements:

- FR-9: A canonical Team Communication projection for `send_message_to` must represent committed recipient input acceptance. If recipient-name resolution, exact target-agent-run resolution, runtime activation/restore, or `AgentRun.postUserMessage` acceptance fails, the tool must return a rejected result and no successful Team Communication projection may be inserted.
- FR-10: Task-agent progress, blocker, completion, and follow-up communication must use ordinary `send_message_to`; task-agent workers must not use task-specific result tools to mark completion or failure.
- FR-11: The task-specific tool surface must be reduced to `delegate_tasks` and `accept_task`. `mark_task_completed` and `mark_task_failed` must be removed from manifests, schemas, parsers, runtime exposure, prompts, tests, and docs.
- FR-12: `accept_task` is the only task-specific terminal action. It must be callable only by the original delegator for the active delegated task, including a task-agent delegator for nested tasks.
- FR-13: Delegated tasks must have a tight lifecycle: `not_started` before activation, `active` after task-agent start acceptance, and `accepted` after original-delegator acceptance/settlement. Worker-reported `awaiting_acceptance`, `failed`, and revision states are removed from the ledger.
- FR-14: Active task-agents must be addressable through server-owned exact-run `send_message_to` targeting until `accept_task` settles the task or the team terminates. Round 5 refines the model-facing selector to general `target_agent_run_id` rather than dynamic aliases or task-specific raw fields.
- FR-15: Task-agent identity must be semantically tightened. `taskId` is the ledger/business identity; `taskAgentRunId` is the concrete runtime run identity; the previous separate `taskAgentInstanceId` is not a model-facing or routing identity and should be removed or retained only as an internal derived display alias if implementation proves unavoidable.
- FR-16: Same-runtime Codex and Claude team members must be coordinated through provider-specific team-run runtime cohort ownership rather than hidden per-run/shared-client heuristics, so multiple members in the same team run can create, receive, interrupt, terminate, restore, and clean up without silent event-routing loss or hook-hanging cleanup.
- FR-17: Runtime coordination failures must be diagnosable through structured rejected `AgentOperationResult`s or runtime error events; live E2E must not hang only because ambiguous provider events or cleanup waits are silently swallowed.

Additional / revised acceptance criteria:

- AC-9: Tests prove failed delivery, unknown exact run target, settled task-agent run target, or recipient input rejection does not insert canonical Team Communication projection and returns a clear rejection to the tool caller.
- AC-10: Tests prove the simplified task-agent lifecycle: `delegate_tasks` starts a concrete task-agent; the task-agent sends progress/completion/blocker reports via `send_message_to`; the delegator can send feedback via `send_message_to` to the active task-agent exact run target; `accept_task` by the original delegator settles the task-agent.
- AC-11: Tests prove `mark_task_completed` and `mark_task_failed` are no longer registered, exposed, advertised in prompts, or required by task-agent work packets.
- AC-12: Tests prove nested task-agent delegation remains possible: a task-agent that delegates a child task can receive the child task-agent's messages through exact-run routing and can call `accept_task` for the child task it originally delegated.
- AC-13: Tests prove all-Codex and all-Claude same-runtime cohorts route events and cleanup deterministically, with synthetic provider/cohort coverage before the long live E2E matrix.
- AC-14: The live matrix must pass all-AutoByteus, all-Codex, all-Claude, mixed AutoByteus+Codex, nested AutoByteus+Codex+Claude, and mixed task-agent send-message/acceptance scenarios without substituting mocks for those live runtime classes.

Updated requirement-to-use-case coverage additions:

- FR-9: UC-1, UC-2, UC-4
- FR-10, FR-11, FR-12, FR-13, FR-14, FR-15: UC-6
- FR-16, FR-17: UC-2, UC-4, UC-7

Updated acceptance-criteria-to-scenario intent additions:

- AC-9 verifies committed-delivery semantics.
- AC-10 through AC-12 verify the simplified task-agent communication model and removal of obsolete worker result tools.
- AC-13 verifies same-runtime provider cohort ownership.
- AC-14 verifies the comprehensive live runtime acceptance bar.

## Round 5 Send-Message Addressing Requirement Refinement (2026-06-08)

The Round 4 simplification remains correct for task lifecycle and tool removal, but the model-facing dynamic task-agent alias (`worker/task_0001`) is superseded. `send_message_to` must instead support a general exact-run addressing mode.

Additional / revised functional requirements:

- FR-18: `send_message_to` must support exactly one of two target selectors: `recipient_name` for logical roster recipients OR `target_agent_run_id` for exact concrete agent runs. Providing neither or both must be a validation error.
- FR-19: `target_agent_run_id` must be a general exact-run selector, not a task-specific selector. It may target active/recoverable agent runs reachable from the sender's team communication boundary, including active task-agent runs.
- FR-20: Exact-run resolution must be server-owned and team-boundary-safe. Runtime adapters must not directly call `AgentRunManager` or bypass `MixedTeamManager` / delivery coordinator reachability validation.
- FR-21: Model-facing dynamic task-agent recipient aliases such as `worker/task_0001` are no longer the target design. They must be removed or demoted to non-routing display-only labels; the model-facing exact task-agent selector is `target_agent_run_id`.
- FR-22: The roster/member prompt must become an address-book instruction: use `recipient_name` from the roster when exact run id is unknown or not needed; use `target_agent_run_id` when a task packet, task event, or prior message gives a concrete run id and the message must reach that exact run.
- FR-23: `delegate_tasks` activation results, task-agent work packets, and task-agent relevant events/messages must expose the active task-agent's `target_agent_run_id` so the delegator can message that concrete task-agent run.
- FR-24: Rejections for missing selectors, both selectors, unknown/external run ids, and settled task-agent run ids must return clear tool errors and must not insert canonical Team Communication projections.

Additional / revised acceptance criteria:

- AC-15: Parser/schema tests across AutoByteus, Codex, and Claude prove `recipient_name` and `target_agent_run_id` are optional individually but exactly one is required.
- AC-16: Delivery resolver tests prove `recipient_name` resolves through the static roster and `target_agent_run_id` resolves through the server-owned reachable run resolver / task-agent directory, with external or settled run ids rejected before projection.
- AC-17: Prompt/roster tests prove the member instructions describe both addressing modes and no longer say `recipient_name` is always mandatory.
- AC-18: Task-delegation tests prove `delegate_tasks` exposes task-agent `target_agent_run_id`, parent feedback uses `send_message_to(target_agent_run_id=...)`, and dynamic alias routing is not required.
- AC-19: Repository search proves model-facing `task_agent_run_id`, `task_agent_id`, and dynamic alias instructions are removed from `send_message_to` schemas/prompts in favor of `target_agent_run_id`.

## Round 8 Delivery-Intent Boundary Requirement Refinement (2026-06-08)

Code review Round 8 reported CR-006 as Design Impact: the implementation still pre-resolves `recipient_name` above the mixed delivery boundary while also carrying the Round 5 target selector. This refinement makes the Round 5 intent shape explicit and removes hidden target aliases.

### Functional Requirements Addendum

- FR-25: Runtime send-message adapters must submit an unresolved `InterAgentMessageDeliveryIntent` containing sender identity, exactly-one target selector, content, message type, and reference files. They must not construct a recipient endpoint.
- FR-26: `recipient_name` and `target_agent_run_id` target resolution must be owned by `TeamMessageRecipientResolver` / `TeamMemberDeliveryCoordinator` inside the mixed-team delivery boundary.
- FR-27: The delivery intent/request shape must not carry both an unresolved target selector and a pre-resolved recipient endpoint above the mixed delivery boundary.
- FR-28: Parent-boundary delivery must forward an unresolved intent with a normalized sender; the parent team must resolve the target selector in its own boundary.
- FR-29: Target selector parsing must accept only canonical target fields `recipient_name` and `target_agent_run_id`. Undocumented target aliases such as `recipient`, `recipientName`, and `targetAgentRunId` must be rejected or ignored so validation fails.

### Acceptance Criteria Addendum

- AC-20: Source review proves the intent builder does not import `MemberTeamRecipientDescriptor`, does not read `memberTeamContext.communicationRecipients` for target lookup, and does not construct `recipient` endpoints.
- AC-21: Type/API tests prove `InterAgentMessageDeliveryHandler` / `TeamRun.deliverInterAgentMessage` accepts an unresolved delivery intent; `recipient` exists only on an internally resolved mixed-delivery request.
- AC-22: Resolver tests prove strict `recipient_name` lookup happens inside `TeamMessageRecipientResolver`, including local recipients and reachable parent-boundary forwarding.
- AC-23: Exact-run resolver tests prove active local task-agent run ids, active local member run ids, settled run ids, external run ids, and parent-boundary forwarded run ids behave according to the reachable-boundary rule.
- AC-24: Parser tests prove canonical selectors pass, both canonical selectors reject, and hidden target selector aliases (`recipient`, `recipientName`, `targetAgentRunId`) do not pass validation.
- AC-25: Regression tests prove the old target-vs-recipient-endpoint mismatch vector is impossible or rejected before projection.

## Round 14 Task Tool Configuration Boundary Requirement Refinement (2026-06-08)

Round 14 supersedes the prior Round 13 non-forcible-tool-choice proposal. The corrected requirement is to keep task tools as normal configured agent capabilities and keep this ticket focused on task-delegation architecture/invariants, not provider `tool_choice` policy.

### Functional Requirements Addendum

- FR-30: `delegate_tasks` and `accept_task` must be exposed only when configured for the agent/member, following the same configured-tool model as `send_message_to`.
- FR-31: `delegate_tasks` results must clearly return the generated `task_id` and active task-agent `target_agent_run_id` for each activated task.
- FR-32: `accept_task` must accept the generated `task_id` and must be authorized only for the original delegator of the active task, including task-agent delegators for nested child tasks.
- FR-33: Task-agent progress/completion/blocker/revision communication must remain ordinary `send_message_to` messages; those messages must not mutate terminal task state.
- FR-34: A task-agent exact run must remain reachable for `send_message_to(target_agent_run_id=...)` until a valid `accept_task` execution or team termination.
- FR-35: A valid `accept_task` call must be the only normal path that transitions an active task to `accepted`, tombstones the task-agent exact run id, and schedules settlement.
- FR-36: Provider `tool_choice` behavior and model reasoning quality are not in scope for this ticket. The framework must not add low-level runtime policy to compensate for weak prompts/models or test configs that force undesired tool calls.
- FR-37: Tool descriptions, task-agent work packets, and member instructions must clearly explain the `delegate_tasks` result shape and that `accept_task(task_id)` is used by the original delegator only when the specific delegated task is satisfactory.

### Acceptance Criteria Addendum

- AC-26: Tests/source review prove `delegate_tasks` and `accept_task` are exposed through configured tool lists and are not hidden framework-mandated behavior.
- AC-27: Tests prove `delegate_tasks` returns `task_id` and `target_agent_run_id`, and task-agent work packets include the needed task id and reply selector.
- AC-28: Tests prove `accept_task` succeeds only for the original delegator on an active task and rejects non-original callers.
- AC-29: Tests prove nested task-agent delegators can accept child tasks they delegated.
- AC-30: Mixed task-delegation validation proves revision feedback to an active task-agent `target_agent_run_id` succeeds before acceptance, explicit `accept_task(task_id)` settles the task, and post-accept feedback rejects before projection.
- AC-31: Source/tests prove no provider `tool_choice` dampening policy is added for this ticket and no obsolete result/revision task tools are reintroduced.

### Updated Requirement-To-Use-Case Coverage

- FR-30, FR-31, FR-32, FR-33, FR-34, FR-35, FR-37: UC-6
- FR-36: UC-6, UC-7

### Updated Acceptance-Criteria-To-Scenario Intent

- AC-26 verifies configured tool exposure.
- AC-27 verifies delegate result/work-packet clarity.
- AC-28 and AC-29 verify task acceptance authority, including nested tasks.
- AC-30 verifies report -> revision -> acceptance -> post-accept rejection.
- AC-31 verifies the corrected scope boundary and keeps the simplified architecture clean.
