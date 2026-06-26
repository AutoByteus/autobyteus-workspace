# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — revised for CR-005 frontend task-team execution visibility gap.

## Goal / Problem Statement

Define the requirements for task delegation where `delegate_task` can delegate bounded work either to a physical member of the delegator's current team or to a visible team/subteam as an accountable execution target. The backend/prompt model must distinguish communication recipients from task delegation targets so a product-manager agent can message a software-engineering team representative while delegating accountable work to the software-engineering team itself. The frontend must also make team-target task executions visible as first-class task-team execution projections so the product manager can see the concrete `SoftwareEngineeringTeam · task_0001` execution rather than only the structural team node.

## Investigation Findings

Original backend task delegation was member-scoped: `delegate_task` targeted an exact logical team member, activation created one concrete task-agent instance for `memberKind: "agent"`, and `agent_team`/subteam members were not first-class task targets. Ordinary `send_message_to` can route to a subteam representative/coordinator, but it is explicitly not the task result/review/finalization protocol. First-class product-manager-to-engineering-team delegation requires a team-task target model and task-scoped child team run lifecycle. CR-005 added a frontend/product gap: backend/runtime support and websocket fields for `execution_kind: "task_team"` are not enough unless the frontend projects the concrete task-team execution distinctly from the structural team node, with lifecycle status and review/submission visibility.

The agreed mental model is:

- `delegate_task` to a **member** is only valid when that member is physically in the delegator's current team context.
- `delegate_task` to a **team** is valid when the team/subteam is visible as a team target from the delegator's current team context.
- `send_message_to` remains communication-only and can target a visible team representative/coordinator such as `solution_designer`, because communication roster exposes representatives across parent/child boundaries.
- Team delegation should target `SoftwareEngineeringTeam` as the accountable team, while its coordinator/representative receives the initial task packet as ingress.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `delegate_task` schema/manifest, `TaskDelegationInputResolver`, `TaskDelegationActivationCoordinator`, `MixedTeamMemberRegistry`, `TaskDelegationSettlementCoordinator`, `MemberTeamContextBuilder`, `MemberCommunicationRosterBuilder`, `member-team-roster-manifest`, task coordination docs, and integration/unit tests.
- Requirement or scope impact: Current member-only task target shape must become an explicit target model with separate member and team target semantics. Prompt roster output must stop implying that communication recipients are automatically task delegation targets. Frontend task execution projection must expand from task-agent-only visibility to visible task-team executions without turning structural team nodes into loose kitchen-sink runtime nodes.

## Recommendations

Introduce an explicit task target model and prompt roster split:

- Communication roster: who the agent can message with `send_message_to`.
- Delegation target roster: who/what the agent can delegate bounded tasks to with `delegate_task`.

`send_message_to("solution_designer")` should mean “talk to the software-engineering team's representative.”

`delegate_task(target = team: "SoftwareEngineeringTeam")` should mean “assign accountable work to the software-engineering team.”

`delegate_task(target = member: "local_member")` should mean “assign accountable work to a physical member of my current team.”

Avoid overloading a bare `member_name` in a way that makes `solution_designer` sometimes mean a representative and sometimes mean the whole team.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-001: Parent product-manager agent can message a child software-engineering team's representative/coordinator for ordinary communication.
- UC-002: Parent product-manager agent can delegate a bounded task to a physical member in its own parent team.
- UC-003: Parent product-manager agent can delegate a bounded task to the software-engineering team as an accountable team target.
- UC-004: Software-engineering team coordinator receives the initial team-task packet as team ingress and can coordinate internal team work.
- UC-005: Software-engineering team submits a result back through task lifecycle, product manager reviews it, and acceptance settles/exits the task-scoped team run.
- UC-006: Prompts/rosters clearly tell model agents which names are valid for `send_message_to` and which names/targets are valid for `delegate_task`.
- UC-007: A long-running parent product-manager agent can delegate one feature task to an engineering team, review/accept the team result, continue running after the task-scoped engineering team run exits, and then delegate later dependent feature tasks to the same or other visible teams.
- UC-008: A human user watching the parent team workspace can see a concrete task-team execution projection for a team-target task, distinguish it from the structural team node, follow its lifecycle/review status, and understand nested child activity in relation to that task-team execution.

## Out of Scope

- Delegating directly from a parent agent to arbitrary nested child leaf members as member targets when those child leaf members are not physical members of the parent team.
- Treating communication representatives as implicit task owners.
- Using `send_message_to` as a substitute for result submission, review, revision, acceptance, or task finalization.
- Sharing one live runtime identity across multiple teams merely because the same agent definition appears in multiple team definitions.
- General task-management dashboards unrelated to task-delegation runtime visibility.
- Persistent task history beyond the explicit task-team lifecycle/timeline behavior listed below.


## Detailed Roster / Prompt Requirements

### Definitions

- **Current team context**: the `MemberTeamContext` for the running member/agent. A target is only valid for `delegate_task` if it is visible from this context and the task-delegation tool is exposed for this run.
- **Communication recipient**: a name accepted by `send_message_to({ recipient_name })` for ordinary message delivery. Communication recipients come from communication-routing state and can include representatives across team boundaries.
- **Delegation target**: a target accepted by `delegate_task` for bounded accountable work. Delegation targets come from task-delegation capability plus current team topology and are not equivalent to communication recipients.
- **Member delegation target**: a physical `agent` member in the delegator's current team context, other than the current live member.
- **Team delegation target**: a visible `agent_team` member/wrapper in the delegator's current team context. The team is the accountable task owner; its coordinator/representative is only the ingress recipient for the initial task packet.
- **Ingress coordinator/representative**: the member inside the delegated-to team that receives the initial team-task packet. This identity must not be treated as the accountable task target unless it is separately delegated to as a physical member in its own current team context.

### Roster Sections Are Capability-Gated

The model-facing prompt MUST render roster sections from the tools that are actually configured/exposed for the current run.

- If `send_message_to` is not configured/exposed or recipient-name delivery is not enabled, the prompt MUST NOT show a usable “You can message” roster.
- If `delegate_task` is not configured/exposed or task delegation is not enabled for the current team context, the prompt MUST NOT show a usable “You can delegate tasks to” roster.
- If both tools are configured, both rosters MAY be shown, but they MUST be separate sections with separate semantics.
- If neither tool is configured, the prompt SHOULD avoid listing actionable team recipients/targets, except for a short negative capability note when needed.

Capability-gating matrix:

| `send_message_to` exposed and recipient-name delivery usable | `delegate_task` exposed and task context usable | Required prompt behavior |
| --- | --- | --- |
| No | No | No actionable communication roster and no actionable delegation roster. |
| Yes | No | Show only the communication roster and `send_message_to` usage rules. Do not show delegation targets. |
| No | Yes | Show only the delegation target roster and task lifecycle rules. Do not show message recipients as actionable names. |
| Yes | Yes | Show both sections separately and include the contrast wording below. |

### Communication Roster Semantics

The communication roster is for `send_message_to` only.

Allowed communication recipient row kinds:

- `local_agent`: another physical `agent` member in the current team context.
- `subteam_representative`: the coordinator/representative of a visible `agent_team` member in the current team context.
- `parent_boundary_agent`: a parent-team member reachable by a child-team coordinator/representative through the parent boundary.

Required communication roster row content:

- recipient name exactly as accepted by `send_message_to({ recipient_name })`;
- human-readable role/scope label, e.g. `local teammate`, `SoftwareEngineeringTeam representative`, or `parent team member`;
- represented team name when the row is a subteam representative;
- no implication that the row is a valid `delegate_task` member target unless it also appears in the delegation roster as a member target.

Suggested prompt wording when communication is available:

```text
You can message with send_message_to:
- solution_designer — SoftwareEngineeringTeam representative
- marketing_agent — local teammate
```

If communication is configured but there are no recipient-name roster recipients, suggested wording:

```text
No recipient_name roster recipients are currently available for send_message_to. Use target_agent_run_id only when an exact active AgentRun id is supplied by a task packet, task event, or prior message.
```

### Delegation Target Roster Semantics

The delegation target roster is for `delegate_task` only.

Allowed delegation target row kinds:

- `member`: another physical `agent` member in the delegator's current team context. The current live member MUST NOT be shown as a model-facing member delegation target.
- `team`: a visible `agent_team` member/wrapper in the delegator's current team context.

Required delegation roster row content for member targets:

- target kind: `member`;
- target name exactly as accepted by `delegate_task` for member-target selection;
- member route/path when useful for disambiguation;
- role/description when available;
- no represented-team label unless the member is physically a current-team member and separately represents something by explicit metadata.

Required delegation roster row content for team targets:

- target kind: `team`;
- team target name exactly as accepted by `delegate_task` for team-target selection;
- represented team route/path or route key;
- ingress coordinator/representative name and route key when resolvable;
- note that the team, not the ingress coordinator, is the accountable task owner.

Suggested prompt wording when delegation is available:

```text
You can delegate tasks with delegate_task:
- SoftwareEngineeringTeam — team target; ingress coordinator: solution_designer; accountable owner: SoftwareEngineeringTeam
- marketing_agent — member target; accountable owner: marketing_agent
```

If delegation is configured but no valid targets exist, suggested wording:

```text
No delegate_task targets are currently available from this run.
```

### Canonical Product-Manager / Engineering-Team Prompt Example

Given a parent organization team with:

- current member: `product_manager`;
- visible child team member/wrapper: `SoftwareEngineeringTeam`;
- child team ingress coordinator/representative: `solution_designer`;
- no physical parent-team member named `solution_designer`;
- both `send_message_to` and `delegate_task` exposed;

the prompt MUST make the distinction clear:

```text
You can message with send_message_to:
- solution_designer — SoftwareEngineeringTeam representative

You can delegate tasks with delegate_task:
- SoftwareEngineeringTeam — team target; ingress coordinator: solution_designer; accountable owner: SoftwareEngineeringTeam
```

In that scenario:

- `send_message_to({ "recipient_name": "solution_designer", ... })` is valid communication.
- `delegate_task({ "target": { "kind": "team", "name": "SoftwareEngineeringTeam" }, ... })` is valid team delegation.
- `delegate_task({ "target": { "kind": "member", "name": "solution_designer" }, ... })` is invalid because `solution_designer` is not a physical member of the parent team context.
- `delegate_task({ "target": { "kind": "member", "name": "product_manager" }, ... })` is invalid/model-hidden self-delegation.

### Nested-Team Scenario Requirements

The implementation MUST satisfy these concrete nested-team prompt/roster scenarios. The exact prose may differ, but the same actionable names, target kinds, labels, and exclusions MUST be present.

#### Scenario S1: Flat team, no nested teams

Topology:

```text
DeliveryTeam
- product_manager (current member)
- analyst
- designer
```

When both `send_message_to` and `delegate_task` are exposed for `product_manager`, expected roster semantics:

```text
You can message with send_message_to:
- analyst — local teammate
- designer — local teammate

You can delegate tasks with delegate_task:
- analyst — member target; accountable owner: analyst
- designer — member target; accountable owner: designer
```

Required exclusions:

- `product_manager` MUST NOT appear as a member delegation target.
- No team target rows are shown because there are no visible `agent_team` members.

#### Scenario S2: Parent product manager with one visible engineering subteam

Topology:

```text
OrganizationTeam
- product_manager (current member)
- marketing_agent
- SoftwareEngineeringTeam (agent_team)
  - solution_designer (coordinator/representative)
  - architecture_reviewer
  - implementation_engineer
  - code_reviewer
  - api_e2e_engineer
  - delivery_engineer
```

When both `send_message_to` and `delegate_task` are exposed for `product_manager`, expected roster semantics:

```text
You can message with send_message_to:
- marketing_agent — local teammate
- solution_designer — SoftwareEngineeringTeam representative

You can delegate tasks with delegate_task:
- marketing_agent — member target; accountable owner: marketing_agent
- SoftwareEngineeringTeam — team target; ingress coordinator: solution_designer; accountable owner: SoftwareEngineeringTeam
```

Required exclusions:

- `product_manager` MUST NOT appear as a member delegation target.
- `solution_designer` MUST NOT appear as a member delegation target in the parent context unless `solution_designer` is also configured as a physical `agent` member of `OrganizationTeam`.
- Nested child leaf members such as `architecture_reviewer` and `implementation_engineer` MUST NOT appear as parent-context member delegation targets.
- If `send_message_to` is not exposed, the `solution_designer` communication row MUST NOT be shown as actionable.
- If `delegate_task` is not exposed, the `SoftwareEngineeringTeam` team target row MUST NOT be shown as actionable.

#### Scenario S3: Engineering coordinator / representative inside child team

Topology and current member:

```text
SoftwareEngineeringTeam
- solution_designer (current member, coordinator)
- architecture_reviewer
- implementation_engineer
- code_reviewer
- api_e2e_engineer
- delivery_engineer

Parent boundary visible to representative:
- product_manager
- marketing_agent
```

When both tools are exposed for `solution_designer`, expected roster semantics:

```text
You can message with send_message_to:
- architecture_reviewer — local teammate
- implementation_engineer — local teammate
- code_reviewer — local teammate
- api_e2e_engineer — local teammate
- delivery_engineer — local teammate
- product_manager — parent team member
- marketing_agent — parent team member

You can delegate tasks with delegate_task:
- architecture_reviewer — member target; accountable owner: architecture_reviewer
- implementation_engineer — member target; accountable owner: implementation_engineer
- code_reviewer — member target; accountable owner: code_reviewer
- api_e2e_engineer — member target; accountable owner: api_e2e_engineer
- delivery_engineer — member target; accountable owner: delivery_engineer
```

Required exclusions:

- `solution_designer` MUST NOT appear as a member delegation target for itself.
- `product_manager` and `marketing_agent` MAY appear as parent-boundary communication recipients for the representative/coordinator, but MUST NOT appear as child-team member delegation targets.
- `SoftwareEngineeringTeam` MUST NOT appear as a delegation target from inside its own team context.
- If `SoftwareEngineeringTeam` itself contains a visible nested `agent_team`, that nested team MAY appear as a team delegation target from `solution_designer`'s child-team context.

#### Scenario S4: Non-coordinator member inside child engineering team

Topology and current member:

```text
SoftwareEngineeringTeam
- solution_designer (coordinator)
- architecture_reviewer
- implementation_engineer (current member)
- code_reviewer
- api_e2e_engineer
- delivery_engineer

Parent boundary:
- product_manager
```

When both tools are exposed for `implementation_engineer`, expected roster semantics:

```text
You can message with send_message_to:
- solution_designer — local teammate / coordinator
- architecture_reviewer — local teammate
- code_reviewer — local teammate
- api_e2e_engineer — local teammate
- delivery_engineer — local teammate

You can delegate tasks with delegate_task:
- solution_designer — member target; accountable owner: solution_designer
- architecture_reviewer — member target; accountable owner: architecture_reviewer
- code_reviewer — member target; accountable owner: code_reviewer
- api_e2e_engineer — member target; accountable owner: api_e2e_engineer
- delivery_engineer — member target; accountable owner: delivery_engineer
```

Required exclusions:

- `implementation_engineer` MUST NOT appear as a member delegation target for itself.
- `product_manager` MUST NOT appear as a `recipient_name` communication row for a non-representative child member unless a separate policy explicitly exposes parent-boundary messaging to non-representatives.
- `product_manager` MUST NOT appear as a child-team member delegation target.

#### Scenario S5: Parent member with multiple visible child teams

Topology:

```text
OrganizationTeam
- product_manager (current member)
- SoftwareEngineeringTeam (agent_team; representative: solution_designer)
- ResearchTeam (agent_team; representative: research_lead)
```

Expected roster semantics:

```text
You can message with send_message_to:
- solution_designer — SoftwareEngineeringTeam representative
- research_lead — ResearchTeam representative

You can delegate tasks with delegate_task:
- SoftwareEngineeringTeam — team target; ingress coordinator: solution_designer; accountable owner: SoftwareEngineeringTeam
- ResearchTeam — team target; ingress coordinator: research_lead; accountable owner: ResearchTeam
```

If two visible representatives would expose the same `recipient_name`, the system MUST NOT silently pick one. It MUST either:

- reject prompt/roster construction with a deterministic ambiguous-recipient error; or
- expose a deterministic disambiguated recipient selector if that capability is explicitly designed.

Team delegation targets remain distinguishable by target kind plus team target name.

#### Scenario S6: Representative is also a physical parent-team member

Topology:

```text
OrganizationTeam
- product_manager (current member)
- solution_designer (physical parent-team agent)
- SoftwareEngineeringTeam (agent_team; representative: solution_designer)
```

This topology creates a same-name local member and subteam representative. The implementation MUST NOT render one ambiguous `solution_designer` row that could mean both identities.

Required behavior:

- communication roster MUST either disambiguate the two communication routes or fail with a deterministic ambiguity error;
- delegation roster MAY include `solution_designer` as a `member` target only for the physical parent-team agent identity;
- delegation roster MUST include `SoftwareEngineeringTeam` as the `team` target when team delegation is available;
- selecting the team target MUST use target kind `team` and target name `SoftwareEngineeringTeam`, not `member: solution_designer`.

#### Scenario S7: Team-target task is completed

After `product_manager` delegates to `SoftwareEngineeringTeam`, the team submits a result, and `product_manager` accepts:

- the task ledger record MUST end in accepted state with accountable owner `SoftwareEngineeringTeam`;
- the task-scoped child `TeamRun` created/restored for that delegated task MUST be settled/terminated after safe-settlement gates pass;
- the parent `OrganizationTeam` run and `product_manager` member run MUST remain available for future product-manager work;
- future prompts for `product_manager` MAY still show `SoftwareEngineeringTeam` as a team delegation target if `delegate_task` remains exposed and the team remains in topology;
- exact `target_agent_run_id` values from the completed task-scoped team run MUST NOT be presented as reusable initial delegation targets.

End-to-end expected work loop:

```text
product_manager
  -> delegate_task(team: SoftwareEngineeringTeam, feature requirement)
  -> task-scoped SoftwareEngineeringTeam run starts/restores
  -> solution_designer receives team-task packet as ingress
  -> solution_designer coordinates architecture_reviewer / implementation_engineer / code_reviewer / api_e2e_engineer / delivery_engineer through normal child-team workflow
  -> delivery_engineer reports completion to solution_designer through child-team communication/workflow
  -> solution_designer submits team task result to product_manager through submit_task_result-equivalent lifecycle
  -> product_manager reviews and accepts through review_task_result-equivalent lifecycle
  -> task-scoped SoftwareEngineeringTeam run settles/exits
  -> product_manager remains alive and may delegate the next feature task
```

### Human-Intuitive Model Rationale

The nested-team roster model SHOULD read naturally to a human reviewer as an organization model:

- A parent product manager can **talk to** a team's representative/coordinator.
- A parent product manager can **assign accountable work to** the team as a unit.
- The team's coordinator receives the assignment as ingress, but the team remains the accountable owner.
- The coordinator can coordinate child-team members internally.
- Parent-boundary visibility is a communication bridge, not proof that parent members are child-team task targets.
- A task-scoped team run exiting after acceptance means the **temporary execution context for that delegated task** exits; it does not mean the team definition, organization topology, or future ability to delegate to that team disappears.

The prompt wording MUST preserve that intuitive distinction. In particular:

- Use phrases like `representative`, `coordinator`, or `ingress coordinator` for cross-boundary communication identities.
- Use phrases like `team target` and `accountable owner` for team delegation identities.
- Avoid saying a representative is a physical member of the parent team unless the topology actually configured that agent as a physical parent-team member.
- Avoid saying parent-boundary recipients are child-team task targets.
- Avoid saying that accepting a team task deletes or exits the organization team; only the task-scoped run should settle/terminate.

This model is intentionally different from "the product manager directly assigns work to every nested child specialist." Direct parent-to-nested-leaf task assignment is less natural for a team-based organization because it bypasses the team's coordinator and makes accountability ambiguous.

### Tool Usage Wording

When both tools are available, prompt wording MUST explicitly contrast communication and delegation:

```text
Use send_message_to for ordinary communication only.
Use delegate_task for bounded accountable work.
Messaging a team representative does not create a task ledger entry.
Delegating to a team creates a team-owned task whose initial packet is delivered to the team's ingress coordinator.
```

The prompt MUST NOT say or imply:

- that `send_message_to` can submit, accept, revise, or finalize delegated task results;
- that a subteam representative visible in the communication roster is automatically a member target for `delegate_task`;
- that a team-target task is personally owned by the ingress coordinator.

### Target Selector Shape Requirements

The implementation MUST choose a model-facing selector shape that prevents ambiguity between member targets and team targets.

Preferred shape:

```json
{
  "target": { "kind": "team", "name": "SoftwareEngineeringTeam" },
  "description": "...",
  "reference_files": []
}
```

and

```json
{
  "target": { "kind": "member", "name": "marketing_agent" },
  "description": "...",
  "reference_files": []
}
```

Acceptable alternative if nested object schemas are not suitable for the tool surface:

```json
{
  "target_kind": "team",
  "team_name": "SoftwareEngineeringTeam",
  "description": "...",
  "reference_files": []
}
```

and

```json
{
  "target_kind": "member",
  "member_name": "marketing_agent",
  "description": "...",
  "reference_files": []
}
```

The implementation MUST NOT rely on one bare ambiguous `member_name` to mean both a physical member and a represented team.

### Dynamic Data Source Requirements

The communication roster MUST be derived from current communication capability and `MemberTeamContext.communicationRecipients`.

The delegation target roster MUST be derived from current task-delegation capability and actual current-team topology:

- physical member targets from current team `agent` members, excluding the current live member;
- team targets from current team `agent_team` members;
- ingress coordinator from the team target's configured `coordinatorMemberRouteKey` or equivalent default ingress resolution;
- route/path identities from the current runtime/config context;
- task-agent instances and historical/recoverable runs MUST NOT appear as initial delegation targets.

The prompt composer MUST receive enough tool-exposure information to know whether `send_message_to` and `delegate_task` are actually available for the current run before rendering each roster.

Implementation MUST NOT build the delegation target roster by reusing `allowedRecipientNames` or `communicationRecipients`. Communication routing and task ownership are separate data flows.

The task-delegation context or a nearby task-target builder MUST preserve enough topology data to resolve both target kinds:

| Target kind | Required resolution data |
| --- | --- |
| `member` | `memberKind: "agent"`, member name, member path, member route key, member run id, runtime kind, role/description where available. |
| `team` | `memberKind: "agent_team"`, team target name, team member path, team route key, team wrapper/child run identity when present, team definition id, coordinator/default ingress route key, representative name/path/run id when resolvable, role/description where available. |

### Prompt Composer / Roster Builder Contract

The prompt composition layer MUST be able to make these decisions without guessing from incidental state:

1. Whether `send_message_to` is actually in the active tool surface for the run.
2. Whether recipient-name delivery is usable for the current member context.
3. Whether `delegate_task` is actually in the active tool surface for the run.
4. Whether task-delegation lifecycle context is usable for the current member context.
5. Which names are communication recipients.
6. Which targets are member delegation targets.
7. Which targets are team delegation targets.

The roster builder SHOULD expose a structured manifest before rendering prompt text, with at least:

```ts
type CommunicationRosterRow = {
  kind: "local_agent" | "subteam_representative" | "parent_boundary_agent";
  recipientName: string;
  label: string;
  representedTeamName?: string | null;
};

type DelegationTargetRosterRow =
  | {
      kind: "member";
      targetName: string;
      memberRouteKey: string;
      memberPath: string[];
      role?: string | null;
      description?: string | null;
    }
  | {
      kind: "team";
      targetName: string;
      teamRouteKey: string;
      teamPath: string[];
      teamDefinitionId: string;
      ingressCoordinatorName?: string | null;
      ingressCoordinatorRouteKey?: string | null;
      accountableOwnerName: string;
    };
```

The exact TypeScript names may differ, but the implementation MUST keep equivalent fields available for prompt rendering, validation, and tests.

### Error Message Requirements

Invalid `delegate_task` target attempts MUST return deterministic, model-readable errors.

Required error cases:

- `TASK_TARGET_KIND_REQUIRED`: target kind missing when the new selector shape requires it.
- `TASK_TARGET_KIND_UNSUPPORTED`: target kind is not `member` or `team`.
- `TASK_MEMBER_TARGET_NOT_FOUND`: requested member target is not a physical member of the current team context.
- `TASK_MEMBER_TARGET_SELF_NOT_ALLOWED`: requested member target is the current live member.
- `TASK_TEAM_TARGET_NOT_FOUND`: requested team target is not a visible team/subteam in the current team context.
- `TASK_TEAM_TARGET_INGRESS_NOT_FOUND`: team target exists but no coordinator/default ingress can be resolved.
- `TASK_TARGET_AMBIGUOUS`: target name matches more than one valid target and caller did not provide enough identity.
- `TASK_DELEGATION_TOOL_UNAVAILABLE`: delegation roster/tool is not enabled for this run.

Error messages SHOULD include the available target names by kind when safe and concise.

## Detailed Frontend Task-Team Execution Visibility Requirements

### Frontend Projection Model

The frontend MUST represent a concrete team-target task execution separately from the structural team node. For the canonical scenario:

```text
EngineeringOrganization
- product_manager
- SoftwareEngineeringTeam
  - solution_designer
  - implementation_engineer
  - code_reviewer
```

After `product_manager` delegates to `SoftwareEngineeringTeam`, the UI MUST make a concrete execution visible, conceptually:

```text
SoftwareEngineeringTeam · task_0001
[Task team]
task_team_run_id: ...
status: active / awaiting review / revision requested / accepted / settling / settled
```

The existing structural `SoftwareEngineeringTeam` node continues to mean the reusable topology/template team. The task-team projection means one task-scoped runtime execution of that team. A user must be able to tell which one they are looking at.

### Projection Shape Decision

The preferred frontend shape is a transient `agent_team` node with task-team marker fields, plus inclusion in a generalized active task executions surface.

Required node semantics:

- `memberKind: "agent_team"`;
- `isTaskTeamInstance: true`;
- `taskTeamInstanceId`;
- `taskTeamRunId`;
- `taskId`;
- `logicalTeamRouteKey`;
- `logicalTeamPath`;
- display name `<logical team display name> · <task_id>`;
- visual badge `Task team`;
- child rows MUST include task-scoped projections of the delegated team's internal members, e.g. `solution_designer`, `implementation_engineer`, and `code_reviewer`, even before those members spawn task-agent instances;
- child rows or nested activity must represent the task-scoped execution, not mutate the structural team topology;
- child member route keys MUST be namespaced under the task-team execution, for example `<taskTeamRunId>/<relativeChildRouteKey>`, so selecting a child inside `SoftwareEngineeringTeam · task_0001` does not collide with selecting structural `SoftwareEngineeringTeam/solution_designer`.

A shared active task execution model may be introduced, but only if it is a tight discriminated union such as `kind: "task_agent" | "task_team"`. The implementation MUST NOT create a generic node with many optional task fields whose meaning changes by convention.

### Placement And Focus

The task-team projection SHOULD be inserted near or under the logical structural team node and SHOULD appear in a generalized active task executions strip/card surface. If the existing `TeamTaskAgentActivityBar` is reused, it should be renamed or refactored conceptually into an active task executions surface rather than silently showing teams in an agent-only component.

Selecting a task-team execution SHOULD focus that concrete task-team projection. The focused view SHOULD show task status/timeline and nested child activity. It MUST NOT imply that manual chat to the structural team is the way to finish the delegated task. If a composer is shown, it must route ordinary communication explicitly; task completion/review remains governed by task lifecycle tools.

### Event And Lifecycle Semantics

The frontend MUST consume websocket `TASK_DELEGATION_EVENT` payloads with task-team identity fields:

- `execution_kind: "task_team"`;
- `task_team_instance_id`;
- `task_team_run_id`;
- `task_id`;
- `team_route_key`;
- `team_path`;
- task event type such as activated, result submitted, reviewed, revision requested, accepted, settling, or settled when emitted.

The frontend projection owner must translate those events into visible state. At minimum:

- activation creates or repairs the projection;
- result submission marks the projection as awaiting review and adds a timeline entry;
- revision request marks it active/revision requested and adds a timeline entry;
- acceptance marks it accepted/settling and adds a timeline entry;
- settlement/offline-equivalent cleanup either removes the active projection or moves it to an explicit history/timeline state according to the implemented UI choice.

### Nested Activity Association

Task-scoped child member nodes are first-class projections inside the task-team execution. They must be cloned/projected from the delegated team's internal topology with task-scoped route keys and must not reuse or mutate structural member nodes.

Task-scoped child stream events must carry authoritative task-team execution identity. Required child-event identity includes:

- `task_team_run_id`;
- logical `team_route_key` / `team_path` for the delegated structural team;
- relative child path/route within that team, such as `task_team_relative_member_path: ["solution_designer"]` and `task_team_relative_member_route_key: "solution_designer"`.

The frontend must use this identity to update the scoped child projection, for example `<taskTeamRunId>/solution_designer`. It must not infer the task-team execution from `source_path` alone. If a task-team-scoped event is malformed or ambiguous, it must be dropped/logged rather than updating the wrong task-team or the structural node.

Tool approval/deny actions for child member or child task-agent tools inside a task-scoped team must preserve the same task-team scoped identity so the backend routes the command to the child run, not to the structural member.

Task-agent projections created inside the task-scoped team must remain understandable relative to the parent task-team execution. Acceptable designs include:

- show nested task-agent cards beneath or visually grouped with the task-team execution card and the relevant scoped child member; or
- include the parent task-team/task id label on child task-agent cards when the child activity is shown in a flat active execution strip.

The UI must avoid a situation where a child `implementation_engineer · task_0002` card appears with no visible parent `SoftwareEngineeringTeam · task_0001` execution.

### Existing Task-Agent Behavior Preservation

Existing member-target task-agent UI is a compatibility baseline, not a legacy path to remove. Task-agent projection creation, focus behavior, approval affordances, composer hiding for task-agent focus, and cleanup after task-agent settlement/offline MUST continue to work unchanged.

## Functional Requirements

- REQ-001: `delegate_task` MUST support an explicit task target kind for current-team physical members.
- REQ-002: Member-target `delegate_task` MUST only resolve members that are physical `agent` members of the delegator's current team context.
- REQ-003: Member-target `delegate_task` MUST preserve current task-agent lifecycle semantics: create one task-agent instance, bind it to the task ledger, allow `submit_task_result`, allow original-delegator `review_task_result`, and settle the task-agent after acceptance when safe.
- REQ-004: `delegate_task` MUST support an explicit task target kind for visible team/subteam targets.
- REQ-005: Team-target `delegate_task` MUST bind the task ledger record to the team target as the accountable execution owner, not to the coordinator as an individual member.
- REQ-006: Team-target activation MUST create or restore a task-scoped child `TeamRun` for the target team and deliver the initial work packet to the child team's coordinator/default ingress member.
- REQ-007: Team-target work packets MUST identify the parent delegator, task id, team target identity, child team run identity, ingress coordinator identity, result submission instructions, review instructions, and reference files.
- REQ-008: Team-target result submission MUST route back to the original delegator through task lifecycle state, not through ordinary `send_message_to` finalization.
- REQ-009: Team-target review MUST support accept and request-revision decisions equivalent to current member task delegation semantics.
- REQ-010: Team-target acceptance MUST settle/terminate the task-scoped child team run only after safe gates confirm no open delegated child work, no pending review state, no active task-agent instances inside the child team, and no pending runtime activity that would make termination unsafe.
- REQ-011: `send_message_to` MUST remain communication-only and MUST continue to allow messaging a visible team representative/coordinator when the communication roster exposes one.
- REQ-012: Prompt roster generation MUST distinguish “you can message” recipients from “you can delegate tasks to” targets.
- REQ-013: The delegation target roster shown to model agents MUST include physical local member targets and visible team targets, with labels that identify target kind and, for team targets, the ingress coordinator/representative where known.
- REQ-014: The communication roster shown to model agents MUST identify subteam representatives as representatives, not as physical local members.
- REQ-015: Invalid target attempts MUST fail deterministically with clear errors: unknown member target, unknown team target, member target is not physical in current team, team target has no resolvable coordinator/default ingress, or team-task activation failed.
- REQ-016: Existing member-target task delegation behavior MUST remain supported without reintroducing removed legacy task-plan tools.

- REQ-017: Roster rendering MUST be capability-gated: communication roster only when `send_message_to` recipient-name delivery is usable, and delegation target roster only when `delegate_task` is usable.
- REQ-018: Communication roster rows MUST be derived from communication recipients and labeled by scope (`local_agent`, `subteam_representative`, `parent_boundary_agent`).
- REQ-019: Delegation target roster rows MUST be derived from actual current-team topology and labeled by target kind (`member` or `team`).
- REQ-020: Team delegation target rows MUST show the team as accountable owner and the coordinator/representative only as ingress when resolvable.
- REQ-021: Prompt wording MUST explicitly state that messaging a representative is communication-only and does not create task lifecycle state.
- REQ-022: Prompt wording MUST explicitly state that delegating to a team creates team-owned task lifecycle state delivered initially through the team's ingress coordinator.
- REQ-023: The task target selector shape MUST be explicit enough to prevent a bare name from ambiguously meaning either a member or a team.
- REQ-024: Invalid target errors MUST use deterministic task-target error codes and include clear recovery guidance.
- REQ-025: The model-facing member delegation roster MUST exclude the current live member and self-target attempts MUST fail deterministically.
- REQ-026: The implementation MUST keep communication-recipient data and delegation-target data as separate structured manifests or equivalent structures before prompt rendering.
- REQ-027: The delegation target resolver MUST preserve target-kind-specific topology data for physical members and visible teams instead of reducing both to a flat member name list.
- REQ-028: The prompt composer MUST decide roster sections from actual active tool exposure plus usable runtime context, not from team topology alone.
- REQ-029: Nested-team prompt generation MUST satisfy scenarios S1 through S7, including parent rosters, child coordinator rosters, child non-coordinator rosters, multiple subteam rosters, ambiguous representative handling, and post-completion lifecycle visibility.
- REQ-030: Parent-boundary communication recipients visible to a child-team representative MUST remain communication-only and MUST NOT become child-team delegation targets.
- REQ-031: A parent member's team delegation roster MUST include visible child teams as team targets but MUST NOT include nested child leaf agents as member targets.
- REQ-032: Ambiguous same-name communication recipients or same-name representative/local-member collisions MUST be rejected or explicitly disambiguated; the implementation MUST NOT silently choose one route.
- REQ-033: The frontend MUST create a visible task-team execution projection when it receives a task-delegation activation/update event with `execution_kind = "task_team"` and task-team identity fields.
- REQ-034: The task-team execution projection MUST be structurally distinct from the topology/template `agent_team` node. The structural `SoftwareEngineeringTeam` node remains the team definition/topology entry; the runtime projection represents a concrete delegated execution such as `SoftwareEngineeringTeam · task_0001`.
- REQ-035: The frontend task-team projection model MUST use explicit task-team fields (`isTaskTeamInstance`, `taskTeamInstanceId`, `taskTeamRunId`, `taskId`, `logicalTeamRouteKey`, and logical team path/name) or an equivalently tight discriminated active-task-execution model. It MUST NOT add a loose optional-field kitchen-sink node where task-agent and task-team meanings overlap ambiguously.
- REQ-036: The frontend stream handling MUST consume `TASK_DELEGATION_EVENT` payloads for both `task_agent` and `task_team` execution kinds. A task-team-only event MUST NOT silently no-op.
- REQ-037: The frontend MUST show task-team execution status across the lifecycle states needed by the delegator: active/running, awaiting review after team result submission, revision requested/active again, accepted, settling, and settled/removed according to explicit cleanup rules.
- REQ-038: Result submission, revision request, acceptance, and settlement events for a team-target task MUST produce visible lifecycle state or timeline entries associated with the task-team execution for the parent delegator.
- REQ-039: Task-agent projections spawned inside a task-scoped child team MUST remain understandable in relation to the parent task-team execution, either by appearing under/near the task-team projection or by showing the parent task-team/task id association in the active execution UI.
- REQ-043: The task-team execution projection MUST show the delegated team's internal member nodes inside the transient task-team execution, not only the task-team card itself. These child nodes MUST be task-scoped projections with route/run identity namespaced to the task-team execution so they do not collide with the structural team's member nodes.
- REQ-044: Task-scoped child member, nested team, and child task-agent stream events MUST carry authoritative task-team execution context before updating transient child projections. The required contract is `task_team_run_id` plus relative child path/route for task-scoped child events; when that identity is absent from a task-team-scoped payload, the frontend MUST NOT guess or update the wrong task-team or structural node, including when multiple same-logical-team task-team executions are active.
- REQ-040: Existing frontend behavior for member-target task-agent projections MUST remain unchanged: task-agent nodes/cards, focus behavior, approval affordances, composer hiding, and cleanup continue to work for member-target delegation.
- REQ-041: Task-team execution focus MUST be explicit and safe. Selecting a task-team execution may show a task-team status/timeline and nested child activity, but it MUST NOT imply ordinary manual chat finalization; result/review remains governed by task lifecycle tools.
- REQ-042: Product-complete validation MUST include frontend unit/component coverage and API/E2E or integration coverage that proves a team-target delegation creates a visible task-team projection and task lifecycle updates are reflected in UI state.

## Acceptance Criteria

- AC-001: A product-manager agent in a parent team that contains `SoftwareEngineeringTeam` but not `solution_designer` as a physical parent member cannot delegate a member-target task to `solution_designer`.
- AC-002: The same product-manager agent can still `send_message_to` `solution_designer` when `solution_designer` is exposed as the `SoftwareEngineeringTeam` representative in the communication roster.
- AC-003: The same product-manager agent can `delegate_task` to target kind `team` for `SoftwareEngineeringTeam`.
- AC-004: Team-target delegation creates/binds a task ledger record whose accountable target is `SoftwareEngineeringTeam`, not `solution_designer`.
- AC-005: Team-target activation creates/restores a task-scoped child team run and delivers a task packet to the child team's coordinator/default ingress.
- AC-006: The child team coordinator can coordinate local child-team members without requiring the product manager to be a physical child-team member.
- AC-007: Team-target result submission notifies/routes to the original product-manager delegator for review.
- AC-008: Product-manager acceptance marks the team-target task accepted and requests safe child-team settlement/termination.
- AC-009: Product-manager revision request delivers revision instructions to the same task-scoped child team run/ingress.
- AC-010: Prompt text for the product manager contains separate sections or equivalent structure for communication recipients and task delegation targets.
- AC-011: In the product-manager prompt, `solution_designer` is labeled as a communication representative of `SoftwareEngineeringTeam`; `SoftwareEngineeringTeam` is labeled as a team delegation target.
- AC-012: Member-target delegation in a flat same-team scenario still creates a task-agent instance and passes existing lifecycle tests.
- AC-013: The model-facing task tool surface does not reintroduce legacy `create_task`, `assign_task_to`, `get_my_tasks`, or task-plan APIs.

- AC-014: When `delegate_task` is not configured/exposed for a run, the prompt does not show “You can delegate tasks to” or any actionable delegation target roster.
- AC-015: When `send_message_to` is not configured/exposed for a run, the prompt does not show “You can message” as an actionable recipient-name roster.
- AC-016: When both tools are configured, the prompt shows separate “message” and “delegate task” sections and does not merge their targets.
- AC-017: A subteam representative appears in the communication roster with a representative label but does not appear as a member delegation target unless physically present in the current team.
- AC-018: A visible subteam appears in the delegation target roster as a team target with accountable owner set to the team and ingress set to its coordinator/representative when resolvable.
- AC-019: Invalid team/member target attempts return deterministic error codes from the required target error list.
- AC-020: In the canonical parent product-manager scenario, the prompt shows `solution_designer` only as a communication recipient and `SoftwareEngineeringTeam` as the team delegation target.
- AC-021: In any current team context, the current live member does not appear in the model-facing member delegation target roster, and an explicit self-target request returns `TASK_MEMBER_TARGET_SELF_NOT_ALLOWED`.
- AC-022: A test or snapshot verifies that a prompt with only `delegate_task` exposed has a delegation roster but no actionable `send_message_to` recipient roster.
- AC-023: A test or snapshot verifies that a prompt with only `send_message_to` exposed has a communication roster but no actionable `delegate_task` target roster.
- AC-024: A test or snapshot verifies that delegation targets are not derived from `communicationRecipients` by constructing a context where `solution_designer` is a communication recipient but not a member delegation target.
- AC-025: A snapshot or equivalent assertion verifies Scenario S2 for `product_manager`: `solution_designer` is message-only representative, and `SoftwareEngineeringTeam` is the team delegation target.
- AC-026: A snapshot or equivalent assertion verifies Scenario S3 for `solution_designer`: child-team members are local message/delegation options, parent members are communication-only parent-boundary recipients, and parent members are not delegation targets.
- AC-027: A snapshot or equivalent assertion verifies Scenario S4 for `implementation_engineer`: parent-boundary recipients are not visible by recipient name unless explicitly enabled for non-representatives, and parent members are not delegation targets.
- AC-028: A snapshot or equivalent assertion verifies Scenario S5: multiple child teams produce separate team delegation targets with their own ingress representatives.
- AC-029: Ambiguous representative names or representative/local-member same-name collisions fail deterministically or use an explicitly tested disambiguation shape.
- AC-030: After Scenario S7 acceptance, the task-scoped child team run is settled/terminated while the parent run remains active and future team delegation remains based on topology, not completed exact run ids.
- AC-031: The PM iterative-work loop in Scenario S7 can execute at least two sequential team-target delegations from the same parent product-manager run, with the first task-scoped child team run settled before or independently of the second task's team run.
- AC-FE-001: When a team-target task activates, the frontend creates a visible task-team execution projection with task id, task-team instance id, task-team run id, and logical team route key.
- AC-FE-002: The task-team projection is visually distinct from the structural team node and labeled as a task-team execution, e.g. `SoftwareEngineeringTeam · task_0001` with a `Task team` badge.
- AC-FE-003: `TASK_DELEGATION_EVENT` with `execution_kind: "task_team"` is consumed by the frontend and does not silently no-op.
- AC-FE-004: The task-team projection has explicit lifecycle behavior for active/running, awaiting review, revision requested/active again, accepted, settling, settled, and cleanup/history.
- AC-FE-005: Task-agent projections created inside the task-scoped team remain understandable in relation to the parent task-team execution.
- AC-FE-011: Expanding or focusing `SoftwareEngineeringTeam · task_0001` shows task-scoped child member nodes such as `solution_designer`, `implementation_engineer`, and `code_reviewer` inside that transient task-team execution, distinct from the structural team members.
- AC-FE-012: With two active task-team executions for the same logical team, an explicitly stamped child event updates only the matching task-team child projection, while a malformed task-team-scoped event missing `task_team_run_id` is dropped/logged and does not update the wrong task-team or the structural child node.
- AC-FE-006: Team result submission, review, revision, acceptance, and settlement produce visible task lifecycle state or timeline entries for the parent delegator.
- AC-FE-007: Existing task-agent UI behavior remains unchanged for member-target delegation.
- AC-FE-008: A frontend unit or component test verifies task-team identity extraction and projection creation from a task-team `TASK_DELEGATION_EVENT`.
- AC-FE-009: A frontend streaming test verifies task-team status/timeline updates and cleanup on settled/offline-equivalent lifecycle events.
- AC-FE-010: An API/E2E or cross-layer integration test covers PM team-target delegation through visible task-team projection and subsequent lifecycle update, in addition to backend/runtime assertions.

## Constraints / Dependencies

- Server remains the owner of team lifecycle and task delegation (`autobyteus-server-ts`).
- Native `autobyteus-ts` team task plans must not be reintroduced.
- Existing `send_message_to` semantics must remain communication-only.
- Existing member-target task delegation lifecycle should be preserved or migrated cleanly under the new target model.
- Prompt/tool descriptions must avoid ambiguous bare-name semantics.
- Frontend task-team visibility depends on websocket `TASK_DELEGATION_EVENT` payloads carrying stable task-team identity fields (`execution_kind`, `task_team_instance_id`, `task_team_run_id`, `task_id`, `team_route_key`, `team_path`) and task lifecycle event types. Task-scoped child stream events additionally depend on authoritative task-team scoped fields: `task_team_run_id`, logical `team_route_key`/`team_path`, and relative child path/route fields.

## Assumptions

- A visible team target is a current-team `agent_team` member/wrapper such as `SoftwareEngineeringTeam`.
- A physical local member target is a current-team `agent` member, not a representative exposed only by communication roster.
- Child team ingress defaults to the child team's configured coordinator route when present, or existing default `TeamRun.postMessage` behavior where safe.
- A task-scoped child team run may be implemented by reusing child team run creation/restoration infrastructure, but its lifecycle must be bound to the task ledger.

## Risks / Open Questions

- Frontend placement tradeoff: task-team executions can be projected as transient `agent_team` nodes and also surfaced in a generalized active task executions bar. The target design should avoid duplicating contradictory state between those surfaces.
- Tool input shape: whether to use new fields (`target_kind`, `member_name`, `team_name`) or a nested `target` object depends on current tool-schema capability and model compatibility.
- Whether to preserve `member_name` as a compatibility shorthand for member targets or require the explicit target kind immediately.
- Whether team-target result submission should reuse `submit_task_result` with team-task context or add a distinct internal context shape while keeping the same model-facing tool.
- How to represent task-scoped team run identity in history/projections without confusing it with ordinary child team runs.
- Whether team-task settlement should call existing `terminateTeamRun` directly or a new task-scoped team settlement boundary with stronger safety checks.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001, REQ-002, REQ-003 | UC-002 |
| REQ-004, REQ-005, REQ-006, REQ-007 | UC-003, UC-004 |
| REQ-008, REQ-009, REQ-010 | UC-005, UC-007 |
| REQ-011, REQ-014 | UC-001, UC-006 |
| REQ-012, REQ-013 | UC-006 |
| REQ-015 | UC-001, UC-002, UC-003 |
| REQ-016 | UC-002 |
| REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024 | UC-006 |
| REQ-025, REQ-026, REQ-027, REQ-028 | UC-001, UC-002, UC-003, UC-006 |
| REQ-029, REQ-030, REQ-031, REQ-032 | UC-001, UC-003, UC-004, UC-005, UC-006, UC-007 |
| REQ-033, REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, REQ-040, REQ-041, REQ-042, REQ-043, REQ-044 | UC-003, UC-004, UC-005, UC-007, UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Parent PM cannot directly member-delegate to nested representative. |
| AC-002 | Parent PM can still communicate with nested representative. |
| AC-003, AC-004, AC-005 | Parent PM can team-delegate to SoftwareEngineeringTeam with proper team ownership. |
| AC-006 | Child team can execute internally after team-task activation. |
| AC-007, AC-008, AC-009 | Team-task result/review/revision/settlement lifecycle. |
| AC-010, AC-011 | Prompt/roster clarity for model behavior. |
| AC-012 | Existing member delegation does not regress. |
| AC-013 | Legacy task-plan tools remain removed. |
| AC-014, AC-015, AC-016 | Roster sections are shown only when matching tools are exposed. |
| AC-017, AC-018 | Communication representatives and delegation targets are separated correctly. |
| AC-019 | Invalid target errors are deterministic and actionable. |
| AC-020 | Canonical PM-to-engineering-team prompt displays the intended model. |
| AC-021 | Self-delegation is not offered and fails predictably if attempted. |
| AC-022, AC-023 | Prompt rendering is capability-gated independently per tool. |
| AC-024 | Implementation cannot accidentally use communication recipients as delegation targets. |
| AC-025, AC-026, AC-027, AC-028, AC-029 | Nested-team roster scenarios are concretely covered. |
| AC-030 | Completed team-task lifecycle exits the task-scoped team run without removing future topology-based team delegation. |
| AC-031 | Parent PM can continue sequential feature-delegation work after a task-scoped team run settles. |
| AC-FE-001, AC-FE-002, AC-FE-003 | Team-target activation is visible as a distinct task-team execution projection. |
| AC-FE-004, AC-FE-006 | Team-task lifecycle and review/submission states are visible to the parent delegator. |
| AC-FE-005, AC-FE-011, AC-FE-012 | Nested child member nodes, event routing, and task-agent activity remain understandable relative to the parent task-team execution without structural-node collisions. |
| AC-FE-007 | Existing member-target task-agent frontend behavior does not regress. |
| AC-FE-008, AC-FE-009, AC-FE-010 | Frontend and cross-layer coverage prove product-complete task-team visibility. |

## Approval Status

Approved by user direction on 2026-06-26 for design work; revised on 2026-06-26 after CR-005 requirement-gap reset to include frontend task-team execution visibility. Ready as revised design input pending architecture review.
