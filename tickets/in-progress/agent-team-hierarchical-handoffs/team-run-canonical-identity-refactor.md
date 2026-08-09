# TeamRun Canonical Identity Refactor

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/team-run-canonical-identity-refactor.md`
- Type: Intended-behavior and data-model supplement
- Scope: SR-015 comprehensive TeamRun address, recipient/handoff-tool, execution-tree, persistence, token migration ownership/atomicity, application SDK V5 admission, API/frontend, and live-validation refactor
- Status: `Refined — SR-015 ready for architecture re-review of CR-F-013/CR-F-014`
- Approval applicability: This supplement defines intended behavior. The user approved the rooted target model, recipient/handoff protocol, V5 application boundary, and SR-011 live-validation contract. SR-013 corrected TeamRun predecessor interpretation/sequencing and passed complete ARCH-REV-008. SR-015 responds to CRR-025 Design Impact without changing approved product behavior: the already pending/exact-gated `20260801...` aggregate owns target token conversion, while one migration-local store owns its all-or-nothing database transaction.
- Related requirements: R-011 through R-013, R-021, R-026, R-028 through R-043, and R-047
- Related acceptance criteria: AC-012, AC-013, AC-019, AC-023 through AC-039, and AC-043
- Supersession rule: SR-010 retains SR-008's rooted TeamRun model and SR-009's `recipient_address` naming. SR-008 superseded SR-007's persisted `MountedTeamTopology` + `TeamAgentLaunchProfile` + `TeamRunBindingSet` normalization; SR-009 made public recipient-oriented tools use `recipient_address`, with request-only `RecipientAddressExpression` resolving to `AgentTeamAddress`. SR-010 changes only the LLM-facing handoff seam: Team runtime intrinsically exposes the collaboration tools and filesystem-like completion instruction, and `get_handoff_rules` projects compiled edges to ordered `{when,recipient_address}` rows without a generic success envelope. SR-011 adds required live verification. SR-012 adds exact backend-definition/frontend-SDK V5 admission, project artifact sequencing, old-bundle rejection, and catalog-independent application DB migration. SR-013 corrects the supported TeamRun predecessor conversion: historical `memberName` is display-only, route/path fields are structural, one migration-only decoder owns flat interpretation, and the separately pending canonical migration owns final v3 conversion whether the stable prerequisite runs now, already produced a predecessor tree, or is terminal-with-warning while a repaired flat item remains. SR-015 additionally assigns token semantic conversion to that pending canonical aggregate, retires the terminal historical token ID from current registry authority, and gives one migration store the transactional batch. The comprehensive target runtime model, API/frontend cutover, physical-storage preservation, authored handoff schema, direct-current-Team task eligibility, send delivery envelope, and exact-run behavior remain unchanged.

## 1. Decision Summary

The existing `team_run_metadata.json` is already the durable execution snapshot for one root TeamRun and its complete recursive AgentTeam. Its recursive locality is useful: an operator can inspect one Agent member and immediately see its definition, launch settings, concrete AgentRun ID, and platform run ID. The defect is not that those facts are colocated. The defect is that one logical placement is persisted simultaneously as `memberName`, `memberPath`, and `memberRouteKey`; Team run identity is stored as both generic and Team-specific IDs; the root Team has a different shape from nested Teams; and child execution localizes the same logical identity into alternate route forms.

SR-015 therefore keeps SR-008's one self-contained rooted TeamRun tree on disk, SR-009's public recipient boundary, SR-010's completion-time handoff guidance, SR-011's three-runtime proof, SR-012's exact V5 application SDK boundary, and SR-013's TeamRun predecessor correction. It additionally makes the supported token predecessor reach that target atomically:

1. one canonical `AgentTeamAddress` per Agent or AgentTeam node;
2. one uniform root AgentTeam node at `/` with its concrete `teamRunId`;
3. one kind-specific `agentRunId` or `teamRunId` per node;
4. one configured `coordinatorAddress` per AgentTeam node;
5. `children` for recursive containment;
6. existing genuine Agent definition, runtime, model, tool, skill, workspace-root, application-context, platform-run, role, and description facts retained locally on the Agent node; and
7. compiled `handoffs` retained once outside the tree because they are edges between nodes.
8. `recipient_address` on both recipient-oriented tools, parsed as a request-only `RecipientAddressExpression` and resolved to the same canonical node address; and
9. intrinsic Team-bound `get_handoff_rules`/`send_message_to` exposure plus a minimal `{when,recipient_address}` handoff projection over the compiled edge list; and
10. backend-definition/frontend-SDK V5 as the sole executable application semantic contract, with V4 rejected before execution and application DB migration independent of admission; and
11. two ordered TeamRun migration-record owners plus one shared decoder: stable `20260517_team_run_metadata_member_tree` writes pending flat-v1 input to predecessor form; separately pending `20260801_team_canonical_identity` owns final-v3 conversion and may compose the same migration-only flat decoder for residual input after a terminal-warning prerequisite record; and
12. the same pending `20260801...` canonical aggregate owns target token semantic conversion after TeamRun/task readiness, while historical `20260703_token_usage_execution_address_backfill` remains untouched/unregistered as current authority and one migration-local store commits or rolls back the entire token update batch.

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

```ts
type TaskAgentInstanceIdentity = Readonly<{
  taskAgentInstanceId: string;
  taskAgentRunId: string;
  owningTeamRunId: string;
  taskId: string;
  createdAt: string;
}>;

type TaskTeamInstanceIdentity = Readonly<{
  taskTeamInstanceId: string;
  taskTeamRunId: string;
  parentTeamRunId: string;
  taskId: string;
  createdAt: string;
}>;
```

The task record receiver `TeamExecutionAddress` owns the logical recipient. The root TeamRun tree owns definition/configuration/coordinator facts. The active task execution tree/directory owns fresh concrete descendant run IDs. Identities do not repeat member name/path/route, template run ID, definition ID, coordinator route, or launch fields.

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
  -> minimal TaskAgentInstanceIdentity
  -> task record/events/token usage use TeamExecutionAddress
```

### 10.6 Delegated task AgentTeam and nested task AgentTeam

```text
same recipient resolution/eligibility
  -> selected AgentTeam node supplies coordinatorAddress + source subtree
  -> allocate taskTeamRunId and fresh task execution tree run IDs
  -> preserve every absolute node address
  -> append taskTeamRunId to execution chain
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

### 10.10 Installed V4 bundle rejection

```text
package/catalog scan
  -> application manifest parser or backend manifest parser observes SDK V4
  -> actionable failure: location + field + observed V4 + required V5 + rebuild/reinstall action
  -> FileApplicationBundleProvider omits executable record and retains ApplicationCatalogDiagnostic
  -> availability becomes QUARANTINED / package import validation fails
  -> no UI asset open, worker start, lifecycle hook, handler, or V4 adapter
```

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

A V5-declared bundle exporting a V4 definition fails at the final loader gate and runs no hook or handler.

### 10.12 Application DB migration independent of bundle admission

```text
required startup migration
  -> physically enumerate applications/*/db/platform.sqlite
  -> recover application ID from DB metadata/tables or readable storage key
  -> convert/validate in store-owned transaction
  -> record one durable result per path
  -> includes V5, V4-quarantined, missing-bundle, and persisted-only applications
  -> any unreadable/failed required DB blocks bootstrap/listen
  -> all succeed before target catalog/services start
```

Application bundle code and application-owned migrations are never loaded to convert platform-owned identity.

### 10.13 Application compatibility verification

```text
V4 application-manifest fixture -> rejected before catalog execution
V4 backend-manifest fixture -> rejected before catalog execution
V5 manifests + V4 backend definition -> rejected before callable behavior
exact V5 fixture -> admitted and canonical launch/binding/target/event succeeds
old V4 bundle + existing platform DB -> code quarantined AND DB still migrated
project artifact inventory -> every source/dist/vendor/importable declaration is V5-consistent
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
  -> old token definition is absent from current registry
  -> pending 20260801 converts TeamRun/task files first
  -> canonical token item plans legacy/current rows from strict task records
  -> token migration store commits/verifies one transaction
  -> 20260801 exact success opens strict startup
```

No new token record or second startup gate is needed because `20260801...` is absent from the supported predecessor and already owns the cross-store target canonical result.

### 10.19 Token planning failure before mutation

```text
current TeamRun/task sources
  -> strict task-Team index finds unreadable/missing/duplicate/conflicting mapping
     OR row planner finds irreconcilable root/ordered chain/member/task-Agent identity
  -> actionable failure details
  -> applyCanonicalExecutionAddressBatch is never called
  -> zero token rows change
  -> 20260801 FAILED -> bootstrap/listen remain closed
```

### 10.20 Token transaction rollback

```text
all row plans valid -> immutable ordered update batch
  -> Prisma/SQLite transaction
  -> earlier row update succeeds inside transaction
  -> later update count/read-back verification/write fails
  -> rollback every row
  -> migratedCount=0 + database failure detail
  -> 20260801 FAILED -> bootstrap/listen remain closed
```

The durable proof uses the real SQLite/Prisma boundary and forces the later write failure; an in-memory fake alone does not prove database rollback.

### 10.21 Token repair, retry, and idempotence

```text
operator repairs source/transient database failure
  -> normal startup retries non-terminal 20260801
  -> already-current file/database subjects skip
  -> remaining token updates commit once
  -> exact-current rerun creates no update batch
  -> exact 20260801 success + unrelated warning -> one normal startup
```

A crash after the token transaction commits but before the migration record completes is recovered by the same idempotent retry; the historical record is never reset and current readers never accept `{segments}`.

## 11. Other Structured Stores

| Store | Target identity |
| --- | --- |
| Team communication projection | `senderAddress` and `receiverAddress` are `TeamExecutionAddress` |
| Task delegation record | caller/receiver/task-run locators are `TeamExecutionAddress`; task identities are minimal |
| Token usage ledger | JSON column stores exact `TeamExecutionAddress`; physical root column agrees; task Team run IDs/member address/task Agent run ID are fields of that one value, not parallel current columns |
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
| Application platform databases | `Migration Required`; discover physically independent of bundle admission |
| Derived history indexes/caches | `Discard or Rebuild` |
| Team definitions/handoffs | `Directly Usable — No Migration` |
| Agent memory directories | `Directly Usable — No Migration` |
| Context-file storage layout | `Directly Usable — No Migration` |
| Opaque provider raw trace/tool arguments | `Directly Usable — No Migration` |
| Installed application bundle code | `Compatibility Rejection — No Bundle Migration`; exact V5 admitted, V4 excluded/quarantined until independently upgraded |

### 12.2 Blocking migration

Reuse the ordered app-data migration capability with one stable TeamRun prerequisite and one independently pending target canonical aggregate:

1. stable `20260517_team_run_metadata_member_tree` owns pending flat-v1 `memberMetadata` to predecessor `memberTree` replacement; and
2. separately pending `20260801_team_canonical_identity` owns final rooted-v3 replacement plus the other target canonical identity items, including semantic token-row conversion after TeamRun/task readiness.

`AppDataMigrationRunner.runPending()` keeps its existing rule that `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` IDs are skipped. Therefore previously terminal `20260517...` and `20260703_token_usage_execution_address_backfill` records are not reset, rewritten, or expected to execute revised code. The old token definition is removed from the current registry; its record remains historical evidence. `20260801...` is absent from the supported predecessor database state, reads predecessor/residual TeamRun input, and reads legacy/current token rows through migration-only types. One pending canonical record is more coherent than adding a token version plus second gate because all these items answer the same rollout question: can strict current canonical identity start?

Registry dependency order is `20260517...` -> `20260801...` -> pending token legacy-column cleanup. Both cleanup definitions require exact canonical success rather than historical token status. A cleanup already terminal in supported predecessor history remains untouched. Physical Prisma schema migrations still run before app-data migration; they do not own semantic token identity.

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
  rootTeamRunId: string;
  executionAddressJson: string;
}>;

interface TokenUsageCanonicalExecutionAddressMigrationStore {
  listRows(): Promise<readonly RawTokenUsageCanonicalMigrationRow[]>;
  applyCanonicalExecutionAddressBatch(
    updates: readonly TokenUsageCanonicalExecutionAddressUpdate[],
  ): Promise<void>;
  disconnect?(): Promise<void>;
}
```

The orchestrator builds and validates every plan before calling `applyCanonicalExecutionAddressBatch`. The Prisma store then opens one transaction, updates in stable row-ID order, requires exactly one affected row per update, reads back/verifies every targeted `root_team_run_id` and canonical JSON value before commit, and throws on mismatch. Any write/verification failure rolls back the entire batch. No `updateTokenUsageLedgerRow` method remains. `MIGRATED` details are emitted only after commit; transaction failure reports zero migrated rows and one bounded actionable database failure. An empty update list is an idempotent success and does not open a mutation transaction.

The migration record completion is intentionally outside the token data transaction under the existing runner. If the process stops after data commit but before record completion, the next allowed stale/non-terminal retry sees exact-current rows, emits no updates, and safely completes `20260801...`.

### 12.5 Conversation/task/external/application conversion

- Decode legacy ordered task/member segment grammars by structural position and enclosing task record, not root/local string guessing.
- Produce exactly one `TeamExecutionAddress` and validate it against already-migrated root metadata plus task identity chain.
- Require stored external route/path pairs to agree before producing `targetMemberAddress`.
- Enumerate application platform databases through `ApplicationPlatformStateStore.listExistingPlatformDatabasePaths()` and recover application identity from physical storage metadata/known tables/readable storage keys without consulting the admitted catalog. An unreadable database identity is a path-specific required-item failure, not a skipped record.
- Back up application DB files and transform each in a transaction.
- Preserve genuine Agent settings, platform IDs, content, references, lifecycle, timestamps, token/cost facts, and presentation fields.
- Drop old identity columns/JSON fields after validated backfill in the same store-owned transaction.

### 12.6 Rollout

After all `20260801...` items—including the token transaction—are current, the one exact canonical gate opens; unrelated warnings do not affect it. Rebuild derived indexes/caches, then start strict current runtime and exact V5 application admission. GraphQL/REST/WebSocket, generated contracts, project SDKs, integrations, project application artifacts, and production web ship atomically. V4 application bundle code is rejected rather than migrated or adapted; its platform DB remains a separately discovered migration subject. There is no dual write/read, lazy conversion, legacy alias, or mixed-version negotiation.

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

The contracts package owns wire types only. Every `memberAddress` is a serialized validated domain `AgentTeamAddress`; its SDK `TeamExecutionAddress` mirrors `{rootTeamRunId,taskTeamRunIds,memberAddress,taskAgentRunId}` and has no independent parser/resolver. Server application orchestration owns domain-to-SDK mapping.

Exact admission sequence:

1. `parseApplicationManifest` requires frontend SDK V5.
2. `parseApplicationBackendManifest` requires backend definition V5 and frontend SDK V5.
3. `FileApplicationBundleProvider` excludes failures, reuses `ApplicationCatalogDiagnostic`, and package import/update validation rejects the same failure.
4. `ApplicationAvailabilityService` exposes the diagnosed application as `QUARANTINED` rather than active.
5. `ApplicationBackendDefinitionLoader` requires exported definition V5 before exposures, hooks, or handlers become callable.

Each incompatibility message contains the manifest/entry location, offending field, observed value, required `"5"`, and instruction to rebuild or reinstall with the current AutoByteus application SDKs. Existing diagnostic identity fields provide application/package/root context. No compatibility service, negotiation result, V4 adapter, or external bundle edit is added.

Project artifact sequence is atomic:

1. update contracts source and build its `dist`;
2. update/build backend and frontend SDK source/dist;
3. update `brief-studio` and `socratic-math-teacher` source `application.json`, `backend/bundle.json`, backend definitions, and build scripts;
4. rebuild application backend dist and UI vendor SDK copies;
5. regenerate `dist/importable-package` trees; and
6. compare all source/dist/vendor/importable declarations plus forbidden identity fields before accepting the checkpoint.

### 13.3 Frontend

```ts
type AgentTeamContext = {
  rootTeam: TeamRunAgentTeamProjection;
  memberNodesByAddress: Map<AgentTeamAddress, TeamRunNodeProjection>;
  agentExecutionsByKey: Map<string, AgentContext>;
  focusedExecutionAddress: TeamExecutionAddress;
};
```

The recursive projection preserves Agent-local definition/launch/run presentation data. The address map is a derived frontend index. Persistent and task Agent contexts use serialized `TeamExecutionAddress` keys so concurrent executions at one logical address do not collide. Display breadcrumbs derive from address. Old route-key deep links and synthetic task routes are removed rather than aliased.

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
| per-row `updateTokenUsageLedgerRow` migration API | one immutable `applyCanonicalExecutionAddressBatch` store transaction |
| token cleanup dependency on old backfill status | exact `20260801...` canonical success prerequisite |
| task logical name/path/route/template/coordinator bundles | minimal task identity + task receiver/execution tree |
| API/SDK/frontend route/path aliases and synthetic scoped routes | address/execution-address contracts |
| backend-definition/frontend-SDK V4 current exports/declarations/artifacts | exact V5 semantic contracts and regenerated project artifacts; V4 only in rejection fixtures |
| `get_handoff_rules` generic success envelope and `{from,to,rules}` model projection | intrinsic Team tool + `{handoffs:[{when,recipient_address}]}` |
| package-configured Team handoff tool prerequisite | Team runtime intrinsic capability composition |

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
17. Do not derive application database migration inventory from the executable catalog.
18. Do not hand-edit only one source/generated/vendor/importable application copy; regenerate and prove consistency.
19. Do not treat historical display `memberName` as structural identity, require it to equal a route basename, or use it as a missing-route fallback.
20. Do not change conversion logic only under already-terminal `20260517_team_run_metadata_member_tree` and assume startup will rerun it.
21. Do not add a third canonical TeamRun migration ID while separately pending `20260801_team_canonical_identity` remains the target owner.
22. Do not duplicate flat interpretation in two converters or require a post-listen manual migration API to recover a terminal-warning residual item; reuse the one migration-only decoder inside `20260801`.
23. Do not keep, reset, or revise `20260703_token_usage_execution_address_backfill` as the target token converter; remove its definition from the current registry and leave its durable record untouched.
24. Do not add a token-specific migration ID or second startup gate while pending `20260801...` can own the canonical token item and existing exact gate.
25. Do not expose or loop over independently committing token row updates. Plan all rows first and give one immutable batch to the transaction-owning migration store.
26. Do not mark any token row `MIGRATED` before the batch commits; transaction failure must roll back all rows and report zero migrated.
27. Do not let pending token legacy-column cleanup depend on the historical token record or run before exact `20260801...` success.

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
- unchanged `send_message_to` delivery envelope and exact-run codes.

### 17.3 Migration/storage

- representative current metadata copies all genuine Agent fields and typed IDs into v3;
- maintained real historical flat fixture proves `Program Manager`/`program_manager` and `QA Specialist`/`qa_specialist` convert through both ordered IDs to v3;
- fresh flat path proves direct-Agent/one-segment structural validation, display-name preservation into the predecessor, staged successor validation, and canonical success;
- recorded-predecessor chain seeds `20260517_team_run_metadata_member_tree` as both `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`, proves it is skipped, and proves separately pending `20260801_team_canonical_identity` converts both a display-name/route-divergent memberTree and a residual/repaired safe flat file through the same decoder;
- missing, nested, ambiguous, duplicate, or contradictory structural route/path, coordinator, and Team-ID failures; explicitly prove display-name/route difference is accepted;
- backup immediately before same-directory atomic replacement, successful backup contents, idempotent v3 skip, partial rerun, and required startup block/open behavior;
- unsafe fresh flat and unsafe predecessor fixtures preserve source metadata bytes exactly and create no replacement before validation succeeds;
- a failed canonical aggregate followed by source repair and normal startup rerun proves current items remain unchanged while repaired predecessor/residual-flat items finish without prerequisite rerun or a listening API;
- conversation/task/external/application conversion;
- token predecessor chain with `20260703...` preseeded as `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`: old status/attempts unchanged, current definition absent, pending `20260801...` performs exact direct/task-Agent/task-AgentTeam/nested-task-Team conversion;
- plan failure for missing/duplicate/conflicting/unreadable task mappings and irreconcilable rows proves the batch store is never called and database rows remain unchanged;
- real Prisma/SQLite transaction proof forces a second update or read-back failure, proves the first update rolls back, asserts `migratedCount=0`, and keeps `20260801...` non-success/startup closed;
- repair/retry commits once; crash-after-commit/before-record-complete and exact-current reruns produce no duplicate update batch;
- token cleanup prerequisites require exact `20260801...` success, and the server starts once when canonical succeeds alongside an unrelated warning but blocks on canonical missing/failed/warning status;
- derived rebuild;
- byte/path preservation for memory and final context files.

### 17.4 Interfaces/frontend

- generated GraphQL/REST/WebSocket/SDK contract checks;
- application/backend manifest V4-SDK rejection and exact V5 acceptance at catalog/import/open boundaries;
- V5-declared manifest with exported V4 definition rejected before hooks/handlers;
- package consistency across SDK source/dist, both project applications' source/build/vendor/dist/importable outputs;
- canonical application launch/binding/member target/runtime input/producer event/frontend validation round trip with no route/path field;
- V4-quarantined and persisted-only application platform DBs still physically discovered/migrated;
- production desktop/mobile three-level hydration/focus/message/task/approval/history/memory/restore;
- same-address persistent/task collision coverage;
- source allowlist proving old identity types are confined to migration/fixtures/unrelated storage/opaque payloads.

### 17.5 Imported three-runtime live proof

- use [nested-classroom-live-validation-contract.md](./nested-classroom-live-validation-contract.md) as the authoritative environment, fixture, model-matrix, assertion, evidence, and cleanup contract;
- import a test-owned staged copy of `nested-classroom-test` through the supported Agent-package boundary and create a fresh TeamRun for every runtime row;
- prove AutoByteus with `gpt-5.6-luna`, Codex App Server with `gpt-5.6-luna` plus medium reasoning, and Claude Agent SDK with an authenticated catalog-exposed Claude model;
- use isolated secret/application state, retain redacted evidence, and never convert an unavailable or skipped row into Pass; and
- do not edit the source agents package or add package tool configuration that masks the intrinsic Team-tool invariant.

## 18. Change Sequence

1. Freeze integrated SR-006 behavior with focused characterization coverage and a legacy identity inventory.
2. Replace both public recipient fields with `recipient_address`, define `RecipientAddressExpression`, cut all tool schemas/parsers/manifests/provider instructions together, reject aliases, and tighten `AgentTeamAddress` derivation tests.
3. Make Team collaboration tools intrinsic, replace `get_handoff_rules`' envelope with ordered `{when,recipient_address}` rows, and cut the provider-neutral filesystem-like completion instruction across all Team runtimes.
4. Add v3 Agent/AgentTeam node schemas and the derived `TeamRunTreeIndex`.
5. Refactor definition graph planning, coordinator resolution, handoff compilation, and launch ID assignment to emit the rooted node tree directly.
6. Change TeamRun metadata writer/current parser and root create.
7. Refactor persistent child/restored construction to share root metadata/index and select by absolute address.
8. Refactor task Agent/AgentTeam identity/factories and active directory to preserve absolute addresses and use fresh typed run IDs without logical bundles.
9. Carry `TeamExecutionAddress` through communication/task/event/token/WebSocket/frontend paths.
10. Correct one pure migration-only flat decoder to preserve independent display `memberName`, require structural routes without name fallback, and fully stage-validate. Keep `20260517` as its pending predecessor-write owner without altering recorded-ID lifecycle.
11. Implement `20260801` as the sole target canonical aggregate: direct TeamRun predecessor/residual-flat conversion, TeamRun/task readiness, composed token semantic migration, other canonical items, idempotence, item results, and one exact startup gate.
12. Remove the current `20260703_token_usage_execution_address_backfill` definition/import/registry entry without deleting/resetting historical records. Preserve the strict IR-014 index/planner as migration-local code under the canonical owner.
13. Replace the per-row token database API with `TokenUsageCanonicalExecutionAddressMigrationStore.applyCanonicalExecutionAddressBatch`; implement stable-order update, affected-count and read-back verification inside one Prisma/SQLite transaction, truthful rollback summary, and idempotent post-commit record recovery.
14. Retarget pending token legacy path/route cleanup to exact `20260801...` success; prove registry order and exact pre-listen gate, including unrelated-warning non-blocking behavior.
15. Cut current history/task/token/external/application repositories to target-only schemas.
16. Define exact backend-definition/frontend-SDK V5 constants and canonical application identity types; cut GraphQL/REST/WebSocket/SDK/integration consumers.
17. Cut application/backend manifest parsers, catalog diagnostics/quarantine, package validation, and backend definition loader to exact V5; update both project application sources/build scripts and regenerate every dist/vendor/importable artifact as one checkpoint.
18. Refactor production web to recursive `rootTeam`, derived address index, execution-address keys, and V5 application validators.
19. Refactor memory/context locators without moving files.
20. Delete legacy types/localizers/prefixers/mappers/aliases, current V4 SDK exports, and stale tests; enforce the source/rejection-fixture allowlist including the historical token ID.
21. Run implementation checks, TeamRun and token predecessor chains, token no-mutation/rollback/retry/idempotence, unsafe byte/row stability and exact startup gating, V4 rejection/V5 acceptance, package consistency, catalog-independent application DB migration, canonical application launch/binding/event, API/frontend/restore/storage, and focused/affected/deterministic E2E coverage.
22. Run the imported nested-classroom live matrix under the isolated SR-011 contract and retain three separately attributable redacted results.
23. Reconcile durable docs.

No accepted checkpoint may contain dual current runtime behavior. Historical types remain only inside migration input packages/fixtures under the allowlist.

## 19. Tradeoffs And Risks

- **Document locality vs normalized tables:** locality wins for root metadata because it is one JSON aggregate restored atomically; runtime derives narrow indexes without persisting joins.
- **Per-Agent workspace repetition vs speculative contraction:** preserve current genuine stored values now; equality may be investigated separately.
- **Task execution tree vs shared persistent IDs:** task Team is a distinct run and needs fresh IDs; its runtime tree preserves addresses and is not a logical identity authority.
- **Blocking migration vs availability:** current code must not run over partially converted routing identity; fresh/already-terminal TeamRun and token histories must reach exact current identity before startup opens.
- **One canonical record vs token-specific record:** composing token semantics into pending `20260801...` is simpler and truthful because it already owns cross-store canonical readiness and the exact gate; database transaction mechanics remain encapsulated by the token migration store.
- **Large cut vs compatibility:** project-owned interfaces ship together to avoid permanent adapters.
- **Address plus run IDs:** addresses identify logical nodes; run IDs identify concrete persistent/task executions. Both are necessary.
- **Physical layout preservation:** memory ownership stays concrete-run-based; representational cleanup does not justify disk relocation.

Main risks are missed identity producers, misclassifying historical display names as structural identity, relying on changed code under either terminal predecessor migration ID, duplicating flat/token semantics, per-row commits leaving partial token conversion, dishonest pre-commit migrated counts, long transaction time over material token volume, requiring an unavailable post-listen recovery API, genuine route/path contradiction, task-chain conversion, dynamic application DB discovery, frontend persistent/task collisions, accidental child localization, storage relocation, stale project-generated application artifacts, V4 manifests falsely admitted under changed types, and catalog exclusion hiding a durable DB. Mitigations are one pending `20260801...` target owner, one TeamRun flat decoder, one strict token planner/index, one transaction-owning batch store, forced-later-failure rollback proof, bounded details/progress, structural-only address derivation, fresh/terminal TeamRun and token chain fixtures, strict target validators, fail-not-guess planning, final-only backups/transactions/idempotence, exact source allowlist, three-level runtime coverage, one execution-address serializer, and byte/row/path preservation tests.

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
- Treat 10.18–10.21 as normative: remove the `20260703...` current definition while preserving its record, compose strict token planning into `20260801...`, use one verified transaction batch, retarget cleanup, and keep one exact gate.
- Build every token plan before mutation. On index/row failure, do not call the store. On transaction failure, report zero migrated and prove all earlier writes rolled back. Do not expose per-row commit or current-reader legacy branches.
- Prove persistent children share the root tree and task children preserve absolute addresses.
- Use one canonical `TeamExecutionAddress` serializer for stable wire/map keys.
- Preserve content, settings, task lifecycle, usage, exact codes, raw history, and physical storage under their owners.
- Keep changes separate from delivery-owned dirty documentation/finalization files in this worktree.
- Treat the 10.9–10.13 application data-flow spines as normative for V5 artifact production, old-bundle rejection, exact V5 launch, catalog-independent DB migration, and verification.
- Keep V5 semantic constants/types in `@autobyteus/application-sdk-contracts`; reuse existing admission/diagnostic/quarantine/storage owners and add no negotiation facade.
- Reject V4 before application execution with location/field/observed/required/action diagnostics; never adapt or edit external bundles.
- Physically inventory application platform DBs before catalog admission and migrate them without loading bundle code.
- Regenerate all project SDK/application artifacts and prove source/dist/vendor/importable consistency.
- Treat 10.14–10.17 as normative for fresh flat, terminal predecessor, unsafe rejection, retry, idempotence, byte stability, and startup gating.
- Treat [nested-classroom-live-validation-contract.md](./nested-classroom-live-validation-contract.md) as normative for the downstream live matrix; do not run provider tests during solution design.
- The user-approved target basis remains authoritative. SR-013 passed ARCH-REV-008; SR-015 corrects CRR-025 token ownership/atomicity and must pass architecture re-review before implementation resumes.

## 21. Scope Boundaries

In scope: AutoByteus server definition mounting, TeamRun metadata/execution/restore, collaboration/task addressing, task runtime identity, communication/events/token/history, migration, project APIs/SDKs/integrations, exact application SDK V5 admission and project artifact rebuild, catalog-independent application DB migration, production web, memory/context selectors, and downstream imported nested-classroom live validation across all three runtimes.

Out of scope: native AgentOrg, live Team topology mutation, handoff ACL evaluation, external repository-owned package edits or automatic V4 bundle upgrade, distributed/inactive inbox messaging, opaque provider-history rewriting, physical memory relocation, and mixed-version compatibility.
