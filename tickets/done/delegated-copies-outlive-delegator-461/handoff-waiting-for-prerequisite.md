# Result: Blocked — Waiting For Prerequisite

- Result: `Blocked`, kind `Waiting For Prerequisite` (PRE-001)
- Package identifier: `delegated-copies-outlive-delegator-461`
- Task: `autobyteus-461` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Current solution revision: `SR-013`
- Date: 2026-11-10
- From: Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`, team run `software_engineering_team_0218d0fdb0ff400683ecec67896478a7`). To: `/project_task_manager`, which delegated the Task.

## What is asked of the Project Task Manager

1. Create the Task described under "Suggested Task" in the same Project.
2. Make `autobyteus-461` depend on it.
3. Give the new Task to this team run (the Solution Designer above), so it is done first by the designer who has the context.

The user decided this order in the Solution Designer's conversation on 2026-11-10: "let's first fix the problem regarding the collaboration tree which is constantly growing … we can fix this problem first and then after this problem is fixed we come back to this ticket again", and then: "ask the Project Task Manager to create a Task for you and then you can work on the Task first".

## Where autobyteus-461 stands

- The user replaced the small Stop fix by a structural change: a delegated run becomes an ordinary run linked to the run that delegated it; the Task owns the work. Contract: `target-collaboration-contract.md` (revision 2 approved by the user; §10 communication, §11 the life of a link and §12 the communication walk are proposed, written at his request and validated on his stored data).
- Requirements were approved at SR-007; the design for a first step went to architecture review and failed (ARCH-REV-001, ten design findings; `design-review-report.md`). The design was revised (SR-010) and then overtaken by the user's further direction: the receiver of a message is found through the link and through the Task's record; a link exists only while its Task is open; possibly all three run kinds in one ticket.
- Nothing was built. The branch holds documents and read-only measurement scripts only.
- `autobyteus-461` continues after the prerequisite: its contract is then partly in place, and its design is rebuilt on it.

## Suggested Task

**Title:** A run's collaboration tree lists only the runs whose Task is open: stop the tree from growing with every delegation

**Goal.** When a Task is closed, the runs that worked on it leave the delegating run's collaboration tree. The Task's record is the lasting record of who worked on what. If the Task is reopened, or the same run gets another Task, the run is listed again.

**Why (the user's words and the measured case).** "The agent or agent team is connected with the task"; "we don't have to really keep all those task agent or agent teams into the collaboration tree because when the task is finished … it is just dismissed"; "why will this tree itself continue to grow". On the user's machine (read-only, 2026-11-10): the Project Task Manager's tree has 145 entries after one month, 134 of them of closed Tasks, and grows by about 145 a month; each load of that run also reads the own file of every listed run (143 files, 1.6 MB today). Of 196 delegated runs, 170 belong only to closed Tasks.

**What happens today (read, with file references in the 461 ticket's investigation notes).** Every delegation adds an entry to the top run's tree (`taskExecutions` in `collaboration_tree.json`, a team tree's `rootTeam.taskExecutions`, an org tree's `rootOrg.taskExecutions`). Nothing removes an entry. Closing a Task stops its runs and hides them in the tree (`closed_task_executions`), but the entries stay and are loaded, indexed and read.

**The rules to build** (the 461 contract, §11 "The life of a link", cases L1 … L11, with example files):
1. An entry exists while a Task that its run works on is open. Closing the run's last open Task removes it; the run itself, its conversation, files and Task record are kept.
2. Reopening the Task and the assigner's message to the run, or a follow-up Task given to the run by its ID, puts the entry back and continues as today.
3. A run with several Tasks keeps its entry until its last open Task closes.
4. Sub-work runs leave with their Task too.
5. A temporary Task (no Project) keeps its entry until it is closed or its creating run is deleted; no timer (the user was asked; recommendation given: none now).
6. A run that belongs to no Task (15 on the user's machine, started 2026-08 to 2026-10) keeps its entry for good.
7. All three kinds of top run: standalone agent runs, team runs, org runs.
8. A startup migration removes the entries of closed Tasks that are there today (Data Migration Guideline); nothing else of those runs changes.

**What must keep working** (each reads closed entries today and needs the Task's records as its source; the designer verifies each in the code):
- continuing a closed run after its Task was reopened (the assigner's message by run ID), and `delegate_task` with a run's ID for a follow-up Task: the run is found through the Task's records by its entry agent (an agent run's ID; a team's coordinator);
- the top run's token total (it adds every run below it) and the files attached in earlier conversations (their stored locators): "every run that ever worked below this run" = the Task's records (the runs its agents assigned, and their sub-work) together with the kept entries of rule 6. Measured: the Task's records alone miss exactly the 15 runs of rule 6 and 1 run assigned by an agent of one of them;
- the Task page's run status and locator; the tree hiding nothing it shows today; the Memory page (to check: it lists a delegated run only while its top run lists it, so closed runs could disappear from it).

**Out of scope.** Removing the hosting of delegated runs, Stop of the manager, the stored back-link's shape and message routes: these are `autobyteus-461`, which continues afterwards. A timer for temporary Tasks.

**Done when.** On an isolated instance: an agent delegates a Task, the Task is closed, and the run is no longer in the delegating run's tree file; reopening the Task and messaging the run continues it and lists it again; a follow-up Task by run ID works; the top run's token total is unchanged by a closure; an earlier attachment of a closed run still opens; an instance started on data with closed entries drops them and starts normally. Finalized on the base branch (release separately, on the user's word).

**Reference material** (in the 461 worktree, branch `codex/delegated-copies-outlive-delegator-461`, not pushed):
- `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/target-collaboration-contract.md` (§11, §12)
- `…/investigation-notes.md` (how the tree, the index, the Task side and the location service work today; the measurements)
- `…/evidence/data-model-validation/task-record-validation-2026-11-10.txt` and `validate_task_record_as_lasting_record.py` (the read-only check of the rules on the stored data)
- `…/design-review-report.md` (AR-001 and AR-003 describe the Task-side and location-service duties that matter here too)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`, branch `codex/delegated-copies-outlive-delegator-461`, base `origin/personal` at `aae0a53a81d136c733580841e16669961665a762`. Documents and read-only scripts only; nothing pushed.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/`

## Follow-ups

Not sent now: `autobyteus-461` has not left the team (it waits). `follow-ups.md` holds FU-002 (two oversized files) and FU-003 … FU-005 (team runs, org runs, removal of the remaining hosting code), which depend on how 461 continues; FU-001 is withdrawn.

## Route applied

`get_handoff_rules` (2026-11-10): no rule for a blocked result; the result goes to the agent that delegated the Task, `/project_task_manager`.
