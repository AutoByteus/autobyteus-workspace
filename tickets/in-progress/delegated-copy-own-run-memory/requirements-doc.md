# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `delegated-copy-own-run-memory`
- Request / ticket: Project Task "Refactor: a delegated copy's memory follows the normal structure (its own run), not the delegator's folder" (2026-10-15). Not the slow-opening bug Task e6985045.
- Requested by: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-15
- Requirements owner: `/software_engineering_team/solution_designer`
- Date: 2026-10-15
- Approved by and reference: SR-001/SR-002 — `Solution Designer within the direction (user informed)` (messages to the user on 2026-10-15). SR-004 — `User`: the user's direction in the Solution Designer conversation on 2026-10-15 (email model for message logs, chosen for cross-node messaging; "messaging never creates anything"; collaborators removed first in Task 259ddae7), recorded in SR-003 and in the resumed Task description from `/project_task_manager` ("record the user's email-model decision for message logs"); remaining SR-004 details by the Solution Designer within that direction, user informed.
- Exact approved requirements baseline / solution revision: this document at `SR-005` (base `origin/personal` `c2e366806a`; see `solution-revision-record.md`). SR-005 — `User`: the user's decisions in the Solution Designer conversation on 2026-10-17, recorded in `memory-layout-contract.md` §0 and §13.
- Behavior-defining supplements and their approved versions: [`memory-layout-contract.md`](memory-layout-contract.md) revision 2 (2026-10-17) — the authority for the layout, the records, every operation, the migration and the broken states; where this document and the contract differ, the contract governs and this document is corrected.

## Problem And Desired Outcome

- Problem: A delegated Task copy (an Agent or Team started by `delegate_task`) stores its memory inside the delegating run's folder: `memory/agents/<delegator>/collaboration/<copy>/` for an Agent delegator, and inside `memory/agent_teams/<root>/…` or `memory/agent_orgs/<org>/…` when the delegator is a Team or Org member. The copy has no folder of its own, so a coordinating run's folder grows with every copy's history (PTM run ≈265 MB of copies), and per-run features must special-case copies.
- Affected actors or systems: the user; delegating agents; delegated copies; the server's Agent, Team and Org collaboration roots; Memory UI; startup data migration; Memory Sync.
- Desired outcome: a task agent is a normal run of its kind: an agent task agent has its own folder and its own `run_metadata.json`, a task agent team its own folder, team tree, message log and members, each with a `taskAgent` section naming its coordinating run. The task agent owns its facts; the coordinating run (often a long-lived hub such as the Project Task Manager) keeps only links, coordinates the task agents' lifecycle and keeps its own message log. Existing data is moved safely (contract §0–§3).
- Observable definition of success: after upgrade, no delegating run's folder contains a copy's memory; each copy's memory is at its own standard folder; every existing run and copy opens, reopens, shows history, wakes and is located exactly as before.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | An Agent copy's memory is written inside the delegating root's folder; its facts live in the root's tree | A task agent is a normal agent run: `memory/agents/<agentRunId>/` with its own `run_metadata.json` (+ `taskAgent`); the coordinating tree keeps only the link (contract §2, §3) | Delegation result, task message, `task_execution_started` | Investigation BEH-001; contract V-6, V-16 |
| BEH-002 | System | SCN-002 | A Team copy's members' memory is written inside the delegating root's folder; members and settings live in the root's tree | A task agent team is a normal team run: `memory/agent_teams/<teamRunId>/` with its own team tree (+ `taskAgent`), message log and members | Lazy member start, coordinator ingress | Investigation BEH-002; contract §3.2 |
| BEH-003 | System | SCN-003 | Idle shutdown and wake-on-message restore a copy from memory at its root-scoped location | Same lifecycle, reading/writing the copy's own folder | Grace setting, wake rules, `TASK_EXECUTION_CONTEXT_UNAVAILABLE`/`RESTORE_FAILED` semantics, closed Task fencing | Investigation BEH-003 |
| BEH-004 | User | SCN-004 | Reopen/restart rebuilds the root from its stored package and restores copies from the root-scoped location | Same, reading copies' own folders | Every copy starts shut down and wakeable unless its Task is closed | Investigation BEH-004 |
| BEH-005 | User | SCN-004 | Sidebar tree, collaboration view, Event Monitor, Settings delegated-copy list, Token Meter, Task page copy locator read the delegating root's tree and the copy memory via location lookup | Same surfaces, same content, copy memory read from its own folder | Copies still appear under their delegator only; no new history rows | Investigation BEH-005 |
| BEH-006 | User | SCN-005 | Memory UI Agents list scans `memory/agents/<id>`; Agent-root copies are invisible; Team/Org lists show copies as task members of the root run | Agent copies, now in the standard Agents location, appear in the Agents list under their agent definition; Team copies keep today's visibility (task members inside Team/Org root runs) | No copy is shown as "Unattributed"; root runs' member lists unchanged; Teams list unchanged (listing Team copies there is a follow-up) | Investigation BEH-006, DEC-004 |
| BEH-007 | User | SCN-006 | Deleting a delegator run from history removes its folder and thereby its copies' memory | Deleting a coordinating run removes only its own folder; its task agents' folders are kept, detached (contract §4, §10); the confirmation says so | Delete refused while active | the user, 2026-10-17 |
| BEH-009 | System | SCN-008 | One message log per coordinating run holds every message of its whole tree (incl. messages between members inside a delegated Team run) | Each run keeps its own log; cross-run messages in both logs (email model) | Communication view, attachment links, stream events show the same messages once | Investigation (SR-004) |
| BEH-008 | Operational | SCN-007 | No migration exists; copies sit in delegator folders on disk | A one-time startup migration moves every existing copy's memory to its own folder, verified, resumable, without loss | Old runs and copies open as before | Investigation Persisted Data |
| SCN-008 | System | Agents in a coordinating run and its delegated runs | Exchange messages | `send_message_to` (address or run ID) | Delegated runs exist | Host ↔ copy, member ↔ member inside a Team copy, copy ↔ copy | Each message stored with the run(s) it belongs to; views unchanged | Persistence failure handled as today | Supported Normal Scenario | user decision 2026-10-15 (email model); collaboration model CM-9 | REQ-011; AC-014 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Use runs, copies, Memory, Settings, Token Meter, Tasks | Same experience, consistent storage, nothing lost | No behaviour change beyond consistency |
| Delegating agent | Delegate, message, close Tasks | `delegate_task`/`send_message_to`/`create_task`/`update_task` behave identically | Tool contracts unchanged |
| Delegated copy | Do the work, keep its conversation | Its memory is its own run's memory | Coordinated by its delegating root as today |
| Server collaboration roots (Agent/Team/Org) | Coordinate copies | Keep tree/links and messages only | Runtime coordination unchanged |
| Follow-up work (cc9c919e, 6fb6e21b) | Link runs to Tasks; show copies under workspace | Copies are self-contained runs they can build on | Not delivered here |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A run in any collaboration root (Agent, Team or Org) delegates to an Agent; the copy's memory lives in its own standalone-run folder | SCN-001 |
| UC-002 | A run in any collaboration root delegates to a Team; the copy's memory lives in its own Team-run folder | SCN-002 |
| UC-003 | A copy idles, shuts down, is woken, closed, reopened/reactivated, or its root is reopened after restart, reading/writing its own folder | SCN-003, SCN-004 |
| UC-004 | Surfaces that show copies (sidebar, collaboration view, Event Monitor, Settings list, Token Meter, Task locator, file changes, context files, message references) keep working | SCN-004 |
| UC-005 | Memory UI shows Agent copies' memory in the Agents list under their definition, without regressions elsewhere | SCN-005 |
| UC-006 | Deleting a coordinating run removes only its own folder; its task agents' memory is kept (detached) | SCN-006 |
| UC-007 | Startup migration moves all existing copies and splits existing message logs, verified on the real large run | SCN-007 |
| UC-008 | Agents in a coordinating run and its delegated runs exchange messages; each message is stored with the run(s) it belongs to | SCN-008 |

### Out Of Scope

- Showing copies as their own rows in run history, the workspace sidebar, or under their workspace (follow-up 6fb6e21b); linking an existing run to a Task (cc9c919e).
- Listing Team copies as runs in the Memory UI Teams list (follow-up; DEC-004).
- Making copies eligible for skill improvement or other features they do not have today (follow-up).
- Changing which run coordinates a copy at runtime (hosting, routing, idle/wake, status, DONE/reopen) — runtime coordination stays with the delegating root.
- The slow-opening bug e6985045; agent input delivery cleanup 17bfe0fe.
- Rewriting imported Memory Sync corpora (`memory/imports/…`) (DEC-007).
- New Memory Sync capability (future ticket): exporting organization runs themselves, syncing selected runs, a sync status per run, cleaning old nested residue on receiving nodes, anything for cross-node delegation.
- Rewriting historical raw-trace content that mentions old paths.
- Cross-node transport, delivery status or attachment transfer for messages (the email model only prepares for it).

### Non-Goals

- Faster opening of runs with many task agents. Opening a hub still composes today's views from each task agent's own record (contract §0 H2 known cost); reading task agents only when expanded is a follow-up (needs an app change; possibly with Task e6985045).
- Changing the message log file format (append-only JSON Lines is a follow-up Task, decided 2026-10-17).
- A Memory page view of detached task agents (follow-up).
- Supporting downgrade to an older app version after migration (DEC-006).

### Preserved Behavior Boundary

- BEH-003, BEH-004, BEH-005 preserved columns; REQ-005, REQ-010; AC-004..AC-007, AC-012.
- Invariant: tool contracts and results of `delegate_task`, `send_message_to`, `create_task`, `update_task`, and all GraphQL/REST/WebSocket shapes are unchanged.
- Invariant: every byte of every copy's existing memory is preserved.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A new Agent copy's memory (raw traces and archives, snapshots, file changes, context files and any other run files) is written only in its own standard standalone-run folder, regardless of whether the delegator is in an Agent, Team or Org root, and regardless of where the copy is hosted in the root's tree (including a copy delegated by a member of another copy). | BEH-001 | Must | User direction "Agent copy → a normal standalone run" | Task Direction; DEC-001 |
| REQ-002 | A new Team copy's memory is written only in its own standard Team-run folder, with each member's memory inside it as in a normal Team run (teams are flat: members are agents). | BEH-002 | Must | User direction "Team copy → a normal team run" | Task Direction; DEC-001 |
| REQ-003 | The coordinating run's folder holds only its own content and the links: its execution tree with one short link per task agent (run id, kind, delegating agent, address, start time — contract §3.3), its own message log (REQ-011), and its own memory and parts. No task agent's memory, facts or internal messages are written there. | BEH-001, BEH-002, BEH-009 | Must | "The delegating run keeps only coordination data" | Task Direction; SR-004 |
| REQ-004 | A task agent owns its facts: its own `run_metadata.json` (agent) or team tree (team) holds its definition, runtime, model, model settings, workspace, platform session id, launch provenance and the user's Settings edits (a team: members, coordinator, handoffs, default launch settings), plus a `taskAgent` section (coordinating run, delegating agent, address). No fact is stored twice (contract §3, P2). | BEH-006 | Must | Standard per-run features (Memory UI, follow-ups) need to recognize a copy folder without scanning every delegator; avoids "Unattributed" without duplicating the tree's facts | DEC-003, DEC-004, DEC-009 |
| REQ-005 | A task agent remains coordinated only by its coordinating run: it is never listed, admitted, opened, restored or run as a run the user started. The readers themselves enforce it: run metadata with a `taskAgent` section is not a standalone run (G1); a team tree with one is not a team run (G2); every existing caller keeps today's behavior (contract §5.1). | BEH-003, BEH-004, BEH-005 | Must | Prevents double hosting; constraint "no behaviour change" | DEC-003; Constraints |
| REQ-006 | A one-time startup migration moves every existing copy's memory, in all three root families, to its own standard folder, and makes each moved folder self-describing (REQ-004), with no file lost or altered. | BEH-008 | Must | "Existing data migrates safely" | Task Direction; DEC-008 |
| REQ-007 | The migration never locks the user out: the app always starts and stays usable; if the migration did not finish (stopped, or a step failed), the next start continues it, every step recognizing from the files what is already done; nothing is overwritten or duplicated; a save never erases a task agent's facts before they are in its own file (contract L4). Only the deterministic data shapes are designed and proven; no further failure states are designed (the user, 2026-10-17). | BEH-008 | Must | Hard-to-undo data move on user's machine; repository rule that history must not lock users out | Task Direction; DEC-008; Data Migration Guideline §1, §7 |
| REQ-008 | After migration, existing runs and copies behave exactly as before: reopen, history, wake-up, status, Settings, Token Meter, Task locator, file changes, context-file and message-reference links. | BEH-004, BEH-005, BEH-008 | Must | "old runs and copies still open, history and indexes stay consistent" | Task Direction |
| REQ-009 | Deleting a coordinating run from history removes only its own folder; its task agents' folders are kept as detached runs (not listed, not restored, not reported as errors); restoring the coordinating run from a backup reconnects them; the delete confirmation says the task agents' memory is kept. Archive and refusal rules unchanged. | BEH-007 | Must | Preserve today's outcome now that copies live elsewhere | DEC-005 |
| REQ-011 | Message logs follow the email model: a message between parts of one run (the coordinating run's own parts, or the members of one delegated Team run) is stored once, in that run's own message log; a message between two different runs (coordinating run ↔ delegated run, delegated run ↔ delegated run) is stored in both runs' logs, as sent in the sender's run and received in the receiver's run, with one message ID. Each run's log lives in its own folder. The run's communication view, attachment links and stream events show the same messages as today (each message once). | BEH-009 | Must | user: email model, works across nodes | User (SR-004) |
| REQ-012 | The startup migration also builds each task agent's own message log from its coordinating run's existing log (every entry with a part of that task agent), merged into any existing own log (union by message id, existing entries kept; ARCH-F-003); the coordinating run's existing log stays unchanged (nothing deleted); views show each message once (contract §7). | BEH-008, BEH-009 | Must | data continuity | User (SR-004) |
| REQ-013 | The coordinating run stays small however long it lives (contract §0 H1, H3): its tree holds only links; a delegation writes the new task agent's own files first and then one short link (a crash in between leaves an unlinked folder that nothing reads, reported once); restoring it starts every task agent shut down without building its runtime (H2). | BEH-001, BEH-002 | Must | long-lived hub (the user's main way of working) | the user, 2026-10-17 |
| REQ-014 | The migration also writes each existing task agent's own facts from its tree record — for a record without `source`, from the configured place at its address; with its launch provenance and Settings edits — and then reduces the coordinating tree's records to links; today's record shapes are read through a frozen copy inside the migration (contract §8). | BEH-008 | Must | data continuity; Data Migration Guideline | contract §6, §8 |
| REQ-015 | Memory Sync keeps working on the new layout, in this ticket, with no new capability: an upgraded node exports task agents as their own run folders; the Memory page shows an upgraded node's imported hubs with their task agents; an import from a node not yet upgraded shows its hubs without task agents, nothing deleted; existing Memory Sync and Memory page tests are updated to this behavior (contract §4, V-18). | BEH-006 | Must | coherent change; no test left behind (the user, 2026-10-17) | the user |
| REQ-017 | Upgrading from any supported earlier release works: earlier released migrations still pending run first (registry order) on the old layout exactly as released (repointed to frozen copies where they import changed code). The task agent migration has no global prerequisite: it migrates every coordinating run whose tree is in its input shape, leaves a run whose tree a tree-writing predecessor may still convert waiting (retried next start), and preserves with a warning a tree that can no longer change; a predecessor retried after the move is harmless (contract §5.4). | BEH-008 | Must | ARCH-F-001, ARCH-F-006; Data Migration Guideline §1, §4; DESIGN.md rule 7 | Solution Designer (within direction) |
| REQ-018 | A save never removes what it did not load; a task agent without its own file is not loaded, shown or restored until it has one, and its record, facts and messages are kept (contract L6, §10). | BEH-008 | Must | ARCH-REV-001 S29–S31; REQ-007 | Solution Designer (within direction) |
| REQ-019 | Current code names carry no version numbers: current runtime files, types, functions and constants outside migrations are renamed without `V1`/`V2`/`v3` (DESIGN.md rule 8); no file name or stored value on disk changes; migration ids and migration-owned frozen names stay as released; new frozen copies are named after the migration that owns them. Product or external names containing a number are excluded. | — | Must | Code clarity; current-only runtime (the user, 2026-10-17: "let's also do the refactoring for this … smelled code names") | the user |
| REQ-016 | Tests that encode the old layout are planned updates in this ticket, not regressions: implementation starts with a test impact inventory (every existing test touching memory placement, task agent records, message logs or Memory Sync, with its planned update); each update records its reason. | — | Must | prevents a test deadlock at validation (the user, 2026-10-17) | the user |
| REQ-010 | The Memory UI lists Agent copies in the Agents list under their agent definition (never "Unattributed") and keeps showing copies as task members inside Team/Org root runs exactly as today. | BEH-006 | Must | Agent copies now live in the standard Agents location; attribution avoids a regression and gives memory search through the standard structure | DEC-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001 / SCN-001 | A standalone Agent run, a Team member and an Org member each delegate to an Agent | Each copy's files exist only under `memory/agents/<copyRunId>/`; nothing is created under the delegator's folder for it | Copy delegated by a member of a Team copy: also its own folder | Integration tests per root family |
| AC-002 | REQ-002, REQ-003 | BEH-002 / SCN-002 | Same three delegators delegate to a Team | Members' files exist only under `memory/agent_teams/<teamCopyRunId>/<memberRunId>/` (teams are flat) | — | Integration tests per root family |
| AC-003 | REQ-004 | SCN-001, SCN-002 | A task agent has been created (new or migrated) | Its own `run_metadata.json` / team tree holds its facts and `taskAgent`; the coordinating tree holds only the link; no fact appears in both | — | Unit/integration test per family |
| AC-004 | REQ-005 | SCN-003 | Copy idle beyond grace; then messaged by its delegator | Copy shuts down, then is restored with its conversation from its own folder and receives the message; a sender from another root still cannot wake it | Missing conversation → `TASK_EXECUTION_CONTEXT_UNAVAILABLE` as today | Integration tests |
| AC-005 | REQ-005 | SCN-003 | Attempt to open/restore a copy's run ID as a standalone or Team run through any standard run API | Refused/not found as today; the copy is never hosted twice | — | Integration test |
| AC-006 | REQ-008 | SCN-004 | Server restart, then user opens a delegator with copies | Tree shows all copies with their status colours; opening a copy shows its full conversation, file changes and context files; Settings list, Token Meter totals and Task locator match pre-change values | Closed-Task copies stay fenced | Integration + E2E on migrated faithful fixtures, never the user's data (DEC-013) |
| AC-007 | REQ-005, REQ-008 | SCN-003 | Task DONE, reopened, copy reactivated by its assigner | Same behaviour as today, reading/writing the copy's own folder | — | Integration test |
| AC-008 | REQ-006 | SCN-007 | Startup with old-layout data in all three families | Every copy's folder is at its standard location with identical file list, sizes and content hashes; delegator folders contain no copy memory | — | Migration tests with the faithful fixtures of every shape (contract §12.3) |
| AC-009 | REQ-007 | SCN-007 | Startup on a partly migrated state (some task agents moved, the tree partly reduced) | The migration continues and ends in the same state as an uninterrupted run; a second start changes nothing | — | Migration test on F-RERUN |
| AC-010 | REQ-007 | SCN-007 | A migration step fails, then the user keeps working (delegates, changes a model) | The app starts and works; no task agent's facts are erased (L4); the next start continues the migration | — | Integration test |
| AC-014 | REQ-011 | SCN-008 | After the change, the host messages its delegated Team's coordinator, two members of that Team message each other, and two delegated runs message each other | the host↔member message is in the host run's log and the Team's log (same message ID); the member↔member message only in the Team's log; the copy↔copy message in both copies' logs; the communication view shows each message exactly once, as before | a log write failing after the receiver's log is durable does not deliver twice and is reported as today's persistence failure | integration per root family |
| AC-015 | REQ-012 | SCN-007 | Startup with existing logs in all three families | every task agent's log holds every message it belongs to, none duplicated; the coordinating run's log is byte-identical to before; interrupted then restarted migration ends in the same state; views show each message once | — | migration tests |
| AC-011 | REQ-006, REQ-008, REQ-014 | SCN-007 | Synthesized test data package covering every shape (contract §12.3: C1–C7, a hub with several task agent teams and one team with several Tasks, records without `source`, with Settings edits, without delegator, a partly migrated state, a task agent that never wrote memory, a detached task agent, message logs inside and between runs) | Migration completes; per-file list / size / hash equal before and after; every task agent opens with full history; a second start changes nothing | Detached and incomplete states behave as contract §10 | Server tests + real-app run (AC-016); never on the user's data or a copy of it (TESTING.md) |
| AC-012 | REQ-009 | SCN-006 | User deletes a coordinating run from history | Its own folder is removed; every task agent's folder stays with all files; they are not listed or restored; the confirmation says so; restoring the run's folder from a backup reconnects them | Delete refused while active, as today | Integration test |
| AC-018 | REQ-015 | SCN-005 | Fixtures: an upgraded node's export; an import from a node not yet upgraded | the Memory page with the imported source shows the upgraded node's hubs with their task agents (memory views open); the old-layout import shows its hubs without task agents; nothing on disk is deleted | — | Server tests over imported roots |
| AC-020 | REQ-017 | SCN-007 | Fixtures F-PENDING and F-PENDING-FAILED (contract §12.3) | F-PENDING: startup runs the pending collaborators and locator migrations as released, then ours; collaborator-converted task agents moved with their memory; task-agent members' context-file references converted; result equals upgrading in two steps. F-PENDING-FAILED: root A migrated and available; root B (its tree-writing predecessor FAILED) untouched and waiting, ours non-terminal; root C preserved with a warning; a second start changes nothing for A and C; once B's predecessor succeeds, the next start migrates B | — | Startup tests |
| AC-021 | REQ-018, REQ-007 | SCN-007 | Fixture F-RERUN-MSG: ours failed for one task agent, the app ran | The unmoved task agent is not shown or restorable; a tree save keeps its record unchanged; a message to a moved task agent written between attempts is in its log after the retry; the coordinating run loads | — | Migration + store tests |
| AC-022 | REQ-002 | — | Withdrawn (SR-008): nested task-team members no longer exist (Task 9942a43c) | — | — | — |
| AC-023 | REQ-019 | — | Source search at the implementation result | No current-code file or symbol outside `app-data-migrations/` carries a schema version number (inventory with each rename in the implementation handoff); persisted file names and values unchanged (existing persistence tests green); typecheck passes | — | Search + typecheck + suites |
| AC-024 | REQ-004, REQ-008 | SCN-004 | A task agent created from a configured place (team member / organization agent address), before and after the migration, and new | It keeps following later changes of that place; display unchanged; its own file has `taskAgent.origin: "configured_place"` | — | Integration tests (U-4) |
| AC-019 | REQ-016 | all | Implementation handoff | contains the test impact inventory, every listed test updated or confirmed unchanged, each change with its reason; the full suites pass against the contract | — | Implementation handoff + API/E2E review |
| AC-016 | all | SCN-001..SCN-007 | Real-app run (team rule): an isolated desktop instance built from the branch with the synthesized test data package | startup with migration; sidebar unchanged; open a hub and its task agents (conversation, file changes, context files, Settings model edit); Memory page Agents list; delete a hub keeps its task agents' folders; second start changes nothing | Evidence kept | Isolated instance per TESTING.md |
| AC-017 | REQ-005, REQ-013 | SCN-001, SCN-004 | A task agent exists; a delegation is interrupted after the own files and before the link | G1 / G2: the task agent is never listed, admitted or restored as a run the user started through any API; the hub's tree holds only links; the interrupted delegation leaves an unlinked folder reported once and never read | — | Integration tests per family |
| AC-013 | REQ-010 | SCN-005 | Memory UI opened after migration | Agent copies appear under their agent definition in Agents and open their memory view; none "Unattributed"; root Team/Org member lists still show task members with the same memory; Teams list unchanged | A copy folder whose coordinating run no longer records it is not listed | Integration test of explorer services |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Agent in Agent/Team/Org root | Hand work to an Agent | `delegate_task` (address or saved Task) | Delegator active | Copy started, work packet delivered, copy works | Copy memory in its own standalone folder; tree records the copy | Nested delegation from a copy's member | Supported Normal Scenario | Real data: 63 Agent+Team copies in Agent roots, 18 in Team/Org roots | REQ-001, REQ-003, REQ-004; AC-001, AC-003 |
| SCN-002 | System | Same | Hand work to a Team | `delegate_task` to Team address | Delegator active | Team copy started, coordinator works, members start lazily | Members' memory inside the copy's own Team folder | — | Supported Normal Scenario | Real data: 39 Team copies in PTM run | REQ-002..REQ-004; AC-002, AC-003 |
| SCN-003 | System | Root idle schedule / delegator message / user | Pause and resume copies | Idle grace; `send_message_to` run ID; composer; DONE/reopen/reactivate | Copy exists | Shutdown, wake/restore, deliver | Conversation continues from own folder | Context unavailable / restore failed errors | Supported Normal Scenario | team doc §Delegated Child Lifecycle | REQ-005, REQ-008; AC-004, AC-005, AC-007 |
| SCN-004 | User | User | Reopen and inspect a delegator and its copies | Sidebar, collaboration view, Event Monitor, Settings, Token Meter, Task page | Stored or live run | Open run, expand copies, open a copy, check Settings/Token Meter/Task locator | Same content as before | Closed copies fenced | Supported Normal Scenario | standalone doc §Surfaces | REQ-008; AC-006 |
| SCN-005 | User | User | Browse/search memory | `/memory` | Copies exist | Open Agents list, search, open a copy's run; open a Team/Org root and its task members | Agent copies listed under their definitions; root member lists as before | — | Supported Normal Scenario | agent_memory.md; DEC-004 | REQ-010; AC-013 |
| SCN-006 | User | User | Remove a finished delegator | History delete | Delegator stopped | Delete | The coordinating run's own folder removed; its task agents' folders kept, detached (contract §10) | Refused while active | Supported Normal Scenario | standalone doc §Root lifetime | REQ-009; AC-012 |
| SCN-007 | Operational | App startup after upgrade | Bring existing data to the new layout | Startup migration | Old-layout data | Migrate, verify, record | All copies in own folders, nothing lost | Stopped or a step failed: the app works, the next start continues | Supported Normal Scenario | Task Direction | REQ-006, REQ-007, REQ-008; AC-008..AC-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no new UI; Memory UI lists gain entries through existing screens)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: none new
- Product decisions that need the user (with reasoning and recommendation): none

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006, REQ-007; AC-008..AC-011 | Reliability | 0 files lost or changed (content hash equality per file) across the migration | All three families | Migration tests on faithful fixtures + real-app run on a test-owned data root (AC-016) |
| QR-002 | REQ-006, REQ-012, REQ-014; AC-011, AC-015 | Operability | The migration renames folders (no copy) and needs no free disk beyond the new metadata and logs; proven on small synthesized data covering every shape, not on data of the real size (the user, 2026-10-17; TESTING.md) | All families | Migration tests |
| QR-003 | REQ-005 | Reliability | A copy is never hosted by two runtimes | All run APIs | Integration test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data or state that must be preserved: every file of every copy's memory (raw traces incl. rotated archives and manifests, snapshots, file changes, context files, other run files); delegator trees, communication messages, Task `agent_run_resources.json`, token usage records; links that address copies by run ID (context-file and message-reference URLs). Every message of every existing message log (REQ-012).
- Loss, reset, rebuild, or regeneration that is acceptable: none. Only folder location changes and a new self-description is added.
- Retention, privacy, compliance, volume, downtime, or operational constraints: 88 task agents in shapes C1–C6 on this machine (contract §6, read-only); migration at startup before runs are active; paths stay under the memory root.
- Unknowns requiring downstream investigation: none open (Memory Sync: contract V-18; delete keeps task agents: REQ-009; migration and released predecessors: contract §8, §5.4).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent tool contracts (`delegate_task`, `send_message_to`, `create_task`, `update_task`) | Unchanged | agent_team_execution.md, projects.md | None |
| GraphQL/REST/WebSocket surfaces | Unchanged shapes | standalone_agent_run_root.md §Surfaces | None |
| Memory Sync | Exports keep working on new layout | agent_memory.md | Re-export volume (UNK-001) |
| Task 17bfe0fe | Same code area | worktree list | Merge conflicts |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `memory-layout-contract.md` (revision 3) | Behavior-defining supplement: layout, records, operations, migration, released migrations, not-available states; governs where this document differs | all REQ / AC | Current | Approved by the user (revision 2, 2026-10-17); revision 3 corrections approved by the Solution Designer within the user's direction, user informed |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Run IDs are globally unique (definition slug + UUID), so a copy's own folder never collides with another run's | Safe placement | Verified in `agent-run-identity-allocator.ts`; the rename never overwrites (REQ-007) | Verified |
| ASM-002 | The migration runs before any collaboration root is active | Safe moves | Architecture to confirm startup ordering | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Does this apply only to Agent-root delegators, or also when the delegator is a Team or Org member? | Copies exist in all three families (57/12/6) | (a) Agent roots only; (b) all three | The user's principle ("a Task copy should follow its own structure") is about copies, not the delegator's kind; leaving Team/Org copies inside root folders keeps the special case. Recommend (b). | Solution Designer | Decided |
| DEC-002 | Do collaborators move too? | — | — | **Superseded (SR-004):** collaborators no longer exist (Task 259ddae7); the 9 stored collaborators were converted into delegated runs, so they move like every other copy. | — | Superseded |
| DEC-010 | How are messages stored? | REQ-011 | (a) one shared log in the coordinating run (today); (b) the log of the smallest run containing both parties; (c) email model: each run's own log, cross-run messages in both | (c), user's decision (2026-10-15): it keeps every run self-contained and works unchanged when two runs are on different nodes; duplication of cross-run messages is intended (sent vs received). | User | Decided (SR-004) |
| DEC-011 | Which run's log is the delivery commit point for a cross-run message? | REQ-011 | sender first; receiver first | Receiver's log first (delivery = durable receipt), then the sender's log, under the coordinating run's existing persistence lock; a failure after the receiver's log is durable is handled like today's post-durability persistence failure (fail-stop), never a second delivery. | Solution Designer | Decided (SR-004) |
| DEC-003 | What does "a normal run" mean for a copy's runtime? | Independent hosting would change idle/wake/routing semantics | (a) copy becomes an independent root at runtime; (b) normal storage, coordinated by its delegating root | Constraints require no behaviour change and keep idle/wake/status/locator working; those are root-owned today. Normal storage + self-description gives the consistency and enables follow-ups without risking double hosting. Recommend (b). | Solution Designer | Decided |
| DEC-004 | Should copies appear in the Memory UI lists for their kind? | Once in `memory/agents/`, Agent copies would otherwise show as "Unattributed" | (a) hide copies from standard lists; (b) list Agent copies under their definitions; (c) also list Team copies as Team runs | Task names memory search as a motivation; hiding would add a new special case, so Agent copies are listed by definition (needed anyway, they already sit in the scanned location). Listing Team copies in the Teams list is new UI capability (new list source, run view and member-view resolution) not needed for consistency of storage; today they are visible as task members of Team/Org roots and stay so. SR-002: recommend (b) now, (c) as a follow-up. | Solution Designer | Decided (revised SR-002) |
| DEC-005 | What happens to task agents when the coordinating run is deleted? | Task agents no longer sit inside its folder | (a) delete with it; (b) keep, detached | **Revised (SR-005), the user:** (b) — "if delete hub will delete all run data that will be really big loss"; kept folders stay restorable with a backup of the hub; a view of detached task agents is a follow-up. | User | Decided (SR-005) |
| DEC-006 | Must an older app version still read migrated data? | Downgrade after beta | (a) support; (b) not supported, data intact | Repo convention: layout migrations are one-way (e.g. "An older build … rejects the standalone index"). Data is moved, not deleted. Recommend (b), documented as a known limit. | Solution Designer | Decided |
| DEC-007 | Are imported Memory Sync corpora migrated? | `memory/imports/…` contains old-shape folders | (a) rewrite; (b) leave read-only | Imported corpora are read-only and owned by their source node, which migrates itself. Recommend (b). | Solution Designer | Decided |
| DEC-009 | (superseded by DEC-012 in SR-005) What does a copy's folder record about itself? | REQ-004; duplicated facts would create a second authority | (a) copy of the tree record (definition, launch settings, members); (b) only a back-link (kind + coordinating run) | The coordinating run's tree stays the single authority for copy facts and is already read by every surface that shows a copy; a back-link lets standard per-run readers recognize and attribute the folder without duplicating mutable facts. Recommend (b). | Solution Designer | Decided (SR-002) |
| DEC-012 | Who owns a task agent's facts? | REQ-004; authority vs one readable tree | (a) the coordinating tree (back-link only in the folder); (b) the task agent's own `run_metadata.json` / team tree, links only in the coordinating tree; (c) middle path (immutable identity in the folder, changing facts in the tree) | (b), the user: ownership belongs to the run; the coordinating run behaves like a hub that must stay small for months or years (H1, H3) and must later relate to task agents on other nodes. Cost accepted: composing today's views reads one file per task agent (H2). | User | Decided (SR-005) |
| DEC-014 | What failure handling does the migration design? | REQ-007 | detailed failure states (conflicts, dependent ordering, orphans) vs none beyond "keep working, continue next start" | The user: deterministic shapes are proven by faithful tests; unpredictable stops (e.g. power off) and failures need only that the app keeps working and the next start continues. One data-integrity guard stays (L4). | User | Decided (SR-005) |
| DEC-013 | How is the migration proven? | AC-011 | real data of the real size vs small synthesized data covering every shape | Synthesized shapes, the user: size does not matter for a rename; TESTING.md forbids running migrations on user data or copies. | User | Decided (SR-005) |
| DEC-015 | Own-file details raised by the implementer (U-1..U-5, 2026-10-17) | D-1 must round-trip today's composed records without loss and without behavior change | Implementer proposals; read-only data check (9 delegations by task-team members, all at the coordinating run; 0 inside task team records) | U-1 top level = started launch, Settings edit beside it (DEC-005); U-2 nullable `workspaceRootPath`; U-3 team own tree deviations (omit, never invent); U-4 **not** a snapshot: `taskAgent.origin: "configured_place"` keeps today's "follows the place" behavior and display, and withdraws the §6 behavior change for migrated records; U-5 team links never carry `taskExecutions`; a nested record found by the migration becomes a top-level link (CM-7). **Decided.** | Solution Designer (within the direction; no behavior change) | Decided |
| DEC-016 | Include the version-name cleanup in this ticket? | Same files (message stores) are reworked here | The user, 2026-10-17 | Yes (REQ-019). | the user | Decided |
| DEC-008 | Is moving existing data authorized? | Hard-to-undo data migration | Task Direction: "Existing data migrates safely … The team designs the migration and proves it on real data" | The user set this in the Task; safety guarantees are REQ-007/QR-001. No further user decision needed. | User (via Task) | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | — |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-002 | — |
| REQ-003 | UC-001, UC-002 | BEH-001, BEH-002, BEH-009 | AC-001, AC-002, AC-014 | SCN-001, SCN-002, SCN-008 | — |
| REQ-011 | UC-008 | BEH-009 | AC-014 | SCN-008 | — |
| REQ-012 | UC-007 | BEH-008, BEH-009 | AC-015 | SCN-007 | — |
| REQ-004 | UC-001, UC-002, UC-005 | BEH-006 | AC-003 | SCN-001, SCN-002 | — |
| REQ-005 | UC-003, UC-004 | BEH-003..BEH-005 | AC-004, AC-005, AC-007 | SCN-003 | — |
| REQ-006 | UC-007 | BEH-008 | AC-008, AC-011 | SCN-007 | — |
| REQ-007 | UC-007 | BEH-008 | AC-009, AC-010 | SCN-007 | — |
| REQ-008 | UC-003, UC-004 | BEH-004, BEH-005, BEH-008 | AC-006, AC-007, AC-011 | SCN-004, SCN-007 | — |
| REQ-009 | UC-006 | BEH-007 | AC-012 | SCN-006 | — |
| REQ-017 | UC-007 | BEH-008 | AC-020 | SCN-007 | contract §5.4 |
| REQ-018 | UC-007 | BEH-008 | AC-021 | SCN-007 | contract L6, §10 |
| REQ-010 | UC-005 | BEH-006 | AC-013 | SCN-005 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-007.
- Product and system constraints architecture must preserve: tool/API contracts unchanged; runtime coordination by delegating root; no double hosting; zero data loss; one-way migration; no new history rows.
- Decisions intentionally deferred to architecture design: form of the self-description; where copy-home placement is decided; migration mechanism and its success/failure semantics; delete path for copies; Memory UI team-copy listing mechanism.
- Technical facts architecture should verify: every memoryDir derivation; startup ordering of migrations vs roots; Memory Sync export behaviour; run-package validator rules; token-usage task-team index dependency on paths.
- Known feasibility or integration risks: RSK-001..RSK-004, UNK-001.

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

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
