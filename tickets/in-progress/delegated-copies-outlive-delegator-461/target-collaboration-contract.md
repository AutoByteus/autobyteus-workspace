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
  "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" } }
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

## 5. Every case, by the run you start

Read this section from the run you start. Each subsection opens with **its list of cases, in the order they happen**, then walks each one with the exact call, the JSON written, the change in memory, what the receiver sees, what differs from today, and the check on the user's data. The case IDs in brackets (DL-1, B-1, …) are the IDs the validation script and the design's tests use. §5.4 holds the reference tables that every run shares.

### 5.0 The runs in the examples

| Run | Kind | Address space | Started by |
| --- | --- | --- | --- |
| `project_task_manager_7c8d` (M) | Standalone agent | `/project_task_manager` | The user (§5.1) |
| `software_engineering_team_0218` (E) | Team, coordinator `solution_designer_65a9`, member `code_reviewer_m_3b10` | `/solution_designer`, `/code_reviewer` | M, Task T1, at `/software_engineering_team` |
| `product_team_e03d` (P) | Team, coordinator `product_designer_1a2b`, member `prototyper_4e11` | `/product_designer`, `/prototyper` | E's `solution_designer`, sub-work of T1, at `/product_team` |
| `image_maker_33f0` (I) | Agent | `/image_maker` | E's `solution_designer`, sub-work of T1 |
| `research_agent_9b10` (R) | Agent | `/research_agent` | M, Task T2 |
| `software_engineering_team_73d7` (U) | Team, coordinator `solution_designer_7a33`, members `architecture_reviewer_cd34`, `implementation_engineer_864a`, `code_reviewer_2e4f` | `/solution_designer`, `/architecture_reviewer`, … | The user (§5.2) |
| `image_maker_44a1` (I2) | Agent | `/image_maker` | U's `solution_designer`, Task T3 |
| `company_org_9d00` (O) | Org: `ceo_agent_1f2e`, `cto_2a3b`, `Teacher_5c6d`; mounted team `/dev_team` with `dev_lead_4c3d`, `qa_8e9f` | `/ceo_agent`, `/cto`, `/Teacher`, `/dev_team`, `/dev_team/dev_lead`, `/dev_team/qa` | The user (§5.3) |
| `study_group_7a7a` (S) | Team, members `student_31aa` (coordinator), `tutor_31bb`; handoff `to: "/Teacher"` | `/student`, `/tutor` | O's `ceo_agent`, Task T4, at `/study_group` |
| `node-b-1f0e` | A peer node | — | — |

Two rules hold in every case below:
- **A message inside one run** is stored once, in that run's log. **A message between two runs** is stored in both runs' logs with one `messageId` (§3.4).
- **A delivered message** returns `{ "accepted": true, "code": "DELIVERED", "message": "Delivered message to <address or run ID>.", "target_agent_run_id": "<receiver>" }` to the sender, and wakes the receiver once (restoring it if it is stopped).

---

### 5.1 You start a standalone agent: the Project Task Manager (M)

**Cases in this section:**
1. [RUN-1] The run itself
2. [DL-1] M delegates Task T1 to the Software Engineering Team (E)
3. [IN-8, A-4 … A-6, DL-11] E's members talk inside E
4. [B-1] E's member reports to M by address, `"/project_task_manager"`
5. [R-1, R-5, E-2, E-3] M and E talk by run ID
6. [DL-7] M gives E another Task, T6
7. [DL-5] E's solution designer hands sub-work of T1 to the product team (P) and to the image agent (I)
8. [B-2, R-2 … R-4, C-2, C-3] P and I talk with M and with E
9. [DL-6] I hands part of its work further, to an upscaler
10. [R-7] M gives Task T2 to a research agent (R): runs of different Tasks cannot talk
11. [DL-8] M delegates with a description only (a Task with no Project)
12. [DL-9, DL-10, R-10] M delegates to a peer node
13. [T-1, T-2, R-6, R-8, T-3] T1 is closed, reopened, deleted
14. [T-4 … T-7] Stop, archive or delete, restart, idle
15. [IN-7, C-1] What M cannot do

**5.1.1 [RUN-1] The run itself.**
- **Started by:** the user, from the agent's page.
- **On disk:**
  - `memory/agents/project_task_manager_7c8d/run_metadata.json`:
    ```json
    { "runId": "project_task_manager_7c8d", "agentDefinitionId": "project-task-manager", "address": "/project_task_manager",
      "workspaceRootPath": "/Users/me/projects/x", "memoryDir": "…/memory/agents/project_task_manager_7c8d",
      "llmModelIdentifier": "opus", "llmConfig": { "…": "…" }, "autoExecuteTools": true, "runtimeKind": "claude_agent_sdk",
      "platformAgentRunId": "…", "startedAt": "2026-11-01T08:00:00.000Z" }
    ```
    `address` is written when the run first collaborates (§3.3). Before that it is derived from the definition. There is no `delegatedFrom`: the user started it.
  - The rest of the folder: `raw_traces_*.jsonl`, `work_journal/`, `context_files/`, `file_changes.json`, and, once it has sent or received a message, `communication_messages_active.jsonl` (TC-13).
  - Its row in `memory/run_history_index.json`:
    ```json
    { "runId": "project_task_manager_7c8d", "agentDefinitionId": "project-task-manager", "agentName": "Project Task Manager",
      "workspaceRootPath": "/Users/me/projects/x", "summary": "…", "createdAt": "2026-11-01T08:00:00.000Z",
      "archivedAt": null, "terminatedAt": null, "hasCollaboration": true }
    ```
- **Its address space:** `/project_task_manager` only.
- **What it sees in `list_available_agents`:** the catalog, `{ "agents": [ { "name": "Software Engineering Team", "kind": "agent_team", "address": "/software_engineering_team", "description": "…" }, … ] }`. These are addresses for `delegate_task`; they never reach a run that exists.
- **Against today:** the same, except that `address` moves from `collaboration/collaboration_tree.json` into `run_metadata.json` (TC-8) and the log moves up from `collaboration/` (TC-13).
- **Checked:** 485 agent runs the user started have a `run_metadata.json`; 8 of them have `collaboration_tree.json` and a log in `collaboration/` (E8, E11).

**5.1.2 [DL-1] M delegates Task T1 to the Software Engineering Team.**
- **Call:** `delegate_task(recipient_address: "/software_engineering_team", task_id: "T1")`.
- **Found:** `/software_engineering_team` in M's catalog. A new team run is created, rooted at `/`.
- **On disk:**
  - T1's `agent_run_resources.json` gains:
    ```json
    { "role": "assigned",
      "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" },
      "recipientAddress": "/software_engineering_team",
      "agentRun": { "kind": "team", "teamRunId": "software_engineering_team_0218", "coordinatorAgentRunId": "solution_designer_65a9" },
      "linkedAt": "2026-11-10T09:39:18.439Z", "start": "started", "closedAt": null }
    ```
  - E's own `memory/agent_teams/software_engineering_team_0218/team_run_execution_tree.json`, an ordinary team file with every member:
    ```json
    { "schemaVersion": 1, "createdAt": "2026-11-10T09:39:18.439Z", "archivedAt": null, "applicationBinding": null,
      "handoffs": [ { "from": "/solution_designer", "to": "/code_reviewer", "rules": [ "…" ] } ],
      "rootTeam": { "address": "/", "teamDefinitionId": "software-engineering-team", "teamDefinitionName": "Software Engineering Team",
                    "teamRunId": "software_engineering_team_0218", "coordinatorAddress": "/solution_designer",
                    "defaultLaunchConfiguration": { "…": "…" },
                    "members": [
                      { "address": "/solution_designer", "agentDefinitionId": "solution-designer", "role": "…", "description": "…",
                        "agentRunId": "solution_designer_65a9", "platformAgentRunId": "…", "launchConfiguration": { "…": "…" } },
                      { "address": "/code_reviewer", "agentDefinitionId": "code-reviewer", "role": "…", "description": "…",
                        "agentRunId": "code_reviewer_m_3b10", "platformAgentRunId": "…", "launchConfiguration": { "…": "…" } } ] },
      "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" } }
    ```
    The members' memory goes in `memory/agent_teams/software_engineering_team_0218/<member run ID>/`, and E's log in `team_communication_messages_active.jsonl` there.
  - E's row in `memory/team_run_history_index.json`, like any team's (`teamRunId`, `teamDefinitionId`, `teamDefinitionName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, `terminatedAt`).
  - No message log line: the work packet is the coordinator's first input, kept in its own memory.
  - **Nothing is written in M's folder.**
- **In memory:**
  ```json
  { "run": { "kind": "agent_team", "runId": "software_engineering_team_0218" },
    "parent": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d",
    "tasks": [ { "taskId": "T1", "role": "assigned", "open": true, "assigner": { "kind": "agent", "runId": "project_task_manager_7c8d" } } ],
    "agents": [ "solution_designer_65a9", "code_reviewer_m_3b10" ] }
  ```
- **Result:**
  - M gets `{ "delegated": true, "target_kind": "team", "target_team_run_id": "software_engineering_team_0218", "target_team_coordinator_agent_run_id": "solution_designer_65a9" }`.
  - E's coordinator starts with the work packet. It names the delegator by run ID and by `"/project_task_manager"`, which reaches M (§2.3 step 2).
- **Against today:** the same call and result. E's file is rooted at `/` instead of `/software_engineering_team`, it has `delegatedFrom` instead of `taskAgent`, and M's folder gets nothing.
- **Checked:** 141 entries delegated by a standalone agent (138 for Project Tasks, 3 for Tasks with no Project). For all 141, `delegatedFrom` can be computed, `recipientAddress` is present or fillable, and one hop equals today's top run.

**5.1.3 [IN-8, A-4 … A-6, DL-11] E's members talk inside E.** E is an ordinary team (P1), so it works like the team you start yourself (§5.2.2).
- `solution_designer_65a9` → `send_message_to(recipient_address: "/code_reviewer", content: "…")`. One line in E's log:
  ```json
  { "messageId": "collabmsg_…", "senderAgentRunId": "solution_designer_65a9", "receiverAgentRunId": "code_reviewer_m_3b10",
    "content": "…", "messageType": "agent_message", "referenceFiles": [], "createdAt": "…" }
  ```
  The code reviewer sees `You received a message from the agent with sender address "/solution_designer" and sender run id "solution_designer_65a9".`
- `get_handoff_rules()` returns `{ "handoffs": [ { "when": "…", "recipient_address": "/code_reviewer" } ] }`.
- **What changes** (A-4 … A-6):
  - Today a delegated team's members write `"/software_engineering_team/code_reviewer"`. They now write `"/code_reviewer"`, as in a team you start (3,311 sends replayed: all reach the same receiver).
  - `"/software_engineering_team"` no longer reaches the coordinator from inside E: `/` is never an address (0 sends used it).
  - An old prefixed address from an agent's history is not found, with today's guidance. Its member context gives the new addresses. Members of 11 delegated teams with an open Task are concerned.
- **Delegations refused from inside E** (DL-11):
  - `delegate_task(recipient_address: "/solution_designer")` by `solution_designer` itself: `COLLABORATION_SELF_TARGET_REJECTED`, "you can't delegate to yourself …" (as today).
  - `delegate_task(recipient_address: "/code_reviewer")`: refused, its own team (as today).
  - `delegate_task(recipient_address: "/software_engineering_team")`: **a new copy** of the team, as in a team you start. Today a delegated team refuses it; 0 such refusals in history.

**5.1.4 [B-1] E's member reports to M by address.**
- **Call** (by `solution_designer_65a9` or `code_reviewer_m_3b10`): `send_message_to(recipient_address: "/project_task_manager", content: "…")`.
- **Found and admitted:** `/project_task_manager` is not in E (step 1). E works on T1, whose assigner is M, so step 2 finds M's own agent. Rule (b) admits it.
- **On disk:** the same line in both logs, `memory/agent_teams/software_engineering_team_0218/team_communication_messages_active.jsonl` and `memory/agents/project_task_manager_7c8d/communication_messages_active.jsonl`:
  ```json
  { "messageId": "collabmsg_…", "senderAgentRunId": "solution_designer_65a9", "receiverAgentRunId": "project_task_manager_7c8d",
    "content": "…", "messageType": "agent_message", "referenceFiles": [], "createdAt": "…" }
  ```
- **M sees:** `You received a message from the agent with sender run id "solution_designer_65a9".` There is no address: M cannot address E (E-3).
- **Against today:** the same.
- **Checked:** 412 such sends replayed; all reach the same receiver.

**5.1.5 [R-1, R-5, E-2, E-3] M and E talk by run ID.**
- M → E: `send_message_to(target_agent_run_id: "solution_designer_65a9", content: "…")`, or any member of E by its run ID (R-1). Admitted by rule (b), since M assigned T1. If E is stopped, it is restored and woken once.
- E sees: `You received a message from the agent with sender address "/project_task_manager" and sender run id "project_task_manager_7c8d".` (E-2: the address reaches M from E.)
- E → M by run ID: `target_agent_run_id: "project_task_manager_7c8d"` (R-5), the same as 5.1.4.
- **On disk:** one line in both logs, as in 5.1.4.
- **Checked:** 690 messages from an assigner show an address; 747 to an assigner show the run ID only.

**5.1.6 [DL-7] M gives E another Task, T6.**
- **Call:** `delegate_task(target_team_run_id: "software_engineering_team_0218", task_id: "T6")`. Only M, which made E's most recent assignment, may do this.
- **On disk:**
  - T6's record gains an `assigned` entry with the same `delegatedFrom` and `recipientAddress` as E's T1 entry;
  - a `task_assignment` message from M to E's coordinator, in M's log and E's log:
    ```json
    { "messageId": "collabmsg_…", "senderAgentRunId": "project_task_manager_7c8d", "receiverAgentRunId": "solution_designer_65a9",
      "content": "New Task assigned to you: T6. …", "messageType": "task_assignment", "referenceFiles": [], "createdAt": "…" }
    ```
- **In memory:** E's node gains T6.
- **Against today:** the same.
- **Checked:** 225 entries for a run that already existed; for all of them `delegatedFrom` equals today's top run, and `recipientAddress` is present or fillable. 225 of 227 `task_assignment` messages are in both logs.

**5.1.7 [DL-5] E's solution designer hands sub-work of T1 to P and to I.**
- **Call** (by `solution_designer_65a9`): `delegate_task(recipient_address: "/product_team", description: "…")`. There is no `task_id`: the work joins the delegator's own open Task, T1.
- **On disk:** T1's record gains:
  ```json
  { "role": "subWork",
    "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" },
    "recipientAddress": "/product_team",
    "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" },
    "linkedAt": "…", "start": "started", "closedAt": null }
  ```
  P's own file is an ordinary team file rooted at `/` (`/product_designer`, `/prototyper`), with the same `delegatedFrom`: one hop, so it names E, not M. Nothing is written in E's files or in M's.
  For I, the same with `"recipientAddress": "/image_maker"` and `"agentRun": { "kind": "agent", "agentRunId": "image_maker_33f0" }`. I's `run_metadata.json` is the example in §3.2.
- **In memory:** P and I under E. Their Task is T1, whose assigner is M (the node in §4).
- **Against today:** today the entry names M as `hostRoot`, and P and I run inside M's process. Now they are one hop under E and run on their own.
- **Checked:** 30 such entries (27 `delegated` → `subWork`, 2 `broughtIn`, 1 for a Task with no Project). All can be computed, and all are nested one hop below today's top run.

**5.1.8 [B-2, R-2 … R-4, C-2, C-3] P and I talk with M and with E.**

| Who | Writes | Reaches | Why |
| --- | --- | --- | --- |
| P's `product_designer` | `recipient_address: "/project_task_manager"` | M | Step 2: T1's assigner is M, not P's delegator (B-2; 3 sends replayed) |
| P's member | `target_agent_run_id: "solution_designer_65a9"` | E's solution designer, its delegator | (a): both on T1 (R-3) |
| P's member | `recipient_address: "/solution_designer"` | P's own member of that name if it has one, else not found | Step 1 never falls through; E is reached by run ID (C-2) |
| E's member | `recipient_address: "/product_team"` | Not found | Delegated runs are reached by run ID (C-3) |
| E, P and I, among themselves | `target_agent_run_id: …` | Each other, both directions | (a): all on T1 (R-2) |
| M | `target_agent_run_id: "product_designer_1a2b"` | P, at depth 2 | (b): M assigned T1 (R-4) |

Each message is one line in the sender's and the receiver's run logs. P, I and E see each other by run ID only (E-4). P sees M's address (E-2).

**5.1.9 [DL-6] I hands part of its work further.** I → `delegate_task(recipient_address: "/upscaler", description: "…")`. A `subWork` entry in T1 with `"delegatingRun": { "kind": "agent", "runId": "image_maker_33f0" }, "delegatorAgentRunId": "image_maker_33f0"`, and the same `delegatedFrom` in the upscaler's own file. The upscaler is one hop under I. **Checked:** 1 entry.

**5.1.10 [R-7] Runs of different Tasks.** M → `delegate_task(recipient_address: "/research_agent", task_id: "T2")` creates R, as in 5.1.2. Then P → `target_agent_run_id: "research_agent_9b10"` is refused, "it works on a different Task", as today.

**5.1.11 [DL-8] A description-only delegation.** M → `delegate_task(recipient_address: "/image_maker", description: "…")` with no `task_id` creates a Task with no Project, under `ad-hoc-tasks/<t>/agent_run_resources.json`. Its entry is as in 5.1.2. **Checked:** 16 such entries (3 by a standalone agent, 9 by a member of a team the user started, 2 by an org's mounted-team member, 1 sub-work of a delegated team, 1 by a delegated agent).

**5.1.12 [DL-9, DL-10, R-10] M delegates to a peer node.**
- **Call:** `delegate_task(recipient_address: "/research_team", node: "node-b", task_id: "T7")`.
- **On disk (this node):** T7's entry also holds what a message needs:
  ```json
  { "role": "assigned", "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" },
    "recipientAddress": "/research_team", "agentRun": { "kind": "team", "teamRunId": "research_team_77aa", "coordinatorAgentRunId": "lead_0c11" },
    "nodeId": "node-b-1f0e",
    "members": [ { "address": "/lead", "agentRunId": "lead_0c11" }, { "address": "/analyst", "agentRunId": "analyst_5d20" } ],
    "linkedAt": "…", "start": "started", "closedAt": null }
  ```
- **On disk (the peer, DL-10):** the team's own file, rooted at `/`, with `"delegatedFrom": { "nodeId": "node-a-77d2", "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" }`. `isPeerStarted` is true. It has no Task entry on that node and is not in that node's tree. Its own `delegatedFrom` admits messages from its delegator.
- **In memory (this node):** a node for the team with `"node": "node-b-1f0e"`, whose agents come from `members`.
- **Talking (R-10):** by run ID only, in both directions (CM-11). Each side stores the message in its own run's log.
- **Against today:** today the node and members are in M's `collaboration_tree.json` link.
- **Checked:** 2 such entries (their facts come from that link, E3); 0 runs started by a peer on this node.

**5.1.13 [T-1, T-2, R-6, R-8, T-3] T1 is closed, reopened, deleted.**
- **Closed** (`update_task(task_id: "T1", status: "DONE")`): each T1 entry gets `"closedAt": "…"`. E, P and I are each asked, by their own ID, to stop. A message to any of them is now refused (`TASK_AGENT_RESOURCE_CLOSED`, R-8). They leave M's view.
- **Reopened** (`update_task(task_id: "T1", status: "IN_PROGRESS")`, then M → `target_agent_run_id: "solution_designer_65a9"`): E's entry gets `"closedAt": null`. M, as the assigner, continues E (R-6), and E is in M's view again.
- **Deleted:** T1's record is removed; open runs are stopped first. E, P and I leave the tree and become runs of their own (TC-3). Each keeps its own `delegatedFrom` as its "delegated from" label. No Task relates them any more, so they cannot message each other (R-9).

**5.1.14 [T-4 … T-7] Stop, archive or delete, restart, idle.**
- **The user stops M:** only M stops (TC-1). E keeps working. E's next report to M restores M.
- **The user stops E:** only E stops. P keeps working. P's next message to E restores E.
- **The user archives or deletes M while E works:** refused, with the reason (TC-2).
- **The server restarts:** no run is running. The tree is rebuilt from the Task entries. Each run is restored by its next message.
- **E goes quiet:** its own idle shutdown stops it (P6), and its next message wakes it.

**5.1.15 [IN-7, C-1] What M cannot do.**
- `send_message_to(recipient_address: "/project_task_manager")` returns `{ "accepted": false, "code": "COLLABORATION_SELF_TARGET_REJECTED", "message": "You can't send a message to yourself." }`.
- `send_message_to(recipient_address: "/software_engineering_team")` is not found: M reaches E by run ID (5.1.5). This is today's code. 53 older sends (2026-08 … 2026-10) reached a delegated run by address before that rule.

---

### 5.2 You start a team: the Software Engineering Team on its own (U)

**Cases in this section:**
1. [RUN-2] The run itself
2. [IN-1 … IN-4] Members talk, follow handoffs, and receive the user's messages
3. [DL-2] U's solution designer delegates Task T3 to an image agent (I2)
4. [B-3, R-5] I2 reports back to U
5. [DL-6] I2 hands part of its work further
6. [DL-11] Delegations refused inside U

**5.2.1 [RUN-2] The run itself.**
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
    `taskExecutions` is removed (E9). There is no `delegatedFrom`: the user started it.
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

**5.2.2 [IN-1 … IN-4] Members talk.**
- **By address (IN-1):** `solution_designer_7a33` → `send_message_to(recipient_address: "/architecture_reviewer", message_type: "architecture_review_request", content: "…")`. Step 1, its own team. One line in U's log:
  ```json
  { "messageId": "collabmsg_…", "senderAgentRunId": "solution_designer_7a33", "receiverAgentRunId": "architecture_reviewer_cd34",
    "content": "…", "messageType": "architecture_review_request", "referenceFiles": [], "createdAt": "…" }
  ```
  The reviewer sees `You received a message from the agent with sender address "/solution_designer" and sender run id "solution_designer_7a33".`
- **Handoffs (IN-2):** `get_handoff_rules()` returns `{ "handoffs": [ { "when": "When the design is ready for review …", "recipient_address": "/architecture_reviewer" } ] }`: the team file's `handoffs` whose `from` is the caller. The agent then sends as above.
- **By run ID (IN-3):** `send_message_to(target_agent_run_id: "architecture_reviewer_cd34", content: "…")`, stored and shown as above. Inside one run, the Task is not asked.
- **The user writes (IN-4):** the composer sends to the coordinator, or to the member the user selected. That is the agent's own input, kept in its memory. It is not a line in the team's log.
- **`list_available_agents`** gives the teammates (`/architecture_reviewer`, …) and the catalog for `delegate_task`.
- **Against today:** the same.
- **Checked:** 2,237 member-to-teammate sends by address replayed in teams the user started (A-1), all reaching the same receiver. 8,715 messages in these teams, each stored once in the team's log.

**5.2.3 [DL-2] U's solution designer delegates Task T3 to an image agent.**
- **Call:** `delegate_task(recipient_address: "/image_maker", task_id: "T3")`.
- **On disk:** T3's entry:
  ```json
  { "role": "assigned",
    "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_73d7" }, "delegatorAgentRunId": "solution_designer_7a33" },
    "recipientAddress": "/image_maker", "agentRun": { "kind": "agent", "agentRunId": "image_maker_44a1" },
    "linkedAt": "…", "start": "started", "closedAt": null }
  ```
  I2's `run_metadata.json` is like I's in §3.2, with this `delegatedFrom`. Nothing is written in U's file.
- **In memory:** I2 under U. T3's assigner is U.
- **Against today:** the same, except that I2 runs on its own instead of inside U.
- **Checked:** 9 entries delegated by a member of a team the user started; all can be computed.

**5.2.4 [B-3, R-5] I2 reports back to U.**
- `send_message_to(recipient_address: "/solution_designer", content: "…")`. Step 2: T3's assigner is U, whose standing agents are its members. `"/architecture_reviewer"` reaches that member the same way.
- Or by run ID: `target_agent_run_id: "solution_designer_7a33"`, rule (b).
- **On disk:** one line in I2's log, `memory/agents/image_maker_44a1/communication_messages_active.jsonl`, and the same line in U's log.
- U's member sees the run ID only (E-3).
- **Checked:** 6 such sends replayed (B-3); all reach the same receiver.

**5.2.5 [DL-6] I2 hands part of its work further.** As in 5.1.9: a `subWork` entry in T3 that names I2 as the delegating run.

**5.2.6 [DL-11] Delegations refused inside U.**
- `delegate_task(recipient_address: "/architecture_reviewer")` is refused: it is its own team.
- `delegate_task(recipient_address: "/software_engineering_team")` creates a new copy of the team definition, as today.

---

### 5.3 You start an org (O)

**Cases in this section:**
1. [RUN-3] The run itself
2. [IN-5, IN-6] Its agents and mounted teams talk
3. [DL-3] O's CEO agent delegates Task T4 to a study group team (S)
4. [B-4, B-5] S talks to O, and follows its handoff to `/Teacher`
5. [DL-4] A mounted team's member delegates

**5.3.1 [RUN-3] The run itself.**
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
  - A direct agent's memory is in `memory/agent_orgs/company_org_9d00/<agent run ID>/`. A mounted team member's memory is in `memory/agent_orgs/company_org_9d00/<team run ID>/<member run ID>/`. Both appear once the agent has run.
  - The org's log is `memory/agent_orgs/company_org_9d00/agent_org_communication_messages_active.jsonl`.
  - Its row is in `memory/agent_org_run_history_index.json` (`orgRunId`, `orgDefinitionId`, `orgDefinitionName`, `workspaceRootPath`, `summary`, `createdAt`, `archivedAt`, `terminatedAt`).
- **Its address space:** `/ceo_agent`, `/cto`, `/Teacher`, `/dev_team` (its coordinator), `/dev_team/dev_lead`, `/dev_team/qa`.
- **Against today:** the same.
- **Checked:** 24 org runs, all rooted at `/`, with 26 direct agents and 74 mounted teams. 625 of 625 handoffs have `from` and `to` inside the org.

**5.3.2 [IN-5, IN-6] Its agents and mounted teams talk.** Every message is one line in the org's log.

| Who | Writes | Reaches | Step | Replayed |
| --- | --- | --- | --- | --- |
| `ceo_agent` | `"/cto"` | The CTO | 3 | IN-5 (A-2): 42 sends, the same receiver |
| `ceo_agent` | `"/dev_team"` | `/dev_team/dev_lead`, its coordinator | 3 | In A-2 |
| `ceo_agent` | `"/dev_team/qa"` | That member | 3 | In A-2 |
| `dev_lead` | `"/dev_team/qa"` | Its teammate | 1 | IN-6 (A-3): 472 sends, the same receiver |
| `dev_lead` | `"/ceo_agent"`, or by its handoff to `/ceo_agent` | The CEO agent | 3 | In A-3 |
| `dev_lead` | `"/dev_team/designer"` (not a member) | Not found; it never falls through to the org | 1 | — |

Each receiver sees the sender's address (`"/ceo_agent"`, `"/dev_team/dev_lead"`). **Checked:** 1,015 messages inside orgs, each stored once in the org's log.

**5.3.3 [DL-3] O's CEO agent delegates Task T4 to a study group team.**
- **Call:** `delegate_task(recipient_address: "/study_group", task_id: "T4")`.
- **On disk:**
  - T4's entry:
    ```json
    { "role": "assigned",
      "delegatedFrom": { "delegatingRun": { "kind": "agent_org", "runId": "company_org_9d00" }, "delegatorAgentRunId": "ceo_agent_1f2e" },
      "recipientAddress": "/study_group", "agentRun": { "kind": "team", "teamRunId": "study_group_7a7a", "coordinatorAgentRunId": "student_31aa" },
      "linkedAt": "…", "start": "started", "closedAt": null }
    ```
  - S's own file, rooted at `/` with members `/student` and `/tutor`. Its handoff `{ "from": "/student", "to": "/Teacher" }` is kept as written: an external target (§3.2).
  - The org's file keeps only its own units.
- **In memory:** S under O. T4's assigner is O.
- **Against today:** S is no longer mounted in the org's address space.
- **Checked:** 0 such entries in the data.

**5.3.4 [B-4, B-5] S talks to O.**
- S's `student` → `"/ceo_agent"`, `"/dev_team"` or `"/dev_team/dev_lead"`: step 2, the org's standing agents (B-4; 2 sends replayed, the same receiver).
- **Following its handoff (B-5):** `get_handoff_rules()` returns `{ "handoffs": [ { "when": "…", "recipient_address": "/Teacher" } ] }`. Then `send_message_to(recipient_address: "/Teacher")` → step 2 reaches the org's `Teacher`, because O assigned S's Task.
- Each message is one line in S's log and in O's log. The org's agents see S by run ID only.
- **Checked:** B-5 has 0 sends. The 2 legacy teams with a `/Teacher` rule have no Task record, so for them it is not found.

**5.3.5 [DL-4] A mounted team's member delegates.** `dev_lead` → `delegate_task(recipient_address: "/release_agent", task_id: "T5")`. The entry is as in 5.3.3, with `"delegatorAgentRunId": "dev_lead_4c3d"` and the same `delegatingRun`, the org run: a mounted team is a part of the org run. **Checked:** 2 entries; both can be computed.

---

### 5.4 Reference for every run

**5.4.1 Every address, replayed** (the agents' stored `send_message_to` calls by address, run under the rules of §2.3 and compared with the receiver that got each one).

| # | Sender | Writes | Reaches | Step | Header the receiver sees | Against today | Replayed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-1 | A member of a team the user started (5.2.2) | `"/architecture_reviewer"` | Its teammate | 1 | The sender's address | Same | 2,237: the same receiver |
| A-2 | An org agent (5.3.2) | `"/cto"`; `"/dev_team"`; `"/dev_team/qa"` | An org agent; a mounted team's coordinator; a member | 3 | The sender's address | Same | 42: the same receiver |
| A-3 | A mounted team's member (5.3.2) | `"/dev_team/qa"`; `"/ceo_agent"` | Its teammate; an org agent | 1; 3 | The sender's address | Same | 472: the same receiver |
| A-4 | A delegated team's member (5.1.3) | `"/code_reviewer"` | Its teammate | 1 | The sender's address | **Changed:** was `"/software_engineering_team/code_reviewer"` | 3,311: the same receiver, prefix dropped |
| A-5 | A delegated team's member | Its team as a whole | No address | — | — | **Changed:** the team's prefix reached the coordinator | 0 sends |
| A-6 | A delegated team's member, from its history | `"/software_engineering_team/code_reviewer"` | Not found, with guidance | — | — | **Changed** | 11 delegated teams with an open Task |
| B-1 | A delegated team's member (5.1.4) | `"/project_task_manager"` | Its Task's assigner, a standalone agent | 2 | The run ID only | Same | 412: the same receiver |
| B-2 | A sub-work run (5.1.8) | `"/project_task_manager"` | Its Task's assigner, not its delegator | 2 | The run ID only | Same | 3: the same receiver |
| B-3 | A run delegated by a team member (5.2.4) | `"/solution_designer"` | The assigning team's member | 2 | The run ID only | Same | 6: the same receiver |
| B-4 | A run delegated by an org (5.3.4) | `"/ceo_agent"`, `"/dev_team/dev_lead"` | The org's agents | 2 | The run ID only | Same | 2: the same receiver |
| B-5 | The same, by its handoff rule (5.3.4) | `"/Teacher"` | The org's agent | 2 | The run ID only | Same | 0 sends |
| C-1 | An assigner (5.1.15) | `"/software_engineering_team"` | Not found: run ID only | — | — | Same as today's code | 53 older sends (2026-08 … 2026-10), before that rule |
| C-2 | A sub-work run (5.1.8) | `"/solution_designer"` | Its own member of that name, else not found | 1 or — | — | Same | — |
| C-3 | A delegated run (5.1.8) | `"/product_team"` | Not found: run ID only | — | — | Same | In C-1's 53 |
| C-4 | Anyone | An address no step finds | `COLLABORATION_TARGET_NOT_FOUND` | — | — | Same | The 10 refused today stay refused |

`list_available_agents` gives exactly the addresses of steps 1 to 3, plus the catalog addresses for `delegate_task`.

**5.4.2 Every message by run ID** (`send_message_to(target_agent_run_id: …)` between runs).

| # | Sender → receiver | Admitted by | Where |
| --- | --- | --- | --- |
| R-1 | The assigner → any agent of a run of its Task | (b) | 5.1.5 |
| R-2 | Runs of one Task, both directions | (a) | 5.1.8 |
| R-3 | A sub-work run → its delegator | (a) | 5.1.8 |
| R-4 | The assigner → a run at depth 2 | (b) | 5.1.8 |
| R-5 | A run → its Task's assigner | (b) | 5.1.5, 5.2.4 |
| R-6 | The assigner → a run of its reopened Task | (b), the assigner continues it | 5.1.13 |
| R-7 | Runs of different Tasks | Refused: "it works on a different Task" | 5.1.10 |
| R-8 | Anyone → a run whose Task is closed | Refused (`TASK_AGENT_RESOURCE_CLOSED`), except R-6 | 5.1.13 |
| R-9 | A run no Task relates to the other (legacy, or a deleted Task) | Refused (TC-9) | 5.1.13, 5.4.4 |
| R-10 | A peer's run ↔ its delegator | By run ID across nodes (CM-11) | 5.1.12 |

**Checked** (`task-centered-messaging-2026-11-11.txt`, every stored message between two runs, 1,604):
- 1,540 are allowed as today: 103 by (a) and 1,437 by (b).
- 64 are refused: every one involves a legacy run (R-9).
- 0 are newly allowed.
- Rule (a)/(b) computed on the tree equals the rule on the records for 230 of 230 run pairs.

**5.4.3 The sender address shown** (every stored message).

| # | Sender → receiver | Shown | Checked |
| --- | --- | --- | --- |
| E-1 | Within one run | The sender's address (`"/code_reviewer"`) | 13,206: the address |
| E-2 | The assigner → a run of its Task | `"/project_task_manager"` (it reaches back by step 2) | 690: the address |
| E-3 | A run → its Task's assigner | The run ID only: the assigner cannot address the run | 747: the run ID only |
| E-4 | Runs of one Task, or legacy runs | The run ID only | 167: the run ID only |

**5.4.4 Old data that is not a case of its own.**
- **[DL-0] A delegated run with no Task record (15 runs, 2026-08 … 2026-10).** No entry names it, so it is not in the tree. It is an ordinary run in the run list (TC-9), labeled from its own `delegatedFrom`. It reaches only its own run's agents by address (step 3). By run ID, R-9 applies.
- **[RUN-4] Retired delegation record files.** `task_delegation_records.json` in 545 team folders and `agent_org_task_delegation_records.json` in 18 org folders hold 4 records in all, from the old submission model (2026-08 … 2026-09). Only released migrations read them; nothing writes them and nothing reads them at runtime. They stay as they are (P7).

**5.4.5 Events, for every run.**

| # | Event | On disk | In memory | Afterwards |
| --- | --- | --- | --- | --- |
| T-1 | A Task is closed | `closedAt` on each of its entries | The Task closed on each node | Each of its runs is asked, by its own ID, to stop; R-8 |
| T-2 | A Task is reopened, and its assigner messages a run | `closedAt: null` on that entry | The Task open | R-6; the run is in its delegating run's view again |
| T-3 | A Task is deleted | Its record removed (open runs stopped first) | Its runs leave the tree | Runs of their own (TC-3), labeled from their own `delegatedFrom`; R-9 |
| T-4 | The user stops a run | Its history row | — | That run only (TC-1); its next message restores it |
| T-5 | The user archives or deletes a run whose delegated runs work | Refused with the reason (TC-2) | — | — |
| T-6 | The server restarts | — | The tree rebuilt from the Task entries | No run is running; each is restored by its next message |
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
                      "taskAgent": { "coordinatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "solution_designer_65a9",
                                     "address": "/image_maker", "launchSource": { "origin": "agent_default", "fallbacks": [] } } }
    after (agent):  { "runId": "image_maker_33f0", "…": "…", "address": "/image_maker", "launchSource": { "origin": "agent_default", "fallbacks": [] },
                      "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" } }

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
| IN-1 … IN-8 (5.1.3, 5.2.2, 5.3.2) | Inside one run: once in its log; the address replay | 13,206 of 13,206 in their own run's log; A-1 2,237, A-2 42, A-3 472, A-4 3,311 reach the same receiver | `every-case-2026-11-11.txt` |
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
