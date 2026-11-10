# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005`
- Package identifier: `collaboration-tree-open-tasks-only-469`
- Request / ticket: Project Task `autobyteus-469` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); prerequisite PRE-001 of `autobyteus-461`
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's decision of 2026-11-10
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: the user, in the Solution Designer's conversation on 2026-11-10. DEC-001: "I don't think under UI there will be any difference". DEC-009: "this collaboration tree itself can be built actually in memory from ... the tasks which are still in progress ... then we don't need to keep this on disk" and, after the model was written out, "I think it's clearer. Now it's cleaner. We don't have this duplicated information stored on disk." DEC-008: "I would take your recommendation. Let them leave the tree." The Solution Designer approved the rest within that direction and informed the user.
- Exact approved requirements baseline / solution revision: `SR-004`
- Behavior-defining supplements and their approved versions: none of this ticket. The rules come from the Task description (agreed by the user as §11 of the 461 contract).

## Problem And Desired Outcome

- Problem: every delegation adds an entry to the top run's collaboration tree and nothing removes it. The entry list is also what a top run reads when it loads: each listed run's own file and message log. On the user's machine the Project Task Manager's tree has 145 entries after one month, 134 of closed Tasks, and a load of that run reads about 22 MB of message logs and run files, about 15 MB of it for closed Tasks.
- Affected actors or systems: the user; every run that delegates (standalone agent run, team run, org run); the Task side; the web client's tree and Team tab; the Memory page.
- Desired outcome: a top run stores no list of the delegated runs on its node. The Task's record is the one record of who delegated, which run works on the Task and whether it is open. The top run's tree is built in memory from the Tasks that are open: a run of a closed Task is not in it, and it is in it again when its Task is reopened or it gets another Task.
- Observable definition of success: the "Done when" of the Task (AC-001 … AC-009).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | A delegation adds an entry; entries are never removed | Unchanged for adding | — | Notes BEH-001 |
| BEH-002 | Contract | SCN-001 | Closing a Task stops its runs and hides them; the entries stay | Closing a run's last open Task also removes its entry | The run's own files, conversation, logs and Task record; the stop itself | Notes BEH-002 |
| BEH-003 | Operational | SCN-005 | Loading a top run reads every listed run's own file and message log | It reads only the runs whose Task is open | What is shown for those runs | Notes BEH-003 (`Measured`) |
| BEH-004 | Contract | SCN-002, SCN-003 | Reopen and the assigner's message, or a follow-up Task by run ID, find the run in the top run's index | The same outcome when the entry is gone: the run continues and is listed again | The texts and results the agents get | Notes BEH-004 |
| BEH-005 | User | SCN-004 | The Team tab shows the messages that the focused agent sent or received. For a top run's own agent all of them are in the run's own message log (`Measured`: 2,097 for the manager; 1,957 with runs of closed Tasks) | Unchanged: every one of those messages is still shown, with the other agent's name, when that agent's run was dismissed | The whole behavior; each run's own conversation | Notes BEH-005; `evidence/team-tab-messages-2026-11-10.txt` |
| BEH-006 | User | SCN-004 | The Memory page lists a delegated run while its top run lists it | It keeps listing a dismissed run (DEC-002) | What the page shows of the run | Notes BEH-006 |
| BEH-007 | User | SCN-004 | The top run's token total and earlier attachments are found through the tree | Unchanged results | The whole behavior | Notes BEH-007 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The user | A long-lived manager run that stays light | The tree and what a load reads do not grow with closed Tasks | Nothing he uses disappears without his decision |
| Agents | Continue a run, give a follow-up Task | Works as today | No change to tools or texts |
| `autobyteus-461` | Builds on this | The entry rule in place for all three kinds of top run | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A Task closes; its runs leave the top run's tree | SCN-001 |
| UC-002 | A closed Task is reopened and its assigner continues the run | SCN-002 |
| UC-003 | A run of closed Tasks gets a follow-up Task by its run ID | SCN-003 |
| UC-004 | The user looks at a top run, its Team tab, the Memory page, the Task page, token totals, earlier attachments | SCN-004 |
| UC-005 | A top run is loaded | SCN-005 |
| UC-006 | A top run with existing entries of closed Tasks is loaded after the upgrade | SCN-006 |

### Out Of Scope

- Removing the hosting of delegated runs, entries of runs on another node (FU-001), Stop of a run that delegated, the stored back-link's shape, message routes (`autobyteus-461`).
- A timer that closes temporary Tasks.
- Deleting or archiving anything of a dismissed run.

### Non-Goals

- No new screen for dismissed runs.
- No change to what an agent reads.

### Preserved Behavior Boundary

BEH-001, BEH-004, BEH-007; REQ-002, REQ-005; AC-002, AC-003, AC-006, AC-007, AC-008.

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | No top run stores a list of local delegated runs. A top run's tree holds a local delegated run while the run has an open Task entry in a Task record that names this top run. When the last open Task of the run closes, a loaded top run drops the run from its tree once the run is stopped, and a tree built afterwards does not hold it. Closing or reopening a Task writes nothing to the top run's file; the one exception is the first save of that file after the upgrade, which leaves out the old list (REQ-007). The run's own files, conversation, message log and Task record do not change. | BEH-002 | Critical | The user's model (DEC-009) | Notes A-1, A-2, B-1 | Task 469; DEC-009 |
| REQ-002 | When a closed Task is reopened and its assigner messages the run, or the run is given a follow-up Task by its run ID, the run continues as today and its entry is back in the tree. | BEH-004 | Critical | The Task rules stay | N/A | Task 469 |
| REQ-003 | In the tree while it should be: a run with another open Task; a run of a temporary Task until that Task is closed (no timer); a sub-work run until its Task closes; in a loaded top run, a closed run whose stop is not confirmed yet (hidden, as today). An entry of a run on another node stays stored, and listed by today's rule: while the agent that delegated it is in the tree (DEC-003). A run that has no Task record is no longer in any tree (DEC-008). A run whose Task record cannot be read is not in the tree until the record can be read again, and the server reports it (DEC-010). | BEH-002 | High | The Task's rules; the user's decisions | Notes A-3, A-7, B-2 | Task 469; DEC-003, DEC-004, DEC-008, DEC-010 |
| REQ-004 | The top run's tree shows the same rows as today (closed runs are hidden today). Loading a top run reads no file of a dismissed run. The Team tab shows the same messages and names as before a closure (DEC-001). The Memory page keeps listing a dismissed run (DEC-002). | BEH-003, BEH-005, BEH-006 | High | The outcome the user asked for; nothing disappears without his decision | N/A | DEC-001, DEC-002 |
| REQ-005 | Unchanged by a removal: the top run's token total; opening a file attached to an earlier message; the Task page's line for the run (muted, offline, not openable); loading a team run or org run whose message log names a run that left the tree. | BEH-007 | Critical | "Must keep working" of the Task | Notes A-4, A-5 | Task 469 |
| REQ-006 | The rules hold for standalone agent runs, team runs and org runs as top runs. | BEH-002 | High | The Task | N/A | Task 469 |
| REQ-007 | Existing data needs no migration. The lists of local delegated runs in existing tree files are no longer read and are left out the next time each file is saved; entries of runs on another node are kept. A read never writes. A tree file that cannot be read is left untouched and that run reports it as today. The 14 runs without a Task record keep their folders and stay on the Memory page. | BEH-002 | Critical | Data Migration Guideline sections 1 … 3; `DESIGN.md` rule 7 | Notes A-8, B-2 | Task 469; DEC-005, DEC-008 |
| REQ-008 | `collaboration_model.md` and the module docs state the rule. | BEH-002 | Medium | The canonical contract changes with the code | N/A | `DESIGN.md` |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-006 | SCN-001 | An agent delegates a Task; the Task is closed while the top run is loaded (for each kind of top run) | The run is stopped and is not in the tree the server reports; the top run's file holds no entry of a local delegated run once it was saved after the upgrade; the run's own files are byte-identical | The top run not loaded at the closure: no file is written; the tree built at its next load does not hold the run. A stop that is not confirmed: the run stays in the loaded tree, hidden, until a later closure request confirms it or the top run is reloaded | Server tests per kind; isolated instance for a standalone top run |
| AC-002 | REQ-002 | SCN-002 | AC-001's state; the Task is reopened; its assigner messages the run by run ID (a Team's coordinator run ID) | The run continues with its conversation; its entry is in the tree again and the web client lists it without a manual reload | Someone else, or a Task that is still closed: refused with today's text and the entry does not come back. A run ID of a member that is not the coordinator of a team that left the tree: "not in this run" (DEC-006) | Server tests per kind; web tests; isolated instance |
| AC-003 | REQ-002 | SCN-003 | AC-001's state; the assigner gives the run a follow-up Task by its run ID | As today; its entry is in the tree again | — | Server tests; isolated instance |
| AC-004 | REQ-003 | SCN-001 | A run with two open Tasks; one closes | The entry stays; it goes when the second closes | — | Server tests |
| AC-005 | REQ-003, REQ-007 | SCN-001, SCN-006 | A temporary Task left open; a run with no Task record in an existing tree file; a run whose Task record cannot be read | The first is in the tree. The second is not; its folder is byte-identical and the Memory page lists it. The third is not in the tree and a warning names the Task whose record cannot be read; the run is back when the record is readable | — | Server tests on hand-built data |
| AC-006 | REQ-005 | SCN-004 | A top run's token total is read before and after a closure | The same total | — | Server tests; isolated instance |
| AC-007 | REQ-005 | SCN-004 | A file attached in an earlier conversation of a dismissed run is opened | It opens | — | Server tests; isolated instance |
| AC-008 | REQ-005, REQ-006 | SCN-005 | A team run and an org run whose message logs name a run of a closed Task are loaded, also after a server restart | They are admitted at startup, load and work; the message stays in the log | — | Server tests |
| AC-009 | REQ-007 | SCN-006 | A top run of each kind is read, loaded and then saved on hand-built data whose file lists local runs of closed Tasks, of open Tasks, of no Task, an older Org entry in a configured Team's list, and a run on another node | The tree holds the runs of open Tasks and the run on another node. The read writes nothing. After the save the file holds only the entry of the run on another node; every run's own files are byte-identical | A tree file that cannot be read: untouched, the run reports it as today, other runs load | Server tests on small hand-built data per shape; isolated instance |
| AC-010 | REQ-004 | SCN-005 | A top run with runs of closed and of open Tasks is loaded | No file of a run of a closed Task is read | — | Server test counting reads |
| AC-011 | REQ-004 | SCN-004 | A top run's Team tab, focused on one of the top run's own agents, before and after a Task with messages is closed; and after a restart | The same messages, each with the other agent's name as before, and each message's attached files still open | A run whose own file cannot be read: its messages are left out, as an unknown agent's are today. A listed run focused: its messages as today | Web and server tests; isolated instance |
| AC-012 | REQ-004 | SCN-004 | The Memory page's Agents list, after a run was dismissed | The dismissed run is listed and its memory opens, as before the closure | Its top run was deleted: as today | Server tests; isolated instance |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Contract | An agent with `update_task`; the user on the Task page | A Task's work ends | Task set to DONE or CANCELLED | Runs work on it | Close → runs stopped → entries removed | REQ-001, REQ-003 | — | Supported Normal Scenario | CM-6; Task 469 | REQ-001, REQ-003, REQ-006 / AC-001, AC-004, AC-005 |
| SCN-002 | Contract | The assigner | Continue closed work | Task reopened; `send_message_to` by run ID | The run was dismissed | Message → record reopened → entry back → run restored | REQ-002 | Not the assigner: refused | Supported Normal Scenario | `docs/modules/projects.md` "Reactivation" | REQ-002 / AC-002 |
| SCN-003 | Contract | The assigner | Another Task for the same run | `delegate_task` with a run ID and a Task | The run was dismissed | Assignment → entry back → work delivered | REQ-002 | — | Supported Normal Scenario | CM-6 | REQ-002 / AC-003 |
| SCN-004 | User | The user | Look at a run and its history | Tree, Team tab, Memory page, Task page, token totals, attachments | Runs were dismissed | Open | REQ-004, REQ-005 | — | Supported Normal Scenario | The Task's "must keep working" | REQ-004, REQ-005 / AC-006, AC-007, AC-011, AC-012 |
| SCN-005 | Operational | The node | Load a top run | First use, restore, open | Entries of open Tasks only | Load | REQ-004, REQ-005 | — | Supported Normal Scenario | Notes BEH-003 | REQ-004, REQ-005 / AC-008, AC-010 |
| SCN-006 | Operational | The node | Use existing data after the upgrade | A top run is loaded | Its tree holds entries of closed Tasks | Load → closed entries removed → normal use | REQ-007 | A tree that cannot be read is left | Supported Normal Scenario | Data Migration Guideline | REQ-007 / AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing surfaces)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: the tree and the Memory page are unchanged. The Team tab is unchanged (DEC-001). No surface changes visibly.
- Explicitly illustrative fixture content or permitted implementation variation: N/A
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: none new.
- Product decisions that need the user (with reasoning and recommendation): none open. DEC-001 was answered by the user.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004 / AC-010 | Performance | Loading a top run reads its tree, its own log and the files of the runs whose Task is open; none of a dismissed run | The user's hub: 145 entries, 11 open | A read-count test |
| QR-002 | REQ-007 / AC-009 | Reliability | Reading an existing tree file never writes; nothing at startup depends on existing trees | Every tree shape | Server tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (entries are removed from trees)
- Data or state that must be preserved: every run's own files, conversations, message logs, Task records
- Loss, reset, rebuild, or regeneration that is acceptable: the stored lists of local delegated runs (every fact in them is in the Task record or the run's own file; notes A-1, B-1); the place of the 14 runs without a Task record under their top run (DEC-008)
- Retention, privacy, compliance, volume, downtime, or operational constraints: an older build cannot be used again on the same data: it would not see runs delegated after the upgrade
- Unknowns requiring downstream investigation: notes U-003 … U-008

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Collaboration Model | Updated in the same change | `DESIGN.md` | None |
| Data Migration Guideline | Governs the decision that no migration is needed | `data_migration_guideline.md` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| The 461 contract's §11 and §12 (path in the investigation notes) | The rules as cases with example files | REQ-001 … REQ-003 | Reference | Not this ticket's supplement |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A removed entry can be rebuilt from the run's own file | REQ-002 | Notes A-1 | Confirmed for local runs; a run on another node keeps its entry (DEC-003) |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What does a top run's Team tab show of dismissed runs? | The only surface where a closure could have changed what the user sees | **A.** Only messages with the runs listed now. **B.** Every message stays | The Solution Designer first recommended A. The user answered that the UI must not differ. The follow-up check showed B costs nothing extra: the tab shows the focused agent's messages, and a top run's own agent has all of them in its own log, which a load reads anyway (2,097 for the manager); no log of a dismissed run is needed. Only the other agent's name has to come from somewhere else than the tree (design). | The user | **Decided by the user (2026-11-10): B, no visible change** |
| DEC-002 | Does the Memory page still list a dismissed run? | Visible: today a delegated run is listed only while its top run lists it; with A-or-B above, dismissed runs would vanish from the Memory page | **A.** Keep listing it (the test becomes "its top run still exists"). **B.** Let it go from the Memory page | Dismissing a run ends its work, not its memory; the user asked in October that a hub's delegated runs' data is never lost. **Recommendation: A.** | Solution Designer | Decided: A (the Task lists the Memory page under "must keep working") |
| DEC-003 | An entry of a run on another node | Same list | Same rule / keep | **Keep it** (changed at SR-003). The link is the only record this node has of that run (its node, its members): nothing to rebuild it from (notes A-1). A run on another node stays listed after its Task closes and is not stopped by the closure (notes A-4, A-2). 2 of 197 links (notes A-7). Growth by remote delegations is follow-up FU-001 | Solution Designer | Decided |
| DEC-004 | A timer for temporary Tasks | Stale entries | Timer / none | None: 1 of 15 temporary Tasks is open (19 days); a timer would cut off later follow-ups; the user was asked and the recommendation given | Solution Designer | Decided (the user informed) |
| DEC-005 | A startup migration, as the Task says, or none | How existing lists go away | Migration at startup / none | **None.** The lists become obsolete content: the reader ignores them and the next ordinary save leaves them out, which the Data Migration Guideline names as a change that needs no migration (section 3). Nothing runs at startup | Solution Designer | Decided (the user informed) |
| DEC-006 | The refusal for a message to a member that is not the coordinator of a team that left the tree | An agent-facing text | Today's "Task is closed, only the assigner can continue it" / "not in this run" | **"Not in this run".** The Task record names only a team's coordinator; naming every member would need each closed team's own file for a refusal. A delegator knows a team by its coordinator's run ID (CM-5), which keeps today's text | Solution Designer | Decided |
| DEC-007 | A top run's last activity in the run list | A derived timestamp | Keep counting runs that left the tree / count the listed runs | **Count the listed runs.** The value can be earlier only when a delegated run was active after every agent still in the tree, which a closure by an agent of the top run never produces. Reading every closed run for a timestamp would bring back the cost this Task removes | Solution Designer | Decided |
| DEC-008 | The 14 runs with no Task record (started 18 August to 13 October 2026, under 8 top runs, 2 of them standalone) | With no stored list the Task records cannot supply them. Today they show under their top run and can be woken by run ID | **A.** They leave the tree; their folders and the Memory page keep them. **B.** A stored list only for them | A keeps one source for the tree. Consequences of A: they are no longer woken from their top run; their messages no longer show in its Team tab; the 2 under a standalone run no longer count in its token total | The user | **Decided by the user (2026-11-10): A** |
| DEC-009 | Where the list of a top run's delegated runs lives | The Task | **A.** Stored in the top run and trimmed (SR-003). **B.** Not stored: built in memory from the Task records | The user's model. The Task record already holds who delegated (`assignedBy`), the top run (`hostRoot`), the run (`agentRun`) and whether it is open (`closedAt`); a stored list is a second copy that grows and must be filtered against the records anyway | The user | **Decided by the user (2026-11-10): B** |
| DEC-010 | A Task whose record cannot be read | Its runs cannot be found | Not in the tree until readable / keep a stored list as fallback | **Not in the tree until readable**, with a warning naming the Task. A fallback list would be the second copy again. Today a damaged record already blocks delegation and ownership answers for its runs (`TASK_AGENT_RESOURCES_UNAVAILABLE`) | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-002 | AC-001 | SCN-001 | 461 contract §11 L3 |
| REQ-002 | UC-002, UC-003 | BEH-004 | AC-002, AC-003 | SCN-002, SCN-003 | §11 L4, L5 |
| REQ-003 | UC-001 | BEH-002 | AC-004, AC-005 | SCN-001 | §11 L6 … L10 |
| REQ-004 | UC-004, UC-005 | BEH-003, BEH-005, BEH-006 | AC-010, AC-011, AC-012 | SCN-004, SCN-005 | — |
| REQ-005 | UC-004, UC-005 | BEH-007 | AC-006, AC-007, AC-008 | SCN-004, SCN-005 | — |
| REQ-006 | UC-001 | BEH-002 | AC-001, AC-008 | SCN-001 | — |
| REQ-007 | UC-006 | BEH-002 | AC-009 | SCN-006 | — |
| REQ-008 | UC-006 | BEH-002 | — (document review) | SCN-006 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001 … SCN-006 (after approval).
- Product and system constraints architecture must preserve: the Preserved Behavior Boundary; `DESIGN.md`; the Data Migration Guideline.
- Decisions intentionally deferred to architecture design: who removes and re-adds an entry (loaded and not loaded); the Task-side lookup; each reader of "the agents of a tree".
- Technical facts architecture should verify: done; see notes "Architecture Investigation". ASM-001 holds for local runs.
- Known feasibility or integration risks: notes U-003 … U-008

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
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded (the user's, or yours within the direction with the user informed): `Yes`
- Exact requirements and supplement approval basis recorded: `Yes` (`SR-004`; no supplement)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
