# Delegation Contract — A Delegated Run Is An Ordinary Run

Status: **revision 2, proposed** (2026-11-10, SR-006). Revision 1 gave the words and rules; revision 2 adds
the data level: every record with example JSON, every case, an attribute-by-attribute redundancy check, the
existing data before and after with counts, and simulations. It is the behavior-defining supplement of
`requirements-doc.md`; nothing is designed or built on it until the user accepts it. Base `origin/personal`
`aae0a53a81`. Task `autobyteus-461`.

Model for this document: `tickets/done/delegated-copy-own-run-memory/memory-layout-contract.md` (revision 5),
which made a task agent's *storage* its own. This contract finishes that step: the *relationship* and the
*lifecycle* become the run's own too.

Authorities: [Collaboration Model](../../../autobyteus-server-ts/docs/design/collaboration_model.md);
[Data Migration Guideline](../../../autobyteus-server-ts/docs/design/data_migration_guideline.md); `DESIGN.md`
(rules 7, 8, 10). Evidence for every "today": `investigation-notes.md` and the read-only data check
`evidence/data-model-validation/` (script and `counts-2026-11-10.txt`). Revision 2 was amended on 2026-11-10 with the role name `subWork` (TC-6).

The user's direction (2026-11-10): a delegated agent run or agent team run is its own, normal run; it is
started and stopped like any other; its life depends on its Task; the relationship is kept and shown in the
UI; the contract is put right first and the code then reflects it; no redundant attributes.

## 0. The main scenario

One Project Task Manager run (a standalone agent run) is kept for months and delegates Project Tasks to
teams; a team's member delegates sub-work to another agent or team. On the user's machine today
(read-only, 2026-11-10): **196 delegated runs** (43 agent runs, 153 team runs), **197 links** (195 on this
node, 2 to a peer), **407 Task records** of runs in 361 files; 170 delegated runs name a standalone run as
their coordinating run, 20 a team run, 6 an org run.

## 1. Principles

- **P1 A delegated run is an ordinary run.** An agent run at `memory/agents/<id>/` with `run_metadata.json`,
  or a team run at `memory/agent_teams/<id>/` with `team_run_execution_tree.json`. It is read, started,
  stopped, woken, configured, archived and deleted by the ordinary run code. One section, `delegatedFrom`,
  says who delegated it.
- **P2 Delegation is a relationship, stored as two ends.** The delegated run holds the back-link
  (`delegatedFrom`); the delegating run holds the link. Neither end holds anything else of the other run.
- **P3 One hop.** A link connects a run to the run of the agent that delegated. A run delegated by an agent
  of a delegated run links to that delegated run, never to the top of the chain.
- **P4 One owner per fact.** A fact that can change has one place. The facts of the relationship never
  change after the delegation; the two ends each record only what that end needs to act without reading
  the other run (the two runs may be on different nodes). §3 checks every attribute against this.
- **P5 The Task owns the work.** A Task records the runs working on it by their own identity. Closing the
  Task ends their work.
- **P6 Every run owns its own life.** Nothing hosts, idles, wakes or stops another run. A message wakes
  its receiver.
- **P7 Move, never lose, never lock out** (as in the memory layout contract P6): existing data is converted
  once; nothing is deleted; a run that cannot be converted is left intact and reported; the app still starts.

Words: **delegator** = the agent that called `delegate_task`; **delegating run** = the run that agent is a
part of (it holds the link); **delegated run** = the run the delegation created. The word **coordinating
run** is removed (it meant the top run of a chain, which "hosts, idles, wakes and stops" the others).

## 2. The records

### 2.1 The back-link: `delegatedFrom` on the delegated run

Agent run, `memory/agents/code_reviewer_91c2/run_metadata.json` (every other field as in any run file):

```json
{
  "runId": "code_reviewer_91c2",
  "agentDefinitionId": "code-reviewer",
  "workspaceRootPath": "/Users/me/projects/x",
  "memoryDir": "/Users/me/.autobyteus/server-data/memory/agents/code_reviewer_91c2",
  "llmModelIdentifier": "sonnet",
  "llmConfig": null,
  "autoExecuteTools": true,
  "runtimeKind": "claude_agent_sdk",
  "platformAgentRunId": "…",
  "startedAt": "2026-11-10T09:12:00.000Z",
  "delegatedFrom": {
    "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
    "delegatorAgentRunId": "project_task_manager_7c8d"
  }
}
```

Team run, `memory/agent_teams/software_engineering_team_0218/team_run_execution_tree.json`:

```json
{
  "createdAt": "2026-11-10T09:39:18.439Z",
  "archivedAt": null,
  "applicationBinding": null,
  "handoffs": [ "…" ],
  "rootTeam": {
    "address": "/software_engineering_team",
    "teamDefinitionId": "software-engineering-team",
    "teamRunId": "software_engineering_team_0218",
    "coordinatorAddress": "/software_engineering_team/solution_designer",
    "defaultLaunchConfiguration": { "…": "…" },
    "members": [ { "address": "/software_engineering_team/solution_designer", "agentRunId": "solution_designer_65a9", "…": "…" } ],
    "taskExecutions": []
  },
  "delegatedFrom": {
    "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
    "delegatorAgentRunId": "project_task_manager_7c8d"
  }
}
```

Fields of `delegatedFrom`:

| Field | Meaning | Present |
| --- | --- | --- |
| `delegatingRun { kind, runId }` | The run the delegator is a part of: `agent`, `agent_team` or `agent_org`. It holds the link; reports by address go to its standing instances | Always |
| `delegatorAgentRunId` | The agent that delegated: the run reports to it, and it may message this run by run ID | Always for new runs; absent on 4 old records in the user's data |
| `nodeId` | The peer node the delegating run is on | Only when the delegating run is on another node; absent means this node |

Values by who delegates (the cases):

| Case | Who delegates | `delegatingRun` | `delegatorAgentRunId` | `nodeId` |
| --- | --- | --- | --- | --- |
| D1 | A standalone agent (the Project Task Manager) | `{agent, <its run id>}` | its run id | absent |
| D2 | A member of a team run the user started | `{agent_team, <that team run>}` | the member | absent |
| D3 | A direct agent of an org run | `{agent_org, <that org run>}` | that agent | absent |
| D4 | A member of a team mounted in an org run | `{agent_org, <that org run>}` | the member | absent |
| D5 | A member of a **delegated** team run (nested) | `{agent_team, <that delegated team run>}` — one hop, **not** the top run | the member | absent |
| D6 | A delegated agent run delegates (nested) | `{agent, <that delegated agent run>}` | its run id | absent |
| D7 | An agent on a peer node | `{kind, <the run there>}` | that agent | the peer's node ID |

D7 is today's shape for a run a peer started (`delegatedFrom { nodeId, coordinatingRun, delegatorAgentRunId }`),
with `coordinatingRun` renamed. D1–D6 replace today's `taskAgent` section.

### 2.2 The link, in the delegating run's record

Unchanged on disk. Four cases:

```json
{ "address": "/code_reviewer", "agentRunId": "code_reviewer_91c2",
  "delegatorAgentRunId": "project_task_manager_7c8d", "startedAt": "2026-11-10T09:12:00.000Z" }
```
```json
{ "address": "/software_engineering_team", "teamRunId": "software_engineering_team_0218",
  "delegatorAgentRunId": "project_task_manager_7c8d", "startedAt": "2026-11-10T09:39:18.439Z" }
```
```json
{ "address": "/researcher", "agentRunId": "researcher_4410", "nodeId": "node-b-1f0e",
  "delegatorAgentRunId": "project_task_manager_7c8d", "startedAt": "2026-11-10T10:02:00.000Z" }
```
```json
{ "address": "/research_team", "teamRunId": "research_team_77aa", "nodeId": "node-b-1f0e",
  "coordinatorAddress": "/research_team/lead",
  "members": [ { "address": "/research_team/lead", "agentRunId": "lead_0c11" },
               { "address": "/research_team/analyst", "agentRunId": "analyst_5d20" } ],
  "delegatorAgentRunId": "project_task_manager_7c8d", "startedAt": "2026-11-10T10:05:00.000Z" }
```

Where the links of a run are: a standalone agent run, `collaboration/collaboration_tree.json`
`taskExecutions`; a team run, `rootTeam.taskExecutions`; an org run, `rootOrg.taskExecutions`. One list per
run. A link is always in the record of the delegating run (P3): for D5 it is in the delegated team run's own
`rootTeam.taskExecutions` (empty today), for D6 in the delegated agent run's own `collaboration_tree.json`.

A remote link also keeps the team's coordinator and members, because the delegating node cannot read a run
on another node and must route a message to any member by run ID (CM-11). A local link does not: the team
run's own tree on the same node is the owner of that fact.

### 2.3 A Task's record of a run (`agent_run_resources.json`)

```json
{
  "taskId": "project_task_440e",
  "agentRunResources": [
    { "role": "assigned",
      "assignedBy": "project_task_manager_7c8d",
      "recipientAddress": "/software_engineering_team",
      "agentRun": { "kind": "team", "teamRunId": "software_engineering_team_0218",
                    "coordinatorAgentRunId": "solution_designer_65a9" },
      "linkedAt": "2026-11-10T09:39:18.439Z", "start": "started", "closedAt": null },
    { "role": "subWork",
      "agentRun": { "kind": "team", "teamRunId": "product_team_e03d", "coordinatorAgentRunId": "product_designer_1a2b" },
      "linkedAt": "2026-11-10T11:00:00.000Z", "start": "started", "closedAt": null }
  ]
}
```

A run on a peer (the Task side cannot read it, so the record names where its link is):

```json
{ "role": "assigned", "assignedBy": "project_task_manager_7c8d", "recipientAddress": "/researcher",
  "agentRun": { "kind": "agent", "agentRunId": "researcher_4410" },
  "nodeId": "node-b-1f0e",
  "delegatingRun": { "kind": "agent", "runId": "project_task_manager_7c8d" },
  "linkedAt": "2026-11-10T10:02:00.000Z", "start": "started", "closedAt": null }
```

`role` says how the run belongs to the Task:

| `role` | Meaning | Written by |
| --- | --- | --- |
| `assigned` | The run was given this Task as its own work, by an agent that is not working on the Task (a saved Project Task, or a description-only delegation that created a Task with no Project). Only its assigner can continue it after the Task was closed and reopened | `delegate_task` by an agent that owns no Task |
| `subWork` | A run that works on this Task handed part of the work to this run; it joins the same Task and no Task is created. It stays closed when the Task is reopened | `delegate_task` by a run that works on the Task |
| `broughtIn` | Older records only (2 in the user's data); nothing writes it | — |

`subWork` is today's `delegated`, renamed (the user, 2026-11-10): every run in this record is a delegated run, so the old value said nothing; "sub-work" is already the Collaboration Model's word (CM-6).

`hostRoot` is removed. For a run on this node, everything the Task side asked the "host" for (stop the run
when the Task closes, the run's status, where it is shown) is asked of the run itself, by its own ID; the
run it is shown under is the run's own `delegatedFrom.delegatingRun`.

### 2.4 A run's own address, launch and settings

- A team run's address is `rootTeam.address`, as today (in the user's data the back-link's `address`
  equals it in 153 of 153 team runs).
- An agent run's address is kept where every standalone run keeps it: `collaboration/collaboration_tree.json`
  `host.address`, written when the delegation creates the run. It cannot be derived from the definition
  (6 of 43 delegated agent runs in the user's data have an address that is not their definition's ID).
- How a delegation resolved the launch (`launchSource`: origin and skipped layers) is the run's own fact:
  a top-level optional `launchSource` on an agent run; a team run already has its members' `launchSource`
  and gets `rootTeam.defaultLaunchSource`.
- A Settings edit of a stopped delegated run is saved like any stopped run's: it changes the run's own
  launch fields. `userLaunchSelection` (the edit kept beside the started launch) is removed; the 9 records
  that carry one (3 agent runs, 6 team runs) are converted to their effective launch. *To verify in the
  design (§6, V-9): the reason DEC-005 of the earlier ticket kept the edit beside the started values.*
- `pendingRuntimeSwitch` is already a top-level field of a run file; the copy inside `taskAgent` goes (0
  records carry one).

## 3. Every attribute, checked for redundancy

| Attribute | Where | Kept? | Why |
| --- | --- | --- | --- |
| `delegatedFrom.delegatingRun` | delegated run | Kept | The only way from the run to the run it is shown under and reports to by address; cannot be derived (the delegator's run is not findable from an agent run ID across nodes, and only by a scan on one node) |
| `delegatedFrom.delegatorAgentRunId` | delegated run | Kept | Which agent it reports to and may be messaged by. In case D1/D6 its value equals `delegatingRun.runId` (142 of 196 runs); it is still kept in every case so that all seven cases are read by one rule and the 4 old records without a delegator stay unambiguous |
| `delegatedFrom.nodeId` | delegated run | Only for a peer | Absent means this node; this node's own ID is never stored |
| ~~`taskAgent.coordinatingRun`~~ | delegated run | **Removed** | It named the top of the chain, the host. Nothing hosts |
| ~~`taskAgent.address`~~ | delegated run | **Removed** | Team: duplicate of its own `rootTeam.address` (153 of 153 equal). Agent: the run's own address, kept in the ordinary place (§2.4) |
| ~~`taskAgent.launchSource`, `.userLaunchSelection`, `.pendingRuntimeSwitch`~~ | delegated run | **Moved or removed** | The run's own launch facts, not relationship facts (§2.4) |
| link `address` | delegating run | Kept | The delegating run lists and names its delegated runs without reading them (H2 of the memory layout contract; a run on a peer cannot be read at all) |
| link `agentRunId` / `teamRunId` | delegating run | Kept | The link itself. No separate `kind`: the field name says it |
| link `delegatorAgentRunId` | delegating run | Kept | Which of its agents delegated: the tree row's parent, and who may message that run. Same value as the back-link's by necessity (195 of 195 equal today); each end must act without the other |
| link `startedAt` | delegating run | Kept | The time of the delegation: the list's order. A fact of the link |
| link `nodeId`, `coordinatorAddress`, `members` | delegating run | Only for a peer | §2.2 |
| ~~`hostRoot`~~ | Task record | **Removed** | Equal to the run's own back-link in 405 of 405 records of runs on this node: derivable |
| `nodeId`, `delegatingRun` | Task record | Only for a run on a peer | The 2 records of remote runs in the user's data have no other pointer on this node |
| `role` value `delegated` | Task record | **Renamed** `subWork` | One word, one meaning (`DESIGN.md` rule 10): "delegated" already names every run of the record |
| `assignedBy`, `recipientAddress` | Task record | Kept | Facts of one assignment (a run can get several Tasks, one entry each), shown by every Task view (`get_project_task`, the Task page) without opening the run. Today they equal the run's delegator (375 of 375 records of runs on this node) and address (370 of 370 that carry it) |

No attribute is added to any record of a run on this node. Three are removed (`coordinatingRun`,
back-link `address`, `hostRoot`), one is renamed in place (`taskAgent` → `delegatedFrom`, with
`coordinatingRun` → `delegatingRun` at a new, one-hop value).

## 4. The main scenario as data

The Project Task Manager (standalone) delegates Task T1 to the software engineering team; its solution
designer delegates sub-work to the product team; the product designer delegates to an image agent.

```text
memory/agents/project_task_manager_7c8d/
  run_metadata.json                         no delegatedFrom: the user started it
  collaboration/collaboration_tree.json     taskExecutions: [ link → software_engineering_team_0218 ]

memory/agent_teams/software_engineering_team_0218/
  team_run_execution_tree.json              delegatedFrom { delegatingRun {agent, project_task_manager_7c8d},
                                                            delegatorAgentRunId project_task_manager_7c8d }
                                            rootTeam.taskExecutions: [ link → product_team_e03d ]        (D5)

memory/agent_teams/product_team_e03d/
  team_run_execution_tree.json              delegatedFrom { delegatingRun {agent_team, software_engineering_team_0218},
                                                            delegatorAgentRunId solution_designer_65a9 }
                                            rootTeam.taskExecutions: [ link → image_maker_33f0 ]

memory/agents/image_maker_33f0/
  run_metadata.json                         delegatedFrom { delegatingRun {agent_team, product_team_e03d},
                                                            delegatorAgentRunId product_designer_1a2b }

projects/<project>/tasks/T1/agent_run_resources.json
  [ assigned  software_engineering_team_0218 (assignedBy project_task_manager_7c8d),
    subWork   product_team_e03d, subWork image_maker_33f0 ]
```

Today the two inner links are in the Project Task Manager's tree and both inner runs name the Project Task
Manager as `coordinatingRun`.

## 5. Existing data: every shape, before and after

Counts: `evidence/data-model-validation/counts-2026-11-10.txt` (the user's data, read-only).

| Case | Count | Before | After |
| --- | --- | --- | --- |
| E1 delegated agent run, delegator is a part of the run that holds its link (D1–D4) | 159 of 196 runs (with E2) | `taskAgent { coordinatingRun: X, delegatorAgentRunId, address }` | `delegatedFrom { delegatingRun: X, delegatorAgentRunId }`; link stays where it is |
| E2 delegated team run, same | (in the 159) | the same section on the team tree | the same; `rootTeam.address` already holds the address |
| E3 nested: the delegator is a part of another delegated run (D5, D6) | 32 | `coordinatingRun` = the top run; link in the top run's tree | `delegatingRun` = the delegator's own run; **the link moves** into that run's record |
| E4 old record without `delegatorAgentRunId` | 4 | `coordinatingRun` only | `delegatingRun` = today's `coordinatingRun`; no `delegatorAgentRunId`; link stays |
| E5 delegator's run is not stored (deleted) | 1 | — | `delegatingRun` = today's `coordinatingRun`; `delegatorAgentRunId` kept |
| E6 detached: no stored run links it (its coordinating run was deleted) | 1 | not listed, not restored | an ordinary run with a `delegatedFrom` that names a run no longer stored (TC-3) |
| E7 link stored under an org member (older data, C6 of the memory layout contract) | 2 | `rootOrg.members[].taskExecutions` | moved to `rootOrg.taskExecutions` (one list per run) |
| E8 link to a run on a peer | 2 | link with `nodeId` | unchanged |
| E9 Task record of a run on this node | 405 | with `hostRoot` | without it |
| E10 Task record of a run on a peer | 2 | with `hostRoot` | `nodeId` + `delegatingRun` (= today's `hostRoot`) |
| E13 Task record with role `delegated` | 28 | `"role": "delegated"` | `"role": "subWork"` |
| E11 a Settings edit beside the started launch | 9 (3 agent runs, 6 team runs) | `userLaunchSelection` | the run's own launch (V-9) |
| E12 run started by a peer on this node | 0 | `delegatedFrom { nodeId, coordinatingRun, delegatorAgentRunId }` | `coordinatingRun` renamed `delegatingRun` |

Message logs, memory, folders: not touched (each run already has its own, CM-8, CM-9).

## 6. Operations

| Operation | Reads | Writes | Behavior |
| --- | --- | --- | --- |
| Delegate | the target's definition | first the delegated run's own files with `delegatedFrom`, then the link in the delegating run's record, then the Task record | Same tool result and task message as today; a link always points to a run that exists |
| A delegated run works, idles, wakes | its own files | its own folder | Its own root: shut down when quiet for the grace period, restored by its next message |
| Message, either way | sender's link or back-link | both runs' logs (CM-9) | By run ID through the link; the receiving run is restored when it is not running |
| Stop a run (any) | — | its history row | That run only (TC-1) |
| Close a Task | the Task record | `closedAt` | Every run of the record is asked, by its own ID, to stop; a closed run takes no input except the assigner's reactivation, as today |
| Open a run in the app | its record (links) | — | Each link is a row under its delegator; a team row's members and every status come from that run itself |
| Settings of a stopped delegated run | its own files | its own files | The ordinary stopped-run save |
| Archive / delete a run | its links | its own folder | Refused while a run it delegated to is working (TC-2); its delegated runs are never deleted with it |
| Server shutdown / restart | — | — | Every run ends; each is restored by its next message; an update restart resumes busy runs |

## 7. Validation

### 7.1 Done

| ID | Check | Result |
| --- | --- | --- |
| V-1 | The target back-link can be built for every stored delegated run | 196 of 196: 159 same run as today, 32 one-hop (nested), 4 without delegator and 1 with an unstored delegator fall back to today's `coordinatingRun` (`Measured`) |
| V-2 | The same fact on both ends never disagrees today | address 195 of 195, delegator 195 of 195, holder 195 of 195 (`Measured`) |
| V-3 | `hostRoot` is derivable for runs on this node | 405 of 405; the 2 others are the 2 remote runs (`Measured`) |
| V-4 | The back-link's `address` is redundant for team runs, needed somewhere for agent runs | 153 of 153 equal `rootTeam.address`; 6 of 43 agent addresses are not derivable from the definition (`Measured`) |
| V-5 | The link shape on disk needs no change | The stored local link is already `{address, run ID, delegatorAgentRunId, startedAt}`; 0 local links carry other fields (`Measured`) |
| V-6 | A run with only a back-link already works as an ordinary run | Runs started by a peer: an ordinary standalone run or top-level team run with `delegatedFrom`, own idle shutdown, restored by an inbound message (`Read`: `remote-delegation-receiver.ts`, `remote-team-run-starter.ts`, `collaboration-root-resolver.ts`) |
| V-7 | What `hostRoot` is used for | Five uses (`Read`, `grep hostRoot`, 14 files): stop on Task closure, the closed set of a root's view, the Task page's run status, deleting a deleted run's Tasks with no Project, the client's locator. Each has a target in §2.3 or §6 |

### 7.2 To do in the design, before the contract is final

- V-8 Every code reader of `taskAgent` (11 files + 15 in migrations), `coordinatingRun` (18 + 10),
  `delegatedFrom` (22 + 6) and `hostRoot` (14), with the decision for each.
- V-9 Why the earlier ticket kept a Settings edit beside the started launch (its DEC-005), and whether the
  ordinary stopped-run save loses anything.
- V-10 That a delegated agent run's `collaboration_tree.json` (its address) is written when the delegation
  creates it.
- V-11 The migration: released migrations that read these shapes (as §5.4 of the memory layout contract),
  the per-run input gate, and fixtures for E1–E12.
- V-12 The client: where it reads `hostRoot` and the composed child records.
- Nothing in this contract has been run as code.

## 8. Simulations

| # | Case | Rules | Result |
| --- | --- | --- | --- |
| S1 | The Project Task Manager delegates T1 to the software engineering team | §2.1 D1, §2.2, §2.3 | The team run's own tree with `delegatedFrom`; one link in the manager's tree; one `assigned` Task record |
| S2 | The solution designer delegates sub-work to the product team | D5, P3 | The product team run names the software engineering team run; the link is in that team's tree; a `subWork` record joins T1. Nothing is written in the manager's run |
| S3 | The product team's coordinator reports to the solution designer | §6 Message | By run ID; stored in both team runs' logs |
| S4 | The user stops the Project Task Manager | P6, TC-1 | Its own agent stops. No other file or run changes |
| S5 | The software engineering team reports while the manager is stopped | §6 Message | The manager is restored and gets the message once |
| S6 | T1 is closed | P5 | The three runs of T1's record are each asked to stop; their records get `closedAt` |
| S7 | The user stops the software engineering team run while the product team works | TC-1 | Only the software engineering team stops; the product team's report later wakes its delegator |
| S8 | A follow-up Task T2 is given to the same team by its run ID | §2.3 | The link and the back-link do not change; T2's record gets an `assigned` entry with its own `assignedBy` |
| S9 | The manager's run is opened in the app | §6 Open | Its links give the rows (address, run ID, delegator); nothing of a delegated run is read until its row is shown or opened |
| S10 | The software engineering team run is opened | §6 Open | Its own link gives the product team row: the tree is followed one hop at a time |
| S11 | The user deletes the manager's run while a team works | TC-2 | Refused with the reason |
| S12 | The user deletes it when nothing works | TC-2, TC-3 | Its folder is removed; its delegated runs stay; each is then listed as a run of its own |
| S13 | A delegation to a peer node | D7, §2.2, §2.3 | The peer's run has `delegatedFrom` with `nodeId`; this node has the link with `nodeId` and the Task record with `nodeId` + `delegatingRun` |
| S14 | Old record without a delegator (E4) | §2.1 | Shown under today's run; it reports by address only, as today |
| S15 | Server restart | §6 | No run is running; each is restored by its next message |

## 9. Decisions

| ID | Question | Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| TC-1 | Does Stop of a delegated run still stop the runs it delegated to? | No: Stop stops the run you clicked; closing the Task stops every run working on it | The user | Needs user |
| TC-2 | Archive or delete of a run whose delegated runs are working | Refused with the reason; its delegated runs are never deleted with it (the user, 2026-10-17, for the hub) | Solution Designer | Decided |
| TC-3 | A delegated run whose delegating run was deleted | Listed as a run of its own. Today it is hidden ("detached", the earlier contract §10, with a Memory page view as a follow-up); as an ordinary run it no longer needs a special state | The user | Needs user |
| TC-4 | Delivery | The contract is approved once. This ticket: delegations made from a standalone agent run. Next Tasks: from a team run; from an org run; removal of the remaining hosting code. The design confirms the cut lines | The user | Needs user |
| TC-6 | The Task record's role name for sub-work | `subWork` instead of `delegated`, renamed by the same migration that removes `hostRoot` | The user | Decided by the user, 2026-11-10 |
| TC-5 | A Settings edit of a stopped delegated run | Saved like any stopped run's (§2.4), subject to V-9 | Solution Designer | Decided, to verify |
