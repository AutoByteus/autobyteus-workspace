# Implementation Design Impact — link-existing-run-to-task (DI-001, DI-002)

- From: implementation engineer, 2026-10-18, at the start of implementation (no code written).
- Basis: design-spec.md SR-007, ARCH-REV-003 Pass; base `origin/personal` `2f211340ee`.
- Classification: `Design Impact` (team-run adoption as designed cannot work; the fix changes the step-3 contract
  that ARCH-F-003 rests on).

## DI-001 — A hand-started team run is addressed at `/`; a task agent team is addressed under its catalog address

The design's step 3 for a team run is strictly additive: add only the top-level `taskAgent` key to the team's
`team_run_execution_tree.json`, then build the composed record by reading the file back through the task-agent
reader, and let the delegator adapter add it (the split write then writes only the link). That read-back and the
composed record are both rejected, because the two tree kinds use different address frames:

| Shape | Root address | Member addresses | Evidence |
| --- | --- | --- | --- |
| Hand-started team run (team-run reader) | must be `/` | direct children of `/` (`/lead`, `/designer`) | `run-history/store/team-run-execution-tree-schema.ts:40-46` |
| Task agent team own tree (task-agent reader) | non-root, equal to `taskAgent.address` | (any non-root) | `task-agent-team-tree-schema.ts:56` (`canonicalNonRootAddress(root.address)`), `:81-83` (`taskAgent.address` must equal `rootTeam.address`) |
| Task team record in the delegator's tree | the catalog address (`/software_engineering_team`) | direct members of it (`/software_engineering_team/lead`) | `run-history/store/task-execution-source-schema.ts:59-60`; `run-execution-tree-shared-record-schemas.ts:196` |

So after the additive write, the task-agent reader reports the team tree unreadable (`rootTeam.address` `/`), and
even a reader that accepted it would compose a record whose members are not under the link's address, which the
delegator's tree schema rejects. Handoff rules (`from` / `to` addresses) are in the same `/`-relative frame.

The agent-run path has no such problem: `run_metadata.json` has no address; `taskAgent.address` is the catalog
address and the composed record validates. (Implementation detail I will apply, no design change: the adoption link's
`startedAt` must equal the own file's `startedAt` — for a team, the tree's `createdAt` — or the split write
normalizes the own file at link time, because the candidate takes `startedAt` / `createdAt` from the link.)

## Options for the Solution Designer (my reading; your decision)

1. **Reversible address rebase for team runs.** Step 3 rewrites the team tree from the `/` frame into the catalog
   address frame (`/` → `/sw_team`, `/lead` → `/sw_team/lead`, handoffs likewise) and adds `taskAgent`, keeping every
   other key (`teamDefinitionName`, `role`, `description`, …) as it is. The close of an unfinished adoption removes
   `taskAgent` and rebases back to `/` (teams are flat, so the inverse is exact). Step 3 is then not strictly additive;
   the reversal restores a parsed-identical tree by the inverse rebase rather than by removing one key. ARCH-F-003's
   test (stopped inside step 3, then closed → listed and openable, parsed-identical) still applies.
2. **The task-agent team reader accepts the `/` frame** and composes the record into the catalog frame (a second
   accepted shape in a current reader — a dual-shape read, which the design rules disfavour).
3. **Agent runs only in this ticket**; team-run adoption as a follow-up. This drops AC-001 (team), which is the user's
   main case (411 team runs; the `autobyteus-10` worker may be either).

Option 1 looks smallest and keeps one current shape per reader, but it changes the "strictly additive" contract the
round-3 review accepted, so it needs your decision and probably a targeted re-review.

## Smaller points to settle in the same revision (not blocking on their own)

- **Archived hand-started runs.** A team run with `archivedAt` set: the task-agent team reader forces
  `archivedAt: null`, so the split write would normalize it at link time; an agent run's archive state lives only in its
  history row, which step 4 removes. Adopt archived runs (unarchived by adoption) or refuse them?
- **Where the close of an unfinished adoption runs.** The Final File Responsibility Mapping names no owner for "the
  close removes that `taskAgent` section" (Task DONE / CANCELLED on an entry whose run is not in the delegator's tree).
  I would put it in the Task-close release path for the host root (the delegator's standalone root, or offline when the
  root is not active); please confirm the owner, including when the delegator's root is not running at close time.
- **The catalog address of an adopted agent run** (`taskAgent.address`, the link's address): I would use the address
  the catalog delegation would give its definition (`resolveDelegationPlacement` / catalog-delegation addressing);
  please confirm, and what happens when the definition is no longer in the catalog (refuse, or use the recorded
  definition id with a derived address).

---

## DI-002 — Full adoption of the chain (SR-012, ARCH-REV-008): three points the code can't follow as written

- From: implementation engineer, 2026-10-18, at the start of the full-adoption round (no code written).
- Basis: design-spec.md §Full Adoption Of The Chain (SR-012), ARCH-REV-008 Pass. Worktree
  `link-existing-run-to-task-full-adoption`, branch `codex/link-existing-run-to-task-full-adoption`, base `7e215cdf49`.
- Classification: `Design Impact`. Items 1 and 2 contradict statements in the design (intermediate states, the
  close-revert). Item 3 needs a persisted-shape or behavior decision.

### 1. A chain run's link can't enter the delegator's tree before T does (chain sub-step 3)

The design moves each X (sub-steps 1–4) **before** T's own-file step, so sub-step 3 adds X's link to the PM's tree
while T is not in it. The link names `delegatorAgentRunId` = T or one of T's members. Two rules stop that link from
taking effect until T is linked:

| Rule | Evidence | Effect |
| --- | --- | --- |
| In memory, a task execution's delegator must be an AgentRun in the same tree | `standalone-root-tree-schema.ts:24-27` → `validateTaskExecutionDelegators`, `run-execution-tree-shared-record-schemas.ts:237-258`; every in-memory add revalidates (`standalone-root-tree-mutator.ts:15-30`) | The active PM root rejects X's record: `delegator '…' is not an AgentRun in this tree` |
| At load, a link whose delegator is not in the composed tree is left out | `task-execution-tree-split.ts:137-155` | On disk, X's link is kept but not shown until T is linked |

The order itself can't change:
- A team T's file can't take `taskAgent` while it still holds chain links (`task-agent-team-tree-schema.ts:41`).
- X's link must exist somewhere until it is under the PM, so that a retry can find X.

So the design's statement "at every other point X is fully in T's run or fully under the delegator" does not hold.
From sub-step 1 until T's link, X is in neither composed tree. Files are intact and the retry finishes.

**Proposal (my reading).** Keep the design's file order exactly:
- Sub-step 3 appends X's link to the PM's tree **file**, under the PM root's persistence lock. Later saves keep it,
  because a save never removes what it did not load (L6, `task-execution-tree-split.ts:193-205`).
- After T's link is committed, the PM root loads those on-disk chain links into its in-memory tree in one commit
  (now valid: T and its members are present) and publishes each as started. The split then writes nothing new.
- Correct the intermediate-state sentence: X is not shown from sub-step 1 until T is linked.

### 2. The close-revert leaves moved chain runs hidden

The design says that if the adopted Task is closed before the retry:
- the close-revert returns to T any X caught between sub-steps 1 and 3;
- moved runs stay under the delegator (valid).

They are not valid: T's link was never added, and the revert makes T a hand-started run again. So every X whose
link is in the PM's tree names a delegator (T or a member) that is not in that tree. Every load leaves it out
(`task-execution-tree-split.ts:137-155`). Its own file names the PM, so T's tree leaves it out too
(`:127-129`). It is hidden for good, which contradicts "it is never left hidden".

**Proposal (my reading).** The close-revert returns **every** chain run of the unfinished adoption to T:
- own file `coordinatingRun` → T;
- its link back into T's tree when absent;
- its link out of the PM's tree.

The Task-side writes stay as they are: the DONE / CANCELLED closed the `delegated` entries, and earlier entries keep
the true history. A run whose current entry is that closed `delegated` entry is hosted by the PM, so it is never fenced
in T's root (fencing is per host root, `closedTaskExecutionsIn`). T's user can still use it.

The chain runs to return are found from the PM's tree file: links whose `delegatorAgentRunId` is T or one of T's
members.

### 3. A temp Task has no place for the note "continues as sub-work of <key>"

An ad-hoc Task stores `taskId`, `description`, `referenceFiles`, `status`, `createdAt` and `updatedAt`
(`projects/domain/ad-hoc-task.ts`). No Task has a note field, and `update_task` takes none. So "mark that temp Task
CANCELLED with the note …" needs one of:
- (a) **CANCELLED only, no note.** The adopted Task's `delegated` entries and the closed prior entries already
  record where the work went.
- (b) **Append one line to the temp Task's description**: "Continues as sub-work of Task <key>." This changes the
  user-visible text of a Task the user never edits; it is shown wherever ad-hoc Tasks are listed.
- (c) **A new persisted field.** This is a schema change and outside the persisted-data decision (`Not Affected`).

My recommendation is (a). If the user wants the note visible, (b).

### What I can build without this decision, and what waits

Not dependent, and unchanged by either proposal:
- eligibility (chain idle, every run hosted in T's run, REQ-008 board-Task refusal naming the keys);
- the once-only classification;
- the Task-side operations `appendAdoptedSubWork`, `closeAdoptedPriorEntry` and an idempotent `rehostEntries`;
- the own-file `coordinatingRun` rewrite.

Waiting for your decision: the PM-tree mechanics (item 1), the close-revert (item 2) and the temp-Task cancel (item 3).
I'll start the non-dependent parts only once you confirm, so nothing is built on a reading you change.
