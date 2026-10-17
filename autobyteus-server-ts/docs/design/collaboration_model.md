# Collaboration Model

The canonical model for how agents work together in AutoByteus: what a run is,
who may message whom, who may delegate to whom, how Tasks own delegated work,
who coordinates a delegated run, and where each run's memory and messages are
stored. Read it before designing or reviewing any change to teams, Orgs,
standalone collaboration, `send_message_to`, `delegate_task`, Tasks, run
storage or messaging.

This document holds the model and its reasons. The module docs hold the
mechanics and link here. Where the code does not yet match the model, the gap is
listed in [Current State Versus Target](#5-current-state-versus-target).

## 1. Vocabulary

- **Run**: one live or stored execution with its own identity: a standalone
  Agent run, a Team run, an Org run, or a delegated run.
- **Unit**: something work can be handed to: an **Agent** or a **Team**.
- **Team**: a unit made of member agents. Its members are *parts* of one Team
  run, not runs of their own.
- **Org**: a container of independent units (direct agents and mounted Teams).
  An Org is not a unit: nothing delegates to an Org.
- **Standing instance**: the single instance at an address inside a run: a
  Team's member, an Org's direct agent or mounted Team, or a standalone run's
  own agent.
- **Delegated run (copy)**: an independent Agent or Team run started by
  `delegate_task` to do one Task's work.
- **Coordinating run**: the run that records and coordinates a delegated run
  (see CM-7 for nested delegation).

These are the engineer-facing terms. The words an agent reads in its prompt, tool
descriptions and refusal texts ("task agent", "task agent team", "run id") are
owned by the collaboration wording authority; see
[Prompt Engineering](../modules/prompt_engineering.md#collaboration-sections-by-role).

## 2. Two Relationships, Nothing Else

Agents relate to each other in exactly two ways.

### 2.1 Membership: being part of a run

The members of one Team, the units of one Org and a standalone run's own agent
are parts of one run. They work together only by **messages**
(`send_message_to`, guided by the run's handoff rules).

### 2.2 Delegation: handing work to an independent run

`delegate_task` hands one Task's work to an **independent** unit. It starts a
new delegated run of that Agent or Team, or gives a saved Task to an existing
delegated run by its run ID. A delegated run is a peer, not a part: it has its
own identity, conversation and memory.

**Inside your run you message; outside your run you delegate first, then
message the delegated run by its run ID.**

### 2.3 Rules

| Rule | Statement | Why |
| --- | --- | --- |
| CM-1 | You never delegate inside your own Team: `delegate_task` to yourself, a teammate, or your own Team is refused and points to `send_message_to`. "Inside your own Team" means any address inside a Team instance that contains you, at any depth (exactly what `send_message_to` resolves within it), and, for a configured member of a Team run's root Team, every configured placement of that Team. | The Team run already exists with one instance of every member; a copy would only duplicate what you can already message. |
| CM-2 | Every other delegation target is an independent unit: a sibling Agent or Team in the same Org, an Agent or Team placed elsewhere in the run, or any catalog Agent or Team. Delegation always starts (or reuses, by run ID) an independent delegated run. | Independent units do their own work in their own run. |
| CM-3 | An Org is a container, not a Team. Its direct agents and mounted Teams are independent units: they message each other's standing instances and may delegate to each other (for example a Project Task Manager in an Org delegates to the Org's software engineering Team). Inside one mounted Team, CM-1 applies. | Orgs exist to put independent units under one roof. |
| CM-4 | `send_message_to(recipient_address)` reaches the **standing instance** at that address, inside your own Team instance first. It **never creates a run**: an address that is not a standing instance of your run is not found, with guidance to use `delegate_task`. | One way to create runs (delegation), one way to talk (messages). |
| CM-5 | A delegated run has no address of its own: it is reached only by its run ID (`target_agent_run_id`; a Team's coordinator run ID), in both directions. Members of a delegated run may also message the coordinating run's standing instances by address. The work packet is delivered once, by `delegate_task`. | An address names a place in a run; a copy is an extra run, so only its ID names it unambiguously. |
| CM-6 | Every delegated run belongs to one current Task: a Project Task (delegated by its key or ID), the delegator's own Task (sub-work), or a Task with no Project created by a description-only delegation (a temp Task). Closing the Task (DONE or CANCELLED, with `update_task`) stops its delegated runs. Closing is optional: an agent without `update_task` never has to close anything, and a quiet delegated run is shut down after the idle grace period anyway. | Work is tracked and can be ended by its Task, without making every agent manage Tasks. |
| CM-7 | The coordinating run coordinates its delegated runs' lifecycle: idle shutdown, wake-on-message, stop on Task closure, reactivation by the assigner. Only senders in the same coordinating run can wake a delegated run. Today the topmost run of a delegation chain is the coordinating run for every delegated run in it, including runs delegated by members of a delegated run. | One owner decides when delegated work sleeps and wakes. |
| CM-8 | A delegated run never becomes a part of its coordinating run. The coordinating run keeps **links** (which runs it delegated to, for which Task) and coordination data, not the delegated run's content. | A run owns its own content; the coordinator owns the relationship. |
| CM-9 | A message is stored with the run(s) it belongs to: between parts of one run, once, in that run's message log; between two runs, in both runs' logs (sent and received), with one message ID. Each agent's own memory also records what it sent and received. | Every run is self-contained, and the same shape works when two runs are on different nodes (email model). |

Task tools are configured, not automatic: an agent gets `create_task`
(creates a Project Task) and/or `update_task` (updates, closes or reopens a Task)
only when its configuration selects them. `send_message_to` and `delegate_task`
are given to every collaborating agent.

## 3. Run Storage Shape

Every run has the same shape: its own folder, its own memory (raw traces,
snapshots, file changes, context files) and its own message log. A delegated
run is a run like any other, plus a back-link to its coordinating run.

```text
memory/
  agents/<agentRunId>/              # a standalone Agent run, or a delegated Agent run
  agent_teams/<teamRunId>/          # a Team run, or a delegated Team run; members inside
  agent_orgs/<orgRunId>/            # an Org run; its direct agents and mounted Teams inside
```

- A Team's members and an Org's units live inside that run's folder (they are
  parts of it).
- A delegated run lives in its own folder at the standard place for its kind,
  wherever its delegator sits; its own run file (`run_metadata.json` or a team
  tree) carries a `taskAgent` section naming its coordinating run.
- The coordinating run's folder holds its own memory, its parts, its execution
  tree (including the links to its delegated runs) and its message log.

File names and layout mechanics are owned by
[Agent Memory](../modules/agent_memory.md) and the run modules.

## 4. Cross-Node Direction

The model is designed so that a delegated run or a message recipient can later
live on another node: a delegated run owns its own storage (CM-8), messages
between runs are recorded independently on each side (CM-9), and the
coordinating run relates to its delegated runs through links. Cross-node work
will add transport, remote addresses, delivery status and attachment transfer
(today `reference_files` are local paths), and will host delegated runs as
independent runtimes controlled through the link.

## 5. Current State Versus Target

Status as of the change that published this document (Task 259ddae7,
`collaboration-model-contract`). Update this table when a change lands.

| Item | Status | Notes |
| --- | --- | --- |
| CM-1 … CM-7 | Holds | Since `collaboration-model-contract`: teammate delegation is refused; `send_message_to` no longer brings in collaborators or Task helper copies; stored collaborators were converted into delegated runs. Delegated runs made of a teammate before that change remain ordinary delegated runs. |
| CM-6 exception: unowned delegated runs | Holds as stored history | Delegated runs recorded before Task ownership existed, and collaborators converted into delegated runs, belong to no Task. They behave like any delegated run (sleep, wake by run ID, stop by the user) but are not closed by a Task. New delegations always belong to a Task. |
| Task tools configured, not automatic | Holds | Since `task-tool-split` (`create_task`, `update_task`). |
| CM-8 Delegated run memory in its own folder | Holds | Since `delegated-copy-own-run-memory` (Task 8641c0ac): a task agent is a run of its own (`agents/<id>/` or `agent_teams/<id>/`) with its own file (a `taskAgent` section); the coordinating run's tree keeps links; deleting a coordinating run keeps its task agents' folders. Startup migration `20261017_task_agent_own_run_v1` moved existing data. |
| CM-9 Per-run message logs | Holds | Since `delegated-copy-own-run-memory`: a message between parts of one run is stored once in that run's log; a message between two runs in both logs (receiver's first) with one message ID. The coordinating log keeps its older entries; the migration gave each task agent its own log. |
| CM-7 through links instead of hosting | **Later** (cross-node) | Today the coordinating run hosts its delegated runs' runtimes in its own process, and nested delegations are recorded in the topmost coordinating run's tree. |

## 6. Where The Mechanics Live

- Messaging, address resolution, Task-linked message scope:
  [Agent Communication](../modules/agent_communication.md).
- Delegation in Team runs, delegated child lifecycle (idle shutdown, wake,
  status): [Agent Team Execution](../modules/agent_team_execution.md#server-owned-task-delegation).
- Org runs: [AgentOrg](../modules/agent_orgs.md).
- Standalone Agent runs that collaborate:
  [Standalone Agent Run Root](../modules/standalone_agent_run_root.md).
- Task ownership of delegated runs, DONE/CANCELLED, reactivation, temp Tasks:
  [Projects](../modules/projects.md).
- Storage layout: [Agent Memory](../modules/agent_memory.md).
