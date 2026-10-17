# Proposed Task: Make collaboration follow one simple model (delegate outside, message inside)

Proposed by `/software_engineering_team/solution_designer` (team run
`software_engineering_team_8f12b12a8e8843788b9357e7121b3909`), agreed with the
user in the Solution Designer's conversation on 2026-10-15. The user asked the
Project Task Manager to create this Task and assign it to this same Software
Engineering Team copy, and to do it **before** continuing the memory-structure
refactor Task ("a delegated copy's memory follows the normal structure"), which
is paused until this Task is done.

## Problem

There is no single written collaboration contract, and the runtime allows more
ways to involve other agents than the model the user wants:

- **Delegation inside a team is possible.** A team member can `delegate_task` to
  a teammate's address; this starts an extra "teammate copy" hosted inside the
  team (`agent-collaboration/execution/task/task-copy-host.ts`). Only
  self-delegation is refused. Two such copies exist in the user's data
  (`evidence_driven_delivery_team` → `/investigator`, Aug 2026;
  `article_writing_team` → `/article_reviewer`, Sep 2026).
- **`send_message_to` can create runs.** A message to a catalog address that is
  not in the run brings in a **collaborator** (a standing instance added to the
  run), or, for an agent working on a Task, starts a **helper copy** owned by
  that Task (`broughtIn`). So outside units can join a run in three ways.
  Collaborators belong to no Task, are never closed by DONE, and collaborator
  Teams have no idle shutdown. The user's data has 2 collaborators against 75
  delegated copies.
- The model is spread over five module docs, and one of them
  (`agent_team_execution.md`) documents teammate copies as normal.

## The model the user wants (direction)

- **Inside your run, you message.** Members of one team, the units of one Org,
  a standalone run's own agent: `send_message_to` by address. You never
  `delegate_task` to yourself, a teammate, or your own team — the team run
  already has one instance of every member.
- **Outside your run, you delegate first, then message.** `delegate_task` to an
  independent Agent or Team (a sibling Agent/Team in the same Org counts as
  independent; an Org is a container of independent units, e.g. a Project Task
  Manager in an Org delegating to the Org's software engineering team). Then
  talk to the copy with `send_message_to` by its run ID; reuse it with a
  follow-up Task by its ID.
- **Messaging never creates anything.** An address that is not in the run is
  "not found — use `delegate_task`". Collaborators and helper copies go away.
- **One canonical document** holds the model and its reasons; module docs keep
  the mechanics and link to it; `DESIGN.md` lists it as a required design
  document.

## Scope

1. Publish `autobyteus-server-ts/docs/design/collaboration_model.md` as the
   canonical contract and consolidate the module docs around it. A draft and a
   consolidation patch already exist (see Context files); they predate the
   "messaging never creates anything" decision and three clarifications the
   Solution Designer will apply (nested coordinating run; run IDs required only
   toward a copy; collaborators removed).
2. `delegate_task` refuses yourself, a teammate, or your own team, in Team,
   Org and standalone runs, with a message pointing to `send_message_to`; tool
   descriptions and prompts say the same.
3. Remove collaborators and helper copies: `send_message_to` to an address not
   in the run returns not found with guidance to use `delegate_task`.
4. Decide with the user what happens to existing data: the 2 collaborators and
   2 teammate copies (keep readable as history, or convert to delegated runs).
   No data loss.

## Constraints

- No change to how delegated copies are stored (that is the paused memory Task).
- Keep restore/reopen of existing runs, Task DONE/reopen/reactivation, idle
  shutdown and wake-up, status colours, Settings, Token Meter and the Task
  locator working.
- Related: 17bfe0fe (agent input delivery cleanup, same code area).

## Done when

- The canonical model document is published and the module docs and `DESIGN.md`
  point to it.
- `delegate_task` refuses delegation inside your own team; messaging never
  creates a run; collaborators and helper copies are gone from the runtime.
- Existing runs with collaborators or teammate copies still open as decided.
- Tests, a beta release, and the user's check in the app.

## Then

Resume the paused memory-structure Task with this same team copy. Its artifacts
are kept in worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory`
(branch `codex/delegated-copy-own-run-memory`), ticket folder
`tickets/in-progress/delegated-copy-own-run-memory/`. On resume, the Solution
Designer records the user's email-model decision for message logs and revises
the design on the simplified model.
