# Adoption Contract — Giving A Task To A Run The User Started

Status: **draft for the user's read** (2026-10-18). Consolidates the approved behavior of SR-003 … SR-016
(requirements-doc REQ-001 … REQ-008, DEC-101 … DEC-114) into one place, with every case and its outcome. Where this file
and the design differ, this file states the intended behavior and the design is corrected. Task `autobyteus-11`.

## 1. Vocabulary

- **Delegator (D)**: the run calling `delegate_task` (today: a standalone agent run, e.g. the Project Task Manager).
- **Adopted run (T)**: a run the user started by hand — a standalone agent run or a team run — given a Task by D.
- **Adopted Task (X)**: the Project Task D gives to T.
- **Chain (C)**: every run T or its members delegated, at any depth. Because T was the topmost run of its own chain
  (CM-7), all of them are linked in T's own tree.
- **Board Task**: a Project Task (on the board). **Temp Task**: the Task-with-no-Project a description-only delegation
  creates. **Sub-work**: a `delegated` entry of a Task (work a Task's worker delegated).
- **Natural chain**: the state the same runs would have if D had delegated T itself and T had then delegated its work.

## 2. The principle

**After adoption, everything that drives behavior equals the natural chain** (DEC-111): where each run is linked and by
whom, who coordinates and hosts it, whether it is open or closed, and — for every run that is still open — which Task it
belongs to (so it closes with the right Task). History records keep what really happened: a *finished* run stays closed
on its old temp Task (a natural chain would show it closed as sub-work of X; both are closed and shown closed under D);
the one history field adoption changes is the board worker's current `assignedBy` (§4).

## 3. How it is triggered

`delegate_task {target_team_run_id | target_agent_run_id, task_id}` — the existing existing-run mode, unchanged input.
When the named run is not one of D's delegated runs, D's root asks the adoption owner. The user gives D the run id or D
finds it. No new tool (SR-005).

## 4. What happens to each run

| Run | Class | Outcome (equals the natural chain) |
| --- | --- | --- |
| T | — | D's task agent for X: linked in D's tree (delegator D, assigner D, host D), its own file gains the `taskAgent` section (team: addresses rebased to the catalog address, reversibly), its history row leaves its group; it receives X as its next message |
| X in C whose current entry is open (on a temp Task) | *ongoing* | becomes open sub-work of X (host D); its temp-Task entry closes; its temp Task becomes CANCELLED once all its runs moved; closes with X |
| X in C whose current entry is closed (on a temp Task) | *finished* | stays closed; re-hosted to D; shown closed under D |
| X in C with no Task entry (converted collaborator, pre-Task copy) | *unowned* | becomes open sub-work of X (host D); closes with X |
| X in C whose current entry is `assigned` in a board Task K | *board worker* | becomes D's own assignment for K: delegator D, assigner D (current entry `assignedBy` → D), host D; current Task stays K; not stopped when X closes; D can give it follow-ups or reactivate it after reopening K; it and T no longer message each other (different Tasks) |
| X in C whose current entry is `delegated` sub-work of a board Task K | *board sub-work* | stays K's sub-work; keeps its delegator (the run that made it); re-hosted to D |

Every chain run: own file's coordinator → D; link moved from T's tree to D's tree (same delegator except the board
worker, same `startedAt`); messages untouched (per-run logs keyed by run id).

**Classification** (V-4): from each run's **own entry state before any Task-side write of this adoption** — board if its
current entry is in a board Task; else unowned if it has no entry; else ongoing if its current entry is open, finished if
closed. A retry recognizes this adoption's own writes (an open `delegated` entry in X hosted by D) and continues; it never
reclassifies a run from a partly written state. (Not from the temp Task's status, which can be stale after a failed DONE
write — a closed run would otherwise be reopened.)

**An adopted agent run that was a hub** (it delegated runs itself, e.g. another PM): its messages with its chain are in
its hub log (`agents/<T>/collaboration/communication_messages.json`), while a task agent's own log is
`agents/<T>/communication_messages.json` (8641c0ac §2). After the commit point the hub log's entries are merged into T's
own log (union by `messageId`, existing kept); the hub log file is kept (V-2). A team T keeps its one team log (same
file either way).

## 5. When adoption is refused (nothing changes; the reason is returned to D)

| # | Case | Reason given |
| --- | --- | --- |
| R1 | T is in another workspace than D | another workspace; it stays where it is |
| R2 | T or any run in C is running a turn | busy; try again when idle |
| R3 | T is archived | unarchive it first |
| R4 | T is bound to an application | application run |
| R5 | T's definition is no longer in the catalog | no address to place it under |
| R6 | T is an organization run, or a team member passed as an agent run | the right id to use / not supported |
| R7 | T already belongs to a Task (not an adoption in progress by D for X) | already a task agent |
| R8 | a run in C is hosted outside T's run | foreign host |
| R9 | X is closed, unknown, or a Task with no Project | the Task's reason |
| R10 | D is owned by a Task | task agents can't use task_id |
| R11 | D is not a standalone agent run | not supported yet |
| R12 | T is D itself | can't delegate to yourself |

## 6. Order, commit point and recovery

1. **Before the commit point** (reversible only): Task entry for T `starting`; T's own session released; per chain run:
   own file's coordinator → D, link appended to D's tree file (original delegator), removed from T's tree; then T's own
   file (`taskAgent`; team rebase), then **T's link in D's tree = the commit point**.
2. **After the commit point** (forward only): T's history row removed; all Task-side writes per class (§4); the
   activation commit (D's root loads the chain links; the board worker's delegator → D); the work message to T;
   `started`; last, the temp-Task cancels.
3. **Interrupted before the commit point:** D's retry continues; if X is closed or deleted (or its Project) first, the
   **revert** returns T and every chain run exactly as they were (own files, links, T's file and history row). No
   Task-side write exists yet, so nothing else is undone.
4. **Interrupted after the commit point:** the adoption is **always completed**, never reverted —
   `completeCommitted(D)` runs on D's retry, on D's root load, and before X's DONE / CANCELLED / Task delete / Project
   delete proceeds.
5. Every step is recognized from the files, so retries are idempotent.
6. **No limbo** (V-5): D's root, on every load, resumes **any** in-progress adoption it hosts — before or after the
   commit point — to completion (the chain is idle at load). A revert happens only when X is closed or deleted before
   the commit point. So T is never left half handed over just because D did not retry.
7. **T's own session stays closed during a handover** (V-3): while an adoption of T is in progress (an open `starting`
   assignment of T hosted by D), T's own standalone or team-run session refuses to start ("this run is being given a
   Task; try again shortly"); after the commit point T is a task agent and is reached under D only.

## 7. What the user sees

- T leaves its own group in the sidebar (immediately when D's run is open, otherwise at the next history read) and
  appears under D with its Task line, its chain under it (finished runs closed).
- The board shows T as X's worker with live status; a board worker still shows as its board Task's worker (assigner D).
- X DONE / CANCELLED: T and its ongoing / unowned chain stop and leave the sidebar; board workers keep running.
- X reopened + D's message: T is reactivated.
- Memory page Teams list: an adopted team leaves it (like every delegated team); memory kept.
- An adopted team's members may still use old `/`-relative addresses; they get guidance to the new ones.

## 8. Out of scope

Other workspaces (with Task 6fb6e21b); delegators that are team members or organization agents.

## 9. Validation

Each case is walked against the Task rules and the code (file references in investigation notes and design) and must be
proven by a test (TESTING.md: hand-built data, never the user's data). Results are recorded below.

| Case | Walk-through | Result |
| --- | --- | --- |
| V-1 Plain agent run, no chain | link in D's tree (delegator / assigner / host D), own file `taskAgent`, assigned entry in X by D, history row gone, Task message delivered — as if D had delegated it | Holds |
| V-1b Plain team run, no chain | same; addresses rebased `/` → catalog address; `teamDefinitionName`, roles kept until a later save | Holds |
| V-2 Agent run that was a hub (another PM, 3 agent runs in the data) | its chain messages sit in its hub log, not in a task agent's own log → views of T would miss them | **Fixed**: hub log merged into T's own log after the commit point (§4) |
| V-3 User messages T (or the UI's open context) during the handover | before the commit point T's own session could be restarted beside the adoption | **Fixed**: T's own session refuses to start while an adoption of T is in progress (§6.7) |
| V-4 Ongoing / finished classification | temp Task status can be stale (a failed DONE status write leaves closed entries in an open Task) → a closed helper would be reopened as sub-work | **Fixed**: classify from the run's own entry state; recognize this adoption's own writes (§4) |
| V-5 Adoption started, D never retries, X stays open | T would stay unstartable on its own and not under D indefinitely | **Fixed**: D's root load resumes any in-progress adoption (§6.6) |
| V-6 Work Journal shape: team, SD delegated a finished PM helper (temp Task) | helper *finished*: re-hosted, linked under D (delegator SD), shown closed; T under D | Holds |
| V-7 Team with an ongoing helper, and the helper's own sub-work in its temp Task | both *ongoing* (entries open): open sub-work of X; temp Task cancelled last with an empty release set | Holds |
| V-8 Unowned chain run (converted collaborator) | open sub-work of X, closes with X | Holds |
| V-9 Board worker X1 (assigned K by T's SD) with sub-work X2 | X1: D's assignment for K (delegator, assigner, host D), not stopped by X's close, follow-up / reactivation by D; X2: K's sub-work, delegator X1, host D; X1 and T no longer message each other | Holds |
| V-10 Adopting another PM run (board workers and helpers) | board workers pass to D; helpers by class; PM-B is D's task agent for X; hub log merged (V-2) | Holds (with V-2) |
| V-11 Nested chain depth (chain runs' members delegated) | all linked in T's tree (CM-7); moved with their delegators; activated in one commit with their delegators present | Holds |
| V-12 Interrupted before the commit point, then X DONE / deleted / Project deleted | revert returns T and every chain run as they were; no Task-side write to undo | Holds |
| V-13 Interrupted after the commit point, then X closed / deleted, or a restart | completion runs first (close / delete paths, load) → natural-chain end state | Holds |
| V-14 Two delegators adopt the same T at once | the run's serialization on the Task side admits one; the other sees an adoption in progress by someone else → R7 | Holds |
| V-15 Refusals R1–R12 | each before any write; nothing changes | Holds |
| V-16 X closed later, board Task K closed later | X: T and ongoing / unowned chain stop and leave; K: its worker stops via D's root (host D) | Holds |
| V-17 D (the coordinating run) deleted after adoption | 8641c0ac §10: task agents kept, detached | Holds (existing rule) |
| V-18 Memory Sync export after adoption | T and its chain export as task agents' own runs | Holds (existing rule) |

Validation found V-2 … V-5; the design is updated accordingly (SR-017) and goes to a targeted architecture review. The
user reads this contract before implementation continues.

