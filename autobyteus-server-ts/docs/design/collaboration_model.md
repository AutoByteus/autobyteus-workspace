# Collaboration Model

The canonical model for how agents work together in AutoByteus: what a run is,
who may message whom, who may delegate to whom, how Tasks own delegated work,
how runs relate to the runs they delegated to, and where each run's memory and messages are
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
  An Org is not a unit: nothing delegates to an Org. Since
  org-teams-follow-definition each of its units is a run of its own (an agent
  run or a Team run) bound to the Org by `containedIn { orgRunId, address }`;
  the Org run (the **container**) hosts no agent and keeps only its units, its
  former units and the Org-level handoff rules.
- **Standing instance**: the single instance at an address inside a run: a
  Team's member, an Org's direct agent or mounted Team, or a standalone run's
  own agent.
- **Delegated run**: an ordinary Agent or Team run started by `delegate_task`
  to do one Task's work. It is a root of its own (CM-7).
- **Root** (in code names): a run at the top of its own membership tree: an
  Agent run, a Team run above its sub-teams, or an Org run. A root never holds
  another run. **A run's agent** is the one agent of a standalone Agent run
  (`StandaloneRunAgent`); code never calls it a "host" (autobyteus-500).
- **Delegator**: the agent that called `delegate_task`. The **delegating run**
  is the run that agent is a part of: one hop, never the top of a chain.
- **Entry agent**: the agent a message to a run enters through: an Agent run's
  own agent, a Team run's coordinator.
- **Assigner** of a Task: the delegating run of the Task's `assigned` entry.
  Only it continues the Task's runs after a reopen.
- **Node** and **Peer**: defined in the project
  [Glossary](../../../GLOSSARY.md#nodes) (a node is one AutoByteus server with
  its node ID; a peer is a remote node registered with this node). A peer's
  name is this owner's local label for it.
- **Remote delegated run**: a delegated run that runs on a peer. It is a run
  of the node that runs it.
- **Link**: what the two nodes keep of a remote delegated run. On the
  delegating node, the run's Task entry with the peer's facts (`nodeId`, a
  Team's `members`); on the node that runs it, its own `delegatedFrom`, the
  back-link to its delegating run (CM-10).
- **Delegation tree**: the relationships between runs, built in memory from
  the Task entries (`DelegationIndex`, CM-8). A run's **children** are the runs
  it delegated to that have an open Task entry. The tree relates runs; it never
  holds a run's life and never gives one run's agents an address in another.
- **Closed delegated run**: a delegated run with no open Task entry; it is not
  a child of anyone. A delegated run whose delegating run was deleted keeps
  working as a run of its own.
- **Running agent**: an agent whose own live root reports it with a live status
  now (`RunningAgents`, since autobyteus-492). A host ended by idle shutdown, a
  Team member not started yet and a stopped run are not running, even while a
  root is registered.
- **Run started by a person**: a run whose own file has no `delegatedFrom`
  (neither a local delegation nor a peer's). `list_running_agents` lists the
  running ones of this kind.
- **Related / unrelated runs** (of one message): related when CM-5's Task rule
  admits the pair (a shared open Task, or the assigner); unrelated otherwise
  (CM-13).
- **Unlinked run**: a running agent of a peer named only by its node and run ID,
  with no link; a one-message endpoint (`unlinked_run`), never stored.

The word **coordinating run** (the top run of a delegation chain, which hosted
every local delegated run in it) is gone since autobyteus-461.

These are the engineer-facing terms. The words an agent reads in its prompt, tool
descriptions and refusal texts ("task agent", "task agent team", "run id") are
owned by the collaboration wording authority; see
[Prompt Engineering](../modules/prompt_engineering.md#collaboration-sections-by-role).

## 2. Two Relationships, Nothing Else

Agents relate to each other in exactly two ways.

### 2.1 Membership: being part of a run

The members of one Team and a standalone run's own agent are parts of one run.
The units of one Org are runs of their own inside one container (CM-3). They
work together only by **messages** (`send_message_to`, guided by the run's
handoff rules, and in an Org also by the Org's rules).

A Team run's membership follows its Team definition while the run exists
(since team-run-follows-definition): a member the definition adds joins the
run, a member it removes leaves it and becomes a **former member** (kept with its
run ID and history, not addressable; it finishes a turn it is in, then stops),
and the run's coordinator and handoff rules are the definition's current ones.
This holds for a standalone Team run, a Team mounted in an Org (a Team run of
its own since org-teams-follow-definition) and a copy of a Team definition; an
application's Team run and a copy of a configured placement keep their members.
An Org follows its Org definition the same way: a Team it mounts or an agent it
adds becomes a run in the container (Offline), a unit it removes leaves (a
working one finishes, shown leaving, then stops) and is kept as a **former
unit**, and its Org rules are the definition's. An Org rule from or to a member
that is not currently in its Team is left out until it returns. See
[Agent Team Execution](../modules/agent_team_execution.md#membership-follows-the-definition)
and [AgentOrg](../modules/agent_orgs.md).

### 2.2 Delegation: handing work to an independent run

`delegate_task` hands one Task's work to an **independent** unit. It starts a
new delegated run of that Agent or Team, or gives a saved Task to an existing
delegated run by its run ID. A delegated run is a run of its own, not a part:
it has its own identity, conversation and memory.

**Inside your run you message; outside your run you delegate first, then
message the delegated run by its run ID.**

### 2.3 Rules

| Rule | Statement | Why |
| --- | --- | --- |
| CM-1 | You never delegate inside your own Team: `delegate_task` to yourself, a teammate, or your own Team is refused and points to `send_message_to`. "Inside your own Team" means any address inside a Team instance that contains you, at any depth (exactly what `send_message_to` resolves within it), and, for a configured member of a Team run's root Team, every configured placement of that Team. | The Team run already exists with one instance of every member; a delegated run would only duplicate what you can already message. |
| CM-2 | Every other delegation target is an independent unit: a sibling Agent or Team in the same Org, an Agent or Team placed elsewhere in the run, or any catalog Agent or Team. Delegation always starts (or reuses, by run ID) an independent delegated run. | Independent units do their own work in their own run. |
| CM-3 | An Org is a container, not a Team. Its direct agents and mounted Teams are independent units, each a run of its own in the container (`containedIn`): they message each other's standing instances by their Org addresses (a message to a unit that is not running restores it) and may delegate to each other (for example a Project Task Manager in an Org delegates to the Org's software engineering Team); a delegation's delegating run is the unit run. A unit's rules are its own run's plus the Org rules from its Org address. Inside one mounted Team, CM-1 applies. | Orgs exist to put independent units under one roof. |
| CM-4 | `send_message_to(recipient_address)` reaches the **standing instance** at that address, inside your own Team instance first. It **never creates a run**: an address that is not a standing instance of your run is not found, with guidance to use `delegate_task`. | One way to create runs (delegation), one way to talk (messages). |
| CM-5 | A delegated run has no address in its delegator's space: it is reached only by its run ID (`target_agent_run_id`; a Team's entry agent), in both directions. The address it was delegated to is kept as its Task entry's `recipientAddress`, a name in the delegator's space. Two runs are related when both work on one open Task, or one is the assigner of an open Task the other works on: a message between them may wake a stopped receiver; any other run's running agent is reached by its run ID too (CM-13); a run whose Tasks are all closed takes input only from its assigner after a reopen. By address, an agent reaches its own team first (a miss there is not found), then, in a delegated run, the standing agents of the run that assigned its Task (an Org unit run as assigner contributes its container's placements at Org addresses, design R-8 of org-teams-follow-definition), then, in a run the user started, its own run's standing agents. A run delegated by an Org unit (at any depth) is related to every unit of that container (the Task relation extended along its delegation chain, SR-014). A delegated Team is rooted at `/`, like any Team run. The work packet is delivered once, by `delegate_task`. | An address names a place in a run; a delegated run is a run of its own, so only its ID names it unambiguously. The Task decides who works together. |
| CM-6 | Every delegated run belongs to one or more open Tasks: Project Tasks (delegated by key or ID; its delegator can give a task agent another Project Task with `delegate_task` while its earlier ones are open), the delegator's own Task (sub-work, which joins the newest open Task), or a Task with no Project created by a description-only delegation (a temp Task). A new local delegated run of a Task whose Project has a linked folder works in that Project's first linked folder; otherwise in its top-level run's folder (since autobyteus-97; an existing run keeps its folder). Closing a Task (DONE or CANCELLED, with `update_task`) ends its work for its delegated runs and stops those that have no other open Task; closing a Project Task that has parts also closes its open parts the same way, and so their delegated runs. Closing is optional: an agent without `update_task` never has to close anything, and a quiet delegated run is shut down after the idle grace period anyway. A delegated run is a child of its delegating run while it has an open Task entry: once its last open Task closes and it is stopped, it is no longer shown as a child, and it is again when its assigner continues it or gives it another Task (since autobyteus-469). Sub-work joins the delegating run's current Task: its newest open entry; a run that works on a Task cannot assign another by `task_id`. | Work is tracked and can be ended by its Task, without making every agent manage Tasks. |
| CM-7 | A run's life is bound to its Task, never to the run that delegated it. Every delegated run is an ordinary run and a root of its own: it starts, idles out, wakes on a message, stops and resumes after a restart like a run the user started. Closing a Task stops its runs that have no other open Task, through each run's ordinary Stop (a run on a peer node by its node, CM-10); stopping or deleting the delegating run stops nothing it delegated to. A delegating run's view shows its children with their statuses, and its owner's commands and Settings changes on a child row go to that child's own run, which saves its own launch while it is stopped. | Nothing hosts, idles, wakes or stops another run: the Task owns the work (since autobyteus-461). |
| CM-8 | A delegated run never becomes a part of its delegating run, and the delegating run stores nothing about the runs it delegated to. A delegation is stored where each side needs it, under one name, `delegatedFrom` (one hop: the delegating run and the delegator): on the Task entry, the assignment, which opens, closes and reopens with the Task (with `recipientAddress`, and for a peer's run `nodeId` and a Team's `members`); on the delegated run's own file, its origin, written once when it is created. The two are equal by rule. The delegation tree is built in memory from the Task entries and kept current by every delegation, closure, reopen and Task deletion. | A run owns its own content; the Task owns the relationship; one owner per fact. |
| CM-9 | A message is stored with the run(s) it belongs to: between parts of one run, once, in that run's message log; between two runs, in both runs' logs (sent and received), with one message ID. Each agent's own memory also records what it sent and received. An Agent run's log is in its own folder, whether the user or a delegation started it. | Every run is self-contained, and the same shape works when two runs are on different nodes (email model). |
| CM-10 | A delegated run may run on a peer node. The agent names the node only when it delegates (`delegate_task` with `node`); without `node` the target is on its own node. The node that runs a delegated run owns it: runtime, memory, message log and lifecycle (idle shutdown, wake on message, stop). The delegating node keeps only the run's Task entry (CM-6, CM-8), which names the peer (`nodeId`) and, for an Agent Team, its members by run ID and by their address in their own team (`/lead`); the run's launches are its own facts on its node, read while a view shows them. The run's delegation state (open while an open Task entry names it, closed otherwise) is the delegating node's, and it sends it to the run's node; that node records it, stops a closed run with its ordinary Stop and leaves it out of its run list. No node hosts or reads another node's run. | Each node is authoritative for its own runs (federation); a link is enough to coordinate. Only the delegating node knows the run's Tasks, so it orders what it sends about the run (autobyteus-591). |
| CM-11 | Across nodes, a remote delegated run and the run that delegated it message each other by run ID only (CM-5), in both directions; the link routes the run ID, so follow-ups never name the node. For a remote Agent Team, every member is reachable this way, the coordinator included, and a member that is idle or never started is woken first, as in a local Team run; the delegation result names the team run and its coordinator. Every message names the root that receives it on the other node. Any other running agent of a paired node is reached by its run ID with `node` (CM-13). Each side stores the message in its own run's log with the shared message ID (CM-9). Results and message headers name the other run's node, so an agent always knows when a run is remote. The delegating node also shows a remote delegated run as a child of its delegating run, as it shows a local delegated run: it reads the run's title, statuses and stored conversation from the run's node, follows its live output over a stream while someone is viewing, and passes its owner's messages, interrupts and terminate to it through the link. The run's node answers only for runs that node's delegation started and only about the paired agents (an Agent's host, a Team's members), each from where that run kind keeps them: an Agent run's host, or a Team run's root (since autobyteus-278). | One way to name a run on every node; the agent copies the run ID it was given. |
| CM-12 | A node accepts requests from other nodes only while its owner has remote collaboration on, only from paired peers, and offers them every shared Agent and Agent Team of the node, at the same catalog addresses as a local catalog delegation. A remote run starts with each agent's own default runtime and model (a Team member without one uses the Team's default); an agent no usable default covers gets the runtime and model the node's own Model Router chooses, while the node has Model Routing on (since autobyteus-32: the start request carries the work and its Task, and the answer carries every agent's launch, source and reason, which the delegating node shows); it runs in the node's temp workspace, with tool calls auto-approved for every agent. A target with an agent nothing covers (no usable default and Model Routing off, the router not active, or the router unable to choose) is refused before anything starts, and the refusal says which. No credential travels between nodes: two paired nodes share a peer secret, which signs each request (method, node route, sender, receiver, time, a one-time nonce and the body) and is never sent (since autobyteus-437, [Node Access Model](node_access_model.md) NA-9); a remote run uses its own node's models, tools, credentials and workspace. When a paired peer asks, the node says whether it takes that peer's requests now, and lists the Agents and Agent Teams it offers: name, kind, catalog address and description only, never definitions, prompts or settings; nothing is cached (since autobyteus-261). Every inbound request kind enters through one entry point, after the node access gate verified the peer's signature. | The receiving owner turns it on and pairs the peers (one invite, accepted on the other node); each target's own defaults decide how it runs, and the node's own router fills the gaps (it alone knows its runtimes, sign-ins and limits), with no per-agent setup; security is added in one place. |
| CM-13 | The run ID is the address (since autobyteus-492). Any agent that knows a running agent's run ID messages it with `send_message_to`: on this node by the run ID alone, on a paired node with `node` (the peer's name), whoever sends (a run a person started, a task agent, a member of a Team or task agent team, an Org's agent). A different Task is no reason to refuse. Such a message reaches only an agent that runs now, in its live root: it never wakes, restores or interrupts anything (it waits for the receiver's turn), and a stopped or unknown run ID is refused "not running". Only CM-5's related runs wake each other. A run whose Tasks are all closed stays closed (`TASK_AGENT_RESOURCE_CLOSED`, except its assigner's reopen); for a run on a peer whose Tasks this node holds, every sender on this node gets that refusal, with or without `node`; the node that runs it, or a third node, cannot know the closure and is delivered while it runs. A team run's ID is refused with its coordinator's run ID, also by a peer for a team that runs there. Across nodes, an agent the link does not pair (a teammate of the delegator) is sent by run ID only, like any unlinked run: the request names no root (`/rest/remote/run-messages`), and the peer finds the running agent itself. Both runs log the message (CM-9). A message between unrelated runs, like one with another node, is shown only in the view of an Agent run (a standalone run, a person's or a task agent's) that is one of its two runs: since autobyteus-565 that run's Messages lists every message its own agent sent or received, live and stored; a Team or Org view, and the view of any run above, never shows it (`MessageViewScope` is the one rule, live and stored). `list_running_agents` lists the running Agent and Team runs a person started, here or on a paired node, with the IDs to message them (an Agent's `agent_run_id`, a Team's `team_coordinator_agent_run_id`); Org runs, Team members and delegated runs are not listed. | One way to reach a running agent, on every node, for every sender; the Task relation keeps only what it owns (wake, reopen, closure). |

Task tools are configured, not automatic: an agent gets `create_task`
(creates a Project Task) and/or `update_task` (updates, closes or reopens a Task)
only when its configuration selects them. `send_message_to` and `delegate_task`
are given to every collaborating agent.

## 3. Run Storage Shape

Every run has the same shape: its own folder, its own memory (raw traces,
snapshots, file changes, context files, the Work Journal rendered from its raw
traces) and its own message log. A delegated
run is a run like any other, plus its own `delegatedFrom`.

```text
memory/
  agents/<agentRunId>/              # a standalone Agent run, or a delegated Agent run
  agent_teams/<teamRunId>/          # a Team run, or a delegated Team run; members inside
  agent_orgs/<orgRunId>/            # an Org container: its units (runs in agents/ and agent_teams/), no member folder, no log
  semantic/<agentDefinitionId>/     # not a run: an agent's semantic memory, shared by all its runs
  semantic-global/                  # not a run: the node's global semantic memory, shared by every agent
```

- A Team's members live inside that run's folder (they are parts of it). An
  Org's units are runs of their own, each at the standard place for its kind
  (`agents/<id>/`, `agent_teams/<id>/`) with `containedIn { orgRunId, address }`;
  the container file (`agent_org_run_execution_tree.json`) lists them
  (`rootOrg.units`, `rootOrg.formerUnits`) with the Org-level rules. Units are
  not listed as top-level runs.
- A delegated run lives in its own folder at the standard place for its kind,
  wherever its delegator sits. Its own run file (`run_metadata.json` with its
  `address` and `launchSource`, or a Team tree rooted at `/`) carries
  `delegatedFrom { delegatingRun, delegatorAgentRunId }`, and for a run a peer
  started also `nodeId`.
- A delegating run's folder holds its own memory, its parts, its own run file
  and its message log, and nothing about the runs it delegated to: no list of
  local or remote delegated runs. A standalone Agent run has no tree file.
- Every delegation is a Task entry
  (`projects/<p>/tasks/<t>/agent_run_resources.json`, or
  `ad-hoc-tasks/<t>/agent_run_resources.json`): `role` (`assigned` or
  `subWork`), `delegatedFrom`, `recipientAddress`, the run, and for a peer's
  run `nodeId` and `members`.

A remote delegated run (CM-10) is split over two nodes. Each side names the
other by node and run:

```text
delegating node                                      node that runs it
<Task folder>/agent_run_resources.json
  entry: {role, delegatedFrom, recipientAddress,
          agentRun, nodeId,                          memory/agents/<remoteRunId>/      # a standalone run
          members [{address, agentRunId}]  (Team)      run_metadata.json: delegatedFrom {nodeId,
          linkedAt, start, closedAt}                     delegatingRun, delegatorAgentRunId}
                                                     memory/agent_teams/<teamRunId>/   # a top-level Team run
memory/<kind>/<delegatingRunId>/                       team_run_execution_tree.json: the Team tree
  the delegating run's message log                       + delegatedFrom {nodeId, delegatingRun,
                                                           delegatorAgentRunId}
                                                       its own message log and memory
```

- On the delegating node, the link is the run's Task entry with `nodeId`, the
  server ID of the node that runs it. There is no folder for that run on the
  delegating node, and that node never restores or idle-stops it; it stops it
  only when its owner asks, through the link (since autobyteus-278). When the
  run's delegation state changes (its last open Task closes, or it is given a
  Task again), the entry carries `peerNoticeOwed: true` until the run's node
  confirms the state (since autobyteus-591).
- On the node that runs it, `<appDataDir>/remote-collaboration/closed-delegations.json`
  lists the peer-started runs whose delegating node closed every Task naming
  them; absence means open. The run's own files are unchanged.
- A remote Team's entry also holds its members by run ID and by their address
  in their own team (`members`); the coordinator is the entry's
  `coordinatorAgentRunId`. These are assigned when the Team run is created and
  never change on the delegating node, even when the Team run follows a changed
  definition on its own node (a message to a member that left is refused there). The entry holds no member content: no launch settings, status
  or conversation.
- On the node that runs it, the run is a run of its own: a standalone run for
  an Agent, a top-level Team run for an Agent Team. It is the root of its own run
  tree, and run history lists it as a run of its own. Its `delegatedFrom` names
  the delegating node (`nodeId`), the delegating run, which it echoes on every
  message back, and the delegator, the only run on the other node that may
  message it. A local delegated run has the same `delegatedFrom` without
  `nodeId`.
- A message between the two runs is one line in each node's log (for a Team on
  the node that runs it, the Team's log), with one message ID.

File names and layout mechanics are owned by
[Agent Memory](../modules/agent_memory.md), the run modules and
[Remote Collaboration](../modules/remote_collaboration.md).

## 4. Remote Delegated Runs

A delegated run can live on another node (CM-10 … CM-12). The model already
fitted this: a delegated run owns its own storage (CM-8), messages between
runs are recorded on each side (CM-9), and the delegating run relates to its
delegated runs through their Task entries. Collaboration with remote nodes adds:

- **a channel between nodes**: request/response calls from one node to
  another, with no version negotiation (both nodes run the same release);
- **links, never hosting**: the delegating node records the Task entry, and
  the node that runs it runs it as an independent run, as every node does with
  its own delegated runs (CM-7);
- **routing by run ID through the link** (CM-11);
- **remote runs in the delegator's view** (CM-11, since autobyteus-278): the
  delegating node lists each remote run as a child of its delegating run, beside
  the local delegated runs. The delegating run's root:
  1. asks each run's node for the run's title and its agents' statuses whenever
     someone opens the root's view, with one request per node;
  2. while someone views the root, follows each run's live output over one stream
     per run, which the node starts with its own ID and then only frames of the
     run's paired agents;
  3. after a stream ends that it did not close, asks the node once more for the
     summary (no reconnect);
  4. reads a remote agent's stored conversation from its node when it is opened;
  5. passes its owner's messages, interrupts and terminate to the run through the
     link.

  The run's node answers only for runs its delegation from the asking node
  started, and only about the paired agents.

- **the run's delegation state across the link** (CM-7, CM-10, since
  autobyteus-591): when a remote run's last open Task closes, the delegating
  node tells the run's node it is closed; that node records it, stops the run
  (a Team with every member) and leaves it out of its run list. As locally,
  after the Task's reopen its assigner's message continues the run: the
  delegating node reopens the run's entry, tells the run's node it is open, then
  sends the message over the link, and the run's node lists it again and the
  message wakes it with its conversation; any other sender is refused. Given a
  different saved Task (`delegate_task` with its run ID and `task_id`), it is
  told "open" the same way, then gets the Task's work. Per run, one notice is in
  flight at a time, with the state read when it is sent, and the work waits for
  the "open" answer. A notice the node did not confirm stays owed on the Task
  entry and is sent again every 30 s while the node has owed notices, also after
  a restart. A notice for a run the node no longer has, or from a node that did
  not start it, is refused there. A reopened Task alone changes nothing on
  either node, as locally: an owed "closed" is still sent, unless the run's
  entry is opened again first.

Later steps add attachment transfer (today `reference_files` are local paths)
and a remote run's files in the delegating node's window. Messages
to running agents on a peer that no delegation linked hold since autobyteus-492
(CM-13); peer authentication since autobyteus-437.
Discovery of peers and of what they offer holds since autobyteus-261.

## 5. Current State Versus Target

Status as of the change that published this document (Task 259ddae7,
`collaboration-model-contract`). Update this table when a change lands.

| Item | Status | Notes |
| --- | --- | --- |
| CM-1 … CM-6 | Holds | Since `collaboration-model-contract`: teammate delegation is refused; `send_message_to` no longer brings in collaborators or Task helper copies; stored collaborators were converted into delegated runs. Delegated runs made of a teammate before that change remain ordinary delegated runs. |
| CM-6 several open Tasks per task agent | Holds | Since `task-agent-several-tasks` (autobyteus-275): a task agent may hold several Project Tasks given by `delegate_task`; it is stopped when its last open Task closes. The given-Task message names its other open Tasks and asks for the Task key in each report. |
| CM-6 folder of a new delegated run | Holds | Since `delegated-copy-project-workspace` (autobyteus-97): a new local copy of a Task whose Project has a linked folder runs in the Project's first linked folder (Agent, Team and Org runs; saved Tasks and sub-work; a delegated Team's every member); a missing first link refuses the delegation (`TASK_PROJECT_FOLDER_UNAVAILABLE`); no link or a Temp task inherits the top-level run's folder; existing delegated runs keep theirs. See `docs/modules/projects.md` "Folder of a new copy". |
| CM-6 exception: unowned delegated runs | Holds as stored history | Delegated runs recorded before Task ownership existed, and collaborators converted into delegated runs, belong to no Task. Since autobyteus-469 they are in no tree (a tree is built from the Task records); since autobyteus-461 they are ordinary runs of their own. New delegations always belong to a Task. |
| Task tools configured, not automatic | Holds | Since `task-tool-split` (`create_task`, `update_task`). |
| CM-8 Delegated run memory in its own folder | Holds | Since `delegated-copy-own-run-memory` (Task 8641c0ac): a task agent is a run of its own (`agents/<id>/` or `agent_teams/<id>/`); deleting the run that delegated keeps its task agents' folders. Startup migration `20261017_task_agent_own_run_v1` moved existing data. Since `delegated-copy-restore-from-own-file` (autobyteus-197) every task agent, also one started from a configured placement, restores from its own file only; startup migration `20261019_delegated_copy_own_file_complete_v1` completed existing own files and removed `taskAgent.origin`. Since autobyteus-461 the own file holds `delegatedFrom` in place of `taskAgent`. |
| CM-9 Per-run message logs | Holds | Since `delegated-copy-own-run-memory`: a message between parts of one run is stored once in that run's log; a message between two runs in both logs (receiver's first) with one message ID. A former host's log keeps its older copies (nothing is deleted); the migration gave each task agent its own log. Since autobyteus-461 a user-started Agent run's log is in its run folder too (`agents/<id>/`, no `collaboration/` folder). Since `append-only-message-logs`, each log is append-only JSON Lines that rotates at 4 MiB (`<base>_active.jsonl` plus sealed `<base>_<6 digits>.jsonl`; startup migration `20261018_append_only_message_logs_v1`). Since autobyteus-565 a line of a message with an unrelated run or another node also records the other agent (`counterpart: {address, nodeId}`; `nodeId` null for a local run), so a run's Messages names it after a reload; older lines are unchanged and are named from what is known (a linked run's Task entry, the run's own file, else its run ID). |
| CM-8 tree built from the Task records | Holds | Since autobyteus-469 no run stores a list of its local delegated runs. Since autobyteus-461 (`delegated-copies-outlive-delegator-461`) none stores its remote ones either: every delegation is a Task entry with `delegatedFrom` and `recipientAddress`, the run's own file holds its origin, and the `DelegationIndex` is built in memory from the Task entries. Startup migration `20261111_delegated_runs_own_runs_v1` converted existing data (`taskAgent`, `hostRoot`, `assignedBy`, `collaboration_tree.json`, tree `taskExecutions` and `remoteTaskExecutions`, delegated Teams rebased to `/`, busy-run entries). |
| CM-7 a run's life bound to its Task, not its delegator | Holds | Since autobyteus-461: every delegated run, local or remote, is a root of its own; no run hosts, idles, wakes or stops another. A delegating run's view shows its children by their Task entries, and a child row's commands, Stop and Settings go to the child's own run. After a restart, runs resume bottom-up along `delegatedFrom`, each with its own notice. |
| CM-10 … CM-12 Remote delegated runs | Holds for Agents (since autobyteus-191 and 245) and Agent Teams (since autobyteus-247), text only | Discovery of peers and their offers holds since autobyteus-261. Since autobyteus-278, remote runs are children in the delegator's root tree (standalone, Team and Org roots) with their node's title, statuses, stored conversation and live output, and the owner messages, interrupts and stops them through the link. Peers pair and sign their requests since autobyteus-437. Messages to unlinked running agents on a peer hold since autobyteus-492 (CM-13). Since autobyteus-591, a remote run stops on its node when its last Task closes on the delegating node, and is continued by its assigner's message after the Task's reopen, or given another saved Task, as locally (reactivation). Attachments and a remote run's files come in later slices. |
| CM-3 Org units are runs of their own | Holds | Since org-teams-follow-definition: an Org run is a container of unit runs (`containedIn`); units message each other by Org address across runs (both logs, CM-9), follow their definitions (Team units through team-run-follows-definition; the Org through its Org definition, with former units), and delegate as the unit run. The view, rows and history compose the units into today's Org. Stored Org runs are converted at startup (`20261122_agent_org_units_own_runs_v1`; rollback to an older build is not possible). A peer Team copy's members are kept current on the delegating node by a signed notice after each change, reconciled at the next contact (`/rest/remote/peer-run-members`; an older peer refuses it). |
| CM-13 The run ID is the address | Holds | Since autobyteus-492: `send_message_to` reaches any running agent by run ID, with `node` on a paired peer (`/rest/remote/run-messages`); unrelated runs are never woken; since autobyteus-565 their messages, like those with another node, are in the view of an Agent run that is one of the two runs (its Messages lists every message its agent sent or received) and in no Team, Org or ancestor view; `list_running_agents` lists running runs a person started, here or on a peer (`/rest/remote/running-agents`). |

## 6. Where The Mechanics Live

- Messaging, address resolution, Task-linked message scope:
  [Agent Communication](../modules/agent_communication.md).
- Delegation in Team runs:
  [Agent Team Execution](../modules/agent_team_execution.md#server-owned-task-delegation).
- Org runs: [AgentOrg](../modules/agent_orgs.md).
- Standalone Agent runs that collaborate:
  [Standalone Agent Run Root](../modules/standalone_agent_run_root.md).
- Task ownership of delegated runs, DONE/CANCELLED, reactivation, temp Tasks:
  [Projects](../modules/projects.md).
- Storage layout: [Agent Memory](../modules/agent_memory.md).
