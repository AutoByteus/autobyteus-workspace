# Collaboration Model

The canonical model for how agents work together in AutoByteus: what a run is,
who may message whom, who may delegate to whom, how Tasks own delegated work,
who coordinates a delegated run, and where each run's memory and messages are
stored. Read it before designing or reviewing any change to teams, Orgs,
standalone collaboration, `send_message_to`, `delegate_task`, Project Tasks,
run storage or messaging.

This document holds the model and its reasons. The module docs hold the
mechanics and link here; when a module doc and this model disagree, the model
is the intended contract and the difference is listed in
[Current State Versus Target](#current-state-versus-target).

## 1. Vocabulary

- **Run**: one live or stored execution with its own identity and its own
  storage: a standalone Agent run, a Team run, an Org run, or a delegated run
  (below).
- **Unit**: something work can be handed to: an **Agent** or a **Team**.
- **Team**: a unit made of member agents (and, in Orgs, mounted Teams). Its
  members are *parts* of one Team run, not runs of their own.
- **Org**: a container of independent units (direct agents and mounted Teams).
  An Org is not a unit: nothing delegates to an Org.
- **Standing instance**: the single instance at an address inside a run: a
  Team's member, an Org's direct agent or mounted Team, a standalone run's own
  agent, or a collaborator.
- **Collaborator**: a shared catalog Agent or Team brought into a run by the
  first `send_message_to` to its catalog address. It becomes a standing
  instance of that run.
- **Delegated run (copy)**: a new, independent Agent or Team run started by
  `delegate_task` to do one Task's work.
- **Coordinating run**: the run whose agent started a delegated run (directly
  or through a member). It coordinates the delegated run's lifecycle.

## 2. Two Relationships, Nothing Else

Agents relate to each other in exactly two ways.

### 2.1 Membership: being part of a run

Members of one Team, the units of one Org, a standalone run's own agent and
the run's collaborators are all parts of one run. They work together only by
**messages** (`send_message_to`, guided by the run's handoff rules).

### 2.2 Delegation: handing work to an independent run

`delegate_task` hands one Task's work to an **independent** unit. It starts a
new delegated run (a copy) of that Agent or Team, or gives a new Task to an
existing delegated run by its run ID. The delegated run is a peer, not a part:
it has its own identity, memory and messages.

### 2.3 Rules

| Rule | Statement | Why |
| --- | --- | --- |
| CM-1 | Inside your own Team you never delegate. You may not `delegate_task` to yourself, to a teammate, or to your own Team. Use `send_message_to`. | The Team run already exists with one instance of every member; a copy of a teammate would only duplicate what you can already message. |
| CM-2 | Everything else is delegation to an independent unit: a sibling Agent or Team in the same Org, a collaborator, or any catalog Agent or Team. It always creates or reuses an independent delegated run. | Independent units do their own work in their own run; the Task records the assignment. |
| CM-3 | An Org is a container, not a team. Its direct agents and mounted Teams are independent units: they may message each other's standing instances and may delegate to each other (e.g. a Project Task Manager in an Org delegates to the Org's software engineering Team). Inside one mounted Team, CM-1 applies. | Orgs exist to put independent units, such as a Project Task Manager and several Teams, under one roof. |
| CM-4 | `send_message_to(recipient_address)` reaches the **standing instance** at that address (inside your own Team instance first). A delegated run is reached only by its run ID (`target_agent_run_id`; a Team's coordinator run ID). | An address names a place in the run; a copy is an extra run, so only its own ID names it unambiguously. |
| CM-5 | After delegation, delegator and delegated run talk only through `send_message_to` with run IDs, in both directions. The work packet is delivered once by `delegate_task`. | No duplicate assignments; no hidden submission/review protocol. |
| CM-6 | Every delegated run belongs to exactly one current Task (a Project Task, the creator's Task for sub-work, or an ad-hoc Task). Closing that Task (DONE or CANCELLED) stops its delegated runs; reopening alone starts nothing. | Work is tracked and ended by its Task, not by guessing from the tree. |
| CM-7 | The coordinating run coordinates its delegated runs' lifecycle: idle shutdown, wake-on-message, stop on Task closure, reactivation by the assigner. Only senders in the same coordinating run can wake a delegated run. | One owner decides when delegated work sleeps and wakes. |
| CM-8 | A delegated run never becomes a part of its coordinating run. The coordinating run keeps only **links** (which runs it delegated to, for which Task) and coordination data, never the delegated run's memory. | Ownership: a run owns its own content; the coordinator owns the relationship. |
| CM-9 | Messages are stored with the run(s) they belong to: a message between parts of one run is stored once, in that run's message log; a message between two runs is stored in both runs' logs (sent in the sender's, received in the receiver's), with one message ID. Each agent's own memory additionally records what it sent and received. | Every run is self-contained, and the same shape works when the two runs are on different nodes (email model). |

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

- A Team's members, an Org's units and a run's collaborators live inside that
  run's folder (they are parts of it).
- A delegated run lives in its own folder at the standard place for its kind,
  wherever its delegator sits, and carries a back-link naming its kind and its
  coordinating run.
- The coordinating run's folder holds its own memory, its parts, its execution
  tree (including the links to its delegated runs) and its message log.

Storage details and file names are owned by
[Agent Memory](../modules/agent_memory.md) and the run modules.

## 4. Cross-Node Direction

The model is designed so that a delegated run or a message recipient can later
live on another node: a delegated run owns its own storage (CM-8), messages
between runs are recorded independently on each side (CM-9), and the
coordinating run relates to its delegated runs through links. Cross-node work
will add transport, remote addresses, delivery status and attachment transfer
(today `reference_files` are local paths), and will make delegated runs
independently hosted runtimes controlled through the link.

## 5. Current State Versus Target

Status as of 2026-10-15 (`origin/personal` 907c861ff4). Update this table when
a change lands.

| Item | Status | Notes |
| --- | --- | --- |
| CM-2, CM-4, CM-5, CM-6, CM-7 | Holds | See module docs below. |
| CM-3 Org siblings may delegate to each other | Holds | Delegating to an Org-level placement starts a copy at the Org root. |
| CM-1 No delegation inside your own Team | **Not enforced** | Only self-delegation is refused (`COLLABORATION_SELF_TARGET_REJECTED`). Delegating to a teammate address currently starts a "teammate copy" hosted inside the Team instance (`task-copy-host.ts`, REQ-012); two such copies exist in released data. Enforcement and tool/prompt wording are pending. |
| CM-8 Delegated run memory in its own folder | **Target** — ticket `delegated-copy-own-run-memory` | Today a delegated run's memory is stored inside the coordinating run's folder (`agents/<host>/collaboration/<copy>/`, or inside the Team/Org root folder). |
| CM-9 Per-run message logs | **Target** — ticket `delegated-copy-own-run-memory` | Today each collaboration root keeps one message log for every message in its whole tree, including messages inside its delegated Team runs. Each agent's own raw traces already record sent and received messages. |
| CM-7 by link instead of hosting | **Later** (cross-node) | Today the coordinating run hosts its delegated runs' runtimes in its own process, and nested delegations are recorded in the topmost coordinating run's tree. |

## 6. Where The Mechanics Live

- Messaging and address resolution, collaborators, Task-linked message scope:
  [Agent Communication](../modules/agent_communication.md).
- Delegation in Team runs, delegated child lifecycle (idle shutdown, wake,
  status): [Agent Team Execution](../modules/agent_team_execution.md#server-owned-task-delegation).
- Org runs: [AgentOrg](../modules/agent_orgs.md).
- Standalone Agent runs that collaborate:
  [Standalone Agent Run Root](../modules/standalone_agent_run_root.md).
- Task ownership of delegated runs, DONE/CANCELLED, reactivation:
  [Projects](../modules/projects.md#saved-id-delegation-and-agent-run-resources).
- Storage layout: [Agent Memory](../modules/agent_memory.md).
