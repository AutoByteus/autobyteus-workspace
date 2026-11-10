# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (answers architecture review ARCH-REV-001, finding AR-001, on `SR-004`; `SR-004` replaced `SR-003`, which was withdrawn before a review decision)
- Approved requirements baseline / revision, who approved, and approval reference: `SR-004`, with wording corrections at `SR-005` that change no intended behavior. The user decided DEC-001, DEC-008 and DEC-009 on 2026-11-10 (quoted in `requirements-doc.md`); the Solution Designer decided the rest within that direction, the user informed.
- Behavior-defining supplements and their approval references: none
- User approval of the design, when the direction requires it: `Not required`. The model itself is the user's (DEC-009).
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/collaboration-tree-open-tasks-only-469/investigation-notes.md` (sections "Architecture Investigation" A-1 … A-8 and "The Task-Record Model" B-1 … B-4)
- Authorities read (design reading gate; file and date): the skill's `references/architecture-design.md`, `references/design-principles.md`, `templates/design-spec-template.md`; the project's `DESIGN.md`; `autobyteus-server-ts/docs/design/collaboration_model.md`; `autobyteus-server-ts/docs/design/data_migration_guideline.md` (all 2026-11-10)
- Project design-principle conflicts with the general principles, or discrepancies: none. The Task's text names a startup migration; none is needed (DEC-005).

## Current-State Read

A top run (standalone agent run, Team run, Org run) stores, in its tree file, one link per run it or its members ever delegated to: `{address, agentRunId or teamRunId, delegatorAgentRunId, startedAt}`. Each delegated run's facts are in its own file, and that file also holds the link's four fields (notes A-1). A load composes the tree by reading the own file of every listed run. Nothing removes a link.

The same relationship is in the Task record: every entry names the top run (`hostRoot`), the run (`agentRun`), and whether it is open (`closedAt`); the server holds all records in memory (B-1). "Closed" exists only there, so every reader of a tree asks the Task side and hides closed runs (A-2).

So the stored list is a second copy of a relationship that has an owner. It is the copy without an end, and it decides what a load reads. The fix is to stop storing it. The in-memory tree, its indexes, the lifecycle and the view stay as they are; their input changes.

At startup, before the Task records are loaded, the package admission scan reads every Team and Org tree through the stores to validate its structure, and so reads the own file of every delegated run those trees list (B-5). A maintenance script does the same in its own process.

Constraints: links to a run on another node hold facts that exist nowhere else on this node (B-2); the three stores are constructed in 19 places in 15 files, and some reads are synchronous (B-3, B-5); only `assigned` entries can come back after a closure (A-3).

## Design Decisions

| ID | Decision |
| --- | --- |
| D-1 | **One source for a top run's local delegated runs: the Task side.** A new read-only question, `openDelegatedRunsOf(top run)`, answers from the loaded Task records: the runs whose current entry names this top run in `hostRoot`, is open, and is not `starting`. It is synchronous and reads no file. |
| D-2 | **Compose from that source.** `composeTreeFile` builds each local record from the run reference and the run's own file. Raw tree lists contribute only entries with `nodeId`. Every local record goes into the root list. A run whose own file is missing, unreadable, or names another coordinating run is left out with the existing warning. |
| D-3 | **Save without local links.** `splitTaskExecutions` writes each loaded run's own file when it changed, as today, and a tree file whose lists hold only the links to runs on another node. Local links that an existing file still holds are not carried over. |
| D-4 | **The loaded tree follows the Tasks.** The closure's release step drops a run from the loaded tree once it is stopped. The "reopen" step adds a run back from its own file when its assigner continues it or gives it another Task. Both change memory only. |
| D-5 | **The Team tab keeps its rows.** A root's message view keeps the messages of its own log that involve one of its own agents. The participant reader returns, for a counterpart that is not in the tree, the agent's address read from the closed run's own file. |
| D-6 | **Memory listing** asks whether the coordinating run named in the delegated run's own file still exists, not whether a tree lists the run. |
| D-7 | **A standalone run's token total** covers the tree's agents and the agents of this run's closed delegated runs. |
| D-8 | **Web:** a "reopened" event for an execution the view does not hold reloads the view; a Team-tab counterpart that is not in the tree is named from the reader's answer. |
| D-9 | **Links to runs on another node** stay stored where they are, in the same shape. |
| D-10 | **The standalone run's tree file stays** as a small file (its host, links to runs on another node); it holds no local list. Removing the file is not needed for the outcome. |
| D-11 | **Admission reads a run's own parts only.** The Team and Org stores get a second read, `readOwnParts`, that returns the tree of the run's own parts with no delegated run, local or on another node, and never asks the source. The startup package admission and the maintenance repair use it. Every other reader uses the composed read, which exists only after the source is bound. |
| D-12 | **A link to a run on another node keeps today's listing rule:** it is in the composed tree while the agent that delegated it is. An agent of a closed local run is no longer in the tree, so such a link is then left out; the store logs this at debug level, since it is now an ordinary state. No stored link has such a delegator today (B-5). |

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence: the composition source changes for all three kinds of top run and for every reader of a stored tree (B-3); plus the Task-side port and service, the lifecycle and three adapters, the message view rule and two validators, one GraphQL reader with its shared DTO, the Memory rule, the standalone token total, three web contexts and seven documents. About 35 source files.
- Architectural risk: `High`
- Risk rationale and supporting evidence: persistence (what tree files hold changes; an older build cannot read the result), a new dependency of run storage on the Task records being loaded, a changed shared contract and port, concurrency inside the root's command queue, and blast radius over every run that delegates.
- Escalation trigger if implementation or validation discovers new impact: a composed read reached before the Task records are loaded (the source throws; B-5 lists every site); a reader of "the agents of a tree" not in the Change Scope table whose result changes for a closed run; any need for a stored list or a field in the Task record; U-008 or U-009 turning out against the design.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | Notes A-1 | Links, own files, shared compose and split | D-2, D-3 | None |
| Code read; field names of the user's files | Notes B-1 | What a Task record holds; in-memory indexes | D-1 | U-008 |
| `python3 -I evidence/measure_links_without_task.py ~/.autobyteus/server-data` | `evidence/links-without-task-2026-11-10.txt` | 170 closed, 11 open, 14 without a Task record | D-1, DEC-008 | None |
| `python3 -I evidence/measure_unlink_cases.py …`; read-only counts of 2026-11-10 (notes U-004, B-5) | `evidence/unlink-cases-2026-11-10.txt` | 2 remote links, both delegated by the top run's own agent; 2 older Org links, both of runs with no Task record; no nested run outlives its delegating run | D-2, D-9, D-12 | None |
| Code read | Notes A-2, A-3 | Closure release step; reactivation and follow-up through the root's index | D-4 | None |
| Code read; `python3 -I evidence/measure_team_tab_messages.py …` | Notes A-4, A-5; `evidence/team-tab-messages-2026-11-10.txt` | Team tab, validators, the own log holds every message of the top run's own agents | D-5 | U-003, U-006 |
| Code read | Notes A-4, A-6 | Memory listing, token total, web events | D-6, D-7, D-8 | None |
| Code read | Notes B-3, B-5 | 19 construction sites of the three stores in 15 files, each placed before or after the binding; the startup order of both entry points | D-1's binding; D-11 | One site `Inferred` (application runtime), covered by AC-008 |
| Architecture Reviewer's observations | Notes B-4 | Shared key with 461; stopped-run Settings; presence signal | "Relationship to autobyteus-461"; D-6 | None |
| Document read | Notes A-8 | Migration conventions | Persisted Data decision | None |

## Intended Change

Stop storing the list of local delegated runs in a top run. Build the tree in memory from the Task records and each run's own file, keep the loaded tree in step with Task closures and reopenings, and give the few readers that showed something of a closed run through the tree their own source.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-006. Areas: `run-history/store` (compose, split, the source interface, view rule, presence), `projects/services` (the source and one port answer), `agent-collaboration/execution/task` (tree-membership policy, port, adapter interface), the three roots' adapters, mutators and delivery guards, `run-history/services` (closed-run reader), one GraphQL reader, `token-usage`, `agent-memory`, `autobyteus-collaboration-stream-contracts`, three web contexts and the participant-messages store, documents.
- Derived consumers (the composed tree no longer holds runs of closed Tasks or runs without a Task record):

| Consumer built from the tree | Decision |
| --- | --- |
| Composed tree, execution indexes of the three roots | Built as today from the composed records; no change |
| Every request-time reader of a stored tree (B-5, "After"): history rows, catalogs, location services, stopped-run Settings, collaborator port resolver | Same store read, new source; no change of their own. Stopped-run Settings save through the store and so write own files only |
| Startup package admission (`RootRunPackageCurrentValidator`) and the maintenance repair of the history index | Change: D-11. They read own parts only and do not depend on the Task records |
| Closed-run filter (`listClosedTaskExecutions`, view projectors, GraphQL `closed_task_executions`, web `collectClosedSubtrees`) | Stays: a loaded root holds a closed run until its stop is confirmed. For a stored tree it now yields nothing |
| Stored message view, Team and Org validators, participant messages reader, attachment readers | Change: D-5 (U-006 for attachments) |
| Memory page and memory search | Change: D-6 |
| Standalone token total | Changes: D-7. Team and Org totals go by the root on each usage row: no change |
| Token usage display fields at capture, context file owner lookup, process supervisor, delegated launch selections, restart resume, busy-run record | Act on runs that are open and so in the tree; no change |
| Run last activity | Counts the runs in the tree (DEC-007); no code change |
| Run-ID delivery guard, `teamCoordinatorOf` | Change: D-4 |
| Web handlers for "reopened" | Change: D-8 |
- Deliberately left alone: the Task record's shape; links to runs on another node (D-9); the standalone tree file's existence (D-10); the closed-run filter; hosting; the web tree and Task page.
- Follow-ups: FU-001, FU-002, FU-003 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Preserved in effect | `delegate_task` | The activation commit writes the own file, then the link (A-1) | The own file only; the Task record entry exists before (B-1) | DS-002 |
| BEH-002 | Contract | REQ-001, REQ-003, REQ-006, REQ-007 / AC-001, AC-004, AC-005, AC-009 | Task set to DONE or CANCELLED; a tree is read | Stop and hide; the link stays (A-2) | Not in a tree built afterwards; dropped from a loaded tree once stopped | DS-001, DS-003 |
| BEH-003 | Operational | REQ-004 / AC-010 | A top run is loaded | Reads every listed run's own file and log | Reads only the runs of open Tasks | DS-001 |
| BEH-004 | Contract | REQ-002 / AC-002, AC-003 | `send_message_to` by run ID after a reopen; `delegate_task` with a run ID | Resolved through the root's index (A-3) | Same outcome; the run is in the tree again | DS-004, DS-R1 |
| BEH-005 | User | REQ-004 / AC-011 | The Team tab is shown | Messages whose two agents are in the tree | The same rows and names | DS-005 |
| BEH-006 | User | REQ-004 / AC-012 | Memory page or memory search | Listed while linked | Listed while its coordinating run exists | DS-006 |
| BEH-007 | User | REQ-005 / AC-006, AC-007, AC-008 | Token total, attachment, load of a Team or Org run | Through the tree | Unchanged results | DS-005, DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/links-without-task-2026-11-10.txt` (+ script) | What the Task records cannot supply | AC-005, AC-009 | Basis of DEC-008 and the fixtures | Evidence |
| `evidence/unlink-cases-2026-11-10.txt` (+ script) | Every stored link case | AC-009 | Shape inventory for the fixtures | Evidence |
| `evidence/team-tab-messages-2026-11-10.txt` (+ script) | What the Team tab is made of | AC-011 | Basis of D-5 | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Refactor` of a stored structure, with a behavior change (closed runs leave the tree) and a performance outcome
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - **Derived data** (Principle 11): "which delegated runs belong to this top run" is stored twice, in the tree list and in the Task records, and the two are reconciled at every read (A-2). The design keeps one.
  - **Shared-structure tightness** (Principle 11): the link repeats four fields of the run's own file (A-1).
  - **Several kinds** (Principle 1): three kinds of top run, two kinds of delegated run; each has its row in the file mapping.
  - **Behavior by absence** (Principle 13): "not in the index" would mean both "unknown" and "closed"; the lifecycle asks the Task side explicitly (D-4).
  - **Persisted-data transition** (Principle 5): decided below, no migration.
  - **Vocabulary** (Principle 15): "link" narrows to runs on another node (Terminology).
- Root cause classification: `Shared Structure Looseness` (a redundant stored copy of a relationship that has an owner)
- Refactor needed now: `Yes`
- Evidence: notes A-1, A-2, B-1.
- Design response: remove the copy; compose from the owner.
- Refactor rationale: trimming the copy (SR-003) kept two writers and a reconciliation step for a fact with one authority. Removing it needs no step at closure, at load or for old data.
- Intentional deferrals and residual risk: links to runs on another node keep growing (FU-001); the Org tree's per-Team lists become always empty and stay as a field (FU-003); files over 500 lines (FU-002).

## Terminology

Changed in `collaboration_model.md` §1 in this change.

- **Link**: unchanged definition (what the two nodes keep of a run on another node). It is no longer also used for a local run: a coordinating run keeps nothing stored of a local delegated run.
- **In the tree**: a local delegated run is in its coordinating run's tree while a Task record that names this coordinating run holds an open entry for it. The tree is built in memory.
- **Closed delegated run**: one with no open Task entry; it is in no tree. "Detached" keeps its meaning (its coordinating run was deleted).
- The code keeps "task execution" for a delegated run in a tree.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the writer and reader of local links in tree files, with the handling of full records in a list (`isTaskExecutionLinkEntry`, `parseTaskExecutionLink` in compose, `taskExecutionLinkOf` in split); `TaskAgentLinkChecker`; the validators' endpoint-set loop; `refuseCopyOutsideTree`.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. Existing local links are ignored, not interpreted.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: the link lists of `collaboration_tree.json`, `team_run_execution_tree.json` and `agent_org_run_execution_tree.json`: 26 trees, 195 local links, 2 links to runs on another node (A-7).
- Relevant code-model, serialization, semantic, or physical-store change: local links are no longer written or read. The list keeps its name and holds what it also held before: links with `nodeId`.
- Normal reader/writer behavior and representative evidence: the reader takes entries with `nodeId` and ignores the rest; the writer writes only entries with `nodeId`. Every fact of an ignored link is in the run's own file and the Task record (A-1, B-1).
- Required semantics and invariants under direct use: none depends on an ignored link.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: nothing is deleted from any run's folder. An older build would not see runs delegated after the upgrade (no link is written for them).
- Decision: `Directly Usable — No Migration`
- Decision rationale: obsolete stored content that the reader ignores and the next ordinary save drops is the Guideline's case for no migration (section 3). The benefit of a migration would be only tidier files sooner, against a startup pass over all history.
- Acceptance criteria or design constraints supported by this decision: AC-005, AC-009, AC-010, QR-002.

### Data Migration Guideline checklist (section 2)

1. **Need:** none. Removing obsolete content is absorbed by the reader.
2. **Availability:** the startup admission scan reads each Team and Org tree's own parts and nothing of a delegated run or a Task record (D-11); it reads less than today. One unreadable tree file marks that package only, as today. Nothing at startup waits for the Task records, and the Task records wait for no tree.
3. **Source and target:** one stored shape. Inventory: `evidence/unlink-cases-2026-11-10.txt` and `evidence/links-without-task-2026-11-10.txt`; a fixture per case in AC-005 and AC-009 (closed, open, no Task record, link to another node, older Org list, unreadable Task record).
4. **Disposition:** local link: ignored, dropped at the file's next save. Link with `nodeId`: kept. Run without a Task record: not in a tree, folder untouched (DEC-008). Unreadable Task record: its runs are not in the tree until it is readable (DEC-010).
5. **Commit and retry:** no conversion step exists. A save is the store's existing atomic replacement.
6. **Current-only boundary:** current code holds no reader of local links; nothing is frozen because nothing is converted.
7. **Cost:** a read does one in-memory lookup and reads the own files of the runs of open Tasks only. No pass over history anywhere.
8. **References:** the Task record's `hostRoot` and run IDs are the lookup keys and are unchanged. Messages name agent run IDs; D-5 resolves them.
9. **Evidence:** AC-001 … AC-012. Unverified until implementation: U-003, U-005, U-006, U-008, U-009.
10. **Lessons and review:** no startup work (the lockout of `team-attachment-exact-execution`, the startup cost corrected in `startup-performance`). Rollback: not possible after runs were delegated on the new build; the release notes say so. Independent review: Architecture Reviewer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-003 | A tree is read after startup (load, or any request-time stored read; B-5 "After") | Composed tree | The kind's tree store | The one place the list comes from |
| DS-008 | Primary End-to-End | BEH-007 | Server start (both entry points), or the maintenance repair script | Team and Org packages admitted; history index rows | `RootRunPackageCurrentValidator` (the repair for its rows) | Runs before the Task records are loaded |
| DS-002 | Primary End-to-End | BEH-001 | `delegate_task` to an address | Run in the loaded tree; own file written | `RootTaskExecutionLifecycle` (activation) | No link is written |
| DS-003 | Primary End-to-End | BEH-002 | Task set to DONE or CANCELLED | Run stopped and out of the loaded tree | `RootTaskExecutionLifecycle` ("release" step) | The loaded tree follows the Task |
| DS-004 | Primary End-to-End | BEH-004 | `send_message_to` by run ID, or `delegate_task` with a run ID | Run in the loaded tree again and continued | `RootTaskExecutionLifecycle` ("reopen" step) | Coming back |
| DS-005 | Primary End-to-End | BEH-005, BEH-007 | Team tab shown | Rows with names; attachments open | The participant messages reader | The visible surface |
| DS-006 | Primary End-to-End | BEH-006 | Memory page or search | Run listed | The memory sources | Listing rule |
| DS-007 | Primary End-to-End | BEH-007 | Token total requested | Same total | `StandaloneRunTokenUsageSummaryService` | Total over closed runs |
| DS-R1 | Return-Event | BEH-004 | Root publishes "reopened" | Web lists the run | The web context of the root kind | A client whose view never held the run |

DS-001 … DS-004 apply to the three kinds of top run; DS-007 is standalone only (A-4); DS-008 is Team and Org only (a standalone run is admitted from its metadata, B-5).

## Primary Execution Spine(s)

- **DS-001:** `caller (manager load, location service, history service, …) -> tree store.read -> OpenDelegatedRunSource.openDelegatedRunsOf(top run) [Task records in memory] -> own files of those runs -> composeTreeFile -> validated tree`
- **DS-008:** `server start -> app-data migrations -> RootRunPackageReadinessIndex.rebuild -> RootRunPackageCurrentValidator.scan -> Team / Org tree store.readOwnParts (the tree file only) -> structure validated -> package admitted`; later in the same start: `composeProjectTaskExecutionResources -> Task records loaded -> source bound -> composed reads possible`
- **DS-002:** `delegate_task(address) -> root delivery -> RootTaskExecutionLifecycle -> port.linkNewTaskExecution (Task record entry) -> adapter activation commit -> persistence coordinator -> store.writeTree (own file; no link) -> loaded tree replaced -> port.markStarted`
- **DS-003:** `update_task (DONE) -> ProjectTaskService -> TaskExecutionResourceRelease -> active root.releaseTaskExecutions -> lifecycle queue step "release" -> RootTaskExecutionResourceScope.releaseHostedExecutions -> TaskExecutionTreeMembership.dropStopped -> adapter.dropTaskExecutions -> loaded tree replaced`
- **DS-004:** `send_message_to(run ID) -> root delivery guard (lifecycle.knowsRunId) -> lifecycle.deliverToExactTarget -> TaskExecutionTreeMembership.closedExecutionFor -> port.assertReopenable -> queue step "reopen": adapter.addTaskExecution (own file -> record -> loaded tree) -> settle previous stop -> port.reopenAssignment -> "reopened" published -> delivery wakes or restores the run`. With `delegate_task(run ID, task)`: the same with `assertAssignable` and `assignExistingTaskExecution`.
- **DS-005:** `Team tab -> GraphQL collaborationParticipantMessages -> root records snapshot -> ClosedDelegatedRunReader -> DTO {messages, pastParticipants} -> web rows`
- **DS-006:** `Memory page / search -> memory source reads the run's own file -> CoordinatingRunPresence.exists -> listed`
- **DS-007:** `usage panel -> getStandaloneRunTokenUsageSummary -> tree agents + ClosedDelegatedRunReader.agentRunIds(top run) -> TokenUsageRunStore`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A store read parses the tree file for the run's own parts and its links to other nodes, asks the source for the top run's runs of open Tasks, reads those runs' own files and composes the records, sorted by start time, into the root list | Tree file, Task records, own files | Store | The source's binding |
| DS-008 | Admission judges a root run's own package: the tree file exists, parses, and its own parts are consistent. It reads no delegated run and asks nothing of the Task side, so it needs no ordering with the Task record load. A delegated run with a broken own file is judged where the tree is composed, where it is left out alone with a warning | Package, own parts | Validator | — |
| DS-002 | As today, except that the save writes the new run's own file and no link. The Task record entry, written before any resource is acquired, is what a later read finds | Task entry, own file | Lifecycle | — |
| DS-003 | The release step stops the closed runs as today. For each run it reports stopped that is still closed and in the tree, the adapter drops the released authority and removes the record from the loaded tree. No file is written. A stop that is not confirmed leaves the run in the loaded tree, hidden | Task, release step | Lifecycle | Message list trim |
| DS-004 | The guard lets a run ID through when it is in the index or is the ingress of a closed run the Task side records for this top run. The lifecycle finds the execution (index, else Task side), runs the Task side's advisory check, and in one queue step adds it to the loaded tree from its own file when it is not there, then does today's resume preparation and commit. If the commit fails after an add, the same step drops it again | Message, closed run | Lifecycle | Own-file read; "reopened" event |
| DS-005 | The reader returns a participant's messages whose counterpart is in the tree, as today, or is an agent of a closed delegated run of this top run; for those it returns the agent's address from the run's own file | Message, participant | Reader | Own-file read; Task-side lookup |
| DS-006 | A delegated run found by its own file is listed when the coordinating run its file names still has its own file | Run with memory | Memory source | File existence |
| DS-007 | The total covers the host, the tree's agents and the agents of this run's closed delegated runs | Token total | Summary service | Own-file read for Teams |

## Spine Actors / Main-Line Nodes

The tree stores, `OpenDelegatedRunSource` (new interface; the Task side implements it), `RootTaskExecutionLifecycle`, `RootTaskExecutionResourceScope`, `TaskExecutionTreeMembership` (new), the root's task adapter, the root's message delivery, the participant messages reader, `ClosedDelegatedRunReader` (new).

## Ownership Map

| Node | Owns |
| --- | --- |
| Task side (`TaskExecutionResourceService`) | Which runs belong to a top run; which are open; a closed run's ingress |
| Tree store (three) with `task-execution-tree-split.ts` | Composing a tree from the file, the source and own files; what a save writes |
| `RootTaskExecutionLifecycle` | Step order in the root's queue |
| `TaskExecutionTreeMembership` (new, used only by the lifecycle) | Which released runs leave the loaded tree; which run ID names a closed run of this top run; undoing an add when the commit fails |
| Root task adapter (three) | Its loaded tree, index and registries |
| Participant messages reader | Which messages a participant's Team tab gets |
| `ClosedDelegatedRunReader` (new) | The agents (run ID and address) of a top run's closed delegated runs |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `OpenDelegatedRunSource` process binding | `TaskExecutionResourceService` | 19 store construction sites use their defaults (B-5); run storage must not import Projects | Any Task rule; it forwards one question |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Writing local links (`taskExecutionLinkOf` in `splitTaskExecutions`, "keep every on-disk entry it did not load") | No local list is stored | D-3 | `task-execution-tree-split.ts:202-215` |
| Reading local links and full records from raw lists (`isTaskExecutionLinkEntry`, `parseTaskExecutionLink` in `composeTaskExecutions`, `listTaskAgentRunIds` over raw lists) | The source supplies the runs | D-1, D-2 | `task-execution-tree-split.ts:70-85, 117-146`. Dead after the change: nothing else reads a local raw entry (confirm with a search and the unused-export check) |
| `run-history/store/task-agent-link-check.ts` and its tests | No link to check | `coordinating-run-presence.ts` (D-6) | Two callers (A-4) |
| The endpoint-set loop in the two package validators (`team-run-state-package-validator.ts:36-41`, `agent-org-state-package-validator.ts:28-33`) | The view keeps own-log messages with closed runs | The remaining "one agent of this run" check | D-5 |
| `refuseCopyOutsideTree` (`root-task-execution-lifecycle.ts:231-237`) | A closed copy outside the tree is the normal case | `TaskExecutionTreeMembership.closedExecutionFor` and the add | Its refusals stay |
| Tests that assert links in tree files | Behavior changed | Tests of AC-001, AC-009 | `DESIGN.md` rule 11 |

## Return Or Event Spine(s)

- **DS-R1:** `lifecycle publishes "task_executions_reopened" after the commit (as today) -> root event stream -> web context: reference known -> remove it from the closed list (today); unknown -> reload the view (agent run and Org: "checkpoint required"; Team: stream recovery)`.

"Closed" is published before the run is dropped and names a run the loaded tree holds, so a client always knows it. No new event exists.

## Bounded Local / Internal Spines

- Parent owner: `RootTaskExecutionLifecycle`. Step "release": `re-check closed -> publish closed -> cancel -> release -> [new] drop the stopped ones`. Step "reopen": `[new] add when not in the tree -> settle previous stop and check the conversation -> commit -> [new] on a failed commit after an add: drop`. Both run at the queue head; a wake, an idle shutdown, a Stop or the other step never interleaves.
- Parent owner: a root's persistence coordinator. Drop and add go through the existing `commitTreeMutation` so they are ordered with saves. The save finds every own file and the tree file unchanged and writes nothing.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| The source's process binding | DS-001 | Tree stores | Hand the stores the loaded Task side; reject a read before it is bound | Stores are constructed with defaults in many places | Every caller would pass the list |
| A record from an own file | DS-001, DS-004 | Tree stores | `taskExecutionLinkOfOwnFile` + the existing compose functions | One mapping for load and add | Adapters would parse files |
| View message rule | DS-003, DS-005 | Message stores, loaded roots | `isMessageOfView` | Stored and loaded views agree | Two rules |
| Agents of closed runs | DS-005, DS-007 | Reader, token summary | Run IDs and addresses from own files | Names and totals without the tree | Each reader would walk files |

## Ownership Boundaries

- Run storage ↔ Projects: through `OpenDelegatedRunSource`, an interface owned by run storage and implemented by the Task side; bound once at composition.
- Collaboration runtime ↔ Projects: through `TaskExecutionResourcePort`, as today.
- Lifecycle ↔ root: through `RootTaskExecutionAdapter`.
- Readers ↔ closed runs: through `ClosedDelegatedRunReader` or the memory sources.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Tree store `read` / `readSync` / write | Tree file, the source, own files, compose and split | Every reader of a stored tree (B-3) | A caller composing a tree itself, or asking the source and the store separately | — |
| `TaskExecutionResourcePort` and `OpenDelegatedRunSource` | Task records and their indexes | Lifecycle; stores; `ClosedDelegatedRunReader` | Reading `agent_run_resources.json` outside Projects | The two new answers |
| `RootTaskExecutionAdapter` | Loaded tree, index, registries | Lifecycle, `TaskExecutionTreeMembership` | The lifecycle calling a mutator or store | The two new methods |

## Dependency Rules

- `run-history/store` defines `OpenDelegatedRunSource` and depends on nothing in `projects/`. `projects/services` implements it. `compositions/` binds it.
- `agent-collaboration/execution/task/*` depends on the adapter and port interfaces only.
- `ClosedDelegatedRunReader` depends on the port and `TaskAgentOwnFiles`; GraphQL and token usage depend on it.
- Forbidden: a second place that decides which runs are in a tree; a stored list of local runs anywhere; the web deriving a name from a run ID.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `OpenDelegatedRunSource.openDelegatedRunsOf(coordinatingRun)` (new) | A top run's local delegated runs with an open Task | The runs whose current Task entry names this top run, is open and is not `starting`. Synchronous; from memory | `{ kind: "agent" \| "agent_team" \| "agent_org", runId }` | Throws a clear error when the Task records are not loaded (B-5 places every caller; the two early readers use `readOwnParts`). An unreadable record contributes none and is reported once by the Task side |
| `TaskExecutionResourcePort.closedTaskExecutionOf(hostRoot, by)` (new) | A closed run of a top run | `{ execution, ingressAgentRunId }` or `null`; synchronous; never throws | `by`: `{ ingressAgentRunId }` or a `TaskExecutionReference` | From the existing closed index |
| `RootTaskExecutionAdapter.dropTaskExecutions(references)` (new) | The loaded tree | Drops released authority and registration, removes the records, trims the loaded message list | `TaskExecutionReference[]` | Memory only |
| `RootTaskExecutionAdapter.addTaskExecution(reference)` (new) | The loaded tree | Composes the record from the run's own file and adds it to the root list | `TaskExecutionReference` | Rejects `TASK_EXECUTION_CONTEXT_UNAVAILABLE` when the own file is missing, unreadable or names another coordinating run |
| Team and Org store `readOwnParts(dir, rootRunId)` (new, two) | A root run's own parts | The validated-shape tree of the run's own parts, with empty lists of delegated runs; reads the tree file only | Directory, root run ID | Never calls the source; logs nothing about delegated runs |
| Store `readTaskExecution(dir, rootRunId, reference)` (new, three) | A run's own file | The composed record for an add | Directory, root run ID, reference | Uses the same compose function as a read |
| `RootTaskExecutionLifecycle.knowsRunId(agentRunId)` (new) | Run-ID admission | True for an agent in the tree or the ingress of a closed run of this top run | Agent run ID | The three delivery guards |
| GraphQL `collaborationParticipantMessages` | A participant's messages | Adds `pastParticipants: [{ agentRunId, address }]` | Unchanged arguments | DTO in `autobyteus-collaboration-stream-contracts` |
| `ClosedDelegatedRunReader.forAgentRunIds(root, ids)`, `.agentRunIds(root)` (new) | Agents of a top run's closed delegated runs | Addresses for given agent run IDs; all agent run IDs | Root identity; agent run IDs | A run whose own file cannot be read is left out with one warning naming it |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `openDelegatedRunsOf` | Yes | Yes (kind and run ID) | Low | — |
| `closedTaskExecutionOf` | Yes | Yes | Low | — |
| `dropTaskExecutions`, `addTaskExecution`, `knowsRunId` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| The source | `OpenDelegatedRunSource` | Yes | "Delegated run" is the glossary's word | Low | — |
| The policy | `TaskExecutionTreeMembership` | Yes | "Task execution" is the code's existing word for a delegated run in a tree | Low | — |
| Team-tab agents of closed runs | `pastParticipants`, identity kind `past` | Yes | New, defined in `agent_communication.md` | Low | — |
| The memory rule | `CoordinatingRunPresence` | Yes | "Detached" keeps its meaning | Low | — |
| "Link" | Runs on another node only | Yes | After the §1 edit | Medium until the docs are edited | Edit §1, CM-8, §3 in the same change |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Composing and saving trees | `run-history/store` | Extend | It owns both functions for three kinds | — |
| "Runs of a top run" | The Task side's per-run current entry and per-root index | Extend | An open index beside the closed one | — |
| Step ordering | The lifecycle's queue; the coordinator's `commitTreeMutation` | Reuse | Existing steps and lock | — |
| Client refresh | The contexts' reload paths | Reuse | Used for "started" today | — |
| Tree-membership policy | — | Create New (`TaskExecutionTreeMembership`) | — | The lifecycle file is over 500 lines; one concern |
| Agents of closed runs | — | Create New (`ClosedDelegatedRunReader`) | — | Two consumers; no reader of own files by top run exists |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/store` | Compose, save, source interface, view rule, presence | DS-001, DS-002, DS-005, DS-006 | Stores | Extend | — |
| `projects/services`, `compositions` | The source and the port answer; the binding | DS-001, DS-004 | Task side | Extend | — |
| `agent-collaboration/execution/task` | Policy and step order | DS-003, DS-004 | Lifecycle | Extend | — |
| The three root areas | Loaded-tree mechanics, guard | DS-003, DS-004 | Roots | Extend | — |
| `run-history/services` | `ClosedDelegatedRunReader` | DS-005, DS-007 | Readers | Extend | — |
| `api/graphql`, stream contracts, `autobyteus-web` | The Team tab | DS-005, DS-R1 | Reader, web contexts | Extend | — |

## Draft File Responsibility Mapping

Superseded by the final mapping; the draft differed only in having a separate file for "a record from an own file", which is one function beside the existing mapping in `task-agent-own-records.ts`.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Compose for three shapes | `run-history/store/task-execution-tree-split.ts` (existing) | `run-history/store` | One rule | Yes | Yes (the stored link is gone) | A place for Task rules |
| The view message rule | `run-history/store/task-agent-message-logs.ts` (`isMessageOfView`) | `run-history/store` | Stored and loaded views | Yes | Yes | — |
| Unknown "reopened" → reload (three web contexts) | Each context's own reload path | `autobyteus-web` | The recoveries differ per context | N/A | N/A | A shared helper hiding three recoveries |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Tree file list | Yes: links to runs on another node | Yes: the local link is gone | Low | — |
| Task record entry | Yes (unchanged) | N/A | Low | None in this ticket (see "Relationship to autobyteus-461") |
| `pastParticipants` entry `{ agentRunId, address }` | Yes | Yes (the web derives the label from the address) | Low | — |

## Final File Responsibility Mapping

Server paths are under `autobyteus-server-ts/src/`.

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `run-history/store/open-delegated-run-source.ts` (Add) | Run storage | Source interface | `OpenDelegatedRunSource`; `bindOpenDelegatedRunSource`, `getOpenDelegatedRunSource` (throws when unbound) | One interface and its binding | — |
| `run-history/store/task-execution-tree-split.ts` (Modify) | Run storage | Compose and split | D-2, D-3: compose takes the open runs; raw lists give only entries with `nodeId`; split writes own files and remote links | The existing home | Own records |
| `run-history/store/task-agent-own-records.ts` (Modify) | Run storage | Mapping | `taskExecutionLinkOfOwnFile`; remove `taskExecutionLinkOf`, `isTaskExecutionLinkEntry` when unused | The mapping's home | — |
| `run-history/store/coordinating-tree-shapes.ts`, `remote-task-execution-links.ts` (Modify) | Run storage | Shapes | Raw lists are read and written for remote links only | — | — |
| `standalone-agent-run-root/persistence/standalone-root-package-store.ts`, `run-history/store/team-run-execution-tree-store.ts`, `run-history/store/agent-org-run-execution-tree-store.ts` (Modify) | Stores | Tree file | Take the source (constructor option; default the binding, resolved at the first composed read, not at construction); pass the open runs to compose; `readTaskExecution`; the Team and Org stores also `readOwnParts` | Each store's file | Compose |
| `run-history/services/root-run-package-current-validator.ts` (Modify) | Run storage | Package admission | `inspectTeam` and `inspectOrg` call `readOwnParts` | One call each | — |
| `run-history/maintenance/collaboration-run-history-index-repair.ts` (Modify) | Run storage | Maintenance | Reads own parts for the rows it projects (U-009) | One call each | — |
| `projects/services/task-execution-resource-service.ts` (Modify) | Projects | Task side | Open index per top run beside the closed one; `openDelegatedRunsOf`; `closedTaskExecutionOf` | Owner of the records | — |
| `agent-collaboration/execution/task/task-execution-resource-port.ts` (Modify) | Task lifecycle | Port | `closedTaskExecutionOf` | Interface | — |
| `compositions/project-task-execution-resource-composition.ts` (Modify) | Composition | Binding | Bind the source after `load()`; unbind on release | The one binding place | — |
| `agent-collaboration/execution/task/task-execution-tree-membership.ts` (Add) | Task lifecycle | `TaskExecutionTreeMembership` | `dropStopped(results)`, `closedExecutionFor(by)`, `addAtHead(execution)` with undo | The policy | Port, adapter |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (Modify) | Task lifecycle | Lifecycle | Calls the policy in "release" and "reopen"; `knowsRunId`; `teamCoordinatorOf` also answers for a closed Team; removes `refuseCopyOutsideTree` | Step order | — |
| `agent-collaboration/execution/task/root-task-execution-adapter.ts` (Modify) | Task lifecycle | Adapter interface | `dropTaskExecutions`, `addTaskExecution` | Interface | — |
| `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts`, `agent-team-execution/task-delegation/team-task-execution-adapter.ts`, `agent-org-execution/services/agent-org-task-execution-adapter.ts` (Modify) | Roots | Adapter | The two methods, through the existing `commitTreeMutation`; trim the loaded message list with `isMessageOfView`; drop what the root keeps per agent of the run | Root mechanics | — |
| `standalone-agent-run-root/services/standalone-root-tree-mutator.ts`, `agent-team-execution/services/team-run-execution-tree-mutator.ts`, `agent-org-execution/services/agent-org-run-execution-tree-mutator.ts` (Modify) | Roots | Tree | `remove…TaskExecutions(tree, runIds)`; add uses the existing `add…TaskExecution` | Tree edits | — |
| `standalone-agent-run-root/services/standalone-root-message-delivery.ts`, `agent-team-execution/services/team-run-message-delivery.ts`, `agent-org-execution/services/agent-org-run-message-delivery.ts` (Modify) | Roots | Delivery | The `TARGET_AGENT_RUN_NOT_FOUND` guard asks `knowsRunId`; the receiver is resolved after the reactivation | Guard | — |
| `run-history/store/task-agent-message-logs.ts` (Modify) | Run storage | View rule | `isMessageOfView(message, ownAgents, treeAgents, fromOwnLog)`; `composeMessageLogs` applies it | One rule | — |
| `services/team-communication/team-communication-store.ts`, `agent-org-execution/persistence/agent-org-communication-messages-store.ts`, the standalone store's `readMessages` (Modify) | Message stores | Stored view | Pass the own agents to `composeMessageLogs` | — | View rule |
| `run-history/services/team-run-state-package-validator.ts`, `agent-org-execution/services/agent-org-state-package-validator.ts` (Modify) | Validators | Package validation | Drop the endpoint-set loop | — | — |
| `run-history/services/closed-delegated-run-reader.ts` (Add) | Run storage | Readers | D-5, D-7 | One read model | Port, own files |
| `api/graphql/types/collaboration-participant-messages.ts` (Modify) | API | Reader | Counterpart in the tree or a past participant; returns `pastParticipants` | The reader | Closed-run reader |
| `api/rest/agent-collaboration-references.ts`, `agent-org-execution/services/agent-org-reference-content-service.ts`, `services/team-communication/team-communication-projection-service.ts` (Modify if they filter by tree agents; U-006) | API | Attachment content | Same admission as the reader | — | — |
| `api/graphql/types/token-usage-stats.ts` (Modify) | Token usage | Standalone total | Tree agents plus `ClosedDelegatedRunReader.agentRunIds(root)` | Wiring | — |
| `run-history/store/coordinating-run-presence.ts` (Add); `run-history/store/task-agent-link-check.ts` (Remove) | Run storage | Memory listing | Whether a coordinating run's own file exists (agent: `run_metadata.json`; Team, Org: its tree file) | One question | Layout |
| `agent-memory/services/agent-memory-explorer-service.ts`, `agent-memory/services/task-team-root-memory-source.ts` (Modify) | Memory | Listing | Use `CoordinatingRunPresence` | — | — |
| `autobyteus-collaboration-stream-contracts/src/` (the file that defines `collaborationParticipantMessagesDtoSchema`) (Modify) | Contracts | DTO | `pastParticipants` (required array) | Contract | — |
| `autobyteus-web/services/collaborationMessages/collaborationParticipantMessages.ts`, `types/workspace/collaborationMessagesContextView.ts` (Modify) | Web | Participant messages | Keep `pastParticipants`; identity kind `past` (`address`, `label`) | — | — |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts`, `services/agentOrgExecution/agentOrgExecutionContext.ts`, `services/teamExecution/teamExecutionViewState.ts`, `services/teamExecution/teamCollaborationMessagesView.ts` (Modify) | Web | Contexts | `identityOf` falls back to a past participant; an unknown "reopened" reference reloads the view | — | — |
| `docs/design/collaboration_model.md`, `docs/modules/standalone_agent_run_root.md`, `agent_team_execution.md`, `agent_orgs.md`, `agent_communication.md`, `projects.md`, `agent_memory.md` (Modify) | Docs | — | §1 words; CM-6 exception (runs without a Task are in no tree); CM-8 ("a coordinating run stores nothing of a local delegated run; its tree is built from the Task records"); §3 layout text; §5 row; each module's mechanics | — | — |

The three managers need no change: they load through their store.

## Applied Patterns (If Any)

Dependency inversion for the source (an interface owned by run storage, implemented by Projects). No other pattern is new.

## Target Subsystem / Folder / File Mapping

Paths are in the table above; no folder is added.

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `run-history/store/` | Folder | Stores | Compose, save, the source interface | It owns the three shapes | Task rules |
| `agent-collaboration/execution/task/` | Folder | Lifecycle | Tree-membership policy | Root-neutral Task policy lives here | Tree or file code |
| `run-history/services/` | Folder | Readers | `ClosedDelegatedRunReader` | Readers over stored runs | Writes |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `run-history/store/` | Persistence-Provider | Yes | Low | — |
| `agent-collaboration/execution/task/` | Main-Line Domain-Control | Yes | Low | — |
| `run-history/services/` | Off-Spine Concern | Yes | Low | — |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| A standalone run's file after delegating to a local Team and to a Team on another node | `{ "subjectKind":"agent", "createdAt":"…", "host":{…}, "taskExecutions":[ { "address":"/remote_team", "teamRunId":"R1", "nodeId":"N", "coordinatorAddress":"…", "members":[…], "delegatorAgentRunId":"manager", "startedAt":"…" } ] }` | Any entry without `nodeId` | No local list is stored |
| Where the local Team is found | Task record: `{ "role":"assigned", "assignedBy":"manager", "hostRoot":{"kind":"agent","runId":"manager"}, "agentRun":{"kind":"team","teamRunId":"T2","coordinatorAgentRunId":"…"}, "start":"started", "closedAt":null }` → own file `agent_teams/T2/team_run_execution_tree.json` (`taskAgent.address`, `taskAgent.delegatorAgentRunId`, `createdAt`, members) → record | A copy of these fields in the top run | One source per fact |
| Composition | `store.read(dir, id)` → file's own parts and remote links + `source.openDelegatedRunsOf({kind, runId})` + own files | A caller asking the Task side and merging lists itself | One place composes |
| A closure | Memory: the record leaves the loaded tree. Disk: only the Task record's `closedAt` changes | Writing the top run's file | REQ-001 |
| Asking instead of inferring | `membership.closedExecutionFor({ ingressAgentRunId })` → execution or `null`; `null` → "not in this run" | Treating every unknown run ID as a closed run | Principle 13 |
| The view rule | Both agents in the tree; or the message is from the top run's own log and one agent is one of its own agents | Keeping every message of every log | Bounded memory; the Team tab unchanged |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep reading local links for runs that have no Task record | The 14 old runs | Rejected (DEC-008, the user) | They are in no tree; the Memory page keeps them |
| Keep the stored list as a fallback when a Task record cannot be read | Availability | Rejected (DEC-010) | The run is absent and reported until the record is readable |
| A startup migration that strips local links | The Task's text; tidy files | Rejected (DEC-005) | Ignored on read, dropped on the next save |
| Trim the stored list at closure and at load (SR-003) | Smaller change of source | Rejected (DEC-009, the user) | No stored list |
| Write local links as well, for an older build | Rollback | Rejected (`DESIGN.md` rule 9; Guideline "Rolling back") | Release notes state it |

## Derived Layering (If Useful)

`Task records (authority) → source → tree store (compose) → root (loaded tree, indexes) → lifecycle and views`. Readers of closed runs sit beside the roots and use the port and own files.

## Relationship to autobyteus-461

This ticket keeps the Task record's shape and looks runs up by `hostRoot`. The 461 contract, revision 2, removes `hostRoot` as redundant with the run's own `delegatedFrom`. That was decided when the tree list was the index. With the Task record as the only index, an entry must keep naming the run it is found under. When 461 resumes it revises that part of its contract: the field then names the delegating run instead of the top run (a stored rename with a migration there). Nothing in this ticket depends on which.

## Change / Refactor Sequence

1. Task side: the open index, `openDelegatedRunsOf`, `closedTaskExecutionOf`; the source interface and its binding. Verify U-008 here.
2. Store side: compose from the source; split without local links; `taskExecutionLinkOfOwnFile`; `readTaskExecution`; `readOwnParts`, with the validator and the maintenance repair switched to it in the same step (a start on data with Team and Org runs must admit them at every commit of this sequence). Tests on hand-built data for every shape of the two inventories. Remove the dead link code.
3. Roots: mutators and adapters (`dropTaskExecutions`, `addTaskExecution`) for the three kinds.
4. Lifecycle: `TaskExecutionTreeMembership`; the "release" and "reopen" steps; `knowsRunId`; the three delivery guards. Remove `refuseCopyOutsideTree`.
5. View rule: `isMessageOfView`, the three message stores, the two validators, the loaded roots' trim.
6. Readers: `ClosedDelegatedRunReader`; the participant messages reader and DTO; attachment readers (U-006); the standalone token total; `CoordinatingRunPresence`, removal of `TaskAgentLinkChecker`.
7. Web: identity fallback, the participant store, unknown "reopened" → reload.
8. Documents.

After step 2 a tree no longer holds closed runs, so steps 3 to 7 must ship in the same change: otherwise a reopened run could not continue and the Team tab, the Memory page and the token total would lose closed runs.

## Key Tradeoffs

- **A composed tree needs the Task records loaded.** Today a tree reads without the Task side and the filter is applied on top. The dependency is real in the domain (the Task owns its runs) and is made explicit: one interface, one binding, a clear error when unbound. The two readers that run without the Task records, startup admission and the maintenance repair, do not compose: they read the run's own parts (D-11). So no startup step is reordered, and startup reads less than today.
- **Admission no longer sees delegated runs.** A package is admitted on its own parts; a problem in a delegated run's record shows when the tree is composed, for that run alone.
- **A damaged Task record hides its runs** until it is readable (DEC-010), where today the tree would still show them.
- **The 14 runs without a Task record leave the tree** (DEC-008).
- **Names from own files:** the Team tab reads one small file per closed run named in the shown messages, when the tab is shown.
- **The closed-run filter stays** for the short time a loaded root holds a closed run whose stop is not confirmed.
- **The standalone tree file stays** as a small file; removing it would touch the package marker and the remote links for no visible gain.

## Risks

| Risk | Mitigation |
| --- | --- |
| A composed read is reached before the Task records are loaded | B-5 places every construction site; the two early readers use `readOwnParts`; the source throws instead of answering "none"; AC-008 starts a server on data with Team and Org runs |
| A run with an open Task is missing from a tree | The candidate rule is one function with tests per entry state (U-008); AC-005 |
| The loaded tree and a fresh compose disagree | Both follow the same Task entry: drop only after the Task side says closed; add inside the step that commits the reopen; undo on failure |
| An added-back run cannot be restored | The add builds the record with the same compose function as a load; `assertRestorableChain` runs after it as today |
| A reader of closed runs through the tree was missed | Change Scope table; escalation trigger; AC-006, AC-007, AC-011, AC-012 on an isolated instance |
| Team and Org mechanics differ from the standalone path read in detail | U-005; server tests per kind in AC-001 … AC-003, AC-008, AC-009 |

## Guidance For Implementation

- Reproduction to start from: `None` (a behavior change). First failing test: AC-009's read on a hand-built standalone tree with links of closed, open and no-Task runs.
- Do not add lines to files already over 500 lines beyond the calls named above (FU-002); new logic goes in the new files.
- The candidate rule of `openDelegatedRunsOf`: the run's current entry (the service's existing rule) names this top run, has `closedAt` null and `start` not `starting`. A missing own file is silent for a `failed` entry and a warning for a `started` one.
- Every local record goes to the root list, also in an Org tree (the 2 older Org links in a configured Team's list belong to runs without a Task record).
- Drop and add write no file; assert it in tests, and assert byte-identity of own files.
- Skip the drop in a release that runs while the root no longer admits commands; a later load composes without the run.
- Fixtures are small and hand-built per shape of the two inventories; never copy user data and never run a load on it (`TESTING.md`).
- The release notes of the release that carries this change say that an older build cannot be used on the same data afterwards.
- Verify U-003, U-005, U-006, U-008 and U-009 early; report a false one as a Design Impact.
- A store resolves the source binding at its first composed read, never in its constructor: the validator and the maintenance script construct stores without a binding.
- Add a server-start test on hand-built data with a Team run and an Org run whose trees list local runs: both are admitted before any Task record is read.
