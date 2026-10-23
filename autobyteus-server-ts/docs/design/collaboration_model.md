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
- **Node**: one AutoByteus server (the desktop's embedded server, a remote or
  Docker server), identified by its stable server ID (`serverInstanceId`).
- **Peer**: another node that this node's owner registered for remote
  collaboration. Its name is this owner's local label for it.
- **Remote delegated run**: a delegated run that runs on a peer. It is a run
  of the node that runs it.
- **Link**: what the two nodes keep of a remote delegated run. On the
  delegating node, the coordinating run's record of it; on the node that runs
  it, its back-link to its coordinating run.

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
| CM-6 | Every delegated run belongs to one current Task: a Project Task (delegated by its key or ID), the delegator's own Task (sub-work), or a Task with no Project created by a description-only delegation (a temp Task). Closing the Task (DONE or CANCELLED, with `update_task`) stops its delegated runs; closing a Project Task that has parts also closes its open parts the same way, and so their delegated runs. Closing is optional: an agent without `update_task` never has to close anything, and a quiet delegated run is shut down after the idle grace period anyway. | Work is tracked and can be ended by its Task, without making every agent manage Tasks. |
| CM-7 | The coordinating run coordinates its delegated runs' lifecycle: idle shutdown, wake-on-message, stop on Task closure, reactivation by the assigner. Only senders in the same coordinating run can wake a delegated run. Today the topmost run of a delegation chain is the coordinating run for every delegated run in it, including runs delegated by members of a delegated run. | One owner decides when delegated work sleeps and wakes. |
| CM-8 | A delegated run never becomes a part of its coordinating run. The coordinating run keeps **links** (which runs it delegated to, for which Task) and coordination data, not the delegated run's content. | A run owns its own content; the coordinator owns the relationship. |
| CM-9 | A message is stored with the run(s) it belongs to: between parts of one run, once, in that run's message log; between two runs, in both runs' logs (sent and received), with one message ID. Each agent's own memory also records what it sent and received. | Every run is self-contained, and the same shape works when two runs are on different nodes (email model). |
| CM-10 | A delegated run may run on a peer node. The agent names the node only when it delegates (`delegate_task` with `node`); without `node` the target is on its own node. The node that runs a delegated run owns it: runtime, memory, message log and lifecycle (idle shutdown, wake on message, stop). The delegating node keeps only the link (peer, run ID, delegator; for an Agent Team also its coordinator's address and its members' addresses and run IDs), recorded by the topmost coordinating run (CM-7, CM-8), and the run's Task (CM-6). No node hosts or reads another node's run. | Each node is authoritative for its own runs (federation); a link is enough to coordinate. |
| CM-11 | Across nodes, a remote delegated run and the run that delegated it message each other by run ID only (CM-5), in both directions; the link routes the run ID, so follow-ups never name the node. For a remote Agent Team, every member is reachable this way, the coordinator included, and a member that is idle or never started is woken first, as with a local Team copy; the delegation result names the team run and its coordinator. Every message names the root that receives it on the other node. No other run is reachable across nodes. Each side stores the message in its own run's log with the shared message ID (CM-9). Results and message headers name the other run's node, so an agent always knows when a run is remote. The delegating node also shows a remote delegated run as a child of its delegator's root, as it shows a local copy: it reads the run's title, statuses and stored conversation from the run's node, follows its live output over a stream while someone is viewing, and passes its owner's messages, interrupts and terminate to it through the link; the run's node answers only for runs that node's delegation started (since autobyteus-278). | One way to name a run on every node; the agent copies the run ID it was given. |
| CM-12 | A node accepts requests from other nodes only while its owner has remote collaboration on, only from registered peers, and offers them every shared Agent and Agent Team of the node, at the same catalog addresses as a local catalog copy. A remote run starts with each agent's own default runtime and model (a Team member without one uses the Team's default), in the node's temp workspace, with tool calls auto-approved for every agent; a target with an agent no default covers is refused. No credential travels between nodes; a remote run uses its own node's models, tools, credentials and workspace. When a registered peer asks, the node says whether it takes that peer's requests now, and lists the Agents and Agent Teams it offers: name, kind, catalog address and description only, never definitions, prompts or settings; nothing is cached (since autobyteus-261). Every inbound request kind enters through one entry point, where peer authentication is added later. | The receiving owner turns it on and chooses the peers; each target's own defaults decide how it runs, with no per-agent setup; security is added in one place. |

Task tools are configured, not automatic: an agent gets `create_task`
(creates a Project Task) and/or `update_task` (updates, closes or reopens a Task)
only when its configuration selects them. `send_message_to` and `delegate_task`
are given to every collaborating agent.

## 3. Run Storage Shape

Every run has the same shape: its own folder, its own memory (raw traces,
snapshots, file changes, context files, the Work Journal rendered from its raw
traces) and its own message log. A delegated
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

A remote delegated run (CM-10) is split over two nodes. Each side names the
other by node and run:

```text
delegating node                                      node that runs it
memory/<kind>/<coordinatingRunId>/
  <tree>: taskExecutions
    Agent: {address, agentRunId, nodeId,               memory/agents/<remoteRunId>/      # a standalone run
            delegatorAgentRunId, startedAt}              run_metadata.json: delegatedFrom {nodeId,
                                                           coordinatingRun, delegatorAgentRunId}
    Team:  {address, teamRunId, nodeId,                memory/agent_teams/<teamRunId>/   # a top-level Team run
            coordinatorAddress,                          team_run_execution_tree.json: the Team tree
            members [{address, agentRunId}],               + delegatedFrom {nodeId, coordinatingRun,
            delegatorAgentRunId, startedAt}                  delegatorAgentRunId}
  the delegator's message log                          its own message log and memory
```

- On the delegating node, the link is the ordinary `taskExecutions` entry
  plus `nodeId`, the server ID of the node that runs it. Absent means this
  node, as for every link stored before remote delegation. A link with `nodeId` is
  stored whole in the tree: there is no folder for that run on the delegating
  node, and that node never restores, idle-stops or stops it.
- A remote Team's link also holds what a local Team link reads from the Team
  copy's own tree on the same node, under the same names as that tree: the
  coordinator's address (`coordinatorAddress`) and every member's address and
  run ID (`members`). The coordinator's run ID is the member at that address, so
  each fact is stored once. These are assigned when the Team run is created and never
  change. It holds no member content: no launch settings, status or conversation.
- On the node that runs it, the run is a run of its own: a standalone run for
  an Agent, a top-level Team run for an Agent Team. It is the root of its own run
  tree, and run history lists it as a run of its own. Its `delegatedFrom` names
  the delegating node (`nodeId`), the coordinating run, which it echoes on every
  message back, and the delegator, the only run on the other node that may
  message it. It is not a `taskAgent` section, whose presence means a run hosted
  by a coordinating run on the same node.
- A message between the two runs is one line in each node's log (for a Team on
  the node that runs it, the Team's log), with one message ID.

File names and layout mechanics are owned by
[Agent Memory](../modules/agent_memory.md), the run modules and
[Remote Collaboration](../modules/remote_collaboration.md).

## 4. Remote Delegated Runs

A delegated run can live on another node (CM-10 … CM-12). The model already
fitted this: a delegated run owns its own storage (CM-8), messages between
runs are recorded on each side (CM-9), and the coordinating run relates to its
delegated runs through links. Collaboration with remote nodes adds:

- **a channel between nodes**: request/response calls from one node to
  another, with no version negotiation (both nodes run the same release);
- **links instead of hosting, for remote runs**: the delegating node records
  the link, and the node that runs it hosts it as an independent run. Local
  delegated runs are still hosted in the coordinating run's process (CM-7);
- **routing by run ID through the link** (CM-11).

Later steps add attachment transfer (today `reference_files` are local paths),
lifecycle control across the link (stop on Task closure, user stop,
reactivation), messages to active runs on a peer that no delegation linked,
and peer authentication. Discovery of peers and of what they offer holds since
autobyteus-261.

## 5. Current State Versus Target

Status as of the change that published this document (Task 259ddae7,
`collaboration-model-contract`). Update this table when a change lands.

| Item | Status | Notes |
| --- | --- | --- |
| CM-1 … CM-7 | Holds | Since `collaboration-model-contract`: teammate delegation is refused; `send_message_to` no longer brings in collaborators or Task helper copies; stored collaborators were converted into delegated runs. Delegated runs made of a teammate before that change remain ordinary delegated runs. |
| CM-6 exception: unowned delegated runs | Holds as stored history | Delegated runs recorded before Task ownership existed, and collaborators converted into delegated runs, belong to no Task. They behave like any delegated run (sleep, wake by run ID, stop by the user) but are not closed by a Task. New delegations always belong to a Task. |
| Task tools configured, not automatic | Holds | Since `task-tool-split` (`create_task`, `update_task`). |
| CM-8 Delegated run memory in its own folder | Holds | Since `delegated-copy-own-run-memory` (Task 8641c0ac): a task agent is a run of its own (`agents/<id>/` or `agent_teams/<id>/`) with its own file (a `taskAgent` section); the coordinating run's tree keeps links; deleting a coordinating run keeps its task agents' folders. Startup migration `20261017_task_agent_own_run_v1` moved existing data. Since `delegated-copy-restore-from-own-file` (autobyteus-197) every task agent, also one started from a configured placement, restores from its own file only; startup migration `20261019_delegated_copy_own_file_complete_v1` completed existing own files and removed `taskAgent.origin`. |
| CM-9 Per-run message logs | Holds | Since `delegated-copy-own-run-memory`: a message between parts of one run is stored once in that run's log; a message between two runs in both logs (receiver's first) with one message ID. The coordinating log keeps its older entries; the migration gave each task agent its own log. Since `append-only-message-logs`, each log is append-only JSON Lines that rotates at 4 MiB (`<base>_active.jsonl` plus sealed `<base>_<6 digits>.jsonl`; startup migration `20261018_append_only_message_logs_v1`). |
| CM-7 through links instead of hosting | **Remote runs: holds** (since remote-delegation slice 1, autobyteus-191). **Local runs: hosting** | A remote delegated run is linked, not hosted (CM-10). Local delegated runs are still hosted in the coordinating run's process, and nested delegations are recorded in the topmost coordinating run's tree. |
| CM-10 … CM-12 Remote delegated runs | Holds for Agents (since autobyteus-191 and 245) and Agent Teams (since autobyteus-247), text only | Discovery of peers and their offers holds since autobyteus-261. Attachments, lifecycle control across the link, messages to unlinked active runs on a peer and peer authentication come in later slices. |

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
