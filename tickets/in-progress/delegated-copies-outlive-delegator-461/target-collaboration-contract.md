# Delegation Contract — A Delegated Run Is An Ordinary Run

Status: **revision 5, proposed** (2026-11-11, SR-014). Rebased on `origin/personal` `827f1e68dc`, which contains autobyteus-469. Task `autobyteus-461`.

History:
- Revision 1 gave the words and rules; revision 2 added the data level, and the user approved it (2026-11-10, SR-007; TC-1 … TC-6).
- Revisions 3 (§10 Communication) and 4 (§11 the life of a link) were proposed on 2026-11-10 and never approved.
- autobyteus-469 then changed the base: a top run stores no list of the runs it delegated to on this node. The Task record became the index, and the tree is built in memory from the Tasks that are open.
- Revision 5 rewrites §2 … §12 on that base. Every count was measured again on the user's data on 2026-11-11 (read-only): `evidence/data-model-validation/contract-after-469-2026-11-11.txt` and `relationship-in-task-record-2026-11-11.txt`.
- What changes against the approved revision 2 is listed in §9.1. The user decided TC-7, TC-8, TC-9 and DEC-011 on 2026-11-11.

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
- **P2 The delegation is stored once on each node, as `delegatedFrom`.** On this node it is in the Task's entry for the run: which run and which agent delegated it. Neither the delegating run nor the delegated run stores it in its own files. The exception is a run started by a peer: its Task record is on the other node, so it carries `delegatedFrom`, with the same name and shape, in its own file (§2.4). *(Revision 2 stored the relationship as two ends, a link and a back-link. 469 removed the link and made the Task record the index; a copy on the run would be a second copy of the entry's fact, and the two would disagree once a Task is deleted: TC-10.)*
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
| `recipientAddress` | The address the run was delegated to, its display name | `assigned` (as today), and every entry of a peer's run |
| `agentRun` | The run, by kind and ID; a team's coordinator | Always |
| `nodeId` | The peer the run is on | Only for a peer's run; absent means this node |
| `members` | Every member of a peer's team run, by address and run ID | Only for a peer's team run |
| `linkedAt`, `start`, `startError`, `closedAt` | Unchanged | As today |

`delegatedFrom` replaces today's `hostRoot` and `assignedBy`:
- `hostRoot` named the top run that *hosted* the run. In 31 of 406 entries that is not the run that delegated it (nested delegations).
- `assignedBy` was the delegator, on `assigned` entries only.

The field is new on the Task entry, because its meaning is new: one hop, on every role (Data Migration Guideline: never reuse a name for another meaning). It has the same name and shape as the record a peer-started run carries in its own file (§2.4): one concept, one name (TC-10).

`subWork` is today's `delegated`, renamed (TC-6, the user): every run in this record is a delegated run, so the old value said nothing.

### 2.2 A delegated run's own files

The ordinary files of its kind. The `taskAgent` section is removed: its relationship facts are in the Task record (§2.1), and its own facts move to the ordinary places:

| Today in `taskAgent` | Target |
| --- | --- |
| `coordinatingRun` | Removed: nothing hosts |
| `delegatorAgentRunId` | The Task record's `delegatedFrom.delegatorAgentRunId` |
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
  "launchSource": { "origin": "catalog", "fallbacks": [] }
}
```

Nothing in it says it was delegated. The Task record says so.

### 2.3 A run's own address

- **Agent run:** `address` in `run_metadata.json`. It is written when the address is first fixed: for a delegated run, at the delegation; for a run the user started, when it first collaborates (as `collaboration_tree.json` `host.address` is written today).
  - It is stored because it cannot always be derived: 6 of 43 delegated agent runs have an address that is not their definition's ID.
  - When it is absent, the address is derived from the definition's name, as today for a run that never collaborated. That absence has one truthful meaning: "not fixed yet".
- **Team run:** `rootTeam.address`, as today.

### 2.4 A run started by a peer

`delegatedFrom { nodeId, delegatingRun, delegatorAgentRunId }` on the run's own file, as today, with `coordinatingRun` renamed `delegatingRun` (0 such runs on the user's machine). The Task record of that delegation is on the other node, so this run keeps the one relationship fact it needs to answer and to admit messages.

### 2.5 The delegating run's own files: nothing about delegated runs

- **Standalone agent run:** `collaboration/collaboration_tree.json` is removed (TC-8). After 469 it holds three things:
  - the run's own identity (`host`): its address moves to `run_metadata.json`, and its run ID and definition are already there;
  - its creation time: the run's own `createdAt` in its history row;
  - links to runs on a peer: these move into their Task record entries (§2.1).
  - The run's message log stays in `collaboration/` (CM-9).
  - The history row's `hasCollaboration` flag is set by the first delegation instead of by the file's first write.
- **Team run and org run:** their tree file is the run itself (members, settings, coordinator) and stays. Their `taskExecutions` lists go, also the org's per-team lists (469 FU-003). So do their `remoteTaskExecutions` lists, which move into Task record entries (§2.1).

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
| ~~`taskAgent` (all fields)~~ | delegated run | **Removed** | Relationship facts → Task record; own facts → own fields (§2.2) |
| `address` | agent run's `run_metadata.json` | **Moved** here (from `taskAgent.address` and the standalone tree's `host.address`) | Not derivable in 6 of 43 delegated agent runs |
| ~~`collaboration_tree.json`~~ | standalone run | **Removed** | No content of its own left (§2.5) |
| ~~`taskExecutions`, `remoteTaskExecutions`~~ | team and org tree files | **Removed** | No local list since 469; remote links → Task record |
| `delegatedFrom` | a peer-started run | Kept, `coordinatingRun` → `delegatingRun` | Its Task record is on the other node |

Result: the relationship of a delegation on this node is stored once, in one entry per Task, under one name (`delegatedFrom`) that a peer-started run also uses. No run file carries anything of another run.

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
| E6 delegated run's `taskAgent` | 196 runs | `taskAgent { coordinatingRun, delegatorAgentRunId?, address, launchSource?, userLaunchSelection?, pendingRuntimeSwitch? }` | Removed. Address → `run_metadata.address` (agent runs); `launchSource` → own field; `userLaunchSelection` → own launch (9 records; V-9) |
| E7 delegated run with no Task record | 15 runs | Hidden from the run list (a task agent is never a root candidate); out of every tree since 469 | An ordinary run of its own in the run list (TC-9) |
| E8 standalone `collaboration_tree.json` | 8 files (all still holding old local entries; 1 holding the 2 peer links) | host, createdAt, entries | Removed after its facts moved (§2.5); the message log stays |
| E9 team and org tree `taskExecutions` lists | Every tree | Old local entries, kept until the next save (469) | Removed |
| E10 a peer-started run on this node | 0 | `delegatedFrom { nodeId, coordinatingRun, delegatorAgentRunId }` | `coordinatingRun` → `delegatingRun` |

Message logs, memory and folders are not touched: each run already has its own (CM-8, CM-9).

## 6. Operations

| Operation | Reads | Writes | Behavior |
| --- | --- | --- | --- |
| Delegate | the target's definition | the new run's own files, then the Task record entry | Same tool result and task message as today |
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
| S1 | The manager delegates T1 to the engineering team | The team run's own files; one `assigned` entry with `delegatedFrom { delegatingRun: the manager, delegatorAgentRunId: the manager }`. Nothing in the manager's folder |
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
| S12 | The user deletes it when nothing works | Its folder is removed. Its entries still name it, so the delegated runs are shown as runs of their own (TC-3) |
| S13 | A delegation to a peer | The entry holds `nodeId` (and `members` for a team). The peer's run has `delegatedFrom` |
| S14 | One of the 15 runs without a Task record | An ordinary run in the run list (TC-9) |
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
| **TC-10** | Does a delegated run on this node also carry `delegatedFrom` in its own file? One name for the record? | **No copy on the run; one name.** A copy would disagree with the Task once the Task is deleted, and the code would read only the entry. The name `delegatedFrom`, with the shape `{ delegatingRun, delegatorAgentRunId, nodeId? }`, is used in the Task entry and on a peer-started run's own file | The user | **Decided by the user, 2026-11-11**: "for the locally, it lives in the runs task entry. For a run started by another node, it lives in the runs on file … because on the other node, there is no task"; on the name: "thanks a lot for the naming consistency … I agree with that"; on a deleted Task: "we basically show it as independent run, because we cannot put it back to the delegator anyways" |
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

1. **The sender's own team:** a teammate, or the team's own address (its coordinator). Unchanged.
2. **The standing agents of the run that assigned the sender's Task:**
   - for every run working on a Task the manager assigned, `/project_task_manager`;
   - for a Task assigned by a member of a team run the user started, that team's members.

   This is today's "standing agents of the top run", found through the Task.
3. **The run's own standing agents:** for an agent of a run the user started (no Task), its own run's configured agents. Unchanged.

Any other address gets "No agent or agent team you can talk with has the address …", with today's guidance. A delegated run's members are not reachable by address from outside it, as today (they are reached by run ID).

### 10.4 What every delivered message does

- It wakes its receiver once, restoring the conversation.
- It is stored in both runs' logs with one message ID (CM-9).
- It names its sender.
- Reference files pass on one node.

All unchanged.

### 10.5 How the server answers, from the Task records in memory

| Question | Answer |
| --- | --- |
| Which run does agent run ID X belong to? | X is a delegated run's entry agent (an agent run, or a team's coordinator): its Task entry. X is a member of a running team: that team's own run answers. X is a member of a stopped team: that team's own file lists it (V-14). X is an agent of a run the user started: that run |
| May sender and receiver talk? | §10.2, from the two runs' open Task entries and each Task's assigned entry (`delegatedFrom`) |
| Which run assigned my Task? | The Task's `assigned` entry: `delegatedFrom.delegatingRun` |
| Is the receiver running? | Its own run; if not, it is loaded and woken like any stopped run |

No run keeps an index of other runs' agents. The Task records are the one place a relationship is written.

### 10.6 Validated on the user's data (read-only, 2026-11-11)

`evidence/data-model-validation/task-centered-messaging-2026-11-11.txt`, every stored message between two runs:

| | Messages |
| --- | --- |
| Between two runs | 1,604 |
| Allowed today and by the Task rule | 1,540 (103 by (a), 1,437 by (b)) |
| Allowed today, refused by the Task rule | 64: every one has a delegated run with no Task record on one side (legacy, 2026-08 … 2026-10) |
| Refused today, allowed by the Task rule | 0 |

The Task rule never allows more than today. It refuses only messages with the 15 legacy runs (TC-9), which stay in the logs.

## 11. The life of a delegation, as records

Replaces revision 4's "life of a link": since 469 there is no stored link to keep alive.

| Step | Task record | Run files | Views (in memory) |
| --- | --- | --- | --- |
| L1 M delegates T1 to E | New `assigned` entry, `delegatedFrom` = M | E's own files | M's view shows E |
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
