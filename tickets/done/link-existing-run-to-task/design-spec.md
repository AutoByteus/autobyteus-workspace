# Design Spec — Withdraw Adoption (SR-018)

> The adoption design below is **withdrawn**; this section is the current design (the removal). The rest is kept as
> the record.

## Removal Plan (current)

- Base: `origin/personal` `2b04a9971d`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/withdraw-adoption`,
  branch `codex/withdraw-adoption`.
- Method: `git revert -m 1 4e738acc66` restricted to product paths (the ticket folder is kept). A local probe
  (2026-10-18) shows 40 product files (+1348 / −145) and three content conflicts where later tickets changed the same
  files: `autobyteus-server-ts/src/run-history/store/task-agent-own-files.ts`,
  `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts` and its spec. Resolve each by
  removing only the adoption additions (`adoptOwnFile` / `restoreHandStartedFile`, the SR-009 sidebar retirement of an
  adopted run's own row) and keeping every later ticket's change.
- Remove also: adoption e2e (ADO-1..ADO-4), fixtures, docs lines (`projects.md` §Follow-up "or a run the user started",
  "Borrowed, not adopted", collaboration_model note), `delegate_task` text changes, `HandStartedRunAdoption`, the Task
  close / Task delete / Project delete calls to `revertUnfinished`, `TeamRunPackageCatalog.exclude` call for adoption,
  the history-row removal for adoption.
- Verify: server unit / integration / e2e and web suites green; a search finds no adoption symbol; `delegate_task` on a
  hand-started run is refused with the pre-adoption message (test restored from before the merge if one existed).
- Classification: `task_size=Medium` (one merge's 40 product files, 3 conflicts), `architectural_risk=Low` (returns to a
  shipped, tested baseline; no persisted data was ever written by adoption on any install known; no new contract).
- Data: none written (RM-003); no migration.

---

# Design Spec — Give A Task To A Run The User Started (Adoption)

## Solution And Approval Basis

- Current solution revision ID: `SR-017` (adoption contract `adoption-contract.md` is the behavior-defining supplement; SR-017 adds its validation fixes V-2..V-5)
- Approved requirements: SR-003, approved by the user 2026-10-18 (requirements-doc Document Status). SR-004 decisions
  DEC-108 (delegator kind) and DEC-109 (retry finishes a partial adoption) by the Solution Designer within the direction,
  the user informed ("you can reason about what is the most reasonable … decision").
- Behavior-defining supplements: None.
- Design status: `Ready`
- Investigation notes: `tickets/in-progress/link-existing-run-to-task/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md` (this conversation,
  2026-10-17), `DESIGN.md` rules 1–8; `docs/modules/projects.md` (§Follow-up Task to an existing copy, §DONE,
  §Reactivation), `docs/design/collaboration_model.md`, the memory layout contract of Task 8641c0ac (own files,
  `taskAgent` section, links, L4–L6), Data Migration Guideline.
- Superseded: the link-only design (`superseded-design-link-only.md`, SR-002), withdrawn before review.

## Current-State Read

`delegate_task {target_agent_run_id | target_team_run_id, task_id}` runs `RootTaskExecutionLifecycle.assignToExistingCopy`
(`root-task-execution-lifecycle.ts:160-205`): the delegator's root finds the copy in its own tree
(`resolveExistingCopy` / `taskExecutionTargetOf`); if it is not there, `refuseCopyOutsideTree` refuses ("not a delegated
copy in this run"). Otherwise: eligibility (`assertAssignable`), resume preparation, `assignExistingTaskExecution`
(appends `assigned` `starting`), publish reopened, deliver the Task (`buildExistingCopyTaskMessage`, `task_assignment`),
`markStarted`.

Since Task 8641c0ac a task agent is a run of its own: an agent task agent is `agents/<agentRunId>/` with
`run_metadata.json` plus a `taskAgent` section; a task agent team is `agent_teams/<teamRunId>/` with its team tree plus
`taskAgent`; the coordinating run's tree holds a link; G1 / G2 hide task agents from standalone / team-run readers; the
tree stores compose at load and split at save (own file first, then link). A hand-started standalone agent run and team
run live in **exactly those folders** without a `taskAgent` section, and are listed through the history indexes
(`run-history/store/agent-run-history-index-store.ts`, `team-run-history-index-store.ts`). So adoption moves no file.

Data (read-only, 2026-10-18): the PM's workspace (superrepo) holds 411 hand-started Software Engineering Team runs
(10 with delegated runs of their own) and 25 hand-started agent runs (3 with their own).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Rationale: a new branch of `delegate_task`'s existing-run mode with a runtime handover between roots, writes across
  three records (own file, the PM's tree, the Task's assignment) plus the history index, a new list tool, agent-facing
  text updates, docs.
- Architectural risk: `High`
- Rationale: changes a run's identity class (user-started → task agent) and its runtime owner; persistence across
  several files with crash recovery; tool contract change.
- Escalation trigger: anything requiring files to move, or a chain run hosted outside the adopted run.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Code | `root-task-execution-lifecycle.ts:160-205` | existing-copy path; refusal when not in tree | adoption branches here (D-1) |
| Contract | 8641c0ac memory layout contract §2, §3.1–§3.3, L4–L6 | task agent = own folder + `taskAgent` section + link | adoption writes the section and the link; no move (D-3) |
| Code | history index stores | hand-started runs are listed from the indexes | the adopted run's index row is removed (D-3) |
| Data | read-only check 2026-10-18 | 13 candidates have their own delegated runs | refused (REQ-007) |
| Doc | projects.md §Follow-up | assignment + delivery semantics | reused for the Task side and delivery |

## Review Response (ARCH-REV-001, SR-006)

| Finding | Resolution |
| --- | --- |
| ARCH-F-001 partial adoption before step 3 not resumable | "Adoption in progress" recognized first from the open entry; entry stays `starting` through steps 2–4; tests stop after steps 1–4 |
| ARCH-F-002 REQ-004 vs removing the empty collaboration package | package kept; REQ-004 unchanged |
| Residual: application-bound runs | refused (eligibility) |
| Residual: team admission | `TeamRunPackageCatalog.exclude` in step 4 |
| CRR-005 F-002 (API/E2E) adopted run opened this session stays in its own group until restart | renderer rule "Sidebar After Adoption": retire on `task_execution_started`; drop history-origin local rows the server no longer lists |
| DI-001 (implementer) team address frames differ (`/` vs catalog address) | step 3 rebases a team tree's addresses to the catalog address, reversibly; archived runs refused; definition must be in the catalog; `revertUnfinished` owner and timing defined |
| ARCH-F-003 (ARCH-REV-002) step 3 rewrote a team tree into the task-agent shape | step 3 strictly additive through `TaskAgentOwnFiles.addTaskAgentSection`; record read back through the task-agent reader so the split write writes only the link; reversal restores the prior content; test added |
| Residual: Memory page Teams list | an adopted team run leaves it, like every hub task team (8641c0ac FU-1); user informed |
| Residual: example, `projects.md` "Borrowed, not adopted" | example has no list tool; doc line in Change Scope |

## Intended Change

`delegate_task`'s existing-run mode also accepts an idle, hand-started standalone agent run or team run in the
delegator's workspace. It becomes the delegator's task agent for that Task — recorded, hosted, shown and closed exactly
like one the delegator started — and receives the Task as its next work. The delegator gets the run id from the user or finds it itself (no new tool, SR-005).

## Change Scope (Mandatory)

- In scope: UC-001, UC-002 — the adoption branch, eligibility, handover, records, history-index removal, Task
  delivery; `delegate_task` description and refusal texts; docs (`projects.md`
  §Follow-up Task to an existing copy → "… or a run the user started", §Ownership "Borrowed, not adopted" → existing
  unowned agents are still never adopted implicitly; a hand-started run is adopted only by `delegate_task` with its
  run id; `collaboration_model.md` CM-6 note; `agent_communication.md` unchanged).
- Also in scope (SR-009, F-002): the renderer retires an adopted run's own-group row (see "Sidebar after adoption").
- Deliberately left alone: new-copy delegation; copies' lifecycle, closure, reactivation, messaging scope; sidebar
  grouping rules (adopted runs appear under the delegator through the existing link rendering); the server (no new
  event); workspaces.
- Follow-ups: adopting across workspaces (with Task 6fb6e21b); delegators that are team members or organization agents (DEC-108). (Adopting a run with delegated runs of its own is now in scope, SR-010.)
  adopting across workspaces (with Task 6fb6e21b); delegators that are team members or organization agents (DEC-108).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Change | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, 002, 005, 007; AC-001, 002, 004 | `delegate_task {target_*_run_id, task_id}` | adoption branch | DS-001 |
| BEH-002, BEH-003 | REQ-003, 004; AC-001..003 | sidebar, board, DONE, reopen | existing delegated-run behavior applies | DS-002 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`. The memory refactor made a user-started run and a task agent share one storage
  shape; adoption is the missing transition between them.
- Structural triggers: Capability-area reuse — the existing-run path, Task port, tree stores and delivery are reused;
  no new subsystem.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No`.
- Design response: one adoption owner called from the existing path.

## Terminology

- Hand-started run: a standalone agent run or team run the user started (no `taskAgent` section, listed in a history index).
- Adoption: making a hand-started run the delegator's task agent for a Task.
- Delegator: the standalone agent run calling `delegate_task` (e.g. the Project Task Manager).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: None. Compatibility mechanisms: `None`.

## Adoption Contract (SR-017)

`adoption-contract.md` states every case and outcome and governs this section where they differ. Its validation (§9)
added: V-2 an adopted hub agent's hub log merged into its own log after the commit point; V-3 T's own session refuses to
start while an adoption of T is in progress; V-4 classification from each run's own entry state (not the temp Task's
status), recognizing this adoption's own writes; V-5 D's root load resumes any in-progress adoption, before or after the
commit point (revert only on X's close / delete before the commit point).

## Full Adoption Of The Chain (SR-010)

Target state = the natural state (DEC-110; evidence: a member-delegated run under a PM-delegated team, read-only data
2026-10-18): the delegated run's link is in the delegator's tree with `delegatorAgentRunId` = the member; its own file's
`taskAgent.coordinatingRun` = the delegator's run; its Task entry is `delegated` sub-work of the team's Task with
`hostRoot` = the delegator's run.

The adopted run T is topmost in its own run, so (CM-7) every run it or its members delegated, at any depth, is linked in
T's own tree. Adopting T with chain C:
- **Eligibility:** T and every run in C idle; every run in C in T's own run (no foreign host); the existing checks (no refusal for board Tasks: REQ-008 / DEC-114 hand them to the delegator).
- **Classification, once, from the state before adoption** (ARCH-F-005, ARCH-F-007): X is *unowned* if it has no Task
  entry anywhere (a collaborator converted by 259ddae7, CM-6 exception; 11 of 93 chain links in the user's data); else
  *board* if its current entry is in a Project Task (REQ-008, DEC-114); else *ongoing* if its tracking temp Task is
  TODO / IN_PROGRESS, *finished* if DONE / CANCELLED. The classification never reads X's entry after a partial write;
  the tracking Task's status is changed only at the very end, so a retry classifies the same way.
- **Chain step (before T's own-file step), per X in C:**
  1. X's own file: `coordinatingRun` → the delegator's run (rewrite of that one field).
  2. Task side, under X's and then each Task's serialization:
     - *ongoing*: append the open `delegated` entry for X in the adopted Task (host = the delegator) **first**, then close X's
       entry in its temp Task; X's current Task is now the adopted Task, so a later close of the temp Task never releases X;
       a stop between the append and the close leaves two open entries for X in two files — the existing loader rule
       (projects.md §Current Task of a copy: the latest is used, `TASK_AGENT_RESOURCE_CONFLICT` logged) picks the adopted
       Task, and the retry closes the old entry;
     - *finished*: re-host its entries (`hostRoot` → the delegator); nothing else;
     - *board*: `rehostEntries(X, delegatorRoot)`; on X's current entry, if `assigned`, `reassignToDelegator(X, boardTask,
       delegatorAgentRunId)` sets `assignedBy` to the delegator, and X's own file `taskAgent.delegatorAgentRunId` and its
       link's `delegatorAgentRunId` become the delegator (sub-step 1 / 3) — **only when X's current entry is `assigned`**
       (X is the board Task's worker). A *board* run whose current entry is `delegated` sub-work of the board Task keeps
       its delegator (the run that made it) and is only re-hosted. So the delegator is linked as the delegator of the
       board Task's worker, and the worker as the delegator of its sub-work — the state of the delegator having assigned
       that board Task to the worker directly (clarified with the implementer, SR-014). For a closed current entry, `reassignToDelegator`
       rewrites that entry's `assignedBy`: intended, and the one history field adoption changes (docs: `projects.md`, one line). All are activated in the same
       commit as the other chain links.
       Its current Task stays the board Task: closing the adopted Task never stops it; the delegator can give it a
       follow-up or reactivate it after reopening the board Task — the state of the delegator having delegated that
       board Task directly. Evidence (SR-014 investigation): follow-up and reactivation check the current entry's
       `assignedBy` (`projects/domain/task-execution-resources.ts:136, 175`); the closure stop set and fencing group by the
       current entry's `hostRoot` (`task-execution-resource-service.ts:208-222`); the message scope refuses two Task-owned
       runs of different Tasks (`root-task-execution-resource-scope.ts:63-68`), so after adoption the adopted run (Task X)
       and the board-Task run (Task K) no longer message each other by run id — the cut, as in a natural chain — while the
       unowned delegator messages both;
     - *unowned*: append an open `delegated` entry for X in the adopted Task (host = the delegator); close nothing — its
       current entry is then sub-work of the adopted Task, as in a natural chain (DEC-111), so it closes with that Task.
     The Task-side operations are dedicated to adoption (the ordinary appends refuse a run with an open entry,
     `task-execution-resource-service.ts:116, 287`): `TaskExecutionResourceService.appendAdoptedSubWork(adoptedTask, X,
     delegatorRoot)` (appends `delegated`, open, regardless of an open entry elsewhere), `closeAdoptedPriorEntry(X,
     priorTask)`, `rehostEntries(X, delegatorRoot)` and `reassignToDelegator(X, task, delegatorAgentRunId)`; `ProjectTaskService` exposes them to the adoption owner only.
     Recognition on retry: an open `delegated` entry for X in the adopted Task hosted by the delegator means the Task-side
     step is done for any class; for *ongoing*, an open prior entry still present means only the close is left.
  3. Append X's link to the delegator's tree **file** (same `delegatorAgentRunId`, `startedAt`) under the delegator root's
     persistence lock, without loading it into the root's in-memory tree (DI-002: the Agent-root validator requires the
     delegator — T or a member of T — in the same tree, `standalone-root-tree-schema.ts:24-27`; the load leaves such a link
     out until its delegator is loaded, `task-execution-tree-split.ts:137-155`). Saves keep links they did not load
     (8641c0ac L6). L4 holds (the own file names this root).
  4. Remove X from T's tree.
  After every X of a temp Task has moved, mark that temp Task CANCELLED (no note: temp Tasks have no note field; the
  entries already record where the work went, DI-002 option a); its release set is empty (no run's current Task is it).
- **Commit point and placement (SR-015, the implementer's proposal, extended to every class):** T's link in the
  delegator's tree is the commit point. **Before it**, the chain steps touch only trees and own files, all reversible:
  for every X, sub-step 1 (`coordinatingRun` → the delegator), sub-step 3 (append X's link to the delegator's tree file
  with its **original** delegator), sub-step 4 (remove X from T's tree). **After it** (forward only, resumed by retry): all
  Task-side writes for every class — *ongoing* (append `delegated` in the adopted Task, then close the old entry),
  *finished* (`rehostEntries`), *unowned* (append `delegated`), *board* (`rehostEntries` for every board run;
  `reassignToDelegator` for the board worker) — then the activation commit, which loads the chain links and, for the
  board worker, writes its record with `delegatorAgentRunId` = the delegator (the split write updates its link and its
  own file's `taskAgent.delegatorAgentRunId` in that commit); **last**, the temp-Task cancels. A revert (only possible
  before the commit point) therefore never meets a Task-side write: it returns every chain run to T (own file, link back,
  link out of the delegator's file) with nothing else to undo, and leaves no CANCELLED temp Task. After the commit point
  a retry classifies from the Task side, which is still untouched for every pending run, so the class is the same; temp
  Tasks to cancel are found as TODO / IN_PROGRESS temp Tasks hosted by T's root whose runs' current Task is now elsewhere.
  End states are unchanged.
- **Activation after T is linked:** once T's own steps commit T's link, the delegator root loads the chain links written
  in sub-step 3 into its in-memory tree in one commit and publishes them as task executions started (the same events a
  natural delegation publishes), so they appear under the delegator together with T.
- **Intermediate states (corrected, DI-002):** from X's sub-step 1 until T's link commits, X is shown in neither run (its
  own file names the delegator; its link in the delegator's file waits for its delegator) — not shown, files intact,
  resumed by the retry. Before sub-step 1 X is fully in T's run; after T's link and the activation it is fully under the
  delegator. A retry continues with the first missing sub-step of the first unfinished X, then the remaining runs, then
  T's own steps and the activation.
- **Revert of an unfinished adoption** (the adopted Task closed or deleted **before the commit point**, T's link):
  returns every chain run to T — own file `coordinatingRun` → T, link back into T's tree, link out of the delegator's
  tree file (restoring T's own file first, then re-adding the chain links, ARCH-REV-009 note) — then T's own revert. Under
  SR-015 no Task-side write exists before the commit point, so there is nothing else to undo and no temp Task was
  cancelled. Nothing is left hidden.
- **Completion of a committed adoption (ARCH-F-008, SR-016):** once T's link exists, the adoption is always finished,
  never reverted. `HandStartedRunAdoption.completeCommitted(delegatorRoot)` runs the pending forward steps (Task-side
  writes per class, the activation, the temp-Task cancels), each recognized from the files as already done or not, and
  is idempotent. It is called (1) by the delegator's `delegate_task` retry; (2) when the delegator root loads or becomes
  active (every load finds and finishes committed-but-pending adoptions before it serves the tree); (3) from the
  adopted Task's DONE / CANCELLED path, Task delete and Project delete — the same call sites as `revertUnfinished` — on
  the delegator root's queue when active, otherwise directly (Task-side writes and cancels directly; the activation then
  happens at the root's next load), **before** the close or delete proceeds. So a close or delete always acts on the
  finished state: the chain's ongoing and unowned runs close with the Task, the board worker is the delegator's
  assignment on its board Task. Recognition of "committed but pending": T's link present in the delegator's tree and a
  chain run (link in the delegator's tree file, own file naming the delegator) whose Task side is not yet in its target
  class state, or a temp Task to cancel.
- **Comparison with a natural chain (AC-008, DEC-111):** links (place, delegator, `startedAt`), coordinators, hosts and
  each run's current entry are equal; earlier records keep the true history.
- **Tests (SR-016 additions):** stop right after T's link, then (a) DONE, (b) CANCELLED, (c) Task delete, (d) Project
  delete, (e) a delegator restart without any retry — each ends in the natural-chain state, including a board worker
  (assigner and host = the delegator, still on its board Task).
- **Tests:** stop after each sub-step 1, 2 (each Task-side write), 3, 4 and before the temp-Task cancel; each retry
  finishes; board-Task chain runs (open and closed) handed to the delegator, still on their board Tasks, unaffected by the adopted Task's close, follow-up and reactivation by the delegator; comparison with a natural chain; a fixture with an
  unowned chain run (converted collaborator) — adopted as open sub-work, closed with the adopted Task, equal to a natural
  chain's current entry.
- **Messages** stay where they are (per-run logs, CM-9; messages are keyed by run id).
- **Proof:** build a natural chain and an adopted chain from the same hand-built data and compare the stored files (AC-008).

## Persisted Data / State Transition Decision

- Subjects changed per adoption (never in bulk): the run's own file gains a `taskAgent` section
  (`coordinatingRun` = the delegator's root, `delegatorAgentRunId` = the delegator, `address` = the definition's
  catalog address, `origin: "catalog"`, launch facts from its own file); the delegator's tree gains the link; the Task's
  `agent_run_resources.json` gains an `assigned` entry; the run's history index row is removed.
- Decision: `Not Affected` for existing data (no migration); each adoption writes only current shapes.
- Order (crash safety, DESIGN.md rule 7, 8641c0ac L4): (1) Task entry `starting` (link before resources, as today);
  (2) runtime handover; (3) **additive** own-file write, then the link (below); (4) history row removal
  and `TeamRunPackageCatalog.exclude` for a team run; (5) delivery; (6) `started`.
- **Adoption in progress** (ARCH-F-001, DEC-109): the run's latest entry in this Task's file is an open `assigned`
  entry by this delegator with `hostRoot` = the delegator's root, and the run is not yet a copy in the delegator's tree.
  This is recognized **first**, before every eligibility refusal that an open entry would trigger ("belongs to no
  Task", `assertCopyAssignable` / `assertTaskExecutionAssignable`'s "already this Task"), and the same delegator's
  `delegate_task` retry continues at the first missing step: handover not done → do it; own file has no `taskAgent`
  naming this root → write it and the link; link present but history row not removed → remove it; not delivered →
  deliver. The entry stays `starting` through steps 2–4 — a failure there (handover refused because the run is busy
  again, a write error) returns `{delegated: false, message}` saying the adoption is not finished and to retry; it is
  never marked `failed`. Only a failed delivery (step 5, the run already adopted) marks it `failed`, exactly as the
  follow-up path does today. Until finished, the Task shows the assignment as `not_confirmed`; the user's own session
  is never fenced (fencing is per host root, `closedTaskExecutionsIn(hostRoot)`).
- An unfinished adoption whose Task is then closed: DONE / CANCELLED closes the entry; the delegator's root has no
  such copy, so nothing is stopped. If the run's own file already names this root but the delegator's tree has no link
  (a stop inside step 3), the close removes that `taskAgent` section so the run is a hand-started run again and is
  listed in its group (G1 / G2) — it is never left hidden. A closed entry never blocks a later adoption ("belongs to no
  Task" = no open entry).
- **Step 3 keeps every fact and is exactly reversible** (ARCH-F-003, DI-001). The own-file owner (`TaskAgentOwnFiles`)
  gets `adoptOwnFile(run, section)` and its inverse `restoreHandStartedFile(run)`, both on raw JSON, written atomically:
  - agent run: add the top-level `taskAgent` key; every other key unchanged (`TaskAgentRunMetadata` = `AgentRunMetadata`
    + `taskAgent`). Inverse: remove the key.
  - team run: add `taskAgent` **and rebase the address frame** from `/` to the catalog address `A` (DI-001: a hand-started
    team tree is rooted at `/` with members such as `/lead`, `team-run-execution-tree-schema.ts:40-46`; a task agent
    team's own tree and the delegator's tree need `rootTeam.address = taskAgent.address = A` and members `A/lead`,
    `task-agent-team-tree-schema.ts:52-83`, `task-execution-source-schema.ts:55-61`). Rebased: `rootTeam.address`, each
    member's `address`, `coordinatorAddress`, every handoff's addresses. Teams are flat, so the rebase is a prefix swap and
    its inverse is exact. `teamDefinitionName`, `role`, `description` and every other key stay. Messages are keyed by run
    ids (`team-communication-messages-schema.ts`), and member memory folders by run id, so nothing else changes.
  - the composed record is then read back through the task-agent reader and added to the delegator's tree; the record
    equals the file, so the split write (`task-execution-tree-split.ts:211-237`) writes only the link. The link's
    `startedAt` equals the own file's `startedAt` (a team: the tree's `createdAt`) so nothing is rewritten.
  - later ordinary saves normalize an adopted team's file to the task-agent team shape, as for every task agent team.
- **Catalog address** `A`: the address under which the catalog offers the run's definition (the same endpoint
  catalog `delegate_task` resolves a `recipient_address` with). If the definition is no longer in the catalog, the run
  is refused (no address to place it under).
- **Archived runs are refused** ("unarchive it first"): adopting would discard `archivedAt` (the task-agent team reader
  forces it to null), and an archived run is already cleaned up.
- **Undo of an unfinished adoption on close — owner and timing.** `ProjectTaskService`'s DONE / CANCELLED (and Task
  delete) path, and `ProjectService.deleteProject` for every Task of the Project (ARCH-REV-004), after closing the entries, calls `HandStartedRunAdoption.revertUnfinished(entry)` for each closed
  `assigned` entry that never `started` and names a hand-started adoption. It runs on the delegator root's serialized
  queue when that root is active (so it can never race a step of the same adoption, which only runs on that queue),
  otherwise directly (no active delegator root → no adoption in flight). It reads the delegator's tree (active root, or
  the store on disk) and the run's own file: own file names this root and the tree has no link → `restoreHandStartedFile`
  and re-add the history row (rebuilt from the file, as the history repair does). Otherwise nothing. Failures are logged
  (`TASK_ADOPTION_REVERT_FAILED`) and retried by repeating DONE, as DONE's stop retries are.
- An agent run's standalone collaboration package (if present, it has no task executions — otherwise refused, REQ-007)
  is **kept** (REQ-004: nothing deleted). It is harmless: G1 hides the folder's standalone metadata, the readiness check
  skips task agent folders (8641c0ac D-6), and a cross-run scan reading its empty tree finds nothing.

## Sidebar After Adoption (SR-009, CRR-005 F-002)

Evidence: the renderer adds every run context opened this session to the history tree as a `source: 'local'` row
(`autobyteus-web/stores/runHistoryReadModel.ts:262-281`) and team contexts to `teamNodes`
(`stores/runHistoryNavigationProjection.ts:180-187`), whatever the server lists; the server has no history push. So an
adopted run the user opened this session stays in its own group until restart, beside its new row under the delegator.
`task_execution_started` reaches the renderer only on the delegator's collaboration stream
(`services/agentCollaboration/agentRunCollaborationContext.ts`; team / org equivalents), i.e. when that run is open.

Rule (renderer only; no server change): a run that has become a task agent is never shown as a top-level row.
1. **Immediate:** when any open root's collaboration stream reports `task_execution_started` for a run id
   (`agentRunId` or `teamRunId`) that the renderer also holds as a top-level run context, the renderer retires that
   context's own-group row (agent row from the read model's local runs, team node from `teamNodes`). The run's context
   and conversation stay usable; it is shown under its coordinator.
2. **Authoritative on the next history read:** a top-level context row the renderer first opened **from a server
   history row** is dropped from its own group when a later server history read no longer lists it. Runs created in
   this session that the server has not listed yet (drafts and new runs) keep today's behavior.
Together: the duplicate disappears at once when the delegator is open, and otherwise at the next history read; DONE
then removes the row under the delegator as today (AC-003). Tests: web unit tests for both rules (agent and team);
API/E2E rerun of the desktop check "adopt a run opened this session, then DONE and reopen" (D-1).

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 Adopt | Primary | BEH-001 | `delegate_task` existing-run mode | run is the delegator's task agent with the Task delivered | `RootTaskExecutionLifecycle` → `HandStartedRunAdoption` | the new transition |
| DS-002 Afterwards | Primary | BEH-002, 003 | sidebar / board / DONE / reopen | as any task agent | existing owners | no new behavior |

## Primary Execution Spine(s)

- DS-001: `delegate_task {target_*_run_id, task_id} → assignToExistingCopy → not in this root's tree → HandStartedRunAdoption.inspect (eligibility) → Task port: assigned entry starting (hostRoot = delegator root, assignedBy = delegator) → release the run's own session (idle) → delegator adapter adds the composed record (tree store: own file taskAgent section, then link) → history index row removed + history change published → publishTaskExecutionsReopened → deliver the Task (task_assignment) → restore under the delegator root from its own folder → markStarted`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | When the named run is not a copy in the delegator's tree, the adoption owner checks, in order: the delegator is a standalone agent run (DEC-108) and not Task-owned; the Task is an open Project Task; the target is a hand-started run (standalone reader / admitted team tree without `taskAgent`; a team member or coordinator passed as `target_agent_run_id` gets the team-run guidance; organization runs refused); its whole chain (every run it or its members delegated) is idle and hosted in its own run (SR-010); it is in the delegator's workspace (agent: `workspaceRootPath`; team: every member's workspace); its chain is idle (full adoption, SR-010); it is not bound to an application (no `launchPurpose`, no `applicationExecutionContext`, no team `applicationBinding` — such runs are refused); it is not archived; its definition is in the catalog; it has no open Task entry (an adoption in progress by this delegator is recognized first and resumed, see Persisted Data); it is idle (not active, or active with no turn running). Refusals change nothing. Then the steps of the Persisted Data order run; the delivery is the existing `buildExistingCopyTaskMessage` path, so the run continues its own conversation with the Task as its next work. | `HandStartedRunAdoption` |
| DS-002 | Nothing new: the run is in the delegator's tree, so the sidebar shows it under the delegator with its Task line, the board shows it as the worker with live status, DONE / CANCELLED stops it and its row leaves, reactivation is the delegator's, messaging scope and sub-work rules apply. | existing |

## Spine Actors / Main-Line Nodes

`delegate_task` tool; `RootTaskExecutionLifecycle` (standalone root); `HandStartedRunAdoption`; Task port
(`ProjectTaskService`); standalone root manager / team run manager (release); delegator's tree store; history index
stores; delivery path.

## Ownership Map

- `HandStartedRunAdoption` owns eligibility, step order and resumption of a partial adoption.
- The Task side owns the assignment entry (reuses `assignExistingTaskExecution`'s semantics with a new-copy entry).
- The tree store owns the own-file section and link (D-1 split write of 8641c0ac).
- History index stores own row removal.

## Thin Entry Facades / Public Wrappers (If Applicable)

`delegate_task` (unchanged input shape).

## Removal / Decommission Plan (Mandatory)

| Item | Why | Scope |
| --- | --- | --- |
| `refuseCopyOutsideTree`'s unconditional "not a copy" for hand-started runs | adoption replaces it for eligible runs; the refusal stays for the rest | In This Change |

## Return Or Event Spine(s) (If Applicable)

Publish: history change (row removed), task executions reopened (delegator tree), Task change feed (assignment).

## Bounded Local / Internal Spines (If Applicable)

Resumption: `open assigned entry by this delegator for this Task, run not in tree? → handover done? → own file names this root? → link present? → history row removed / team excluded? → delivered? → continue at the first missing step`.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| idle check | DS-001 | active root status: no running turn |
| workspace comparison | DS-001 | canonical path equality |

## Ownership Boundaries

No change to how existing copies are found, assigned, closed or reactivated; adoption only adds a branch where the
existing code refused.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers |
| --- | --- | --- |
| `RootTaskExecutionLifecycle.assignToExistingCopy` | the adoption owner | the tool router |

## Dependency Rules

The adoption owner may use the run-history readers (G1 / G2), history index stores, the standalone root manager / team
run manager (release), the delegator adapter and the Task port; no other subsystem depends on it.

## Interface Boundary Mapping

| Interface | Identity |
| --- | --- |
| `delegate_task {target_agent_run_id \| target_team_run_id, task_id}` | unchanged shape; result as today (`target_kind`, run ids) |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity |
| --- | --- | --- | --- |
| both | Yes | Yes | Low |

## Main Domain Subject Naming Check

| Subject | Name | Natural |
| --- | --- | --- |
| owner | `HandStartedRunAdoption` | Yes |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| assignment + delivery | `assignToExistingCopy` path | Extend |
| own file + link | 8641c0ac tree stores | Reuse |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| agent-collaboration/execution/task | adoption owner, branch | Extend |
| projects | assignment entry | Reuse / small extend |
| run-history | readers, index removal | Reuse |
| agent-tools | `delegate_task` texts | Extend |

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

None new.

## Shared Structure / Data Model Tightness Check

The adopted run's records are exactly a catalog task agent's; no new field.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `agent-collaboration/execution/task/hand-started-run-adoption.ts` (new) | eligibility, steps, resumption |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | branch to adoption when the run is not in the tree |
| standalone root adapter (task execution adapter of the agent root) | add an adopted record to the tree |
| `projects/services/project-task-service.ts`, `task-execution-resource-service.ts` | assignment entry for an adopted run (as `assignExistingTaskExecution`, first entry) |
| `run-history/store/task-agent-own-files.ts` | `adoptOwnFile` / `restoreHandStartedFile` (add `taskAgent`; teams: reversible address rebase; raw JSON, atomic) |
| `projects/services/project-task-service.ts` (close / delete path) | call `HandStartedRunAdoption.revertUnfinished` for never-started adoption entries |
| `projects/services/project-service.ts` (`deleteProject`) | call `revertUnfinished` for every Task of the Project before its files are removed (ARCH-REV-004) |
| `run-history/store/agent-run-history-index-store.ts`, `team-run-history-index-store.ts` (+ catalogs) | remove the row; publish |
| standalone root manager / team run manager | release an idle run's own session for handover |
| `agent-tools/task-delegation/*` | description and refusal texts |
| web: `stores/runHistoryReadModel.ts`, `stores/runHistoryNavigationProjection.ts`, the collaboration contexts' `task_execution_started` handling (agent / team / org) | retire an adopted run's own-group row (SR-009) |
| docs | as Change Scope |

## Applied Patterns (If Any)

None beyond the existing ones.

## Target Subsystem / Folder / File Mapping

As the Final mapping.

## Folder Boundary Check

Matches existing placement.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

```text
User: "give autobyteus-10 to team run software_engineering_team_8f12"
PM: delegate_task({target_team_run_id: "software_engineering_team_8f12", task_id: "autobyteus-10"})
  → {delegated: true, target_kind: "team", target_team_run_id: "software_engineering_team_8f12", target_team_coordinator_agent_run_id: "solution_designer_4b7d"}
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| keep the run listed in its group as well as under the PM | Rejected (two places for one run) |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Adoption owner + eligibility + refusals (unit tests per refusal, including application-bound runs).
2. Steps and resumption with hand-built data (TESTING.md): stop after step 1, after step 2, after step 3, after step 4;
   each retry by the same delegator finishes; a retry by another delegator is refused; an unfinished adoption whose
   Task is closed (including a stop inside step 3) leaves the run a listed hand-started run and a later adoption works;
   a team run stopped inside step 3 then closed is listed and openable as a team run with a parsed-identical tree
   (addresses back at `/`); an adoption that completes leaves every other key unchanged until a later ordinary save;
   rebase / inverse round-trip on hand-built team trees with handoffs; revert on close with the delegator root active
   and not active; archived and catalog-missing runs refused; members message each other and the PM after adoption.
3. Delegator adapter, Task entry, history row removal, delivery; integration tests (agent run, team run).
4. Agent-facing texts.
5. Docs; real-app check on an isolated instance (AC-001..003); beta; the user's check (AC-007).

## Key Tradeoffs

- Refusing runs with their own delegated runs keeps this ticket small; re-parenting is a follow-up.
- Only standalone agent delegators: covers the PM; team / org delegators later.

## Risks

- R-1: releasing an active idle run while the user has it open: the UI sees it leave its group and appear under the PM.
- R-2: a partial adoption visible as `not_confirmed` until retried.
- R-3: an adopted team's members may remember their old `/`-relative addresses from the conversation; after adoption
  their team addresses are `A/…`. `get_handoff_rules` and the restored team context give the new addresses, and an old
  address is refused with guidance (`COLLABORATION_TARGET_NOT_FOUND`), so the team recovers on its own. Accepted.

## Guidance For Implementation

- Never move or copy files; reuse the 8641c0ac stores for the own-file section and link.
- Every refusal before step 1; nothing written on refusal.
