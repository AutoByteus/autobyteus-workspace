# Collaboration Contract — Every Run, Every Message, Every Delegation

Status: **revision 7, the user's direction** (2026-11-11, SR-026). It is built on revision 6, which the user approved by direction at SR-022, and on TC-12 as revised at SR-025. Task `autobyteus-461`, rebased on `origin/personal` `827f1e68dc` (contains autobyteus-469).

**What this file is.** It is the one place for how runs collaborate. It starts from the runs the user starts: a standalone agent, a team, an org. It continues with how agents talk inside one run, then with delegation and with messages between runs. For every case it gives:
- the exact call and the exact address or run ID the agent writes;
- how the server finds and admits the receiver;
- what is stored on disk, as JSON, and in which file;
- what changes in memory;
- what the sender gets back and what the receiver sees;
- what differs from today;
- the check on the user's data.

The design (`design-spec.md`) says how the code does it. This file says what is true.

**The user's direction.**
- 2026-11-10: a delegated agent run or team run is its own, normal run. It is started and stopped like any other, and its life depends on its Task. The relationship is kept and shown in the UI. The contract is put right first, and the code then reflects it. No attribute is redundant.
- 2026-11-11, on this file: "one file which have each communication case … what kind of recipient address to use … and how it was stored on disk … then we validate all each one."

**History.**
- Revision 2 was approved by the user (2026-11-10, SR-007).
- Revisions 3 and 4 were never approved.
- autobyteus-469 then made the Task record the index of delegated runs.
- Revision 5 rebuilt the contract on 469 (SR-018).
- Revision 6 added the run's own `delegatedFrom` and the in-memory `DelegationTree` (SR-022).
- SR-024 and SR-025: every team run is rooted at `/`.
- Revision 7 (SR-026) puts every case into one structure, with its stored data and its check. It adds two facts that collecting the cases brought out: where an agent run's message log is (TC-13, §3.4), and the extra message copies left in former hosts' logs (§3.4).

Authorities: [Collaboration Model](../../../autobyteus-server-ts/docs/design/collaboration_model.md); [Data Migration Guideline](../../../autobyteus-server-ts/docs/design/data_migration_guideline.md); `DESIGN.md` (rules 7, 8, 10).

**Checks.** Every count was measured read-only on the user's data on 2026-11-11, with `evidence/data-model-validation/validate_every_case.py`. Its output is `every-case-2026-11-11.txt`, and every line of it starts with the case ID. Earlier checks it builds on are listed in §8.

---

## 1. Principles and words

- **P1 A delegated run is an ordinary run.** It is an agent run at `memory/agents/<id>/` or a team run at `memory/agent_teams/<id>/`. The ordinary run code reads, starts, stops, wakes, configures, archives and deletes it. Its own files hold only its own facts.
- **P2 The delegation is stored where each side needs it, under one name, `delegatedFrom`.**
  - **On the delegated run's own file:** its origin. It is written once, when the run is created, and never changes.
  - **On each Task entry:** the assignment. It opens, closes and reopens, and it goes with the Task.
  - **The delegating run stores nothing** about the runs it delegated to. Its side lives in memory, in the `DelegationTree` (§4).
  - The two stored values are equal by rule: a run's later Tasks are given only by its assigner. *(The user: "it's reasonable to put that information on my side … it's just like more symmetric information".)*
- **P3 One hop.** `delegatedFrom` names the run of the agent that delegated, never the top of a chain.
- **P4 One owner per fact** (§3.6).
- **P5 The Task owns the work.** Closing a Task ends the work of every run recorded in it.
- **P6 A run's life is bound to its Task, never to the run that delegated it.** Nothing hosts, idles, wakes or stops another run. *(The user: "you are not deciding the life circle of the other person … The life circle is bound to tasks, not bound by the manager".)*
- **P7 Never lose, never lock out.** Existing data is converted once and nothing is deleted. A run that cannot be converted is left intact and reported, and the app still starts.
- **P8 Every address belongs to the space of one run** (§2).

Words:
- **delegator**: the agent that called `delegate_task`.
- **delegating run**: the run that agent is a part of.
- **delegated run**: the run the delegation created.
- **entry agent**: the agent that a message to the run enters through. For an agent run, that is the agent itself; for a team run, its coordinator.
- **assigner** of a Task: the run whose agent gave the Task as its own work (its `assigned` entry's delegating run).
- **standing agents** of a run:
  - a standalone run: its own agent;
  - a team run: its members;
  - an org run: its direct agents, its mounted teams and their members.
- The word **coordinating run** is removed. It meant the top run of a chain, which hosted the others.

## 2. Addresses and who may talk

### 2.1 Address spaces

| Run | Its space | Example |
| --- | --- | --- |
| A standalone agent run | Its agent | `/project_task_manager` |
| A team run (the user's, a delegated one, or one a peer started) | Rooted at `/`. Its members are direct children of `/`, and sub-teams sit under their own prefix | `/solution_designer`, `/code_reviewer` |
| An org run | Its direct agents, its mounted teams and their members | `/ceo_agent`, `/dev_team`, `/dev_team/dev_lead` |

- The address a run was delegated to (`/software_engineering_team`) is a name in its **delegator's** space. It is kept as the Task entry's `recipientAddress`. It is not an address of the delegated run's agents.
- `/` itself is never an address.
- The `DelegationTree` is not an address space. It relates runs and never gives one run's agents an address in another run.

### 2.2 Who may message whom (by run ID)

Two runs may message each other, in either direction, when at least one of these holds:
- **(a) Same Task:** both work on one open Task.
- **(b) The assigner's run:** one of them is the assigner of an open Task the other works on.

Unchanged:
- **Inside one run:** teammates, or the agents of an org, reach each other as today. The Task is not asked.
- **The Task rule:** runs of different Tasks are refused. A run whose Task is closed is refused, except that its assigner continues it after a reopen.
- **Peers:** a run on a peer talks with the agent that delegated to it (CM-11).
- A run with several open Tasks may talk with the runs of any of them (DEC-012).

Why this is today's reach without hosting: today two runs may talk when they are under one top run and do not work on different Tasks. In 375 of 376 assigned entries, the assigner *is* that top run. The one exception was assigned by a legacy run with no Task record.

### 2.3 What an agent can reach by address

The first match wins.
1. **Its own team:** a teammate at its address in its team's space (`/code_reviewer`). In an org's mounted team, also the team's own address (`/dev_team`, which reaches its coordinator). A miss inside the team is not found and never falls through to step 2 or 3.
2. **The standing agents of the run that assigned its Task.** This step applies to delegated runs only.
   - A Task the manager assigned: `/project_task_manager`.
   - A Task a member of the user's team assigned: that team's members.
   - A Task an org agent assigned: the org's agents and mounted teams.
3. **Its own run's standing agents.** This step applies to runs the user started.

Anything else returns `COLLABORATION_TARGET_NOT_FOUND`, with today's guidance. Every delegated run is reached by its run ID.

### 2.4 The sender address a receiver is shown

The receiver sees the sender's address in the sender's own space only when the receiver can use that address to reach the sender (`reachingAddressOf`). Otherwise it sees the run ID only:

```text
You received a message from the agent with sender address "/project_task_manager" and sender run id "project_task_manager_7c8d".
You received a message from the agent with sender run id "solution_designer_65a9".
```

## 3. On disk: every file collaboration reads or writes

### 3.1 The Task entry (`projects/<p>/tasks/<t>/agent_run_resources.json`, or `ad-hoc-tasks/<t>/agent_run_resources.json`)

This is the one record of a delegation and its state. Example of a run on this node:

```json
{ "role": "assigned",
  "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
                     "delegatorAgentRunId": "project_task_manager_7c8d" },
  "recipientAddress": "/software_engineering_team",
  "agentRun": { "kind": "team", "teamRunId": "software_engineering_team_0218", "coordinatorAgentRunId": "solution_designer_65a9" },
  "linkedAt": "2026-11-10T09:39:18.439Z", "start": "started", "closedAt": null }
```

| Field | Meaning | Present |
| --- | --- | --- |
| `role` | `assigned`: the run was given this Task as its own work. Only its assigner continues it after a reopen. `subWork`: a run working on this Task handed part of it to this run (today's `delegated`, renamed, TC-6). `broughtIn`: older records only, never written | Always |
| `delegatedFrom.delegatingRun { kind, runId }` | The delegator's run: `agent`, `agent_team` or `agent_org`. One hop | Always |
| `delegatedFrom.delegatorAgentRunId` | The delegator | Always |
| `recipientAddress` | The address the run was delegated to, a name in the delegator's space | Every entry (today `assigned` only; the migration fills the rest) |
| `agentRun` | The run, by kind and ID, with a team's coordinator | Always |
| `nodeId`, `members` | The peer the run is on, and a peer team's members by address and run ID | A peer's run only |
| `linkedAt`, `start`, `startError`, `closedAt` | Unchanged | As today |

`delegatedFrom` replaces `hostRoot`, which named the top run that hosted the run (in 31 of 406 entries, not the run that delegated it), and `assignedBy`, which was the delegator on `assigned` entries only.

### 3.2 A delegated run's own file

These are the ordinary files of its kind, plus `delegatedFrom`. The `taskAgent` section is removed (§6, E6).

An agent run, `memory/agents/image_maker_33f0/run_metadata.json`:
```json
{ "runId": "image_maker_33f0", "agentDefinitionId": "image-maker", "address": "/image_maker",
  "workspaceRootPath": "/Users/me/projects/x", "memoryDir": "…/memory/agents/image_maker_33f0",
  "llmModelIdentifier": "gpt-image", "llmConfig": null, "autoExecuteTools": true, "runtimeKind": "autobyteus",
  "platformAgentRunId": "…", "startedAt": "2026-11-11T08:00:00.000Z",
  "launchSource": { "origin": "agent_default", "fallbacks": [] },
  "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "marketing_team_5a00" }, "delegatorAgentRunId": "copywriter_77c1" } }
```

A team run, `memory/agent_teams/software_engineering_team_0218/team_run_execution_tree.json`. It has the ordinary team shape, rooted at `/` (TC-12):
```json
{ "createdAt": "2026-11-10T09:39:18.439Z", "archivedAt": null, "applicationBinding": null,
  "handoffs": [ { "from": "/solution_designer", "to": "/architecture_reviewer", "…": "…" } ],
  "rootTeam": { "address": "/", "teamDefinitionId": "software-engineering-team", "teamDefinitionName": "Software Engineering Team",
                "teamRunId": "software_engineering_team_0218", "coordinatorAddress": "/solution_designer",
                "defaultLaunchConfiguration": { "…": "…" },
                "members": [ { "address": "/solution_designer", "agentRunId": "solution_designer_65a9", "role": "…", "description": "…", "launchConfiguration": { "…": "…" } },
                             { "address": "/code_reviewer", "agentRunId": "code_reviewer_m_3b10", "…": "…" } ] },
  "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
                     "delegatorAgentRunId": "project_task_manager_7c8d" } }
```

`delegatedFrom` on a run:

| Field | Meaning | Present |
| --- | --- | --- |
| `delegatingRun { kind, runId }` | The run it was delegated from, one hop | Always on a delegated run |
| `delegatorAgentRunId` | The agent that delegated it | When recorded (absent on 4 old runs) |
| `nodeId` | The peer that started it | Only for a run a peer started |

Two tests:
- `isDelegated(run)`: `delegatedFrom` is present.
- `isPeerStarted(run)`: `delegatedFrom.nodeId` is present.

Who reads the run's own `delegatedFrom`: the run list's "delegated from" label, the Memory page, a test that checks it equals the Task entry, and the peer back-link (only when `isPeerStarted`). Routing reads the Task entry and the tree.

A team's handoff `to` outside the team (for example `/Teacher` in a team delegated by an org) is kept as written. It is an external target: the planner does not resolve it inside the team, and when it is sent, §2.3 step 2 resolves it. This applies to a delegated team only. A team the user started keeps today's check that every handoff target is in the team.

### 3.3 A run's own address

- **Agent run:** `address` in its `run_metadata.json`. It is written when the address is first fixed: for a delegated run, at the delegation; for a run the user started, when it first collaborates. It must be stored, because 6 of 43 delegated agent runs have an address that is not their definition's ID. When it is absent, it is derived from the definition, as today.
- **Team run:** `rootTeam.address` is `/`. Members' addresses are in the file.
- **Org run:** `rootOrg.address` is `/`, as today.

### 3.4 Message logs

Every message is a line in a run's own log, with this shape (unchanged):

```json
{ "messageId": "collabmsg_JtApvm6K…", "senderAgentRunId": "solution_designer_65a9", "receiverAgentRunId": "project_task_manager_7c8d",
  "content": "…", "messageType": "agent_message", "referenceFiles": [], "createdAt": "2026-11-10T12:00:00.000Z" }
```

| Run | Its log |
| --- | --- |
| Agent run (user-started or delegated) | `memory/agents/<id>/communication_messages_active.jsonl` (and dated segments) — **TC-13** |
| Team run | `memory/agent_teams/<id>/team_communication_messages_active.jsonl` |
| Org run | `memory/agent_orgs/<id>/agent_org_communication_messages_active.jsonl` |

The rules (CM-9, unchanged):
- **Within one run**, a message is stored once, in that run's log.
- **Between two runs**, it is stored in both runs' logs with one `messageId`.
- **A new delegated run's work packet** is its first input, kept in its own memory. It is not a logged message.
- **Another Task for an existing run** is delivered as a `task_assignment` message, which is stored in both runs' logs.

**TC-13 (new): one place for an agent run's log.** Today there are two places:
- 8 agent runs the user started log at `agents/<id>/collaboration/communication_messages_*`.
- 42 delegated agent runs log at `agents/<id>/communication_messages_*`.

A delegated agent run is an ordinary run (P1), so there is one place. It is the run's own folder, like team and org runs. The migration moves the 8 logs up. After TC-8 the `collaboration/` folder holds nothing else, so it goes.

**Extra copies in former hosts' logs.** Before delegated runs had their own logs (2026-10), the hosting run's log also received their messages:
- 1,011 messages inside delegated teams;
- 53 messages between two delegated runs.

Each one is also in its own run's log (or logs), with the same `messageId`. The copies stay: nothing is deleted (P7). A run's view shows only messages that one of its own agents sent or received, or messages between runs in its view (469's `isMessageOfView`), so a copy never shows more than the owning log does.

### 3.5 What is not stored

- **The delegating run stores nothing about delegated runs.** The standalone `collaboration_tree.json` is removed (TC-8): its `host.address` moves to `run_metadata.json`, and its peer links move to their Task entries. Team and org files lose `taskExecutions` and `remoteTaskExecutions`.
- **The `DelegationTree` is in memory only** (§4).
- **The history row's `hasCollaboration`** is set by the first delegation.

### 3.6 Every attribute, once

| Attribute | Where | Kept? | Why |
| --- | --- | --- | --- |
| `delegatedFrom` | Task entry | Added (replaces `hostRoot`, `assignedBy`) | The assignment, one hop. The index the views and the tree are built from |
| `delegatedFrom` | The delegated run's own file | Kept, from `taskAgent` | Its origin, written once (TC-10). Equal to its entries in 181 of 181 runs |
| `recipientAddress` | Task entry | On every entry | The delegation's name in the delegator's space. The only place a delegated team's delegation address is kept |
| `nodeId`, `members` | Task entry | Peer's runs only | This node cannot read that run |
| `address` | Agent run's `run_metadata.json` | Moved here | Not derivable for 6 of 43 |
| `taskAgent`, `hostRoot`, `assignedBy`, `coordinatingRun`, `collaboration_tree.json`, `taskExecutions`, `remoteTaskExecutions`, `followsTeam`, team `userLaunchSelection` | — | Removed | §6 |
| `DelegationTree` | Memory | Added, not stored | Derived (§4) |

### 3.7 Each record and its one owner in code

The code mirrors this model: one owner writes each record, and the others only read it (the design's Ownership Map).

| Record | Written by (one owner) | Read by |
| --- | --- | --- |
| Task entry, with its `delegatedFrom` and `recipientAddress` (§3.1) | The Task side (`TaskExecutionResourceService`), in the Task's ordered change | `DelegationTree`, `CrossRunMessageDelivery`, the views, the run list |
| A delegated run's own file, with its `delegatedFrom` (§3.2) | `DelegatedRunStarter`, once, at creation; afterwards the ordinary run services for the run's own fields | The run's own root, the run list label, the Memory page; the peer back-link only when `isPeerStarted` |
| A run's own file, when the user started the run (RUN-1 … RUN-3) | The ordinary run services | That run's root |
| `address` in `run_metadata.json` (§3.3) | The agent run's own root, when it first collaborates; `DelegatedRunStarter` for a delegated run | Address resolution, headers |
| A run's message log (§3.4) | That run's own root, and only its own log; `CrossRunMessageDelivery` asks each of the two roots to append | That run's view |
| A run list row | The run history services; `DelegatedRunStarter` for a delegated run | The run list |
| `DelegationTree` (§4) | Collaboration, from the Task side's change notices | `CrossRunMessageDelivery`, views, token totals, the restart notice |

## 4. In memory: the `DelegationTree`

Collaboration owns it (TC-11). It holds the relationships between runs for communication and views, as the old root's tree did, but holds no run's life (P6).

| Part | What | From |
| --- | --- | --- |
| Node | A run named by a Task entry, or as an entry's `delegatingRun` | Task entries |
| Edge | Child → parent, one hop | `delegatedFrom.delegatingRun` |
| A node's Tasks | Each Task it works on, open or closed, with its role | Its entries |
| A Task's assigner | The `delegatingRun` of the Task's `assigned` entry | That entry |
| A node's agents | Its standing agents; a peer team's members from its entry | The run's own file, read once; an org is re-read on a miss |
| A node's node | `nodeId` for a peer's run | Its entry |

- **Built** at startup from the Task entries.
- **Kept current** by every delegation, closure, reopen and Task deletion. Each update happens synchronously inside the Task's ordered change, before the change resolves. The Task side stays the authority for "is this Task open".
- **One tree per run the user started.** Each tree starts at a run the user started (16 today), and every delegated run is in exactly one tree. The tree is not kept inside its top run's root: that root stops with its own run, while the runs under it keep working and keep talking.
- **It answers:**
  - who delegated me (my parent);
  - who I delegated to that still works (my children with an open Task);
  - may A and B talk (`canMessage`, §2.2);
  - which run assigned my Task;
  - which run an agent run ID is in;
  - what is under run X (for views, token totals, the restart notice).
- **Not in the tree:** runs that no Task entry names (the 15 legacy runs, and the runs of a deleted Task). They are ordinary runs of their own.

A node, as held in memory:
```json
{ "run": { "kind": "agent_team", "runId": "product_team_e03d" },
  "parent": { "kind": "agent_team", "runId": "software_engineering_team_0218" },
  "delegatorAgentRunId": "solution_designer_65a9",
  "tasks": [ { "taskId": "T1", "role": "subWork", "open": true, "assigner": { "kind": "agent", "runId": "project_task_manager_7c8d" } } ],
  "agents": [ "product_designer_1a2b", "prototyper_4e11" ] }
```

## 5. Every case

### 5.0 The runs in the examples

| Run | Kind | Address space | Started by |
| --- | --- | --- | --- |
| `project_task_manager_7c8d` (the manager, M) | Standalone agent | `/project_task_manager` | The user |
| `software_engineering_team_0218` (E) | Team, coordinator `solution_designer_65a9`, member `code_reviewer_m_3b10` | `/solution_designer`, `/code_reviewer` | M, Task T1, delegated at `/software_engineering_team` |
| `product_team_e03d` (P) | Team, coordinator `product_designer_1a2b` | `/product_designer`, `/prototyper` | E's `solution_designer`, sub-work of T1, at `/product_team` |
| `image_maker_33f0` (I) | Agent | `/image_maker` | E's `solution_designer`, sub-work of T1 (in DL-2 also by marketing's `copywriter`) |
| `research_agent_9b10` (R) | Agent | `/research_agent` | M, Task T2 |
| `marketing_team_5a00` | Team, members `marketing_coordinator_0c0c`, `copywriter_77c1` | `/marketing_coordinator`, `/copywriter` | The user |
| `company_org_9d00` | Org: `ceo_agent_1f2e`, `cto_2a3b`, `Teacher_5c6d`; mounted team `/dev_team` with `dev_lead_4c3d`, `qa_8e9f` | `/ceo_agent`, `/cto`, `/Teacher`, `/dev_team`, `/dev_team/dev_lead`, `/dev_team/qa` | The user |
| `study_group_7a7a` (S) | Team, delegated by `ceo_agent_1f2e`, Task T4; handoff `to: "/Teacher"` | `/student`, `/tutor` | The org |
| `node-b-1f0e` | A peer node | — | — |

Each case lists: **Call**, **Found and admitted**, **On disk**, **In memory**, **Result** (sender, then receiver), **Against today**, and **Checked**.

### 5.1 Runs you start

The user starts three kinds of run. Each is its own address space (§2.1) and has its own folder, its own log and its own row in the run list. None of them carries `delegatedFrom`.

**RUN-1 — A standalone agent run (for example the Project Task Manager).**
- **Started by:** the user, from the agent's page.
- **On disk:**
  - `memory/agents/project_task_manager_7c8d/run_metadata.json`:
    ```json
    { "runId": "project_task_manager_7c8d", "agentDefinitionId": "project-task-manager", "address": "/project_task_manager",
      "workspaceRootPath": "/Users/me/projects/x", "memoryDir": "…/memory/agents/project_task_manager_7c8d",
      "llmModelIdentifier": "opus", "llmConfig": { "…": "…" }, "autoExecuteTools": true, "runtimeKind": "claude_agent_sdk",
      "platformAgentRunId": "…", "startedAt": "2026-11-01T08:00:00.000Z" }
    ```
    `address` is written when the run first collaborates (§3.3). Before that it is derived from the definition.
  - The rest of the folder: `raw_traces_*.jsonl`, `work_journal/`, `context_files/`, `file_changes.json`, and, once it has sent or received a message, `communication_messages_active.jsonl` (TC-13).
  - Its row in `memory/run_history_index.json`:
    ```json
    { "runId": "project_task_manager_7c8d", "agentDefinitionId": "project-task-manager", "agentName": "Project Task Manager",
      "workspaceRootPath": "/Users/me/projects/x", "summary": "…", "createdAt": "2026-11-01T08:00:00.000Z",
      "archivedAt": null, "terminatedAt": null, "hasCollaboration": true }
    ```
- **Its address space:** `/project_task_manager` only.
- **What it can do:**
  - `send_message_to(recipient_address: "/project_task_manager")` is refused: `{ "accepted": false, "code": "COLLABORATION_SELF_TARGET_REJECTED", "message": "You can't send a message to yourself." }`. It has no other agent to reach by address.
  - It reaches the runs it delegated to by run ID (§5.5).
  - It delegates with `delegate_task` to the catalog addresses that `list_available_agents` gives: `{ "agents": [ { "name": "Software Engineering Team", "kind": "agent_team", "address": "/software_engineering_team", "description": "…" }, … ] }` (§5.3).
- **Against today:** the same, except that `address` moves from `collaboration/collaboration_tree.json` into `run_metadata.json` (TC-8) and the log moves up from `collaboration/` (TC-13).
- **Checked:** 485 agent runs the user started have a `run_metadata.json`; 8 of them have `collaboration_tree.json` and a log in `collaboration/` (E8, E11).

**RUN-2 — A team run (for example the Software Engineering Team, run on its own).**
- **Started by:** the user, from the team's page.
- **On disk:**
  - `memory/agent_teams/software_engineering_team_73d7/team_run_execution_tree.json`:
    ```json
    { "schemaVersion": 1, "createdAt": "2026-11-01T09:00:00.000Z", "archivedAt": null, "applicationBinding": null,
      "handoffs": [ { "from": "/solution_designer", "to": "/architecture_reviewer", "rules": [ "When the design is ready for review …" ] },
                    { "from": "/architecture_reviewer", "to": "/implementation_engineer", "rules": [ "When the review passes …" ] } ],
      "rootTeam": { "address": "/", "teamDefinitionId": "software-engineering-team", "teamDefinitionName": "Software Engineering Team",
                    "teamRunId": "software_engineering_team_73d7", "coordinatorAddress": "/solution_designer",
                    "defaultLaunchConfiguration": { "…": "…" },
                    "members": [
                      { "address": "/solution_designer", "agentDefinitionId": "solution-designer", "role": "…", "description": "…",
                        "agentRunId": "solution_designer_7a33", "platformAgentRunId": "…", "launchConfiguration": { "…": "…" } },
                      { "address": "/architecture_reviewer", "agentDefinitionId": "architecture-reviewer", "agentRunId": "architecture_reviewer_cd34", "…": "…" },
                      { "address": "/implementation_engineer", "agentRunId": "implementation_engineer_864a", "…": "…" },
                      { "address": "/code_reviewer", "agentRunId": "code_reviewer_2e4f", "…": "…" } ] } }
    ```
    `taskExecutions` is removed (E9).
  - Each member's memory is in `memory/agent_teams/software_engineering_team_73d7/<member run ID>/` (raw traces, work journal, …).
  - The team's log is `memory/agent_teams/software_engineering_team_73d7/team_communication_messages_active.jsonl`.
  - Its row in `memory/team_run_history_index.json`:
    ```json
    { "teamRunId": "software_engineering_team_73d7", "teamDefinitionId": "software-engineering-team", "teamDefinitionName": "Software Engineering Team",
      "workspaceRootPath": "/Users/me/projects/x", "summary": "…", "createdAt": "2026-11-01T09:00:00.000Z", "archivedAt": null, "terminatedAt": null }
    ```
- **Its address space:** `/solution_designer`, `/architecture_reviewer`, `/implementation_engineer`, `/code_reviewer`. `/` is the team's root and never an address.
- **Against today:** the same.
- **Checked:**
  - 601 of 601 team runs the user started are rooted at `/`, with members as direct children of `/`.
  - 133 of them have handoffs. In all 601, every handoff `from` and `to` is a member.
  - 0 teams have a nested sub-team.

**RUN-3 — An org run (for example the AutoByteus Org).**
- **Started by:** the user, from the org's page.
- **On disk:**
  - `memory/agent_orgs/company_org_9d00/agent_org_run_execution_tree.json`:
    ```json
    { "subjectKind": "agent_org", "createdAt": "2026-11-01T10:00:00.000Z", "archivedAt": null, "applicationBinding": null,
      "handoffs": [ { "from": "/dev_team/dev_lead", "to": "/ceo_agent", "rules": [ "When the release is ready …" ] } ],
      "rootOrg": { "address": "/", "orgDefinitionId": "company-org", "orgDefinitionName": "Company Org", "orgRunId": "company_org_9d00",
                   "defaultLaunchConfiguration": { "…": "…" },
                   "members": [
                     { "address": "/ceo_agent", "agentRunId": "ceo_agent_1f2e", "…": "…" },
                     { "address": "/cto", "agentRunId": "cto_2a3b", "…": "…" },
                     { "address": "/Teacher", "agentRunId": "Teacher_5c6d", "…": "…" },
                     { "address": "/dev_team", "teamRunId": "dev_team_6b70", "coordinatorAddress": "/dev_team/dev_lead",
                       "members": [ { "address": "/dev_team/dev_lead", "agentRunId": "dev_lead_4c3d", "…": "…" },
                                    { "address": "/dev_team/qa", "agentRunId": "qa_8e9f", "…": "…" } ] } ] } }
    ```
    `taskExecutions` is removed (E9). An empty `collaborators: []` left by an earlier migration is not read.
  - A direct agent's memory is in `memory/agent_orgs/company_org_9d00/<agent run ID>/`. A mounted team's member's memory is in `memory/agent_orgs/company_org_9d00/<team run ID>/<member run ID>/`. Both appear once the agent has run.
  - The org's log is `memory/agent_orgs/company_org_9d00/agent_org_communication_messages_active.jsonl`.
  - Its row is in `memory/agent_org_run_history_index.json` (`orgRunId`, `orgDefinitionId`, `orgDefinitionName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, `terminatedAt`).
- **Its address space:** `/ceo_agent`, `/cto`, `/Teacher`, `/dev_team` (its coordinator), `/dev_team/dev_lead`, `/dev_team/qa`.
- **Against today:** the same.
- **Checked:** 24 org runs, all rooted at `/`, with 26 direct agents and 74 mounted teams. 625 of 625 handoffs have `from` and `to` inside the org.

**RUN-4 — Retired files that stay.**
- `task_delegation_records.json` in 545 team folders and `agent_org_task_delegation_records.json` in 18 org folders hold 4 records in all, from the old submission model (2026-08 … 2026-09).
- Only released migrations read them. Nothing writes them, and nothing reads them at runtime. They stay as they are (P7).

### 5.2 Inside one run

Every message in this section is stored **once**, in the run's own log (§3.4, M-1). The sender gets `{ "accepted": true, "code": "DELIVERED", "message": "Delivered message to <address>.", "target_agent_run_id": "<receiver>" }`. The receiver is woken once and sees its teammate's address in the header (§2.4, E-1).

**IN-1 — The software engineering team you started: a member messages a teammate by address.**
- **Call** (by `solution_designer_7a33`): `send_message_to(recipient_address: "/architecture_reviewer", message_type: "architecture_review_request", content: "…")`.
- **Found:** §2.3 step 1, its own team: the member at `/architecture_reviewer`.
- **On disk:** one line in `memory/agent_teams/software_engineering_team_73d7/team_communication_messages_active.jsonl`:
  ```json
  { "messageId": "collabmsg_…", "senderAgentRunId": "solution_designer_7a33", "receiverAgentRunId": "architecture_reviewer_cd34",
    "content": "…", "messageType": "architecture_review_request", "referenceFiles": [], "createdAt": "…" }
  ```
- **Receiver sees:** `You received a message from the agent with sender address "/solution_designer" and sender run id "solution_designer_7a33".`
- **Checked:** A-1 (2,237 such sends, the same receiver). Within-run storage: 8,715 messages in teams the user started, each once in the team's log.

**IN-2 — The same team: a member follows its handoff rules.**
- **Call:** `get_handoff_rules()` returns `{ "handoffs": [ { "when": "When the design is ready for review …", "recipient_address": "/architecture_reviewer" } ] }`. That is the team file's `handoffs` entries whose `from` is the caller. The agent then sends as in IN-1.
- **Checked:** every handoff of the 601 teams has its `to` inside the team.

**IN-3 — The same team: a member messages a teammate by run ID.** `send_message_to(target_agent_run_id: "architecture_reviewer_cd34", content: "…")`. Storage and header are as in IN-1. Inside one run, the Task is not asked.

**IN-4 — The user writes to the team.** The composer sends to the coordinator, or to the member the user selected. This is the agent's own input, kept in its memory (raw traces). It is not a line in the team's log, as today.

**IN-5 — An org: an agent messages another org agent, a mounted team, or a member of it.**
- **Call** (by `ceo_agent_1f2e`): `send_message_to(recipient_address: "/cto")`, `"/dev_team"` (it reaches `/dev_team/dev_lead`, the coordinator), or `"/dev_team/qa"`.
- **Found:** §2.3 step 3, its own run's standing agents.
- **On disk:** one line in the org's log.
- **Checked:** A-2. 1,015 messages within orgs, each once in the org's log.

**IN-6 — An org: a member of a mounted team messages its teammate or an org agent.**
- **Call** (by `dev_lead_4c3d`): `"/dev_team/qa"` (step 1, its own team), or `"/ceo_agent"` (step 3). A miss under `/dev_team/` is not found and never falls through.
- **Handoffs between units are ordinary:** `{ "from": "/dev_team/dev_lead", "to": "/ceo_agent" }`.
- **Checked:** A-3.

**IN-7 — A standalone agent:** it has no teammates. Its own address is refused (RUN-1).

**IN-8 — A delegated team, inside.** A delegated team is an ordinary team run (P1), so IN-1 … IN-3 hold for it unchanged. Example, E's `solution_designer` → `"/code_reviewer"`. `get_handoff_rules` returns team-local addresses: `{ "recipient_address": "/ui_baseline_bootstrapper" }`, where today it returns `"/product_team/ui_baseline_bootstrapper"`. 

Every address case inside one run, replayed: A-1 is IN-1, A-2 is IN-5, A-3 is IN-6, and A-4 … A-6 are what changes for a delegated team.

| # | Sender | Writes | Reaches | Step | Header the receiver sees | Against today | Replayed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-1 | Marketing's `copywriter` | `"/marketing_coordinator"` | Its teammate | 1 | `"/copywriter"` | Same | 2,237: the same receiver |
| A-2 | The org's `ceo_agent` | `"/cto"`; `"/dev_team"`; `"/dev_team/dev_lead"` | An org agent; the mounted team's coordinator; a member | 3 | `"/ceo_agent"` | Same | 42: the same receiver |
| A-3 | The mounted team's `dev_lead` | `"/dev_team/qa"`; `"/ceo_agent"`. A miss under `/dev_team/` is not found | Its teammate; an org agent | 1; 3 | `"/dev_team/dev_lead"` | Same | 472: the same receiver |
| A-4 | E's `solution_designer` | `"/code_reviewer"` | Its teammate | 1 | `"/solution_designer"` | **Changed:** was `"/software_engineering_team/code_reviewer"` | 3,311: every one reaches the same receiver with the prefix dropped |
| A-5 | E's member | E as a whole: no address, because `/` never is. The coordinator is `"/solution_designer"` | — | — | — | **Changed:** `"/software_engineering_team"` reached the coordinator | 0 sends |
| A-6 | E's member, from its history | `"/software_engineering_team/code_reviewer"` | Not found, with today's guidance; its member context gives its addresses | — | — | **Changed** | 11 delegated teams with an open Task |

### 5.3 Delegation

**DL-1 — A standalone agent the user started delegates a Project Task (M → E, T1).**
- **Call:** `delegate_task(recipient_address: "/software_engineering_team", task_id: "T1")`.
- **Found:** `/software_engineering_team` in M's own list (its catalog). A new team run is created, rooted at `/`.
- **On disk:**
  - T1's entry, as in §3.1 (`role: "assigned"`, `delegatedFrom` = M, `recipientAddress: "/software_engineering_team"`);
  - E's own file, as in §3.2, with the same `delegatedFrom`;
  - a history row for E;
  - no message log line: the work packet is the coordinator's first input.
  - Nothing is written in M's folder.
- **In memory:** a node for E with parent M and Task T1 (assigned, open, assigner M).
- **Result:**
  - M gets `{ "delegated": true, "target_kind": "team", "target_team_run_id": "software_engineering_team_0218", "target_team_coordinator_agent_run_id": "solution_designer_65a9" }`.
  - E's coordinator's first input is the work packet. It names the delegator by run ID and by `"/project_task_manager"`, which reaches it by §2.3 step 2.
- **Against today:** the same call and result. E's file is rooted at `/` instead of `/software_engineering_team` and has no `taskAgent`, and M's folder gets nothing.
- **Checked:** 141 entries (138 Project Tasks, 3 with no Project). For all 141, `delegatedFrom` can be computed, `recipientAddress` is present or fillable, and one hop equals today's top run.

**DL-2 — A member of a team the user started delegates (marketing's `copywriter` → I, T3).**
- **Call:** `delegate_task(recipient_address: "/image_maker", task_id: "T3")`.
- **On disk:** T3's entry:
  ```json
  { "role": "assigned", "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "marketing_team_5a00" }, "delegatorAgentRunId": "copywriter_77c1" },
    "recipientAddress": "/image_maker", "agentRun": { "kind": "agent", "agentRunId": "image_maker_33f0" }, "linkedAt": "…", "start": "started", "closedAt": null }
  ```
  I's `run_metadata.json` is as in §3.2. Nothing is written in the marketing team's file.
- **In memory:** I under `marketing_team_5a00`.
- **Against today:** the same.
- **Checked:** 9 entries, all computable.

**DL-3 — An org's direct agent delegates (`ceo_agent` → S, T4).**
- **Call:** `delegate_task(recipient_address: "/study_group", task_id: "T4")`.
- **On disk:** T4's entry with `"delegatingRun": { "kind": "agent_org", "runId": "company_org_9d00" }, "delegatorAgentRunId": "ceo_agent_1f2e"`, and `recipientAddress: "/study_group"`. S's file is rooted at `/`, with handoff `{ "from": "/student", "to": "/Teacher" }` kept as written. The org's file keeps only its own units.
- **Against today:** S is no longer mounted in the org's space.
- **Checked:** 0 such entries in the data.

**DL-4 — A member of an org's mounted team delegates (`dev_lead` → an agent, T5).** This is DL-3 with `delegatorAgentRunId: "dev_lead_4c3d"` and the same `delegatingRun` (the org run). **Checked:** 2 entries, both computable.

**DL-5 — A member of a delegated team delegates sub-work (E's `solution_designer` → P, part of T1).**
- **Call:** `delegate_task(recipient_address: "/product_team")`. No `task_id`: the work joins the delegator's own open Task.
- **On disk:** an entry in T1:
  ```json
  { "role": "subWork", "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" },
    "recipientAddress": "/product_team", "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" },
    "linkedAt": "…", "start": "started", "closedAt": null }
  ```
  P's own file carries the same `delegatedFrom`: one hop, so it names E, not M.
- **In memory:** P under E. P's Task is T1, whose assigner is M (the node in §4).
- **Against today:** today the entry names M as `hostRoot` and P runs inside M's process. Now P is one hop under E and runs on its own.
- **Checked:** 30 entries (27 `delegated` → `subWork`, 2 `broughtIn`, 1 with no Project). All are computable, and none equals today's top run: all are nested, one hop below it.

**DL-6 — A delegated agent delegates sub-work (I → an upscaler, part of T3).** A `subWork` entry in T3 with `"delegatingRun": { "kind": "agent", "runId": "image_maker_33f0" }`, and the same `delegatedFrom` in the upscaler's own file. **Checked:** 1 entry.

**DL-7 — Another Task for a run that already exists (M gives E the Task T6).**
- **Call:** `delegate_task(target_team_run_id: "software_engineering_team_0218", task_id: "T6")`. For an agent run: `target_agent_run_id`.
- **Admitted:** only M, which made E's most recent assignment, may do this.
- **On disk:**
  - a new `assigned` entry in T6 with the same `delegatedFrom` and `recipientAddress` as E's T1 entry;
  - a `task_assignment` message from M to E's coordinator, stored in M's log and E's log.
- **In memory:** E's node gains T6.
- **Against today:** the same.
- **Checked:** 225 later entries; for all of them `delegatedFrom` equals today's top run, and `recipientAddress` is present or fillable. 225 `task_assignment` messages are in both logs; 2 are not (in history).

**DL-8 — A description-only delegation.** This is any of DL-1 … DL-6 with `delegate_task(recipient_address: "…", description: "…")` and no `task_id`. A Task with no Project is created under `ad-hoc-tasks/<t>/`, and its entry is as above. **Checked:** 16 entries (3 DL-1, 9 DL-2, 2 DL-4, 1 DL-5, 1 DL-6).

**DL-9 — Delegation to a peer (M → a research team on `node-b-1f0e`).**
- **Call:** `delegate_task(recipient_address: "/research_team", node: "node-b", task_id: "T7")`.
- **On disk (this node):** T7's entry also holds what a message needs:
  ```json
  { "role": "assigned", "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" },
    "recipientAddress": "/research_team", "agentRun": { "kind": "team", "teamRunId": "research_team_77aa", "coordinatorAgentRunId": "lead_0c11" },
    "nodeId": "node-b-1f0e",
    "members": [ { "address": "/lead", "agentRunId": "lead_0c11" }, { "address": "/analyst", "agentRunId": "analyst_5d20" } ],
    "linkedAt": "…", "start": "started", "closedAt": null }
  ```
- **On disk (the peer):** the run's own file, as in DL-10.
- **In memory:** a node for the team with `node: "node-b-1f0e"`, whose agents come from `members`.
- **Against today:** today the node and members are in M's `collaboration_tree.json` link. The members' addresses are as the peer stores them; a peer-started team is rooted at `/` today already.
- **Checked:** 2 entries (in the DL-1 count); the facts come from their link (E3).

**DL-10 — A run a peer started on this node.**
- **On disk:** its own file has `"delegatedFrom": { "nodeId": "node-a-77d2", "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" }`. It has no Task entry on this node and is not in this node's tree.
- `isPeerStarted` is true. Its own `delegatedFrom` admits messages from its delegator.
- **Checked:** 0 such runs.

**DL-11 — Refused delegations.**

| Call by E's member | Result | Against today |
| --- | --- | --- |
| `delegate_task(recipient_address: "/solution_designer")` by `solution_designer` itself | Refused: `COLLABORATION_SELF_TARGET_REJECTED`, "you can't delegate to yourself …" | Same |
| `delegate_task(recipient_address: "/code_reviewer")` | Refused: its own team | Same |
| `delegate_task(recipient_address: "/software_engineering_team")` | **A new copy of the team**, as in a team the user started | **Changed:** today a delegated team refuses it as its own team. History: 0 refusals |

**DL-0 — A delegated run with no Task record (legacy).**
- No entry names it, so it is not in the tree. It is an ordinary run in the run list (TC-9), labeled from its own `delegatedFrom`.
- It reaches only its own run's agents by address (§2.3 step 3).
- **Checked:** 15 runs.

### 5.4 Messages by address, between runs

Every row is `send_message_to(recipient_address: "<the address>", content: "…")`.

**On disk** for every delivered row: one line in each of the two runs' logs, with one `messageId` (§3.4, M-2).

**Result** for every delivered row: the sender gets `{ "accepted": true, "code": "DELIVERED", "message": "Delivered message to <address>.", "target_agent_run_id": "<receiver>" }`. The receiver is woken once (restored if stopped) and sees the header of §2.4.

"Replayed" means every such send stored in the agents' traces, run under these rules and compared with the receiver that actually got it.

| # | Sender | Writes | Reaches | Step | Header the receiver sees | Against today | Replayed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B-1 | E's `solution_designer` | `"/project_task_manager"` | M (T1's assigner) | 2 | M sees the run ID only (E-3) | Same | 412: the same receiver |
| B-2 | P's `product_designer` (sub-work of T1) | `"/project_task_manager"` | M: T1's assigner, not P's delegator | 2 | Run ID only | Same | 3: the same receiver |
| B-3 | I (delegated by `copywriter`, DL-2) | `"/copywriter"`, `"/marketing_coordinator"` | The marketing team's members | 2 | Run ID only | Same | 6: the same receiver |
| B-4 | S's member | `"/ceo_agent"`, `"/dev_team"`, `"/dev_team/dev_lead"` | The org's agents and mounted team | 2 | Run ID only | Same | 2: the same receiver |
| B-5 | S's member, following its handoff rule | `get_handoff_rules` names `"/Teacher"`; it writes `"/Teacher"` | The org's `Teacher` | 2 | Run ID only | Same | 0 sends. The 2 legacy teams with such a rule have no Task record: not found |
| C-1 | M | `"/software_engineering_team"` | Not found: delegated runs are reached by run ID (R-1) | — | — | Same as today's code | 53 older sends (2 in 2026-08, 51 in 2026-10) reached a delegated run by address before that rule. 51 of them involve a run with no Task record |
| C-2 | P's member | `"/solution_designer"` | P's own member of that name if it has one, else not found. E's designer is reached by run ID (R-3) | 1 or — | — | Same | — |
| C-3 | E's member | `"/product_team"` | Not found: P by run ID (R-2) | — | — | Same | In C-1's 53 |
| C-4 | Anyone | An address no step finds | `COLLABORATION_TARGET_NOT_FOUND` | — | — | Same | The 10 refused today as not found are still not found |

`list_available_agents` gives exactly the addresses of steps 1 to 3, plus the catalog addresses for `delegate_task`.

### 5.5 Messages by run ID, between runs

Every row is `send_message_to(target_agent_run_id: "<run ID>", content: "…")`. The receiver is found in the tree by its agent run ID. A stopped receiver is restored and woken once. Storage, result and header are as in §5.4.

| # | Sender → receiver | Admitted by | Against today |
| --- | --- | --- | --- |
| R-1 | M → `"solution_designer_65a9"` (E's coordinator), or any member of E | (b): M assigned T1 | Same |
| R-2 | E ↔ P ↔ I, any agents, both directions | (a): all on T1 | Same |
| R-3 | P's member → `"solution_designer_65a9"` (its delegator) | (a) | Same |
| R-4 | M → `"product_designer_1a2b"` (P, at depth 2) | (b): M assigned T1 | Same |
| R-5 | E's member → `"project_task_manager_7c8d"` | (b) | Same |
| R-6 | M → E after T1 closed and was reopened | (b): the assigner continues it; E's T1 entry gets `closedAt: null` | Same |
| R-7 | P ↔ R (T1 and T2) | Refused: "it works on a different Task" | Same |
| R-8 | Anyone → a run whose Task is closed | Refused (`TASK_AGENT_RESOURCE_CLOSED`), except R-6 | Same |
| R-9 | A legacy run (DL-0) ↔ any other run | Refused: no Task relates them (TC-9) | Changed for legacy runs only |
| R-10 | A peer's run ↔ its delegator | By run ID across nodes (CM-11). This node finds it by its entry's `nodeId` and `members`; the peer finds its delegator by its own `delegatedFrom` | Same |

**Checked** (`task-centered-messaging-2026-11-11.txt`, every stored message between two runs, 1,604):
- 1,540 are allowed as today: 103 by (a) and 1,437 by (b).
- 64 are refused: every one involves a legacy run (R-9).
- 0 are newly allowed.
- Rule (a)/(b) computed on the tree equals the rule on the records for 230 of 230 run pairs.

### 5.6 The sender address shown (every stored message)

| # | Sender → receiver | Shown | Checked |
| --- | --- | --- | --- |
| E-1 | Within one run | The sender's address (`"/code_reviewer"`) | 13,206: the address |
| E-2 | Assigner → a run of its Task (M → E) | `"/project_task_manager"` (it reaches back by step 2) | 690: the address |
| E-3 | A run → its Task's assigner (E → M) | The run ID only: M cannot address E | 747: the run ID only |
| E-4 | Runs of one Task, or legacy | The run ID only | 167: the run ID only |

### 5.7 Task and run changes that change who can talk

| # | Event | On disk | In memory | Communication after |
| --- | --- | --- | --- | --- |
| T-1 | T1 is closed (`update_task(status: "DONE")`) | `closedAt` on each T1 entry | T1 closed on each node | Each run of T1 is asked, by its own ID, to stop. R-8 applies |
| T-2 | T1 is reopened, and M messages E | `closedAt: null` on E's entry | T1 open | R-6; E is in M's view again |
| T-3 | T1 is deleted | Its record is removed (open runs are stopped first) | Its runs leave the tree | They are ordinary runs (TC-3), labeled from their own `delegatedFrom`; R-9 |
| T-4 | The user stops any run | Its history row | — | That run only (TC-1). The next message to it restores it |
| T-5 | The user archives or deletes M while E works | Refused with the reason (TC-2) | — | — |
| T-6 | The server restarts | — | The tree is rebuilt from the Task entries | No run is running; each is restored by its next message |
| T-7 | A delegated run goes quiet | — | — | Its own idle shutdown (P6); woken by its next message |

## 6. Existing data: before → after the migration

| # | Shape | Count | Before | After |
| --- | --- | --- | --- | --- |
| E1 | Task entry, the delegator in the top run | 375 | `hostRoot`, `assignedBy` | `delegatedFrom` (§3.1) |
| E2 | Task entry of a nested run | 31 | `hostRoot` = the top run | `delegatedFrom.delegatingRun` = the delegator's run, one hop |
| E3 | Task entry of a peer's run | 2 | The node and members only in M's tree link | `nodeId`, `members` in the entry |
| E4 | Role `delegated` | 28 | `"delegated"` | `"subWork"` |
| E5 | `recipientAddress` on non-assigned entries | 30 | Absent | Filled from the run's `taskAgent.address` (30 of 30 have it) |
| E6 | A delegated run's `taskAgent` | 196 | `taskAgent { coordinatingRun, delegatorAgentRunId?, address, launchSource?, userLaunchSelection? }` | `delegatedFrom` (one hop: 191 from the delegator's run; 5 from `coordinatingRun`). Agent runs: `address` → `run_metadata.address`, `launchSource` → own field. `userLaunchSelection` (9) → own launch |
| E6t | A delegated team's own file | 153 | Rooted at `/software_engineering_team`, members `/software_engineering_team/x`, `followsTeam`, no `teamDefinitionName` | Rooted at `/`, members `/x` (153 of 153 without a collision); handoffs rebased, with an outside `to` kept (2); `teamDefinitionName` filled; `followsTeam` applied, then removed |
| E7 | A delegated run with no Task record | 15 | Hidden from the run list | An ordinary run (TC-9) |
| E8 | The standalone `collaboration_tree.json` | 8 | `host`, `createdAt`, old entries, 2 peer links | Removed: `address` → `run_metadata.json`; the links → E3 |
| E9 | Team and org `taskExecutions`, `remoteTaskExecutions` | Every tree | Old lists | Removed |
| E10 | A peer-started run's `coordinatingRun` | 0 | `delegatedFrom { nodeId, coordinatingRun }` | `delegatingRun` |
| E11 | Agent run logs in `collaboration/` | 8 runs | `agents/<id>/collaboration/communication_messages_*` | `agents/<id>/communication_messages_*` (TC-13); the empty folder goes |
| E12 | Extra copies in former hosts' logs | 1,064 messages | Also in their own logs | Kept as they are (§3.4) |

Before and after, as data:

```json
E1  before: { "role": "assigned", "assignedBy": "project_task_manager_7c8d", "recipientAddress": "/software_engineering_team",
              "hostRoot": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "agentRun": { "…": "…" }, "linkedAt": "…", "start": "started", "closedAt": "…" }
    after:  { "role": "assigned", "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" },
              "recipientAddress": "/software_engineering_team", "agentRun": { "…": "…" }, "linkedAt": "…", "start": "started", "closedAt": "…" }

E2  before: { "role": "delegated", "hostRoot": { "kind": "agent", "runId": "project_task_manager_7c8d" },
              "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" }, "…": "…" }
    after:  { "role": "subWork", "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" },
              "recipientAddress": "/product_team", "agentRun": { "…": "…" }, "…": "…" }

E3  before (link in M's collaboration_tree.json):
              { "address": "/research_team", "teamRunId": "research_team_77aa", "nodeId": "node-b-1f0e", "coordinatorAddress": "/lead",
                "members": [ { "address": "/lead", "agentRunId": "lead_0c11" }, { "address": "/analyst", "agentRunId": "analyst_5d20" } ], "…": "…" }
    after (entry): as DL-9. coordinatorAddress is not kept: it is the member whose run ID is coordinatorAgentRunId.

E6  before (agent): { "runId": "image_maker_33f0", "…": "…",
                      "taskAgent": { "coordinatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "copywriter_77c1",
                                     "address": "/image_maker", "launchSource": { "origin": "agent_default", "fallbacks": [] } } }
    after (agent):  { "runId": "image_maker_33f0", "…": "…", "address": "/image_maker", "launchSource": { "origin": "agent_default", "fallbacks": [] },
                      "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "marketing_team_5a00" }, "delegatorAgentRunId": "copywriter_77c1" } }

E6t before: { "rootTeam": { "address": "/product_team", "teamDefinitionId": "product-team", "teamRunId": "product_team_e03d", "coordinatorAddress": "/product_team/product_designer",
                            "members": [ { "address": "/product_team/product_designer", "followsTeam": true, "…": "…" } ], "taskExecutions": [] },
              "handoffs": [ { "from": "/product_team/product_designer", "to": "/product_team/prototyper" } ],
              "taskAgent": { "coordinatingRun": { "…": "…" }, "delegatorAgentRunId": "solution_designer_65a9", "address": "/product_team" } }
    after:  { "rootTeam": { "address": "/", "teamDefinitionId": "product-team", "teamDefinitionName": "Product Team", "teamRunId": "product_team_e03d",
                            "coordinatorAddress": "/product_designer", "members": [ { "address": "/product_designer", "launchConfiguration": { "…": "…" }, "…": "…" } ] },
              "handoffs": [ { "from": "/product_designer", "to": "/prototyper" } ],
              "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" } }

E8  before: { "subjectKind": "agent", "createdAt": "…", "host": { "address": "/project_task_manager", "agentRunId": "project_task_manager_7c8d", "agentDefinitionId": "project-task-manager" },
              "collaborators": [], "taskExecutions": [ { "…": "…" }, { "address": "/research_team", "nodeId": "node-b-1f0e", "…": "…" } ] }
    after:  the file is removed; run_metadata.json gains "address": "/project_task_manager"; the peer link went to its entry (E3)
```

Notes:
- 4 old runs have no `delegatorAgentRunId`. Their `delegatedFrom` has only `delegatingRun` (from `coordinatingRun`).
- 1 run's delegator's run is no longer stored. Its `delegatingRun` comes from `coordinatingRun`, and `delegatorAgentRunId` is kept.
- **A preserved partial state:** some trees still hold a full record in `taskExecutions`, an unfinished item of an earlier migration. That tree file and both runs' own files stay as they are. Their Task entries are converted, with the delegator read from that record, and the item is reported as a warning.

## 7. Decisions

| ID | Question | Decision | Owner | Status |
| --- | --- | --- | --- | --- |
| TC-1 | Does Stop of a run stop the runs it delegated to? | No | The user | Decided, 2026-11-10 |
| TC-2 | Archive or delete of a run whose delegated runs work | Refused with the reason; its delegated runs are never deleted with it | Solution Designer | Decided |
| TC-3 | A delegated run whose delegating run or Task was deleted | Listed as a run of its own | The user | Decided, 2026-11-10 |
| TC-4 | Which delegating runs | Standalone, team and org runs, in this ticket | The user | Decided, 2026-11-11 ("not so easy to have like intermediary states") |
| TC-5 | A Settings edit of a stopped delegated run | The ordinary stopped-run save | Solution Designer | Decided |
| TC-6 | The role name for sub-work | `subWork` | The user | Decided, 2026-11-10 |
| TC-7 | Where the assignment is stored | The Task entry's `delegatedFrom`, one hop | The user | Decided, 2026-11-11 |
| TC-8 | The standalone `collaboration_tree.json` | Removed; its address → `run_metadata.json`; peer links → Task entries | The user | Decided, 2026-11-11 |
| TC-9 | The 15 old delegated runs with no Task record | Ordinary runs in the run list | The user | Decided, 2026-11-11 |
| TC-10 | Does the delegated run also carry `delegatedFrom`? | Yes, as its origin, written once; one name | The user | Decided, 2026-11-11 (revision 6) |
| TC-11 | An in-memory structure of the relationships | The `DelegationTree` (§4), owned by collaboration, holding no run's life | The user | Decided, 2026-11-11 |
| TC-12 | The shape of a delegated team's file | The ordinary team file, rooted at `/`; the delegation address in `recipientAddress`; an outside handoff kept and resolved when sent | Solution Designer (SR-025, answering ARCH-REV-008 AR-018) | Decided; the user informed |
| TC-13 | Where an agent run's message log is | The run's own folder, `agents/<id>/communication_messages_*`, for every agent run, as for team and org runs; 8 logs move up from `collaboration/` | Solution Designer (SR-026) | Decided; the user informed |
| DEC-011 | Which runs may message each other | Centered on the Task, with today's reach (§2.2) | The user | Decided, 2026-11-11 |
| DEC-012 | A run with several open Tasks | It may talk with the runs of any of them | Solution Designer | Decided; the user informed |

## 8. Validation index

Every case and the check behind it. The scripts are in `evidence/data-model-validation/`, are read-only, and print counts only.

| Case | Check | Result | Evidence |
| --- | --- | --- | --- |
| RUN-1 … RUN-3 | The runs the user starts have the stated shape | 485 agent runs; 601 of 601 teams rooted at `/`, every handoff inside the team, 0 nested sub-teams; 24 orgs rooted at `/`, 625 of 625 handoffs inside the org | `every-case-2026-11-11.txt` |
| RUN-4 | Retired delegation record files | 545 team and 18 org files, 4 records, no runtime reader | `every-case-2026-11-11.txt`; `git grep` at `827f1e68dc` |
| IN-1 … IN-8 | Inside one run: once in its log; the address replay | 13,206 of 13,206 in their own run's log; A-1 2,237, A-2 42, A-3 472, A-4 3,311 reach the same receiver | `every-case-2026-11-11.txt` |
| DL-1 … DL-8 | `delegatedFrom` can be computed (one hop); `recipientAddress` present or fillable; one hop vs today's top run | 406 of 406 local entries (DL-1 141, DL-2 9, DL-4 2, DL-5 30, DL-6 1, DL-7 225; 16 of them DL-8); nested exactly in DL-5 and DL-6 (31) | `every-case-2026-11-11.txt` |
| DL-7 | All entries of one run agree | 54 runs with more than one entry: the same delegating run and the same assigner, 54 of 54 | `contract-after-469-2026-11-11.txt` |
| DL-9, E3 | The peer facts exist | 2 entries, node and members in M's link | `contract-after-469-2026-11-11.txt` |
| DL-0, E7 | Runs with no Task record | 15 | `every-case-2026-11-11.txt` |
| §3.2 | The run's own `delegatedFrom` equals each of its entries | 181 of 181 | `contract-revision-6-2026-11-11.txt` |
| §3.2, E6t | A delegated team fits the ordinary team shape at `/` | 153 of 153 rebase without a collision; 2 outside handoffs | `team-run-shapes-2026-11-11.txt`, `every-address-2026-11-11.txt` |
| §3.3 | An agent run's address needs a stored place | 6 of 43 differ from the definition | `contract-after-469-2026-11-11.txt` |
| §3.4 (M-1) | Within one run: once, in its own log | 13,206 of 13,206 in its own log; 1,011 of them also copied to a former host's log | `every-case-2026-11-11.txt` |
| §3.4 (M-2) | Between two runs: in both logs, one ID | 1,604 of 1,604 in both own logs; 53 also copied to a former host's log | `every-case-2026-11-11.txt` |
| §3.4 (M-3, M-4) | Work packet; another Task's message | 129 of 129 runs with one entry: no logged packet. 225 of 227 `task_assignment` messages in both logs | `every-case-2026-11-11.txt` |
| §3.4 (M-5), TC-13 | Where agent run logs are | 8 in `collaboration/` (user-started), 42 in the run folder (delegated) | `every-case-2026-11-11.txt` |
| §4 | The tree is a forest | 183 nodes, no node with two parents, 0 cycles, depths 1 (153) and 2 (30), 16 top runs | `contract-revision-6-2026-11-11.txt` |
| A-1 … C-4 | Every addressed send replayed | 6,485 delivered reach the same receiver; 53 older ones to a delegated run are refused now as by today's code; 0 newly found; 0 collisions | `every-case-2026-11-11.txt` |
| R-1 … R-10 | The Task rule on every stored message between two runs | 1,540 as today; 64 legacy refused; 0 newly allowed; tree = records for 230 of 230 pairs | `task-centered-messaging-2026-11-11.txt`, `contract-revision-6-2026-11-11.txt` |
| E-1 … E-4 | The sender address shown | 13,206 and 690 with an address; 747 and 167 with the run ID only | `every-case-2026-11-11.txt` |

Not covered by the data: DL-3 (0 entries), DL-10 (0 runs), B-5 sends (0), and the code itself. The design's tests cover these, one test per case ID.
