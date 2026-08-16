# Team Execution Ownership Analysis

## Status

- Artifact type: Current-state evidence and target ownership rationale
- Status: `User Approved — SR-009 Reconciled With Reversible Tree-Only Task Settlement`
- Approval applicability: N/A as a separate behavior contract; supports the requirements/design

## Executive Conclusion

The base already contains one real recursive execution structure, but it is not represented or owned consistently end to end. Persistent and task AgentTeams are concrete nested `TeamRun` objects; persistent and task Agents are concrete `AgentRun` objects. The clean target is to make that existing runtime truth authoritative:

```text
logical topology     -> canonical address
concrete execution   -> AgentRun ID or TeamRun ID
concrete parentage   -> rooted execution-tree containment
formal task relation -> task record
ordinary message     -> message record
```

The target does **not** create a second execution graph. It contracts existing execution containment, current Team metadata, task directories, and frontend materialization into one root-owned execution tree/index.

At provider/tool boundaries, the tree derives one minimal `TeamMemberExecutionIdentity` containing only `rootTeamRunId`, `memberAddress`, and `agentRunId`. Current copies of immediate TeamRun/config/runtime/coordinator/task/composite facts are removed; root services derive them from the index when needed.

## Current Structures

### Configured topology

`TeamRunConfig.rootTeam` is an immutable configured tree. Each configured node currently repeats:

- `kind`;
- canonical `address`;
- definition/run IDs;
- role/description;
- Agent launch settings or Team children/coordinator.

This tree correctly answers which logical placements exist and how persistent Agents were configured.

### Live recursive runtime

Each mixed `TeamRun` owns a `MixedTeamManager` with:

- persistent Agent member handles;
- persistent nested Team handles;
- task Agent execution registry;
- task AgentTeam execution registry.

A persistent nested AgentTeam lazily creates a child `TeamRun`. A task AgentTeam clones the selected configured subtree with fresh TeamRun/AgentRun IDs and creates another child `TeamRun`. Therefore the live runtime is already tree-shaped.

### Current exact locator

`TeamExecutionAddress` currently carries:

```text
root TeamRun ID
logical member address
task TeamRun ID chain
optional task AgentRun ID
```

It is used in task records, Team events, GraphQL/WebSocket, application contracts, token rows, and frontend keys. However, a task-Team Agent still needs an additional `agentRunId` in Team stream binding. This proves the composite is an ancestry locator, not a uniform exact Agent identity.

### Current task ownership

Task IDs and files are root-scoped, but services/ledgers are created by current TeamRun. Target selection and lifecycle routing use caller locality. This works only while eligible recipients are direct children.

### Current frontend

The browser separates configured topology from mutable execution state, but mutable state is a raw map keyed by serialized composite execution address. Task materializers manufacture task execution nodes from records/events. Multiple consumers parse the key or reconstruct identity/ancestry.

## Why Intrinsic Run IDs Are Sufficient

### Exact Agent

Every persistent Agent, task Agent, and task-Team Agent already has a globally collision-aware AgentRun ID. The same allocator checks active runs, persisted standalone runs, Team metadata, and physical paths.

### Exact Team

Every persistent or task AgentTeam execution has a TeamRun ID. Nested task Team membership therefore has exact Team identity independently of its logical address.

### Exact ancestry

Once every node is persisted in the same execution tree, parentage is the container relation. A node does not need to repeat its parent TeamRun ID, task-Team chain, member path, or route key.

### Logical meaning

Run IDs alone do not say which configured placement supplied definition/configuration. Each execution node therefore retains one canonical logical `address`. This is not a competing exact identity:

- address selects/configures a placement;
- run ID selects an instance.

## Target Root And Local Ownership

```text
AgentTeamRunManager                 active root-run catalog
└── RootTeamRun                     public boundary for one rooted execution
    ├── TeamRunExecutionTree        execution containment
    ├── TeamExecutionIndex          derived exact lookup/ancestry
    ├── TeamRunResolver             exact live TeamRun access
    ├── TaskDelegationService       formal work edges/lifecycle + one private command FIFO
    ├── TeamCommunicationService    accepted ordinary messages
    ├── TeamRunPersistenceCoordinator root lock + typed physical commits
    ├── TeamRunEventPublisher       non-persisted changeSequence
    └── root TeamRun
        └── MixedTeamManager        only this TeamRun's direct handles/lifecycle
```

`RootTeamRun` is a thin authoritative facade, not a mutable state blob. The execution tree, task records, and communication messages remain different subjects with different owners. Every materialized configured or task TeamRun keeps its own local manager. Exact root services use the index and `TeamRunResolver` to reach the selected `TeamRun`; they never call a manager or registry directly. Initial canonical Agent status likewise enters through root `TeamRun.getLeafAgentStatusSnapshots()` under the event snapshot barrier.

`TaskDelegationService` owns one private FIFO that spans latest task/tree read, authorization, cumulative derivation, typed physical commit, memory/event commit, and result for activation, submission, review, interruption, and settlement. Terminal task status is committed to task records first. The later settlement command asks the exact local `TeamRun` for a reversible quiescence capability, writes only execution-tree `settledAt`, synchronously detaches the execution after durability, and finishes provider/handle cleanup outside the root lock. The local manager owns those handles; the root task owner retains task policy and order. The persistence coordinator never receives a caller-derived complete task snapshot.

Same-root accepted-message durability uses one unreleased reservation inside the existing AgentRun FIFO and one sealed append plan whose current-state derivation executes under the existing root mutation lock; Team communication adds no queue, revision, or replay. Ordinary AgentRun quiescence waits that previously submitted reservation rather than deleting it. All three files use one strict Team writer that distinguishes failure known before rename from finalization uncertainty after rename. Only the latter fail-stops the affected root until strict reload; other roots remain usable.

The focused authority and removal contract is `team-run-management-contract.md`.

## Ownership Comparison

| Question | Current Answer | Target Answer | Why Target Is Better |
| --- | --- | --- | --- |
| What was mounted? | schema-v3 configured member tree | persistent branch of execution tree | retains same truth and adds task containment |
| How was each persistent Agent launched? | flat Agent-node settings | `launchConfiguration` on configured Agent node | clear grouped subject |
| Which concrete runs exist? | persistent metadata plus task directories/events | execution tree with exact run IDs | one current authority |
| Where is an execution contained? | manager ownership plus task-Team chain | tree parentage | direct and deterministic |
| Who delegated work? | task record sender composite | exact delegator AgentRun ID | direct execution identity |
| Which fresh execution owns a task? | task composite address | `{agentRunId}` or `{teamRunId}` | structural minimal reference |
| Who sent a message? | composite execution address | exact AgentRun ID | direct endpoint identity |
| How does frontend focus one row? | serialized composite key | AgentRun/TeamRun ID | no parser/alias |
| How is a Team task contacted? | coordinator projection plus composite Team identity | derive coordinator AgentRun from configured address + task Team members | no copied ingress field |
| Who handles one concrete Team execution? | one manager, but with local and root duties mixed | that TeamRun's private `MixedTeamManager`, local duties only | preserves recursive lifecycle ownership without a root god-object |
| Who routes across TeamRuns? | child-to-parent bubbling plus directories/chains | public `RootTeamRun` subject services -> index -> `TeamRunResolver` -> selected `TeamRun` | one root authority and no boundary bypass |

## Concrete Scope And Host Selection Without Chains

For a target placement, identify the logical parent Team that must contain the final Agent or fresh Team endpoint. Then inspect the caller AgentRun's concrete Team ancestors deepest-first.

```text
scope = first ancestor TeamRun where
        ancestor.address is a segment-aware ancestor-or-self of targetParent
host = configuredTeamDescendant(scope.teamRunId, targetParent)
```

The structural root `/` contains every target parent, so a scope always exists for a valid same-root caller. `configuredTeamDescendant` follows `members` Team edges only. It does not search sibling `taskExecutions`, so repeated task Team addresses cannot make the result ambiguous.

Examples:

### Persistent cross-branch Agent task

```text
caller AgentRun: /research/researcher (persistent)
target:          /qa/tester
required parent: /qa
caller ancestry: /research -> /
selected scope:  root TeamRun /
configured descent: root.members -> persistent TeamRun /qa
selected host:   persistent TeamRun /qa
new node:        fresh task AgentRun /qa/tester under that host
```

### Nested task caller targets ancestor scope

```text
caller AgentRun ancestry:
  field-task-TeamRun at /research/field
  research-task-TeamRun at /research
  root TeamRun at /
target: /research/researcher
required parent: /research
selected scope/host: research-task-TeamRun
```

### Task-Team caller targets a configured descendant

```text
caller AgentRun ancestry:
  qa-task-TeamRun at /qa
  root TeamRun at /
target: /qa/automation/tester
required parent: /qa/automation
selected scope: qa-task-TeamRun
configured descent: qa-task-TeamRun.members -> /qa/automation TeamRun
selected host: that task subtree's /qa/automation TeamRun
```

### Task caller targets external Team

```text
caller contained in task TeamRun /research
target Team: /qa
required parent: /
selected scope/host: root TeamRun
new node: fresh /qa task TeamRun under root
```

Task relationship stays in the record in all three cases.

## Task Relationship Derivation

Each task record directly stores:

```text
taskId
delegatorAgentRunId
recipientAddress
taskExecution = {agentRunId} | {teamRunId}
status + updates
```

The root index resolves both ends. Parent/child work is derived by locating the delegator AgentRun: if it belongs to another task execution, that owning task is the parent task. No `parentTaskId` or copied execution chain is required.

## Message Relationship

A Team communication record needs:

```text
messageId
senderAgentRunId
receiverAgentRunId
content/messageType/references/time
```

The tree derives sender/receiver logical address, current/settled status, owner TeamRun, and display/configuration. An exact message cannot fall back to logical address if its AgentRun is gone or settled.

## Frontend Projection

The frontend should not store another topology or reconstruct task nodes. The backend provides one change-sequenced snapshot derived from:

```text
execution tree + task records + communication records + canonical Agent status
```

In the navigation projection, a task execution is shown **under the logical placement that it instantiates**, not beside that placement on the same row. The placement is a presentation group, not another persisted execution node. The persistent execution and every live task execution remain distinct children because they have distinct run IDs:

```text
QA AgentTeam placement  /qa
├── Primary Team execution
│   └── Tester Agent placement  /qa/tester
│       ├── Primary Agent execution
│       └── Task: Run the release acceptance checks…  [Active]
└── Task: Own the full release validation…  [Active]  ▸
    ├── QA Lead Agent execution
    ├── Tester Agent execution
    └── Automation Team execution
        └── Tester Agent placement  /qa/automation/tester
            ├── Team-member Agent execution
            └── Task: Run the browser automation suite…  [Awaiting review]
```

Indentation expresses the view relationship: “this concrete execution instantiates this logical placement in this containing Team execution.” It does **not** make a task Agent a child of the primary AgentRun. In persisted containment, both `agent-run-tester` and `task-agent-run-tester-001` are direct execution entries owned by `team-run-qa`; the projector groups them under the shared `/qa/tester` placement. Showing both concrete executions on one row is forbidden because it would collapse distinct focus, status, history, and message endpoints.

The ordinary navigation label is `Task:` followed by a whitespace-normalized, visually truncated prefix of the authoritative task `description`; the row may show the materialized task status as a compact badge. Agent and AgentTeam task rows use the same text rule. The row icon and the AgentTeam row's expand/collapse affordance communicate the execution variant without repeating `Agent` or `AgentTeam` in the label. Navigation does not show `taskId`, `agentRunId`, or `teamRunId` as a secondary label. Those exact IDs remain internal reducer/index identities and command selectors, not user-facing navigation copy. The full task description is available when the task row is opened.

The frontend reducer maintains:

- tree nodes keyed by AgentRun/TeamRun IDs;
- parent/child relationships supplied structurally;
- exact task records indexed by task ID and execution reference;
- exact messages indexed by message ID/endpoints;
- focus/open/history/status/timeline derived through selectors.

No invented “task summaries” or “recent activity” fields are required. Presentation components can derive whatever they currently show from exact records.

Live ordering uses `changeSequence`, not `revision`. It is owned by the root `TeamRunEventPublisher`, is not persisted, and restarts with a newly restored `RootTeamRun`. Task lifecycle may still use the word “revision” for a requested work revision; the two meanings are no longer overloaded.

## Persistence Shape Decision

Exactly three current Team runtime JSON authorities are sufficient:

| File | Subject |
| --- | --- |
| `team_run_execution_tree.json` | mounted/persistent configuration plus concrete persistent/task execution containment |
| `task_delegation_records.json` | formal task edges, lifecycle, references, updates |
| `team_communication_messages.json` | ordinary exact AgentRun messages |

A `team_run_manifest.json` would repeat or split root definition/name/run/timestamp/application/handoff facts, so it is rejected.

## Field Tightness Decisions

| Candidate Field | Decision | Reason |
| --- | --- | --- |
| configured node `address` | keep | logical placement/configuration key |
| Agent/Team run ID | keep | exact concrete identity |
| root `coordinatorAddress` / Team coordinator address | keep on configured Team | intrinsic configured ingress rule |
| persistent Agent `launchConfiguration` | keep | exact restore inputs; per-Agent workspace path is supported |
| task node launch/definition/role/description | remove | inherited from configured placement |
| authored Team/Agent instructions | keep in definition subsystem only | definition-authored content is resolved by definition ID and is not an execution allocation |
| persisted Team backend kind | remove | current Team runtime is always `MIXED`; the value is an invariant, not a launch choice |
| root `applicationBinding` | keep when applicable | one root association is independent; per-Agent V6 producer identity derives from the binding plus exact node identity |
| task record `recipientAddress` | keep | selected logical intent, distinct from exact execution reference |
| task record `status` | keep | directly queried materialized business state, validated by update replay |
| node `kind` | remove from JSON | exact required-key sets discriminate variants |
| parent/relationship/path/route/task-Team chain | remove | tree or task record derives it |
| workspace ID | remove from Team file | workspace subsystem derives/manages it; root path is sufficient restore input |
| message logical/composite endpoints | remove | exact AgentRun IDs plus tree derive them |
| duplicated reference metadata | remove | parent ID/path/timestamp derive stable presentation fields |

## Migration Boundary

The target is not directly readable from retained schema-v3/composite history. A new isolated migration:

1. consumes earlier base migration outputs;
2. correlates exact runs using metadata, task records, physical paths, token `run_id`, and external evidence;
3. produces/validates the three target files;
4. transactionally cuts token identity;
5. converts external Team entry identity;
6. preserves an ambiguous root byte-for-byte, reports it, and keeps the migration retryable without guessing;
7. catalogs only complete validated V1 roots; and
8. lets the target-only server continue with valid roots and new Team creation after the migration attempt finishes, even when some or all predecessor roots remain unavailable.

Application framework data is not migrated; project-owned application contracts move directly to V6 and data/fixtures are rebuilt.

## Structural Verdict

The target is simpler than both the predecessor and a single blended “everything file”:

- one logical address language;
- two intrinsic exact run-ID types;
- one execution containment tree;
- one task record model;
- one message record model;
- one public root boundary with explicit subject owners and one derived index;
- one local manager per materialized TeamRun;
- one backend projector and frontend reducer;
- one isolated migration boundary.

No additional path, route, chain, manifest, parent field, summary cache, root state blob, global manager, persisted task revision, compatibility model, or runtime predecessor reader is justified.
