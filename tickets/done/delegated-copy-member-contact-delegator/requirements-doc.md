# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `delegated-copy-member-contact-delegator`
- Request / ticket: Project Task `project_task_a7fe75d1-31a4-4819-9706-59a76aaa1dc2` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-09
- Approval state and reference: **Approved** by the user on 2026-10-09 in the Solution Designer conversation ("Thanks, I agree now, approve."), after the scope summary of 4 changes
- Exact approved requirements baseline / solution revision: SR-005 (this document)
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: in a standalone Agent run (e.g. the Project Task Manager), members of a delegated copy cannot contact the agent that delegated the work. The `@` menu hides it, the server rejects a mention of it, `list_available_agents` does not list it, and only the copy's coordinator is told its address and run ID. Cause: the `@`/catalog rule "exclude the run's own definition" was meant to stop the host from mentioning itself. Candidates are computed per root, not per focused agent, so the rule hides the host from every agent in the run. The earlier `mention-candidates-in-run` ticket deliberately deferred per-focused-agent exclusion.
- Affected actors or systems: the user typing in a copy member's composer; agents inside delegated copies (Team copy members, Agent copies, nested copies); the delegating agent; Agent, Team and Org roots.
- Desired outcome (user direction 2026-10-09): the **user** can direct any member of a delegated copy to the delegator by `@`-mentioning it in that member's composer. The member learns the delegator's address from the mention note attached to the user's message, not from its system prompt. The message reaches the existing delegating run, never a new copy. Member system prompts are unchanged.
- Observable definition of success: in the desktop app, a code reviewer in a Software Engineering Team copy under the PM can `@Project Task Manager`, and the PM's existing run receives the code reviewer's message.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Task-child composers in an Agent run never offer the host (delegator) in `@` | `@` offers the host to every agent in the run except the host itself | The host's own composer still doesn't offer the host | F-01, F-04 |
| BEH-002 | User | SCN-001 | A mention of the host from a task child is rejected ("this run's own definition") | It resolves to the existing host at its address, marked as already in the run | No mention ever creates a second instance of the host | F-02 |
| BEH-003 | Contract | SCN-001, SCN-002 | `send_message_to(<host address>)` from a copy member reaches the existing host | Unchanged | Same | F-03 |
| BEH-004 | Contract | — | `send_message_to(<run ID>)` reaches any AgentRun in the root | Unchanged | Same | F-03 |
| BEH-005 | Contract | SCN-002 | `list_available_agents` never lists the host | Lists the host at its address for every caller except the host | Host doesn't list itself; app-owned runs list nothing; no system-prompt change | F-01 |
| BEH-006 | Contract | SCN-001 | Only the copy's first-message recipient (coordinator / Agent copy) learns the delegator's address and run ID, from the delegation message | Unchanged in prompts. A non-coordinator member learns the delegator's address when the user `@`-mentions it (the mention note in the user's message). | Member system prompts and the coordinator's work packet are unchanged (user direction SR-002) | F-07 |
| BEH-007 | User | SCN-004 | Team/Org-root copy members can already `@` a configured delegator; it resolves to the existing member | Unchanged | Same | F-05, F-06 |
| BEH-008 | User | — | `@` menus offer the focused agent's **own** definition (except the Agent-run host's own composer) | Unchanged (out of scope, SR-004) | All of it | F-01, F-04 |
| BEH-009 | Contract | SCN-003 | Nested delegator (a copy member that delegated): reachable by run ID only, which only the nested copy's coordinator receives. `@` of its definition brings in that catalog definition as a new collaborator. | Unchanged (out of scope, SR-002) | All of it | F-08 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Direct any copy member to contact the delegator | `@delegator` works from any member composer | Same rule in every root kind |
| Copy member agent | Ask the delegator something (e.g. a follow-up ticket) | Knows the delegator's address/run ID; message reaches the existing run | Never spawns a new delegator copy |
| Delegating agent (e.g. PM) | Receive requests from its delegated work | Receives the member's message in its existing conversation | Its own `@` still excludes itself |
| Copy coordinator | Owns the delegated work | Still receives the work packet. No longer the only relay. | No automatic relay or CC (option A) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | User `@`-mentions the delegating host from a task child's composer in an Agent run, and the message reaches the existing host | SCN-001 |
| UC-002 | A copy member agent that the user asked to contact the delegator finds its address (from the user's `@` note or `list_available_agents`) and messages it; the existing run receives it | SCN-001, SCN-002 |
| UC-003 | *(Withdrawn in SR-004)* | — |
| UC-004 | A copy member asked in plain words discovers the host via `list_available_agents` | SCN-002 |

### Out Of Scope

- Any change to member system prompts, the platform collaboration rules, or the delegation work packet (a stricter "contact outside handoff rules only on explicit user request" wording is a separate-ticket candidate). Members are not told the delegator in their instructions (user direction SR-002).
- Nested delegators (a copy member that delegated, BEH-009/SCN-003): unchanged.
- Automatic CC/notification to the coordinator when a member contacts the delegator.
- Any change to who may **delegate** to whom; `delegate_task` to the host stays refused.
- Address uniqueness for parallel copies (`/software_engineering_team` appearing several times); run ID remains the exact identifier.
- The New chat **draft** `@` list (no run yet, no focused member yet).
- Application-owned runs (no `@`, unchanged).

### Non-Goals

- No new UI surface beyond the existing `@` menu (no "delegator" badge or panel).

### Preserved Behavior Boundary

BEH-003, BEH-004, BEH-006 (prompts/work packet), BEH-007, BEH-009 unchanged. BEH-008 unchanged (SR-004). The host's own composer and the host's own `list_available_agents` never offer the host. No mention or address ever creates a second instance of a definition already in the run. Built-ins, Agent Orgs and non-shared definitions stay excluded. Application-owned runs show no candidates. Saved mention notes from earlier releases still render.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | In a standalone Agent run, the `@` menu of every agent other than the host offers the host's definition (the delegator). The host's own composer still doesn't offer it. All other candidate rules are unchanged, including in Team and Org runs. | BEH-001 | Must | Fixes the reported case with the smallest change | Task item 3a; user direction SR-004 |
| REQ-002 | A mention of the Agent-run host's definition sent from any agent other than the host resolves to the existing host at its host address, reported as already in the run. Sending it never creates a new instance. The server re-check applies the same focused-agent rule as REQ-001. | BEH-002 | Must | Mentioning the delegator must reach the existing run | Task item 3b |
| REQ-003 | `list_available_agents` lists the standalone Agent-run host at its host address for every caller in that run except the host itself. No system-prompt text changes. | BEH-005 | Must | Same rule as the `@` menu; lets an agent asked in plain words find the address | User approval SR-005 |
| REQ-004 | When a mentioned entry is the Agent-run host, the note in the message explicitly tells the focused agent to use `send_message_to` with the host's address to message it. For that entry it offers no `delegate_task` alternative, so the agent has nothing ambiguous to choose between. Delegating to the host is refused. | BEH-002 | Must | Following the note must reach the delegator unambiguously | Investigation F-03, R-03; user direction 2026-10-09 (SR-003) |
| REQ-005 | *(Withdrawn in SR-002.)* Delegator context in member instructions is not added. Members learn the address through the user's `@` note (REQ-002/REQ-004) or `list_available_agents` (REQ-003). | — | — | User direction 2026-10-09 | SR-002 |
| REQ-006 | A `send_message_to` from any copy member to the Agent-run host's address reaches the existing host run and never creates a new copy or collaborator. | BEH-003 | Must | Regression guard for the contact path | Task item 3b |
| REQ-007 | *(Withdrawn in SR-002, depended on REQ-005.)* | — | — | — | SR-002 |
| REQ-008 | *(Withdrawn in SR-002.)* Nested delegators are out of scope; behavior unchanged. | — | — | — | SR-002 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | PM Agent run with a delegated SE Team copy. User opens `@` in the code reviewer composer. | Project Task Manager is listed | In the PM's own composer, PM is not listed. Other candidates are unchanged. | Server unit + web unit + desktop |
| AC-002 | REQ-002, REQ-004 | BEH-002 / SCN-001 | AC-001 setup; user sends "@Project Task Manager please create ticket X" to the code reviewer | Message is posted; the code reviewer's note names Project Task Manager at `/project_task_manager` and explicitly says to use `send_message_to` with that address. For that entry the note offers no `delegate_task` alternative. | No new collaborator/copy appears in the run tree | Server unit/integration + E2E |
| AC-003 | REQ-002, REQ-006 | BEH-002, BEH-003 / SCN-001 | Following AC-002, the code reviewer messages the PM | The PM's **existing** run receives the message (shown in its conversation and the Team tab) | — | Integration/E2E + desktop (user verification) |
| AC-004 | *(Withdrawn in SR-002)* | — | — | — | — | — |
| AC-005 | *(Withdrawn in SR-002)* | — | — | — | — | — |
| AC-006 | REQ-003, REQ-006 | BEH-005, BEH-003 / SCN-002 | Copy member calls `list_available_agents` in an Agent run, then `send_message_to` the listed host address | Result includes the host at `/project_task_manager`; the message reaches the existing host run | The host's own call does not include itself | Server unit + integration |
| AC-007 | Preserved | BEH-008 | Existing Team/Org `@` and `list_available_agents` tests | Unchanged results in Team and Org runs | — | Existing suites |
| AC-008 | Preserved | BEH-006 | Any delegated copy member is activated | Its system prompt is identical to today's (no delegator section); the coordinator's work packet is unchanged | — | Existing prompt tests |
| AC-009 | Preserved | BEH-003, BEH-007, BEH-009 | Existing mention/addressing tests | Still pass. `delegate_task` to the host is still refused, and no address or mention creates a second instance of an in-run definition. | — | Existing suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Have a copy member ask the delegator directly | `@` in a task-child composer | Agent run with a delegated copy, live | 1. Focus the code reviewer. 2. Type `@`, pick Project Task Manager. 3. Send. 4. The code reviewer messages the PM. | PM's existing run receives the request | Mention of an ineligible definition is still rejected | Supported Normal Scenario | User report 2026-10-08 | REQ-001, 002, 004, 006; AC-001..003 |
| SCN-002 | Contract | Copy member agent | Contact the PM when the user asks in plain words ("send a message to the Project Task Manager") | User instruction in the member's composer | Member in a delegated copy in an Agent run | 1. Agent calls `list_available_agents`. 2. Finds the PM at its address. 3. `send_message_to`. | Existing PM run receives it | — | Supported Normal Scenario | User report; user approval SR-005 | REQ-003, 006; AC-006 |
| SCN-003 | Contract | Member of a nested copy | Contact its own delegator (a copy member) | — | Nested copy | — | Unchanged (out of scope, SR-002) | — | Technically possible; out of scope by user direction | Screenshot; F-08 | AC-009 (preserved) |
| SCN-004 | User | User | `@` a configured delegator in Team/Org roots | `@` in copy member composer | Team/Org root with copy | As SCN-001 | Already works; must keep working | — | Supported Normal Scenario | F-05/F-06 | AC-009 |
| SCN-005 | User | User | `@` list excludes the focused agent itself in all roots | — | — | — | Unchanged (out of scope, SR-004) | — | Out of scope by user direction | User reply 2026-10-09 | AC-007 (preserved) |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing `@` menu contents only, no new visuals)
- Product UI/UX fields: `N/A — not applicable` (no Product Design requested)
- Required behavior: in a standalone Agent run, a non-host composer's `@` list includes the host (REQ-001). The host's own list is unchanged.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 | Performance | Opening `@` keeps the current behavior of one candidates request per menu open | Per composer | Web unit |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (writes nothing new)
- Must preserve: existing run trees, saved conversations and saved mention notes render unchanged.
- Acceptable: N/A

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GraphQL `collaboratorMentionCandidates` (web ↔ server, same release) | Must be able to answer for a focused agent | F-01 | Design decides shape |
| Mention-note contract (`@autobyteus/agent-presentation-contracts`) | Saved notes from earlier releases still parse | Existing SAVED_NOTE_GUIDANCES pattern | Design decides wording |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` (this folder) | Evidence | All | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Messaging the host when it is idle activates it, as for any message today | AC-003 | Validation | Supported by code comment in `standalone-root-message-delivery.ts` |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Who in a delegated copy may contact the delegator directly? | Defines the product rule | User direction 2026-10-09: the **user** can address the delegator directly from any member's composer with `@`. The `@` note in the user's message gives the member the address. System instructions stay unchanged. | User | Resolved (approved SR-005) |
| DEC-002 | Nested delegator: what does `@` of it mean inside the nested copy? | — | Out of scope after SR-002; behavior unchanged | User | Resolved: out of scope (approved SR-005) |
| DEC-003 | Apply "exclude the focused agent's own definition" to Team and Org roots too? | — | User: move slow, don't increase scope | User | Resolved: No, out of scope (SR-004, pending baseline approval) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | F-01, F-04 |
| REQ-002 | UC-001 | BEH-002 | AC-002, AC-003 | SCN-001 | F-02 |
| REQ-003 | UC-002, UC-004 | BEH-005 | AC-006 | SCN-002 | F-01 |
| REQ-004 | UC-001 | BEH-002 | AC-002 | SCN-001 | F-03 |
| REQ-006 | UC-001, UC-002 | BEH-003 | AC-003, AC-006 | SCN-001, SCN-002 | F-03 |
| Preserved | — | BEH-004, BEH-006..009 | AC-007, AC-008, AC-009 | SCN-003..005 | F-05..F-08 |

## Architecture Phase Input

- Approved scenario IDs to map: SCN-001, SCN-002. SCN-003..SCN-005 preserved/out of scope.
- Hard constraint: no change to member system prompts or the delegation work packet.
- Constraints: one candidate-policy owner, shared by `@`, send-time re-check and `list_available_agents`. No second instance of any in-run definition. Saved mention notes still parse.
- Deferred to design: how the host becomes resolvable as an in-run address for non-host callers; how the focused agent reaches the candidates query; note wording for the host entry.
- Facts to verify: Team/Org stream handlers' focused-agent availability at send time.
- Risks: R-01..R-03 in investigation notes.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-09)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-005; no supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
