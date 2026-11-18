# Requirements Document — Internal Agents (autobyteus-308)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `internal-agents`
- Request / ticket: Project Task **autobyteus-308**, part of **autobyteus-32** (Model Router), which depends on it
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-10-25
- Approved by and reference: Solution Designer within the direction (user informed). The Task text (from handoff PRE-002 and the user's decision of 2026-10-25 in the Solution Designer conversation) sets every behavior; the decisions below are solution details within it. Reference: the Solution Designer's conversation message of 2026-10-25 (SR-001).
- Exact approved requirements baseline: this document at SR-001.
- Behavior-defining supplements: none.

## Problem And Desired Outcome

- Problem: the system's own helper agents (first: the Model Router of autobyteus-32) would appear in the Agents list, pickers and run history, and other agents (and peer nodes) could delegate to them.
- Desired outcome: an agent definition can be marked internal; while the server setting "Show internal agents" is off (default), internal agents and their runs are left out of every place where the user or an agent browses or picks agents; with it on, they appear like other agents.
- Observable definition of success: with a synthesized agent marked `"internal": true`, the Agents page, the pickers, run history, the Memory page, `list_available_agents`, @-mentions, `list_agent_definitions` and a peer's catalog all leave it out while the setting is off, `delegate_task` to it is refused, and all of them show it after the setting is turned on, without a restart.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current Behavior (evidence) | Desired Behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Every shared agent appears in the Agents list and pickers (`getVisibleAgentDefinitions`) | Internal agents left out while hidden | Normal agents unchanged | C-02 |
| BEH-002 | User | SCN-001 | Every agent's runs appear in run history and the Memory page | Internal agents' runs left out while hidden | Runs still recorded; direct open by run ID works | C-04, C-05 |
| BEH-003 | System | SCN-002 | Shared agents (except built-in ones) are eligible for `list_available_agents`, @, `delegate_task` and the peer catalog (`CollaboratorCandidatePolicy.isEligibleAgent`) | Internal agents not eligible while hidden | Built-in exclusion unchanged | C-03 |
| BEH-004 | System | SCN-002 | `list_agent_definitions` lists every agent | Internal agents left out while hidden | Other management tools by ID unchanged | C-06 |
| BEH-005 | Operational | SCN-003 | — | Server setting "Show internal agents" (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`), off by default, editable in Settings and by environment variable; takes effect on the next read | Other settings | C-07 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario |
| --- | --- | --- |
| UC-001 | The user browses or picks agents and runs (Agents page, new-run/team/Org/featured/application pickers, run history, Memory page, mobile apps through the same API) | SCN-001 |
| UC-002 | An agent or a peer node lists, mentions or delegates to agents | SCN-002 |
| UC-003 | The user turns "Show internal agents" on or off | SCN-003 |

### Out Of Scope

- The Model Router (autobyteus-32); marking any existing agent internal.
- A UI control to mark an agent internal (the attribute is set in `agent-config.json`).
- Internal Agent Teams; internal agents as team members.
- Token-usage statistics (accounting, not browsing), agent package file management.

### Non-Goals

- Access control: internal agents are hidden, not protected; their runs open by ID.

### Preserved Behavior Boundary

- Agents without the attribute behave exactly as today; no data migration.
- System-started runs of internal agents start, run and are recorded as today.
- Opening an agent definition or a run by its ID (`agentDefinition(id)`, run projection) works whatever the setting.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| REQ | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | An agent definition may carry `"internal": true` in its `agent-config.json` (shared, team-local and application-owned definitions read it the same way); absent or not `true` means a normal agent. Saving a definition keeps the attribute. | BEH-001 | Must | Task |
| REQ-002 | Server setting "Show internal agents" (`AUTOBYTEUS_SHOW_INTERNAL_AGENTS`, `true`/`false`), default off; changing it takes effect on the next list or read, without restart. | BEH-005 | Must | Task; DEC-001 |
| REQ-003 | While hidden, internal agents are left out of every listing built from the visible agent definitions: the Agents page, new-run, team-member, Org-placement, featured-item and application resource pickers, and the mobile apps. | BEH-001 | Must | Task |
| REQ-004 | While hidden, internal agents' runs are left out of the run history (workspace run history) and their memory out of the Memory page's agent list. | BEH-002 | Must | Task; DEC-003 |
| REQ-005 | While hidden, internal agents are not eligible collaborators: `list_available_agents` and the @ candidates leave them out, an @-mention of one fails as an unavailable agent, `delegate_task` to one is refused with today's "not an available agent" message, and a peer node's available-agents answer and delegation behave the same (they derive from the same rule). | BEH-003 | Must | Task; DEC-002 |
| REQ-006 | While hidden, `list_agent_definitions` leaves internal agents out. | BEH-004 | Should | DEC-004 |
| REQ-007 | While shown, internal agents appear and behave like other agents everywhere above; the Agents page marks them "Internal". | BEH-001..004 | Must | Task; DEC-005 |
| REQ-008 | Opening an internal agent's definition or run by ID works whatever the setting. | BEH-002 | Must | Task |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 003 | Synthesized agent with `"internal": true`; setting off | Absent from `agentDefinitions` (and so the Agents page and pickers); a normal agent still present | Server + web tests |
| AC-002 | REQ-004 | Same; it has a recorded run | Its run absent from `listWorkspaceRunHistory`; absent from the Memory page's agent list; the run opens by ID | Server tests |
| AC-003 | REQ-005 | Same | Absent from `list_available_agents` and @ candidates; @-mention fails as unavailable; `delegate_task` to its address refused with "not an available agent"; peer's available-agents answer leaves it out | Server tests (incl. remote catalog lister) |
| AC-004 | REQ-006 | Same | `list_agent_definitions` leaves it out | Server test |
| AC-005 | REQ-002, 007 | Setting turned on (no restart) | Everything above shows it; delegation to it works; Agents page shows "Internal" | Server + web tests; user check |
| AC-006 | REQ-001 | Edit and save the internal agent in the app | `agent-config.json` still has `"internal": true` | Server test |
| AC-007 | REQ-001 | Existing agents without the attribute | Unchanged in every list | Existing tests |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Browse and pick agents/runs without system helpers | Agents page, pickers, history, Memory page | Internal agents hidden unless shown | Supported Normal |
| SCN-002 | System | Agent / peer node | Find and delegate to agents | `list_available_agents`, @, `delegate_task`, peer catalog | Internal agents not offered or reachable unless shown | Supported Normal |
| SCN-003 | Operational | User | Debug system helpers | Settings toggle or environment variable | Internal agents shown | Supported Normal |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small). Product Design: N/A.
- Settings → Server Settings → Basics: a card "Show internal agents" with a toggle and one sentence ("Internal agents are the system's own helpers, such as the Model Router. Show them in the Agents list, pickers and history, for debugging."). After a change, the agent list and run history refresh.
- Agents page: an "Internal" badge on internal agents while shown.

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (one optional attribute in `agent-config.json`; one setting). Absent = normal; no migration; nothing old changes meaning.

## Decisions

| Decision | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Setting name and reading | Follow the server-settings pattern (`AUTOBYTEUS_*`, a config module that reads the value on each use, like `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`): `AUTOBYTEUS_SHOW_INTERNAL_AGENTS`, read on each listing so a change applies at once | Solution Designer | Decided |
| DEC-002 | Refusal wording | While hidden, an internal agent is simply not in the catalog, so today's "not an available agent" message applies; a specific "is internal" message would reveal hidden agents to agents and peers | Solution Designer | Decided |
| DEC-003 | Memory page | It is another place the user browses agents and their runs; hiding it there keeps "hidden" consistent | Solution Designer | Decided |
| DEC-004 | `list_agent_definitions` | An agent tool listing agents is a browsing surface for agents; hide while hidden. Reading one by ID (`get_agent_definition`) is direct access and stays | Solution Designer | Decided |
| DEC-005 | Marking while shown | A badge tells the user which agents are internal when shown for debugging | Solution Designer | Decided |
| DEC-006 | Delegation while shown | The Task says shown internal agents behave like other agents; built-in agents stay excluded from collaboration as today (the future Model Router is built-in) | Task | Decided |

## Traceability

| REQ | UC | AC |
| --- | --- | --- |
| REQ-001 | UC-001 | AC-001, AC-006, AC-007 |
| REQ-002 | UC-003 | AC-005 |
| REQ-003 | UC-001 | AC-001 |
| REQ-004 | UC-001 | AC-002 |
| REQ-005 | UC-002 | AC-003 |
| REQ-006 | UC-002 | AC-004 |
| REQ-007 | UC-001..003 | AC-005 |
| REQ-008 | UC-001 | AC-002 |

## Readiness Check

- Content ready for approval: `Yes`. Approval recorded: `Yes` (within the direction, user informed). Ready for design: `Yes`.
