# Delegation Contract — A Delegated Run Is An Ordinary Run

Status: **revision 6, approved by the user's direction** (2026-11-11, SR-022): the delegated run carries its own `delegatedFrom` again, and the in-memory `DelegationTree` is part of the contract. Revision 5 was approved at SR-018 and passed architecture review at SR-021. Rebased on `origin/personal` `827f1e68dc`, which contains autobyteus-469. Task `autobyteus-461`.

History:
- Revision 1 gave the words and rules; revision 2 added the data level, and the user approved it (2026-11-10, SR-007; TC-1 … TC-6).
- Revisions 3 (§10 Communication) and 4 (§11 the life of a link) were proposed on 2026-11-10 and never approved.
- autobyteus-469 then changed the base: a top run stores no list of the runs it delegated to on this node. The Task record became the index, and the tree is built in memory from the Tasks that are open.
- Revision 5 rewrites §2 … §12 on that base. Every count was measured again on the user's data on 2026-11-11 (read-only): `evidence/data-model-validation/contract-after-469-2026-11-11.txt` and `relationship-in-task-record-2026-11-11.txt`.
- What changes against the approved revision 2 is listed in §9.1. The user decided TC-7, TC-8, TC-9 and DEC-011 on 2026-11-11.
- Revision 6 (2026-11-11, the user): a delegated run keeps its own `delegatedFrom`, its origin, as symmetric information (TC-10 revised). The relationships live in memory in a `DelegationTree` that serves communication, as the old root's tree did but holding no run's life (TC-11). §9.2 lists the changes. Validated again on the user's data: `evidence/data-model-validation/contract-revision-6-2026-11-11.txt`.

- SR-024 … SR-025 (2026-11-11): every team run, delegated or not, is rooted at `/` (TC-12 revised; the delegation address is the Task entry's `recipientAddress`). §10.7 writes out every address an agent uses, case by case, replayed on the 6,646 addressed sends stored in the agents' traces: `evidence/data-model-validation/every-address-2026-11-11.txt`.

Model for this document: `tickets/done/delegated-copy-own-run-memory/memory-layout-contract.md`, which made a delegated run's *storage* its own. autobyteus-469 made the *list of delegated runs* the Task's. This contract finishes the step: the *relationship* and the *lifecycle* become the run's and the Task's, and nothing hosts another run.

Authorities: [Collaboration Model](../../../autobyteus-server-ts/docs/design/collaboration_model.md); [Data Migration Guideline](../../../autobyteus-server-ts/docs/design/data_migration_guideline.md); `DESIGN.md` (rules 7, 8, 10).

The user's direction (2026-11-10): a delegated agent run or agent team run is its own, normal run; it is started and stopped like any other; its life depends on its Task; the relationship is kept and shown in the UI; the contract is put right first and the code then reflects it; no redundant attributes. And (2026-11-10, 469): "the agent or agent team is connected with the task".

## 0. The main scenario

One Project Task Manager run (a standalone agent run) is kept for months and delegates Project Tasks to teams. A member of such a team delegates sub-work to another agent or team.

On the user's machine today (read-only, 2026-11-11):
- **196 delegated runs**: 43 agent runs and 153 team runs.
- **408 Task record entries**: 406 of runs on this node, 2 of runs on a peer.
- **11 delegated runs have an open Task.**
- **15 delegated runs have no Task record**: old runs, started 2026-08-18 … 2026-10-13.

## 1. Principles

- **P1 A delegated run is an ordinary run.** It is an agent run at `memory/agents/<id>/` or a team run at `memory/agent_teams/<id>/`. The ordinary run code reads, starts, stops, wakes, configures, archives and deletes it. Its own files hold only its own facts.
- **P2 The delegation is stored where each side needs it, under one name, `delegatedFrom`.**
  - **The delegated run's own file** carries `delegatedFrom`: its origin, who delegated it. It is written once, when the run is created, and never changes. It stays true after the Task is gone, for a local run and a peer-started run alike.
  - **The Task entry** carries `delegatedFrom`: the assignment, who this run works on the Task for. It opens, closes, reopens, and goes with the Task.
  - **The delegating run stores nothing** of the runs it delegated to. Its side of the relationship lives in memory, in the `DelegationTree` (§2.6). A stored list there is what grew without end (469).
  - The two stored values are equal by rule: a run's later Tasks are given only by its assigner. Each side reads its own: routing, placement and lifecycle read the Task entry; the origin label reads the run's file. *(The user, 2026-11-11: "it's very reasonable to think that, OK, I was earlier delegated by someone else, it's reasonable to put that information on my side … that's not like a duplicate … it's just like more symmetric information".)*
- **P3 One hop.** An entry names the run of the agent that delegated. It never names the top of a chain.
- **P4 One owner per fact.** §3 checks every attribute against this.
- **P5 The Task owns the work.** Closing the Task ends the work of every run recorded in it. A run is shown under the run that delegated it while one of its Task entries is open (469).
- **P6 A run's life is bound to its Task, never to the run that delegated it.** Nothing hosts, idles, wakes or stops another run. The run starts for its Task, works on its own, sleeps when quiet, and is woken by a message. It ends when its Task closes, or when the user stops it. The user (2026-11-11): "you delegate a task to another person, and you are not deciding the life circle of the other person … The life circle is bound to tasks, not bound by the manager".
- **P7 Never lose, never lock out.** Existing data is converted once and nothing is deleted. A run that cannot be converted is left intact and reported, and the app still starts.

Words:
- **delegator**: the agent that called `delegate_task`.
- **delegating run**: the run that agent is a part of.
- **delegated run**: the run the delegation created.
- **entry agent**: the agent a message to the run enters through; an agent run itself, or a team's coordinator.
- The word **coordinating run** is removed. It meant the top run of a chain, which hosted the others.

## 2. The records

### 2.1 A Task's record of a run (`agent_run_resources.json`)

The one record of a delegation. A run on this node:

```json
{
  "taskId": "project_task_440e",
  "agentRunResources": [
    { "role": "assigned",
      "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
                       "delegatorAgentRunId": "project_task_manager_7c8d" },
      "recipientAddress": "/software_engineering_team",
      "agentRun": { "kind": "team", "teamRunId": "software_engineering_team_0218",
                    "coordinatorAgentRunId": "solution_designer_65a9" },
      "linkedAt": "2026-11-10T09:39:18.439Z", "start": "started", "closedAt": null },
    { "role": "subWork",
      "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" },
                       "delegatorAgentRunId": "solution_designer_65a9" },
      "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" },
      "linkedAt": "2026-11-10T11:00:00.000Z", "start": "started", "closedAt": null }
  ]
}
```

A run on a peer. This node cannot read that run, so the entry also holds what a message to it needs:

```json
{ "role": "assigned",
  "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" },
  "recipientAddress": "/research_team",
  "agentRun": { "kind": "team", "teamRunId": "research_team_77aa", "coordinatorAgentRunId": "lead_0c11" },
  "nodeId": "node-b-1f0e",
  "members": [ { "address": "/research_team/lead", "agentRunId": "lead_0c11" },
               { "address": "/research_team/analyst", "agentRunId": "analyst_5d20" } ],
  "linkedAt": "2026-11-10T10:05:00.000Z", "start": "started", "closedAt": null }
```

Fields:

| Field | Meaning | Present |
| --- | --- | --- |
| `role` | `assigned`: the run was given this Task as its own work by an agent that works on no Task; only that agent can continue it after a reopen. `subWork`: a run working on this Task handed part of it to this run. `broughtIn`: older records only, never written | Always |
| `delegatedFrom.delegatingRun { kind, runId }` | The run the delegator is a part of: `agent`, `agent_team` or `agent_org`. The delegated run is shown under it and reports to it by address. One hop (P3) | Always |
| `delegatedFrom.delegatorAgentRunId` | The delegator | Always |
| `recipientAddress` | The address the run was delegated to: its name under its delegating run, and the only place a delegated team's delegation address is kept (§2.2) | **Every entry** (today `assigned` only; the migration fills the others from the run's `taskAgent.address`) |
| `agentRun` | The run, by kind and ID; a team's coordinator | Always |
| `nodeId` | The peer the run is on | Only for a peer's run; absent means this node |
| `members` | Every member of a peer's team run, by address and run ID | Only for a peer's team run |
| `linkedAt`, `start`, `startError`, `closedAt` | Unchanged | As today |

`delegatedFrom` replaces today's `hostRoot` and `assignedBy`:
- `hostRoot` named the top run that *hosted* the run. In 31 of 406 entries that is not the run that delegated it (nested delegations).
- `assignedBy` was the delegator, on `assigned` entries only.

The field is new on the Task entry, because its meaning is new: one hop, on every role (Data Migration Guideline: never reuse a name for another meaning). It has the same name and shape as the delegated run's own `delegatedFrom` (§2.2): one concept, one name (TC-10).

`subWork` is today's `delegated`, renamed (TC-6, the user): every run in this record is a delegated run, so the old value said nothing.

### 2.2 A delegated run's own files

The ordinary files of its kind, plus `delegatedFrom`. The `taskAgent` section is removed; its facts move:

| Today in `taskAgent` | Target |
| --- | --- |
| `coordinatingRun` | Removed: nothing hosts. The run's own `delegatedFrom.delegatingRun` names the run it was delegated from, one hop |
| `delegatorAgentRunId` | The run's own `delegatedFrom.delegatorAgentRunId` |
| `address` | Agent run: `address` in its `run_metadata.json` (§2.3). Team run: its own `rootTeam.address` (equal in 153 of 153) |
| `launchSource` | Agent run: top-level `launchSource`. Team run: the members' `launchSource` (as today) and `rootTeam.defaultLaunchSource` |
| `userLaunchSelection` | The run's own launch fields, like any stopped run's Settings edit (TC-5; V-9) |
| `pendingRuntimeSwitch` | Already a top-level field of a run file (0 records carry the copy) |

A delegated agent run, `memory/agents/code_reviewer_91c2/run_metadata.json`:

```json
{
  "runId": "code_reviewer_91c2",
  "agentDefinitionId": "code-reviewer",
  "address": "/code_reviewer",
  "workspaceRootPath": "/Users/me/projects/x",
  "memoryDir": "…/memory/agents/code_reviewer_91c2",
  "llmModelIdentifier": "sonnet",
  "llmConfig": null,
  "autoExecuteTools": true,
  "runtimeKind": "claude_agent_sdk",
  "platformAgentRunId": "…",
  "startedAt": "2026-11-10T09:12:00.000Z",
  "launchSource": { "origin": "agent_default", "fallbacks": [] },
  "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
                     "delegatorAgentRunId": "project_task_manager_7c8d" }
}
```

A delegated team run carries the same `delegatedFrom` at the top level of `team_run_execution_tree.json`, beside `rootTeam`.

**A delegated team run's file is an ordinary team run file, rooted at `/`** (TC-12, revised at SR-025). Every team run is its own address space with its root at `/`. That is already true of the 601 team runs the user started and of every team run a peer starts, and code throughout the server and the web relies on it (`team-run-config.ts:192`, the team-level Settings scope `/`, the planner, the index, the launch resolver, the member scope, the web's Settings name; ARCH-REV-008 AR-018). So a delegated team keeps that invariant instead of breaking it:
- **`rootTeam.address`** is `/`. Members are direct children of `/` (`/solution_designer`), and handoffs between members likewise.
- **The address the team was delegated to** (`/software_engineering_team`) is a fact of the delegation, not of the team. It is the Task entry's `recipientAddress`, now on every entry (§2.1). It names the team's row under its delegating run. Measured: 30 of 30 `subWork` and `broughtIn` entries can take it from their run's `taskAgent.address`.
- **A handoff to an address outside the team** (2 legacy teams copied from an org hand off to `/Teacher`; a team delegated out of an org can do the same): the `to` is kept as written and is an **external target**. The planner does not resolve it inside the team. `get_handoff_rules` names it, and the agent's `send_message_to` resolves it by §10.3, step 2 (the standing agents of the run that assigned its Task, for example the org's `/Teacher`). This applies only to a delegated team (`isDelegated`). A team run the user started keeps today's check: a handoff target must be in the team. The 2 legacy teams have no Task record, so their external target stays unreachable, as any address of no relationship is.
- **`rootTeam.teamDefinitionName`** is required, as for every team run. The migration fills it from the definition (the definition-name port), else the definition ID.
- **Members' `role`, `description`, `launchConfiguration`** are as in every team run (present in 770 of 770).
- **A member's `launchSource`** (10 of 770) becomes an optional ordinary member field (display provenance); absent means not recorded.
- **`followsTeam`** (770) and the launch selections are removed (TC-5). The migration applies a team-level selection to the members with `followsTeam: true`, and a member's selection to that member, as their own `launchConfiguration`.
- **The cost:** a delegated team's members get the addresses every team member has (`/software_engineering_team/solution_designer` → `/solution_designer`). Their member context tells them so at their next turn, and `get_handoff_rules` and `list_available_agents` give the new addresses. A message to an old address in their history is refused with today's guidance. Measured: 11 delegated team runs have an open Task; the 142 others are closed. The leaf names the UI shows ("solution designer") do not change.
- Measured (`team-run-shapes-2026-11-11.txt`; rebasing check of SR-025): 153 of 153 delegated teams rebase to direct children of `/` without a collision; 2 have a handoff outside the team (both without a Task record).

`delegatedFrom` on a run:

| Field | Meaning | Present |
| --- | --- | --- |
| `delegatingRun { kind, runId }` | The run it was delegated from, one hop | Always on a delegated run |
| `delegatorAgentRunId` | The agent that delegated it | When recorded (absent on 4 old runs, contract E6) |
| `nodeId` | The peer the delegating run is on | Only for a run a peer started |

A run without `delegatedFrom` was started by the user (or by an application). Who reads it: the run list's "delegated from" label, the Memory page, and a test that checks it equals the Task entry. Routing, placement and lifecycle never read it; they read the Task entry and the `DelegationTree`.

### 2.3 A run's own address

- **Agent run:** `address` in `run_metadata.json`. It is written when the address is first fixed: for a delegated run, at the delegation; for a run the user started, when it first collaborates (as `collaboration_tree.json` `host.address` is written today).
  - It is stored because it cannot always be derived: 6 of 43 delegated agent runs have an address that is not their definition's ID.
  - When it is absent, the address is derived from the definition's name, as today for a run that never collaborated. That absence has one truthful meaning: "not fixed yet".
- **Team run:** `rootTeam.address`, as today.

### 2.4 A run started by a peer

The same `delegatedFrom` as every delegated run (§2.2), with `nodeId`, and with `coordinatingRun` renamed `delegatingRun` (0 such runs on the user's machine). Its Task record is on the other node, so on this node its own `delegatedFrom` is also what admits messages from its delegator.

**"Started by a peer" is its own test: `delegatedFrom.nodeId` is present (`isPeerStarted(run)`).** The presence of `delegatedFrom` alone means only "a delegated run", local or peer. Every reader decides which of the two it needs (the design's readers table, AR-016): a peer delegator endpoint and the peer channel only for `isPeerStarted`; the idle shutdown for every delegated run.

### 2.5 The delegating run's own files: nothing about delegated runs

- **Standalone agent run:** `collaboration/collaboration_tree.json` is removed (TC-8). After 469 it holds three things:
  - the run's own identity (`host`): its address moves to `run_metadata.json`, and its run ID and definition are already there;
  - its creation time: the run's own `createdAt` in its history row;
  - links to runs on a peer: these move into their Task record entries (§2.1).
  - The run's message log stays in `collaboration/` (CM-9).
  - The history row's `hasCollaboration` flag is set by the first delegation instead of by the file's first write.
- **Team run and org run:** their tree file is the run itself (members, settings, coordinator) and stays. Their `taskExecutions` lists go, also the org's per-team lists (469 FU-003). So do their `remoteTaskExecutions` lists, which move into Task record entries (§2.1).

### 2.6 The `DelegationTree` (in memory, not stored)

The relationships between runs, held in memory for communication and views, as the old root's tree did, but holding no run's life (P6). Owner: collaboration (TC-11).

| Part | What | From |
| --- | --- | --- |
| Node | A run named by a Task entry, or as an entry's `delegatingRun` | Task entries |
| Edge | Child → parent, one hop | The entry's `delegatedFrom.delegatingRun` |
| Per node: its Tasks | Each Task it works on, open or closed, and the role | Its entries |
| Per Task: its assigner | The `delegatingRun` of the Task's `assigned` entry | That entry |
| Per node: its agents | A standalone run's own agent; a team run's members; an org run's agents and mounted teams' members; a peer's team from its entry's `members` | The run's own file, read once and kept; an org run is re-read on a miss (it can materialize a mounted team later) |
| Per node: its node | `nodeId` for a peer's run | Its entry |

**Built** at startup from the Task entries, which are loaded then whether or not any run runs. **Kept current** by every delegation, closure, reopen and Task deletion, synchronously inside the Task's ordered change: before the change resolves and before that Task's next change. The Task side's record stays the authority for "is this run's Task open"; the tree answers who is related to whom.

**It answers:**

| Question | Answer |
| --- | --- |
| Who delegated me? | My parent |
| Who did I delegate to, still working? | My children with an open Task |
| Who can I reach? | Runs of my open Tasks, and the run that assigned each of them (§10.2) |
| Which run is this agent in? | Node lookup by agent run ID |
| What is under run X? | Walk down from X: views, token totals, the restart notice |

**One tree per run the user started; held by collaboration, not by that run's root.** Each tree starts at a run the user started (16 today), and every delegated run is in exactly one tree (one parent, written once). The tree is not kept inside its top run's root: that root lives and stops with its own run, while the runs under it keep working and keep talking to each other after the top run stops or is deleted (P6). Nor is the tree an address space: every address belongs to one run's own space (§10.7).

**Not in the tree:** runs that no Task entry names (the 15 legacy runs, the runs of a deleted Task). They are ordinary runs of their own; their own `delegatedFrom` gives only their "delegated from" label.

**Validated** (2026-11-11, read-only, `contract-revision-6-2026-11-11.txt`):
- 183 nodes from the entries (181 on this node, 2 on a peer); no node has two parents;
- 0 cycles; every chain ends at a stored run; depth 1: 153, depth 2: 30; 16 top runs;
- the message rule computed on the tree gives the same answer as on the records for all 230 run pairs the rule concerns.

## 3. Every attribute, checked for redundancy

| Attribute | Where | Kept? | Why |
| --- | --- | --- | --- |
| `delegatedFrom.delegatingRun` | Task record entry | **Added** (replaces `hostRoot`) | The index that builds a run's view without reading every run folder (469). One hop. The only stored place of the relationship (P2) |
| `delegatedFrom.delegatorAgentRunId` | Task record entry | **Added** (replaces `assignedBy`, and the run's `taskAgent.delegatorAgentRunId`) | Who may message the run as its delegator and whose row the run is shown under. Present for every role. In 376 of 376 `assigned` entries today's `assignedBy` equals it; the 30 `subWork` and `broughtIn` entries take it from the run's own file (all 30 have it) |
| ~~`hostRoot`~~ | Task record entry | **Removed** | Named the hosting top run. Equal to the run's `coordinatingRun` in 406 of 406, and to the one-hop delegating run in 375 of 406 |
| ~~`assignedBy`~~ | Task record entry | **Removed** | `delegatedFrom.delegatorAgentRunId` |
| `recipientAddress` | Task record entry | Kept | The assignment's display name on every Task view without opening the run. Equals the run's address in 371 of 371 that carry it. A peer's run has no other place on this node |
| `nodeId`, `members` | Task record entry | Only for a peer's run | Moved from the tree link; this node cannot read that run |
| The same `delegatedFrom` on every entry of one run | Task records | Repeated per entry, equal by rule | A run's later Tasks are given only by its assigner. Measured: 54 runs have more than one entry; in 54 of 54 every entry names the same run and the same assigner |
| ~~`taskAgent` (all fields)~~ | delegated run | **Removed** | Origin → the run's own `delegatedFrom`; own facts → own fields (§2.2) |
| `delegatedFrom` | delegated run's own file | **Kept** (from `taskAgent`, one hop) | Its origin, written once (P2, TC-10 revised). Equal to its Task entries' `delegatedFrom`: 181 of 181 runs with entries. Read only by the origin label and a test; routing reads the Task entry |
| `address` | agent run's `run_metadata.json` | **Moved** here (from `taskAgent.address` and the standalone tree's `host.address`) | Not derivable in 6 of 43 delegated agent runs |
| ~~`collaboration_tree.json`~~ | standalone run | **Removed** | No content of its own left (§2.5) |
| ~~`taskExecutions`, `remoteTaskExecutions`~~ | team and org tree files | **Removed** | No local list since 469; remote links → Task record |
| `delegatedFrom` | a peer-started run | Kept, `coordinatingRun` → `delegatingRun` | The same as any delegated run, with `nodeId` |
| The `DelegationTree` | memory only | **Added** (not stored) | Derived from the Task entries and the runs' own agents; one owner (TC-11) |

Result: a delegation is stored under one name, `delegatedFrom`: on the delegated run (its origin, written once) and on each of its Task entries (the assignment). The two are equal by rule. The delegating run stores nothing; its side is the in-memory `DelegationTree`.

## 4. The main scenario as data

The Project Task Manager (standalone) delegates Task T1 to the software engineering team. Its solution designer delegates sub-work to the product team, and the product designer delegates to an image agent.

```text
memory/agents/project_task_manager_7c8d/
  run_metadata.json             "address": "/project_task_manager"       (no delegatedFrom: the user started it)
  collaboration/                its message log only

memory/agent_teams/software_engineering_team_0218/
  team_run_execution_tree.json  rootTeam (members, settings); no taskExecutions; no taskAgent

memory/agent_teams/product_team_e03d/
  team_run_execution_tree.json  the same

memory/agents/image_maker_33f0/
  run_metadata.json             "address": "/image_maker"; no taskAgent

projects/<project>/tasks/T1/agent_run_resources.json
  assigned  software_engineering_team_0218  delegatedFrom { delegatingRun {agent, project_task_manager_7c8d},           delegatorAgentRunId project_task_manager_7c8d }
  subWork   product_team_e03d               delegatedFrom { delegatingRun {agent_team, software_engineering_team_0218}, delegatorAgentRunId solution_designer_65a9 }
  subWork   image_maker_33f0                delegatedFrom { delegatingRun {agent_team, product_team_e03d},              delegatorAgentRunId product_designer_1a2b }
```

The views, built in memory (469, one hop):
- The manager's view shows the engineering team, because one open entry names the manager's run.
- The engineering team's view shows the product team.
- The product team's view shows the image agent.

Today all three entries name the manager as `hostRoot`, the three runs are hosted in the manager's process, and the manager's view lists all three.

## 5. Existing data: every shape, before and after

Counts: the user's data, read-only, 2026-11-11.

| Case | Count | Before | After |
| --- | --- | --- | --- |
| E1 Task entry, delegator is an agent of the top run | 375 entries | `hostRoot` = top run; `assignedBy` on `assigned` | `delegatedFrom { delegatingRun: the top run, delegatorAgentRunId }` |
| E2 Task entry of a nested run (the delegator is an agent of a delegated run) | 31 entries (31 of the 32 nested runs; the 32nd has no Task record, E7) | `hostRoot` = the top run | `delegatedFrom.delegatingRun` = the delegated run the delegator is a part of (one hop) |
| E3 Task entry of a peer's run | 2 entries | `hostRoot`; the node and members only in the tree link | `delegatedFrom`, `nodeId`, and `members` for a team, from the link |
| E4 Task entry with role `delegated` | 28 | `"delegated"` | `"subWork"` |
| E6 delegated run's `taskAgent` | 196 runs | `taskAgent { coordinatingRun, delegatorAgentRunId?, address, launchSource?, userLaunchSelection?, pendingRuntimeSwitch? }` | `delegatedFrom { delegatingRun (one hop: 191 from the delegator's run; 5 from today's `coordinatingRun`: 4 old runs without a delegator, 1 whose delegator's run is no longer stored), delegatorAgentRunId? }`. Address → `run_metadata.address` (agent runs); `launchSource` → own field; `userLaunchSelection` → own launch (9 records) |
| E7 delegated run with no Task record | 15 runs | Hidden from the run list (a task agent is never a root candidate); out of every tree since 469 | An ordinary run of its own in the run list (TC-9) |
| E8 standalone `collaboration_tree.json` | 8 files (all still holding old local entries; 1 holding the 2 peer links) | host, createdAt, entries | Removed after its facts moved (§2.5); the message log stays |
| E9 team and org tree `taskExecutions` lists | Every tree | Old local entries, kept until the next save (469) | Removed |
| E10 a peer-started run on this node | 0 | `delegatedFrom { nodeId, coordinatingRun, delegatorAgentRunId }` | `coordinatingRun` → `delegatingRun` |

Message logs, memory and folders are not touched: each run already has its own (CM-8, CM-9).

## 6. Operations

| Operation | Reads | Writes | Behavior |
| --- | --- | --- | --- |
| Delegate | the target's definition | the Task record entry, then the new run's own files with its `delegatedFrom` | Same tool result and task message as today; the `DelegationTree` gains the node in the same step |
| Build a run's view | the run's own file; the open Task entries whose `delegatedFrom.delegatingRun` is this run; those runs' own files | — | One hop. A peer's run from its entry |
| A delegated run works, idles, wakes | its own files | its own folder | Its own root: shut down when quiet, restored by its next message |
| Message | §10 | both runs' logs (CM-9) | The receiver is restored when it is not running |
| Stop a run (any) | — | its history row | That run only (TC-1) |
| Close a Task | the Task record | `closedAt` | Every run of the record is asked, by its own ID, to stop |
| Delete a Task | the Task record | the record is removed | Its open runs are stopped first, as for a closure. Its runs are then ordinary runs: no entry names a delegating run for them, so they are listed as runs of their own (TC-3, TC-9). Who delegated them remains visible in their conversation (the work packet names the delegator) |
| Reopen and continue, or a follow-up Task | the Task record | the entry (reopened), or a new entry | The run is in its delegating run's view again (469) |
| Settings of a stopped delegated run | its own files | its own files | The ordinary stopped-run save |
| Archive / delete a run | its open Task entries as delegating run | its own folder | Refused while a run it delegated to works on an open Task (TC-2); its delegated runs are never deleted with it |
| Server start | — | — | Admission reads each run's own files only (469 D-11) |

## 7. Validation

### 7.1 Done (read-only, 2026-11-11)

| ID | Check | Result |
| --- | --- | --- |
| V-1 | `delegatedFrom.delegatingRun` can be computed for every entry of a run on this node | 406 of 406: 375 equal today's `hostRoot`; 31 are one hop below it (nested). The one run whose delegator's run is no longer stored has no Task record (it is among E7) |
| V-2 | `delegatedFrom.delegatorAgentRunId` exists for every entry | 376 `assigned` from `assignedBy`; 30 `subWork`/`broughtIn` from the run's own file (30 of 30 record a delegator) |
| V-3 | All entries of one run agree | 54 runs with more than one entry: same `hostRoot` 54/54, same assigner 54/54 |
| V-4 | `recipientAddress` and `assignedBy` equal the run's own facts | 371/371 and 376/376 |
| V-5 | `hostRoot` equals the run's `coordinatingRun` | 406/406 |
| V-6 | What the standalone tree file still holds after 469 | 8 files: the host (address leaf equals the definition ID in 8 of 8), the creation time, old local entries (8 of 8, ignored), 2 peer links (1 file) |
| V-7 | A delegated agent run's address needs a stored place | 6 of 43 differ from the definition ID |
| V-8 | What the Task record lacks for a peer's run | The node and, for a team, its members: both only in the tree link today |
| V-9 | Open runs per holding run | By `hostRoot`: held by 2 runs. One hop: by 3 runs (one open run is nested under a delegated team) |

| V-15 | Every delegated run's own `delegatedFrom` can be computed (revision 6) | 196 of 196: 191 one hop from the delegator's run; 4 without a recorded delegator and 1 whose delegator's run is no longer stored take today's `coordinatingRun` |
| V-16 | The run's own `delegatedFrom` equals each of its Task entries' | 181 of 181 runs that have entries and an own file |
| V-17 | The `DelegationTree` built from the entries is a forest | 183 nodes; no node with two parents; 0 cycles; every chain ends at a stored run |
| V-18 | The message rule answered on the tree equals the rule on the records | 230 of 230 run pairs |
| V-21 | Every address case (§10.7) on the stored sends | 6,646 addressed sends replayed: every delivered one reaches the same receiver, except 53 older sends to a delegated run by address that today's code already refuses; 0 newly found; 3,311 change only by the team prefix; 0 collisions between a delegated team's members and its assigner's standing agents |
| V-20 | A delegated team rebases to `/` | 153 of 153 without a member collision; 2 with a handoff outside the team (no Task record); 30 of 30 non-assigned entries can take `recipientAddress` from `taskAgent.address`; 11 delegated teams with an open Task get new member addresses |
| V-19 | A delegated team run's file fits the ordinary team shape with the team's own root address | 153 of 153 delegated teams: root = delegation address, members under it; 601 of 601 user-started: root `/`. Differences: `teamDefinitionName` absent (153, filled by the migration); `followsTeam` on 770 members (removed); member `launchSource` on 10 (optional field); 2 teams with a handoff to an address outside the team (kept) (`team-run-shapes-2026-11-11.txt`) |

### 7.2 To do in the design, before the contract is final

- V-10 Every code reader of `hostRoot` (14 files), `assignedBy`, `taskAgent` (10), `coordinatingRun` (19), `remoteTaskExecutions` (34), `delegatedFrom` and the standalone tree file, with the decision for each.
- V-11 Why the earlier ticket kept a Settings edit beside the started launch (its DEC-005), and whether the ordinary stopped-run save loses anything (carried from revision 2).
- V-12 The migration: released migrations that read these shapes, the fixtures for E1 … E10, and the order relative to the 469 code (no startup read of trees before the Task records).
- V-13 The client: where it reads `hostRoot`, `taskAgent` and the composed records.
- V-14 Finding the run of a non-entry agent run ID while that run is stopped (§10.5).
- Nothing in this contract has been run as code.

## 8. Simulations

| # | Case | Result |
| --- | --- | --- |
| S1 | The manager delegates T1 to the engineering team | One `assigned` entry with `delegatedFrom { delegatingRun: the manager, delegatorAgentRunId: the manager }`; the team run's own files with the same `delegatedFrom`; the tree gains the node. Nothing in the manager's folder |
| S2 | The solution designer delegates sub-work to the product team | A `subWork` entry with `delegatedFrom.delegatingRun` = the engineering team run. Nothing in either team's files |
| S3 | The product team's coordinator reports to the solution designer | By run ID; the entry names the solution designer as delegator; stored in both logs |
| S4 | The user stops the manager | Its own agent stops; nothing else changes |
| S5 | The engineering team reports while the manager is stopped | The manager is restored and gets the message once |
| S6 | T1 is closed | The three runs are each asked to stop; their entries get `closedAt`; they leave the views |
| S7 | The user stops the engineering team while the product team works | Only the engineering team stops; the product team's report later wakes it |
| S8 | A follow-up Task T2 to the same team by run ID | A new `assigned` entry in T2 with the same `delegatedFrom` |
| S9 | The manager's run is opened in the app | Its view: its own agent, and the open entries naming it (the engineering team) |
| S10 | The engineering team run is opened | Its view lists the product team: one hop at a time |
| S11 | The user deletes the manager while the team works | Refused with the reason (TC-2) |
| S12 | The user deletes it when nothing works | Its folder is removed. The delegated runs are shown as runs of their own (TC-3); each still says "delegated from" the deleted run through its own `delegatedFrom` |
| S13 | A delegation to a peer | The entry holds `nodeId` (and `members` for a team). The peer's run has `delegatedFrom` |
| S14 | One of the 15 runs without a Task record | An ordinary run in the run list (TC-9), with its "delegated from" label from its own `delegatedFrom` |
| S16 | A Task is deleted | Its entries go and the tree drops its runs; each run keeps its own `delegatedFrom` and becomes a top-level run with that label |
| S17 | The product team asks who it can reach | The tree: its node → T1 → the runs of T1 and T1's assigner, the manager |
| S15 | Server restart | No run is running; each is restored by its next message |

## 9. Decisions

| ID | Question | Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| TC-1 | Does Stop of a delegated run still stop the runs it delegated to? | No | The user | Decided, 2026-11-10 |
| TC-2 | Archive or delete of a run whose delegated runs are working | Refused with the reason; its delegated runs are never deleted with it | Solution Designer | Decided |
| TC-3 | A delegated run whose delegating run was deleted | Listed as a run of its own | The user | Decided, 2026-11-10 |
| TC-4 | Delivery | All kinds of delegating run in this ticket: standalone agent runs, team runs, org runs; no hosting remains afterwards | The user | **Revised by the user, 2026-11-11**: "I think we can do the agent team and agent organization in this task as well. We don't have to separate because it's kind of not so easy to have like intermediary states." (earlier, 2026-11-10: in steps, standalone first) |
| TC-5 | A Settings edit of a stopped delegated run | Saved like any stopped run's, subject to V-11 | Solution Designer | Decided, to verify |
| TC-6 | The role name for sub-work | `subWork` | The user | Decided, 2026-11-10 |
| **TC-7** | Where the delegation is stored | **Once, in the Task record (`delegatedFrom`), one hop; no back-link on the delegated run.** Revision 2 stored it on both ends. Since 469 the Task record is the index the views are built from, and a back-link would be a second copy to keep equal | The user | **Decided by the user, 2026-11-11**, with the Task-centered approach ("let's go with this approach") |
| **TC-8** | The standalone run's `collaboration_tree.json` | **Remove it**: its address moves to `run_metadata.json`, and its peer links move to their Task entries | The user | **Decided by the user, 2026-11-11**: the node information of a delegated run on a peer goes "on the task itself … I mean the agent run resource file" (the run's entry in `agent_run_resources.json`), and the file is removed |
| **TC-9** | The 15 old delegated runs with no Task record | **Shown as ordinary runs in the run list.** They have no relationship left to show them under, and they are runs with conversations the user can open, archive or delete. Today they are hidden from the run list and appear only on the Memory page | The user | **Decided by the user, 2026-11-11**: "if they are not associated with task yes i think they are just normal runs" |
| **TC-10** | Does a delegated run also carry `delegatedFrom` in its own file? One name for the record? | **Yes, on the run as well, as its origin; one name.** Revision 5 kept it only in the Task entry. The run's own copy is written once and never changes, so the two cannot drift; each side reads its own (§2.2) | The user | **Revised by the user, 2026-11-11** (revision 6): "it's reasonable to put that information on my side … that's not like a duplicate … it's just like more symmetric information". The single name `delegatedFrom` stays (the user, earlier the same day) |
| **TC-11** | An in-memory structure of the relationships between runs | **The `DelegationTree`** (§2.6): built from the Task entries, owned by collaboration, holding no run's life; communication, views, totals and the notice read it | The user | **Decided by the user, 2026-11-11**: "there should be a in-memory stuff, just like the earlier standalone … root stuff, but it behaves already like a different purpose. It was only trying to host the relationship there, so which helps with the communicating" |
| **TC-12** | The shape of a delegated team run's file | **The ordinary team run file, rooted at `/` like every team run;** the delegation address is the Task entry's `recipientAddress`; a handoff outside the team is an external target, resolved when sent by §10.3 (§2.2). Revised at SR-025: the first answer (root at the delegation address) broke the `/` invariant that server and web code relies on (ARCH-REV-008 AR-018) | Solution Designer (raised by the Implementation Engineer; validated on the data) | Decided (the user informed) |
| **DEC-011** | Which runs may message each other | **Centered on the Task, with today's reach** (§10.2): runs of one open Task, and the run that assigned a Task with every run of it. Replaces the earlier choice between A and B | The user | **Decided by the user, 2026-11-11**: "the routing strategy will be centered around the task itself"; "let's go with this approach" |
| **DEC-012** | A run with several open Tasks | **It may talk with the runs of any of its open Tasks.** It works on all of them; today it is judged by its newest Task only. 0 such runs today | Solution Designer | Decided (the user informed) |

### 9.1 What revision 5 changes against the approved revision 2

| Revision 2 (approved) | Revision 5 | Why |
| --- | --- | --- |
| P2: two ends, a back-link `delegatedFrom` on the delegated run and a link in the delegating run | One record, the Task entry's `delegatedFrom` (TC-7) | 469 removed the link and made the Task record the index |
| `hostRoot` removed as derivable | `hostRoot` replaced by `delegatedFrom` (one hop) | The index needs a key; the old key named the hosting top run |
| A link kept for good in the delegating run's tree | No stored list; a view is built from open entries | 469 |
| Remote run: link in the tree; Task entry with `nodeId` + `delegatingRun` | Everything in the Task entry: `nodeId`, `members` | One place |
| An agent run's address in its own `collaboration_tree.json` | In `run_metadata.json`; the tree file is removed (TC-8) | It was the file's last own fact |
| E7 (old links under an org member) moved to the org's one list | Removed with the lists | 469 |

### 9.2 What revision 6 changes against revision 5

| Revision 5 | Revision 6 | Why |
| --- | --- | --- |
| A delegated run's own file carries nothing of its delegation | It carries `delegatedFrom`, its origin, written once (§2.2) | The user (TC-10 revised): symmetric information; the run tells its own story, also after its Task is deleted; local and peer-started runs look the same |
| Relationship lookups as questions on the Task side's port | The `DelegationTree`, an in-memory structure owned by collaboration (§2.6) | The user (TC-11): the relationships deserve their own structure, like the old root's tree without its control over lives; the Task side owns only Task records |
| Migration: `taskAgent` removed | `taskAgent` → `delegatedFrom` on the run (E6) | — |

## 10. Communication: centered on the Task

The user's direction (2026-11-11): what agents can do today stays supported. The reason two runs may talk is that they work on the same Task, not that one runs inside the other ("the product team may message the manager because it is doing part of the manager's Task, not because it is running inside the manager's process"). The Task decides who may talk and where the receiver is. Nothing hosts another run.

### 10.1 The tools

| Tool | Meaning | Never does |
| --- | --- | --- |
| `send_message_to(recipient_address)` | Reaches the one standing agent at that address that the sender can talk with (§10.3) | Create a run; reach a delegated run, which has no address (CM-5) |
| `send_message_to(target_agent_run_id)` | Reaches exactly that agent run (§10.2) | Create a run |
| `delegate_task` | Creates a delegated run and its Task entry, or gives a run it delegated to a further Task | — |
| The user's composer and `@` | Unchanged | — |

### 10.2 The rule: who may message whom

Two runs may message each other, by run ID, in either direction, when **at least one** holds:

- **(a) Same Task:** both work on one open Task. Example: the engineering team, the product team and the image agent, all on T1.
- **(b) The assigner's run:** one of them is the run whose agent assigned the other's open Task. Example: the manager, for every run working on a Task it assigned, at any depth.

Unchanged:
- **The Task rule:** two runs of different Tasks are refused ("it works on a different Task"); a run whose Task is closed is refused, except that its assigner continues it after a reopen.
- **Inside one run:** teammates of a team run, or the agents of an org run, reach each other as today. That is one run; the Task is not asked.
- **Runs on a peer:** a peer's run talks with the agent that delegated to it, as today (CM-11). The node is read from its Task entry.
- **An active run elsewhere:** the live-only route, as today.

Why this is today's reach without hosting:
- Today two runs may talk when they are under one top run and do not work on different Tasks. The top run's own agents work on no Task, so they reach every run under them.
- The run that assigned a Task *is* that top run. Measured: 375 of 376 assigned entries; the one exception was assigned by a delegated run that has no Task record (a legacy run).
- So (a) and (b) give the same pairs as today for every run that works on a Task.

A run with several open Tasks (0 today) may talk with the runs of any of its open Tasks (DEC-012).

### 10.3 Who can be reached by address

The first match wins. A miss inside a team never falls through to another team.

1. **The sender's own team:** a teammate at its address in the team's space (`/code_reviewer`). In an org's mounted team, also the team's own address (`/dev_team`, its coordinator). A team run's root `/` is never an address. For a delegated team this drops the prefix it has today (§10.7 A4, A5).
2. **The standing agents of the run that assigned the sender's Task:**
   - for every run working on a Task the manager assigned, `/project_task_manager`;
   - for a Task assigned by a member of a team run the user started, that team's members.
   - for a Task assigned by an agent of an org run, the org's agents and mounted teams (`/ceo_agent`, `/dev_team`, `/dev_team/dev_lead`).

   This is today's "standing agents of the top run", found through the Task.
3. **The run's own standing agents:** for an agent of a run the user started (no Task), its own run's configured agents. Unchanged.

Any other address gets "No agent or agent team you can talk with has the address …", with today's guidance. A delegated run's members are not reachable by address from outside it, as today (they are reached by run ID).

### 10.4 What every delivered message does

- It wakes its receiver once, restoring the conversation.
- It is stored in both runs' logs with one message ID (CM-9).
- It names its sender.
- Reference files pass on one node.

All unchanged.

### 10.5 How the server answers, from the `DelegationTree`

| Question | Answer |
| --- | --- |
| Which run does agent run ID X belong to? | The tree's node whose agents include X: a delegated run (its entry agent or any member), a run that delegated (its own agents), or a peer's run (its entry's `members`) |
| May sender and receiver talk? | `canMessage` on the tree, §10.2: the two nodes share an open Task, or one node is the assigner of the other's open Task. The rule is the tree's: the same structure that the views read decides who can talk |
| Which run assigned my Task? | The Task's assigner on the tree (the `delegatingRun` of its `assigned` entry) |
| Is the receiver running? | Its own run; if not, it is loaded and woken like any stopped run |

The `DelegationTree` (§2.6) answers every question above from memory, also after a restart and while the runs are stopped. No run keeps an index of other runs' agents.

### 10.6 Validated on the user's data (read-only, 2026-11-11)

`evidence/data-model-validation/task-centered-messaging-2026-11-11.txt`, every stored message between two runs:

| | Messages |
| --- | --- |
| Between two runs | 1,604 |
| Allowed today and by the Task rule | 1,540 (103 by (a), 1,437 by (b)) |
| Allowed today, refused by the Task rule | 64: every one has a delegated run with no Task record on one side (legacy, 2026-08 … 2026-10) |
| Refused today, allowed by the Task rule | 0 |

The Task rule never allows more than today. It refuses only messages with the 15 legacy runs (TC-9), which stay in the logs.

### 10.7 Every address, case by case

**Every address belongs to the space of one run.**
- A team run's space is rooted at `/`, whoever started it: `/solution_designer`, `/code_reviewer`.
- An org run's space holds its agents (`/ceo_agent`) and its mounted teams (`/dev_team`, `/dev_team/dev_lead`).
- A standalone agent run's space holds that agent (`/project_task_manager`).
- The address a run was delegated to (`/software_engineering_team`) is a name in its delegator's space, stored as the Task entry's `recipientAddress`. It is not an address of the delegated run's agents.
- The `DelegationTree` is not an address space. It relates runs and never gives another run's agents an address.

**What an agent can reach by address**, first match wins (§10.3):
1. Its own team: its teammates; in an org's mounted team, also that team as a unit.
2. The standing agents of the run that assigned its Task (delegated runs only).
3. Its own run's standing agents (runs the user started).

Everything else is reached by run ID, which includes every delegated run.

The runs are those of §13: the manager `/project_task_manager` assigned T1 to the engineering team E (delegated at `/software_engineering_team`). E's `solution_designer` gave sub-work of T1 to the product team P (`/product_team`) and to the image agent I (`/image_maker`). Also: the user's marketing team (`/marketing_coordinator`, `/copywriter`), the user's org (`/ceo_agent`, `/cto`, mounted team `/dev_team` with `/dev_team/dev_lead` and `/dev_team/qa`), and S, a team the org's `ceo_agent` delegated, with the handoff rule `to: "/Teacher"`.

"Replayed" is `evidence/data-model-validation/every-address-2026-11-11.txt`: the replay of every `send_message_to` by address stored in the agents' traces (6,646 sends) under these rules, comparing the receiver with the one that got the message. It also covers the sender address of every stored message (§10.7 E).

**A. Inside one run**

| # | From | To | What the sender writes | Step | Against today | Replayed |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Marketing's `copywriter` (`/copywriter`) | Its teammate | `send_message_to(recipient_address: "/marketing_coordinator")` | 1 | Same | 2,237 user-started team sends; the same receiver |
| A2 | The org's `ceo_agent` (`/ceo_agent`) | Another org agent; the mounted team; a member of it | `"/cto"`; `"/dev_team"` (its coordinator); `"/dev_team/dev_lead"` | 3 | Same | 514 sends inside an org (A2 and A3); the same receiver |
| A3 | The mounted team's `dev_lead` (`/dev_team/dev_lead`) | Its teammate; an org agent | `"/dev_team/qa"`; `"/ceo_agent"`. A miss under `/dev_team/` is not found and never falls through | 1; 3 | Same | In A2 |
| A4 | E's `solution_designer` (`/solution_designer`) | Its teammate | `"/code_reviewer"` | 1 | **Changed:** `"/software_engineering_team/code_reviewer"` | 3,311 delegated-team sends; every one reaches the same receiver with the prefix dropped |
| A5 | E's member | E as a unit | No address: `/` is never addressable, as in every team the user starts. The coordinator is `"/solution_designer"` | — | **Changed:** `"/software_engineering_team"` reached the coordinator | 0 sends |
| A6 | E's member | An old prefixed address from its history, `"/software_engineering_team/code_reviewer"` | Not found, with today's guidance. Its member context names its new addresses | — | **Changed** | The members of the 11 delegated teams with an open Task |

**B. A delegated run to the run that assigned its Task**

| # | From | To | What the sender writes | Step | Against today | Replayed |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | E's `solution_designer` | The manager | `"/project_task_manager"` | 2: T1's assigner | Same | 311 delegated-team and 104 delegated-agent sends; the same receiver |
| B2 | P's `product_designer` (sub-work of T1) | The manager | `"/project_task_manager"` | 2: T1's assigner, not P's delegator | Same | In B1 |
| B3 | I, delegated by marketing's `copywriter` | Marketing's members | `"/copywriter"`, `"/marketing_coordinator"` | 2 | Same | 6; the same receiver |
| B4 | S's member | The org's agents and mounted team | `"/ceo_agent"`, `"/dev_team"`, `"/dev_team/dev_lead"` | 2 | Same | 1; the same receiver |
| B5 | S's member, following its handoff rule | The org's `Teacher` | `get_handoff_rules` names `"/Teacher"`; `send_message_to(recipient_address: "/Teacher")` | 2 | Same | 0 sends. The 2 legacy teams with such a rule have no Task record, so for them it is not found |

**C. No address: by run ID**

| # | From | To | What the sender writes | Against today | Replayed |
| --- | --- | --- | --- | --- | --- |
| C1 | The manager | E's coordinator or any member of E | `send_message_to(target_agent_run_id: "solution_designer_65a9")`. `"/software_engineering_team"` is not found | Same: today's code reaches delegated runs by run ID only | 53 older sends (2026-08 … 2026-10, before that rule) reached a delegated run by address; 51 of them involve a run with no Task record |
| C2 | P's member | E's `solution_designer`, who delegated P | `target_agent_run_id: "solution_designer_65a9"`. `"/solution_designer"` means P's own member of that name if P has one; otherwise it is not found | Same | — |
| C3 | E, P and I, among themselves (one Task) | Each other | By run ID. `"/product_team"` is not found | Same | 2 sends of 2026-10 reached `/product_team` by address, before that rule |
| C4 | Runs of different Tasks | Each other | Run ID, refused by the Task rule | Same | — |
| C5 | A run started by a peer | Its delegator on the other node | By run ID (CM-11) | Same | 0 such runs |
| C6 | A legacy run (no Task record) | — | Only its own run's agents by address (step 3 for a run of its own) | Same as a run the user started | — |

**D. `delegate_task`: an address in the delegator's own list**

| # | From | What it writes | Result | Against today |
| --- | --- | --- | --- | --- |
| D1 | The manager | `delegate_task(recipient_address: "/software_engineering_team")` | A new team run rooted at `/`; the Task entry stores `recipientAddress: "/software_engineering_team"` | Same address. **Changed:** the team's file is no longer rooted at it |
| D2 | E's member | `delegate_task(recipient_address: "/code_reviewer")` | Refused: its own team | Same |
| D3 | E's member | `delegate_task(recipient_address: "/software_engineering_team")` | A new copy of the team, as in a team the user started | **Changed:** today it is refused as its own team in a delegated team only. History: 0 such refusals |
| D4 | E's `solution_designer` | `delegate_task(recipient_address: "/product_team")` | P, rooted at `/`, `recipientAddress: "/product_team"` | Same address |

**E. The sender address a receiver is given**

The address shown is the sender's address in its own space, given only when the receiver can use it to reach the sender (`reachingAddressOf`). Otherwise the receiver gets only the run ID.

| # | Sender → receiver | Given | Replayed (stored messages) |
| --- | --- | --- | --- |
| E1 | Teammates, or agents of one org | `"/code_reviewer"` | 13,200: the address is given |
| E2 | The manager → E's member | `"/project_task_manager"` (by step 2 from E) | 690: the address is given |
| E3 | E's member → the manager | The run ID only: the manager cannot address E | 747: the run ID only |
| E4 | Runs of one Task (E ↔ P ↔ I) | The run ID only | 167: the run ID only |

`list_available_agents` gives exactly the addresses of steps 1 to 3 and the catalog addresses for `delegate_task`.

**Checked on the data:**
- Every delivered send reaches the same receiver under these rules, except the 53 older sends that addressed a delegated run. Today's code already refuses those.
- The 10 sends refused today as not found are still not found. Every other send that failed today failed for another reason (content, activation, a tool error) and finds its receiver under these rules.
- 0 delegated teams have a member whose address equals a standing agent of the run that assigned their Task, so step 1 never hides a step-2 agent.

## 11. The life of a delegation, as records

Replaces revision 4's "life of a link": since 469 there is no stored link to keep alive.

| Step | Task record | Run files | Views (in memory) |
| --- | --- | --- | --- |
| L1 M delegates T1 to E | New `assigned` entry, `delegatedFrom` = M | E's own files, with `delegatedFrom` = M | The tree gains E under M; M's view shows E |
| L2 E goes quiet, later wakes | — | — | Unchanged |
| L3 T1 closes | `closedAt` | — | E leaves M's view once stopped |
| L4 T1 reopened, M messages E | `closedAt: null` | — | E is in M's view again |
| L5 M gives E T2 by run ID | New `assigned` entry in T2, same `delegatedFrom` | — | E stays while either Task is open |
| L6 E's designer delegates sub-work to P | `subWork` entry, `delegatedFrom.delegatingRun` = E | P's own files | P in E's view, not in M's |
| L7 A temporary Task | The same, under `ad-hoc-tasks/` | — | Until that Task closes; no timer |
| L8 A run on a peer | The entry holds `nodeId`, `members` | The peer's own | The same rule |

## 12. The contract walked through for communication

Setup as in §10.2:
- The manager M assigned T1 to the engineering team E (coordinator Ec, member Em).
- E's designer handed sub-work of T1 to the product team P (coordinator Pc, member Pm) and to the image agent I.
- M assigned T2 to the research agent R.

| # | Case | Found through | Admitted by | Result |
| --- | --- | --- | --- | --- |
| W1 | M → Ec by run ID | E's entry in T1 (`agentRun.coordinatorAgentRunId`) | (b): M assigned T1 | Works |
| W2 | Em → M by address `/project_task_manager` | T1's `assigned` entry: `delegatedFrom.delegatingRun` = M; M's standing address | (b) | Works |
| W3 | Pm → M by address (the product team reaches the manager) | The same | (b): M assigned T1, P works on T1 | Works, as today |
| W4 | Pm → Em by run ID | E's run answers for its member (running) or its file lists it (stopped) | (a): both on T1 | Works |
| W5 | P ↔ I by run ID | Their T1 entries | (a) | Works |
| W6 | M → Pc by run ID | P's T1 entry | (b) | Works |
| W7 | M → Ec after T1 closed and reopened | E's T1 entry, reopened by the assigner's message | (b), the assigner | Works |
| W8 | P ↔ R | — | Different Tasks | Refused, as today |
| W9 | Anyone ↔ a run of a closed Task | — | — | Refused, except the assigner's reactivation |
| W10 | The receiver is stopped | Its entry | — | Loaded and woken like any stopped run |
| W11 | One of the 15 legacy runs ↔ anyone | — | No Task | Refused (TC-9); 64 such messages in the history |

Not covered: the code. This is a check of the rules against the stored model and the stored messages.

## 13. Every case as data

The exact files and in-memory nodes for each case, after this change (§13.1), and every stored shape before and after the migration (§13.2).

The runs used in the examples:
- `project_task_manager_7c8d`: the manager, a standalone run the user started.
- `software_engineering_team_0218`: a delegated team run, coordinator `solution_designer_65a9`.
- `product_team_e03d`: a delegated team run, coordinator `product_designer_1a2b`.
- `image_maker_33f0`: a delegated agent run.
- `marketing_team_5a00`: a team run the user started, member `copywriter_77c1`.
- `company_org_9d00`: an org run, with the direct agent `ceo_agent_1f2e` and the mounted team `/dev_team`, member `dev_lead_4c3d`.
- `node-b-1f0e`: a peer node.

### 13.1 Delegation cases (the target)

The delegating run's own files never change in any case: nothing about a delegated run is stored there (P2). Only the Task entry, the delegated run's own file, and the in-memory tree are shown.

**D1: a standalone agent delegates (the manager → the engineering team, Task T1).**

T1's `agent_run_resources.json`, the new entry:
```json
{ "role": "assigned",
  "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
                     "delegatorAgentRunId": "project_task_manager_7c8d" },
  "recipientAddress": "/software_engineering_team",
  "agentRun": { "kind": "team", "teamRunId": "software_engineering_team_0218", "coordinatorAgentRunId": "solution_designer_65a9" },
  "linkedAt": "2026-11-10T09:39:18.439Z", "start": "started", "closedAt": null }
```
`memory/agent_teams/software_engineering_team_0218/team_run_execution_tree.json`:
```json
{ "createdAt": "2026-11-10T09:39:18.439Z", "archivedAt": null, "applicationBinding": null, "handoffs": [ "…" ],
  "rootTeam": { "address": "/", "teamDefinitionId": "software-engineering-team", "teamDefinitionName": "Software Engineering Team",
                "teamRunId": "software_engineering_team_0218", "coordinatorAddress": "/solution_designer",
                "defaultLaunchConfiguration": { "…": "…" },
                "members": [ { "address": "/solution_designer", "agentRunId": "solution_designer_65a9", "…": "…" },
                             { "address": "/code_reviewer", "agentRunId": "code_reviewer_m_3b10", "…": "…" } ] },
  "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
                     "delegatorAgentRunId": "project_task_manager_7c8d" } }
```
The team's own file is rooted at `/`; the address it was delegated to is the entry's `recipientAddress` (§2.2).

The tree, in memory (not stored):
```json
{ "run": { "kind": "agent_team", "runId": "software_engineering_team_0218" },
  "parent": { "kind": "agent", "runId": "project_task_manager_7c8d" },
  "delegatorAgentRunId": "project_task_manager_7c8d",
  "tasks": [ { "taskId": "T1", "role": "assigned", "open": true, "assigner": { "kind": "agent", "runId": "project_task_manager_7c8d" } } ],
  "agents": [ "solution_designer_65a9", "code_reviewer_m_3b10" ] }
```

**D2: a member of a team run the user started delegates to an agent (copywriter → image agent, Task T3).**
```json
{ "role": "assigned",
  "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "marketing_team_5a00" }, "delegatorAgentRunId": "copywriter_77c1" },
  "recipientAddress": "/image_maker",
  "agentRun": { "kind": "agent", "agentRunId": "image_maker_33f0" },
  "linkedAt": "2026-11-11T08:00:00.000Z", "start": "started", "closedAt": null }
```
`memory/agents/image_maker_33f0/run_metadata.json`:
```json
{ "runId": "image_maker_33f0", "agentDefinitionId": "image-maker", "address": "/image_maker",
  "workspaceRootPath": "/Users/me/projects/x", "memoryDir": "…/memory/agents/image_maker_33f0",
  "llmModelIdentifier": "gpt-image", "llmConfig": null, "autoExecuteTools": true, "runtimeKind": "autobyteus",
  "platformAgentRunId": "…", "startedAt": "2026-11-11T08:00:00.000Z",
  "launchSource": { "origin": "agent_default", "fallbacks": [] },
  "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "marketing_team_5a00" }, "delegatorAgentRunId": "copywriter_77c1" } }
```
Tree node: `parent` = `marketing_team_5a00`; `tasks` = `[T3, assigned, open, assigner marketing_team_5a00]`.

**D3: a direct agent of an org run delegates to a team (the CEO agent → the product team, Task T4).**
```json
{ "role": "assigned",
  "delegatedFrom": { "delegatingRun": { "kind": "agent_org", "runId": "company_org_9d00" }, "delegatorAgentRunId": "ceo_agent_1f2e" },
  "recipientAddress": "/product_team",
  "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" },
  "linkedAt": "2026-11-11T08:10:00.000Z", "start": "started", "closedAt": null }
```
The product team's own file carries `"delegatedFrom": { "delegatingRun": { "kind": "agent_org", "runId": "company_org_9d00" }, "delegatorAgentRunId": "ceo_agent_1f2e" }`. The org's `agent_org_run_execution_tree.json` keeps its own units only: no `taskExecutions`, no `remoteTaskExecutions`.

**D4: a member of a team mounted in an org run delegates (the dev lead → an agent, Task T5).** As D3, with `"delegatorAgentRunId": "dev_lead_4c3d"` and the same `delegatingRun` (the org run: a mounted team is a part of the org run).

**D5: a member of a delegated team delegates sub-work (the solution designer → the product team, part of T1).**
```json
{ "role": "subWork",
  "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" },
                     "delegatorAgentRunId": "solution_designer_65a9" },
  "recipientAddress": "/product_team",
  "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" },
  "linkedAt": "2026-11-10T11:00:00.000Z", "start": "started", "closedAt": null }
```
The product team's own file: the same `delegatedFrom` (one hop: the engineering team, not the manager).

Tree node:
```json
{ "run": { "kind": "agent_team", "runId": "product_team_e03d" },
  "parent": { "kind": "agent_team", "runId": "software_engineering_team_0218" },
  "tasks": [ { "taskId": "T1", "role": "subWork", "open": true, "assigner": { "kind": "agent", "runId": "project_task_manager_7c8d" } } ] }
```
So the product team can reach the engineering team (same Task) and the manager (T1's assigner), and is shown under the engineering team.

**D6: a delegated agent run delegates (the image agent → an upscaler, part of its Task T3).** A `subWork` entry in T3 with `"delegatingRun": { "kind": "agent", "runId": "image_maker_33f0" }`, `"delegatorAgentRunId": "image_maker_33f0"`. The same `delegatedFrom` in the upscaler's own `run_metadata.json`.

**D7: a run a peer started on this node** (node B runs it; the Task record is on node A). Its own file only, with `nodeId`:
```json
"delegatedFrom": { "nodeId": "node-a-77d2",
                   "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
                   "delegatorAgentRunId": "project_task_manager_7c8d" }
```
It is "started by a peer" because `nodeId` is present (§2.4, `isPeerStarted`). Its node has no Task entry for it, and it is not in node B's tree.

**D8: a delegation to a peer** (this node's view): the Task entry holds the peer run's node and members (§2.1, the second example). The tree node has `"node": "node-b-1f0e"` and `"agents"` from the entry's `members`.

### 13.2 Existing data: every shape, before → after the migration

**E1: Task entry, delegator is an agent of the top run** (375):
```json
before: { "role": "assigned", "assignedBy": "project_task_manager_7c8d", "recipientAddress": "/software_engineering_team",
          "hostRoot": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "agentRun": { "…": "…" }, "linkedAt": "…", "start": "started", "closedAt": "…" }
after:  { "role": "assigned",
          "delegatedFrom": { "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "project_task_manager_7c8d" },
          "recipientAddress": "/software_engineering_team", "agentRun": { "…": "…" }, "linkedAt": "…", "start": "started", "closedAt": "…" }
```

**E2: Task entry of a nested run** (31):
```json
before: { "role": "delegated", "hostRoot": { "kind": "agent", "runId": "project_task_manager_7c8d" },
          "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" }, "…": "…" }
after:  { "role": "subWork",
          "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" },
          "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" }, "…": "…" }
```
The delegator comes from the run's own `taskAgent.delegatorAgentRunId`; the delegating run is the run that agent is a part of.

**E3: Task entry of a peer's run** (2): `hostRoot` → `delegatedFrom`, plus the link's facts:
```json
before (entry): { "role": "assigned", "assignedBy": "project_task_manager_7c8d", "hostRoot": { "…": "…" }, "agentRun": { "kind": "team", "teamRunId": "research_team_77aa", "coordinatorAgentRunId": "lead_0c11" }, "…": "…" }
before (link in the manager's collaboration_tree.json):
                { "address": "/research_team", "teamRunId": "research_team_77aa", "nodeId": "node-b-1f0e", "coordinatorAddress": "/research_team/lead",
                  "members": [ { "address": "/research_team/lead", "agentRunId": "lead_0c11" }, { "address": "/research_team/analyst", "agentRunId": "analyst_5d20" } ],
                  "delegatorAgentRunId": "project_task_manager_7c8d", "startedAt": "…" }
after (entry):  { "role": "assigned", "delegatedFrom": { "…": "the manager" }, "recipientAddress": "/research_team",
                  "agentRun": { "kind": "team", "teamRunId": "research_team_77aa", "coordinatorAgentRunId": "lead_0c11" },
                  "nodeId": "node-b-1f0e",
                  "members": [ { "address": "/research_team/lead", "agentRunId": "lead_0c11" }, { "address": "/research_team/analyst", "agentRunId": "analyst_5d20" } ], "…": "…" }
```
`coordinatorAddress` is not kept: it is the member whose run ID is `coordinatorAgentRunId`.

**E4: role `delegated`** (28): `"role": "delegated"` → `"role": "subWork"`.

**E6: a delegated run's own file** (196):
```json
before (agent): { "runId": "image_maker_33f0", "…": "…",
                  "taskAgent": { "coordinatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" }, "delegatorAgentRunId": "copywriter_77c1",
                                 "address": "/image_maker", "launchSource": { "origin": "agent_default", "fallbacks": [] } } }
after (agent):  { "runId": "image_maker_33f0", "…": "…", "address": "/image_maker", "launchSource": { "origin": "agent_default", "fallbacks": [] },
                  "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "marketing_team_5a00" }, "delegatorAgentRunId": "copywriter_77c1" } }
before (team):  { "rootTeam": { "address": "/product_team", "teamDefinitionId": "product-team", "teamRunId": "product_team_e03d", "…": "…",
                                "members": [ { "address": "/product_team/product_designer", "followsTeam": true, "launchConfiguration": { "…": "…" }, "…": "…" } ],
                                "taskExecutions": [] },
                  "taskAgent": { "coordinatingRun": { "…": "…" }, "delegatorAgentRunId": "solution_designer_65a9", "address": "/product_team" } }
after (team):   { "rootTeam": { "address": "/", "teamDefinitionId": "product-team", "teamDefinitionName": "Product Team", "teamRunId": "product_team_e03d", "…": "…",
                                "members": [ { "address": "/product_designer", "launchConfiguration": { "…": "…" }, "…": "…" } ] },
                  "delegatedFrom": { "delegatingRun": { "kind": "agent_team", "runId": "software_engineering_team_0218" }, "delegatorAgentRunId": "solution_designer_65a9" } }
```
- 4 old runs have no `delegatorAgentRunId`: their `delegatedFrom` has only `delegatingRun`, today's `coordinatingRun`.
- 1 run's delegator's run is no longer stored: `delegatingRun` = today's `coordinatingRun`, `delegatorAgentRunId` kept.
- With `userLaunchSelection` (9): its values become the run's own launch fields; `launchSource` is dropped.

**E7: a delegated run with no Task record** (15): the same as E6. No Task entry names it, so it is not in the tree. It is listed as a run of its own (TC-9), labeled with its `delegatedFrom`.

**E8: the manager's `collaboration_tree.json`** (8):
```json
before: { "subjectKind": "agent", "createdAt": "…",
          "host": { "address": "/project_task_manager", "agentRunId": "project_task_manager_7c8d", "agentDefinitionId": "project-task-manager" },
          "collaborators": [],
          "taskExecutions": [ { "address": "/software_engineering_team", "teamRunId": "software_engineering_team_0218", "delegatorAgentRunId": "project_task_manager_7c8d", "startedAt": "…" },
                              { "address": "/research_team", "teamRunId": "research_team_77aa", "nodeId": "node-b-1f0e", "…": "…" } ] }
after:  the file is removed; run_metadata.json gains "address": "/project_task_manager"; the peer link went to its Task entry (E3);
        collaboration/ keeps the message log
```

**E9: team and org trees**: `rootTeam.taskExecutions`, `rootOrg.taskExecutions`, the org's per-team `taskExecutions`, and `remoteTaskExecutions` are removed. An empty `collaborators: []` left by `20261015_…` (39 trees, all empty) is not read and stays.

**E10: a peer-started run on this node** (0): `"delegatedFrom": { "nodeId": …, "coordinatingRun": … }` → `"delegatedFrom": { "nodeId": …, "delegatingRun": … }`.

**A preserved partial state** (a predecessor's unfinished item, §5 and the design's DS-10): a tree whose `taskExecutions` still holds a full record:
```json
{ "address": "/software_engineering_team", "teamRunId": "software_engineering_team_0218", "platformAgentRunId": "…",
  "members": [ { "…": "…" } ], "taskExecutions": [ { "address": "/product_team", "teamRunId": "product_team_e03d", "…": "…" } ], "…": "…" }
```
- The tree file stays as it is, and so do the own files of the two runs.
- Their Task entries are converted as in E1 and E2, with the delegator read from this record.
- The item is reported as a warning.
