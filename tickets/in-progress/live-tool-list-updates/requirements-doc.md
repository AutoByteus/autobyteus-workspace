# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (requirements approved at SR-001; SR-002 adds DEC-006, DEC-007 and the AC-007 detail within the direction, user informed)
- Package identifier: `live-tool-list-updates`
- Request / ticket: Project Task `autobyteus-324`: a running agent gets changes to its tool list without stopping and resuming the run (the way a changed skill already reaches it)
- Requested by: the user, through `/project_task_manager`
- Requirements owner: Solution Designer
- Date: 2026-10-29
- Approved by and reference: `User`, 2026-10-29, in the Solution Designer conversation. He confirmed the outcome: "when tool change, user does not have to stop manually the agent or team, they send message directly and it will work". He decided DEC-001 (a) and DEC-004 (build Codex without a real run), and he agreed FU-001 is outside this ticket
- Exact approved requirements baseline / solution revision: SR-001
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- Problem: a run keeps the tools it started with. When the user (or a package update) changes an agent's tool list, a running agent neither gets the new tools nor loses the removed ones. The user then stops and resumes the run by hand, which he did three times in one week for the PM (`list_peer_nodes`, `get_project_task`, `search_memory`). Worse, a removed tool keeps working in the running run (BEH-002).
- Affected actors or systems: the user; every running agent (alone or in a team) on the five runtimes (AutoByteus, Claude Agent SDK, Codex, Antigravity, Grok Build); the Agent Tools MCP server.
- Desired outcome: after a definition change, a running agent gets its new tool list at once where its runtime can take it, and at its next message otherwise, with the conversation kept. A removed tool stops working at once on every runtime. The agent gets a short notice, and the user sees a "Tools updated" card in the run.
- Observable definition of success: on each runtime, in a real run on isolated data, a tool added to the definition is used by the agent without stop and resume; a removed tool is refused; the agent got the notice; the run shows the card.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | A run keeps its starting tool list; the user stops and resumes it | The run gets the definition's current tool list without stop and resume | Tools are opt-in per definition; nothing changes unless the definition changed | investigation-notes E-01…E-08, probes |
| BEH-002 | Contract | SCN-003 | A tool removed from the definition can still be called by the running run | A removed tool is refused from the moment the change is saved | — | E-02 |
| BEH-003 | User | SCN-001 | Changed skills reach a run through the "Skill updated" notice | Unchanged; tool changes get a notice of their own | The skill notice | E-09 |
| BEH-004 | User | SCN-004 | Stop and resume keeps the conversation and picks up the current definition | Unchanged | Stop and resume | E-05, E-07 (restore paths) |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user | Change an agent's tools and keep working | The running agent has the new tools, and he can see that it got them | He stays in control: a run whose tools changed shows it |
| Running agent | Use the tools its definition lists | Knows its tools changed, and uses only the current ones | Never sees a tool its definition does not list |
| Package update | Deliver changed definitions | Changed tool lists reach running runs the same way an edit does | No automatic updates by default (existing decision) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The user adds a tool to an agent definition that has running runs | SCN-001, SCN-002 |
| UC-002 | The user removes a tool from an agent definition that has running runs | SCN-003 |
| UC-003 | A package update or auto-refresh changes a definition's tool list while runs of it are running: agent packages (shared, team-local and org-owned agents) and application packages (their agents and team-local agents). A renamed tool counts as one removed and one added | SCN-001…SCN-003 |
| UC-004 | A stopped run with a changed definition is restored: it hears what changed while it was stopped | SCN-005 |

### Out Of Scope

- Which MCP servers or Claude settings a Claude run inherits from the user's own Claude configuration (FU-001, its own Task).
- Changes to a team's own tools (team membership, handoff rules): these come from the team, not the agent definition.
- Changes inside a configured MCP server's own tool list (the server adds a tool itself) when the definition did not change.
- Changing a run's model, prompt or other definition fields while it runs.

### Non-Goals

- A change made while a turn runs does not have to reach that same turn on runtimes that need a reopen (DEC-001); it reaches the next message.
- Codex's `config/mcpServer/reload` is not used unless measured to work (U-01).

### Preserved Behavior Boundary

- BEH-003, BEH-004 and the existing approval behavior of tools (a tool needing the user's approval still asks).
- Invariant: a run is never offered a tool its current definition does not list, not even for one turn.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When an agent definition's tool list changes (an edit in the app, or a package update), every running run of that definition, alone or as a team member, gets the definition's new tool list without the user stopping and resuming it | BEH-001 | Must | The user's request | Probes: Claude and AGY take a changed list in a running session; native reads tools per LLM call; Codex and Grok keep the conversation when reopened (their restore path) | Task autobyteus-324 |
| REQ-002 | Where the runtime can take a new tool list in a running session (AutoByteus, Claude, Antigravity), the change applies at once: from the runtime's next model call | BEH-001 | Must | "Immediate where possible" | Probes: Claude, AGY (without the run-scoped header); E-08 | Task |
| REQ-003 | Where the runtime cannot (Codex, Grok Build), the change applies at the run's next message, with the conversation kept, as DEC-001 decides | BEH-001, BEH-004 | Must | The Task's fallback | Probes: neither re-reads the list; both keep the conversation when reopened | Task; DEC-001 |
| REQ-004 | A tool removed from the definition is refused from the moment the change is saved, on every runtime, also inside a running turn | BEH-002 | Must | "A removed tool must really stop working" | The server refused removed tools in every probe once its list changed | Task constraint |
| REQ-005 | A run is never offered or allowed a tool its current definition does not list | BEH-002 | Must | "Nothing is exposed that its definition does not list" | — | Task constraint |
| REQ-006 | The agent gets one short notice of what changed (tools now available, tools no longer available), with the change it applies to: at once on REQ-002 runtimes, with the next message on REQ-003 runtimes | BEH-001 | Must | "A short notice to the agent" | Skill notice path (E-09) | Task |
| REQ-007 | The run shows the user a "Tools updated" card naming the added and removed tools | BEH-001 | Must | "The user stays in control" | Skill card (E-09) | Task constraint |
| REQ-008 | A change that leaves a run's tool list as it was (a revert, a save without tool changes) yields no notice and no reopen | BEH-001 | Should | No noise, no needless reopen | Skill notice does the same | — |
| REQ-009 | A run restored after a definition change hears what changed since it last ran | BEH-001 | Should | The same as skills | E-09 | — |
| REQ-010 | When applying a change fails on a run (a reopen fails), the run shows a plain message and a one-click "Restart this run with the new tools" that keeps the conversation | BEH-004 | Must | The Task's fallback | Stop and resume already does it | Task; DEC-001 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-006, REQ-007 | SCN-001 | AutoByteus, Claude or AGY run idle; the user adds a tool to its definition | The card shows in the run; asked next, the agent calls the new tool successfully; it got the notice | — | Real run per runtime, isolated data |
| AC-002 | REQ-001, REQ-003, REQ-006, REQ-007 | SCN-002 | Codex or Grok run idle; the user adds a tool | The card shows; at the next message the agent has the new tool and the earlier conversation (it can quote it) | AC-007 | Real run per runtime, isolated data |
| AC-003 | REQ-004, REQ-005 | SCN-003 | Any runtime; the user removes a tool | A call to it after the save is refused with a plain "not available" result; it is not offered at the runtime's next list | — | Real run per runtime plus server tests |
| AC-004 | REQ-002, REQ-004 | SCN-001, SCN-003 | A run is in a turn when the tool list changes | AutoByteus, Claude, AGY: the turn's later model calls have the new list. Every runtime: the removed tool is refused inside that turn | — | Integration plus one real run |
| AC-005 | REQ-008 | SCN-001 | The user saves the definition without tool changes, or adds and removes the same tool | No card, no notice, no reopen | — | Integration |
| AC-006 | REQ-009 | SCN-005 | A run is stopped, its tools changed, then it is restored | Its first message carries the notice; the card shows | — | Integration plus one real run |
| AC-007 | REQ-010 | SCN-004 | Reopening a Codex or Grok run fails | The message that triggered the reopen is not sent (it shows as failed, as other failed inputs do). The run shows the plain message and the button; the button restarts it with the new tools and the conversation, and the user sends again. Until then, the next message tries the reopen again | — | Integration with a failing reopen |
| AC-008 | REQ-001 | SCN-001 | A team member's definition changes | Only that member's runs change; the other members do not | — | Integration |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | The user | Give a running agent a new tool | Agent definition edit, or package update | Run is idle or busy, on AutoByteus, Claude or AGY | Save the definition; ask the agent to use the tool | The agent has it at once; card and notice | None | Supported Normal Scenario | The user's report (PM's tools) | REQ-001, 002, 006, 007; AC-001, 004, 005, 008 |
| SCN-002 | User | The user | The same on Codex or Grok | The same | Run on Codex or Grok | Save; send the next message | The new tool from that message on; the conversation kept | SCN-004 | Supported Normal Scenario | The same | REQ-003; AC-002 |
| SCN-003 | User | The user | Take a tool away from a running agent | The same | Any runtime | Save without the tool | Calls to it are refused at once | None | Supported Normal Scenario | Task constraint | REQ-004, 005; AC-003, 004 |
| SCN-004 | User | The user | Recover when a reopen fails | A failed reopen | Codex or Grok | The run shows the message; he clicks the button | The run restarts with the new tools and the conversation | — | Supported Explicit Edge Scenario | Task fallback | REQ-010; AC-007 |
| SCN-005 | User | The user | Resume a stopped run whose tools changed | Restore | Run stopped | Restore; send a message | The notice is carried; the card shows | — | Supported Normal Scenario | Skill precedent | REQ-009; AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (a run card; one button on failure)
- Linked UI/UX or interaction supplement: N/A — the card uses the existing system-notice card ("Skill updated") with the title "Tools updated"
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: the user's approval of SR-001 (2026-10-29); the card mirrors the approved "Skill updated" card
- Approved visual-reference baseline: the existing "Skill updated" card
- Normative visual and interaction details: card title "Tools updated"; body "Now available: a, b. No longer available: c." The failure message is "Couldn't give this run its new tools." with the button "Restart this run with the new tools"
- Explicitly illustrative fixture content or permitted implementation variation: wording may follow the localization conventions
- Required screens, states, transitions, feedback: the card in the conversation; the failure message with the button
- Product decisions that need the user: DEC-001

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004, AC-003 | Security | A removed tool is refused by the server for every request after the save, independent of the runtime | All runtimes | Server tests |
| QR-002 | REQ-002 | Performance | The change is announced to a connected runtime within 1 s of the save | Immediate runtimes | Integration timing |
| QR-003 | All | Privacy | Tests use isolated app data and temp workspaces only | Validation | Review of the test setup |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (SR-002): a new per-run record of the tool names the run was last given, so a restored run hears what changed (REQ-009)
- Data or state that must be preserved: the run's conversation across a reopen (BEH-004)
- Loss, reset, rebuild, or regeneration that is acceptable: the runtime's prompt cache on a reopen
- Retention, privacy, compliance, volume, downtime, or operational constraints: none
- Unknowns requiring downstream investigation: none

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| MCP `notifications/tools/list_changed` | Sent on the client's GET stream; `capabilities.tools.listChanged: true` | MCP spec 2025-06-18; probes | Clients that ignore it (Codex, Grok) |
| Claude Agent SDK 0.3.280 | Re-reads the list on the notification | Probe | Version drift (R-01) |
| Antigravity CLI 1.4.10 | Re-reads the list when it holds a GET stream | Probe | AGY 1.2.10 needed the header workaround |
| Codex app-server 0.165 `thread/resume` | Resumes the conversation with new config | Generated types; product restore | Model turn not measurable until 2026-11-04 (DEC-004) |
| Grok Build ACP `session/load` | Resumes the conversation with new MCP servers | Product restore | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/probe/*` | Runtime measurements and the reproduction | REQ-002, REQ-003 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Codex at the next message behaves as in a product restore (thread/resume with the new config keeps the conversation and takes the new tools) | REQ-003 for Codex | Integration tests now. The real Codex run happens if the limit is back before merge, otherwise as a check afterwards (DEC-004) | Accepted by the user |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Codex and Grok ignore the "tools changed" signal. How should their runs get the new tools? | Convenience versus a visible step | (a) AutoByteus reopens the runtime session by itself at the next message: same conversation, as stop and resume does, a few seconds more on that message and the runtime's prompt cache rebuilt. (b) The run shows a message and a one-click "Restart this run with the new tools" button | (a) does what the user does by hand today, without asking him, and the card still shows him. The button stays for a failed reopen (REQ-010). Recommend (a) | User | Decided by the user, 2026-10-29: (a). "When tool change, user does not have to stop manually the agent or team, they send message directly and it will work" |
| DEC-002 | Which changes count? | Scope | Definition tool list only (edit, package update) | Team tools come from the team, not the definition. Decided | Solution Designer | Decided |
| DEC-003 | A tool needing the user's approval | Control | A newly added tool asks for approval as its other tools do | Same rule as the rest of its tools. Decided | Solution Designer | Decided |
| DEC-004 | Codex cannot be proved with a real model turn until 2026-11-04 (account usage limit) | "Done" needs a real run per runtime | (a) Build everything now, run the Codex proof when the quota returns, then merge. (b) Use another Codex sign-in, if he has one. (c) Merge without the Codex real run | Recommend (a): no waiting for the rest of the build, and nothing merged unproven | User | Decided by the user, 2026-10-29: build Codex without the real run ("we don't have to test it, we just build it"); merging does not wait for it. The real Codex run is done if the limit is back before merge, otherwise as a check afterwards |
| DEC-006 | A skill notice and a tool notice are both pending for the same message | Two notices, one message | (a) Combine both into one message. This needs a multi-sender platform-notice tag, which changes the native memory record and the card contract. (b) One notice per message, tools first; the other goes with the next message | (b) keeps the existing notice contracts, and both pending at once is rare. Tools first, because on Codex/Grok the tool notice describes the reopen this very message causes. Decided (SR-002, within the direction; user informed) | Solution Designer | Decided |
| DEC-007 | A reopen fails | What happens to the message | Send it on the old session, or do not send it | Not sent: after an unsubscribe the old session is gone, and sending without the new tools would contradict the notice. Decided (SR-002, within REQ-010; user informed) | Solution Designer | Decided |
| DEC-005 | AGY's run-scoped header (a 1.2.10 workaround) blocks the signal | REQ-002 for AGY | Remove it; AGY 1.4.10 measured to work without it | Decided: remove; the build confirms with the installed AGY | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-003 | BEH-001 | AC-001, AC-002, AC-008 | SCN-001, SCN-002 | probes |
| REQ-002 | UC-001 | BEH-001 | AC-001, AC-004 | SCN-001 | probes |
| REQ-003 | UC-001 | BEH-001, BEH-004 | AC-002 | SCN-002 | probes |
| REQ-004 | UC-002 | BEH-002 | AC-003, AC-004 | SCN-003 | probes |
| REQ-005 | UC-002 | BEH-002 | AC-003 | SCN-003 | — |
| REQ-006 | UC-001, UC-002 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-002 | — |
| REQ-007 | UC-001, UC-002 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-002 | — |
| REQ-008 | UC-001 | BEH-001 | AC-005 | SCN-001 | — |
| REQ-009 | UC-004 | BEH-001 | AC-006 | SCN-005 | — |
| REQ-010 | UC-001 | BEH-004 | AC-007 | SCN-004 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001…SCN-005
- Product and system constraints architecture must preserve: REQ-005 invariant; BEH-003, BEH-004
- Decisions intentionally deferred to architecture design: how the server announces changes; where change detection lives
- Technical facts architecture should verify: AGY without the header against the product endpoint; Codex thread/resume on a loaded thread
- Known feasibility or integration risks: R-01 (runtime versions), U-01

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `No` (part of this approval)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
