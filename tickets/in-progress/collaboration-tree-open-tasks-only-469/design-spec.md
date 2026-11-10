# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline / revision, who approved, and approval reference: `SR-003`. DEC-001 by the user (2026-11-10, quoted in `requirements-doc.md`); the rest by the Solution Designer within the direction of Task `autobyteus-469`, the user informed.
- Behavior-defining supplements and their approval references: none
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/collaboration-tree-open-tasks-only-469/investigation-notes.md` (section "Architecture Investigation", A-1 … A-8)
- Authorities read (design reading gate; file and date): the skill's `references/architecture-design.md`, `references/design-principles.md`, `templates/design-spec-template.md`; the project's `DESIGN.md`; `autobyteus-server-ts/docs/design/collaboration_model.md`; `autobyteus-server-ts/docs/design/data_migration_guideline.md` (all 2026-11-10)
- Project design-principle conflicts with the general principles, or discrepancies (for the user, with your reasoning and recommendation): none. The Task's text names a startup migration; the Data Migration Guideline (section 2 item 1) asks for none here (DEC-005).

## Current-State Read

A top run (standalone agent run, Team run, Org run) keeps, in its tree file, one link per delegated run. Each run's facts are in its own file; a load composes the tree by reading the own file of every listed run (notes A-1). Links are only ever added.

"Closed" is not stored in the tree. The Task side is the only authority: a run is closed when it has no open Task entry, and the Task side keeps an in-memory index of closed runs per host root (A-2). DONE or CANCELLED asks the active host root to release the closed runs in one queue step; a root that is not loaded is skipped. Every reader hides closed runs by asking the Task side at read time.

So the design problem is not a wrong shape. It is a missing lifecycle step: the link's end. The owners are right (the Task side for "closed", the root for its tree and its queue, the store for the files) and stay.

Constraints the target respects: a save never removes an on-disk entry the root did not load (A-1); the release is fire-and-forget from the Task side and can be unconfirmed (A-2); only `assigned` entries can come back (A-3); a link to a run on another node cannot be rebuilt on this node (A-1).

## Task Size And Architectural Risk (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Size rationale and supporting evidence (file/component scope, affected surfaces, or other concrete basis): one rule applied in three root kinds (store, persistence coordinator, tree mutator, task adapter, manager load, run-ID delivery guard for each), the shared lifecycle, the Task-side port and service, the message view rule and two validators, one GraphQL reader with its shared DTO, the Memory listing rule, the standalone token total, three web contexts, and six documents. About 35 source files (Final File Responsibility Mapping).
- Architectural risk (`Low`/`High`): `High`
- Risk rationale and supporting evidence: persistence (links are deleted from tree files and re-created), concurrency (two new steps inside the root's command queue and persistence lock), a changed shared contract (`collaborationParticipantMessagesDtoSchema`), a changed port between collaboration and Projects, and blast radius over every run that delegates.
- Escalation trigger if implementation or validation discovers new impact: any reader of "the agents of a tree" not listed in Change Scope whose result changes for a closed run; any need for a stored field or a second list; any of U-003 … U-006 turning out false.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | Notes A-1 | Links, own files, shared compose and split, "a save never removes" | D-2, D-3, D-4 | None |
| Code read | Notes A-2 | Closure is asked of the Task side; release is one queue step | D-1, D-3 | None |
| Code read | Notes A-3 | Reactivation and follow-up Task resolve through the root's index; only `assigned` entries return; no nested run outlives its delegating run | D-4; no parent-child rule needed | None |
| Code read | Notes A-4 | What each surface shows of a closed run | D-5 … D-8, DEC-006, DEC-007 | U-006 |
| Code read | Notes A-5 | View compose rule and validators | D-5 | U-003 |
| Code read | Notes A-6 | Web event handling | D-8 | None |
| `python3 -I evidence/measure_unlink_cases.py ~/.autobyteus/server-data` | `evidence/unlink-cases-2026-11-10.txt` | 195 local links, 170 closed; 2 remote; 0 nested-open-under-closed; 2 older Org links | D-1, D-9, fixtures for AC-009 | None |
| `python3 -I evidence/measure_team_tab_messages.py ~/.autobyteus/server-data` | `evidence/team-tab-messages-2026-11-10.txt` | The manager's own log holds every message its Team tab shows | D-5 | None |
| Document read | Notes A-8 | Migration conventions and predecessors | Persisted Data decision | None |

## Intended Change

Give a local link an end. The root removes the link of a delegated run when the Task side says the run is closed and the run is stopped: at the closure, and when the root is loaded. The root puts the link back, from the run's own file, when the run's assigner continues it or gives it another Task. Readers that showed something of a closed run through the tree get their own source: the run's own file and the Task side.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-006. Areas: `agent-collaboration/execution/task` (link lifetime policy, port), `projects/services` (port answer), `run-history/store` (link edits, view rule, presence check), the three roots' store, coordinator, mutator, adapter, manager and delivery, `api/graphql/types/collaboration-participant-messages.ts`, `token-usage`, `agent-memory`, `autobyteus-collaboration-stream-contracts`, three web contexts and the participant-messages store, documents.
- Derived consumers, when a stored or shared structure changes (the tree's link list loses closed runs):

| Consumer built from the tree | Decision |
| --- | --- |
| Composed tree at load (`composeTreeFile`) | Reads fewer own files; no change |
| Execution indexes of the three roots | Built from the tree; no change |
| Closed-run filter (`listClosedTaskExecutions`, the three view projectors, GraphQL history `closed_task_executions`, web `collectClosedSubtrees`) | Stays. It covers the time between a closure and the stop, stored trees of roots not loaded since, and runs on another node |
| Stored message view (`composeMessageLogs`, `agentRunIdsOfTree`) | Changes: D-5 |
| Team and Org package validators | Change: D-5 |
| Participant messages reader and `isPublicMessage` | Changes: D-5 |
| Message reference content readers (three) | Use the reader's rule: D-5, U-006 |
| Memory page and memory search (`TaskAgentLinkChecker`) | Changes: D-6 |
| Standalone token total (`listChildAgentRunIds`) | Changes: D-7 |
| Team and Org token totals | By the root on each usage row; no change |
| Token usage display fields at capture | The run is live and linked when it reports usage; no change |
| Run last activity | Counts the listed runs (DEC-007); no code change |
| Context file owner lookup, process supervisor | Used for a run that is open; no change |
| Delegated launch selections, restart resume, busy-run record | Act on listed, not closed runs; no change |
| Run ID delivery guard, `teamCoordinatorOf` | Change: D-4 |
| Web event handlers for "reopened" | Change: D-8 |
- Deliberately left alone: links to runs on another node (DEC-003); the closed-run filter; hosting; the stored shapes; the Task record; the web tree and Task page; phone apps beyond what the web bundle brings.
- Follow-ups: FU-001, FU-002 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Preserved | `delegate_task` | A link is added at the activation commit (A-1) | Unchanged | Existing |
| BEH-002 | Contract | REQ-001, REQ-003, REQ-006, REQ-007 / AC-001, AC-004, AC-005, AC-009 | Task set to DONE or CANCELLED; a root is loaded | Stop and hide; links stay (A-2) | The link is removed once the run is stopped, or at the root's next load | DS-001, DS-002 |
| BEH-003 | Operational | REQ-004 / AC-010 | A root is loaded | Reads every listed run's own file and log (A-1, A-5) | Reads none of a run whose link was removed | DS-002 |
| BEH-004 | Contract | REQ-002 / AC-002, AC-003 | `send_message_to` by run ID after a reopen; `delegate_task` with a run ID | Resolved through the root's index (A-3) | Same outcome; the link returns | DS-003, DS-004, DS-R1 |
| BEH-005 | User | REQ-004 / AC-011 | The Team tab is shown | Messages whose two agents are in the tree (A-4) | The same rows and names | DS-005 |
| BEH-006 | User | REQ-004 / AC-012 | The Memory page or a memory search | Listed while linked (A-4) | Listed while its coordinating run exists | DS-006 |
| BEH-007 | User | REQ-005 / AC-006, AC-007, AC-008 | Token total, attachment, load of a Team or Org run | Through the tree (A-4, A-5) | Unchanged results | DS-005, DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/unlink-cases-2026-11-10.txt` (+ script) | Every link case, counted | AC-005, AC-009 | The shape inventory for the fixtures | Evidence |
| `evidence/team-tab-messages-2026-11-10.txt` (+ script) | What the Team tab is made of | AC-011 | Basis of D-5 | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (with a performance outcome)
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - **Derived data** (Principle 11): the link list feeds views, sets, validators and readers (Change Scope table).
  - **Several kinds** (Principle 1): three root kinds and two run kinds (Agent, Team); each has its row in the file mapping.
  - **Repeated coordination** (Principle 13): the same unlink and relink steps in three roots; the policy gets one owner (D-3, D-4) and each root supplies only its tree mechanics.
  - **Behavior by absence** (Principle 13): today "not in the index" means "unknown run". After this change it would also mean "closed and unlinked", so the lifecycle asks the Task side explicitly (D-4) instead of inferring from a failed lookup.
  - **Persisted-data transition** (Principle 5): decided below, no migration.
  - **Vocabulary** (Principle 15): "link", "unlinked", "relink" (Terminology).
- Root cause classification: `Missing Invariant` (a link's lifetime had no end; the right owners exist)
- Refactor needed now: `No`
- Evidence: notes A-1 … A-3: one authority for "closed", one queue per root, shared store functions.
- Design response: add the two lifecycle steps to the existing owners; move each reader that depended on closed links to its real source.
- Refactor rationale: ownership and boundaries are healthy for this scope. The larger change (delegated runs not hosted) is `autobyteus-461`, which builds on this rule.
- Intentional deferrals and residual risk: links to runs on another node keep growing (FU-001, 2 of 197 today). Four touched files are over 500 lines already (FU-002); this design adds its logic in new files.

## Terminology

Added to `collaboration_model.md` §1 in this change (the authority for collaboration words; `GLOSSARY.md` points to it).

- **Link** (extended): what a coordinating run keeps of a delegated run. For a local run: the entry in the coordinating run's tree. For a run on another node: as defined today.
- **Unlinked**: a local delegated run whose link was removed because it has no open Task. Its own folder, memory, message log and Task record are unchanged.
- **Relink**: putting an unlinked run's link back from its own file, when its assigner continues it or gives it another Task.
- "Detached" keeps its meaning: a delegated run whose coordinating run was deleted.
- The code keeps its existing name for a delegated run in a tree, "task execution". "Dismissed", used in earlier ticket text, is not used in code or docs.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: `TaskAgentLinkChecker` (replaced, D-6); the validators' endpoint-set loop (D-5).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. The closed-run filter is not a legacy path: it is the current rule for a closed run that is still linked (between closure and stop, in a root not loaded since, on another node).

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: the link lists of `collaboration_tree.json` (standalone), `team_run_execution_tree.json` and `agent_org_run_execution_tree.json`. On the user's machine 26 trees with 195 local links, 170 of closed Tasks; the largest tree 39,840 bytes.
- Relevant code-model, serialization, semantic, or physical-store change: none of shape. The list's content rule changes from "every delegated run ever" to "delegated runs with an open Task, or not yet unlinked".
- Normal reader/writer behavior and representative evidence: the current reader composes any link list; the current filter hides closed runs. Both keep working on existing files (A-1, A-2).
- Required semantics and invariants under direct use: a closed link is harmless (hidden, never woken). The invariant "no closed, stopped run stays linked in a loaded root" is established by the ordinary unlink step.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: a removed link is rebuilt from the run's own file (A-1).
- Decision: `Directly Usable — No Migration`
- Decision rationale: existing data needs no transformation for correctness. The unlink step at load (DS-002) is required for a supported scenario of its own (a Task closed while its root was not loaded) and removes today's closed links as a by-product, one small file write per run at its first load. A startup migration would add a frozen reader of Task records and trees, a pass over all history at startup, and a second owner for a rule the root already owns.
- Acceptance criteria or design constraints supported by this decision: AC-009, AC-010.

### Data Migration Guideline checklist (section 2)

1. **Need:** no migration; the shape is unchanged and the normal runtime handles existing files.
2. **Availability:** startup reads no tree. A root whose tree cannot be read fails to load alone, as today; nothing else waits for it.
3. **Source and target:** one shape (links, A-1). Inventory: `evidence/unlink-cases-2026-11-10.txt`; fixtures per case in AC-009 (closed, open, no Task, remote, older Org list, unreadable Task data).
4. **Disposition:** closed local link: removed. Open, no Task, remote: kept. Unreadable Task data: the Task side reports none of its runs as closed, so nothing is removed. Unreadable tree: untouched.
5. **Commit and retry:** one atomic tree-file replacement by the store's existing writer. An interrupted or failed write leaves the old file; the next load repeats the step. No backup, hash or journal.
6. **Current-only boundary:** no legacy interpretation exists; nothing is frozen.
7. **Cost:** per loaded root one in-memory lookup and at most one tree-file write, once. Later loads find nothing to remove and write nothing.
8. **References:** the Task record's `hostRoot` and run IDs point at the run, not at the link; they stay valid. Messages name agent run IDs; D-5 resolves them.
9. **Evidence:** AC-001 … AC-012. Unverified until implementation: U-003 … U-006.
10. **Lessons and review:** the lockout of `team-attachment-exact-execution` and the startup cost of `startup-performance` are avoided by not touching startup. Independent review: Architecture Reviewer (High risk).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002 | Task set to DONE or CANCELLED | Link gone from file and loaded tree | `RootTaskExecutionLifecycle` (its release step) | The link's end in a loaded root |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | A root is loaded | Tree read without closed links | The root kind's manager (its load) | Tasks closed while not loaded; existing data |
| DS-003 | Primary End-to-End | BEH-004 | `send_message_to` by run ID | Run continues; link back | `RootTaskExecutionLifecycle` (its reopen step) | Reopen plus the assigner's message |
| DS-004 | Primary End-to-End | BEH-004 | `delegate_task` with a run ID | Follow-up Task delivered; link back | `RootTaskExecutionLifecycle` (its reopen step) | Follow-up Task |
| DS-005 | Primary End-to-End | BEH-005, BEH-007 | Team tab shown | Rows with names; attachments open | The participant messages reader | The one visible surface |
| DS-006 | Primary End-to-End | BEH-006 | Memory page or memory search | Run listed | The memory sources | Listing rule |
| DS-007 | Primary End-to-End | BEH-007 | Token total requested | Same total | `StandaloneRunTokenUsageSummaryService` | Total over unlinked runs |
| DS-R1 | Return-Event | BEH-004 | Root publishes "reopened" | Web lists the run | The web context of the root kind | A client that never saw the link |

Each spine applies to the three root kinds; DS-005's reader and DS-006 are kind-neutral; DS-007 is standalone only (A-4).

## Primary Execution Spine(s)

- **DS-001:** `update_task (DONE) -> ProjectTaskService -> TaskExecutionResourceRelease -> active root.releaseTaskExecutions -> RootTaskExecutionLifecycle (queue step "release") -> RootTaskExecutionResourceScope.releaseHostedExecutions -> TaskExecutionLinkLifetime.unlinkStopped -> root adapter.unlinkTaskExecutions -> root persistence coordinator (lock) -> tree store.unlinkTaskExecutions (file) -> loaded tree replaced`
- **DS-002:** `first use of a run -> root manager.load -> TaskExecutionResourcePort.closedTaskExecutionsIn(root) -> tree store.unlinkTaskExecutions (file) -> tree store read (compose) -> root built`
- **DS-003:** `send_message_to(run ID) -> root message delivery (guard) -> RootTaskExecutionLifecycle.deliverToExactTarget -> TaskExecutionLinkLifetime.closedExecutionFor -> port.assertReopenable -> queue step "reopen": adapter.relinkTaskExecution -> settle previous stop -> port.reopenAssignment -> "reopened" published -> delivery wakes or restores the run`
- **DS-004:** `delegate_task(run ID, task) -> RootTaskExecutionLifecycle.assignToExistingCopy -> resolve in tree, else TaskExecutionLinkLifetime.closedExecutionFor -> port.assertAssignable -> queue step "reopen": adapter.relinkTaskExecution -> settle previous stop -> port.assignExistingTaskExecution -> "reopened" published -> work delivered`
- **DS-005:** `Team tab -> GraphQL collaborationParticipantMessages -> root records snapshot (tree + messages) -> UnlinkedParticipantReader -> DTO {messages, unlinkedParticipants} -> web participant rows`
- **DS-006:** `Memory page / search -> memory source reads the run's own file -> CoordinatingRunPresence.exists -> listed`
- **DS-007:** `usage panel -> getStandaloneRunTokenUsageSummary -> tree agents + UnlinkedParticipantReader.agentRunIds(root) -> TokenUsageRunStore`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The release step stops the closed runs as today. For each run it reports stopped that is still closed and in the tree, it then asks the adapter to unlink. The adapter drops the released authority, and its coordinator, under the persistence lock, removes the links from the file and then replaces the loaded tree. A failed write is logged and changes no release result; the link goes at the next load | Task, release step, link | Lifecycle | Store edit; message list trim |
| DS-002 | Before a manager reads a root's tree, it asks the Task side which runs of this root are closed and has the store remove those links from the file. Then it reads the tree as today, which now reads no own file of those runs | Root load, link | Manager | Store edit |
| DS-003 | The guard lets a run ID through when it is in the index or is the ingress of a closed run the Task side records for this root. The lifecycle finds the execution (index, else Task side), runs the Task side's advisory check, and in one queue step relinks it when it is not in the tree, then does today's resume preparation and reopen commit. If the commit fails after a relink, the same step unlinks again | Message, closed run, link | Lifecycle | Own-file read; "reopened" event |
| DS-004 | As DS-003 with the follow-up Task's check and commit | Follow-up Task, closed run, link | Lifecycle | Same |
| DS-005 | The reader returns a participant's messages whose counterpart is an agent of the tree, as today, or an agent of an unlinked run of this root; for those it returns the agent's address read from the run's own file | Message, participant | Reader | Own-file read; Task-side lookup |
| DS-006 | A delegated run found by its own file is listed when the coordinating run its file names still has a tree file | Run with memory | Memory source | File existence |
| DS-007 | The total covers the host, the tree's agents and the agents of this root's unlinked runs | Token total | Summary service | Own-file read for Teams |

## Spine Actors / Main-Line Nodes

`TaskExecutionResourceRelease`, `RootTaskExecutionLifecycle`, `RootTaskExecutionResourceScope`, `TaskExecutionLinkLifetime` (new), the root's task adapter, the root's persistence coordinator, the root's tree store, the root's manager, the root's message delivery, the participant messages reader, `UnlinkedParticipantReader` (new).

## Ownership Map

| Node | Owns |
| --- | --- |
| Task side (`TaskExecutionResourceService`) | Whether a run is closed; which closed runs a root hosts; a closed run's ingress |
| `RootTaskExecutionLifecycle` | The order of steps in the root's queue: release then unlink; relink then resume preparation then commit |
| `TaskExecutionLinkLifetime` (new, used only by the lifecycle) | The link-lifetime policy: which released runs are unlinked; which run ID names a closed run of this root; undoing a relink when the commit fails |
| Root task adapter (three) | Its tree, index and registries: removing and adding the execution |
| Root persistence coordinator (three) | The order of file write and in-memory replacement under the lock |
| Tree store (three) and `task-execution-link-edits.ts` | The file: removing links; composing one execution from its own file |
| Root manager (three) | Its load order: unlink, then read |
| Participant messages reader | Which messages a participant's Team tab gets |
| `UnlinkedParticipantReader` (new) | The agents (run ID and address) of a root's unlinked runs |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| The three stores' `unlinkTaskExecutions` | `task-execution-link-edits.ts` | Each store knows its file path, shape and writer | The rule which links go |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `run-history/store/task-agent-link-check.ts` (`TaskAgentLinkChecker`) and its tests | "Linked" no longer means "may be listed" | `coordinating-run-presence.ts` (D-6) | Two callers (A-4) |
| The endpoint-set loop in `team-run-state-package-validator.ts:36-41` and `agent-org-state-package-validator.ts:28-33`, with the `agentRunIdsOfTree` import when unused | The view keeps own-log messages with unlinked runs | The remaining "one agent of this run" check | D-5 |
| `refuseCopyOutsideTree` in `root-task-execution-lifecycle.ts:231-237` | A closed copy outside the tree is now a normal case | `TaskExecutionLinkLifetime.closedExecutionFor` + relink | Its refusals stay: `assertAssignable`'s, and `notACopyOfThisRun` when the Task side knows no such copy |
| Tests that assert a closed run's link stays in the tree file | Behavior changed | Tests of AC-001 | `DESIGN.md` rule 11 |

## Return Or Event Spine(s)

- **DS-R1:** `lifecycle publishes "task_executions_reopened" (after the commit, as today) -> root event stream -> web context: reference known -> remove from closed list (today); reference unknown -> reload the view (agent run and Org: "checkpoint required"; Team: stream recovery)`.

No "unlinked" event exists: the client already hid the run at "closed", and a stale hidden entry in a client's tree changes nothing it shows.

## Bounded Local / Internal Spines

- Parent owner: `RootTaskExecutionLifecycle`. Queue step "release": `re-check closed -> publish closed -> cancel -> release -> [new] unlink the stopped ones`. Queue step "reopen": `[new] relink when not in the tree -> settle previous stop and check the conversation -> commit -> [new] on a failed commit after a relink: unlink`. Both run at the queue head, so a wake, an idle shutdown, a Stop or the other step never interleaves.
- Parent owner: root persistence coordinator. `lock -> store.unlinkTaskExecutions (file) -> replace loaded tree -> unlock`. The file is edited first because a later save keeps every on-disk entry the loaded tree lacks (A-1).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Link edits on a raw tree | DS-001, DS-002 | Tree stores | Remove the local links with given run IDs from every list; never a link with `nodeId` | One rule for three shapes | Three copies drift |
| One execution from its own file | DS-003, DS-004 | Tree stores | Read the own file, check it names this coordinating run, build the record | The link is derived from the own file | The adapter would parse files |
| View message rule | DS-001, DS-005 | Message stores, loaded roots | Which messages a root's view holds | Stored and loaded views agree | Two rules |
| Agents of unlinked runs | DS-005, DS-007 | Reader, token summary | Run IDs and addresses from own files | Names and totals without the tree | Readers would each walk files |

## Ownership Boundaries

- Collaboration runtime ↔ Projects: only through `TaskExecutionResourcePort`. The runtime still stores no Task fact; it asks.
- Lifecycle ↔ root: only through `RootTaskExecutionAdapter`. The lifecycle never sees a tree file.
- Root ↔ files: only through its persistence coordinator and store.
- Readers (GraphQL, token usage, memory) ↔ unlinked runs: through `UnlinkedParticipantReader` or the memory sources; never through a root's internals.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RootTaskExecutionAdapter` | Tree, index, registries, coordinator, store | Lifecycle, `TaskExecutionLinkLifetime` | The lifecycle calling a store or mutator | Adding the two methods below |
| `TaskExecutionResourcePort` | Task records and indexes | Lifecycle, managers, `UnlinkedParticipantReader` | Reading `agent_run_resources.json` outside Projects | Adding `closedTaskExecutionOf` |
| Root manager | Load order | Everything that loads a root | A caller unlinking before `load` itself | — |

## Dependency Rules

- `agent-collaboration/execution/task/*` depends on the adapter and port interfaces only.
- The three roots depend on `run-history/store` for link edits; `run-history/store` depends on no root.
- `UnlinkedParticipantReader` depends on the port and on `TaskAgentOwnFiles`; GraphQL and token usage depend on it.
- Forbidden: a store asking the Task side; a reader editing a tree; the web deriving a name from a run ID.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TaskExecutionResourcePort.closedTaskExecutionOf(hostRoot, by)` (new) | A closed run hosted by a root | Returns `{ execution, ingressAgentRunId }` or `null`. Synchronous, from the loaded records, never throws | `by`: `{ ingressAgentRunId: string }` or a `TaskExecutionReference` | Uses the existing closed index and the entry's `agentRun` |
| `RootTaskExecutionAdapter.unlinkTaskExecutions(references)` (new) | The root's tree | Drops each run's released authority and registration, removes the executions from file and loaded tree; resolves to the references removed | `TaskExecutionReference[]` | Rejects on a write failure; nothing changes in memory then |
| `RootTaskExecutionAdapter.relinkTaskExecution(reference)` (new) | The root's tree | Builds the execution from its own file and adds it to the root list, in file and loaded tree | `TaskExecutionReference` | Rejects `TASK_EXECUTION_CONTEXT_UNAVAILABLE` when the own file is missing, unreadable or names another coordinating run |
| Store `unlinkTaskExecutions(dir, rootRunId, references)` (new, three) | The tree file | Removes those local links; resolves to the references removed; writes only when something was removed | Directory, root run ID, references | A missing file removes nothing |
| Store `readUnlinkedTaskExecution(dir, rootRunId, reference)` (new, three) | A run's own file | The composed record for a relink | As above | — |
| `RootTaskExecutionLifecycle.knowsRunId(agentRunId)` (new) | Run-ID admission | True for an agent in the tree or the ingress of a closed run of this root | Agent run ID | Used by the three delivery guards |
| GraphQL `collaborationParticipantMessages` | A participant's messages | Adds `unlinkedParticipants: [{ agentRunId, address }]` | Unchanged arguments | DTO in `autobyteus-collaboration-stream-contracts` |
| `UnlinkedParticipantReader.forAgentRunIds(root, ids)` and `.agentRunIds(root)` (new) | Agents of a root's unlinked runs | Addresses for given agent run IDs; all agent run IDs | Root identity; agent run IDs | A run whose own file cannot be read is left out with one warning naming it (`DESIGN.md` rule 7) |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `closedTaskExecutionOf` | Yes | Yes (a tagged ingress or a typed reference, always with the host root) | Low | — |
| `unlinkTaskExecutions`, `relinkTaskExecution` | Yes | Yes | Low | — |
| `knowsRunId` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| The entry | Link (existing: `TaskExecutionLink`) | Yes | Yes after the vocabulary extension | Low | Extend `collaboration_model.md` §1 |
| Removed entry | Unlinked | Yes | New word, added to §1 | Low | — |
| The policy file | `TaskExecutionLinkLifetime` | Yes | Yes | Low | — |
| Team-tab agents of unlinked runs | `unlinkedParticipants`, identity kind `unlinked` | Yes | Yes | Low | — |
| The memory rule | `CoordinatingRunPresence` | Yes | "Detached" keeps its meaning | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Removing links from a file | `run-history/store` (shapes, raw read, atomic writers) | Extend | It owns the shapes | — |
| Rebuilding a record | `task-agent-own-records.ts`, `TaskAgentOwnFiles` | Extend | It owns the mapping | — |
| Step ordering | The lifecycle's command queue | Reuse | Existing "release" and "reopen" steps | — |
| "Which runs are closed here" | The Task side's closed index | Extend | One new answer from the same data | — |
| Client refresh | The contexts' reload paths | Reuse | Used for "started" today | — |
| Link-lifetime policy | — | Create New (`TaskExecutionLinkLifetime`) | — | The lifecycle file is over 500 lines and the policy is one concern |
| Agents of unlinked runs | — | Create New (`UnlinkedParticipantReader`) | — | No reader of own files by root exists; two consumers need it |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task` | Policy and step order | DS-001, DS-003, DS-004 | Lifecycle | Extend | — |
| `projects/services` | The port's new answer | DS-002 … DS-005, DS-007 | Task side | Extend | — |
| `run-history/store` | Link edits, view rule, presence | DS-001, DS-002, DS-005, DS-006 | Stores | Extend | — |
| `run-history/services` | `UnlinkedParticipantReader` | DS-005, DS-007 | Readers | Extend | — |
| The three root areas | Tree mechanics, load order, guard | DS-001 … DS-004 | Roots | Extend | — |
| `api/graphql`, stream contracts, `autobyteus-web` | The Team tab | DS-005, DS-R1 | Reader, web contexts | Extend | — |

## Draft File Responsibility Mapping

Superseded by the final mapping below; no file changed between draft and final except that the unlink edit and the own-file composition share one file (`task-execution-link-edits.ts`), since both are the store side of one link's lifetime.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Remove links from a raw tree (three shapes) | `run-history/store/task-execution-link-edits.ts` | `run-history/store` | One rule | Yes | Yes | A place for policy |
| The view message rule (stored and loaded) | `run-history/store/task-agent-message-logs.ts` (`isMessageOfView`) | `run-history/store` | One rule | Yes | Yes | — |
| Unknown "reopened" → reload (three web contexts) | Each context's own reload path | `autobyteus-web` | The reload mechanisms differ per context; the shared part is one condition | N/A | N/A | A shared helper that hides three different recoveries |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Tree link | Yes (unchanged) | Yes | Low | None: no "closed" flag, no second list |
| `unlinkedParticipants` entry `{ agentRunId, address }` | Yes | Yes (the label is derived by the web from the address, as for every participant) | Low | — |

## Final File Responsibility Mapping

Server paths are under `autobyteus-server-ts/src/`.

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task/task-execution-link-lifetime.ts` (Add) | Task lifecycle | `TaskExecutionLinkLifetime` | `unlinkStopped(results)`, `closedExecutionFor(by)`, `relinkAtHead(execution)` with undo | The link-lifetime policy | Port, adapter |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (Modify) | Task lifecycle | Lifecycle | Calls the policy in the "release" and "reopen" steps; `knowsRunId`; `teamCoordinatorOf` also answers for an unlinked Team; removes `refuseCopyOutsideTree` | Step order | — |
| `agent-collaboration/execution/task/root-task-execution-adapter.ts` (Modify) | Task lifecycle | Adapter interface | The two new methods | Interface | — |
| `agent-collaboration/execution/task/task-execution-resource-port.ts` (Modify) | Task lifecycle | Port | `closedTaskExecutionOf` | Interface | — |
| `projects/services/task-execution-resource-service.ts` (Modify) | Projects | Task side | Implements `closedTaskExecutionOf` | Owner of the records | — |
| `run-history/store/task-execution-link-edits.ts` (Add) | Run storage | Stores | `withoutTaskExecutionLinks(shape, raw, runIds)`; `composeTaskExecutionFromOwnFile(files, coordinatingRun, reference)` | Store side of a link's lifetime | Shapes, own records |
| `run-history/store/task-agent-own-records.ts` (Modify) | Run storage | Mapping | `taskExecutionLinkOfOwnFile` (address, delegator, start from the own file) | The mapping's home | — |
| `run-history/store/task-agent-message-logs.ts` (Modify) | Run storage | View rule | `isMessageOfView`; `composeMessageLogs` takes the own parts and applies it | One rule | — |
| `run-history/store/coordinating-run-presence.ts` (Add; replaces `task-agent-link-check.ts`, Remove) | Run storage | Memory listing | Whether a coordinating run's tree file exists | One question | Tree paths |
| `run-history/services/unlinked-participant-reader.ts` (Add) | Run storage | Readers | Agents of a root's unlinked runs | One read model | Port, own files |
| `run-history/services/team-run-state-package-validator.ts`, `agent-org-execution/services/agent-org-state-package-validator.ts` (Modify) | Validators | Package validation | Drop the endpoint-set loop | — | — |
| `standalone-agent-run-root/persistence/standalone-root-package-store.ts`, `run-history/store/team-run-execution-tree-store.ts`, `run-history/store/agent-org-run-execution-tree-store.ts` (Modify) | Stores | Tree file | `unlinkTaskExecutions`, `readUnlinkedTaskExecution` | Each store's file | Link edits |
| `services/team-communication/team-communication-store.ts`, `agent-org-execution/persistence/agent-org-communication-messages-store.ts`, and the standalone store's `readMessages` (Modify) | Message stores | Stored view | Pass the own parts to `composeMessageLogs` | — | View rule |
| `standalone-agent-run-root/services/standalone-root-persistence-coordinator.ts`, `agent-team-execution/services/team-run-persistence-coordinator.ts`, `agent-org-execution/services/agent-org-run-persistence-coordinator.ts` (Modify) | Roots | Coordinator | `commitTaskExecutionUnlink`: file, then loaded tree, under the lock | Write order | — |
| `standalone-agent-run-root/services/standalone-root-tree-mutator.ts`, `agent-team-execution/services/team-run-execution-tree-mutator.ts`, `agent-org-execution/services/agent-org-run-execution-tree-mutator.ts` (Modify) | Roots | Tree | `remove…TaskExecutions(tree, runIds)` (every list); relink uses the existing `add…TaskExecution` | Tree edits | — |
| `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts`, `agent-team-execution/task-delegation/team-task-execution-adapter.ts`, `agent-org-execution/services/agent-org-task-execution-adapter.ts` (Modify) | Roots | Adapter | The two new methods; on unlink also trim the loaded message list with `isMessageOfView` and drop what the root keeps per agent of the execution | Root mechanics | — |
| `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts`, `agent-team-execution/services/agent-team-run-manager.ts`, `agent-org-execution/services/agent-org-run-manager.ts` (Modify) | Roots | Manager | In the load that activates a root: unlink, then read. Read-only inspections of a stored tree do not write | Load order | — |
| `standalone-agent-run-root/services/standalone-root-message-delivery.ts`, `agent-team-execution/services/team-run-message-delivery.ts`, `agent-org-execution/services/agent-org-run-message-delivery.ts` (Modify) | Roots | Delivery | The `TARGET_AGENT_RUN_NOT_FOUND` guard asks `knowsRunId`; the receiver is resolved after the reactivation | Guard | — |
| `api/graphql/types/collaboration-participant-messages.ts` (Modify) | API | Reader | Counterpart in the tree or unlinked; returns `unlinkedParticipants` | The reader | Unlinked reader |
| `api/rest/agent-collaboration-references.ts`, `agent-org-execution/services/agent-org-reference-content-service.ts`, `services/team-communication/team-communication-projection-service.ts` (Modify if they filter by tree agents; U-006) | API | Attachment content | Same admission as the reader | — | — |
| `api/graphql/types/token-usage-stats.ts` (Modify) | Token usage | Standalone total | Child agent run IDs = tree agents plus `UnlinkedParticipantReader.agentRunIds(root)` | Wiring | — |
| `agent-memory/services/agent-memory-explorer-service.ts`, `agent-memory/services/task-team-root-memory-source.ts` (Modify) | Memory | Listing | Use `CoordinatingRunPresence` | — | — |
| `autobyteus-collaboration-stream-contracts/src/` (the file that defines `collaborationParticipantMessagesDtoSchema`) (Modify) | Contracts | DTO | `unlinkedParticipants` (required array) | Contract | — |
| `autobyteus-web/services/collaborationMessages/collaborationParticipantMessages.ts` (Modify) | Web | Participant messages store | Keeps `unlinkedParticipants` with the loaded messages | — | — |
| `autobyteus-web/types/workspace/collaborationMessagesContextView.ts` (Modify) | Web | Identity type | Identity kind `unlinked` (`address`, `label`) | — | — |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationContext.ts`, `services/agentOrgExecution/agentOrgExecutionContext.ts`, `services/teamExecution/teamExecutionViewState.ts`, `services/teamExecution/teamCollaborationMessagesView.ts` (Modify) | Web | Contexts | `identityOf` falls back to an unlinked participant; an unknown "reopened" reference reloads the view | — | — |
| `docs/design/collaboration_model.md`, `docs/modules/standalone_agent_run_root.md`, `agent_team_execution.md`, `agent_orgs.md`, `agent_communication.md`, `projects.md`, `agent_memory.md` (Modify) | Docs | — | §1 words; CM-8 ("a link lasts while the run has an open Task; a run on another node keeps its link"); §3 and §5; each module's mechanics | — | — |

## Applied Patterns (If Any)

None new. The policy file is a plain collaborator of the lifecycle; the reader is a read model.

## Target Subsystem / Folder / File Mapping

The paths are in the table above; no folder is added.

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task/` | Folder | Lifecycle | Link-lifetime policy | It holds the root-neutral Task policy | Tree or file code |
| `run-history/store/` | Folder | Stores | Link edits, view rule, presence | It holds the three shapes and the own-file mapping | Task questions |
| `run-history/services/` | Folder | Readers | `UnlinkedParticipantReader` | It holds readers over stored runs | Writes |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task/` | Main-Line Domain-Control | Yes | Low | — |
| `run-history/store/` | Persistence-Provider | Yes | Low | — |
| `run-history/services/` | Off-Spine Concern | Yes | Low | — |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| The file before and after a closure | Before: `taskExecutions: [{address:"/software_engineering_team", teamRunId:"T1", delegatorAgentRunId:"M", startedAt:"…"}, {… teamRunId:"T2" …}]`. Task of T1 closed and T1 stopped → `taskExecutions: [{… teamRunId:"T2" …}]`. `agent_teams/T1/` is byte-identical | A `closed: true` flag on the link, or a second list `closedTaskExecutions` in the file | The file must stop growing; "closed" has one authority |
| Unlink order in a loaded root | `lock → edit file → replace loaded tree` | `replace loaded tree → save` (the save writes the on-disk entry back, A-1) | The existing split rule |
| Relink | Own file `agent_teams/T1/team_run_execution_tree.json` → `{address: taskAgent.address, teamRunId, delegatorAgentRunId: taskAgent.delegatorAgentRunId, startedAt: createdAt}` + composed record → root list | Keeping a copy of removed links anywhere | One source for each fact |
| Asking instead of inferring | `link.closedExecutionFor({ ingressAgentRunId })` returns the execution or `null`; `null` → "not in this run" | Treating every run ID missing from the index as a closed run, or as unknown | Principle 13 |
| The view rule | `isMessageOfView(m, own, treeAgents)`: both agents in `treeAgents`, or the message is from the root's own log and one agent is in `own` | Keeping every message of every log | Bounded memory; the Team tab unchanged |
| A link to a run on another node | `{…, nodeId:"N"}` is never removed | Removing it at closure | It cannot be rebuilt (DEC-003) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| A startup migration that removes closed links | The Task's text | Rejected | The ordinary unlink step at load (DEC-005) |
| Keeping closed links and only skipping their own files at load | Smaller change | Rejected | The file would keep growing; the user's rule is about the file |
| A second list of closed links in the tree | Easy relink | Rejected | The own file rebuilds the link |
| Reading the old link position of an older Org link on relink | Exact former host | Rejected | A relinked run goes to the root list like every new link (U-004 verifies restore) |

## Derived Layering (If Useful)

`Task side (authority) → lifecycle and link-lifetime policy → root adapter → coordinator → store → files`. Readers sit beside the roots and use the port and the own files.

## Change / Refactor Sequence

1. Store side: `task-execution-link-edits.ts`, `taskExecutionLinkOfOwnFile`, the three stores' two methods, with tests on hand-built trees for every shape of the inventory.
2. Port: `closedTaskExecutionOf` and its implementation.
3. Roots: mutators, coordinators, adapters (unlink, relink) for the three kinds.
4. Lifecycle: `TaskExecutionLinkLifetime`; the "release" and "reopen" steps; `knowsRunId`; the three delivery guards. Remove `refuseCopyOutsideTree`.
5. Managers: unlink before read in the activating load.
6. View rule: `isMessageOfView`, the three message stores, the two validators, the loaded roots' trim.
7. Readers: `UnlinkedParticipantReader`; the participant messages reader and DTO; attachment readers (U-006); the standalone token total; `CoordinatingRunPresence` and removal of `TaskAgentLinkChecker`.
8. Web: identity fallback, the participant store, unknown "reopened" → reload.
9. Documents.

Steps 1–5 change what is stored; 6–8 keep every surface as it was. They ship together: after step 5 alone the Team tab, the Memory page and the token total would lose closed runs.

## Key Tradeoffs

- **At load instead of a migration:** a run that is never loaded again keeps its closed links. It costs nothing and avoids all startup work.
- **Filter kept beside the unlink:** two mechanisms touch closed runs, with different jobs: the filter says what is shown now; the unlink ends the link once the run is stopped. Removing the filter would show a closed run until its stop is confirmed.
- **Names from own files:** the Team tab of a long-lived manager reads one small file per unlinked run named in the shown messages, when the tab is shown. The alternative, the Task record's address, would rename "solution designer" to "software engineering team".
- **No "unlinked" event:** no contract growth for something the client already hides.

## Risks

| Risk | Mitigation |
| --- | --- |
| A link is removed while something still needs it | Only after the release reports `stopped` and the Task side still says closed, inside the queue step; AC-001's unconfirmed-stop case |
| A relinked run cannot be restored | The relink builds the same record a load would compose; `assertRestorableChain` runs after it as today; a failed commit unlinks again |
| The loaded message list and the tree disagree after an unlink | One rule (`isMessageOfView`) for stored and loaded views; U-003 |
| A reader of closed links was missed | Change Scope table; escalation trigger; AC-006, AC-007, AC-011, AC-012 on an isolated instance |
| Team and Org mechanics differ from the standalone path read in detail | U-005; server tests per kind in AC-001, AC-002, AC-003, AC-008, AC-009 |
| A Task closed in the moment a root loads keeps its link until the next load | Harmless (hidden, stopped); self-corrects |

## Guidance For Implementation

- Reproduction to start from, from the investigation notes: `None` (a behavior change). The first failing test is AC-001 for a standalone root: delegate, close, assert the tree file.
- Do not add lines to files already over 500 lines beyond the calls named above (`root-task-execution-lifecycle.ts`, `standalone-agent-run-root.ts`, `standalone-agent-run-root-manager.ts`, `root-team-run.ts`, `agent-org-run-manager.ts`): new logic goes in the new files (FU-002).
- Unlink set at load: `closedTaskExecutionsIn(root)` as it is; the store ignores IDs that are not local links.
- Skip the unlink in a release that runs while the root no longer admits commands (termination, fail-stop); the next load does it.
- Relink puts the execution in the root list of every kind.
- The unlink never touches an own file; assert byte-identity in tests.
- Fixtures are small and hand-built per shape of `evidence/unlink-cases-2026-11-10.txt`; never copy user data and never run a load on it (`TESTING.md`).
- Verify U-003 … U-006 early; report a false one as a Design Impact.
- Update `collaboration_model.md` §5 with a row for this rule and correct CM-8 in the same change.
