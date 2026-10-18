# Design Spec — Give A Task To A Run The User Started (Adoption)

## Solution And Approval Basis

- Current solution revision ID: `SR-008` (SR-005 removed the list tool; SR-006 / SR-007 answer ARCH-REV-001 / -002; SR-008 answers the implementer's DI-001)
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
- Escalation trigger: anything requiring files to move, or adoption of a run that has delegated runs of its own.

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
- Deliberately left alone: new-copy delegation; copies' lifecycle, closure, reactivation, messaging scope; the sidebar
  code (adopted runs appear under the delegator through the existing link rendering; they leave their group because
  their history row is removed); workspaces.
- Follow-ups: adopting a run that has delegated runs of its own (re-parenting its chain to the delegator, CM-7);
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
| DS-001 | When the named run is not a copy in the delegator's tree, the adoption owner checks, in order: the delegator is a standalone agent run (DEC-108) and not Task-owned; the Task is an open Project Task; the target is a hand-started run (standalone reader / admitted team tree without `taskAgent`; a team member or coordinator passed as `target_agent_run_id` gets the team-run guidance; organization runs refused); it is in the delegator's workspace (agent: `workspaceRootPath`; team: every member's workspace); it has no delegated runs of its own; it is not bound to an application (no `launchPurpose`, no `applicationExecutionContext`, no team `applicationBinding` — such runs are refused); it is not archived; its definition is in the catalog; it has no open Task entry (an adoption in progress by this delegator is recognized first and resumed, see Persisted Data); it is idle (not active, or active with no turn running). Refusals change nothing. Then the steps of the Persisted Data order run; the delivery is the existing `buildExistingCopyTaskMessage` path, so the run continues its own conversation with the Task as its next work. | `HandStartedRunAdoption` |
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
