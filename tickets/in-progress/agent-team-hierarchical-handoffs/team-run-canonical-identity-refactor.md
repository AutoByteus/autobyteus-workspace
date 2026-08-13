# TeamRun Canonical Identity Refactor

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/team-run-canonical-identity-refactor.md`
- Type: Intended-behavior and data-model supplement
- Scope: SR-026 cumulative TeamRun address, recipient/handoff-tool, released-data persistence and token migration ownership/atomicity, direct forward-only application SDK V5 cut, exact Team event/status/segment/error stream contract, immutable frontend topology, valid concrete execution projection, and live validation
- Status: `Accepted by ARCH-REV-018 for rooted identity; SR-026 AgentRun input linkage aligned`
- Approval applicability: This supplement defines intended behavior. The user approved the rooted target model, recipient/handoff protocol, V5 application boundary, and SR-011 live-validation contract. ARCH-REV-018 passes the cumulative rooted structure and SR-024 segment correction. SR-026 changes no address, execution identity, persistence, migration, task eligibility, or application boundary; it delegates post-resolution input admission to one AgentRun owner. Segment-output ownership remains delegated to [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md); active-input ownership is delegated to [agent-run-input-admission-contract.md](./agent-run-input-admission-contract.md).
- Related requirements: R-011 through R-013, R-021, R-026, R-028 through R-043, R-047, and R-049 through R-057
- Related acceptance criteria: AC-012, AC-013, AC-019, AC-023 through AC-039, AC-043, and AC-045 through AC-052
- Supersession rule: SR-010 retains SR-008's rooted TeamRun model and SR-009's `recipient_address` naming. SR-017 supersedes speculative application compatibility/database migration with a direct target rewrite. SR-016 delegates Team event/wire/frontend execution to [team-stream-execution-projection-contract.md](./team-stream-execution-projection-contract.md); SR-018 completes all Agent-status producers; SR-019 delegates lifecycle to [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md); SR-020 makes that canonical barrier complete; SR-021 restores the original asymmetric error authority; SR-022 aligns all current authority and makes Codex turn omission exact; SR-023 makes that one policy dominate pending-MCP, local-emission, listener, converter, and raw-debug effects; SR-024 removes the product-unreachable unknown-event/exemption machinery and keeps exact four-family applicability. The target runtime model, migration, application cut, physical storage, handoff schema, task eligibility, send envelope, and exact-run behavior remain unchanged.

## 1. Decision Summary

The existing `team_run_metadata.json` is already the durable execution snapshot for one root TeamRun and its complete recursive AgentTeam. Its recursive locality is useful: an operator can inspect one Agent member and immediately see its definition, launch settings, concrete AgentRun ID, and platform run ID. The defect is not that those facts are colocated. The defect is that one logical placement is persisted simultaneously as `memberName`, `memberPath`, and `memberRouteKey`; Team run identity is stored as both generic and Team-specific IDs; the root Team has a different shape from nested Teams; and child execution localizes the same logical identity into alternate route forms.

SR-018 therefore keeps SR-008's one self-contained rooted TeamRun tree on disk, SR-009's public recipient boundary, SR-010's completion-time handoff guidance, SR-011's three-runtime proof, SR-012's exact V5 application SDK shape, SR-013's TeamRun predecessor correction, SR-015's atomic token migration, SR-016's closed Team stream/frontend execution-projection boundaries, and SR-017's direct forward-only application rewrite. It completes the Agent-status producer boundary:

1. one canonical `AgentTeamAddress` per Agent or AgentTeam node;
2. one uniform root AgentTeam node at `/` with its concrete `teamRunId`;
3. one kind-specific `agentRunId` or `teamRunId` per node;
4. one configured `coordinatorAddress` per AgentTeam node;
5. `children` for recursive containment;
6. existing genuine Agent definition, runtime, model, tool, skill, workspace-root, application-context, platform-run, role, and description facts retained locally on the Agent node; and
7. compiled `handoffs` retained once outside the tree because they are edges between nodes.
8. `recipient_address` on both recipient-oriented tools, parsed as a request-only `RecipientAddressExpression` and resolved to the same canonical node address; and
9. intrinsic Team-bound `get_handoff_rules`/`send_message_to` exposure plus a minimal `{when,recipient_address}` handoff projection over the compiled edge list; and
10. backend-definition/frontend-SDK V5 as the sole executable application semantic contract, with all project-owned application source/artifacts/fixtures/fresh databases advanced together and ordinary exact target validation rejecting non-current input; no application migration or compatibility subsystem exists; and
11. two ordered TeamRun migration-record owners plus one shared decoder: stable `20260517_team_run_metadata_member_tree` writes pending flat-v1 input to predecessor form; separately pending `20260801_team_canonical_identity` owns final-v3 conversion and may compose the same migration-only flat decoder for residual input after a terminal-warning prerequisite record; and
12. the same pending `20260801...` canonical aggregate owns target token semantic conversion after TeamRun/task readiness, while historical `20260703_token_usage_execution_address_backfill` remains untouched/unregistered as current authority and one migration-local store commits or rolls back the entire token update batch;
13. one correlated Team domain event union maps exhaustively to one exact strict Team wire union, with the bound Team stream as the sole root scope and minimal `CONNECTED {session_id}` / `TEAM_RUN_LIFECYCLE {is_active}` control messages; and
14. immutable rooted topology stays task-free while one `TeamExecutionState` aggregate owns every valid concrete persistent/task execution, lifecycle transition, focus projection, restore convergence, and terminal cleanup.
15. one `TeamAgentExecutionBinding` constructor and one immutable `TeamAgentStatusSnapshot` serve live events, initial connection/open/restore status, pre-run send/delegation overlays, and typed run-history projection; and
16. connection status calls the shared exact status projector directly without a fake TeamRun event, while pre-run status uses one correlated status-event constructor and is replaced by the first matching real status; and
17. one `AgentRun`-owned segment lifecycle, upstream of every processor/listener, validates provider start/content/end order, drops active-start replay, and enriches canonical content with its start-owned finite type; and
18. one exact original error-evidence authority distinguishes turn diagnostic, turn terminal, and runtime-global terminal; provider turn-admission rejection is not an Agent error, and strict Team/standalone projections reject runtime/diagnostic. File/history/output/application/browser consumers receive only canonical facts and own no lifecycle repair.

The four TeamRun metadata questions remain the schema test, not a requirement to persist four normalized tables:

| Question | Persisted owner |
| --- | --- |
| What was mounted? | Rooted node `kind`, `address`, definition identity, coordinator, and `children` |
| How was it configured to launch? | Genuine launch fields local to each Agent node |
| What collaboration rules applied? | Top-level compiled `handoffs` |
| Which concrete run IDs were allocated? | `teamRunId` on AgentTeam nodes; `agentRunId` and `platformAgentRunId` on Agent nodes |

Derived address and run lookup indexes are built in memory and never persisted as second authorities. Persistent child TeamRuns share the root tree and select their node by absolute address. A task Team is a genuinely new execution instance, so its active runtime state may materialize the selected subtree with fresh run IDs, but every node keeps the same absolute address; task execution never creates a local address namespace.

## 2. Governing Principles Applied

### 2.1 Preserve genuine facts; remove only parallel authorities

| Meaning | Authoritative persisted fact | Removed parallel or ambiguous representation |
| --- | --- | --- |
| Agent or AgentTeam logical placement | target `address`; predecessor structural `memberPath` + `memberRouteKey` only during migration | current `memberName`, `memberPath`, `memberRouteKey`, local/source/scoped routes |
| AgentTeam coordinator | `coordinatorAddress` | `coordinatorMemberName`, `coordinatorMemberRouteKey`, representative descriptors |
| Agent execution | `agentRunId` | generic `memberRunId` |
| AgentTeam execution | `teamRunId` | generic `memberRunId`, duplicate `childTeamRunId` |
| Agent launch behavior | existing Agent-local runtime/model/tool/skill/workspace-root/application fields | separate persisted launch-profile table |
| Persistent run association | kind-specific run ID on the node | separate persisted binding table |
| Task execution | task identity + `TeamExecutionAddress` + active task execution tree/directory | task-local route/path/config identity bundle |
| Physical memory containment | `ancestorTeamRunIds` inside storage | misleading topology-like `teamRunPath` name |

### 2.2 Semantic separation does not require JSON normalization

Runtime code may derive narrow views such as an address index, Agent launch lookup, or run-ID lookup. Those views serve execution and are not persisted. The source document stays coherent as one TeamRun aggregate because it is read, written, backed up, migrated, and restored atomically.

The target rejects the relational-style persisted shape:

```text
topology[address] + launchProfiles[address] + runBindings[address]
```

for the root metadata JSON because it repeats the join key and forces every reader to reconstruct a node that was already stored together historically.

### 2.3 Derived does not mean persisted

Given `/research_team/research_lead`, the address owner derives:

```text
segments       = [research_team, research_lead]
basename       = research_lead
parent address = /research_team
ancestors      = [/, /research_team]
storage parts  = [research_team, research_lead]
```

These are boundary return values, not additional identity fields.

### 2.4 Runtime identity is not logical identity

Two executions may occupy the same logical address without being the same concrete run. A persistent `/research_team` and a delegated task AgentTeam instantiated from `/research_team` share an address but have different TeamRun IDs. Canonical address replaces only duplicated logical name/path/route forms; it does not erase concrete IDs.

## 3. Native Terminology

| Concept | Target name | Rationale |
| --- | --- | --- |
| Canonical absolute logical coordinate | `AgentTeamAddress` | Uses the project's native `AgentTeam` language; canonical form is an invariant of the type, not an adjective repeated at every use. |
| Rooted persisted execution aggregate | `TeamRunMetadataV3.rootTeam` | It is one actual root AgentTeam execution, not an abstract topology table. |
| Node discriminator | `kind: "agent" | "agent_team"` | Preserves the existing native `agent_team` term while allowing root and child nodes to share one union. |
| Team entry Agent | `coordinatorAddress` | The codebase already defines the coordinator as AgentTeam entry; no new `ingress` synonym is introduced. |
| Recursive contents | `children` | Natural for both inspection and exact direct-child selection. |
| Compiled run-time handoff set | metadata field `handoffs` | Inside current TeamRun metadata every edge is already compiled; `effective` remains a compiler distinction, not persisted field jargon. |
| Concrete run association | kind-specific ID on its node | Avoids opaque persisted `binding`/`assignment` collections. |
| Concrete persistent/task locator | `TeamExecutionAddress` | Retained because it distinguishes concurrent instances at one logical address. |

No `ingressAddress`, `CanonicalTeamPlacementAddress`, `MountedTeamTopology`, `TeamAgentLaunchProfile`, `TeamRunBindingSet`, `definitionSnapshot`, `effectiveHandoffs`, or `persistentBindings` field/type is part of the target persisted schema.

## 4. Address Ownership And Grammar

The existing Agent collaboration capability remains the smallest shared owner and is tightened rather than adding a new topology subsystem:

```text
autobyteus-server-ts/src/agent-collaboration/domain/
├── agent-team-address.ts
├── recipient-address-expression.ts
└── collaboration-handoff.ts
```

`agent-team-address.ts` owns:

- branded/validated `AgentTeamAddress`;
- strict absolute `/...` parsing and serialization;
- `segments`, `basename`, `parentAddress`, `childAddress`, ancestry, and storage-segment derivation; and
- root `/` handling.

`recipient-address-expression.ts` owns the request boundary:

```ts
declare const recipientAddressExpressionBrand: unique symbol;

type RecipientAddressExpression = string & Readonly<{
  [recipientAddressExpressionBrand]: true;
}>;
```

Both `send_message_to.recipient_address` and `delegate_task.recipient_address` expose an external JSON string. Their shared input parser is the only constructor of opaque `RecipientAddressExpression`; it accepts only `/...` and `./...`. Caller-relative resolution then returns `AgentTeamAddress`. “Path” describes the filesystem-like grammar; `recipient_address` remains the public name because the value identifies a recipient's logical location. Relative expressions are never persisted. `recipient_name` and `recipient_path` are rejected without aliases.

Definition authoring continues to use direct local `memberName` segments. `TeamDefinitionGraphResolver` resolves reusable AgentTeam references and rejects cycles/collisions. `TeamDefinitionTopologyPlanner` is refactored into the TeamRun-tree compiler: it assigns an absolute address to every mounted occurrence, resolves each configured coordinator to one direct Agent address, compiles child/parent handoffs into canonical endpoints, applies the provided Agent launch inputs, and later receives kind-specific run IDs from launch identity assignment.

## 5. Target TeamRun Metadata Schema

### 5.1 Node types

```ts
type TeamRunAgentNode = Readonly<{
  kind: "agent";
  address: AgentTeamAddress;
  agentDefinitionId: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  role: string | null;
  description: string | null;
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath: string | null;
  applicationExecutionContext: ApplicationExecutionContext | null;
}>;

type TeamRunAgentTeamNode = Readonly<{
  kind: "agent_team";
  address: AgentTeamAddress;
  teamDefinitionId: string;
  teamRunId: string;
  coordinatorAddress: AgentTeamAddress;
  role?: string | null;
  description?: string | null;
  children: readonly TeamRunNode[];
}>;

type TeamRunNode = TeamRunAgentNode | TeamRunAgentTeamNode;

type TeamRunMetadataV3 = Readonly<{
  schemaVersion: 3;
  teamDefinitionName: string;
  createdAt: string;
  archivedAt: string | null;
  rootTeam: TeamRunAgentTeamNode;
  handoffs: readonly CollaborationHandoff[];
}>;
```

`workspaceRootPath` remains on every Agent node because that matches the current persisted contract and preserves every supported historical value. The normal web launch currently supplies one shared workspace value to all leaves, but the target does not hoist or discard the field until all launch surfaces and stored data prove that equality as a durable product invariant. `workspaceId` is not added to metadata: current restore resolves it from `workspaceRootPath`. `memoryDir` is not added: storage derives it from run identity.

The root Team does not persist a role or description because it is not a member placement inside a parent. A nested AgentTeam may retain those optional historical placement facts when present. The root's `teamDefinitionName` remains the existing presentation snapshot at metadata level; root definition/run identity lives only on `rootTeam`.

### 5.2 Required invariants

1. `rootTeam.kind === "agent_team"`, `rootTeam.address === "/"`, and `rootTeam.teamRunId` equals the TeamRun directory identity.
2. Every node address is canonical, unique, and immutable. New compilation derives each child segment from its authored local `memberName`; migration derives it from an agreed structural `memberPath`/`memberRouteKey`. Historical display `memberName` never selects or validates the migrated address.
3. Sibling address segments remain case-insensitively unique.
4. An Agent has no `children`, Team run ID, or coordinator address.
5. An AgentTeam has no Agent run/platform/LLM/workspace fields.
6. Every AgentTeam coordinator address resolves to exactly one direct Agent child: `parentAddress(coordinatorAddress) === team.address`.
7. Every Agent has one non-empty `agentRunId`; every AgentTeam has one non-empty `teamRunId`.
8. Handoff `from` resolves to an Agent; `to` resolves to an Agent or AgentTeam; every endpoint uses a canonical address; duplicate `(from,to)` pairs are invalid.
9. No name/path/route/local/source/scoped logical identity is persisted beside `address`.
10. No derived index is serialized into metadata.

### 5.3 Representative JSON

```json
{
  "schemaVersion": 3,
  "teamDefinitionName": "Product Team",
  "createdAt": "2026-08-04T10:00:00.000Z",
  "archivedAt": null,
  "rootTeam": {
    "kind": "agent_team",
    "address": "/",
    "teamDefinitionId": "product-team",
    "teamRunId": "root-team-run-1",
    "coordinatorAddress": "/product_manager",
    "children": [
      {
        "kind": "agent",
        "address": "/product_manager",
        "agentDefinitionId": "product-manager-agent",
        "agentRunId": "product-manager-run-1",
        "platformAgentRunId": null,
        "role": "Product manager",
        "description": null,
        "runtimeKind": "AUTOBYTEUS",
        "llmModelIdentifier": "claude-sonnet",
        "llmConfig": null,
        "autoExecuteTools": false,
        "skillAccessMode": "PRELOADED_ONLY",
        "workspaceRootPath": "/projects/product",
        "applicationExecutionContext": null
      },
      {
        "kind": "agent_team",
        "address": "/research_team",
        "teamDefinitionId": "research-team",
        "teamRunId": "research-team-run-1",
        "coordinatorAddress": "/research_team/research_lead",
        "role": null,
        "description": null,
        "children": [
          {
            "kind": "agent",
            "address": "/research_team/research_lead",
            "agentDefinitionId": "research-lead-agent",
            "agentRunId": "research-lead-run-1",
            "platformAgentRunId": "platform-run-42",
            "role": "Research lead",
            "description": null,
            "runtimeKind": "AUTOBYTEUS",
            "llmModelIdentifier": "gpt-codex",
            "llmConfig": {"temperature": 0.2},
            "autoExecuteTools": true,
            "skillAccessMode": "PRELOADED_ONLY",
            "workspaceRootPath": "/projects/product",
            "applicationExecutionContext": null
          }
        ]
      }
    ]
  },
  "handoffs": [
    {
      "from": "/product_manager",
      "to": "/research_team",
      "rules": ["Delegate research work to the research team."]
    }
  ]
}
```

## 6. Runtime Model And Derived Indexes

### 6.1 One immutable persistent tree

`TeamRunMetadataV3` is parsed and frozen as the root execution snapshot. A `TeamRunTreeIndex` is derived once:

```ts
getNode(address): TeamRunNode | null
getAgent(address): TeamRunAgentNode | null
getAgentTeam(address): TeamRunAgentTeamNode | null
getDirectChildren(teamAddress): readonly TeamRunNode[]
getCoordinator(teamAddress): TeamRunAgentNode
```

The index is a cache/view, not a persisted authority. It performs exact address lookup only; it never scans by basename or guesses root/local forms.

### 6.2 Persistent root and child TeamRuns

```ts
type TeamRunExecutionContext = Readonly<{
  rootTeamRunId: string;
  teamAddress: AgentTeamAddress;
  metadata: TeamRunMetadataV3;
  index: TeamRunTreeIndex;
  taskTeamRunIds: readonly string[];
}>;
```

- Root context uses `teamAddress: "/"` and `index.getAgentTeam("/").teamRunId`.
- Persistent child context uses its absolute address and obtains its own `teamRunId` from that node.
- Restored child construction uses the same path.
- Direct members are `index.getDirectChildren(teamAddress)`.
- No persistent child receives a copied, localized, prefix-stripped, or rebased tree.

### 6.3 Task Team execution

A delegated AgentTeam is a new execution instance and therefore needs fresh Team/Agent run IDs. `TaskTeamRunFactory` consumes the selected source AgentTeam node, preserves every absolute address/configuration fact, assigns fresh kind-specific run IDs, and materializes one active task execution tree rooted at that selected address. The task tree is registered by `taskTeamRunId` in the existing task-team active-run directory.

This is not a second logical topology: it is concrete task runtime state. It may be structurally projected from the persistent source subtree, but it cannot localize addresses, change coordinator meaning, or become a persisted alternative Team address language. Nested task delegation appends another task Team run ID and creates another task execution tree with the same absolute address rules.

### 6.4 Runtime registries and handles

- Persistent registries key Agent/AgentTeam handles by `AgentTeamAddress`.
- Active task Team directory keys concrete task executions by `taskTeamRunId` and validates their root logical address through the originating task record.
- A manager accepts only direct addresses whose parent equals its current Team address.
- Downward traversal forwards the canonical final address unchanged.
- Child-to-root delivery/events never prefix or strip addresses.
- Provider handles remain private runtime objects and are never persisted in TeamRun metadata.

## 7. Recipient Resolution And Handoffs

`send_message_to` and `delegate_task` use one `TeamRecipientResolver` and one result:

```ts
type ResolvedTeamRecipient =
  | Readonly<{kind: "agent"; address: AgentTeamAddress}>
  | Readonly<{
      kind: "agent_team";
      address: AgentTeamAddress;
      coordinatorAddress: AgentTeamAddress;
    }>;
```

The resolver exposes no node object, launch config, run ID, manager, handle, parent path, basename, or route key. AgentTeam target delivery maps to `coordinatorAddress`. Task delegation applies direct-current-Team eligibility only after the same recipient resolves:

```text
eligible iff parentAddress(recipient.address) === current Team address
```

Handoffs remain authored on each AgentTeam definition. The compiler traverses the definition graph, rebases child-local endpoints into absolute addresses, validates them against the compiled tree, and persists one flat `handoffs` edge list. Parent-authored cross-Team edges remain defined at the nearest parent where both endpoints are visible.

The stored edge remains exactly `{from,to,rules}` because it answers graph and snapshot questions. The model-facing tool answers a different question—“what handoff decision can I make now?”—and therefore projects rather than repeats the stored edge:

```text
Team collaboration-context builder filters edge.from === caller.memberAddress
  -> immutable caller.outgoingHandoffs
  -> handoff guidance projector stable-flatMaps(edge.rules)
  -> {when: ruleText, recipient_address: edge.to}
```

Every Team-bound Agent receives `get_handoff_rules` and `send_message_to` intrinsically from Team runtime, plus the filesystem-like logical-address system instruction. It must retrieve guidance before completing or stopping as blocked. Provider-visible success is only `{handoffs:[...]}`; the caller address, `from`, service acknowledgement, success code/message, and authored edge wrapper are not repeated. This projection is ephemeral and never becomes another persisted handoff representation.

## 8. Concrete Execution Address

Logical placement and concrete task instantiation remain separate:

```ts
type TeamExecutionAddress = Readonly<{
  rootTeamRunId: string;
  taskTeamRunIds: readonly string[];
  memberAddress: AgentTeamAddress;
  taskAgentRunId: string | null;
}>;
```

- `rootTeamRunId` selects `team_run_metadata.json`.
- `taskTeamRunIds` selects zero or more concrete task-AgentTeam instances, outermost first.
- `memberAddress` selects the logical node.
- `taskAgentRunId` distinguishes a task Agent from the persistent Agent at the same address.

Pure validation guarantees non-empty run IDs, canonical address, immutable ordered task chain, and stable serialization. Contextual resolution belongs to `agent-team-execution`: it resolves every task Team run ID through task records/active or historical task identity, validates the parent run chain, validates each logical Team address against the root tree, and resolves the final member within the innermost scope. No task Team address is repeated in `TeamExecutionAddress` merely to make validation easier.

This value replaces conversation/token/event/WebSocket/frontend synthetic path/route bundles. Task ID, invocation ID, event ID, and provider handle remain separate operation facts.

## 9. Task Identity Contraction

`taskId` is the task-management identity within one root TeamRun's task-record ledger. The existing allocator restarts its sequence per root, so any cross-root query names `{rootTeamRunId,taskId}` explicitly; `taskId` is not falsely promoted to a global ID. `TaskDelegationRecord.taskRun.address` is the concrete execution locator and already carries that root scope. No third “task instance” identity exists.

```ts
type ActiveTaskExecutionBinding =
  | Readonly<{
      kind: "task_agent";
      taskId: string;
      executionAddress: TeamExecutionAddress;
    }>
  | Readonly<{
      kind: "task_team";
      taskId: string;
      executionAddress: TeamExecutionAddress;
    }>;
```

The constructor correlates each discriminator with the address shape: `task_agent` requires a non-null `taskAgentRunId`; `task_team` requires a null task-Agent ID and a task-Team chain extended by one run ID over its parent execution. The binding is a current in-memory view of the active task record, not another persisted identity. It contains no created time because `TaskDelegationRecord.createdAt` and `taskRun.startedAt` already own those distinct facts.

The task record receiver `TeamExecutionAddress` owns the delivery recipient, while its non-null `taskRun.address` owns the concrete task execution root after activation. For an Agent task, the receiver is the base address and the task root adds `taskAgentRunId`; for an AgentTeam task, the receiver is coordinator ingress inside the materialized task Team and the task root is that Team itself. The root TeamRun tree owns definition/configuration/coordinator facts. The active task execution tree/directory owns fresh concrete descendant run IDs. `taskAgentInstanceId = "task_agent_" + taskId`, `taskTeamInstanceId = "task_team_" + taskId`, copied owner/parent TeamRun IDs, copied task run IDs, and copied creation time are removed. Task-bound member contexts retain only the actual `taskId` needed by no-argument task-result operations; their common runtime context already owns the exact execution address. Registries, settlement, notifications, and active-resolution use task ID or typed execution address according to the subject they are resolving, never a synthesized instance ID.

## 10. Data-Flow Spines By Case

### 10.1 Root launch

```text
Frontend/API Team definition ID + Agent launch inputs
  -> AgentTeamDefinitionService loads definition closure
  -> TeamDefinitionGraphResolver validates recursive references
  -> TeamRunTreeCompiler assigns absolute addresses/coordinators/handoffs
  -> TeamRunLaunchIdentityAssignment assigns typed Team/Agent run IDs
  -> TeamRunMetadataMapper writes schema-v3 root tree
  -> TeamRunTreeIndex derives exact lookup
  -> root TeamRun context {teamAddress:"/"}
  -> manager materializes direct children
```

### 10.2 Persistent child materialization

```text
parent manager selects /research_team
  -> shared index.getAgentTeam("/research_team")
  -> node.teamRunId supplies concrete child TeamRun ID
  -> child context receives same metadata/index + teamAddress
  -> index.getDirectChildren("/research_team")
  -> child manager materializes those exact nodes
```

### 10.3 Restore

```text
<memoryDir>/agent_teams/<rootTeamRunId>/team_run_metadata.json
  -> strict v3 parser validates rootTeam.teamRunId/path identity
  -> freeze root tree + build index
  -> root context
  -> lazy child materialization uses 10.2 unchanged
```

Current Team definitions are not reread. Old metadata enters only through migration.

### 10.4 Message to persistent recipient

```text
caller {rootTeamRunId,memberAddress} + wire recipient_address: string
  -> shared parser -> recipientAddress: RecipientAddressExpression
  -> canonical AgentTeamAddress
  -> TeamRecipientResolver exact index lookup
  -> AgentTeam target maps to coordinatorAddress once
  -> root manager resolves Agent node.agentRunId/handle
  -> AgentRun input
  -> communication event with TeamExecutionAddress
  -> store/WebSocket/frontend preserve the same concrete locator
```

### 10.5 Delegated task Agent

```text
same caller + wire recipient_address: string
  -> shared parser -> recipientAddress: RecipientAddressExpression
  -> same TeamRecipientResolver
  -> direct-current-Team eligibility
  -> selected Agent node supplies launch facts
  -> allocate taskAgentRunId
  -> one ActiveTaskExecutionBinding {kind:"task_agent",taskId,executionAddress}
  -> task record/events/token usage use TeamExecutionAddress
```

### 10.6 Delegated task AgentTeam and nested task AgentTeam

```text
same recipient resolution/eligibility
  -> selected AgentTeam node supplies coordinatorAddress + source subtree
  -> allocate taskTeamRunId and fresh task execution tree run IDs
  -> preserve every absolute node address
  -> append taskTeamRunId to execution chain
  -> one ActiveTaskExecutionBinding {kind:"task_team",taskId,executionAddress}
  -> activate exact coordinatorAddress in task tree
  -> nested task delegation repeats without localizing an address
```

### 10.7 Live event and command round trip

```text
Agent/task runtime event
  -> TeamRunEvent carries TeamExecutionAddress
  -> child/root bridges forward unchanged
  -> WebSocket emits execution_address
  -> frontend uses canonical serialized execution key
  -> approval/interrupt/input command returns same value
  -> command resolver selects exact persistent/task execution
```

### 10.8 Historical hydration and memory

```text
rootTeamRunId
  -> metadata gives rooted nodes, local Agent settings, run IDs, handoffs
  -> index selects member by address
  -> Agent node supplies concrete agentRunId/workspaceRootPath
  -> storage locator derives physical run-ID ancestry
  -> API/frontend project address/execution state
```

Opaque provider tool arguments remain display payload and are never interpreted as routing identity.

### 10.9 Project-owned application V5 build

```text
application SDK contracts source owns V5 constants + canonical types
  -> build contracts dist
  -> backend/frontend SDKs consume and rebuild
  -> brief-studio + socratic-math-teacher source manifests/definitions/scripts declare V5
  -> regenerate backend dist, UI vendor contracts, and importable packages
  -> consistency scan compares versions and forbidden legacy identity fields
  -> terminal: one internally consistent V5 artifact set
```

Unchanged application manifest V4, backend bundle envelope V1, and iframe V4 remain independently versioned. Generated outputs never become an alternate authority.

### 10.10 Exact current application input validation

```text
package/catalog scan
  -> ordinary application/backend manifest parsers require the exact V5 SDK declarations
  -> invalid source is rejected with location + field + observed value + required V5
  -> FileApplicationBundleProvider produces no executable record
  -> package import validation fails through the same target parser
  -> no UI asset open, worker start, lifecycle hook, or handler
```

This is current-input validation, not a backward-compatibility, quarantine, upgrade, or reinstall subsystem. There is no supported installed predecessor-bundle cohort and no special old-version state machine.

### 10.11 Exact V5 application launch

```text
application manifest V4 envelope requires frontend SDK V5
  -> backend bundle V1 envelope requires backend definition V5 + frontend SDK V5
  -> bundle enters launchable catalog
  -> worker loads backend definition
  -> definitionContractVersion must equal V5 before exposures/hooks/handlers
  -> launch binding uses memberAddress + typed run IDs
  -> target/input/event round trip uses memberAddress + TeamExecutionAddress only
```

A V5-declared bundle exporting a non-current definition fails at the final loader gate and runs no hook or handler.

### 10.12 Project application database rebuild

```text
target repository/build preparation
  -> remove project-owned predecessor application database fixtures/files
  -> create fresh databases from the current schema
  -> seed only current-schema test/application data
  -> validate target launch against those fresh databases
  -> ship no application migration item or predecessor decoder
```

The runtime does not enumerate or preserve pre-ticket application platform databases for this unused framework. This does not weaken the released Team/task/token/external migration contract.

### 10.13 Application target consistency verification

```text
non-current application-manifest input -> ordinary parser rejection before catalog execution
non-current backend-manifest input -> ordinary parser rejection before catalog execution
V5 manifests + non-current backend definition -> loader rejection before callable behavior
exact V5 fixture -> admitted and canonical launch/binding/target/event succeeds
fresh current application DB -> exact launch/binding/event succeeds
project artifact inventory -> every source/dist/vendor/importable declaration is V5-consistent
source inventory -> no application predecessor decoder, database migration item, compatibility adapter, special quarantine/upgrade branch, dual reader, or fallback
```

### 10.14 Fresh historical flat TeamRun migration

```text
startup migration runner reads no terminal record for either TeamRun migration ID
  -> 20260517_team_run_metadata_member_tree discovers flat-v1 memberMetadata
  -> require flat/direct-Agent shape and one structural memberRouteKey per member
  -> if an optional structural memberPath exists, require [memberRouteKey]
  -> require and preserve memberName as independent historical display text; never use it as route fallback
  -> build predecessor memberTree with memberPath:[memberRouteKey]
  -> validate the complete staged predecessor document
  -> backup + same-directory temporary write + atomic rename
  -> record the stable prerequisite terminal
  -> 20260801_team_canonical_identity reads the resulting predecessor tree
  -> require normalized memberRouteKey === memberPath.join("/")
  -> derive canonical addresses from that agreed structural identity; ignore memberName
  -> validate complete v3, backup + atomic replace, record terminal
  -> strict v3 startup gate opens
```

The maintained `Program Manager` / `program_manager` and `QA Specialist` / `qa_specialist` fixture is safe by design: display text differs while structural identity is unambiguous.

### 10.15 Already-terminal prerequisite migration

```text
startup migration runner reads 20260517_team_run_metadata_member_tree =
  SUCCEEDED or SUCCEEDED_WITH_WARNINGS
  -> runner skips that stable ID; no changed code under it is expected to rerun
  -> 20260801_team_canonical_identity remains independently pending
  -> per file, canonical migration reads the predecessor memberTree exactly as persisted
     OR a residual/repaired safe flat file is decoded to predecessor form in memory
        by the same migration-only decoder used by 20260517
  -> require structural route/path agreement, parent/direct-child validity,
     coordinator direct-Agent validity, duplicate safety, and Team run-ID agreement
  -> historical memberName may differ from path basename and is not consulted structurally
  -> construct and validate v3
  -> backup original + same-directory temporary write + atomic rename to final v3
  -> record canonical migration terminal; strict v3 startup gate opens
```

This is the supported upgrade path for a server that completed the stable prerequisite in an earlier release. No third migration ID, prerequisite-status reset, intermediate write, or post-listen manual API is required because the separately pending canonical ID owns the target conversion and the decoder remains migration-only.

### 10.16 Unsafe predecessor rejection

```text
fresh flat input with nested/non-Agent/missing-or-ambiguous structural route
  -> stable prerequisite staging validation fails
  -> source TeamRun metadata bytes remain unchanged
  -> required migration result fails and startup remains closed

or

the same unsafe flat input remains after a terminal-warning prerequisite record
  -> canonical migration calls the shared flat decoder in memory
  -> decoder rejects before backup/replacement
  -> source TeamRun metadata bytes remain unchanged
  -> canonical migration fails and startup remains closed

or

predecessor memberTree with route/path disagreement, invalid parent/direct-child shape,
duplicate structural placement, invalid coordinator, or conflicting Team run IDs
  -> canonical staging validation fails before backup/replacement
  -> source TeamRun metadata bytes remain unchanged
  -> required migration result fails and startup remains closed
```

A display-only `memberName`/route difference is not in either rejection class. Neither converter guesses between disagreeing structural route/path fields or reconstructs nested topology from flat data.

### 10.17 Retry, idempotence, and mixed item progress

```text
canonical migration discovers TeamRun items
  -> already-valid v3 item validates and returns unchanged
  -> valid predecessor or residual flat item stages final v3, backs up, and atomically converts
  -> unsafe predecessor/flat item fails the required migration aggregate
  -> startup remains closed even though earlier items are current
  -> operator repairs or restores only the unsafe source
  -> runner retries the non-terminal 20260801 migration ID
  -> v3 items remain byte-stable; repaired predecessor/residual flat converts
  -> all required items succeed; derived indexes rebuild; startup opens
```

If the stable prerequisite was terminal with warnings because unsafe flat items remained, repair makes those items eligible for the still-nonterminal canonical retry. The canonical migration composes the one shared flat decoder and writes only final v3. Normal runtime readers stay v3-only throughout.

### 10.18 Terminal historical token record reaches the pending canonical owner

```text
supported predecessor startup
  -> 20260703_token_usage_execution_address_backfill writes {segments}
  -> old record becomes SUCCEEDED or SUCCEEDED_WITH_WARNINGS
operator upgrades/starts target
  -> runner leaves the old record/status/attempt count unchanged
  -> old semantic/column-drop definitions are absent from current registry
  -> pre-existing token model/provider backfills are attempted before physical contraction; either may remain retryable
  -> pending 20260801 converts TeamRun/task files first
  -> canonical token item plans legacy/current rows from strict task records
  -> token migration store updates exact addresses, removes every obsolete Team identity column/old root index,
     creates `token_usage_ledger_events_execution_root_observed_at_idx`, and verifies one transaction
  -> 20260801 exact success opens strict startup
```

No new token record or second startup gate is needed because `20260801...` is absent from the supported predecessor and already owns the cross-store target canonical result.

### 10.19 Token planning failure before mutation

```text
current TeamRun/task sources
  -> strict task-Team index finds unreadable/missing/duplicate/conflicting mapping
     OR row planner finds irreconcilable root/ordered chain/member/task-Agent identity
  -> actionable failure details
  -> applyCanonicalTeamIdentityTransaction is never called
  -> zero token rows or columns change
  -> 20260801 FAILED -> bootstrap/listen remain closed
```

### 10.20 Token transaction rollback

```text
all row plans valid -> immutable ordered canonical-identity transaction plan
  -> Prisma/SQLite transaction
  -> row updates succeed and obsolete-column removal begins inside transaction
  -> later update count/address/schema/index verification or DDL fails
  -> rollback every row update and schema change
  -> migrated row/column counts = 0 + database failure detail
  -> 20260801 FAILED -> bootstrap/listen remain closed
```

The durable proof uses the real SQLite/Prisma boundary and forces the later write failure; an in-memory fake alone does not prove database rollback.

### 10.21 Token repair, retry, and idempotence

```text
operator repairs source/transient database failure
  -> normal startup retries non-terminal 20260801
  -> already-current file/database subjects skip
  -> remaining token updates plus obsolete-column removal commit once
  -> exact-current rerun sees no updates, no obsolete columns, and the exact expression index
  -> exact 20260801 success + unrelated warning -> one normal startup
```

A crash after the token transaction commits but before the migration record completes is recovered by the same idempotent retry; the historical record is never reset and current readers never accept `{segments}`.

## 11. Other Structured Stores

| Store | Target identity |
| --- | --- |
| Team communication projection | `senderAddress` and `receiverAddress` are `TeamExecutionAddress` |
| Task delegation record | caller/receiver/task-run locators are `TeamExecutionAddress`; `taskId` is the task identity and no synthetic instance identity remains |
| Token usage ledger | JSON column stores exact `TeamExecutionAddress`; actual Agent `run_id` and task-operation `task_id` remain distinct facts, while root/member/task-run/task-instance identity columns are absent |
| External channel binding | one `targetMemberAddress` |
| Application launch data | existing genuine launch settings keyed by `memberAddress`; no path/route pair |
| Application run summary/table | `memberAddress` plus `agentRunId` and genuine presentation/runtime fields |
| Context-file owner API | `memberAddress`; storage key derived at boundary |
| Frontend route/deep link | canonical `memberAddress` or serialized `TeamExecutionAddress` |

## 12. Persisted-Data Transition

### 12.1 Outcome by class

| Data class | Outcome |
| --- | --- |
| TeamRun `team_run_metadata.json` | `Migration Required` to rooted v3 tree |
| Team communication JSON | `Migration Required` |
| Task delegation JSON | `Migration Required` |
| Token usage database | `Migration Required` |
| External-channel `bindings.json` | `Migration Required` |
| Application platform databases | `Discard or Rebuild`; project-owned fixtures/databases are recreated directly from the current schema |
| Derived history indexes/caches | `Discard or Rebuild` |
| Team definitions/handoffs | `Directly Usable — No Migration` |
| Agent memory directories | `Directly Usable — No Migration` |
| Context-file storage layout | `Directly Usable — No Migration` |
| Opaque provider raw trace/tool arguments | `Directly Usable — No Migration` |
| Project-owned application bundle/source artifacts | `Direct Target Replacement`; source, generated/vendor/importable outputs, fixtures, and fresh databases advance atomically to V5/current schema |

### 12.2 Blocking migration

Reuse the ordered app-data migration capability with one stable TeamRun prerequisite and one independently pending target canonical aggregate:

1. stable `20260517_team_run_metadata_member_tree` owns pending flat-v1 `memberMetadata` to predecessor `memberTree` replacement; and
2. separately pending `20260801_team_canonical_identity` owns final rooted-v3 replacement plus the other target canonical identity items, including semantic token-row conversion after TeamRun/task readiness.

`AppDataMigrationRunner.runPending()` keeps its existing rule that `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` IDs are skipped. Therefore previously terminal `20260517...` and `20260703_token_usage_execution_address_backfill` records are not reset, rewritten, or expected to execute revised code. The old token definition is removed from the current registry; its record remains historical evidence. `20260801...` is absent from the supported predecessor database state, reads predecessor/residual TeamRun input, and reads legacy/current token rows through migration-only types. One pending canonical record is more coherent than adding a token version plus second gate because all these items answer the same rollout question: can strict current canonical identity start?

Registry order is `20260517...` -> the two pre-existing token model/provider backfills -> `20260801...` -> later unrelated derived/index migrations. The backfills are attempted first but are not canonical prerequisites under the established runner. The provider-name migration-local database uses `SELECT *` before and after each guarded candidate update. Classification sees only `id`, `runtime_kind`, `model_provider`, `provider_name`, and `model_identifier`; preservation lexically sorts the discovered physical column names, excludes only `provider_name`, and requires every other column/value to remain equal. It is therefore valid before contraction and on a later retry after contraction without naming a removable identity/display column. The historical token semantic converter and two narrow legacy-column cleanup definitions are removed from the current registry; any terminal records remain untouched historical evidence. Their target responsibility moves into the `20260801...` token item so semantic conversion and physical schema contraction are one success/failure decision. No Prisma migration drops predecessor inputs before app-data planning: historical Prisma migrations establish/preserve the physical columns on fresh/predecessor stores, the target `schema.prisma` and generated client omit them, and only the migration-local raw store reads/removes them inside the blocking transaction.

`20260801...` is explicitly blocking: server tools, channels, GraphQL, WebSocket, and port listen do not start unless the aggregate is exactly `SUCCEEDED`, including token transaction success. Missing, running, failed, or warning canonical status blocks. Existing unrelated best-effort warnings retain their policy. Normal stores and runtime readers accept only v3/exact `TeamExecutionAddress` after the gate; migration decoders stay isolated under app-data migrations.

### 12.3 TeamRun metadata conversion

The existing prerequisite-converter module exposes one pure migration-only flat decoder with this narrow contract:

1. accept only flat-v1 `memberMetadata` containing direct Agent members with non-empty display `memberName`; reject nested-Team markers, multi-segment routes, mixed `memberMetadata`/`memberTree`, missing structural route, duplicate route, or ambiguous coordinator before mutation;
2. take `memberRouteKey` as the required flat structural placement; when legacy flat `memberPath` is present, require its normalized value to equal `[memberRouteKey]`;
3. preserve historical `memberName` exactly as display text independent of structural route; never derive a route from it and never rewrite it to the route basename;
4. build and return predecessor `memberPath: [memberRouteKey]`, preserve genuine Agent/role/description/launch/run fields, and preserve the exact structural coordinator route.

Both migration definitions submit that decoder output to the canonical converter before any source mutation. The stable `20260517` migration uses successful canonical construction only as staged successor-contract validation, then creates the backup immediately before same-directory temporary write and atomic rename to predecessor form. Existing predecessor/v3 items validate and return unchanged under the stable migration. `20260801` keeps the already-constructed v3 result and writes it as described below.

The `20260801` migration accepts already-v3 metadata idempotently, one recursive predecessor `memberTree`, or residual flat v1. For flat input it calls the exact shared decoder in memory and gives the resulting predecessor object to the canonical converter; it never writes the intermediate tree. For each predecessor object the canonical converter:

1. validates top-level `teamRunId` against the directory, definition ID/name, timestamps, coordinator route, tree, and handoffs;
2. normalizes structural `memberRouteKey` and `memberPath` independently, requires `memberRouteKey === memberPath.join("/")`, and validates parent/direct-child shape, sibling uniqueness, and canonical segment grammar;
3. treats legacy `memberName` as display-only input: require only the legacy schema's valid string shape, never compare it with the path basename, never select an address from it, and intentionally omit it from v3 because `address` owns placement while retained `role`/`description` own presentation;
4. creates `rootTeam {kind:"agent_team",address:"/",teamDefinitionId,teamRunId,coordinatorAddress,children}` and derives each descendant address once from the agreed structural path;
5. for an Agent, renames `memberRunId` to `agentRunId` and copies every genuine Agent, role, description, runtime, model, tool, skill, workspace, application-context, and platform-run field unchanged;
6. for an AgentTeam, requires generic and Team-specific run IDs to agree, retains one `teamRunId`, converts the coordinator route to one exact direct-Agent `coordinatorAddress`, and recurses from `memberTree` to `children`;
7. compiles/validates handoff endpoints as canonical addresses without changing rule text/order;
8. validates the complete v3 target; and
9. returns a fully validated v3 value to `20260801`, which only then creates a backup of the original source immediately before same-directory temporary write and atomic rename to final v3.

Structural contradiction is never repaired by choosing between `memberRouteKey` and `memberPath`. Historical display/route difference is not a contradiction. Failure names the migration ID, file, node, and structural invariant; the source metadata file remains byte-for-byte unchanged.

### 12.4 Token semantic conversion and transaction

`20260801...` composes a token canonical-address migrator only after every TeamRun/task source required for attribution is current. Preserve IR-014's strict task-Team index and row planner: they reconstruct the true root TeamRun ID, ordered `taskTeamRunIds`, logical Team/member address, and optional task Agent run ID; reject missing ancestors, unreadable/invalid task files, duplicate/conflicting task TeamRun mappings, row/index disagreement, invalid legacy segments, and exact-address/root contradiction; and skip standalone or already-exact rows.

The current `TokenUsageExecutionAddressBackfillMigration` stops being an `AppDataMigrationDefinition`. Rename/move it to a `20260801...`-composed migrator and remove `20260703_token_usage_execution_address_backfill` from the current registry. Legacy `{segments}`, `member_route_key`, and `task_agent_run_id` parsing remains only in its migration-local planner. The historical record stays in `app_data_migration_records` and is never reset or used as the target readiness signal.

Use this sole mutation boundary:

```ts
type TokenUsageCanonicalExecutionAddressUpdate = Readonly<{
  id: number;
  executionAddressJson: string;
}>;

type TokenUsageCanonicalIdentityTransactionResult = Readonly<{
  updatedRowCount: number;
  droppedColumns: readonly string[];
}>;

interface TokenUsageCanonicalIdentityMigrationStore {
  listRows(): Promise<readonly RawTokenUsageCanonicalMigrationRow[]>;
  applyCanonicalTeamIdentityTransaction(
    updates: readonly TokenUsageCanonicalExecutionAddressUpdate[],
  ): Promise<TokenUsageCanonicalIdentityTransactionResult>;
  disconnect?(): Promise<void>;
}
```

The orchestrator builds and validates every row plan before calling `applyCanonicalTeamIdentityTransaction`. The Prisma/SQLite store owns the exact obsolete-column set: `team_run_path_json`, `member_path_json`, `member_route_key`, `root_team_run_id`, `member_agent_run_id`, `task_agent_instance_id`, and `task_agent_run_id`. Inside one transaction it updates in stable row-ID order, requires exactly one affected row per update, verifies canonical JSON values, removes the obsolete root-column index and every still-present obsolete column, creates the canonical non-partial `token_usage_ledger_events_execution_root_observed_at_idx` over `json_extract(execution_address_json,'$.rootTeamRunId'), observed_at`, and verifies row count, unique usage-event IDs, exact updated addresses, final column absence, and required indexes before commit. The actual Agent `run_id`, task-operation `task_id`, usage/cost/presentation facts, and all unrelated columns remain byte/value-equivalent. Any write, DDL, index, or verification failure rolls back row and schema mutation together. No per-row mutation or independent column-drop API remains. `MIGRATED` details are emitted only after commit; transaction failure reports zero migrated rows/columns and one bounded actionable database failure. An empty update list still opens the transaction when an obsolete column remains; if rows are already exact and the target schema/index is already clean, the item is an idempotent skip. Current root-Team token queries execute `WHERE json_extract(execution_address_json,'$.rootTeamRunId') = ?` and chronological ordering through the named index rather than reintroducing a writable root column.

The migration record completion is intentionally outside the token data transaction under the existing runner. If the process stops after data commit but before record completion, the next allowed stale/non-terminal retry sees exact-current rows, emits no updates, and safely completes `20260801...`.

### 12.5 Conversation/task/external conversion and application direct cut

- Decode legacy ordered task/member segment grammars by structural position and enclosing task record, not root/local string guessing.
- Produce exactly one `TeamExecutionAddress` and validate it against already-migrated root metadata plus task identity chain.
- Require stored external route/path pairs to agree before producing `targetMemberAddress`.
- Do not enumerate application platform databases from canonical migration. Remove/recreate project-owned application fixtures/databases from the current schema as build/test setup.
- Keep every application predecessor field/version decoder out of production and migration code; there is no application backup/transform step.
- Preserve genuine Agent settings, platform IDs, content, references, lifecycle, timestamps, token/cost facts, and presentation fields.
- Drop old identity columns/JSON fields after validated backfill in the same store-owned transaction.

### 12.6 Rollout

After all `20260801...` released-data items—including the token transaction—are current, the one exact canonical gate opens; unrelated warnings do not affect it. Rebuild derived indexes/caches, then start strict current runtime and exact V5 application validation. GraphQL/REST/WebSocket, generated contracts, project SDKs, integrations, project application artifacts, fresh application databases, and production web ship atomically. Application rollout has no migration, predecessor adapter, special quarantine/upgrade path, dual write/read, lazy conversion, legacy alias, fallback, or mixed-version negotiation.

## 13. API, SDK, And Frontend Contract

### 13.1 Project interfaces

| Current | Target |
| --- | --- |
| `memberRouteKey`, `memberPath` | `memberAddress` |
| `coordinatorMemberRouteKey` | `coordinatorAddress` |
| generic `memberRunId` | Agent `agentRunId` or AgentTeam `teamRunId` |
| event/status source/member/team path bundle | `executionAddress` |
| target route/path pair | `targetMemberAddress` |

GraphQL uses kind-specific Agent/AgentTeam objects or `kind: "agent" | "agent_team"`. WebSocket uses snake-case `execution_address`. Operation IDs stay separate. Application SDKs and integrations adopt the same names without aliases. The backend-definition and frontend-SDK compatibility contracts advance together to V5; their exact types and gates are below.

### 13.2 Application SDK V5 semantic contract

`@autobyteus/application-sdk-contracts` is the sole owner of:

```ts
export const APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V5 = "5" as const;
export const APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V5 = "5" as const;
```

Current V4 exports for these two semantic contracts are removed from project runtime/packages. Three independent protocol versions remain unchanged:

- `APPLICATION_MANIFEST_VERSION_V4 = "4"` because the application manifest envelope is unchanged;
- `APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1 = "1"` because the self-contained backend bundle envelope is unchanged; and
- `APPLICATION_IFRAME_CONTRACT_VERSION_V4 = "4"` because ready/bootstrap/query transport contains no changed Team identity.

Their target relationship is exact:

```json
// application.json
{
  "manifestVersion": "4",
  "ui": { "frontendSdkContractVersion": "5" }
}
```

```json
// backend/bundle.json
{
  "contractVersion": "1",
  "sdkCompatibility": {
    "backendDefinitionContractVersion": "5",
    "frontendSdkContractVersion": "5"
  }
}
```

```ts
const application: ApplicationBackendDefinition = {
  definitionContractVersion: "5",
  // exposures...
};
```

Canonical V5 identity replacements:

| V4 | V5 |
| --- | --- |
| runtime input `targetMemberRouteKey` + `targetMemberPath` | `targetMemberAddress` |
| Team member launch `memberName` + `memberRouteKey` | `memberAddress` |
| Agent binding runtime `runId` | `agentRunId` |
| Team binding runtime `runId` | `teamRunId` |
| binding member `memberName/memberRouteKey/teamPath/runId` | `memberAddress`, `agentRunId`, retained display/runtime facts |
| Team-member target `memberRouteKey` | `memberAddress` |
| producer `runId/memberRouteKey/memberName/teamPath` | `executionAddress`, retained display/runtime facts |

The contracts package owns wire types only. Every `memberAddress` is a serialized validated domain `AgentTeamAddress`; its SDK `TeamExecutionAddress` mirrors `{rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}` and has no independent parser/resolver. It also owns the one cross-process `ApplicationExecutionContext {applicationId,bindingId,producer:ApplicationExecutionProducer}` type. Server application orchestration aliases that type and owns server domain-to-SDK/canonical-address mapping; the browser imports the same type and maps metadata through its existing canonical-address capability. Neither process casts an object-shaped `Record<string,unknown>` into this context, and the SDK package does not gain a second logical-address resolver.

Exact admission sequence:

1. `parseApplicationManifest` requires frontend SDK V5.
2. `parseApplicationBackendManifest` requires backend definition V5 and frontend SDK V5.
3. `FileApplicationBundleProvider` creates an executable catalog record only from parsed target input; package import validation uses the same exact target parser.
4. `ApplicationAvailabilityService` sees only valid current catalog records and adds no version-specific state.
5. `ApplicationBackendDefinitionLoader` requires exported definition V5 before exposures, hooks, or handlers become callable.

Each ordinary validation error contains the manifest/entry location, offending field, observed value, and required `"5"`. Existing diagnostic identity fields provide application/package/root context. No compatibility service, special quarantine/upgrade or reinstall result, negotiation, predecessor adapter, external bundle edit, or application migration is added.

Project artifact sequence is atomic:

1. update contracts source and build its `dist`;
2. update/build backend and frontend SDK source/dist;
3. update `brief-studio` and `socratic-math-teacher` source `application.json`, `backend/bundle.json`, backend definitions, and build scripts;
4. rebuild application backend dist and UI vendor SDK copies;
5. regenerate `dist/importable-package` trees; and
6. compare all source/dist/vendor/importable declarations plus forbidden identity fields before accepting the checkpoint.

#### 13.2.1 Runtime application producer binding

The recursive persisted Agent node keeps `ApplicationExecutionContext` because it is part of the inspectable/restorable TeamRun aggregate, but the nested `producer.executionAddress` is a concrete execution binding. `MixedAgentMemberHandle` is already the one AgentRun-construction owner and already derives the exact persistent, task-Agent, or task-Team-Agent execution address. Before creating `AgentRunConfig`, it applies one closed rule:

- null context remains null;
- a persistent Agent context must already match the derived execution address or construction fails before an AgentRun exists; and
- a task Agent/task-Team-Agent context preserves `applicationId`, `bindingId`, producer display name, and producer runtime kind while replacing only `producer.executionAddress` with the exact task execution.

Published artifacts, application events, and application Agent streams then consume the correctly bound `AgentRunConfig` context. They do not repair or reinterpret producer identity. Task scope is recognized only from the typed execution address's task-Team chain/task-Agent ID, never by a root/local-shape guess.

### 13.3 Frontend

```ts
type AgentTeamContext = {
  readonly topology: TeamTopologySnapshot;
  readonly executions: TeamExecutionState;
};
```

`TeamRunFrontendProjectionBuilder` consumes one closed launch/open input and atomically builds both views. The input contains validated canonical TeamRun metadata, exact root lifecycle from the launch/resume boundary, one initial logical Agent focus, and exactly one discriminated fresh/loaded/historical-unloaded identity-free Agent seed per metadata Agent. Seeds supply only workspace/dynamic hydration facts and cannot repeat run/config/application identity; the builder never infers lifecycle from metadata. `TeamTopologySnapshot` owns immutable `teamDefinitionName`, logical/effective-launch-configuration `rootTeam`, and a private derived address index exposed through typed `getNode`/`listNodes` queries; Agent/AgentTeam run bindings and `ApplicationExecutionContext` values are projected into paired persistent execution records instead of retained on topology. This does not change the one recursive disk aggregate: it recognizes that `ApplicationExecutionContext.producer.executionAddress` is a concrete binding, not mounted configuration. Callers receive no topology map. Topology contains no run binding, execution address, application producer context, task lifecycle, Agent contexts, presentation flags, task children, or mutable status. `AgentTeamContext` has no duplicate `teamRunId`, mutable launched `config`, lifecycle, hydration bag, or subscription handle: root ID/lifecycle and all concrete bindings belong to `TeamExecutionState`, effective launch configuration derives from topology, application producer identity derives from the concrete Agent execution, later hydration enters `TeamExecutionState`, and stream session state stays with the streaming transport.

Pre-launch editing uses a separate `TeamLaunchDraft {draftId,config,focusedMemberAddress,pendingInputsByMemberAddress}` with no run/execution/conversation identity. A successful launch constructs a fresh `TeamTopologySnapshot`/`TeamExecutionState` from canonical server IDs and transfers pending focus/input once; failure leaves the draft untouched. No temporary TeamRun/AgentRun ID or identity rebase remains.

`TeamExecutionState` is the one authoritative frontend owner for concrete execution state. It owns a private index keyed by canonical `TeamExecutionAddress`, and every exposed record is one valid discriminated variant:

```ts
type TeamExecution =
  | PersistentTeamExecution
  | PersistentAgentExecution
  | TaskAgentExecution
  | TaskTeamExecution
  | TaskTeamAgentExecution;
```

Every persisted AgentTeam node produces one `PersistentTeamExecution`; every persisted Agent node produces one `PersistentAgentExecution`. These records, not topology, own platform/application bindings and root Team lifecycle; the associated AgentContext owns its permanent AgentRun ID and Agent-local conversation/status/tool/UI state once, so execution records do not copy those fields. Every Agent execution owns at most one typed application context whose producer address equals its exact execution; task Agent variants preserve the persistent source Agent's stable application/binding/presentation assignment while rebinding that address. The root persistent Team uses `{kind:"root"}` and derives its run ID from `executionAddress.rootTeamRunId`; only a non-root persistent Team carries `{kind:"child",teamRunId}` for its distinct child binding. Task Team identity derives from the execution-address task-chain tail. Task Agent/task Team executions carry only one `taskId` reference; the aggregate's one private task projection per ID supplies active status/timeline and query-derived history without a copied snapshot/archive or stored presentation label. No public consumer receives the mutable index, internal concrete union record, or serialized key. Consumers query the aggregate by typed address and receive subject-specific immutable summaries, Agent-context entries, navigation rows, history/task-timeline presentation, or the explicit external-work effects needed for Agent dispatch, Team token usage, and task-record refresh. A task AgentTeam is not a cloned topology subtree: its Team execution appears only after a real task TeamRun ID exists, and each task-Team Agent appears only after its real AgentRun ID arrives. Therefore every materialized execution is concrete; empty-ID placeholder nodes are unrepresentable.

The same aggregate owns root lifecycle, live-event admission/Agent-context association, GraphQL task-record reconciliation/hydration, exact execution focus, task projection, and terminal cleanup. The workspace selection store independently owns the selected root TeamRun; current-row presentation composes that selected root with aggregate focus without moving either authority. GraphQL/task storage remains the durable task-record authority. Its boundary mapper takes one complete root-scoped response, requires every `taskRun.address` as the enclosing task execution identity, validates every row against the expected root, and separately validates the delivery receiver: an Agent receiver is the task address without `taskAgentRunId`, while an AgentTeam receiver is the configured coordinator ingress inside that task Team. One invalid row rejects the whole snapshot. The mapper drops delivery receivers, while the aggregate derives parent/child relation only in its private graph and stages a monotonic one-projection-per-task merge: newer rows replace, older/missing concurrent input preserves known rows, and equal-time conflict rejects the entire candidate. Durable-confirmed activation may seed the active projection; later result-submission/review signals request complete refresh without partial mutation. Terminal task-Team cleanup requires terminal candidates for every materialized descendant in that same snapshot before atomically retaining projections and removing execution state. The aggregate returns only true external-work effects rather than fetching GraphQL or mutating navigation/token stores itself. Agent-local event projection remains with the established AgentContext/projector capability and is not copied by the aggregate. Old route-key deep links, mixed topology/execution nodes, copied task/history models, duplicate task-status event, public maps, raw-key parsing, draft/provisional execution identities, synthetic task routes, Agent-context connection ownership, and duplicate context run/config/lifecycle/hydration/session fields are removed rather than aliased.

The exact correlated event/wire types, aggregate API, lifecycle transitions, frontend spines, dependency rules, removals, and current-source allowlist are normative in [team-stream-execution-projection-contract.md](./team-stream-execution-projection-contract.md).

## 14. Storage Boundary

```ts
type TeamRunStorageScope = Readonly<{
  rootTeamRunId: string;
  ancestorTeamRunIds: readonly string[];
}>;
```

Only storage uses that concrete directory lineage:

```text
memory/agent_teams/<rootTeamRunId>/<childTeamRunId...>/<agentRunId>
```

Domain/API/frontend never treats it as topology. The memory locator joins an address to the current persistent or task execution node/run identity, then emits the physical scope. Context-file APIs accept `memberAddress` and derive the existing relative path segments at the URL/filesystem boundary. No memory or final context file moves.

## 15. Clean Removal Matrix

| Remove | Replacement |
| --- | --- |
| public `recipient_name`, proposed `recipient_path`, and provider-specific selector aliases | one wire `recipient_address: string` on both tools -> shared parsed `RecipientAddressExpression` |
| `memberName/memberPath/memberRouteKey` in mounted/current run state | node `address` + derivation functions |
| generic `memberRunId` | `agentRunId` / `teamRunId` |
| duplicate `childTeamRunId` | AgentTeam node `teamRunId` |
| coordinator name/route/runtime representative | `coordinatorAddress` |
| top-level root ID/definition plus child-only Team shape | uniform `rootTeam` AgentTeam node |
| `memberTree` persisted field | `children` |
| persisted topology/profile/binding normalization proposed in SR-007 | one local rooted TeamRun tree + derived indexes |
| child persistent topology localization/prefix helpers | shared root tree + `teamAddress` |
| event prefixing/source/member route bundles | `TeamExecutionAddress` |
| `ConversationTargetAddress` and token execution duplicate | `TeamExecutionAddress` |
| `20260703_token_usage_execution_address_backfill` as a current registered target converter | historical record only; token semantic migrator composed by pending `20260801...` |
| per-row token mutation plus independent narrow column-drop migrations | one immutable `applyCanonicalTeamIdentityTransaction` that updates addresses and removes all obsolete Team identity columns under `20260801...` |
| token cleanup dependency on old backfill/cleanup statuses | no current dependency; historical records remain evidence and exact `20260801...` owns the complete target token transition |
| task logical name/path/route/template/coordinator bundles and synthetic task Agent/Team instance identities | `taskId` + `taskRun.address`; one derived `{kind,taskId,executionAddress}` active binding |
| API/SDK/frontend route/path aliases and synthetic scoped routes | address/execution-address contracts |
| backend-definition/frontend-SDK V4 current exports/declarations/artifacts | exact V5 semantic contracts and regenerated project artifacts; V4 only in rejection fixtures |
| `get_handoff_rules` generic success envelope and `{from,to,rules}` model projection | intrinsic Team tool + `{handoffs:[{when,recipient_address}]}` |
| package-configured Team handoff tool prerequisite | Team runtime intrinsic capability composition |
| uncorrelated `TeamRunEvent { type, data }`, task `unknown`, generic Team WebSocket `ServerMessage`, and mapper casts | correlated Team domain variants -> exhaustive exact Team wire DTO union |
| `TeamLeafAgentStatusSnapshot` with repeated TeamRun/execution/Agent name/run identity and generic initial mapper | one `TeamAgentStatusSnapshot {execution,details,statusHint}` -> shared exact Agent-status projector |
| generic pre-run command-start status payload/event builder | already-constructed binding + details-only overlay -> `createTeamAgentStatusEvent(snapshot)` -> first matching real-status replacement |
| member-input outer `execution_address` plus payload `recipient_address` alias | one outer recipient `execution_address`; payload retains only distinct sender/content facts |
| task event aliases, arbitrary DTO index signatures, permissive browser parse, and unproduced terminal task event | one exact current task-event union plus strict shared runtime schema |
| frontend-only Team approval token type/map/payload/casts with no server producer or consumer | required invocation ID + exact execution address; address-only UI tracker |
| derived Agent `INTER_AGENT_MESSAGE`/`TEAM_COMMUNICATION_MESSAGE` in the Team event path | canonical Team `COMMUNICATION` + `MEMBER_INPUT` only; standalone Agent stream remains independent |
| repeated `CONNECTED.team_id`/`team_run_id` and `TEAM_RUN_LIFECYCLE.team_run_id` | endpoint-bound Team stream scope + exact post-binding readiness/lifecycle facts only |
| mutable topology nodes containing task state, presentation, Agent contexts, or empty run IDs | immutable task-free topology + valid concrete `TeamExecution` union |
| `ApplicationExecutionContext.producer.executionAddress` retained on frontend topology or copied unchanged into task Agents | typed application context owned/rebound by the exact concrete Agent execution |
| server-redeclared / browser `Record<string,unknown>` application execution contexts | one V5 SDK-owned exact type plus canonical-address-aware server/frontend boundary mapping |
| public `agentExecutionsByKey`, public `memberNodesByAddress`, serialized-key consumers, and direct key parsing | private execution/topology indexes behind `TeamExecutionState` / `TeamTopologySnapshot` typed queries |
| task topology cloning and the six fragmented task tree/projection/router/restore modules | one `TeamExecutionState` lifecycle owner with bounded pure transition/projection concerns |
| temporary draft TeamRun/AgentRun/conversation IDs and identity rebasing | identity-free `TeamLaunchDraft` -> success-only canonical execution-context construction |
| dormant route-key status-egress branches and three unused route-key result helpers | canonical execution-address status/result paths only |

## 16. Forbidden Shortcuts

1. Do not persist separate topology, launch-profile, or persistent-binding tables beside the rooted tree.
2. Do not retain `recipient_name`, `recipient_path`, or name/path/route fields as deprecated current DTO extras.
3. Do not call an old slashless/local route an address.
4. Do not infer coordinator from first Agent, naming convention, or representative fallback.
5. Do not copy/localize a persistent child tree or prefix/strip addresses in events.
6. Do not match globally by basename.
7. Do not expose full node/config/run objects through the shared recipient resolver.
8. Do not use `memberAddress` alone as a concrete task-execution key.
9. Do not move run-ID-owned memory directories to logical address directories.
10. Do not let normal readers import migration decoders or accept old schema versions.
11. Do not rewrite opaque provider history or route from it.
12. Do not hoist/discard `workspaceRootPath` based only on the primary UI; preserve current per-Agent values until a separate evidence-backed invariant permits contraction.
13. Do not persist `HandoffInstruction` rows or replace the authored `{from,to,rules}` graph with the LLM projection.
14. Do not keep `get_handoff_rules` package-gated while instructing every Team Agent that it must call the tool.
15. Do not change backend-definition/frontend SDK identity shapes under V4 or accept/translate V4 bundles.
16. Do not mechanically rename unchanged application manifest, backend bundle, or iframe protocol versions to V5.
17. Do not create any application database migration inventory; recreate project-owned application fixtures/databases directly from the current schema.
18. Do not hand-edit only one source/generated/vendor/importable application copy; regenerate and prove consistency.
19. Do not treat historical display `memberName` as structural identity, require it to equal a route basename, or use it as a missing-route fallback.
20. Do not change conversion logic only under already-terminal `20260517_team_run_metadata_member_tree` and assume startup will rerun it.
21. Do not add a third canonical TeamRun migration ID while separately pending `20260801_team_canonical_identity` remains the target owner.
22. Do not duplicate flat interpretation in two converters or require a post-listen manual migration API to recover a terminal-warning residual item; reuse the one migration-only decoder inside `20260801`.
23. Do not keep, reset, or revise `20260703_token_usage_execution_address_backfill` as the target token converter; remove its definition from the current registry and leave its durable record untouched.
24. Do not add a token-specific migration ID or second startup gate while pending `20260801...` can own the canonical token item and existing exact gate.
25. Do not expose or loop over independently committing token row updates. Plan all rows first and give one immutable batch to the transaction-owning migration store.
26. Do not mark any token row `MIGRATED` before the batch commits; transaction failure must roll back all rows and report zero migrated.
27. Do not retain independent current token column-cleanup migrations, leave redundant Team identity columns after address conversion, commit schema cleanup separately, or let a physical Prisma migration drop predecessor inputs before planning; the one `20260801...` token transaction owns row conversion, column/index replacement, and verification.
28. Do not keep an uncorrelated discriminator/data event pair, `unknown` task payload, generic Team wire payload, mapper cast, or partially validated browser message.
29. Do not publish the same member-input recipient both outside and inside the payload, and do not retain snake/camel or route/address compatibility aliases in current DTOs.
30. Do not allow Team stream JSON to enter frontend mutation before the complete strict current message validates, and do not repeat the endpoint-bound root TeamRun identity in connection/lifecycle control payloads.
31. Do not clone immutable topology to represent task execution or materialize any task execution with an empty TeamRun/AgentRun ID.
32. Do not expose the execution index, internal concrete union record, serialized execution key, or key parser to components, stores, navigation, hydration, focus, or history consumers; expose subject-specific immutable views/query results only.
33. Do not let separate live-event, GraphQL hydration, focus, presentation, and terminal-cleanup owners mutate the same execution lifecycle.
34. Do not let `TeamExecutionState` fetch GraphQL data or mutate the navigation store; typed records enter, navigation derives from committed state, and only true external-work effects leave.
35. Do not keep dormant route-key status branches, unused route-key result helpers, task aliases, or broad source-scan exemptions after the clean cut.
36. Do not treat a Team draft as a TeamRun, manufacture draft execution/conversation identities, or rebase provisional keys after launch; construct the real context only after canonical server allocation.
37. Do not place the frontend execution aggregate under the streaming transport or let it import WebSocket code; `services/teamExecution/` is the capability owner and streaming is one typed input adapter.
38. Do not retain `ApplicationExecutionContext.producer.executionAddress` in frontend topology, copy a persistent producer address into a server/frontend task Agent, or repair producer identity in a later artifact/event/browser consumer; the concrete Agent execution owns and validates/rebinds it at construction.
39. Do not copy Agent-local status/conversation/tool state or Agent run identity into a sibling execution-record field; associate the one AgentContext, and keep connection readiness/unsubscribe in transport session ownership.
40. Do not reconcile a partial task-record list, create a partial task projection from a result event, retain duplicate task-status publication, store task state/history twice, delete a terminal task-Team subtree with an absent/stale/nonterminal materialized descendant, or infer absence as cleanup; only one fully validated monotonic complete-root candidate can retain the single task projections and then remove execution state.
41. Do not let a prepared task runtime execute work or publish child events before its durable activation parent; use the short activation sequencer, closed work gate, and bounded TeamRun publication barrier defined by the stream/execution supplement.
42. Do not manufacture a TeamRun event for initial connection/open/restore status, retain generic Team status `ServerMessage`, or let initial/history/overlay code classify a second execution binding.
43. Do not let pre-run status own display/runtime/TeamRun/task-instance identity or clear by logical address alone; pass the runtime/config owner's exact binding, store details by full execution address, and replace only on matching correlated live status.
44. Do not put provider segment lifecycle state in TeamRun, processors/listeners, Team adapters, application projectors, WebSocket sessions, or browser transport. Consumer-specific file/transcript/output state may retain only its own projection facts from exact canonical identity.
45. `AgentRunErrorEvidence` alone classifies the real `TURN_DIAGNOSTIC`, `TURN_TERMINAL`, and `RUNTIME_GLOBAL` semantics. Provider ingress rejects missing/empty/inactive/conflicting turn identity before AgentRun; no consumer borrows a turn, constructs runtime/diagnostic, or terminalizes for `TURN_DIAGNOSTIC`.

## 17. Verification Seams

### 17.1 Address/tree domain

- identical `recipient_address` schema/parser coverage for message and task, including rejection of `recipient_name` and `recipient_path`;
- strict root/absolute parse and derivation tests;
- three-level compile with same-named leaves and reusable Team mounted twice;
- root/child kind-specific schema rejection;
- exact coordinator direct-child validation;
- no parallel identity source inventory.

### 17.2 Runtime

- root launch and exact node/run lookup;
- persistent child materialization/restoration using the same root tree object/model;
- task AgentTeam materialization with fresh run IDs but unchanged absolute addresses;
- nested task Team chain;
- shared message/task recipient deep equality;
- direct task eligibility and cross-branch rejection;
- exact-run route/code parity;
- event/command address round trip;
- intrinsic Team tool exposure and canonical-name de-duplication for AutoByteus/Codex/Claude;
- filesystem-like prompt parity with caller address, examples, coordinator behavior, and completion/blocked requirement;
- exact caller filtering, edge/rule order flattening, multi-rule duplicate destination rows, exact empty result, and absence of envelope/source fields;
- unchanged `send_message_to` delivery envelope and exact-run codes;
- real Agent, task, communication, and member-input producer -> correlated domain event -> exhaustive server mapper -> exact serializer -> strict browser parser -> typed aggregate consumer seams;
- real Team connection/open/restore -> mixed persistent/task/task-Team status enumeration -> one binding/status snapshot -> direct shared status projector -> exact serializer/parser -> same AgentContext status transition, with genuine task-Team AgentRun ID once and no TeamRun event/generic mapper;
- real send/delegation to unmaterialized persistent/task/task-Team Agents -> details-only overlay -> correlated status constructor -> exact wire/browser status -> first matching real status replacement, including task activation-order preservation and same-logical-address isolation;
- the three nonduplicated task-event variants retain only their distinct activation/submission/review facts with no `unknown`, casts, aliases, arbitrary fields, duplicate status event, or unproduced terminal event;
- malformed or semantically mismatched Team messages fail before any frontend state mutation.
- real native/provider `START(type) -> CONTENT(no type) -> END(no type)` crosses the AgentRun queue/first transformer and complete file/memory/output fan-out before Team bridge; Team content carries derived type/turn; active repeated start is swallowed; file end reads no type and cannot lose accumulated content;
- provider-native missing/empty/inactive/conflicting turn candidates produce zero AgentRun/Team/standalone/browser events plus one sanitized internal record; a separate exact-turn lifecycle violation crosses Team/standalone wire/browser as `TURN_DIAGNOSTIC` while preserving status/message/segment/tool/application/external/command/output state; runtime/diagnostic rejects and terminal/unclassified behavior remains;
- standalone and Team application text projection agree over canonical content, late browser subscription creates only from required type, equal deltas are retained, and replay/turn/run cleanup follows the segment supplement with no second lifecycle map;

### 17.3 Migration/storage

- representative current metadata copies all genuine Agent fields and typed IDs into v3;
- maintained real historical flat fixture proves `Program Manager`/`program_manager` and `QA Specialist`/`qa_specialist` convert through both ordered IDs to v3;
- fresh flat path proves direct-Agent/one-segment structural validation, display-name preservation into the predecessor, staged successor validation, and canonical success;
- recorded-predecessor chain seeds `20260517_team_run_metadata_member_tree` as both `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`, proves it is skipped, and proves separately pending `20260801_team_canonical_identity` converts both a display-name/route-divergent memberTree and a residual/repaired safe flat file through the same decoder;
- missing, nested, ambiguous, duplicate, or contradictory structural route/path, coordinator, and Team-ID failures; explicitly prove display-name/route difference is accepted;
- backup immediately before same-directory atomic replacement, successful backup contents, idempotent v3 skip, partial rerun, and required startup block/open behavior;
- unsafe fresh flat and unsafe predecessor fixtures preserve source metadata bytes exactly and create no replacement before validation succeeds;
- a failed canonical aggregate followed by source repair and normal startup rerun proves current items remain unchanged while repaired predecessor/residual-flat items finish without prerequisite rerun or a listening API;
- communication/task/released-external conversion, plus explicit proof that application databases are discarded/rebuilt and never enter the migration inventory;
- token predecessor chain with `20260703...` preseeded as `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`: old status/attempts unchanged, current definition absent, pending `20260801...` performs exact direct/task-Agent/task-AgentTeam/nested-task-Team conversion;
- plan failure for missing/duplicate/conflicting/unreadable task mappings and irreconcilable rows proves the batch store is never called and database rows remain unchanged;
- real Prisma/SQLite transaction proof forces a second update or read-back failure, proves the first update rolls back, asserts `migratedCount=0`, and keeps `20260801...` non-success/startup closed;
- repair/retry commits once; crash-after-commit/before-record-complete and exact-current reruns produce no duplicate update batch;
- token cleanup prerequisites require exact `20260801...` success, and the server starts once when canonical succeeds alongside an unrelated warning but blocks on canonical missing/failed/warning status;
- derived rebuild;
- byte/path preservation for memory and final context files.

### 17.4 Interfaces/frontend

- generated GraphQL/REST/WebSocket/SDK contract checks;
- non-current application/backend SDK declaration rejected by ordinary exact validation and exact V5 accepted at catalog/import/open boundaries;
- V5-declared manifest with a non-current exported definition rejected before hooks/handlers;
- package consistency across SDK source/dist, both project applications' source/build/vendor/dist/importable outputs;
- canonical application launch/binding/member target/runtime input/producer event/frontend validation round trip with no route/path field;
- fresh current-schema project application databases launch correctly, and production/migration source contains no application predecessor decoder, database migration item, compatibility adapter, special quarantine/upgrade branch, dual reader, or fallback;
- production desktop/mobile three-level hydration/focus/message/task/approval/history/memory/restore;
- same-address persistent/task collision coverage;
- immutable topology remains unchanged through task Agent, task Team, nested task Team, live updates, restore, and terminal cleanup;
- the metadata projection builder is all-or-nothing, produces exactly one persistent execution per metadata node, repeats no run binding in topology/context, derives the root Team ID from its execution address, and retains exactly one child binding only on each non-root persistent Team;
- `TeamExecutionState` materializes only valid concrete discriminated variants with real run IDs, copies no Agent-local state/run ID, and owns live/restore/focus/task-presentation/terminal convergence; the workspace store independently owns selected-root TeamRun state and transport owns every subscription;
- the task-record mapper accepts only a complete expected-root response and rejects all on one invalid row; staged reconciliation enforces unique/immutable/monotonic task facts, preserves newer known rows against stale or concurrent omission, and terminal task-Team cleanup retains the single descendant projections or rejects when a materialized descendant is absent/stale/nonterminal;
- task activation reaches the real browser aggregate before held initialization/child events and before work execution; start/persist/count/byte failure emits nothing and removes the fresh runtime/ledger/directory state;
- `TeamLaunchDraft` contains no run/execution/conversation identity; successful launch constructs one canonical context and transfers focus/input once, while failure preserves the draft unchanged;
- selected history rows are current only when both the selected root TeamRun and exact focused execution match;
- components/stores/services consume typed execution addresses and typed read models without public map access or serialized-key parsing;
- exact removal proof for the six superseded task projection modules, copied task snapshots/separate mutable history/stored task labels, duplicate task-status event, task aliases, duplicate member-input recipient, derived Agent collaboration Team path, no-op Team approval-token shapes, dormant route-key status branches, unused route-key result helpers, empty-ID placeholders, and generic Team egress;
- exact removal proof for `team-leaf-agent-status-snapshot.ts`, `team-stream-agent-identity-payload.ts`, `team-member-command-start-status-events.ts`, redundant status snapshot prefix/pass-through symbols, and every duplicate Team/name/runtime/run/task status identity field;
- source allowlist proving old identity types are confined to migration/fixtures/unrelated storage/opaque payloads.

### 17.5 Imported three-runtime live proof

- use [nested-classroom-live-validation-contract.md](./nested-classroom-live-validation-contract.md) as the authoritative environment, fixture, model-matrix, assertion, evidence, and cleanup contract;
- import a test-owned staged copy of `nested-classroom-test` through the supported Agent-package boundary and create a fresh TeamRun for every runtime row;
- prove AutoByteus with `gpt-5.6-luna`, Codex App Server with `gpt-5.6-luna` plus medium reasoning, and Claude Agent SDK with an authenticated catalog-exposed Claude model;
- use isolated secret/application state, retain redacted evidence, and never convert an unavailable or skipped row into Pass; and
- do not edit the source agents package or add package tool configuration that masks the intrinsic Team-tool invariant.

## 18. Change Sequence

1. Freeze integrated behavior with focused characterization coverage and an exact legacy/current identity plus Team stream/frontend ownership inventory.
2. Replace both public recipient fields with `recipient_address`, define `RecipientAddressExpression`, cut all tool schemas/parsers/manifests/provider instructions together, reject aliases, and tighten `AgentTeamAddress` derivation tests.
3. Make Team collaboration tools intrinsic, replace `get_handoff_rules`' envelope with ordered `{when,recipient_address}` rows, and cut the provider-neutral filesystem-like completion instruction across all Team runtimes.
4. Add v3 Agent/AgentTeam node schemas and the derived `TeamRunTreeIndex`.
5. Refactor definition graph planning, coordinator resolution, handoff compilation, and launch ID assignment to emit the rooted node tree directly.
6. Change TeamRun metadata writer/current parser and root create.
7. Refactor persistent child/restored construction to share root metadata/index and select by absolute address.
8. Refactor task Agent/AgentTeam factories, contexts, active directories, activation results, work packets, settlement, status, and token inputs around root-TeamRun-scoped `taskId` plus `taskRun.address`; require `{rootTeamRunId,taskId}` at cross-root lookup boundaries; remove synthetic task instance IDs and copied owner/parent/run/timestamp identity objects while preserving fresh typed run IDs inside the execution address.
9. Carry `TeamExecutionAddress` through communication/task/event/token/WebSocket/frontend paths.
10. Correct one pure migration-only flat decoder to preserve independent display `memberName`, require structural routes without name fallback, and fully stage-validate. Keep `20260517` as its pending predecessor-write owner without altering recorded-ID lifecycle.
11. Implement `20260801` as the sole target canonical aggregate: direct TeamRun predecessor/residual-flat conversion, TeamRun/task readiness, composed token semantic migration, other canonical items, idempotence, item results, and one exact startup gate.
12. Remove the current `20260703_token_usage_execution_address_backfill` definition/import/registry entry without deleting/resetting historical records. Preserve the strict task index/planner as migration-local code under the canonical owner.
13. Attempt the pre-existing token model/provider backfills before canonical contraction and make the provider-name migration-local database use dynamic whole-row preservation that names no unrelated legacy identity/display field. Replace the per-row token database API and both narrow current cleanup definitions with `TokenUsageCanonicalIdentityMigrationStore.applyCanonicalTeamIdentityTransaction`; in one Prisma/SQLite transaction perform stable-order exact-address updates, remove every obsolete Team identity column/old root index, create `token_usage_ledger_events_execution_root_observed_at_idx`, verify rows/schema/indexes, report truthful rollback, and support idempotent post-commit record recovery. Do not add a pre-conversion physical Prisma drop migration.
14. Cut current token domain/persistence to `execution_address_json` plus genuine Agent `run_id`, task-operation `task_id`, and non-identity usage/presentation facts; remove duplicate Team root/member/task-run/instance fields and query root scope through raw `json_extract` SQL and the named expression index. Prove fresh/predecessor registry order, data+schema rollback, query plan, and the one exact pre-listen gate, including unrelated-warning non-blocking behavior.
15. Cut current history/task/external/application repositories to target-only schemas.
16. Define exact backend-definition/frontend-SDK V5 constants and canonical application identity types, including the one shared `ApplicationExecutionContext`; make the server model an alias and replace server/browser object-only casts with exact canonical-address-aware mapping; cut application GraphQL/SDK/integration consumers.
17. Cut application/backend manifest parsers, package validation, catalog construction, and backend definition loader directly to exact V5; update both project application sources/build scripts, regenerate every dist/vendor/importable artifact, and recreate project application database fixtures from the current schema as one checkpoint. Do not add an application migration or version-specific compatibility/quarantine workflow.
18. At the existing `MixedAgentMemberHandle` AgentRun-construction boundary, validate persistent application producer identity and rebind task/task-Team-Agent producer identity before `AgentRunConfig`; prove persistent/task published-artifact and application-stream attribution at source.
19. Add the browser-safe `@autobyteus/team-stream-contracts` package with exact strict Zod schemas, inferred DTOs, serializer/parser entrypoints, and zero domain/frontend-state dependencies.
20. Add the sole `TeamAgentExecutionBinding` classifier and exact `TeamAgentStatusSnapshot`; cut mixed persistent/task/task-Team handles, config-backed offline enumeration, `MemberCommandStatusOverlayStore`, and run-history status projection to those values. Add the exhaustive standalone-Agent -> correlated-Team-Agent ingress adapter, filter derived Agent collaboration duplicates, replace `TeamRunEvent` and task events with correlated domain unions, change every real producer to construct exactly one valid variant, and remove the unproduced task-terminal/no-op Team approval-token shapes.
21. Make the Team WebSocket mapper exhaustive over correlated domain variants and export one exact Agent-status projector shared by live status and direct initial snapshots. Return only the exact Team wire union, remove generic Team payload serialization/casts, make broadcaster/egress/snapshot service Team-specific, emit `CONNECTED {session_id}` only after successful TeamRun binding, directly project initial persistent/task/task-Team statuses without a TeamRun event, and emit bound-root lifecycle without a repeated TeamRun ID. Pre-run initializing/error publishes through `createTeamAgentStatusEvent(snapshot)` and clears on the first matching real status.
22. Make the browser Team parser validate the complete strict union before dispatch; make the exact `CONNECTED` handshake own application readiness rather than low-level socket open; delete DTO aliases, arbitrary index signatures, duplicate member-input recipient identity, redundant control-message TeamRun IDs, and request-time normalizers.
23. Split pre-launch draft, immutable rooted topology, and concrete execution. Introduce identity-free `TeamLaunchDraft`, run-ID/execution-address-free `TeamTopologySnapshot` with a private logical-address index, one `TeamRunFrontendProjectionBuilder`, and the `services/teamExecution/` capability with a private execution-address index plus five valid concrete variants; after real server allocation, assemble one closed canonical metadata + exact lifecycle/focus + discriminated per-Agent-seed input and atomically project it into paired topology/persistent execution, move each persisted application producer context to its concrete Agent execution and rebind task variants, derive root/task Team IDs from execution addresses, retain only child persistent Team bindings, then move live events, GraphQL record reconciliation, root lifecycle, later hydration, task lifecycle, focus, presentation, and terminal cleanup behind the execution boundary.
24. Migrate frontend components/stores/services to typed aggregate commands/queries/read models. Preserve GraphQL/task storage and navigation as separate owners connected only by typed records, derived views, and true external-work effects.
25. Remove the six superseded task tree/projection/router/restore modules, legacy leaf-status snapshot/generic initial-status mapper/generic command-start event builder/redundant snapshot bridge, public map/key parsing, topology task state, empty/provisional IDs and rebase code, dormant route-key status branches, unused route-key result helpers, and every current alias. Enforce the exact-path current-source allowlist.
26. Refactor memory/context locators without moving files.
27. Add the run-owned segment lifecycle/error evidence as the first AgentRun transformer; cut provider source to explicit starts/minimal later facts and every file/lifecycle/memory/compaction/skill/external/application/Team/standalone/browser consumer to canonical input; remove defaults/end recovery/evidence loss/parallel state/fabricated fixtures and prove DS-017A–G.
28. Run implementation checks; complete source review must include application-producer construction, real provider-to-complete-consumer segment/diagnostic seams, strict invalid-input no-mutation, immutable topology/execution convergence, all migration/application/storage/provider proofs, and removal/allowlist scans.
29. Resume API/E2E only after full source Pass and API-owned CR-F-043 cleanup/protected-target audit; run focused/affected/deterministic coverage and the imported nested-classroom live matrix under its isolated contract, then reconcile durable docs.

No accepted checkpoint may contain dual current runtime behavior. Historical types remain only inside migration input packages/fixtures under the exact allowlist. Provider-source and canonical segment shapes are two stages of one current pipeline, not compatibility variants. API/E2E remains paused until SR-023 architecture review, implementation, and full cumulative source review pass.

## 19. Tradeoffs And Risks

- **Document locality vs normalized tables:** locality wins for root metadata because it is one JSON aggregate restored atomically; runtime derives narrow indexes without persisting joins.
- **Per-Agent workspace repetition vs speculative contraction:** preserve current genuine stored values now; equality may be investigated separately.
- **Immutable topology vs concrete execution graph:** task Team is a distinct execution and needs fresh IDs, but cloning logical topology creates mixed authority. The target keeps the rooted structure immutable and materializes only valid concrete execution variants in one lifecycle owner.
- **Blocking migration vs availability:** current code must not run over partially converted routing identity; fresh/already-terminal TeamRun and token histories must reach exact current identity before startup opens.
- **One canonical record vs token-specific record:** composing token semantics into pending `20260801...` is simpler and truthful because it already owns cross-store canonical readiness and the exact gate; database transaction mechanics remain encapsulated by the token migration store.
- **Large cut vs compatibility:** project-owned interfaces ship together to avoid permanent adapters.
Main risks are missed identity/event/status/segment consumers, a non-exhaustive domain-to-wire branch, segment lifecycle cached on the pipeline or placed after a processor, file end/replay still depending on type/reset, memory/output fallbacks surviving, the removed runtime-diagnostic branch surviving or a provider-invalid turn leaking past ingress, snapshot pre-cleanup rejecting final content, provider/browser defaults surviving, or any previously recorded identity/migration/frontend/application risk. Mitigations are DS-017A–G complete provider-turn/consumer/diagnostic proofs, the original error-evidence authority, exact required wire fields, correlated unions, one Team binding/status set, exact source/removal scans, and all previously accepted migration/application/storage/frontend proofs.

## 20. Guidance For Implementation

- Treat this supplement's target node shapes and spines as normative.
- Use `recipient_address` consistently for both recipient-oriented operations; use `RecipientAddressExpression` only before resolution and `AgentTeamAddress` afterward.
- Preserve current genuine Agent metadata fields with their existing meanings; do not invent profile/binding wrappers without a behavior-owned need.
- Make illegal Agent-vs-AgentTeam fields unrepresentable with a discriminated union.
- Persist each logical address and concrete run ID once under its rightful node.
- Keep shared recipient results minimal and identical for message/task.
- Build target validators before migration converters: source validate -> target construct -> target validate -> atomic replace.
- Treat predecessor `memberName` as display-only. Never compare it with or derive a route from it; derive migrated addresses only after normalized `memberRouteKey` and `memberPath` agree.
- Never repair contradictory structural route/path data by selecting one old field.
- Keep one TeamRun flat decoder, `20260517` as its stable pending memberTree-write owner, and `20260801` as the separately pending target canonical owner; prove fresh-flat, terminal-predecessor, and terminal-warning residual-flat histories rather than adding a third TeamRun ID or recovery API dependency.
- Treat 10.18–10.21 as normative: order pre-existing token backfills before contraction; remove the `20260703...` and both narrow cleanup definitions while preserving historical records; compose strict token planning, row/schema/index transaction, and verification into `20260801...`; keep one exact gate.
- Build every token plan before mutation. On index/row failure, do not call the store. On transaction failure, report zero migrated and prove all earlier writes rolled back. Do not expose per-row commit or current-reader legacy branches.
- Prove persistent children share the root tree and task children preserve absolute addresses.
- Use one canonical `TeamExecutionAddress` serializer for stable wire/map keys.
- Preserve content, settings, task lifecycle, usage, exact codes, raw history, and physical storage under their owners.
- Keep changes separate from delivery-owned dirty documentation/finalization files in this worktree.
- Treat the 10.9–10.13 application data-flow spines as normative for direct V5 artifact production, ordinary exact target validation, exact V5 launch, fresh database rebuild, and consistency/no-migration proof.
- Keep V5 semantic constants/types in `@autobyteus/application-sdk-contracts`; reuse ordinary parser/loader owners and add no compatibility, special quarantine/upgrade, or negotiation facade.
- Reject non-current application input before execution through exact target validation; never adapt, migrate, or edit external bundles.
- Do not inventory or migrate predecessor application platform databases. Recreate only project-owned application fixtures/databases from the current schema.
- Regenerate all project SDK/application artifacts and prove source/dist/vendor/importable/fresh-database consistency plus absence of application migration/fallback code.
- Treat 10.14–10.17 as normative for fresh flat, terminal predecessor, unsafe rejection, retry, idempotence, byte stability, and startup gating.
- Treat [team-stream-execution-projection-contract.md](./team-stream-execution-projection-contract.md) as normative for every Team event/wire/frontend path. Use the package-owned strict Zod schema, construct correlated domain variants at producers, map exhaustively, mark Team application readiness only after exact post-binding `CONNECTED`, and mutate frontend state only after complete parsing.
- Treat [agent-segment-lifecycle-contract.md](./agent-segment-lifecycle-contract.md) as normative before every processor/listener. Providers emit explicit starts/minimal later facts; `AgentRun` alone correlates/classifies; file/memory/output consumers use exact canonical identity; Team/application/browser projections are strict; no guessed identity/type/end text, evidence loss, content dedupe, reorder buffer, or fabricated source type is allowed.
- Construct every Team Agent binding through `createTeamAgentExecutionBinding({executionAddress,agentRunId})`. Use the exact status-details/snapshot value for live events, config-backed/materialized connection snapshots, pre-run overlays, and run-history projection; do not declare another binding or status payload type.
- Project initial status directly through the same exact Agent-status projector as live status, with no TeamRun event or generic Team message. Give the pre-run overlay an already-constructed binding, store details only, publish through `createTeamAgentStatusEvent(snapshot)`, and replace it only on a matching typed live status.
- Keep `TeamExecutionState` as the sole concrete execution lifecycle owner. Do not leak its map/keys, clone topology, create empty-ID nodes, or let GraphQL/navigation concerns bypass it; pass typed records in, derive read models, and return only true external-work effects. Keep application producer execution context on concrete Agent records and rebind task variants to their exact addresses.
- Enforce the same producer rule before server AgentRun construction: persistent addresses must match; task/task-Team-Agent addresses are rebound once; artifact/event/browser consumers never repair them.
- Keep `TeamLaunchDraft` outside execution identity. It may carry config/logical focus/pending input only; launch success builds the real context and transfers once, while launch failure preserves the draft. Delete temporary run/conversation identity and rebase code.
- Delete every superseded module/alias/route-key helper named in the exact removal inventory and make the current-source allowlist an executable review seam.
- Treat [nested-classroom-live-validation-contract.md](./nested-classroom-live-validation-contract.md) as normative for the downstream live matrix; do not run provider tests during solution design.
- The user-approved target basis remains authoritative. ARCH-REV-018 passed SR-024 and resolves DR-001–DR-012 across the complete rooted/migration/application/Team-status/frontend/segment-lifecycle structure. SR-026 reopens only the separate AgentRun input-admission boundary through CRR-086/API-F-025; the complete cumulative SR-026 architecture must pass before implementation resumes.

## 21. Scope Boundaries

In scope: AutoByteus server definition mounting, TeamRun metadata/execution/restore, collaboration/task addressing, task runtime identity, correlated Team domain events, exact strict Team WebSocket contract, immutable frontend topology, concrete execution lifecycle/projection, communication/token/history, released-data migration, project APIs/SDKs/integrations, direct exact application SDK V5 project artifact/fresh-database rebuild, production web, memory/context selectors, and downstream imported nested-classroom live validation across all three runtimes.

Out of scope: native AgentOrg, live Team topology mutation, handoff ACL evaluation, external repository-owned package edits or automatic V4 bundle upgrade, distributed/inactive inbox messaging, opaque provider-history rewriting, physical memory relocation, and mixed-version compatibility.

## SR-026 AgentRun Input-Admission Linkage

`AgentTeamAddress` and `TeamExecutionAddress` remain the complete logical/concrete identity authorities. Resolution produces the same exact AgentRun as before; no queue sequence, provider turn choice, or command identity enters either address. After resolution, `AgentRun.postUserMessage()` owns live admission through the non-persisted contract in [agent-run-input-admission-contract.md](./agent-run-input-admission-contract.md). The rooted TeamRun aggregate, task record, communication/event identity, token schema, and migration inventory gain no field and require no transition.

The required dependency is one-way: Team/global/application/external execution resolvers call AgentRun; AgentRun may read its canonical turn lifecycle and call an explicit provider input adapter; providers cannot import or reinterpret Team identity. This preserves the target's one-address rule while closing active-input behavior without a route fallback, provider-specific Team path, or durable inbox.
