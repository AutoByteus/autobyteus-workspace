# Team-Level Task Delegation Analysis

## Summary

Current backend task delegation is **member-scoped**, not team-scoped.

- `delegate_task` accepts `member_name`, `description`, and optional `reference_files`.
- The target is resolved from the current team run roster by exact logical member name.
- Activation allocates and starts one **task-agent instance** for a concrete `agent` member.
- `agent_team` / subteam members can participate in ordinary `send_message_to` routing through their representative/coordinator, but they are rejected as task-agent targets by the task delegation activation path.
- Completion routes back to the original delegator through `submit_task_result` → `review_task_result`.
- On acceptance, only the concrete task-agent instance is settlement-eligible. There is no current concept of a delegated child **team run** whose whole team lifecycle is task-scoped and auto-exits on acceptance.

## Direct Answers

### Is a dedicated/delegated task currently dedicated to a member?

Yes. The model is explicitly “one bounded ready-to-run task to an exact logical team member.” The code and docs converge on that shape:

- Tool schema exposes `member_name`, not `team_name` or `target_team_id`.
- The service resolves `member_name` against `context.members`.
- Activation allocates an `AgentRun` identity from the target member's `agentDefinitionId`.
- The mixed backend starts a task-agent only when the resolved logical context is `memberKind === "agent"`.

### Can current `delegate_task` delegate to a team itself?

No, not as a first-class task delegation target.

A parent team may contain an `agent_team` member. Ordinary messages can route to that represented subteam's representative/coordinator, and the subteam may lazily start on message delivery. But `delegate_task` eventually rejects non-agent targets:

- `TaskDelegationActivationCoordinator.resolveTargetAgentMemberConfig(...)` throws `TARGET_MEMBER_NOT_AGENT` when the target config is not an `agent`.
- `MixedTeamMemberRegistry.startTaskAgentInstance(...)` also rejects non-agent contexts with `UNSUPPORTED_TASK_AGENT_TARGET`.

So a product-manager agent in an outer “engineering organization” team cannot currently call `delegate_task({ member_name: "Software Engineering Team", ... })` and get a task-scoped software-engineering team run.

### What happens if the product manager delegates to `solution_designer` instead?

If `solution_designer` is an exact member in the reachable current team context, current `delegate_task` creates a **task-agent instance for the solution_designer member template**. That is a member-level task-agent, not a team-level task.

This can partially approximate the desired workflow if the solution-designer task-agent then uses team tools to coordinate with other members. Current task-agent contexts can delegate child work and review it; tests cover task-agent delegators. But there are two important differences from the organizational model:

1. The software-engineering team itself is not the delegated task target; the target is one member role.
2. If the target member is also the team's coordinator, current settlement code protects the coordinator route by default. That means acceptance may not request automatic settlement for a coordinator-target task-agent unless the protection rule is changed or a separate non-coordinator entry member is used.

### Does the current team run itself exit when work is done?

No. Current acceptance settlement is for the **task-agent instance**, not the `TeamRun` as a whole.

`AgentTeamRunManager.terminateTeamRun(...)` exists, but it is an explicit lifecycle operation. The task delegation settlement path calls `teamRun.settleTaskAgentInstance(...)`, not `terminateTeamRun(...)`.

## Current Runtime Shape

Current supported task delegation spine:

`Delegating team member -> delegate_task(member_name) -> TaskDelegationService ledger -> TaskDelegationActivationCoordinator -> TeamRun.startTaskAgentInstance -> concrete member task-agent -> submit_task_result -> original delegator review_task_result -> task-agent settlement`

Current ordinary nested-team communication spine:

`Parent team member -> send_message_to(recipient_name for subteam representative) -> MixedSubTeamMemberHandle -> child TeamRun.postMessage(default/coordinator) -> child team coordinator/member flow`

These two spines are separate today. The first owns task lifecycle/review/settlement; the second owns message routing into subteams. There is no owner that combines them into a team-targeted task lifecycle.

## Product-Manager-to-Engineering-Team Model

The model you described is not fully supported today, but it is a coherent target architecture:

`Product Manager task loop -> delegate_task_to_team(Software Engineering Team) -> task-scoped child TeamRun -> child team coordinator workflow -> child team final result -> parent Product Manager review -> child TeamRun settlement/termination -> Product Manager continues`

That would better match an organization structure than delegating to a single coordinator member.

## Recommended Direction

Add **first-class team task delegation**, not a workaround that treats a coordinator member as the team.

A good backend shape would be:

1. Extend task delegation target identity from only `member_name` to an explicit target union:
   - `member_name` for current behavior, or
   - `team_member_name` / `target_team_member_route_key` for an `agent_team` member, or
   - an explicit `target` object such as `{ kind: "member" | "team", ... }`.
2. Keep `TaskDelegationService` as the authoritative task ledger/review owner, but split activation by target kind:
   - member target -> current `startTaskAgentInstance` path;
   - team target -> create/restore a task-scoped child `TeamRun` and post the work packet to its coordinator.
3. Add a team-task instance identity separate from task-agent identity, for example:
   - `teamTaskInstanceId`, `taskId`, `parentTeamRunId`, `childTeamRunId`, represented team member route/path, original delegator identity.
4. Add result-return semantics for a child team:
   - child coordinator or final delivery owner calls the same `submit_task_result`, but bound to the team-task context, or a sibling `submit_team_task_result` if the identity shape must remain distinct.
5. On acceptance, settle/terminate the task-scoped child team run after:
   - no open child delegated work,
   - no pending approvals/tool calls,
   - no active task-agent instances inside the child team,
   - child team is idle/offline or otherwise safe to stop.
6. Preserve ordinary `send_message_to` as non-lifecycle communication only. Do not make it the acceptance/finalization protocol.

## Workaround Assessment

Current workaround: parent product manager can `send_message_to` the software-engineering subteam representative/coordinator with a self-contained work packet.

This can start and use the subteam, but it lacks:

- task ledger identity,
- `submit_task_result` / `review_task_result` lifecycle,
- acceptance state,
- revision loop tied to a task id,
- automatic child-team settlement/termination,
- unambiguous return path to the product manager's task loop.

Therefore it is useful for conversation/handoff, not for the durable product-manager delegation model.

## Design Health Assessment

- Change posture: larger requirement / architecture extension.
- Current design issue found: yes, for the requested organization-level behavior.
- Root cause classification: boundary/ownership issue plus shared target-identity looseness if team targets were bolted onto `member_name` without an explicit target model.
- Refactor needed for implementation: yes, if implementing first-class team delegation.
- Recommended owner: keep server-owned `TaskDelegationService` as the ledger/review authority; introduce a target activation strategy or equivalent owner under `autobyteus-server-ts/src/agent-team-execution/task-delegation/` that delegates to current task-agent activation for member targets and to team-run lifecycle for team targets.

## Addendum: Nested-Team Prompt/Visibility Model

The nested-team implementation does make a child-team coordinator visible across the parent/child boundary, but it does **not** make that coordinator a normal member of both teams in the same way.

Current backend distinguishes three related but different concepts:

1. **Runtime member context**: actual members in a `TeamRun`'s `runtimeContext.memberContexts`.
2. **Communication recipient roster**: who `send_message_to(recipient_name)` may address from this member's prompt.
3. **Task delegation member list**: who `delegate_task(member_name)` can resolve from `MemberTeamContext.members`.

These are not identical.

### Parent team prompt view

For a parent team such as:

```text
Organization Team
- product_manager                  (agent)
- SoftwareEngineeringTeam          (agent_team)
  - solution_designer              (child coordinator / representative)
  - implementation_engineer
  - ...
```

The parent product-manager prompt can see the subteam coordinator/representative in the **communication roster**. `MemberCommunicationRosterBuilder` adds subteam representatives as `scope: "subteam_representative"`, with a participant that preserves `representedSubTeam` identity. The rendered prompt can show a line like:

```text
review_lead (BuildSquad representative)
```

This is message visibility, not full parent-team membership. The actual parent `memberContexts` contain `product_manager` and an `agent_team` wrapper for `SoftwareEngineeringTeam`; they do not contain `solution_designer` as a normal top-level parent member.

### Child team prompt view

When the represented subteam is started, its coordinator receives a child `MemberTeamContext` with a `parentBoundary`. Only the child coordinator/representative receives parent-boundary recipients. Tests assert that the child coordinator can message `program_manager`, while a non-coordinator sibling only sees local child members.

So the child coordinator prompt can show two team contexts:

```text
You are a member of:
1. SoftwareEngineeringTeam          role: coordinator/member
2. Organization Team                role: SoftwareEngineeringTeam representative
```

This makes the coordinator look like it participates in both teams, but technically it is a **representative boundary**: the child coordinator can message parent members because it represents the child team to the parent.

### Task delegation does not use the same roster

This is the key modeling issue.

`send_message_to` uses `communicationRecipients`, which includes local agents, subteam representatives, and parent-boundary agents when allowed.

`delegate_task` uses `MemberTeamContext.members`, which is converted directly into `TaskDelegationContext.members`. That list is the actual member descriptors of the current team context, not all communication recipients.

Therefore, from the parent product manager:

- `send_message_to({ recipient_name: "solution_designer" })` can work if `solution_designer` is the visible subteam representative.
- `delegate_task({ member_name: "solution_designer" })` usually does **not** resolve, because `solution_designer` is not a parent `MemberTeamContext.members` entry.
- `delegate_task({ member_name: "SoftwareEngineeringTeam" })` can resolve the parent `agent_team` wrapper, but activation rejects it because current task-agent activation only accepts `memberKind: "agent"` targets.

From the child coordinator:

- `send_message_to({ recipient_name: "product_manager" })` can work through the parent boundary.
- `delegate_task({ member_name: "product_manager" })` does **not** target the parent manager, because task delegation remains scoped to the child team's actual `members` list.

### Modeling conclusion

The current product prompt may make cross-boundary representatives visible for ordinary messaging, but the task model remains local-member-only. That mismatch is why the product-manager-to-engineering-team model feels conceptually close but not fully implemented.

The clean model should name the distinction explicitly:

```text
CommunicationRecipient
- local_agent
- subteam_representative
- parent_boundary_agent

TaskExecutionTarget
- local_agent_member
- represented_subteam/team
- maybe exact_task_agent_run for revisions only, not initial delegation
```

A team-level task should target the represented subteam/team, while the coordinator is only the ingress/egress representative:

```text
Task owner: SoftwareEngineeringTeam TeamTaskInstance
Task ingress: solution_designer coordinator receives the packet
Task execution: child TeamRun coordinates internal members
Task return: coordinator/delivery role submits result to parent task ledger
Task exit: child TeamRun terminates/settles on parent acceptance
```

If product manager is intentionally also a real member inside the child software-engineering team, that should be represented as a separate explicit topology choice. Reusing the same agent definition in both teams still creates distinct member/run identities today; it is not the same as one shared runtime identity automatically belonging to both teams.

## Addendum: Does `delegate_task` To A Member Trigger Team Creation?

It depends which member is visible in which scope, but the current backend answer is generally **no**: `delegate_task` to a concrete member creates a task-agent instance, not a team run.

### Parent PM -> subteam representative name

If the product manager is in the parent organization team and the software-engineering team is an `agent_team` member, the parent runtime context contains the subteam wrapper, not all nested child agents as top-level task targets.

- `send_message_to("solution_designer")` can work because `solution_designer` is exposed as a `subteam_representative` communication recipient.
- `delegate_task({ member_name: "solution_designer" })` normally fails with member-not-found from the parent context, because `solution_designer` is not in parent `MemberTeamContext.members`.
- `delegate_task({ member_name: "SoftwareEngineeringTeam" })` can resolve the subteam wrapper, but current activation rejects it because the target config is `memberKind: "agent_team"`, not `"agent"`.

### Parent PM -> message to subteam representative

This path can trigger child team creation/restoration:

`product_manager send_message_to(solution_designer representative) -> MixedSubTeamMemberHandle.ensureReady() -> child TeamRun.createOrRestore -> childRun.postMessage(default/coordinator)`

But this is ordinary message routing, not task delegation. It has no task ledger/review/acceptance/settlement semantics.

### A real local member target

If `solution_designer` is an actual `agent` member in the current team context, then:

`delegate_task({ member_name: "solution_designer" }) -> TaskDelegationService -> TaskDelegationActivationCoordinator -> TeamRun.startTaskAgentInstance -> MixedTeamMemberRegistry.startTaskAgentInstance`

This creates a concrete task-agent instance using the `solution_designer` agent member template. It does not create or start a new `TeamRun`.

### Implication

Current backend has no path where `delegate_task` to a concrete member automatically creates the member's containing team. Team creation is currently attached to represented-subteam **message routing**, not to task delegation. To make product-manager-to-software-engineering-team delegation natural, `delegate_task` needs a first-class team target that intentionally creates/restores a task-scoped child team run and delivers the task packet to its coordinator.


## Requirement Direction: Separate Communication Roster From Delegation Target Roster

The agreed product model is now:

```text
send_message_to -> communication recipient roster
                  e.g. solution_designer as SoftwareEngineeringTeam representative

delegate_task   -> delegation target roster
                  e.g. local member targets + SoftwareEngineeringTeam team target
```

For a parent product manager, the prompt should be able to say:

```text
You can message:
- solution_designer — representative/coordinator of SoftwareEngineeringTeam

You can delegate tasks to:
- SoftwareEngineeringTeam — team target, ingress: solution_designer
- other_parent_member — member target, if present
```

That avoids the ambiguity that made the current model feel strange. The coordinator can be the operational ingress for team work without becoming the accountable task target.
