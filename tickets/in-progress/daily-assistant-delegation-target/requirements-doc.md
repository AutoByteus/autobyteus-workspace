# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `daily-assistant-delegation-target`
- Request / ticket: Project Task `autobyteus-455` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): the built-in Daily Assistant is not in `list_available_agents`, so the Project Task Manager and other agents cannot delegate to it
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's word
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: `Solution Designer within the direction (user informed)` at SR-001 (first report to the PM 2026-11-10 ~06:00 CET); **confirmed by the User** at SR-002, the user's own words relayed by `/project_task_manager` (2026-11-10, voice message, condensed): "This rule should be removed. The list of available agents should return all those agents except itself, right? It doesn't make sense that we have a Daily Assistant that can handle general tasks but you cannot dispatch to it." The PM's relay adds: the rule applies to `@`, list_available_agents, delegate_task and a peer's list. The user did not mention the Model Router; it stays out only as an internal server helper (DEC-003, reasoning reported to the user).
- Exact approved requirements baseline / solution revision: this document at SR-001, confirmed unchanged at SR-002
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: The collaboration eligibility policy excludes every built-in agent, so the Daily Assistant has no address in `list_available_agents` (local or peer) and `delegate_task` to `/daily_assistant` is refused. The exclusion was decided for the `@` menu on 2026-09-30 ("the default chat agent") and inherited unchanged by agent delegation; nobody decided it for delegation. The user wants the Daily Assistant, his general-purpose agent, to take Tasks from the PM and other agents.
- Affected actors or systems: the user; agents using `list_available_agents` / `delegate_task` (PM first); peer nodes; `@` in composers.
- Desired outcome: the Daily Assistant is an ordinary collaborator at `/daily_assistant`, listed and delegable locally and from peers; the Model Router stays never-a-collaborator; every existing self/in-run/teammate guard stays.
- Observable definition of success: on an isolated node, the PM's `list_available_agents` shows Daily Assistant at `/daily_assistant`; `delegate_task` there with a Task creates a Daily Assistant copy that works the Task; a peer node's list shows it too.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `list_available_agents` omits the Daily Assistant and the Model Router | Lists Daily Assistant at `/daily_assistant` (with its description), like other shared agents | Model Router never listed, also with "Show internal agents" on; Orgs, non-shared, application-owned, own definition rules unchanged; list order unchanged otherwise | Source Log: policy L68-69, L211-214 |
| BEH-002 | System | SCN-002 | `delegate_task` to `/daily_assistant` refused as unknown address | Creates a Daily Assistant copy for the Task | Copy placement/workspace (autobyteus-97), launch settings, Task semantics unchanged | Task report; policy |
| BEH-003 | System | SCN-003 | Peer node's list omits it; remote delegation to it refused | Peer list shows it; remote delegation admits it | Remote copies run in the peer's temp workspace (unchanged) | remote-catalog-lister, receiver |
| BEH-004 | User | SCN-004 | `@` menus (live run and New chat) never offer the Daily Assistant | `@` offers it like any shared agent, except in its own run (own definition) | Model Router never offered; New chat target picker and `×` back to Daily Assistant unchanged | cross-scope-agent-mentions REQ-001; web draft eligibility |
| BEH-005 | Contract | SCN-005 | Delegating to the run's own definition, a second instance of an in-run definition, a teammate or own team is refused | Same | Unchanged, now also applies with the Daily Assistant as viewer or target | policy L172-193; LLM contract wording |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Hand personal Tasks to his Daily Assistant through the PM | PM can delegate to `/daily_assistant` | Release only on his word; no change to his data |
| Project Task Manager / any agent | Find and delegate to the Daily Assistant | Listed and delegable | Loops and self-delegation refused |
| Peer nodes | List and delegate to this node's agents | Daily Assistant included | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent lists available agents and sees the Daily Assistant | SCN-001, SCN-003 |
| UC-002 | An agent delegates a Task to the Daily Assistant (local or from a peer) | SCN-002, SCN-003 |
| UC-003 | The user `@`-mentions the Daily Assistant from another agent's run or New chat | SCN-004 |

### Out Of Scope

- Where a delegated copy runs (autobyteus-97 rule) and the Daily Assistant's tools, prompt or template.
- Model Router exposure (stays internal; user's direction).
- New loop-detection rules beyond the existing guards (see DEC-005).
- Agent package descriptions / the PM skill (DEC-006: not needed).
- Releases (only on the user's word).

### Non-Goals

- Making other internal agents collaborators.

### Preserved Behavior Boundary

- BEH-001…BEH-004 preserved columns; BEH-005 in full; autobyteus-97 REQ-001/002 (copy workspace); built-in bootstrap and launch-default ownership (`BUILT_IN`) unchanged.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The Daily Assistant is an eligible collaborator wherever shared agents are: `list_available_agents` (at `/daily_assistant` unless that address is taken, as for any agent), `delegate_task` by address, a peer node's list and remote delegation, and `@` candidates (live runs and New chat). | BEH-001, BEH-002, BEH-003, BEH-004 | Must | User direction; one eligibility rule for all surfaces | N/A | Task item 2; DEC-001, DEC-002 |
| REQ-002 | The Model Router is never a collaborator on any of these surfaces, whatever the "Show internal agents" setting. | BEH-001, BEH-004 | Must | Internal helper | N/A | Task item 2; DEC-003 |
| REQ-003 | Existing guards stay: a run never lists or delegates to its own definition (a Daily Assistant run does not see `/daily_assistant`), never creates a second instance of a definition already in the run, and refuses teammates / its own team. | BEH-005 | Must | Self-delegation and loop guard | N/A | Task constraints; DEC-005 |
| REQ-004 | A Daily Assistant copy runs where any delegated copy runs (autobyteus-97): the Task's Project's first linked folder, else the delegating top-level run's folder; a remote copy in the peer's temp workspace. | BEH-002, BEH-003 | Must | Preserve an approved rule; corrects the Task's "temporary workspace" premise | N/A | DEC-004 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | A non-DA run (e.g. PM) calls `list_available_agents` | Entry `Daily Assistant`, kind agent, address `/daily_assistant`, its description; no Model Router entry, also with internal agents shown | — | Server unit + API/E2E on isolated node |
| AC-002 | REQ-001, REQ-004 | BEH-002 / SCN-002 | PM calls `delegate_task` to `/daily_assistant` with a saved Task (and with a description) | `delegated: true`, a Daily Assistant copy starts and works the Task, in the folder REQ-004 names | Model Router address refused as unknown | Server unit + API/E2E on isolated node (real delegation) |
| AC-003 | REQ-001 | BEH-002 / SCN-002 | The Daily Assistant copy from AC-002 | It can reply to the PM with its result (send_message_to to the delegator) | — | API/E2E (RSK-001) |
| AC-004 | REQ-001, REQ-002 | BEH-003 / SCN-003 | A peer node lists this node's agents and delegates to `/daily_assistant` | Listed; remote delegation admitted; Model Router absent/refused | — | Server unit (remote lister/receiver) + peer probe on isolated nodes |
| AC-005 | REQ-001, REQ-002, REQ-003 | BEH-004 / SCN-004 | `@` in a live non-DA run and in New chat for a non-DA target | Daily Assistant offered and admitted; in a Daily Assistant run/draft it is not offered (own definition); Model Router never offered | — | Server unit + web unit (draft eligibility, mirror contract) |
| AC-006 | REQ-003 | BEH-005 / SCN-005 | A Daily Assistant run calls `list_available_agents` / `delegate_task('/daily_assistant')`; a run that already contains a DA copy delegates to it again | Own definition absent and refused; no second DA instance created (existing in-run behavior) | — | Server unit |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | PM agent | Find a general-purpose agent | `list_available_agents` | PM run on a node | List | DA listed at `/daily_assistant` | — | Supported Normal Scenario | Task report | REQ-001/002, AC-001 |
| SCN-002 | System | PM agent on the user's word | Hand a personal Task to the DA | `delegate_task` | Saved Task in a Project | Delegate → copy works → reports back | Copy created and works the Task | — | Supported Normal Scenario | Task (miscellaneous-1 case) | REQ-001/004, AC-002/003 |
| SCN-003 | System | Agent on a peer node | Use another node's DA | peer list / remote delegate | Peers registered | List → delegate | Listed and admitted | — | Supported Normal Scenario | Task item 3 | AC-004 |
| SCN-004 | User | User | Involve the DA from another agent's run | `@` | Non-DA run | Mention → send | DA offered and added | Own run: not offered | Supported Normal Scenario | Single eligibility owner (cross-scope REQ-001 updated) | AC-005 |
| SCN-005 | Contract | Any agent | Self-delegation / duplicate instance | delegate to own definition / in-run definition | — | — | Refused / existing instance | — | Supported Explicit Edge Scenario (Task constraint) | Task constraints | AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (minor): the Daily Assistant appears as an `@` candidate (BEH-004) in the existing menu; no new UI.
- All Product design fields: `N/A — not applicable` (no new UI; no Product request).

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Security | The Model Router never becomes delegable or mentionable | Any setting | Unit tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. Built-in folders and user data untouched.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Peer nodes run their own version | A peer lists its own DA only once it runs a version with this fix | Remote lister uses the peer's own policy | Docker peers need the new server image (release) |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A delegated DA copy gets the same automatic collaboration tools as any catalog copy | AC-003 | API/E2E | Open (RSK-001) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Accident or rule? | Task item 1/2 | Rule from cross-scope-agent-mentions REQ-001 (2026-09-30, `@` menu: "the default chat agent"); delegation inherited it via agent-initiated-collaborators ("same as the `@` menu") | A deliberate `@` rule, inherited by delegation without its own decision. The user's direction says it is wrong for the DA → make it eligible | Solution Designer within direction | Decided |
| DEC-002 | Does `@` also offer the DA? | One policy owns `@` and delegation | (a) one rule everywhere; (b) split `@` vs delegation eligibility | (a): the original reason (DA is the default chat) is still served by the New chat target picker and the own-definition rule (a DA chat never offers itself); splitting the single eligibility owner adds a second rule and a menu that hides an agent agents can reach. `@` in another agent's run is the user's own way to involve an agent, "like the other agents" | Solution Designer within direction | Decided (user informed; can revert) |
| DEC-003 | Model Router | Internal; the user's SR-002 words say "all agents except itself" and do not name it | Stays excluded; also covers "Show internal agents" on | Keep it out: it is a server helper, not a worker. Its only tools are `list_available_agent_runtimes` and `submit_launch_choices` plus file/web reading (template `agent-config.json`), and its runs exist to answer routing requests from Model Routing (GLOSSARY: "never a collaboration member"). A delegated copy would get no routing requests, so it could do nothing useful with a Task. The user still talks to it directly ("Talk to the router"). Reported to the user via the PM; he can ask to include it | Task direction (PM: "keep it out only if it is an internal server helper") | Decided (user informed) |
| DEC-004 | Workspace of the copy | Task item 3 says "temporary workspace" | autobyteus-97 approved rule | Keep autobyteus-97: Project linked folder, else the delegating run's folder (temp workspace when the PM runs there); remote → peer temp workspace. Tell the PM | Solution Designer within direction | Decided |
| DEC-005 | Loop guard | Task constraint | Existing: own definition, in-run duplicate, teammate/own team refused | The DA gets exactly the guards every agent has; making it a target creates no loop path other agents lack. No new loop rule | Solution Designer within direction | Decided |
| DEC-006 | PM skill / descriptions update | Task item 4 | The PM discovers agents by `list_available_agents` | Not needed: the DA's description is listed as-is | Solution Designer within direction | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001/002/003 | BEH-001…004 | AC-001…005 | SCN-001…004 |
| REQ-002 | UC-001/003 | BEH-001, BEH-004 | AC-001, AC-004, AC-005 | SCN-001, SCN-004 |
| REQ-003 | UC-002 | BEH-005 | AC-005, AC-006 | SCN-005 |
| REQ-004 | UC-002 | BEH-002, BEH-003 | AC-002 | SCN-002, SCN-003 |

## Architecture Phase Input

- Approved scenarios: SCN-001…005.
- Constraints: one eligibility owner; Model Router excluded independent of internal visibility; web draft mirror stays pinned to the server.
- Deferred to design: where the "never a collaborator" fact lives.
- Verify: no other surface filters built-ins for collaboration.
- Risks: RSK-001.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed via the PM report and the result)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
