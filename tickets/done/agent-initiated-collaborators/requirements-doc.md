# Requirements Document — agent-initiated-collaborators

## Document Status
- Status: **Approved** (SR-007, 2026-10-01). It adds REQ-012 and AC-013 (copy placement by address), approved by the user:
  "approve. i trust your suggestion", after the Solution Designer's recommendation following CRR-005 DI-01.
- Earlier status: Approved (SR-005). REQ-003 and AC-003 were narrowed with the user's approval: the user said
  "…you can almost like assume I will never do that… please continue", after the Solution Designer proposed the narrower
  REQ-003.
- Earlier approval: SR-002.
- Approval reference: the user said "all clear right? then i approve" (2026-10-01). It covers REQ-001–011, AC-001–012,
  SC-001–005 and the Q-1/Q-2 resolutions.
- Basis: the user's decisions in conversation on 2026-10-01 ("the requirements, I think it's clear. Let's go."), recorded
  in `investigation-notes.md`. Q-1 and Q-2 were resolved by the user on 2026-10-01.
- Workspace:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators`, branch
    `codex/agent-initiated-collaborators`.
  - Base `origin/personal` @ `84224a58d`. Finalization target: `personal`.
- Predecessor: `cross-scope-agent-mentions` (released v1.4.92-beta.5).

## Problem And Desired Outcome
A standalone agent, such as a project manager, cannot find out which agents and teams exist. It also cannot bring them
in or delegate to them without the user's `@` or an Org built in advance. In addition, delegated copies of a team cannot
follow their own handoffs by address. In Team and Agent runs the message is not found; in Org runs it reaches the
mounted original team.

Desired outcome:
- An agent that has the optional `list_available_agents` tool can see the shared standalone agents and teams, with
  addresses and descriptions.
- It can then work with any of them using `send_message_to` (one ongoing instance, brought in on first use) or
  `delegate_task` (a fresh copy per task, in parallel).
- Every team instance works as one unit.

## Relevant Current And Desired Behavior
| ID | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- |
| B-001 | Agents cannot discover catalog agents or teams (E-02 is UI-only) | Opt-in tool `list_available_agents` | `@` menu unchanged |
| B-002 | `send_message_to(address)` reaches configured members or existing collaborators only, otherwise not found (E-03) | The one instance at that address; a listed catalog agent or team is brought in on first use with the same admission as `@` | By run ID: existing instances only; messaging never creates a second instance for an address |
| B-003 | `delegate_task` covers configured members and collaborators only (E-04) | Also listed catalog agents and teams: a fresh copy each time | Delegation semantics (copy, work packet, run-ID follow-up) |
| B-004 | Task-copy members cannot reach their own teammates by address; in an Org they reach the mounted team instead (E-05) | Messages from inside a team instance to addresses inside that team resolve within that same instance | Messages to addresses outside the sender's team resolve as today |
| B-005 | Tool and prompt wording: `send_message_to` reaches an already existing execution (E-07) | Wording: the one instance at the address, brought in on first use; `delegate_task` always spawns a new copy | One public tool each; existing selectors and result shapes |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
- **UC-001:** An agent with `list_available_agents` lists the available agents and teams.
- **UC-002:** An agent brings in a listed agent or team by messaging its address.
- **UC-003:** An agent delegates one or more parallel copies of a listed agent or team.
- **UC-004:** A team instance (collaborator, delegated copy, configured mounted team) follows its own handoffs within
  itself.
- **UC-005:** The same in standalone, Team and Org runs.

### Out Of Scope
- A global on/off setting.
- A limit on copies.
- Per-definition "allowed collaborators" configuration.
- Mentioning or bringing in Orgs.
- Cross-run linking.
- Changing the `@` UX.
- Application-owned runs and internal helper runs, which keep their current tool rules.

### Non-Goals
- `send_message_to` by run ID never creates anything.
- A second instance per address is never created by messaging.

### Preserved Behavior Boundary
- `@` behavior (VIS-001–015 of the predecessor).
- Delegated-copy lifecycle.
- Configured-member messaging.
- Org handoffs between configured placements.
- Existing history, which opens unchanged.

### Review Authority
Blocking findings must trace to these REQ/AC/preserved IDs.

## Requirements
- **REQ-001: `list_available_agents` is an optional tool.** It is selectable per agent in the tool picker like any other
  built-in or MCP tool, and exposed on every runtime when the agent's definition includes it. It is never added
  automatically.
- **REQ-002: What the tool returns.** For each eligible shared standalone agent and agent team: `name`, `kind` (`agent` |
  `agent_team`), `address` and `description`.
  - Eligibility is the same as the `@` menu (E-02): excluding Orgs, internal built-ins, non-shared and
    application-owned definitions, and the run's own root definition. Exactly the `@` menu's rules (Q-2, user-decided).
  - If a definition is already in the run (configured or collaborator), the entry carries its in-run address.
    Otherwise it carries the address it will receive when brought in.
  - There is no "in run" flag.
- **REQ-003: Address stability.** Listed addresses are deterministic for the run, and distinct even when two agents or
  teams share a name. An address that does not resolve returns the normal "not found" result.
  - Renaming, unsharing or deleting a listed agent or team while a run is using it, then reusing its name for another
    definition, is classified as `Technically Possible but Unsupported/Contrived` (design principle 6). It drives no
    requirement or machinery.
- **REQ-004: `send_message_to(recipient_address)`.**
  - It reaches the one instance at that address: a configured member, an existing collaborator or its member, or, within
    the sender's own team instance, a teammate (REQ-007).
  - If the address is a listed catalog agent or team that is not in the run, the server first brings it in as a
    collaborator with the **same admission as `@`** (validate, allocate, persist, Offline row, `collaborator_added`),
    then starts it and delivers. The added-by agent is recorded as the sender.
  - Later messages to that address reach the same instance.
  - If adding fails, the call returns a typed failure with the reason, and nothing is added.
  - `send_message_to(target_agent_run_id)` is unchanged: it reaches existing instances only.
- **REQ-005: `delegate_task(recipient_address)`.**
  - It may also target a listed catalog agent or team that is not in the run, and starts a fresh copy with the existing
    delegation behavior: work packet, task row, run-ID follow-up, restorable.
  - Each call is a new copy, so parallel copies are allowed and there is no limit.
  - Delegating to a catalog address adds **only the task copy**, never the collaborator (Q-1, user-decided).
- **REQ-006: Who may do this.** Any agent in the run (run members, collaborators and delegated copies) may bring in or
  delegate to listed catalog agents and teams. The list tool controls discovery only; there is no extra permission check.
  Server-internal helper runs and application-owned runs keep their current tool rules.
- **REQ-007: A team instance is one unit.**
  - For a sender inside a team instance (configured or mounted team, collaborator team, delegated team copy):
    - an address inside that team resolves to the member of **that same instance**;
    - the team's own address resolves to that instance's coordinator.
  - Other addresses resolve run-wide as today.
  - Reaching a different instance of the same team is possible only by run ID.
  - This changes current Org behavior: a delegated copy of a mounted team no longer reaches the mounted team's members.
- **REQ-008: Same in every run type.** The behavior is identical in standalone (Agent-root), Team and Org runs.
  - For standalone runs, the collaboration package is created on first bring-in or delegation, as it is with `@`.
- **REQ-009: Contract wording.** The shared prompt and tool descriptions state REQ-004 and REQ-005, identically on every
  runtime:
  - `send_message_to` reaches the one instance at an address, brought in on first use;
  - `delegate_task` always spawns a new copy;
  - follow up on a copy by run ID.
- **REQ-010: Same outcome as `@`.** A user `@` and an agent bring-in of the same definition produce and reuse the same
  single collaborator instance.
- **REQ-012: Copy placement by address** (all run types). A task copy is recorded and shown inside the delegator's own
  team instance whose address is the copy address's parent; otherwise at the top level of the run.
  - A copy of a teammate stays inside its team instance.
  - A copy of a top-level address (a catalog agent or team, a collaborator, or an Org-level configured placement) is
    placed at the top level.
  - The delegator is still recorded. "Started by …" stays in the accessible label only (predecessor REQ-009).
  - **Behavior change, approved:** in Org and standalone runs, copies used to be placed under the delegator's host.
    A mounted-team member's copy of an Org-level agent now appears at the Org top level.
  - Existing stored runs keep their recorded placement.
- **REQ-011: Visible in the UI.** Agent-initiated collaborators and copies appear like user-added ones: rows under the run,
  Team/Org tab messages, "From <Sender>:".

## Acceptance Criteria
- **AC-001 (REQ-001):** The tool appears in the tool picker. An agent without it has no `list_available_agents`. With it,
  it works on AutoByteus, Codex, Claude and the other supported runtimes.
- **AC-002 (REQ-002):** The list returns name, kind, address and description. Excluded kinds are absent. An in-run
  definition shows its in-run address. There is no in-run flag.
- **AC-003 (REQ-003):** Two definitions with the same name get distinct addresses. Listing twice with an unchanged catalog
  gives identical addresses. An unknown address returns "not found".
- **AC-004 (REQ-004):**
  - A first `send_message_to` to a listed address adds the collaborator (an Offline row, which then starts) and
    delivers. A second message reaches the same run IDs.
  - A failing add returns a typed failure and adds nothing.
  - Messaging by run ID to an unknown run creates nothing.
- **AC-005 (REQ-005):** Three `delegate_task` calls to a listed team start three independent copies that run in parallel
  and report back by run ID. No collaborator is added (Q-1).
- **AC-006 (REQ-006):** A collaborator's member, and a member of a delegated copy, can each bring in or delegate to a
  listed agent.
- **AC-007 (REQ-007):** In standalone, Team and Org runs, a handoff by address inside a collaborator team, a delegated
  copy, or an Org copy of a mounted team reaches that instance's own member. Two parallel copies never cross. A message
  from inside an instance to an address outside its team resolves as today.
- **AC-008 (REQ-008):** AC-004, AC-005 and AC-007 pass in all three run types. A standalone run creates its
  `collaboration/` package on the first agent-initiated bring-in or delegation.
- **AC-009 (REQ-009):** The prompt and tool descriptions carry the new wording on every runtime.
- **AC-010 (REQ-010):** `@` after an agent bring-in, and an agent bring-in after `@`, both reuse one instance.
- **AC-011 (REQ-011):** The UI shows agent-initiated collaborators and copies, as in the predecessor visuals.
- **AC-013 (REQ-012):**
  - In an Org, a mounted-team member's `delegate_task("/marketing_team")` is recorded in `rootOrg.taskExecutions` and
    shown at the Org top level. The delegator is recorded (`delegatorAgentRunId`) and "Started by <delegator>" stays in
    the row's accessible label only, per the predecessor's REQ-009 (no visible line).
  - The same member's copy of its own teammate stays under its team.
  - Equivalent placements hold in Team and standalone runs (a collaborator-team member delegating a top-level address
    → top level).
  - Existing stored copies open where they were recorded.
- **AC-012 (preserved):** `@`, configured messaging, Org configured handoffs, delegated-copy lifecycle and existing history
  are unchanged.

## Relevant Scenarios And Journeys
| ID | Trigger | Outcome | Validity |
| --- | --- | --- | --- |
| SC-001 | Standalone PM (with the tool) plans, lists, then messages `/software_engineering_team` | The team is brought in and works through its handoffs (REQ-007) | Supported Normal (new) |
| SC-002 | The PM delegates three tasks to the same listed team | Three parallel copies, each working through its own handoffs, reporting back | Supported Normal (new) |
| SC-003 | An Org member delegates a copy of a mounted team | The copy's handoffs stay inside the copy (behavior change) | Supported Normal |
| SC-004 | A listed team cannot run with the run's settings | The tool returns the failure reason; nothing is added | Supported Explicit Edge |
| SC-005 | The user `@`s a team the PM already brought in | The same instance is reused | Supported Normal |

## UI, Interaction, And Experience Requirements
- No new screens. Agent-initiated items reuse the predecessor's approved rows, tab and messages (VIS-001–015).
- The tool appears in the existing tool picker.
- If the user wants a mockup, Product can be requested.

## Data Continuity And Acceptable Loss
- Existing runs and history open unchanged.
- No loss is acceptable.

## Assumptions
- Restoring delegated catalog copies is a technical design concern (see the investigation notes).

## Open Decisions And Questions
- **Q-1 resolved (user, 2026-10-01):** "of course, only bring the task copy". `delegate_task` creates only task copies;
  the collaborator is created only by `send_message_to` to the address, or by `@`.
- **Q-2 resolved (user, 2026-10-01):** `list_available_agents` behaves exactly like the `@` menu (same eligibility and
  exclusions): "they are performing the same functionality".
- **Terminology (user):** "the collaborator" means the one instance at an address (`send_message_to`, `@`). A "task copy"
  is a fresh instance per `delegate_task` call.

## Traceability
- REQ-001→AC-001
- REQ-002→AC-002
- REQ-003→AC-003
- REQ-004→AC-004/010
- REQ-005→AC-005
- REQ-006→AC-006
- REQ-007→AC-007
- REQ-008→AC-008
- REQ-009→AC-009
- REQ-010→AC-010
- REQ-011→AC-011
- REQ-012→AC-013

## Architecture Phase Input
- A persisted source for catalog copies.
- Deterministic prospective addresses.
- Sender-instance-relative resolution in three roots.
- A tool registration and exposure path like `publish_artifacts`.
- Contract and prompt updates.
- The refactoring the user anticipates (Agent-root holder shape, collaborator-agent membership representation, file sizes).
