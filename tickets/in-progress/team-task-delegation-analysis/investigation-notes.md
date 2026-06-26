# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete for analysis; no implementation started
- Investigation Goal: Determine current backend support for delegated/dedicated task target semantics, especially member-level versus team-level delegation and run lifecycle completion.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Crosses backend runtime, team orchestration, tool/message interfaces, and persistence/event lifecycle concepts.
- Scope Summary: Analyze current source; no implementation unless separately requested.
- Primary Questions To Resolve:
  - Are delegated tasks targeted only to team members today?
  - Is there a first-class team-run target for delegated tasks?
  - If a task is delegated to the solution designer coordinator, does the child team run as a whole exit or only that member run?
  - What architecture would support product-manager-to-engineering-team delegation and return?

## Request Context

User is exploring an organizational model where a product-manager agent creates many requirements/tasks, delegates a task to a software-engineering agent team, the team finishes/exits, returns result to the product manager, and the product manager continues in a potentially long-running loop. User suspects current system delegates tasks to a member rather than to a team and wants analysis of whether team-level delegation exists or should exist.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis`
- Current Branch: `codex/team-task-delegation-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` succeeded on 2026-06-26 before worktree creation.
- Task Branch: `codex/team-task-delegation-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Analysis-only unless user asks for implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-26 | Command | `git fetch origin` | Refresh base refs before ticket worktree creation | Succeeded | No |
| 2026-06-26 | Command | `git worktree add -b codex/team-task-delegation-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis origin/personal` | Create dedicated task branch/worktree | Succeeded at commit `a0a3d52f...` | No |
| 2026-06-26 | Doc | `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | Understand documented task delegation contract | `delegate_task` targets `member_name`; starts one concrete task-agent; `send_message_to` is not lifecycle protocol; settlement is for concrete task-agent instance. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Inspect exposed tool schema | No team target field; `member_name` is required. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Inspect accepted input shape | Strict `delegate_task` schema accepts only `member_name`, `description`, `reference_files`. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Inspect target resolution | Target is resolved by exact `member.memberName` from `context.members`. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Inspect activation owner | Activation allocates an agent run id and rejects non-agent targets with `TARGET_MEMBER_NOT_AGENT`. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` | Inspect mixed backend task-agent startup | `startTaskAgentInstance` only supports `memberKind === "agent"`; rejects subteam targets. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Compare ordinary subteam message routing | Subteam member can start/route child `TeamRun.postMessage`, but through message routing, not task lifecycle. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Inspect completion/exit behavior | Acceptance requests settlement of task-agent instance only after idle/no-open-work; coordinator route is protected by default. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Inspect team-run lifecycle | Team-run termination is explicit through `terminateTeamRun`; not automatically called by task acceptance. | No |
| 2026-06-26 | Test | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Verify supported lifecycle | Tests cover concrete member task-agent activation, task-agent child delegation, review, and settlement. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | Inspect nested prompt context | Builds `communicationRecipients` separately from `members`; parent-boundary recipients are only added for the represented child coordinator. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-communication-roster-builder.ts` | Inspect send-message roster construction | Adds local agents, subteam representatives, and parent-boundary agents; this is communication scope, not task target scope. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-team-roster-manifest.ts` | Inspect rendered prompt roster | Renders child coordinator as a representative of the represented team in parent boundary context. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Inspect parent boundary construction | Child team receives parent boundary with parent members; child coordinator can message parent members. | No |
| 2026-06-26 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-identity-assignment.ts` | Inspect run identity assignment | Each agent leaf gets its own allocated memberRunId; `agent_team` wrapper memberRunId equals childTeamRunId. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `delegate_task` tool exposed through `autobyteus-server-ts/src/agent-tools/task-delegation/` when an agent has a `MemberTeamContext`.
- Current execution flow: delegator calls `delegate_task(member_name, description, reference_files?)`; `TaskDelegationToolService` resolves the bound `TeamRun`; `TaskDelegationService` creates a ledger record; `TaskDelegationActivationCoordinator` allocates a concrete task-agent run id from the target agent definition and calls `TeamRun.startTaskAgentInstance`; the task-agent later calls `submit_task_result`; the original delegator reviews with `review_task_result`; acceptance requests task-agent settlement when allowed.
- Ownership or boundary observations: task lifecycle/review is server-owned by `TaskDelegationService`; actual team launch/routing is owned by `TeamRun`/`MixedTeamManager`; ordinary communication to subteams exists through `send_message_to`/subteam representative routing, but it is intentionally separate from task lifecycle.
- Current behavior summary: `delegate_task` is member-level only. It can target exact logical members and creates task-agent instances for concrete `agent` members. `agent_team` targets are rejected by activation/start guards. Team-run termination is explicit and not part of task acceptance settlement.
- Prompt/visibility distinction: `send_message_to` uses `communicationRecipients`, which may include subteam representatives and parent-boundary agents; `delegate_task` uses `MemberTeamContext.members`, which contains actual current team members/wrappers, not every visible communication recipient. This can make a coordinator visible in prompts across a boundary without making that coordinator a valid `delegate_task(member_name)` target from the parent team.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Architecture Analysis
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Team-level delegation would require a new target identity and activation/lifecycle owner because current task delegation owns only concrete task-agent instances, while nested team message routing owns only ordinary communication.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `delegate_task` schema and manifest | Required target field is `member_name`; no team selector. | Current delegated task target is a member identity. | No |
| `TaskDelegationInputResolver` | Resolves `member_name` by exact `member.memberName`. | Adding team delegation by overloading `member_name` would blur subject identity. | Yes if implementing |
| `TaskDelegationActivationCoordinator` | Rejects non-agent target config with `TARGET_MEMBER_NOT_AGENT`. | Team/subteam cannot currently be task-agent target. | Yes if implementing |
| `MixedSubTeamMemberHandle` | Ordinary message to subteam can start child `TeamRun`. | Team runtime capability exists separately from task lifecycle and can be reused/extended. | Yes if implementing |
| `TaskDelegationSettlementCoordinator` | Acceptance settles task-agent instance only and protects coordinator route. | Product-manager-to-team model needs a separate team-run settlement lifecycle and coordinator-task-agent policy check. | Yes if implementing |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Model-facing tool schema | `delegate_task` only exposes `member_name`, `description`, `reference_files`. | Target shape is member-level today. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Runtime argument validation | Strict schema rejects extra selectors. | New team target requires schema/contract change. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Server-owned task lifecycle/review owner | Creates ledger record, submit/review transitions, settlement request on accept. | Correct owner to extend for team-targeted tasks. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Context validation and member target resolution | Resolves target by exact `memberName`. | Needs explicit target union for team delegation. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Concrete task-agent activation | Rejects non-agent target config; starts task-agent instance. | Member-task activation should remain as one strategy, not absorb team-run lifecycle. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` | Mixed backend member/task-agent handle registry | Starts task-agent only for concrete `agent` logical contexts. | Confirms team targets are unsupported for task-agent activation. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | Represented subteam message/lifecycle handle | Can lazy-start child `TeamRun` for ordinary postMessage. | Reusable capability for team-task activation, but not currently tied to task ledger. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Task-agent settlement after acceptance | Settles only task-agent instances; protects coordinator route by default. | Team-task lifecycle would need separate child-team settlement coordinator. |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Active team run registry and explicit termination | Provides explicit `terminateTeamRun`. | Could be used by a future team-task settlement owner. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-context-builder.ts` | Builds per-member team context/prompt data | Keeps `members` and `communicationRecipients` separate; adds parent-boundary recipients only for child coordinator. | Task target scope should not be inferred from communication visibility. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-communication-roster-builder.ts` | Builds `send_message_to` recipient roster | Adds local agents, subteam representatives, and parent-boundary agents. | Useful for cross-boundary messaging, but insufficient for task ownership. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-team-roster-manifest.ts` | Renders prompt-visible roster | Labels representatives, e.g. represented team representative. | Prompt wording should distinguish representatives from task targets. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-identity-assignment.ts` | Allocates runtime identities | Agent leaves receive distinct memberRunIds; subteam wrapper memberRunId equals childTeamRunId. | Same agent definition in two teams is not automatically one shared runtime identity. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: Current question is repo-local.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static analysis.
- Required config, feature flags, env vars, or accounts: None for static analysis.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree created.
- Cleanup notes for temporary investigation-only setup: Worktree can be removed after finalization if desired.

## Findings From Code / Docs / Data / Logs

- `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` states server-managed bounded task delegation is authoritative and `delegate_task` uses `member_name`, `description`, and optional `reference_files`; it starts one concrete task-agent instance.
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` exposes only `member_name`, `description`, and `reference_files` for `delegate_task`.
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` describes delegation to an exact logical team member and one task-agent.
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` uses a strict schema, so extra selectors such as `target_team_id` would be rejected.
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` resolves the target by exact `member.memberName` from `context.members`.
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` resolves target config and rejects non-agent targets with `TARGET_MEMBER_NOT_AGENT`; accepted activations build a task-agent instance and call `teamRun.startTaskAgentInstance`.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` independently rejects task-agent startup for non-`agent` logical contexts with `UNSUPPORTED_TASK_AGENT_TARGET`.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` can lazily start/post to a child team for ordinary messages, showing subteam runtime exists but is not task lifecycle.
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` settlement requests are for task-agent instances and call `teamRun.settleTaskAgentInstance`; coordinator route is protected by default.
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` owns explicit `terminateTeamRun`; task acceptance does not call this boundary.
- `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` covers repeated member task-agent activations, child task delegation from a task-agent, result submission/review, and task-agent settlement, all around concrete member task agents.

## Constraints / Dependencies / Compatibility Facts

- No source edits planned for the initial analysis.

## Open Unknowns / Risks

- Whether the intended product-manager loop should be a long-running parent team member, a standalone agent run, or an outer organization team coordinator. Current `delegate_task` requires an active `MemberTeamContext`.
- Whether team-target result submission should reuse `submit_task_result` with a team-task context or introduce a distinct `submit_team_task_result` to keep identity semantics explicit.
- Whether coordinator task-agent settlement protection is intentional for task-agent instances or should only protect long-lived coordinator member runs.

## Notes For Architect Reviewer

No handoff planned unless the user asks to implement a target design.


## Agreed Task / Roster Model Update (2026-06-26)

The clarified model is:

- `delegate_task` may target either a **member** or a **team**.
- A member target must be a physical `agent` member in the delegator's current team context.
- A team target may be a visible `agent_team` member/wrapper in the delegator's current team context.
- Parent product manager can delegate tasks to physical members in the parent team or to visible child teams such as `SoftwareEngineeringTeam`.
- Parent product manager should not directly member-delegate to `solution_designer` when `solution_designer` is only a child-team coordinator/representative and not a physical parent-team member.
- Parent product manager can still `send_message_to` `solution_designer` because the communication roster exposes child-team representatives for ordinary communication.

This requires prompt/roster setup to expose separate concepts:

### Communication roster

Purpose: ordinary `send_message_to` delivery.

Expected prompt shape:

```text
You can message:
- solution_designer — representative/coordinator of SoftwareEngineeringTeam
```

This roster is built from `communicationRecipients` and can include local agents, subteam representatives, and parent-boundary agents.

### Delegation target roster

Purpose: bounded accountable `delegate_task` assignment.

Expected prompt shape:

```text
You can delegate tasks to:
- marketing_agent — member target
- SoftwareEngineeringTeam — team target, ingress: solution_designer
```

This target roster should be derived from actual current-team membership/topology, not from communication recipients alone:

- member target rows from physical current-team `agent` members excluding self when appropriate;
- team target rows from current-team `agent_team` members/wrappers, with coordinator/default ingress shown when resolvable;
- no member target row for a child representative unless that representative is also a physical member of the current team.

### Tool semantics

- `send_message_to("solution_designer")` means “talk to the team's representative.”
- `delegate_task(member: "local_member")` means “assign accountable bounded work to a physical local member.”
- `delegate_task(team: "SoftwareEngineeringTeam")` means “assign accountable bounded work to the team; system delivers ingress packet to `solution_designer`/coordinator.”

Current backend supports only the first two communication/member pieces partially:

- communication representative messaging works through `MemberCommunicationRosterBuilder` + `MixedSubTeamMemberHandle`;
- member task delegation works only for physical local `agent` members;
- team task delegation is not implemented.


## Roster Capability-Gating Decision (2026-06-26)

Roster sections must be dynamic and tool-exposure-aware:

- If `send_message_to` is unavailable, do not render an actionable communication recipient roster.
- If `delegate_task` is unavailable, do not render an actionable delegation target roster.
- If both tools are available, render two separate sections and explicitly contrast their semantics.
- The communication roster comes from `MemberTeamContext.communicationRecipients` and includes representatives/boundary recipients.
- The delegation target roster must come from task-delegation capability plus current-team topology: physical local `agent` members as member targets and visible `agent_team` wrappers as team targets.
- The implementation must not ask downstream engineers to infer target semantics from one flat roster.


## Prompt / Roster Implementation Findings (2026-06-26)

Additional current-code findings from:

- `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/member-team-roster-manifest.ts`
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts`
- `autobyteus-server-ts/src/agent-team-execution/domain/member-team-context.ts`

Findings:

- Current prompt composition renders the existing "Team membership roster" only under the `send_message_to` branch, through `renderTeamMembershipRosterManifest(buildTeamMembershipRosterManifest(memberTeamContext))`.
- Current task-delegation prompt text is a generic "Task delegation protocol" block; it says to delegate to an exact logical team member but does not render a separate target roster.
- `TaskDelegationToolService.buildTaskDelegationToolContextFromMemberTeamContext` currently maps `memberTeamContext.members` into a flat `TaskDelegationMemberIdentity[]`.
- That flat task-delegation context loses `memberKind: "agent" | "agent_team"` and team-specific topology fields, so it is not sufficient for first-class team target resolution.
- `TaskDelegationInputResolver` currently resolves by a bare `member_name` and does not exclude the caller/current live member. For the new product model, requirements now specify that self-target rows are not shown and explicit self-target attempts fail deterministically.
- `MemberTeamContext` already separates `members` from `communicationRecipients`; this supports the requirement to build communication rosters and delegation target rosters from separate sources rather than overloading `allowedRecipientNames`.

Requirement impact:

- The implementation needs either a new task-target roster builder or an extension of the existing roster manifest that keeps communication rows and delegation target rows as separate structured data before rendering prompt text.
- The task-delegation resolver/context needs target-kind-specific topology data, not only a flat member identity list.


## Nested-Team Scenario Requirements Added (2026-06-26)

The requirements now include concrete expected prompt/roster scenarios:

- flat team with no nested teams;
- parent `product_manager` seeing a child `SoftwareEngineeringTeam` via representative `solution_designer`;
- child-team coordinator/representative `solution_designer` seeing local child teammates plus parent-boundary communication recipients;
- non-coordinator child member seeing only local child-team recipients unless parent-boundary communication is explicitly enabled for non-representatives;
- parent member with multiple visible child teams;
- same-name collision where a representative is also a physical parent-team member;
- post-acceptance team-task lifecycle where the task-scoped child team run exits but future topology-based team delegation remains available.

Current-code evidence relevant to these scenarios:

- `MemberCommunicationRosterBuilder` includes parent-boundary recipients only when `currentMemberIsParentBoundaryRepresentative` is true.
- `member-team-context-builder.test.ts` already asserts the represented child coordinator sees local child member plus parent member, while a sibling child member only sees local child recipients.
- Current communication recipient names must be unique; duplicate visible representative names currently throw an ambiguous communication recipient error.


## Naturalness / Intuitiveness Assessment (2026-06-26)

The proposed model is natural if it is framed as "communication bridge vs accountable assignment":

- `send_message_to(solution_designer)` reads as "talk to the engineering team's representative." This is intuitive because real organizations often expose a team lead or coordinator as the contact point.
- `delegate_task(team: SoftwareEngineeringTeam)` reads as "assign accountable work to the engineering team." This is intuitive because a product manager normally assigns a product requirement to Engineering, not directly to every specialist inside Engineering.
- Delivering the initial team-task packet to `solution_designer` is intuitive as ingress/routing, similar to a team lead receiving a request on behalf of the team.
- Keeping accountable owner as `SoftwareEngineeringTeam`, not `solution_designer`, prevents the natural-language confusion where an assignment to the team accidentally becomes a personal assignment to the coordinator.
- Letting `solution_designer` see parent members as communication-only parent-boundary recipients is intuitive because a team representative needs to talk back to the parent/product side.
- Not letting non-representative child members see parent members by default is intuitive as a hierarchy/default-boundary rule. If a product wants direct cross-boundary collaboration, that should be an explicit policy rather than accidental roster leakage.
- Rejecting or disambiguating same-name representative/local-member collisions is necessary for human trust; silently choosing one would be surprising.
- Exiting the task-scoped child team run after acceptance is intuitive only if the prompt/docs say the temporary task execution context exits, not the organization team itself.

Potential non-intuitive areas and required wording guardrails:

- A user may wonder why PM can message `solution_designer` but cannot `delegate_task(member: solution_designer)`. The roster must answer this by labeling `solution_designer` as `SoftwareEngineeringTeam representative` and `SoftwareEngineeringTeam` as the task target.
- A user may think parent-boundary recipients visible to `solution_designer` are also delegation targets. The prompt must label them communication-only or keep them out of the delegation roster.
- A user may think accepting a team task destroys the team. Requirements now clarify only the task-scoped team run settles/terminates.


## Design-Phase Architecture Investigation (2026-06-26)

Additional files inspected for target design:

- `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-context.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-identity-assignment.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-metadata-mapper.ts`
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-directory.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts`
- `autobyteus-server-ts/src/agent-tools/task-delegation/*`
- `autobyteus-server-ts/src/agent-execution/backends/{autobyteus,codex,claude}/...` prompt composition call sites

Design findings:

- `TeamRun` and `TeamManager` are the authoritative runtime command boundaries for team execution. Adding team-task activation should happen through explicit `TeamRun` / `TeamManager` methods instead of bypassing into `MixedSubTeamMemberHandle` from task-delegation code.
- Existing task-agent activation is per-task and allocates a fresh agent run id. The intuitive equivalent for team targets is a per-task `TaskTeamInstance`, not overloading the persistent subteam communication handle.
- `MixedSubTeamMemberHandle` is designed for ordinary subteam communication: it lazily starts/restores the configured child team run and posts to its default/coordinator member. Reusing it directly for team-task lifecycle would couple ordinary communication and accountable task execution too tightly.
- A team-target task submitted from the child coordinator cannot use the existing `submit_task_result` routing unchanged: the coordinator runs in the child team context, but the delegated task ledger lives in the parent team run. The member-team context and tool service need a parent task binding for the team-task ingress coordinator.
- Existing `MemberTeamContext.taskAgentInstance` proves the current model already supports special task-bound caller metadata. A sibling metadata shape for `taskTeamInstance` / team-task ingress is the natural extension.
- `TaskDelegationLedger` currently assumes a single `member` target and `taskAgentInstance`. A first-class team target requires a union target/activation model; otherwise team-owned tasks will be forced into misleading member fields.
- Existing `TaskDelegationNotificationDispatcher` posts result and revision notifications by target member route key plus optional task-agent run id. Team-target revision delivery needs an explicit task-team notification path, not reuse of `targetMemberRunId` which currently means task-agent run id.
- `TaskDelegationSettlementCoordinator` only knows how to settle task-agent instances after idle/no-open-work checks. Team-task acceptance needs a separate team-instance settlement owner that can check child team open work and terminate the task-scoped team run without killing the parent run.
- `TeamRunLaunchIdentityAssignment` currently assigns child team run ids at normal team launch. A task-scoped team instance should allocate a fresh child team run id and fresh child member run ids from the logical `agent_team` config; otherwise sequential feature delegations would reuse exact child run identities.
- Prompt composition already receives actual tool exposure for all supported backends. The roster design can extend `composeMemberRunInstructions` once a structured task target roster is available.

Design consequence:

- The target design should introduce three explicit domain concepts rather than overloading existing member fields:
  1. `TaskDelegationTarget` (`member` or `team`);
  2. `TaskExecutionInstance` (`task_agent` or `task_team`);
  3. `TaskTeamInstance` for per-task child team run lifecycle and parent task binding.


## Architecture Review Round 1 Rework Notes (2026-06-26)

Architecture review round 1 failed with two design-impact findings:

- AR-001: task-scoped child `TeamRun`s must be resolvable for all child-team members' task tools and for settlement open-work checks. Current `TaskDelegationToolService` resolves by `TeamRunService.resolveTeamRun(context.teamRunId)`, but mixed nested child runs created by `MixedSubTeamRunFactory` are not registered in `AgentTeamRunManager`.
- AR-002: `agent-team-execution/domain/task-team-instance.ts` must own runtime-only request/identity types and must not import/reuse task-delegation target types.

Rework decision for AR-001:

- Do not register task-scoped child `TeamRun`s as ordinary top-level active/history runs in `AgentTeamRunManager`.
- Add/clarify `TaskTeamDirectory` as the task-delegation-owned active-run directory for task-scoped child team runs.
- `MixedTaskTeamMemberHandle` binds the active child `TeamRun` into `TaskTeamDirectory` after creation and removes/settles the entry on failed activation, settlement, dispose, or parent termination cleanup.
- `TaskDelegationToolService.resolveBoundTeamRun` first uses `TeamRunService.resolveTeamRun`; if that misses, it falls back to `TaskTeamDirectory.resolveActiveRun(context.teamRunId)`.
- Settlement uses `TaskTeamDirectory` to resolve the child run, then consults the child task-delegation service/registry and active task directories/statuses for open-work gates.
- `TaskTeamDirectory` is active-runtime resolution only and must never feed initial delegation rosters.

Rework decision for AR-002:

- `domain/task-team-instance.ts` defines standalone runtime shapes analogous to `domain/task-agent-instance.ts`: `LogicalTaskTeamMemberIdentity`, `TaskTeamIngressIdentity`, `TaskTeamInstanceIdentity`, and `StartTaskTeamInstanceRequest`.
- `TaskDelegationActivationCoordinator` / `TaskTeamRunIdentityFactory` converts from `TaskDelegationTeamTarget` to the runtime identity before calling `TeamRun.startTaskTeamInstance`.
- Dependency rule added: domain runtime command types must not import from `agent-team-execution/task-delegation/*`.


## Code Review Round 2 Design-Impact Rework Notes (2026-06-26)

A stricter code-review pass after functional implementation review requested design-impact rework before API/E2E. Canonical report:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/code-review-report.md`

Additional implementation-state files inspected for this rework:

- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`
- `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-directory.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts`
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts`

Commands / evidence used:

- `git status --short`
- `git diff --stat`
- `git diff --name-only`
- `sed` and `grep` inspections of the source files above.

Findings requiring design response:

- CR-001: `mixed-team-member-registry.ts` is at 497 effective non-empty lines and owns persistent handles, task-agent handles, task-agent recovery/cache/memory derivation, task-agent command routing, task-team instance registry composition, status listing, and cleanup. This is file responsibility drift / responsibility overload.
- CR-002: `task-delegation-tool-service.ts` owns model tool execution plus top-level run resolution, task-team active-run fallback, run-registry service lookup, and parent submit routing. `TaskDelegationService.submitTaskResult` also repeats task-agent vs task-team ingress branch selection. This is duplicated routing/coordination pressure.
- CR-003: `task-team-directory.ts` mixes active child-run lookup, starting/active/settled status, tombstones, parent cleanup, and an unused `taskTeamRunIdByTaskId` index. This threatens the prior invariant that the directory is not topology/history/lifecycle.

Rework decision for CR-001:

- Split mixed backend runtime instance ownership by lifecycle subject before API/E2E.
- Target owners:
  - `MixedPersistentMemberRegistry`: persistent agent/subteam handles, ordinary `resolveContext`, `getOrCreate`, `remove`, `listHandles`, `dispose`.
  - `MixedTaskAgentInstanceRegistry`: task-agent start/post/deliver/approve/settle/terminate/recover, recovery cache usage, and task-agent memory location derivation.
  - `MixedTaskTeamInstanceRegistry`: task-team start/post/settle/terminate/list/dispose.
  - `MixedTeamManager`: compose the subject registries, route public commands, aggregate status, and own cross-kind termination order.
- Remove or shrink `MixedTeamMemberRegistry` as a production catch-all; do not keep it as a compatibility facade.
- If config-tree lookup would duplicate between persistent and task-agent registries, extract `MixedTeamMemberConfigResolver` as a narrow config lookup owner.

Rework decision for CR-002:

- Add `agent-tools/task-delegation/task-delegation-tool-run-router.ts` as the one task-tool run/service binding owner.
- Router methods:
  - `resolveServiceForDelegateOrReview(context)` for current bound run service.
  - `resolveServiceForSubmit(context)` for current service or parent task-team ingress service.
  - `resolveActiveTeamRun(teamRunId)` using `TeamRunService` first and active task-team directory fallback second.
  - `getService(run)` as the only tool-surface access to `TaskDelegationRunRegistry`.
- `TaskDelegationToolService` becomes a tool API adapter and must not directly depend on `TeamRunService`, active task-team directory, or task delegation run registry.
- `TaskDelegationService` remains lifecycle owner. It should validate/transition an already selected ledger and expose explicit task-agent result vs task-team-ingress result paths if needed, rather than resolving parent/current runs.

Rework decision for CR-003:

- Rename/tighten `TaskTeamDirectory` to `TaskTeamActiveRunDirectory`.
- Keep active-only state: entries by taskTeamRunId and child teamRunId; optional parent-run index only for cleanup.
- Entry appears only after child `TeamRun` exists and is bound by `MixedTaskTeamMemberHandle`.
- Remove `starting` and `settled` statuses, settled tombstone set, and unused `taskTeamRunIdByTaskId` unless a concrete current active lookup caller is introduced.
- Lifecycle history remains in `TaskDelegationLedger` and events. Once unbound, active resolution returns null.
- Preserve invariant: active directory must never feed delegation rosters, topology, or future initial targets.

Design spec updated accordingly:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-spec.md`


## CR-005 Frontend Task-Team Visibility Requirement-Gap Investigation (2026-06-26)

Canonical requirement-gap artifact:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/frontend-task-team-ui-requirement-gap.md`

Additional files inspected for this reset:

- `autobyteus-web/types/agent/AgentTeamContext.ts`
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`
- `autobyteus-web/services/agentStreaming/teamTaskAgentContextProjection.ts`
- `autobyteus-web/services/agentStreaming/protocol/teamStreamIdentityTypes.ts`
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `autobyteus-web/utils/teamActiveExecutionMembers.ts`
- `autobyteus-web/utils/teamUserMessageTarget.ts`
- `autobyteus-web/components/workspace/team/TeamTaskAgentActivityBar.vue`
- `autobyteus-web/components/workspace/team/TeamMemberMonitorTile.vue`
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`
- `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`

Commands / evidence used:

- `sed` inspections of the files above.
- `grep -R "TASK_DELEGATION_EVENT\|task_team\|task_agent"` across frontend streaming protocol/services.
- `grep -n "CR-005\|Requirement Gap\|frontend"` in `code-review-report.md`.

Current frontend task-agent evidence:

- `TeamMemberNodeBase` has task-agent projection fields: `isTaskAgentInstance`, `taskAgentInstanceId`, `taskAgentRunId`, `taskId`, `logicalMemberRouteKey`.
- `TeamStreamingService.dispatchMessage` consumes `TASK_DELEGATION_EVENT` by calling `extractTaskAgentIdentity` and `ensureTaskAgentContext`.
- `teamTaskAgentContextProjection.ts` owns task-agent identity extraction, transient node creation, insertion near the logical member, context creation, restoration, and cleanup.
- `TeamTaskAgentActivityBar.vue` shows active task-agent cards with a `Task agent` badge, run id/status, pending approvals, focus behavior, and approval routing by task-agent run id.
- `TeamMemberMonitorTile.vue` shows task-agent badges and conversation previews; `TeamWorkspaceView.vue` hides the shared composer when a task-agent projection is focused.

Current frontend task-team gap:

- `TeamMemberNodeBase` has no task-team fields such as `isTaskTeamInstance`, `taskTeamInstanceId`, `taskTeamRunId`, or `logicalTeamRouteKey`.
- `TeamStreamingService.dispatchMessage` currently no-ops for task-team-only `TASK_DELEGATION_EVENT` payloads because it only extracts task-agent identity.
- The backend mapper now flattens task-team event identity fields: `execution_kind`, `task_team_instance_id`, `task_team_run_id`, `task_id`, `team_route_key`, and `team_path`.
- Existing structural `agent_team` nodes represent topology/template teams; they do not represent a concrete delegated task execution such as `SoftwareEngineeringTeam · task_0001`.

Requirement/design decision:

- Add frontend task-team execution visibility to the requirements. This is product-completeness scope, not optional polish.
- Preferred projection shape: transient `agent_team` node with explicit task-team marker fields and a `Task team` badge, inserted near/under the logical structural team and also surfaced in a generalized active task executions bar/card list.
- Structural vs runtime identity rule: structural `SoftwareEngineeringTeam` remains the topology node; `SoftwareEngineeringTeam · task_0001` represents one concrete task-team execution and carries task-team run/instance identity.
- Add or refactor frontend projection owner, likely alongside the task-agent projection code, to own `extractTaskTeamIdentity`, `ensureTaskTeamContext`/projection creation, lifecycle updates, and cleanup.
- Avoid a kitchen-sink node. Either add specialized task-team fields to `SubTeamMemberNode`/base plus task-agent fields kept meaningful, or introduce a tight discriminated active task execution projection model with `kind: "task_agent" | "task_team"`.
- Existing task-agent UI behavior is a baseline and must not regress.

Requirements updated:

- Added UC-008 for human-visible task-team execution projection.
- Added REQ-033 through REQ-042.
- Added AC-FE-001 through AC-FE-010.
- Added detailed frontend projection/event/lifecycle/nested-activity requirements.

Design spec updated:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-spec.md`


### Child Member Node Clarification (2026-06-26)

User clarified that a transient task-team execution should also show the delegated team's internal member nodes. Design response:

- `SoftwareEngineeringTeam · task_0001` is a transient `agent_team` execution projection, and it should include task-scoped child member nodes such as `solution_designer`, `implementation_engineer`, and `code_reviewer`.
- These child nodes are projections inside the task-team execution, not the structural team's original child nodes.
- Child route keys should be namespaced by taskTeamRunId, e.g. `<taskTeamRunId>/<relativeChildRouteKey>`, to avoid focus/map collisions.
- Child member/task-agent events should update task-scoped child projections. For simultaneous active task-team executions of the same logical team, explicit `task_team_run_id` on child events is needed to avoid ambiguity; otherwise the frontend must not silently attach child activity to the wrong task-team execution.

### AR-003 / AR-004 Design Rework (2026-06-26)

Architecture review round 5 failed the nested task-team child-node addition because the design did not yet define concrete frontend child projection identity/state ownership or an authoritative child-event association contract.

Design response now recorded in the design spec:

- Added a distinct task-team child projection owner: `autobyteus-web/services/agentStreaming/teamTaskTeamChildProjection.ts`.
- Defined `TaskTeamChildMemberProjectionIdentity` with parent task-team identity, logical team route/path, relative child route/path, structural source route/path, scoped child route/path, child kind, and runtime member run id semantics.
- Defined clone rules for `agent` and nested `agent_team` children: fresh node objects, fresh child arrays, structural metadata copied read-only, no structural runtime/status/context reuse, leaf child `AgentContext`s keyed by scoped child route keys, and provisional run-id promotion when stamped child events provide backend runtime member ids.
- Made backend child-event stamping mandatory for task-scoped child events. `MixedTaskTeamMemberHandle` / mixed event bridge must stamp task-team identity on child/overlay events, and the websocket mapper must flatten `task_team_run_id`, task-team instance/task ids, logical team route/path, and relative child route/path on all task-scoped child event message kinds.
- Removed source-path-only task-team association as an allowed target design. Missing `task_team_run_id` with task-team scoped fields is a drop/log contract violation; unstamped events do not update task-team child projections.
- Defined child task-agent parent association: child task-agent events inside a task-team use the scoped child route as `logicalMemberRouteKey` and carry `parentTaskTeamRunId` so active execution UI groups them under the task-team root and relevant child member.
- Defined cascade cleanup for root projection, child clones, child contexts, and nested child task-agent projections while leaving structural nodes/contexts untouched.
- Added frontend/backend tests for cloned child identity, no structural mutation, stamped child routing, ambiguous/malformed event drop, child task-agent grouping, and cleanup cascade.

Updated artifacts:

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/requirements.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-task-delegation-analysis/tickets/in-progress/team-task-delegation-analysis/design-spec.md`
